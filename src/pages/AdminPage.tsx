import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminServices } from '../components/admin/AdminServices'
import { AdminUsers } from '../components/admin/AdminUsers'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'

const TABS = [
  { id: 'services', label: 'Услуги' },
  { id: 'users', label: 'Пользователи' },
] as const

type TabId = (typeof TABS)[number]['id']

export function AdminPage() {
  const navigate = useNavigate()
  const { isAdmin, loading: authLoading } = useAuth()

  // Вкладка в адресе (/admin?tab=users) — переживает перезагрузку страницы.
  const [params, setParams] = useSearchParams()
  const tab: TabId = params.get('tab') === 'users' ? 'users' : 'services'

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true })
  }, [authLoading, isAdmin, navigate])

  if (authLoading || !isAdmin) return null

  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--surface)]">
      <Header />

      <main className="flex flex-1 flex-col items-center bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col gap-6">
          <h1 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">Админ-панель</h1>

          <div role="tablist" className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setParams(t.id === 'services' ? {} : { tab: t.id })}
                className={cn(
                  'flex h-[44px] cursor-pointer items-center rounded-full px-[22px] text-[15px] font-semibold transition-colors',
                  tab === t.id
                    ? 'bg-[var(--ink)] text-white'
                    : 'border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'services' ? <AdminServices /> : <AdminUsers />}
        </div>
      </main>

      <Footer />
    </div>
  )
}
