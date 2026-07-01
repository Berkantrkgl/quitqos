package com.dayzerosoft.quitqos.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import com.dayzerosoft.quitqos.backend.config.JwtProperties;
import com.dayzerosoft.quitqos.backend.domain.RefreshToken;
import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.RefreshTokenRepository;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier;
import com.dayzerosoft.quitqos.backend.security.FirebaseTokenVerifier.VerifiedIdentity;
import com.dayzerosoft.quitqos.backend.security.JwtService;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.AuthResponse;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.FirebaseLoginRequest;
import com.dayzerosoft.quitqos.backend.web.dto.AuthDtos.TokenResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService}: the auth-flow rules with all collaborators mocked. The focus is
 * refresh-token rotation and revocation — the security-critical logic.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock FirebaseTokenVerifier firebaseVerifier;
    @Mock JwtService jwtService;
    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock JwtProperties jwtProperties;

    @InjectMocks
    AuthService service;

    // --- login (upsert) -----------------------------------------------------

    @Test
    void login_whenUserIsNew_createsAndReturnsTokens() {
        when(firebaseVerifier.verify("fb-token"))
                .thenReturn(new VerifiedIdentity("firebase-uid-1", "Ada", null));
        when(userRepository.findByFirebaseUid("firebase-uid-1")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issueAccessToken(any())).thenReturn("access-jwt");
        when(jwtService.accessTokenTtlSeconds()).thenReturn(3600L);
        when(jwtProperties.refreshTokenTtl()).thenReturn(Duration.ofDays(180));

        AuthResponse response = service.loginWithFirebase(
                new FirebaseLoginRequest("fb-token", null, null, null));

        assertThat(response.accessToken()).isEqualTo("access-jwt");
        assertThat(response.refreshToken()).isNotBlank();
        // a new user with the verified uid was saved
        verify(userRepository).save(any(User.class));
        // a refresh token row was persisted
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void login_withInvalidFirebaseToken_propagatesAuthError() {
        when(firebaseVerifier.verify("bad"))
                .thenThrow(new FirebaseTokenVerifier.FirebaseAuthException("bad token", null));

        assertThatThrownBy(() -> service.loginWithFirebase(
                new FirebaseLoginRequest("bad", null, null, null)))
                .isInstanceOf(FirebaseTokenVerifier.FirebaseAuthException.class);

        verify(userRepository, never()).save(any());
    }

    // --- refresh (rotation) -------------------------------------------------

    @Test
    void refresh_withValidToken_rotatesOldOneAndIssuesNewPair() {
        RefreshToken stored = new RefreshToken();
        stored.setUser(new User());
        stored.setExpiresAt(Instant.now().plus(30, ChronoUnit.DAYS));   // not expired
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));
        when(jwtService.issueAccessToken(any())).thenReturn("new-access-jwt");
        when(jwtService.accessTokenTtlSeconds()).thenReturn(3600L);
        when(jwtProperties.refreshTokenTtl()).thenReturn(Duration.ofDays(180));

        TokenResponse response = service.refresh("raw-refresh-token");

        assertThat(response.accessToken()).isEqualTo("new-access-jwt");
        // ROTATION: the presented token is deleted, and a fresh one is saved
        verify(refreshTokenRepository).delete(stored);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void refresh_withUnknownToken_throwsUnauthorized() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("nope"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void refresh_withExpiredToken_deletesItAndThrowsUnauthorized() {
        RefreshToken expired = new RefreshToken();
        expired.setUser(new User());
        expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));   // expired
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.refresh("stale"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.UNAUTHORIZED));

        // expired row is cleaned up, but no new token is issued
        verify(refreshTokenRepository).delete(expired);
        verify(refreshTokenRepository, never()).save(any());
    }

    // --- logout -------------------------------------------------------------

    @Test
    void logout_deletesTheRefreshRow() {
        service.logout("raw-refresh-token");
        verify(refreshTokenRepository).deleteByTokenHash(anyString());
    }
}
