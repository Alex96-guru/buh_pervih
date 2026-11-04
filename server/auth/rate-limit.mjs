import { createHash } from 'node:crypto'
import { pool } from '../db/pool.mjs'

let requestsSinceCleanup = 0

// PostgreSQL keeps the limit consistent across Railway instances and restarts.
function keyHash(scope, value) {
  return createHash('sha256').update(`${scope}:${value}`).digest('hex')
}

export async function consumeAuthLimit(scope, value, maxAttempts, windowSeconds) {
  if (++requestsSinceCleanup >= 100) {
    requestsSinceCleanup = 0
    await pool.query("DELETE FROM auth_rate_limits WHERE expires_at < now() - interval '1 day'")
  }
  const { rows } = await pool.query(
    `INSERT INTO auth_rate_limits (key_hash, attempts, expires_at)
     VALUES ($1, 1, now() + $2::int * interval '1 second')
     ON CONFLICT (key_hash) DO UPDATE
       SET attempts = CASE WHEN auth_rate_limits.expires_at <= now() THEN 1
                           ELSE auth_rate_limits.attempts + 1 END,
           expires_at = CASE WHEN auth_rate_limits.expires_at <= now()
                             THEN now() + $2::int * interval '1 second'
                             ELSE auth_rate_limits.expires_at END
     RETURNING attempts, greatest(1, ceil(extract(epoch FROM (expires_at - now()))))::int AS retry_after`,
    [keyHash(scope, value), windowSeconds],
  )
  return rows[0].attempts <= maxAttempts ? 0 : rows[0].retry_after
}

export async function resetAuthLimit(scope, value) {
  await pool.query('DELETE FROM auth_rate_limits WHERE key_hash = $1', [keyHash(scope, value)])
}
