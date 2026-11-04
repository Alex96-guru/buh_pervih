-- Catalogue amount remains an estimate; only final_amount may be invoiced.
ALTER TABLE orders
  ADD COLUMN final_amount integer CHECK (final_amount > 0);

-- Preserve the amount already recorded for paid orders. Old unpaid orders
-- have never been approved by an administrator, so they start as new requests.
UPDATE orders SET final_amount = amount WHERE status = 'paid' AND amount IS NOT NULL;

ALTER TABLE orders DROP CONSTRAINT orders_status_check;

UPDATE orders
   SET status = 'new'
 WHERE status IN ('awaiting_price', 'awaiting_payment');

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN ('new', 'in_progress', 'completed', 'awaiting_payment',
               'paid', 'closed', 'cancelled')
  );
