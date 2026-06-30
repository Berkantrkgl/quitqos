package com.dayzerosoft.quitqos.backend.repository;

import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.Badge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BadgeRepository extends JpaRepository<Badge, UUID> {
}
