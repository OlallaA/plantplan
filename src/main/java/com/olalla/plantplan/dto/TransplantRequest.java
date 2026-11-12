package com.olalla.plantplan.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TransplantRequest(@NotNull @Positive Integer quantity, @NotNull @Positive Long gardenId) {
}
