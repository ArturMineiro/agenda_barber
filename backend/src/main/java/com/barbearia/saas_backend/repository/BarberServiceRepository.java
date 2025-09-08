package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.BarberServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BarberServiceRepository extends JpaRepository<BarberServiceEntity, Long> {
    List<BarberServiceEntity> findByBarberId(Long barberId);
    List<BarberServiceEntity> findByServiceId(Long serviceId);
}
