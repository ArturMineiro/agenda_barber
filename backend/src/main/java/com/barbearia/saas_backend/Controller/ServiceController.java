package com.barbearia.saas_backend.Controller;
import com.barbearia.saas_backend.dto.request.ServiceRequest;
import com.barbearia.saas_backend.dto.response.ServiceResponse;
import com.barbearia.saas_backend.service.ServiceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceService serviceService;

    public ServiceController(ServiceService serviceService) {
        this.serviceService = serviceService;
    }

    @GetMapping
    public List<ServiceResponse> getAll() {
        return serviceService.getAll();
    }

    @GetMapping("/{id}")
    public ServiceResponse getById(@PathVariable Long id) {
        return serviceService.getById(id);
    }

    @GetMapping("/barbershop/{barbershopId}")
    public List<ServiceResponse> getByBarbershop(@PathVariable Long barbershopId) {
        return serviceService.getByBarbershop(barbershopId);
    }

    @PostMapping
    public ServiceResponse create(@RequestBody ServiceRequest request) {
        return serviceService.create(request);
    }

    @PutMapping("/{id}")
    public ServiceResponse update(@PathVariable Long id, @RequestBody ServiceRequest request) {
        return serviceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        serviceService.delete(id);
    }
}