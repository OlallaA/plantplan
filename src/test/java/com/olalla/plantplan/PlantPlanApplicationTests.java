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
