package com.dayzerosoft.quitqos.backend.web;

import com.dayzerosoft.quitqos.backend.service.CatalogService;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.BadgeListResponse;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.MilestoneListResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Static catalogue endpoints (API design §6/§7): the milestone and badge definitions. Auth is
 * required (any registered user) but the data is the same for everyone.
 */
@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    private final CatalogService service;

    public CatalogController(CatalogService service) {
        this.service = service;
    }

    /** All milestone definitions (health-stats screen + progress bar). */
    @GetMapping("/milestones")
    public MilestoneListResponse milestones() {
        return service.listMilestones();
    }

    /** The full badge catalogue (unearned ones can be shown locked by the client). */
    @GetMapping("/badges")
    public BadgeListResponse badges() {
        return service.listBadges();
    }
}
