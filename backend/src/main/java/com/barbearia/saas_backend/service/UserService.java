package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.UserRequest;
import com.barbearia.saas_backend.model.UserEntity;
import com.barbearia.saas_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserEntity saveUser(UserRequest request) {
        UserEntity user = UserEntity.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword() != null ? passwordEncoder.encode(request.getPassword()) : null)
                .phone(request.getPhone())
                .role(request.getRole())
                .avatarUrl(request.getAvatarUrl())
                .build();

        return userRepository.save(user);
    }

    public List<UserEntity> findAll() {
        return userRepository.findAll();
    }

    public Optional<UserEntity> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<UserEntity> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }
}
