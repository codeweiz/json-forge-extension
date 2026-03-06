import { useState, useEffect, useRef, useCallback } from 'react'
import type { RequestMeta } from '../../shared/types'
import { isJsonContentType } from '../../shared/messaging'

export interface HarHeader { name: string; value: string }
export interface HarEntry {
  request: {
    method: string
    url: string
    headers: HarHeader[]
    postData?: { text: string; mimeType: string }
  }
  response: {
    status: number
    headers: HarHeader[]
    content: { text: string; size: number; mimeType: string }
  }
  time: number
  startedDateTime: string
  getContent: (cb: (content: string) => void) => void
}

export interface CapturedRequest {
  id: string
  meta: RequestMeta
  responseBody: string
}

export function parseHarEntry(entry: HarEntry): CapturedRequest | null {
  const contentType = entry.response.headers
    .find(h => h.name.toLowerCase() === 'content-type')?.value
  const mimeType = entry.response.content.mimeType

  if (!isJsonContentType(contentType) && !isJsonContentType(mimeType)) return null
  const body = entry.response.content.text
  if (!body) return null

  const headers: Record<string, string> = {}
  entry.response.headers.forEach(h => { headers[h.name.toLowerCase()] = h.value })

  const requestHeaders: Record<string, string> = {}
  entry.request.headers.forEach(h => { requestHeaders[h.name.toLowerCase()] = h.value })

  const meta: RequestMeta = {
    url: entry.request.url,
    method: entry.request.method,
    status: entry.response.status,
    headers,
    requestHeaders,
    requestBody: entry.request.postData?.text,
    timing: entry.time,
    timestamp: new Date(entry.startedDateTime).getTime(),
    size: entry.response.content.size,
  }

  return {
    id: `${meta.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    meta,
    responseBody: body,
  }
}

export function useNetworkCapture() {
  const [requests, setRequests] = useState<CapturedRequest[]>([])
  const [recording, setRecording] = useState(true)
  const recordingRef = useRef(recording)

  useEffect(() => { recordingRef.current = recording }, [recording])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools?.network) return

    // Chrome HAR entries are structurally compatible with our HarEntry interface
    const handler = (entry: chrome.devtools.network.Request) => {
      if (!recordingRef.current) return
      entry.getContent((content) => {
        const harEntry: HarEntry = {
          request: {
            method: entry.request.method,
            url: entry.request.url,
            headers: entry.request.headers as HarHeader[],
            postData: entry.request.postData as HarEntry['request']['postData'],
          },
          response: {
            status: entry.response.status,
            headers: entry.response.headers as HarHeader[],
            content: { ...entry.response.content, text: content },
          },
          time: entry.time,
          startedDateTime: entry.startedDateTime,
          getContent: entry.getContent.bind(entry),
        }
        const parsed = parseHarEntry(harEntry)
        if (parsed) {
          setRequests(prev => [parsed, ...prev])
        }
      })
    }

    chrome.devtools.network.onRequestFinished.addListener(handler)
    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handler)
    }
  }, [])

  const clear = useCallback(() => setRequests([]), [])
  const toggleRecording = useCallback(() => setRecording(r => !r), [])

  return { requests, recording, clear, toggleRecording }
}
