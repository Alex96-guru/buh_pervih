import { useEffect, useState } from 'react'
import { OrderConversation } from '../OrderConversation'
import { api } from '../../lib/api'
import { STATUS_LABELS, formatDateTime, formatRub } from '../../lib/orders'
import type { AdminOrder } from '../../lib/orders'
import { formatPhone } from '../../lib/validation'

export function AdminOrders({ currentUserId }: { currentUserId: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const result = await api.adminOrders(offset)
        if (!active) return
        setOrders(result.orders)
        setTotal(result.total)
        setSelectedId((id) => id && result.orders.some((order) => order.id === id) ? id : result.orders[0]?.id ?? null)
        setError('')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Не удалось загрузить заказы')
      } finally {
        if (active) setLoading(false)
      }
    }
    setLoading(true)
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [offset])

  const selected = orders.find((order) => order.id === selectedId)

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[22px] font-bold text-[var(--ink)]">Заявки и заказы</h2>
          <p className="text-[15px] text-[var(--ink-2)]">{loading ? 'Загружаем…' : `Всего: ${total}`} · список обновляется каждые 10 секунд</p>
        </div>
      </div>
      {error && <p role="alert" className="text-[15px] font-medium text-[var(--danger)]">{error}</p>}
      {!loading && !error && total === 0 && <p className="rounded-[20px] border border-[var(--line)] bg-white p-6 text-[var(--ink-2)]">Пока нет заявок.</p>}
      {orders.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full cursor-pointer rounded-[16px] border p-4 text-left ${selectedId === order.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-white hover:border-[var(--accent)]'}`}>
                <span className="text-[13px] font-semibold text-[var(--ink-2)]">Заказ № {order.number} · {STATUS_LABELS[order.status]} · {formatDateTime(order.createdAt)}</span>
                <span className="mt-1 block text-[16px] font-semibold text-[var(--ink)]">{order.serviceTitle}</span>
                {order.parentOrderNumber && <span className="mt-1 block text-[13px] font-semibold text-[var(--accent)]">Дополнительная к заказу № {order.parentOrderNumber}</span>}
                <span className="mt-1 block text-[14px] text-[var(--ink-2)]">{order.customer.fullName} · {order.amount ? formatRub(order.amount) : order.price}</span>
              </button>
            ))}
            {total > 50 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-[14px]">
                <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))} className="cursor-pointer font-semibold text-[var(--accent)] disabled:opacity-40">Назад</button>
                <span>{offset + 1}–{Math.min(offset + 50, total)} из {total}</span>
                <button type="button" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)} className="cursor-pointer font-semibold text-[var(--accent)] disabled:opacity-40">Далее</button>
              </div>
            )}
          </div>
          {selected && (
            <div className="flex min-w-0 flex-col gap-4">
              <section className="rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-6">
                <h3 className="text-[20px] font-bold text-[var(--ink)]">Заказ № {selected.number}</h3>
                <p className="mt-2 text-[16px] font-semibold text-[var(--ink)]">{selected.serviceTitle}</p>
                {selected.items.length > 1 && <div className="mt-3 flex flex-col gap-2">{selected.items.map((item) => <div key={item.serviceSlug} className="flex justify-between gap-3 rounded-[10px] border border-[var(--line)] p-3 text-[14px]"><span>{item.serviceTitle}</span><span className="shrink-0 font-semibold">{item.price}</span></div>)}</div>}
                {selected.parentOrderNumber && <p className="text-[14px] font-semibold text-[var(--accent)]">Дополнительная к заказу № {selected.parentOrderNumber}</p>}
                <p className="text-[14px] text-[var(--ink-2)]">{STATUS_LABELS[selected.status]} · {selected.paidAt ? formatDateTime(selected.paidAt) : formatDateTime(selected.createdAt)} · {selected.amount ? formatRub(selected.amount) : selected.price}</p>
                {selected.comment && <p className="mt-3 whitespace-pre-wrap break-words border-t border-[var(--line)] pt-3 text-[15px] text-[var(--ink)]">Комментарий покупателя: {selected.comment}</p>}
                <div className="mt-4 border-t border-[var(--line)] pt-4 text-[15px] text-[var(--ink)]">
                  <p className="font-semibold">{selected.customer.fullName}</p>
                  {selected.customer.companyName && <p className="break-words">{selected.customer.companyName}</p>}
                  {selected.customer.inn && <p>ИНН: <span className="font-medium">{selected.customer.inn}</span></p>}
                  <p><a className="text-[var(--accent)] hover:underline" href={`tel:+${selected.customer.phone}`}>{formatPhone(selected.customer.phone)}</a></p>
                  {selected.customer.email && <p><a className="break-all text-[var(--accent)] hover:underline" href={`mailto:${selected.customer.email}`}>{selected.customer.email}</a></p>}
                </div>
              </section>
              <OrderConversation key={selected.id} orderId={selected.id} currentUserId={currentUserId} isAdmin />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
