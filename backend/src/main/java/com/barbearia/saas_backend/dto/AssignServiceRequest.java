package com.barbearia.saas_backend.dto;

import lombok.Data;

@Data
public class AssignServiceRequest {
    private Long barberId;
    private Long serviceId;
}
