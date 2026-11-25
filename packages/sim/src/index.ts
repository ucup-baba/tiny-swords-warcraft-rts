// @hftf/sim
// INTI simulasi RTS deterministik. Nol DOM, nol render.
//
// Boleh mengimpor: @hftf/shared
//
// ATURAN KERAS (PRD §8.2, ditegakkan oleh packages/shared/test/arsitektur.test.ts):
//   - Dilarang menyentuh document, window, Image, canvas, localStorage, fetch
//   - Dilarang memakai Math.random() — pakai Rng ber-seed dari './rng.js'
//   - Dilarang memakai Date.now() / performance.now() — waktu masuk sebagai dt tetap

export * from './rng.js'
export * from './tipe.js'
export * from './perintah.js'
export * from './dunia.js'
export * from './hash.js'
export * from './util.js'

export * from './definisi/bangunan.js'
export * from './definisi/unit.js'

export * from './sistem/ekonomi.js'
export * from './sistem/gerak.js'
export * from './sistem/tempur.js'
export * from './sistem/hero.js'
export * from './sistem/pekerja.js'
export * from './sistem/bangunan.js'
export * from './sistem/spawn.js'
export * from './sistem/akhir.js'
export * from './sistem/ai.js'
