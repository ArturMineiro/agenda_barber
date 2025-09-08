package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.BarberServiceDTO;
import com.barbearia.saas_backend.dto.AssignServiceRequest;
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
    public List<BarberServiceDTO> getAll() {
        return barberServiceService.getAll();
    }

    @PostMapping
    public BarberServiceDTO assignServiceToBarber(@RequestBody AssignServiceRequest request) {
        return barberServiceService.assignServiceToBarber(request.getBarberId(), request.getServiceId());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        barberServiceService.delete(id);
    }
    @PutMapping("/{id}")
public BarberServiceDTO updateBarberService(
        @PathVariable Long id,
        @RequestBody AssignServiceRequest request) {
    return barberServiceService.updateBarberService(id, request.getBarberId(), request.getServiceId());
}

}
