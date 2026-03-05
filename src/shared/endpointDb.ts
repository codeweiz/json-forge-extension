import type { Endpoint } from './types'

const STORAGE_KEY = 'jf-endpoints'
export const MAX_SNAPSHOTS = 20

async function readAll(): Promise<Record<string, Endpoint>> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] || {}
}

async function writeAll(endpoints: Record<string, Endpoint>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: endpoints })
}

export async function saveEndpoint(endpoint: Endpoint): Promise<void> {
  const all = await readAll()
  const existing = all[endpoint.id]
  if (existing) {
    const merged = [...existing.snapshots, ...endpoint.snapshots]
    existing.snapshots = merged.slice(-MAX_SNAPSHOTS)
    existing.lastSeen = Math.max(existing.lastSeen, endpoint.lastSeen)
    existing.starred = endpoint.starred || existing.starred
    if (endpoint.schema) existing.schema = endpoint.schema
  } else {
    endpoint.snapshots = endpoint.snapshots.slice(-MAX_SNAPSHOTS)
    all[endpoint.id] = endpoint
  }
  await writeAll(all)
}

export async function loadEndpoints(domain?: string): Promise<Endpoint[]> {
  const all = await readAll()
  let endpoints = Object.values(all)
  if (domain) endpoints = endpoints.filter(e => e.domain === domain)
  return endpoints.sort((a, b) => b.lastSeen - a.lastSeen)
}

export async function getEndpoint(id: string): Promise<Endpoint | undefined> {
  const all = await readAll()
  return all[id]
}

export async function deleteEndpoint(id: string): Promise<void> {
  const all = await readAll()
  delete all[id]
  await writeAll(all)
}

export async function clearEndpoints(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}
