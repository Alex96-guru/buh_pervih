import { useEffect, useRef, useState } from 'react'
import { LogOut, MessagesSquare } from 'lucide-react'
import { initialsOf, useAuth } from '../../lib/auth'
import { cn } from '../../lib/cn'

/** Кружок с инициалами и меню аккаунта. Показывается только авторизованным. */
export function UserMenu({ size = 40 }: { size?: 36 | 40 }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const itemClass =
    'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold transition-colors'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню аккаунта"
        className={cn(
          'flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--ink)]',
          'text-[15px] font-bold text-white transition-opacity hover:opacity-85',
          size === 40 ? 'h-10 w-10' : 'h-9 w-9 text-[14px]',
        )}
      >
        {initialsOf(user.fullName)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-[240px] overflow-hidden rounded-[14px] border border-[var(--line)] bg-white shadow-[0_14px_40px_rgba(11,18,32,0.14)]"
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="truncate text-[15px] font-bold text-[var(--ink)]">{user.fullName}</p>
            {user.email && (
              <p className="truncate text-[13px] text-[var(--ink-2)]">{user.email}</p>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(itemClass, 'text-[var(--ink)] hover:bg-[var(--page-bg)]')}
          >
            <MessagesSquare size={18} className="shrink-0 text-[var(--ink-2)]" />
            Мои диалоги
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className={cn(
              itemClass,
              'border-t border-[var(--line)] text-[var(--danger)] hover:bg-[#fdf2f2]',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  )
}
