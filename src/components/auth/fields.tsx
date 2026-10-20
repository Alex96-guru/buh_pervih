import { useId, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/cn'

const inputBase =
  'h-[48px] w-full rounded-[12px] border bg-white px-[14px] text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-2)] transition-colors outline-none'

function borderFor(error?: string) {
  return error
    ? 'border-[var(--danger)] focus:border-[var(--danger)]'
    : 'border-[var(--line)] focus:border-[var(--accent)]'
}

function ErrorText({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} role="alert" className="text-[13px] font-medium text-[var(--danger)]">
      {children}
    </span>
  )
}

/** Поле ввода по компоненту «Поле ввода» из дизайн-системы. */
export function Field({
  label,
  optional,
  error,
  className,
  ...rest
}: ComponentPropsWithoutRef<'input'> & {
  label: string
  optional?: boolean
  error?: string
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <div className="flex items-center gap-[6px]">
        <label htmlFor={id} className="text-[14px] font-semibold text-[var(--ink)]">
          {label}
        </label>
        {optional && (
          <span className="text-[13px] font-semibold text-[var(--ink-2)]">необязательно</span>
        )}
      </div>

      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputBase, borderFor(error), className)}
        {...rest}
      />

      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  )
}

/** Многострочное поле в том же стиле, что и Field. */
export function TextArea({
  label,
  optional,
  error,
  className,
  ...rest
}: ComponentPropsWithoutRef<'textarea'> & {
  label: string
  optional?: boolean
  error?: string
}) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <div className="flex items-center gap-[6px]">
        <label htmlFor={id} className="text-[14px] font-semibold text-[var(--ink)]">
          {label}
        </label>
        {optional && (
          <span className="text-[13px] font-semibold text-[var(--ink-2)]">необязательно</span>
        )}
      </div>

      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full resize-y rounded-[12px] border bg-white px-[14px] py-3 text-[16px] leading-[24px] text-[var(--ink)] transition-colors outline-none placeholder:text-[var(--ink-2)]',
          borderFor(error),
          className,
        )}
        {...rest}
      />

      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  )
}

/** Пароль с глазком: тип поля переключается, значение не теряется. */
export function PasswordField({
  label,
  error,
  className,
  ...rest
}: ComponentPropsWithoutRef<'input'> & { label: string; error?: string }) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <label htmlFor={id} className="text-[14px] font-semibold text-[var(--ink)]">
        {label}
      </label>

      <div className="relative w-full">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputBase, borderFor(error), 'pr-[46px]', className)}
          {...rest}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          // Не в табуляции: при переходе с поля пароля ожидают кнопку, а не глазок.
          tabIndex={-1}
          className="absolute top-0 right-0 flex h-[48px] w-[46px] cursor-pointer items-center justify-center text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  )
}

/** Переключатель «Кто вы» — как сегменты в панели подбора. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex w-full flex-col gap-[6px]">
      {label && <span className="text-[14px] font-semibold text-[var(--ink)]">{label}</span>}

      <div role="tablist" className="flex w-full gap-1 rounded-[12px] bg-[var(--page-bg)] p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-[40px] flex-1 cursor-pointer rounded-[9px] text-[15px] font-semibold transition-colors',
              option.value === value
                ? 'bg-[var(--ink)] text-white'
                : 'text-[var(--ink)] hover:bg-[#e7ebf5]',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Тёмная кнопка формы, высота 56 как в макете. */
export function SubmitButton({ children, className, ...rest }: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="submit"
      className={cn(
        'flex h-[56px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-[var(--ink)] px-7',
        'text-[16px] font-bold text-white transition-colors hover:bg-[#1a2740]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
