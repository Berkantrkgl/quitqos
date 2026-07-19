package com.dayzerosoft.quitqos.backend.config;

import java.io.IOException;
import java.io.InputStream;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.messaging.FirebaseMessaging;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.FirebaseUserDeleter;
import com.dayzerosoft.quitqos.backend.security.PushNotificationSender;
import com.dayzerosoft.quitqos.backend.security.RealFirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.RealFirebaseUserDeleter;
import com.dayzerosoft.quitqos.backend.security.RealPushNotificationSender;
import com.dayzerosoft.quitqos.backend.security.StubPushNotificationSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.util.StringUtils;

/**
 * Wires the Firebase beans from the service-account JSON at {@code quitqos.firebase.credentials-path}.
 * Auth requires real Firebase: a blank path fails fast at startup (no stub fallback). Push still
 * degrades to a dev stub when unconfigured, since FCM needs real device tokens to be useful.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    private final ResourceLoader resourceLoader;

    FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Bean
    FirebaseTokenVerifier firebaseTokenVerifier(FirebaseProperties properties) {
        String path = properties.credentialsPath();
        if (!StringUtils.hasText(path)) {
            throw new IllegalStateException(
                    "quitqos.firebase.credentials-path is not set. Auth requires a Firebase "
                            + "service-account JSON; set FIREBASE_CREDENTIALS to its path.");
        }
        FirebaseApp app = initializeApp(path);
        return new RealFirebaseTokenVerifier(FirebaseAuth.getInstance(app));
    }

    @Bean
    FirebaseUserDeleter firebaseUserDeleter(FirebaseProperties properties) {
        String path = properties.credentialsPath();
        if (!StringUtils.hasText(path)) {
            // Same fail-fast contract as the verifier: account deletion must reach real Firebase.
            throw new IllegalStateException(
                    "quitqos.firebase.credentials-path is not set. Account deletion requires a "
                            + "Firebase service-account JSON; set FIREBASE_CREDENTIALS to its path.");
        }
        FirebaseApp app = initializeApp(path);
        return new RealFirebaseUserDeleter(FirebaseAuth.getInstance(app));
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
        // Resolved via ResourceLoader so it works regardless of the working directory (IDE Run vs.
        // terminal): supports `classpath:` (the default), `file:`, and plain filesystem paths.
        Resource resource = resourceLoader.getResource(credentialsPath);
        if (!resource.exists()) {
            throw new IllegalStateException("Firebase service-account not found at " + credentialsPath);
        }
        try (InputStream credentials = resource.getInputStream()) {
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
