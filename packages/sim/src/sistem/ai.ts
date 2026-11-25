import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN, type JenisBangunan } from '../definisi/bangunan.js'
import { UNIT, type PeranUnit } from '../definisi/unit.js'
import type { Perintah } from '../perintah.js'
import { acakRentang } from '../rng.js'
import type { Bangunan, Dunia } from '../tipe.js'
import { jarak } from '../util.js'
import { supplyMaks, supplyTerpakai } from './ekonomi.js'

export type Kesulitan = 'normal' | 'sulit'

const JEDA: Record<Kesulitan, number> = { normal: 1.6, sulit: 1.0 }
/** Ukuran pasukan sebelum AI menyerang. */
const AMBANG_SERANG: Record<Kesulitan, number> = { normal: 7, sulit: 5 }
/** Berhenti menyerang kalau pasukan tinggal segini — mundur dan kumpulkan lagi. */
const AMBANG_MUNDUR = 2
const PAWN_TARGET = 10

export interface KeadaanAi {
  tim: Tim
  kesulitan: Kesulitan
  timer: number
  menyerang: boolean
}

export function buatAi(tim: Tim, kesulitan: Kesulitan): KeadaanAi {
  return { tim, kesulitan, timer: 1.5, menyerang: false }
}

/** Yang terdekat dari castle — BUKAN yang pertama di array global. */
function terdekat<T extends { x: number; y: number }>(daftar: readonly T[], dari: Bangunan): T | null {
  let terbaik: T | null = null
  let jarakTerbaik = Infinity
  for (const item of daftar) {
    const d = jarak(dari.x, dari.y, item.x, item.y)
    if (d < jarakTerbaik) {
      jarakTerbaik = d
      terbaik = item
    }
  }
  return terbaik
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
  const asli = dunia.tim[tim].sumberDaya
  const s = { gold: asli.gold, kayu: asli.kayu, daging: asli.daging }

  // 1. Pawn menganggur -> sumber daya yang PALING LANGKA, dan yang TERDEKAT
  //    dari castle sendiri. Dua kesalahan yang mematikan ekonomi AI:
  //    memakai indeks global (pawn menyeberangi peta ke tambang lawan), dan
  //    tidak pernah memanen daging sama sekali (tanpa daging, nol pasukan).
  const biayaPasukan = { gold: 70, kayu: 20, daging: 20 }
  const kelangkaan = (): 'gold' | 'kayu' | 'daging' => {
    const rasio = {
      gold: s.gold / biayaPasukan.gold,
      kayu: s.kayu / biayaPasukan.kayu,
      daging: s.daging / biayaPasukan.daging,
    }
    let paling: 'gold' | 'kayu' | 'daging' = 'gold'
    for (const k of ['gold', 'kayu', 'daging'] as const) {
      if (rasio[k] < rasio[paling]) paling = k
    }
    return paling
  }

  for (const p of pawnKu) {
    if (p.tugas !== 'diam') continue
    const butuh = kelangkaan()
    const sasaran =
      butuh === 'gold' ? (terdekat(dunia.tambang, castle) ?? terdekat(dunia.pohon, castle))
      : butuh === 'kayu' ? (terdekat(dunia.pohon, castle) ?? terdekat(dunia.tambang, castle))
      : (terdekat(dunia.domba, castle) ?? terdekat(dunia.daging, castle) ?? terdekat(dunia.tambang, castle))
    if (!sasaran) continue
    perintah.push({ jenis: 'kumpul', ids: [p.id], targetId: (sasaran as { id: number }).id })
    // Perkiraan supaya pawn berikutnya di tick yang sama tidak menumpuk
    // ke sumber daya yang sama persis.
    if (butuh === 'gold') s.gold += 15
    else if (butuh === 'kayu') s.kayu += 12
    else s.daging += 22
  }
  // 2. Jaga jumlah pawn.
  if (pawnKu.length < PAWN_TARGET && sisaSupply >= 1 && castle.antrean.length < 2) {
    perintah.push({ jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
  }

  // 3. Bangun. Urutannya memperluas supply dan produksi lebih dulu.
  const punya = (j: JenisBangunan) => milikku.some((b) => b.jenis === j)
  const sedangBangun = dunia.bangunan.some((b) => b.tim === tim && b.fase === 'konstruksi')
  const perlu: JenisBangunan | null =
    sisaSupply <= 3 ? 'house'
    : !punya('barracks') ? 'barracks'
    : !punya('archery') ? 'archery'
    : !punya('altar') ? 'altar'
    : !punya('monastery') ? 'monastery'
    : s.gold > 600 ? 'house'
    : null

  if (perlu && !sedangBangun) {
    const pembangun = pawnKu[0]
    const def = BANGUNAN[perlu]
    if (pembangun && s.gold >= def.gold && s.kayu >= def.kayu) {
      perintah.push({
        jenis: 'bangun',
        ids: [pembangun.id],
        bangunan: perlu,
        x: castle.x + acakRentang(dunia.rng, -400, 400),
        y: castle.y + acakRentang(dunia.rng, -400, 400),
      })
    }
  }

  // 4. Latih pasukan terus-menerus di setiap bangunan militer.
  for (const b of milikku) {
    if (b.antrean.length >= 2) continue
    const bisa = BANGUNAN[b.jenis].melatih.filter((p) => p !== 'pawn')
    if (bisa.length === 0) continue
    const peran = bisa[Math.floor(acakRentang(dunia.rng, 0, bisa.length)) % bisa.length] as PeranUnit
    const def = UNIT[peran]
    if (sisaSupply < def.pop) continue
    if (s.gold >= def.gold && s.kayu >= def.kayu && s.daging >= def.daging) {
      perintah.push({ jenis: 'latih', bangunanId: b.id, peran })
    }
  }

  // 5. Bangkitkan hero yang gugur kalau sudah punya Altar (PRD §11.3).
  const altar = milikku.find((b) => b.jenis === 'altar')
  if (altar && !altar.revive && dunia.tim[tim].heroGugur && dunia.tim[tim].heroHidup === null) {
    perintah.push({ jenis: 'bangkitkanHero', bangunanId: altar.id })
  }

  // 6. Menyerang, lalu mundur kalau pasukan habis.
  if (!ai.menyerang && tentaraKu.length >= AMBANG_SERANG[ai.kesulitan]) ai.menyerang = true
  if (ai.menyerang && tentaraKu.length <= AMBANG_MUNDUR) ai.menyerang = false

  const lawan: Tim = tim === 'red' ? 'blue' : 'red'
  if (ai.menyerang) {
    // Sasaran terdekat lebih dulu, baru castle — supaya pasukan tidak
    // berjalan melewati bangunan musuh tanpa menyentuhnya.
    const bangunanLawan = dunia.bangunan.filter((b) => b.tim === lawan && b.fase !== 'hancur')
    const sasaran = terdekat(bangunanLawan, castle)
    if (sasaran) {
      perintah.push({ jenis: 'serangPindah', ids: tentaraKu.map((u) => u.id), x: sasaran.x, y: sasaran.y })
      const hero = tentaraKu.find((u) => u.hero)
      if (hero && hero.skillJeda <= 0) perintah.push({ jenis: 'skill', ids: [hero.id] })
    }
  } else if (tentaraKu.length > 0) {
    // Berkumpul di dekat castle sambil menunggu pasukan cukup.
    const nganggur = tentaraKu.filter((u) => u.tugas === 'diam')
    if (nganggur.length > 0) {
      perintah.push({
        jenis: 'pindah', ids: nganggur.map((u) => u.id),
        x: castle.x + acakRentang(dunia.rng, -200, 200),
        y: castle.y + acakRentang(dunia.rng, -200, 200),
      })
    }
  }

  return perintah
}
