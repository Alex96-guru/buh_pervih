import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
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

test('instruction catalog, management, guest purchase and protected download', {
  timeout: 90_000,
  skip: !localDb && 'Requires a local PostgreSQL DATABASE_URL',
}, async (t) => {
  const schema = `instructions_test_${randomBytes(6).toString('hex')}`
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
      env: {
        ...process.env, DATABASE_URL: testUrl.toString(), APP_ORIGIN: 'http://localhost:5173',
        PORT: String(port), NODE_ENV: 'test', ENABLE_TEST_PAYMENTS: 'true',
        INSTRUCTION_MANAGER_EMAIL: 'olga@example.test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (chunk) => { output += chunk.toString() })
    server.stderr.on('data', (chunk) => { output += chunk.toString() })
    let ready = false
    for (let n = 0; n < 100; n++) {
      try {
        if ((await fetch(`${origin}/api/health`)).ok &&
            (await db.query("SELECT 1 FROM schema_migrations WHERE name = '014_instructions.sql'")).rows[0]) {
          ready = true
          break
        }
      } catch { /* server or migrations are still starting */ }
      if (server.exitCode !== null) break
      await delay(100)
    }
    assert.ok(ready, `Server did not migrate and start: ${output.slice(-1000)}`)

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
      const contentType = response.headers.get('content-type') ?? ''
      const data = contentType.includes('application/json') ? await response.json() : await response.arrayBuffer()
      return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers }
    }
    const register = (email) => call('/api/auth/register', { method: 'POST', body: {
      fullName: 'Test Admin', email, phone: email.startsWith('olga') ? '79005551111' : '79005552222',
      password: 'safe-password-123', clientType: 'person',
    } })
    const olga = await register('olga@example.test')
    const other = await register('other@example.test')
    assert.equal(olga.status, 201)
    assert.equal(other.status, 201)
    await db.query("UPDATE users SET role = 'admin' WHERE email IN ('olga@example.test', 'other@example.test')")

    const docx = await readFile('tests/fixtures/sample.docx')
    const upload = (cookie, bytes = docx, name = 'sample.docx') => call('/api/admin/services/instruction-files', {
      method: 'POST', cookie, body: bytes,
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(name) },
    })
    assert.equal((await upload(other.cookie)).status, 403)
    assert.equal((await upload(olga.cookie, Buffer.from('fake docx'))).status, 415)
    assert.equal((await upload(olga.cookie, Buffer.alloc(20 * 1024 * 1024 + 1))).status, 413)
    const uploaded = await upload(olga.cookie)
    assert.equal(uploaded.status, 201)
    assert.equal((await call('/api/admin/services/instruction-files', {
      method: 'POST', cookie: olga.cookie, body: docx,
      headers: { Origin: 'http://localhost:9999', 'Content-Type': 'application/octet-stream', 'X-File-Name': 'sample.docx' },
    })).status, 403)
    const payload = {
      kind: 'instruction', title: 'Готовая инструкция', description: 'Как заполнить форму',
      priceAmount: 250, published: true, fileId: uploaded.data.fileId,
    }
    assert.equal((await call('/api/admin/services', { method: 'POST', cookie: other.cookie, body: payload })).status, 403)
    const created = await call('/api/admin/services', { method: 'POST', cookie: olga.cookie, body: payload })
    assert.equal(created.status, 201)
    const instruction = created.data.service
    assert.equal(instruction.kind, 'instruction')
    assert.equal(instruction.priceAmount, 250)
    const catalog = await call('/api/services')
    assert.ok(catalog.data.services.some((item) => item.id === instruction.id && item.group === 'instructions'))
    assert.ok(catalog.data.services.some((item) => item.kind === 'service'))
    assert.equal((await call('/api/orders', { method: 'POST', body: { slug: instruction.slug } })).status, 401)

    assert.equal((await call('/api/instruction-purchases/config')).data.testPaymentsEnabled, true)
    assert.equal((await call('/api/instruction-purchases', { method: 'POST', body: { slug: instruction.slug, email: {} } })).status, 400)
    const bought = await call('/api/instruction-purchases', { method: 'POST', body: {
      slug: instruction.slug, email: 'buyer@example.test', priceAmount: 1,
    } })
    assert.equal(bought.status, 201)
    assert.equal(bought.data.purchase.amount, 250)
    assert.equal(bought.data.purchase.status, 'pending')
    const token = bought.data.accessToken
    assert.equal((await call(`/api/instruction-purchases/${token}/download-link`, { method: 'POST' })).status, 403)
    assert.equal((await call(`/api/instruction-purchases/download/${token}`)).status, 404)
    const paid = await call(`/api/instruction-purchases/${token}/test-pay`, { method: 'POST', body: { method: 'sbp' } })
    assert.equal(paid.status, 200)
    assert.equal(paid.data.purchase.status, 'paid')
    const { rows: paymentRows } = await db.query('SELECT payment_provider, payment_method FROM instruction_purchases WHERE id = $1', [bought.data.purchase.id])
    assert.deepEqual(paymentRows[0], { payment_provider: 'test', payment_method: 'sbp' })
    assert.equal((await call(`/api/instruction-purchases/${token}/test-pay`, { method: 'POST', body: { method: 'sbp' } })).status, 409)
    const downloadUrl = paid.data.download.url
    for (let n = 0; n < 2; n++) {
      const file = await call(downloadUrl)
      assert.equal(file.status, 200)
      assert.deepEqual(Buffer.from(file.data), docx)
      assert.match(file.headers.get('content-disposition'), /attachment/)
    }
    const secondLink = await call(`/api/instruction-purchases/${token}/download-link`, { method: 'POST' })
    assert.equal(secondLink.status, 200)
    assert.equal((await call(secondLink.data.download.url)).status, 200)

    const replacement = await upload(olga.cookie, docx, 'replacement.docx')
    assert.equal(replacement.status, 201)
    const hidden = await call(`/api/admin/services/${instruction.id}`, { method: 'PUT', cookie: olga.cookie, body: { ...payload, published: false, fileId: replacement.data.fileId } })
    assert.equal(hidden.status, 200)
    assert.equal((await db.query('SELECT file_id FROM instruction_purchases WHERE id = $1', [bought.data.purchase.id])).rows[0].file_id, uploaded.data.fileId)
    assert.equal((await call(`/api/services/${instruction.slug}`)).status, 404)
    assert.equal((await call(downloadUrl)).status, 200)
    assert.equal((await call(`/api/admin/services/${instruction.id}`, { method: 'DELETE', cookie: other.cookie })).status, 403)
    assert.equal((await call(`/api/admin/services/${instruction.id}`, { method: 'DELETE', cookie: olga.cookie })).status, 204)
    assert.equal((await call(downloadUrl)).status, 200)
    await db.query('UPDATE instruction_download_tokens SET expires_at = now() - interval \'1 second\'')
    assert.equal((await call(downloadUrl)).status, 404)

    await t.test('production always refuses test payment', async () => {
      server.kill()
      await new Promise((resolve) => server.once('exit', resolve))
      const productionPort = await freePort()
      const productionOrigin = 'https://example.test'
      server = spawn(process.execPath, ['server/index.mjs'], {
        cwd: process.cwd(),
        env: {
          ...process.env, DATABASE_URL: testUrl.toString(), APP_ORIGIN: productionOrigin,
          PORT: String(productionPort), NODE_ENV: 'production', ENABLE_TEST_PAYMENTS: 'true',
          INSTRUCTION_MANAGER_EMAIL: 'olga@example.test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      server.stdout.on('data', (chunk) => { output += chunk.toString() })
      server.stderr.on('data', (chunk) => { output += chunk.toString() })
      const base = `http://127.0.0.1:${productionPort}`
      let started = false
      for (let n = 0; n < 100; n++) {
        try { if ((await fetch(`${base}/api/health`)).ok) { started = true; break } } catch { /* starting */ }
        if (server.exitCode !== null) break
        await delay(100)
      }
      assert.ok(started, `Production-mode server did not start: ${output.slice(-1000)}`)
      const response = await fetch(`${base}/api/instruction-purchases/${token}/test-pay`, {
        method: 'POST', headers: { Origin: productionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'card' }),
      })
      assert.equal(response.status, 403)
      assert.equal((await fetch(`${base}/api/instruction-purchases/config`).then((r) => r.json())).testPaymentsEnabled, false)
    })
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
