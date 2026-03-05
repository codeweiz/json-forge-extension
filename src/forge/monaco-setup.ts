import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

// Configure workers to load from bundled extension files (CSP-safe)
;(self as typeof globalThis & { MonacoEnvironment: { getWorker(id: string, label: string): Worker } }).MonacoEnvironment = {
  getWorker(_id: string, label: string): Worker {
    let url: string
    if (label === 'json') {
      url = chrome.runtime.getURL('assets/json.worker.js')
    } else if (label === 'typescript' || label === 'javascript') {
      url = chrome.runtime.getURL('assets/ts.worker.js')
    } else {
      url = chrome.runtime.getURL('assets/editor.worker.js')
    }
    return new Worker(url, { type: 'module' })
  },
}

// Use locally bundled monaco instead of CDN
loader.config({ monaco })
