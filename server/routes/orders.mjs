import { Router } from 'express'
import express from 'express'
import { pool } from '../db/pool.mjs'
import { requireAuth } from '../middleware.mjs'
import { validatedMimeType } from '../files/validate.mjs'

const METHODS = ['card', 'sbp']

/** Наружу — в camelCase и без служебных полей базы. */
function publicOrder(row) {
  return {
    id: row.id,
    number: row.number,
    parentOrderId: row.parent_order_id,
    parentOrderNumber: row.parent_order_number ?? null,
    serviceSlug: row.service_slug,
    serviceTitle: row.service_title,
    items: row.items?.length ? row.items : [{ serviceSlug: row.service_slug, serviceTitle: row.service_title, price: row.price, amount: row.amount }],
    price: row.price,
    amount: row.amount,
    finalAmount: row.final_amount,
    comment: row.comment,
    status: row.status,
    paymentMethod: row.payment_method,
    testPayment: row.payment_provider === 'test',
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Сумма из цены каталога: «1 900 ₽» → 1900, «от 3 000 ₽» → 3000 (базовая),
 * «по запросу» → null.
 */
function amountOf(price) {
  const digits = price.replace(/\D/g, '')
  const amount = Number(digits)
  return digits && amount > 0 ? amount : null
}

/** Свой заказ по id; чужой и несуществующий неотличимы — оба 404. */
async function findOwnOrder(id, userId) {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ])
    return rows[0] ?? null
  } catch (err) {
    // 22P02 — в адресе не uuid.
    if (err.code === '22P02') return null
    throw err
  }
}

function notFound(res) {
  return res.status(404).json({ error: 'Заказ не найден' })
}

export const ordersRouter = Router()

ordersRouter.use(requireAuth)

ordersRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, p.number AS parent_order_number
         FROM orders o LEFT JOIN orders p ON p.id = o.parent_order_id
        WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
      [req.user.id],
    )
    return res.json({ orders: rows.map(publicOrder) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.get('/dialogs', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.number, o.service_title,
              last_message.body AS last_message,
              last_message.created_at AS last_message_at,
              sender.full_name AS last_sender_name,
              (SELECT count(*)::int FROM order_messages unread
                WHERE unread.order_id = o.id AND unread.sender_id <> $1
                  AND unread.created_at > coalesce(reads.last_read_at, '-infinity'::timestamptz)) AS unread_count
         FROM orders o
         LEFT JOIN order_message_reads reads ON reads.order_id = o.id AND reads.user_id = $1
         LEFT JOIN LATERAL (
           SELECT body, created_at, sender_id FROM order_messages
            WHERE order_id = o.id ORDER BY created_at DESC, id DESC LIMIT 1
         ) last_message ON true
         LEFT JOIN users sender ON sender.id = last_message.sender_id
        WHERE o.user_id = $1 AND o.status <> 'cancelled'
        ORDER BY coalesce(last_message.created_at, o.created_at) DESC LIMIT 100`,
      [req.user.id],
    )
    return res.json({ dialogs: rows.map((row) => ({
      orderId: row.id,
      number: row.number,
      serviceTitle: row.service_title,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      lastSenderName: row.last_sender_name,
      unreadCount: row.unread_count,
    })) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.post('/', async (req, res, next) => {
  try {
    const slug = String(req.body?.slug ?? '')
    const comment = String(req.body?.comment ?? '').trim().slice(0, 2000)
    const parentOrderId = req.body?.parentOrderId
    const requested = Array.isArray(req.body?.services)
      ? req.body.services
      : [slug]
    if (requested.length < 1 || requested.length > 10 ||
        requested.some((item) => typeof item !== 'string' || !item || item.length > 160) ||
        new Set(requested).size !== requested.length) {
      return res.status(400).json({ error: 'Выберите от 1 до 10 разных услуг' })
    }
    const { rows: found } = await pool.query('SELECT * FROM services WHERE slug = ANY($1::text[])', [requested])
    const bySlug = new Map(found.map((service) => [service.slug, service]))
    if (requested.some((item) => !bySlug.has(item))) return res.status(404).json({ error: 'Услуга не найдена' })
    const services = requested.map((item) => bySlug.get(item))
    const service = services[0]
    const items = services.map((item) => ({
      serviceSlug: item.slug,
      serviceTitle: item.title,
      price: item.price,
      amount: amountOf(item.price),
    }))
    const amount = items.every((item) => item.amount !== null)
      ? items.reduce((total, item) => total + item.amount, 0)
      : null
    if (amount === null && comment.length < 10) {
      return res.status(400).json({ error: 'Опишите задачу хотя бы в 10 символах, чтобы специалист мог оценить стоимость', field: 'comment' })
    }
    if (items.length > 1 && amount === null) {
      return res.status(400).json({ error: 'Услуги без указанной цены оформляются отдельно' })
    }

    let parentId = null
    let parentNumber = null
    if (parentOrderId !== undefined && parentOrderId !== null) {
      const parent = await findOwnOrder(parentOrderId, req.user.id)
      if (!parent || !['paid', 'closed'].includes(parent.status)) return notFound(res)
      if (!amount) {
        return res.status(400).json({ error: 'Дополнительная услуга должна иметь указанную цену' })
      }
      const root = parent.parent_order_id
        ? await findOwnOrder(parent.parent_order_id, req.user.id)
        : parent
      if (!root || !['paid', 'closed'].includes(root.status)) return notFound(res)
      parentId = root.id
      parentNumber = root.number
    }

    const { rows } = await pool.query(
      `INSERT INTO orders (user_id, service_id, service_slug, service_title, price, amount, comment, status, parent_order_id, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        service.id,
        service.slug,
        items.length === 1 ? service.title : `${service.title} + ещё ${items.length - 1}`,
        items.length === 1 ? service.price : `${amount.toLocaleString('ru-RU')} ₽`,
        amount,
        comment,
        'new',
        parentId,
        JSON.stringify(items),
      ],
    )

    return res.status(201).json({ order: publicOrder({ ...rows[0], parent_order_number: parentNumber }) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await findOwnOrder(req.params.id, req.user.id)
    if (!order) return notFound(res)
    const { rows: related } = await pool.query(
      `SELECT id, number, service_title, status FROM orders
        WHERE parent_order_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [order.parent_order_id ?? order.id, req.user.id],
    )
    let parentNumber = null
    if (order.parent_order_id) {
      const parent = await findOwnOrder(order.parent_order_id, req.user.id)
      parentNumber = parent?.number ?? null
    }
    return res.json({
      order: publicOrder({ ...order, parent_order_number: parentNumber }),
      relatedOrders: related.map((item) => ({
        id: item.id,
        number: item.number,
        serviceTitle: item.service_title,
        status: item.status,
      })),
    })
  } catch (err) {
    return next(err)
  }
})

async function fileAccess(req, res, next) {
  try {
    let order = await findOwnOrder(req.params.id, req.user.id)
    if (!order && req.user.role === 'admin') {
      const { rows } = await pool.query(
        `SELECT * FROM orders WHERE id = $1 AND status <> 'cancelled'`,
        [req.params.id],
      )
      order = rows[0] ?? null
    }
    if (!order) return notFound(res)
    req.fileOrder = order
    return next()
  } catch (err) {
    if (err.code === '22P02') return notFound(res)
    return next(err)
  }
}

function publicFile(row) {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    size: row.size_bytes,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.full_name ?? null,
    createdAt: row.created_at,
  }
}

ordersRouter.get('/:id/files', fileAccess, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.name, f.mime_type, f.size_bytes, f.uploaded_by, f.created_at,
              u.full_name
         FROM order_files f LEFT JOIN users u ON u.id = f.uploaded_by
        WHERE f.order_id = $1 ORDER BY f.created_at DESC, f.id DESC`,
      [req.fileOrder.id],
    )
    return res.json({ files: rows.map(publicFile) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.post('/:id/files', fileAccess,
  express.raw({ type: 'application/octet-stream', limit: '50mb' }),
  async (req, res, next) => {
    try {
      if (req.fileOrder.status === 'cancelled') return res.status(409).json({ error: 'К отменённому заказу нельзя прикреплять файлы' })
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Выберите непустой файл' })
      }
      let name
      try {
        name = decodeURIComponent(String(req.get('x-file-name') ?? ''))
      } catch {
        return res.status(400).json({ error: 'Некорректное имя файла' })
      }
      if (!name || name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name)) {
        return res.status(400).json({ error: 'Некорректное имя файла' })
      }
      const mimeType = await validatedMimeType(name, req.body)
      if (!mimeType) return res.status(415).json({ error: 'Тип файла не поддерживается или не соответствует содержимому' })

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // The order lock serializes uploads and cancellation, so the 30-file limit cannot race.
        const { rows: orders } = await client.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [req.fileOrder.id])
        if (!orders[0] || orders[0].status === 'cancelled') {
          await client.query('ROLLBACK')
          return res.status(409).json({ error: 'К отменённому заказу нельзя прикреплять файлы' })
        }
        const { rows: counts } = await client.query(
          'SELECT count(*)::int AS count FROM order_files WHERE order_id = $1',
          [req.fileOrder.id],
        )
        if (counts[0].count >= 30) {
          await client.query('ROLLBACK')
          return res.status(409).json({ error: 'К заказу можно приложить не больше 30 файлов' })
        }
        const { rows } = await client.query(
          `INSERT INTO order_files (order_id, uploaded_by, name, mime_type, size_bytes, data)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, mime_type, size_bytes, uploaded_by, created_at`,
          [req.fileOrder.id, req.user.id, name, mimeType, req.body.length, req.body],
        )
        await client.query('COMMIT')
        return res.status(201).json({ file: publicFile({ ...rows[0], full_name: req.user.full_name }) })
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      return next(err)
    }
  },
)

ordersRouter.get('/:id/files/:fileId', fileAccess, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, size_bytes, data FROM order_files WHERE id = $1 AND order_id = $2',
      [req.params.fileId, req.fileOrder.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Файл не найден' })
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(rows[0].name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      'Content-Length': String(rows[0].size_bytes),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    return res.end(rows[0].data)
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Файл не найден' })
    return next(err)
  }
})

ordersRouter.delete('/:id/files/:fileId', fileAccess, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM order_files
        WHERE id = $1 AND order_id = $2 AND (uploaded_by = $3 OR $4 = 'admin')`,
      [req.params.fileId, req.fileOrder.id, req.user.id, req.user.role],
    )
    if (!rowCount) return res.status(404).json({ error: 'Файл не найден' })
    return res.status(204).end()
  } catch (err) {
    if (err.code === '22P02') return res.status(404).json({ error: 'Файл не найден' })
    return next(err)
  }
})

async function canMessageOrder(id, user) {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM orders
        WHERE id = $1 AND status <> 'cancelled' AND (user_id = $2 OR $3 = 'admin')`,
      [id, user.id, user.role],
    )
    return Boolean(rows[0])
  } catch (err) {
    if (err.code === '22P02') return false
    throw err
  }
}

function publicMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.full_name,
    senderRole: row.role,
    body: row.body,
    createdAt: row.created_at,
  }
}

ordersRouter.get('/:id/messages', async (req, res, next) => {
  try {
    if (!(await canMessageOrder(req.params.id, req.user))) return notFound(res)
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT m.id, m.sender_id, m.body, m.created_at, u.full_name, u.role
           FROM order_messages m JOIN users u ON u.id = m.sender_id
          WHERE m.order_id = $1
          ORDER BY m.created_at DESC, m.id DESC LIMIT 200
       ) recent ORDER BY created_at, id`,
      [req.params.id],
    )
    return res.json({ messages: rows.map(publicMessage) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.post('/:id/messages', async (req, res, next) => {
  try {
    if (!(await canMessageOrder(req.params.id, req.user))) return notFound(res)
    const body = String(req.body?.body ?? '').trim()
    if (!body || body.length > 2000) {
      return res.status(400).json({ error: 'Сообщение должно содержать от 1 до 2000 символов', field: 'body' })
    }
    const { rows } = await pool.query(
      `INSERT INTO order_messages (order_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, body, created_at`,
      [req.params.id, req.user.id, body],
    )
    return res.status(201).json({
      message: publicMessage({ ...rows[0], full_name: req.user.full_name, role: req.user.role }),
    })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.post('/:id/messages/read', async (req, res, next) => {
  try {
    if (!(await canMessageOrder(req.params.id, req.user))) return notFound(res)
    await pool.query(
      `INSERT INTO order_message_reads (order_id, user_id, last_read_at)
       VALUES ($1, $2, now())
       ON CONFLICT (order_id, user_id) DO UPDATE SET last_read_at = now()`,
      [req.params.id, req.user.id],
    )
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
})

/**
 * Заглушка оплаты: сразу помечает заказ оплаченным, деньги не списываются.
 * Когда подключим эквайринг, здесь будет создание платежа и ссылка на форму
 * банка, а отметку об оплате поставит уведомление от банка.
 */
ordersRouter.post('/:id/pay', async (req, res, next) => {
  try {
    const method = String(req.body?.method ?? '')
    if (!METHODS.includes(method)) {
      return res.status(400).json({ error: 'Выберите способ оплаты', field: 'method' })
    }

    const order = await findOwnOrder(req.params.id, req.user.id)
    if (!order) return notFound(res)

    // Условие на статус в самом UPDATE: два быстрых клика не оплатят дважды.
    const { rows } = await pool.query(
      `UPDATE orders
          SET status = 'paid', payment_method = $2, payment_provider = 'test', paid_at = now()
        WHERE id = $1 AND status = 'awaiting_payment' AND final_amount > 0
        RETURNING *`,
      [order.id, method],
    )
    if (!rows[0]) return res.status(409).json({ error: 'Этот заказ сейчас нельзя оплатить' })

    const parent = rows[0].parent_order_id
      ? await findOwnOrder(rows[0].parent_order_id, req.user.id)
      : null
    return res.json({ order: publicOrder({ ...rows[0], parent_order_number: parent?.number }) })
  } catch (err) {
    return next(err)
  }
})

ordersRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await findOwnOrder(req.params.id, req.user.id)
    if (!order) return notFound(res)

    const { rows } = await pool.query(
      `UPDATE orders SET status = 'cancelled'
        WHERE id = $1 AND status = 'new'
        RETURNING *`,
      [order.id],
    )
    if (!rows[0]) return res.status(409).json({ error: 'После начала работы отмену согласует специалист' })

    const parent = rows[0].parent_order_id
      ? await findOwnOrder(rows[0].parent_order_id, req.user.id)
      : null
    return res.json({ order: publicOrder({ ...rows[0], parent_order_number: parent?.number }) })
  } catch (err) {
    return next(err)
  }
})
