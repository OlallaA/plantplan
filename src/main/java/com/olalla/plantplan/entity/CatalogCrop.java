package com.olalla.plantplan.entity;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Month;

@Entity
@Table(name = "catalog_crops")
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class CatalogCrop {

    @Id
    @Column(length = 40)
    private String id;

    private String nameGl;
    private String nameEs;

    @Enumerated(EnumType.STRING)
    private PlantingMethod plantingMethod;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month sowingStart;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month sowingEnd;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month transplantStart;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month transplantEnd;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month harvestStart;

    @Enumerated(EnumType.STRING)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Month harvestEnd;

    @Enumerated(EnumType.STRING)
    private SunExposure sunExposure;

    private int waterMin;
    private int waterMax;
    private boolean wateringGeneral;

    @Column(columnDefinition = "TEXT")
    private String notesGl;

    @Column(columnDefinition = "TEXT")
    private String notesEs;

    @Column(length = 500)
    private String growingSource;

    @Column(length = 500)
    private String wateringSource;

    protected CatalogCrop() {
    }

    public String getId() {
        return id;
    }

    public String getNameGl() {
        return nameGl;
    }

    public String getNameEs() {
        return nameEs;
    }

    public int getWaterMin() {
        return waterMin;
    }

    public int getWaterMax() {
        return waterMax;
    }

    public boolean isWateringGeneral() {
        return wateringGeneral;
    }

    public void fillMissingDetails(CropSheet sheet, boolean useSpanish) {
        sheet.setCatalogCrop(this);
        if (sheet.getSowingStartMonth() == null && sheet.getSowingEndMonth() == null) {
            sheet.setSowingStartMonth(sowingStart);
            sheet.setSowingEndMonth(sowingEnd);
        }
        if (sheet.getTransplantStartMonth() == null && sheet.getTransplantEndMonth() == null) {
            sheet.setTransplantStartMonth(transplantStart);
            sheet.setTransplantEndMonth(transplantEnd);
        }
        if (sheet.getHarvestStartMonth() == null && sheet.getHarvestEndMonth() == null) {
            sheet.setHarvestStartMonth(harvestStart);
            sheet.setHarvestEndMonth(harvestEnd);
        }
        if (sheet.getSunExposure() == null) {
            sheet.setSunExposure(sunExposure);
        }
        if (sheet.getNotes() == null || sheet.getNotes().isBlank()) {
            sheet.setNotes(useSpanish ? notesEs : notesGl);
        }
    }

    public enum PlantingMethod {
        DIRECT, SEEDBED, PROTECTED, TUBER, CLOVE
    }
}
