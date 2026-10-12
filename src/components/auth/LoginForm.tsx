import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, PasswordField, SubmitButton } from './fields'
import { useAuth } from '../../lib/auth'
import { formatPhone, validateLogin, validatePassword } from '../../lib/validation'

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { signIn } = useAuth()

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const next: typeof errors = {}
    const loginError = validateLogin(login)
    if (loginError) next.login = loginError

    const passwordError = validatePassword(password)
    if (passwordError) next.password = passwordError

    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Бэкенда нет: пароль не проверяется, вход живёт только в памяти вкладки.
    signIn({
      id: 'local',
      fullName: login.includes('@') ? login.split('@')[0] : 'Личный кабинет',
      email: login.includes('@') ? login.trim() : null,
      clientType: 'ip',
    })
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-[10px] text-center">
        <h2 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">Вход</h2>
        <p className="text-[16px] text-[var(--ink-2)] lg:text-[17px]">
          Личный кабинет: заявки, документы и статусы
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full flex-col items-start gap-[18px] rounded-[20px] border border-[var(--line)] bg-white p-6 lg:w-[440px] lg:p-8"
      >
        <Field
          label="Телефон или почта"
          value={login}
          onChange={(e) => {
            const raw = e.target.value
            // Телефон форматируем, почту оставляем как есть.
            const looksLikePhone = raw.length > 0 && !/[a-zA-Zа-яА-Я@]/.test(raw)
            setLogin(looksLikePhone ? formatPhone(raw) : raw)
            setErrors((prev) => (prev.login ? { ...prev, login: undefined } : prev))
          }}
          autoComplete="username"
          placeholder="+7 или you@mail.ru"
          error={errors.login}
        />

        <div className="flex w-full flex-col gap-2">
          <PasswordField
            label="Пароль"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((prev) => (prev.password ? { ...prev, password: undefined } : prev))
            }}
            autoComplete="current-password"
            placeholder="Введите пароль"
            error={errors.password}
          />
          <button
            type="button"
            className="w-fit cursor-pointer text-[14px] font-semibold text-[var(--accent)] hover:underline"
          >
            Забыли пароль?
          </button>
        </div>

        <SubmitButton>Войти</SubmitButton>

        <div className="flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-[13px] text-[var(--ink-2)]">или</span>
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <button
          type="button"
          className="flex h-[56px] w-full cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] border-[#B9C3D6] bg-[#FFFFFF99] px-7 text-[16px] font-bold text-[var(--ink)] transition-colors hover:bg-white"
        >
          Получить код в Telegram
        </button>
      </form>

      <p className="flex items-center gap-[6px] text-[15px] text-[var(--ink-2)]">
        Нет аккаунта?
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="cursor-pointer text-[15px] font-bold text-[var(--accent)] hover:underline"
        >
          Зарегистрироваться
        </button>
      </p>
    </div>
  )
}
