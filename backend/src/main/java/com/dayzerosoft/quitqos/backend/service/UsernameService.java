package com.dayzerosoft.quitqos.backend.service;

import java.text.Normalizer;
import java.util.regex.Pattern;

import com.dayzerosoft.quitqos.backend.repository.UserRepository;
import com.dayzerosoft.quitqos.backend.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Username policy in one place: validation of user-supplied handles, and automatic derivation of a
 * unique handle from an email on first login.
 *
 * Rules: 3–20 chars, lowercase {@code [a-z0-9_]}. Uniqueness is case-insensitive (enforced by the
 * {@code LOWER(username)} unique index; we also pre-check to return a clean 409 instead of a raw
 * constraint violation).
 */
@Service
public class UsernameService {

    private static final Pattern VALID = Pattern.compile("^[a-z0-9_]{3,20}$");
    private static final int MIN_LEN = 3;
    private static final int MAX_LEN = 20;

    private final UserRepository users;

    public UsernameService(UserRepository users) {
        this.users = users;
    }

    /** True if the handle is free (case-insensitively). */
    public boolean isAvailable(String username) {
        return !users.existsByUsernameIgnoreCase(username);
    }

    /**
     * Validate a user-chosen username and ensure it's free. Throws 422 for a malformed value and 409
     * if the (case-insensitive) handle is already taken.
     */
    public String validateForUpdate(String username) {
        String normalized = username == null ? "" : username.trim().toLowerCase();
        if (!VALID.matcher(normalized).matches()) {
            throw ApiException.unprocessable(
                    "Username must be 3–20 characters, using lowercase letters, numbers, or underscore");
        }
        if (!isAvailable(normalized)) {
            throw ApiException.conflict("Username is already taken");
        }
        return normalized;
    }

    /**
     * Derive a unique username from an email (or a fallback when email is absent). Strips the domain,
     * normalizes to the allowed charset, pads/truncates to the length rules, then appends an
     * incrementing suffix until the handle is free.
     */
    public String deriveUnique(String email) {
        String base = sanitize(localPart(email));
        if (base.length() < MIN_LEN) {
            base = (base + "user").substring(0, MIN_LEN);
        }
        if (base.length() > MAX_LEN) {
            base = base.substring(0, MAX_LEN);
        }

        if (isAvailable(base)) {
            return base;
        }
        // Append 2, 3, ... trimming the base so the suffix always fits within MAX_LEN.
        for (int n = 2; ; n++) {
            String suffix = Integer.toString(n);
            String candidate = truncate(base, MAX_LEN - suffix.length()) + suffix;
            if (isAvailable(candidate)) {
                return candidate;
            }
        }
    }

    private static String localPart(String email) {
        if (!StringUtils.hasText(email)) {
            return "user";
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    /** Lowercase, strip accents (ç→c, ş→s, …), keep only [a-z0-9_]. */
    private static String sanitize(String raw) {
        String ascii = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        String cleaned = ascii.toLowerCase().replaceAll("[^a-z0-9_]", "");
        return cleaned.isEmpty() ? "user" : cleaned;
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
