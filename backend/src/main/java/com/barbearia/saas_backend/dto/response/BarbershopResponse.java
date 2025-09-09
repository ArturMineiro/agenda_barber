package com.barbearia.saas_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BarbershopResponse {

    private Long id;
    private String name;
    private String taxId;
    private String address;
    private String phone;
    private String email;
    private Long ownerId;
}
