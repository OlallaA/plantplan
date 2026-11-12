package com.olalla.plantplan.service;

import com.olalla.plantplan.dto.CropSheetCreateRequest;
import com.olalla.plantplan.dto.CropSheetResponse;
import com.olalla.plantplan.dto.CropSheetUpdateRequest;
import com.olalla.plantplan.entity.CatalogCrop;
import com.olalla.plantplan.entity.SunExposure;
import com.olalla.plantplan.entity.CropSheet;
import com.olalla.plantplan.entity.User;
import com.olalla.plantplan.exception.ForbiddenException;
import com.olalla.plantplan.exception.ResourceNotFoundException;
import com.olalla.plantplan.repository.CatalogCropRepository;
import com.olalla.plantplan.repository.CropSheetRepository;
import com.olalla.plantplan.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class CropSheetService {

    private static final Map<String, String> LEGACY_ICON_IDS = Map.of(
            "tomate cherry", "tomato",
            "patacas", "potato",
            "patatas", "potato"
    );

    private final CropSheetRepository cropSheetRepository;
    private final UserRepository userRepository;
    private final CatalogCropRepository catalogCropRepository;

    public CropSheetService(
            CropSheetRepository cropSheetRepository,
            UserRepository userRepository,
            CatalogCropRepository catalogCropRepository
    ) {
        this.cropSheetRepository = cropSheetRepository;
        this.userRepository = userRepository;
        this.catalogCropRepository = catalogCropRepository;
    }

    @Transactional(readOnly = true)
    public List<CropSheetResponse> findByUserId(Long userId) {
        List<CropSheet> sheets = cropSheetRepository.findByUserId(userId);
        Map<String, String> icons = sheets.stream().anyMatch(sheet -> sheet.getCatalogCrop() == null)
                ? catalogIconsByName() : Map.of();
        return sheets.stream()
                .map(sheet -> toResponse(sheet, icons))
                .toList();
    }

    @Transactional(readOnly = true)
    public CropSheetResponse findById(Long userId, Long cropSheetId) {
        return toResponse(findOwnedEntity(userId, cropSheetId));
    }

    @Transactional
    public CropSheetResponse create(Long userId, CropSheetCreateRequest request) {
        User user = lockUser(userId);
        rejectDuplicate(userId, null, request.name(), request.variety());

        CropSheet ficha = new CropSheet();
        applyRequest(ficha, request.name(), request.variety(), request.sowingStartMonth(),
                request.sowingEndMonth(), request.transplantStartMonth(), request.transplantEndMonth(),
                request.harvestStartMonth(), request.harvestEndMonth(), request.wateringFrequencyDays(),
                request.sunExposure(), request.notes(), user);

        CropSheet saved = cropSheetRepository.save(ficha);
        return toResponse(saved);
    }

    @Transactional
    public CropSheetResponse update(Long userId, Long cropSheetId, CropSheetUpdateRequest request) {
        lockUser(userId);
        CropSheet ficha = findOwnedEntity(userId, cropSheetId);
        if (!matches(ficha, request.name(), request.variety())) {
            rejectDuplicate(userId, cropSheetId, request.name(), request.variety());
        }

        applyRequest(ficha, request.name(), request.variety(), request.sowingStartMonth(),
                request.sowingEndMonth(), request.transplantStartMonth(), request.transplantEndMonth(),
                request.harvestStartMonth(), request.harvestEndMonth(), request.wateringFrequencyDays(),
                request.sunExposure(), request.notes(), ficha.getUser());

        return toResponse(ficha);
    }

    @Transactional
    public void delete(Long userId, Long cropSheetId) {
        lockUser(userId);
        CropSheet ficha = findOwnedEntity(userId, cropSheetId);
        cropSheetRepository.delete(ficha);
    }

    CropSheet findOrCreateByName(Long userId, String name, String variety, String catalogId, String catalogLanguage) {
        User user = lockUser(userId);
        if (catalogId == null) {
            return findMatchingSheet(userId, null, name, variety)
                    .orElseGet(() -> cropSheetRepository.save(newSheet(user, name, variety)));
        }

        CatalogCrop catalog = catalogCropRepository.findById(catalogId)
                .orElseThrow(() -> new ResourceNotFoundException("No existe ese cultivo en el catálogo"));
        boolean useSpanish = "es".equals(catalogLanguage) || (catalogLanguage == null
                && !catalog.getNameGl().equalsIgnoreCase(label(name)) && catalog.getNameEs().equalsIgnoreCase(label(name)));
        String catalogName = useSpanish ? catalog.getNameEs() : catalog.getNameGl();
        CropSheet sheet = cropSheetRepository.findByUserId(userId).stream()
                .filter(candidate -> label(candidate.getVariety()).equalsIgnoreCase(label(variety)))
                .filter(candidate -> belongsToCatalogCrop(candidate, catalog))
                .min(Comparator.comparing((CropSheet candidate) -> candidate.getCatalogCrop() == null)
                        .thenComparing(CropSheet::getId))
                .orElseGet(() -> newSheet(user, catalogName, variety));
        if (sheet.getCatalogCrop() == null) {
            catalog.fillMissingDetails(sheet, useSpanish);
        }
        return cropSheetRepository.save(sheet);
    }

    private boolean belongsToCatalogCrop(CropSheet sheet, CatalogCrop catalog) {
        if (sheet.getCatalogCrop() != null) {
            return sheet.getCatalogCrop().getId().equals(catalog.getId());
        }
        return label(sheet.getName()).equalsIgnoreCase(catalog.getNameGl())
                || label(sheet.getName()).equalsIgnoreCase(catalog.getNameEs());
    }

    private CropSheet newSheet(User user, String name, String variety) {
        CropSheet sheet = new CropSheet();
        sheet.setName(label(name));
        sheet.setVariety(varietyOrNull(variety));
        sheet.setUser(user);
        return sheet;
    }

    private Optional<CropSheet> findMatchingSheet(Long userId, Long excludedId, String name, String variety) {
        return cropSheetRepository.findByUserId(userId).stream()
                .filter(sheet -> !sheet.getId().equals(excludedId) && matches(sheet, name, variety))
                .min(Comparator.comparing(CropSheet::getId));
    }

    private void rejectDuplicate(Long userId, Long excludedId, String name, String variety) {
        if (findMatchingSheet(userId, excludedId, name, variety).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una ficha para ese cultivo y variedad");
        }
    }

    private boolean matches(CropSheet sheet, String name, String variety) {
        return label(sheet.getName()).equalsIgnoreCase(label(name))
                && label(sheet.getVariety()).equalsIgnoreCase(label(variety));
    }

    private String label(String value) {
        return value == null ? "" : value.strip();
    }

    private String varietyOrNull(String variety) {
        String value = label(variety);
        return value.isEmpty() ? null : value;
    }

    private void applyRequest(
            CropSheet ficha,
            String name,
            String variety,
            java.time.Month sowingStartMonth,
            java.time.Month sowingEndMonth,
            java.time.Month transplantStartMonth,
            java.time.Month transplantEndMonth,
            java.time.Month harvestStartMonth,
            java.time.Month harvestEndMonth,
            Integer wateringFrequencyDays,
            SunExposure sunExposure,
            String notes,
            User user
    ) {
        ficha.setName(label(name));
        ficha.setVariety(varietyOrNull(variety));
        ficha.setSowingStartMonth(sowingStartMonth);
        ficha.setSowingEndMonth(sowingEndMonth);
        ficha.setTransplantStartMonth(transplantStartMonth);
        ficha.setTransplantEndMonth(transplantEndMonth);
        ficha.setHarvestStartMonth(harvestStartMonth);
        ficha.setHarvestEndMonth(harvestEndMonth);
        ficha.setWateringFrequencyDays(wateringFrequencyDays);
        ficha.setSunExposure(sunExposure);
        ficha.setNotes(notes);
        ficha.setUser(user);
    }

    CropSheet findOwnedEntity(Long userId, Long cropSheetId) {
        CropSheet ficha = findEntityById(cropSheetId);

        if (!ficha.getUser().getId().equals(userId)) {
            throw new ForbiddenException("No puedes acceder a la ficha de cultivo con id " + cropSheetId);
        }

        return ficha;
    }

    private CropSheet findEntityById(Long id) {
        return cropSheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe una ficha de cultivo con id " + id));
    }

    // Serialize stock and sheet writes for the same account, including a first insert.
    User lockUser(Long id) {
        return userRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un usuario con id " + id));
    }

    CropSheetResponse toResponse(CropSheet ficha) {
        return toResponse(ficha, ficha.getCatalogCrop() == null ? catalogIconsByName() : Map.of());
    }

    private Map<String, String> catalogIconsByName() {
        Map<String, String> icons = new HashMap<>(LEGACY_ICON_IDS);
        for (CatalogCrop catalog : catalogCropRepository.findAll()) {
            icons.put(iconName(catalog.getNameGl()), catalog.getId());
            icons.put(iconName(catalog.getNameEs()), catalog.getId());
        }
        return icons;
    }

    private String iconName(String name) {
        return Normalizer.normalize(label(name), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }

    private CropSheetResponse toResponse(CropSheet ficha, Map<String, String> icons) {
        User user = ficha.getUser();
        CatalogCrop catalog = ficha.getCatalogCrop();

        return new CropSheetResponse(
                ficha.getId(),
                ficha.getName(),
                ficha.getVariety(),
                catalog == null ? icons.get(iconName(ficha.getName())) : catalog.getId(),
                ficha.getSowingStartMonth(),
                ficha.getSowingEndMonth(),
                ficha.getTransplantStartMonth(),
                ficha.getTransplantEndMonth(),
                ficha.getHarvestStartMonth(),
                ficha.getHarvestEndMonth(),
                ficha.getWateringFrequencyDays(),
                catalog == null ? null : catalog.getWaterMin(),
                catalog == null ? null : catalog.getWaterMax(),
                catalog != null && catalog.isWateringGeneral(),
                ficha.getSunExposure(),
                ficha.getNotes(),
                user.getId(),
                user.getName()
        );
    }
}
