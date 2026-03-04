import { describe, it, expect } from 'vitest'
import { generateMock } from './mockGenerator'
import { Faker, en } from '@faker-js/faker'

const faker = new Faker({ locale: [en] })

describe('generateMock', () => {
  it('preserves object structure', () => {
    const input = { id: 1, name: 'Alice', email: 'a@b.com' }
    const result = generateMock(input, faker)
    expect(typeof result.id).toBe('string')   // UUID
    expect(typeof result.name).toBe('string')
    expect(typeof result.email).toBe('string')
  })

  it('generates string for unknown string fields', () => {
    const result = generateMock({ foo: 'bar' }, faker)
    expect(typeof result.foo).toBe('string')
  })

  it('generates number for numeric fields', () => {
    const result = generateMock({ count: 5 }, faker)
    expect(typeof result.count).toBe('number')
  })

  it('generates boolean for boolean fields', () => {
    const result = generateMock({ active: true }, faker)
    expect(typeof result.active).toBe('boolean')
  })

  it('preserves null', () => {
    const result = generateMock({ x: null }, faker)
    expect(result.x).toBeNull()
  })

  it('generates array of same structure', () => {
    const input = [{ id: 1, name: 'Alice' }]
    const result = generateMock(input, faker) as unknown[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('preserves enum-like status field', () => {
    const result = generateMock({ status: 'active' }, faker)
    expect(result.status).toBe('active')
  })

  it('generates nested objects recursively', () => {
    const result = generateMock({ user: { name: 'Bob', age: 30 } }, faker)
    expect(typeof (result.user as Record<string, unknown>).name).toBe('string')
    expect(typeof (result.user as Record<string, unknown>).age).toBe('number')
  })

  it('generates email for email field', () => {
    const result = generateMock({ email: 'old@old.com' }, faker)
    expect(result.email).toContain('@')
  })
})
