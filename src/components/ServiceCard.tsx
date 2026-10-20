import { ArrowRight, Check } from 'lucide-react'
import { RevealDiv } from './Reveal'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { ORDER_HREF } from '../lib/content'

/** Общая карточка услуги: главная показывает этап и выделение, каталог — нет. */
export type ServiceCardData = {
  title: string
  price: string
  stage?: string
  featured?: boolean
  description?: string
  needs?: string[]
  more?: string
}

/**
 * Куда ведёт карточка: на страницу услуги, если она есть, иначе — к заявке
 * (неавторизованного onOrderClick отправит на вход).
 */
function useCardLink(href?: string) {
  const { onOrderClick } = useAuth()
  return href ? linkProps(href) : { ...linkProps(ORDER_HREF), onClick: onOrderClick }
}

/** Десктоп: карточка с ценой и стрелкой. */
export function ServiceCard({
  card,
  delay,
  href,
  height = 400,
}: {
  card: ServiceCardData
  delay: number
  href?: string
  /** На главной карточки чуть ниже, чем в каталоге. */
  height?: 390 | 400
}) {
  const link = useCardLink(href)

  return (
    <RevealDiv delay={delay} className="flex min-w-0 flex-1">
      <a
        {...link}
        className={cn(
          'group flex w-full cursor-pointer flex-col items-start gap-3 rounded-[20px] bg-white p-7 transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-[6px] hover:border-[var(--accent)] hover:shadow-[0_14px_38px_rgba(11,18,32,0.12)]',
          card.featured
            ? 'border-[1.5px] border-[var(--accent)]'
            : 'border border-[var(--line)]',
          height === 400 ? 'h-[400px]' : 'h-[390px]',
        )}
      >
        {card.stage && (
          <div className="flex items-center gap-2">
            <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
            <span className="text-[13px] font-bold tracking-[1px] text-[var(--ink-2)]">
              {card.stage}
            </span>
          </div>
        )}

        <h3 className="w-full text-[22px] leading-[28px] font-bold text-[var(--ink)]">
          {card.title}
        </h3>

        {card.description && (
          <p className="w-full text-[15px] leading-[22px] text-[var(--ink-2)]">
            {card.description}
          </p>
        )}

        {card.needs && (
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
            {card.more && (
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
          <ArrowBadge size={44} dark={card.featured} />
        </div>
      </a>
    </RevealDiv>
  )
}

/** Мобайл: строка прайса — название, цена и стрелка. */
export function PriceRow({
  card,
  delay,
  href,
}: {
  card: ServiceCardData
  delay: number
  href?: string
}) {
  const link = useCardLink(href)

  return (
    <RevealDiv delay={delay} className="w-full">
      <a
        {...link}
        className="group flex w-full cursor-pointer flex-col gap-[6px] border-b border-[var(--line)] py-[14px] transition-colors hover:border-[var(--accent)]"
      >
        <p className="w-full text-[18px] leading-[23px] font-bold text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
          {card.title}
        </p>
        <div className="flex w-full items-center justify-between">
          <span className="text-[18px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
            {card.price}
          </span>
          <ArrowBadge size={36} />
        </div>
      </a>
    </RevealDiv>
  )
}

/** Круглая кнопка со стрелкой; темнеет при наведении на родителя с классом group. */
export function ArrowBadge({ size, dark }: { size: 36 | 44; dark?: boolean }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors duration-300',
        size === 44 ? 'h-[44px] w-[44px]' : 'h-[36px] w-[36px]',
        dark
          ? 'bg-[var(--ink)] text-white'
          : 'border-[1.5px] border-[var(--line)] bg-white text-[var(--ink)] group-hover:border-[var(--ink)] group-hover:bg-[var(--ink)] group-hover:text-white',
      )}
    >
      <ArrowRight
        size={size === 44 ? 18 : 16}
        className="transition-transform duration-300 group-hover:translate-x-[3px]"
      />
    </span>
  )
}
