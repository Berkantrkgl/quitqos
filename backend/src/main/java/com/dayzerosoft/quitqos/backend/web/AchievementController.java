package com.dayzerosoft.quitqos.backend.web;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.service.AchievementService;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.AchievementsResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AchievementDtos.MilestoneProgressResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Achievement read endpoints: the user's earned badges (API design §7) and per-attempt milestone
 * progress (§6). The authenticated user id is the principal set by the JWT filter.
 */
@RestController
@RequestMapping("/api/v1")
public class AchievementController {

    private final AchievementService service;

    public AchievementController(AchievementService service) {
        this.service = service;
    }

    /** Earned badges + health benefits for the current user. */
    @GetMapping("/users/me/achievements")
    public AchievementsResponse achievements(@AuthenticationPrincipal UUID userId) {
        return service.achievements(userId);
    }

    /** Milestone progress (achieved + pending with ETA) for one owned attempt. */
    @GetMapping("/quit-attempts/{id}/milestones")
    public MilestoneProgressResponse milestones(@AuthenticationPrincipal UUID userId,
                                                @PathVariable UUID id) {
        return service.milestoneProgress(userId, id);
    }
}
