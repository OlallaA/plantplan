package com.olalla.plantplan.service;

import com.olalla.plantplan.dto.QuantityAdjustmentRequest;
import com.olalla.plantplan.dto.CropCreateRequest;
import com.olalla.plantplan.dto.CropResponse;
import com.olalla.plantplan.dto.SeedResponse;
import com.olalla.plantplan.dto.SeedlingCreateRequest;
import com.olalla.plantplan.dto.SeedlingEntryRequest;
import com.olalla.plantplan.dto.SeedlingEntryResponse;
import com.olalla.plantplan.dto.SeedlingResponse;
import com.olalla.plantplan.dto.SeedlingUpdateRequest;
import com.olalla.plantplan.dto.SowRequest;
import com.olalla.plantplan.dto.SowResponse;
import com.olalla.plantplan.dto.TransplantRequest;
import com.olalla.plantplan.dto.TransplantResponse;
import com.olalla.plantplan.entity.CropSheet;
import com.olalla.plantplan.entity.Seedling;
import com.olalla.plantplan.exception.ForbiddenException;
import com.olalla.plantplan.exception.ResourceNotFoundException;
import com.olalla.plantplan.repository.SeedlingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class SeedlingService {

    private final SeedlingRepository seedlingRepository;
    private final CropSheetService cropSheetService;
    private final ReminderService reminderService;
    private final SeedService seedService;
    private final CropService cropService;

    public SeedlingService(
            SeedlingRepository seedlingRepository,
            CropSheetService cropSheetService,
            ReminderService reminderService,
            SeedService seedService,
            CropService cropService
    ) {
        this.seedlingRepository = seedlingRepository;
        this.cropSheetService = cropSheetService;
        this.reminderService = reminderService;
        this.seedService = seedService;
        this.cropService = cropService;
    }

    @Transactional(readOnly = true)
    public List<SeedlingResponse> findByUserId(Long userId) {
        return seedlingRepository.findByCropSheetUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SeedlingResponse> findByCropSheetId(Long userId, Long cropSheetId) {
        cropSheetService.findOwnedEntity(userId, cropSheetId);

        return seedlingRepository.findByCropSheetId(cropSheetId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SeedlingResponse findById(Long userId, Long id) {
        return toResponse(findOwnedEntity(userId, id));
    }

    @Transactional
    public SeedlingResponse create(Long userId, SeedlingCreateRequest request) {
        cropSheetService.lockUser(userId);
        return create(cropSheetService.findOwnedEntity(userId, request.cropSheetId()), request);
    }

    @Transactional
    public SeedlingEntryResponse registerPlantlets(Long userId, SeedlingEntryRequest request) {
        CropSheet sheet = cropSheetService.findOrCreateByName(userId, request.name(), request.variety(),
                request.catalogId(), request.catalogLanguage());
        SeedlingResponse seedling = create(sheet, new SeedlingCreateRequest(
                request.quantity(), null, null, null, null, sheet.getId()));
        return new SeedlingEntryResponse(seedling, cropSheetService.toResponse(sheet));
    }

    @Transactional
    public SowResponse sow(Long userId, Long cropSheetId, SowRequest request) {
        cropSheetService.lockUser(userId);
        CropSheet sheet = cropSheetService.findOwnedEntity(userId, cropSheetId);
        List<SeedResponse> seeds = seedService.consumeStock(sheet, request.quantity());
        SeedlingResponse seedling = create(sheet, new SeedlingCreateRequest(
                request.quantity(), LocalDate.now(), 0, null, null, cropSheetId));
        return new SowResponse(seedling, seeds);
    }

    @Transactional
    public TransplantResponse transplant(Long userId, Long id, TransplantRequest request) {
        cropSheetService.lockUser(userId);
        Seedling seedling = findOwnedEntity(userId, id);
        int transplanted = Objects.requireNonNullElse(seedling.getTransplantedQuantity(), 0);
        if (request.quantity() > seedling.getRemainingQuantity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No hay suficientes plantas en este lote");
        }
        LocalDate today = LocalDate.now();
        if (seedling.getSowingDate() != null && today.isBefore(seedling.getSowingDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El trasplante es anterior a la fecha de siembra");
        }

        CropResponse crop = cropService.create(userId, new CropCreateRequest(request.quantity(), today,
                null, null, null, seedling.getCropSheet().getId(), request.gardenId()));
        seedling.setTransplantedQuantity(transplanted + request.quantity());
        seedling.setTransplantDate(today);
        reminderService.generateForSeedling(seedling);
        return new TransplantResponse(toResponse(seedling), crop);
    }

    private SeedlingResponse create(CropSheet cropSheet, SeedlingCreateRequest request) {
        Seedling seedling = new Seedling();
        applyRequest(
                seedling,
                request.sownQuantity(),
                request.sowingDate(),
                request.transplantedQuantity(),
                request.transplantDate(),
                request.notes(),
                cropSheet
        );

        Seedling saved = seedlingRepository.save(seedling);
        reminderService.generateForSeedling(saved);
        return toResponse(saved);
    }

    @Transactional
    public SeedlingResponse update(Long userId, Long id, SeedlingUpdateRequest request) {
        cropSheetService.lockUser(userId);
        Seedling seedling = findOwnedEntity(userId, id);
        CropSheet cropSheet = cropSheetService.findOwnedEntity(userId, request.cropSheetId());

        applyRequest(
                seedling,
                request.sownQuantity(),
                request.sowingDate(),
                request.transplantedQuantity(),
                request.transplantDate(),
                request.notes(),
                cropSheet
        );

        reminderService.generateForSeedling(seedling);
        return toResponse(seedling);
    }

    @Transactional
    public SeedlingResponse adjustQuantity(Long userId, Long id, QuantityAdjustmentRequest request) {
        cropSheetService.lockUser(userId);
        Seedling seedling = findOwnedEntity(userId, id);
        int current = seedling.getRemainingQuantity();
        request.validateAgainst(current);
        seedling.recordLoss(current - request.quantity());
        reminderService.generateForSeedling(seedling);
        return toResponse(seedling);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        cropSheetService.lockUser(userId);
        Seedling seedling = findOwnedEntity(userId, id);
        reminderService.deleteForSeedling(id);
        seedlingRepository.delete(seedling);
    }

    private void applyRequest(
            Seedling seedling,
            Integer sownQuantity,
            LocalDate sowingDate,
            Integer transplantedQuantity,
            LocalDate transplantDate,
            String notes,
            CropSheet cropSheet
    ) {
        seedling.setSownQuantity(sownQuantity);
        seedling.setSowingDate(sowingDate);
        seedling.setTransplantedQuantity(transplantedQuantity);
        seedling.setTransplantDate(transplantDate);
        seedling.setNotes(notes);
        seedling.setCropSheet(cropSheet);
    }

    private Seedling findOwnedEntity(Long userId, Long id) {
        Seedling seedling = findEntityById(id);

        if (!seedling.getCropSheet().getUser().getId().equals(userId)) {
            throw new ForbiddenException("No puedes acceder al plantel con id " + id);
        }

        return seedling;
    }

    private Seedling findEntityById(Long id) {
        return seedlingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un plantel con id " + id));
    }

    private SeedlingResponse toResponse(Seedling seedling) {
        CropSheet cropSheet = seedling.getCropSheet();

        return new SeedlingResponse(
                seedling.getId(),
                seedling.getSownQuantity(),
                seedling.getSowingDate(),
                seedling.getTransplantedQuantity(),
                seedling.getTransplantDate(),
                seedling.getNotes(),
                cropSheet.getId(),
                cropSheet.getName(),
                seedling.getRemainingQuantity()
        );
    }
}
