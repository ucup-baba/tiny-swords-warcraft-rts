import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import type { Dunia } from '../tipe.js'

/**
 * Grace sebelum mati-ekonomi menjadi kekalahan (PRD §13.1).
 *
 * CATATAN REVISI: PRD §13.1 versi pertama membuat poin 2 mustahil tercapai —
 * poin 1 ("semua castle hancur = kalah") sudah memicu kekalahan lebih dulu,
 * sehingga syarat "tidak punya castle DAN tidak punya pawn DAN gold kurang"
 * tidak pernah sempat dievaluasi. Di sini keduanya digabung supaya dua-duanya
 * hidup: castle habis + tanpa pawn = langsung kalah; castle habis + punya pawn
 * = diberi grace untuk membangun castle baru.
 */
export const GRACE_MATI_EKONOMI = 20

const PEMAIN: readonly Tim[] = ['blue', 'red']

function punyaCastle(dunia: Dunia, tim: Tim): boolean {
  return dunia.bangunan.some((b) => b.tim === tim && b.jenis === 'castle' && b.fase !== 'hancur')
}

function punyaPawn(dunia: Dunia, tim: Tim): boolean {
  return dunia.unit.some((u) => u.tim === tim && u.peran === 'pawn')
}

export function langkahAkhir(dunia: Dunia): void {
  if (dunia.hasil.jenis !== 'berlangsung') return

  const kalah: Record<string, boolean> = {}

  for (const tim of PEMAIN) {
    const k = dunia.tim[tim]

    if (k.menyerah) {
      kalah[tim] = true
      continue
    }

    // Selama masih punya castle, tim ini hidup.
    if (punyaCastle(dunia, tim)) {
      k.matiEkonomiDetik = 0
      continue
    }

    // Castle habis. Tanpa pawn tidak ada yang bisa membangun lagi: langsung kalah.
    if (!punyaPawn(dunia, tim)) {
      kalah[tim] = true
      continue
    }

    // Masih punya pawn: diberi kesempatan membangun castle baru. Kalah hanya
    // kalau gold-nya tetap di bawah biaya castle selama GRACE_MATI_EKONOMI detik.
    if (dunia.tim[tim].sumberDaya.gold < BANGUNAN.castle.gold) {
      k.matiEkonomiDetik += DT_TETAP
      if (k.matiEkonomiDetik >= GRACE_MATI_EKONOMI) kalah[tim] = true
    } else {
      k.matiEkonomiDetik = 0
    }
  }

  const blueKalah = kalah['blue'] === true
  const redKalah = kalah['red'] === true

  if (blueKalah && redKalah) {
    // Saling menghabisi dalam langkah yang sama (PRD §13.2).
    dunia.hasil = { jenis: 'draw' }
  } else if (blueKalah) {
    dunia.hasil = { jenis: 'menang', tim: 'red' }
  } else if (redKalah) {
    dunia.hasil = { jenis: 'menang', tim: 'blue' }
  } else {
    return
  }

  dunia.kejadian.push({ jenis: 'matchSelesai', hasil: dunia.hasil })
}
