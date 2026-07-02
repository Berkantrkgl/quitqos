package com.dayzerosoft.quitqos.backend.repository;

import java.util.Optional;
import java.util.UUID;

import com.dayzerosoft.quitqos.backend.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByFirebaseUid(String firebaseUid);

    /** Case-insensitive username existence check (matches the LOWER(username) unique index). */
    boolean existsByUsernameIgnoreCase(String username);
}
