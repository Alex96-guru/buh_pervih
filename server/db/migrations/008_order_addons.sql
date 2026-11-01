ALTER TABLE orders
  ADD COLUMN parent_order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX orders_parent_order_id_idx ON orders (parent_order_id, created_at DESC)
  WHERE parent_order_id IS NOT NULL;
