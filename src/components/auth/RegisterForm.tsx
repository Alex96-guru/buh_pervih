import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, PasswordField, Segmented, SubmitButton } from './fields'
import { useAuth } from '../../lib/auth'
import type { ClientType } from '../../lib/auth'
import {
  formatPhone,
  validateCompany,
  validateEmail,
  validateInn,
  validateName,
  validatePassword,
  validatePhone,
} from '../../lib/validation'

const TYPES: Array<{ value: ClientType; label: string }> = [
  { value: 'ip', label: 'ИП' },
  { value: 'ooo', label: 'ООО' },
  { value: 'person', label: 'Физлицо' },
]

type Errors = Partial<Record<'companyName' | 'inn' | 'fullName' | 'phone' | 'email' | 'password', string>>

/**
 * Три варианта формы из макета различаются только набором полей,
 * поэтому это одна форма с переключателем, а не три отдельные.
 */
export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signIn } = useAuth()

  const [clientType, setClientType] = useState<ClientType>('ip')
  const [companyName, setCompanyName] = useState('')
  const [inn, setInn] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  function validate(): Errors {
    const next: Errors = {}

    if (clientType === 'ooo') {
      const company = validateCompany(companyName)
      if (company) next.companyName = company

      const companyInn = validateInn(inn, 10, true)
      if (companyInn) next.inn = companyInn
    }

    if (clientType === 'ip') {
      // У ИП ИНН необязателен, но если введён — должен быть полным.
      const ipInn = validateInn(inn, 12, false)
      if (ipInn) next.inn = ipInn
    }

    const name = validateName(fullName)
    if (name) next.fullName = name

    const tel = validatePhone(phone)
    if (tel) next.phone = tel

    const mail = validateEmail(email)
    if (mail) next.email = mail

    const pass = validatePassword(password)
    if (pass) next.password = pass

    return next
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    // Бэкенда нет: вход существует только в памяти вкладки.
    signIn({
      id: 'local',
      fullName: fullName.trim(),
      email: email.trim() || null,
      clientType,
    })
  }

  /** Убираем ошибку поля, как только его начали править. */
  function clear(field: keyof Errors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-[10px] text-center">
        <h2 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">Регистрация</h2>
        <p className="text-[16px] text-[var(--ink-2)] lg:text-[17px]">
          Создайте аккаунт, чтобы отправлять заявки и следить за статусом
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full flex-col items-start gap-[18px] rounded-[20px] border border-[var(--line)] bg-white p-6 lg:w-[440px] lg:p-8"
      >
        <Segmented
          label="Кто вы"
          value={clientType}
          options={TYPES}
          onChange={(next) => {
            setClientType(next)
            setErrors({})
            setInn('')
            setCompanyName('')
          }}
        />

        {clientType === 'ooo' && (
          <>
            <Field
              label="Название компании"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                clear('companyName')
              }}
              placeholder="ООО «Ромашка»"
              error={errors.companyName}
            />
            <Field
              label="ИНН компании"
              value={inn}
              onChange={(e) => {
                setInn(e.target.value.replace(/\D/g, '').slice(0, 10))
                clear('inn')
              }}
              placeholder="10 цифр"
              inputMode="numeric"
              error={errors.inn}
            />
          </>
        )}

        <Field
          label="Ваше имя"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            clear('fullName')
          }}
          autoComplete="name"
          placeholder={clientType === 'ooo' ? 'Контактное лицо' : 'Как к вам обращаться'}
          error={errors.fullName}
        />

        {clientType === 'ip' && (
          <Field
            label="ИНН"
            value={inn}
            onChange={(e) => {
              setInn(e.target.value.replace(/\D/g, '').slice(0, 12))
              clear('inn')
            }}
            placeholder="12 цифр"
            inputMode="numeric"
            optional
            error={errors.inn}
          />
        )}

        <Field
          label="Телефон"
          value={phone}
          onChange={(e) => {
            setPhone(formatPhone(e.target.value))
            clear('phone')
          }}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+7 900 000-00-00"
          error={errors.phone}
        />

        <Field
          label="Почта"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            clear('email')
          }}
          type="email"
          autoComplete="email"
          placeholder="you@mail.ru"
          optional
          error={errors.email}
        />

        <PasswordField
          label="Пароль"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            clear('password')
          }}
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          error={errors.password}
        />

        <SubmitButton>Зарегистрироваться</SubmitButton>

        <p className="w-full text-[14px] leading-[20px] text-[var(--ink-2)]">
          Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
        </p>
      </form>

      <p className="flex items-center gap-[6px] text-[15px] text-[var(--ink-2)]">
        Уже есть аккаунт?
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="cursor-pointer text-[15px] font-bold text-[var(--accent)] hover:underline"
        >
          Войти
        </button>
      </p>
    </div>
  )
}
