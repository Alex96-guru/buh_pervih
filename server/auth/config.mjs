/** Правила аутентификации. Собраны в одном месте, чтобы не разъезжались по коду. */

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Пока нет отправки писем, почта при регистрации не подтверждается. */
export const REQUIRE_VERIFIED_EMAIL = false

/** Ссылка из письма с подтверждением почты. */
export const EMAIL_VERIFY_TTL = 24 * HOUR

/** Ссылка для сброса пароля — короче, потому что опаснее. */
export const PASSWORD_RESET_TTL = 1 * HOUR

/** Сколько живёт сессия в cookie. Значение по умолчанию, не обсуждалось отдельно. */
export const SESSION_TTL = 30 * DAY

/** Продлевать сессию, если ею пользовались, но не чаще раза в час. */
export const SESSION_TOUCH_INTERVAL = 1 * HOUR
