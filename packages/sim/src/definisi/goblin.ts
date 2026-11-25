// Faksi Goblin netral (PRD §10). Asetnya sudah lengkap di Update 010 dan
// sebelum ini sama sekali tidak dipakai.

export type PeranGoblin = 'torch' | 'tnt' | 'barrel'

export interface DefGoblin {
  nama: string
  hp: number
  dmg: number
  jarak: number
  jeda: number
  kecepatan: number
  /** Gold yang langsung masuk ke pembunuhnya — tidak perlu diangkut Pawn. */
  gold: number
  /** XP hero, hanya kalau hero ada dalam RADIUS_XP saat goblin mati. */
  xp: number
  /** Barrel meledak saat kontak lalu mati. */
  bomDiri?: boolean
  area?: boolean
}

export const GOBLIN: Record<PeranGoblin, DefGoblin> = {
  torch: { nama: 'Goblin Torch', hp: 120, dmg: 16, jarak: 48, jeda: 1.0, kecepatan: 118, gold: 25, xp: 12 },
  tnt: { nama: 'Goblin TNT', hp: 95, dmg: 22, jarak: 220, jeda: 1.6, kecepatan: 105, gold: 35, xp: 18, area: true },
  barrel: { nama: 'Goblin Barrel', hp: 70, dmg: 45, jarak: 36, jeda: 2.0, kecepatan: 150, gold: 15, xp: 8, bomDiri: true, area: true },
}

/** Perilaku camp (PRD §10.3). */
export const CAMP = {
  /** Radius aggro: goblin diam saja sampai ada musuh sedekat ini. */
  radiusAggro: 280,
  /** Mengejar paling jauh sejauh ini dari titik camp, lalu kembali. */
  tali: 420,
  /** Pemulihan HP per detik saat kembali ke camp. */
  sembuhPulang: 8,
  /** Detik sampai camp yang dibersihkan terisi penuh lagi. */
  respawn: 150,
  /** Peringatan di minimap sekian detik sebelum respawn. */
  peringatan: 10,
} as const

export type JenisCamp = 'kecil' | 'besar'

/** Isi tiap tipe camp (PRD §10.5). */
export const ISI_CAMP: Record<JenisCamp, readonly PeranGoblin[]> = {
  kecil: ['torch', 'torch', 'tnt'],
  besar: ['torch', 'torch', 'torch', 'tnt', 'tnt', 'barrel'],
}
