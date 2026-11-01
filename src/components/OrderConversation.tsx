import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Download, Paperclip, Trash2 } from 'lucide-react'
import { FileIcon } from './OrderFiles'
import { api, uploadOrderFile } from '../lib/api'
import { announceOrderFilesChanged, formatFileSize, MAX_FILE_SIZE, MAX_ORDER_FILES, ORDER_FILES_CHANGED } from '../lib/files'
import { formatDateTime } from '../lib/orders'
import type { OrderFile, OrderMessage } from '../lib/orders'

export function OrderConversation({ orderId, currentUserId, isAdmin = false }: { orderId: string; currentUserId: string; isAdmin?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const initialScrollDoneRef = useRef(false)
  const lastMarkedMessageRef = useRef<string | null>(null)
  const [messages, setMessages] = useState<OrderMessage[] | null>(null)
  const [files, setFiles] = useState<OrderFile[] | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const [conversation, attachments] = await Promise.all([
          api.orderMessages(orderId),
          api.orderFiles(orderId),
        ])
        if (active) {
          setMessages(conversation.messages)
          setFiles(attachments.files)
          setLoadError('')
        }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить переписку')
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10000)
    const onFilesChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === orderId) void refresh()
    }
    window.addEventListener(ORDER_FILES_CHANGED, onFilesChanged)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(ORDER_FILES_CHANGED, onFilesChanged)
    }
  }, [orderId])

  const entries: Array<{ kind: 'message'; value: OrderMessage } | { kind: 'file'; value: OrderFile }> = [
    ...(messages ?? []).map((value) => ({ kind: 'message' as const, value })),
    ...(files ?? []).map((value) => ({ kind: 'file' as const, value })),
  ]
  entries.sort((a, b) =>
    new Date(a.value.createdAt).getTime() - new Date(b.value.createdAt).getTime() ||
    a.value.id.localeCompare(b.value.id),
  )

  function markVisibleMessagesRead() {
    if (document.visibilityState !== 'visible' || !atBottomRef.current) return
    const latestIncoming = [...(messages ?? [])].reverse().find((message) => message.senderId !== currentUserId)
    if (!latestIncoming || lastMarkedMessageRef.current === latestIncoming.id) return
    lastMarkedMessageRef.current = latestIncoming.id
    void api.markOrderMessagesRead(orderId).catch(() => { lastMarkedMessageRef.current = null })
  }

  useLayoutEffect(() => {
    if (messages === null || files === null) return
    const container = conversationRef.current
    if (!container) return
    if (!initialScrollDoneRef.current || atBottomRef.current) {
      container.scrollTop = container.scrollHeight
      atBottomRef.current = true
    }
    initialScrollDoneRef.current = true
    markVisibleMessagesRead()
  }, [messages, files, orderId, currentUserId])

  useEffect(() => {
    const onVisible = () => markVisibleMessagesRead()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [messages, orderId, currentUserId])

  async function send(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      const { message } = await api.sendOrderMessage(orderId, text)
      atBottomRef.current = true
      setMessages((previous) => [...(previous ?? []), message])
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length || uploading) return
    if ((files?.length ?? 0) + selected.length > MAX_ORDER_FILES) {
      setError(`К заказу можно приложить не больше ${MAX_ORDER_FILES} файлов`)
      return
    }
    const invalid = selected.find((file) => file.size === 0 || file.size > MAX_FILE_SIZE)
    if (invalid) {
      setError(`${invalid.name}: файл должен быть непустым и не больше 50 МБ`)
      return
    }
    setUploading(true)
    setError('')
    try {
      for (const file of selected) {
        const uploaded = await uploadOrderFile(orderId, file)
        atBottomRef.current = true
        setFiles((previous) => [...(previous ?? []), uploaded])
        announceOrderFilesChanged(orderId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прикрепить файл')
    } finally {
      setUploading(false)
    }
  }

  async function removeFile(file: OrderFile) {
    if (deletingFileId) return
    setDeletingFileId(file.id)
    setError('')
    try {
      await api.deleteOrderFile(orderId, file.id)
      setFiles((previous) => (previous ?? []).filter((item) => item.id !== file.id))
      announceOrderFilesChanged(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить файл')
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <section id="conversation" className="flex scroll-mt-6 flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-6">
      <div>
        <h2 className="text-[22px] font-bold text-[var(--ink)]">Переписка по заказу</h2>
        <p className="text-[14px] text-[var(--ink-2)]">Сообщения обновляются каждые 10 секунд.</p>
      </div>
      <div ref={conversationRef} onScroll={(event) => { const box = event.currentTarget; atBottomRef.current = box.scrollHeight - box.scrollTop - box.clientHeight < 48; if (atBottomRef.current) markVisibleMessagesRead() }} aria-live="polite" className="flex max-h-[420px] min-h-[120px] flex-col gap-3 overflow-y-auto rounded-[14px] bg-[var(--page-bg)] p-4">
        {!messages && !files && !loadError && <p className="text-[15px] text-[var(--ink-2)]">Загружаем переписку…</p>}
        {messages && files && entries.length === 0 && <p className="text-[15px] text-[var(--ink-2)]">Пока сообщений и файлов нет. Напишите первым.</p>}
        {entries.map((entry) => {
          const own = (entry.kind === 'message' ? entry.value.senderId : entry.value.uploadedBy) === currentUserId
          return (
            <div key={`${entry.kind}-${entry.value.id}`} className={`min-w-0 max-w-[95%] rounded-[14px] p-3 sm:max-w-[85%] ${own ? 'self-end bg-[var(--accent-soft)]' : 'self-start bg-white'}`}>
              <p className="text-[13px] font-semibold text-[var(--ink-2)]">
                {own ? 'Вы' : entry.kind === 'message' ? entry.value.senderName : entry.value.uploadedByName ?? 'Пользователь'}
                {' · '}{formatDateTime(entry.value.createdAt)}
              </p>
              {entry.kind === 'message' ? (
                <p className="mt-1 text-[15px] leading-[22px] whitespace-pre-wrap break-words text-[var(--ink)]">{entry.value.body}</p>
              ) : (
                <div className="mt-2 flex min-w-0 items-start gap-2">
                  <FileIcon mimeType={entry.value.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-[14px] font-semibold text-[var(--ink)]">{entry.value.name}</p>
                    <p className="text-[12px] text-[var(--ink-2)]">{formatFileSize(entry.value.size)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <a href={`/api/orders/${encodeURIComponent(orderId)}/files/${encodeURIComponent(entry.value.id)}`} download={entry.value.name} className="inline-flex min-h-[36px] items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline">
                        <Download size={16} aria-hidden="true" />Скачать
                      </a>
                      {(isAdmin || own) && <button type="button" onClick={() => void removeFile(entry.value as OrderFile)} disabled={deletingFileId !== null} className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 text-[13px] font-semibold text-[var(--danger)] hover:underline disabled:opacity-50" aria-label={`Удалить файл ${entry.value.name}`}><Trash2 size={16} aria-hidden="true" />Удалить</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <form onSubmit={send} className="flex flex-col gap-3">
        <label htmlFor={`message-${orderId}`} className="text-[15px] font-semibold text-[var(--ink)]">Ваше сообщение</label>
        <textarea
          id={`message-${orderId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Напишите сообщение по заказу"
          className="w-full resize-y rounded-[12px] border border-[var(--line)] bg-white p-3 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
        {(error || loadError) && <p role="alert" className="text-[14px] text-[var(--danger)]">{error || loadError}</p>}
        <input ref={fileInputRef} type="file" multiple onChange={attach} className="sr-only" aria-label="Прикрепить файлы к переписке" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[var(--line)] px-4 text-[14px] font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50 sm:w-fit">
            <Paperclip size={18} aria-hidden="true" />{uploading ? 'Загружаем…' : 'Прикрепить файл'}
          </button>
          <button type="submit" disabled={sending || !body.trim()} className="min-h-[44px] w-full cursor-pointer rounded-[12px] bg-[var(--ink)] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit">
            {sending ? 'Отправляем…' : 'Отправить'}
          </button>
        </div>
      </form>
    </section>
  )
}
