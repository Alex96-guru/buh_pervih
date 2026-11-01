import { useState } from 'react'
import { FilePlus2, Menu, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { UserMenu } from './auth/UserMenu'
import { Button } from './ui'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { NAV_ITEMS } from '../lib/content'

export function Header() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  // Подсвечиваем пункт, ведущий на текущую страницу (якоря главной — нет).
  const isCurrent = (href: string) => href === pathname

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[#F4F6FBB8] backdrop-blur-[10px]">
      {/* Десктоп */}
      <div className="mx-auto hidden h-[72px] w-full max-w-[1200px] items-center justify-between px-5 lg:flex xl:px-0">
        <Logo className="h-[42px] w-[238px] xl:h-[48px] xl:w-[278px]" />

        <nav className="flex items-center gap-4 xl:gap-[28px]">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              {...linkProps(item.href)}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={cn(
                'cursor-pointer text-[15px] font-semibold whitespace-nowrap transition-colors hover:text-[var(--accent)]',
                isCurrent(item.href) ? 'text-[var(--accent)]' : 'text-[var(--ink)]',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <a href="/login" aria-current={pathname === '/login' ? 'page' : undefined} className="text-[15px] font-semibold text-[var(--ink)] transition-colors hover:text-[var(--accent)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Войти</a>
            <Button href="/services" size={44}>Оставить заявку</Button>
          </div>
        )}
      </div>

      {/* Мобайл */}
      <div className="flex h-[64px] items-center justify-between px-5 lg:hidden">
        <Logo className="h-[31px] w-[180px] min-[380px]:h-[36px] min-[380px]:w-[208px]" sizes="(max-width: 379px) 180px, 208px" />

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <UserMenu size={36} />
          ) : (
            <Button href="/services" size={40} aria-label="Оставить заявку" className="text-[15px] max-[379px]:w-[40px] max-[379px]:!px-0">
              <FilePlus2 size={19} aria-hidden="true" className="hidden max-[379px]:block" />
              <span className="max-[379px]:hidden">Заявка</span>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] text-[var(--ink)]"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-[var(--line)] bg-[var(--page-bg)] px-5 py-2 lg:hidden">
          {!isAuthenticated && (
            <a
              href="/login"
              onClick={() => setOpen(false)}
              aria-current={pathname === '/login' ? 'page' : undefined}
              className={cn(
                'cursor-pointer border-b border-[var(--line)] py-4 text-[16px] font-semibold transition-colors hover:text-[var(--accent)]',
                pathname === '/login' ? 'text-[var(--accent)]' : 'text-[var(--ink)]',
              )}
            >
              Войти в кабинет
            </a>
          )}
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              {...linkProps(item.href)}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={cn(
                'cursor-pointer border-b border-[var(--line)] py-4 text-[16px] font-semibold transition-colors last:border-b-0 hover:text-[var(--accent)]',
                isCurrent(item.href) ? 'text-[var(--accent)]' : 'text-[var(--ink)]',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
