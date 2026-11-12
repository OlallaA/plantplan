package com.olalla.plantplan.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SeedlingEntryRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String variety,
        @Size(max = 40) String catalogId,
        @Pattern(regexp = "gl|es") String catalogLanguage,
        @NotNull @Positive Integer quantity
) {
}
