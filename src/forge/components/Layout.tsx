import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onHistoryClick?: () => void
}

export default function Layout({ children, onHistoryClick }: Props) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)] shrink-0">
        <span className="text-[var(--jf-primary)] font-bold text-lg">⚒ JSON Forge</span>
        <span className="ml-3 text-[var(--jf-text-muted)] text-sm">API Developer's JSON Workbench</span>
        <button
          onClick={onHistoryClick}
          className="ml-auto px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
        >
          History ⌛
        </button>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
