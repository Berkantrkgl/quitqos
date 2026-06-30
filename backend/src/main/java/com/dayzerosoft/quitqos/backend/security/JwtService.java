package com.dayzerosoft.quitqos.backend.security;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import com.dayzerosoft.quitqos.backend.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies stateless access JWTs. The user id is carried in the {@code sub} claim.
 * Refresh tokens are NOT JWTs — they are opaque random strings tracked in the DB (see AuthService).
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secret()));
    }

    /** Signs a short-lived access token whose subject is the user id. */
    public String issueAccessToken(UUID userId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.accessTokenTtl());
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    /**
     * Parses and verifies a token, returning the user id from {@code sub}.
     *
     * @throws JwtException if the token is malformed, expired, or its signature is invalid.
     */
    public UUID parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }

    /** TTL in seconds, surfaced to the client as {@code expiresIn}. */
    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtl().toSeconds();
    }
}
