// @hftf/sim
// INTI simulasi RTS deterministik. Nol DOM, nol render.
//
// Boleh mengimpor: @hftf/shared
//
// ATURAN KERAS (PRD §8.2, ditegakkan oleh packages/shared/test/arsitektur.test.ts):
//   - Dilarang menyentuh document, window, Image, canvas, localStorage, fetch
//   - Dilarang memakai Math.random() — pakai Rng ber-seed dari './rng'
//   - Dilarang memakai Date.now() / performance.now() — waktu masuk sebagai dt tetap
//
// Rangka M0. Sistem sebenarnya (ekonomi, bangunan, tempur, hero) diisi di M1.

export * from './rng.js'
export * from './tipe.js'
export * from './dunia.js'
export * from './hash.js'
