import { describe, it, expect } from 'vitest'
import { normalizePathname, endpointId, isJsonContentType } from './messaging'

describe('normalizePathname', () => {
  it('replaces numeric segments with :param', () => {
    expect(normalizePathname('/api/users/123')).toBe('/api/users/:param')
  })

  it('replaces UUID segments with :param', () => {
    expect(normalizePathname('/api/users/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/api/users/:param')
  })

  it('replaces uppercase UUID segments with :param', () => {
    expect(normalizePathname('/api/users/550E8400-E29B-41D4-A716-446655440000'))
      .toBe('/api/users/:param')
  })

  it('keeps non-param segments unchanged', () => {
    expect(normalizePathname('/api/users/profile')).toBe('/api/users/profile')
  })

  it('handles root path', () => {
    expect(normalizePathname('/')).toBe('/')
  })

  it('strips trailing slash', () => {
    expect(normalizePathname('/api/users/')).toBe('/api/users')
  })

  it('handles multiple numeric and UUID segments', () => {
    expect(normalizePathname('/api/orders/42/items/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/api/orders/:param/items/:param')
  })

  it('does not replace mixed alphanumeric segments', () => {
    expect(normalizePathname('/api/v2/users')).toBe('/api/v2/users')
  })
})

describe('endpointId', () => {
  it('returns consistent ids for the same input', () => {
    const id1 = endpointId('GET', '/api/users/:param')
    const id2 = endpointId('GET', '/api/users/:param')
    expect(id1).toBe(id2)
  })

  it('returns different ids for different methods', () => {
    const getId = endpointId('GET', '/api/users')
    const postId = endpointId('POST', '/api/users')
    expect(getId).not.toBe(postId)
  })

  it('returns different ids for different paths', () => {
    const id1 = endpointId('GET', '/api/users')
    const id2 = endpointId('GET', '/api/orders')
    expect(id1).not.toBe(id2)
  })

  it('normalizes method to uppercase', () => {
    const id1 = endpointId('get', '/api/users')
    const id2 = endpointId('GET', '/api/users')
    expect(id1).toBe(id2)
  })

  it('returns a string', () => {
    const id = endpointId('GET', '/api/users')
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

describe('isJsonContentType', () => {
  it('matches application/json', () => {
    expect(isJsonContentType('application/json')).toBe(true)
  })

  it('matches application/json with charset', () => {
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
  })

  it('matches vendor types with +json suffix', () => {
    expect(isJsonContentType('application/vnd.api+json')).toBe(true)
  })

  it('matches application/hal+json', () => {
    expect(isJsonContentType('application/hal+json')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isJsonContentType('Application/JSON')).toBe(true)
  })

  it('rejects text/html', () => {
    expect(isJsonContentType('text/html')).toBe(false)
  })

  it('rejects text/plain', () => {
    expect(isJsonContentType('text/plain')).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isJsonContentType(undefined)).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isJsonContentType('')).toBe(false)
  })
})
