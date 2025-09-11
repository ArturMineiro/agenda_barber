package com.barbearia.saas_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING) // SMALL, MEDIUM, LARGE
    @Column(nullable = false, unique = true)
    private PlanName name;

    @Column(nullable = false)
    private Integer maxBarbershops;

    @Column(nullable = false)
    private Integer maxEmployees;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Lob
    private String features;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum PlanName {
        SMALL,
        MEDIUM,
        LARGE
    }
}
