import { useState } from 'react'
import TabBar from '../../components/TabBar'
import SchemaPanel from '../schema/SchemaPanel'
import MockPanel from '../mock/MockPanel'
import DiffPanel from '../diff/DiffPanel'
import QueryPanel from '../query/QueryPanel'
import CodeGenPanel from '../codegen/CodeGenPanel'
import ApiDocPanel from '../apidoc/ApiDocPanel'
import ValidatePanel from '../validate/ValidatePanel'

const TABS = [
  { id: 'schema', label: 'Schema' },
  { id: 'codegen', label: 'CodeGen' },
  { id: 'mock', label: 'Mock' },
  { id: 'diff', label: 'Diff' },
  { id: 'query', label: 'Query' },
  { id: 'apidoc', label: 'API Doc' },
  { id: 'validate', label: 'Validate' },
]

interface Props {
  json: string
}

export default function ToolPanel({ json }: Props) {
  const [activeTab, setActiveTab] = useState('schema')

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'schema' && <SchemaPanel json={json} />}
        {activeTab === 'codegen' && <CodeGenPanel json={json} />}
        {activeTab === 'mock' && <MockPanel json={json} />}
        {activeTab === 'diff' && <DiffPanel json={json} />}
        {activeTab === 'query' && <QueryPanel json={json} />}
        {activeTab === 'apidoc' && <ApiDocPanel json={json} />}
        {activeTab === 'validate' && <ValidatePanel json={json} />}
      </div>
    </div>
  )
}
