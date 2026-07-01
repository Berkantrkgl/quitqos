package com.dayzerosoft.quitqos.backend.web.dto;

import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.Badge;
import com.dayzerosoft.quitqos.backend.domain.Milestone;

/** Response DTOs for the static catalogue endpoints (API design §6/§7): milestones + badges. */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    /** A badge as shown inside a milestone or in the badge catalogue. */
    public record BadgeDto(UUID id, String name, String iconUrl) {

        public static BadgeDto from(Badge badge) {
            return new BadgeDto(badge.getId(), badge.getName(), badge.getIconUrl());
        }
    }

    /** One milestone definition with its awarded badge. */
    public record MilestoneDto(
            UUID id,
            int offsetMinutes,
            String title,
            String description,
            BadgeDto badge) {

        public static MilestoneDto from(Milestone m) {
            return new MilestoneDto(m.getId(), m.getOffsetMinutes(), m.getTitle(),
                    m.getDescription(), BadgeDto.from(m.getBadge()));
        }
    }

    /** {@code GET /milestones}: the full milestone catalogue. */
    public record MilestoneListResponse(List<MilestoneDto> items) {
    }

    /** {@code GET /badges}: the full badge catalogue. */
    public record BadgeListResponse(List<BadgeDto> items) {
    }
}
