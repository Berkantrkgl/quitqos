package com.dayzerosoft.quitqos.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;

/** Production deleter backed by the Firebase Admin SDK ({@code FirebaseAuth.deleteUser}). */
public class RealFirebaseUserDeleter implements FirebaseUserDeleter {

    private final FirebaseAuth firebaseAuth;

    public RealFirebaseUserDeleter(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    public void delete(String firebaseUid) {
        try {
            firebaseAuth.deleteUser(firebaseUid);
        } catch (FirebaseAuthException e) {
            // Surface as unchecked; the service catches it and keeps the DB deletion committed.
            throw new RuntimeException("Failed to delete Firebase user " + firebaseUid, e);
        }
    }
}
