-- Услуги каталога. Раньше жили в коде (src/lib/catalog.ts), теперь их правят в админ-панели.

CREATE TABLE services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Адрес страницы: /services/<slug>. Не меняется при правке названия, чтобы не ломать ссылки.
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  -- Раздел каталога: вкладка «ИП и ООО» или «Физлица».
  group_id    text NOT NULL CHECK (group_id IN ('ip', 'person')),
  -- Подраздел внутри раздела («Начать», «Вести»…). Пустая строка — без подзаголовка.
  subgroup    text NOT NULL DEFAULT '',
  title       text NOT NULL,
  -- Текстом, а не числом: бывает «от 3 000 ₽» и «по запросу».
  price       text NOT NULL,
  -- «Кому и когда». У услуг без чек-листа он же идёт описанием на карточке каталога.
  audience    text NOT NULL DEFAULT '',
  -- «Что понадобится»: [{ "text": "...", "optional": true, "hint": "..." }]
  needs       jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(needs) = 'array'),
  -- «Что получите».
  result      text NOT NULL DEFAULT '',
  -- Порядок в каталоге. Подразделы идут в порядке своей первой услуги.
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX services_order_idx ON services (group_id, position);

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
