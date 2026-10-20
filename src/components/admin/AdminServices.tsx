import { useMemo, useState } from 'react'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { ServiceForm } from './ServiceForm'
import { api } from '../../lib/api'
import { buildCatalog, GROUPS, serviceHref } from '../../lib/catalog'
import type { GroupId, Service } from '../../lib/catalog'
import { useServices } from '../../lib/useServices'

/** Сколько документов в чек-листе — по-русски. */
function docsLabel(n: number): string {
  if (n === 0) return 'без чек-листа'
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'документ'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'документа'
        : 'документов'
  return `${n} ${word}`
}

function ServiceRow({
  service,
  onEdit,
  onDeleted,
}: {
  service: Service
  onEdit: () => void
  onDeleted: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setDeleting(true)
    setError('')
    try {
      await api.adminDeleteService(service.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
      setDeleting(false)
    }
  }

  // Чего не хватает до полной страницы услуги — чтобы было видно, что дописать.
  const missing = [
    !service.audience && '«Кому и когда»',
    !service.result && '«Что получите»',
  ].filter(Boolean)

  return (
    <li className="flex w-full flex-col gap-3 border-b border-[var(--line)] px-5 py-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[16px] font-bold text-[var(--ink)]">{service.title}</p>
        <p className="text-[14px] text-[var(--ink-2)]">
          {docsLabel(service.needs.length)}
          {missing.length > 0 && (
            <span className="text-[#b76e00]"> · не заполнено: {missing.join(', ')}</span>
          )}
        </p>
        {error && (
          <p role="alert" className="text-[14px] font-medium text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>

      <p className="shrink-0 text-[17px] font-extrabold text-[var(--ink)] lg:w-[130px] lg:text-right">
        {service.price}
      </p>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[14px] font-semibold text-[var(--ink)]">Удалить?</span>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="h-[36px] cursor-pointer rounded-[10px] bg-[var(--danger)] px-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {deleting ? 'Удаляем…' : 'Да, удалить'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="h-[36px] cursor-pointer rounded-[10px] px-3 text-[14px] font-semibold text-[var(--ink)] hover:bg-[var(--page-bg)]"
          >
            Нет
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={serviceHref(service.slug)}
            target="_blank"
            rel="noreferrer"
            className="flex h-[36px] items-center gap-[6px] rounded-[10px] px-3 text-[14px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--page-bg)] hover:text-[var(--ink)]"
          >
            <ExternalLink size={15} />
            На сайте
          </a>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-[36px] cursor-pointer items-center gap-[6px] rounded-[10px] px-3 text-[14px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--page-bg)]"
          >
            <Pencil size={15} />
            Изменить
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex h-[36px] cursor-pointer items-center gap-[6px] rounded-[10px] px-3 text-[14px] font-semibold text-[var(--danger)] transition-colors hover:bg-[#fdecec]"
          >
            <Trash2 size={15} />
            Удалить
          </button>
        </div>
      )}
    </li>
  )
}

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; service: Service }

export function AdminServices() {
  const { services, loading, error, reload } = useServices()
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  const catalog = useMemo(() => buildCatalog(services ?? []), [services])

  // Подсказки для поля «Подраздел» — те, что уже есть в каждом разделе.
  const subgroups = useMemo(() => {
    const result = {} as Record<GroupId, string[]>
    for (const group of GROUPS) {
      result[group.id] =
        catalog
          .find((g) => g.id === group.id)
          ?.subgroups.map((s) => s.title)
          .filter(Boolean) ?? []
    }
    return result
  }, [catalog])

  const backToList = () => {
    setMode({ kind: 'list' })
    window.scrollTo({ top: 0 })
  }

  if (mode.kind !== 'list') {
    return (
      <ServiceForm
        key={mode.kind === 'edit' ? mode.service.id : 'new'}
        service={mode.kind === 'edit' ? mode.service : undefined}
        subgroups={subgroups}
        onSaved={() => {
          reload()
          backToList()
        }}
        onCancel={backToList}
      />
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[17px] text-[var(--ink-2)]">
          {loading ? 'Загружаем…' : `Всего услуг: ${services?.length ?? 0}`}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode({ kind: 'create' })
            window.scrollTo({ top: 0 })
          }}
          className="flex h-[48px] w-fit cursor-pointer items-center gap-2 rounded-[12px] bg-[var(--ink)] px-5 text-[16px] font-bold text-white transition-colors hover:bg-[#1a2740]"
        >
          <Plus size={18} />
          Добавить услугу
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[15px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}

      {catalog.map((group) => (
        <section key={group.id} className="flex w-full flex-col gap-3">
          <h2 className="text-[22px] font-bold text-[var(--ink)]">{group.title}</h2>

          {group.subgroups.map((subgroup) => (
            <div
              key={subgroup.title || group.id}
              className="w-full overflow-hidden rounded-[20px] border border-[var(--line)] bg-white"
            >
              {subgroup.title && (
                <p className="border-b border-[var(--line)] bg-[#fafbfd] px-5 py-3 text-[13px] font-bold tracking-[1px] text-[var(--ink-2)] uppercase">
                  {subgroup.title}
                </p>
              )}
              <ul className="flex w-full flex-col">
                {subgroup.items.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    onEdit={() => {
                      setMode({ kind: 'edit', service })
                      window.scrollTo({ top: 0 })
                    }}
                    onDeleted={reload}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {!loading && !error && services?.length === 0 && (
        <p className="rounded-[20px] border border-[var(--line)] bg-white px-5 py-10 text-center text-[16px] text-[var(--ink-2)]">
          Услуг пока нет — добавьте первую
        </p>
      )}
    </div>
  )
}
