/**
 * Выдаёт права администратора по почте. Публичной регистрации админов нет
 * и быть не должно — только эта команда.
 *
 * Заодно отмечает почту подтверждённой: писем сайт пока не отправляет,
 * а без подтверждения строгий режим не пустит войти. Раз права выдаются
 * вручную, владелец почты и так известен.
 *
 * Запуск: npm run db:make-admin -- someone@mail.ru
 * Для базы на Railway — с её публичной строкой подключения в DATABASE_URL.
 */
import { pool } from './pool.mjs'

const email = process.argv[2]

if (!email) {
  console.error('Укажите почту: npm run db:make-admin -- someone@mail.ru')
  process.exit(1)
}

try {
  const { rows } = await pool.query(
    `UPDATE users
        SET role = 'admin',
            email_verified_at = coalesce(email_verified_at, now())
      WHERE lower(email) = lower($1)
      RETURNING email, full_name`,
    [email],
  )

  if (rows.length === 0) {
    console.error(`Пользователь с почтой ${email} не найден — сначала зарегистрируйтесь на сайте`)
    process.exit(1)
  }

  console.log(`Теперь администратор: ${rows[0].full_name} (${rows[0].email})`)
} finally {
  await pool.end()
}
