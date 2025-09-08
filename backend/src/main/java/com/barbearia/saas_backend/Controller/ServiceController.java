package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.ServiceDTO;
import com.barbearia.saas_backend.model.ServiceEntity;
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
    public List<ServiceDTO> getAll() {
        return serviceService.getAll();
    }

    @GetMapping("/{id}")
    public ServiceDTO getById(@PathVariable Long id) {
        return serviceService.getById(id);
    }

    @GetMapping("/barbershop/{barbershopId}")
    public List<ServiceDTO> getByBarbershop(@PathVariable Long barbershopId) {
        return serviceService.getByBarbershop(barbershopId);
    }

    @PostMapping
    public ServiceEntity create(@RequestBody ServiceEntity service) {
        return serviceService.create(service);
    }

    @PutMapping("/{id}")
    public ServiceEntity update(@PathVariable Long id, @RequestBody ServiceEntity serviceDetails) {
        return serviceService.update(id, serviceDetails);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        serviceService.delete(id);
    }
}
