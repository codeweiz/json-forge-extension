export type ChangeSeverity = 'breaking' | 'warning' | 'safe'

export interface ChangeEntry {
  severity: ChangeSeverity
  path: string
  message: string
}

interface SchemaNode {
  type?: string
  properties?: Record<string, SchemaNode>
  required?: string[]
  enum?: unknown[]
  items?: SchemaNode
  description?: string
  title?: string
}

function severityOrder(s: ChangeSeverity): number {
  switch (s) {
    case 'breaking':
      return 0
    case 'warning':
      return 1
    case 'safe':
      return 2
  }
}

function compareSchemas(
  oldSchema: SchemaNode,
  newSchema: SchemaNode,
  path: string,
  changes: ChangeEntry[]
): void {
  // Compare type
  if (oldSchema.type && newSchema.type && oldSchema.type !== newSchema.type) {
    changes.push({
      severity: 'breaking',
      path,
      message: `Field '${path || '/'}' type changed from ${oldSchema.type} to ${newSchema.type}`,
    })
    return // Type changed entirely, no point comparing sub-structure
  }

  // Compare properties (only for object types or schemas with properties)
  const oldProps = oldSchema.properties ?? {}
  const newProps = newSchema.properties ?? {}
  const oldKeys = Object.keys(oldProps)
  const newKeys = Object.keys(newProps)
  const oldRequired = new Set(oldSchema.required ?? [])
  const newRequired = new Set(newSchema.required ?? [])

  // Detect removed fields
  for (const key of oldKeys) {
    if (!(key in newProps)) {
      changes.push({
        severity: 'breaking',
        path: path ? `${path}.${key}` : key,
        message: `Field '${path ? `${path}.${key}` : key}' removed`,
      })
    }
  }

  // Detect added fields
  for (const key of newKeys) {
    if (!(key in oldProps)) {
      const fieldPath = path ? `${path}.${key}` : key
      if (newRequired.has(key)) {
        changes.push({
          severity: 'breaking',
          path: fieldPath,
          message: `Field '${fieldPath}' is now required`,
        })
      } else {
        changes.push({
          severity: 'warning',
          path: fieldPath,
          message: `Optional field '${fieldPath}' added`,
        })
      }
    }
  }

  // Detect required changes on existing fields
  for (const key of oldKeys) {
    if (key in newProps) {
      const fieldPath = path ? `${path}.${key}` : key
      const wasRequired = oldRequired.has(key)
      const isRequired = newRequired.has(key)

      if (!wasRequired && isRequired) {
        changes.push({
          severity: 'breaking',
          path: fieldPath,
          message: `Field '${fieldPath}' is now required`,
        })
      } else if (wasRequired && !isRequired) {
        changes.push({
          severity: 'warning',
          path: fieldPath,
          message: `Field '${fieldPath}' is no longer required`,
        })
      }
    }
  }

  // Recurse into shared properties
  for (const key of oldKeys) {
    if (key in newProps) {
      const fieldPath = path ? `${path}.${key}` : key
      compareSchemas(oldProps[key], newProps[key], fieldPath, changes)
    }
  }

  // Compare enum arrays
  if (oldSchema.enum && newSchema.enum) {
    const oldEnumSet = new Set(oldSchema.enum.map(String))
    const newEnumSet = new Set(newSchema.enum.map(String))
    const removed = [...oldEnumSet].filter((v) => !newEnumSet.has(v))
    const added = [...newEnumSet].filter((v) => !oldEnumSet.has(v))

    if (removed.length > 0) {
      changes.push({
        severity: 'warning',
        path,
        message: `enum values removed from '${path || '/'}'`,
      })
    }
    if (added.length > 0) {
      changes.push({
        severity: 'safe',
        path,
        message: `new enum values added to '${path || '/'}'`,
      })
    }
  }

  // Compare array items
  if (oldSchema.items && newSchema.items) {
    compareSchemas(oldSchema.items, newSchema.items, path ? `${path}[]` : '[]', changes)
  }

  // Compare description/title changes
  if (oldSchema.description !== undefined && newSchema.description !== undefined) {
    if (oldSchema.description !== newSchema.description) {
      changes.push({
        severity: 'safe',
        path,
        message: `Description changed on '${path || '/'}'`,
      })
    }
  }
  if (oldSchema.title !== undefined && newSchema.title !== undefined) {
    if (oldSchema.title !== newSchema.title) {
      changes.push({
        severity: 'safe',
        path,
        message: `Title changed on '${path || '/'}'`,
      })
    }
  }
}

export function detectBreakingChanges(oldSchema: object, newSchema: object): ChangeEntry[] {
  const changes: ChangeEntry[] = []
  compareSchemas(oldSchema as SchemaNode, newSchema as SchemaNode, '', changes)
  return changes.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
}
