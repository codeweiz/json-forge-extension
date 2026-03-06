import { describe, it, expect } from 'vitest'
import { parseHarEntry, type HarEntry } from './useNetworkCapture'

function makeEntry(overrides: Partial<{ request: Partial<HarEntry['request']>; response: Partial<HarEntry['response']>; time: number }>): HarEntry {
  return {
    request: { method: 'GET', url: 'https://example.com', headers: [], ...overrides.request },
    response: {
      status: 200,
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      content: { text: '{}', size: 2, mimeType: 'application/json' },
      ...overrides.response,
    },
    time: overrides.time ?? 100,
    startedDateTime: '2026-03-05T10:00:00.000Z',
    getContent: () => {},
  }
}

describe('parseHarEntry', () => {
  it('extracts meta from a HAR entry with JSON response', () => {
    const entry = makeEntry({
      request: {
        method: 'GET',
        url: 'https://api.example.com/users/123?page=1',
        headers: [{ name: 'Authorization', value: 'Bearer xxx' }],
      },
      response: {
        status: 200,
        headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        content: { text: '{"id":123,"name":"Alice"}', size: 25, mimeType: 'application/json' },
      },
      time: 142,
    })

    const result = parseHarEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.meta.method).toBe('GET')
    expect(result!.meta.url).toBe('https://api.example.com/users/123?page=1')
    expect(result!.meta.status).toBe(200)
    expect(result!.meta.timing).toBe(142)
    expect(result!.responseBody).toBe('{"id":123,"name":"Alice"}')
  })

  it('returns null for non-JSON response', () => {
    const entry = makeEntry({
      response: {
        status: 200,
        headers: [{ name: 'Content-Type', value: 'text/html' }],
        content: { text: '<html></html>', size: 13, mimeType: 'text/html' },
      },
      time: 50,
    })
    expect(parseHarEntry(entry)).toBeNull()
  })

  it('returns null when response body is empty', () => {
    const entry = makeEntry({
      response: {
        status: 204,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text: '', size: 0, mimeType: 'application/json' },
      },
      time: 10,
    })
    expect(parseHarEntry(entry)).toBeNull()
  })

  it('includes request body for POST', () => {
    const entry = makeEntry({
      request: {
        method: 'POST',
        url: 'https://api.com/users',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        postData: { text: '{"name":"Bob"}', mimeType: 'application/json' },
      },
      response: {
        status: 201,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text: '{"id":1}', size: 8, mimeType: 'application/json' },
      },
      time: 200,
    })
    const result = parseHarEntry(entry)
    expect(result!.meta.requestBody).toBe('{"name":"Bob"}')
  })

  it('detects JSON via mimeType when Content-Type header is missing', () => {
    const entry = makeEntry({
      response: {
        status: 200,
        headers: [],
        content: { text: '{"ok":true}', size: 11, mimeType: 'application/json' },
      },
      time: 30,
    })
    const result = parseHarEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.responseBody).toBe('{"ok":true}')
  })
})
