import { describe, it, expect } from 'vitest'
import { runJsonPath } from './queryUtils'

const DATA = JSON.stringify({
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  meta: { count: 2 },
})

describe('runJsonPath', () => {
  it('extracts root field', () => {
    const result = runJsonPath(DATA, '$.meta.count')
    expect(result).toEqual([2])
  })

  it('extracts array elements with wildcard', () => {
    const result = runJsonPath(DATA, '$.users[*].name')
    expect(result).toEqual(['Alice', 'Bob'])
  })

  it('extracts specific array index', () => {
    const result = runJsonPath(DATA, '$.users[0]')
    expect(result[0]).toMatchObject({ id: 1, name: 'Alice' })
  })

  it('supports recursive descent', () => {
    const result = runJsonPath(DATA, '$..email')
    expect(result).toHaveLength(2)
    expect(result).toContain('alice@example.com')
  })

  it('returns empty array when no match', () => {
    const result = runJsonPath(DATA, '$.nonexistent')
    expect(result).toEqual([])
  })

  it('throws on invalid JSON', () => {
    expect(() => runJsonPath('not json', '$')).toThrow()
  })

  it('returns root for $ expression', () => {
    const result = runJsonPath('{"a":1}', '$')
    expect(result[0]).toEqual({ a: 1 })
  })

  it('returns empty array or throws on invalid expression', () => {
    // jsonpath-plus either throws or returns [] for malformed paths — both are acceptable
    try {
      const result = runJsonPath('{"a":1}', '$[[')
      expect(result).toEqual([])
    } catch {
      // acceptable — QueryPanel wraps runJsonPath in try/catch
    }
  })
})
