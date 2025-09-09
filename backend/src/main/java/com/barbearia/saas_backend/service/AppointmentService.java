package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.AppointmentRequest;
import com.barbearia.saas_backend.dto.response.AppointmentResponse;
import com.barbearia.saas_backend.model.*;
import com.barbearia.saas_backend.repository.AppointmentRepository;
import com.barbearia.saas_backend.repository.UserRepository;
import com.barbearia.saas_backend.repository.BarbershopRepository;
import com.barbearia.saas_backend.repository.ServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final BarbershopRepository barbershopRepository;
    private final ServiceRepository serviceRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              UserRepository userRepository,
                              BarbershopRepository barbershopRepository,
                              ServiceRepository serviceRepository) {
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.barbershopRepository = barbershopRepository;
        this.serviceRepository = serviceRepository;
    }

    public List<AppointmentResponse> getAll() {
        return appointmentRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AppointmentResponse getById(Long id) {
        return toDTO(appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found")));
    }

    @Transactional
    public AppointmentResponse create(AppointmentRequest request) {
        UserEntity client = userRepository.findById(request.getClientId())
                .orElseThrow(() -> new RuntimeException("Client not found"));
        UserEntity barber = userRepository.findById(request.getBarberId())
                .orElseThrow(() -> new RuntimeException("Barber not found"));
        BarbershopEntity barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));
        ServiceEntity service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service not found"));

        AppointmentEntity appointment = AppointmentEntity.builder()
                .client(client)
                .barber(barber)
                .barbershop(barbershop)
                .service(service)
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(request.getStatus())
                .build();

        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse update(Long id, AppointmentRequest request) {
        AppointmentEntity appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        UserEntity client = userRepository.findById(request.getClientId())
                .orElseThrow(() -> new RuntimeException("Client not found"));
        UserEntity barber = userRepository.findById(request.getBarberId())
                .orElseThrow(() -> new RuntimeException("Barber not found"));
        BarbershopEntity barbershop = barbershopRepository.findById(request.getBarbershopId())
                .orElseThrow(() -> new RuntimeException("Barbershop not found"));
        ServiceEntity service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service not found"));

        appointment.setClient(client);
        appointment.setBarber(barber);
        appointment.setBarbershop(barbershop);
        appointment.setService(service);
        appointment.setDate(request.getDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getEndTime());
        appointment.setStatus(request.getStatus());

        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public void delete(Long id) {
        appointmentRepository.deleteById(id);
    }

    private AppointmentResponse toDTO(AppointmentEntity appointment) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .clientId(appointment.getClient().getId())
                .barberId(appointment.getBarber().getId())
                .barbershopId(appointment.getBarbershop().getId())
                .serviceId(appointment.getService().getId())
                .date(appointment.getDate())
                .startTime(appointment.getStartTime())
                .endTime(appointment.getEndTime())
                .status(appointment.getStatus())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .build();
    }
}
