package com.barbearia.saas_backend.dto.response;

import com.barbearia.saas_backend.model.AppointmentEntity.AppointmentStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentResponse {

    private Long id;
    private Long clientId;
    private Long barbershopId;
    private Long barberId;
    private Long serviceId;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private AppointmentStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
