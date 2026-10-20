import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { UserMenu } from './auth/UserMenu'
import { Button } from './ui'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { NAV_ITEMS, ORDER_HREF } from '../lib/content'

export function Header() {
  const [open, setOpen] = useState(false)
  const { onOrderClick, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  // Подсвечиваем пункт, ведущий на текущую страницу (якоря главной — нет).
  const isCurrent = (href: string) => href === pathname

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[#F4F6FBB8] backdrop-blur-[10px]">
      {/* Десктоп */}
      <div className="mx-auto hidden h-[72px] w-full max-w-[1200px] items-center justify-between lg:flex">
        <Logo className="h-[48px] w-[278px]" />

        <nav className="flex items-center gap-[28px]">
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
          <Button href={ORDER_HREF} size={44} onClick={onOrderClick}>
            Оставить заявку
          </Button>
        )}
      </div>

      {/* Мобайл */}
      <div className="flex h-[64px] items-center justify-between px-5 lg:hidden">
        <Logo className="h-[36px] w-[208px]" sizes="208px" />

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <UserMenu size={36} />
          ) : (
            <Button href={ORDER_HREF} size={40} className="text-[15px]" onClick={onOrderClick}>
              Заявка
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
