import { describe, it, expect } from 'vitest'
import { generateAssertions } from './assertionGenerator'

const sampleJson = JSON.stringify({
  name: 'Alice',
  age: 30,
  active: true,
  email: null,
  tags: ['a', 'b'],
  address: { city: 'NYC', zip: '10001' },
})

describe('generateAssertions', () => {
  it('generates Jest assertions', () => {
    const result = generateAssertions(sampleJson, 'jest')
    expect(result).toContain("toBe('string')")
    expect(result).toContain("toBe('number')")
    expect(result).toContain('toBeNull')
    expect(result).toContain('Array.isArray')
  })

  it('generates Chai assertions', () => {
    const result = generateAssertions(sampleJson, 'chai')
    expect(result).toContain("to.be.a('string')")
    expect(result).toContain("to.be.a('number')")
    expect(result).toContain('to.be.null')
    expect(result).toContain("to.be.an('array')")
  })

  it('generates Playwright assertions', () => {
    const result = generateAssertions(sampleJson, 'playwright')
    expect(result).toContain('toBeDefined')
    expect(result).toContain("toBe('string')")
  })

  it('generates pytest assertions', () => {
    const result = generateAssertions(sampleJson, 'pytest')
    expect(result).toContain('isinstance')
    expect(result).toContain('str')
    expect(result).toContain('is None')
    expect(result).toContain('list')
  })

  it('handles nested objects', () => {
    const result = generateAssertions(sampleJson, 'jest')
    expect(result).toContain('address')
    expect(result).toContain('city')
  })

  it('handles root array', () => {
    const result = generateAssertions('[{"id":1}]', 'jest')
    expect(result).toContain('Array.isArray')
  })

  it('handles empty object', () => {
    const result = generateAssertions('{}', 'jest')
    expect(result).toContain('toBeDefined')
  })

  it('handles root primitive', () => {
    const result = generateAssertions('"hello"', 'jest')
    expect(result).toContain("toBe('string')")
  })
})
