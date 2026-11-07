import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { requireAdmin } from '../middleware.mjs'
import express from 'express'
import { fileTypeFromBuffer } from 'file-type'
import { isInstructionManager } from '../instructions/config.mjs'

const GROUPS = ['ip', 'person']

function requireInstructionManager(req, res, next) {
  if (!isInstructionManager(req.user)) return res.status(403).json({ error: 'Управление инструкциями недоступно' })
  next()
}

/** Наружу — в camelCase и без служебных полей базы. */
function publicService(row) {
  return {
    id: row.id,
    slug: row.slug,
    group: row.group_id,
    subgroup: row.subgroup,
    title: row.title,
    price: row.price,
    audience: row.audience,
    needs: row.needs,
    result: row.result,
    specialistName: row.specialist_name,
    telegramUrl: row.specialist_telegram_url,
    maxUrl: row.specialist_max_url,
    kind: row.kind,
    description: row.description,
    priceAmount: row.price_amount,
    published: row.is_published,
    hasFile: Boolean(row.instruction_file_id),
  }
}

function badRequest(res, field, message) {
  return res.status(400).json({ error: message, field })
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** «Декларация УСН «доходы»» → «deklaraciya-usn-dohody». */
function slugify(title) {
  const latin = [...title.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('')
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'usluga'
}

/** Если адрес занят — добавляем -2, -3… */
async function uniqueSlug(base) {
  const { rows } = await pool.query(
    `SELECT slug FROM services WHERE slug = $1 OR slug LIKE $1 || '-%'`,
    [base],
  )
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(base)) return base

  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function text(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function specialistUrl(value, field, hosts) {
  if (value == null || value === '' || (typeof value === 'string' && !value.trim())) return { value: '' }
  if (typeof value !== 'string' || value.length > 500 || /\s/.test(value.trim())) {
    return { field, message: 'Укажите корректную ссылку HTTPS' }
  }
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.username || url.password ||
        url.port || url.pathname === '/') {
      return { field, message: 'Укажите ссылку на профиль или чат в нужном мессенджере' }
    }
    return { value: url.href }
  } catch {
    return { field, message: 'Укажите корректную ссылку HTTPS' }
  }
}

function parseSpecialist(body) {
  if (body?.specialistName != null && typeof body.specialistName !== 'string') {
    return { field: 'specialistName', message: 'Укажите имя специалиста' }
  }
  const specialistName = (body?.specialistName ?? '').trim()
  if (specialistName.length > 120) return { field: 'specialistName', message: 'Имя должно быть короче 120 символов' }
  const telegram = specialistUrl(body?.telegramUrl, 'telegramUrl', ['t.me', 'telegram.me'])
  if ('field' in telegram) return telegram
  const max = specialistUrl(body?.maxUrl, 'maxUrl', ['max.ru', 'web.max.ru'])
  if ('field' in max) return max
  if ((telegram.value || max.value) && !specialistName) {
    return { field: 'specialistName', message: 'Укажите имя специалиста' }
  }
  if (specialistName && !telegram.value && !max.value) {
    return { field: 'telegramUrl', message: 'Добавьте ссылку на Telegram или MAX' }
  }
  return { data: { specialistName, telegramUrl: telegram.value, maxUrl: max.value } }
}

/**
 * Проверяет и нормализует тело запроса. Возвращает либо { data },
 * либо { field, message } для ответа 400.
 */
function parseService(body) {
  const kind = body?.kind ?? 'service'
  if (kind === 'instruction') {
    const title = text(body?.title, 300)
    const description = text(body?.description, 2000)
    const amount = body?.priceAmount
    if (title.length < 3) return { field: 'title', message: 'Укажите название' }
    if (!description) return { field: 'description', message: 'Укажите описание' }
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) return { field: 'priceAmount', message: 'Укажите цену от 1 до 1 000 000 ₽' }
    if (body?.published !== true && body?.published !== false) return { field: 'published', message: 'Укажите видимость в каталоге' }
    return { data: {
      kind, group: 'instructions', subgroup: '', title,
      price: `${amount.toLocaleString('ru-RU')} ₽`, priceAmount: amount,
      description, published: body.published, fileId: body.fileId ?? null,
      audience: '', needs: [], result: '', specialistName: '', telegramUrl: '', maxUrl: '',
    } }
  }
  if (kind !== 'service') return { field: 'kind', message: 'Неизвестный тип позиции' }
  const group = String(body?.group ?? '')
  if (!GROUPS.includes(group)) return { field: 'group', message: 'Выберите раздел' }

  const title = text(body?.title, 300)
  if (title.length < 3) return { field: 'title', message: 'Укажите название' }

  const price = text(body?.price, 60)
  if (!price) return { field: 'price', message: 'Укажите цену' }

  const specialist = parseSpecialist(body)
  if (!specialist.data) return specialist

  if (!Array.isArray(body?.needs ?? [])) return { field: 'needs', message: 'Неверный список' }

  const needs = (body?.needs ?? [])
    .map((need) => ({
      text: text(need?.text, 300),
      optional: need?.optional === true,
      hint: text(need?.hint, 300),
    }))
    .filter((need) => need.text)
    .slice(0, 40)
    // Пустые поля не храним — JSON остаётся таким же, как в исходных данных.
    .map(({ text: t, optional, hint }) => ({
      text: t,
      ...(optional ? { optional } : {}),
      ...(hint ? { hint } : {}),
    }))

  return {
    data: {
      group,
      subgroup: text(body?.subgroup, 100),
      title,
      price,
      audience: text(body?.audience, 2000),
      needs,
      result: text(body?.result, 4000),
      ...specialist.data,
      kind: 'service', description: '', priceAmount: null, published: true, fileId: null,
    },
  }
}

/**
 * Место в конце подраздела, а если он новый — в конце раздела.
 * Всё, что ниже, сдвигается на одну позицию.
 */
async function slotAtEnd(group, subgroup) {
  const { rows } = await pool.query(
    `SELECT coalesce(
              (SELECT max(position) FROM services WHERE group_id = $1 AND subgroup = $2),
              (SELECT max(position) FROM services WHERE group_id = $1),
              0
            ) AS last`,
    [group, subgroup],
  )
  const position = rows[0].last + 1

  await pool.query(
    'UPDATE services SET position = position + 1 WHERE group_id = $1 AND position >= $2',
    [group, position],
  )
  return position
}

/** Публичное чтение каталога — его показывает сайт. */
export const servicesRouter = Router()

servicesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE is_published = true ORDER BY group_id, position, created_at')
    return res.json({ services: rows.map(publicService) })
  } catch (err) {
    return next(err)
  }
})

servicesRouter.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE slug = $1 AND is_published = true', [req.params.slug])
    if (!rows[0]) return res.status(404).json({ error: 'Услуга не найдена' })
    return res.json({ service: publicService(rows[0]) })
  } catch (err) {
    return next(err)
  }
})

/** Правка каталога — только для администраторов. */
export const adminServicesRouter = Router()

adminServicesRouter.use(requireAdmin)

adminServicesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY group_id, position, created_at')
    return res.json({ services: rows.map(publicService) })
  } catch (err) { return next(err) }
})

adminServicesRouter.post('/instruction-files', requireInstructionManager,
  express.raw({ type: 'application/octet-stream', limit: '20mb' }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Выберите файл Word' })
      let name
      try { name = decodeURIComponent(String(req.get('x-file-name') ?? '')) }
      catch { return res.status(400).json({ error: 'Некорректное имя файла' }) }
      if (!name.toLowerCase().endsWith('.docx') || name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name)) {
        return res.status(400).json({ error: 'Нужен файл .docx с корректным именем' })
      }
      const detected = await fileTypeFromBuffer(req.body)
      if (detected?.mime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return res.status(415).json({ error: 'Содержимое файла не соответствует формату Word .docx' })
      }
      const { rows } = await pool.query(
        'INSERT INTO instruction_files (name, size_bytes, data, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, req.body.length, req.body, req.user.id],
      )
      return res.status(201).json({ fileId: rows[0].id })
    } catch (err) { return next(err) }
  },
)

async function validInstructionFile(fileId, userId) {
  if (typeof fileId !== 'string') return false
  try {
    const { rows } = await pool.query('SELECT id FROM instruction_files WHERE id = $1 AND uploaded_by = $2', [fileId, userId])
    return Boolean(rows[0])
  } catch (err) {
    if (err.code === '22P02') return false
    throw err
  }
}

adminServicesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = parseService(req.body)
    if (!parsed.data) return badRequest(res, parsed.field, parsed.message)
    const s = parsed.data
    if (s.kind === 'instruction') {
      if (!isInstructionManager(req.user)) return res.status(403).json({ error: 'Управление инструкциями недоступно' })
      if (!(await validInstructionFile(s.fileId, req.user.id))) return badRequest(res, 'fileId', 'Загрузите файл Word')
    }

    const slug = await uniqueSlug(slugify(s.title))
    const position = await slotAtEnd(s.group, s.subgroup)

    const { rows } = await pool.query(
      `INSERT INTO services (slug, group_id, subgroup, title, price, audience, needs, result, position,
                             kind, description, price_amount, is_published, instruction_file_id,
                             specialist_name, specialist_telegram_url, specialist_max_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [slug, s.group, s.subgroup, s.title, s.price, s.audience, JSON.stringify(s.needs), s.result, position,
        s.kind, s.description, s.priceAmount, s.published, s.fileId,
        s.specialistName, s.telegramUrl, s.maxUrl],
    )

    return res.status(201).json({ service: publicService(rows[0]) })
  } catch (err) {
    return next(err)
  }
})

adminServicesRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = parseService(req.body)
    if (!parsed.data) return badRequest(res, parsed.field, parsed.message)
    const s = parsed.data

    const { rows: current } = await pool.query(
      'SELECT group_id, subgroup, position, kind, instruction_file_id FROM services WHERE id = $1',
      [req.params.id],
    )
    if (!current[0]) return res.status(404).json({ error: 'Услуга не найдена' })
    if (current[0].kind !== s.kind) return res.status(409).json({ error: 'Тип позиции нельзя изменить после создания' })
    if (s.kind === 'instruction') {
      if (!isInstructionManager(req.user)) return res.status(403).json({ error: 'Управление инструкциями недоступно' })
      if (s.fileId && !(await validInstructionFile(s.fileId, req.user.id))) return badRequest(res, 'fileId', 'Файл не найден')
      if (!s.fileId && !current[0].instruction_file_id) return badRequest(res, 'fileId', 'Загрузите файл Word')
    }

    // Адрес (slug) при правке не меняется. Место — только если услуга переехала.
    const moved = current[0].group_id !== s.group || current[0].subgroup !== s.subgroup
    const position = moved ? await slotAtEnd(s.group, s.subgroup) : current[0].position

    const { rows } = await pool.query(
      `UPDATE services
          SET group_id = $2, subgroup = $3, title = $4, price = $5,
          audience = $6, needs = $7, result = $8, position = $9,
          description = $10, price_amount = $11, is_published = $12,
          instruction_file_id = coalesce($13, instruction_file_id),
          specialist_name = $14, specialist_telegram_url = $15, specialist_max_url = $16
        WHERE id = $1
        RETURNING *`,
      [
        req.params.id,
        s.group,
        s.subgroup,
        s.title,
        s.price,
        s.audience,
        JSON.stringify(s.needs),
        s.result,
        position,
        s.description,
        s.priceAmount,
        s.published,
        s.fileId,
        s.specialistName,
        s.telegramUrl,
        s.maxUrl,
      ],
    )

    return res.json({ service: publicService(rows[0]) })
  } catch (err) {
    // 22P02 — в адресе не uuid.
    if (err.code === '22P02') return res.status(404).json({ error: 'Услуга не найдена' })
    return next(err)
  }
})

adminServicesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT kind FROM services WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Услуга не найдена' })
    if (rows[0].kind === 'instruction' && !isInstructionManager(req.user)) return res.status(403).json({ error: 'Управление инструкциями недоступно' })
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Услуга не найдена' })
    return res.status(204).end()
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Услуга не найдена' })
    return next(err)
  }
})
