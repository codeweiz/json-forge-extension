import { isJsonPage, extractJson } from './detector'
import { renderJsonTree } from './renderer'
import { injectToolbar } from './toolbar'

async function init(): Promise<void> {
  if (!isJsonPage()) return

  const json = extractJson()
  if (json === null) return

  // Inject CSS styles
  const style = document.createElement('link')
  style.rel = 'stylesheet'
  style.href = chrome.runtime.getURL('src/content/renderer.css')
  document.head.appendChild(style)

  // Replace raw <pre> with rendered tree
  const pre = document.body.querySelector('pre')
  if (!pre) return
  const root = document.createElement('div')
  root.id = 'jf-root'
  root.className = 'jf-root'
  root.appendChild(renderJsonTree(json))
  pre.replaceWith(root)

  // Inject toolbar
  injectToolbar(async () => {
    await chrome.storage.local.set({ 'jf-payload': JSON.stringify(json) })
    chrome.runtime.sendMessage({ action: 'openForge' })
  })
}

init()
