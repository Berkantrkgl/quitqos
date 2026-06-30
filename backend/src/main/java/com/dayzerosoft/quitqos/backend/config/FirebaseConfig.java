package com.dayzerosoft.quitqos.backend.config;

import java.io.FileInputStream;
import java.io.IOException;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.RealFirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.StubFirebaseTokenVerifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * Wires the Firebase verifier. If {@code quitqos.firebase.credentials-path} points at a
 * service-account JSON, the real Firebase Admin SDK is initialized; otherwise a dev stub is used so
 * the auth flow stays testable locally without Firebase. The chosen bean is logged at startup.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Bean
    FirebaseTokenVerifier firebaseTokenVerifier(FirebaseProperties properties) {
        String path = properties.credentialsPath();
        if (!StringUtils.hasText(path)) {
            log.warn("Firebase credentials not configured (quitqos.firebase.credentials-path is blank); "
                    + "using STUB verifier. Do NOT use this in production.");
            return new StubFirebaseTokenVerifier();
        }
        try (FileInputStream credentials = new FileInputStream(path)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentials))
                    .build();
            // initializeApp throws if called twice; guard for hot reloads / tests.
            FirebaseApp app = FirebaseApp.getApps().isEmpty()
                    ? FirebaseApp.initializeApp(options)
                    : FirebaseApp.getInstance();
            log.info("Firebase Admin initialized from {}", path);
            return new RealFirebaseTokenVerifier(FirebaseAuth.getInstance(app));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize Firebase from " + path, e);
        }
    }
}
