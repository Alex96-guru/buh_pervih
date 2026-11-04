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

  // Public database connections must authenticate the server certificate.
  return {
    rejectUnauthorized: true,
    ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } : {}),
  }
}

// pg gives SSL parameters in a URL precedence over the explicit `ssl` option.
// Remove them so an accidental `sslmode=no-verify` cannot disable certificate checks.
const safeDatabaseUrl = new URL(DATABASE_URL)
for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
  safeDatabaseUrl.searchParams.delete(key)
}

export const pool = new pg.Pool({
  connectionString: safeDatabaseUrl.toString(),
  ssl: sslFor(DATABASE_URL),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  console.error('Ошибка простаивающего соединения с Postgres:', err.code ?? 'unknown')
})
