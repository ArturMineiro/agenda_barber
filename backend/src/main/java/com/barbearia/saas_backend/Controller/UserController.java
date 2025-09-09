package com.barbearia.saas_backend.Controller;

import com.barbearia.saas_backend.dto.request.UserRequest;
import com.barbearia.saas_backend.dto.response.UserResponse;
import com.barbearia.saas_backend.model.User;
import com.barbearia.saas_backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.findAll().stream()
                .map(u -> new UserResponse(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getPhone(),
                        u.getRole(),
                        u.getAvatarUrl()
                ))
                .toList();

        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        User savedUser = userService.saveUser(request);

        UserResponse response = new UserResponse(
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getPhone(),
                savedUser.getRole(),
                savedUser.getAvatarUrl()
        );

        return ResponseEntity.created(URI.create("/api/users/" + response.getId())).body(response);
    }
}
