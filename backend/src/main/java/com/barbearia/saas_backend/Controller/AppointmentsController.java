package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.request.AppointmentRequest;
import com.barbearia.saas_backend.dto.response.AppointmentResponse;
import com.barbearia.saas_backend.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentsController {

    private final AppointmentService appointmentService;

    @GetMapping
    public List<AppointmentResponse> getAll() {
        return appointmentService.getAll();
    }

    @GetMapping("/{id}")
    public AppointmentResponse getById(@PathVariable Long id) {
        return appointmentService.getById(id);
    }

    @PostMapping
    public AppointmentResponse create(@RequestBody AppointmentRequest request) {
        return appointmentService.create(request);
    }

    @PutMapping("/{id}")
    public AppointmentResponse update(@PathVariable Long id, @RequestBody AppointmentRequest request) {
        return appointmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        appointmentService.delete(id);
    }
}
