package com.olalla.plantplan.service;

import com.olalla.plantplan.dto.QuantityAdjustmentRequest;
import com.olalla.plantplan.dto.CropCreateRequest;
import com.olalla.plantplan.dto.CropEntryRequest;
import com.olalla.plantplan.dto.CropEntryResponse;
import com.olalla.plantplan.dto.CropResponse;
import com.olalla.plantplan.dto.CropUpdateRequest;
import com.olalla.plantplan.entity.Crop;
import com.olalla.plantplan.entity.CropSheet;
import com.olalla.plantplan.entity.Garden;
import com.olalla.plantplan.exception.ForbiddenException;
import com.olalla.plantplan.exception.ResourceNotFoundException;
import com.olalla.plantplan.repository.CropRepository;
import com.olalla.plantplan.repository.GardenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class CropService {

    private final CropRepository cropRepository;
    private final CropSheetService cropSheetService;
    private final GardenRepository gardenRepository;
    private final ReminderService reminderService;

    public CropService(
            CropRepository cropRepository,
            CropSheetService cropSheetService,
            GardenRepository gardenRepository,
            ReminderService reminderService
    ) {
        this.cropRepository = cropRepository;
        this.cropSheetService = cropSheetService;
        this.gardenRepository = gardenRepository;
        this.reminderService = reminderService;
    }

    @Transactional(readOnly = true)
    public List<CropResponse> findByUserId(Long userId) {
        return cropRepository.findByGardenUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CropResponse> findByGardenId(Long userId, Long gardenId) {
        findOwnedGarden(userId, gardenId);

        return cropRepository.findByGardenId(gardenId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CropResponse> findByCropSheetId(Long userId, Long cropSheetId) {
        cropSheetService.findOwnedEntity(userId, cropSheetId);

        return cropRepository.findByCropSheetId(cropSheetId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CropResponse findById(Long userId, Long id) {
        return toResponse(findOwnedEntity(userId, id));
    }

    @Transactional
    public CropResponse create(Long userId, CropCreateRequest request) {
        CropSheet cropSheet = cropSheetService.findOwnedEntity(userId, request.cropSheetId());
        Garden garden = findOwnedGarden(userId, request.gardenId());
        return create(cropSheet, garden, request);
    }

    @Transactional
    public CropEntryResponse registerPlanting(Long userId, CropEntryRequest request) {
        CropSheet sheet = cropSheetService.findOrCreateByName(userId, request.name(), request.variety(),
                request.catalogId(), request.catalogLanguage());
        Garden garden = findOwnedGarden(userId, request.gardenId());
        CropResponse crop = create(sheet, garden, new CropCreateRequest(request.quantity(), LocalDate.now(),
                null, null, null, sheet.getId(), garden.getId()));
        return new CropEntryResponse(crop, cropSheetService.toResponse(sheet));
    }

    private CropResponse create(CropSheet cropSheet, Garden garden, CropCreateRequest request) {
        Crop crop = new Crop();
        applyRequest(
                crop,
                request.initialQuantity(),
                request.transplantDate(),
                request.harvestedQuantity(),
                request.endDate(),
                request.notes(),
                cropSheet,
                garden
        );

        Crop saved = cropRepository.save(crop);
        reminderService.generateForCrop(saved);
        return toResponse(saved);
    }

    @Transactional
    public CropResponse update(Long userId, Long id, CropUpdateRequest request) {
        cropSheetService.lockUser(userId);
        Crop crop = findOwnedEntity(userId, id);
        CropSheet cropSheet = cropSheetService.findOwnedEntity(userId, request.cropSheetId());
        Garden garden = findOwnedGarden(userId, request.gardenId());

        applyRequest(
                crop,
                request.initialQuantity(),
                request.transplantDate(),
                request.harvestedQuantity(),
                request.endDate(),
                request.notes(),
                cropSheet,
                garden
        );

        reminderService.generateForCrop(crop);
        return toResponse(crop);
    }

    @Transactional
    public CropResponse adjustQuantity(Long userId, Long id, QuantityAdjustmentRequest request) {
        cropSheetService.lockUser(userId);
        Crop crop = findOwnedEntity(userId, id);
        int current = crop.getCurrentQuantity();
        request.validateAgainst(current);
        crop.recordLoss(current - request.quantity());
        reminderService.generateForCrop(crop);
        return toResponse(crop);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        cropSheetService.lockUser(userId);
        Crop crop = findOwnedEntity(userId, id);
        reminderService.deleteForCrop(id);
        cropRepository.delete(crop);
    }

    private void applyRequest(
            Crop crop,
            Integer initialQuantity,
            java.time.LocalDate transplantDate,
            Integer harvestedQuantity,
            java.time.LocalDate endDate,
            String notes,
            CropSheet cropSheet,
            Garden garden
    ) {
        crop.setInitialQuantity(initialQuantity);
        crop.setTransplantDate(transplantDate);
        crop.setHarvestedQuantity(harvestedQuantity);
        crop.setEndDate(endDate);
        crop.setNotes(notes);
        crop.setCropSheet(cropSheet);
        crop.setGarden(garden);
    }

    private Crop findOwnedEntity(Long userId, Long id) {
        Crop crop = findEntityById(id);

        if (!crop.getCropSheet().getUser().getId().equals(userId)) {
            throw new ForbiddenException("No puedes acceder al cultivo con id " + id);
        }

        return crop;
    }

    private Garden findOwnedGarden(Long userId, Long gardenId) {
        Garden garden = findGardenById(gardenId);

        if (!garden.getUser().getId().equals(userId)) {
            throw new ForbiddenException("No puedes acceder al huerto con id " + gardenId);
        }

        return garden;
    }

    private Crop findEntityById(Long id) {
        return cropRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un cultivo con id " + id));
    }

    private Garden findGardenById(Long id) {
        return gardenRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un huerto con id " + id));
    }

    private CropResponse toResponse(Crop crop) {
        CropSheet cropSheet = crop.getCropSheet();
        Garden garden = crop.getGarden();

        return new CropResponse(
                crop.getId(),
                crop.getInitialQuantity(),
                crop.getTransplantDate(),
                crop.getHarvestedQuantity(),
                crop.getEndDate(),
                crop.getNotes(),
                cropSheet.getId(),
                cropSheet.getName(),
                garden.getId(),
                garden.getName(),
                crop.getCurrentQuantity()
        );
    }
}
