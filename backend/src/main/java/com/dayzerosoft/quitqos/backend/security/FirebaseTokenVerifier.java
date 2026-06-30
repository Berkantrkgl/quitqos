package com.dayzerosoft.quitqos.backend.security;

/**
 * Verifies a Firebase ID token and returns the verified identity. Implemented either by the real
 * Firebase Admin SDK (when credentials are configured) or a dev stub (when they are not).
 */
public interface FirebaseTokenVerifier {

    /**
     * @param firebaseIdToken the raw ID token from the mobile Firebase SDK
     * @return the verified identity (uid + optional profile hints)
     * @throws FirebaseAuthException if the token is invalid, expired, or cannot be verified
     */
    VerifiedIdentity verify(String firebaseIdToken);

    /** Verified identity extracted from a Firebase ID token. */
    record VerifiedIdentity(String uid, String displayName, String avatarUrl) {
    }

    /** Thrown when an ID token fails verification; mapped to 401 by the web layer. */
    class FirebaseAuthException extends RuntimeException {
        public FirebaseAuthException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
