import { MessengerTile } from '../components/MessengerTile'
import { useReveal } from '../components/Reveal'
import { Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import { HERO, MESSENGERS, ORDER_HREF } from '../lib/content'

export function Hero() {
  const left = useReveal<HTMLDivElement>()
  const right = useReveal<HTMLDivElement>(140)
  const { onOrderClick } = useAuth()

  return (
    <section
      id="top"
      className="w-full overflow-hidden bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:flex-row lg:items-center lg:gap-16">
        {/* Левая колонка */}
        <div
          ref={left.ref}
          style={left.revealStyle}
          className={`flex flex-col gap-5 lg:flex-1 lg:gap-6 ${left.revealClass}`}
        >
          <h1 className="text-[32px] leading-[38px] font-bold text-[var(--ink)] lg:text-[56px] lg:leading-[64px]">
            {HERO.title}
          </h1>

          <p className="text-[17px] leading-[26px] text-[var(--ink-2)] lg:text-[18px] lg:leading-[28px]">
            {HERO.subtitle}
          </p>

          <p className="text-[17px] leading-[26px] font-semibold text-[var(--ink)] lg:text-[18px] lg:leading-[28px]">
            {HERO.keyPhrase}
          </p>

          <div className="flex flex-col gap-3 lg:flex-row lg:pt-2">
            <Button href={ORDER_HREF} className="w-full lg:w-auto" onClick={onOrderClick}>
              Оставить заявку
            </Button>
            <Button href="#services" variant="secondary" className="w-full lg:w-auto">
              Цены на услуги
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {MESSENGERS.map((m) => (
              <MessengerTile
                key={m.channel}
                icon={m.icon}
                channel={m.channel}
                contact={m.contact}
                href={m.href}
                force={m.force}
                className="w-full sm:w-fit"
              />
            ))}
          </div>

          <p className="text-[15px] font-medium text-[var(--ink-2)]">{HERO.hours}</p>
        </div>

        {/* Правая колонка: фото и подпись */}
        <div
          ref={right.ref}
          style={right.revealStyle}
          className={`flex flex-col gap-4 lg:w-[460px] lg:shrink-0 ${right.revealClass}`}
        >
          <div className="h-[438px] w-full overflow-hidden rounded-[20px] lg:h-[575px]">
            <img
              src={HERO.photo}
              alt={HERO.personName}
              width={507}
              height={709}
              decoding="async"
              fetchPriority="high"
              className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[15px] leading-[21px] font-medium text-[var(--ink-2)]">
              {HERO.personName}
            </p>
            <p className="text-[15px] leading-[22px] text-[var(--ink)]">{HERO.personNote}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
