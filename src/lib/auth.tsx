import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'
import type { ApiUser, ClientType } from './api'

export type { ClientType }
export type AuthUser = ApiUser

/** Куда попадает авторизованный пользователь. */
export const CABINET_PATH = '/cabinet'
export const ADMIN_PATH = '/admin'

/** Инициалы для кружка в шапке: «Ольга Попонина» → «ОП». */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

/**
 * Куда вернуть после входа. Хранится во вкладке, а не в адресе: человек может
 * перейти со входа на регистрацию, и путь не должен потеряться.
 */
const RETURN_KEY = 'bp_return_to'

function rememberReturnPath(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, path)
  } catch {
    // Хранилище недоступно (приватный режим) — после входа просто попадём в кабинет.
  }
}

function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    // Только адреса своего сайта: «//evil.com» тоже начинается со слеша.
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null
  } catch {
    return null
  }
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  /** true, пока проверяем текущую сессию: до этого судить об авторизации рано. */
  loading: boolean
  signedIn: (user: AuthUser) => void
  signOut: () => Promise<void>
  onOrderClick: (event: MouseEvent) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // При загрузке спрашиваем сервер, есть ли живая сессия в cookie.
  useEffect(() => {
    let cancelled = false

    api
      .me()
      .then(({ user: me }) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Вызывается формами после успешного ответа сервера. Если человека прислала
   * на вход кнопка заказа — возвращаем туда, откуда он пришёл.
   */
  const signedIn = useCallback(
    (next: AuthUser) => {
      setUser(next)
      const back = takeReturnPath()
      navigate(back ?? (next.role === 'admin' ? ADMIN_PATH : CABINET_PATH), { replace: true })
    },
    [navigate],
  )

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      navigate('/', { replace: true })
    }
  }, [navigate])

  const onOrderClick = useCallback(
    (event: MouseEvent) => {
      if (user) return

      event.preventDefault()
      rememberReturnPath(window.location.pathname + window.location.hash)
      navigate('/login')
    },
    [user, navigate],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      loading,
      signedIn,
      signOut,
      onOrderClick,
    }),
    [user, loading, signedIn, signOut, onOrderClick],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider')
  return ctx
}
