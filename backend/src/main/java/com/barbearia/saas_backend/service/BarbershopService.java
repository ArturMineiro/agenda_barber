// src/main/java/com/barbearia/saas_backend/service/BarbershopService.java
package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.model.Barbershop;
import com.barbearia.saas_backend.repository.BarbershopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BarbershopService {

    private final BarbershopRepository repository;

    @Transactional(readOnly = true)
    public List<Barbershop> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Barbershop findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Barbershop not found: id=" + id));
    }

    @Transactional
    public Barbershop create(Barbershop b) {
        if (repository.existsByTaxId(b.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (b.getEmail() != null && repository.existsByEmail(b.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }
        return repository.save(b);
    }

    @Transactional
    public Barbershop update(Long id, Barbershop b) {
        Barbershop current = findById(id);

        // Validations for unique fields
        if (!current.getTaxId().equals(b.getTaxId()) && repository.existsByTaxId(b.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (b.getEmail() != null && !b.getEmail().equals(current.getEmail()) && repository.existsByEmail(b.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }

        current.setName(b.getName());
        current.setTaxId(b.getTaxId());
        current.setAddress(b.getAddress());
        current.setPhone(b.getPhone());
        current.setEmail(b.getEmail());
        return repository.save(current);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
