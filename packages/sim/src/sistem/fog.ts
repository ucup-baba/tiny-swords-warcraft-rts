import { BONUS_TANAH_TINGGI, TILE, TINGGI, type Tim } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import type { Dunia, Unit } from '../tipe.js'
import { keTile, tinggiDi } from '../terrain.js'

/**
 * Fog of war (PRD §12). Dihitung di `sim`, bukan di renderer — kalau hanya
 * lapisan gambar, Guest tinggal membaca memori untuk maphack.
 */

/** Jarak pandang per entitas, dalam piksel (PRD §12.2). */
export const PANDANG = {
  pawn: 340,
  tempur: 420,
  jauh: 480,
  hero: 560,
  castle: 620,
  tower: 540,
  bangunanLain: 380,
} as const

/** Grid visibilitas diperbarui 4x/detik, bukan tiap frame (PRD §12.3). */
export const TICK_PER_FOG = 15

export interface Fog {
  /** Pernah dilihat: terrain & bangunan diingat bentuk terakhirnya. */
  pernah: Uint8Array
  /** Terlihat SEKARANG: hanya di sini unit musuh boleh tampak. */
  kini: Uint8Array
}

export function buatFog(kolom: number, baris: number): Fog {
  return { pernah: new Uint8Array(kolom * baris), kini: new Uint8Array(kolom * baris) }
}

function jarakPandangUnit(u: Unit): number {
  if (u.hero) return PANDANG.hero
  if (u.peran === 'pawn') return PANDANG.pawn
  if (u.peran === 'archer' || u.peran === 'mage') return PANDANG.jauh
  return PANDANG.tempur
}

/**
 * Menandai tile yang terlihat oleh satu pengamat.
 *
 * Dua aturan elevasi (PRD §12.2):
 *   - berdiri di plateau menambah jarak pandang
 *   - dari bawah, isi plateau TIDAK terlihat lebih dari 1 tile dari tepi tebing
 *     — inilah yang membuat tanah tinggi layak direbut
 */
function tandai(dunia: Dunia, fog: Fog, x: number, y: number, radiusPx: number): void {
  const t = dunia.terrain
  const tx0 = keTile(x)
  const ty0 = keTile(y)
  const akuDi = tinggiDi(t, tx0, ty0)
  const radius = akuDi === TINGGI.plateau ? radiusPx + BONUS_TANAH_TINGGI.jarakPandangPx : radiusPx
  const r = Math.ceil(radius / TILE)
  const r2 = (radius / TILE) * (radius / TILE)

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const tx = tx0 + dx
      const ty = ty0 + dy
      if (tx < 0 || ty < 0 || tx >= t.kolom || ty >= t.baris) continue

      // Tanah tinggi menyembunyikan isinya dari pengamat di bawahnya.
      if (tinggiDi(t, tx, ty) > akuDi && Math.max(Math.abs(dx), Math.abs(dy)) > 1) continue

      const i = ty * t.kolom + tx
      fog.kini[i] = 1
      fog.pernah[i] = 1
    }
  }
}

export function langkahFog(dunia: Dunia): void {
  if (dunia.tick % TICK_PER_FOG !== 0) return

  for (const tim of ['blue', 'red'] as const) {
    const fog = dunia.fog[tim]
    fog.kini.fill(0)

    for (const u of dunia.unit) {
      if (u.tim !== tim) continue
      tandai(dunia, fog, u.x, u.y, jarakPandangUnit(u))
    }
    for (const b of dunia.bangunan) {
      if (b.tim !== tim || b.fase === 'hancur') continue
      const r = b.jenis === 'castle' ? PANDANG.castle
        : b.jenis === 'tower' ? PANDANG.tower
        : PANDANG.bangunanLain
      tandai(dunia, fog, b.x, b.y, r)
    }
  }
  void BANGUNAN
}

export function terlihatDi(dunia: Dunia, tim: Tim, x: number, y: number): boolean {
  if (tim === 'neutral') return true
  const t = dunia.terrain
  const tx = keTile(x)
  const ty = keTile(y)
  if (tx < 0 || ty < 0 || tx >= t.kolom || ty >= t.baris) return false
  return dunia.fog[tim].kini[ty * t.kolom + tx] === 1
}

export function pernahLihat(dunia: Dunia, tim: Tim, x: number, y: number): boolean {
  if (tim === 'neutral') return true
  const t = dunia.terrain
  const tx = keTile(x)
  const ty = keTile(y)
  if (tx < 0 || ty < 0 || tx >= t.kolom || ty >= t.baris) return false
  return dunia.fog[tim].pernah[ty * t.kolom + tx] === 1
}

/**
 * Menyaring state untuk satu pemain (PRD §12.3, AC-12.8).
 *
 * Host WAJIB memanggil ini sebelum mengirim snapshot ke Guest. Mengirim posisi
 * unit yang sedang berada di fog milik Guest membuat maphack cukup dengan
 * membaca memori — ini syarat keamanan, bukan optimasi.
 */
export function saringUntuk(dunia: Dunia, tim: Tim): {
  unit: Unit[]
  bangunan: typeof dunia.bangunan
} {
  return {
    unit: dunia.unit.filter((u) => u.tim === tim || terlihatDi(dunia, tim, u.x, u.y)),
    // Bangunan diingat bentuk terakhirnya, jadi cukup pernah dilihat.
    bangunan: dunia.bangunan.filter((b) => b.tim === tim || pernahLihat(dunia, tim, b.x, b.y)),
  }
}
