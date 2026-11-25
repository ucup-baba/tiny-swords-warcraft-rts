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

export const TIM = ['blue', 'red', 'neutral'] as const
export type Tim = (typeof TIM)[number]
