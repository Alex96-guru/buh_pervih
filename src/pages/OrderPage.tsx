import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, Clock, CreditCard, FlaskConical, QrCode } from 'lucide-react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { OrderConversation } from '../components/OrderConversation'
import { OrderFiles } from '../components/OrderFiles'
import { SubmitButton } from '../components/auth/fields'
import { Button, Panel } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { CABINET_PATH, useRequireUser } from '../lib/auth'
import { CATALOG_PATH } from '../lib/catalog'
import { cn } from '../lib/cn'
import {
  PAYMENT_METHODS,
  STATUS_LABELS,
  formatDateTime,
  formatRub,
  isBasePrice,
  orderPath,
  withParentOrder,
} from '../lib/orders'
import type { Order, PaymentMethod, RelatedOrder } from '../lib/orders'

const METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  sbp: QrCode,
}

/** Заказ текущего пользователя. notFound — чужой или удалённый. */
function useOrder(id: string, enabled: boolean) {
  const [order, setOrder] = useState<Order | null>(null)
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([])
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    api
      .order(id)
      .then(({ order: next, relatedOrders: related }) => {
        if (!cancelled) {
          setOrder(next)
          setRelatedOrders(related)
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setNotFound(true)
        else setError(err instanceof Error ? err.message : 'Не удалось загрузить заказ')
      })

    return () => {
      cancelled = true
    }
  }, [id, enabled])

  return { order, setOrder, relatedOrders, error, notFound }
}

export function OrderPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const uploadError = (location.state as { uploadError?: string } | null)?.uploadError
  const user = useRequireUser()
  const { order, setOrder, relatedOrders, error, notFound } = useOrder(id, user !== null)

  useEffect(() => {
    if (order?.id !== id || location.hash !== '#conversation') return
    const frame = requestAnimationFrame(() => document.getElementById('conversation')?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [id, order?.id, location.hash])

  if (notFound) return <Navigate to={CABINET_PATH} replace />

  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-[72px] lg:px-[120px] lg:pt-12 lg:pb-[120px]">
        <div className="mx-auto w-full max-w-[720px]">
          {uploadError && <p role="alert" className="mb-5 rounded-[14px] border border-[var(--danger)] bg-white p-4 text-[14px] text-[var(--danger)]">{uploadError}</p>}
          {order ? (
            <OrderContent order={order} onChange={setOrder} relatedOrders={relatedOrders} currentUserId={user?.id ?? ''} isAdmin={user?.role === 'admin'} />
          ) : (
            <p
              role={error ? 'alert' : undefined}
              className={cn(
                'text-[17px]',
                error ? 'font-medium text-[var(--danger)]' : 'text-[var(--ink-2)]',
              )}
            >
              {error ? `Не удалось загрузить заказ: ${error}` : 'Загружаем…'}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function StatusBadge({ status }: { status: Order['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex h-[30px] w-fit items-center rounded-full px-3 text-[14px] font-semibold',
        status === 'paid' && 'bg-[#E3F5EA] text-[#1D7A45]',
        status === 'cancelled' && 'bg-[var(--page-bg)] text-[var(--ink-2)]',
        (status === 'awaiting_payment' || status === 'awaiting_price') &&
          'bg-[var(--accent-soft)] text-[var(--accent)]',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function OrderContent({ order, onChange, relatedOrders, currentUserId, isAdmin }: { order: Order; onChange: (order: Order) => void; relatedOrders: RelatedOrder[]; currentUserId: string; isAdmin: boolean }) {
  return (
    <div className="flex w-full flex-col gap-5 lg:gap-6">
      <div className="flex w-full flex-col gap-3">
        <StatusBadge status={order.status} />
        <h1 className="text-[32px] leading-[38px] font-bold text-[var(--ink)] lg:text-[44px] lg:leading-[52px]">
          {order.status === 'paid'
            ? 'Оплата прошла'
            : order.status === 'awaiting_payment'
              ? 'Оплата заказа'
              : `Заказ № ${order.number}`}
        </h1>
      </div>

      <Panel>
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold text-[var(--ink-2)]">
              Заказ № {order.number} · {formatDateTime(order.createdAt)}
            </span>
            <span className="text-[18px] leading-[26px] font-semibold text-[var(--ink)]">{order.serviceTitle}</span>
          </div>
          <span className="text-[28px] font-extrabold tracking-[-0.6px] whitespace-nowrap text-[var(--ink)]">
            {order.amount ? formatRub(order.amount) : order.price}
          </span>
        </div>
        {order.items.length > 1 && (
          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            {order.items.map((item) => (
              <div key={item.serviceSlug} className="flex justify-between gap-3 rounded-[12px] border border-[var(--line)] p-3 text-[15px]">
                <a href={`${CATALOG_PATH}/${item.serviceSlug}`} className="font-semibold text-[var(--ink)] hover:text-[var(--accent)]">{item.serviceTitle}</a>
                <span className="shrink-0 font-semibold">{item.price}</span>
              </div>
            ))}
          </div>
        )}
        {order.comment && (
          <p className="border-t border-[var(--line)] pt-3 text-[15px] leading-[22px] whitespace-pre-line text-[var(--ink-2)]">
            {order.comment}
          </p>
        )}
      </Panel>

      {(order.parentOrderId || relatedOrders.some((item) => item.id !== order.id)) && (
        <Panel title="Связанные заказы">
          {order.parentOrderId && (
            <a href={orderPath(order.parentOrderId)} className="text-[15px] font-semibold text-[var(--accent)] hover:underline">
              Исходный заказ № {order.parentOrderNumber ?? '—'}
            </a>
          )}
          {relatedOrders.filter((item) => item.id !== order.id).map((item) => (
            <a key={item.id} href={orderPath(item.id)} className="block text-[15px] font-semibold text-[var(--accent)] hover:underline">
              Дополнительный заказ № {item.number} · {item.serviceTitle} · {STATUS_LABELS[item.status]}
            </a>
          ))}
        </Panel>
      )}

      {order.status === 'awaiting_payment' && <PaymentForm order={order} onChange={onChange} />}
      {order.status === 'paid' && <PaidState order={order} />}
      {order.status === 'paid' && (
        <Button href={withParentOrder(CATALOG_PATH, order.parentOrderId ?? order.id)} className="w-full lg:w-fit">
          Добавить услугу
        </Button>
      )}
      {order.status === 'cancelled' ? (
        <OrderFiles orderId={order.id} currentUserId={currentUserId} isAdmin={isAdmin} readOnly />
      ) : (
        <OrderConversation orderId={order.id} currentUserId={currentUserId} isAdmin={isAdmin} />
      )}
      {order.status === 'awaiting_price' && (
        <StateNote icon={Clock} tone="accent">
          Заявка принята. Специалист изучит задачу, назовёт сумму и свяжется с вами в течение
          рабочего дня. Оплатить заказ можно будет здесь же.
        </StateNote>
      )}
      {order.status === 'cancelled' && (
        <>
          <StateNote icon={CircleX} tone="muted">
            Заказ отменён. Если передумали — оформите его заново со страницы услуги.
          </StateNote>
          <Button href={`${CATALOG_PATH}/${order.serviceSlug}`} className="w-full lg:w-fit">
            К услуге
          </Button>
        </>
      )}

      {order.status === 'awaiting_price' && <CancelLink order={order} onChange={onChange} />}
    </div>
  )
}

function StateNote({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Clock
  tone: 'accent' | 'muted'
  children: string
}) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-[10px] rounded-[16px] px-4 py-[14px]',
        tone === 'accent' ? 'bg-[var(--accent-soft)]' : 'border border-[var(--line)] bg-white',
      )}
    >
      <Icon
        size={20}
        className={cn(
          'mt-px shrink-0',
          tone === 'accent' ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]',
        )}
      />
      <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">{children}</p>
    </div>
  )
}

function PaymentForm({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  async function pay() {
    if (paying) return
    setPaying(true)
    setPayError('')
    try {
      const { order: next } = await api.payOrder(order.id, method)
      onChange(next)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Не удалось оплатить')
      setPaying(false)
    }
  }

  return (
    <>
      <Panel title="Способ оплаты">
        <div role="radiogroup" aria-label="Способ оплаты" className="flex w-full flex-col gap-3 lg:flex-row">
          {PAYMENT_METHODS.map((option) => {
            const Icon = METHOD_ICONS[option.value]
            const selected = option.value === method
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMethod(option.value)}
                className={cn(
                  'flex flex-1 cursor-pointer items-center gap-3 rounded-[16px] border-[1.5px] bg-white px-4 py-[14px] text-left transition-colors',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--line)] hover:border-[var(--ink-2)]',
                )}
              >
                <Icon
                  size={24}
                  className={cn('shrink-0', selected ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]')}
                />
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[16px] font-semibold text-[var(--ink)]">{option.title}</span>
                  <span className="text-[14px] text-[var(--ink-2)]">{option.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Пока эквайринг не подключён — честно предупреждаем, что это тест. */}
      <div className="flex w-full items-start gap-[10px] rounded-[16px] border border-dashed border-[#E0B441] bg-[#FFF8E6] px-4 py-[14px]">
        <FlaskConical size={20} className="mt-px shrink-0 text-[#A87A00]" />
        <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">
          Тестовый режим: оплата не списывает деньги, заказ просто отметится оплаченным.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <SubmitButton type="button" onClick={pay} disabled={paying}>
          {paying ? 'Оплачиваем…' : `Оплатить ${order.amount ? formatRub(order.amount) : ''}`}
        </SubmitButton>
        {payError && (
          <p role="alert" className="text-[14px] font-medium text-[var(--danger)]">
            {payError}
          </p>
        )}
        {isBasePrice(order.price) && (
          <p className="text-[14px] leading-[20px] text-[var(--ink-2)]">
            Это базовая стоимость. Если задача окажется сложнее, специалист согласует доплату до
            начала работы.
          </p>
        )}
        <CancelLink order={order} onChange={onChange} />
      </div>
    </>
  )
}

function PaidState({ order }: { order: Order }) {
  const method = PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)

  return (
    <>
      <div className="flex w-full items-start gap-[10px] rounded-[16px] bg-[#E3F5EA] px-4 py-[14px]">
        <CircleCheck size={20} className="mt-px shrink-0 text-[#1D7A45]" />
        <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">
          {order.paidAt ? `Оплачено ${formatDateTime(order.paidAt)}` : 'Оплачено'}
          {method ? ` · ${method.title.toLowerCase()}` : ''}
          {order.testPayment ? ' · тестовая оплата' : ''}
        </p>
      </div>

      <Panel title="Что дальше">
        <ol className="flex w-full list-decimal flex-col gap-2 pl-5 text-[16px] leading-[24px] text-[var(--ink)]">
          <li>Специалист свяжется с вами в течение рабочего дня.</li>
          <li>Пришлёт список документов и подскажет, где их взять.</li>
          <li>Сделает работу и пришлёт результат — статус виден в личном кабинете.</li>
        </ol>
      </Panel>

      <div className="flex w-full flex-col gap-3 lg:flex-row">
        <Button href={CABINET_PATH} className="w-full lg:w-fit">
          В личный кабинет
        </Button>
        <Button href={CATALOG_PATH} variant="secondary" className="w-full lg:w-fit">
          К услугам
        </Button>
      </div>
    </>
  )
}

function CancelLink({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelError, setCancelError] = useState('')

  async function cancel() {
    if (busy) return
    setBusy(true)
    setCancelError('')
    try {
      const { order: next } = await api.cancelOrder(order.id)
      onChange(next)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Не удалось отменить')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--line)] bg-white p-4">
          <p className="text-[15px] text-[var(--ink)]">Отменить заказ № {order.number}? Переписка закроется. Восстановить заказ самостоятельно не получится.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={cancel} disabled={busy} className="min-h-[40px] cursor-pointer rounded-[10px] bg-[var(--danger)] px-4 text-[14px] font-semibold text-white disabled:opacity-50">{busy ? 'Отменяем…' : 'Да, отменить'}</button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-[40px] cursor-pointer rounded-[10px] border border-[var(--line)] px-4 text-[14px] font-semibold text-[var(--ink)] disabled:opacity-50">Оставить заказ</button>
          </div>
        </div>
      ) : <button type="button" onClick={() => setConfirming(true)} className="w-fit cursor-pointer text-[15px] font-semibold text-[var(--ink-2)] transition-colors hover:text-[var(--danger)]">Отменить заказ</button>}
      {cancelError && (
        <p role="alert" className="text-[14px] font-medium text-[var(--danger)]">
          {cancelError}
        </p>
      )}
    </div>
  )
}
