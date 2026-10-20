import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import { pool } from './db/pool.mjs'
import { runMigrations } from './db/migrate.mjs'
import { attachUser } from './middleware.mjs'
import { authRouter } from './routes/auth.mjs'
import { adminRouter } from './routes/admin.mjs'
import { adminServicesRouter, servicesRouter } from './routes/services.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = express()

// За прокси Railway — иначе req.ip покажет адрес прокси, а не клиента.
app.set('trust proxy', 1)

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(attachUser)

/** Какой базе подключаемся — без адреса и пароля, только вид. */
function dbHostKind() {
  try {
    const host = new URL(process.env.DATABASE_URL).hostname
    if (host === 'localhost' || host === '127.0.0.1') return 'localhost'
    if (host.endsWith('.railway.internal')) return 'railway-internal'
    if (host.endsWith('.rlwy.net')) return 'railway-public'
    return 'other'
  } catch {
    return 'invalid'
  }
}

/**
 * Жив ли сервер и база. Наружу — только код ошибки (ECONNREFUSED, 42P01…),
 * без текста: по нему видно, что чинить, но не видно устройство базы.
 */
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations')
    res.json({ ok: true, db: 'ok', migrations: rows[0].n, dbHost: dbHostKind() })
  } catch (err) {
    res.json({ ok: true, db: 'error', code: err.code ?? 'unknown', dbHost: dbHostKind() })
  }
})
app.use('/api/auth', authRouter)
app.use('/api/services', servicesRouter)
app.use('/api/admin/services', adminServicesRouter)
app.use('/api/admin', adminRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Не найдено' }))

// Собранный фронтенд и разворот всех остальных адресов в index.html,
// чтобы работали прямые ссылки на /login, /cabinet и /admin.
const dist = path.join(root, 'dist')
app.use(express.static(dist))
app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.use((err, _req, res, _next) => {
  // Наружу — без подробностей: по тексту ошибки базы можно изучать схему.
  console.error('Необработанная ошибка:', err)
  res.status(500).json({ error: 'Что-то пошло не так' })
})

// Миграции при старте — страховка на случай, если шаг перед деплоем не сработал.
// Если база недоступна, сайт всё равно поднимается: страницы открываются,
// а причину видно в логах и в /api/health.
try {
  await runMigrations()
} catch (err) {
  console.error('Миграции при старте не прошли:', err.code ?? '', err.message)
}

const port = Number(process.env.PORT) || 3000
app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер слушает порт ${port}`)
})
