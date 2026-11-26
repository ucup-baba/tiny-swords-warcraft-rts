// Tipe serangan & baju — segitiga counter antar unit (PRD §20).
//
// Tanpa ini semua unit saling mengalahkan dengan cara yang sama: yang menang
// adalah yang jumlahnya lebih banyak, dan pertandingan hanya punya satu fase.

export type JenisSerangan = 'tebas' | 'tusuk' | 'sihir'
export type JenisBaju = 'ringan' | 'berat' | 'pahlawan' | 'bangunan'

/**
 * Pengali kerusakan: `PENGALI[serangan][baju]`.
 *
 * Segitiganya:
 *   tebas  (Pedang, Hero) menghabisi baju RINGAN  — Panah, Sihir, Monk, Pawn
 *   tusuk  (Panah, Tombak) menembus baju BERAT    — Pedang, Tombak
 *   sihir  (Mage)          paling menyakiti HERO
 *
 * Jadi Pedang mengalahkan Panah, Panah mengalahkan Pedang-berat lain, dan
 * Mage adalah jawaban untuk hero — masing-masing punya lawan yang jelas.
 */
export const PENGALI: Record<JenisSerangan, Record<JenisBaju, number>> = {
  tebas: { ringan: 1.35, berat: 0.80, pahlawan: 0.85, bangunan: 0.50 },
  tusuk: { ringan: 0.75, berat: 1.40, pahlawan: 1.00, bangunan: 0.35 },
  sihir: { ringan: 1.00, berat: 1.00, pahlawan: 1.25, bangunan: 0.30 },
}

export const pengali = (serangan: JenisSerangan, baju: JenisBaju): number =>
  PENGALI[serangan][baju]

/** Nama yang bisa ditampilkan di UI. */
export const NAMA_SERANGAN: Record<JenisSerangan, string> = {
  tebas: 'Tebas', tusuk: 'Tusuk', sihir: 'Sihir',
}
export const NAMA_BAJU: Record<JenisBaju, string> = {
  ringan: 'Ringan', berat: 'Berat', pahlawan: 'Pahlawan', bangunan: 'Bangunan',
}

/** Teks singkat "kuat/lemah terhadap" untuk kartu unit di sidebar. */
export function ringkasCounter(serangan: JenisSerangan): { kuat: string; lemah: string } {
  const baris = PENGALI[serangan]
  const urut = (Object.keys(baris) as JenisBaju[])
    .filter((b) => b !== 'bangunan')
    .sort((a, b) => baris[b] - baris[a])
  return { kuat: NAMA_BAJU[urut[0]!], lemah: NAMA_BAJU[urut[urut.length - 1]!] }
}
