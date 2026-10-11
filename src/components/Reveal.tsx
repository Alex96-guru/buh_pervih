import { useEffect, useRef, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

/**
 * Плавное появление при скролле. Возвращает ref и классы, которые вешаются
 * на уже существующий элемент — чтобы не добавлять лишних обёрток в раскладку.
 */
export function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Без IntersectionObserver просто показываем сразу.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return {
    ref,
    revealClass: cn('reveal', shown && 'reveal-in'),
    revealStyle: delay ? { animationDelay: `${delay}ms` } : undefined,
  }
}

/**
 * Готовый div с появлением — ставится вместо обычного div у элементов списков,
 * поэтому структура и классы остаются прежними.
 */
export function RevealDiv({
  delay = 0,
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'div'> & { delay?: number }) {
  const { ref, revealClass, revealStyle } = useReveal<HTMLDivElement>(delay)

  return (
    <div ref={ref} className={cn(revealClass, className)} style={revealStyle} {...rest}>
      {children}
    </div>
  )
}
