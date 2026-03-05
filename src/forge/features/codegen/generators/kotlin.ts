import type { CodeGenerator } from '../types'

interface GeneratorContext {
  classes: Map<string, string>
}

function toPascalCase(s: string): string {
  if (!s) return s
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase())
}

function toCamelCase(s: string): string {
  const pascal = toPascalCase(s)
  if (!pascal) return pascal
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function inferType(
  value: unknown,
  name: string,
  ctx: GeneratorContext,
): string {
  if (value === null) return 'Any?'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Int' : 'Double'
  }
  if (typeof value === 'boolean') return 'Boolean'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Any>'
    const itemName = `${name}Item`
    const itemTypes = [
      ...new Set(value.map((item) => inferType(item, itemName, ctx))),
    ]
    const itemType = itemTypes.length === 1 ? itemTypes[0] : 'Any'
    return `List<${itemType}>`
  }

  if (typeof value === 'object') {
    return buildDataClass(value as Record<string, unknown>, name, ctx)
  }

  return 'Any'
}

function buildDataClass(
  obj: Record<string, unknown>,
  name: string,
  ctx: GeneratorContext,
): string {
  const className = toPascalCase(name)
  const entries = Object.entries(obj)

  if (entries.length === 0) {
    const body = `data class ${className}()`
    ctx.classes.set(className, body)
    return className
  }

  const fields: string[] = []
  for (const [key, val] of entries) {
    const fieldName = toCamelCase(key)
    const childClassName = toPascalCase(key)
    const isNull = val === null
    const fieldType = inferType(val, childClassName, ctx)
    const nullable = isNull ? '' : ''
    fields.push(`    val ${fieldName}: ${fieldType}${nullable}`)
  }

  const body = `data class ${className}(\n${fields.join(',\n')}\n)`
  ctx.classes.set(className, body)
  return className
}

function jsonToKotlin(jsonStr: string, rootName = 'Root'): string {
  const value: unknown = JSON.parse(jsonStr)
  const ctx: GeneratorContext = { classes: new Map() }
  const rootType = inferType(value, rootName, ctx)

  const allClasses = Array.from(ctx.classes.values()).join('\n\n')

  if (!ctx.classes.has(toPascalCase(rootName))) {
    // Root was a primitive or array — export as type alias
    const prefix = allClasses ? allClasses + '\n\n' : ''
    return `${prefix}typealias ${toPascalCase(rootName)} = ${rootType}`
  }

  return allClasses
}

export const kotlinGenerator: CodeGenerator = {
  name: 'Kotlin',
  language: 'kotlin',
  extension: '.kt',
  generate(json: string, rootName = 'Root'): string {
    return jsonToKotlin(json, rootName)
  },
}
