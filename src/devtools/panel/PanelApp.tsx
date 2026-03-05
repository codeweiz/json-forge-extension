import React, { useState } from 'react'
import { useNetworkCapture, type CapturedRequest } from './useNetworkCapture'
import RequestList from './RequestList'
import RequestDetail from './RequestDetail'

export default function PanelApp() {
  const { requests, recording, clear, toggleRecording } = useNetworkCapture()
  const [selected, setSelected] = useState<CapturedRequest | null>(null)

  const handleSelect = (req: CapturedRequest) => {
    setSelected(req)
  }

  const handleClose = () => {
    setSelected(null)
  }

  return (
    <div className="flex flex-col h-screen bg-[#1e1e2e] text-[#cdd6f4]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#313244] bg-[#181825]">
        <span className="text-sm font-semibold text-[#89b4fa]">
          &#x2692; JSON Forge
        </span>
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
        <span className="ml-auto text-xs text-[#6c7086]">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
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
      </div>
    </div>
  )
}
