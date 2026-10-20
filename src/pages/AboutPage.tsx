import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { RevealDiv } from '../components/Reveal'
import { TEAM } from '../lib/content'

type Member = (typeof TEAM.members)[number]

function Label({ children }: { children: string }) {
  return <p className="text-[14px] font-bold text-[var(--ink-2)]">{children}</p>
}

function MemberCard({ member, delay }: { member: Member; delay: number }) {
  return (
    <RevealDiv
      delay={delay}
      className="group flex w-full flex-col gap-[14px] rounded-[20px] border border-[var(--line)] bg-white p-5 lg:flex-1 lg:p-6"
    >
      <div className="h-[360px] w-full overflow-hidden rounded-[20px] lg:h-[420px]">
        <img
          src={member.photo}
          alt={member.name}
          width={500}
          height={660}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      </div>

      <h2 className="w-full text-[22px] font-bold text-[var(--ink)]">{member.name}</h2>
      <p className="text-[16px] font-semibold text-[var(--accent)]">{member.role}</p>

      <Label>Образование</Label>
      <p className="w-full text-[16px] leading-[24px] text-[var(--ink)]">{member.education}</p>

      <Label>Опыт</Label>
      <ul className="flex w-full flex-col gap-2">
        {member.experience.map((line) => (
          <li key={line} className="text-[16px] leading-[24px] text-[var(--ink)]">
            {line}
          </li>
        ))}
      </ul>
    </RevealDiv>
  )
}

/** «О компании» — в макете только десктоп; на телефоне карточки идут столбиком. */
export function AboutPage() {
  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main className="w-full bg-[var(--surface)] px-5 pt-10 pb-[72px] lg:px-[120px] lg:pt-[72px] lg:pb-[120px]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 lg:gap-10">
          <h1 className="text-[32px] font-bold text-[var(--ink)] lg:text-[56px]">О компании</h1>

          <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
            {TEAM.members.map((member, i) => (
              <MemberCard key={member.name} member={member} delay={i * 120} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
