package com.dayzerosoft.quitqos.backend.config;

import java.io.FileInputStream;
import java.io.IOException;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.messaging.FirebaseMessaging;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.PushNotificationSender;
import com.dayzerosoft.quitqos.backend.security.RealFirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.RealPushNotificationSender;
import com.dayzerosoft.quitqos.backend.security.StubFirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.StubPushNotificationSender;
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
        FirebaseApp app = initializeApp(path);
        return new RealFirebaseTokenVerifier(FirebaseAuth.getInstance(app));
    }

    @Bean
    PushNotificationSender pushNotificationSender(FirebaseProperties properties) {
        String path = properties.credentialsPath();
        if (!StringUtils.hasText(path)) {
            log.warn("Firebase credentials not configured (quitqos.firebase.credentials-path is blank); "
                    + "using STUB push sender. Do NOT use this in production.");
            return new StubPushNotificationSender();
        }
        FirebaseApp app = initializeApp(path);
        return new RealPushNotificationSender(FirebaseMessaging.getInstance(app));
    }

    private FirebaseApp initializeApp(String credentialsPath) {
        // initializeApp throws if called twice; guard for hot reloads / tests / the two beans above
        // both needing an app.
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }
        try (FileInputStream credentials = new FileInputStream(credentialsPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentials))
                    .build();
            FirebaseApp app = FirebaseApp.initializeApp(options);
            log.info("Firebase Admin initialized from {}", credentialsPath);
            return app;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize Firebase from " + credentialsPath, e);
        }
    }
}
