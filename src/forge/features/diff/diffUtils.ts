export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffEntry {
  type: DiffType
  path: string
  oldValue?: unknown
  newValue?: unknown
}

export function computeDiff(oldStr: string, newStr: string): DiffEntry[] {
  const oldObj: unknown = JSON.parse(oldStr)
  const newObj: unknown = JSON.parse(newStr)
  const entries: DiffEntry[] = []
  walkDiff(oldObj, newObj, '', entries)
  return entries
}

function walkDiff(oldVal: unknown, newVal: unknown, path: string, entries: DiffEntry[]): void {
  // Both are plain objects — recurse key by key
  if (isPlainObject(oldVal) && isPlainObject(newVal)) {
    const oldObj = oldVal as Record<string, unknown>
    const newObj = newVal as Record<string, unknown>
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key
      if (!(key in oldObj)) {
        entries.push({ type: 'added', path: childPath, newValue: newObj[key] })
      } else if (!(key in newObj)) {
        entries.push({ type: 'removed', path: childPath, oldValue: oldObj[key] })
      } else {
        walkDiff(oldObj[key], newObj[key], childPath, entries)
      }
    }
    return
  }

  // Leaf comparison
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
    entries.push({ type: 'unchanged', path, oldValue: oldVal, newValue: newVal })
  } else {
    entries.push({ type: 'changed', path, oldValue: oldVal, newValue: newVal })
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
