export function injectToolbar(onOpenForge: () => void): void {
  const toolbar = document.createElement('div')
  toolbar.id = 'jf-toolbar'
  toolbar.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'right: 0',
    'z-index: 99999',
    'display: flex',
    'align-items: center',
    'gap: 8px',
    'padding: 6px 12px',
    'background: #1e1e2e',
    'border-bottom: 1px solid #313244',
    'font-family: system-ui, sans-serif',
    'font-size: 13px',
    'color: #cdd6f4',
  ].join('; ')

  const logo = document.createElement('span')
  logo.textContent = '⚒ JSON Forge'
  logo.style.fontWeight = '600'

  const openBtn = document.createElement('button')
  openBtn.textContent = 'Open in Forge →'
  openBtn.style.cssText = [
    'margin-left: auto',
    'padding: 4px 12px',
    'background: #89b4fa',
    'color: #1e1e2e',
    'border: none',
    'border-radius: 4px',
    'cursor: pointer',
    'font-size: 13px',
    'font-family: system-ui, sans-serif',
  ].join('; ')
  openBtn.onclick = onOpenForge

  toolbar.appendChild(logo)
  toolbar.appendChild(openBtn)
  document.body.prepend(toolbar)
  document.body.style.paddingTop = '36px'
}
