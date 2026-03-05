import type { CodeGenerator } from '../types'

interface GeneratorContext {
  structs: Map<string, string>
}

function toPascalCase(s: string): string {
  if (!s) return s
  // Split on underscores, hyphens, or camelCase boundaries
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function allObjectsWithSameKeys(arr: unknown[]): boolean {
  if (arr.length === 0) return false
  if (!arr.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))) {
    return false
  }
  const firstKeys = Object.keys(arr[0] as Record<string, unknown>).sort().join(',')
  return arr.every(
    (item) => Object.keys(item as Record<string, unknown>).sort().join(',') === firstKeys,
  )
}

function inferGoType(
  value: unknown,
  name: string,
  ctx: GeneratorContext,
): string {
  if (value === null) return 'interface{}'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'bool'

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float64'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}'

    const itemName = name + 'Item'

    // For arrays of objects with the same shape, only generate one struct
    if (allObjectsWithSameKeys(value)) {
      const itemType = inferGoType(value[0], itemName, ctx)
      return '[]' + itemType
    }

    const itemTypes = [
      ...new Set(value.map((item) => inferGoType(item, itemName, ctx))),
    ]

    if (itemTypes.length === 1) {
      return '[]' + itemTypes[0]
    }
    return '[]interface{}'
  }

  if (typeof value === 'object') {
    return buildStruct(value as Record<string, unknown>, name, ctx)
  }

  return 'interface{}'
}

function buildStruct(
  obj: Record<string, unknown>,
  name: string,
  ctx: GeneratorContext,
): string {
  const structName = toPascalCase(name)

  const fields: { fieldName: string; goType: string; jsonKey: string }[] = []

  for (const [key, val] of Object.entries(obj)) {
    const childName = toPascalCase(key)
    const goType = inferGoType(val, childName, ctx)
    fields.push({ fieldName: childName, goType, jsonKey: key })
  }

  // Compute max field name and type widths for alignment
  const maxFieldLen = fields.reduce(
    (max, f) => Math.max(max, f.fieldName.length),
    0,
  )
  const maxTypeLen = fields.reduce(
    (max, f) => Math.max(max, f.goType.length),
    0,
  )

  const lines = fields.map((f) => {
    const paddedField = f.fieldName.padEnd(maxFieldLen)
    const paddedType = f.goType.padEnd(maxTypeLen)
    return `\t${paddedField} ${paddedType} \`json:"${f.jsonKey}"\``
  })

  // Deduplicate struct names
  let finalName = structName
  let suffix = 2
  while (ctx.structs.has(finalName)) {
    finalName = structName + String(suffix)
    suffix++
  }

  const body = `type ${finalName} struct {\n${lines.join('\n')}\n}`
  ctx.structs.set(finalName, body)
  return finalName
}

function generateGo(json: string, rootName = 'Root'): string {
  const value: unknown = JSON.parse(json)
  const ctx: GeneratorContext = { structs: new Map() }
  const rootType = inferGoType(value, rootName, ctx)

  const allStructs = Array.from(ctx.structs.values()).join('\n\n')

  if (!ctx.structs.has(toPascalCase(rootName))) {
    // Root was a primitive or array — export as type alias
    const prefix = allStructs ? allStructs + '\n\n' : ''
    return `${prefix}type ${toPascalCase(rootName)} = ${rootType}`
  }

  return allStructs
}

export const goGenerator: CodeGenerator = {
  name: 'Go',
  language: 'go',
  extension: '.go',
  generate(json: string, rootName = 'Root'): string {
    return generateGo(json, rootName)
  },
}
