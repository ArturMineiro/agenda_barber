package com.barbearia.saas_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class ServiceResponse {

    private Long id;
    private String name;
    private Integer duration;
    private BigDecimal price;
    private Long barbershopId;
}