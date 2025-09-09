package com.barbearia.saas_backend.dto.request;

import lombok.Data;

@Data
public class BarberServiceRequest {
    private Long barberId;
    private Long serviceId;
}
