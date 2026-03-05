import { useState } from 'react'
import TabBar from '../../components/TabBar'
import SchemaPanel from '../schema/SchemaPanel'
import MockPanel from '../mock/MockPanel'
import DiffPanel from '../diff/DiffPanel'
import QueryPanel from '../query/QueryPanel'
import CodeGenPanel from '../codegen/CodeGenPanel'
import ApiDocPanel from '../apidoc/ApiDocPanel'
import ValidatePanel from '../validate/ValidatePanel'
import { useI18n } from '../../../i18n/i18n'

interface Props {
  json: string
}

export default function ToolPanel({ json }: Props) {
  const t = useI18n()
  const [activeTab, setActiveTab] = useState('schema')

  const tabs = [
    { id: 'schema', label: t('tabs.schema') },
    { id: 'codegen', label: t('tabs.codegen') },
    { id: 'mock', label: t('tabs.mock') },
    { id: 'diff', label: t('tabs.diff') },
    { id: 'query', label: t('tabs.query') },
    { id: 'apidoc', label: t('tabs.apiDoc') },
    { id: 'validate', label: t('tabs.validate') },
  ]

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
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
