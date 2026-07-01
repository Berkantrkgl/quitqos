package com.dayzerosoft.quitqos.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.CreateQuitAttemptRequest;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptListResponse;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptResponse;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptSummary;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.RelapseResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quit-attempt lifecycle (API design §5). Enforces the domain rules: at most one ACTIVE attempt per
 * user, no future start, relapse closes the active attempt. All reads/writes are scoped to the
 * caller's user id — an attempt owned by someone else is treated as not found (404).
 */
@Service
public class QuitAttemptService {

    private final QuitAttemptRepository quitAttempts;
    private final UserRepository users;

    public QuitAttemptService(QuitAttemptRepository quitAttempts, UserRepository users) {
        this.quitAttempts = quitAttempts;
        this.users = users;
    }

    /** Start a new streak. Future startedAt → 422; an existing ACTIVE attempt → 409. */
    @Transactional
    public QuitAttemptResponse create(UUID userId, CreateQuitAttemptRequest request) {
        Instant now = Instant.now();
        Instant startedAt = request.startedAt() != null ? request.startedAt() : now;
        if (startedAt.isAfter(now)) {
            throw ApiException.unprocessable("startedAt cannot be in the future");
        }
        if (quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE).isPresent()) {
            throw ApiException.conflict("An active quit attempt already exists");
        }

        User userRef = users.getReferenceById(userId);
        QuitAttempt attempt = new QuitAttempt();
        attempt.setUser(userRef);
        attempt.setStartedAt(startedAt);
        attempt.setStatus(QuitStatus.ACTIVE);
        attempt.setBackdated(startedAt.isBefore(now));
        return QuitAttemptResponse.from(quitAttempts.save(attempt), now);
    }

    /** The active streak with live elapsed time. 404 if none. */
    @Transactional(readOnly = true)
    public QuitAttemptResponse current(UUID userId) {
        QuitAttempt attempt = quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("No active quit attempt"));
        return QuitAttemptResponse.from(attempt, Instant.now());
    }

    /** History for the user, optionally filtered by status, plus the all-time longest streak. */
    @Transactional(readOnly = true)
    public QuitAttemptListResponse list(UUID userId, Sort sort, QuitStatus status) {
        List<QuitAttempt> attempts = status != null
                ? quitAttempts.findByUserIdAndStatus(userId, status, sort)
                : quitAttempts.findByUserId(userId, sort);

        Instant now = Instant.now();
        List<QuitAttemptSummary> items = attempts.stream()
                .map(a -> QuitAttemptSummary.from(a, now))
                .toList();
        long longest = items.stream().mapToLong(QuitAttemptSummary::durationSeconds).max().orElse(0);
        return new QuitAttemptListResponse(items, longest);
    }

    /** Single attempt owned by the user. 404 if missing or owned by someone else. */
    @Transactional(readOnly = true)
    public QuitAttemptResponse get(UUID userId, UUID attemptId) {
        return QuitAttemptResponse.from(requireOwned(userId, attemptId), Instant.now());
    }

    /**
     * Close the active attempt. endedAt defaults to now; must be within the attempt's window
     * ([startedAt, now]). The attempt must be ACTIVE (relapsing a closed one → 409).
     */
    @Transactional
    public RelapseResponse relapse(UUID userId, UUID attemptId, Instant endedAtOverride) {
        QuitAttempt attempt = requireOwned(userId, attemptId);
        if (attempt.getStatus() != QuitStatus.ACTIVE) {
            throw ApiException.conflict("Quit attempt is not active");
        }

        Instant now = Instant.now();
        Instant endedAt = endedAtOverride != null ? endedAtOverride : now;
        if (endedAt.isAfter(now)) {
            throw ApiException.unprocessable("endedAt cannot be in the future");
        }
        if (endedAt.isBefore(attempt.getStartedAt())) {
            throw ApiException.unprocessable("endedAt cannot be before startedAt");
        }

        attempt.setStatus(QuitStatus.RELAPSED);
        attempt.setEndedAt(endedAt);
        quitAttempts.save(attempt);

        long seconds = Duration.between(attempt.getStartedAt(), endedAt).getSeconds();
        // lostBadges stays 0 until Stage 4 wires UserMilestone.
        return new RelapseResponse(attempt.getId(), attempt.getStatus(), endedAt, seconds, 0);
    }

    private QuitAttempt requireOwned(UUID userId, UUID attemptId) {
        return quitAttempts.findById(attemptId)
                .filter(a -> a.getUser().getId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Quit attempt not found"));
    }
}
