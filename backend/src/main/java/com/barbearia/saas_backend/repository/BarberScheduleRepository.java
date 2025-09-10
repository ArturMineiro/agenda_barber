package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.BarberScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BarberScheduleRepository extends JpaRepository<BarberScheduleEntity, Long> {
    List<BarberScheduleEntity> findByBarberId(Long barberId);
    List<BarberScheduleEntity> findByBarbershopId(Long barbershopId);
}
