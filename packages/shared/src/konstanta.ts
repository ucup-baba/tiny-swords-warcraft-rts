// Konstanta dunia — sumber tunggal. Lihat PRD §9.

/** Sisi satu tile dalam piksel. */
export const TILE = 64

/** Lebar peta dalam tile (PRD §9.1). */
export const PETA_KOLOM = 96
/** Tinggi peta dalam tile (PRD §9.1). */
export const PETA_BARIS = 96

export const DUNIA_W = PETA_KOLOM * TILE
export const DUNIA_H = PETA_BARIS * TILE

/** Tiga tingkat ketinggian (PRD §9.2). */
export const TINGGI = { air: 0, dataran: 1, plateau: 2 } as const
export type Tinggi = (typeof TINGGI)[keyof typeof TINGGI]

/** Bonus tanah tinggi (PRD §9.2) — dikumpulkan di sini supaya bisa di-tuning. */
export const BONUS_TANAH_TINGGI = {
  /** Pengali jarak serang saat menyerang target yang lebih rendah. */
  jarakSerang: 1.15,
  /** Tambahan jarak pandang dalam piksel saat berada di plateau (PRD §12.2). */
  jarakPandangPx: 64,
} as const

/** Laju simulasi tetap. Sim melangkah dengan dt tetap agar deterministik. */
export const TICK_PER_DETIK = 60
export const DT_TETAP = 1 / TICK_PER_DETIK

export const TIM_PEMAIN = ['blue', 'red', 'yellow', 'purple', 'green', 'black'] as const
export type TimPemain = (typeof TIM_PEMAIN)[number]

export const TIM = [...TIM_PEMAIN, 'neutral'] as const
export type Tim = (typeof TIM)[number]

export const WARNA_TIM: Record<Tim, {
  nama: string
  kerajaan: string
  utama: string
  terang: string
  gelap: string
  pita: 'blue' | 'red' | 'yellow'
}> = {
  blue:    { nama: 'Biru',   kerajaan: 'BLUE KINGDOM',   utama: '#4a98f0', terang: '#9fd2ff', gelap: '#1c4478', pita: 'blue' },
  red:     { nama: 'Merah',  kerajaan: 'RED EMPIRE',     utama: '#e05a4a', terang: '#ffa89f', gelap: '#7a2018', pita: 'red' },
  yellow:  { nama: 'Kuning', kerajaan: 'GOLDEN LEGION',  utama: '#e6b835', terang: '#ffe88a', gelap: '#7a590e', pita: 'yellow' },
  purple:  { nama: 'Ungu',   kerajaan: 'VIOLET CROWN',   utama: '#9b64e8', terang: '#d4b3ff', gelap: '#482078', pita: 'blue' },
  green:   { nama: 'Hijau',  kerajaan: 'EMERALD CLAN',   utama: '#4ac26b', terang: '#9cf2b2', gelap: '#1b5c2d', pita: 'blue' },
  black:   { nama: 'Hitam',  kerajaan: 'OBSIDIAN ORDER', utama: '#677080', terang: '#bcc6d4', gelap: '#22262e', pita: 'red' },
  neutral: { nama: 'Netral', kerajaan: 'GOBLIN HORDE',   utama: '#c9a227', terang: '#e0c24a', gelap: '#5a4510', pita: 'yellow' },
}

export const JENIS_PETA = ['klasik2', 'salib4', 'bintang6'] as const
export type JenisPeta = (typeof JENIS_PETA)[number]

export const INFO_PETA: Record<JenisPeta, {
  nama: string
  maksPemain: number
  ringkas: string
  warnaDefault: readonly TimPemain[]
}> = {
  klasik2: {
    nama: 'Lembah Klasik (2P)',
    maksPemain: 2,
    ringkas: 'Duel klasik 2 kerajaan · plateau pusat & samping',
    warnaDefault: ['blue', 'red'],
  },
  salib4: {
    nama: 'Pulau Salib (4P)',
    maksPemain: 4,
    ringkas: '4 pulau sudut berjembatan · 4 danau & obelisk tengah',
    warnaDefault: ['blue', 'red', 'green', 'yellow'],
  },
  bintang6: {
    nama: 'Kepulauan Bintang (6P)',
    maksPemain: 6,
    ringkas: '6 pulau melingkar · jembatan & altar batu pusat',
    warnaDefault: ['blue', 'red', 'yellow', 'green', 'purple', 'black'],
  },
}

export const KESULITAN_AI = ['gampang', 'medium', 'susah', 'extreme'] as const
export type KesulitanAi = (typeof KESULITAN_AI)[number]

export const LABEL_KESULITAN: Record<KesulitanAi, string> = {
  gampang: 'AI Gampang',
  medium: 'AI Medium',
  susah: 'AI Susah',
  extreme: 'AI Extreme',
}

export type JenisSlot = 'manusia' | 'ai' | 'kosong'
export type HeroId = 'berserker' | 'king' | 'knight' | 'champion'

export interface KonfigSlot {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
}

export interface KonfigMatch {
  peta: JenisPeta
  goldAwal: number
  slot: KonfigSlot[]
}

export const GOLD_AWAL_BAKU = 320
export const GOLD_AWAL_MIN = 100
export const GOLD_AWAL_MAKS = 10000
export const PRESET_GOLD = [200, 320, 500, 1000, 2000] as const

export function jepitGoldAwal(nilai: number): number {
  if (!Number.isFinite(nilai)) return GOLD_AWAL_BAKU
  return Math.max(GOLD_AWAL_MIN, Math.min(GOLD_AWAL_MAKS, Math.round(nilai)))
}

export function buatSlotDefault(
  peta: JenisPeta,
  namaHost = 'Komandan',
  heroHost: HeroId = 'king',
): KonfigSlot[] {
  const info = INFO_PETA[peta]
  const heroUrut: HeroId[] = ['king', 'champion', 'knight', 'berserker', 'champion', 'knight']
  return info.warnaDefault.map((tim, i) => ({
    indeks: i,
    tim,
    jenis: i === 0 ? 'manusia' : 'ai',
    aliansi: i + 1,
    hero: i === 0 ? heroHost : heroUrut[i % heroUrut.length]!,
    kesulitanAi: 'medium',
    nama: i === 0 ? namaHost : `AI ${WARNA_TIM[tim].nama}`,
  }))
}
