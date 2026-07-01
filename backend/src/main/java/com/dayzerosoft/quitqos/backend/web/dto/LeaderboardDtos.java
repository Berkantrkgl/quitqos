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
}
