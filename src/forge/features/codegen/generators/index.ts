import type { CodeGenerator } from '../types'
import { goGenerator } from './go'
import { javaGenerator } from './java'
import { kotlinGenerator } from './kotlin'
import { pythonGenerator } from './python'
import { typescriptGenerator } from './typescript'

export const generators: CodeGenerator[] = [
  typescriptGenerator,
  javaGenerator,
  kotlinGenerator,
  goGenerator,
  pythonGenerator,
]

export function getGenerator(name: string): CodeGenerator | undefined {
  return generators.find(g => g.name === name)
}
