import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
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

app.get('/api/health', (_req, res) => res.json({ ok: true }))
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

const port = Number(process.env.PORT) || 3000
app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер слушает порт ${port}`)
})
