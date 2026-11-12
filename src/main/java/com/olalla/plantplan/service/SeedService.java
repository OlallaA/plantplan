package com.olalla.plantplan.service;

import com.olalla.plantplan.dto.QuantityAdjustmentRequest;
import com.olalla.plantplan.dto.SeedCreateRequest;
import com.olalla.plantplan.dto.SeedResponse;
import com.olalla.plantplan.dto.SeedStockRequest;
import com.olalla.plantplan.dto.SeedStockResponse;
import com.olalla.plantplan.dto.SeedUpdateRequest;
import com.olalla.plantplan.entity.CropSheet;
import com.olalla.plantplan.entity.Seed;
import com.olalla.plantplan.exception.ForbiddenException;
import com.olalla.plantplan.exception.ResourceNotFoundException;
import com.olalla.plantplan.repository.CropSheetRepository;
import com.olalla.plantplan.repository.SeedRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class SeedService {

    private final SeedRepository seedRepository;
    private final CropSheetRepository cropSheetRepository;
    private final ReminderService reminderService;
    private final CropSheetService cropSheetService;

    public SeedService(
            SeedRepository seedRepository,
            CropSheetRepository cropSheetRepository,
            ReminderService reminderService,
            CropSheetService cropSheetService
    ) {
        this.seedRepository = seedRepository;
        this.cropSheetRepository = cropSheetRepository;
        this.reminderService = reminderService;
        this.cropSheetService = cropSheetService;
    }

    @Transactional(readOnly = true)
    public List<SeedResponse> findByUserId(Long userId) {
        return seedRepository.findByCropSheetUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SeedResponse> findByCropSheetId(Long userId, Long cropSheetId) {
        findOwnedCropSheet(userId, cropSheetId);

        return seedRepository.findByCropSheetId(cropSheetId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SeedResponse findById(Long userId, Long id) {
        return toResponse(findOwnedEntity(userId, id));
    }

    @Transactional
    public SeedResponse create(Long userId, SeedCreateRequest request) {
        cropSheetService.lockUser(userId);
        CropSheet cropSheet = findOwnedCropSheet(userId, request.cropSheetId());
        return toResponse(createSeed(cropSheet, request.quantity(), request.notes()));
    }

    @Transactional
    public SeedStockResponse addStock(Long userId, SeedStockRequest request) {
        CropSheet sheet = cropSheetService.findOrCreateByName(userId, request.name(), request.variety(),
                request.catalogId(), request.catalogLanguage());
        SeedResponse seed = increaseStock(sheet, request.quantity(), request.notes());
        return new SeedStockResponse(seed, cropSheetService.toResponse(sheet));
    }

    @Transactional
    public SeedResponse addStockToSheet(Long userId, Long cropSheetId, int quantity) {
        cropSheetService.lockUser(userId);
        return increaseStock(findOwnedCropSheet(userId, cropSheetId), quantity, null);
    }

    private SeedResponse increaseStock(CropSheet sheet, int quantity, String notes) {
        List<Seed> entries = seedRepository.findByCropSheetId(sheet.getId());
        long stock = entries.stream().mapToLong(Seed::getQuantity).sum();
        if (stock + quantity > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("La cantidad total de semillas supera el máximo permitido");
        }

        Seed seed = entries.stream().min(Comparator.comparing(Seed::getId)).orElse(null);
        if (seed == null) {
            seed = createSeed(sheet, quantity, notes);
        } else {
            seed.setQuantity(seed.getQuantity() + quantity);
            if (notes != null && !notes.isBlank()) {
                String previous = seed.getNotes();
                String note = notes.strip();
                seed.setNotes(previous == null || previous.isBlank() ? note : previous + "\n" + note);
            }
            reminderService.generateForSeed(seed);
        }
        return toResponse(seed);
    }

    List<SeedResponse> consumeStock(CropSheet sheet, int quantity) {
        List<Seed> entries = seedRepository.findByCropSheetId(sheet.getId()).stream()
                .filter(seed -> seed.getQuantity() > 0)
                .sorted(Comparator.comparing(Seed::getId))
                .toList();
        long available = entries.stream().mapToLong(Seed::getQuantity).sum();
        if (available < quantity) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No hay suficientes semillas para sembrar");
        }

        List<SeedResponse> updated = new ArrayList<>();
        int remaining = quantity;
        for (Seed seed : entries) {
            if (remaining == 0) break;
            int consumed = Math.min(seed.getQuantity(), remaining);
            seed.setQuantity(seed.getQuantity() - consumed);
            remaining -= consumed;
            if (seed.getQuantity() == 0) reminderService.generateForSeed(seed);
            updated.add(toResponse(seed));
        }
        return updated;
    }

    private Seed createSeed(CropSheet cropSheet, Integer quantity, String notes) {
        Seed seed = new Seed();
        seed.setQuantity(quantity);
        seed.setNotes(notes);
        seed.setCropSheet(cropSheet);

        Seed saved = seedRepository.save(seed);
        reminderService.generateForSeed(saved);
        return saved;
    }

    @Transactional
    public SeedResponse update(Long userId, Long id, SeedUpdateRequest request) {
        cropSheetService.lockUser(userId);
        Seed seed = findOwnedEntity(userId, id);
        CropSheet cropSheet = findOwnedCropSheet(userId, request.cropSheetId());

        seed.setQuantity(request.quantity());
        seed.setNotes(request.notes());
        seed.setCropSheet(cropSheet);

        reminderService.generateForSeed(seed);
        return toResponse(seed);
    }

    @Transactional
    public SeedResponse adjustQuantity(Long userId, Long id, QuantityAdjustmentRequest request) {
        cropSheetService.lockUser(userId);
        Seed seed = findOwnedEntity(userId, id);
        int current = seed.getQuantity();
        request.validateAgainst(current);
        seed.setQuantity(request.quantity());
        reminderService.generateForSeed(seed);
        return toResponse(seed);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        cropSheetService.lockUser(userId);
        Seed seed = findOwnedEntity(userId, id);
        reminderService.deleteForSeed(id);
        seedRepository.delete(seed);
    }

    private Seed findOwnedEntity(Long userId, Long id) {
        Seed seed = findEntityById(id);

        if (!seed.getCropSheet().getUser().getId().equals(userId)) {
            throw new ForbiddenException("No puedes acceder a la semilla con id " + id);
        }

        return seed;
    }

    private CropSheet findOwnedCropSheet(Long userId, Long cropSheetId) {
        CropSheet cropSheet = findCropSheetById(cropSheetId);

        if (!cropSheet.getUser().getId().equals(userId)) {
            throw new ForbiddenException(
                    "No puedes acceder a la ficha de cultivo con id " + cropSheetId
            );
        }

        return cropSheet;
    }

    private Seed findEntityById(Long id) {
        return seedRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe una semilla con id " + id));
    }

    private CropSheet findCropSheetById(Long id) {
        return cropSheetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe una ficha de cultivo con id " + id));
    }

    private SeedResponse toResponse(Seed seed) {
        CropSheet cropSheet = seed.getCropSheet();

        return new SeedResponse(
                seed.getId(),
                seed.getQuantity(),
                seed.getNotes(),
                cropSheet.getId(),
                cropSheet.getName()
        );
    }
}
