import { describe, it, expect } from 'vitest'
import { goGenerator } from './go'

describe('goGenerator', () => {
  it('generates a flat struct with json tags', () => {
    const json = JSON.stringify({ name: 'Alice', age: 30 })
    const result = goGenerator.generate(json)
    expect(result).toContain('type Root struct {')
    expect(result).toContain('Name string `json:"name"`')
    expect(result).toContain('Age  int    `json:"age"`')
  })

  it('generates separate struct types for nested objects', () => {
    const json = JSON.stringify({
      user: { name: 'Alice', email: 'a@b.com' },
    })
    const result = goGenerator.generate(json)
    expect(result).toContain('type User struct {')
    expect(result).toContain('Name  string `json:"name"`')
    expect(result).toContain('Email string `json:"email"`')
    expect(result).toContain('type Root struct {')
    expect(result).toContain('User User `json:"user"`')
  })

  it('generates []ClassName for arrays of objects', () => {
    const json = JSON.stringify({
      items: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    })
    const result = goGenerator.generate(json)
    expect(result).toContain('type ItemsItem struct {')
    expect(result).toContain('[]ItemsItem')
  })

  it('distinguishes int from float64', () => {
    const json = JSON.stringify({ count: 42, ratio: 3.14 })
    const result = goGenerator.generate(json)
    expect(result).toContain('Count int')
    expect(result).toContain('Ratio float64')
  })

  it('maps null to interface{}', () => {
    const json = JSON.stringify({ value: null })
    const result = goGenerator.generate(json)
    expect(result).toMatch(/Value\s+interface\{\}/)
  })

  it('maps boolean to bool', () => {
    const json = JSON.stringify({ active: true })
    const result = goGenerator.generate(json)
    expect(result).toContain('Active bool')
  })

  it('converts snake_case field names to PascalCase', () => {
    const json = JSON.stringify({ user_name: 'Alice', first_name: 'Bob' })
    const result = goGenerator.generate(json)
    expect(result).toContain('UserName')
    expect(result).toContain('FirstName')
    expect(result).toContain('`json:"user_name"`')
    expect(result).toContain('`json:"first_name"`')
  })

  it('handles root array', () => {
    const json = JSON.stringify([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ])
    const result = goGenerator.generate(json)
    expect(result).toContain('type RootItem struct {')
    expect(result).toContain('type Root = []RootItem')
  })
})
