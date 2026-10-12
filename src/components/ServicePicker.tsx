import { useState } from 'react'
import { Check, Info, Wallet } from 'lucide-react'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'
import { ORDER_HREF, PAYMENT_NOTE, PICKER } from '../lib/content'

function Callout({ icon, children }: { icon: 'info' | 'wallet'; children: string }) {
  const Icon = icon === 'info' ? Info : Wallet
  return (
    <div className="flex w-full items-start gap-[10px] rounded-[16px] bg-[var(--accent-soft)] px-4 py-[14px]">
      <Icon size={20} className="shrink-0 text-[var(--accent)]" />
      <p className="flex-1 text-[15px] leading-[22px] font-medium text-[var(--ink)] lg:text-[16px] lg:leading-[23px]">
        {children}
      </p>
    </div>
  )
}

export function ServicePicker() {
  const [active, setActive] = useState(1)
  const current = PICKER[active]

  return (
    <div className="flex w-full flex-col items-start gap-[18px] rounded-[20px] border-[1.5px] border-white bg-[#FFFFFFB3] p-7 backdrop-blur-[12px] lg:w-[560px] lg:shrink-0">
      {/* Переключатель */}
      <div
        role="tablist"
        aria-label="Этап работы"
        className="flex w-full gap-1 rounded-[12px] bg-[var(--page-bg)] p-1"
      >
        {PICKER.map((item, i) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'h-[40px] flex-1 cursor-pointer rounded-[9px] text-[15px] font-semibold transition-colors',
              i === active
                ? 'bg-[var(--ink)] text-white'
                : 'text-[var(--ink)] hover:bg-[#e7ebf5]',
            )}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <h3 className="w-full text-[24px] font-bold tracking-[-0.5px] text-[var(--ink)]">
        {current.title}
      </h3>

      <p className="w-full text-[40px] font-extrabold tracking-[-1.2px] text-[var(--accent)] lg:text-[44px] lg:tracking-[-1.32px]">
        {current.price}
      </p>

      <div className="h-px w-full bg-[var(--line)]" />

      {current.checklist && (
        <>
          <p className="text-[16px] font-bold text-[var(--ink)]">Что понадобится</p>
          <ul className="flex w-full flex-col gap-[10px]">
            {current.checklist.map((item) => (
              <li key={item} className="flex items-center gap-[10px]">
                <Check size={20} className="shrink-0 text-[var(--accent)]" />
                <span className="text-[16px] font-medium text-[var(--ink)]">{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {current.note && <Callout icon="info">{current.note}</Callout>}

      <a
        {...linkProps(ORDER_HREF)}
        className="flex h-[56px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-[var(--ink)] px-7 text-[16px] font-bold text-white transition-colors hover:bg-[#1a2740]"
      >
        Оставить заявку
      </a>

      <Callout icon="wallet">{PAYMENT_NOTE}</Callout>
    </div>
  )
}
