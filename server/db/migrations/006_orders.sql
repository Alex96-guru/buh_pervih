-- Заказы услуг и их оплата. Пока оплата — тестовая заглушка, без эквайринга.

CREATE TABLE orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Номер для людей: «Заказ № 1001» проще назвать по телефону, чем uuid.
  number         integer GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Услугу могут удалить из каталога — заказ при этом остаётся.
  service_id     uuid REFERENCES services(id) ON DELETE SET NULL,
  -- Снимок услуги на момент заказа: правка каталога не должна менять старые заказы.
  service_slug   text NOT NULL,
  service_title  text NOT NULL,
  price          text NOT NULL,
  -- Сумма к оплате в рублях. NULL — цена «по запросу», сумму назовёт специалист.
  amount         integer CHECK (amount > 0),
  comment        text NOT NULL DEFAULT '',
  status         text NOT NULL CHECK (status IN ('awaiting_price', 'awaiting_payment', 'paid', 'cancelled')),
  -- Чем оплатили: карта или СБП. Провайдер 'test' — заглушка, деньги не списывались.
  payment_method   text CHECK (payment_method IN ('card', 'sbp')),
  payment_provider text,
  paid_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON orders (user_id, created_at DESC);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
