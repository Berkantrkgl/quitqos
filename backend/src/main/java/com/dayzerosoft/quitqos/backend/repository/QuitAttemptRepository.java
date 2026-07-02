package com.dayzerosoft.quitqos.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.QuitAttempt;
import com.dayzerosoft.quitqos.backend.domain.QuitStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuitAttemptRepository extends JpaRepository<QuitAttempt, UUID> {

    Optional<QuitAttempt> findByUserIdAndStatus(UUID userId, QuitStatus status);

    List<QuitAttempt> findByUserId(UUID userId, Sort sort);

    List<QuitAttempt> findByUserIdAndStatus(UUID userId, QuitStatus status, Sort sort);

    /** For sync idempotency: has this device row already been merged for this user? */
    boolean existsByUserIdAndLocalId(UUID userId, String localId);

    /** For the notification scheduler: every ACTIVE attempt, user eagerly joined to avoid N+1. */
    @Query("SELECT qa FROM QuitAttempt qa JOIN FETCH qa.user WHERE qa.status = :status")
    List<QuitAttempt> findByStatusWithUser(@Param("status") QuitStatus status);

    /**
     * Leaderboard by CURRENT metric: one row per user who has an ACTIVE attempt, ordered by the live
     * streak length (longest first). streakSeconds = now - startedAt, computed in the DB.
     */
    @Query(value = """
            SELECT u.id AS userId, u.username AS username, u.display_name AS displayName,
                   u.avatar_url AS avatarUrl,
                   EXTRACT(EPOCH FROM (now() - qa.started_at))::bigint AS streakSeconds
            FROM quit_attempt qa
            JOIN app_user u ON u.id = qa.user_id
            WHERE qa.status = 'ACTIVE'
            ORDER BY qa.started_at ASC
            """, nativeQuery = true)
    List<LeaderboardEntry> leaderboardByCurrent(Pageable pageable);

    /**
     * Leaderboard by LONGEST metric: one row per user, using their single longest streak across all
     * attempts (active spans measured to now, relapsed ones to endedAt). Longest first.
     */
    @Query(value = """
            SELECT u.id AS userId, u.username AS username, u.display_name AS displayName,
                   u.avatar_url AS avatarUrl,
                   MAX(EXTRACT(EPOCH FROM (COALESCE(qa.ended_at, now()) - qa.started_at)))::bigint AS streakSeconds
            FROM quit_attempt qa
            JOIN app_user u ON u.id = qa.user_id
            GROUP BY u.id, u.username, u.display_name, u.avatar_url
            ORDER BY streakSeconds DESC
            """, nativeQuery = true)
    List<LeaderboardEntry> leaderboardByLongest(Pageable pageable);
}
