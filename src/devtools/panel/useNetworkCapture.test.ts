import { describe, it, expect } from 'vitest'
import { parseHarEntry } from './useNetworkCapture'

describe('parseHarEntry', () => {
  it('extracts meta from a HAR entry with JSON response', () => {
    const harEntry = {
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
      startedDateTime: '2026-03-05T10:00:00.000Z',
      getContent: () => {},
    }

    const result = parseHarEntry(harEntry as any)
    expect(result).not.toBeNull()
    expect(result!.meta.method).toBe('GET')
    expect(result!.meta.url).toBe('https://api.example.com/users/123?page=1')
    expect(result!.meta.status).toBe(200)
    expect(result!.meta.timing).toBe(142)
    expect(result!.responseBody).toBe('{"id":123,"name":"Alice"}')
  })

  it('returns null for non-JSON response', () => {
    const harEntry = {
      request: { method: 'GET', url: 'https://example.com/page', headers: [] },
      response: {
        status: 200,
        headers: [{ name: 'Content-Type', value: 'text/html' }],
        content: { text: '<html></html>', size: 13, mimeType: 'text/html' },
      },
      time: 50,
      startedDateTime: '2026-03-05T10:00:00.000Z',
      getContent: () => {},
    }
    expect(parseHarEntry(harEntry as any)).toBeNull()
  })

  it('returns null when response body is empty', () => {
    const harEntry = {
      request: { method: 'GET', url: 'https://api.com/health', headers: [] },
      response: {
        status: 204,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text: '', size: 0, mimeType: 'application/json' },
      },
      time: 10,
      startedDateTime: '2026-03-05T10:00:00.000Z',
      getContent: () => {},
    }
    expect(parseHarEntry(harEntry as any)).toBeNull()
  })

  it('includes request body for POST', () => {
    const harEntry = {
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
      startedDateTime: '2026-03-05T10:00:00.000Z',
      getContent: () => {},
    }
    const result = parseHarEntry(harEntry as any)
    expect(result!.meta.requestBody).toBe('{"name":"Bob"}')
  })

  it('detects JSON via mimeType when Content-Type header is missing', () => {
    const harEntry = {
      request: { method: 'GET', url: 'https://api.com/data', headers: [] },
      response: {
        status: 200,
        headers: [],
        content: { text: '{"ok":true}', size: 11, mimeType: 'application/json' },
      },
      time: 30,
      startedDateTime: '2026-03-05T10:00:00.000Z',
      getContent: () => {},
    }
    const result = parseHarEntry(harEntry as any)
    expect(result).not.toBeNull()
    expect(result!.responseBody).toBe('{"ok":true}')
  })
})
