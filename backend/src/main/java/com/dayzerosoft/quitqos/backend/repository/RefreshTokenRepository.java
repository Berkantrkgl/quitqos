package com.dayzerosoft.quitqos.backend.repository;

import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteByTokenHash(String tokenHash);
}
