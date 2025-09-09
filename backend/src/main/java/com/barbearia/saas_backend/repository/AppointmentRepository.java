package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.AppointmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<AppointmentEntity, Long> {
    List<AppointmentEntity> findByClientId(Long clientId);
    List<AppointmentEntity> findByBarberId(Long barberId);
    List<AppointmentEntity> findByBarbershopId(Long barbershopId);
    List<AppointmentEntity> findByStatus(AppointmentEntity.AppointmentStatus status);
}
