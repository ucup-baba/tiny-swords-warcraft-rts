import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN, type JenisBangunan } from '../definisi/bangunan.js'
import { UNIT, type PeranUnit } from '../definisi/unit.js'
import type { Dunia } from '../tipe.js'
import type { Perintah } from '../perintah.js'
import { acakRentang } from '../rng.js'
import { supplyMaks, supplyTerpakai } from './ekonomi.js'

export type Kesulitan = 'normal' | 'sulit'

/** Jeda antar keputusan AI, dalam detik. */
const JEDA: Record<Kesulitan, number> = { normal: 2.2, sulit: 1.3 }
/** Ukuran pasukan sebelum AI menyerang. */
const AMBANG_SERANG: Record<Kesulitan, number> = { normal: 8, sulit: 6 }

export interface KeadaanAi {
  tim: Tim
  kesulitan: Kesulitan
  timer: number
  menyerang: boolean
}

export function buatAi(tim: Tim, kesulitan: Kesulitan): KeadaanAi {
  return { tim, kesulitan, timer: 1.5, menyerang: false }
}

/**
 * AI mengeluarkan Perintah yang sama persis dengan yang dipakai pemain manusia
 * (PRD §8.2 poin 5) — jadi bug tidak bisa bersembunyi di jalur AI saja.
 */
export function langkahAi(dunia: Dunia, ai: KeadaanAi): Perintah[] {
  ai.timer -= DT_TETAP
  if (ai.timer > 0) return []
  ai.timer = JEDA[ai.kesulitan]

  const perintah: Perintah[] = []
  const tim = ai.tim
  const milikku = dunia.bangunan.filter((b) => b.tim === tim && b.fase === 'aktif')
  const castle = milikku.find((b) => b.jenis === 'castle')
  if (!castle) return perintah

  const pawnKu = dunia.unit.filter((u) => u.tim === tim && u.peran === 'pawn')
  const tentaraKu = dunia.unit.filter((u) => u.tim === tim && u.peran !== 'pawn')
  const sisaSupply = supplyMaks(dunia, tim) - supplyTerpakai(dunia, tim)

  // 1. Pawn menganggur disuruh menambang atau menebang.
  for (const p of pawnKu) {
    if (p.tugas !== 'diam') continue
    const tambang = dunia.tambang[0]
    const pohon = dunia.pohon[0]
    if (tambang && pawnKu.indexOf(p) % 2 === 0) {
      perintah.push({ jenis: 'kumpul', ids: [p.id], targetId: tambang.id })
    } else if (pohon) {
      perintah.push({ jenis: 'kumpul', ids: [p.id], targetId: pohon.id })
    }
  }

  // 2. Jaga jumlah pawn.
  if (pawnKu.length < 6 && sisaSupply >= 1 && castle.antrean.length === 0) {
    perintah.push({ jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
  }

  // 3. Bangun kalau supply mepet atau belum punya bangunan militer.
  const perlu: JenisBangunan | null =
    sisaSupply <= 2 ? 'house'
    : !milikku.some((b) => b.jenis === 'barracks') ? 'barracks'
    : !milikku.some((b) => b.jenis === 'archery') ? 'archery'
    : !milikku.some((b) => b.jenis === 'altar') ? 'altar'
    : null

  const pembangun = pawnKu.find((p) => p.tugas !== 'bangun')
  if (perlu && pembangun) {
    const def = BANGUNAN[perlu]
    const s = dunia.tim[tim].sumberDaya
    if (s.gold >= def.gold && s.kayu >= def.kayu) {
      perintah.push({
        jenis: 'bangun',
        ids: [pembangun.id],
        bangunan: perlu,
        x: castle.x + acakRentang(dunia.rng, -320, 320),
        y: castle.y + acakRentang(dunia.rng, -320, 320),
      })
    }
  }

  // 4. Latih pasukan di bangunan militer yang antreannya kosong.
  for (const b of milikku) {
    if (b.antrean.length > 0) continue
    const bisa = BANGUNAN[b.jenis].melatih.filter((p) => p !== 'pawn')
    if (bisa.length === 0) continue
    const peran = bisa[acakBulatAman(dunia, bisa.length)] as PeranUnit
    const def = UNIT[peran]
    if (sisaSupply < def.pop) continue
    const s = dunia.tim[tim].sumberDaya
    if (s.gold >= def.gold && s.kayu >= def.kayu && s.daging >= def.daging) {
      perintah.push({ jenis: 'latih', bangunanId: b.id, peran })
    }
  }

  // 5. Menyerang begitu pasukan cukup besar.
  if (!ai.menyerang && tentaraKu.length >= AMBANG_SERANG[ai.kesulitan]) ai.menyerang = true
  if (ai.menyerang && tentaraKu.length === 0) ai.menyerang = false

  if (ai.menyerang) {
    const lawan = tim === 'red' ? 'blue' : 'red'
    const sasaran =
      dunia.bangunan.find((b) => b.tim === lawan && b.jenis === 'castle' && b.fase !== 'hancur') ??
      dunia.bangunan.find((b) => b.tim === lawan && b.fase !== 'hancur')
    if (sasaran) {
      const ids = tentaraKu.map((u) => u.id)
      perintah.push({ jenis: 'serangPindah', ids, x: sasaran.x, y: sasaran.y })
      const hero = tentaraKu.find((u) => u.hero)
      if (hero && hero.skillJeda <= 0) perintah.push({ jenis: 'skill', ids: [hero.id] })
    }
  }

  return perintah
}

function acakBulatAman(dunia: Dunia, n: number): number {
  return Math.floor(acakRentang(dunia.rng, 0, n)) % n
}
