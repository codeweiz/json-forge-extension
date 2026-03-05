import type { CodeGenerator } from '../types'

function toPascalCase(str: string): string {
  return str.replace(/(^|[_\-\s])(\w)/g, (_, _sep, c: string) => c.toUpperCase())
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

interface ClassDef {
  name: string
  fields: { name: string; type: string }[]
}

function isInteger(n: number): boolean {
  return Number.isFinite(n) && Math.floor(n) === n
}

function inferType(
  value: unknown,
  fieldName: string,
  classes: ClassDef[],
): string {
  if (value === null) return 'Object'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') {
    return isInteger(value) ? 'int' : 'double'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Object>'

    // Check if all elements are objects — handle before general type inference
    const allObjects = value.every(
      (el) => typeof el === 'object' && el !== null && !Array.isArray(el),
    )
    if (allObjects) {
      const className = toPascalCase(singularize(fieldName))
      const existingIdx = classes.findIndex((c) => c.name === className)
      if (existingIdx !== -1) classes.splice(existingIdx, 1)
      const merged = mergeObjects(value as Record<string, unknown>[])
      generateClass(className, merged, classes)
      return `List<${className}>`
    }

    // For non-object arrays, infer element types
    const elementTypes = value.map((el) => inferType(el, fieldName, classes))
    const unique = [...new Set(elementTypes)]
    if (unique.length === 1) {
      return `List<${boxType(unique[0])}>`
    }
    return 'List<Object>'
  }
  if (typeof value === 'object') {
    const className = toPascalCase(fieldName)
    generateClass(className, value as Record<string, unknown>, classes)
    return className
  }
  return 'Object'
}

function boxType(t: string): string {
  switch (t) {
    case 'int':
      return 'Integer'
    case 'double':
      return 'Double'
    case 'boolean':
      return 'Boolean'
    default:
      return t
  }
}

function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('ses')) return name.slice(0, -2)
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1)
  return name + 'Item'
}

function mergeObjects(
  objects: Record<string, unknown>[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      if (!(key in merged) || merged[key] === null) {
        merged[key] = val
      }
    }
  }
  return merged
}

function generateClass(
  className: string,
  obj: Record<string, unknown>,
  classes: ClassDef[],
): void {
  // Avoid duplicates
  if (classes.some((c) => c.name === className)) return

  const fields: { name: string; type: string }[] = []
  // Reserve spot to avoid infinite recursion
  const classDef: ClassDef = { name: className, fields }
  classes.push(classDef)

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = toCamelCase(key)
    const fieldType = inferType(value, key, classes)
    fields.push({ name: fieldName, type: fieldType })
  }
}

function classToString(cls: ClassDef): string {
  const lines: string[] = []
  lines.push(`public class ${cls.name} {`)

  // Fields
  for (const f of cls.fields) {
    lines.push(`    private ${f.type} ${f.name};`)
  }

  // Getters and setters
  for (const f of cls.fields) {
    lines.push('')
    const cap = capitalize(f.name)
    const getter =
      f.type === 'boolean'
        ? `    public ${f.type} is${cap}() { return ${f.name}; }`
        : `    public ${f.type} get${cap}() { return ${f.name}; }`
    lines.push(getter)
    lines.push(
      `    public void set${cap}(${f.type} ${f.name}) { this.${f.name} = ${f.name}; }`,
    )
  }

  lines.push('}')
  return lines.join('\n')
}

function generateJava(json: string, rootName = 'Root'): string {
  const parsed: unknown = JSON.parse(json)
  const classes: ClassDef[] = []

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      // Empty root array — wrapper class with List<Object>
      classes.push({
        name: rootName,
        fields: [{ name: 'items', type: 'List<Object>' }],
      })
    } else {
      const allObjects = parsed.every(
        (el) => typeof el === 'object' && el !== null && !Array.isArray(el),
      )
      if (allObjects) {
        const merged = mergeObjects(parsed as Record<string, unknown>[])
        generateClass(rootName, merged, classes)
      } else {
        // Non-object root array
        const elementType = inferType(parsed[0], rootName, classes)
        classes.push({
          name: rootName,
          fields: [{ name: 'items', type: `List<${boxType(elementType)}>` }],
        })
      }
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    generateClass(rootName, parsed as Record<string, unknown>, classes)
  } else {
    // Primitive root
    const t = inferType(parsed, 'value', classes)
    classes.push({
      name: rootName,
      fields: [{ name: 'value', type: t }],
    })
  }

  const needsList = classes.some((cls) =>
    cls.fields.some((f) => f.type.startsWith('List<')),
  )

  const parts: string[] = []
  if (needsList) {
    parts.push('import java.util.List;')
    parts.push('')
  }

  // Output classes: root class first, then nested classes
  const rootClass = classes.find((c) => c.name === rootName)
  const nestedClasses = classes.filter((c) => c.name !== rootName)

  if (rootClass) {
    parts.push(classToString(rootClass))
  }
  for (const cls of nestedClasses) {
    parts.push('')
    parts.push(classToString(cls))
  }

  return parts.join('\n') + '\n'
}

export const javaGenerator: CodeGenerator = {
  name: 'Java',
  language: 'java',
  extension: '.java',
  generate(json: string, rootName = 'Root'): string {
    return generateJava(json, rootName)
  },
}
