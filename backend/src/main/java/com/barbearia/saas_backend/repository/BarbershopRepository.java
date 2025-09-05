// src/main/java/com/barbearia/saas_backend/repository/BarbershopRepository.java
package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.Barbershop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BarbershopRepository extends JpaRepository<Barbershop, Long> {
    Optional<Barbershop> findByEmail(String email);
    Optional<Barbershop> findByTaxId(String taxId);
    boolean existsByTaxId(String taxId);
    boolean existsByEmail(String email);
}
