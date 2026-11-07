import { Router } from 'express'
import { pool } from '../db/pool.mjs'
import { hashPassword, verifyPassword } from '../auth/passwords.mjs'
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroySession,
} from '../auth/sessions.mjs'
import { REQUIRE_VERIFIED_EMAIL } from '../auth/config.mjs'
import { isInstructionManager } from '../instructions/config.mjs'
import { consumeAuthLimit, resetAuthLimit } from '../auth/rate-limit.mjs'

export const authRouter = Router()

/** Наружу отдаём только безопасные поля: ни хеша, ни служебных отметок. */
function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    clientType: row.client_type,
    role: row.role,
    instructionManager: isInstructionManager(row),
    emailVerified: row.email_verified_at !== null,
  }
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Телефон хранится цифрами и всегда начинается с 7. */
function normalizePhone(value) {
  let d = digits(value)
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (d.length === 10) d = `7${d}`
  return d
}

function badRequest(res, field, message) {
  return res.status(400).json({ error: message, field })
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const retryAfter = await consumeAuthLimit('register-ip', req.ip, 5, 3600)
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Слишком много попыток. Повторите позже' })
    }
    const { fullName, email, phone, password, clientType, companyName, inn } = req.body ?? {}

    if (typeof fullName !== 'string' || typeof email !== 'string' ||
        typeof phone !== 'string' || typeof password !== 'string' ||
        typeof clientType !== 'string' ||
        (companyName != null && typeof companyName !== 'string') ||
        (inn != null && typeof inn !== 'string')) {
      return res.status(400).json({ error: 'Некорректные данные регистрации' })
    }
    const name = fullName.trim()
    if (name.length < 2 || name.length > 200) return badRequest(res, 'fullName', 'Укажите имя до 200 символов')

    const mail = email.trim().toLowerCase()
    if (mail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      return badRequest(res, 'email', 'Укажите адрес электронной почты')
    }

    const tel = normalizePhone(phone)
    if (!/^7\d{10}$/.test(tel)) return badRequest(res, 'phone', 'Номер неполный')

    if (password.length < 8 || password.length > 256) {
      return badRequest(res, 'password', 'Пароль должен содержать от 8 до 256 символов')
    }

    if (!['ip', 'ooo', 'person'].includes(clientType)) return badRequest(res, 'clientType', 'Выберите тип клиента')
    const type = clientType
    if (companyName && companyName.length > 300) return badRequest(res, 'companyName', 'Название слишком длинное')

    const innDigits = digits(inn)
    if (type === 'ooo' && innDigits.length !== 10) {
      return badRequest(res, 'inn', 'ИНН организации состоит из 10 цифр')
    }
    if (type === 'ip' && innDigits && innDigits.length !== 12) {
      return badRequest(res, 'inn', 'ИНН предпринимателя состоит из 12 цифр')
    }

    const passwordHash = await hashPassword(password)

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, client_type, company_name, inn,
                          role, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        mail,
        passwordHash,
        name,
        tel,
        type,
        companyName?.trim() || null,
        innDigits || null,
        'client',
        null,
      ],
    )

    // Строгий режим: сессию не выдаём, пока почта не подтверждена.
    if (REQUIRE_VERIFIED_EMAIL) {
      return res.status(201).json({ user: publicUser(rows[0]), needsEmailVerification: true })
    }

    const { token } = await createSession(rows[0].id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })
    res.cookie(SESSION_COOKIE, token, cookieOptions())
    return res.status(201).json({ user: publicUser(rows[0]) })
  } catch (err) {
    // 23505 — нарушение уникальности: почта или телефон уже заняты.
    if (err.code === '23505') {
      const field = err.constraint === 'users_phone_key' ? 'phone' : 'email'
      return res.status(409).json({
        error: field === 'phone' ? 'Этот телефон уже зарегистрирован' : 'Эта почта уже занята',
        field,
      })
    }
    return next(err)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {}
    if (typeof login !== 'string' || typeof password !== 'string' ||
        !login.trim() || !password || login.length > 254 || password.length > 256) {
      return badRequest(res, 'login', 'Введите телефон или почту и пароль')
    }
    const raw = login.trim()

    const byEmail = raw.includes('@')
    const account = byEmail ? raw.toLowerCase() : normalizePhone(raw)
    const ipRetry = await consumeAuthLimit('login-ip', req.ip, 30, 900)
    const accountRetry = await consumeAuthLimit('login-account', account, 10, 900)
    if (ipRetry || accountRetry) {
      res.set('Retry-After', String(Math.max(ipRetry, accountRetry)))
      return res.status(429).json({ error: 'Слишком много попыток входа. Повторите позже' })
    }
    const { rows } = byEmail
      ? await pool.query('SELECT * FROM users WHERE lower(email) = $1', [account])
      : await pool.query('SELECT * FROM users WHERE phone = $1', [account])

    let user = rows[0]

    // Пароль проверяем даже когда пользователь не найден: иначе по скорости
    // ответа можно узнать, зарегистрирован ли такой телефон.
    const ok = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, 'scrypt$16384$8$1$AAAA$AAAA')

    if (!user || !ok) {
      return res.status(401).json({ error: 'Неверный логин или пароль', field: 'password' })
    }

    if (REQUIRE_VERIFIED_EMAIL && user.email_verified_at === null) {
      return res.status(403).json({
        error: 'Подтвердите почту — мы отправили письмо со ссылкой',
        field: 'login',
        needsEmailVerification: true,
      })
    }

    await resetAuthLimit('login-account', account)

    const { token } = await createSession(user.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })
    res.cookie(SESSION_COOKIE, token, cookieOptions())
    return res.json({ user: publicUser(user) })
  } catch (err) {
    return next(err)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined })
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
})

authRouter.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' })
  return res.json({ user: publicUser(req.user) })
})
