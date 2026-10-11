import { ArrowRight, Check, Info } from 'lucide-react'
import { SectionLead, SectionTitle } from '../components/ui'
import { cn } from '../lib/cn'
import { DOCS_NOTE, ORDER_HREF, SERVICES } from '../lib/content'

type Card = (typeof SERVICES.cards)[number]

function ServiceCard({ card }: { card: Card }) {
  return (
    <a
      href={ORDER_HREF}
      className={cn(
        'group flex h-[390px] flex-1 flex-col items-start gap-3 rounded-[20px] bg-white p-7 transition-shadow hover:shadow-[0_8px_28px_rgba(11,18,32,0.08)]',
        card.featured
          ? 'border-[1.5px] border-[var(--accent)]'
          : 'border border-[var(--line)]',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
        <span className="text-[13px] font-bold tracking-[1px] text-[var(--ink-2)]">
          {card.stage}
        </span>
      </div>

      <h3 className="w-full text-[22px] leading-[28px] font-bold text-[var(--ink)]">
        {card.title}
      </h3>

      {'description' in card && card.description && (
        <p className="w-full text-[15px] leading-[22px] text-[var(--ink-2)]">{card.description}</p>
      )}

      {'needs' in card && card.needs && (
        <div className="flex w-full flex-col gap-[7px]">
          <p className="text-[13px] font-bold tracking-[1px] text-[var(--ink-2)]">Понадобится</p>
          {card.needs.map((need) => (
            <div key={need} className="flex w-full items-start gap-2">
              <Check size={16} className="mt-[3px] shrink-0 text-[var(--accent)]" />
              <span className="flex-1 text-[15px] leading-[21px] font-medium text-[var(--ink)]">
                {need}
              </span>
            </div>
          ))}
          {'more' in card && card.more && (
            <span className="text-[14px] font-semibold text-[var(--accent)]">{card.more}</span>
          )}
        </div>
      )}

      <div className="flex-1" />
      <div className="h-px w-full bg-[var(--line)]" />

      <div className="flex w-full items-center justify-between">
        <span className="text-[24px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          {card.price}
        </span>
        <span
          className={cn(
            'flex h-[44px] w-[44px] items-center justify-center rounded-full',
            card.featured
              ? 'bg-[var(--ink)] text-white'
              : 'border-[1.5px] border-[var(--line)] bg-white text-[var(--ink)]',
          )}
        >
          <ArrowRight size={18} />
        </span>
      </div>
    </a>
  )
}

function PriceRow({ card }: { card: Card }) {
  return (
    <a
      href={ORDER_HREF}
      className="flex w-full flex-col gap-[6px] border-b border-[var(--line)] py-4"
    >
      <p className="w-full text-[18px] font-bold text-[var(--ink)]">{card.title}</p>
      <div className="flex w-full items-center justify-between pt-1">
        <span className="text-[18px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          {card.price}
        </span>
        <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full border-[1.5px] border-[var(--line)] bg-white text-[var(--ink)]">
          <ArrowRight size={16} />
        </span>
      </div>
    </a>
  )
}

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
              {row.map((card) => (
                <ServiceCard key={card.title} card={card} />
              ))}
            </div>
          ))}
        </div>

        {/* Мобайл: строки прайса */}
        <div className="flex w-full flex-col lg:hidden">
          {SERVICES.cards.map((card) => (
            <PriceRow key={card.title} card={card} />
          ))}
        </div>

        {/* Выноска — только десктоп, как в макете */}
        <div className="hidden w-full items-center gap-6 rounded-[16px] bg-[var(--accent-soft)] px-6 py-5 lg:flex">
          <Info size={20} className="shrink-0 text-[var(--accent)]" />
          <p className="flex-1 text-[16px] leading-[23px] font-medium text-[var(--ink)]">
            {DOCS_NOTE}
          </p>
          <a
            href={ORDER_HREF}
            className="flex shrink-0 items-center gap-2 text-[16px] font-semibold text-[var(--accent)] hover:underline"
          >
            Все услуги и цены
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
