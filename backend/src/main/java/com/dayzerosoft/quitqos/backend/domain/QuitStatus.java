package com.dayzerosoft.quitqos.backend.domain;

/**
 * Lifecycle of a {@link QuitAttempt}. At most one ACTIVE per user; relapse closes it as RELAPSED.
 */
public enum QuitStatus {
    ACTIVE,
    RELAPSED
}
