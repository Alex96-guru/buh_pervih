import { Globe, Mail, MessageCircle, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CONTACTS, HERO } from '../lib/content'

const ICONS: Record<string, LucideIcon> = {
  'message-circle': MessageCircle,
  send: Send,
  mail: Mail,
  globe: Globe,
}

export function Contacts() {
  return (
    <section
      id="contacts"
      className="w-full bg-[var(--surface)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-20">
        <div className="flex flex-col gap-6 lg:flex-1 lg:gap-8">
          <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-6">
            <div className="flex flex-col items-center gap-1 lg:gap-[6px]">
              <img
                src={HERO.photo}
                alt={CONTACTS.avatarCaption}
                className="h-[96px] w-[96px] rounded-full object-cover lg:h-[120px] lg:w-[120px]"
                loading="lazy"
              />
              <span className="text-[12px] font-semibold text-[var(--ink)] lg:text-[13px]">
                {CONTACTS.avatarCaption}
              </span>
            </div>
            <p className="flex-1 text-[22px] leading-[29px] font-bold text-[var(--ink)] lg:w-[420px] lg:flex-none lg:text-[28px] lg:leading-[36px]">
              {CONTACTS.invitation}
            </p>
          </div>

          <div className="flex w-fit flex-col gap-[18px] lg:gap-5">
            {CONTACTS.rows.map((row) => {
              const Icon = ICONS[row.icon]
              return (
                <a
                  key={row.label}
                  href={row.href}
                  target={row.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="group flex w-fit items-center gap-3 lg:gap-[14px]"
                >
                  <Icon size={24} className="shrink-0 text-[var(--ink)]" />
                  <span className="flex flex-col gap-[2px]">
                    <span className="text-[14px] text-[var(--ink-2)]">{row.label}</span>
                    <span className="text-[20px] font-bold text-[var(--ink)] group-hover:text-[var(--accent)]">
                      {row.value}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>

          <p className="text-[15px] text-[var(--ink-2)]">{CONTACTS.hours}</p>
        </div>

        {/* QR — только десктоп, как в макете */}
        <div className="hidden w-[260px] shrink-0 flex-col items-center gap-3 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:flex">
          <img src="/image-2.png" alt="QR-код Telegram" className="h-[160px] w-[160px]" />
          <p className="w-full text-center text-[15px] leading-[21px] font-medium text-[var(--ink-2)]">
            {CONTACTS.qrCaption}
          </p>
        </div>
      </div>
    </section>
  )
}
