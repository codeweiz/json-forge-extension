import type { MessageType } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_RE = /^\d+$/

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
  return trimmed
    .split('/')
    .map(seg => (NUMERIC_RE.test(seg) || UUID_RE.test(seg)) ? ':param' : seg)
    .join('/')
}

export function endpointId(method: string, normalizedPath: string): string {
  const str = `${method.toUpperCase()}:${normalizedPath}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false
  return /application\/([\w.+-]+\+)?json/i.test(contentType)
}

export function sendMessage(message: MessageType): Promise<unknown> {
  return chrome.runtime.sendMessage(message)
}
