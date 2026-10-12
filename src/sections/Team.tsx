import { RevealDiv } from '../components/Reveal'
import { SectionLead, SectionTitle } from '../components/ui'
import { TEAM } from '../lib/content'

export function Team() {
  return (
    <section id="team" className="w-full bg-[var(--page-bg)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 lg:gap-7">
        <SectionTitle>{TEAM.title}</SectionTitle>
        <SectionLead className="lg:max-w-[640px] lg:leading-[31px]">{TEAM.lead}</SectionLead>

        <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start lg:gap-6">
          {TEAM.members.map((member, i) => (
            <RevealDiv
              key={member.name}
              delay={i * 120}
              className="group flex w-full flex-col gap-3 lg:flex-1 lg:gap-[14px]"
            >
              <div className="h-[262px] w-full overflow-hidden rounded-[20px] lg:h-[480px]">
                <img
                  src={member.photo}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  loading="lazy"
                />
              </div>

              <div className="flex w-full flex-col gap-1">
                <p className="text-[20px] font-bold text-[var(--ink)]">{member.name}</p>
                <p className="text-[16px] text-[var(--ink-2)]">{member.role}</p>
                <p className="w-full text-[15px] leading-[22px] text-[var(--ink)]">{member.note}</p>
              </div>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  )
}
