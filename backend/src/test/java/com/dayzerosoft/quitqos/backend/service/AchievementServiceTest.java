package com.dayzerosoft.quitqos.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.Badge;
import com.dayzerosoft.quitqos.backend.domain.Milestone;
import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.domain.UserMilestone;
import com.dayzerosoft.quitqos.backend.repository.BadgeRepository;
import com.dayzerosoft.quitqos.backend.repository.MilestoneRepository;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserMilestoneRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.AchievementsResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.MilestoneProgress;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.MilestoneProgressResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AchievementService}: earned-badge mapping and per-attempt milestone progress
 * (achieved vs pending, ETA computation, ownership). Entity ids are generated, so where an id must
 * be controlled we mock the entity.
 */
@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock UserMilestoneRepository userMilestones;
    @Mock MilestoneRepository milestones;
    @Mock BadgeRepository badges;
    @Mock QuitAttemptRepository quitAttempts;

    @InjectMocks
    AchievementService service;

    private final UUID userId = UUID.randomUUID();

    // Mocks are created with lenient() so a helper can stub fields a given test path doesn't read
    // (e.g. milestoneProgress never reads title/description). This keeps the helpers reusable without
    // tripping Mockito's strict "unnecessary stubbing" check.

    /** A milestone with a controllable id, offset, title/description, and badge. */
    private Milestone milestone(UUID id, int offset, String title, Badge badge) {
        Milestone m = mock(Milestone.class);
        lenient().when(m.getId()).thenReturn(id);
        lenient().when(m.getOffsetMinutes()).thenReturn(offset);
        lenient().when(m.getTitle()).thenReturn(title);
        lenient().when(m.getDescription()).thenReturn(title + " desc");
        lenient().when(m.getBadge()).thenReturn(badge);
        return m;
    }

    private Badge badge(UUID id, String name) {
        Badge b = mock(Badge.class);
        lenient().when(b.getId()).thenReturn(id);
        lenient().when(b.getName()).thenReturn(name);
        lenient().when(b.getIconUrl()).thenReturn(null);
        return b;
    }

    // --- achievements() -----------------------------------------------------

    @Test
    void achievements_mapsEarnedMilestonesToBadgesAndBenefits() {
        Badge badge = badge(UUID.randomUUID(), "İlk Adım");
        Milestone m = milestone(UUID.randomUUID(), 20, "20 dakika", badge);
        UserMilestone um = new UserMilestone();
        um.setMilestone(m);
        um.setAchievedAt(Instant.parse("2026-06-28T09:56:06Z"));

        when(userMilestones.findByUserId(userId)).thenReturn(List.of(um));
        when(badges.count()).thenReturn(9L);

        AchievementsResponse response = service.achievements(userId);

        assertThat(response.earnedCount()).isEqualTo(1);
        assertThat(response.totalBadges()).isEqualTo(9);
        assertThat(response.earnedBadges()).singleElement()
                .satisfies(b -> {
                    assertThat(b.name()).isEqualTo("İlk Adım");
                    assertThat(b.achievedAt()).isEqualTo(Instant.parse("2026-06-28T09:56:06Z"));
                });
        assertThat(response.healthBenefits()).singleElement()
                .satisfies(h -> assertThat(h.title()).isEqualTo("20 dakika"));
    }

    @Test
    void achievements_whenNoneEarned_returnsEmptyWithTotal() {
        when(userMilestones.findByUserId(userId)).thenReturn(List.of());
        when(badges.count()).thenReturn(9L);

        AchievementsResponse response = service.achievements(userId);

        assertThat(response.earnedCount()).isZero();
        assertThat(response.totalBadges()).isEqualTo(9);
        assertThat(response.earnedBadges()).isEmpty();
    }

    // --- milestoneProgress() ------------------------------------------------

    @Test
    void milestoneProgress_marksAchievedAndPendingWithEta() {
        UUID attemptId = UUID.randomUUID();
        Instant startedAt = Instant.now().minus(3, ChronoUnit.DAYS);

        User owner = mock(User.class);
        when(owner.getId()).thenReturn(userId);
        QuitAttempt attempt = new QuitAttempt();
        attempt.setUser(owner);
        attempt.setStartedAt(startedAt);
        when(quitAttempts.findById(attemptId)).thenReturn(Optional.of(attempt));

        Badge b1 = badge(UUID.randomUUID(), "b1");
        Badge b2 = badge(UUID.randomUUID(), "b2");
        UUID m1Id = UUID.randomUUID();
        UUID m2Id = UUID.randomUUID();
        Milestone m1 = milestone(m1Id, 20, "20 dakika", b1);   // will be achieved
        Milestone m2 = milestone(m2Id, 480, "8 saat", b2);     // pending
        when(milestones.findAllByOrderByOffsetMinutesAsc()).thenReturn(List.of(m1, m2));

        // only m1 has a UserMilestone (achieved)
        UserMilestone achieved = new UserMilestone();
        achieved.setMilestone(m1);
        achieved.setAchievedAt(startedAt.plus(20, ChronoUnit.MINUTES));
        when(userMilestones.findByQuitAttemptId(attemptId)).thenReturn(List.of(achieved));

        MilestoneProgressResponse response = service.milestoneProgress(userId, attemptId);

        assertThat(response.items()).hasSize(2);
        MilestoneProgress p1 = response.items().get(0);
        MilestoneProgress p2 = response.items().get(1);

        // achieved: achievedAt set, etaAt null
        assertThat(p1.achieved()).isTrue();
        assertThat(p1.achievedAt()).isNotNull();
        assertThat(p1.etaAt()).isNull();

        // pending: etaAt = startedAt + offset, achievedAt null
        assertThat(p2.achieved()).isFalse();
        assertThat(p2.achievedAt()).isNull();
        assertThat(p2.etaAt()).isEqualTo(startedAt.plus(Duration.ofMinutes(480)));
    }

    @Test
    void milestoneProgress_whenAttemptOwnedByAnother_throwsNotFound() {
        UUID attemptId = UUID.randomUUID();
        User otherOwner = mock(User.class);
        when(otherOwner.getId()).thenReturn(UUID.randomUUID());
        QuitAttempt attempt = new QuitAttempt();
        attempt.setUser(otherOwner);
        when(quitAttempts.findById(attemptId)).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> service.milestoneProgress(userId, attemptId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void milestoneProgress_whenAttemptMissing_throwsNotFound() {
        UUID attemptId = UUID.randomUUID();
        when(quitAttempts.findById(attemptId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.milestoneProgress(userId, attemptId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
