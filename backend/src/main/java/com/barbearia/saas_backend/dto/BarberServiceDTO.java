package com.barbearia.saas_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BarberServiceDTO {
    private Long id;
    private Long barberId;
    private Long serviceId;
}
