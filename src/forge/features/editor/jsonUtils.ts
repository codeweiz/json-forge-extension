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
  const fixed = input
    .replace(/'/g, '"')                           // single → double quotes
    .replace(/,\s*([}\]])/g, '$1')                // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')   // unquoted keys
  return fixed
}

export function escapeJson(input: string): string {
  return JSON.stringify(input)
}

export function unescapeJson(input: string): string {
  try {
    return JSON.parse(input) as string
  } catch {
    return input
  }
}
