// Spesifikasi unit & hero — angka diambil langsung dari PRD §4.
//
// Catatan: implementasi lama (game.js) memakai beberapa angka yang BERBEDA dari
// PRD (mis. pawn dmg 7 vs 6, warrior 21 vs 20, monk hp 115 vs 110). PRD adalah
// spesifikasi, jadi angka PRD yang dipakai di sini.

import type { JenisBangunan } from './bangunan.js'

export type PeranUnit =
  | 'pawn' | 'warrior' | 'archer' | 'lancer' | 'monk' | 'mage'
  | 'berserker' | 'king' | 'knight' | 'champion'

export type KategoriUnit = 'pawn' | 'warrior' | 'archer' | 'lancer' | 'caster' | 'hero'

export interface DefUnit {
  nama: string
  kategori: KategoriUnit
  /** Bangunan tempat dilatih. null = tidak bisa dilatih (hero awal). */
  dariBangunan: JenisBangunan | null
  gold: number
  kayu: number
  daging: number
  /** Populasi yang dimakan. */
  pop: number
  hp: number
  dmg: number
  jarak: number
  /** Jeda antar serangan dalam detik. */
  jeda: number
  kecepatan: number
  waktuLatih: number
  /** Monk menyembuhkan alih-alih melukai. */
  penyembuh?: boolean
  /** Mage memberi damage area. */
  area?: boolean
  hero?: boolean
}

export const UNIT: Record<PeranUnit, DefUnit> = {
  pawn: {
    nama: 'Pawn', kategori: 'pawn', dariBangunan: 'castle',
    gold: 40, kayu: 0, daging: 10, pop: 1,
    hp: 85, dmg: 6, jarak: 42, jeda: 1.0, kecepatan: 132, waktuLatih: 4.5,
  },
  warrior: {
    nama: 'Pedang', kategori: 'warrior', dariBangunan: 'barracks',
    gold: 55, kayu: 0, daging: 20, pop: 1,
    hp: 150, dmg: 20, jarak: 54, jeda: 0.82, kecepatan: 126, waktuLatih: 5.5,
  },
  archer: {
    nama: 'Panah', kategori: 'archer', dariBangunan: 'archery',
    gold: 50, kayu: 25, daging: 15, pop: 1,
    hp: 95, dmg: 17, jarak: 285, jeda: 1.25, kecepatan: 120, waktuLatih: 5.5,
  },
  lancer: {
    nama: 'Tombak', kategori: 'lancer', dariBangunan: 'barracks',
    gold: 85, kayu: 20, daging: 25, pop: 2,
    hp: 220, dmg: 32, jarak: 80, jeda: 1.02, kecepatan: 112, waktuLatih: 7.0,
  },
  monk: {
    nama: 'Monk', kategori: 'caster', dariBangunan: 'monastery',
    gold: 80, kayu: 15, daging: 20, pop: 1,
    hp: 110, dmg: 26, jarak: 195, jeda: 1.85, kecepatan: 115, waktuLatih: 6.5,
    penyembuh: true,
  },
  mage: {
    nama: 'Mage', kategori: 'caster', dariBangunan: 'monastery',
    gold: 95, kayu: 20, daging: 25, pop: 2,
    hp: 105, dmg: 28, jarak: 265, jeda: 1.65, kecepatan: 114, waktuLatih: 7.5,
    area: true,
  },

  berserker: {
    nama: 'Kael Kapak Ganda', kategori: 'hero', dariBangunan: 'altar',
    gold: 140, kayu: 30, daging: 45, pop: 3,
    hp: 420, dmg: 38, jarak: 64, jeda: 0.72, kecepatan: 155, waktuLatih: 9.0,
    hero: true,
  },
  king: {
    nama: 'Raja Aldric', kategori: 'hero', dariBangunan: 'altar',
    gold: 160, kayu: 40, daging: 50, pop: 3,
    hp: 560, dmg: 32, jarak: 66, jeda: 0.88, kecepatan: 122, waktuLatih: 10,
    hero: true,
  },
  knight: {
    nama: 'Sir Gareth Berkuda', kategori: 'hero', dariBangunan: 'altar',
    gold: 175, kayu: 45, daging: 55, pop: 3,
    hp: 480, dmg: 44, jarak: 86, jeda: 0.82, kecepatan: 195, waktuLatih: 10,
    hero: true,
  },
  champion: {
    nama: 'Torin Pedang Raksasa', kategori: 'hero', dariBangunan: 'altar',
    gold: 165, kayu: 35, daging: 50, pop: 3,
    hp: 520, dmg: 48, jarak: 76, jeda: 0.90, kecepatan: 128, waktuLatih: 10,
    hero: true,
  },
}

export const UNIT_REGULER: readonly PeranUnit[] = ['pawn', 'warrior', 'archer', 'lancer', 'monk', 'mage']
export const UNIT_HERO: readonly PeranUnit[] = ['berserker', 'king', 'knight', 'champion']

export type PeranHero = 'berserker' | 'king' | 'knight' | 'champion'

/** Skill aktif [Q] tiap hero (PRD §4B). */
export interface DefSkill {
  nama: string
  jeda: number
  radius: number
  /** Damage ke musuh, atau penyembuhan ke sekutu kalau `menyembuhkan`. */
  nilai: number
  menyembuhkan?: boolean
  dorongan?: number
}

export const SKILL: Record<PeranHero, DefSkill> = {
  berserker: { nama: 'Whirlwind Cleave', jeda: 9, radius: 125, nilai: 75, dorongan: 60 },
  king: { nama: 'Royal Blessing', jeda: 11, radius: 210, nilai: 110, menyembuhkan: true },
  knight: { nama: 'Jousting Charge', jeda: 10, radius: 140, nilai: 95, dorongan: 120 },
  champion: { nama: 'Titan Cleave', jeda: 10, radius: 160, nilai: 85, dorongan: 40 },
}

/** Progresi level hero (PRD §4B: Lv 1-5). */
export const LEVEL_MAKS = 5
/** XP yang dibutuhkan untuk naik ke level berikutnya, indeks = level sekarang - 1. */
export const XP_PER_LEVEL: readonly number[] = [100, 240, 430, 680]
/** Pengali HP & damage per level di atas 1. */
export const BONUS_PER_LEVEL = { hp: 0.18, dmg: 0.12 } as const

/** Revive hero lewat Altar (PRD §11.3). */
export const REVIVE = {
  goldPerLevel: 80,
  daging: 40,
  detikDasar: 25,
  detikPerLevel: 8,
  /** Porsi HP maksimum saat muncul kembali. */
  hpSaatMuncul: 0.5,
} as const
