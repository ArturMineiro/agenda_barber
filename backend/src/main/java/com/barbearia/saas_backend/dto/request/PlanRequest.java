package com.barbearia.saas_backend.dto.request;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class PlanRequest {

    private String name;
    private Integer maxBarbershops;
    private Integer maxEmployees;
    private BigDecimal basePrice;
    private String features; 
}
