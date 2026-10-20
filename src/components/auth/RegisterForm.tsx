import { useState } from 'react'
import type { FormEvent } from 'react'
import { MailCheck } from 'lucide-react'
import { Field, PasswordField, Segmented, SubmitButton } from './fields'
import { useAuth } from '../../lib/auth'
import { ApiError, api } from '../../lib/api'
import type { ClientType } from '../../lib/api'
import {
  formatPhone,
  phoneDigits,
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

type Field_ = 'companyName' | 'inn' | 'fullName' | 'phone' | 'email' | 'password'
type Errors = Partial<Record<Field_, string>>

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signedIn } = useAuth()

  const [clientType, setClientType] = useState<ClientType>('ip')
  const [companyName, setCompanyName] = useState('')
  const [inn, setInn] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState('')

  function validate(): Errors {
    const next: Errors = {}

    if (clientType === 'ooo') {
      const company = validateCompany(companyName)
      if (company) next.companyName = company

      const companyInn = validateInn(inn, 10, true)
      if (companyInn) next.inn = companyInn
    }

    if (clientType === 'ip') {
      const ipInn = validateInn(inn, 12, false)
      if (ipInn) next.inn = ipInn
    }

    const name = validateName(fullName)
    if (name) next.fullName = name

    const tel = validatePhone(phone)
    if (tel) next.phone = tel

    // Почта обязательна: на неё приходит подтверждение, без него нет входа.
    const mail = validateEmail(email, true)
    if (mail) next.email = mail

    const pass = validatePassword(password)
    if (pass) next.password = pass

    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    try {
      const result = await api.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phoneDigits(phone),
        password,
        clientType,
        companyName: companyName.trim() || undefined,
        inn: inn || undefined,
      })

      if (result.needsEmailVerification) {
        setSentTo(email.trim())
      } else {
        signedIn(result.user)
      }
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message })
      } else {
        setFormError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
      }
    } finally {
      setSending(false)
    }
  }

  function clear(field: Field_) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  if (sentTo) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-4 rounded-[20px] border border-[var(--line)] bg-white p-8 text-center">
          <MailCheck size={40} className="text-[var(--accent)]" />
          <h2 className="text-[24px] font-bold text-[var(--ink)]">Подтвердите почту</h2>
          <p className="text-[16px] leading-[24px] text-[var(--ink-2)]">
            Отправили письмо на <span className="font-semibold text-[var(--ink)]">{sentTo}</span>.
            Перейдите по ссылке из него — она действует сутки. После этого можно войти.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="cursor-pointer text-[15px] font-bold text-[var(--accent)] hover:underline"
        >
          Перейти ко входу
        </button>
      </div>
    )
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

        {formError && (
          <p role="alert" className="text-[14px] font-medium text-[var(--danger)]">
            {formError}
          </p>
        )}

        <SubmitButton disabled={sending}>
          {sending ? 'Отправляем…' : 'Зарегистрироваться'}
        </SubmitButton>

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
