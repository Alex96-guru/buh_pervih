import { Fragment, useState } from 'react'
import { Check, ChevronRight, Info } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Button } from '../components/ui'
import { CATALOG_PATH, groupTitle, hasDirectContact } from '../lib/catalog'
import type { CatalogNeed, Service } from '../lib/catalog'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { DOCS_NOTE } from '../lib/content'
import { checkoutPath, parseOrderCart, withOrderCart } from '../lib/orders'
import { useService } from '../lib/useServices'
import { InstructionPurchase } from '../components/InstructionPurchase'

/**
 * Цена, «Заказать» и подсказка про документы. На десктопе — правая колонка.
 * Неавторизованного оформление само отправит на вход и вернёт обратно.
 */
function Summary({ slug, price, parentOrderId, cart, specialist }: { slug: string; price: string; parentOrderId: string | null; cart: string[]; specialist: boolean }) {
  return (
    <div className="flex w-full flex-col gap-[14px] rounded-[20px] border border-[var(--line)] bg-white p-6 lg:gap-4 lg:p-7">
      <p className="text-[40px] font-extrabold tracking-[-1.2px] text-[var(--accent)] lg:text-[44px] lg:tracking-[-1.32px]">
        {price}
      </p>
      {specialist ? (
        <Button href="#specialist-contact" className="w-full">Связаться по услуге</Button>
      ) : (!parentOrderId || /\d/.test(price)) ? (
        <Button href={withOrderCart(checkoutPath(slug), parentOrderId, cart.filter((item) => item !== slug))} className="w-full">
          {parentOrderId ? 'Добавить к заказу' : 'Заказать'}
        </Button>
      ) : <p className="text-[14px] text-[var(--ink-2)]">Для докупки выберите услугу с указанной ценой.</p>}
      <div className="flex w-full items-start gap-[10px] rounded-[16px] bg-[var(--accent-soft)] px-4 py-[14px]">
        <Info size={20} className="mt-px shrink-0 text-[var(--accent)]" />
        <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">
          {specialist ? 'Уточните задачу и условия работы по указанным контактам.' : DOCS_NOTE}
        </p>
      </div>
    </div>
  )
}

function NeedRow({ need }: { need: CatalogNeed }) {
  // Мобайл: «если есть» под текстом, десктоп — справа в строке, как в макете.
  return (
    <li className="flex w-full items-start gap-[10px]">
      <Check size={20} className="mt-px shrink-0 text-[var(--accent)]" />
      <div className="flex flex-1 flex-col gap-[2px] lg:flex-row lg:items-start lg:gap-[10px]">
        <div className="flex flex-1 flex-col gap-[3px]">
          <span className="text-[16px] leading-[22px] font-medium text-[var(--ink)]">
            {need.text}
          </span>
          {need.hint && (
            <span className="text-[14px] leading-[20px] text-[var(--ink-2)]">{need.hint}</span>
          )}
        </div>
        {need.optional && (
          <span className="text-[14px] whitespace-nowrap text-[var(--ink-2)] lg:leading-[22px]">
            если есть
          </span>
        )}
      </div>
    </li>
  )
}

function TextBlock({
  title,
  children,
  large,
}: {
  title: string
  children: string
  /** «Кому и когда» на десктопе крупнее, чем «Что получите». */
  large?: boolean
}) {
  return (
    <div className="flex w-full flex-col gap-2 pt-3 lg:gap-[10px] lg:pt-0">
      <h2 className="text-[22px] font-bold text-[var(--ink)]">{title}</h2>
      <p
        className={cn(
          'whitespace-pre-line text-[17px] leading-[26px] text-[var(--ink-2)]',
          large && 'lg:text-[18px] lg:leading-[28px]',
        )}
      >
        {children}
      </p>
    </div>
  )
}

function SpecialistContact({ service }: { service: Service }) {
  const [copied, setCopied] = useState(false)
  const emailSubject = encodeURIComponent(`Заявка: ${service.title}`)
  const emailBody = encodeURIComponent(`Здравствуйте! Хочу заказать услугу «${service.title}».\n\nМоя задача: `)

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(service.contactPhone)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="specialist-contact" className="flex scroll-mt-[150px] flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-[var(--ink)]">Связаться по услуге</h2>
        {service.specialistName && <p className="text-[17px] font-semibold text-[var(--ink)]">{service.specialistName}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {service.telegramUrl && <Button href={service.telegramUrl} size={44} className="w-full sm:w-auto">Написать в Telegram</Button>}
        {service.maxUrl && <Button href={service.maxUrl} size={44} variant="secondary" className="w-full sm:w-auto">Написать в MAX</Button>}
        {service.contactEmail && <Button href={`mailto:${service.contactEmail}?subject=${emailSubject}&body=${emailBody}`} size={44} variant="secondary" className="w-full sm:w-auto">Написать на почту</Button>}
      </div>
      {service.contactEmail && <p className="break-all text-[14px] text-[var(--ink-2)]">Email: {service.contactEmail}</p>}
      {service.contactPhone && <div className="flex flex-col gap-2 rounded-[14px] bg-[var(--page-bg)] p-4">
        <p className="text-[15px] font-semibold text-[var(--ink)]">MAX: {service.contactPhone}</p>
        <p className="text-[14px] leading-5 text-[var(--ink-2)]">Скопируйте номер и найдите его в поиске MAX.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyPhone} className="min-h-[40px] rounded-[10px] border border-[var(--line)] bg-white px-4 text-[14px] font-semibold text-[var(--ink)] hover:border-[var(--accent)]">{copied ? 'Номер скопирован' : 'Скопировать номер'}</button>
          <Button href="https://web.max.ru/" size={40} variant="secondary">Открыть MAX</Button>
        </div>
      </div>}
    </section>
  )
}

export function ServicePage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const parentOrderId = params.get('from')
  const cart = parseOrderCart(params.get('items'))
  const { service, loading, error, notFound } = useService(slug)

  // Услугу удалили или адрес с опечаткой — ведём в каталог, а не на пустую страницу.
  if (notFound) return <Navigate to={CATALOG_PATH} replace />

  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-[72px] lg:px-[120px] lg:pt-12 lg:pb-[120px]">
        {service ? (
          <ServiceContent service={service} parentOrderId={parentOrderId} cart={cart} />
        ) : (
          <p
            role={error ? 'alert' : undefined}
            className={cn(
              'mx-auto w-full max-w-[1200px] text-[17px]',
              error ? 'font-medium text-[var(--danger)]' : 'text-[var(--ink-2)]',
            )}
          >
            {loading ? 'Загружаем…' : `Не удалось загрузить услугу: ${error}`}
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}

function ServiceContent({ service, parentOrderId, cart }: { service: Service; parentOrderId: string | null; cart: string[] }) {
  const { title, audience, needs, result } = service

  const crumbs = [
    { label: 'Услуги', href: withOrderCart(CATALOG_PATH, parentOrderId, cart) },
    { label: groupTitle(service.group), href: `${withOrderCart(CATALOG_PATH, parentOrderId, cart)}#${service.group}` },
  ]

  return (
    <div className={cn('mx-auto flex w-full flex-col gap-5 lg:gap-8', service.kind === 'instruction' ? 'max-w-[800px]' : 'max-w-[1200px]')}>
      <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 lg:gap-[10px]">
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <a
              {...linkProps(crumb.href)}
              className="text-[14px] font-semibold text-[var(--ink-2)] transition-colors hover:text-[var(--accent)] lg:text-[15px]"
            >
              {crumb.label}
            </a>
            <ChevronRight size={14} className="shrink-0 text-[var(--ink-2)]" />
          </Fragment>
        ))}
        <span
          aria-current="page"
          className="text-[14px] font-semibold text-[var(--ink)] lg:text-[15px]"
        >
          {title}
        </span>
      </nav>

      <h1 className="w-full text-[32px] leading-[38px] font-bold text-[var(--ink)] lg:text-[52px] lg:leading-[60px]">
        {title}
      </h1>

      {/* Мобайл: цена и кнопка сразу под заголовком */}
      {service.kind === 'service' && <div className="lg:hidden">
        <Summary slug={service.slug} price={service.price} parentOrderId={parentOrderId} cart={cart} specialist={hasDirectContact(service)} />
      </div>}

      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-20 lg:pt-2">
        <div className="flex w-full flex-col gap-5 lg:flex-1 lg:gap-9">
          {service.kind === 'instruction' && <TextBlock title="Об инструкции" large>{service.description}</TextBlock>}
          {service.kind === 'service' && audience && (
            <TextBlock title="Кому и когда" large>
              {audience}
            </TextBlock>
          )}

          {service.kind === 'service' && hasDirectContact(service) && <SpecialistContact key={service.id} service={service} />}

          {service.kind === 'service' && needs.length > 0 && (
            <div className="flex w-full flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:gap-[14px] lg:p-7">
              <h2 className="text-[20px] font-bold text-[var(--ink)]">Что понадобится</h2>
              <ul className="flex w-full flex-col gap-3">
                {needs.map((need, i) => (
                  <NeedRow key={`${i}-${need.text}`} need={need} />
                ))}
              </ul>
            </div>
          )}

          {service.kind === 'service' && result && <TextBlock title={/воинск/i.test(service.title) ? 'Виды работ и стоимость' : 'Что получите'}>{result}</TextBlock>}
          {service.kind === 'instruction' && <InstructionPurchase service={service} />}
        </div>

        {/* Десктоп: сводка справа и едет вместе с прокруткой */}
        {service.kind === 'service' && <div className="hidden w-[380px] shrink-0 lg:sticky lg:top-[104px] lg:block">
          <Summary slug={service.slug} price={service.price} parentOrderId={parentOrderId} cart={cart} specialist={hasDirectContact(service)} />
        </div>}
      </div>
    </div>
  )
}
