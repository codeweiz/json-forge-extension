export type AssertionFramework = 'jest' | 'chai' | 'playwright' | 'pytest'

export function generateAssertions(
  jsonStr: string,
  framework: AssertionFramework,
  varName = 'data',
): string {
  const value: unknown = JSON.parse(jsonStr)
  const lines: string[] = []
  generateForValue(value, varName, framework, lines)
  return lines.join('\n')
}

function generateForValue(
  value: unknown,
  path: string,
  framework: AssertionFramework,
  lines: string[],
): void {
  if (value === null) {
    emitNull(path, framework, lines)
    return
  }

  if (typeof value === 'string') {
    emitType(path, 'string', framework, lines)
    return
  }

  if (typeof value === 'number') {
    emitType(path, 'number', framework, lines)
    return
  }

  if (typeof value === 'boolean') {
    emitBoolean(path, value, framework, lines)
    return
  }

  if (Array.isArray(value)) {
    emitArray(path, value, framework, lines)
    return
  }

  if (typeof value === 'object') {
    emitObject(path, value as Record<string, unknown>, framework, lines)
  }
}

function emitDefined(path: string, framework: AssertionFramework, lines: string[]): void {
  switch (framework) {
    case 'jest':
    case 'playwright':
      lines.push(`expect(${path}).toBeDefined()`)
      break
    case 'chai':
      lines.push(`expect(${path}).to.exist`)
      break
    case 'pytest':
      lines.push(`assert ${toPythonPath(path)} is not None`)
      break
  }
}

function emitNull(path: string, framework: AssertionFramework, lines: string[]): void {
  switch (framework) {
    case 'jest':
    case 'playwright':
      lines.push(`expect(${path}).toBeNull()`)
      break
    case 'chai':
      lines.push(`expect(${path}).to.be.null`)
      break
    case 'pytest':
      lines.push(`assert ${toPythonPath(path)} is None`)
      break
  }
}

function emitType(
  path: string,
  type: 'string' | 'number',
  framework: AssertionFramework,
  lines: string[],
): void {
  switch (framework) {
    case 'jest':
    case 'playwright':
      lines.push(`expect(typeof ${path}).toBe('${type}')`)
      break
    case 'chai':
      lines.push(`expect(${path}).to.be.a('${type}')`)
      break
    case 'pytest': {
      const pyType = type === 'number' ? '(int, float)' : 'str'
      lines.push(`assert isinstance(${toPythonPath(path)}, ${pyType})`)
      break
    }
  }
}

function emitBoolean(
  path: string,
  value: boolean,
  framework: AssertionFramework,
  lines: string[],
): void {
  switch (framework) {
    case 'jest':
    case 'playwright':
      lines.push(`expect(${path}).toBe(${value})`)
      break
    case 'chai':
      lines.push(`expect(${path}).to.equal(${value})`)
      break
    case 'pytest':
      lines.push(`assert ${toPythonPath(path)} is ${value ? 'True' : 'False'}`)
      break
  }
}

function emitArray(
  path: string,
  value: unknown[],
  framework: AssertionFramework,
  lines: string[],
): void {
  switch (framework) {
    case 'jest':
    case 'playwright':
      lines.push(`expect(Array.isArray(${path})).toBe(true)`)
      break
    case 'chai':
      lines.push(`expect(${path}).to.be.an('array')`)
      break
    case 'pytest':
      lines.push(`assert isinstance(${toPythonPath(path)}, list)`)
      break
  }

  // If the array is non-empty, assert the first element's structure
  if (value.length > 0) {
    const firstPath = `${path}[0]`
    generateForValue(value[0], firstPath, framework, lines)
  }
}

function emitObject(
  path: string,
  obj: Record<string, unknown>,
  framework: AssertionFramework,
  lines: string[],
): void {
  emitDefined(path, framework, lines)

  for (const [key, val] of Object.entries(obj)) {
    const childPath = framework === 'pytest'
      ? `${path}.${key}`  // Will be converted by toPythonPath
      : `${path}.${key}`
    generateForValue(val, childPath, framework, lines)
  }
}

/**
 * Convert JS dot-notation paths to Python bracket notation.
 * e.g. "data.address.city" -> 'data["address"]["city"]'
 */
function toPythonPath(jsPath: string): string {
  // Handle array indexing like data.items[0]
  const parts = jsPath.split('.')
  const root = parts[0]

  if (parts.length === 1) {
    // Could be just "data" or "data[0]"
    return root
  }

  let result = root
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    // Check for array index suffix like "items[0]"
    const bracketIdx = part.indexOf('[')
    if (bracketIdx >= 0) {
      const key = part.substring(0, bracketIdx)
      const rest = part.substring(bracketIdx)
      result += `["${key}"]${rest}`
    } else {
      result += `["${part}"]`
    }
  }

  return result
}
