import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/main',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'electron',
        'electron-store',
        'basic-ftp',
        'path',
        'fs',
        'fs/promises',
        'os',
        'crypto',
        'stream',
        'stream/promises',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'node:os',
        'node:crypto',
        'node:stream',
        'node:stream/promises',
        'node:url',
      ],
    },
    target: 'node22',
    ssr: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
})
