CREATE TABLE instruction_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  data bytea NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services DROP CONSTRAINT services_group_id_check;
ALTER TABLE services ADD CONSTRAINT services_group_id_check CHECK (group_id IN ('ip', 'person', 'instructions'));
ALTER TABLE services
  ADD COLUMN kind text NOT NULL DEFAULT 'service' CHECK (kind IN ('service', 'instruction')),
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN price_amount integer CHECK (price_amount > 0 AND price_amount <= 1000000),
  ADD COLUMN is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN instruction_file_id uuid REFERENCES instruction_files(id) ON DELETE SET NULL,
  ADD CONSTRAINT services_kind_group_check CHECK (
    (kind = 'service' AND group_id IN ('ip', 'person')) OR
    (kind = 'instruction' AND group_id = 'instructions' AND price_amount IS NOT NULL)
  );

CREATE TABLE instruction_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id uuid REFERENCES services(id) ON DELETE SET NULL,
  instruction_title text NOT NULL,
  file_id uuid NOT NULL REFERENCES instruction_files(id),
  buyer_email text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_method text CHECK (payment_method IN ('card', 'sbp')),
  payment_provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  access_token_hash text NOT NULL UNIQUE,
  access_expires_at timestamptz NOT NULL,
  download_token_hash text UNIQUE
);
CREATE INDEX instruction_purchases_email_idx ON instruction_purchases (buyer_email, created_at DESC);

CREATE TABLE instruction_download_tokens (
  token_hash text PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES instruction_purchases(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX instruction_download_tokens_expires_idx ON instruction_download_tokens (expires_at);
