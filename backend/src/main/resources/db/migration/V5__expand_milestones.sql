-- Expand the milestone catalogue from 9 to 13 and align titles/descriptions with
-- the evidence-based recovery timeline (CDC / WHO / ACS / Surgeon General + peer-
-- reviewed literature; see the QuitQOS recovery-timeline research). Keeps the fixed
-- deterministic UUIDs of the original 9; adds 4 new badges + milestones.
--
-- Changes to existing rows:
--   * "8 saat" (480 min) → "12 saat" (720 min): CDC/WHO place CO normalization at
--     ~12h; "halves at 8h" is an oversimplification.
--   * Softened over-stated / weakly-sourced copy (20 min "normalize", 24h "heart
--     attack risk", etc.) to defensible phrasing.
-- New milestones: 5 gün, 10 gün, 2 hafta, 6 ay.

-- 1. New badges (fixed UUIDs continue the b000000X series).
INSERT INTO badge (id, name, icon_url) VALUES
    ('b0000010-0000-4000-8000-000000000010', 'Beş Gün',   NULL),
    ('b0000011-0000-4000-8000-000000000011', 'On Gün',    NULL),
    ('b0000012-0000-4000-8000-000000000012', 'İki Hafta', NULL),
    ('b0000013-0000-4000-8000-000000000013', 'Altı Ay',   NULL);

-- 2. Update the existing 9 milestones' titles/descriptions (and the 8h→12h offset).
UPDATE milestone SET offset_minutes = 720, title = '12 saat',
    description = 'Kandaki karbonmonoksit normale iniyor; oksijen taşıma kapasiten düzeliyor.'
    WHERE id = 'a0000002-0000-4000-8000-000000000002';

UPDATE milestone SET
    description = 'Nabzın ve tansiyonun, nikotinin yol açtığı yükselmenin ardından düşmeye başlıyor.'
    WHERE id = 'a0000001-0000-4000-8000-000000000001';

UPDATE milestone SET
    description = 'Kandaki nikotin seviyesi neredeyse sıfıra indi.'
    WHERE id = 'a0000003-0000-4000-8000-000000000003';

UPDATE milestone SET
    description = 'Tat ve koku duyuların keskinleşmeye başlıyor.'
    WHERE id = 'a0000004-0000-4000-8000-000000000004';

UPDATE milestone SET
    description = 'Bronşların gevşiyor, nefes almak kolaylaşıyor.'
    WHERE id = 'a0000005-0000-4000-8000-000000000005';

UPDATE milestone SET
    description = 'Vücudun nikotinsiz düzene uyum sağlamaya başlıyor.'
    WHERE id = 'a0000006-0000-4000-8000-000000000006';

UPDATE milestone SET
    description = 'Akciğer fonksiyonun düzeliyor, öksürük azalıyor ve enerjin toparlanmaya başlıyor.'
    WHERE id = 'a0000007-0000-4000-8000-000000000007';

UPDATE milestone SET
    description = 'Dolaşımın ve akciğer fonksiyonun belirgin biçimde iyileşiyor.'
    WHERE id = 'a0000008-0000-4000-8000-000000000008';

UPDATE milestone SET
    description = 'Koroner kalp hastalığı fazla riskin, içmeye devam edenlerin yarısına iniyor.'
    WHERE id = 'a0000009-0000-4000-8000-000000000009';

-- 3. New milestones (fixed UUIDs a000001X series), each linked to a new badge.
INSERT INTO milestone (id, offset_minutes, title, description, badge_id) VALUES
    ('a0000010-0000-4000-8000-000000000010', 7200,   '5 gün',   'Yoksunluğun en yoğun günleri geride kaldı — en zor kısmı devirdin.',                'b0000010-0000-4000-8000-000000000010'),
    ('a0000011-0000-4000-8000-000000000011', 14400,  '10 gün',  'Tat ve koku almaya belirgin biçimde başlıyorsun; yemekler daha lezzetli.',          'b0000011-0000-4000-8000-000000000011'),
    ('a0000012-0000-4000-8000-000000000012', 20160,  '2 hafta', 'Dolaşımın düzeliyor; yürüyüş ve hareket etmek kolaylaşıyor.',                       'b0000012-0000-4000-8000-000000000012'),
    ('a0000013-0000-4000-8000-000000000013', 259200, '6 ay',    'Stres ve gerginliğin azalıyor; ruh halin daha dengeli hale geliyor.',               'b0000013-0000-4000-8000-000000000013');
