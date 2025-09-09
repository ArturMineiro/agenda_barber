package com.barbearia.saas_backend.service;

import com.barbearia.saas_backend.dto.request.UserRequest;
import com.barbearia.saas_backend.model.User;
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

    public User saveUser(UserRequest request) {
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword() != null ? passwordEncoder.encode(request.getPassword()) : null)
                .phone(request.getPhone())
                .role(request.getRole())
                .avatarUrl(request.getAvatarUrl())
                .build();

        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }
}
