import type { Tim } from '@hftf/shared'
import type { Rng } from './rng.js'

/**
 * Entitas rangka M0. Sistem sebenarnya (ekonomi, bangunan, tempur, hero)
 * diisi di M1 — lihat PRD §18.
 */
export interface Entitas {
  id: number
  tim: Tim
  x: number
  y: number
  /** Tujuan gerak. Sama dengan posisi berarti diam. */
  tx: number
  ty: number
  hp: number
  kecepatan: number
}

export interface Dunia {
  /** Jumlah langkah yang sudah dijalankan. Bukan waktu dinding. */
  tick: number
  rng: Rng
  entitas: Entitas[]
  idBerikut: number
}

/**
 * Satu-satunya jalan mengubah state (PRD §8.2 poin 5). Sumbernya boleh input
 * lokal, AI, atau jaringan — jalurnya sama persis.
 */
export type Perintah =
  | { jenis: 'spawn'; tim: Tim; x: number; y: number }
  | { jenis: 'pindah'; ids: readonly number[]; x: number; y: number }
  | { jenis: 'lukai'; id: number; jumlah: number }
