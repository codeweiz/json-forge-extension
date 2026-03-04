import { describe, it, expect, beforeEach } from 'vitest'
import { isJsonPage, extractJson } from './detector'

describe('isJsonPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('returns true when body has a direct <pre> child with valid JSON', () => {
    document.body.innerHTML = '<pre>{"hello": "world"}</pre>'
    expect(isJsonPage()).toBe(true)
  })

  it('returns true even when Chrome injects extra elements (e.g. style) alongside pre', () => {
    document.body.innerHTML = '<style>body{}</style><pre>{"hello": "world"}</pre>'
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

  it('returns false when pre is nested inside another element', () => {
    document.body.innerHTML = '<div><pre>{"key": 1}</pre></div>'
    expect(isJsonPage()).toBe(false)
  })
})

describe('extractJson', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('parses JSON from body pre tag', () => {
    document.body.innerHTML = '<pre>{"key": 1}</pre>'
    expect(extractJson()).toEqual({ key: 1 })
  })

  it('returns null when no JSON found', () => {
    document.body.innerHTML = '<div>text</div>'
    expect(extractJson()).toBeNull()
  })
})
