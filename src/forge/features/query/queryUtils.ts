import { JSONPath } from 'jsonpath-plus'

export function runJsonPath(jsonStr: string, expression: string): unknown[] {
  const json: unknown = JSON.parse(jsonStr)
  const results = JSONPath({ path: expression, json, resultType: 'value' })
  return Array.isArray(results) ? results : []
}
