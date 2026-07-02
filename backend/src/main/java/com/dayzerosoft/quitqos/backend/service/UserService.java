package com.dayzerosoft.quitqos.backend.service;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UpdateUserRequest;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UserProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User profile operations (API design §4). The user always exists — the id comes from a verified
 * access token — but we guard with 404 in case the account was deleted after the token was issued.
 */
@Service
public class UserService {

    private final UserRepository users;
    private final UsernameService usernameService;

    public UserService(UserRepository users, UsernameService usernameService) {
        this.users = users;
        this.usernameService = usernameService;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse me(UUID userId) {
        return UserProfileResponse.from(require(userId));
    }

    /** Partial update: only non-null fields are applied. */
    @Transactional
    public UserProfileResponse update(UUID userId, UpdateUserRequest request) {
        User user = require(userId);
        if (request.username() != null) {
            // No-op if the handle is unchanged (case-insensitive); otherwise validate + ensure free.
            if (!request.username().equalsIgnoreCase(user.getUsername())) {
                user.setUsername(usernameService.validateForUpdate(request.username()));
            }
        }
        if (request.displayName() != null) {
            user.setDisplayName(request.displayName());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl());
        }
        if (request.notificationsEnabled() != null) {
            user.setNotificationsEnabled(request.notificationsEnabled());
        }
        return UserProfileResponse.from(users.save(user));
    }

    @Transactional
    public void updateFcmToken(UUID userId, String fcmToken) {
        User user = require(userId);
        user.setFcmToken(fcmToken);
        users.save(user);
    }

    private User require(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
