package com.dayzerosoft.quitqos.backend.web;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.service.LeaderboardService;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardMeResponse;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Leaderboard endpoints (API design §9). Registered-only; since guests never reach the backend,
 * every authenticated caller is eligible. Default metric is {@code current}.
 */
@RestController
@RequestMapping("/api/v1/leaderboard")
public class LeaderboardController {

    /** Clamp for the page size so a client can't request an unbounded scan. */
    private static final int MAX_LIMIT = 100;

    private final LeaderboardService service;

    public LeaderboardController(LeaderboardService service) {
        this.service = service;
    }

    /** Ranked list. ?metric=current|longest (default current), ?limit=50 (max 100). */
    @GetMapping
    public LeaderboardResponse leaderboard(
            @RequestParam(required = false) String metric,
            @RequestParam(defaultValue = "50") int limit) {
        int clamped = Math.max(1, Math.min(limit, MAX_LIMIT));
        return service.leaderboard(service.parseMetric(metric), clamped);
    }

    /** The caller's own rank for the metric. */
    @GetMapping("/me")
    public LeaderboardMeResponse myRank(@AuthenticationPrincipal UUID userId,
                                        @RequestParam(required = false) String metric) {
        return service.myRank(userId, service.parseMetric(metric));
    }
}
