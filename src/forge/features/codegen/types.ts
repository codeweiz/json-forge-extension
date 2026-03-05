export interface CodeGenerator {
  name: string        // e.g. "TypeScript"
  language: string    // Monaco language id, e.g. "typescript"
  extension: string   // e.g. ".ts"
  generate(json: string, rootName?: string): string
}
