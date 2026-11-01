/**
 * Заказы и оплата. Оплата пока тестовая: сервер сразу отмечает заказ
 * оплаченным, деньги не списываются.
 */

export type OrderStatus = 'awaiting_price' | 'awaiting_payment' | 'paid' | 'cancelled'

export type PaymentMethod = 'card' | 'sbp'

export type OrderItem = {
  serviceSlug: string
  serviceTitle: string
  price: string
  amount: number | null
}

export type Order = {
  id: string
  /** Номер для людей: «Заказ № 1001». */
  number: number
  parentOrderId: string | null
  parentOrderNumber: number | null
  serviceSlug: string
  serviceTitle: string
  items: OrderItem[]
  /** Цена из каталога на момент заказа — текстом, как на сайте. */
  price: string
  /** Сумма к оплате в рублях; null — цена «по запросу». */
  amount: number | null
  comment: string
  status: OrderStatus
  paymentMethod: PaymentMethod | null
  testPayment: boolean
  paidAt: string | null
  createdAt: string
}

export type RelatedOrder = {
  id: string
  number: number
  serviceTitle: string
  status: OrderStatus
}

export type OrderMessage = {
  id: string
  senderId: string
  senderName: string
  senderRole: 'client' | 'admin'
  body: string
  createdAt: string
}

export type OrderDialog = {
  orderId: string
  number: number
  serviceTitle: string
  lastMessage: string | null
  lastMessageAt: string | null
  lastSenderName: string | null
  unreadCount: number
}

export type OrderFile = {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedBy: string | null
  uploadedByName: string | null
  createdAt: string
}

export type AdminOrder = {
  id: string
  number: number
  parentOrderId: string | null
  parentOrderNumber: number | null
  serviceTitle: string
  items: OrderItem[]
  amount: number | null
  price: string
  comment: string
  status: OrderStatus
  paidAt: string | null
  createdAt: string
  customer: {
    fullName: string
    email: string | null
    phone: string
    clientType: 'ip' | 'ooo' | 'person'
    companyName: string | null
    inn: string | null
  }
}

/** Оформление заказа на услугу: /checkout/<slug> */
export const checkoutPath = (slug: string) => `/checkout/${slug}`

/** Оплата и статус заказа: /orders/<id> */
export const orderPath = (id: string) => `/orders/${id}`

/** Сохраняет исходный заказ при переходе через каталог и оформление. */
export const withParentOrder = (path: string, parentOrderId: string | null) =>
  parentOrderId ? `${path}?from=${encodeURIComponent(parentOrderId)}` : path

export const parseOrderCart = (value: string | null): string[] =>
  [...new Set((value ?? '').split(',').filter((item) => /^[a-z0-9-]{1,160}$/.test(item)))].slice(0, 10)

export function withOrderCart(path: string, parentOrderId: string | null, slugs: string[]): string {
  const params = new URLSearchParams()
  if (parentOrderId) params.set('from', parentOrderId)
  if (parentOrderId && slugs.length) params.set('items', [...new Set(slugs)].slice(0, 10).join(','))
  return params.size ? `${path}?${params}` : path
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_price: 'Ждёт расчёта',
  awaiting_payment: 'Ждёт оплаты',
  paid: 'Оплачен',
  cancelled: 'Отменён',
}

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; title: string; hint: string }> = [
  { value: 'card', title: 'Банковской картой', hint: 'Мир, Visa, Mastercard' },
  { value: 'sbp', title: 'По СБП', hint: 'Через приложение вашего банка' },
]

/** 1900 → «1 900 ₽». */
export function formatRub(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`
}

/** «от 3 000 ₽» — базовая цена: если задача сложнее, сумма может вырасти. */
export function isBasePrice(price: string): boolean {
  return /^\s*от\s/i.test(price)
}

/** «26 октября 2026, 14:05». */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
