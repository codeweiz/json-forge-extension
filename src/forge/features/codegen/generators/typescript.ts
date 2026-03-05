import type { CodeGenerator } from '../types'
import { jsonToTypeScript } from '../../ts-gen/tsGenerator'

export const typescriptGenerator: CodeGenerator = {
  name: 'TypeScript',
  language: 'typescript',
  extension: '.ts',
  generate(json: string, rootName = 'Root'): string {
    return jsonToTypeScript(json, rootName)
  },
}
