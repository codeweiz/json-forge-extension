import { saveEndpoint, loadEndpoints, getEndpoint } from '../shared/endpointDb'
import type { MessageType } from '../shared/types'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JSON Forge] Extension installed')
})

chrome.runtime.onMessage.addListener((message: MessageType | { action: string }, _sender, sendResponse) => {
  // Legacy: content script "openForge" action
  if ('action' in message && message.action === 'openForge') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
    return
  }

  // New message protocol
  if (!('type' in message)) return

  switch (message.type) {
    case 'SEND_TO_FORGE':
      chrome.storage.local.set({ 'jf-payload': message.payload.json }).then(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
      })
      return

    case 'SAVE_ENDPOINT':
      saveEndpoint(message.payload).then(() => sendResponse({ ok: true }))
      return true // async response

    case 'GET_ENDPOINTS':
      loadEndpoints(message.payload?.domain).then(endpoints => {
        sendResponse({ type: 'ENDPOINTS_RESULT', payload: endpoints })
      })
      return true

    case 'SAVE_SCHEMA':
      getEndpoint(message.payload.endpointId).then(async ep => {
        if (ep) {
          ep.schema = message.payload.schema
          await saveEndpoint(ep)
        }
        sendResponse({ ok: true })
      })
      return true

    case 'GET_SCHEMA':
      getEndpoint(message.payload.endpointId).then(ep => {
        sendResponse({ type: 'SCHEMA_RESULT', payload: { schema: ep?.schema || null } })
      })
      return true
  }
})
