-- Stage 5 (sync): a nullable device-local id on quit_attempt so guest→registered merges are
-- idempotent. Rows created server-side (POST /quit-attempts) leave local_id NULL; rows merged from
-- a device (POST /users/me/sync) carry the device's localId. A partial unique index enforces that
-- the same device row is merged at most once per user (NULLs are exempt, so server rows are unaffected).

ALTER TABLE quit_attempt ADD COLUMN local_id TEXT;

CREATE UNIQUE INDEX uq_quit_attempt_user_local
    ON quit_attempt (user_id, local_id)
    WHERE local_id IS NOT NULL;
