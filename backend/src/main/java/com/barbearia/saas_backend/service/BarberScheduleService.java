package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.BarberScheduleRequest;
import com.barbearia.saas_backend.dto.response.BarberScheduleResponse;
import com.barbearia.saas_backend.model.BarberScheduleEntity;
import com.barbearia.saas_backend.model.BarbershopEntity;
import com.barbearia.saas_backend.model.UserEntity;
import com.barbearia.saas_backend.repository.BarberScheduleRepository;
import com.barbearia.saas_backend.repository.BarbershopRepository;
import com.barbearia.saas_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BarberScheduleService {

    private final BarberScheduleRepository repository;
    private final UserRepository userRepository;
    private final BarbershopRepository barbershopRepository;

    public List<BarberScheduleResponse> getAll() {
        return repository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    public BarberScheduleResponse getById(Long id) {
        BarberScheduleEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Barber schedule not found"));
        return toDTO(entity);
    }

    public List<BarberScheduleResponse> getByBarber(Long barberId) {
        return repository.findByBarberId(barberId).stream()
                .map(this::toDTO)
                .toList();
    }

    public BarberScheduleResponse create(BarberScheduleRequest request) {
        UserEntity barber = userRepository.findById(request.getBarberId())
                .orElseThrow(() -> new RuntimeException("Barber not found"));

        BarbershopEntity barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));

        BarberScheduleEntity entity = BarberScheduleEntity.builder()
                .barber(barber)
                .barbershop(barbershop)
                .weekday(request.getWeekday())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        return toDTO(repository.save(entity));
    }

    public BarberScheduleResponse update(Long id, BarberScheduleRequest request) {
        BarberScheduleEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Barber schedule not found"));

        UserEntity barber = userRepository.findById(request.getBarberId())
                .orElseThrow(() -> new RuntimeException("Barber not found"));

        BarbershopEntity barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));

        entity.setBarber(barber);
        entity.setBarbershop(barbershop);
        entity.setWeekday(request.getWeekday());
        entity.setStartTime(request.getStartTime());
        entity.setEndTime(request.getEndTime());

        return toDTO(repository.save(entity));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private BarberScheduleResponse toDTO(BarberScheduleEntity entity) {
        return BarberScheduleResponse.builder()
                .id(entity.getId())
                .barberId(entity.getBarber().getId())
                .barbershopId(entity.getBarbershop().getId())
                .weekday(entity.getWeekday())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
