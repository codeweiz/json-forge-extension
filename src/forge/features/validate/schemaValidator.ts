import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'

export interface ValidationError {
  path: string
  message: string
  expected?: string
  actual?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function validateJson(jsonStr: string, schema: object): ValidationResult {
  try {
    const data = JSON.parse(jsonStr)
    const ajv = new Ajv({ allErrors: true, verbose: true })
    addFormats(ajv)

    const validate = ajv.compile(schema)
    const valid = validate(data)

    if (valid) {
      return { valid: true, errors: [] }
    }

    const errors: ValidationError[] = (validate.errors || []).map(err => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown error',
      expected: formatExpected(err),
      actual: formatActual(err),
    }))

    return { valid: false, errors }
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: '/', message: `Parse error: ${String(e)}` }],
    }
  }
}

function formatExpected(err: ErrorObject): string {
  const params = err.params as Record<string, unknown>
  switch (err.keyword) {
    case 'type':
      return String(params.type ?? 'unknown')
    case 'required':
      return `required property: ${String(params.missingProperty ?? 'unknown')}`
    case 'enum':
      return `one of: ${JSON.stringify(params.allowedValues)}`
    case 'minimum':
      return `>= ${String(params.limit)}`
    case 'maximum':
      return `<= ${String(params.limit)}`
    case 'format':
      return `format: ${String(params.format)}`
    default:
      return err.keyword
  }
}

function formatActual(err: ErrorObject): string {
  const params = err.params as Record<string, unknown>
  switch (err.keyword) {
    case 'type':
      return typeof err.data
    case 'required':
      return 'missing'
    case 'enum':
      return JSON.stringify(err.data)
    case 'minimum':
    case 'maximum':
      return String(err.data)
    case 'format':
      return String(err.data)
    default:
      return params.type != null ? String(params.type) : typeof err.data
  }
}
