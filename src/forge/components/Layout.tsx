import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onHistoryClick?: () => void
}

export default function Layout({ children, onHistoryClick }: Props) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[#313244] bg-[#181825] shrink-0">
        <span className="text-[#89b4fa] font-bold text-lg">⚒ JSON Forge</span>
        <span className="ml-3 text-[#6c7086] text-sm">API Developer's JSON Workbench</span>
        <button
          onClick={onHistoryClick}
          className="ml-auto px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
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
