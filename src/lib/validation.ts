/** Форматирование телефона и проверки полей. Все сообщения — для показа пользователю. */

/**
 * Приводит ввод к виду +7 900 000-00-00.
 * Лишние символы отбрасываются, 8 в начале заменяется на 7,
 * номер без кода страны дополняется семёркой.
 */
export function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (!digits) return ''

  if (digits[0] === '8') digits = `7${digits.slice(1)}`
  if (digits[0] !== '7') digits = `7${digits}`
  digits = digits.slice(0, 11)

  const rest = digits.slice(1)
  let out = '+7'
  if (rest.length > 0) out += ` ${rest.slice(0, 3)}`
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`

  return out
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function validatePhone(value: string): string | null {
  const digits = phoneDigits(value)
  if (!digits) return 'Укажите телефон'
  if (digits.length < 11) return 'Номер неполный — нужно 11 цифр'
  return null
}

export function validateName(value: string): string | null {
  const name = value.trim()
  if (!name) return 'Укажите имя'
  if (name.length < 2) return 'Слишком короткое имя'
  return null
}

export function validateCompany(value: string): string | null {
  if (!value.trim()) return 'Укажите название компании'
  return null
}

/**
 * Почта по макету необязательна, поэтому пустая строка — не ошибка.
 * Проверяем только то, что заполнено.
 */
export function validateEmail(value: string, required = false): string | null {
  const email = value.trim()
  if (!email) return required ? 'Укажите почту' : null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Похоже на опечатку в адресе'
  return null
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Придумайте пароль'
  if (value.length < 8) return 'Минимум 8 символов'
  return null
}

/** У ИП ИНН из 12 цифр, у организации — из 10. */
export function validateInn(value: string, length: 10 | 12, required: boolean): string | null {
  const digits = phoneDigits(value)
  if (!digits) return required ? 'Укажите ИНН' : null
  if (digits.length !== length) return `ИНН состоит из ${length} цифр`
  return null
}

/** Вход принимает и телефон, и почту — разбираемся, что именно ввели. */
export function validateLogin(value: string): string | null {
  const login = value.trim()
  if (!login) return 'Укажите телефон или почту'
  if (login.includes('@')) return validateEmail(login, true)
  if (phoneDigits(login).length < 11) return 'Номер неполный — нужно 11 цифр'
  return null
}
