import { describe, it, expect } from 'vitest'
import type { Endpoint, RequestSnapshot } from './types'
import {
  saveEndpoint,
  loadEndpoints,
  getEndpoint,
  deleteEndpoint,
  clearEndpoints,
  MAX_SNAPSHOTS,
} from './endpointDb'

function makeSnapshot(id: string): RequestSnapshot {
  return {
    id,
    meta: {
      url: `https://api.example.com/data`,
      method: 'GET',
      status: 200,
      headers: {},
      timing: 100,
      timestamp: Date.now(),
      size: 256,
    },
    responseBody: '{"ok":true}',
  }
}

function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: 'ep-1',
    method: 'GET',
    domain: 'api.example.com',
    path: '/data',
    snapshots: [makeSnapshot('snap-1')],
    starred: false,
    lastSeen: 1000,
    ...overrides,
  }
}

describe('endpointDb', () => {
  describe('saveEndpoint', () => {
    it('creates a new endpoint and retrieves it via getEndpoint', async () => {
      const ep = makeEndpoint()
      await saveEndpoint(ep)

      const result = await getEndpoint('ep-1')
      expect(result).toBeDefined()
      expect(result!.id).toBe('ep-1')
      expect(result!.domain).toBe('api.example.com')
      expect(result!.snapshots).toHaveLength(1)
    })

    it('merges snapshots on existing endpoint and updates lastSeen', async () => {
      const ep1 = makeEndpoint({ lastSeen: 1000 })
      await saveEndpoint(ep1)

      const ep2 = makeEndpoint({
        snapshots: [makeSnapshot('snap-2')],
        lastSeen: 2000,
      })
      await saveEndpoint(ep2)

      const result = await getEndpoint('ep-1')
      expect(result).toBeDefined()
      expect(result!.snapshots).toHaveLength(2)
      expect(result!.snapshots[0].id).toBe('snap-1')
      expect(result!.snapshots[1].id).toBe('snap-2')
      expect(result!.lastSeen).toBe(2000)
    })

    it('caps snapshots at MAX_SNAPSHOTS, keeping the latest', async () => {
      const initialSnapshots = Array.from({ length: MAX_SNAPSHOTS }, (_, i) =>
        makeSnapshot(`existing-${i}`),
      )
      const ep = makeEndpoint({ snapshots: initialSnapshots })
      await saveEndpoint(ep)

      const newSnapshots = [makeSnapshot('new-1'), makeSnapshot('new-2')]
      const ep2 = makeEndpoint({ snapshots: newSnapshots, lastSeen: 3000 })
      await saveEndpoint(ep2)

      const result = await getEndpoint('ep-1')
      expect(result).toBeDefined()
      expect(result!.snapshots).toHaveLength(MAX_SNAPSHOTS)
      // The oldest snapshots should be dropped; the last two should be the new ones
      expect(result!.snapshots[MAX_SNAPSHOTS - 1].id).toBe('new-2')
      expect(result!.snapshots[MAX_SNAPSHOTS - 2].id).toBe('new-1')
    })
  })

  describe('loadEndpoints', () => {
    it('returns empty array when no endpoints exist', async () => {
      const result = await loadEndpoints()
      expect(result).toEqual([])
    })

    it('filters by domain when domain param is provided', async () => {
      await saveEndpoint(makeEndpoint({ id: 'ep-a', domain: 'alpha.com', lastSeen: 100 }))
      await saveEndpoint(makeEndpoint({ id: 'ep-b', domain: 'beta.com', lastSeen: 200 }))
      await saveEndpoint(makeEndpoint({ id: 'ep-c', domain: 'alpha.com', lastSeen: 300 }))

      const result = await loadEndpoints('alpha.com')
      expect(result).toHaveLength(2)
      expect(result.every(e => e.domain === 'alpha.com')).toBe(true)
    })

    it('returns sorted by lastSeen descending', async () => {
      await saveEndpoint(makeEndpoint({ id: 'ep-old', lastSeen: 100 }))
      await saveEndpoint(makeEndpoint({ id: 'ep-mid', lastSeen: 500 }))
      await saveEndpoint(makeEndpoint({ id: 'ep-new', lastSeen: 900 }))

      const result = await loadEndpoints()
      expect(result[0].id).toBe('ep-new')
      expect(result[1].id).toBe('ep-mid')
      expect(result[2].id).toBe('ep-old')
    })
  })

  describe('deleteEndpoint', () => {
    it('removes by id and getEndpoint returns undefined', async () => {
      await saveEndpoint(makeEndpoint({ id: 'ep-del' }))
      expect(await getEndpoint('ep-del')).toBeDefined()

      await deleteEndpoint('ep-del')
      expect(await getEndpoint('ep-del')).toBeUndefined()
    })
  })

  describe('clearEndpoints', () => {
    it('removes all endpoints', async () => {
      await saveEndpoint(makeEndpoint({ id: 'ep-x', lastSeen: 100 }))
      await saveEndpoint(makeEndpoint({ id: 'ep-y', lastSeen: 200 }))

      let all = await loadEndpoints()
      expect(all.length).toBeGreaterThan(0)

      await clearEndpoints()

      all = await loadEndpoints()
      expect(all).toEqual([])
    })
  })
})
