package com.barbearia.saas_backend.dto.response;

import lombok.*;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarberScheduleResponse {
    private Long id;
    private Long barberId;
    private Long barbershopId;
    private Integer weekday; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
