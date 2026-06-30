package com.dayzerosoft.quitqos.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code quitqos.firebase.*}. When {@code credentialsPath} is blank, the app skips real
 * Firebase initialization and falls back to a dev verifier (see FirebaseConfig / TokenVerifier).
 *
 * @param credentialsPath Filesystem path to the Firebase service-account JSON. Blank locally.
 */
@ConfigurationProperties(prefix = "quitqos.firebase")
public record FirebaseProperties(String credentialsPath) {
}
