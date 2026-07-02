-- Add a unique, user-facing username to app_user. Assigned automatically on first
-- login (derived from the email local-part) and editable later via PATCH /users/me.
-- Rules: 3–20 chars, lowercase [a-z0-9_]; uniqueness is case-insensitive.

-- 1. Add nullable first so we can backfill existing rows.
ALTER TABLE app_user ADD COLUMN username TEXT;

-- 2. Backfill any pre-existing rows with a deterministic placeholder derived from
--    the id (safe, unique). Real accounts get a proper username at next login upsert.
UPDATE app_user
   SET username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
 WHERE username IS NULL;

-- 3. Enforce presence + case-insensitive uniqueness.
ALTER TABLE app_user ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX uq_app_user_username_lower ON app_user (LOWER(username));
