package com.vignova.portal.config;

import com.vignova.portal.entity.User;
import com.vignova.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@vignova.com")) {
            User admin = User.builder()
                    .email("admin@vignova.com")
                    .password(passwordEncoder.encode("Admin@123"))
                    .fullName("Vignova Admin")
                    .role(User.Role.ADMIN)
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("Admin user created: admin@vignova.com / Admin@123");
        }

        if (!userRepository.existsByEmail("rahul@example.com")) {
            User client = User.builder()
                    .email("rahul@example.com")
                    .password(passwordEncoder.encode("Client@123"))
                    .fullName("Rahul Sharma")
                    .phoneNumber("+91 9876543210")
                    .companyName("Rahul Enterprises")
                    .accountManager("Sneha Sharma")
                    .role(User.Role.CLIENT)
                    .active(true)
                    .build();
            userRepository.save(client);
            log.info("Demo client created: rahul@example.com / Client@123");
        }
    }
}
