package com.barbearia.saas_backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    // nullable to allow Google-only accounts
    private String password; 

    private String phone;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(unique = true)
    private String googleId;

    private String avatarUrl;

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

    public enum UserRole {
        CLIENT,
        BARBER,
        ADMIN_BARBERSHOP,
        SUPER_ADMIN
    }
}