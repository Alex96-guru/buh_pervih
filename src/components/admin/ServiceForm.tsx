import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import { Field, Segmented, SubmitButton, TextArea } from '../auth/fields'
import { api, ApiError, uploadInstructionFile } from '../../lib/api'
import type { ServicePayload } from '../../lib/api'
import { GROUPS } from '../../lib/catalog'
import type { CatalogNeed, GroupId, Service } from '../../lib/catalog'
import { cn } from '../../lib/cn'

const EMPTY: ServicePayload = {
  kind: 'service',
  group: 'ip',
  subgroup: '',
  title: '',
  price: '',
  audience: '',
  needs: [],
  result: '',
  description: '', priceAmount: null, published: true, fileId: null,
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-[36px] w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ink-2)] transition-colors disabled:cursor-default disabled:opacity-30',
        danger
          ? 'hover:bg-[#fdecec] hover:text-[var(--danger)]'
          : 'hover:bg-[var(--page-bg)] hover:text-[var(--ink)]',
      )}
    >
      {children}
    </button>
  )
}

/** Один пункт «Что понадобится»: текст, метка «если есть» и пояснение. */
function NeedEditor({
  need,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  need: CatalogNeed
  index: number
  total: number
  onChange: (need: CatalogNeed) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}) {
  const optionalId = useId()

  return (
    <div className="flex w-full flex-col gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--page-bg)] p-3">
      <div className="flex w-full items-center gap-2">
        <input
          value={need.text}
          onChange={(e) => onChange({ ...need, text: e.target.value })}
          placeholder="Например: Выписка из банка за год"
          aria-label={`Документ ${index + 1}`}
          className="h-[44px] min-w-0 flex-1 rounded-[10px] border border-[var(--line)] bg-white px-3 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-2)] focus:border-[var(--accent)]"
        />
        <IconButton label="Выше" onClick={() => onMove(-1)} disabled={index === 0}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton label="Ниже" onClick={() => onMove(1)} disabled={index === total - 1}>
          <ArrowDown size={16} />
        </IconButton>
        <IconButton label="Убрать пункт" onClick={onRemove} danger>
          <Trash2 size={16} />
        </IconButton>
      </div>

      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <label
          htmlFor={optionalId}
          className="flex shrink-0 cursor-pointer items-center gap-2 text-[14px] font-medium text-[var(--ink)]"
        >
          <input
            id={optionalId}
            type="checkbox"
            checked={need.optional ?? false}
            onChange={(e) => onChange({ ...need, optional: e.target.checked })}
            className="h-[18px] w-[18px] cursor-pointer accent-[var(--accent)]"
          />
          если есть
        </label>
        <input
          value={need.hint ?? ''}
          onChange={(e) => onChange({ ...need, hint: e.target.value })}
          placeholder="Пояснение мелким шрифтом (необязательно)"
          aria-label={`Пояснение к документу ${index + 1}`}
          className="h-[40px] min-w-0 flex-1 rounded-[10px] border border-[var(--line)] bg-white px-3 text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-2)] focus:border-[var(--accent)]"
        />
      </div>
    </div>
  )
}

/**
 * Создание и правка услуги. service — правим существующую, без него — новая.
 * subgroups — уже существующие подразделы, чтобы не плодить опечатки.
 */
export function ServiceForm({
  service,
  canManageInstructions,
  subgroups,
  onSaved,
  onCancel,
}: {
  service?: Service
  canManageInstructions: boolean
  subgroups: Record<GroupId, string[]>
  onSaved: (service: Service) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ServicePayload>(() =>
    service
      ? {
          group: service.group,
          subgroup: service.subgroup,
          title: service.title,
          price: service.price,
          audience: service.audience,
          needs: service.needs,
          result: service.result,
          kind: service.kind, description: service.description,
          priceAmount: service.priceAmount, published: service.published,
          fileId: null,
        }
      : EMPTY,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const listId = useId()

  const set = <K extends keyof ServicePayload>(key: K, value: ServicePayload[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const setNeed = (index: number, need: CatalogNeed) =>
    set(
      'needs',
      form.needs.map((n, i) => (i === index ? need : n)),
    )

  const moveNeed = (index: number, delta: -1 | 1) => {
    const next = [...form.needs]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    set('needs', next)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (form.title.trim().length < 3) nextErrors.title = 'Укажите название'
    if (form.kind === 'instruction') {
      if (!form.description.trim()) nextErrors.description = 'Укажите описание'
      if (!Number.isSafeInteger(form.priceAmount) || (form.priceAmount ?? 0) < 1) nextErrors.priceAmount = 'Укажите цену'
      if (!service?.hasFile && !file && !uploadedFileId) nextErrors.file = 'Загрузите файл .docx'
    } else if (!form.price.trim()) nextErrors.price = 'Укажите цену'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    setFormError('')
    try {
      let fileId = uploadedFileId
      if (form.kind === 'instruction' && file && !fileId) {
        fileId = await uploadInstructionFile(file)
        setUploadedFileId(fileId)
      }
      const payload = { ...form, fileId }
      const { service: saved } = service
        ? await api.adminUpdateService(service.id, payload)
        : await api.adminCreateService(payload)
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message })
      else setFormError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex w-full flex-col gap-6 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:max-w-[760px] lg:p-8"
    >
      <h2 className="text-[24px] font-bold text-[var(--ink)]">
        {service ? `Изменить ${service.kind === 'instruction' ? 'инструкцию' : 'услугу'}` : 'Новая позиция'}
      </h2>

      {!service && <Segmented<'service' | 'instruction'> label="Тип позиции" value={form.kind} options={[
        { value: 'service', label: 'Услуга' },
        ...(canManageInstructions ? [{ value: 'instruction' as const, label: 'Инструкция' }] : []),
      ]} onChange={(kind) => { setForm(kind === 'instruction' ? { ...EMPTY, kind, group: 'instructions' } : { ...EMPTY }); setFile(null); setUploadedFileId(null) }} />}
      {!service && !canManageInstructions && <p className="text-[14px] text-[var(--ink-2)]">Инструкции может добавлять только учётная запись Ольги.</p>}

      {form.kind === 'service' && <Segmented<GroupId>
        label="Раздел каталога"
        value={form.group}
        options={GROUPS.filter((g) => g.id !== 'instructions').map((g) => ({ value: g.id, label: g.title }))}
        onChange={(group) => set('group', group)}
      />}

      {form.kind === 'service' && <div className="flex w-full flex-col gap-[6px]">
        <Field
          label="Подраздел"
          optional
          value={form.subgroup}
          onChange={(e) => set('subgroup', e.target.value)}
          list={listId}
          placeholder="Например: Отчётность по УСН"
        />
        <datalist id={listId}>
          {subgroups[form.group].map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <span className="text-[13px] text-[var(--ink-2)]">
          Выберите из списка или впишите новый. Пусто — услуга без подзаголовка.
        </span>
      </div>}

      <Field
        label="Название"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        placeholder="Например: Декларация УСН «доходы» с расчётом налога"
      />

      {form.kind === 'service' && <Field
        label="Цена"
        value={form.price}
        onChange={(e) => set('price', e.target.value)}
        error={errors.price}
        placeholder="1 900 ₽, от 3 000 ₽ или по запросу"
        className="lg:max-w-[280px]"
      />}

      {form.kind === 'instruction' && <>
        <TextArea label="Краткое описание" value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} rows={3} />
        <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--ink)]">Цена, ₽
          <input type="number" min="1" max="1000000" step="1" inputMode="numeric" value={form.priceAmount ?? ''} onChange={(e) => set('priceAmount', e.target.value ? Number(e.target.value) : null)} className="h-[46px] max-w-[280px] rounded-[10px] border border-[var(--line)] px-3 text-[16px] font-normal" />
          {errors.priceAmount && <span className="text-[var(--danger)]">{errors.priceAmount}</span>}
        </label>
        <div className="flex flex-col gap-2 text-[14px] font-semibold text-[var(--ink)]">
          <span>Файл Word (.docx), до 20 МБ</span>
          <label className="group flex w-full cursor-pointer flex-col gap-2 sm:w-fit">
            <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadedFileId(null) }} className="sr-only" />
            <span className="flex min-h-[50px] items-center justify-center gap-2 rounded-[12px] bg-[var(--accent)] px-5 text-[15px] font-bold text-white transition-colors group-hover:bg-[#2449d8] group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-[var(--accent)] sm:justify-start"><Upload size={19} />{service?.hasFile ? 'Заменить файл' : 'Добавить файл'}</span>
          </label>
          <span className="break-all font-normal text-[var(--ink-2)]">{file ? `Выбран: ${file.name}` : service?.hasFile ? 'Файл загружен. Выберите другой для замены.' : 'Файл обязателен для новой инструкции.'}</span>
          {errors.file && <span className="text-[var(--danger)]">{errors.file}</span>}
        </div>
        <label className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]"><input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="h-[18px] w-[18px]" />Показывать в каталоге</label>
      </>}

      {form.kind === 'service' && <TextArea
        label="Кому и когда"
        optional
        value={form.audience}
        onChange={(e) => set('audience', e.target.value)}
        placeholder="Сдают ИП и ООО по итогам года: все доходы за год и расчёт налога."
      />}

      {form.kind === 'service' && <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-semibold text-[var(--ink)]">Что понадобится</span>
          <span className="text-[13px] text-[var(--ink-2)]">
            На карточке в каталоге видны первые три пункта, остальные — на странице услуги.
          </span>
        </div>

        {form.needs.map((need, i) => (
          <NeedEditor
            key={i}
            need={need}
            index={i}
            total={form.needs.length}
            onChange={(n) => setNeed(i, n)}
            onMove={(delta) => moveNeed(i, delta)}
            onRemove={() =>
              set(
                'needs',
                form.needs.filter((_, j) => j !== i),
              )
            }
          />
        ))}

        <button
          type="button"
          onClick={() => set('needs', [...form.needs, { text: '' }])}
          className="flex h-[44px] w-fit cursor-pointer items-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-[#B9C3D6] px-4 text-[15px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Plus size={18} />
          Добавить документ
        </button>
      </div>}

      {form.kind === 'service' && <TextArea
        label="Что получите"
        optional
        rows={4}
        value={form.result}
        onChange={(e) => set('result', e.target.value)}
        placeholder="Декларацию в двух форматах: PDF и XML…"
      />}

      {formError && (
        <p role="alert" className="text-[15px] font-medium text-[var(--danger)]">
          {formError}
        </p>
      )}

      <div className="flex w-full flex-col gap-3 lg:flex-row">
        <SubmitButton disabled={saving} className="lg:w-auto">
          {saving ? 'Сохраняем…' : service ? 'Сохранить' : form.kind === 'instruction' ? 'Добавить инструкцию' : 'Добавить услугу'}
        </SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-[56px] cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] border-[#B9C3D6] px-7 text-[16px] font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
