package com.dayzerosoft.quitqos.backend.repository;

import java.util.UUID;

/**
 * A projection (read-only view) for one leaderboard row, populated directly by the leaderboard
 * queries. streakSeconds is computed in SQL — live elapsed for the {@code current} metric, longest
 * completed-or-active span for {@code longest}.
 */
public interface LeaderboardEntry {
    UUID getUserId();
    String getUsername();
    String getDisplayName();
    String getAvatarUrl();
    long getStreakSeconds();
}
