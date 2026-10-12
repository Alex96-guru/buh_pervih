import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

export type ClientType = 'ip' | 'ooo' | 'person'

export type AuthUser = {
  id: string
  fullName: string
  email: string | null
  clientType: ClientType
}

export type AuthModalMode = 'login' | 'register'

/** Инициалы для кружка в шапке: «Ольга Попонина» → «ОП». */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  modal: AuthModalMode | null
  signIn: (user: AuthUser) => void
  signOut: () => void
  openLogin: () => void
  openRegister: () => void
  closeModal: () => void
  /**
   * Обработчик для кнопок «Оставить заявку» и карточек услуг.
   * Неавторизованного уводим в регистрацию вместо перехода по ссылке.
   */
  onOrderClick: (event: MouseEvent) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * ЗАГЛУШКА: бэкенда ещё нет, поэтому вход существует только в памяти вкладки
   * и исчезает при обновлении страницы. Пароль никуда не отправляется и
   * не проверяется. Когда появится API, signIn заменится запросом к нему,
   * а начальное состояние — запросом текущей сессии.
   */
  const [user, setUser] = useState<AuthUser | null>(null)
  const [modal, setModal] = useState<AuthModalMode | null>(null)

  const openLogin = useCallback(() => setModal('login'), [])
  const openRegister = useCallback(() => setModal('register'), [])
  const closeModal = useCallback(() => setModal(null), [])

  const signIn = useCallback((next: AuthUser) => {
    setUser(next)
    setModal(null)
  }, [])

  const signOut = useCallback(() => setUser(null), [])

  const onOrderClick = useCallback(
    (event: MouseEvent) => {
      if (user) return

      // Гасим переход: вместо заявки показываем регистрацию.
      event.preventDefault()
      setModal('register')
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      modal,
      signIn,
      signOut,
      openLogin,
      openRegister,
      closeModal,
      onOrderClick,
    }),
    [user, modal, signIn, signOut, openLogin, openRegister, closeModal, onOrderClick],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider')
  return ctx
}
