export function formatJson(input: string, indent = 2): string {
  return JSON.stringify(JSON.parse(input), null, indent)
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input))
}

export function isValidJson(input: string): boolean {
  if (!input.trim()) return false
  try {
    JSON.parse(input)
    return true
  } catch {
    return false
  }
}

export function fixJson(input: string): string {
  // Step 1: Remove trailing commas before } or ]
  let result = input.replace(/,\s*([}\]])/g, '$1')

  // Step 2: Quote unquoted keys (e.g. {key: value} → {"key": value})
  result = result.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')

  // Step 3: Replace single-quoted STRING VALUES with double quotes
  // Only matches 'value' patterns that appear as JSON values (after : or in arrays)
  // This is a best-effort heuristic for the common case
  result = result.replace(/(:\s*|,\s*|\[\s*)'([^']*)'/g, '$1"$2"')

  return result
}

export function escapeJson(input: string): string {
  return JSON.stringify(input)
}

export function unescapeJson(input: string): string {
  try {
    const parsed: unknown = JSON.parse(input)
    return typeof parsed === 'string' ? parsed : input
  } catch {
    return input
  }
}
