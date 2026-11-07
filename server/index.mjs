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
import { ordersRouter } from './routes/orders.mjs'
import { instructionPurchasesRouter } from './routes/instruction-purchases.mjs'
import { protectApi, securityHeaders } from './security.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = express()
app.disable('x-powered-by')

// За прокси Railway — иначе req.ip покажет адрес прокси, а не клиента.
app.set('trust proxy', 1)

app.use(securityHeaders)
app.use('/api', protectApi)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(attachUser)

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false })
  }
})
app.use('/api/auth', authRouter)
app.use('/api/services', servicesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/instruction-purchases', instructionPurchasesRouter)
app.use('/api/admin/services', adminServicesRouter)
app.use('/api/admin', adminRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Не найдено' }))

// Собранный фронтенд и разворот всех остальных адресов в index.html,
// чтобы работали прямые ссылки на /login, /cabinet и /admin.
const dist = path.join(root, 'dist')
app.use(express.static(dist))
app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') {
    const limit = _req.path === '/api/admin/services/instruction-files' ? 20 : 50
    return res.status(413).json({ error: `Файл слишком большой. Максимум ${limit} МБ` })
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Некорректный JSON' })
  }
  // Наружу — без подробностей: по тексту ошибки базы можно изучать схему.
  // Never log request bodies, cookies, SQL parameters or complete error objects.
  console.error('Необработанная ошибка API:', err.code ?? err.name ?? 'unknown')
  res.status(500).json({ error: 'Что-то пошло не так' })
})

// Миграции при старте — страховка на случай, если шаг перед деплоем не сработал.
// Если база недоступна, сайт всё равно поднимается: страницы открываются,
// а причину видно в логах и в /api/health.
try {
  await runMigrations()
} catch (err) {
  console.error('Миграции при старте не прошли:', err.code ?? err.cause?.code ?? 'unknown')
}

const port = Number(process.env.PORT) || 3000
app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер слушает порт ${port}`)
})
