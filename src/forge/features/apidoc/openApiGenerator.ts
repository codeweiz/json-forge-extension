import type { Endpoint } from '../../../shared/types'

interface OpenApiSpec {
  openapi: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, PathItem>>
}

interface PathItem {
  summary?: string
  responses: Record<string, { description: string; content?: Record<string, { schema: object }> }>
  requestBody?: { content: Record<string, { schema: object }> }
  parameters?: Array<{ name: string; in: string; required: boolean; schema: { type: string } }>
}

function inferSchema(value: unknown): object {
  if (value === null) return { type: 'null' }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} }
    return { type: 'array', items: inferSchema(value[0]) }
  }
  switch (typeof value) {
    case 'string':
      return { type: 'string' }
    case 'number':
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'object': {
      const properties: Record<string, object> = {}
      const required: string[] = []
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        properties[k] = inferSchema(v)
        required.push(k)
      }
      return { type: 'object', properties, required }
    }
    default:
      return { type: 'string' }
  }
}

function extractPathParams(path: string): Array<{ name: string; in: string; required: boolean; schema: { type: string } }> {
  const params: Array<{ name: string; in: string; required: boolean; schema: { type: string } }> = []
  const segments = path.split('/')
  for (const seg of segments) {
    if (seg.startsWith(':')) {
      params.push({
        name: seg.slice(1),
        in: 'path',
        required: true,
        schema: { type: 'string' },
      })
    }
  }
  return params
}

function convertPathParams(path: string): string {
  return path.replace(/:(\w+)/g, '{$1}')
}

export function generateOpenApi(
  endpoints: Endpoint[],
  info?: { title?: string; version?: string; description?: string },
): OpenApiSpec {
  const spec: OpenApiSpec = {
    openapi: '3.0.0',
    info: {
      title: info?.title ?? 'API Documentation',
      version: info?.version ?? '1.0.0',
      ...(info?.description ? { description: info.description } : {}),
    },
    paths: {},
  }

  for (const ep of endpoints) {
    const openApiPath = convertPathParams(ep.path)
    if (!spec.paths[openApiPath]) {
      spec.paths[openApiPath] = {}
    }

    const method = ep.method.toLowerCase()
    const pathItem: PathItem = {
      summary: `${ep.method} ${ep.path}`,
      responses: {},
    }

    // Response schema
    let responseSchema: object | undefined
    if (ep.schema) {
      responseSchema = ep.schema
    } else if (ep.snapshots.length > 0) {
      const latestSnapshot = ep.snapshots[ep.snapshots.length - 1]
      try {
        const parsed = JSON.parse(latestSnapshot.responseBody)
        responseSchema = inferSchema(parsed)
      } catch {
        // Cannot parse response body, leave without schema
      }
    }

    const status = ep.snapshots.length > 0
      ? String(ep.snapshots[ep.snapshots.length - 1].meta.status)
      : '200'

    pathItem.responses[status] = {
      description: 'Successful response',
      ...(responseSchema
        ? { content: { 'application/json': { schema: responseSchema } } }
        : {}),
    }

    // Path parameters
    const params = extractPathParams(ep.path)
    if (params.length > 0) {
      pathItem.parameters = params
    }

    // Request body from snapshots
    const snapshotWithBody = ep.snapshots.find(s => s.meta.requestBody)
    if (snapshotWithBody?.meta.requestBody) {
      try {
        const parsedBody = JSON.parse(snapshotWithBody.meta.requestBody)
        pathItem.requestBody = {
          content: {
            'application/json': {
              schema: inferSchema(parsedBody),
            },
          },
        }
      } catch {
        // Non-JSON request body, include as string
        pathItem.requestBody = {
          content: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        }
      }
    }

    spec.paths[openApiPath][method] = pathItem
  }

  return spec
}

export function openApiToJson(spec: OpenApiSpec): string {
  return JSON.stringify(spec, null, 2)
}

function yamlEscapeString(str: string): string {
  if (
    str === '' ||
    str === 'true' ||
    str === 'false' ||
    str === 'null' ||
    /^[\d.]+$/.test(str) ||
    /[:#[\]{}&*!|>'"`,@%]/.test(str) ||
    str.includes('\n')
  ) {
    return JSON.stringify(str)
  }
  return str
}

function toYaml(value: unknown, indent: number = 0): string {
  const prefix = '  '.repeat(indent)

  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    return yamlEscapeString(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const lines: string[] = []
    for (const item of value) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item)
        if (entries.length === 0) {
          lines.push(`${prefix}- {}`)
        } else {
          const [firstKey, firstVal] = entries[0]
          const firstValYaml = typeof firstVal === 'object' && firstVal !== null
            ? `\n${toYaml(firstVal, indent + 2)}`
            : ` ${toYaml(firstVal, indent + 2)}`
          lines.push(`${prefix}- ${firstKey}:${firstValYaml}`)
          for (let i = 1; i < entries.length; i++) {
            const [k, v] = entries[i]
            const valYaml = typeof v === 'object' && v !== null
              ? `\n${toYaml(v, indent + 2)}`
              : ` ${toYaml(v, indent + 2)}`
            lines.push(`${prefix}  ${k}:${valYaml}`)
          }
        }
      } else {
        lines.push(`${prefix}- ${toYaml(item, indent + 1)}`)
      }
    }
    return lines.join('\n')
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const lines: string[] = []
    for (const [key, val] of entries) {
      const safeKey = /^[\w.-]+$/.test(key) ? key : JSON.stringify(key)
      if (typeof val === 'object' && val !== null) {
        const nested = toYaml(val, indent + 1)
        if (nested === '[]' || nested === '{}') {
          lines.push(`${prefix}${safeKey}: ${nested}`)
        } else {
          lines.push(`${prefix}${safeKey}:\n${nested}`)
        }
      } else {
        lines.push(`${prefix}${safeKey}: ${toYaml(val, indent + 1)}`)
      }
    }
    return lines.join('\n')
  }

  return String(value)
}

export function openApiToYaml(spec: OpenApiSpec): string {
  return toYaml(spec)
}
