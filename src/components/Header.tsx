import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { NAV_ITEMS, ORDER_HREF } from '../lib/content'

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[#F4F6FBB8] backdrop-blur-[10px]">
      {/* Десктоп */}
      <div className="mx-auto hidden h-[72px] w-full max-w-[1200px] items-center justify-between lg:flex">
        <Logo className="h-[48px] w-[278px]" />

        <nav className="flex items-center gap-[28px]">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              {...linkProps(item.href)}
              className={cn(
                'cursor-pointer text-[15px] font-semibold whitespace-nowrap transition-colors',
                i === 0
                  ? 'text-[var(--accent)] hover:text-[#1d46d6]'
                  : 'text-[var(--ink)] hover:text-[var(--accent)]',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Button href={ORDER_HREF} size={44}>
          Оставить заявку
        </Button>
      </div>

      {/* Мобайл */}
      <div className="flex h-[64px] items-center justify-between px-5 lg:hidden">
        <Logo className="h-[36px] w-[208px]" sizes="208px" />

        <div className="flex items-center gap-2">
          <Button href={ORDER_HREF} size={40} className="text-[15px]">
            Заявка
          </Button>
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
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              {...linkProps(item.href)}
              onClick={() => setOpen(false)}
              className={cn(
                'cursor-pointer border-b border-[var(--line)] py-4 text-[16px] font-semibold last:border-b-0',
                i === 0 ? 'text-[var(--accent)]' : 'text-[var(--ink)]',
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
