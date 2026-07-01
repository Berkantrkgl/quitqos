package com.dayzerosoft.quitqos.backend.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Request/response DTOs for guest→registered sync (API design §8). */
public final class SyncDtos {

    private SyncDtos() {
    }

    /** One device-local quit attempt to merge. localId makes the merge idempotent. */
    public record SyncAttempt(
            @NotNull Instant startedAt,
            Instant endedAt,
            @NotNull QuitStatus status,
            boolean isBackdated,
            @NotNull String localId) {
    }

    /** {@code POST /users/me/sync}: the device's quit-attempt history. */
    public record SyncRequest(@NotEmpty @Valid List<SyncAttempt> quitAttempts) {
    }

    /** Result of a sync: how many merged vs skipped (already present), and the current active id. */
    public record SyncResponse(int merged, int skipped, UUID currentAttemptId) {
    }
}
