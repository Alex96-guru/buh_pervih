import { createHash, randomBytes } from 'node:crypto'
import { pool } from '../db/pool.mjs'
import { SESSION_TOUCH_INTERVAL, SESSION_TTL } from './config.mjs'

export const SESSION_COOKIE = 'bp_session'

/** В базе лежит только хеш: по дампу нельзя восстановить рабочий токен. */
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId, { userAgent, ip } = {}) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL)

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), expiresAt, userAgent ?? null, ip ?? null],
  )

  return { token, expiresAt }
}

/** Возвращает пользователя по токену или null, если сессии нет либо истекла. */
export async function userForToken(token) {
  if (!token) return null

  const { rows } = await pool.query(
    `SELECT s.id AS session_id, s.last_seen_at,
            u.id, u.email, u.full_name, u.phone, u.client_type, u.role,
            u.email_verified_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  )

  const row = rows[0]
  if (!row) return null

  // Отметку активности обновляем редко, чтобы не писать в базу на каждый запрос.
  const stale =
    !row.last_seen_at || Date.now() - new Date(row.last_seen_at).getTime() > SESSION_TOUCH_INTERVAL

  if (stale) {
    await pool.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.session_id])
  }

  return row
}

export async function destroySession(token) {
  if (!token) return
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL,
    path: '/',
  }
}
