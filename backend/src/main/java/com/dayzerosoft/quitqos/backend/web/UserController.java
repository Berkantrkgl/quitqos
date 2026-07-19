package com.dayzerosoft.quitqos.backend.web;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.service.UserService;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.FcmTokenRequest;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UpdateUserRequest;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UserProfileResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * User profile endpoints (API design §4). The authenticated user id is the principal set by
 * {@link com.dayzerosoft.quitqos.backend.security.JwtAuthenticationFilter}.
 */
@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    /** Current user's profile. */
    @GetMapping
    public UserProfileResponse me(@AuthenticationPrincipal UUID userId) {
        return service.me(userId);
    }

    /** Partial profile + notification-preference update. */
    @PatchMapping
    public UserProfileResponse update(@AuthenticationPrincipal UUID userId,
                                      @Valid @RequestBody UpdateUserRequest request) {
        return service.update(userId, request);
    }

    /** Register/update the device FCM token for push. */
    @PutMapping("/fcm-token")
    public ResponseEntity<Void> updateFcmToken(@AuthenticationPrincipal UUID userId,
                                               @Valid @RequestBody FcmTokenRequest request) {
        service.updateFcmToken(userId, request.fcmToken());
        return ResponseEntity.noContent().build();
    }

    /**
     * Permanently delete the caller's account (App Store 5.1.1(v) / KVKK erasure): our data +
     * the Firebase Auth identity. Irreversible. Guests can't reach this (no token).
     */
    @DeleteMapping
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UUID userId) {
        service.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }
}
