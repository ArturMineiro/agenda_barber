package com.barbearia.saas_backend.dto;

import java.math.BigDecimal;

public class ServiceDTO {
    private Long id;
    private String name;
    private Integer duration;
    private BigDecimal price;
    private Long barbershopId;

    public ServiceDTO(Long id, String name, Integer duration, BigDecimal price, Long barbershopId) {
        this.id = id;
        this.name = name;
        this.duration = duration;
        this.price = price;
        this.barbershopId = barbershopId;
    }

    // Getters e setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Long getBarbershopId() { return barbershopId; }
    public void setBarbershopId(Long barbershopId) { this.barbershopId = barbershopId; }
}
