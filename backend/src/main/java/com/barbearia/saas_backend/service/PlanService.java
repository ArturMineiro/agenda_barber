package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.PlanRequest;
import com.barbearia.saas_backend.dto.response.PlanResponse;
import com.barbearia.saas_backend.model.PlanEntity;
import com.barbearia.saas_backend.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final PlanRepository repository;

    public List<PlanResponse> getAll() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public PlanResponse getById(Long id) {
        PlanEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
        return toDTO(entity);
    }

    public PlanResponse create(PlanRequest request) {
        PlanEntity entity = PlanEntity.builder()
                .name(PlanEntity.PlanName.valueOf(request.getName().toUpperCase()))
                .maxBarbershops(request.getMaxBarbershops())
                .maxEmployees(request.getMaxEmployees())
                .basePrice(request.getBasePrice())
                .features(request.getFeatures())
                .build();

        return toDTO(repository.save(entity));
    }

    public PlanResponse update(Long id, PlanRequest request) {
        PlanEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        entity.setName(PlanEntity.PlanName.valueOf(request.getName().toUpperCase()));
        entity.setMaxBarbershops(request.getMaxBarbershops());
        entity.setMaxEmployees(request.getMaxEmployees());
        entity.setBasePrice(request.getBasePrice());
        entity.setFeatures(request.getFeatures());

        return toDTO(repository.save(entity));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private PlanResponse toDTO(PlanEntity entity) {
        return PlanResponse.builder()
                .id(entity.getId())
                .name(entity.getName().name())
                .maxBarbershops(entity.getMaxBarbershops())
                .maxEmployees(entity.getMaxEmployees())
                .basePrice(entity.getBasePrice())
                .features(entity.getFeatures())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
