import { describe, it, expect } from 'vitest'
import { Faker, en } from '@faker-js/faker'
import { generateMockFromSchema } from './schemaMockGenerator'

const faker = new Faker({ locale: [en] })

describe('generateMockFromSchema', () => {
  it('generates string for string type', () => {
    const result = generateMockFromSchema({ type: 'string' }, faker)
    expect(typeof result).toBe('string')
  })

  it('generates number within min/max range', () => {
    const result = generateMockFromSchema({ type: 'number', minimum: 10, maximum: 20 }, faker)
    expect(typeof result).toBe('number')
    expect(result as number).toBeGreaterThanOrEqual(10)
    expect(result as number).toBeLessThanOrEqual(20)
  })

  it('generates integer with no decimals', () => {
    const result = generateMockFromSchema({ type: 'integer', minimum: 1, maximum: 100 }, faker)
    expect(typeof result).toBe('number')
    expect(Number.isInteger(result)).toBe(true)
  })

  it('generates boolean for boolean type', () => {
    const result = generateMockFromSchema({ type: 'boolean' }, faker)
    expect(typeof result).toBe('boolean')
  })

  it('picks value from enum constraint', () => {
    const enumValues = ['red', 'green', 'blue']
    const result = generateMockFromSchema({ enum: enumValues }, faker)
    expect(enumValues).toContain(result)
  })

  it('generates email for format "email"', () => {
    const result = generateMockFromSchema({ type: 'string', format: 'email' }, faker)
    expect(typeof result).toBe('string')
    expect(result as string).toContain('@')
  })

  it('generates UUID for format "uuid"', () => {
    const result = generateMockFromSchema({ type: 'string', format: 'uuid' }, faker)
    expect(typeof result).toBe('string')
    expect(result as string).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generates object with correct keys from properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    }
    const result = generateMockFromSchema(schema, faker) as Record<string, unknown>
    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('age')
    expect(typeof result.name).toBe('string')
    expect(typeof result.age).toBe('number')
  })

  it('generates array with items of correct type', () => {
    const schema = {
      type: 'array',
      items: { type: 'string' },
    }
    const result = generateMockFromSchema(schema, faker) as unknown[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.length).toBeLessThanOrEqual(3)
    for (const item of result) {
      expect(typeof item).toBe('string')
    }
  })

  it('generates string within minLength/maxLength bounds', () => {
    const result = generateMockFromSchema({ type: 'string', minLength: 5, maxLength: 10 }, faker)
    expect(typeof result).toBe('string')
    expect((result as string).length).toBeGreaterThanOrEqual(5)
    expect((result as string).length).toBeLessThanOrEqual(10)
  })

  it('returns null for null type', () => {
    const result = generateMockFromSchema({ type: 'null' }, faker)
    expect(result).toBeNull()
  })

  it('picks from oneOf and returns matching value', () => {
    const schema = {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
      ],
    }
    const result = generateMockFromSchema(schema, faker)
    expect(typeof result === 'string' || typeof result === 'number').toBe(true)
  })
})
