package com.dayzerosoft.quitqos.backend.service;

import java.util.List;

import com.dayzerosoft.quitqos.backend.repository.BadgeRepository;
import com.dayzerosoft.quitqos.backend.repository.MilestoneRepository;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.BadgeDto;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.BadgeListResponse;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.MilestoneDto;
import com.dayzerosoft.quitqos.backend.web.dto.CatalogDtos.MilestoneListResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads the static milestone/badge catalogue (API design §6/§7). Seeded via Flyway, never mutated. */
@Service
public class CatalogService {

    private final MilestoneRepository milestones;
    private final BadgeRepository badges;

    public CatalogService(MilestoneRepository milestones, BadgeRepository badges) {
        this.milestones = milestones;
        this.badges = badges;
    }

    /** All milestones ordered by how soon they are reached (offsetMinutes ascending). */
    @Transactional(readOnly = true)
    public MilestoneListResponse listMilestones() {
        List<MilestoneDto> items = milestones.findAllByOrderByOffsetMinutesAsc().stream()
                .map(MilestoneDto::from)
                .toList();
        return new MilestoneListResponse(items);
    }

    /** The full badge catalogue, ordered by name for a stable listing. */
    @Transactional(readOnly = true)
    public BadgeListResponse listBadges() {
        List<BadgeDto> items = badges.findAll(Sort.by("name")).stream()
                .map(BadgeDto::from)
                .toList();
        return new BadgeListResponse(items);
    }
}
