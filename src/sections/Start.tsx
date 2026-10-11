import { ServicePicker } from '../components/ServicePicker'
import { RevealDiv, useReveal } from '../components/Reveal'
import { SectionLead, SectionTitle } from '../components/ui'
import { START } from '../lib/content'

export function Start() {
  const left = useReveal<HTMLDivElement>()
  const right = useReveal<HTMLDivElement>(140)

  return (
    <section className="overlap w-full overflow-hidden bg-[var(--surface)] px-5 pt-[72px] pb-12 lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:flex-row lg:items-start lg:gap-20">
        <div
          ref={left.ref}
          style={left.revealStyle}
          className={`flex flex-col gap-5 lg:flex-1 ${left.revealClass}`}
        >
          <SectionTitle>{START.title}</SectionTitle>
          <SectionLead>{START.lead}</SectionLead>

          <div className="flex w-full flex-col lg:pt-3">
            {START.stages.map((stage, i) => (
              <RevealDiv
                key={stage.title}
                delay={120 + i * 90}
                className="flex w-full flex-col gap-[6px] border-b border-[var(--line)] py-4 transition-colors hover:border-[var(--accent)] lg:py-5"
              >
                <p className="text-[18px] font-bold text-[var(--ink)]">{stage.title}</p>
                <p className="text-[16px] text-[var(--ink-2)]">{stage.text}</p>
              </RevealDiv>
            ))}
          </div>
        </div>

        <div
          ref={right.ref}
          style={right.revealStyle}
          className={`flex w-full lg:w-auto ${right.revealClass}`}
        >
          <ServicePicker />
        </div>
      </div>
    </section>
  )
}
