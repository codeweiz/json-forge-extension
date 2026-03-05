import './monaco-setup'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from '../shared/SettingsProvider'
import { I18nProvider } from '../i18n/i18n'
import { ToastProvider } from '../shared/ToastProvider'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>
)
