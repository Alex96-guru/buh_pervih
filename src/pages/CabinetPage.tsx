import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MessagesSquare } from 'lucide-react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useAuth } from '../lib/auth'

const TYPE_LABELS: Record<string, string> = {
  ip: 'ИП',
  ooo: 'ООО',
  person: 'Физлицо',
}

/**
 * Личный кабинет. В макете этого экрана нет — это заготовка, чтобы
 * авторизованному было куда попадать. Содержимое заменится, когда
 * появится дизайн и бэкенд.
 */
export function CabinetPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  // Пока проверяем сессию, пользователь ещё null — выгонять рано.
  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  if (!user) return null

  return (
    <div className="flex min-h-full w-full flex-col bg-[var(--surface)]">
      <Header />

      <main className="flex flex-1 flex-col items-center bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col gap-6 lg:gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-bold text-[var(--ink)] lg:text-[40px]">
              Здравствуйте, {user.fullName}
            </h1>
            <p className="text-[17px] text-[var(--ink-2)]">
              {TYPE_LABELS[user.clientType] ?? 'Клиент'}
              {user.email ? ` · ${user.email}` : ''}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <section className="flex flex-1 flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:p-8">
              <FileText size={24} className="text-[var(--accent)]" />
              <h2 className="text-[22px] font-bold text-[var(--ink)]">Мои заявки</h2>
              <p className="text-[16px] leading-[24px] text-[var(--ink-2)]">
                Пока ни одной заявки. Выберите услугу на главной — она появится здесь со
                статусом и списком документов.
              </p>
            </section>

            <section className="flex flex-1 flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:p-8">
              <MessagesSquare size={24} className="text-[var(--accent)]" />
              <h2 className="text-[22px] font-bold text-[var(--ink)]">Мои диалоги</h2>
              <p className="text-[16px] leading-[24px] text-[var(--ink-2)]">
                Переписка с бухгалтером по вашим заявкам. Появится вместе с первой заявкой.
              </p>
            </section>
          </div>

          <p className="text-[13px] text-[var(--ink-2)]">
            [заготовка кабинета — экрана нет в макете, данные не сохраняются]
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
