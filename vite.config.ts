import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'

const emptyModule = fileURLToPath(new URL('./src/empty.ts', import.meta.url))
const deobSrc = fileURLToPath(new URL('./packages/deob/src', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({ exclude: ['fs'] }),
  ],
  base: './',
  resolve: {
    alias: {
      '@babel/core': emptyModule,
      'isolated-vm': emptyModule,
      'deob': deobSrc,
    },
  },
  optimizeDeps: {
    exclude: ['isolated-vm'],
  },
  build: {
    target: 'chrome89',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: ['isolated-vm'],
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'babel': ['@babel/parser', '@babel/traverse', '@babel/generator', '@babel/types', '@babel/template'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  define: {
    'process.env': JSON.stringify({}),
    'process.versions.node': JSON.stringify('18.17.1'),
  },
})
