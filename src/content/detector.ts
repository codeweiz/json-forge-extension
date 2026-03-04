export function isJsonPage(): boolean {
  const body = document.body
  if (!body) return false

  // Primary: check document content type (most reliable)
  if (document.contentType === 'application/json') {
    return true
  }

  // Fallback: find a <pre> in body containing valid JSON
  // Lenient: allow Chrome-injected <style> or other elements alongside the <pre>
  const pre = body.querySelector('pre')
  if (!pre) return false

  // Ensure the pre is a direct child of body (not nested inside something else)
  if (pre.parentElement !== body) return false

  return isValidJson(pre.textContent ?? '')
}

export function extractJson(): unknown {
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
