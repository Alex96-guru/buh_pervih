import { ArrowRight, Info } from 'lucide-react'
import { RevealDiv } from '../components/Reveal'
import { PriceRow, ServiceCard } from '../components/ServiceCard'
import { SectionLead, SectionTitle } from '../components/ui'
import { linkProps } from '../lib/links'
import { CATALOG_PATH } from '../lib/catalog'
import { DOCS_NOTE, SERVICES } from '../lib/content'

export function Services() {
  const rows = [SERVICES.cards.slice(0, 3), SERVICES.cards.slice(3, 6)]

  return (
    <section
      id="services"
      className="w-full bg-[var(--page-bg)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 lg:gap-7">
        <SectionTitle>{SERVICES.title}</SectionTitle>
        <SectionLead className="lg:max-w-[640px]">{SERVICES.lead}</SectionLead>

        {/* Десктоп: сетка карточек */}
        <div className="hidden flex-col gap-6 lg:flex">
          {rows.map((row, i) => (
            <div key={i} className="flex w-full items-stretch gap-6">
              {row.map((card, j) => (
                <ServiceCard key={card.title} card={card} delay={j * 110} height={390} />
              ))}
            </div>
          ))}
        </div>

        {/* Мобайл: строки прайса */}
        <div className="flex w-full flex-col lg:hidden">
          {SERVICES.cards.map((card, i) => (
            <PriceRow key={card.title} card={card} delay={i * 70} />
          ))}
        </div>

        {/* Выноска — только десктоп, как в макете */}
        <RevealDiv className="hidden w-full items-center gap-6 rounded-[16px] bg-[var(--accent-soft)] px-6 py-5 lg:flex">
          <Info size={20} className="shrink-0 text-[var(--accent)]" />
          <p className="flex-1 text-[16px] leading-[23px] font-medium text-[var(--ink)]">
            {DOCS_NOTE}
          </p>
          <a
            {...linkProps(CATALOG_PATH)}
            className="group flex shrink-0 cursor-pointer items-center gap-2 text-[16px] font-semibold text-[var(--accent)] hover:underline"
          >
            Все услуги и цены
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-[3px]"
            />
          </a>
        </RevealDiv>
      </div>
    </section>
  )
}
