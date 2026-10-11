import { Lock } from 'lucide-react'
import { RevealDiv } from '../components/Reveal'
import { SectionTitle } from '../components/ui'
import { PROCESS } from '../lib/content'

export function Process() {
  return (
    <section
      id="process"
      className="overlap w-full bg-[var(--ink)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:gap-10">
        <SectionTitle tone="light">{PROCESS.title}</SectionTitle>

        <div className="flex w-full flex-col gap-5 lg:flex-row lg:gap-6">
          {PROCESS.steps.map((step, i) => (
            <RevealDiv
              key={i}
              delay={i * 110}
              className="group flex w-full flex-col items-start gap-2 lg:flex-1 lg:gap-3"
            >
              <div className="h-[2px] w-full bg-[#FFFFFF33] transition-colors duration-300 group-hover:bg-[var(--blob-blue)]" />
              <span className="text-[40px] font-extrabold text-[var(--blob-blue)] transition-colors duration-300 group-hover:text-white">
                {i + 1}
              </span>
              <p className="w-full text-[17px] leading-[26px] font-medium text-white">{step}</p>
            </RevealDiv>
          ))}
        </div>

        <RevealDiv
          delay={160}
          className="flex w-full items-start gap-3 rounded-[16px] bg-[#FFFFFF14] px-5 py-[18px] transition-colors hover:bg-[#FFFFFF1F] lg:w-fit lg:items-center lg:px-6 lg:py-5"
        >
          <Lock size={20} className="shrink-0 text-white" />
          <p className="flex-1 text-[16px] leading-[24px] font-medium text-[#FFFFFFD9] lg:leading-normal lg:whitespace-nowrap">
            {PROCESS.security}
          </p>
        </RevealDiv>
      </div>
    </section>
  )
}
