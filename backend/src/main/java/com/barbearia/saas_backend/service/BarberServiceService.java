package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.BarberServiceDTO;
import com.barbearia.saas_backend.model.BarberServiceEntity;
import com.barbearia.saas_backend.model.ServiceEntity;
import com.barbearia.saas_backend.model.User;
import com.barbearia.saas_backend.repository.BarberServiceRepository;
import com.barbearia.saas_backend.repository.ServiceRepository;
import com.barbearia.saas_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class BarberServiceService {

    private final BarberServiceRepository barberServiceRepository;
    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;

    public BarberServiceService(BarberServiceRepository barberServiceRepository,
                                UserRepository userRepository,
                                ServiceRepository serviceRepository) {
        this.barberServiceRepository = barberServiceRepository;
        this.userRepository = userRepository;
        this.serviceRepository = serviceRepository;
    }

    public List<BarberServiceDTO> getAll() {
        return barberServiceRepository.findAll()
                .stream()
                .map(entity -> new BarberServiceDTO(
                        entity.getId(),
                        entity.getBarber().getId(),
                        entity.getService().getId()
                ))
                .collect(Collectors.toList());
    }

    public BarberServiceDTO assignServiceToBarber(Long barberId, Long serviceId) {
        User barber = userRepository.findById(barberId)
                .orElseThrow(() -> new RuntimeException("Barber not found"));
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        BarberServiceEntity entity = BarberServiceEntity.builder()
                .barber(barber)
                .service(service)
                .build();

        BarberServiceEntity saved = barberServiceRepository.save(entity);

        return new BarberServiceDTO(saved.getId(), barber.getId(), service.getId());
    }

    public void delete(Long id) {
        barberServiceRepository.deleteById(id);
    }

    public BarberServiceDTO updateBarberService(Long id, Long barberId, Long serviceId) {
        BarberServiceEntity entity = barberServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("BarberService not found"));
    
        User barber = userRepository.findById(barberId)
                .orElseThrow(() -> new RuntimeException("Barber not found"));
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));
    
        entity.setBarber(barber);
        entity.setService(service);
    
        BarberServiceEntity updated = barberServiceRepository.save(entity);
    
        return new BarberServiceDTO(updated.getId(), barber.getId(), service.getId());
    }
    
}
