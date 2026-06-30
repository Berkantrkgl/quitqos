package com.dayzerosoft.quitqos.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

/**
 * Production verifier backed by the Firebase Admin SDK. Verifies the ID token's signature, issuer,
 * audience, and expiry against Google's public keys.
 */
public class RealFirebaseTokenVerifier implements FirebaseTokenVerifier {

    private final FirebaseAuth firebaseAuth;

    public RealFirebaseTokenVerifier(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    public VerifiedIdentity verify(String firebaseIdToken) {
        try {
            FirebaseToken token = firebaseAuth.verifyIdToken(firebaseIdToken);
            return new VerifiedIdentity(token.getUid(), token.getName(), token.getPicture());
        } catch (Exception e) {
            throw new FirebaseAuthException("Invalid Firebase ID token", e);
        }
    }
}
