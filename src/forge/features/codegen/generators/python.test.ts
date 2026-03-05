import { describe, it, expect } from 'vitest'
import { pythonGenerator } from './python'

const generate = (json: string, rootName = 'Root') =>
  pythonGenerator.generate(json, rootName)

describe('pythonGenerator', () => {
  it('generates BaseModel for flat object with correct field types', () => {
    const result = generate('{"userName":"Alice","age":30,"active":true}')
    expect(result).toContain('from pydantic import BaseModel')
    expect(result).toContain('class Root(BaseModel):')
    expect(result).toContain('user_name: str')
    expect(result).toContain('age: int')
    expect(result).toContain('active: bool')
  })

  it('generates separate BaseModel for nested object', () => {
    const result = generate('{"user":{"id":1,"name":"Alice"}}')
    expect(result).toContain('class Root(BaseModel):')
    expect(result).toContain('user: User')
    expect(result).toContain('class User(BaseModel):')
    expect(result).toContain('id: int')
    expect(result).toContain('name: str')
  })

  it('generates list[ClassName] for array of objects', () => {
    const result = generate('{"items":[{"id":1},{"id":2}]}')
    expect(result).toContain('items: list[Items]')
    expect(result).toContain('class Items(BaseModel):')
    expect(result).toContain('id: int')
  })

  it('distinguishes integer from float', () => {
    const result = generate('{"count":42,"price":9.99}')
    expect(result).toContain('count: int')
    expect(result).toContain('price: float')
  })

  it('generates Optional type for null fields', () => {
    const result = generate('{"email":null}')
    expect(result).toContain('from typing import Optional, Any')
    expect(result).toContain('email: Optional[Any]')
  })

  it('generates bool for boolean fields', () => {
    const result = generate('{"isActive":true,"isDeleted":false}')
    expect(result).toContain('is_active: bool')
    expect(result).toContain('is_deleted: bool')
  })

  it('converts camelCase keys to snake_case', () => {
    const result = generate(
      '{"firstName":"A","lastName":"B","createdAt":"2024"}',
    )
    expect(result).toContain('first_name: str')
    expect(result).toContain('last_name: str')
    expect(result).toContain('created_at: str')
  })

  it('handles root primitive as type alias', () => {
    const result = generate('"hello"')
    expect(result).toContain('Root = str')
  })

  it('handles root number', () => {
    const result = generate('42')
    expect(result).toContain('Root = int')
  })

  it('handles root array of primitives', () => {
    const result = generate('[1, 2, 3]')
    expect(result).toContain('Root = list[int]')
  })

  it('handles empty array', () => {
    const result = generate('{"tags":[]}')
    expect(result).toContain('tags: list[Any]')
  })

  it('handles mixed array as list[Any]', () => {
    const result = generate('{"data":[1,"two",true]}')
    expect(result).toContain('data: list[Any]')
  })
})
