package com.dayzerosoft.quitqos.backend.repository;

import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    List<Milestone> findAllByOrderByOffsetMinutesAsc();
}
