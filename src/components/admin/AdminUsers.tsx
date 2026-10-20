import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { api } from '../../lib/api'
import type { AdminUser } from '../../lib/api'
import { formatPhone } from '../../lib/validation'

const TYPE_LABELS: Record<string, string> = {
  ip: 'ИП',
  ooo: 'ООО',
  person: 'Физлицо',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Поиск с паузой, чтобы не дёргать сервер на каждую букву.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      api
        .adminUsers(search)
        .then((data) => {
          if (cancelled) return
          setUsers(data.users)
          setTotal(data.total)
          setError('')
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search])

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-[17px] text-[var(--ink-2)]">
        {loading ? 'Загружаем…' : `Всего: ${total}`}
      </p>

      <div className="relative w-full lg:max-w-[420px]">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--ink-2)]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, почте или телефону"
          className="h-[48px] w-full rounded-[12px] border border-[var(--line)] bg-white pr-4 pl-11 text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-2)] focus:border-[var(--accent)]"
        />
      </div>

      {error && (
        <p role="alert" className="text-[15px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="w-full overflow-x-auto rounded-[20px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {['Имя', 'Контакты', 'Тип', 'ИНН', 'Почта', 'Регистрация'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-4 text-[13px] font-bold tracking-[1px] text-[var(--ink-2)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)] last:border-b-0">
                <td className="px-5 py-4">
                  <p className="text-[15px] font-bold text-[var(--ink)]">{u.fullName}</p>
                  {u.companyName && (
                    <p className="text-[13px] text-[var(--ink-2)]">{u.companyName}</p>
                  )}
                  {u.role === 'admin' && (
                    <span className="mt-1 inline-block rounded-[6px] bg-[var(--accent-soft)] px-2 py-[2px] text-[12px] font-bold text-[var(--accent)]">
                      админ
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-[15px] text-[var(--ink)]">
                  <p>{formatPhone(u.phone)}</p>
                  <p className="text-[13px] text-[var(--ink-2)]">{u.email ?? '—'}</p>
                </td>
                <td className="px-5 py-4 text-[15px] text-[var(--ink)]">
                  {TYPE_LABELS[u.clientType] ?? u.clientType}
                </td>
                <td className="px-5 py-4 text-[15px] text-[var(--ink)]">{u.inn ?? '—'}</td>
                <td className="px-5 py-4">
                  {u.emailVerified ? (
                    <span className="text-[14px] font-semibold text-[#1a7f4b]">подтверждена</span>
                  ) : (
                    <span className="text-[14px] font-semibold text-[var(--ink-2)]">
                      не подтверждена
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-[15px] text-[var(--ink-2)]">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[16px] text-[var(--ink-2)]">
                  {search ? 'Никого не нашли' : 'Пока ни одного пользователя'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
