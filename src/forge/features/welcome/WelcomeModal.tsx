import { useState } from 'react'
import { useI18n } from '../../../i18n/i18n'

interface Props {
  onComplete: () => void
}

interface Step {
  titleKey: string
  descKey: string
  icon: string
}

const STEPS: Step[] = [
  { titleKey: 'welcome.step1Title', descKey: 'welcome.step1Desc', icon: '🛠' },
  { titleKey: 'welcome.step2Title', descKey: 'welcome.step2Desc', icon: '📡' },
  { titleKey: 'welcome.step3Title', descKey: 'welcome.step3Desc', icon: '⚡' },
]

export default function WelcomeModal({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const t = useI18n()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-[var(--jf-bg)] border border-[var(--jf-border)] rounded-lg shadow-2xl w-96 max-w-[90vw] p-8 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-xl font-bold text-[var(--jf-text)] mb-2">
            {t(current.titleKey)}
          </h2>
          <p className="text-sm text-[var(--jf-text-secondary)] mb-6">
            {t(current.descKey)}
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === step ? 'bg-[var(--jf-primary)]' : 'bg-[var(--jf-surface)]'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm text-[var(--jf-text-muted)] hover:text-[var(--jf-text)] cursor-pointer transition-colors"
              >
                {t('welcome.back')}
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => isLast ? onComplete() : setStep(step + 1)}
              className="px-4 py-2 text-sm font-medium bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isLast ? t('welcome.getStarted') : t('welcome.next')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
