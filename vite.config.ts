import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/auth/semi/': process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006',
      '/api/attachments': process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006',
      '/pds/xrpc/com.atproto.sync.getBlob': process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006',
      '/bsky/img/': process.env.XIANGJIAN_BACKEND_URL ?? 'http://localhost:19006',
    },
  },
  build: {
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [tanstackStart(), react()],
})
