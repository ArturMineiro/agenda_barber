// src/main/java/com/barbearia/saas_backend/service/BarbershopService.java
package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.BarbershopRequest;
import com.barbearia.saas_backend.model.Barbershop;
import com.barbearia.saas_backend.model.User;
import com.barbearia.saas_backend.repository.BarbershopRepository;
import com.barbearia.saas_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BarbershopService {

    private final BarbershopRepository repository;
    private final UserRepository userRepository;

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
    public Barbershop create(BarbershopRequest request) {
        if (repository.existsByTaxId(request.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (request.getEmail() != null && repository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }

        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new IllegalArgumentException("Owner user not found: id=" + request.getOwnerId()));

        Barbershop b = Barbershop.builder()
                .name(request.getName())
                .taxId(request.getTaxId())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .owner(owner) // 🔑 vínculo com user
                .build();

        return repository.save(b);
    }

    @Transactional
    public Barbershop update(Long id, BarbershopRequest request) {
        Barbershop current = findById(id);

        if (!current.getTaxId().equals(request.getTaxId()) && repository.existsByTaxId(request.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (request.getEmail() != null && !request.getEmail().equals(current.getEmail()) && repository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }

        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new IllegalArgumentException("Owner user not found: id=" + request.getOwnerId()));

        current.setName(request.getName());
        current.setTaxId(request.getTaxId());
        current.setAddress(request.getAddress());
        current.setPhone(request.getPhone());
        current.setEmail(request.getEmail());
        current.setOwner(owner);

        return repository.save(current);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
