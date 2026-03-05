import React from 'react'
import { createRoot } from 'react-dom/client'
import PanelApp from './PanelApp'
import { SettingsProvider } from '../../shared/SettingsProvider'
import { I18nProvider } from '../../i18n/i18n'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
createRoot(root).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <PanelApp />
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>
)
