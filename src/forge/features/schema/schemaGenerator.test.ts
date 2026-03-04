import { describe, it, expect } from 'vitest'
import { jsonToSchema } from './schemaGenerator'

describe('jsonToSchema - Draft-07', () => {
  it('generates schema for flat object', () => {
    const result = JSON.parse(jsonToSchema('{"id":1,"name":"Alice"}', 'draft-07'))
    expect(result.$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(result.type).toBe('object')
    expect(result.required).toEqual(['id', 'name'])
    expect(result.properties.id).toEqual({ type: 'number' })
    expect(result.properties.name).toEqual({ type: 'string' })
  })

  it('generates schema for boolean', () => {
    const result = JSON.parse(jsonToSchema('true', 'draft-07'))
    expect(result.type).toBe('boolean')
  })

  it('generates null as nullable string in draft-07', () => {
    const result = JSON.parse(jsonToSchema('{"x":null}', 'draft-07'))
    expect(result.properties.x.type).toEqual(['string', 'null'])
  })

  it('generates array schema', () => {
    const result = JSON.parse(jsonToSchema('[1,2,3]', 'draft-07'))
    expect(result.type).toBe('array')
    expect(result.items).toEqual({ type: 'number' })
  })

  it('generates oneOf for mixed arrays', () => {
    const result = JSON.parse(jsonToSchema('[1,"a"]', 'draft-07'))
    expect(result.items.oneOf).toHaveLength(2)
  })

  it('generates recursive nested schema', () => {
    const result = JSON.parse(jsonToSchema('{"user":{"age":30}}', 'draft-07'))
    expect(result.properties.user.type).toBe('object')
    expect(result.properties.user.properties.age).toEqual({ type: 'number' })
  })
})

describe('jsonToSchema - Draft-2020-12', () => {
  it('uses correct $schema URI', () => {
    const result = JSON.parse(jsonToSchema('{}', 'draft-2020-12'))
    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
  })

  it('generates null as type null in draft-2020-12', () => {
    const result = JSON.parse(jsonToSchema('{"x":null}', 'draft-2020-12'))
    expect(result.properties.x.type).toBe('null')
  })
})

describe('jsonToSchema - edge cases', () => {
  it('empty object generates empty properties', () => {
    const result = JSON.parse(jsonToSchema('{}', 'draft-07'))
    expect(result.type).toBe('object')
    expect(result.required).toEqual([])
    expect(result.properties).toEqual({})
  })

  it('empty array generates array type without items', () => {
    const result = JSON.parse(jsonToSchema('[]', 'draft-07'))
    expect(result.type).toBe('array')
    expect(result.items).toBeUndefined()
  })

  it('throws on invalid JSON', () => {
    expect(() => jsonToSchema('not json', 'draft-07')).toThrow()
  })
})
