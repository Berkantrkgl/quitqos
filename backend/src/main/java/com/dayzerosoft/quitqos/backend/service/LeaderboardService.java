package com.dayzerosoft.quitqos.backend.service;

import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.repository.LeaderboardEntry;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardItem;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardMeResponse;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardResponse;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardSummaryResponse;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.SummaryLeader;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Leaderboard reads (API design §9). Two metrics: {@code current} (live active streak) and
 * {@code longest} (all-time best). Ranking is computed in the DB; see {@link QuitAttemptRepository}.
 */
@Service
public class LeaderboardService {

    /** Supported metrics. */
    public enum Metric { CURRENT, LONGEST }

    private final QuitAttemptRepository quitAttempts;

    public LeaderboardService(QuitAttemptRepository quitAttempts) {
        this.quitAttempts = quitAttempts;
    }

    /** Top {@code limit} users for the metric, ranked 1..n. */
    @Transactional(readOnly = true)
    public LeaderboardResponse leaderboard(Metric metric, int limit) {
        Pageable page = PageRequest.of(0, limit);
        List<LeaderboardEntry> rows = metric == Metric.LONGEST
                ? quitAttempts.leaderboardByLongest(page)
                : quitAttempts.leaderboardByCurrent(page);

        List<LeaderboardItem> items = toRankedItems(rows);
        return new LeaderboardResponse(metricName(metric), items);
    }

    /** The caller's own rank for the metric. rank 0 means "not on the board" (e.g. no active streak). */
    @Transactional(readOnly = true)
    public LeaderboardMeResponse myRank(UUID userId, Metric metric) {
        // Scan the full ranking to find the caller. Fine at MVP scale; can be replaced with a
        // count-of-better query if the user base grows.
        Pageable all = Pageable.unpaged();
        List<LeaderboardEntry> rows = metric == Metric.LONGEST
                ? quitAttempts.leaderboardByLongest(all)
                : quitAttempts.leaderboardByCurrent(all);

        for (int i = 0; i < rows.size(); i++) {
            if (rows.get(i).getUserId().equals(userId)) {
                return new LeaderboardMeResponse(i + 1, rows.get(i).getStreakSeconds(), metricName(metric));
            }
        }
        return new LeaderboardMeResponse(0, 0, metricName(metric));
    }

    /**
     * Public community summary + the top 3 by the current metric. Served to unauthenticated callers
     * (guests) so they can see what they'd join; deliberately exposes no user ids.
     */
    @Transactional(readOnly = true)
    public LeaderboardSummaryResponse summary() {
        List<LeaderboardEntry> topRows = quitAttempts.leaderboardByCurrent(PageRequest.of(0, 3));

        List<SummaryLeader> top = new java.util.ArrayList<>(topRows.size());
        for (int i = 0; i < topRows.size(); i++) {
            top.add(new SummaryLeader(i + 1, topRows.get(i).getUsername(), topRows.get(i).getStreakSeconds()));
        }

        // The board is ordered longest-live-streak first, so the #1 row is the current record.
        long longestSeconds = topRows.isEmpty() ? 0 : topRows.get(0).getStreakSeconds();

        return new LeaderboardSummaryResponse(
                quitAttempts.countActiveRacers(),
                longestSeconds,
                quitAttempts.countStartedToday(),
                top);
    }

    /** Parse the query param, defaulting to CURRENT; unknown values → 400. */
    public Metric parseMetric(String raw) {
        if (raw == null || raw.isBlank() || raw.equalsIgnoreCase("current")) {
            return Metric.CURRENT;
        }
        if (raw.equalsIgnoreCase("longest")) {
            return Metric.LONGEST;
        }
        throw ApiException.badRequest("Unknown metric '" + raw + "'");
    }

    private List<LeaderboardItem> toRankedItems(List<LeaderboardEntry> rows) {
        List<LeaderboardItem> items = new java.util.ArrayList<>(rows.size());
        for (int i = 0; i < rows.size(); i++) {
            LeaderboardEntry e = rows.get(i);
            items.add(new LeaderboardItem(i + 1, e.getUserId(), e.getUsername(), e.getDisplayName(),
                    e.getAvatarUrl(), e.getStreakSeconds()));
        }
        return items;
    }

    private String metricName(Metric metric) {
        return metric == Metric.LONGEST ? "longest" : "current";
    }
}
