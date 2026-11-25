import { PAPAN } from '@hftf/shared'

/** Pesan dari perangkat ke papan. */
export type KePapan =
  | { t: 'halo'; nama: string }
  | { t: 'buat-room'; hero: string }
  | { t: 'gabung-room'; kode: string; hero: string }
  | { t: 'keluar-room' }
  | { t: 'mulai' }
  | { t: 'sambung-ulang'; kode: string; token: string }
  | { t: 'cmd'; cmd: unknown }
  | { t: 'snapshot'; state: unknown }
  | { t: 'denyut' }

/** Pesan dari papan ke perangkat. */
export type DariPapan =
  | { t: 'halo'; id: string; token: string }
  | { t: 'daftar'; room: RingkasRoom[] }
  | { t: 'room'; kode: string; peran: 'host' | 'tamu'; tim: 'blue' | 'red'; ringkas: RingkasRoom }
  | { t: 'mulai'; seed: number; tim: 'blue' | 'red'; heroBlue: string; heroRed: string }
  | { t: 'cmd'; tim: 'blue' | 'red'; cmd: unknown }
  | { t: 'snapshot'; state: unknown }
  | { t: 'lawan-putus'; detik: number }
  | { t: 'lawan-kembali' }
  | { t: 'lawan-menyerah' }
  | { t: 'galat'; pesan: string }

export interface RingkasRoom {
  kode: string
  hostNama: string
  tamuNama: string | null
  jumlah: number
  mulai: boolean
}

const teks = (v: unknown, maks: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= maks

/**
 * Validasi skema KETAT untuk setiap pesan masuk (PRD §15.3 poin 5).
 *
 * `lan-server.mjs` lama merelay `cmd` dan `state` mentah-mentah: guest bisa
 * mengirim bentuk apa pun ke host. Di sini bentuk yang tidak dikenal dibuang
 * sebelum menyentuh logika apa pun.
 */
export function pesanSah(x: unknown): KePapan | null {
  if (!x || typeof x !== 'object') return null
  const m = x as Record<string, unknown>
  switch (m['t']) {
    case 'halo':
      return teks(m['nama'], 18) ? { t: 'halo', nama: m['nama'] } : null
    case 'buat-room':
      return teks(m['hero'], 16) ? { t: 'buat-room', hero: m['hero'] } : null
    case 'gabung-room':
      return teks(m['kode'], 8) && teks(m['hero'], 16)
        ? { t: 'gabung-room', kode: m['kode'].toUpperCase(), hero: m['hero'] }
        : null
    case 'sambung-ulang':
      return teks(m['kode'], 8) && teks(m['token'], 64)
        ? { t: 'sambung-ulang', kode: m['kode'].toUpperCase(), token: m['token'] }
        : null
    case 'keluar-room':
      return { t: 'keluar-room' }
    case 'mulai':
      return { t: 'mulai' }
    case 'denyut':
      return { t: 'denyut' }
    case 'cmd':
      // Isi cmd divalidasi lagi oleh sim; di sini cukup dipastikan ada & kecil.
      return m['cmd'] && typeof m['cmd'] === 'object' ? { t: 'cmd', cmd: m['cmd'] } : null
    case 'snapshot':
      return m['state'] && typeof m['state'] === 'object' ? { t: 'snapshot', state: m['state'] } : null
    default:
      return null
  }
}

export { PAPAN }
