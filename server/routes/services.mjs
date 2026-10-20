import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { requireAdmin } from '../middleware.mjs'

const GROUPS = ['ip', 'person']

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

/**
 * Проверяет и нормализует тело запроса. Возвращает либо { data },
 * либо { field, message } для ответа 400.
 */
function parseService(body) {
  const group = String(body?.group ?? '')
  if (!GROUPS.includes(group)) return { field: 'group', message: 'Выберите раздел' }

  const title = text(body?.title, 300)
  if (title.length < 3) return { field: 'title', message: 'Укажите название' }

  const price = text(body?.price, 60)
  if (!price) return { field: 'price', message: 'Укажите цену' }

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
    const { rows } = await pool.query('SELECT * FROM services ORDER BY group_id, position, created_at')
    return res.json({ services: rows.map(publicService) })
  } catch (err) {
    return next(err)
  }
})

servicesRouter.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE slug = $1', [req.params.slug])
    if (!rows[0]) return res.status(404).json({ error: 'Услуга не найдена' })
    return res.json({ service: publicService(rows[0]) })
  } catch (err) {
    return next(err)
  }
})

/** Правка каталога — только для администраторов. */
export const adminServicesRouter = Router()

adminServicesRouter.use(requireAdmin)

adminServicesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = parseService(req.body)
    if (!parsed.data) return badRequest(res, parsed.field, parsed.message)
    const s = parsed.data

    const slug = await uniqueSlug(slugify(s.title))
    const position = await slotAtEnd(s.group, s.subgroup)

    const { rows } = await pool.query(
      `INSERT INTO services (slug, group_id, subgroup, title, price, audience, needs, result, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [slug, s.group, s.subgroup, s.title, s.price, s.audience, JSON.stringify(s.needs), s.result, position],
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
      'SELECT group_id, subgroup, position FROM services WHERE id = $1',
      [req.params.id],
    )
    if (!current[0]) return res.status(404).json({ error: 'Услуга не найдена' })

    // Адрес (slug) при правке не меняется. Место — только если услуга переехала.
    const moved = current[0].group_id !== s.group || current[0].subgroup !== s.subgroup
    const position = moved ? await slotAtEnd(s.group, s.subgroup) : current[0].position

    const { rows } = await pool.query(
      `UPDATE services
          SET group_id = $2, subgroup = $3, title = $4, price = $5,
              audience = $6, needs = $7, result = $8, position = $9
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
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Услуга не найдена' })
    return res.status(204).end()
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Услуга не найдена' })
    return next(err)
  }
})
