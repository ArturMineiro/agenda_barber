// src/main/java/com/barbearia/saas_backend/model/Barbershop.java
package com.barbearia.saas_backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "barbershops")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Barbershop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    // Can store CNPJ or CPF
    @Column(name = "tax_id", unique = true, nullable = false)
    private String taxId;

    private String address;

    private String phone;

    @Email
    @Column(unique = true)
    private String email;

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
}
