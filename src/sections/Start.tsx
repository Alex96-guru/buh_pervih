import { ServicePicker } from '../components/ServicePicker'
import { SectionLead, SectionTitle } from '../components/ui'
import { START } from '../lib/content'

export function Start() {
  return (
    <section className="w-full overflow-hidden bg-[var(--surface)] px-5 pt-[72px] pb-12 lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:flex-row lg:items-start lg:gap-20">
        <div className="flex flex-col gap-5 lg:flex-1">
          <SectionTitle>{START.title}</SectionTitle>
          <SectionLead>{START.lead}</SectionLead>

          <div className="flex w-full flex-col lg:pt-3">
            {START.stages.map((stage) => (
              <div
                key={stage.title}
                className="flex w-full flex-col gap-[6px] border-b border-[var(--line)] py-4 lg:py-5"
              >
                <p className="text-[18px] font-bold text-[var(--ink)]">{stage.title}</p>
                <p className="text-[16px] text-[var(--ink-2)]">{stage.text}</p>
              </div>
            ))}
          </div>
        </div>

        <ServicePicker />
      </div>
    </section>
  )
}
