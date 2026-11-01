import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { RevealDiv } from '../components/Reveal'
import { Button, SectionTitle } from '../components/ui'
import { FAQ, ORDER_HREF } from '../lib/content'

export function Faq() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)

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
          {FAQ.items.map((item, i) => (
            <RevealDiv
              key={item.q}
              delay={i * 70}
              className="flex w-full flex-col gap-2 border-b border-[var(--line)] py-5 lg:py-6"
            >
              <h3 className="w-full text-[18px] font-bold text-[var(--ink)] lg:text-[19px]">
                <button type="button" aria-expanded={openQuestion === i} aria-controls={`faq-answer-${i}`} onClick={() => setOpenQuestion((current) => current === i ? null : i)} className="flex w-full cursor-pointer items-start justify-between gap-3 text-left lg:hidden">
                  <span>{item.q}</span><ChevronDown size={20} aria-hidden="true" className={`mt-0.5 shrink-0 transition-transform ${openQuestion === i ? 'rotate-180' : ''}`} />
                </button>
                <span className="hidden lg:block">{item.q}</span>
              </h3>
              <p id={`faq-answer-${i}`} className={`${openQuestion === i ? 'block' : 'hidden'} w-full text-[16px] leading-[25px] text-[var(--ink-2)] lg:block lg:text-[17px] lg:leading-[26px]`}>{item.a}</p>
            </RevealDiv>
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
