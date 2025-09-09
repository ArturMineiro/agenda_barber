package com.barbearia.saas_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BarbershopRequest {
    @NotBlank
    private String name;

    // Can store CNPJ or CPF
    @NotBlank
    private String taxId;

    private String address;

    private String phone;

    @Email
    private String email;
    private Long ownerId; // 🔑 ID do dono da barbearia

}
