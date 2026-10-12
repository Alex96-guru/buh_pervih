import 'dotenv/config'
import pg from 'pg'

const { DATABASE_URL } = process.env

if (!DATABASE_URL) {
  throw new Error(
    'Не задан DATABASE_URL. Скопируйте .env.example в .env и подставьте строку подключения.',
  )
}

/**
 * Railway отдаёт две строки подключения. Внутренняя (*.railway.internal) идёт
 * по приватной сети и TLS не требует, публичная (*.proxy.rlwy.net) — требует.
 * Локальный Postgres в Docker тоже без TLS.
 */
function sslFor(url) {
  const host = new URL(url).hostname

  if (host === 'localhost' || host === '127.0.0.1') return false
  if (host.endsWith('.railway.internal')) return false

  return { rejectUnauthorized: false }
}

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: sslFor(DATABASE_URL),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  console.error('Ошибка простаивающего соединения с Postgres:', err.message)
})
