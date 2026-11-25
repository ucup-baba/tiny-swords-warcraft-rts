#!/usr/bin/env node
// Membundel client jadi satu berkas yang bisa dimuat browser.
import { build } from 'esbuild'

const hasil = await build({
  entryPoints: ['packages/client/dist/main.js'],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  outfile: 'bundel.js',
  sourcemap: true,
  logLevel: 'info',
  metafile: true,
})

const byte = Object.values(hasil.metafile.outputs).reduce((a, o) => a + o.bytes, 0)
console.log(`bundel.js ${(byte / 1024).toFixed(0)} KB`)
