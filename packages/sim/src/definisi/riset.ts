import type { JenisBangunan } from './bangunan.js'
import type { JenisSerangan } from './tempur.js'

/**
 * Riset/upgrade (PRD §20).
 *
 * Inilah yang memberi pertandingan beberapa FASE: tanpa upgrade, pasukan
 * menit ke-2 sama kuatnya dengan pasukan menit ke-20, jadi satu-satunya cara
 * menang adalah menyerang lebih dulu.
 */
export type JenisRiset = 'senjataTajam' | 'bajuZirah' | 'busurLentur' | 'fokusArkana'

export interface TingkatRiset {
  gold: number
  kayu: number
  detik: number
}

export interface DefRiset {
  nama: string
  singkat: string
  dariBangunan: JenisBangunan
  /** Serangan yang diperkuat; null berarti riset pertahanan. */
  memperkuat: JenisSerangan | null
  tingkat: readonly TingkatRiset[]
}

export const TINGKAT_MAKS = 3

export const RISET: Record<JenisRiset, DefRiset> = {
  senjataTajam: {
    nama: 'Senjata Tajam',
    singkat: '+Tebas',
    dariBangunan: 'barracks',
    memperkuat: 'tebas',
    tingkat: [
      { gold: 100, kayu: 60, detik: 30 },
      { gold: 190, kayu: 110, detik: 45 },
      { gold: 320, kayu: 180, detik: 62 },
    ],
  },
  bajuZirah: {
    nama: 'Baju Zirah',
    singkat: '+Baju',
    dariBangunan: 'barracks',
    memperkuat: null,
    tingkat: [
      { gold: 110, kayu: 70, detik: 32 },
      { gold: 200, kayu: 120, detik: 48 },
      { gold: 340, kayu: 190, detik: 66 },
    ],
  },
  busurLentur: {
    nama: 'Busur Lentur',
    singkat: '+Tusuk',
    dariBangunan: 'archery',
    memperkuat: 'tusuk',
    tingkat: [
      { gold: 100, kayu: 70, detik: 30 },
      { gold: 190, kayu: 125, detik: 45 },
      { gold: 320, kayu: 200, detik: 62 },
    ],
  },
  fokusArkana: {
    nama: 'Fokus Arkana',
    singkat: '+Sihir',
    dariBangunan: 'monastery',
    memperkuat: 'sihir',
    tingkat: [
      { gold: 130, kayu: 80, detik: 36 },
      { gold: 230, kayu: 140, detik: 52 },
      { gold: 380, kayu: 220, detik: 70 },
    ],
  },
}

export const SEMUA_RISET = Object.keys(RISET) as JenisRiset[]

/** Tambahan kerusakan per tingkat riset serangan. */
export const BONUS_SERANG_PER_TINGKAT = 0.15
/** Pengurangan kerusakan yang diterima per tingkat Baju Zirah. */
export const BONUS_BAJU_PER_TINGKAT = 0.08

/** Riset yang bisa dikerjakan di sebuah bangunan. */
export function risetDi(bangunan: JenisBangunan): JenisRiset[] {
  return SEMUA_RISET.filter((r) => RISET[r].dariBangunan === bangunan)
}
