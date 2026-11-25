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

for (const nama of ['buatDunia', 'terapkanPerintah', 'langkahBanyak', 'hashDunia', 'buatAi', 'langkahAi']) {
  if (typeof sim[nama] !== 'function') gagal(`ekspor '${nama}' hilang dari dist`)
}

/** Satu match AI vs AI sampai selesai, langsung dari kode yang sudah dibangun. */
function mainkan(seed, maksTick) {
  const d = sim.buatDunia({ seed, heroBlue: 'king', heroRed: 'champion' })
  const aiBlue = sim.buatAi('blue', 'normal')
  const aiRed = sim.buatAi('red', 'normal')
  let tick = 0
  while (d.hasil.jenis === 'berlangsung' && tick < maksTick) {
    for (const p of sim.langkahAi(d, aiBlue)) sim.terapkanPerintah(d, 'blue', p)
    for (const p of sim.langkahAi(d, aiRed)) sim.terapkanPerintah(d, 'red', p)
    sim.langkahBanyak(d, 1)
    tick++
  }
  return { d, tick }
}

const MAKS = 60 * 60 * 25
const a = mainkan(2026, MAKS)

if (a.d.hasil.jenis === 'berlangsung') gagal(`match tidak selesai dalam ${MAKS} tick`)
if (a.d.tim.blue.statistik.goldTerkumpul + a.d.tim.red.statistik.goldTerkumpul === 0) {
  gagal('tidak ada gold yang terkumpul — ekonomi tidak jalan di dist')
}

// Determinisme harus berlaku pada kode yang SUDAH DIBANGUN, bukan hanya sumber.
const b = mainkan(2026, MAKS)
if (sim.hashDunia(a.d) !== sim.hashDunia(b.d)) gagal('dist tidak deterministik')
if (a.tick !== b.tick) gagal(`panjang match tidak stabil: ${a.tick} vs ${b.tick}`)

const menit = (a.tick / 60 / 60).toFixed(1)
const hasil = a.d.hasil.jenis === 'menang' ? `menang ${a.d.hasil.tim}` : a.d.hasil.jenis
console.log(`✔ AC-8.4 — match penuh dari dist: ${hasil} dalam ${menit} menit permainan, hash ${sim.hashDunia(a.d)}`)
