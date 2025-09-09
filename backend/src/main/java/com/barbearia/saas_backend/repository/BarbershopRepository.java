// src/main/java/com/barbearia/saas_backend/repository/BarbershopRepository.java
package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.BarbershopEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BarbershopRepository extends JpaRepository<BarbershopEntity, Long> {
    Optional<BarbershopEntity> findByEmail(String email);
    Optional<BarbershopEntity> findByTaxId(String taxId);
    boolean existsByTaxId(String taxId);
    boolean existsByEmail(String email);
}
