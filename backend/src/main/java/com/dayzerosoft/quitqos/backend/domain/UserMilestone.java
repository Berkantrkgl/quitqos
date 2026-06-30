package com.dayzerosoft.quitqos.backend.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

/**
 * A milestone reached within a specific attempt. Created by the notification scheduler when
 * elapsed >= offsetMinutes. Unique per (attempt, milestone) so a milestone is awarded once per streak.
 */
@Entity
@Table(name = "user_milestone",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_milestone",
                columnNames = {"quit_attempt_id", "milestone_id"}))
@Getter
@Setter
@NoArgsConstructor
public class UserMilestone {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quit_attempt_id", nullable = false)
    private QuitAttempt quitAttempt;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @Column(name = "achieved_at", nullable = false)
    private Instant achievedAt;

    /** Set when the FCM push is sent; stays null if the user has notifications disabled. */
    @Column(name = "notification_sent_at")
    private Instant notificationSentAt;
}
