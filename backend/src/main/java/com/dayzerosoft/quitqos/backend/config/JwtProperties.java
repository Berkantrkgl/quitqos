package com.dayzerosoft.quitqos.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code quitqos.jwt.*} block from application.yml. Spring validates and injects this
 * record at startup; consumers ask for it instead of reading raw @Value strings.
 *
 * @param secret          Base64-encoded HMAC secret for signing access tokens.
 * @param accessTokenTtl  Lifetime of an access JWT (~1 hour).
 * @param refreshTokenTtl Lifetime of a refresh token (~180 days).
 */
@ConfigurationProperties(prefix = "quitqos.jwt")
public record JwtProperties(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {
}
