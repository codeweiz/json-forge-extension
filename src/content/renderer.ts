export function renderJsonTree(value: unknown): HTMLElement {
  const root = document.createElement('div')
  root.className = 'jf-root'
  root.appendChild(renderValue(value, 0))
  return root
}

function renderValue(value: unknown, depth: number): Node {
  if (value === null) return span('jf-null', 'null')
  if (typeof value === 'boolean') return span('jf-boolean', String(value))
  if (typeof value === 'number') return span('jf-number', String(value))
  if (typeof value === 'string') return span('jf-string', `"${value}"`)
  if (Array.isArray(value)) return renderArray(value, depth)
  if (typeof value === 'object') return renderObject(value as Record<string, unknown>, depth)
  return span('jf-unknown', String(value))
}

function makeToggle(childrenEl: HTMLElement, closingEl: HTMLElement, summaryEl: HTMLElement): HTMLElement {
  const toggle = span('jf-toggle', '▾')
  let expanded = true
  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    expanded = !expanded
    toggle.textContent = expanded ? '▾' : '▸'
    childrenEl.style.display = expanded ? '' : 'none'
    closingEl.style.display = expanded ? '' : 'none'
    summaryEl.style.display = expanded ? 'none' : ''
  })
  return toggle
}

function renderObject(obj: Record<string, unknown>, depth: number): HTMLElement {
  const entries = Object.entries(obj)
  const container = document.createElement('span')
  container.className = 'jf-object'

  if (entries.length === 0) {
    container.appendChild(document.createTextNode('{}'))
    return container
  }

  const childrenEl = document.createElement('div')
  childrenEl.className = 'jf-children'
  entries.forEach(([key, val], i) => {
    const row = document.createElement('div')
    row.className = 'jf-object-row'
    row.style.paddingLeft = `${(depth + 1) * 1.5}rem`
    row.appendChild(span('jf-key', `"${key}"`))
    row.appendChild(document.createTextNode(': '))
    row.appendChild(renderValue(val, depth + 1))
    if (i < entries.length - 1) row.appendChild(document.createTextNode(','))
    childrenEl.appendChild(row)
  })

  const closingEl = document.createElement('div')
  closingEl.style.paddingLeft = `${depth * 1.5}rem`
  closingEl.textContent = '}'

  const summaryEl = span('jf-summary', `{…${entries.length}}`)
  summaryEl.style.display = 'none'

  container.appendChild(makeToggle(childrenEl, closingEl, summaryEl))
  container.appendChild(document.createTextNode('{'))
  container.appendChild(summaryEl)
  container.appendChild(childrenEl)
  container.appendChild(closingEl)
  return container
}

function renderArray(arr: unknown[], depth: number): HTMLElement {
  const container = document.createElement('span')
  container.className = 'jf-array'

  if (arr.length === 0) {
    container.appendChild(document.createTextNode('[]'))
    return container
  }

  const childrenEl = document.createElement('div')
  childrenEl.className = 'jf-children'
  arr.forEach((item, i) => {
    const row = document.createElement('div')
    row.className = 'jf-array-item'
    row.style.paddingLeft = `${(depth + 1) * 1.5}rem`
    row.appendChild(renderValue(item, depth + 1))
    if (i < arr.length - 1) row.appendChild(document.createTextNode(','))
    childrenEl.appendChild(row)
  })

  const closingEl = document.createElement('div')
  closingEl.style.paddingLeft = `${depth * 1.5}rem`
  closingEl.textContent = ']'

  const summaryEl = span('jf-summary', `[…${arr.length}]`)
  summaryEl.style.display = 'none'

  container.appendChild(makeToggle(childrenEl, closingEl, summaryEl))
  container.appendChild(document.createTextNode('['))
  container.appendChild(summaryEl)
  container.appendChild(childrenEl)
  container.appendChild(closingEl)
  return container
}

function span(className: string, content: string): HTMLElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = content
  return el
}
