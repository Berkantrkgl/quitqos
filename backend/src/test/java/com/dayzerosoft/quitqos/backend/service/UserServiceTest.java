package com.dayzerosoft.quitqos.backend.service;

import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UpdateUserRequest;
import com.dayzerosoft.quitqos.backend.web.dto.UserDtos.UserProfileResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UserService}. The one real rule here is the partial update: only non-null
 * fields are applied, absent fields are left untouched.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository users;

    @Mock
    UsernameService usernameService;

    @InjectMocks
    UserService service;

    private final UUID userId = UUID.randomUUID();

    private User existingUser() {
        User user = new User();
        user.setDisplayName("Berkan");
        user.setAvatarUrl("https://old/avatar.png");
        user.setNotificationsEnabled(true);
        return user;
    }

    @Test
    void update_onlyAppliesNonNullFields() {
        User user = existingUser();
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // only displayName + notificationsEnabled are set; username + avatarUrl are null (absent)
        UpdateUserRequest request = new UpdateUserRequest(null, "Berkan T.", null, false, null);
        UserProfileResponse response = service.update(userId, request);

        assertThat(response.displayName()).isEqualTo("Berkan T.");       // changed
        assertThat(response.notificationsEnabled()).isFalse();           // changed
        assertThat(response.avatarUrl()).isEqualTo("https://old/avatar.png"); // untouched
    }

    @Test
    void update_withAllNull_changesNothing() {
        User user = existingUser();
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserProfileResponse response = service.update(userId, new UpdateUserRequest(null, null, null, null, null));

        assertThat(response.displayName()).isEqualTo("Berkan");
        assertThat(response.avatarUrl()).isEqualTo("https://old/avatar.png");
        assertThat(response.notificationsEnabled()).isTrue();
    }

    @Test
    void me_whenUserMissing_throwsNotFound() {
        when(users.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.me(userId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
