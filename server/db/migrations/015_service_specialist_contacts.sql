ALTER TABLE services
  ADD COLUMN specialist_name text NOT NULL DEFAULT '',
  ADD COLUMN specialist_telegram_url text NOT NULL DEFAULT '',
  ADD COLUMN specialist_max_url text NOT NULL DEFAULT '',
  ADD CONSTRAINT services_specialist_contacts_check CHECK (
    (specialist_name = '' AND specialist_telegram_url = '' AND specialist_max_url = '') OR
    (kind = 'service' AND specialist_name <> '' AND
      (specialist_telegram_url <> '' OR specialist_max_url <> ''))
  );
