/** Pack asal sebuah aset. Urutan prioritas: u010 -> free -> custom (PRD §16.1). */
export type Pack = 'u010' | 'free' | 'custom'

export const AKAR: Record<Pack, string> = {
  u010: 'Tiny Swords/Tiny Swords (Update 010)/',
  free: 'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/',
  custom: 'custom_assets/',
}

/** Prioritas numerik; makin kecil makin diutamakan. */
export const PRIORITAS: Record<Pack, number> = { u010: 0, free: 1, custom: 2 }

export interface Aset {
  /** Path relatif terhadap akar pack-nya. */
  file: string
  pack: Pack
  /** Lebar & tinggi satu frame. Untuk sprite tunggal, sama dengan ukuran gambar. */
  fw: number
  fh: number
  /** Jumlah kolom & baris frame dalam sheet. */
  kolom: number
  baris: number
  /** Frame per detik saat dianimasikan. 0 = sprite diam. */
  fps: number
  /**
   * Alasan memakai pack di bawah prioritas tertinggi. WAJIB diisi kalau
   * pack bukan 'u010' — ini yang membuat aturan §16.1 bisa ditegakkan tes
   * tanpa memblokir aset yang memang tidak ada di Update 010.
   */
  alasan?: string
}

export const url = (a: Aset): string => AKAR[a.pack] + a.file

/** Kotak sumber satu frame di dalam sheet. */
export function frame(a: Aset, indeks: number): { sx: number; sy: number; sw: number; sh: number } {
  const total = a.kolom * a.baris
  const i = total > 0 ? ((indeks % total) + total) % total : 0
  return {
    sx: (i % a.kolom) * a.fw,
    sy: Math.floor(i / a.kolom) * a.fh,
    sw: a.fw,
    sh: a.fh,
  }
}

/** Frame yang sedang tampil untuk animasi pada waktu tertentu. */
export function frameWaktu(a: Aset, detik: number, offset = 0): number {
  if (a.fps <= 0) return 0
  return Math.floor(detik * a.fps + offset)
}
