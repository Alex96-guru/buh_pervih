import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'

type SectionTone = 'page' | 'surface' | 'ink'

const sectionTone: Record<SectionTone, string> = {
  page: 'bg-[var(--page-bg)]',
  surface: 'bg-[var(--surface)]',
  ink: 'bg-[var(--ink)]',
}

/** Секция страницы: мобайл 72/20, десктоп 120/120 (как в макете). */
export function Section({
  tone = 'surface',
  className,
  innerClassName,
  children,
  ...rest
}: ComponentPropsWithoutRef<'section'> & {
  tone?: SectionTone
  innerClassName?: string
}) {
  return (
    <section
      className={cn('w-full px-5 py-[72px] lg:px-[120px] lg:py-[120px]', sectionTone[tone], className)}
      {...rest}
    >
      <div className={cn('mx-auto w-full max-w-[1200px]', innerClassName)}>{children}</div>
    </section>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'onDark'

const buttonVariant: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--ink)] text-white hover:bg-[#1a2740]',
  secondary:
    'bg-[#FFFFFF99] text-[var(--ink)] border-[1.5px] border-[#B9C3D6] hover:bg-white hover:border-[#9fabc4]',
  onDark: 'bg-white text-[var(--ink)] hover:bg-[#eef1f8]',
}

export function Button({
  variant = 'primary',
  size = 56,
  href,
  className,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  variant?: ButtonVariant
  size?: 40 | 44 | 56
  href?: string
}) {
  const sizing =
    size === 56 ? 'h-[56px] px-7' : size === 44 ? 'h-[44px] px-5' : 'h-[40px] px-4'

  return (
    <a
      {...linkProps(href)}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-[16px] font-bold whitespace-nowrap transition-colors',
        sizing,
        buttonVariant[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  )
}

/** Заголовок секции: мобайл 32, десктоп 40. */
export function SectionTitle({
  children,
  className,
  tone = 'ink',
}: {
  children: ReactNode
  className?: string
  tone?: 'ink' | 'light'
}) {
  return (
    <h2
      className={cn(
        'text-[32px] font-bold lg:text-[40px]',
        tone === 'ink' ? 'text-[var(--ink)]' : 'text-white',
        className,
      )}
    >
      {children}
    </h2>
  )
}

/** Подзаголовок секции: мобайл 18/27, десктоп 20/30, medium. */
export function SectionLead({
  children,
  className,
  tone = 'ink',
}: {
  children: ReactNode
  className?: string
  tone?: 'ink' | 'muted' | 'light'
}) {
  return (
    <p
      className={cn(
        'text-[18px] leading-[27px] font-medium lg:text-[20px] lg:leading-[30px]',
        tone === 'ink' && 'text-[var(--ink)]',
        tone === 'muted' && 'text-[var(--ink-2)]',
        tone === 'light' && 'text-[#C3CBDC]',
        className,
      )}
    >
      {children}
    </p>
  )
}
