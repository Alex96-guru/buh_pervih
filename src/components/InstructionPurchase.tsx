import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, FlaskConical } from 'lucide-react'
import type { Service } from '../lib/catalog'
import { api } from '../lib/api'
import type { InstructionDownload, InstructionPurchase as Purchase } from '../lib/api'
import type { PaymentMethod } from '../lib/orders'
import { formatDateTime, formatRub } from '../lib/orders'
import { useAuth } from '../lib/auth'

export function InstructionPurchase({ service }: { service: Service }) {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [email, setEmail] = useState(user?.email ?? '')
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [download, setDownload] = useState<InstructionDownload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const storageKey = `instruction-purchase:${service.slug}`

  useEffect(() => {
    const signedInEmail = user?.email
    if (signedInEmail) setEmail((current) => current || signedInEmail)
  }, [user?.email])

  useEffect(() => {
    let active = true
    const restore = async () => {
      try {
        const config = await api.instructionPaymentConfig()
        if (!active) return
        setEnabled(config.testPaymentsEnabled)
        const token = sessionStorage.getItem(storageKey)
        if (!token) return
        const result = await api.instructionPurchase(token)
        if (!active) return
        setAccessToken(token)
        setPurchase(result.purchase)
        if (result.purchase.status === 'paid') {
          const link = await api.instructionDownloadLink(token)
          if (active) setDownload(link.download)
        }
      } catch {
        if (active) {
          sessionStorage.removeItem(storageKey)
          setEnabled(false)
        }
      }
    }
    void restore()
    return () => { active = false }
  }, [storageKey])

  async function pay(token: string) {
    const result = await api.testPayInstruction(token, method)
    setPurchase(result.purchase)
    setDownload(result.download)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !enabled) return
    setBusy(true)
    setError('')
    try {
      let token = accessToken
      if (!token) {
        const created = await api.createInstructionPurchase(service.slug, email)
        token = created.accessToken
        setAccessToken(token)
        setPurchase(created.purchase)
        sessionStorage.setItem(storageKey, token)
      }
      await pay(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оформить покупку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="buy-instruction" className="flex scroll-mt-[150px] flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-7">
      <h2 className="text-[22px] font-bold text-[var(--ink)]">{purchase?.status === 'paid' ? 'Ваша инструкция' : 'Купить инструкцию'}</h2>
      <p className="text-[16px] text-[var(--ink-2)]">Word-файл .docx · {formatRub(service.priceAmount ?? 0)}. Регистрация не требуется.</p>
      {enabled === null && <p className="text-[15px] text-[var(--ink-2)]">Проверяем доступность оплаты…</p>}
      {enabled === false && <p role="status" className="rounded-[12px] bg-[var(--page-bg)] p-4 text-[15px] text-[var(--ink)]">Оплата временно недоступна.</p>}
      {purchase?.status === 'paid' && download && (
        <div className="flex flex-col gap-3 rounded-[14px] bg-[#E8F7EE] p-4">
          <p className="font-semibold text-[#1D7A45]">Оплата подтверждена. Инструкция готова.</p>
          <a href={download.url} download className="flex min-h-[44px] w-fit items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 font-semibold text-white"><Download size={18} />Скачать инструкцию</a>
          <p className="text-[13px] text-[var(--ink-2)]">Ссылка действует до {formatDateTime(download.expiresAt)}. Скачивать можно повторно.</p>
        </div>
      )}
      {enabled && purchase?.status !== 'paid' && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {!accessToken && <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--ink)]">Email для покупки
            <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="h-[46px] rounded-[10px] border border-[var(--line)] px-3 text-[16px] font-normal outline-none focus:border-[var(--accent)]" />
          </label>}
          <fieldset className="flex flex-wrap gap-3"><legend className="mb-2 text-[14px] font-semibold text-[var(--ink)]">Способ оплаты</legend>
            {([['card', 'Картой'], ['sbp', 'Через СБП']] as const).map(([value, label]) => (
              <label key={value} className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--line)] px-3 text-[14px]"><input type="radio" name="instruction-method" checked={method === value} onChange={() => setMethod(value)} />{label}</label>
            ))}
          </fieldset>
          <p className="flex items-center gap-2 rounded-[12px] border border-[#E0B441] bg-[#FFF8E6] p-3 text-[14px] text-[var(--ink)]"><FlaskConical size={18} />Тестовая оплата — деньги не списываются.</p>
          <button type="submit" disabled={busy} className="min-h-[48px] w-full cursor-pointer rounded-[12px] bg-[var(--accent)] px-5 font-bold text-white disabled:opacity-50 sm:w-fit">{busy ? 'Проверяем…' : 'Тестовая оплата'}</button>
        </form>
      )}
      {error && <p role="alert" className="text-[14px] text-[var(--danger)]">{error}</p>}
    </section>
  )
}
