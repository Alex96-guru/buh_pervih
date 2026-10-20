-- Пользователи личного кабинета и их сессии.

-- Автообновление updated_at, чтобы не проставлять его руками в каждом запросе.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  -- Только хеш (scrypt). Сам пароль не хранится и не логируется нигде.
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  phone         text,
  -- Кем клиент работает: ИП, ООО или физлицо — как в разделе «Кому мы помогаем».
  client_type   text NOT NULL DEFAULT 'ip' CHECK (client_type IN ('ip', 'ooo', 'person')),
  company_name  text,
  inn           text,
  -- NULL, пока почта не подтверждена.
  email_verified_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Почта уникальна без учёта регистра: Ivanov@mail.ru и ivanov@mail.ru — один человек.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Хеш токена, а не сам токен: утечка таблицы не даст войти под чужой сессией.
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  user_agent   text,
  ip           inet
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
-- Для регулярной чистки протухших сессий.
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
