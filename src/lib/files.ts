export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const MAX_ORDER_FILES = 30
export const ORDER_FILES_CHANGED = 'order-files-changed'

export function announceOrderFilesChanged(orderId: string): void {
  window.dispatchEvent(new CustomEvent(ORDER_FILES_CHANGED, { detail: orderId }))
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`
}
