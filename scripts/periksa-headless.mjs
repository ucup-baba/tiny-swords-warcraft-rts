#!/usr/bin/env node
// AC-8.4 — membuktikan @hftf/sim jalan dari dist, di Node murni, tanpa DOM.
// Ini yang menangkap import ESM tanpa ekstensi: vitest memaafkannya, Node tidak.

const gagal = (pesan) => {
  console.error(`✖ ${pesan}`)
  process.exit(1)
}

for (const global of ['document', 'window', 'localStorage']) {
  if (typeof globalThis[global] !== 'undefined') gagal(`${global} ada — ini bukan lingkungan headless`)
}

const sim = await import('../packages/sim/dist/index.js').catch((e) => gagal(`dist tidak bisa diimpor: ${e.message}`))

for (const nama of ['buatDunia', 'terapkanPerintah', 'langkahBanyak', 'hashDunia']) {
  if (typeof sim[nama] !== 'function') gagal(`ekspor '${nama}' hilang dari dist`)
}

const d = sim.buatDunia(2026)
sim.terapkanPerintah(d, { jenis: 'spawn', tim: 'blue', x: 400, y: 400 })
sim.terapkanPerintah(d, { jenis: 'spawn', tim: 'red', x: 900, y: 900 })
sim.terapkanPerintah(d, { jenis: 'pindah', ids: [1], x: 900, y: 900 })
sim.langkahBanyak(d, 600)

if (d.tick !== 600) gagal(`tick seharusnya 600, dapat ${d.tick}`)
if (d.entitas.length !== 2) gagal(`entitas seharusnya 2, dapat ${d.entitas.length}`)

// Determinisme juga harus berlaku pada kode yang sudah dibangun, bukan hanya sumber.
const ulang = sim.buatDunia(2026)
sim.terapkanPerintah(ulang, { jenis: 'spawn', tim: 'blue', x: 400, y: 400 })
sim.terapkanPerintah(ulang, { jenis: 'spawn', tim: 'red', x: 900, y: 900 })
sim.terapkanPerintah(ulang, { jenis: 'pindah', ids: [1], x: 900, y: 900 })
sim.langkahBanyak(ulang, 600)
if (sim.hashDunia(d) !== sim.hashDunia(ulang)) gagal('dist tidak deterministik')

console.log(`✔ AC-8.4 — sim headless dari dist, ${d.tick} tick, hash ${sim.hashDunia(d)}`)
