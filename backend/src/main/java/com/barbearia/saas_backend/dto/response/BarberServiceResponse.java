package com.barbearia.saas_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BarberServiceResponse {
    private Long id;
    private Long barberId;
    private Long serviceId;
}
