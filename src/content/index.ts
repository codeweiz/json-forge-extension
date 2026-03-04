import { isJsonPage, extractJson } from './detector'

if (isJsonPage()) {
  const json = extractJson()
  if (json !== null) {
    // Will be wired up in Task 3 and Task 4
    console.log('[JSON Forge] JSON page detected', json)
  }
}
