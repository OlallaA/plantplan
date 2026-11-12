package com.olalla.plantplan.dto;

import java.util.List;

public record SowResponse(SeedlingResponse seedling, List<SeedResponse> seeds) {
}
