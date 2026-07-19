package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Instant;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import jakarta.validation.constraints.NotBlank;

/** Request/response DTOs for the user endpoints (API design §4). */
public final class UserDtos {

    private UserDtos() {
    }

    /**
     * {@code PATCH /users/me} — partial update. Any field left null is untouched; only present keys
     * are applied. (JSON absence and explicit null are indistinguishable here, so "clear a field" is
     * not expressible — matches the contract, which only lists set-value use.)
     */
    public record UpdateUserRequest(
            String username,
            String displayName,
            String avatarUrl,
            Boolean notificationsEnabled,
            String locale) {
    }

    /** {@code PUT /users/me/fcm-token}. */
    public record FcmTokenRequest(@NotBlank String fcmToken) {
    }

    /** Full profile view (§4). Unlike auth's {@code UserDto}, includes {@code updatedAt}. */
    public record UserProfileResponse(
            UUID id,
            boolean isGuest,
            String username,
            String displayName,
            String avatarUrl,
            boolean notificationsEnabled,
            String locale,
            Instant createdAt,
            Instant updatedAt) {

        public static UserProfileResponse from(User user) {
            // Every backend user is registered (guests never reach the server), so isGuest is always false.
            return new UserProfileResponse(
                    user.getId(),
                    false,
                    user.getUsername(),
                    user.getDisplayName(),
                    user.getAvatarUrl(),
                    user.isNotificationsEnabled(),
                    user.getLocale(),
                    user.getCreatedAt(),
                    user.getUpdatedAt());
        }
    }
}
