import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'JSON Forge',
  version: '0.1.0',
  description: "The API developer's JSON workbench",
  permissions: ['storage', 'tabs'],
  host_permissions: ['*://*/*'],
  web_accessible_resources: [{
    resources: ['src/content/renderer.css'],
    matches: ['*://*/*'],
  }],
  action: { default_popup: 'src/popup/index.html', default_icon: 'icons/icon48.png' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [{
    matches: ['*://*/*'],
    js: ['src/content/index.ts'],
    run_at: 'document_end',
  }],
})
