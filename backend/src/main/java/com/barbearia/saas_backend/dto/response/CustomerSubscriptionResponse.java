package com.barbearia.saas_backend.dto.response;

import com.barbearia.saas_backend.model.CustomerSubscriptionEntity.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CustomerSubscriptionResponse {
    private Long id;
    private Long userId;
    private Long planId;
    private SubscriptionStatus status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private BigDecimal totalPrice;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Builder pattern
    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final CustomerSubscriptionResponse resp = new CustomerSubscriptionResponse();

        public Builder id(Long id){ resp.id = id; return this; }
        public Builder userId(Long userId){ resp.userId = userId; return this; }
        public Builder planId(Long planId){ resp.planId = planId; return this; }
        public Builder status(SubscriptionStatus status){ resp.status = status; return this; }
        public Builder startDate(LocalDateTime startDate){ resp.startDate = startDate; return this; }
        public Builder endDate(LocalDateTime endDate){ resp.endDate = endDate; return this; }
        public Builder totalPrice(BigDecimal totalPrice){ resp.totalPrice = totalPrice; return this; }
        public Builder createdAt(LocalDateTime createdAt){ resp.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt){ resp.updatedAt = updatedAt; return this; }
        public CustomerSubscriptionResponse build(){ return resp; }
    }

    // Getters
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getPlanId() { return planId; }
    public SubscriptionStatus getStatus() { return status; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
