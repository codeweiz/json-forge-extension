import { describe, it, expect } from 'vitest'
import { validateJson } from './schemaValidator'

describe('validateJson', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number', minimum: 0, maximum: 150 },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'user', 'guest'] },
    },
    required: ['name', 'age'],
  }

  it('returns valid for conforming JSON', () => {
    const result = validateJson('{"name":"Alice","age":30}', schema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects missing required field', () => {
    const result = validateJson('{"name":"Alice"}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('age') || e.message.includes('required'))).toBe(true)
  })

  it('detects type mismatch', () => {
    const result = validateJson('{"name":123,"age":30}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.path.includes('name'))).toBe(true)
  })

  it('detects value out of range', () => {
    const result = validateJson('{"name":"Alice","age":-5}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.path.includes('age'))).toBe(true)
  })

  it('detects invalid enum value', () => {
    const result = validateJson('{"name":"Alice","age":30,"role":"superadmin"}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.path.includes('role'))).toBe(true)
  })

  it('validates format (email)', () => {
    const result = validateJson('{"name":"Alice","age":30,"email":"not-an-email"}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.path.includes('email'))).toBe(true)
  })

  it('handles valid format', () => {
    const result = validateJson('{"name":"Alice","age":30,"email":"alice@example.com"}', schema)
    expect(result.valid).toBe(true)
  })

  it('handles invalid JSON string', () => {
    const result = validateJson('{invalid}', schema)
    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('Parse error')
  })

  it('validates nested objects', () => {
    const nestedSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: { id: { type: 'number' } },
          required: ['id'],
        },
      },
      required: ['user'],
    }
    const result = validateJson('{"user":{"id":"not-a-number"}}', nestedSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.path.includes('id'))).toBe(true)
  })

  it('reports all errors with allErrors mode', () => {
    const result = validateJson('{"age":"not-a-number"}', schema)
    expect(result.valid).toBe(false)
    // Should have at least 2 errors: missing name + wrong type for age
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
