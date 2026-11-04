CREATE TABLE auth_rate_limits (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX auth_rate_limits_expires_idx ON auth_rate_limits (expires_at);
