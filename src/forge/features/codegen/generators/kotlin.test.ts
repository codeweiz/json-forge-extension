import { describe, it, expect } from 'vitest'
import { kotlinGenerator } from './kotlin'

describe('kotlinGenerator', () => {
  it('generates a data class with val fields for a flat object', () => {
    const json = JSON.stringify({ name: 'Alice', age: 30, email: null })
    const result = kotlinGenerator.generate(json)
    expect(result).toBe(
      [
        'data class Root(',
        '    val name: String,',
        '    val age: Int,',
        '    val email: Any?',
        ')',
      ].join('\n'),
    )
  })

  it('generates separate data classes for nested objects', () => {
    const json = JSON.stringify({
      name: 'Alice',
      address: { street: '123 Main St', city: 'Springfield' },
    })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('data class Address(')
    expect(result).toContain('val street: String')
    expect(result).toContain('val city: String')
    expect(result).toContain('data class Root(')
    expect(result).toContain('val address: Address')
  })

  it('generates List<ClassName> for arrays of objects', () => {
    const json = JSON.stringify({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('data class UsersItem(')
    expect(result).toContain('val users: List<UsersItem>')
  })

  it('distinguishes Int from Double', () => {
    const json = JSON.stringify({ count: 42, ratio: 3.14 })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('val count: Int')
    expect(result).toContain('val ratio: Double')
  })

  it('maps null fields to Any?', () => {
    const json = JSON.stringify({ value: null })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('val value: Any?')
  })

  it('maps boolean fields to Boolean', () => {
    const json = JSON.stringify({ active: true, deleted: false })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('val active: Boolean')
    expect(result).toContain('val deleted: Boolean')
  })

  it('generates an empty data class for an empty object', () => {
    const json = JSON.stringify({})
    const result = kotlinGenerator.generate(json)
    expect(result).toBe('data class Root()')
  })

  it('generates a type alias for a root primitive', () => {
    const json = JSON.stringify('hello')
    const result = kotlinGenerator.generate(json)
    expect(result).toBe('typealias Root = String')
  })

  it('handles empty arrays as List<Any>', () => {
    const json = JSON.stringify({ items: [] })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('val items: List<Any>')
  })

  it('handles mixed-type arrays as List<Any>', () => {
    const json = JSON.stringify({ data: [1, 'hello', true] })
    const result = kotlinGenerator.generate(json)
    expect(result).toContain('val data: List<Any>')
  })
})
