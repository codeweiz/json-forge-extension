import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './src/manifest'

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        forge: 'src/forge/index.html',
        'devtools-panel': 'src/devtools/panel/panel.html',
        'editor.worker': 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
        'json.worker': 'node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
        'ts.worker': 'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'editor.worker' || chunk.name === 'json.worker' || chunk.name === 'ts.worker') {
            return 'assets/[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
