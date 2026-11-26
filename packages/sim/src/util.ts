import type { Tim } from '@hftf/shared'
import type { Bangunan, Dunia, Unit } from './tipe.js'

export const jepit = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export const jarak = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by)

/** Lawan sebuah tim. `neutral` memusuhi seluruh pemain aktif. */
export function musuhDari(tim: Tim, dunia?: Dunia): readonly Tim[] {
  const daftar: readonly Tim[] = dunia ? [...dunia.pemainAktif, 'neutral'] : ['blue', 'red', 'neutral']
  return daftar.filter((t) => bermusuhan(tim, t, dunia))
}

export function sekutu(a: Tim, b: Tim, dunia?: Dunia): boolean {
  if (a === b) return true
  if (a === 'neutral' || b === 'neutral') return false
  if (!dunia) return false
  return dunia.aliansi[a] === dunia.aliansi[b]
}

export function bermusuhan(a: Tim, b: Tim, dunia?: Dunia): boolean {
  if (a === b) return false
  if (a === 'neutral' || b === 'neutral') return true
  if (!dunia) return true
  return dunia.aliansi[a] !== dunia.aliansi[b]
}

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
    if (!bermusuhan(u.tim, tim, dunia)) continue
    const d = jarak(x, y, u.x, u.y)
    if (d < terdekat) {
      terdekat = d
      terbaik = u
    }
  }
  for (const b of dunia.bangunan) {
    if (!bermusuhan(b.tim, tim, dunia) || b.fase === 'hancur') continue
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
