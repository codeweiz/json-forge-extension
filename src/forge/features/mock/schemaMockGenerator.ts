import type { Faker } from '@faker-js/faker'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface SchemaNode {
  type?: string
  properties?: Record<string, SchemaNode>
  required?: string[]
  items?: SchemaNode
  enum?: JsonValue[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  format?: string
  oneOf?: SchemaNode[]
  [key: string]: unknown
}

export function generateMockFromSchema(schema: SchemaNode, faker: Faker): JsonValue {
  return mockFromNode(schema, faker)
}

function mockFromNode(schema: SchemaNode, faker: Faker): JsonValue {
  // enum: pick random value
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[faker.number.int({ min: 0, max: schema.enum.length - 1 })]
  }

  // oneOf: pick random schema and recurse
  if (schema.oneOf && schema.oneOf.length > 0) {
    const picked = schema.oneOf[faker.number.int({ min: 0, max: schema.oneOf.length - 1 })]
    return mockFromNode(picked, faker)
  }

  switch (schema.type) {
    case 'object':
      return mockObject(schema, faker)
    case 'array':
      return mockArray(schema, faker)
    case 'string':
      return mockString(schema, faker)
    case 'number':
      return mockNumber(schema, faker)
    case 'integer':
      return mockInteger(schema, faker)
    case 'boolean':
      return faker.datatype.boolean()
    case 'null':
      return null
    default:
      return faker.lorem.word()
  }
}

function mockObject(schema: SchemaNode, faker: Faker): JsonValue {
  const result: Record<string, JsonValue> = {}
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      result[key] = mockFromNode(propSchema, faker)
    }
  }
  return result
}

function mockArray(schema: SchemaNode, faker: Faker): JsonValue {
  const count = faker.number.int({ min: 2, max: 3 })
  if (schema.items) {
    return Array.from({ length: count }, () => mockFromNode(schema.items!, faker))
  }
  return Array.from({ length: count }, () => faker.lorem.word())
}

function mockString(schema: SchemaNode, faker: Faker): JsonValue {
  // Check format first
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        return faker.internet.email()
      case 'uri':
      case 'url':
        return faker.internet.url()
      case 'date-time':
        return faker.date.recent().toISOString()
      case 'uuid':
        return faker.string.uuid()
    }
  }

  // Check minLength/maxLength
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    const min = schema.minLength ?? 1
    const max = schema.maxLength ?? Math.max(min, 20)
    const length = faker.number.int({ min, max })
    return faker.string.alpha({ length })
  }

  return faker.lorem.word()
}

function mockNumber(schema: SchemaNode, faker: Faker): JsonValue {
  const min = schema.minimum ?? 0
  const max = schema.maximum ?? 10000
  return faker.number.float({ min, max, fractionDigits: 2 })
}

function mockInteger(schema: SchemaNode, faker: Faker): JsonValue {
  const min = schema.minimum ?? 0
  const max = schema.maximum ?? 10000
  return faker.number.int({ min, max })
}
