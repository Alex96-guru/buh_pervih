import { SectionLead, SectionTitle } from '../components/ui'
import { TEAM } from '../lib/content'

export function Team() {
  return (
    <section id="team" className="w-full bg-[var(--page-bg)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 lg:gap-7">
        <SectionTitle>{TEAM.title}</SectionTitle>
        <SectionLead className="lg:max-w-[640px] lg:leading-[31px]">{TEAM.lead}</SectionLead>

        <div className="flex w-full flex-col gap-7 lg:flex-row lg:items-start lg:gap-6">
          {TEAM.members.map((member) => (
            <div key={member.name} className="flex w-full flex-col gap-3 lg:flex-1 lg:gap-[14px]">
              {'photo' in member && member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="h-[262px] w-full rounded-[20px] object-cover lg:h-[480px]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-[262px] w-full items-center justify-center rounded-[20px] bg-[var(--accent-soft)] lg:h-[480px]">
                  <span className="text-[40px] font-bold text-[var(--ink-2)]">
                    {'initials' in member ? member.initials : ''}
                  </span>
                </div>
              )}

              <div className="flex w-full flex-col gap-1">
                <p className="text-[20px] font-bold text-[var(--ink)]">{member.name}</p>
                <p className="text-[16px] text-[var(--ink-2)]">{member.role}</p>
                <p className="w-full text-[15px] leading-[22px] text-[var(--ink)]">{member.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
