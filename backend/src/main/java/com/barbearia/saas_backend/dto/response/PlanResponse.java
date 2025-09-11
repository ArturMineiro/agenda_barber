package com.barbearia.saas_backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class PlanResponse {
    private Long id;
    private String name;
    private Integer maxBarbershops;
    private Integer maxEmployees;
    private BigDecimal basePrice;
    private String features; 
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    
}
