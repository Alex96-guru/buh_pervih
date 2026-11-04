import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Check, ChevronDown, ChevronLeft, FileText, Info, Paperclip, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { SubmitButton, TextArea } from '../components/auth/fields'
import { Panel } from '../components/ui'
import { api, uploadOrderFile } from '../lib/api'
import { useRequireUser } from '../lib/auth'
import type { AuthUser } from '../lib/auth'
import { CATALOG_PATH, groupTitle } from '../lib/catalog'
import type { Service } from '../lib/catalog'
import { cn } from '../lib/cn'
import { formatFileSize, MAX_FILE_SIZE, MAX_ORDER_FILES } from '../lib/files'
import { formatRub, isBasePrice, orderPath, parseOrderCart, withOrderCart } from '../lib/orders'
import type { Order } from '../lib/orders'
import { useService } from '../lib/useServices'

/** «79026335387» → «+7 902 633-53-87». */
function formatPhone(digits: string): string {
  const m = digits.match(/^7(\d{3})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : digits
}

/** Сумма из цены каталога, как её посчитает сервер. null — «по запросу». */
function amountOf(price: string): number | null {
  const amount = Number(price.replace(/\D/g, ''))
  return amount > 0 ? amount : null
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full flex-col gap-[2px] lg:flex-row lg:gap-4">
      <dt className="text-[15px] text-[var(--ink-2)] lg:w-[120px] lg:shrink-0">{label}</dt>
      <dd className="text-[16px] font-medium break-words text-[var(--ink)]">{value}</dd>
    </div>
  )
}

export function CheckoutPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const parentOrderId = params.get('from')
  const cart = parseOrderCart(params.get('items'))
  const user = useRequireUser()
  const { service, loading, error, notFound } = useService(slug)

  if (notFound) return <Navigate to={CATALOG_PATH} replace />

  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-[72px] lg:px-[120px] lg:pt-12 lg:pb-[120px]">
        {service && user ? (
          <CheckoutContent key={`${service.slug}:${params.toString()}`} service={service} user={user} parentOrderId={parentOrderId} cart={cart} />
        ) : (
          <p
            role={error ? 'alert' : undefined}
            className={cn(
              'mx-auto w-full max-w-[1200px] text-[17px]',
              error ? 'font-medium text-[var(--danger)]' : 'text-[var(--ink-2)]',
            )}
          >
            {loading || !user ? 'Загружаем…' : `Не удалось загрузить услугу: ${error}`}
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}

function CheckoutContent({ service, user, parentOrderId, cart }: { service: Service; user: AuthUser; parentOrderId: string | null; cart: string[] }) {
  const navigate = useNavigate()
  const [selectedSlugs, setSelectedSlugs] = useState(() => [...new Set([...cart, service.slug])])
  const [allServices, setAllServices] = useState<Service[] | null>(null)
  const [cartError, setCartError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [parentOrder, setParentOrder] = useState<Order | null>(null)
  const [parentError, setParentError] = useState('')
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [queuedFiles, setQueuedFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const bySlug = new Map((allServices ?? [service]).map((item) => [item.slug, item]))
  const selectedServices = selectedSlugs.map((slug) => bySlug.get(slug)).filter((item): item is Service => Boolean(item))
  const cartReady = Boolean(allServices && selectedServices.length === selectedSlugs.length)
  const amount = selectedServices.length > 0 && selectedServices.every((item) => amountOf(item.price) !== null)
    ? selectedServices.reduce((sum, item) => sum + (amountOf(item.price) ?? 0), 0)
    : null

  useEffect(() => {
    let active = true
    api.services().then(({ services }) => {
      if (!active) return
      setAllServices(services)
      if (selectedSlugs.some((slug) => !services.some((item) => item.slug === slug))) {
        setCartError('Одна из выбранных услуг больше не доступна')
      }
    }).catch(() => { if (active) setCartError('Не удалось загрузить выбранные услуги') })
    return () => { active = false }
  }, [])

  function removeService(slug: string) {
    setSelectedSlugs((current) => current.filter((item) => item !== slug))
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length) return
    if (queuedFiles.length + selected.length > MAX_ORDER_FILES) {
      setFileError(`Можно приложить не больше ${MAX_ORDER_FILES} файлов`)
      return
    }
    const invalid = selected.find((file) => file.size === 0 || file.size > MAX_FILE_SIZE)
    if (invalid) {
      setFileError(`${invalid.name}: файл должен быть непустым и не больше 50 МБ`)
      return
    }
    setFileError('')
    setQueuedFiles((current) => [...current, ...selected])
  }

  useEffect(() => {
    setParentOrder(null)
    setParentError('')
    if (!parentOrderId) return
    let active = true
    api.order(parentOrderId)
      .then(({ order }) => {
        if (!active) return
        if (!['paid', 'closed'].includes(order.status)) setParentError('Исходный заказ ещё не оплачен')
        else setParentOrder(order)
      })
      .catch(() => { if (active) setParentError('Исходный заказ не найден') })
    return () => { active = false }
  }, [parentOrderId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting || !cartReady || selectedSlugs.length === 0 || selectedSlugs.length > 10 ||
        (parentOrderId && (!parentOrder || !amount))) return

    if (amount === null && comment.trim().length < 10) {
      setCommentError('Кратко опишите задачу — минимум 10 символов')
      return
    }

    setSubmitting(true)
    setCommentError('')
    setSubmitError('')
    try {
      const { order } = await api.createOrder(selectedSlugs[0], comment, parentOrderId ?? undefined, selectedSlugs)
      const failed: string[] = []
      for (const file of queuedFiles) {
        try {
          await uploadOrderFile(order.id, file)
        } catch (err) {
          failed.push(`${file.name}: ${err instanceof Error ? err.message : 'не удалось загрузить'}`)
        }
      }
      navigate(orderPath(order.id), { state: failed.length ? { uploadError: `Не загрузились файлы: ${failed.join('; ')}. Их можно прикрепить на этой странице.` } : undefined })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось оформить заказ')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-5 lg:gap-8">
      <a
        href={withOrderCart(`${CATALOG_PATH}/${service.slug}`, parentOrderId, cart)}
        className="flex w-fit items-center gap-1 text-[14px] font-semibold text-[var(--ink-2)] transition-colors hover:text-[var(--accent)] lg:text-[15px]"
      >
        <ChevronLeft size={16} className="shrink-0" />
        К услуге
      </a>

      <h1 className="w-full text-[32px] leading-[38px] font-bold text-[var(--ink)] lg:text-[52px] lg:leading-[60px]">
        Оформление заказа
      </h1>

      {parentOrderId && (
        <p className="rounded-[14px] border border-[var(--line)] bg-white p-4 text-[15px] text-[var(--ink)]">
          {parentOrder ? <>К оплаченному <a href={orderPath(parentOrder.parentOrderId ?? parentOrder.id)} className="font-semibold text-[var(--accent)] hover:underline">заказу № {parentOrder.parentOrderNumber ?? parentOrder.number}</a>. Уже оплаченные услуги не входят в сумму ниже.</> : parentError || 'Проверяем исходный заказ…'}
        </p>
      )}

      <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-20 lg:pt-2">
        <div className="flex w-full min-w-0 flex-col gap-5 lg:flex-1 lg:gap-6">
          <Panel title={`Выбранные услуги · ${selectedServices.length}`}>
            {!allServices && !cartError && <p className="text-[15px] text-[var(--ink-2)]">Загружаем услуги…</p>}
            {selectedServices.map((item) => (
              <div key={item.slug} className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[var(--line)] p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[13px] text-[var(--ink-2)]">{groupTitle(item.group)}{item.subgroup ? ` · ${item.subgroup}` : ''}</span>
                    <span className="break-words text-[16px] font-semibold text-[var(--ink)]">{item.title}</span>
                  </div>
                  <span className="shrink-0 text-[16px] font-bold text-[var(--ink)]">{item.price}</span>
                </div>
                <div className="flex flex-col items-start gap-3 border-t border-[var(--line)] pt-3 sm:flex-row sm:items-start sm:gap-5">
                  <details className="group min-w-0 w-full sm:w-auto sm:flex-1">
                    <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-[var(--accent)] [&::-webkit-details-marker]:hidden">
                      <FileText size={16} aria-hidden="true" className="shrink-0" />
                      Какие документы нужны
                      <ChevronDown size={14} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    {item.needs.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2 text-[14px] text-[var(--ink)]">
                        {item.needs.map((need, index) => (
                          <li key={`${item.slug}-${index}`} className="flex items-start gap-2">
                            <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" />
                            <span className="min-w-0 break-words">{need.text}{need.optional ? ' (если есть)' : ''}{need.hint && <span className="block text-[var(--ink-2)]">{need.hint}</span>}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-3 text-[14px] text-[var(--ink-2)]">Специалист уточнит список документов после оформления.</p>}
                  </details>
                  <button type="button" onClick={() => removeService(item.slug)} aria-label={`Удалить услугу ${item.title}`} className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-[var(--danger)] hover:underline">
                    <Trash2 size={16} aria-hidden="true" />Удалить
                  </button>
                </div>
              </div>
            ))}
            {selectedServices.length === 0 && <p className="text-[15px] text-[var(--ink-2)]">Выберите услугу для оформления.</p>}
            {allServices && selectedSlugs.length < 10 && (amount !== null || selectedSlugs.length === 0) && (
              <button type="button" onClick={() => setShowPicker((value) => !value)} className="flex w-fit cursor-pointer items-center gap-2 text-[15px] font-semibold text-[var(--accent)] hover:underline">
                <Plus size={18} aria-hidden="true" />{showPicker ? 'Скрыть услуги' : 'Добавить услугу'}
              </button>
            )}
            {showPicker && allServices && (
              <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--page-bg)] p-4">
                <label htmlFor="service-search" className="text-[14px] font-semibold text-[var(--ink)]">Найти услугу</label>
                <div className="relative w-full">
                  <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-2)]" />
                  <input id="service-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} placeholder="Название услуги" className="h-[44px] w-full min-w-0 rounded-[10px] border border-[var(--line)] bg-white pr-3 pl-10 text-[15px] outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
                  {allServices.filter((item) => amountOf(item.price) !== null && !selectedSlugs.includes(item.slug) && item.title.toLowerCase().includes(search.trim().toLowerCase())).map((item) => (
                    <button key={item.slug} type="button" onClick={() => { setSelectedSlugs((current) => [...current, item.slug]); setShowPicker(false); setSearch('') }} className="flex w-full min-w-0 cursor-pointer flex-col gap-2 rounded-[10px] border border-[var(--line)] bg-white p-3 text-left hover:border-[var(--accent)] sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 break-words text-[14px] font-medium text-[var(--ink)]">{item.title}</span>
                      <span className="shrink-0 text-[14px] font-bold text-[var(--ink)]">{item.price}</span>
                    </button>
                  ))}
                  {allServices.every((item) => amountOf(item.price) === null || selectedSlugs.includes(item.slug) || !item.title.toLowerCase().includes(search.trim().toLowerCase())) && <p className="text-[14px] text-[var(--ink-2)]">Подходящих услуг нет.</p>}
                </div>
              </div>
            )}
            {cartError && <p role="alert" className="text-[14px] text-[var(--danger)]">{cartError}</p>}
            {selectedSlugs.length > 10 && <p role="alert" className="text-[14px] text-[var(--danger)]">В одном заказе может быть не больше 10 услуг.</p>}
          </Panel>

          <Panel title="Контакты">
            <p className="text-[15px] leading-[22px] text-[var(--ink-2)]">
              По ним специалист свяжется с вами и пришлёт список документов.
            </p>
            <dl className="flex w-full flex-col gap-3">
              <ContactRow label="Имя" value={user.fullName} />
              <ContactRow label="Телефон" value={formatPhone(user.phone)} />
              {user.email && <ContactRow label="Почта" value={user.email} />}
            </dl>
          </Panel>

          <Panel title="Файлы для специалиста">
            <p className="text-[14px] leading-[21px] text-[var(--ink-2)]">Можно приложить документы, фото, аудио или видео. Любой тип файла, до 50 МБ каждый. Файлы увидит специалист по заказу.</p>
            <label className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--page-bg)] px-4 text-[15px] font-semibold text-[var(--ink)] hover:border-[var(--accent)] focus-within:outline-2 focus-within:outline-[var(--accent)] sm:w-fit">
              <Paperclip size={18} aria-hidden="true" />Прикрепить файлы
              <input type="file" multiple onChange={selectFiles} className="sr-only" />
            </label>
            {queuedFiles.length > 0 && (
              <ul className="flex min-w-0 flex-col gap-2">
                {queuedFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[var(--line)] p-3">
                    <FileText size={18} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0 flex-1 break-all text-[14px] text-[var(--ink)]">{file.name} <span className="text-[var(--ink-2)]">· {formatFileSize(file.size)}</span></span>
                    <button type="button" onClick={() => setQueuedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Убрать файл ${file.name}`} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--danger)] hover:bg-[var(--page-bg)]"><X size={18} aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            )}
            {fileError && <p role="alert" className="text-[14px] text-[var(--danger)]">{fileError}</p>}
          </Panel>

          <TextArea
            label={amount === null ? 'Опишите задачу для оценки стоимости' : 'Комментарий для специалиста'}
            optional={amount !== null}
            error={commentError}
            rows={4}
            maxLength={2000}
            placeholder={amount === null ? 'Что нужно сделать, за какой период и какие документы уже есть?' : 'Например: нужна декларация за 2025 год, ЭЦП есть'}
            value={comment}
            onChange={(e) => { setComment(e.target.value); setCommentError('') }}
          />
          {amount === null && <p className="-mt-3 text-[13px] leading-5 text-[var(--ink-2)]">Укажите, что нужно сделать и за какой период. Без этого специалист не сможет оценить стоимость.</p>}
        </div>

        {/* Десктоп: итог справа и едет вместе с прокруткой */}
        <div className="w-full lg:sticky lg:top-[104px] lg:w-[380px] lg:shrink-0">
          <div className="flex w-full flex-col gap-[14px] rounded-[20px] border border-[var(--line)] bg-white p-6 lg:gap-4 lg:p-7">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink-2)]">
              <ShoppingCart size={18} aria-hidden="true" />{amount ? 'Предварительная стоимость' : 'Стоимость'}
            </span>
            <p className="-mt-2 text-[40px] font-extrabold tracking-[-1.2px] text-[var(--accent)] lg:text-[44px] lg:tracking-[-1.32px]">
              {amount ? formatRub(amount) : selectedSlugs.length === 1 ? selectedServices[0]?.price ?? '—' : '—'}
            </p>

            <SubmitButton disabled={submitting || !cartReady || selectedSlugs.length === 0 || selectedSlugs.length > 10 || Boolean(parentOrderId && (!parentOrder || !amount))}>
              {submitting ? 'Оформляем и загружаем…' : 'Оформить заказ'}
            </SubmitButton>

            {submitError && (
              <p role="alert" className="text-[14px] font-medium text-[var(--danger)]">
                {submitError}
              </p>
            )}
            {parentOrderId && cartReady && !amount && <p role="alert" className="text-[14px] text-[var(--danger)]">Для докупки выберите услуги с указанной ценой.</p>}

            <div className="flex w-full items-start gap-[10px] rounded-[16px] bg-[var(--accent-soft)] px-4 py-[14px]">
              <Info size={20} className="mt-px shrink-0 text-[var(--accent)]" />
              <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">
                {!amount
                  ? 'Стоимость зависит от задачи. Специалист изучит её, выполнит работу и выставит оплату в личном кабинете.'
                  : selectedServices.some((item) => isBasePrice(item.price))
                    ? 'Это предварительная стоимость. Итоговую сумму специалист укажет после выполнения работы.'
                    : 'После оформления вы сможете написать специалисту. Оплата появится после выполнения работы.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
