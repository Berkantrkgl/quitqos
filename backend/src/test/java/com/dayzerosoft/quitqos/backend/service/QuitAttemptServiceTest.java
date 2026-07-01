package com.dayzerosoft.quitqos.backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.CreateQuitAttemptRequest;
import com.dayzerosoft.quitqos.backend.web.dto.QuitAttemptDtos.QuitAttemptResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link QuitAttemptService}: the business rules in isolation. The repositories are
 * mocked, so no database is involved — we control exactly what they return and assert how the
 * service reacts.
 */
@ExtendWith(MockitoExtension.class)
class QuitAttemptServiceTest {

    @Mock
    QuitAttemptRepository quitAttempts;

    @Mock
    UserRepository users;

    @InjectMocks
    QuitAttemptService service;

    private final UUID userId = UUID.randomUUID();

    @Test
    void create_withNoStartedAt_startsActiveNonBackdatedAttempt() {
        // given: no active attempt exists, and save() returns whatever it is handed
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.empty());
        when(users.getReferenceById(userId)).thenReturn(new User());
        when(quitAttempts.save(any(QuitAttempt.class))).thenAnswer(inv -> inv.getArgument(0));

        // when: create with an empty request (startedAt = now)
        QuitAttemptResponse response = service.create(userId, new CreateQuitAttemptRequest(null));

        // then: it is ACTIVE and not backdated
        assertThat(response.status()).isEqualTo(QuitStatus.ACTIVE);
        assertThat(response.isBackdated()).isFalse();
        verify(quitAttempts).save(any(QuitAttempt.class));
    }

    @Test
    void create_withPastStartedAt_marksBackdated() {
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE)).thenReturn(Optional.empty());
        when(users.getReferenceById(userId)).thenReturn(new User());
        when(quitAttempts.save(any(QuitAttempt.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant twoDaysAgo = Instant.now().minus(2, ChronoUnit.DAYS);
        QuitAttemptResponse response = service.create(userId, new CreateQuitAttemptRequest(twoDaysAgo));

        assertThat(response.isBackdated()).isTrue();
    }

    @Test
    void create_withFutureStartedAt_throwsUnprocessable() {
        Instant tomorrow = Instant.now().plus(1, ChronoUnit.DAYS);

        assertThatThrownBy(() -> service.create(userId, new CreateQuitAttemptRequest(tomorrow)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT));

        // rule violated before touching the DB: nothing is saved
        verify(quitAttempts, never()).save(any());
    }

    @Test
    void create_whenActiveAlreadyExists_throwsConflict() {
        when(quitAttempts.findByUserIdAndStatus(userId, QuitStatus.ACTIVE))
                .thenReturn(Optional.of(new QuitAttempt()));

        assertThatThrownBy(() -> service.create(userId, new CreateQuitAttemptRequest(null)))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.CONFLICT));

        verify(quitAttempts, never()).save(any());
    }

    @Test
    void get_whenAttemptOwnedByAnotherUser_throwsNotFound() {
        // an attempt whose owner has a DIFFERENT id than the caller
        User otherOwner = mock(User.class);
        when(otherOwner.getId()).thenReturn(UUID.randomUUID());
        QuitAttempt someoneElses = new QuitAttempt();
        someoneElses.setUser(otherOwner);

        UUID attemptId = UUID.randomUUID();
        when(quitAttempts.findById(attemptId)).thenReturn(Optional.of(someoneElses));

        assertThatThrownBy(() -> service.get(userId, attemptId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
