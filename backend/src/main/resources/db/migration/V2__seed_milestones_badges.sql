-- Static seed: 9 badges + 9 milestones. Fixed UUIDs so ids are deterministic across environments.
-- Content (title/description) is Turkish per the API contract.

INSERT INTO badge (id, name, icon_url) VALUES
    ('b0000001-0000-4000-8000-000000000001', 'İlk Adım',     NULL),
    ('b0000002-0000-4000-8000-000000000002', 'İlk Saatler',  NULL),
    ('b0000003-0000-4000-8000-000000000003', 'Bir Gün',      NULL),
    ('b0000004-0000-4000-8000-000000000004', 'İki Gün',      NULL),
    ('b0000005-0000-4000-8000-000000000005', 'Üç Gün',       NULL),
    ('b0000006-0000-4000-8000-000000000006', 'Bir Hafta',    NULL),
    ('b0000007-0000-4000-8000-000000000007', 'Bir Ay',       NULL),
    ('b0000008-0000-4000-8000-000000000008', 'Üç Ay',        NULL),
    ('b0000009-0000-4000-8000-000000000009', 'Bir Yıl',      NULL);

INSERT INTO milestone (id, offset_minutes, title, description, badge_id) VALUES
    ('a0000001-0000-4000-8000-000000000001', 20,     '20 dakika', 'Nabız ve tansiyon normale dönmeye başlar.',                              'b0000001-0000-4000-8000-000000000001'),
    ('a0000002-0000-4000-8000-000000000002', 480,    '8 saat',    'Kandaki karbonmonoksit seviyesi yarıya iner, oksijen normale döner.',     'b0000002-0000-4000-8000-000000000002'),
    ('a0000003-0000-4000-8000-000000000003', 1440,   '24 saat',   'Kalp krizi riski azalmaya başlar.',                                       'b0000003-0000-4000-8000-000000000003'),
    ('a0000004-0000-4000-8000-000000000004', 2880,   '48 saat',   'Tat ve koku duyuları güçlenmeye başlar, sinir uçları iyileşir.',          'b0000004-0000-4000-8000-000000000004'),
    ('a0000005-0000-4000-8000-000000000005', 4320,   '72 saat',   'Bronşlar gevşer, nefes almak kolaylaşır, enerji seviyesi artar.',         'b0000005-0000-4000-8000-000000000005'),
    ('a0000006-0000-4000-8000-000000000006', 10080,  '1 hafta',   'Dolaşım iyileşir, akciğer fonksiyonları toparlanmaya başlar.',            'b0000006-0000-4000-8000-000000000006'),
    ('a0000007-0000-4000-8000-000000000007', 43200,  '1 ay',      'Akciğer kapasitesi belirgin artar, öksürük ve nefes darlığı azalır.',     'b0000007-0000-4000-8000-000000000007'),
    ('a0000008-0000-4000-8000-000000000008', 129600, '3 ay',      'Dolaşım ve akciğer fonksiyonu önemli ölçüde iyileşir.',                   'b0000008-0000-4000-8000-000000000008'),
    ('a0000009-0000-4000-8000-000000000009', 525600, '1 yıl',     'Koroner kalp hastalığı riski içen birinin yarısına iner.',                'b0000009-0000-4000-8000-000000000009');
