package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.ServiceDTO;
import com.barbearia.saas_backend.model.ServiceEntity;
import com.barbearia.saas_backend.repository.ServiceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceService {

    private final ServiceRepository serviceRepository;

    public ServiceService(ServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    public List<ServiceDTO> getAll() {
        return serviceRepository.findAll().stream()
            .map(s -> new ServiceDTO(s.getId(), s.getName(), s.getDuration(), s.getPrice(), s.getBarbershop().getId()))
            .toList();
    }

    public ServiceDTO getById(Long id) {
        ServiceEntity s = serviceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Service not found"));
        return new ServiceDTO(s.getId(), s.getName(), s.getDuration(), s.getPrice(), s.getBarbershop().getId());
    }

    public List<ServiceDTO> getByBarbershop(Long barbershopId) {
        return serviceRepository.findByBarbershopId(barbershopId).stream()
            .map(s -> new ServiceDTO(s.getId(), s.getName(), s.getDuration(), s.getPrice(), s.getBarbershop().getId()))
            .toList();
    }

    public ServiceEntity create(ServiceEntity service) {
        return serviceRepository.save(service);
    }

    public ServiceEntity update(Long id, ServiceEntity serviceDetails) {
        ServiceEntity service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));
        service.setName(serviceDetails.getName());
        service.setDuration(serviceDetails.getDuration());
        service.setPrice(serviceDetails.getPrice());
        return serviceRepository.save(service);
    }

    public void delete(Long id) {
        serviceRepository.deleteById(id);
    }
}
