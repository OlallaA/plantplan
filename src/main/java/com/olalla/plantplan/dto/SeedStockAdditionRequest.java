package com.olalla.plantplan.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SeedStockAdditionRequest(@NotNull @Positive Integer quantity) {
}
