import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

/**
 * scrypt из стандартной библиотеки Node: память-затратная функция, устойчивая
 * к перебору на видеокартах. Взят вместо argon2 намеренно — тот тянет нативную
 * сборку, которая ломается на части окружений, а выигрыш здесь некритичен.
 */
const N = 16384
const r = 8
const p = 1
const KEY_LEN = 64

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LEN, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false

  const [scheme, nRaw, rRaw, pRaw, saltRaw, keyRaw] = stored.split('$')
  if (scheme !== 'scrypt') return false

  const salt = Buffer.from(saltRaw, 'base64')
  const expected = Buffer.from(keyRaw, 'base64')

  const actual = await scrypt(password, salt, expected.length, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
  })

  // Сравнение за постоянное время: иначе по задержке можно подбирать хеш.
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
