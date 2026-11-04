import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import pg from 'pg'

const dbUrl = process.env.DATABASE_URL
const databaseHost = dbUrl && new URL(dbUrl).hostname

async function freePort() {
  const socket = createServer()
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

test('order statuses and legacy migration', { timeout: 90_000, skip: !['localhost', '127.0.0.1'].includes(databaseHost) && 'Requires a local PostgreSQL DATABASE_URL' }, async (t) => {
  const schema = `order_status_test_${randomBytes(6).toString('hex')}`
  const adminDb = new pg.Pool({ connectionString: dbUrl })
  let testDb, server
  let serverOutput = ''
  try {
    await adminDb.query(`CREATE SCHEMA ${schema}`)
    const testUrl = new URL(dbUrl)
    testUrl.searchParams.set('options', `-csearch_path=${schema}`)
    testDb = new pg.Pool({ connectionString: testUrl.toString() })

    // Recreate the previous schema, then let the running app apply only the new migration.
    await testDb.query('CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const migrationFiles = (await readdir('server/db/migrations')).filter((name) => name.endsWith('.sql') && name < '013_order_status_workflow.sql').sort()
    for (const name of migrationFiles) {
      const sql = await readFile(`server/db/migrations/${name}`, 'utf8')
      await testDb.query(sql)
      await testDb.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
    }

    const { rows: users } = await testDb.query(
      `INSERT INTO users (email, password_hash, full_name, phone, client_type)
       VALUES ('legacy@example.test', 'legacy-hash', 'Legacy', '79004444444', 'person') RETURNING id`,
    )
    const { rows: services } = await testDb.query('SELECT id, slug, title, price FROM services LIMIT 1')
    assert.ok(services[0])
    const legacyIds = {}
    for (const status of ['awaiting_price', 'awaiting_payment', 'paid', 'cancelled']) {
      const { rows } = await testDb.query(
        `INSERT INTO orders (user_id, service_id, service_slug, service_title, price, amount, comment, status)
         VALUES ($1, $2, $3, $4, $5, $6, '', $7) RETURNING id`,
        [users[0].id, services[0].id, services[0].slug, services[0].title, services[0].price, 1900, status],
      )
      legacyIds[status] = rows[0].id
    }

    const port = await freePort()
    const origin = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, ['server/index.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl.toString(), APP_ORIGIN: origin, PORT: String(port), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
    server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

    let ready = false
    for (let n = 0; n < 100; n++) {
      try {
        const { rows } = await testDb.query("SELECT 1 FROM schema_migrations WHERE name = '013_order_status_workflow.sql'")
        if (rows[0] && (await fetch(`${origin}/api/health`)).ok) { ready = true; break }
      } catch { /* migration is still running */ }
      if (server.exitCode !== null) break
      await delay(100)
    }
    assert.ok(ready, `Server did not migrate and start: ${serverOutput.slice(-1000)}`)

    const call = async (path, { method = 'GET', body, cookie, headers = {} } = {}) => {
      const response = await fetch(`${origin}${path}`, {
        method,
        headers: {
          ...(method !== 'GET' ? { Origin: origin } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body !== undefined && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: Buffer.isBuffer(body) ? body : body === undefined ? undefined : JSON.stringify(body),
      })
      const data = response.status === 204 ? null : await response.json().catch(() => null)
      return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
    let client, admin, order

    await t.test('old unpaid orders become new; paid and cancelled orders retain their state and data', async () => {
      const { rows } = await testDb.query('SELECT id, status, amount, final_amount FROM orders WHERE user_id = $1', [users[0].id])
      const byId = new Map(rows.map((row) => [row.id, row]))
      for (const oldStatus of ['awaiting_price', 'awaiting_payment']) {
        assert.equal(byId.get(legacyIds[oldStatus]).status, 'new')
        assert.equal(byId.get(legacyIds[oldStatus]).amount, 1900)
        assert.equal(byId.get(legacyIds[oldStatus]).final_amount, null)
      }
      assert.equal(byId.get(legacyIds.paid).status, 'paid')
      assert.equal(byId.get(legacyIds.paid).final_amount, 1900)
      assert.equal(byId.get(legacyIds.cancelled).status, 'cancelled')
      assert.equal(rows.length, 4)
    })

    await t.test('new orders cannot be paid or managed by clients', async () => {
      client = await call('/api/auth/register', { method: 'POST', body: { fullName: 'Client', email: 'client@example.test', phone: '79005555555', password: 'safe-password-123', clientType: 'person' } })
      admin = await call('/api/auth/register', { method: 'POST', body: { fullName: 'Operator', email: 'operator@example.test', phone: '79006666666', password: 'safe-password-123', clientType: 'person' } })
      assert.equal(client.status, 201)
      assert.equal(admin.status, 201)
      await testDb.query("UPDATE users SET role = 'admin' WHERE email = 'operator@example.test'")
      const { rows } = await testDb.query("SELECT slug FROM services WHERE price ~ '[0-9]' LIMIT 1")
      assert.ok(rows[0])
      const created = await call('/api/orders', { method: 'POST', cookie: client.cookie, body: { slug: rows[0].slug, comment: 'Please complete this task.' } })
      assert.equal(created.status, 201)
      order = created.data.order
      assert.equal(order.status, 'new')
      assert.equal(order.finalAmount, null)
      assert.ok(order.amount > 0)
      assert.ok(order.createdAt && order.updatedAt)
      assert.equal((await call(`/api/orders/${order.id}/pay`, { method: 'POST', cookie: client.cookie, body: { method: 'card' } })).status, 409)
      assert.equal((await call(`/api/admin/orders/${order.id}/amount`, { method: 'PATCH', cookie: client.cookie, body: { finalAmount: 2500 } })).status, 404)
      assert.equal((await call(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', cookie: client.cookie, body: { status: 'paid' } })).status, 404)
      assert.equal((await call(`/api/orders/${order.id}/status`, { method: 'PATCH', cookie: client.cookie, body: { status: 'paid' } })).status, 404)
    })

    await t.test('admin completes work, sets final amount, and issues payment', async () => {
      const base = `/api/admin/orders/${order.id}`
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 409)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'awaiting_payment' } })).status, 409)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'paid' } })).status, 409)
      assert.equal((await call(`${base}/amount`, { method: 'PATCH', cookie: admin.cookie, body: { finalAmount: -5 } })).status, 400)
      const amount = await call(`${base}/amount`, { method: 'PATCH', cookie: admin.cookie, body: { finalAmount: 2500 } })
      assert.equal(amount.status, 200)
      assert.equal(amount.data.order.finalAmount, 2500)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'in_progress' } })).status, 200)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'completed' } })).status, 200)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'in_progress' } })).status, 200)
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 409)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'completed' } })).status, 200)
      const issued = await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })
      assert.equal(issued.status, 200)
      assert.equal(issued.data.order.status, 'awaiting_payment')
      assert.equal((await call(`${base}/amount`, { method: 'PATCH', cookie: admin.cookie, body: { finalAmount: 3000 } })).status, 409)
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 409)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'completed' } })).status, 200)
      assert.equal((await call(`${base}/amount`, { method: 'PATCH', cookie: admin.cookie, body: { finalAmount: 2600 } })).status, 200)
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 200)
      const visible = await call(`/api/orders/${order.id}`, { cookie: client.cookie })
      assert.equal(visible.data.order.status, 'awaiting_payment')
      assert.equal(visible.data.order.finalAmount, 2600)
    })

    await t.test('payment is one-time; admin closes paid order; chat, files and add-ons remain available', async () => {
      const first = await call(`/api/orders/${order.id}/pay`, { method: 'POST', cookie: client.cookie, body: { method: 'card' } })
      assert.equal(first.status, 200)
      assert.equal(first.data.order.status, 'paid')
      assert.equal((await call(`/api/orders/${order.id}/pay`, { method: 'POST', cookie: client.cookie, body: { method: 'card' } })).status, 409)
      const closed = await call(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'closed' } })
      assert.equal(closed.status, 200)
      assert.equal(closed.data.order.status, 'closed')
      assert.equal((await call(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'in_progress' } })).status, 409)
      assert.equal((await call(`/api/orders/${order.id}/messages`, { method: 'POST', cookie: client.cookie, body: { body: 'Thank you' } })).status, 201)
      const file = await call(`/api/orders/${order.id}/files`, { method: 'POST', cookie: client.cookie, body: Buffer.from('Completed document'), headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': 'result.txt' } })
      assert.equal(file.status, 201)
      const { rows: services } = await testDb.query("SELECT slug FROM services WHERE price ~ '[0-9]' LIMIT 1")
      const addOn = await call('/api/orders', { method: 'POST', cookie: client.cookie, body: { slug: services[0].slug, comment: 'Additional task', parentOrderId: order.id } })
      assert.equal(addOn.status, 201)
      assert.equal(addOn.data.order.status, 'new')
      const adminOrders = await call('/api/admin/orders', { cookie: admin.cookie })
      assert.equal(adminOrders.status, 200)
      assert.ok(adminOrders.data.orders.some((item) => item.id === order.id && item.updatedAt && item.finalAmount === 2600))
    })

    await t.test('a price-on-request order can be priced after completion; cancelled orders cannot be paid', async () => {
      const { rows } = await testDb.query("SELECT slug FROM services WHERE price !~ '[0-9]' LIMIT 1")
      assert.ok(rows[0])
      const request = await call('/api/orders', { method: 'POST', cookie: client.cookie, body: { slug: rows[0].slug, comment: 'Need help with the documents for last year.' } })
      assert.equal(request.status, 201)
      assert.equal(request.data.order.status, 'new')
      assert.equal(request.data.order.amount, null)
      const base = `/api/admin/orders/${request.data.order.id}`
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'in_progress' } })).status, 200)
      assert.equal((await call(`${base}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'completed' } })).status, 200)
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 409)
      assert.equal((await call(`${base}/amount`, { method: 'PATCH', cookie: admin.cookie, body: { finalAmount: 3100 } })).status, 200)
      assert.equal((await call(`${base}/invoice`, { method: 'POST', cookie: admin.cookie })).status, 200)
      assert.equal((await call(`/api/orders/${request.data.order.id}/pay`, { method: 'POST', cookie: client.cookie, body: { method: 'sbp' } })).status, 200)

      const cancelled = await call('/api/orders', { method: 'POST', cookie: client.cookie, body: { slug: rows[0].slug, comment: 'Another request to be cancelled.' } })
      assert.equal(cancelled.status, 201)
      assert.equal((await call(`/api/admin/orders/${cancelled.data.order.id}/status`, { method: 'PATCH', cookie: admin.cookie, body: { status: 'cancelled' } })).status, 200)
      assert.equal((await call(`/api/orders/${cancelled.data.order.id}/pay`, { method: 'POST', cookie: client.cookie, body: { method: 'card' } })).status, 409)
      assert.equal((await call('/api/admin/orders', { cookie: admin.cookie })).data.orders.some((item) => item.id === cancelled.data.order.id && item.status === 'cancelled'), true)
    })
  } finally {
    if (server && server.exitCode === null) {
      server.kill()
      await Promise.race([new Promise((resolve) => server.once('exit', resolve)), delay(3000)])
    }
    if (testDb) await testDb.end()
    await adminDb.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await adminDb.end()
  }
})
