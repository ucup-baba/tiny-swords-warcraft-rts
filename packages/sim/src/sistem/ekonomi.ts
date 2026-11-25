import type { Tim } from '@hftf/shared'
import { BANGUNAN, SUPPLY_MAKS } from '../definisi/bangunan.js'
import { UNIT } from '../definisi/unit.js'
import type { Dunia, JenisBawaan } from '../tipe.js'

/** Jumlah per antaran (PRD §2). */
export const PANEN = {
  kayuPerAntar: 12,
  goldPerAntar: 15,
  dagingDomba: 22,
  dagingJatuh: 18,
  /** Detik untuk satu kali ayunan panen. */
  detikPerPanen: 1.2,
  /** Muatan maksimum sebelum pawn harus pulang. */
  muatanMaks: 1,
} as const

/** Kapasitas populasi tim ini sekarang (PRD §2). */
export function supplyMaks(dunia: Dunia, tim: Tim): number {
  let total = 0
  for (const b of dunia.bangunan) {
    if (b.tim !== tim || b.fase !== 'aktif') continue
    total += BANGUNAN[b.jenis].supply
  }
  return Math.min(total, SUPPLY_MAKS)
}

/**
 * Populasi terpakai. Hero TIDAK memakan supply (PRD §11.1) — ini sengaja
 * berbeda dari biaya pop di tabel §4B, yang hanya berlaku kalau hero dilatih
 * sebagai unit biasa. Di Revisi 2.0 hero tidak pernah dilatih seperti itu.
 */
export function supplyTerpakai(dunia: Dunia, tim: Tim): number {
  let total = 0
  for (const u of dunia.unit) {
    if (u.tim !== tim || u.hero) continue
    total += UNIT[u.peran].pop
  }
  for (const b of dunia.bangunan) {
    if (b.tim !== tim || b.fase !== 'aktif') continue
    for (const a of b.antrean) {
      if (!UNIT[a.peran].hero) total += UNIT[a.peran].pop
    }
  }
  return total
}

export function mampuBayar(dunia: Dunia, tim: Tim, gold: number, kayu: number, daging: number): boolean {
  const s = dunia.tim[tim].sumberDaya
  return s.gold >= gold && s.kayu >= kayu && s.daging >= daging
}

export function bayar(dunia: Dunia, tim: Tim, gold: number, kayu: number, daging: number): boolean {
  if (!mampuBayar(dunia, tim, gold, kayu, daging)) return false
  const s = dunia.tim[tim].sumberDaya
  s.gold -= gold
  s.kayu -= kayu
  s.daging -= daging
  return true
}

export function kembalikan(dunia: Dunia, tim: Tim, gold: number, kayu: number, daging: number): void {
  const s = dunia.tim[tim].sumberDaya
  s.gold += gold
  s.kayu += kayu
  s.daging += daging
}

/** Menambah sumber daya hasil panen dan mencatat statistiknya. */
export function terima(dunia: Dunia, tim: Tim, jenis: JenisBawaan, jumlah: number, x: number, y: number): void {
  const k = dunia.tim[tim]
  if (jenis === 'kayu') {
    k.sumberDaya.kayu += jumlah
    k.statistik.kayuTerkumpul += jumlah
  } else if (jenis === 'gold') {
    k.sumberDaya.gold += jumlah
    k.statistik.goldTerkumpul += jumlah
  } else {
    k.sumberDaya.daging += jumlah
    k.statistik.dagingTerkumpul += jumlah
    k.statistik.dagingDipungut += jumlah
  }
  dunia.kejadian.push({ jenis: 'sumberDayaMasuk', tim, jenis2: jenis, jumlah, x, y })
}
