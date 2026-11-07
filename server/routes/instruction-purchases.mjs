import { createHash, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { consumeAuthLimit } from '../auth/rate-limit.mjs'
import { confirmInstructionPayment } from '../instructions/payment.mjs'

export const instructionPurchasesRouter = Router()

const DAY = 24 * 60 * 60 * 1000
const localHost = (host) => ['localhost', '127.0.0.1', '::1'].includes(host)
const localAddress = (address) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
const digest = (token) => createHash('sha256').update(token).digest('hex')
const randomToken = () => randomBytes(32).toString('base64url')

function testPaymentsEnabled(req) {
  let configuredHost
  try { configuredHost = new URL(process.env.APP_ORIGIN).hostname }
  catch { return false }
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_TEST_PAYMENTS === 'true' &&
    localHost(configuredHost) && localHost(req.hostname) && localAddress(req.socket.remoteAddress)
}

function publicPurchase(row) {
  return {
    id: row.id, title: row.instruction_title, amount: row.amount,
    status: row.status, paidAt: row.paid_at, accessExpiresAt: row.access_expires_at,
  }
}

async function findPurchase(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token ?? '')) return null
  const { rows } = await pool.query(
    `SELECT id, instruction_title, amount, status, paid_at, access_expires_at
       FROM instruction_purchases
      WHERE access_token_hash = $1 AND access_expires_at > now()`,
    [digest(token)],
  )
  return rows[0] ?? null
}

async function issueDownloadLink(purchase) {
  const token = randomToken()
  const expiresAt = new Date(Math.min(Date.now() + DAY, new Date(purchase.access_expires_at).getTime()))
  const hash = digest(token)
  await pool.query(
    `INSERT INTO instruction_download_tokens (token_hash, purchase_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hash, purchase.id, expiresAt],
  )
  await pool.query('UPDATE instruction_purchases SET download_token_hash = $2 WHERE id = $1', [purchase.id, hash])
  return { url: `/api/instruction-purchases/download/${token}`, expiresAt }
}

instructionPurchasesRouter.get('/config', (req, res) => {
  return res.json({ testPaymentsEnabled: testPaymentsEnabled(req) })
})

instructionPurchasesRouter.post('/', async (req, res, next) => {
  try {
    if (!testPaymentsEnabled(req)) return res.status(503).json({ error: 'Оплата временно недоступна' })
    const retryAfter = await consumeAuthLimit('instruction-purchase-ip', req.ip, 10, 3600)
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Слишком много попыток. Повторите позже' })
    }
    const slug = req.body?.slug
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (typeof slug !== 'string' || slug.length > 160 || typeof req.body?.email !== 'string' ||
        !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'Укажите корректный email и инструкцию' })
    }
    const { rows: services } = await pool.query(
      `SELECT id, title, price_amount, instruction_file_id FROM services
        WHERE slug = $1 AND kind = 'instruction' AND is_published = true
          AND instruction_file_id IS NOT NULL`,
      [slug],
    )
    if (!services[0]) return res.status(404).json({ error: 'Инструкция не найдена' })
    const accessToken = randomToken()
    const { rows } = await pool.query(
      `INSERT INTO instruction_purchases
         (instruction_id, instruction_title, file_id, buyer_email, amount, access_token_hash, access_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, instruction_title, amount, status, paid_at, access_expires_at`,
      [services[0].id, services[0].title, services[0].instruction_file_id, email,
        services[0].price_amount, digest(accessToken), new Date(Date.now() + 7 * DAY)],
    )
    return res.status(201).json({ purchase: publicPurchase(rows[0]), accessToken })
  } catch (err) { return next(err) }
})

instructionPurchasesRouter.get('/:token', async (req, res, next) => {
  try {
    const purchase = await findPurchase(req.params.token)
    if (!purchase) return res.status(404).json({ error: 'Покупка не найдена или ссылка истекла' })
    return res.json({ purchase: publicPurchase(purchase), testPaymentsEnabled: testPaymentsEnabled(req) })
  } catch (err) { return next(err) }
})

instructionPurchasesRouter.post('/:token/test-pay', async (req, res, next) => {
  try {
    if (!testPaymentsEnabled(req)) return res.status(403).json({ error: 'Тестовая оплата недоступна' })
    const method = req.body?.method
    if (!['card', 'sbp'].includes(method)) return res.status(400).json({ error: 'Выберите способ оплаты' })
    const purchase = await findPurchase(req.params.token)
    if (!purchase) return res.status(404).json({ error: 'Покупка не найдена или ссылка истекла' })
    const confirmed = await confirmInstructionPayment(purchase.id, 'test', method)
    if (!confirmed) return res.status(409).json({ error: 'Покупка уже оплачена' })
    const download = await issueDownloadLink(confirmed)
    return res.json({ purchase: publicPurchase(confirmed), download })
  } catch (err) { return next(err) }
})

instructionPurchasesRouter.post('/:token/download-link', async (req, res, next) => {
  try {
    const purchase = await findPurchase(req.params.token)
    if (!purchase) return res.status(404).json({ error: 'Покупка не найдена или ссылка истекла' })
    if (purchase.status !== 'paid') return res.status(403).json({ error: 'Инструкция ещё не оплачена' })
    return res.json({ download: await issueDownloadLink(purchase) })
  } catch (err) { return next(err) }
})

instructionPurchasesRouter.get('/download/:token', async (req, res, next) => {
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) return res.status(404).end()
    const { rows } = await pool.query(
      `SELECT f.name, f.size_bytes, f.data FROM instruction_download_tokens t
         JOIN instruction_purchases p ON p.id = t.purchase_id
         JOIN instruction_files f ON f.id = p.file_id
        WHERE t.token_hash = $1 AND t.expires_at > now() AND p.status = 'paid'`,
      [digest(req.params.token)],
    )
    if (!rows[0]) return res.status(404).end()
    const encodedName = encodeURIComponent(rows[0].name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="instruction.docx"; filename*=UTF-8''${encodedName}`,
      'Content-Length': String(rows[0].size_bytes),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    return res.end(rows[0].data)
  } catch (err) { return next(err) }
})
