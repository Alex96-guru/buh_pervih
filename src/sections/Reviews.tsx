import { ArrowUpRight, Star } from 'lucide-react'
import { SectionTitle } from '../components/ui'
import { REVIEWS } from '../lib/content'

export function Reviews() {
  return (
    <section className="w-full bg-[var(--surface)] px-5 py-[72px] lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 lg:gap-8">
        <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
          <SectionTitle className="lg:whitespace-nowrap">{REVIEWS.title}</SectionTitle>
          <a
            href={REVIEWS.linkHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-[6px] text-[16px] font-bold text-[var(--accent)] hover:underline"
          >
            {REVIEWS.linkLabel}
            <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="flex w-full flex-col gap-[14px] lg:flex-row lg:items-start lg:gap-6">
          {REVIEWS.items.map((review, i) => (
            <div
              key={i}
              className="flex w-full flex-col gap-[10px] rounded-[12px] border border-[var(--line)] bg-white p-6 lg:flex-1 lg:p-7"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-bold text-[var(--ink)]">{review.name}</span>
                <span className="text-[14px] text-[var(--ink-2)]">{review.date}</span>
              </div>

              <div className="flex gap-[3px]" aria-label="Оценка 5 из 5">
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} size={16} className="fill-[var(--star)] text-[var(--star)]" />
                ))}
              </div>

              <p className="w-full text-[17px] leading-[26px] text-[var(--ink)]">{review.text}</p>
              <p className="text-[14px] font-semibold text-[var(--ink-2)]">{review.service}</p>
            </div>
          ))}
        </div>

        <p className="text-[13px] text-[var(--ink-2)]">{REVIEWS.note}</p>
      </div>
    </section>
  )
}
