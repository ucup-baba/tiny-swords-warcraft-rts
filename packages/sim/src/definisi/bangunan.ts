// Spesifikasi bangunan — angka diambil langsung dari PRD §3.
// Satu-satunya sumber kebenaran; jangan duplikat di tempat lain.

import type { PeranUnit } from './unit.js'

export type JenisBangunan =
  | 'castle'
  | 'house'
  | 'barracks'
  | 'archery'
  | 'monastery'
  | 'tower'
  | 'altar'

export interface DefBangunan {
  nama: string
  kayu: number
  gold: number
  hp: number
  /** Tambahan batas populasi (PRD §2). */
  supply: number
  /** Lebar & tinggi tapak dalam piksel, dipakai penempatan & tabrakan. */
  w: number
  h: number
  /** Radius kasar untuk jarak target. */
  radius: number
  /** Unit yang bisa dilatih di sini. */
  melatih: readonly PeranUnit[]
  /** Detik dari 15% HP sampai selesai. */
  waktuBangun: number
  /** Khusus tower. */
  jarak?: number
  dmg?: number
  jeda?: number
}

export const BANGUNAN: Record<JenisBangunan, DefBangunan> = {
  castle: {
    nama: 'Castle', kayu: 220, gold: 250, hp: 1500, supply: 10,
    w: 230, h: 184, radius: 92, melatih: ['pawn'], waktuBangun: 18,
  },
  house: {
    nama: 'House', kayu: 50, gold: 30, hp: 420, supply: 8,
    w: 112, h: 168, radius: 46, melatih: [], waktuBangun: 7,
  },
  barracks: {
    nama: 'Barracks', kayu: 90, gold: 80, hp: 750, supply: 0,
    w: 168, h: 224, radius: 64, melatih: ['warrior', 'lancer'], waktuBangun: 10,
  },
  archery: {
    nama: 'Archery Range', kayu: 100, gold: 70, hp: 650, supply: 0,
    w: 168, h: 224, radius: 64, melatih: ['archer'], waktuBangun: 10,
  },
  monastery: {
    nama: 'Monastery', kayu: 110, gold: 120, hp: 700, supply: 0,
    w: 164, h: 268, radius: 64, melatih: ['monk', 'mage'], waktuBangun: 11,
  },
  tower: {
    nama: 'Guard Tower', kayu: 75, gold: 60, hp: 550, supply: 0,
    w: 112, h: 224, radius: 46, melatih: [], waktuBangun: 8,
    jarak: 340, dmg: 18, jeda: 1.15,
  },
  altar: {
    nama: 'Altar of Heroes', kayu: 130, gold: 150, hp: 850, supply: 0,
    w: 168, h: 224, radius: 66, melatih: [], waktuBangun: 12,
  },
}

export const URUTAN_BANGUN: readonly JenisBangunan[] = [
  'house', 'barracks', 'archery', 'monastery', 'tower', 'altar', 'castle',
]

/** Ambang fase terbakar (PRD §3 poin 3). */
export const AMBANG_API = { satuTitik: 0.65, berkobar: 0.35 } as const

/** HP awal saat konstruksi dimulai (PRD §3 poin 1). */
export const HP_AWAL_KONSTRUKSI = 0.15

/** Batas populasi maksimum (PRD §2). */
export const SUPPLY_MAKS = 50
