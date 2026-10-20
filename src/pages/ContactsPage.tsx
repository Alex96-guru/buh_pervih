import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { RevealDiv } from '../components/Reveal'
import { CONTACTS_PAGE, REQUISITES } from '../lib/content'
import { ContactsContent } from '../sections/Contacts'

/** ИНН и КПП часто нужны для платёжки — копируются в одно нажатие. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Буфер обмена недоступен (http, старый браузер) — значение можно выделить руками.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Скопировать ${label}`}
      className="flex h-[32px] w-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--ink-2)] transition-colors hover:bg-[var(--page-bg)] hover:text-[var(--accent)]"
    >
      {copied ? <Check size={16} className="text-[var(--accent)]" /> : <Copy size={16} />}
    </button>
  )
}

export function ContactsPage() {
  return (
    <div className="min-h-full w-full bg-[var(--surface)]">
      <Header />

      <main>
        <section className="w-full bg-[var(--page-bg)] px-5 pt-10 pb-7 lg:px-[120px] lg:pt-14 lg:pb-10">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[14px] lg:gap-5">
            <h1 className="text-[32px] font-bold text-[var(--ink)] lg:text-[56px]">
              {CONTACTS_PAGE.title}
            </h1>
            <p className="text-[18px] leading-[27px] font-medium text-[var(--ink)] lg:max-w-[640px] lg:text-[20px] lg:leading-[31px]">
              {CONTACTS_PAGE.lead}
            </p>
          </div>
        </section>

        <section className="w-full bg-[var(--surface)] px-5 pt-12 pb-10 lg:px-[120px] lg:pt-16 lg:pb-14">
          <ContactsContent />
        </section>

        <section
          id="requisites"
          className="w-full bg-[var(--surface)] px-5 pb-[72px] lg:px-[120px] lg:pb-[120px]"
        >
          <RevealDiv className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:gap-5 lg:p-7">
            <h2 className="text-[22px] font-bold text-[var(--ink)] lg:text-[28px]">
              {REQUISITES.title}
            </h2>
            <dl className="flex w-full flex-col">
              {REQUISITES.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex w-full flex-col gap-1 border-b border-[var(--line)] py-3 last:border-b-0 lg:flex-row lg:items-center lg:gap-6"
                >
                  <dt className="text-[14px] text-[var(--ink-2)] lg:w-[200px] lg:shrink-0 lg:text-[15px]">
                    {row.label}
                  </dt>
                  <dd className="flex items-center gap-2 text-[16px] font-semibold text-[var(--ink)] lg:text-[17px]">
                    {row.value}
                    {row.copy && <CopyButton value={row.value} label={row.label} />}
                  </dd>
                </div>
              ))}
            </dl>
          </RevealDiv>
        </section>
      </main>

      <Footer />
    </div>
  )
}
