interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex border-b border-[#313244] bg-[#181825] shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm transition-colors cursor-pointer ${
            active === tab.id
              ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
              : 'text-[#6c7086] hover:text-[#cdd6f4]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
