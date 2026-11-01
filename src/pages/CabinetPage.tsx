import { useEffect, useState } from 'react'
import { ChevronRight, FileText, MessagesSquare } from 'lucide-react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { api } from '../lib/api'
import { useRequireUser } from '../lib/auth'
import { CATALOG_PATH } from '../lib/catalog'
import { cn } from '../lib/cn'
import { STATUS_LABELS, formatDateTime, formatRub, orderPath } from '../lib/orders'
import type { Order, OrderDialog } from '../lib/orders'

const TYPE_LABELS: Record<string, string> = {
  ip: 'ИП',
  ooo: 'ООО',
  person: 'Физлицо',
}

/** «Ждёт оплаты» выделяем: это то, что клиенту нужно сделать самому. */
function OrderRow({ order }: { order: Order }) {
  return (
    <li>
      <a
        href={orderPath(order.id)}
        className="group flex w-full items-center gap-3 rounded-[14px] border border-[var(--line)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
      >
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="text-[16px] leading-[22px] font-semibold text-[var(--ink)]">
            {order.serviceTitle}
          </span>
          <span className="text-[14px] text-[var(--ink-2)]">
            № {order.number} · {order.amount ? formatRub(order.amount) : order.price} ·{' '}
            <span
              className={cn(
                order.status === 'awaiting_payment' && 'font-semibold text-[var(--accent)]',
              )}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </span>
          {order.parentOrderNumber && <span className="text-[13px] text-[var(--accent)]">Дополнительная к заказу № {order.parentOrderNumber}</span>}
        </div>
        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--ink-2)] transition-colors group-hover:text-[var(--accent)]"
        />
      </a>
    </li>
  )
}

function MyOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .orders()
      .then(({ orders: list }) => {
        if (!cancelled) setOrders(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p role="alert" className="text-[16px] font-medium text-[var(--danger)]">
        Не удалось загрузить заказы: {error}
      </p>
    )
  }

  if (!orders) return <p className="text-[16px] text-[var(--ink-2)]">Загружаем…</p>

  if (orders.length === 0) {
    return (
      <p className="text-[16px] leading-[24px] text-[var(--ink-2)]">
        Пока ни одного заказа.{' '}
        <a href={CATALOG_PATH} className="font-semibold text-[var(--accent)] hover:underline">
          Выберите услугу
        </a>{' '}
        — она появится здесь со статусом оплаты.
      </p>
    )
  }

  return (
    <ul className="flex w-full flex-col gap-2">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  )
}

function MyDialogOrders() {
  const [dialogs, setDialogs] = useState<OrderDialog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = () => api.orderDialogs()
      .then(({ dialogs: list }) => { if (active) { setDialogs(list); setError('') } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Не удалось загрузить диалоги') })
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  if (error) return <p role="alert" className="text-[15px] text-[var(--danger)]">{error}</p>
  if (dialogs.length === 0) return <p className="text-[16px] leading-[24px] text-[var(--ink-2)]">Переписка появится после оформления заказа.</p>
  return (
    <ul className="flex flex-col gap-2">
      {dialogs.map((dialog) => (
        <li key={dialog.orderId}>
          <a href={`${orderPath(dialog.orderId)}#conversation`} className="block min-w-0 rounded-[12px] border border-[var(--line)] p-3 text-[15px] text-[var(--ink)] hover:border-[var(--accent)]">
            <span className="flex flex-wrap items-center justify-between gap-2 font-semibold">
              <span>Заказ № {dialog.number} · {dialog.serviceTitle}</span>
              {dialog.unreadCount > 0 && <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[12px] text-white">Новых: {dialog.unreadCount}</span>}
            </span>
            {dialog.lastMessage ? (
              <span className="mt-1 block break-words text-[13px] leading-5 text-[var(--ink-2)]">
                {dialog.lastSenderName}: {dialog.lastMessage.length > 100 ? `${dialog.lastMessage.slice(0, 100)}…` : dialog.lastMessage}
                {dialog.lastMessageAt && <span className="mt-1 block text-[12px]">{formatDateTime(dialog.lastMessageAt)}</span>}
              </span>
            ) : <span className="mt-1 block text-[13px] text-[var(--ink-2)]">Сообщений пока нет</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Личный кабинет покупателя с заказами и перепиской по ним. */
export function CabinetPage() {
  const user = useRequireUser()

  if (!user) return null

  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--surface)]">
      <Header />

      <main className="flex flex-1 flex-col items-center bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col gap-6 lg:gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">
              Здравствуйте, {user.fullName}
            </h1>
            <p className="text-[17px] text-[var(--ink-2)]">
              {TYPE_LABELS[user.clientType] ?? 'Клиент'}
              {user.email ? ` · ${user.email}` : ''}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            <section className="flex flex-1 flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:p-8">
              <FileText size={24} className="text-[var(--accent)]" />
              <h2 className="text-[22px] font-bold text-[var(--ink)]">Мои заказы</h2>
              <MyOrders />
            </section>

            <section className="flex flex-1 flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:p-8">
              <MessagesSquare size={24} className="text-[var(--accent)]" />
              <h2 className="text-[22px] font-bold text-[var(--ink)]">Мои диалоги</h2>
              <MyDialogOrders />
            </section>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
