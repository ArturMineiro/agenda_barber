package com.barbearia.saas_backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
public class ServiceRequest {

    @NotBlank
    private String name;

    @NotNull
    @Min(1)
    private Integer duration; // duração em minutos

    @NotNull
    private BigDecimal price;

    @NotNull
    private Long barbershopId;
}
