import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { requireAdmin } from '../middleware.mjs'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

const STATUS_TRANSITIONS = {
  new: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['in_progress', 'cancelled'],
  awaiting_payment: ['completed', 'cancelled'],
  paid: ['closed'],
  closed: [],
  cancelled: [],
}

function orderChange(row) {
  return {
    id: row.id,
    status: row.status,
    finalAmount: row.final_amount,
    updatedAt: row.updated_at,
  }
}

function orderNotFound(res) {
  return res.status(404).json({ error: 'Заказ не найден' })
}

/** Все заказы с контактами покупателей для работы администратора. */
adminRouter.get('/orders', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100)
    const offset = Math.min(Math.max(Number.parseInt(req.query.offset, 10) || 0, 0), 1_000_000)
    const { rows } = await pool.query(
      `SELECT o.id, o.number, o.parent_order_id, p.number AS parent_order_number,
              o.service_slug, o.service_title, o.items, o.amount, o.final_amount, o.price, o.comment,
              o.status, o.paid_at, o.created_at, o.updated_at, u.full_name, u.email, u.phone,
              u.client_type, u.company_name, u.inn
         FROM orders o JOIN users u ON u.id = o.user_id
         LEFT JOIN orders p ON p.id = o.parent_order_id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
    const { rows: totals } = await pool.query(
      `SELECT count(*)::int AS total FROM orders`,
    )
    return res.json({
      total: totals[0].total,
      orders: rows.map((o) => ({
        id: o.id,
        number: o.number,
        parentOrderId: o.parent_order_id,
        parentOrderNumber: o.parent_order_number,
        serviceTitle: o.service_title,
        items: o.items?.length ? o.items : [{ serviceSlug: o.service_slug, serviceTitle: o.service_title, price: o.price, amount: o.amount }],
        amount: o.amount,
        finalAmount: o.final_amount,
        price: o.price,
        comment: o.comment,
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        customer: {
          fullName: o.full_name,
          email: o.email,
          phone: o.phone,
          clientType: o.client_type,
          companyName: o.company_name,
          inn: o.inn,
        },
      })),
    })
  } catch (err) {
    return next(err)
  }
})

/** Only permitted business transitions are exposed; payment is never an admin status change. */
adminRouter.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const target = req.body?.status
    if (typeof target !== 'string' || !Object.hasOwn(STATUS_TRANSITIONS, target)) {
      return res.status(400).json({ error: 'Неизвестный статус' })
    }
    const { rows: current } = await pool.query('SELECT status FROM orders WHERE id = $1', [req.params.id])
    if (!current[0]) return orderNotFound(res)
    if (!STATUS_TRANSITIONS[current[0].status]?.includes(target)) {
      return res.status(409).json({ error: 'Этот переход статуса недоступен' })
    }
    const { rows } = await pool.query(
      `UPDATE orders SET status = $3
        WHERE id = $1 AND status = $2
        RETURNING id, status, final_amount, updated_at`,
      [req.params.id, current[0].status, target],
    )
    if (!rows[0]) return res.status(409).json({ error: 'Статус заказа уже изменился. Обновите список' })
    return res.json({ order: orderChange(rows[0]) })
  } catch (err) {
    if (err.code === '22P02') return orderNotFound(res)
    return next(err)
  }
})

adminRouter.patch('/orders/:id/amount', async (req, res, next) => {
  try {
    const amount = req.body?.finalAmount
    if (amount !== null && (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000)) {
      return res.status(400).json({ error: 'Укажите сумму от 1 до 100 000 000 ₽', field: 'finalAmount' })
    }
    const { rows } = await pool.query(
      `UPDATE orders SET final_amount = $2
        WHERE id = $1 AND status IN ('new', 'in_progress', 'completed')
        RETURNING id, status, final_amount, updated_at`,
      [req.params.id, amount],
    )
    if (!rows[0]) return res.status(409).json({ error: 'Стоимость можно менять только до выставления оплаты' })
    return res.json({ order: orderChange(rows[0]) })
  } catch (err) {
    if (err.code === '22P02') return orderNotFound(res)
    return next(err)
  }
})

adminRouter.post('/orders/:id/invoice', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE orders SET status = 'awaiting_payment'
        WHERE id = $1 AND status = 'completed' AND final_amount > 0
        RETURNING id, status, final_amount, updated_at`,
      [req.params.id],
    )
    if (!rows[0]) return res.status(409).json({ error: 'Сначала завершите работу и укажите итоговую стоимость' })
    return res.json({ order: orderChange(rows[0]) })
  } catch (err) {
    if (err.code === '22P02') return orderNotFound(res)
    return next(err)
  }
})

/**
 * Список пользователей для панели. Постранично, чтобы таблица не легла,
 * когда клиентов станет много. Хеши паролей наружу не выходят.
 */
adminRouter.get('/users', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200)
    const offset = Math.min(Math.max(Number.parseInt(req.query.offset, 10) || 0, 0), 1_000_000)
    const search = String(req.query.search ?? '').trim().slice(0, 200)

    const where = search ? `WHERE u.full_name ILIKE $3 OR u.email ILIKE $3 OR u.phone LIKE $3` : ''
    const params = search ? [limit, offset, `%${search}%`] : [limit, offset]

    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.client_type, u.role,
              u.company_name, u.inn, u.email_verified_at, u.created_at
         FROM users u
         ${where}
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2`,
      params,
    )

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM users u ${search ? 'WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone LIKE $1' : ''}`,
      search ? [`%${search}%`] : [],
    )

    return res.json({
      total: countRows[0].total,
      users: rows.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        clientType: u.client_type,
        role: u.role,
        companyName: u.company_name,
        inn: u.inn,
        emailVerified: u.email_verified_at !== null,
        createdAt: u.created_at,
      })),
    })
  } catch (err) {
    return next(err)
  }
})
