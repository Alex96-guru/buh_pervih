import type { ReactNode } from 'react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'

/**
 * Общая обвязка страниц входа и регистрации: шапка, секция на сером фоне,
 * футер. Отступы как в макете — 72/120 на десктопе и 48/20 на мобайле.
 */
export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--surface)]">
      <Header />

      <main className="flex flex-1 flex-col items-center bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      <Footer />
    </div>
  )
}
