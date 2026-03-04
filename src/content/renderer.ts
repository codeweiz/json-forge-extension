export function renderJsonTree(value: unknown): HTMLElement {
  const root = document.createElement('span')
  root.className = 'jf-node'
  root.appendChild(renderValue(value))
  return root
}

function renderValue(value: unknown): HTMLElement | Text {
  if (value === null) return span('jf-null', 'null')
  if (typeof value === 'boolean') return span('jf-boolean', String(value))
  if (typeof value === 'number') return span('jf-number', String(value))
  if (typeof value === 'string') return span('jf-string', `"${value}"`)
  if (Array.isArray(value)) return renderArray(value)
  if (typeof value === 'object') return renderObject(value as Record<string, unknown>)
  return span('jf-unknown', String(value))
}

function renderObject(obj: Record<string, unknown>): HTMLElement {
  const el = document.createElement('span')
  el.className = 'jf-object'
  const entries = Object.entries(obj)
  el.appendChild(document.createTextNode('{'))
  entries.forEach(([key, val], i) => {
    const row = document.createElement('div')
    row.className = 'jf-object-row'
    row.style.paddingLeft = '1.5rem'
    row.appendChild(span('jf-key', `"${key}"`))
    row.appendChild(document.createTextNode(': '))
    const child = renderValue(val)
    row.appendChild(child)
    if (i < entries.length - 1) row.appendChild(document.createTextNode(','))
    el.appendChild(row)
  })
  el.appendChild(document.createTextNode('}'))
  return el
}

function renderArray(arr: unknown[]): HTMLElement {
  const el = document.createElement('span')
  el.className = 'jf-array'
  el.appendChild(document.createTextNode('['))
  arr.forEach((item, i) => {
    const row = document.createElement('div')
    row.className = 'jf-array-item'
    row.style.paddingLeft = '1.5rem'
    row.appendChild(renderValue(item))
    if (i < arr.length - 1) row.appendChild(document.createTextNode(','))
    el.appendChild(row)
  })
  el.appendChild(document.createTextNode(']'))
  return el
}

function span(className: string, content: string): HTMLElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = content
  return el
}
