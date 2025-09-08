package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    List<ServiceEntity> findByBarbershopId(Long barbershopId);
}
