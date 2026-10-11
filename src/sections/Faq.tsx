import { Button, SectionTitle } from '../components/ui'
import { FAQ, ORDER_HREF } from '../lib/content'

export function Faq() {
  return (
    <section className="w-full bg-[var(--page-bg)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 lg:flex-row lg:items-start lg:gap-20">
        {/* Левая колонка — на мобайле остаётся только заголовок */}
        <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">
          <SectionTitle>{FAQ.title}</SectionTitle>
          <p className="hidden text-[17px] leading-[26px] text-[var(--ink-2)] lg:block">
            {FAQ.lead}
          </p>
          <div className="hidden pt-2 lg:block">
            <Button href={ORDER_HREF}>{FAQ.cta}</Button>
          </div>
        </div>

        <div className="flex w-full flex-col lg:flex-1">
          {FAQ.items.map((item) => (
            <div
              key={item.q}
              className="flex w-full flex-col gap-2 border-b border-[var(--line)] py-5 lg:py-6"
            >
              <h3 className="w-full text-[18px] font-bold text-[var(--ink)] lg:text-[19px]">
                {item.q}
              </h3>
              <p className="w-full text-[17px] leading-[26px] text-[var(--ink-2)]">{item.a}</p>
            </div>
          ))}
        </div>

        {/* На мобайле приглашение и кнопка идут после списка */}
        <p className="text-[17px] leading-[26px] text-[var(--ink-2)] lg:hidden">{FAQ.lead}</p>
        <Button href={ORDER_HREF} className="w-full lg:hidden">
          {FAQ.cta}
        </Button>
      </div>
    </section>
  )
}
