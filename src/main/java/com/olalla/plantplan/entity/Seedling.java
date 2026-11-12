package com.olalla.plantplan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "seedlings")
public class Seedling {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer sownQuantity;

    private LocalDate sowingDate;
    private Integer transplantedQuantity;
    private Integer lostQuantity;
    private LocalDate transplantDate;
    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_sheet_id", nullable = false)
    private CropSheet cropSheet;

    public Seedling() {
    }

    public Long getId() {
        return id;
    }

    public Integer getSownQuantity() {
        return sownQuantity;
    }

    public void setSownQuantity(Integer sownQuantity) {
        this.sownQuantity = sownQuantity;
    }

    public LocalDate getSowingDate() {
        return sowingDate;
    }

    public void setSowingDate(LocalDate sowingDate) {
        this.sowingDate = sowingDate;
    }

    public Integer getTransplantedQuantity() {
        return transplantedQuantity;
    }

    public void setTransplantedQuantity(Integer transplantedQuantity) {
        this.transplantedQuantity = transplantedQuantity;
    }

    public int getRemainingQuantity() {
        return (int) Math.max(0, (long) sownQuantity - Objects.requireNonNullElse(transplantedQuantity, 0)
                - Objects.requireNonNullElse(lostQuantity, 0));
    }

    public void recordLoss(int quantity) {
        lostQuantity = Objects.requireNonNullElse(lostQuantity, 0) + quantity;
    }

    public LocalDate getTransplantDate() {
        return transplantDate;
    }

    public void setTransplantDate(LocalDate transplantDate) {
        this.transplantDate = transplantDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public CropSheet getCropSheet() {
        return cropSheet;
    }

    public void setCropSheet(CropSheet cropSheet) {
        this.cropSheet = cropSheet;
    }
}
