import { describe, it, expect } from 'vitest'
import { mergeSchemas } from './schemaMerge'

describe('mergeSchemas', () => {
  it('merges two identical schemas', () => {
    const s = { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] }
    const result = mergeSchemas([s, s])
    expect(result.properties!.id.type).toBe('number')
    expect(result.required).toContain('id')
  })

  it('makes field optional if missing in one schema', () => {
    const s1 = {
      type: 'object',
      properties: { id: { type: 'number' }, name: { type: 'string' } },
      required: ['id', 'name'],
    }
    const s2 = {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    }
    const result = mergeSchemas([s1, s2])
    expect(result.required).toContain('id')
    expect(result.required).not.toContain('name')
    expect(result.properties!.name).toBeDefined()
  })

  it('creates oneOf for type conflicts', () => {
    const s1 = {
      type: 'object',
      properties: { value: { type: 'number' } },
      required: ['value'],
    }
    const s2 = {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
    }
    const result = mergeSchemas([s1, s2])
    expect(result.properties!.value.oneOf).toBeDefined()
    expect(result.properties!.value.oneOf).toContainEqual({ type: 'number' })
    expect(result.properties!.value.oneOf).toContainEqual({ type: 'string' })
  })

  it('merges array item schemas', () => {
    const s1 = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] } },
      },
      required: ['items'],
    }
    const s2 = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'string' } }, required: ['a', 'b'] } },
      },
      required: ['items'],
    }
    const result = mergeSchemas([s1, s2])
    const itemProps = result.properties!.items.items!.properties!
    expect(itemProps.a).toBeDefined()
    expect(itemProps.b).toBeDefined()
    expect(result.properties!.items.items!.required).toContain('a')
    expect(result.properties!.items.items!.required).not.toContain('b')
  })

  it('returns single schema unchanged', () => {
    const s = { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] }
    expect(mergeSchemas([s])).toEqual(s)
  })

  it('handles empty array', () => {
    expect(mergeSchemas([])).toEqual({ type: 'object', properties: {} })
  })
})
