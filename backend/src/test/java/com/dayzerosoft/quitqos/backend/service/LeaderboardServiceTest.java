package com.dayzerosoft.quitqos.backend.service;

import java.util.List;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.repository.LeaderboardEntry;
import com.dayzerosoft.quitqos.backend.repository.QuitAttemptRepository;
import com.dayzerosoft.quitqos.backend.service.LeaderboardService.Metric;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardMeResponse;
import com.dayzerosoft.quitqos.backend.web.dto.LeaderboardDtos.LeaderboardResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LeaderboardService}: metric parsing, rank numbering, and the "not ranked"
 * case. The repository returns projection rows (already ordered); the service just numbers them.
 */
@ExtendWith(MockitoExtension.class)
class LeaderboardServiceTest {

    @Mock QuitAttemptRepository quitAttempts;

    @InjectMocks
    LeaderboardService service;

    /** Minimal LeaderboardEntry stub (it is an interface projection). */
    private LeaderboardEntry entry(UUID userId, long streakSeconds) {
        return new LeaderboardEntry() {
            public UUID getUserId() { return userId; }
            public String getUsername() { return "user_" + userId.toString().substring(0, 4); }
            public String getDisplayName() { return "user-" + userId; }
            public String getAvatarUrl() { return null; }
            public long getStreakSeconds() { return streakSeconds; }
        };
    }

    // --- parseMetric --------------------------------------------------------

    @Test
    void parseMetric_defaultsToCurrent() {
        assertThat(service.parseMetric(null)).isEqualTo(Metric.CURRENT);
        assertThat(service.parseMetric("")).isEqualTo(Metric.CURRENT);
        assertThat(service.parseMetric("current")).isEqualTo(Metric.CURRENT);
        assertThat(service.parseMetric("CURRENT")).isEqualTo(Metric.CURRENT);
    }

    @Test
    void parseMetric_longest() {
        assertThat(service.parseMetric("longest")).isEqualTo(Metric.LONGEST);
    }

    @Test
    void parseMetric_unknown_throwsBadRequest() {
        assertThatThrownBy(() -> service.parseMetric("weekly"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // --- leaderboard --------------------------------------------------------

    @Test
    void leaderboard_numbersRowsFromOne() {
        UUID u1 = UUID.randomUUID();
        UUID u2 = UUID.randomUUID();
        when(quitAttempts.leaderboardByCurrent(any(Pageable.class)))
                .thenReturn(List.of(entry(u1, 5000), entry(u2, 3000)));

        LeaderboardResponse response = service.leaderboard(Metric.CURRENT, 50);

        assertThat(response.metric()).isEqualTo("current");
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).rank()).isEqualTo(1);
        assertThat(response.items().get(0).userId()).isEqualTo(u1);
        assertThat(response.items().get(1).rank()).isEqualTo(2);
    }

    @Test
    void leaderboard_longest_usesLongestQueryAndMetricName() {
        when(quitAttempts.leaderboardByLongest(any(Pageable.class)))
                .thenReturn(List.of(entry(UUID.randomUUID(), 9999)));

        LeaderboardResponse response = service.leaderboard(Metric.LONGEST, 10);

        assertThat(response.metric()).isEqualTo("longest");
        assertThat(response.items()).singleElement()
                .satisfies(i -> assertThat(i.rank()).isEqualTo(1));
    }

    // --- myRank -------------------------------------------------------------

    @Test
    void myRank_returnsCallersPosition() {
        UUID me = UUID.randomUUID();
        when(quitAttempts.leaderboardByCurrent(any(Pageable.class)))
                .thenReturn(List.of(entry(UUID.randomUUID(), 9000), entry(me, 4000)));

        LeaderboardMeResponse response = service.myRank(me, Metric.CURRENT);

        assertThat(response.rank()).isEqualTo(2);
        assertThat(response.streakSeconds()).isEqualTo(4000);
        assertThat(response.metric()).isEqualTo("current");
    }

    @Test
    void myRank_whenNotOnBoard_returnsZero() {
        UUID me = UUID.randomUUID();
        when(quitAttempts.leaderboardByCurrent(any(Pageable.class)))
                .thenReturn(List.of(entry(UUID.randomUUID(), 9000)));

        LeaderboardMeResponse response = service.myRank(me, Metric.CURRENT);

        assertThat(response.rank()).isZero();
        assertThat(response.streakSeconds()).isZero();
    }
}
