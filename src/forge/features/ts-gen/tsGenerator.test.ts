import { describe, it, expect } from 'vitest'
import { jsonToTypeScript } from './tsGenerator'

describe('jsonToTypeScript', () => {
  it('generates interface for flat object', () => {
    const result = jsonToTypeScript('{"name":"Alice","age":30}', 'Root')
    expect(result).toContain('interface Root')
    expect(result).toContain('name: string')
    expect(result).toContain('age: number')
  })

  it('generates nested interface', () => {
    const result = jsonToTypeScript('{"user":{"id":1}}', 'Root')
    expect(result).toContain('user: User')
    expect(result).toContain('interface User')
    expect(result).toContain('id: number')
  })

  it('generates array type', () => {
    const result = jsonToTypeScript('[{"id":1}]', 'Root')
    expect(result).toContain('id: number')
  })

  it('handles null as optional with null union type', () => {
    const result = jsonToTypeScript('{"val":null}', 'Root')
    expect(result).toContain('val')
    expect(result).toContain('null')
  })

  it('handles boolean', () => {
    const result = jsonToTypeScript('{"active":true}', 'Root')
    expect(result).toContain('active: boolean')
  })
})
