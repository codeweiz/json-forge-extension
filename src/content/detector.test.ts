import { describe, it, expect, beforeEach } from 'vitest'
import { isJsonPage, extractJson } from './detector'

describe('isJsonPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('returns true when content-type is application/json', () => {
    // Simulate a pure JSON page: body contains only a <pre> with JSON
    document.body.innerHTML = '<pre>{"hello": "world"}</pre>'
    expect(isJsonPage()).toBe(true)
  })

  it('returns false when page has normal HTML structure', () => {
    document.body.innerHTML = '<div><p>Hello</p></div>'
    expect(isJsonPage()).toBe(false)
  })

  it('returns false when pre content is not valid JSON', () => {
    document.body.innerHTML = '<pre>not json</pre>'
    expect(isJsonPage()).toBe(false)
  })
})

describe('extractJson', () => {
  it('parses JSON from body pre tag', () => {
    document.body.innerHTML = '<pre>{"key": 1}</pre>'
    expect(extractJson()).toEqual({ key: 1 })
  })

  it('returns null when no JSON found', () => {
    document.body.innerHTML = '<div>text</div>'
    expect(extractJson()).toBeNull()
  })
})
