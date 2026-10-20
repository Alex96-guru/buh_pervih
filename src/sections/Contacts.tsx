import type { ComponentType } from 'react'
import { Globe, Mail, MessageCircle, Send } from 'lucide-react'
import { VkIcon } from '../components/BrandIcons'
import { RevealDiv } from '../components/Reveal'
import { linkProps } from '../lib/links'
import { CONTACTS, HERO } from '../lib/content'

type IconComponent = ComponentType<{ size?: number; className?: string }>

const ICONS: Record<string, IconComponent> = {
  'message-circle': MessageCircle,
  send: Send,
  mail: Mail,
  globe: Globe,
  vk: VkIcon,
}

/** Каналы связи и QR — общий блок для главной и страницы «Контакты». */
export function ContactsContent() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-20">
      <div className="flex flex-col gap-6 lg:flex-1 lg:gap-8">
        <RevealDiv className="flex w-full items-center gap-4 lg:w-fit lg:gap-6">
          <div className="flex flex-col items-center gap-1 lg:gap-[6px]">
            <img
              src={HERO.photo}
              alt={CONTACTS.avatarCaption}
              width={120}
              height={120}
              loading="lazy"
              decoding="async"
              className="h-[96px] w-[96px] rounded-full object-cover lg:h-[120px] lg:w-[120px]"
            />
            <span className="text-[12px] font-semibold text-[var(--ink)] lg:text-[13px]">
              {CONTACTS.avatarCaption}
            </span>
          </div>
          <p className="flex-1 text-[22px] leading-[29px] font-bold text-[var(--ink)] lg:w-[420px] lg:flex-none lg:text-[28px] lg:leading-[36px]">
            {CONTACTS.invitation}
          </p>
        </RevealDiv>

        <div className="flex w-fit flex-col gap-[18px] lg:gap-5">
          {CONTACTS.rows.map((row, i) => {
            const Icon = ICONS[row.icon]
            return (
              <RevealDiv key={row.label} delay={i * 90} className="w-fit">
                <a
                  {...linkProps(row.href, { force: row.force })}
                  className="group flex w-fit cursor-pointer items-center gap-3 transition-transform duration-300 hover:translate-x-[4px] lg:gap-[14px]"
                >
                  <Icon
                    size={24}
                    className="shrink-0 text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--accent)]"
                  />
                  <span className="flex flex-col gap-[2px]">
                    <span className="text-[14px] text-[var(--ink-2)]">{row.label}</span>
                    <span className="text-[20px] font-bold text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                      {row.value}
                    </span>
                  </span>
                </a>
              </RevealDiv>
            )
          })}
        </div>

        <p className="text-[15px] text-[var(--ink-2)]">{CONTACTS.hours}</p>
      </div>

      {/* QR — только десктоп, как в макете */}
      <RevealDiv
        delay={160}
        className="hidden w-[260px] shrink-0 flex-col items-center gap-3 rounded-[20px] border border-[var(--line)] bg-white p-5 transition-[box-shadow,border-color] duration-300 hover:border-[var(--accent)] hover:shadow-[0_12px_32px_rgba(11,18,32,0.10)] lg:flex"
      >
        <img src="/image-2.png" alt="QR-код Telegram" className="h-[160px] w-[160px]" />
        <p className="w-full text-center text-[15px] leading-[21px] font-medium text-[var(--ink-2)]">
          {CONTACTS.qrCaption}
        </p>
      </RevealDiv>
    </div>
  )
}

export function Contacts() {
  return (
    <section
      id="contacts"
      className="overlap w-full bg-[var(--surface)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]"
    >
      <ContactsContent />
    </section>
  )
}
