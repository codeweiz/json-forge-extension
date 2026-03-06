import { describe, it, expect } from 'vitest'
import { computeDiff } from './diffUtils'

describe('computeDiff', () => {
  it('detects added field', () => {
    const entries = computeDiff('{"a":1}', '{"a":1,"b":2}')
    const added = entries.find(e => e.type === 'added' && e.path === 'b')
    expect(added).toBeDefined()
    expect(added!.newValue).toBe(2)
  })

  it('detects removed field', () => {
    const entries = computeDiff('{"a":1,"b":2}', '{"a":1}')
    const removed = entries.find(e => e.type === 'removed' && e.path === 'b')
    expect(removed).toBeDefined()
    expect(removed!.oldValue).toBe(2)
  })

  it('detects changed field', () => {
    const entries = computeDiff('{"name":"Alice"}', '{"name":"Bob"}')
    const changed = entries.find(e => e.type === 'changed' && e.path === 'name')
    expect(changed).toBeDefined()
    expect(changed!.oldValue).toBe('Alice')
    expect(changed!.newValue).toBe('Bob')
  })

  it('detects unchanged field', () => {
    const entries = computeDiff('{"id":1}', '{"id":1}')
    const unchanged = entries.find(e => e.type === 'unchanged' && e.path === 'id')
    expect(unchanged).toBeDefined()
  })

  it('detects nested changed field', () => {
    const entries = computeDiff('{"user":{"city":"Beijing"}}', '{"user":{"city":"Shanghai"}}')
    const changed = entries.find(e => e.type === 'changed' && e.path === 'user.city')
    expect(changed).toBeDefined()
    expect(changed!.oldValue).toBe('Beijing')
    expect(changed!.newValue).toBe('Shanghai')
  })

  it('returns empty array for identical JSON', () => {
    const entries = computeDiff('{"a":1}', '{"a":1}')
    const nonUnchanged = entries.filter(e => e.type !== 'unchanged')
    expect(nonUnchanged).toHaveLength(0)
  })

  it('throws on invalid JSON', () => {
    expect(() => computeDiff('not json', '{}')).toThrow()
    expect(() => computeDiff('{}', 'not json')).toThrow()
  })

  it('detects added array element', () => {
    const entries = computeDiff('[1,2]', '[1,2,3]')
    const added = entries.find(e => e.type === 'added' && e.path === '[2]')
    expect(added).toBeDefined()
    expect(added!.newValue).toBe(3)
  })

  it('detects changed array element', () => {
    const entries = computeDiff('[1,2,3]', '[1,2,4]')
    const changed = entries.find(e => e.type === 'changed' && e.path === '[2]')
    expect(changed).toBeDefined()
    expect(changed!.oldValue).toBe(3)
    expect(changed!.newValue).toBe(4)
  })

  it('handles type change from object to array', () => {
    const entries = computeDiff('{"a":1}', '[1,2]')
    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('changed')
  })
})
