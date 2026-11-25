import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const paket = (nama: string): string =>
  fileURLToPath(new URL(`./packages/${nama}/src/index.ts`, import.meta.url))

export default defineConfig({
  resolve: {
    // Tes jalan dari sumber, bukan dari dist — supaya `npm test` tidak perlu build dulu.
    alias: {
      '@hftf/shared': paket('shared'),
      '@hftf/sim': paket('sim'),
      '@hftf/aset': paket('aset'),
      '@hftf/net': paket('net'),
      '@hftf/render': paket('render'),
      '@hftf/ui': paket('ui'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
  },
})
