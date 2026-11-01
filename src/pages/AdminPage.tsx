import { useEffect } from 'react'
import { LayoutGrid, ShoppingBag, Users } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminServices } from '../components/admin/AdminServices'
import { AdminOrders } from '../components/admin/AdminOrders'
import { AdminUsers } from '../components/admin/AdminUsers'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'

const TABS = [
  { id: 'orders', label: 'Заказы', icon: ShoppingBag },
  { id: 'services', label: 'Услуги', icon: LayoutGrid },
  { id: 'users', label: 'Пользователи', icon: Users },
] as const

type TabId = (typeof TABS)[number]['id']

export function AdminPage() {
  const navigate = useNavigate()
  const { isAdmin, loading: authLoading, user } = useAuth()

  // Вкладка в адресе (/admin?tab=users) — переживает перезагрузку страницы.
  const [params, setParams] = useSearchParams()
  const tab: TabId = params.get('tab') === 'users' ? 'users' : params.get('tab') === 'services' ? 'services' : 'orders'

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true })
  }, [authLoading, isAdmin, navigate])

  if (authLoading || !isAdmin) return null

  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--surface)]">
      <Header />

      <main className="flex flex-1 flex-col items-center bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="flex w-full min-w-0 max-w-[1200px] flex-col gap-6">
          <h1 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">Админ-панель</h1>

          <div role="tablist" className="flex max-w-full flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setParams(t.id === 'orders' ? {} : { tab: t.id })}
                className={cn(
                  'flex h-[44px] min-w-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors sm:px-[22px] sm:text-[15px]',
                  tab === t.id
                    ? 'bg-[var(--ink)] text-white'
                    : 'border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]',
                )}
              >
                <t.icon size={17} aria-hidden="true" className="shrink-0" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'orders' ? <AdminOrders currentUserId={user?.id ?? ''} /> : tab === 'services' ? <AdminServices /> : <AdminUsers />}
        </div>
      </main>

      <Footer />
    </div>
  )
}
