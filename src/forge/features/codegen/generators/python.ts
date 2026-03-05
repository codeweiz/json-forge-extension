import type { CodeGenerator } from '../types'

interface GeneratorContext {
  models: Map<string, string>
}

function toPascalCase(s: string): string {
  if (!s) return s
  // Split on underscores, hyphens, or camelCase boundaries
  return s
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .split(/[_\-\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

function toSnakeCase(s: string): string {
  if (!s) return s
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .replace(/[\-\s]+/g, '_')
    .toLowerCase()
}

function inferType(
  value: unknown,
  name: string,
  ctx: GeneratorContext,
): string {
  if (value === null) return 'Optional[Any]'
  if (typeof value === 'string') return 'str'
  if (typeof value === 'boolean') return 'bool'

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'list[Any]'
    const firstItem = value[0]
    // For uniform arrays of objects, infer from the first element only
    // and use the parent name directly (e.g. "Items" not "ItemsItem")
    if (
      firstItem !== null &&
      typeof firstItem === 'object' &&
      !Array.isArray(firstItem)
    ) {
      const allObjects = value.every(
        item =>
          item !== null && typeof item === 'object' && !Array.isArray(item),
      )
      if (allObjects) {
        const itemType = inferType(firstItem, name, ctx)
        return `list[${itemType}]`
      }
    }
    const itemName = `${name}Item`
    const itemTypes = [
      ...new Set(value.map(item => inferType(item, itemName, ctx))),
    ]
    const itemType = itemTypes.length === 1 ? itemTypes[0] : 'Any'
    return `list[${itemType}]`
  }

  if (typeof value === 'object') {
    return buildModel(value as Record<string, unknown>, name, ctx)
  }

  return 'Any'
}

function buildModel(
  obj: Record<string, unknown>,
  name: string,
  ctx: GeneratorContext,
): string {
  const className = toPascalCase(name)
  const lines: string[] = []

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = toSnakeCase(key)
    const childClassName = toPascalCase(key)
    const fieldType = inferType(val, childClassName, ctx)
    lines.push(`    ${fieldName}: ${fieldType}`)
  }

  // Deduplicate model names
  let finalName = className
  let suffix = 2
  while (ctx.models.has(finalName)) {
    finalName = `${className}${suffix}`
    suffix++
  }

  const body =
    lines.length > 0
      ? `class ${finalName}(BaseModel):\n${lines.join('\n')}`
      : `class ${finalName}(BaseModel):\n    pass`
  ctx.models.set(finalName, body)
  return finalName
}

function generatePython(json: string, rootName = 'Root'): string {
  const value: unknown = JSON.parse(json)
  const ctx: GeneratorContext = { models: new Map() }
  const rootType = inferType(value, rootName, ctx)

  const imports = ['from pydantic import BaseModel']
  // Check if Optional or Any is used
  const allModels = Array.from(ctx.models.values()).join('\n')
  const needsOptional = allModels.includes('Optional[')
  const needsAny =
    allModels.includes('Any]') ||
    allModels.includes('Any') ||
    rootType.includes('Any')

  if (needsOptional || needsAny) {
    const typingImports: string[] = []
    if (needsOptional) typingImports.push('Optional')
    if (needsAny) typingImports.push('Any')
    imports.push(`from typing import ${typingImports.join(', ')}`)
  }

  const modelsBlock = Array.from(ctx.models.values()).join('\n\n')

  if (!ctx.models.has(toPascalCase(rootName))) {
    // Root is a primitive or array — export as type alias comment
    const prefix = modelsBlock ? modelsBlock + '\n\n' : ''
    return `${imports.join('\n')}\n\n${prefix}${toPascalCase(rootName)} = ${rootType}`
  }

  return `${imports.join('\n')}\n\n${modelsBlock}\n`
}

export const pythonGenerator: CodeGenerator = {
  name: 'Python',
  language: 'python',
  extension: '.py',
  generate(json: string, rootName = 'Root'): string {
    return generatePython(json, rootName)
  },
}
