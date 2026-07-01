package com.dayzerosoft.quitqos.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncAttempt;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncRequest;
import com.dayzerosoft.quitqos.backend.web.dto.SyncDtos.SyncResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SyncService}: idempotency by localId and the "at most one ACTIVE" merge rule
 * (earliest startedAt wins). Repositories are mocked; save() echoes its argument back.
 */
@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    @Mock QuitAttemptRepository quitAttempts;
    @Mock UserRepository users;

    @InjectMocks
    SyncService service;

    private final UUID userId = UUID.randomUUID();

    private SyncAttempt active(String localId, String startedAt) {
        return new SyncAttempt(Instant.parse(startedAt), null, QuitStatus.ACTIVE, true, localId);
    }

    private SyncAttempt relapsed(String localId, String startedAt, String endedAt) {
        return new SyncAttempt(Instant.parse(startedAt), Instant.parse(endedAt),
                QuitStatus.RELAPSED, false, localId);
    }

    private void stubCommonMocks() {
        lenient().when(users.getReferenceById(userId)).thenReturn(new User());
        lenient().when(quitAttempts.save(any(QuitAttempt.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(quitAttempts.saveAndFlush(any(QuitAttempt.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void sync_mergesNewAttempts() {
        stubCommonMocks();
        when(quitAttempts.existsByUserIdAndLocalId(eq(userId), any())).thenReturn(false);
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.empty());

        SyncResponse response = service.sync(userId, new SyncRequest(List.of(
                relapsed("d1", "2026-05-01T00:00:00Z", "2026-05-10T00:00:00Z"),
                active("d2", "2026-06-20T00:00:00Z"))));

        assertThat(response.merged()).isEqualTo(2);
        assertThat(response.skipped()).isZero();
        verify(quitAttempts, org.mockito.Mockito.times(2)).save(any(QuitAttempt.class));
    }

    @Test
    void sync_skipsAlreadyMergedLocalIds() {
        stubCommonMocks();
        // d1 already merged, d2 is new
        when(quitAttempts.existsByUserIdAndLocalId(userId, "d1")).thenReturn(true);
        when(quitAttempts.existsByUserIdAndLocalId(userId, "d2")).thenReturn(false);
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.empty());

        SyncResponse response = service.sync(userId, new SyncRequest(List.of(
                relapsed("d1", "2026-05-01T00:00:00Z", "2026-05-10T00:00:00Z"),
                active("d2", "2026-06-20T00:00:00Z"))));

        assertThat(response.merged()).isEqualTo(1);
        assertThat(response.skipped()).isEqualTo(1);
    }

    @Test
    void sync_incomingActiveOlderThanExisting_incomingWins() {
        stubCommonMocks();
        when(quitAttempts.existsByUserIdAndLocalId(eq(userId), any())).thenReturn(false);

        // existing active started later than the incoming one
        QuitAttempt existing = new QuitAttempt();
        existing.setStatus(QuitStatus.ACTIVE);
        existing.setStartedAt(Instant.parse("2026-06-28T00:00:00Z"));
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.of(existing));

        service.sync(userId, new SyncRequest(List.of(active("older", "2026-06-01T00:00:00Z"))));

        // the OLD active is relapsed and flushed before inserting the incoming winner
        assertThat(existing.getStatus()).isEqualTo(QuitStatus.RELAPSED);
        assertThat(existing.getEndedAt()).isNotNull();
        verify(quitAttempts).saveAndFlush(existing);
    }

    @Test
    void sync_incomingActiveNewerThanExisting_incomingStoredAsRelapsed() {
        stubCommonMocks();
        when(quitAttempts.existsByUserIdAndLocalId(eq(userId), any())).thenReturn(false);

        QuitAttempt existing = new QuitAttempt();
        existing.setStatus(QuitStatus.ACTIVE);
        existing.setStartedAt(Instant.parse("2026-06-01T00:00:00Z"));
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.of(existing));

        service.sync(userId, new SyncRequest(List.of(active("newer", "2026-06-28T00:00:00Z"))));

        // existing stays active (never flushed), incoming is saved already-relapsed
        assertThat(existing.getStatus()).isEqualTo(QuitStatus.ACTIVE);
        verify(quitAttempts, never()).saveAndFlush(any());

        ArgumentCaptor<QuitAttempt> saved = ArgumentCaptor.forClass(QuitAttempt.class);
        verify(quitAttempts).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(QuitStatus.RELAPSED);
        assertThat(saved.getValue().getLocalId()).isEqualTo("newer");
    }
}
