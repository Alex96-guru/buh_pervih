import { SESSION_COOKIE, userForToken } from './auth/sessions.mjs'

/** Кладёт пользователя в req.user, если есть живая сессия. Никого не блокирует. */
export async function attachUser(req, _res, next) {
  try {
    req.user = await userForToken(req.cookies?.[SESSION_COOKIE])
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  // 404 вместо 403: не подтверждаем существование админки посторонним.
  if (req.user.role !== 'admin') return res.status(404).json({ error: 'Не найдено' })
  next()
}
