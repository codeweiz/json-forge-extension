import { useState } from 'react'
import TabBar from '../../components/TabBar'
import TsGenPanel from '../ts-gen/TsGenPanel'
import SchemaPanel from '../schema/SchemaPanel'

const TABS = [
  { id: 'schema', label: 'Schema' },
  { id: 'mock', label: 'Mock' },
  { id: 'diff', label: 'Diff' },
  { id: 'query', label: 'Query' },
  { id: 'typescript', label: 'TypeScript' },
]

interface Props {
  json: string
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-[#6c7086] text-sm">
      {label} — coming soon
    </div>
  )
}

export default function ToolPanel({ json }: Props) {
  const [activeTab, setActiveTab] = useState('schema')

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'schema' && <SchemaPanel json={json} />}
        {activeTab === 'mock' && <ComingSoon label="Mock" />}
        {activeTab === 'diff' && <ComingSoon label="Diff" />}
        {activeTab === 'query' && <ComingSoon label="Query" />}
        {activeTab === 'typescript' && <TsGenPanel json={json} />}
      </div>
    </div>
  )
}
