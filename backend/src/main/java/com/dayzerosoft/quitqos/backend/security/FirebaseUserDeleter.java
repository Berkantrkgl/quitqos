package com.dayzerosoft.quitqos.backend.security;

/**
 * Deletes the Firebase Authentication record for a user, so an account deletion removes the identity
 * as well as our own data. A thin seam (mirrors {@link PushNotificationSender}) so the service can be
 * unit-tested with a mock and the real Admin SDK stays out of the service layer.
 */
public interface FirebaseUserDeleter {

    /**
     * Delete the Firebase Auth user with this uid.
     *
     * @param firebaseUid the user's Firebase uid (stored on our {@code User} row)
     * @throws RuntimeException if the deletion fails; the caller treats this as non-fatal (our own
     *                          data is already gone) but should log it.
     */
    void delete(String firebaseUid);
}
