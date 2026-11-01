import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { requireAdmin } from '../middleware.mjs'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

/** Активные заказы с контактами покупателей для работы администратора. */
adminRouter.get('/orders', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const { rows } = await pool.query(
      `SELECT o.id, o.number, o.parent_order_id, p.number AS parent_order_number,
              o.service_slug, o.service_title, o.items, o.amount, o.price, o.comment,
              o.status, o.paid_at, o.created_at, u.full_name, u.email, u.phone,
              u.client_type, u.company_name, u.inn
         FROM orders o JOIN users u ON u.id = o.user_id
         LEFT JOIN orders p ON p.id = o.parent_order_id
        WHERE o.status <> 'cancelled'
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
    const { rows: totals } = await pool.query(
      `SELECT count(*)::int AS total FROM orders WHERE status <> 'cancelled'`,
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
        price: o.price,
        comment: o.comment,
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at,
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

/**
 * Список пользователей для панели. Постранично, чтобы таблица не легла,
 * когда клиентов станет много. Хеши паролей наружу не выходят.
 */
adminRouter.get('/users', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const search = String(req.query.search ?? '').trim()

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
