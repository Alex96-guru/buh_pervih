/**
 * Накатывает SQL-миграции из ./migrations по порядку имён.
 * Применённые записываются в schema_migrations, повторно не выполняются.
 * Каждая миграция идёт в транзакции: упала — откатилась целиком.
 *
 * Запуск: npm run db:migrate
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.mjs'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

async function main() {
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
    const { rows } = await client.query('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.name))

    const pending = files.filter((f) => !applied.has(f))

    if (pending.length === 0) {
      console.log(`Новых миграций нет, применено ранее: ${applied.size}`)
      return
    }

    for (const file of pending) {
      const sql = await readFile(path.join(dir, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`применена: ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Миграция ${file} не применена: ${err.message}`, { cause: err })
      }
    }

    console.log(`Готово, применено миграций: ${pending.length}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
