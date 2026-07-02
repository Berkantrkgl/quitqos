package com.dayzerosoft.quitqos.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import com.dayzerosoft.quitqos.backend.config.JwtProperties;
import com.dayzerosoft.quitqos.backend.domain.RefreshToken;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.RefreshTokenRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.JwtService;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.AuthResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.FirebaseLoginRequest;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.TokenResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.UserDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Auth flow: verify a Firebase ID token, upsert the user, and issue an access JWT + an opaque
 * refresh token. Refresh tokens are random 256-bit strings; only their SHA-256 hash is stored, and
 * each use rotates them (old row deleted, new one issued). Logout deletes the row.
 */
@Service
public class AuthService {

    private final FirebaseTokenVerifier firebaseVerifier;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;
    private final UsernameService usernameService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(FirebaseTokenVerifier firebaseVerifier, JwtService jwtService,
                       UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       JwtProperties jwtProperties, UsernameService usernameService) {
        this.firebaseVerifier = firebaseVerifier;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProperties = jwtProperties;
        this.usernameService = usernameService;
    }

    /** Verify the Firebase token, upsert the user, and mint a fresh token pair. */
    @Transactional
    public AuthResponse loginWithFirebase(FirebaseLoginRequest request) {
        var identity = firebaseVerifier.verify(request.firebaseIdToken());
        User user = userRepository.findByFirebaseUid(identity.uid())
                .orElseGet(() -> newUser(identity));
        applyProfileOverrides(user, request, identity);
        user = userRepository.save(user);

        return new AuthResponse(
                jwtService.issueAccessToken(user.getId()),
                issueRefreshToken(user),
                jwtService.accessTokenTtlSeconds(),
                UserDto.from(user));
    }

    /** Validate + rotate a refresh token, returning a new pair. 401 if invalid/expired/revoked. */
    @Transactional
    public TokenResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(() -> ApiException.unauthorized("Refresh token invalid or revoked"));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(stored);
            throw ApiException.unauthorized("Refresh token expired");
        }
        User user = stored.getUser();
        // Rotate: the presented token is single-use.
        refreshTokenRepository.delete(stored);
        return new TokenResponse(
                jwtService.issueAccessToken(user.getId()),
                issueRefreshToken(user),
                jwtService.accessTokenTtlSeconds());
    }

    /** Delete the refresh token so the session ends server-side. Idempotent: unknown token is a no-op. */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.deleteByTokenHash(hash(rawRefreshToken));
    }

    private User newUser(FirebaseTokenVerifier.VerifiedIdentity identity) {
        User user = new User();
        user.setFirebaseUid(identity.uid());
        // Auto-assign a unique handle derived from the email; the user can change it later.
        user.setUsername(usernameService.deriveUnique(identity.email()));
        return user;
    }

    private void applyProfileOverrides(User user, FirebaseLoginRequest request,
                                       FirebaseTokenVerifier.VerifiedIdentity identity) {
        // Prefer an explicit client override, else fall back to the Firebase profile (real verifier only).
        if (StringUtils.hasText(request.displayName())) {
            user.setDisplayName(request.displayName());
        } else if (user.getDisplayName() == null && StringUtils.hasText(identity.displayName())) {
            user.setDisplayName(identity.displayName());
        }
        if (StringUtils.hasText(request.avatarUrl())) {
            user.setAvatarUrl(request.avatarUrl());
        } else if (user.getAvatarUrl() == null && StringUtils.hasText(identity.avatarUrl())) {
            user.setAvatarUrl(identity.avatarUrl());
        }
        if (StringUtils.hasText(request.fcmToken())) {
            user.setFcmToken(request.fcmToken());
        }
    }

    /** Create + persist a new opaque refresh token, returning the raw value (shown to client once). */
    private String issueRefreshToken(User user) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(raw));
        token.setExpiresAt(Instant.now().plus(jwtProperties.refreshTokenTtl()));
        refreshTokenRepository.save(token);
        return raw;
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] out = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
