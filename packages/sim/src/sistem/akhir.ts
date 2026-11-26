import { DT_TETAP, type Tim, type TimPemain } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import type { Dunia } from '../tipe.js'

/**
 * Grace sebelum mati-ekonomi menjadi kekalahan (PRD §13.1).
 */
export const GRACE_MATI_EKONOMI = 20

function punyaCastle(dunia: Dunia, tim: Tim): boolean {
  return dunia.bangunan.some((b) => b.tim === tim && b.jenis === 'castle' && b.fase !== 'hancur')
}

function punyaPawn(dunia: Dunia, tim: Tim): boolean {
  return dunia.unit.some((u) => u.tim === tim && u.peran === 'pawn')
}

export function pemainMasihHidup(dunia: Dunia, tim: TimPemain): boolean {
  const k = dunia.tim[tim]
  if (k.menyerah) return false
  if (punyaCastle(dunia, tim)) return true
  if (!punyaPawn(dunia, tim)) return false
  return !(k.sumberDaya.gold < BANGUNAN.castle.gold && k.matiEkonomiDetik >= GRACE_MATI_EKONOMI)
}

export function timMenang(dunia: Dunia, tim: Tim): boolean {
  if (dunia.hasil.jenis !== 'menang') return false
  if (dunia.hasil.tim === tim) return true
  if (tim === 'neutral' || dunia.hasil.tim === 'neutral') return false
  return dunia.aliansi[dunia.hasil.tim] === dunia.aliansi[tim]
}

export function langkahAkhir(dunia: Dunia): void {
  if (dunia.hasil.jenis !== 'berlangsung') return

  const bertahan: TimPemain[] = []

  for (const tim of dunia.pemainAktif) {
    const k = dunia.tim[tim]

    if (k.menyerah) continue

    // Selama masih punya castle, tim ini hidup.
    if (punyaCastle(dunia, tim)) {
      k.matiEkonomiDetik = 0
      bertahan.push(tim)
      continue
    }

    // Castle habis. Tanpa pawn tidak ada yang bisa membangun lagi: langsung kalah.
    if (!punyaPawn(dunia, tim)) continue

    // Masih punya pawn: diberi kesempatan membangun castle baru. Kalah hanya
    // kalau gold-nya tetap di bawah biaya castle selama GRACE_MATI_EKONOMI detik.
    if (dunia.tim[tim].sumberDaya.gold < BANGUNAN.castle.gold) {
      k.matiEkonomiDetik += DT_TETAP
      if (k.matiEkonomiDetik < GRACE_MATI_EKONOMI) bertahan.push(tim)
    } else {
      k.matiEkonomiDetik = 0
      bertahan.push(tim)
    }
  }

  if (bertahan.length === 0) {
    // Saling menghabisi dalam langkah yang sama (PRD §13.2).
    dunia.hasil = { jenis: 'draw' }
  } else {
    const aliansiHidup = new Set(bertahan.map((t) => dunia.aliansi[t]))
    if (aliansiHidup.size > 1) return
    dunia.hasil = {
      jenis: 'menang',
      tim: bertahan[0]!,
    }
  }

  dunia.kejadian.push({ jenis: 'matchSelesai', hasil: dunia.hasil })
}
