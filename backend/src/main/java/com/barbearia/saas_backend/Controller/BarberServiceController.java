package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.request.BarberServiceRequest;
import com.barbearia.saas_backend.dto.response.BarberServiceResponse;
import com.barbearia.saas_backend.service.BarberServiceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/barber-services")
public class BarberServiceController {

    private final BarberServiceService barberServiceService;

    public BarberServiceController(BarberServiceService barberServiceService) {
        this.barberServiceService = barberServiceService;
    }

    @GetMapping
    public List<BarberServiceResponse> getAll() {
        return barberServiceService.getAll();
    }

    @PostMapping
    public BarberServiceResponse assignServiceToBarber(@RequestBody BarberServiceRequest request) {
        return barberServiceService.assignServiceToBarber(request.getBarberId(), request.getServiceId());
    }

    @PutMapping("/{id}")
    public BarberServiceResponse updateBarberService(@PathVariable Long id,
                                                @RequestBody BarberServiceRequest request) {
        return barberServiceService.updateBarberService(id, request.getBarberId(), request.getServiceId());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        barberServiceService.delete(id);
    }
}
