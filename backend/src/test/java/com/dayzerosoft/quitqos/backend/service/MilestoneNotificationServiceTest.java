package com.dayzerosoft.quitqos.backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.Milestone;
import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.domain.UserMilestone;
import com.dayzerosoft.quitqos.backend.repository.MilestoneRepository;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserMilestoneRepository;
import com.dayzerosoft.quitqos.backend.security.PushNotificationException;
import com.dayzerosoft.quitqos.backend.security.PushNotificationSender;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link MilestoneNotificationService}: which milestones get awarded on a scheduler
 * tick, when pushes are skipped, and that failures are isolated per attempt/milestone.
 */
@ExtendWith(MockitoExtension.class)
class MilestoneNotificationServiceTest {

    @Mock QuitAttemptRepository quitAttempts;
    @Mock MilestoneRepository milestones;
    @Mock UserMilestoneRepository userMilestones;
    @Mock PushNotificationSender pushSender;

    @InjectMocks
    MilestoneNotificationService service;

    private Milestone milestone(UUID id, int offsetMinutes, String title, String description) {
        Milestone m = mock(Milestone.class);
        lenient().when(m.getId()).thenReturn(id);
        lenient().when(m.getOffsetMinutes()).thenReturn(offsetMinutes);
        lenient().when(m.getTitle()).thenReturn(title);
        lenient().when(m.getDescription()).thenReturn(description);
        return m;
    }

    private User user(UUID id, boolean notificationsEnabled, String fcmToken) {
        User u = mock(User.class);
        lenient().when(u.getId()).thenReturn(id);
        lenient().when(u.isNotificationsEnabled()).thenReturn(notificationsEnabled);
        lenient().when(u.getFcmToken()).thenReturn(fcmToken);
        return u;
    }

    private QuitAttempt attempt(UUID id, User owner, Instant startedAt) {
        QuitAttempt a = new QuitAttempt();
        a.setId(id);
        a.setUser(owner);
        a.setStartedAt(startedAt);
        a.setStatus(QuitStatus.ACTIVE);
        return a;
    }

    @Test
    void awardsMilestone_whenElapsedCrossesOffsetAndNotYetAwarded() {
        UUID attemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        User owner = user(UUID.randomUUID(), true, "device-token");
        QuitAttempt attempt = attempt(attemptId, owner, Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "Nabız normale döner");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(attemptId, milestoneId)).thenReturn(false);
        when(pushSender.send(anyString(), anyString(), anyString(), anyString())).thenReturn("msg-id");

        service.processActiveAttempts();

        ArgumentCaptor<UserMilestone> captor = ArgumentCaptor.forClass(UserMilestone.class);
        verify(userMilestones, times(2)).save(captor.capture());
        UserMilestone saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(owner);
        assertThat(saved.getQuitAttempt()).isEqualTo(attempt);
        assertThat(saved.getMilestone()).isEqualTo(m);
        assertThat(saved.getNotificationSentAt()).isNotNull();
        verify(pushSender).send("device-token", "20 dakika", "Nabız normale döner", milestoneId.toString());
    }

    @Test
    void skipsMilestone_whenAlreadyAwarded() {
        UUID attemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), true, "token"),
                Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(attemptId, milestoneId)).thenReturn(true);

        service.processActiveAttempts();

        verify(userMilestones, never()).save(any());
        verify(pushSender, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void skipsMilestone_whenElapsedBelowOffset() {
        UUID attemptId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), true, "token"),
                Instant.now().minus(5, ChronoUnit.MINUTES));
        Milestone m = milestone(UUID.randomUUID(), 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));

        service.processActiveAttempts();

        verify(userMilestones, never()).save(any());
        verify(pushSender, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void doesNotSendPush_whenNotificationsDisabled() {
        UUID attemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), false, "token"),
                Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(attemptId, milestoneId)).thenReturn(false);

        service.processActiveAttempts();

        ArgumentCaptor<UserMilestone> captor = ArgumentCaptor.forClass(UserMilestone.class);
        verify(userMilestones, times(1)).save(captor.capture());
        assertThat(captor.getValue().getNotificationSentAt()).isNull();
        verify(pushSender, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void doesNotSendPush_whenFcmTokenBlank() {
        UUID attemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), true, null),
                Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(attemptId, milestoneId)).thenReturn(false);

        service.processActiveAttempts();

        verify(userMilestones, times(1)).save(any());
        verify(pushSender, never()).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void persistsAchievement_evenWhenPushSendThrows() {
        UUID attemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), true, "token"),
                Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(attemptId, milestoneId)).thenReturn(false);
        when(pushSender.send(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new PushNotificationException("boom", null));

        service.processActiveAttempts();

        ArgumentCaptor<UserMilestone> captor = ArgumentCaptor.forClass(UserMilestone.class);
        verify(userMilestones, times(1)).save(captor.capture());
        assertThat(captor.getValue().getNotificationSentAt()).isNull();
    }

    @Test
    void continuesProcessingOtherAttempts_whenOneAttemptThrows() {
        UUID badAttemptId = UUID.randomUUID();
        QuitAttempt badAttempt = attempt(badAttemptId, user(UUID.randomUUID(), true, "token"), null);

        UUID goodAttemptId = UUID.randomUUID();
        UUID milestoneId = UUID.randomUUID();
        QuitAttempt goodAttempt = attempt(goodAttemptId, user(UUID.randomUUID(), true, "token"),
                Instant.now().minus(30, ChronoUnit.MINUTES));
        Milestone m = milestone(milestoneId, 20, "20 dakika", "desc");

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(badAttempt, goodAttempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(goodAttemptId, milestoneId)).thenReturn(false);
        when(pushSender.send(anyString(), anyString(), anyString(), anyString())).thenReturn("msg-id");

        service.processActiveAttempts();

        verify(userMilestones, times(2)).save(any());
    }

    @Test
    void awardsAllCrossedMilestones_inOneTick() {
        UUID attemptId = UUID.randomUUID();
        QuitAttempt attempt = attempt(attemptId, user(UUID.randomUUID(), true, "token"),
                Instant.now().minus(3, ChronoUnit.DAYS));

        Milestone m1 = milestone(UUID.randomUUID(), 20, "20 dakika", "d1");
        Milestone m2 = milestone(UUID.randomUUID(), 480, "8 saat", "d2");
        Milestone m3 = milestone(UUID.randomUUID(), 1440, "24 saat", "d3");
        Milestone m4 = milestone(UUID.randomUUID(), 525600, "1 yıl", "d4"); // not yet crossed

        when(quitAttempts.findByStatusWithUser(QuitStatus.ACTIVE)).thenReturn(List.of(attempt));
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m1, m2, m3, m4));
        when(userMilestones.existsByQuitAttemptIdAndMilestoneId(eq(attemptId), any())).thenReturn(false);
        when(pushSender.send(anyString(), anyString(), anyString(), anyString())).thenReturn("msg-id");

        service.processActiveAttempts();

        // 3 crossed milestones x 2 saves each (achievement + notificationSentAt stamp) = 6
        verify(userMilestones, times(6)).save(any());
        verify(pushSender, times(3)).send(anyString(), anyString(), anyString(), anyString());
    }
}
