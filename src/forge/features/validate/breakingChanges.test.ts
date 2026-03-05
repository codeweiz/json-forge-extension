import { describe, it, expect } from 'vitest'
import { detectBreakingChanges } from './breakingChanges'

describe('detectBreakingChanges', () => {
  it('detects field removal as breaking', () => {
    const old = { type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' } } }
    const new_ = { type: 'object', properties: { name: { type: 'string' } } }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'breaking' && c.message.includes('age'))).toBe(true)
  })

  it('detects type change as breaking', () => {
    const old = { type: 'object', properties: { id: { type: 'number' } } }
    const new_ = { type: 'object', properties: { id: { type: 'string' } } }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'breaking' && c.message.includes('type'))).toBe(true)
  })

  it('detects new required field as breaking', () => {
    const old = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
    const new_ = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'number' } },
      required: ['name', 'age'],
    }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'breaking' && c.message.includes('required'))).toBe(
      true
    )
  })

  it('detects new optional field as warning', () => {
    const old = { type: 'object', properties: { name: { type: 'string' } } }
    const new_ = {
      type: 'object',
      properties: { name: { type: 'string' }, avatar: { type: 'string' } },
    }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'warning' && c.message.includes('avatar'))).toBe(
      true
    )
  })

  it('detects field becoming optional as warning', () => {
    const old = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
    const new_ = { type: 'object', properties: { name: { type: 'string' } } }
    const changes = detectBreakingChanges(old, new_)
    expect(
      changes.some((c) => c.severity === 'warning' && c.message.includes('no longer required'))
    ).toBe(true)
  })

  it('reports no changes for identical schemas', () => {
    const schema = { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] }
    const changes = detectBreakingChanges(schema, schema)
    expect(changes).toHaveLength(0)
  })

  it('detects nested field changes', () => {
    const old = {
      type: 'object',
      properties: { user: { type: 'object', properties: { id: { type: 'number' } } } },
    }
    const new_ = {
      type: 'object',
      properties: { user: { type: 'object', properties: { id: { type: 'string' } } } },
    }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'breaking' && c.path.includes('user'))).toBe(true)
  })

  it('detects enum value removal as warning', () => {
    const old = {
      type: 'object',
      properties: { role: { type: 'string', enum: ['admin', 'user', 'guest'] } },
    }
    const new_ = {
      type: 'object',
      properties: { role: { type: 'string', enum: ['admin', 'user'] } },
    }
    const changes = detectBreakingChanges(old, new_)
    expect(changes.some((c) => c.severity === 'warning' && c.message.includes('enum'))).toBe(true)
  })
})
