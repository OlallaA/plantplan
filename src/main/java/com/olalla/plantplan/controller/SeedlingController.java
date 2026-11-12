package com.olalla.plantplan.controller;

import com.olalla.plantplan.dto.QuantityAdjustmentRequest;
import com.olalla.plantplan.dto.SeedlingCreateRequest;
import com.olalla.plantplan.dto.SeedlingEntryRequest;
import com.olalla.plantplan.dto.SeedlingEntryResponse;
import com.olalla.plantplan.dto.SeedlingResponse;
import com.olalla.plantplan.dto.SeedlingUpdateRequest;
import com.olalla.plantplan.dto.SowRequest;
import com.olalla.plantplan.dto.SowResponse;
import com.olalla.plantplan.dto.TransplantRequest;
import com.olalla.plantplan.dto.TransplantResponse;
import com.olalla.plantplan.security.AuthenticatedUser;
import com.olalla.plantplan.service.SeedlingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SeedlingController {

    private final SeedlingService seedlingService;

    public SeedlingController(SeedlingService seedlingService) {
        this.seedlingService = seedlingService;
    }

    @GetMapping("/seedlings")
    public List<SeedlingResponse> findAll(@AuthenticationPrincipal AuthenticatedUser user) {
        return seedlingService.findByUserId(user.id());
    }

    @GetMapping("/crop-sheets/{cropSheetId}/seedlings")
    public List<SeedlingResponse> findByCropSheetId(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long cropSheetId
    ) {
        return seedlingService.findByCropSheetId(user.id(), cropSheetId);
    }

    @GetMapping("/seedlings/{id}")
    public SeedlingResponse findById(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        return seedlingService.findById(user.id(), id);
    }

    @PostMapping("/seedlings")
    @ResponseStatus(HttpStatus.CREATED)
    public SeedlingResponse create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody SeedlingCreateRequest request
    ) {
        return seedlingService.create(user.id(), request);
    }

    @PostMapping("/seedlings/entry")
    @ResponseStatus(HttpStatus.CREATED)
    public SeedlingEntryResponse registerPlantlets(@AuthenticationPrincipal AuthenticatedUser user,
                                                  @Valid @RequestBody SeedlingEntryRequest request) {
        return seedlingService.registerPlantlets(user.id(), request);
    }

    @PostMapping("/crop-sheets/{cropSheetId}/sow")
    @ResponseStatus(HttpStatus.CREATED)
    public SowResponse sow(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long cropSheetId,
                           @Valid @RequestBody SowRequest request) {
        return seedlingService.sow(user.id(), cropSheetId, request);
    }

    @PostMapping("/seedlings/{id}/transplant")
    @ResponseStatus(HttpStatus.CREATED)
    public TransplantResponse transplant(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
                                         @Valid @RequestBody TransplantRequest request) {
        return seedlingService.transplant(user.id(), id, request);
    }

    @PutMapping("/seedlings/{id}")
    public SeedlingResponse update(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @Valid @RequestBody SeedlingUpdateRequest request
    ) {
        return seedlingService.update(user.id(), id, request);
    }

    @PutMapping("/seedlings/{id}/quantity")
    public SeedlingResponse adjustQuantity(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @Valid @RequestBody QuantityAdjustmentRequest request
    ) {
        return seedlingService.adjustQuantity(user.id(), id, request);
    }

    @DeleteMapping("/seedlings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id
    ) {
        seedlingService.delete(user.id(), id);
    }
}
