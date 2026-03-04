// Minimal MV3 service worker
// Phase 1: lifecycle logging only
// Future: cross-tab messaging, history sync, snippet management

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JSON Forge] Extension installed')
})
