package com.barbearia.saas_backend.dto.request;

import lombok.*;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class BarberScheduleRequest {
    
    private Long barberId;
    private Long barbershopId;
    private Integer weekday; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    private LocalTime startTime;
    private LocalTime endTime;
}
