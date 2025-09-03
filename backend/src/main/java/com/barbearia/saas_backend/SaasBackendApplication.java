package com.barbearia.saas_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.WebApplicationType;


@SpringBootApplication
public class SaasBackendApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(SaasBackendApplication.class);
        app.setWebApplicationType(WebApplicationType.SERVLET);
        app.run(args);
    }

}
