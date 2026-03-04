export function isJsonPage(): boolean {
  const body = document.body
  if (!body) return false
  // Heuristic: body has exactly one child which is <pre> containing valid JSON
  const children = Array.from(body.children)
  if (children.length !== 1) return false
  const pre = children[0]
  if (pre.tagName !== 'PRE') return false
  return isValidJson(pre.textContent ?? '')
}

export function extractJson(): unknown | null {
  const pre = document.body?.querySelector('pre')
  if (!pre) return null
  try {
    return JSON.parse(pre.textContent ?? '')
  } catch {
    return null
  }
}

function isValidJson(text: string): boolean {
  if (!text.trim()) return false
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}
