import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import pg from 'pg'

const dbUrl = process.env.DATABASE_URL
const databaseHost = dbUrl && new URL(dbUrl).hostname

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('security of authentication, orders and files', { timeout: 90_000, skip: !['localhost', '127.0.0.1'].includes(databaseHost) && 'Requires a local PostgreSQL DATABASE_URL' }, async (t) => {
  const schema = `security_test_${randomBytes(6).toString('hex')}`
  const adminDb = new pg.Pool({ connectionString: dbUrl })
  let server
  let output = ''
  try {
    await adminDb.query(`CREATE SCHEMA ${schema}`)
    const testUrl = new URL(dbUrl)
    testUrl.searchParams.set('options', `-csearch_path=${schema}`)
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
        const response = await fetch(`${origin}/api/health`)
        if (response.ok) { ready = true; break }
      } catch { /* server is starting */ }
      if (server.exitCode !== null) break
      await delay(100)
    }
    assert.ok(ready, `Server did not start: ${output.slice(-1000)}`)

    const call = async (path, { method = 'GET', body, cookie, headers = {}, csrf = true } = {}) => {
      const requestHeaders = { ...headers }
      if (cookie) requestHeaders.Cookie = cookie
      if (csrf && method !== 'GET') requestHeaders.Origin = origin
      if (body !== undefined && !(body instanceof Buffer)) requestHeaders['Content-Type'] = 'application/json'
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: requestHeaders,
        body: body instanceof Buffer ? body : body === undefined ? undefined : JSON.stringify(body),
      })
      const data = response.status === 204 || response.headers.get('content-type') === 'application/octet-stream'
        ? null : await response.json().catch(() => null)
      return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }

    const register = (fullName, email, phone, extra = {}) => call('/api/auth/register', {
      method: 'POST',
      body: { fullName, email, phone, password: 'safe-password-123', clientType: 'person', ...extra },
    })
    let a, b, admin, order, file

    await t.test('registration always creates clients, including an admin email and injected role', async () => {
      a = await register('Client A', 'client-a@example.test', '+7 900 111 11 11')
      b = await register('Client B', 'admin@gmail.com', '+7 900 222 22 22', { role: 'admin' })
      admin = await register('Operator', 'operator@example.test', '+7 900 333 33 33')
      assert.equal(a.response.status, 201)
      assert.equal(b.response.status, 201)
      assert.equal(admin.response.status, 201)
      assert.equal(b.data.user.role, 'client')
      assert.equal(b.data.user.password_hash, undefined)
      const { rows } = await adminDb.query(`SELECT role FROM ${schema}.users WHERE email = 'admin@gmail.com'`)
      assert.equal(rows[0].role, 'client')
      await adminDb.query(`UPDATE ${schema}.users SET role = 'admin' WHERE email = 'operator@example.test'`)
    })

    await t.test('login validates password and logout invalidates the old cookie', async () => {
      const bad = await call('/api/auth/login', { method: 'POST', body: { login: 'client-a@example.test', password: 'wrong-password' } })
      assert.equal(bad.response.status, 401)
      const good = await call('/api/auth/login', { method: 'POST', body: { login: 'client-a@example.test', password: 'safe-password-123' } })
      assert.equal(good.response.status, 200)
      assert.ok(good.cookie)
      const signedOut = await call('/api/auth/logout', { method: 'POST', cookie: good.cookie })
      assert.equal(signedOut.response.status, 204)
      const reused = await call('/api/auth/me', { cookie: good.cookie })
      assert.equal(reused.response.status, 401)
    })

    await t.test('clients cannot access admin API, other orders, messages or files', async () => {
      const forbidden = await call('/api/admin/users', { cookie: b.cookie })
      assert.equal(forbidden.response.status, 404)
      const service = await adminDb.query(`SELECT slug FROM ${schema}.services LIMIT 1`)
      assert.ok(service.rows[0])
      const created = await call('/api/orders', { method: 'POST', cookie: a.cookie, body: { slug: service.rows[0].slug, comment: 'Please process this order.' } })
      assert.equal(created.response.status, 201)
      order = created.data.order
      const message = await call(`/api/orders/${order.id}/messages`, { method: 'POST', cookie: a.cookie, body: { body: 'My private message' } })
      assert.equal(message.response.status, 201)
      for (const path of [`/api/orders/${order.id}`, `/api/orders/${order.id}/messages`, `/api/orders/${order.id}/files`]) {
        assert.equal((await call(path, { cookie: b.cookie })).response.status, 404)
      }
      const adminOrders = await call('/api/admin/orders', { cookie: admin.cookie })
      assert.equal(adminOrders.response.status, 200)
      assert.ok(adminOrders.data.orders.some((item) => item.id === order.id))
      const adminMessage = await call(`/api/orders/${order.id}/messages`, { method: 'POST', cookie: admin.cookie, body: { body: 'A reply from the operator' } })
      assert.equal(adminMessage.response.status, 201)
      const conversation = await call(`/api/orders/${order.id}/messages`, { cookie: a.cookie })
      assert.equal(conversation.response.status, 200)
      assert.equal(conversation.data.messages.length, 2)
      const adminUsers = await call('/api/admin/users', { cookie: admin.cookie })
      assert.equal(adminUsers.response.status, 200)
      assert.equal(adminUsers.data.users[0].password_hash, undefined)
    })

    await t.test('file content is validated and private downloads stay private', async () => {
      const invalid = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from('MZ\x00\x00'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'program.exe', 'X-File-Type': 'text/plain' } })
      assert.equal(invalid.response.status, 415)
      const spoofed = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from('MZ\x00\x00'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'document.txt', 'X-File-Type': 'text/plain' } })
      assert.equal(spoofed.response.status, 415)
      const uploaded = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from('A safe text document.'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'document.txt' } })
      assert.equal(uploaded.response.status, 201)
      file = uploaded.data.file
      const fileUrl = `/api/orders/${order.id}/files/${file.id}`
      assert.equal((await call(fileUrl, { cookie: b.cookie })).response.status, 404)
      assert.equal((await call(fileUrl, { method: 'DELETE', cookie: b.cookie })).response.status, 404)
      const downloaded = await call(fileUrl, { cookie: a.cookie })
      assert.equal(downloaded.response.status, 200)
      assert.match(downloaded.response.headers.get('content-disposition'), /^attachment;/)
      assert.equal(downloaded.response.headers.get('x-content-type-options'), 'nosniff')
      assert.equal((await call(fileUrl, { cookie: admin.cookie })).response.status, 200)
      for (let n = 1; n < 30; n++) {
        const extra = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from(`Document ${n}`), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': `document-${n}.txt` } })
        assert.equal(extra.response.status, 201)
      }
      const overCount = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from('Document 31'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'document-31.txt' } })
      assert.equal(overCount.response.status, 409)
      const tooLarge = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.alloc(50 * 1024 * 1024 + 1, 65), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'oversize.txt' } })
      assert.equal(tooLarge.response.status, 413)
    })

    await t.test('cancelled orders keep owner read access but deny new uploads and admin file access', async () => {
      const cancelled = await call(`/api/orders/${order.id}/cancel`, { method: 'POST', cookie: a.cookie })
      assert.equal(cancelled.response.status, 200)
      assert.equal((await call(`/api/orders/${order.id}/files/${file.id}`, { cookie: a.cookie })).response.status, 200)
      assert.equal((await call(`/api/orders/${order.id}/files/${file.id}`, { cookie: admin.cookie })).response.status, 404)
      const upload = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: a.cookie, body: Buffer.from('later'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'later.txt' } })
      assert.equal(upload.response.status, 409)
    })

    await t.test('cross-site and missing-origin writes are rejected', async () => {
      const body = { login: 'client-a@example.test', password: 'safe-password-123' }
      assert.equal((await call('/api/auth/login', { method: 'POST', body, csrf: false })).response.status, 403)
      assert.equal((await call('/api/auth/login', { method: 'POST', body, headers: { Origin: 'https://evil.example' }, csrf: false })).response.status, 403)
    })

    await t.test('repeated login attempts are limited', async () => {
      for (let n = 0; n < 10; n++) {
        assert.equal((await call('/api/auth/login', { method: 'POST', body: { login: 'unknown@example.test', password: 'incorrect-password' } })).response.status, 401)
      }
      const limited = await call('/api/auth/login', { method: 'POST', body: { login: 'unknown@example.test', password: 'incorrect-password' } })
      assert.equal(limited.response.status, 429)
      assert.ok(Number(limited.response.headers.get('retry-after')) > 0)
    })

    await t.test('registration attempts are limited', async () => {
      for (let n = 0; n < 2; n++) {
        const invalid = await call('/api/auth/register', { method: 'POST', body: {} })
        assert.equal(invalid.response.status, 400)
      }
      const limited = await call('/api/auth/register', { method: 'POST', body: {} })
      assert.equal(limited.response.status, 429)
    })
  } finally {
    if (server && server.exitCode === null) {
      server.kill()
      await Promise.race([new Promise((resolve) => server.once('exit', resolve)), delay(3000)])
    }
    await adminDb.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await adminDb.end()
  }
})
