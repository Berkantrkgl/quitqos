package com.dayzerosoft.quitqos.backend.security;

import org.springframework.util.StringUtils;

/**
 * Dev-only verifier used when Firebase credentials are not configured. It performs no cryptographic
 * verification: it trusts the raw token string as the Firebase uid, so the auth flow is fully
 * testable locally. Replaced by {@link RealFirebaseTokenVerifier} once credentials are set.
 */
public class StubFirebaseTokenVerifier implements FirebaseTokenVerifier {

    @Override
    public VerifiedIdentity verify(String firebaseIdToken) {
        if (!StringUtils.hasText(firebaseIdToken)) {
            throw new FirebaseAuthException("Empty token", null);
        }
        // Treat the token itself as the uid. If it looks like an email, also expose it as the email
        // so username derivation is testable locally (e.g. token "berkan@x.com").
        String email = firebaseIdToken.contains("@") ? firebaseIdToken : null;
        return new VerifiedIdentity(firebaseIdToken, email, null, null);
    }
}
