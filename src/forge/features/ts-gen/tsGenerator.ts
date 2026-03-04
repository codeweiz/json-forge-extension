interface GeneratorContext {
  interfaces: Map<string, string>
}

export function jsonToTypeScript(jsonStr: string, rootName = 'Root'): string {
  const value: unknown = JSON.parse(jsonStr)
  const ctx: GeneratorContext = { interfaces: new Map() }
  const rootType = inferType(value, rootName, ctx)

  const allInterfaces = Array.from(ctx.interfaces.values()).join('\n\n')

  if (!ctx.interfaces.has(rootName)) {
    // Root was a primitive or array — export as type alias
    const prefix = allInterfaces ? allInterfaces + '\n\n' : ''
    return `${prefix}export type ${rootName} = ${rootType}`
  }

  return allInterfaces
}

function inferType(value: unknown, name: string, ctx: GeneratorContext): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const itemName = `${name}Item`
    const itemTypes = [...new Set(value.map((item) => inferType(item, itemName, ctx)))]
    const itemType = itemTypes.length === 1 ? itemTypes[0] : `(${itemTypes.join(' | ')})`
    return `${itemType}[]`
  }

  if (typeof value === 'object') {
    return buildInterface(value as Record<string, unknown>, name, ctx)
  }

  return 'unknown'
}

function buildInterface(
  obj: Record<string, unknown>,
  name: string,
  ctx: GeneratorContext,
): string {
  const lines: string[] = []

  for (const [key, val] of Object.entries(obj)) {
    const childName = capitalize(key)
    const isNull = val === null
    const childType = isNull ? 'null' : inferType(val, childName, ctx)
    const typeAnnotation = isNull ? 'null' : childType
    lines.push(`  ${key}: ${typeAnnotation}`)
  }

  // Deduplicate: if name already exists with different content, use a suffixed name
  let finalName = name
  let suffix = 2
  while (ctx.interfaces.has(finalName) && ctx.interfaces.get(finalName) !== undefined) {
    finalName = `${name}${suffix}`
    suffix++
  }
  const body = `export interface ${finalName} {\n${lines.join('\n')}\n}`
  ctx.interfaces.set(finalName, body)
  return finalName
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
