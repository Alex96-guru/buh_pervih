import { Fragment } from 'react'
import { Check, ChevronRight, Info } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import { CATALOG_PATH, groupTitle } from '../lib/catalog'
import type { CatalogNeed, Service } from '../lib/catalog'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { DOCS_NOTE, ORDER_HREF } from '../lib/content'
import { useService } from '../lib/useServices'

/** Цена, «Заказать» и подсказка про документы. На десктопе — правая колонка. */
function Summary({ price }: { price: string }) {
  const { onOrderClick } = useAuth()

  return (
    <div className="flex w-full flex-col gap-[14px] rounded-[20px] border border-[var(--line)] bg-white p-6 lg:gap-4 lg:p-7">
      <p className="text-[40px] font-extrabold tracking-[-1.2px] text-[var(--accent)] lg:text-[44px] lg:tracking-[-1.32px]">
        {price}
      </p>
      <Button href={ORDER_HREF} onClick={onOrderClick} className="w-full">
        Заказать
      </Button>
      <div className="flex w-full items-start gap-[10px] rounded-[16px] bg-[var(--accent-soft)] px-4 py-[14px]">
        <Info size={20} className="mt-px shrink-0 text-[var(--accent)]" />
        <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)]">
          {DOCS_NOTE}
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
          'text-[17px] leading-[26px] text-[var(--ink-2)]',
          large && 'lg:text-[18px] lg:leading-[28px]',
        )}
      >
        {children}
      </p>
    </div>
  )
}

export function ServicePage() {
  const { slug = '' } = useParams()
  const { service, loading, error, notFound } = useService(slug)

  // Услугу удалили или адрес с опечаткой — ведём в каталог, а не на пустую страницу.
  if (notFound) return <Navigate to={CATALOG_PATH} replace />

  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-[72px] lg:px-[120px] lg:pt-12 lg:pb-[120px]">
        {service ? (
          <ServiceContent service={service} />
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

function ServiceContent({ service }: { service: Service }) {
  const { title, audience, needs, result } = service

  const crumbs = [
    { label: 'Услуги', href: CATALOG_PATH },
    { label: groupTitle(service.group), href: `${CATALOG_PATH}#${service.group}` },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:gap-8">
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
      <div className="lg:hidden">
        <Summary price={service.price} />
      </div>

      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-20 lg:pt-2">
        <div className="flex w-full flex-col gap-5 lg:flex-1 lg:gap-9">
          {audience && (
            <TextBlock title="Кому и когда" large>
              {audience}
            </TextBlock>
          )}

          {needs.length > 0 && (
            <div className="flex w-full flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-white p-6 lg:gap-[14px] lg:p-7">
              <h2 className="text-[20px] font-bold text-[var(--ink)]">Что понадобится</h2>
              <ul className="flex w-full flex-col gap-3">
                {needs.map((need, i) => (
                  <NeedRow key={`${i}-${need.text}`} need={need} />
                ))}
              </ul>
            </div>
          )}

          {result && <TextBlock title="Что получите">{result}</TextBlock>}
        </div>

        {/* Десктоп: сводка справа и едет вместе с прокруткой */}
        <div className="hidden w-[380px] shrink-0 lg:sticky lg:top-[104px] lg:block">
          <Summary price={service.price} />
        </div>
      </div>
    </div>
  )
}
