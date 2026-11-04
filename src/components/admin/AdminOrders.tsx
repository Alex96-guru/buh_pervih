import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { OrderConversation } from '../OrderConversation'
import { api } from '../../lib/api'
import { STATUS_LABELS, formatDateTime, formatRub } from '../../lib/orders'
import type { AdminOrder, OrderStatus } from '../../lib/orders'
import { formatPhone } from '../../lib/validation'

export function AdminOrders({ currentUserId }: { currentUserId: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
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
  const showMobileDetail = mobileOpen && Boolean(selected)

  function updateOrder(change: Pick<AdminOrder, 'id' | 'status' | 'finalAmount' | 'updatedAt'>) {
    setOrders((current) => current.map((order) => order.id === change.id ? { ...order, ...change } : order))
  }

  function openOrder(id: string) {
    setSelectedId(id)
    setMobileOpen(true)
    requestAnimationFrame(() => document.getElementById('admin-orders')?.scrollIntoView({ block: 'start' }))
  }

  function changePage(nextOffset: number) {
    setOffset(nextOffset)
    setMobileOpen(false)
  }

  return (
    <div id="admin-orders" className="flex w-full scroll-mt-[84px] flex-col gap-5">
      <div className={`${showMobileDetail ? 'hidden' : 'flex'} flex-wrap items-end justify-between gap-2 lg:flex`}>
        <div>
          <h2 className="text-[22px] font-bold text-[var(--ink)]">Заявки и заказы</h2>
          <p className="text-[15px] text-[var(--ink-2)]">{loading ? 'Загружаем…' : `Всего: ${total}`} · список обновляется каждые 10 секунд</p>
        </div>
      </div>
      {error && <p role="alert" className="text-[15px] font-medium text-[var(--danger)]">{error}</p>}
      {!loading && !error && total === 0 && <p className="rounded-[20px] border border-[var(--line)] bg-white p-6 text-[var(--ink-2)]">Пока нет заявок.</p>}
      {orders.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <div className={`${showMobileDetail ? 'hidden' : 'flex'} min-w-0 flex-col gap-2 lg:flex`}>
            {orders.map((order) => (
              <button key={order.id} type="button" onClick={() => openOrder(order.id)} className={`group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-[14px] border px-3 py-2.5 text-left lg:items-start lg:rounded-[16px] lg:p-4 ${selectedId === order.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : order.unreadCount > 0 || order.status === 'new' ? 'border-[#E7A33B] bg-[#FFF3DE] hover:border-[#C77D12]' : order.status === 'paid' || order.status === 'closed' ? 'border-[#7BC89C] bg-[#E8F7EE] hover:border-[#3B9F68]' : 'border-[var(--line)] bg-white hover:border-[var(--accent)]'}`}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                  <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] font-semibold text-[var(--ink-2)] lg:text-[13px]">
                    <span>№ {order.number} · {STATUS_LABELS[order.status]}{order.unreadCount > 0 && <span className="ml-1 text-[#A45C00]">· Новых: {order.unreadCount}</span>}</span>
                    <span className="hidden shrink-0 lg:inline">{formatDateTime(order.createdAt)}</span>
                  </span>
                  <span className="truncate text-[15px] font-semibold text-[var(--ink)] lg:text-[16px]">{order.serviceTitle}</span>
                  <span className="truncate text-[13px] text-[var(--ink-2)] lg:text-[14px]">{order.customer.fullName}<span className="hidden lg:inline"> · {order.finalAmount ? formatRub(order.finalAmount) : order.amount ? formatRub(order.amount) : order.price}</span></span>
                  {order.parentOrderNumber && <span className="hidden text-[13px] font-semibold text-[var(--accent)] lg:block">Дополнительная к заказу № {order.parentOrderNumber}</span>}
                </span>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[var(--ink-2)] lg:hidden" />
              </button>
            ))}
            {total > 50 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-[14px]">
                <button type="button" disabled={offset === 0} onClick={() => changePage(Math.max(0, offset - 50))} className="cursor-pointer font-semibold text-[var(--accent)] disabled:opacity-40">Назад</button>
                <span>{offset + 1}–{Math.min(offset + 50, total)} из {total}</span>
                <button type="button" disabled={offset + 50 >= total} onClick={() => changePage(offset + 50)} className="cursor-pointer font-semibold text-[var(--accent)] disabled:opacity-40">Далее</button>
              </div>
            )}
          </div>
          {selected && (
            <div className={`${showMobileDetail ? 'flex' : 'hidden'} min-w-0 flex-col gap-4 lg:flex`}>
              <div className="flex flex-col gap-2 lg:hidden">
                <button type="button" onClick={() => setMobileOpen(false)} className="flex min-h-[44px] w-fit cursor-pointer items-center gap-2 text-[14px] font-semibold text-[var(--accent)]"><ArrowLeft size={18} aria-hidden="true" />Все заявки</button>
                <div className="min-w-0"><p className="text-[13px] text-[var(--ink-2)]">Заказ № {selected.number} · {STATUS_LABELS[selected.status]}</p><h3 className="truncate text-[18px] font-bold text-[var(--ink)]">{selected.customer.fullName}</h3></div>
              </div>
              <div className="order-1 lg:order-2"><AdminOrderControls order={selected} onUpdated={updateOrder} /></div>
              {selected.status !== 'cancelled' && <div className="order-2 lg:order-3"><OrderConversation key={selected.id} orderId={selected.id} currentUserId={currentUserId} isAdmin /></div>}
              <section className="order-3 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:order-1 lg:p-6">
                <h3 className="text-[20px] font-bold text-[var(--ink)]">Заказ № {selected.number}</h3>
                <p className="mt-2 text-[16px] font-semibold text-[var(--ink)]">{selected.serviceTitle}</p>
                {selected.items.length > 1 && <div className="mt-3 flex flex-col gap-2">{selected.items.map((item) => <div key={item.serviceSlug} className="flex justify-between gap-3 rounded-[10px] border border-[var(--line)] p-3 text-[14px]"><span>{item.serviceTitle}</span><span className="shrink-0 font-semibold">{item.price}</span></div>)}</div>}
                {selected.parentOrderNumber && <p className="text-[14px] font-semibold text-[var(--accent)]">Дополнительная к заказу № {selected.parentOrderNumber}</p>}
                <p className="text-[14px] text-[var(--ink-2)]">Статус: {STATUS_LABELS[selected.status]}</p>
                <p className="text-[14px] text-[var(--ink-2)]">Создан: {formatDateTime(selected.createdAt)}</p>
                <p className="text-[14px] text-[var(--ink-2)]">Изменён: {formatDateTime(selected.updatedAt)}</p>
                <p className="text-[14px] text-[var(--ink-2)]">{selected.finalAmount ? `Итоговая стоимость: ${formatRub(selected.finalAmount)}` : `Предварительная стоимость: ${selected.amount ? formatRub(selected.amount) : selected.price}`}</p>
                {selected.comment && <p className="mt-3 whitespace-pre-wrap break-words border-t border-[var(--line)] pt-3 text-[15px] text-[var(--ink)]">Комментарий покупателя: {selected.comment}</p>}
                <div className="mt-4 border-t border-[var(--line)] pt-4 text-[15px] text-[var(--ink)]">
                  <p className="font-semibold">{selected.customer.fullName}</p>
                  {selected.customer.companyName && <p className="break-words">{selected.customer.companyName}</p>}
                  {selected.customer.inn && <p>ИНН: <span className="font-medium">{selected.customer.inn}</span></p>}
                  <p><a className="text-[var(--accent)] hover:underline" href={`tel:+${selected.customer.phone}`}>{formatPhone(selected.customer.phone)}</a></p>
                  {selected.customer.email && <p><a className="break-all text-[var(--accent)] hover:underline" href={`mailto:${selected.customer.email}`}>{selected.customer.email}</a></p>}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ACTIONS: Partial<Record<OrderStatus, Array<{ status: OrderStatus; label: string }>>> = {
  new: [{ status: 'in_progress', label: 'Взять в работу' }, { status: 'cancelled', label: 'Отменить заказ' }],
  in_progress: [{ status: 'completed', label: 'Работа выполнена' }, { status: 'cancelled', label: 'Отменить заказ' }],
  completed: [{ status: 'in_progress', label: 'Вернуть в работу' }, { status: 'cancelled', label: 'Отменить заказ' }],
  awaiting_payment: [{ status: 'completed', label: 'Отозвать оплату' }, { status: 'cancelled', label: 'Отменить заказ' }],
  paid: [{ status: 'closed', label: 'Закрыть заказ' }],
}

function AdminOrderControls({ order, onUpdated }: { order: AdminOrder; onUpdated: (change: Pick<AdminOrder, 'id' | 'status' | 'finalAmount' | 'updatedAt'>) => void }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setDraft(String(order.finalAmount ?? order.amount ?? ''))
    setError('')
    setNotice('')
  }, [order.id])

  async function saveAmount() {
    const value = draft.trim() === '' ? null : Number(draft.replace(/\s/g, ''))
    if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > 100_000_000)) {
      setError('Укажите сумму от 1 до 100 000 000 ₽')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { order: change } = await api.adminSetOrderAmount(order.id, value)
      onUpdated(change)
      setNotice(value === null ? 'Итоговая стоимость очищена' : 'Итоговая стоимость сохранена')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить стоимость')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`Отменить заказ № ${order.number}?`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { order: change } = await api.adminSetOrderStatus(order.id, status)
      onUpdated(change)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус')
    } finally {
      setBusy(false)
    }
  }

  async function issueInvoice() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { order: change } = await api.adminIssueOrderInvoice(order.id)
      onUpdated(change)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выставить оплату')
    } finally {
      setBusy(false)
    }
  }

  const editable = ['new', 'in_progress', 'completed'].includes(order.status)
  const draftAmount = draft.trim() === '' ? null : Number(draft.replace(/\s/g, ''))
  const hasUnsavedAmount = editable && draftAmount !== order.finalAmount

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-6">
      <h3 className="text-[18px] font-bold text-[var(--ink)]">Управление заказом</h3>
      <p className="text-[14px] text-[var(--ink-2)]">Текущий статус: <span className="font-semibold text-[var(--ink)]">{STATUS_LABELS[order.status]}</span></p>
      {editable && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[14px] font-semibold text-[var(--ink)]">
            Итоговая стоимость, ₽
            <input type="number" min="1" max="100000000" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={order.amount ? String(order.amount) : 'Введите сумму'} className="h-[44px] w-full min-w-0 rounded-[10px] border border-[var(--line)] px-3 text-[15px] font-normal outline-none focus:border-[var(--accent)]" />
          </label>
          <button type="button" onClick={saveAmount} disabled={busy} className="min-h-[44px] cursor-pointer rounded-[10px] border border-[var(--accent)] px-4 text-[14px] font-semibold text-[var(--accent)] disabled:opacity-50">Сохранить сумму</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {(ACTIONS[order.status] ?? []).map((action) => <button key={action.status} type="button" onClick={() => void setStatus(action.status)} disabled={busy} className="min-h-[42px] cursor-pointer rounded-[10px] border border-[var(--line)] px-4 text-[14px] font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50">{action.label}</button>)}
        {order.status === 'completed' && <button type="button" onClick={issueInvoice} disabled={busy || !order.finalAmount || hasUnsavedAmount} className="min-h-[42px] cursor-pointer rounded-[10px] bg-[var(--accent)] px-4 text-[14px] font-semibold text-white disabled:opacity-50">Выставить оплату</button>}
      </div>
      {order.status === 'completed' && (!order.finalAmount || hasUnsavedAmount) && <p className="text-[13px] text-[var(--ink-2)]">Сохраните итоговую стоимость, чтобы выставить оплату.</p>}
      {notice && <p role="status" className="text-[14px] text-[var(--accent)]">{notice}</p>}
      {error && <p role="alert" className="text-[14px] text-[var(--danger)]">{error}</p>}
    </section>
  )
}
