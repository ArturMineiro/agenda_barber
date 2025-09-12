package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.request.CustomerSubscriptionRequest;
import com.barbearia.saas_backend.dto.response.CustomerSubscriptionResponse;
import com.barbearia.saas_backend.service.CustomerSubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
public class CustomerSubscriptionController {

    private final CustomerSubscriptionService subscriptionService;

    public CustomerSubscriptionController(CustomerSubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    public ResponseEntity<List<CustomerSubscriptionResponse>> getAll() {
        return ResponseEntity.ok(subscriptionService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerSubscriptionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CustomerSubscriptionResponse> create(@RequestBody CustomerSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerSubscriptionResponse> update(@PathVariable Long id,
                                                               @RequestBody CustomerSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subscriptionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
