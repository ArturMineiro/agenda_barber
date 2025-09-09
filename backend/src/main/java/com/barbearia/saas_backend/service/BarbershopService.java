// src/main/java/com/barbearia/saas_backend/service/BarbershopService.java
package com.barbearia.saas_backend.service;
import com.barbearia.saas_backend.dto.response.BarbershopResponse;
import com.barbearia.saas_backend.dto.request.BarbershopRequest;
import com.barbearia.saas_backend.model.BarbershopEntity;
import com.barbearia.saas_backend.model.UserEntity;
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
    public List<BarbershopResponse> findAll() {
        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BarbershopResponse findById(Long id) {
        BarbershopEntity barbershop = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Barbershop not found: id=" + id));
        return toResponse(barbershop);
    }

    @Transactional
    public BarbershopResponse create(BarbershopRequest request) {
        if (repository.existsByTaxId(request.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (request.getEmail() != null && repository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }

        UserEntity owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new IllegalArgumentException("Owner user not found: id=" + request.getOwnerId()));

        BarbershopEntity b = BarbershopEntity.builder()
                .name(request.getName())
                .taxId(request.getTaxId())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .owner(owner)
                .build();

        return toResponse(repository.save(b));
    }

    @Transactional
    public BarbershopResponse update(Long id, BarbershopRequest request) {
        BarbershopEntity current = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Barbershop not found: id=" + id));

        if (!current.getTaxId().equals(request.getTaxId()) && repository.existsByTaxId(request.getTaxId())) {
            throw new IllegalArgumentException("taxId already in use");
        }
        if (request.getEmail() != null && !request.getEmail().equals(current.getEmail()) && repository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("email already in use");
        }

        UserEntity owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new IllegalArgumentException("Owner user not found: id=" + request.getOwnerId()));

        current.setName(request.getName());
        current.setTaxId(request.getTaxId());
        current.setAddress(request.getAddress());
        current.setPhone(request.getPhone());
        current.setEmail(request.getEmail());
        current.setOwner(owner);

        return toResponse(repository.save(current));
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    // Converter Entity -> DTO de resposta
    private BarbershopResponse toResponse(BarbershopEntity b) {
        return new BarbershopResponse(
                b.getId(),
                b.getName(),
                b.getTaxId(),
                b.getAddress(),
                b.getPhone(),
                b.getEmail(),
                b.getOwner() != null ? b.getOwner().getId() : null
        );
    }
}
