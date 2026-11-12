package com.olalla.plantplan.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record QuantityAdjustmentRequest(
        @NotNull @Positive Integer expectedQuantity,
        @NotNull @PositiveOrZero Integer quantity
) {
    public void validateAgainst(int currentQuantity) {
        if (expectedQuantity != currentQuantity) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La cantidad disponible ha cambiado");
        }
        if (quantity >= currentQuantity) {
            throw new IllegalArgumentException("La nueva cantidad debe ser menor que la cantidad disponible");
        }
    }
}
