package com.dayzerosoft.quitqos.backend.web.dto;

import java.util.List;
import java.util.UUID;

/** Response DTOs for the leaderboard endpoints (API design §9). */
public final class LeaderboardDtos {

    private LeaderboardDtos() {
    }

    /** One ranked row. rank is 1-based. */
    public record LeaderboardItem(
            int rank,
            UUID userId,
            String username,
            String displayName,
            String avatarUrl,
            long streakSeconds) {
    }

    /** {@code GET /leaderboard}: the ranked list for the requested metric. */
    public record LeaderboardResponse(String metric, List<LeaderboardItem> items) {
    }

    /** {@code GET /leaderboard/me}: the caller's own rank, or rank 0 if they are not ranked. */
    public record LeaderboardMeResponse(int rank, long streakSeconds, String metric) {
    }

    /**
     * One podium row for the public summary. Deliberately slim — no {@code userId}, since the
     * summary is served to unauthenticated (guest) callers who shouldn't see internal ids.
     */
    public record SummaryLeader(int rank, String username, long streakSeconds) {
    }

    /**
     * {@code GET /leaderboard/summary}: aggregate community numbers + the top 3, served publicly so
     * guests (who get 403 on the ranked board) can still see what they'd be joining.
     */
    public record LeaderboardSummaryResponse(
            long totalRacers,
            long longestSeconds,
            long joinedToday,
            List<SummaryLeader> top) {
    }
}
