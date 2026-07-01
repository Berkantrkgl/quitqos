package com.dayzerosoft.quitqos.backend.service;

import java.time.Instant;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncAttempt;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncRequest;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guest→registered merge (API design §8). Idempotent by {@code localId}: an attempt already merged
 * for this user is skipped. Enforces the "at most one ACTIVE" rule after merging — if more than one
 * active streak results (existing + incoming), the earliest {@code startedAt} wins and the rest are
 * closed as RELAPSED.
 */
@Service
public class SyncService {

    private final QuitAttemptRepository quitAttempts;
    private final UserRepository users;

    public SyncService(QuitAttemptRepository quitAttempts, UserRepository users) {
        this.quitAttempts = quitAttempts;
        this.users = users;
    }

    @Transactional
    public SyncResponse sync(UUID userId, SyncRequest request) {
        User userRef = users.getReferenceById(userId);
        // Track the current single ACTIVE attempt as we merge, so the DB's one-active-per-user index
        // is never violated: an incoming ACTIVE only stays active if it wins against the current one.
        QuitAttempt currentActive = quitAttempts
                .findByUserIdAndStatus(userId, QuitStatus.ACTIVE)
                .orElse(null);

        int merged = 0;
        int skipped = 0;

        for (SyncAttempt incoming : request.quitAttempts()) {
            // idempotency: this device row was already merged for this user → skip
            if (quitAttempts.existsByUserIdAndLocalId(userId, incoming.localId())) {
                skipped++;
                continue;
            }

            QuitAttempt entity = toEntity(userRef, incoming);
            if (entity.getStatus() == QuitStatus.ACTIVE) {
                currentActive = mergeActive(entity, currentActive);
            } else {
                quitAttempts.save(entity);
            }
            merged++;
        }

        UUID currentAttemptId = currentActive != null ? currentActive.getId() : null;
        return new SyncResponse(merged, skipped, currentAttemptId);
    }

    /**
     * Insert an incoming ACTIVE attempt while keeping at most one active. If there is no current
     * active, it becomes active. Otherwise the earliest {@code startedAt} wins: the loser is closed
     * as RELAPSED and flushed *before* the winner is inserted, so the one-active-per-user unique
     * index is never transiently violated. Returns the attempt that remains ACTIVE.
     */
    private QuitAttempt mergeActive(QuitAttempt incoming, QuitAttempt currentActive) {
        if (currentActive == null) {
            return quitAttempts.save(incoming);
        }
        if (incoming.getStartedAt().isBefore(currentActive.getStartedAt())) {
            // incoming wins → close the old active first, flush to free the index, then insert
            currentActive.setStatus(QuitStatus.RELAPSED);
            currentActive.setEndedAt(Instant.now());
            quitAttempts.saveAndFlush(currentActive);
            return quitAttempts.save(incoming);
        }
        // current active wins → the incoming one is stored as already-relapsed
        incoming.setStatus(QuitStatus.RELAPSED);
        incoming.setEndedAt(Instant.now());
        quitAttempts.save(incoming);
        return currentActive;
    }

    private QuitAttempt toEntity(User userRef, SyncAttempt incoming) {
        QuitAttempt attempt = new QuitAttempt();
        attempt.setUser(userRef);
        attempt.setStartedAt(incoming.startedAt());
        attempt.setEndedAt(incoming.endedAt());
        attempt.setStatus(incoming.status());
        attempt.setBackdated(incoming.isBackdated());
        attempt.setLocalId(incoming.localId());
        return attempt;
    }
}
