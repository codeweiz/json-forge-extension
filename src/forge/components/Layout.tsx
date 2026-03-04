import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[#313244] bg-[#181825] shrink-0">
        <span className="text-[#89b4fa] font-bold text-lg">⚒ JSON Forge</span>
        <span className="ml-3 text-[#6c7086] text-sm">API Developer's JSON Workbench</span>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
