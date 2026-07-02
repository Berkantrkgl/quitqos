package com.dayzerosoft.quitqos.backend.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

/** Registered user. Guests never reach the backend, so every row here is a registered account. */
@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    /** Firebase Auth uid; the link between the app account and the identity provider. */
    @Column(name = "firebase_uid", nullable = false, unique = true)
    private String firebaseUid;

    /**
     * Unique, user-facing handle (3–20 chars, lowercase [a-z0-9_]). Assigned on first login from
     * the email local-part; editable via PATCH /users/me. Uniqueness is enforced case-insensitively
     * by a functional index (LOWER(username)), so no {@code unique=true} here (Hibernate validate
     * only understands plain unique constraints).
     */
    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    /** Latest device FCM token for push; null until the device registers one. */
    @Column(name = "fcm_token")
    private String fcmToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
