package com.olalla.plantplan.config;

import com.olalla.plantplan.entity.CatalogCrop;
import com.olalla.plantplan.repository.CatalogCropRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

import java.util.Arrays;

@Configuration
public class CatalogSeedConfiguration {

    @Bean
    ApplicationRunner loadCropCatalog(CatalogCropRepository repository, JsonMapper mapper) {
        return args -> {
            try (var input = new ClassPathResource("crop-catalog.json").getInputStream()) {
                repository.saveAll(Arrays.asList(mapper.readValue(input, CatalogCrop[].class)));
            }
        };
    }
}
