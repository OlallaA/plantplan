package com.olalla.plantplan.controller;

import com.olalla.plantplan.entity.CatalogCrop;
import com.olalla.plantplan.repository.CatalogCropRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CatalogController {

    private final CatalogCropRepository repository;

    public CatalogController(CatalogCropRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/catalog")
    public List<CatalogCrop> list() {
        return repository.findAll();
    }
}
