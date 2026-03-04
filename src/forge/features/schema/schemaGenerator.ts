export type SchemaVersion = 'draft-07' | 'draft-2020-12'

export interface JSONSchema {
  $schema?: string
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema | { oneOf: JSONSchema[] }
  oneOf?: JSONSchema[]
}

export function jsonToSchema(jsonStr: string, version: SchemaVersion = 'draft-07'): string {
  const value: unknown = JSON.parse(jsonStr)
  const schema = inferSchema(value, version)
  schema.$schema = version === 'draft-07'
    ? 'http://json-schema.org/draft-07/schema#'
    : 'https://json-schema.org/draft/2020-12/schema'
  return JSON.stringify(schema, null, 2)
}

function inferSchema(value: unknown, version: SchemaVersion): JSONSchema {
  if (value === null) {
    return { type: 'null' }
  }
  if (typeof value === 'string') return { type: 'string' }
  if (typeof value === 'number') return { type: 'number' }
  if (typeof value === 'boolean') return { type: 'boolean' }

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array' }
    const schemas = deduplicateSchemas(value.map(item => inferSchema(item, version)))
    return {
      type: 'array',
      items: schemas.length === 1 ? schemas[0] : { oneOf: schemas },
    }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const properties: Record<string, JSONSchema> = {}
    for (const [key, val] of Object.entries(obj)) {
      properties[key] = inferSchema(val, version)
    }
    return { type: 'object', required: Object.keys(obj), properties }
  }

  return {}
}

function deduplicateSchemas(schemas: JSONSchema[]): JSONSchema[] {
  const seen = new Set<string>()
  return schemas.filter(s => {
    const key = JSON.stringify(s)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
