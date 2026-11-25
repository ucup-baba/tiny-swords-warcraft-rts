import type { Tim } from '@hftf/shared'
import type { Bangunan, Dunia, Unit } from './tipe.js'

export const jepit = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export const jarak = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by)

/** Lawan sebuah tim. `neutral` memusuhi keduanya (PRD §10.1). */
export function musuhDari(tim: Tim): readonly Tim[] {
  if (tim === 'blue') return ['red', 'neutral']
  if (tim === 'red') return ['blue', 'neutral']
  return ['blue', 'red']
}

export const bermusuhan = (a: Tim, b: Tim): boolean => a !== b

export function cariUnit(dunia: Dunia, id: number): Unit | undefined {
  return dunia.unit.find((u) => u.id === id)
}

export function cariBangunan(dunia: Dunia, id: number): Bangunan | undefined {
  return dunia.bangunan.find((b) => b.id === id)
}

/**
 * Musuh terdekat dalam radius. Urutan iterasi stabil (array, bukan Map), dan
 * seri dimenangkan oleh id terkecil — supaya hasilnya deterministik.
 */
export function musuhTerdekat(dunia: Dunia, tim: Tim, x: number, y: number, radius: number): Unit | Bangunan | null {
  let terbaik: Unit | Bangunan | null = null
  let terdekat = radius

  for (const u of dunia.unit) {
    if (!bermusuhan(u.tim, tim)) continue
    const d = jarak(x, y, u.x, u.y)
    if (d < terdekat) {
      terdekat = d
      terbaik = u
    }
  }
  for (const b of dunia.bangunan) {
    if (!bermusuhan(b.tim, tim) || b.fase === 'hancur') continue
    const d = jarak(x, y, b.x, b.y)
    if (d < terdekat) {
      terdekat = d
      terbaik = b
    }
  }
  return terbaik
}

/** Castle sendiri terdekat — tempat pawn mengantar hasil panen. */
export function castleTerdekat(dunia: Dunia, tim: Tim, x: number, y: number): Bangunan | null {
  let terbaik: Bangunan | null = null
  let terdekat = Infinity
  for (const b of dunia.bangunan) {
    if (b.tim !== tim || b.jenis !== 'castle' || b.fase !== 'aktif') continue
    const d = jarak(x, y, b.x, b.y)
    if (d < terdekat) {
      terdekat = d
      terbaik = b
    }
  }
  return terbaik
}

export const adalahUnit = (e: Unit | Bangunan): e is Unit => 'peran' in e
