package com.barbearia.saas_backend.service;
import com.barbearia.saas_backend.dto.request.ServiceRequest;
import com.barbearia.saas_backend.dto.response.ServiceResponse;
import com.barbearia.saas_backend.model.Barbershop;
import com.barbearia.saas_backend.model.ServiceEntity;
import com.barbearia.saas_backend.repository.ServiceRepository;
import org.springframework.stereotype.Service;
import com.barbearia.saas_backend.repository.BarbershopRepository;
import java.util.List;

@Service
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final BarbershopRepository barbershopRepository;

    public ServiceService(ServiceRepository serviceRepository, BarbershopRepository barbershopRepository) {
        this.serviceRepository = serviceRepository;
        this.barbershopRepository = barbershopRepository;
    }

    public List<ServiceResponse> getAll() {
        return serviceRepository.findAll()
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public ServiceResponse getById(Long id) {
        ServiceEntity s = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));
        return toDTO(s);
    }

    public List<ServiceResponse> getByBarbershop(Long barbershopId) {
        return serviceRepository.findByBarbershopId(barbershopId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public ServiceResponse create(ServiceRequest request) {
        Barbershop barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));

        ServiceEntity service = ServiceEntity.builder()
                .name(request.getName())
                .duration(request.getDuration())
                .price(request.getPrice())
                .barbershop(barbershop)
                .build();

        return toDTO(serviceRepository.save(service));
    }

    public ServiceResponse update(Long id, ServiceRequest request) {
        ServiceEntity service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        Barbershop barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));

        service.setName(request.getName());
        service.setDuration(request.getDuration());
        service.setPrice(request.getPrice());
        service.setBarbershop(barbershop);

        return toDTO(serviceRepository.save(service));
    }

    public void delete(Long id) {
        serviceRepository.deleteById(id);
    }

    private ServiceResponse toDTO(ServiceEntity s) {
        return new ServiceResponse(
                s.getId(),
                s.getName(),
                s.getDuration(),
                s.getPrice(),
                s.getBarbershop().getId()
        );
    }
}
