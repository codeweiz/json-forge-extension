import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

interface Props {
  value: string
  filename?: string
}

export default function ExportBar({ value, filename = 'data.json' }: Props) {
  const t = useI18n()
  const toast = useToast()

  const copyToClipboard = async () => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(t('common.copied')))
      .catch(() => toast.error(t('common.copyFailed')))
  }

  const downloadFile = () => {
    const blob = new Blob([value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('common.downloaded'))
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={copyToClipboard}
        className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
      >
        {t('common.copy')}
      </button>
      <button
        onClick={downloadFile}
        className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
      >
        {t('common.download')}
      </button>
    </div>
  )
}
