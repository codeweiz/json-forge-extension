interface SchemaNode {
  type?: string
  properties?: Record<string, SchemaNode>
  required?: string[]
  items?: SchemaNode
  oneOf?: SchemaNode[]
  [key: string]: unknown
}

export function mergeSchemas(schemas: SchemaNode[]): SchemaNode {
  if (schemas.length === 0) return { type: 'object', properties: {} }
  if (schemas.length === 1) return schemas[0]
  return schemas.reduce((acc, s) => mergeTwoSchemas(acc, s))
}

function mergeTwoSchemas(a: SchemaNode, b: SchemaNode): SchemaNode {
  if (a.type === 'object' && b.type === 'object') {
    return mergeObjectSchemas(a, b)
  }
  if (a.type === 'array' && b.type === 'array') {
    return {
      type: 'array',
      items: a.items && b.items ? mergeTwoSchemas(a.items, b.items) : a.items || b.items,
    }
  }
  if (a.type !== b.type) {
    const existing = a.oneOf || [{ type: a.type }]
    const bEntry = { type: b.type }
    if (!existing.some(e => e.type === b.type)) {
      existing.push(bEntry)
    }
    return { oneOf: existing }
  }
  return a
}

function mergeObjectSchemas(a: SchemaNode, b: SchemaNode): SchemaNode {
  const propsA = a.properties || {}
  const propsB = b.properties || {}
  const reqA = new Set(a.required || [])
  const reqB = new Set(b.required || [])

  const allKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)])
  const mergedProps: Record<string, SchemaNode> = {}
  const mergedRequired: string[] = []

  for (const key of allKeys) {
    const inA = key in propsA
    const inB = key in propsB

    if (inA && inB) {
      mergedProps[key] = mergeTwoSchemas(propsA[key], propsB[key])
      if (reqA.has(key) && reqB.has(key)) {
        mergedRequired.push(key)
      }
    } else {
      mergedProps[key] = inA ? propsA[key] : propsB[key]
    }
  }

  return {
    type: 'object',
    properties: mergedProps,
    ...(mergedRequired.length > 0 ? { required: mergedRequired } : {}),
  }
}
