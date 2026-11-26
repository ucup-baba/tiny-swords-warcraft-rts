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
export * from './terrain.js'
export * from './peta-custom.js'
export * from './halangan.js'
export * from './jalur.js'
export * from './hash.js'
export * from './snapshot.js'
export * from './util.js'

export * from './definisi/bangunan.js'
export * from './definisi/unit.js'
export * from './definisi/goblin.js'
export * from './definisi/tempur.js'
export * from './definisi/riset.js'

export * from './sistem/ekonomi.js'
export * from './sistem/gerak.js'
export * from './sistem/tempur.js'
export * from './sistem/hero.js'
export * from './sistem/pekerja.js'
export * from './sistem/bangunan.js'
export * from './sistem/spawn.js'
export * from './sistem/akhir.js'
export * from './sistem/goblin.js'
export * from './sistem/domba.js'
export * from './sistem/fog.js'
export * from './sistem/ai.js'
