import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, isValidJson, fixJson, escapeJson } from './jsonUtils'

describe('formatJson', () => {
  it('formats compact JSON with 2-space indent', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('throws on invalid JSON', () => {
    expect(() => formatJson('{bad}')).toThrow()
  })
})

describe('minifyJson', () => {
  it('removes all whitespace', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
  })
})

describe('isValidJson', () => {
  it('returns true for valid JSON', () => {
    expect(isValidJson('{"a":1}')).toBe(true)
  })

  it('returns false for invalid JSON', () => {
    expect(isValidJson('{bad}')).toBe(false)
  })
})

describe('fixJson', () => {
  it('fixes trailing commas', () => {
    const result = fixJson('{"a":1,}')
    expect(isValidJson(result)).toBe(true)
  })

  it('fixes single-quoted string values', () => {
    const result = fixJson("{a: 'hello'}")
    expect(isValidJson(result)).toBe(true)
  })
})

describe('escapeJson', () => {
  it('wraps a string in JSON string representation', () => {
    expect(escapeJson('hello "world"')).toBe('"hello \\"world\\""')
  })
})
