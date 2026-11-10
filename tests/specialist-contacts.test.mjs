import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import pg from 'pg'

const dbUrl = process.env.DATABASE_URL
const localDb = dbUrl && ['localhost', '127.0.0.1'].includes(new URL(dbUrl).hostname)

async function freePort() {
  const socket = createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

test('specialist contacts and service ordering', {
  timeout: 90_000,
  skip: !localDb && 'Requires a local PostgreSQL DATABASE_URL',
}, async () => {
  const schema = `specialist_test_${randomBytes(6).toString('hex')}`
  const adminDb = new pg.Pool({ connectionString: dbUrl })
  let db, server
  let output = ''
  try {
    await adminDb.query(`CREATE SCHEMA ${schema}`)
    const testUrl = new URL(dbUrl)
    testUrl.searchParams.set('options', `-csearch_path=${schema}`)
    db = new pg.Pool({ connectionString: testUrl.toString() })
    const port = await freePort()
    const origin = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, ['server/index.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl.toString(), APP_ORIGIN: origin, PORT: String(port), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (chunk) => { output += chunk.toString() })
    server.stderr.on('data', (chunk) => { output += chunk.toString() })
    let ready = false
    for (let n = 0; n < 100; n++) {
      try {
        if ((await fetch(`${origin}/api/health`)).ok &&
            (await db.query("SELECT 1 FROM schema_migrations WHERE name = '016_service_contact_routes.sql'")).rows[0]) {
          ready = true
          break
        }
      } catch { /* server or migrations are still starting */ }
      if (server.exitCode !== null) break
      await delay(100)
    }
    assert.ok(ready, `Server did not migrate and start: ${output.slice(-1000)}`)
    const { rows: routedServices } = await db.query(
      "SELECT slug, price, specialist_phone, specialist_email FROM services WHERE slug IN ('lk-nalogoplatelshchika', 'voinskii-uchet') ORDER BY slug",
    )
    assert.equal(routedServices.length, 2)
    assert.deepEqual(routedServices.map(({ slug, specialist_phone, specialist_email }) => [slug, specialist_phone, specialist_email]), [
      ['lk-nalogoplatelshchika', '+79027965915', 'buhpervih@yandex.ru'],
      ['voinskii-uchet', '+79082586042', 'buhpervih@yandex.ru'],
    ])
    assert.equal(routedServices[0].price, '1 000 ₽')

    const call = async (path, { method = 'GET', body, cookie } = {}) => {
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: { ...(method !== 'GET' ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: response.status, data: await response.json().catch(() => null),
        cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
    const register = (email, phone) => call('/api/auth/register', { method: 'POST', body: {
      fullName: 'Test User', email, phone, password: 'safe-password-123', clientType: 'person',
    } })
    const admin = await register('specialist-admin@example.test', '79005553333')
    const client = await register('specialist-client@example.test', '79005554444')
    assert.equal(admin.status, 201)
    assert.equal(client.status, 201)
    await db.query("UPDATE users SET role = 'admin' WHERE email = 'specialist-admin@example.test'")

    const base = { kind: 'service', group: 'ip', title: 'Воинский учёт', price: 'по запросу', needs: [] }
    const contacts = { specialistName: 'Анна Иванова', telegramUrl: 'https://t.me/anna_account', maxUrl: 'https://web.max.ru/64321609' }
    const create = (body) => call('/api/admin/services', { method: 'POST', cookie: admin.cookie, body: { ...base, ...body } })
    assert.equal((await create({ ...contacts, telegramUrl: 'javascript:alert(1)' })).status, 400)
    assert.equal((await create({ ...contacts, telegramUrl: 'https://t.me.evil.example/anna' })).status, 400)
    assert.equal((await create({ ...contacts, telegramUrl: 'http://t.me/anna' })).status, 400)
    assert.equal((await create({ ...contacts, maxUrl: 'https://evil.example/anna' })).status, 400)
    assert.equal((await create({ specialistName: 'Анна Иванова' })).status, 400)
    assert.equal((await create({ telegramUrl: 'https://t.me/anna_account' })).status, 400)
    assert.equal((await create({ contactPhone: '12345' })).status, 400)
    assert.equal((await create({ contactEmail: 'not-an-email' })).status, 400)
    const created = await create(contacts)
    assert.equal(created.status, 201)
    const service = created.data.service
    assert.equal(service.specialistName, contacts.specialistName)
    assert.equal(service.telegramUrl, contacts.telegramUrl)
    assert.equal(service.maxUrl, contacts.maxUrl)
    const publicService = await call(`/api/services/${service.slug}`)
    assert.equal(publicService.status, 200)
    assert.equal(publicService.data.service.specialistName, contacts.specialistName)
    assert.equal((await call('/api/orders', { method: 'POST', cookie: client.cookie,
      body: { slug: service.slug, comment: 'Помогите с воинским учётом' } })).status, 409)
    assert.equal((await call('/api/admin/services', { method: 'POST', cookie: client.cookie,
      body: { ...base, ...contacts } })).status, 404)

    const cleared = await call(`/api/admin/services/${service.id}`, { method: 'PUT', cookie: admin.cookie,
      body: { ...base, specialistName: '', telegramUrl: '', maxUrl: '' } })
    assert.equal(cleared.status, 200)
    assert.equal(cleared.data.service.specialistName, '')
    assert.equal((await call('/api/orders', { method: 'POST', cookie: client.cookie,
      body: { slug: service.slug, comment: 'Помогите с воинским учётом' } })).status, 201)
    const maxOnly = await call(`/api/admin/services/${service.id}`, { method: 'PUT', cookie: admin.cookie,
      body: { ...base, specialistName: 'Анна Иванова', maxUrl: 'https://max.ru/anna' } })
    assert.equal(maxOnly.status, 200)
    assert.equal(maxOnly.data.service.telegramUrl, '')
    assert.equal(maxOnly.data.service.maxUrl, 'https://max.ru/anna')
    assert.equal((await call('/api/orders', { method: 'POST', cookie: client.cookie,
      body: { slug: service.slug, comment: 'Повторная заявка' } })).status, 409)
    const contactOnly = await create({ contactPhone: '8 902 796-59-15', contactEmail: 'BUHPERVIH@yandex.ru' })
    assert.equal(contactOnly.status, 201)
    assert.equal(contactOnly.data.service.contactPhone, '+79027965915')
    assert.equal(contactOnly.data.service.contactEmail, 'buhpervih@yandex.ru')
    assert.equal((await call('/api/orders', { method: 'POST', cookie: client.cookie,
      body: { slug: contactOnly.data.service.slug, comment: 'Письмо или MAX' } })).status, 409)
    const { rows: existing } = await db.query("SELECT slug FROM services WHERE kind = 'service' AND price ~ '[0-9]' AND specialist_name = '' LIMIT 1")
    assert.ok(existing[0])
    assert.equal((await call('/api/orders', { method: 'POST', cookie: client.cookie,
      body: { slug: existing[0].slug, comment: 'Обычная услуга' } })).status, 201)
  } finally {
    if (server && server.exitCode === null) {
      server.kill()
      await Promise.race([new Promise((resolve) => server.once('exit', resolve)), delay(3000)])
    }
    if (db) await db.end()
    await adminDb.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await adminDb.end()
  }
})
