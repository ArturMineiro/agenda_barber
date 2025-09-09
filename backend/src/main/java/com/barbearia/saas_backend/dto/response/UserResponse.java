package com.barbearia.saas_backend.dto.response;

import com.barbearia.saas_backend.model.User.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private UserRole role;
    private String avatarUrl;
}
