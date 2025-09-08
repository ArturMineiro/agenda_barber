package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.BarbershopRequest;
import com.barbearia.saas_backend.model.Barbershop;
import com.barbearia.saas_backend.service.BarbershopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/barbershops")
@RequiredArgsConstructor
public class BarbershopController {

    private final BarbershopService service;

    @GetMapping
    public ResponseEntity<List<Barbershop>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Barbershop> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<Barbershop> create(@Valid @RequestBody BarbershopRequest request) {
        Barbershop saved = service.create(request);
        return ResponseEntity.created(URI.create("/api/barbershops/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Barbershop> update(@PathVariable Long id, @Valid @RequestBody BarbershopRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
