import type { Faker } from '@faker-js/faker'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Fields matching these patterns keep their original value (enum-like)
const ENUM_PATTERNS = /^(status|type|role|state|mode|gender|category|kind)$/i

// Ordered list: [pattern, faker factory]
type FakerFactory = (f: Faker) => JsonValue
const FIELD_RULES: Array<[RegExp, FakerFactory]> = [
  [/^id$|_id$/i, f => f.string.uuid()],
  [/^name$/i, f => f.person.fullName()],
  [/first_?name|firstName/i, f => f.person.firstName()],
  [/last_?name|lastName/i, f => f.person.lastName()],
  [/email/i, f => f.internet.email()],
  [/phone/i, f => f.phone.number()],
  [/avatar|photo|image/i, f => f.image.url()],
  [/url|website/i, f => f.internet.url()],
  [/_at$|_time$|_date$|created|updated|timestamp/i, f => f.date.recent().toISOString()],
  [/address/i, f => f.location.streetAddress()],
  [/city/i, f => f.location.city()],
  [/country/i, f => f.location.country()],
  [/title/i, f => f.lorem.sentence()],
  [/description|content/i, f => f.lorem.sentence()],
  [/price|amount|cost|salary|fee/i, f => parseFloat(f.number.float({ min: 1, max: 1000, fractionDigits: 2 }).toFixed(2))],
  [/age/i, f => f.number.int({ min: 18, max: 80 })],
  [/count|total|quantity/i, f => f.number.int({ min: 0, max: 100 })],
]

export function generateMock(value: unknown, faker: Faker): JsonValue {
  return mockValue(value, '', faker)
}

function mockValue(value: unknown, fieldName: string, faker: Faker): JsonValue {
  if (value === null) return null
  if (typeof value === 'boolean') return faker.datatype.boolean()

  // For scalar types (string and number), check field name rules first
  if (typeof value === 'string' || typeof value === 'number') {
    // Preserve enum-like fields (string only)
    if (typeof value === 'string' && ENUM_PATTERNS.test(fieldName)) return value
    // Try semantic match by field name (applies to both string and number values)
    for (const [pattern, factory] of FIELD_RULES) {
      if (pattern.test(fieldName)) return factory(faker)
    }
    // Fall back to type-based generation
    if (typeof value === 'number') return faker.number.int({ min: 0, max: 10000 })
    return faker.lorem.word()
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return []
    const template = value[0]
    const count = faker.number.int({ min: 2, max: 3 })
    return Array.from({ length: count }, () => mockValue(template, fieldName, faker))
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const result: Record<string, JsonValue> = {}
    for (const [key, val] of Object.entries(obj)) {
      result[key] = mockValue(val, key, faker)
    }
    return result
  }

  return faker.lorem.word()
}
