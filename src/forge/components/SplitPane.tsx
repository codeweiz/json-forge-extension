import { useState, useRef, useCallback, ReactNode } from 'react'

interface Props {
  children: [ReactNode, ReactNode]
  defaultLeftPercent?: number
}

export default function SplitPane({ children, defaultLeftPercent = 50 }: Props) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPercent(Math.min(80, Math.max(20, pct)))
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMouseMove)
  }, [onMouseMove])

  const handleDividerMouseDown = () => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp, { once: true })
  }

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: `${leftPercent}%` }} className="flex flex-col min-w-0 overflow-hidden">
        {children[0]}
      </div>
      <div
        className="w-1 bg-[#313244] hover:bg-[#89b4fa] cursor-col-resize shrink-0 transition-colors"
        onMouseDown={handleDividerMouseDown}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {children[1]}
      </div>
    </div>
  )
}
