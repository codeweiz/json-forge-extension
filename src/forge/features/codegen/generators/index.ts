import type { CodeGenerator } from '../types'
import { typescriptGenerator } from './typescript'

export const generators: CodeGenerator[] = [
  typescriptGenerator,
]

export function getGenerator(name: string): CodeGenerator | undefined {
  return generators.find(g => g.name === name)
}
