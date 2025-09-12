package com.barbearia.saas_backend.repository;

import com.barbearia.saas_backend.model.CustomerSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerSubscriptionRepository extends JpaRepository<CustomerSubscriptionEntity, Long> {
    List<CustomerSubscriptionEntity> findByUserId(Long userId);
}
