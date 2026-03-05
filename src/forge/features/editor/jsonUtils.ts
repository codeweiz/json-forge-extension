import { jsonrepair } from 'jsonrepair'

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
  return jsonrepair(input)
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
