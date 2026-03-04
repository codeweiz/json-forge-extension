chrome.runtime.onInstalled.addListener(() => {
  console.log('[JSON Forge] Extension installed')
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openForge') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
  }
})
