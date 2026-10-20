-- Роли и телефон как второй способ входа.

-- Сотрудники видят админ-панель, клиенты — только свой кабинет.
ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin'));

CREATE INDEX users_role_idx ON users (role);

-- Вход возможен по телефону, значит он обязателен и уникален.
-- Храним только цифры (79026335387), чтобы +7 900, 8 900 и 8(900) не плодили дубли.
ALTER TABLE users
  ALTER COLUMN phone SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_phone_digits CHECK (phone ~ '^7[0-9]{10}$');

CREATE UNIQUE INDEX users_phone_key ON users (phone);
