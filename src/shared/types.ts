export interface RequestMeta {
  url: string
  method: string
  status: number
  headers: Record<string, string>
  requestHeaders?: Record<string, string>
  requestBody?: string
  timing: number
  timestamp: number
  size: number
}

export interface RequestSnapshot {
  id: string
  meta: RequestMeta
  responseBody: string
}

export interface Endpoint {
  id: string
  method: string
  domain: string
  path: string
  snapshots: RequestSnapshot[]
  schema?: object
  starred: boolean
  lastSeen: number
}

export type MessageType =
  | { type: 'SEND_TO_FORGE'; payload: { json: string; meta: RequestMeta } }
  | { type: 'SAVE_ENDPOINT'; payload: Endpoint }
  | { type: 'GET_ENDPOINTS'; payload?: { domain?: string } }
  | { type: 'ENDPOINTS_RESULT'; payload: Endpoint[] }
  | { type: 'SAVE_SCHEMA'; payload: { endpointId: string; schema: object } }
  | { type: 'GET_SCHEMA'; payload: { endpointId: string } }
  | { type: 'SCHEMA_RESULT'; payload: { schema: object | null } }
  | { type: 'DEVTOOLS_READY' }
