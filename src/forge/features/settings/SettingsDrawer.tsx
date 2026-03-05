import { useSettings } from '../../../shared/SettingsProvider'
import { useI18n } from '../../../i18n/i18n'
import { SHORTCUTS, formatShortcut } from '../../../shared/shortcuts'
import type { Settings } from '../../../shared/settings'

interface Props {
  onClose: () => void
  onShowWelcome: () => void
}

export default function SettingsDrawer({ onClose, onShowWelcome }: Props) {
  const { settings, updateSettings } = useSettings()
  const t = useI18n()

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-10" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-80 bg-[var(--jf-bg)] border-l border-[var(--jf-border)] flex flex-col z-20">
        <div className="flex items-center px-4 py-3 border-b border-[var(--jf-border)] shrink-0">
          <span className="text-[var(--jf-text)] font-medium">{t('settings.title')}</span>
          <button onClick={onClose} className="ml-auto text-[var(--jf-text-muted)] hover:text-[var(--jf-text)] text-lg cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          <Section title={t('settings.appearance')}>
            <Row label={t('settings.theme')}>
              <SegmentedControl
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'auto', label: t('settings.themeAuto') },
                ]}
                value={settings.theme}
                onChange={(v) => updateSettings({ theme: v as Settings['theme'] })}
              />
            </Row>
            <Row label={t('settings.language')}>
              <select
                value={settings.locale}
                onChange={e => updateSettings({ locale: e.target.value as Settings['locale'] })}
                className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border-0 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </Row>
          </Section>

          <Section title={t('settings.editor')}>
            <Row label={t('settings.fontSize')}>
              <input
                type="number"
                min={12}
                max={20}
                value={settings.fontSize}
                onChange={e => updateSettings({ fontSize: Math.min(20, Math.max(12, Number(e.target.value))) })}
                className="w-16 px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border-0"
              />
            </Row>
            <Row label={t('settings.tabSize')}>
              <SegmentedControl
                options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]}
                value={String(settings.tabSize)}
                onChange={(v) => updateSettings({ tabSize: Number(v) as 2 | 4 })}
              />
            </Row>
            <Row label={t('settings.wordWrap')}>
              <Toggle checked={settings.wordWrap} onChange={(v) => updateSettings({ wordWrap: v })} />
            </Row>
            <Row label={t('settings.minimap')}>
              <Toggle checked={settings.minimap} onChange={(v) => updateSettings({ minimap: v })} />
            </Row>
          </Section>

          <Section title={t('settings.shortcuts')}>
            <div className="space-y-1">
              {SHORTCUTS.map(s => (
                <div key={s.action} className="flex justify-between text-sm py-1">
                  <span className="text-[var(--jf-text-secondary)]">{t(s.labelKey)}</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-[var(--jf-surface)] text-[var(--jf-text-muted)] rounded font-mono">
                    {formatShortcut(s)}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t('settings.about')}>
            <div className="text-sm text-[var(--jf-text-secondary)]">
              {t('settings.version')}: 0.1.0
            </div>
            <button
              onClick={() => { onShowWelcome(); onClose() }}
              className="mt-2 px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
            >
              {t('settings.showWelcome')}
            </button>
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[var(--jf-text-muted)] uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--jf-text)]">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[var(--jf-primary)]' : 'bg-[var(--jf-surface)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex bg-[var(--jf-surface)] rounded text-xs">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-[var(--jf-surface-hover)] text-[var(--jf-text)]'
              : 'text-[var(--jf-text-muted)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
