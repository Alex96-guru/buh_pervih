import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'

const BINARY_TYPES = new Map([
  ['pdf', ['application/pdf']],
  ['jpg', ['image/jpeg']], ['jpeg', ['image/jpeg']],
  ['png', ['image/png']], ['gif', ['image/gif']], ['webp', ['image/webp']],
  ['mp3', ['audio/mpeg']], ['wav', ['audio/wav', 'audio/x-wav']],
  ['ogg', ['audio/ogg', 'video/ogg']], ['m4a', ['audio/mp4', 'audio/x-m4a']],
  ['mp4', ['video/mp4']], ['mov', ['video/quicktime']], ['webm', ['video/webm']],
  ['docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
  ['pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']],
  ['zip', ['application/zip']],
])
const TEXT_TYPES = new Map([
  ['txt', 'text/plain'], ['md', 'text/plain'], ['csv', 'text/csv'],
  ['json', 'application/json'],
])

export async function validatedMimeType(name, data) {
  const extension = path.extname(name).slice(1).toLowerCase()
  if (!extension || !Buffer.isBuffer(data) || data.length === 0) return null

  let detected
  try {
    detected = await fileTypeFromBuffer(data)
  } catch {
    return null
  }

  const allowed = BINARY_TYPES.get(extension)
  if (allowed) return detected && allowed.includes(detected.mime) ? detected.mime : null

  const textMime = TEXT_TYPES.get(extension)
  if (!textMime || detected) return null
  let decoded
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return null
  }
  if (/[\x00-\x08\x0b\x0e-\x1f\x7f]/.test(decoded)) return null
  if (extension === 'json') {
    try { JSON.parse(decoded) } catch { return null }
  }
  return textMime
}
