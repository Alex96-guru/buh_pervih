-- Одноразовые токены: подтверждение почты и сброс пароля.
-- Устроены одинаково, различаются полем purpose, поэтому одна таблица.

CREATE TABLE user_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),
  -- Как и у сессий, хранится хеш: из базы нельзя достать рабочую ссылку.
  token_hash text NOT NULL UNIQUE,
  -- Адрес, на который отправляли письмо. Если человек успел сменить почту,
  -- старая ссылка не должна подтверждать новый адрес.
  sent_to    text NOT NULL,
  expires_at timestamptz NOT NULL,
  -- Проставляется при использовании: токен одноразовый.
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_ip inet
);

CREATE INDEX user_tokens_user_purpose_idx ON user_tokens (user_id, purpose);

-- Живые токены ищутся на каждый переход по ссылке из письма.
CREATE INDEX user_tokens_active_idx ON user_tokens (expires_at) WHERE used_at IS NULL;
