
package com.barbearia.saas_backend.Controller;

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
    public ResponseEntity<Barbershop> create(@Valid @RequestBody Barbershop barbershop) {
        Barbershop saved = service.create(barbershop);
        return ResponseEntity.created(URI.create("/api/barbershops/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Barbershop> update(@PathVariable Long id, @Valid @RequestBody Barbershop barbershop) {
        return ResponseEntity.ok(service.update(id, barbershop));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
