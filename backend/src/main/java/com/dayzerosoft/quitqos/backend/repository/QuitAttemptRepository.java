package com.dayzerosoft.quitqos.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuitAttemptRepository extends JpaRepository<QuitAttempt, UUID> {

    Optional<QuitAttempt> findByUserIdAndStatus(UUID userId, QuitStatus status);

    List<QuitAttempt> findByUserId(UUID userId, Sort sort);

    List<QuitAttempt> findByUserIdAndStatus(UUID userId, QuitStatus status, Sort sort);
}
