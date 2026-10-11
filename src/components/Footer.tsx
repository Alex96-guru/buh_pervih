import { FOOTER } from '../lib/content'

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--line)] bg-[var(--surface)] px-5 pt-12 pb-8 lg:px-[120px] lg:pt-14 lg:pb-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 lg:gap-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
          <div className="flex flex-col gap-4 lg:w-[340px]">
            <img
              src="/logo/logo-horizontal-light.svg"
              alt="Бухгалтерия Первых"
              className="h-[48px] w-[213px] object-contain"
            />
            <p className="w-full text-[15px] leading-[22px] font-medium text-[var(--ink-2)] lg:leading-normal">
              {FOOTER.slogan}
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:gap-16">
            {FOOTER.columns.map((column) => (
              <div key={column.title} className="flex w-fit flex-col gap-3">
                <p className="text-[15px] font-bold text-[var(--ink)]">{column.title}</p>
                {column.links.map((link) => (
                  <span key={link} className="text-[15px] font-medium text-[var(--ink-2)]">
                    {link}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* QR — только десктоп, как в макете */}
          <img
            src="/image-2.png"
            alt="QR-код Telegram"
            className="hidden h-[96px] w-[96px] lg:block"
          />
        </div>

        <div className="h-px w-full bg-[var(--line)]" />

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
          <p className="w-full text-[13px] leading-[20px] font-medium text-[var(--ink-2)] lg:w-auto lg:text-[14px] lg:leading-normal">
            {FOOTER.copyright}
          </p>
          <p className="text-[13px] font-medium text-[var(--ink-2)] lg:text-[14px]">
            {FOOTER.payment}
          </p>
        </div>
      </div>
    </footer>
  )
}
