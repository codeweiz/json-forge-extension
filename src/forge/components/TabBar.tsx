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
    <div className="flex border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)] shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm transition-colors cursor-pointer ${
            active === tab.id
              ? 'text-[var(--jf-primary)] border-b-2 border-[var(--jf-primary)]'
              : 'text-[var(--jf-text-muted)] hover:text-[var(--jf-text)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
