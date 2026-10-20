import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { requireAdmin } from '../middleware.mjs'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

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
