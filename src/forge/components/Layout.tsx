import { ReactNode } from 'react'
import { useI18n } from '../../i18n/i18n'

interface Props {
  children: ReactNode
  onHistoryClick?: () => void
  onSettingsClick?: () => void
}

export default function Layout({ children, onHistoryClick, onSettingsClick }: Props) {
  const t = useI18n()

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)] shrink-0">
        <span className="text-[var(--jf-primary)] font-bold text-lg">⚒ {t('forge.title')}</span>
        <span className="ml-3 text-[var(--jf-text-muted)] text-sm">{t('forge.subtitle')}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onSettingsClick}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
            title={t('settings.title')}
          >
            ⚙
          </button>
          <button
            onClick={onHistoryClick}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('history.title')} ⌛
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
