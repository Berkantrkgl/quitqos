package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;

/** Request/response DTOs for the quit-attempt endpoints (API design §5). */
public final class QuitAttemptDtos {

    private QuitAttemptDtos() {
    }

    /** {@code POST /quit-attempts}. startedAt optional: absent → now(), non-backdated. */
    public record CreateQuitAttemptRequest(Instant startedAt) {
    }

    /** {@code POST /quit-attempts/{id}/relapse}. endedAt optional: absent → now(). */
    public record RelapseRequest(Instant endedAt) {
    }

    /** Live elapsed time broken into components, for the home-screen counter. */
    public record Elapsed(long days, long hours, long minutes, long seconds) {

        /** Split a duration; clamps negatives (e.g. a future backdate guard slipped) to zero. */
        public static Elapsed of(Duration d) {
            if (d.isNegative()) {
                d = Duration.ZERO;
            }
            return new Elapsed(d.toDays(), d.toHoursPart(), d.toMinutesPart(), d.toSecondsPart());
        }
    }

    /** Full attempt view; {@code elapsed} is live for ACTIVE and frozen (started→ended) for RELAPSED. */
    public record QuitAttemptResponse(
            UUID id,
            Instant startedAt,
            Instant endedAt,
            QuitStatus status,
            boolean isBackdated,
            Elapsed elapsed) {

        public static QuitAttemptResponse from(QuitAttempt a, Instant now) {
            Instant until = a.getStatus() == QuitStatus.ACTIVE ? now : a.getEndedAt();
            return new QuitAttemptResponse(
                    a.getId(),
                    a.getStartedAt(),
                    a.getEndedAt(),
                    a.getStatus(),
                    a.isBackdated(),
                    Elapsed.of(Duration.between(a.getStartedAt(), until)));
        }
    }

    /** One row in the history list (§5, {@code GET /quit-attempts}). */
    public record QuitAttemptSummary(
            UUID id,
            Instant startedAt,
            Instant endedAt,
            QuitStatus status,
            long durationSeconds) {

        public static QuitAttemptSummary from(QuitAttempt a, Instant now) {
            Instant until = a.getStatus() == QuitStatus.ACTIVE ? now : a.getEndedAt();
            long seconds = Math.max(0, Duration.between(a.getStartedAt(), until).getSeconds());
            return new QuitAttemptSummary(a.getId(), a.getStartedAt(), a.getEndedAt(),
                    a.getStatus(), seconds);
        }
    }

    /** {@code GET /quit-attempts}: history + all-time longest streak. */
    public record QuitAttemptListResponse(
            List<QuitAttemptSummary> items,
            long longestStreakSeconds) {
    }

    /**
     * {@code POST /quit-attempts/{id}/relapse} result. lostBadges is stubbed to 0 until Stage 4
     * wires UserMilestone; the field stays in the contract so the client shape is stable.
     */
    public record RelapseResponse(
            UUID id,
            QuitStatus status,
            Instant endedAt,
            long durationSeconds,
            int lostBadges) {
    }
}
