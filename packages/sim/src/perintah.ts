import type { Tim } from '@hftf/shared'
import type { JenisBangunan } from './definisi/bangunan.js'
import type { PeranUnit } from './definisi/unit.js'

/**
 * Satu-satunya jalan mengubah state (PRD §8.2 poin 5). Sumbernya boleh input
 * lokal, AI solo, atau jaringan — jalurnya sama persis, jadi bug tidak bisa
 * bersembunyi di satu jalur saja.
 */
export type Perintah =
  | { jenis: 'pindah'; ids: readonly number[]; x: number; y: number }
  | { jenis: 'serangPindah'; ids: readonly number[]; x: number; y: number }
  | { jenis: 'serang'; ids: readonly number[]; targetId: number }
  | { jenis: 'stop'; ids: readonly number[] }
  | { jenis: 'tahan'; ids: readonly number[] }
  | { jenis: 'kumpul'; ids: readonly number[]; targetId: number }
  | { jenis: 'perbaiki'; ids: readonly number[]; targetId: number }
  | { jenis: 'bangun'; ids: readonly number[]; bangunan: JenisBangunan; x: number; y: number }
  | { jenis: 'skill'; ids: readonly number[] }
  | { jenis: 'latih'; bangunanId: number; peran: PeranUnit }
  | { jenis: 'batalLatih'; bangunanId: number; indeks: number }
  | { jenis: 'rally'; bangunanId: number; x: number; y: number }
  | { jenis: 'bangkitkanHero'; bangunanId: number }
  | { jenis: 'menyerah' }

/** Perintah beserta tim yang mengirimnya. Host memberi stempel tim ke perintah guest. */
export interface PerintahTim {
  tim: Tim
  perintah: Perintah
}
