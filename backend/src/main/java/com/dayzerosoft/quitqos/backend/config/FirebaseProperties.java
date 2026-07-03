package com.dayzerosoft.quitqos.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code quitqos.firebase.*}. Auth requires a real service-account JSON — a blank
 * {@code credentialsPath} fails fast at startup (see {@link FirebaseConfig}); only push degrades
 * to a dev stub when unconfigured.
 *
 * @param credentialsPath Filesystem path to the Firebase service-account JSON.
 */
@ConfigurationProperties(prefix = "quitqos.firebase")
public record FirebaseProperties(String credentialsPath) {
}
