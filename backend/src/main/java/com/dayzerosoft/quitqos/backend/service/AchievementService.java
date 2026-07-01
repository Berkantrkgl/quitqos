package com.dayzerosoft.quitqos.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.dayzerosoft.quitqos.backend.domain.Milestone;
import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.UserMilestone;
import com.dayzerosoft.quitqos.backend.repository.BadgeRepository;
import com.dayzerosoft.quitqos.backend.repository.MilestoneRepository;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserMilestoneRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.AchievementsResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.EarnedBadge;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.HealthBenefit;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.MilestoneProgress;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.MilestoneProgressResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads a user's earned milestones/badges (API design §7) and per-attempt milestone progress (§6).
 * UserMilestone rows are created by the Stage 6 scheduler; until then these simply return whatever
 * has been recorded (empty for most users).
 */
@Service
public class AchievementService {

    private final UserMilestoneRepository userMilestones;
    private final MilestoneRepository milestones;
    private final BadgeRepository badges;
    private final QuitAttemptRepository quitAttempts;

    public AchievementService(UserMilestoneRepository userMilestones, MilestoneRepository milestones,
                              BadgeRepository badges, QuitAttemptRepository quitAttempts) {
        this.userMilestones = userMilestones;
        this.milestones = milestones;
        this.badges = badges;
        this.quitAttempts = quitAttempts;
    }

    /** Earned badges + health benefits for the user, with catalogue totals. */
    @Transactional(readOnly = true)
    public AchievementsResponse achievements(UUID userId) {
        List<UserMilestone> earned = userMilestones.findByUserId(userId);

        List<EarnedBadge> earnedBadges = earned.stream()
                .map(um -> {
                    var badge = um.getMilestone().getBadge();
                    return new EarnedBadge(badge.getId(), badge.getName(), badge.getIconUrl(),
                            um.getAchievedAt());
                })
                .toList();

        List<HealthBenefit> healthBenefits = earned.stream()
                .map(um -> {
                    Milestone m = um.getMilestone();
                    return new HealthBenefit(m.getId(), m.getTitle(), m.getDescription());
                })
                .toList();

        int totalBadges = (int) badges.count();
        return new AchievementsResponse(earnedBadges, healthBenefits, totalBadges, earnedBadges.size());
    }

    /** Progress of every milestone within one owned attempt: achieved (with time) or pending (with ETA). */
    @Transactional(readOnly = true)
    public MilestoneProgressResponse milestoneProgress(UUID userId, UUID attemptId) {
        QuitAttempt attempt = quitAttempts.findById(attemptId)
                .filter(a -> a.getUser().getId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Quit attempt not found"));

        // milestoneId -> achievedAt, for the milestones already reached in this attempt
        Map<UUID, Instant> achievedAt = userMilestones.findByQuitAttemptId(attemptId).stream()
                .collect(Collectors.toMap(um -> um.getMilestone().getId(), UserMilestone::getAchievedAt));

        List<MilestoneProgress> items = milestones.findAllByOrderByOffsetMinutesAsc().stream()
                .map(m -> {
                    Instant achieved = achievedAt.get(m.getId());
                    if (achieved != null) {
                        return new MilestoneProgress(m.getId(), m.getOffsetMinutes(), true, achieved, null);
                    }
                    Instant eta = attempt.getStartedAt().plus(Duration.ofMinutes(m.getOffsetMinutes()));
                    return new MilestoneProgress(m.getId(), m.getOffsetMinutes(), false, null, eta);
                })
                .toList();

        return new MilestoneProgressResponse(items);
    }
}
