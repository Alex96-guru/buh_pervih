import { ArrowRight } from 'lucide-react'
import { Fragment } from 'react'
import { RevealDiv } from '../components/Reveal'
import { SectionTitle } from '../components/ui'
import { AUDIENCE, ORDER_HREF } from '../lib/content'

export function Audience() {
  return (
    <section className="w-full bg-[var(--surface)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:gap-9">
        <SectionTitle>{AUDIENCE.title}</SectionTitle>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-16">
          <div className="flex flex-col gap-7 lg:w-[720px] lg:shrink-0 lg:gap-8">
            {AUDIENCE.blocks.map((block, i) => (
              <Fragment key={block.title}>
                {i > 0 && <div className="h-px w-full bg-[var(--line)]" />}
                <RevealDiv
                  delay={i * 120}
                  className="flex w-full flex-col gap-2 lg:gap-[10px]"
                >
                  <h3 className="text-[20px] font-bold text-[var(--ink)] lg:text-[22px]">
                    {block.title}
                  </h3>
                  <p className="w-full text-[17px] leading-[26px] text-[var(--ink-2)]">
                    {block.text}
                  </p>
                  <a
                    href={ORDER_HREF}
                    className="group flex w-fit items-center gap-2 pt-[2px] text-[16px] font-semibold text-[var(--accent)] hover:underline lg:pt-1"
                  >
                    {block.link}
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-[3px]"
                    />
                  </a>
                </RevealDiv>
              </Fragment>
            ))}
          </div>

          <RevealDiv
            delay={180}
            className="group relative h-[240px] w-full overflow-hidden rounded-[20px] lg:h-auto lg:flex-1 lg:rounded-[28px]"
          >
            <img
              src={AUDIENCE.photo}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
            <span className="absolute top-[14px] left-[14px] rounded-[8px] bg-[#FFFFFFCC] px-[10px] py-[5px] text-[12px] font-semibold text-[var(--ink)]">
              {AUDIENCE.photoBadge}
            </span>
          </RevealDiv>
        </div>
      </div>
    </section>
  )
}
