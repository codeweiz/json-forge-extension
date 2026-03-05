import React from 'react'
import { createRoot } from 'react-dom/client'
import PanelApp from './PanelApp'
import { SettingsProvider } from '../../shared/SettingsProvider'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
createRoot(root).render(
  <React.StrictMode>
    <SettingsProvider>
      <PanelApp />
    </SettingsProvider>
  </React.StrictMode>
)
