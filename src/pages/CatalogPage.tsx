import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { RevealDiv } from '../components/Reveal'
import { ArrowBadge, PriceRow, ServiceCard } from '../components/ServiceCard'
import type { ServiceCardData } from '../components/ServiceCard'
import { useAuth } from '../lib/auth'
import {
  buildCatalog,
  CARD_NEEDS_LIMIT,
  CATALOG_HERO,
  CONSULTATION,
  serviceHref,
} from '../lib/catalog'
import type { CatalogSubgroup, Service } from '../lib/catalog'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { DOCS_NOTE, ORDER_HREF } from '../lib/content'
import { useServices } from '../lib/useServices'

/**
 * Карточка каталога: первые документы из чек-листа и «и ещё N»,
 * а если чек-листа нет — описание «Кому и когда».
 */
function toCard(service: Service): ServiceCardData {
  const rest = service.needs.length - CARD_NEEDS_LIMIT

  return {
    title: service.title,
    price: service.price,
    needs: service.needs.length
      ? service.needs.slice(0, CARD_NEEDS_LIMIT).map((n) => n.text)
      : undefined,
    more: rest > 0 ? `и ещё ${rest} →` : undefined,
    description: service.needs.length ? undefined : service.audience || undefined,
  }
}

/**
 * Какая группа сейчас на экране — для подсветки вкладки. Активной считаем
 * последнюю группу, чей верх уже ушёл выше середины экрана.
 */
function useActiveGroup(ids: string[]) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const update = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < window.innerHeight / 2) current = id
      }
      setActive(current)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [ids])

  return active
}

function Subgroup({ subgroup }: { subgroup: CatalogSubgroup }) {
  // Десктоп: ряды по три карточки; неполный ряд не растягивается — как в макете.
  return (
    <div className="flex w-full flex-col gap-1 lg:gap-4">
      {subgroup.title && (
        <h3 className="text-[20px] font-bold text-[var(--ink)] lg:text-[22px]">
          {subgroup.title}
        </h3>
      )}

      <div className="hidden grid-cols-3 gap-6 lg:grid">
        {subgroup.items.map((item, i) => (
          <ServiceCard
            key={item.slug}
            card={toCard(item)}
            href={serviceHref(item.slug)}
            delay={(i % 3) * 110}
          />
        ))}
      </div>

      <div className="flex w-full flex-col lg:hidden">
        {subgroup.items.map((item, i) => (
          <PriceRow
            key={item.slug}
            card={toCard(item)}
            href={serviceHref(item.slug)}
            delay={Math.min(i, 4) * 70}
          />
        ))}
      </div>
    </div>
  )
}

export function CatalogPage() {
  const { onOrderClick } = useAuth()
  const { services, loading, error } = useServices()

  const catalog = useMemo(() => buildCatalog(services ?? []), [services])
  const groupIds = useMemo(() => catalog.map((g) => g.id), [catalog])
  const active = useActiveGroup(groupIds)

  // Ссылка вида /services#person: браузер ищет якорь до загрузки услуг
  // и не находит — докручиваем сами, когда каталог появился.
  useEffect(() => {
    if (!catalog.length || !window.location.hash) return
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [catalog])

  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main>
        <section className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-7 lg:px-[120px] lg:pt-14 lg:pb-10">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[14px] lg:gap-5">
            <h1 className="text-[32px] font-bold text-[var(--ink)] lg:text-[56px]">
              {CATALOG_HERO.title}
            </h1>
            <p className="text-[18px] leading-[27px] font-medium text-[var(--ink)] lg:max-w-[640px] lg:text-[20px] lg:leading-[31px]">
              {CATALOG_HERO.lead}
            </p>
          </div>
        </section>

        {/* Вкладки-якоря прилипают под шапкой, чтобы переключаться в любой момент. */}
        <nav className="sticky top-[64px] z-40 w-full border-b border-[var(--line)] bg-[var(--page-bg)] pt-[10px] pb-[14px] lg:top-[72px] lg:px-[120px] lg:pt-3 lg:pb-4">
          <div className="mx-auto flex w-full max-w-[1200px] gap-2 overflow-x-auto px-5 lg:px-0">
            {catalog.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                aria-current={active === group.id ? 'true' : undefined}
                className={cn(
                  'flex h-[40px] shrink-0 cursor-pointer items-center justify-center rounded-full px-[18px] text-[15px] font-semibold whitespace-nowrap transition-colors lg:h-[44px] lg:px-[22px]',
                  active === group.id
                    ? 'bg-[var(--ink)] text-white'
                    : 'border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]',
                )}
              >
                {group.title}
              </a>
            ))}
          </div>
        </nav>

        <section className="w-full bg-[var(--surface)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-16 lg:pb-[120px]">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 lg:gap-14">
            {loading && <p className="text-[17px] text-[var(--ink-2)]">Загружаем услуги…</p>}
            {error && (
              <p role="alert" className="text-[17px] font-medium text-[var(--danger)]">
                Не удалось загрузить услуги: {error}
              </p>
            )}

            {catalog.map((group) => (
              <div
                key={group.id}
                id={group.id}
                // Шапка + вкладки: якорь не должен прятаться под ними.
                className={cn(
                  'flex w-full scroll-mt-[136px] flex-col lg:scroll-mt-[156px]',
                  group.subgroups.length > 1 ? 'gap-5 lg:gap-7' : 'gap-3 lg:gap-4',
                )}
              >
                <h2 className="text-[28px] font-bold text-[var(--ink)] lg:text-[32px]">
                  {group.title}
                </h2>
                {group.subgroups.map((subgroup) => (
                  <Subgroup key={subgroup.title || group.id} subgroup={subgroup} />
                ))}
              </div>
            ))}

            <RevealDiv>
              <a
                {...linkProps(ORDER_HREF)}
                onClick={onOrderClick}
                className="group flex w-full cursor-pointer flex-col gap-[10px] rounded-[20px] border border-[var(--line)] bg-white p-5 transition-[box-shadow,border-color] duration-300 hover:border-[var(--accent)] hover:shadow-[0_14px_38px_rgba(11,18,32,0.12)] lg:flex-row lg:items-center lg:justify-between lg:p-7"
              >
                <div className="flex flex-col gap-[10px] lg:gap-[6px]">
                  <span className="text-[13px] font-bold tracking-[1px] text-[var(--ink-2)]">
                    {CONSULTATION.label}
                  </span>
                  <span className="text-[20px] font-bold text-[var(--ink)] lg:text-[22px]">
                    {CONSULTATION.title}
                  </span>
                </div>
                <div className="flex w-full items-center justify-between lg:w-auto lg:gap-4">
                  <span className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)] lg:text-[24px]">
                    {CONSULTATION.price}
                  </span>
                  <span className="lg:hidden">
                    <ArrowBadge size={36} />
                  </span>
                  <span className="hidden lg:block">
                    <ArrowBadge size={44} />
                  </span>
                </div>
              </a>
            </RevealDiv>

            {/* Выноска — только десктоп, как в макете */}
            <RevealDiv className="hidden w-full items-center gap-3 rounded-[16px] bg-[var(--accent-soft)] px-6 py-5 lg:flex">
              <Info size={20} className="shrink-0 text-[var(--accent)]" />
              <p className="flex-1 text-[16px] leading-[23px] font-medium text-[var(--ink)]">
                {DOCS_NOTE}
              </p>
            </RevealDiv>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
