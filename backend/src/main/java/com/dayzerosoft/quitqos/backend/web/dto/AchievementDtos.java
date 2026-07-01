package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Response DTOs for the achievement endpoints (API design §6 milestones-progress, §7 achievements). */
public final class AchievementDtos {

    private AchievementDtos() {
    }

    // --- GET /users/me/achievements ----------------------------------------

    /** A badge the user has earned, with when it was achieved. */
    public record EarnedBadge(UUID badgeId, String name, String iconUrl, Instant achievedAt) {
    }

    /** A health benefit unlocked (derived from a reached milestone). */
    public record HealthBenefit(UUID milestoneId, String title, String description) {
    }

    /** {@code GET /users/me/achievements}: earned badges + health benefits + counts. */
    public record AchievementsResponse(
            List<EarnedBadge> earnedBadges,
            List<HealthBenefit> healthBenefits,
            int totalBadges,
            int earnedCount) {
    }

    // --- GET /quit-attempts/{id}/milestones --------------------------------

    /**
     * One milestone's progress within an attempt. If achieved, {@code achievedAt} is set and
     * {@code etaAt} is null; if pending, the reverse — {@code etaAt} is startedAt + offsetMinutes.
     */
    public record MilestoneProgress(
            UUID milestoneId,
            int offsetMinutes,
            boolean achieved,
            Instant achievedAt,
            Instant etaAt) {
    }

    /** {@code GET /quit-attempts/{id}/milestones}: progress for every milestone in the attempt. */
    public record MilestoneProgressResponse(List<MilestoneProgress> items) {
    }
}
