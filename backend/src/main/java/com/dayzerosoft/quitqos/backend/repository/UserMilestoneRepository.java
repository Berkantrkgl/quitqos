package com.dayzerosoft.quitqos.backend.repository;

import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.UserMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMilestoneRepository extends JpaRepository<UserMilestone, UUID> {

    List<UserMilestone> findByQuitAttemptId(UUID quitAttemptId);

    List<UserMilestone> findByUserId(UUID userId);

    boolean existsByQuitAttemptIdAndMilestoneId(UUID quitAttemptId, UUID milestoneId);
}
