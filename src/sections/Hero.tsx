import { Button } from '../components/ui'
import { HERO, ORDER_HREF } from '../lib/content'

export function Hero() {
  return (
    <section
      id="top"
      className="w-full overflow-hidden bg-[var(--page-bg)] px-5 pt-12 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:flex-row lg:items-center lg:gap-16">
        {/* Левая колонка */}
        <div className="flex flex-col gap-5 lg:flex-1 lg:gap-6">
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
            <Button href={ORDER_HREF} className="w-full lg:w-auto">
              Оставить заявку
            </Button>
            <Button href="#services" variant="secondary" className="w-full lg:w-auto">
              Цены на услуги
            </Button>
          </div>

          <p className="text-[15px] font-medium text-[var(--ink-2)]">{HERO.hours}</p>
        </div>

        {/* Правая колонка: фото и подпись */}
        <div className="flex flex-col gap-4 lg:w-[460px] lg:shrink-0">
          <img
            src={HERO.photo}
            alt={HERO.personName}
            className="h-[438px] w-full rounded-[20px] object-cover lg:h-[575px]"
          />
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
