-- QuitQOS schema (Stage 1). Flyway owns the schema; Hibernate validates against it.
-- All ids are UUID, generated DB-side via gen_random_uuid() (pgcrypto / built-in in PG13+).
-- Timestamps are stored UTC (timestamptz).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Static badge catalogue (seeded in V2).
CREATE TABLE badge (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL,
    icon_url  TEXT
);

-- Static milestone catalogue (seeded in V2). One badge per milestone.
CREATE TABLE milestone (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offset_minutes INTEGER NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL,
    badge_id       UUID NOT NULL REFERENCES badge (id)
);

-- Registered users only (guests never hit the backend).
CREATE TABLE app_user (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid          TEXT NOT NULL UNIQUE,
    display_name          TEXT,
    avatar_url            TEXT,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_token             TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One streak attempt. At most one ACTIVE per user (enforced by partial unique index below).
CREATE TABLE quit_attempt (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL,
    ended_at     TIMESTAMPTZ,
    status       TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RELAPSED')),
    is_backdated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quit_attempt_user ON quit_attempt (user_id);

-- At most one ACTIVE attempt per user.
CREATE UNIQUE INDEX uq_quit_attempt_active_per_user
    ON quit_attempt (user_id)
    WHERE status = 'ACTIVE';

-- A milestone reached within a specific attempt. Unique per (attempt, milestone).
CREATE TABLE user_milestone (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    quit_attempt_id      UUID NOT NULL REFERENCES quit_attempt (id) ON DELETE CASCADE,
    milestone_id         UUID NOT NULL REFERENCES milestone (id),
    achieved_at          TIMESTAMPTZ NOT NULL,
    notification_sent_at TIMESTAMPTZ,
    CONSTRAINT uq_user_milestone UNIQUE (quit_attempt_id, milestone_id)
);

CREATE INDEX idx_user_milestone_user ON user_milestone (user_id);
