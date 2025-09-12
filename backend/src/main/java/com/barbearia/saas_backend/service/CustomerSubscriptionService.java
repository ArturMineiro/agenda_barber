package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.CustomerSubscriptionRequest;
import com.barbearia.saas_backend.dto.response.CustomerSubscriptionResponse;
import com.barbearia.saas_backend.model.*;
import com.barbearia.saas_backend.repository.CustomerSubscriptionRepository;
import com.barbearia.saas_backend.repository.UserRepository;
import com.barbearia.saas_backend.repository.PlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerSubscriptionService {

    private final CustomerSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;

    public CustomerSubscriptionService(CustomerSubscriptionRepository subscriptionRepository,
                                       UserRepository userRepository,
                                       PlanRepository planRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.planRepository = planRepository;
    }

    public List<CustomerSubscriptionResponse> getAll() {
        return subscriptionRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CustomerSubscriptionResponse getById(Long id) {
        return toDTO(subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found")));
    }

    @Transactional
    public CustomerSubscriptionResponse create(CustomerSubscriptionRequest request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        PlanEntity plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        CustomerSubscriptionEntity subscription = CustomerSubscriptionEntity.builder()
                .user(user)
                .plan(plan)
                .status(request.getStatus())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalPrice(request.getTotalPrice())
                .build();

        return toDTO(subscriptionRepository.save(subscription));
    }

    @Transactional
    public CustomerSubscriptionResponse update(Long id, CustomerSubscriptionRequest request) {
        CustomerSubscriptionEntity subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found"));

        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        PlanEntity plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        subscription.setUser(user);
        subscription.setPlan(plan);
        subscription.setStatus(request.getStatus());
        subscription.setStartDate(request.getStartDate());
        subscription.setEndDate(request.getEndDate());
        subscription.setTotalPrice(request.getTotalPrice());

        return toDTO(subscriptionRepository.save(subscription));
    }

    @Transactional
    public void delete(Long id) {
        subscriptionRepository.deleteById(id);
    }

    private CustomerSubscriptionResponse toDTO(CustomerSubscriptionEntity subscription) {
        return CustomerSubscriptionResponse.builder()
                .id(subscription.getId())
                .userId(subscription.getUser().getId())
                .planId(subscription.getPlan().getId())
                .status(subscription.getStatus())
                .startDate(subscription.getStartDate())
                .endDate(subscription.getEndDate())
                .totalPrice(subscription.getTotalPrice())
                .createdAt(subscription.getCreatedAt())
                .updatedAt(subscription.getUpdatedAt())
                .build();
    }
}
