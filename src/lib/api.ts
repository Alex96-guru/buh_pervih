import type { Service } from './catalog'
import type { AdminOrder, Order, OrderDialog, OrderFile, OrderMessage, PaymentMethod, RelatedOrder } from './orders'

export type ClientType = 'ip' | 'ooo' | 'person'

/** Всё, что админ заполняет в форме услуги; адрес сервер придумает сам. */
export type ServicePayload = Omit<Service, 'id' | 'slug'>

export type ApiUser = {
  id: string
  fullName: string
  email: string | null
  phone: string
  clientType: ClientType
  role: 'client' | 'admin'
  emailVerified: boolean
}

export type AdminUser = ApiUser & {
  companyName: string | null
  inn: string | null
  createdAt: string
}

/** Ошибка с текстом для пользователя и полем, к которому её привязать. */
export class ApiError extends Error {
  field?: string
  status: number
  needsEmailVerification?: boolean

  constructor(message: string, status: number, field?: string, needsEmailVerification?: boolean) {
    super(message)
    this.status = status
    this.field = field
    this.needsEmailVerification = needsEmailVerification
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      // Без этого cookie сессии не уйдёт и не вернётся.
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new ApiError('Сервер недоступен. Проверьте соединение', 0)
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      data?.error ?? 'Что-то пошло не так',
      response.status,
      data?.field,
      data?.needsEmailVerification,
    )
  }

  return data as T
}

export async function uploadOrderFile(orderId: string, file: File): Promise<OrderFile> {
  let response: Response
  try {
    response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/files`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-File-Type': file.type || 'application/octet-stream',
      },
      body: file,
    })
  } catch {
    throw new ApiError('Не удалось загрузить файл. Проверьте соединение', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error ?? 'Не удалось загрузить файл', response.status)
  return data.file as OrderFile
}

export type RegisterPayload = {
  fullName: string
  email: string
  phone: string
  password: string
  clientType: ClientType
  companyName?: string
  inn?: string
}

export const api = {
  me: () => request<{ user: ApiUser }>('/api/auth/me'),

  register: (payload: RegisterPayload) =>
    request<{ user: ApiUser; needsEmailVerification?: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (login: string, password: string) =>
    request<{ user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  services: () => request<{ services: Service[] }>('/api/services'),

  service: (slug: string) =>
    request<{ service: Service }>(`/api/services/${encodeURIComponent(slug)}`),

  orders: () => request<{ orders: Order[] }>('/api/orders'),

  orderDialogs: () => request<{ dialogs: OrderDialog[] }>('/api/orders/dialogs'),

  markOrderMessagesRead: (id: string) =>
    request<void>(`/api/orders/${encodeURIComponent(id)}/messages/read`, { method: 'POST' }),

  order: (id: string) => request<{ order: Order; relatedOrders: RelatedOrder[] }>(`/api/orders/${encodeURIComponent(id)}`),

  orderMessages: (id: string) =>
    request<{ messages: OrderMessage[] }>(`/api/orders/${encodeURIComponent(id)}/messages`),

  orderFiles: (id: string) =>
    request<{ files: OrderFile[] }>(`/api/orders/${encodeURIComponent(id)}/files`),

  deleteOrderFile: (orderId: string, fileId: string) =>
    request<void>(`/api/orders/${encodeURIComponent(orderId)}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' }),

  sendOrderMessage: (id: string, body: string) =>
    request<{ message: OrderMessage }>(`/api/orders/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  createOrder: (slug: string, comment: string, parentOrderId?: string, services?: string[]) =>
    request<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ slug, comment, parentOrderId, services }),
    }),

  payOrder: (id: string, method: PaymentMethod) =>
    request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/pay`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),

  cancelOrder: (id: string) =>
    request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),

  adminCreateService: (payload: ServicePayload) =>
    request<{ service: Service }>('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateService: (id: string, payload: ServicePayload) =>
    request<{ service: Service }>(`/api/admin/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminDeleteService: (id: string) =>
    request<void>(`/api/admin/services/${id}`, { method: 'DELETE' }),

  adminUsers: (search = '') =>
    request<{ total: number; users: AdminUser[] }>(
      `/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),

  adminOrders: (offset = 0) =>
    request<{ total: number; orders: AdminOrder[] }>(`/api/admin/orders?limit=50&offset=${offset}`),
}
