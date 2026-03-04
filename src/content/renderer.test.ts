import { describe, it, expect, beforeEach } from 'vitest'
import { renderJsonTree } from './renderer'

describe('renderJsonTree', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a string value', () => {
    const el = renderJsonTree('hello')
    expect(el.textContent).toContain('hello')
    expect(el.querySelector('.jf-string')).toBeTruthy()
  })

  it('renders a number value', () => {
    const el = renderJsonTree(42)
    expect(el.querySelector('.jf-number')).toBeTruthy()
  })

  it('renders null value', () => {
    const el = renderJsonTree(null)
    expect(el.querySelector('.jf-null')).toBeTruthy()
  })

  it('renders an object with keys', () => {
    const el = renderJsonTree({ name: 'Alice', age: 30 })
    expect(el.textContent).toContain('name')
    expect(el.textContent).toContain('Alice')
    expect(el.textContent).toContain('age')
    expect(el.querySelector('.jf-key')).toBeTruthy()
    expect(el.querySelector('.jf-object-row')).toBeTruthy()
  })

  it('renders an array', () => {
    const el = renderJsonTree([1, 2, 3])
    expect(el.querySelectorAll('.jf-array-item').length).toBe(3)
  })
})
