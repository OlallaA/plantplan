package com.olalla.plantplan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.config.location=classpath:application-test.properties"
)
@ActiveProfiles("test")
class PlantPlanApplicationTests {

    private static final String DATABASE_URL = "jdbc:h2:mem:validation_" + UUID.randomUUID();
    private static final String TEST_PASSWORD = "Validation-1234";

    // Higher precedence than environment variables: never connect to development MySQL.
    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DATABASE_URL);
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.H2Dialect");
    }

    @LocalServerPort
    private int port;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private ObjectMapper json;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Test
    void contextLoads() throws Exception {
        try (var connection = dataSource.getConnection()) {
            assertEquals(DATABASE_URL, connection.getMetaData().getURL());
            assertEquals("H2", connection.getMetaData().getDatabaseProductName());
        }
    }

    @Test
    void healthRespondsOverHttp() throws Exception {
        var response = request("GET", "/api/health", null, null);
        assertEquals(200, response.statusCode());
        assertEquals("OK", body(response).path("status").asString());
        assertEquals("plantplan", body(response).path("application").asString());
    }

    @Test
    void protectedEndpointsRejectMissingOrInvalidJwt() throws Exception {
        assertEquals(401, request("GET", "/api/gardens", null, null).statusCode());
        assertEquals(401, request("GET", "/api/gardens", "invalid-token", null).statusCode());
    }

    @Test
    void vitePreflightAllowsAuthorizationHeader() throws Exception {
        var response = preflight("http://localhost:5173");
        assertEquals(200, response.statusCode());
        assertEquals("http://localhost:5173",
                response.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        assertTrue(response.headers().firstValue("Access-Control-Allow-Methods")
                .orElseThrow().contains("POST"));
        assertTrue(response.headers().firstValue("Access-Control-Allow-Headers")
                .orElseThrow().toLowerCase().contains("authorization"));
    }

    @Test
    void preflightRejectsUnknownOrigin() throws Exception {
        var response = preflight("https://untrusted.example");
        assertEquals(403, response.statusCode());
        assertTrue(response.headers().firstValue("Access-Control-Allow-Origin").isEmpty());
    }

    @Test
    void registrationLoginAndGardenCrudWorkOverHttp() throws Exception {
        var account = registerAndLogin();
        String token = account.path("token").asString();
        assertFalse(token.isBlank());
        assertFalse(account.path("user").has("password"));
        assertEquals("USER", account.path("user").path("role").asString());

        assertEquals(400, request("POST", "/api/gardens", token, Map.of("name", "")).statusCode());
        var created = request("POST", "/api/gardens", token,
                Map.of("name", "Validation garden", "latitude", 42.0, "longitude", -8.0));
        assertEquals(201, created.statusCode());
        long id = body(created).path("id").asLong();
        assertEquals(account.path("user").path("id").asLong(), body(created).path("userId").asLong());

        assertEquals(200, request("GET", "/api/gardens/" + id, token, null).statusCode());
        var listed = request("GET", "/api/gardens", token, null);
        assertEquals(200, listed.statusCode());
        assertEquals(1, body(listed).size());

        var updated = request("PUT", "/api/gardens/" + id, token, Map.of("name", "Updated garden"));
        assertEquals(200, updated.statusCode());
        assertEquals("Updated garden", body(updated).path("name").asString());
        assertEquals(204, request("DELETE", "/api/gardens/" + id, token, null).statusCode());
        assertEquals(404, request("GET", "/api/gardens/" + id, token, null).statusCode());
    }

    @Test
    void usersCannotAccessEachOthersGardensOrListAccounts() throws Exception {
        String ownerToken = registerAndLogin().path("token").asString();
        var created = request("POST", "/api/gardens", ownerToken, Map.of("name", "Private garden"));
        assertEquals(201, created.statusCode());
        String path = "/api/gardens/" + body(created).path("id").asLong();
        String otherToken = registerAndLogin().path("token").asString();

        assertEquals(403, request("GET", path, otherToken, null).statusCode());
        assertEquals(403, request("PUT", path, otherToken, Map.of("name", "Forbidden")).statusCode());
        assertEquals(403, request("DELETE", path, otherToken, null).statusCode());
        assertEquals(403, request("GET", "/api/users", otherToken, null).statusCode());
        assertEquals(0, body(request("GET", "/api/gardens", otherToken, null)).size());
        assertEquals(200, request("GET", path, ownerToken, null).statusCode());
    }

    @Test
    void stockReusesTheSameSheetAndRejectsDuplicateRenames() throws Exception {
        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        var first = request("POST", "/api/seeds/stock", token, Map.of(
                "name", "Tomate", "variety", "Cherry", "quantity", 30, "notes", "Primeiro sobre"));
        assertEquals(200, first.statusCode());
        long sheetId = body(first).path("cropSheet").path("id").asLong();
        long seedId = body(first).path("seed").path("id").asLong();
        var added = request("POST", "/api/seeds/stock", token, Map.of(
                "name", " tomate ", "variety", " cherry ", "quantity", 12, "notes", "Segundo sobre"));
        assertEquals(200, added.statusCode());
        assertEquals(sheetId, body(added).path("cropSheet").path("id").asLong());
        var seed = body(added).path("seed");
        assertEquals(seedId, seed.path("id").asLong());
        assertEquals(42, seed.path("quantity").asInt());
        assertEquals("Primeiro sobre\nSegundo sobre", seed.path("notes").asString());

        var otherVariety = request("POST", "/api/seeds/stock", token,
                Map.of("name", "Tomate", "variety", "Rosa", "quantity", 5));
        assertEquals(200, otherVariety.statusCode());
        long secondSheetId = body(otherVariety).path("cropSheet").path("id").asLong();
        assertNotEquals(sheetId, secondSheetId);
        assertEquals(409, request("PUT", "/api/crop-sheets/" + secondSheetId, token,
                Map.of("name", " TOMATE ", "variety", "Cherry")).statusCode());
        assertEquals(409, request("POST", "/api/crop-sheets", token,
                Map.of("name", "Tomate", "variety", "Cherry")).statusCode());
        assertEquals(403, request("PUT", "/api/crop-sheets/" + sheetId, otherToken,
                Map.of("name", "Tomate", "variety", "Cherry")).statusCode());
        var edited = request("PUT", "/api/crop-sheets/" + sheetId, token, Map.of(
                "name", "Tomate", "variety", "Cherry", "sowingStartMonth", "MARCH", "wateringFrequencyDays", 3));
        assertEquals(200, edited.statusCode());
        assertEquals(3, body(edited).path("sowingStartMonth").asInt());
        assertEquals(2, body(request("GET", "/api/seeds", token, null)).size());
        assertEquals(0, body(request("GET", "/api/seeds", otherToken, null)).size());
    }

    @Test
    void addingStockFromAnExistingSheetCreatesAndIncreasesItsStock() throws Exception {
        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        var sheet = request("POST", "/api/crop-sheets", token, Map.of("name", "Ajo"));
        assertEquals(201, sheet.statusCode());
        long sheetId = body(sheet).path("id").asLong();
        String seedsPath = "/api/crop-sheets/" + sheetId + "/seeds";
        String stockPath = seedsPath + "/stock";

        var first = request("POST", stockPath, token, Map.of("quantity", 20));
        assertEquals(200, first.statusCode());
        assertEquals(20, body(first).path("quantity").asInt());
        assertEquals(400, request("POST", stockPath, token, Map.of("quantity", 0)).statusCode());
        assertEquals(403, request("POST", stockPath, otherToken, Map.of("quantity", 2)).statusCode());

        var added = request("POST", stockPath, token, Map.of("quantity", 2));
        assertEquals(200, added.statusCode());
        assertEquals(body(first).path("id").asLong(), body(added).path("id").asLong());
        assertEquals(sheetId, body(added).path("cropSheetId").asLong());
        var seeds = body(request("GET", seedsPath, token, null));
        assertEquals(1, seeds.size());
        assertEquals(22, seeds.get(0).path("quantity").asInt());
        assertEquals(1, body(request("GET", "/api/crop-sheets", token, null)).size());
    }

    @Test
    void simultaneousFirstStockAdditionsShareOneSheet() throws Exception {
        String token = registerAndLogin().path("token").asString();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> request("POST", "/api/seeds/stock", token,
                    Map.of("name", "Leituga", "quantity", 7)));
            var second = executor.submit(() -> request("POST", "/api/seeds/stock", token,
                    Map.of("name", "Leituga", "variety", "   ", "quantity", 11)));
            assertEquals(200, first.get().statusCode());
            assertEquals(200, second.get().statusCode());
        }
        var seeds = body(request("GET", "/api/seeds", token, null));
        assertEquals(1, seeds.size());
        assertEquals(18, seeds.get(0).path("quantity").asInt());
        assertEquals(1, body(request("GET", "/api/crop-sheets", token, null)).size());
    }

    @Test
    void sowingAndTransplantingMoveQuantitiesWhileDirectEntriesStayIndependent() throws Exception {
        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        var stock = request("POST", "/api/seeds/stock", token, Map.of("name", "Leituga", "quantity", 10));
        assertEquals(200, stock.statusCode());
        long sheetId = body(stock).path("cropSheet").path("id").asLong();
        var legacy = request("POST", "/api/seeds", token, Map.of("cropSheetId", sheetId, "quantity", 5));
        assertEquals(201, legacy.statusCode());

        long gardenId = body(request("POST", "/api/gardens", token, Map.of("name", "Own garden"))).path("id").asLong();
        long otherGardenId = body(request("POST", "/api/gardens", otherToken, Map.of("name", "Other garden"))).path("id").asLong();
        var purchased = request("POST", "/api/seedlings", token, Map.of("cropSheetId", sheetId, "sownQuantity", 2));
        assertEquals(201, purchased.statusCode());
        assertTrue(body(purchased).path("sowingDate").isNull());
        long purchasedId = body(purchased).path("id").asLong();
        assertEquals(201, request("POST", "/api/crops", token,
                Map.of("cropSheetId", sheetId, "gardenId", gardenId, "initialQuantity", 5)).statusCode());
        assertEquals(10, body(request("GET", "/api/seeds/" + body(stock).path("seed").path("id").asLong(), token, null))
                .path("quantity").asInt());

        String sow = "/api/crop-sheets/" + sheetId + "/sow";
        assertEquals(403, request("POST", sow, otherToken, Map.of("quantity", 1)).statusCode());
        var sown = request("POST", sow, token, Map.of("quantity", 12));
        assertEquals(201, sown.statusCode());
        var result = body(sown);
        assertEquals(12, result.path("seedling").path("sownQuantity").asInt());
        assertEquals(0, result.path("seeds").get(0).path("quantity").asInt());
        assertEquals(3, result.path("seeds").get(1).path("quantity").asInt());
        assertEquals(409, request("POST", sow, token, Map.of("quantity", 4)).statusCode());
        assertEquals(3, body(request("GET", "/api/seeds/" + body(legacy).path("id").asLong(), token, null))
                .path("quantity").asInt());
        assertEquals(2, body(request("GET", "/api/seedlings", token, null)).size());

        String transplant = "/api/seedlings/" + purchasedId + "/transplant";
        assertEquals(403, request("POST", transplant, token, Map.of("quantity", 1, "gardenId", otherGardenId)).statusCode());
        assertTrue(body(request("GET", "/api/seedlings/" + purchasedId, token, null)).path("transplantedQuantity").isNull());
        var moved = request("POST", transplant, token, Map.of("quantity", 1, "gardenId", gardenId));
        assertEquals(201, moved.statusCode());
        assertEquals(1, body(moved).path("seedling").path("transplantedQuantity").asInt());
        assertEquals(1, body(moved).path("crop").path("initialQuantity").asInt());
        assertEquals(gardenId, body(moved).path("crop").path("gardenId").asLong());
        assertEquals(409, request("POST", transplant, token, Map.of("quantity", 2, "gardenId", gardenId)).statusCode());
        assertEquals(2, body(request("GET", "/api/crops", token, null)).size());
        assertEquals(201, request("POST", transplant, token, Map.of("quantity", 1, "gardenId", gardenId)).statusCode());
        assertEquals(2, body(request("GET", "/api/seedlings/" + purchasedId, token, null)).path("transplantedQuantity").asInt());
    }

    @Test
    void adjustingCultivationQuantitiesKeepsRecordsAndPlantingHistory() throws Exception {
        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        var stock = body(request("POST", "/api/seeds/stock", token,
                Map.of("catalogId", "lettuce", "name", "Leituga", "quantity", 50)));
        long sheetId = stock.path("cropSheet").path("id").asLong();
        long seedId = stock.path("seed").path("id").asLong();
        long gardenId = body(request("POST", "/api/gardens", token,
                Map.of("name", "Garden"))).path("id").asLong();
        long seedlingId = body(request("POST", "/api/crop-sheets/" + sheetId + "/sow", token,
                Map.of("quantity", 10))).path("seedling").path("id").asLong();
        long cropId = body(request("POST", "/api/seedlings/" + seedlingId + "/transplant", token,
                Map.of("quantity", 5, "gardenId", gardenId))).path("crop").path("id").asLong();
        String seed = "/api/seeds/" + seedId;
        String seedling = "/api/seedlings/" + seedlingId;
        String crop = "/api/crops/" + cropId;

        var seedAdjustment = Map.of("expectedQuantity", 40, "quantity", 30);
        assertEquals(403, request("PUT", seed + "/quantity", otherToken, seedAdjustment).statusCode());
        assertEquals(30, body(request("PUT", seed + "/quantity", token, seedAdjustment)).path("quantity").asInt());
        assertEquals(409, request("PUT", seed + "/quantity", token, seedAdjustment).statusCode());
        assertEquals(400, request("PUT", seed + "/quantity", token,
                Map.of("expectedQuantity", 30, "quantity", 31)).statusCode());
        assertEquals(400, request("PUT", seed + "/quantity", token,
                Map.of("expectedQuantity", 30, "quantity", -1)).statusCode());

        var seedlingAdjustment = Map.of("expectedQuantity", 5, "quantity", 3);
        assertEquals(403, request("PUT", seedling + "/quantity", otherToken, seedlingAdjustment).statusCode());
        assertEquals(3, body(request("PUT", seedling + "/quantity", token, seedlingAdjustment))
                .path("remainingQuantity").asInt());
        assertEquals(409, request("POST", seedling + "/transplant", token,
                Map.of("quantity", 4, "gardenId", gardenId)).statusCode());
        var moved = body(request("POST", seedling + "/transplant", token,
                Map.of("quantity", 1, "gardenId", gardenId))).path("seedling");
        assertEquals(2, moved.path("remainingQuantity").asInt());
        assertEquals(6, moved.path("transplantedQuantity").asInt());

        var cropAdjustment = Map.of("expectedQuantity", 5, "quantity", 4);
        assertEquals(403, request("PUT", crop + "/quantity", otherToken, cropAdjustment).statusCode());
        assertEquals(4, body(request("PUT", crop + "/quantity", token, cropAdjustment))
                .path("currentQuantity").asInt());

        assertEquals(200, request("PUT", seed + "/quantity", token,
                Map.of("expectedQuantity", 30, "quantity", 0)).statusCode());
        assertEquals(200, request("PUT", seedling + "/quantity", token,
                Map.of("expectedQuantity", 2, "quantity", 0)).statusCode());
        assertEquals(200, request("PUT", crop + "/quantity", token,
                Map.of("expectedQuantity", 4, "quantity", 0)).statusCode());
        assertEquals(0, body(request("GET", seed, token, null)).path("quantity").asInt());
        var savedLot = body(request("GET", seedling, token, null));
        assertEquals(0, savedLot.path("remainingQuantity").asInt());
        assertEquals(10, savedLot.path("sownQuantity").asInt());
        assertEquals(6, savedLot.path("transplantedQuantity").asInt());
        var savedCrop = body(request("GET", crop, token, null));
        assertEquals(0, savedCrop.path("currentQuantity").asInt());
        assertEquals(5, savedCrop.path("initialQuantity").asInt());
        assertEquals(2, body(request("GET", "/api/crops", token, null)).size());
        assertEquals(200, request("GET", "/api/crop-sheets/" + sheetId, token, null).statusCode());
        assertEquals(200, request("GET", "/api/gardens/" + gardenId, token, null).statusCode());
    }

    @Test
    void directEntriesByNameReuseTheSheetAndRejectForeignGardensWithoutCreatingOne() throws Exception {
        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        long garden = body(request("POST", "/api/gardens", token, Map.of("name", "Own garden"))).path("id").asLong();
        long foreign = body(request("POST", "/api/gardens", otherToken, Map.of("name", "Other garden"))).path("id").asLong();

        var plantlets = request("POST", "/api/seedlings/entry", token,
                Map.of("name", "Leituga", "variety", "Marabilla", "quantity", 2));
        assertEquals(201, plantlets.statusCode());
        long sheet = body(plantlets).path("cropSheet").path("id").asLong();
        assertEquals("lettuce", body(plantlets).path("cropSheet").path("catalogIconId").asString());
        assertTrue(body(plantlets).path("cropSheet").path("waterMin").isNull());
        assertEquals(sheet, body(plantlets).path("seedling").path("cropSheetId").asLong());
        assertEquals(2, body(plantlets).path("seedling").path("sownQuantity").asInt());
        assertTrue(body(plantlets).path("seedling").path("sowingDate").isNull());

        var crop = request("POST", "/api/crops/entry", token,
                Map.of("name", " leituga ", "variety", "marabilla", "quantity", 5, "gardenId", garden));
        assertEquals(201, crop.statusCode());
        assertEquals(sheet, body(crop).path("crop").path("cropSheetId").asLong());
        assertEquals(5, body(crop).path("crop").path("initialQuantity").asInt());
        assertEquals(403, request("POST", "/api/crops/entry", token,
                Map.of("name", "Uncreated crop", "quantity", 1, "gardenId", foreign)).statusCode());
        assertEquals(1, body(request("GET", "/api/crop-sheets", token, null)).size());
        assertEquals(1, body(request("GET", "/api/crops", token, null)).size());
        assertEquals(0, body(request("GET", "/api/seeds", token, null)).size());
        assertEquals(0, body(request("GET", "/api/crop-sheets", otherToken, null)).size());
    }

    @Test
    void catalogEntriesReuseThePersonalSheetAcrossDestinationsAndLanguages() throws Exception {
        var catalog = request("GET", "/api/catalog", null, null);
        assertEquals(200, catalog.statusCode());
        assertEquals(20, body(catalog).size());
        for (JsonNode crop : body(catalog)) {
            assertTrue(crop.path("waterMin").asInt() > 0);
            assertTrue(crop.path("waterMax").asInt() >= crop.path("waterMin").asInt());
            assertTrue(crop.path("sowingStart").asInt() >= 1 && crop.path("sowingStart").asInt() <= 12);
            assertTrue(crop.path("plantingMethod").isString());
        }

        String token = registerAndLogin().path("token").asString();
        String otherToken = registerAndLogin().path("token").asString();
        long garden = body(request("POST", "/api/gardens", token, Map.of("name", "Catalog garden"))).path("id").asLong();
        var stock = request("POST", "/api/seeds/stock", token,
                Map.of("catalogId", "lettuce", "catalogLanguage", "gl", "name", "Leituga", "quantity", 12));
        assertEquals(200, stock.statusCode());
        JsonNode sheet = body(stock).path("cropSheet");
        long sheetId = sheet.path("id").asLong();
        assertEquals(2, sheet.path("sowingStartMonth").asInt());
        assertEquals("lettuce", sheet.path("catalogIconId").asString());
        assertEquals(3, sheet.path("transplantStartMonth").asInt());
        assertEquals(6, sheet.path("harvestEndMonth").asInt());
        assertEquals(25, sheet.path("waterMin").asInt());
        assertEquals(51, sheet.path("waterMax").asInt());
        assertTrue(sheet.path("notes").asString().contains("colleita"));
        assertTrue(sheet.path("wateringFrequencyDays").isNull());

        var seedlings = request("POST", "/api/seedlings/entry", token,
                Map.of("catalogId", "lettuce", "name", "Lechuga", "quantity", 3));
        assertEquals(201, seedlings.statusCode());
        assertEquals(sheetId, body(seedlings).path("seedling").path("cropSheetId").asLong());

        var planting = request("POST", "/api/crops/entry", token,
                Map.of("catalogId", "lettuce", "name", "Lechuga", "quantity", 2, "gardenId", garden));
        assertEquals(201, planting.statusCode());
        assertEquals(sheetId, body(planting).path("crop").path("cropSheetId").asLong());
        assertEquals(1, body(request("GET", "/api/crop-sheets", token, null)).size());
        assertEquals(12, body(request("GET", "/api/seeds", token, null)).get(0).path("quantity").asInt());
        assertEquals(51, body(request("GET", "/api/crop-sheets/" + sheetId, token, null)).path("waterMax").asInt());
        assertEquals(403, request("GET", "/api/crop-sheets/" + sheetId, otherToken, null).statusCode());
    }

    @Test
    void gardenSheetsWithLegacyCropNamesReturnTheirCatalogIcons() throws Exception {
        String token = registerAndLogin().path("token").asString();
        long garden = body(request("POST", "/api/gardens", token, Map.of("name", "Legacy garden"))).path("id").asLong();
        for (var crop : Map.of("Tomate cherry", "tomato", "Patacas", "potato").entrySet()) {
            var planting = request("POST", "/api/crops/entry", token,
                    Map.of("name", crop.getKey(), "gardenId", garden, "quantity", 2));
            assertEquals(201, planting.statusCode());
            assertEquals(crop.getValue(), body(planting).path("cropSheet").path("catalogIconId").asString());
        }
        var sheets = body(request("GET", "/api/crop-sheets", token, null));
        assertEquals(2, sheets.size());
        for (JsonNode sheet : sheets) {
            assertEquals(sheet.path("name").asString().equals("Patacas") ? "potato" : "tomato",
                    sheet.path("catalogIconId").asString());
        }
    }

    private JsonNode registerAndLogin() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        var registered = request("POST", "/api/auth/register", null,
                Map.of("name", "Validation user", "email", email, "password", TEST_PASSWORD));
        assertEquals(201, registered.statusCode());
        assertFalse(body(registered).has("password"));
        var login = request("POST", "/api/auth/login", null,
                Map.of("email", email, "password", TEST_PASSWORD));
        assertEquals(200, login.statusCode());
        return body(login);
    }

    private HttpResponse<String> preflight(String origin) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/gardens"))
                        .timeout(Duration.ofSeconds(10))
                        .header("Origin", origin)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Authorization,Content-Type")
                        .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> request(String method, String path, String token, Object payload) throws Exception {
        var builder = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(10));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        var publisher = HttpRequest.BodyPublishers.noBody();
        if (payload != null) {
            builder.header("Content-Type", "application/json");
            publisher = HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload));
        }
        return client.send(builder.method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    private JsonNode body(HttpResponse<String> response) {
        return json.readTree(response.body());
    }

}
