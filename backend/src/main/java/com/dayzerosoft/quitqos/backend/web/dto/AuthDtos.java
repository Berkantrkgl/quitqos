package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Instant;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import jakarta.validation.constraints.NotBlank;

/** Request/response DTOs for the auth endpoints (API design §3). */
public final class AuthDtos {

    private AuthDtos() {
    }

    /** {@code POST /auth/firebase}. displayName/avatarUrl/fcmToken are optional overrides. */
    public record FirebaseLoginRequest(
            @NotBlank String firebaseIdToken,
            String displayName,
            String avatarUrl,
            String fcmToken) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(@NotBlank String refreshToken) {
    }

    /** Returned by {@code /auth/firebase}: tokens + the user profile. */
    public record AuthResponse(
            String accessToken,
            String refreshToken,    
            long expiresIn,
            UserDto user) {
    }

    /** Returned by {@code /auth/refresh}: rotated tokens, no user payload. */
    public record TokenResponse(String accessToken, String refreshToken, long expiresIn) {
    }

    /** Public view of a user (API design §3/§4). */
    public record UserDto(
            UUID id,
            boolean isGuest,
            String displayName,
            String avatarUrl,
            boolean notificationsEnabled,
            Instant createdAt) {

        public static UserDto from(User user) {
            // Every backend user is registered (guests never reach the server), so isGuest is always false.
            return new UserDto(user.getId(), false, user.getDisplayName(), user.getAvatarUrl(),
                    user.isNotificationsEnabled(), user.getCreatedAt());
        }
    }
}
