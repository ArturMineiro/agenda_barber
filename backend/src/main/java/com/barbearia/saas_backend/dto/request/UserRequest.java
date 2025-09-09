package com.barbearia.saas_backend.dto.request;

import com.barbearia.saas_backend.model.UserEntity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRequest {

    @NotBlank
    private String name;

    @Email
    private String email;

    // Pode ser null em contas Google
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;
    private UserRole role;
    private String avatarUrl;
}
