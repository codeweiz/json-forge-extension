import { describe, it, expect, beforeEach } from 'vitest'
import { addHistoryEntry, loadHistory, clearHistory } from './historyStore'

// Reset storage before each test
beforeEach(async () => {
  await clearHistory()
})

describe('historyStore', () => {
  it('adds and loads a history entry', async () => {
    await addHistoryEntry('{"id":1}', 'https://api.example.com')
    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].content).toBe('{"id":1}')
    expect(history[0].source).toBe('https://api.example.com')
  })

  it('prepends new entries (newest first)', async () => {
    await addHistoryEntry('{"a":1}', 'source-a')
    await addHistoryEntry('{"b":2}', 'source-b')
    const history = await loadHistory()
    expect(history[0].source).toBe('source-b')
    expect(history[1].source).toBe('source-a')
  })

  it('stores preview (first 100 chars)', async () => {
    const content = '{"key":"value"}'
    await addHistoryEntry(content, 'test')
    const history = await loadHistory()
    expect(history[0].preview).toBe(content.slice(0, 100))
  })

  it('clears all history', async () => {
    await addHistoryEntry('{"a":1}', 'test')
    await clearHistory()
    const history = await loadHistory()
    expect(history).toHaveLength(0)
  })

  it('skips entries larger than 1MB', async () => {
    const huge = 'x'.repeat(1024 * 1024 + 1)
    await addHistoryEntry(huge, 'test')
    const history = await loadHistory()
    expect(history).toHaveLength(0)
  })

  it('keeps max 50 entries, evicting oldest', async () => {
    for (let i = 0; i < 52; i++) {
      await addHistoryEntry(`{"i":${i}}`, `source-${i}`)
    }
    const history = await loadHistory()
    expect(history).toHaveLength(50)
    expect(history[0].source).toBe('source-51')  // newest
    expect(history[49].source).toBe('source-2')  // oldest kept
  })

  it('assigns unique ids', async () => {
    await addHistoryEntry('{"a":1}', 'x')
    await addHistoryEntry('{"b":2}', 'y')
    const history = await loadHistory()
    expect(history[0].id).not.toBe(history[1].id)
  })
})
