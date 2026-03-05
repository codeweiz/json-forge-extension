import type { CodeGenerator } from '../types'
import { typescriptGenerator } from './typescript'
import { kotlinGenerator } from './kotlin'
import { goGenerator } from './go'
import { pythonGenerator } from './python'

export const generators: CodeGenerator[] = [
  typescriptGenerator,
  kotlinGenerator,
  goGenerator,
  pythonGenerator,
]

export function getGenerator(name: string): CodeGenerator | undefined {
  return generators.find(g => g.name === name)
}
