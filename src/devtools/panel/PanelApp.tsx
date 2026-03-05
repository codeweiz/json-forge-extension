import React, { useState } from 'react'
import { useNetworkCapture, type CapturedRequest } from './useNetworkCapture'
import RequestList from './RequestList'
import RequestDetail from './RequestDetail'
import EndpointList from './EndpointList'
import type { Endpoint } from '../../shared/types'

type ViewMode = 'requests' | 'endpoints'

export default function PanelApp() {
  const { requests, recording, clear, toggleRecording } = useNetworkCapture()
  const [selected, setSelected] = useState<CapturedRequest | null>(null)
  const [view, setView] = useState<ViewMode>('requests')

  const handleSelect = (req: CapturedRequest) => {
    setSelected(req)
  }

  const handleClose = () => {
    setSelected(null)
  }

  const handleSelectEndpoint = (_endpoint: Endpoint) => {
    // TODO: show endpoint detail / snapshots
  }

  return (
    <div className="flex flex-col h-screen bg-[#1e1e2e] text-[#cdd6f4]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#313244] bg-[#181825]">
        <span className="text-sm font-semibold text-[#89b4fa]">
          &#x2692; JSON Forge
        </span>

        {/* View toggle */}
        <div className="flex bg-[#313244] rounded text-xs">
          <button
            onClick={() => setView('requests')}
            className={`px-2 py-0.5 rounded-l ${view === 'requests' ? 'bg-[#45475a] text-[#cdd6f4]' : 'text-[#6c7086]'}`}
          >
            Requests
          </button>
          <button
            onClick={() => setView('endpoints')}
            className={`px-2 py-0.5 rounded-r ${view === 'endpoints' ? 'bg-[#45475a] text-[#cdd6f4]' : 'text-[#6c7086]'}`}
          >
            Endpoints
          </button>
        </div>

        {view === 'requests' && (
          <>
            <button
              onClick={toggleRecording}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                recording
                  ? 'bg-[#f38ba8] text-[#1e1e2e]'
                  : 'bg-[#313244] text-[#cdd6f4]'
              }`}
            >
              {recording ? '\u25CF Recording' : '\u25CB Paused'}
            </button>
            <button
              onClick={clear}
              className="px-2.5 py-1 text-xs font-medium rounded bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]"
            >
              Clear
            </button>
          </>
        )}

        <span className="ml-auto text-xs text-[#6c7086]">
          {view === 'requests'
            ? `${requests.length} request${requests.length !== 1 ? 's' : ''}`
            : 'Saved endpoints'}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {view === 'requests' ? (
          <>
            <div className={selected ? 'w-1/2 border-r border-[#313244]' : 'w-full'}>
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
