-- Номер MAX и email для заявок. Прямую ссылку MAX можно добавить позднее в админ-панели.
ALTER TABLE services DROP CONSTRAINT services_specialist_contacts_check;
ALTER TABLE services
  ADD COLUMN specialist_phone text NOT NULL DEFAULT '',
  ADD COLUMN specialist_email text NOT NULL DEFAULT '',
  ADD CONSTRAINT services_specialist_contacts_check CHECK (
    (specialist_name = '' AND specialist_telegram_url = '' AND specialist_max_url = ''
      AND specialist_phone = '' AND specialist_email = '') OR
    (kind = 'service' AND (specialist_telegram_url <> '' OR specialist_max_url <> ''
      OR specialist_phone <> '' OR specialist_email <> ''))
  );

UPDATE services
SET price = '1 000 ₽', specialist_name = '', specialist_telegram_url = '',
    specialist_max_url = '', specialist_phone = '+79027965915',
    specialist_email = 'buhpervih@yandex.ru'
WHERE slug = 'lk-nalogoplatelshchika' AND kind = 'service';

-- Если услуга была создана администратором, используем существующую карточку и адрес.
UPDATE services
SET price = 'от 400 ₽', specialist_telegram_url = '', specialist_max_url = '',
    specialist_phone = '+79082586042', specialist_email = 'buhpervih@yandex.ru',
    audience = CASE WHEN audience = '' THEN
      'Документы для постановки организации на воинский учёт и ежегодного ведения воинского учёта. Стоимость зависит от выбранной работы.'
      ELSE audience END,
    result = CASE WHEN result = '' THEN
      'Карточка организации по форме № 18 при постановке на учёт — 2 000 ₽.
Ежегодная карточка по форме № 18 — 1 000 ₽.
Приказ об организации воинского учёта — 2 000 ₽.
Сверка сведений с военкоматом — 2 000 ₽.
Личная карточка сотрудника по форме № 10 — 400 ₽ за штуку.
Журнал проверок — 1 000 ₽.
Сведения о приёме или увольнении сотрудника — 1 000 ₽.
Сведения об изменениях данных сотрудника — 1 000 ₽.'
      ELSE result END
WHERE kind = 'service' AND (
  slug = 'voinskii-uchet' OR lower(title) IN (
    'воинский учёт', 'воинский учет',
    'услуги по ведению воинского учёта', 'услуги по ведению воинского учета'
  )
);

INSERT INTO services (
  slug, group_id, subgroup, title, price, audience, needs, result, position,
  specialist_phone, specialist_email
)
SELECT
  'voinskii-uchet', 'ip', 'Воинский учёт', 'Услуги по ведению воинского учёта',
  'от 400 ₽',
  'Документы для постановки организации на воинский учёт и ежегодного ведения воинского учёта. Стоимость зависит от выбранной работы.',
  '[]'::jsonb,
  'Карточка организации по форме № 18 при постановке на учёт — 2 000 ₽.
Ежегодная карточка по форме № 18 — 1 000 ₽.
Приказ об организации воинского учёта — 2 000 ₽.
Сверка сведений с военкоматом — 2 000 ₽.
Личная карточка сотрудника по форме № 10 — 400 ₽ за штуку.
Журнал проверок — 1 000 ₽.
Сведения о приёме или увольнении сотрудника — 1 000 ₽.
Сведения об изменениях данных сотрудника — 1 000 ₽.',
  coalesce((SELECT max(position) FROM services WHERE group_id = 'ip'), 0) + 10,
  '+79082586042', 'buhpervih@yandex.ru'
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE kind = 'service' AND (
    slug = 'voinskii-uchet' OR lower(title) IN (
      'воинский учёт', 'воинский учет',
      'услуги по ведению воинского учёта', 'услуги по ведению воинского учета'
    )
  )
);
