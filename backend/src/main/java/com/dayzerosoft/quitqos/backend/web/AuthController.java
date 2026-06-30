package com.dayzerosoft.quitqos.backend.web;

import com.dayzerosoft.quitqos.backend.service.AuthService;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.AuthResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.FirebaseLoginRequest;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.LogoutRequest;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.RefreshRequest;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public auth endpoints (API design §3). */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Firebase login/register → app JWT + refresh token. */
    @PostMapping("/firebase")
    public AuthResponse firebaseLogin(@Valid @RequestBody FirebaseLoginRequest request) {
        return authService.loginWithFirebase(request);
    }

    /** Rotate the refresh token, returning a fresh pair. */
    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    /** Revoke the refresh token server-side. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
