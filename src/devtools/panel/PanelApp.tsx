import React, { useState } from 'react'
import { useNetworkCapture, type CapturedRequest } from './useNetworkCapture'
import RequestList from './RequestList'
import RequestDetail from './RequestDetail'
import EndpointList from './EndpointList'
import type { Endpoint } from '../../shared/types'
import { useThemeBasic } from '../../shared/useThemeBasic'
import { useI18n } from '../../i18n/i18n'

type ViewMode = 'requests' | 'endpoints'

export default function PanelApp() {
  useThemeBasic() // applies data-theme attribute (no Monaco in DevTools)
  const t = useI18n()

  const { requests, recording, clear, toggleRecording } = useNetworkCapture()
  const [selected, setSelected] = useState<CapturedRequest | null>(null)
  const [view, setView] = useState<ViewMode>('requests')

  const handleSelect = (req: CapturedRequest) => {
    setSelected(req)
  }

  const handleClose = () => {
    setSelected(null)
  }

  const handleSelectEndpoint = (endpoint: Endpoint) => {
    void endpoint // TODO: show endpoint detail / snapshots
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--jf-bg)] text-[var(--jf-text)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)]">
        <span className="text-sm font-semibold text-[var(--jf-primary)]">
          &#x2692; {t('devtools.title')}
        </span>

        {/* View toggle */}
        <div className="flex bg-[var(--jf-surface)] rounded text-xs">
          <button
            onClick={() => setView('requests')}
            className={`px-2 py-0.5 rounded-l ${view === 'requests' ? 'bg-[var(--jf-surface-hover)] text-[var(--jf-text)]' : 'text-[var(--jf-text-muted)]'}`}
          >
            {t('devtools.requests')}
          </button>
          <button
            onClick={() => setView('endpoints')}
            className={`px-2 py-0.5 rounded-r ${view === 'endpoints' ? 'bg-[var(--jf-surface-hover)] text-[var(--jf-text)]' : 'text-[var(--jf-text-muted)]'}`}
          >
            {t('devtools.endpoints')}
          </button>
        </div>

        {view === 'requests' && (
          <>
            <button
              onClick={toggleRecording}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                recording
                  ? 'bg-[var(--jf-error)] text-[var(--jf-primary-text)]'
                  : 'bg-[var(--jf-surface)] text-[var(--jf-text)]'
              }`}
            >
              {recording ? `\u25CF ${t('devtools.recording')}` : `\u25CB ${t('devtools.paused')}`}
            </button>
            <button
              onClick={clear}
              className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--jf-surface)] text-[var(--jf-text)] hover:bg-[var(--jf-surface-hover)]"
            >
              {t('common.clear')}
            </button>
          </>
        )}

        <span className="ml-auto text-xs text-[var(--jf-text-muted)]">
          {view === 'requests'
            ? t('devtools.requestCount', { count: requests.length })
            : t('devtools.savedEndpoints')}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {view === 'requests' ? (
          <>
            <div className={selected ? 'w-1/2 border-r border-[var(--jf-border)]' : 'w-full'}>
              <RequestList
                requests={requests}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
            {selected && (
              <div className="w-1/2">
                <RequestDetail request={selected} onClose={handleClose} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full">
            <EndpointList onSelectEndpoint={handleSelectEndpoint} />
          </div>
        )}
      </div>
    </div>
  )
}
