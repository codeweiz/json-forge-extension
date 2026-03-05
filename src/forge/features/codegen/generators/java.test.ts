import { describe, it, expect } from 'vitest'
import { javaGenerator } from './java'

const generate = (json: string, root = 'Root') =>
  javaGenerator.generate(json, root)

describe('javaGenerator', () => {
  it('generates class with correct field types and getters/setters for flat object', () => {
    const result = generate('{"name":"Alice","age":30,"scores":[1,2]}')
    expect(result).toContain('import java.util.List;')
    expect(result).toContain('public class Root {')
    expect(result).toContain('private String name;')
    expect(result).toContain('private int age;')
    expect(result).toContain('private List<Integer> scores;')
    expect(result).toContain('public String getName() { return name; }')
    expect(result).toContain(
      'public void setName(String name) { this.name = name; }',
    )
    expect(result).toContain('public int getAge() { return age; }')
    expect(result).toContain(
      'public void setAge(int age) { this.age = age; }',
    )
    expect(result).toContain(
      'public List<Integer> getScores() { return scores; }',
    )
    expect(result).toContain(
      'public void setScores(List<Integer> scores) { this.scores = scores; }',
    )
  })

  it('generates separate class for nested object', () => {
    const result = generate('{"user":{"id":1,"email":"a@b.com"}}')
    expect(result).toContain('public class Root {')
    expect(result).toContain('private User user;')
    expect(result).toContain('public class User {')
    expect(result).toContain('private int id;')
    expect(result).toContain('private String email;')
  })

  it('generates List<ClassName> for array of objects', () => {
    const result = generate('{"users":[{"id":1},{"id":2}]}')
    expect(result).toContain('private List<User> users;')
    expect(result).toContain('public class User {')
    expect(result).toContain('private int id;')
  })

  it('distinguishes integer vs double', () => {
    const result = generate('{"count":30,"price":30.5}')
    expect(result).toContain('private int count;')
    expect(result).toContain('private double price;')
  })

  it('maps null field to Object type', () => {
    const result = generate('{"data":null}')
    expect(result).toContain('private Object data;')
  })

  it('maps boolean field to boolean with isX getter', () => {
    const result = generate('{"active":true}')
    expect(result).toContain('private boolean active;')
    expect(result).toContain(
      'public boolean isActive() { return active; }',
    )
    expect(result).toContain(
      'public void setActive(boolean active) { this.active = active; }',
    )
  })

  it('generates empty class for empty object', () => {
    const result = generate('{}')
    expect(result).toContain('public class Root {')
    expect(result).not.toContain('private')
    expect(result).not.toContain('import')
  })

  it('handles root array of objects', () => {
    const result = generate('[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]')
    expect(result).toContain('public class Root {')
    expect(result).toContain('private int id;')
    expect(result).toContain('private String name;')
  })
})
