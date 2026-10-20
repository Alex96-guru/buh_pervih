import type { Service } from './catalog'

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
}
