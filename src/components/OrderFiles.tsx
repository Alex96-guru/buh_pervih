import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Download, File, FileArchive, FileText, Film, Image, Music2, Paperclip, Trash2 } from 'lucide-react'
import { api, uploadOrderFile } from '../lib/api'
import { announceOrderFilesChanged, formatFileSize, MAX_FILE_SIZE, MAX_ORDER_FILES, ORDER_FILES_CHANGED } from '../lib/files'
import { formatDateTime } from '../lib/orders'
import type { OrderFile } from '../lib/orders'

export function FileIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith('image/') ? Image
    : mimeType.startsWith('audio/') ? Music2
      : mimeType.startsWith('video/') ? Film
        : mimeType.includes('zip') || mimeType.includes('archive') ? FileArchive
          : mimeType.startsWith('text/') || mimeType.includes('pdf') ? FileText : File
  return <Icon size={20} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
}

export function OrderFiles({ orderId, currentUserId, isAdmin = false, readOnly = false }: { orderId: string; currentUserId: string; isAdmin?: boolean; readOnly?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<OrderFile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const result = await api.orderFiles(orderId)
        if (active) {
          setFiles(result.files)
          setLoadError('')
        }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить файлы')
      } finally {
        if (active) setLoading(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10000)
    const onChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === orderId) void refresh()
    }
    window.addEventListener(ORDER_FILES_CHANGED, onChanged)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener(ORDER_FILES_CHANGED, onChanged) }
  }, [orderId])

  async function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selected.length || busy) return
    if (files.length + selected.length > MAX_ORDER_FILES) {
      setError(`К заказу можно приложить не больше ${MAX_ORDER_FILES} файлов`)
      return
    }
    const invalid = selected.find((file) => file.size === 0 || file.size > MAX_FILE_SIZE)
    if (invalid) {
      setError(`${invalid.name}: файл должен быть непустым и не больше 50 МБ`)
      return
    }
    setBusy(true)
    setError('')
    try {
      for (const file of selected) {
        const uploaded = await uploadOrderFile(orderId, file)
        setFiles((current) => [uploaded, ...current])
        announceOrderFilesChanged(orderId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    } finally {
      setBusy(false)
    }
  }

  async function removeFile(file: OrderFile) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.deleteOrderFile(orderId, file.id)
      setFiles((current) => current.filter((item) => item.id !== file.id))
      announceOrderFilesChanged(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить файл')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-[var(--ink)]">Файлы по заказу</h2>
        <p className="text-[14px] text-[var(--ink-2)]">Документы, фотографии, аудио и видео. Любой тип файла, до 50 МБ каждый.</p>
      </div>
      {!readOnly && <input ref={inputRef} type="file" multiple onChange={selectFiles} className="sr-only" aria-label="Выбрать файлы для заказа" />}
      {!readOnly && <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || files.length >= MAX_ORDER_FILES} className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--page-bg)] px-4 text-[15px] font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit">
        <Paperclip size={18} aria-hidden="true" />{busy ? 'Загружаем…' : 'Прикрепить файлы'}
      </button>}
      {(error || loadError) && <p role="alert" className="text-[14px] text-[var(--danger)]">{error || loadError}</p>}
      {loading && <p className="text-[14px] text-[var(--ink-2)]">Загружаем файлы…</p>}
      {!loading && files.length === 0 && <p className="text-[14px] text-[var(--ink-2)]">Пока файлов нет.</p>}
      {files.length > 0 && (
        <ul className="flex min-w-0 flex-col gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-[var(--line)] p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FileIcon mimeType={file.mimeType} />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-[14px] font-semibold text-[var(--ink)]">{file.name}</p>
                  <p className="text-[12px] text-[var(--ink-2)]">{formatFileSize(file.size)} · {file.uploadedBy === currentUserId ? 'Вы' : file.uploadedByName ?? 'Пользователь'} · {formatDateTime(file.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-8 sm:pl-0">
                <a href={`/api/orders/${encodeURIComponent(orderId)}/files/${encodeURIComponent(file.id)}`} download={file.name} className="flex min-h-[40px] items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline"><Download size={16} aria-hidden="true" />Скачать</a>
                {!readOnly && (isAdmin || file.uploadedBy === currentUserId) && <button type="button" onClick={() => removeFile(file)} disabled={busy} aria-label={`Удалить файл ${file.name}`} className="flex min-h-[40px] cursor-pointer items-center gap-1 text-[13px] font-semibold text-[var(--danger)] hover:underline disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Удалить</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
