package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.request.BarberScheduleRequest;
import com.barbearia.saas_backend.dto.response.BarberScheduleResponse;
import com.barbearia.saas_backend.service.BarberScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/barber-schedules")
@RequiredArgsConstructor
public class BarberScheduleController {

    private final BarberScheduleService service;

    @GetMapping
    public List<BarberScheduleResponse> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public BarberScheduleResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/barber/{barberId}")
    public List<BarberScheduleResponse> getByBarber(@PathVariable Long barberId) {
        return service.getByBarber(barberId);
    }

    @PostMapping
    public BarberScheduleResponse create(@RequestBody BarberScheduleRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public BarberScheduleResponse update(@PathVariable Long id, @RequestBody BarberScheduleRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
