ALTER TABLE orders ADD COLUMN items jsonb NOT NULL DEFAULT '[]'::jsonb;
