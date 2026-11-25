// RNG ber-seed. `sim` DILARANG memakai Math.random() — keacakan harus
// reproducible agar seed + daftar perintah selalu menghasilkan state identik
// (PRD §8.2 poin 2 & 3).

export interface Rng {
  /** State 32-bit. Disalin saat dunia disalin; ikut masuk hash. */
  state: number
}

export function buatRng(seed: number): Rng {
  // Hindari state 0 yang membuat sebagian generator macet.
  return { state: (seed >>> 0) || 0x9e3779b9 }
}

/** mulberry32 — kecil, cepat, dan deterministik lintas mesin. */
export function acak(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0
  let t = rng.state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Bilangan bulat di [0, n). */
export function acakBulat(rng: Rng, n: number): number {
  return Math.floor(acak(rng) * n)
}

/** Pecahan di [lo, hi). */
export function acakRentang(rng: Rng, lo: number, hi: number): number {
  return lo + acak(rng) * (hi - lo)
}
