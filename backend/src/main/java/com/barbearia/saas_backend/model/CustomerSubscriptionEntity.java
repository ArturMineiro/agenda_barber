package com.barbearia.saas_backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSubscriptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Usuário associado (cliente ou administrador da barbearia)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private UserEntity user;

    // Plano associado
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @NotNull
    private PlanEntity plan;

    // Status da assinatura
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus status;

    // Data de início da assinatura
    @Column(name = "start_date", nullable = false)
    @NotNull
    private LocalDateTime startDate;

    // Data de término da assinatura
    @Column(name = "end_date", nullable = false)
    @NotNull
    private LocalDateTime endDate;

    // Preço total da assinatura
    @Column(name = "total_price", nullable = false)
    @NotNull
    private BigDecimal totalPrice;

    // Timestamp de criação
    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
   
    public enum SubscriptionStatus {
        ACTIVE,
        CANCELLED,
        EXPIRED
    }
}
