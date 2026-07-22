package com.vignova.portal.controller;

import com.vignova.portal.dto.AuthResponse;
import com.vignova.portal.dto.LoginRequest;
import com.vignova.portal.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/otp/generate")
    public ResponseEntity<Map<String, String>> generateOtp(@RequestBody Map<String, String> body) {
        String otp = authService.generateOtp(body.get("email"));
        // In prod: send via email/SMS. Here we return it for testing.
        return ResponseEntity.ok(Map.of("message", "OTP sent", "otp", otp));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Boolean>> verifyOtp(@RequestBody Map<String, String> body) {
        boolean valid = authService.verifyOtp(body.get("email"), body.get("otp"));
        return ResponseEntity.ok(Map.of("valid", valid));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> body) {
        authService.changePassword(body.get("email"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
    @GetMapping("/test")
public String test() {
    return "AUTH WORKING";
}
}
