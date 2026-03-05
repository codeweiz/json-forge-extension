import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extName__',
  version: '0.1.0',
  description: '__MSG_extDescription__',
  default_locale: 'en',
  permissions: ['storage', 'tabs'],
  host_permissions: ['*://*/*'],
  web_accessible_resources: [{
    resources: ['src/content/renderer.css', 'src/forge/index.html'],
    matches: ['*://*/*'],
  }],
  action: { default_popup: 'src/popup/index.html', default_icon: 'icons/icon48.png' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [{
    matches: ['*://*/*'],
    js: ['src/content/index.ts'],
    run_at: 'document_end',
  }],
  devtools_page: 'src/devtools/devtools.html',
})
