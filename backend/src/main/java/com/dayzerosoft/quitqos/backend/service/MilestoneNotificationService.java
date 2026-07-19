package com.dayzerosoft.quitqos.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import com.dayzerosoft.quitqos.backend.domain.Milestone;
import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.domain.UserMilestone;
import com.dayzerosoft.quitqos.backend.repository.MilestoneRepository;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserMilestoneRepository;
import com.dayzerosoft.quitqos.backend.security.PushNotificationSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Scans ACTIVE quit attempts for newly-crossed milestones (API design §10): creates the
 * {@link UserMilestone} record, then sends an FCM push unless the user disabled notifications. A push
 * failure never rolls back the achievement — the record already reflects reality regardless of
 * delivery, and {@code notificationSentAt} simply stays null (no retry in MVP scope).
 */
@Service
public class MilestoneNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MilestoneNotificationService.class);

    private final QuitAttemptRepository quitAttempts;
    private final MilestoneRepository milestones;
    private final UserMilestoneRepository userMilestones;
    private final PushNotificationSender pushSender;

    public MilestoneNotificationService(QuitAttemptRepository quitAttempts, MilestoneRepository milestones,
            UserMilestoneRepository userMilestones, PushNotificationSender pushSender) {
        this.quitAttempts = quitAttempts;
        this.milestones = milestones;
        this.userMilestones = userMilestones;
        this.pushSender = pushSender;
    }

    /** One scheduler tick: scans every ACTIVE attempt and awards+notifies newly-crossed milestones. */
    public void processActiveAttempts() {
        List<Milestone> catalogue = milestones.findAllByOrderByOffsetMinutesAsc();
        List<QuitAttempt> activeAttempts = quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE);

        for (QuitAttempt attempt : activeAttempts) {
            try {
                processAttempt(attempt, catalogue);
            } catch (RuntimeException e) {
                // Isolate failures per attempt so one bad attempt doesn't abort the whole tick.
                log.error("Failed processing milestones for attempt {}", attempt.getId(), e);
            }
        }
    }

    private void processAttempt(QuitAttempt attempt, List<Milestone> catalogue) {
        Instant now = Instant.now();
        long elapsedMinutes = Duration.between(attempt.getStartedAt(), now).toMinutes();

        for (Milestone milestone : catalogue) {
            if (elapsedMinutes < milestone.getOffsetMinutes()) {
                continue;
            }
            if (userMilestones.existsByQuitAttemptIdAndMilestoneId(attempt.getId(), milestone.getId())) {
                continue;
            }
            awardMilestone(attempt, milestone, now);
        }
    }

    private void awardMilestone(QuitAttempt attempt, Milestone milestone, Instant now) {
        User user = attempt.getUser();

        UserMilestone userMilestone = new UserMilestone();
        userMilestone.setUser(user);
        userMilestone.setQuitAttempt(attempt);
        userMilestone.setMilestone(milestone);
        userMilestone.setAchievedAt(now);
        userMilestones.save(userMilestone);

        if (!user.isNotificationsEnabled()) {
            return;
        }
        if (!StringUtils.hasText(user.getFcmToken())) {
            log.debug("User {} has notifications enabled but no FCM token; skipping push", user.getId());
            return;
        }

        try {
            String locale = user.getLocale();
            pushSender.send(user.getFcmToken(), milestone.titleFor(locale), milestone.descriptionFor(locale),
                    milestone.getId().toString());
            userMilestone.setNotificationSentAt(Instant.now());
            userMilestones.save(userMilestone);
        } catch (RuntimeException e) {
            log.error("Failed to send push for milestone {} to user {}", milestone.getId(), user.getId(), e);
        }
    }
}
