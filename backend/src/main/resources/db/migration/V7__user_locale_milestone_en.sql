-- Multi-language milestone push notifications.
--   * app_user.locale  — the user's chosen app language ('tr' | 'en'), default 'tr'.
--     Mobile sends it via PATCH /users/me on login + whenever the language changes.
--   * milestone.title_en / description_en — English copy, mirroring the mobile
--     i18n catalogue (src/i18n/locales/en.json) so screens and pushes match.
-- The push scheduler picks the column pair by user.locale. TR stays the default
-- (existing title/description columns); EN is added here.

-- 1. User locale.
ALTER TABLE app_user ADD COLUMN locale VARCHAR(5) NOT NULL DEFAULT 'tr';

-- 2. Milestone English columns (nullable while backfilling, then set NOT NULL).
ALTER TABLE milestone ADD COLUMN title_en VARCHAR(255);
ALTER TABLE milestone ADD COLUMN description_en VARCHAR(1024);

-- 3. Backfill EN copy (matches src/i18n/locales/en.json exactly).
UPDATE milestone SET title_en = '20 minutes', description_en = 'Your pulse and blood pressure begin to drop from the spike nicotine caused.' WHERE id = 'a0000001-0000-4000-8000-000000000001';
UPDATE milestone SET title_en = '12 hours',   description_en = 'Carbon monoxide in your blood returns to normal; your oxygen-carrying capacity recovers.' WHERE id = 'a0000002-0000-4000-8000-000000000002';
UPDATE milestone SET title_en = '24 hours',   description_en = 'The nicotine level in your blood has dropped to nearly zero.' WHERE id = 'a0000003-0000-4000-8000-000000000003';
UPDATE milestone SET title_en = '48 hours',   description_en = 'Your senses of taste and smell start to sharpen.' WHERE id = 'a0000004-0000-4000-8000-000000000004';
UPDATE milestone SET title_en = '72 hours',   description_en = 'Your bronchial tubes relax and breathing gets easier.' WHERE id = 'a0000005-0000-4000-8000-000000000005';
UPDATE milestone SET title_en = '1 week',     description_en = 'Your body starts adjusting to life without nicotine.' WHERE id = 'a0000006-0000-4000-8000-000000000006';
UPDATE milestone SET title_en = '1 month',    description_en = 'Your lung function improves, coughing eases, and your energy starts to recover.' WHERE id = 'a0000007-0000-4000-8000-000000000007';
UPDATE milestone SET title_en = '3 months',   description_en = 'Your circulation and lung function improve markedly.' WHERE id = 'a0000008-0000-4000-8000-000000000008';
UPDATE milestone SET title_en = '1 year',     description_en = 'Your excess risk of coronary heart disease drops to half that of someone who keeps smoking.' WHERE id = 'a0000009-0000-4000-8000-000000000009';
UPDATE milestone SET title_en = '5 days',     description_en = 'The most intense days of withdrawal are behind you — you''ve cleared the hardest part.' WHERE id = 'a0000010-0000-4000-8000-000000000010';
UPDATE milestone SET title_en = '10 days',    description_en = 'Taste and smell come back noticeably; food tastes better.' WHERE id = 'a0000011-0000-4000-8000-000000000011';
UPDATE milestone SET title_en = '2 weeks',    description_en = 'Your circulation improves; walking and moving get easier.' WHERE id = 'a0000012-0000-4000-8000-000000000012';
UPDATE milestone SET title_en = '6 months',   description_en = 'Your stress and tension ease; your mood becomes more balanced.' WHERE id = 'a0000013-0000-4000-8000-000000000013';

-- 4. Now that every row is backfilled, enforce NOT NULL.
ALTER TABLE milestone ALTER COLUMN title_en SET NOT NULL;
ALTER TABLE milestone ALTER COLUMN description_en SET NOT NULL;
