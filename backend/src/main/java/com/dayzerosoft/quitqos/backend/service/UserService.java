package com.dayzerosoft.quitqos.backend.service;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.security.FirebaseUserDeleter;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UpdateUserRequest;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UserProfileResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * User profile operations (API design §4). The user always exists — the id comes from a verified
 * access token — but we guard with 404 in case the account was deleted after the token was issued.
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository users;
    private final UsernameService usernameService;
    private final FirebaseUserDeleter firebaseUserDeleter;

    public UserService(UserRepository users, UsernameService usernameService,
                       FirebaseUserDeleter firebaseUserDeleter) {
        this.users = users;
        this.usernameService = usernameService;
        this.firebaseUserDeleter = firebaseUserDeleter;
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
        if (request.locale() != null) {
            // Only the languages the app ships; ignore anything else so a stray value
            // can't leave pushes in an unsupported locale.
            String locale = request.locale().toLowerCase();
            if (locale.equals("tr") || locale.equals("en")) {
                user.setLocale(locale);
            }
        }
        return UserProfileResponse.from(users.save(user));
    }

    @Transactional
    public void updateFcmToken(UUID userId, String fcmToken) {
        User user = require(userId);
        user.setFcmToken(fcmToken);
        users.save(user);
    }

    /**
     * Permanently delete the account: our data first (one committed transaction, child rows go via
     * {@code ON DELETE CASCADE} on quit_attempt / user_milestone / refresh_token), then the Firebase
     * Auth identity as a separate step.
     *
     * <p>The Firebase deletion runs <b>after</b> the DB transaction commits and its failure does
     * <b>not</b> roll the deletion back: the personal data we hold is already gone (which is what the
     * user asked for), and at worst the Firebase identity is orphaned — signing in again just creates
     * a fresh account. We log the failure and still report success to the caller.
     */
    @Transactional
    public void deleteAccount(UUID userId) {
        User user = require(userId);
        // Read the Firebase uid before the row is gone; it's the link we need to delete the identity.
        String firebaseUid = user.getFirebaseUid();
        users.delete(user);

        // Delete the Firebase identity only once our own deletion has actually committed, so a
        // rolled-back DB delete never removes the identity. When a transaction is active we hang it
        // off afterCommit; otherwise (e.g. a unit test without a tx) we run it inline.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteFirebaseIdentity(userId, firebaseUid);
                }
            });
        } else {
            deleteFirebaseIdentity(userId, firebaseUid);
        }
    }

    /**
     * Delete the Firebase Auth identity. A failure here is logged, not rethrown — the personal data
     * we hold is already gone (what the user asked for); an orphaned identity is the acceptable worst
     * case (re-signing in just creates a fresh account).
     */
    private void deleteFirebaseIdentity(UUID userId, String firebaseUid) {
        try {
            firebaseUserDeleter.delete(firebaseUid);
        } catch (RuntimeException e) {
            log.error("Deleted user {} from DB but failed to delete Firebase identity {}; "
                    + "leaving it orphaned", userId, firebaseUid, e);
        }
    }

    private User require(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
