import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN, SUPPLY_MAKS, type JenisBangunan } from '../definisi/bangunan.js'
import { UNIT, type PeranUnit } from '../definisi/unit.js'
import type { Perintah } from '../perintah.js'
import { acakRentang, buatRng, type Rng } from '../rng.js'
import type { Bangunan, Dunia, Unit } from '../tipe.js'
import { jarak } from '../util.js'
import { supplyMaks, supplyTerpakai } from './ekonomi.js'

export type Kesulitan = 'normal' | 'sulit'

interface Setelan {
  /** Jeda antar keputusan, detik. */
  jeda: number
  /** Pawn yang dituju. Lebih dari ini hanya memakan supply. */
  pawn: number
  /** Sisa supply yang dijaga; di bawah ini House jadi prioritas utama. */
  bantalanSupply: number
  /** Besar pasukan penyerang sebelum berangkat. */
  ambangSerang: number
  /** Porsi pasukan yang ditinggal menjaga basis. */
  porsiJaga: number
  /** Konstruksi paralel yang diizinkan. */
  bangunParalel: number
}

const SETELAN: Record<Kesulitan, Setelan> = {
  normal: { jeda: 1.4, pawn: 9, bantalanSupply: 8, ambangSerang: 11, porsiJaga: 0.35, bangunParalel: 2 },
  sulit: { jeda: 0.9, pawn: 11, bantalanSupply: 10, ambangSerang: 9, porsiJaga: 0.28, bangunParalel: 3 },
}

export interface KeadaanAi {
  tim: Tim
  kesulitan: Kesulitan
  timer: number
  /**
   * RNG MILIK AI INI SENDIRI.
   *
   * Sebelumnya kedua AI menarik dari dunia.rng yang sama, jadi perilaku mereka
   * terkopel dan hasil match bergantung pada urutan pemanggilan — merah menang
   * 10-5 kalau dipanggil duluan, padahal petanya simetris sempurna.
   */
  rng: Rng
  /** Pasukan yang sedang menyerang; sisanya menjaga basis. */
  penyerang: Set<number>
  menyerang: boolean
  /** Ukuran pasukan penyerang saat puncak, untuk memutuskan mundur. */
  puncakSerang: number
}

export function buatAi(tim: Tim, kesulitan: Kesulitan, seed = 1): KeadaanAi {
  return {
    tim,
    kesulitan,
    timer: 1.5,
    // Seed dibedakan per tim supaya dua AI tidak pernah identik maupun terkopel.
    rng: buatRng(seed ^ (tim === 'blue' ? 0x5bf03635 : 0x27d4eb2f)),
    penyerang: new Set(),
    menyerang: false,
    puncakSerang: 0,
  }
}

/** Yang terdekat dari sebuah titik — BUKAN yang pertama di array global. */
function terdekat<T extends { x: number; y: number }>(daftar: readonly T[], dari: { x: number; y: number }): T | null {
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
  const set = SETELAN[ai.kesulitan]
  ai.timer = set.jeda

  const perintah: Perintah[] = []
  const tim = ai.tim
  const aktif = dunia.bangunan.filter((b) => b.tim === tim && b.fase === 'aktif')
  const castle = aktif.find((b) => b.jenis === 'castle')
  const sd = dunia.tim[tim].sumberDaya

  // Tanpa castle, prioritas satu-satunya adalah membangun castle baru
  // (PRD §13.1: masih punya Pawn + Gold berarti masih bisa bangkit).
  if (!castle) return bangunUlangCastle(dunia, ai, perintah)

  const pawnKu = dunia.unit.filter((u) => u.tim === tim && u.peran === 'pawn')
  const tentaraKu = dunia.unit.filter((u) => u.tim === tim && u.peran !== 'pawn')
  const maks = supplyMaks(dunia, tim)
  const sisaSupply = maks - supplyTerpakai(dunia, tim)

  aturPekerja(dunia, ai, pawnKu, castle, perintah)

  // --- Pawn: cukup saja. Pawn berlebih memakan supply yang seharusnya pasukan.
  if (pawnKu.length < set.pawn && sisaSupply >= 2 && castle.antrean.length < 2) {
    perintah.push({ jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
  }

  aturPembangunan(dunia, ai, set, aktif, pawnKu, castle, sisaSupply, maks, perintah)
  aturPerbaikan(dunia, ai, pawnKu, perintah)
  aturPelatihan(dunia, ai, aktif, sisaSupply, perintah)

  // --- Bangkitkan hero yang gugur (PRD §11.3).
  const altar = aktif.find((b) => b.jenis === 'altar')
  if (altar && !altar.revive && dunia.tim[tim].heroGugur && dunia.tim[tim].heroHidup === null) {
    perintah.push({ jenis: 'bangkitkanHero', bangunanId: altar.id })
  }

  aturMiliter(dunia, ai, set, tentaraKu, castle, perintah)
  void sd
  return perintah
}

// ---------------------------------------------------------------------------

function bangunUlangCastle(dunia: Dunia, ai: KeadaanAi, perintah: Perintah[]): Perintah[] {
  const pawn = dunia.unit.find((u) => u.tim === ai.tim && u.peran === 'pawn')
  const sd = dunia.tim[ai.tim].sumberDaya
  if (!pawn) return perintah
  if (sd.gold < BANGUNAN.castle.gold || sd.kayu < BANGUNAN.castle.kayu) {
    // Belum mampu: kumpulkan sumber daya dulu.
    const sasaran = terdekat(dunia.tambang, pawn) ?? terdekat(dunia.pohon, pawn)
    if (sasaran) perintah.push({ jenis: 'kumpul', ids: [pawn.id], targetId: (sasaran as { id: number }).id })
    return perintah
  }
  perintah.push({
    jenis: 'bangun', ids: [pawn.id], bangunan: 'castle',
    x: pawn.x + acakRentang(ai.rng, -200, 200),
    y: pawn.y + acakRentang(ai.rng, -200, 200),
  })
  return perintah
}

/** Sumber daya yang sedang dipanen seorang pawn, dari tugasnya. */
function sumberPawn(u: Unit): 'gold' | 'kayu' | 'daging' | null {
  if (u.tugas === 'tambang') return 'gold'
  if (u.tugas === 'tebang') return 'kayu'
  if (u.tugas === 'gembala' || u.tugas === 'pungut') return 'daging'
  if (u.tugas === 'pulang') return u.bawaanJenis
  return null
}

/**
 * Menempatkan pawn ke sumber daya paling langka.
 *
 * Versi pertama hanya menyentuh pawn yang MENGANGGUR. Karena siklus panen
 * selalu kembali ke sumber yang sama, pawn yang di menit pertama dikirim ke
 * tambang tidak pernah pindah seumur match: gold menumpuk 2.800 sementara kayu
 * mentok di 20, dan ekspansi maupun perbaikan tidak pernah mampu dibayar.
 * Sekarang satu pawn dialihkan tiap keputusan selama ketimpangannya besar.
 */
function aturPekerja(
  dunia: Dunia, ai: KeadaanAi, pawnKu: Unit[], castle: Bangunan, perintah: Perintah[],
): void {
  const sd = dunia.tim[ai.tim].sumberDaya
  // Bobot mencerminkan permintaan NYATA: bangunan boros kayu (Castle 220,
  // Barracks 90, House 50), bukan hanya biaya satu unit pasukan.
  const harga = { gold: 70, kayu: 45, daging: 20 }
  const rasio = {
    gold: sd.gold / harga.gold,
    kayu: sd.kayu / harga.kayu,
    daging: sd.daging / harga.daging,
  }
  let butuh: 'gold' | 'kayu' | 'daging' = 'gold'
  for (const k of ['gold', 'kayu', 'daging'] as const) if (rasio[k] < rasio[butuh]) butuh = k

  const kirim = (p: Unit, jenis: 'gold' | 'kayu' | 'daging'): boolean => {
    const sasaran =
      jenis === 'gold' ? terdekat(dunia.tambang, castle)
      : jenis === 'kayu' ? terdekat(dunia.pohon, castle)
      : (terdekat(dunia.domba, castle) ?? terdekat(dunia.daging, castle))
    const cadangan = terdekat(dunia.tambang, castle) ?? terdekat(dunia.pohon, castle)
    const pilih = sasaran ?? cadangan
    if (!pilih) return false
    perintah.push({ jenis: 'kumpul', ids: [p.id], targetId: (pilih as { id: number }).id })
    return true
  }

  // Semua pawn menganggur langsung diberi tugas.
  let adaYangDiberiTugas = false
  for (const p of pawnKu) {
    if (p.tugas !== 'diam') continue
    if (kirim(p, butuh)) adaYangDiberiTugas = true
  }
  if (adaYangDiberiTugas) return

  // Tidak ada yang menganggur: alihkan SATU pawn dari sumber paling berlimpah
  // ke yang paling langka, selama ketimpangannya cukup besar.
  const hitung = { gold: 0, kayu: 0, daging: 0 }
  for (const p of pawnKu) {
    const s = sumberPawn(p)
    if (s) hitung[s]++
  }
  const bekerja = hitung.gold + hitung.kayu + hitung.daging
  if (bekerja < 2) return
  if (hitung[butuh] / bekerja >= 0.34) return

  let berlimpah: 'gold' | 'kayu' | 'daging' = 'gold'
  for (const k of ['gold', 'kayu', 'daging'] as const) if (hitung[k] > hitung[berlimpah]) berlimpah = k
  if (berlimpah === butuh || hitung[berlimpah] < 2) return

  const pindah = pawnKu.find((p) => sumberPawn(p) === berlimpah && p.tugas !== 'pulang')
  if (pindah) kirim(pindah, butuh)
}

/**
 * Pawn memperbaiki bangunan yang rusak parah.
 *
 * Mekanisme repair sudah ada sejak M1 tapi AI tidak pernah memakainya, jadi
 * setiap kerusakan bersifat permanen dan basis pelan-pelan hancur sendiri.
 */
function aturPerbaikan(dunia: Dunia, ai: KeadaanAi, pawnKu: Unit[], perintah: Perintah[]): void {
  if (dunia.tim[ai.tim].sumberDaya.kayu < 60) return
  const rusak = dunia.bangunan.find(
    (b) => b.tim === ai.tim && b.fase === 'aktif' && b.hp < b.hpMaks * 0.6)
  if (!rusak) return
  // Pawn yang sedang membangun jangan diganggu; ambil yang sedang memanen.
  const tukang = pawnKu.find((p) => p.tugas !== 'bangun' && p.tugas !== 'perbaiki')
  if (!tukang) return
  perintah.push({ jenis: 'perbaiki', ids: [tukang.id], targetId: rusak.id })
}

/**
 * Urutan bangun. Supply dijaga punya bantalan: kalau tidak, gold menumpuk
 * ribuan sementara pasukan mentok di 7 unit — itu yang membuat match selesai
 * dalam 2 menit.
 */
function aturPembangunan(
  dunia: Dunia, ai: KeadaanAi, set: Setelan, aktif: Bangunan[], pawnKu: Unit[],
  castle: Bangunan, sisaSupply: number, maks: number, perintah: Perintah[],
): void {
  const sedangBangun = dunia.bangunan.filter((b) => b.tim === ai.tim && b.fase === 'konstruksi').length
  if (sedangBangun >= set.bangunParalel) return

  const sd = dunia.tim[ai.tim].sumberDaya
  const punya = (j: JenisBangunan): number => aktif.filter((b) => b.jenis === j).length
  const belumMentok = maks < SUPPLY_MAKS

  const perlu: JenisBangunan | null =
    (sisaSupply < set.bantalanSupply && belumMentok) ? 'house'
    : punya('barracks') === 0 ? 'barracks'
    : punya('archery') === 0 ? 'archery'
    : punya('altar') === 0 ? 'altar'
    : punya('monastery') === 0 ? 'monastery'
    // Menara di dekat castle: membuat serbuan tidak otomatis berhasil.
    : punya('tower') < 2 ? 'tower'
    // Castle KEDUA. Karena kalah berarti semua castle hancur (PRD §13.1),
    // ekspansi membuat satu serbuan berhasil tidak langsung mengakhiri match -
    // dan itu yang membedakan pertandingan panjang dari yang selesai 4 menit.
    : (punya('castle') < 2 && sd.gold > BANGUNAN.castle.gold + 250) ? 'castle'
    : punya('barracks') < 2 ? 'barracks'
    : punya('tower') < 4 ? 'tower'
    : (belumMentok && sd.gold > 500) ? 'house'
    : null

  if (!perlu) return
  const def = BANGUNAN[perlu]
  if (sd.gold < def.gold || sd.kayu < def.kayu) return

  const pembangun = pawnKu.find((p) => p.tugas !== 'bangun') ?? pawnKu[0]
  if (!pembangun) return

  // Menara ditaruh di antara castle dan musuh; sisanya di sekitar castle.
  const lawan: Tim = ai.tim === 'red' ? 'blue' : 'red'
  const musuh = dunia.bangunan.find((b) => b.tim === lawan && b.jenis === 'castle')
  let x = castle.x + acakRentang(ai.rng, -420, 420)
  let y = castle.y + acakRentang(ai.rng, -420, 420)
  if (perlu === 'castle') {
    // Dekat tambang terjauh dari castle utama, tapi tidak di sisi musuh.
    let terbaik: { x: number; y: number } | null = null
    let skorTerbaik = -Infinity
    for (const tb of dunia.tambang) {
      const dariKu = jarak(tb.x, tb.y, castle.x, castle.y)
      const dariMusuh = musuh ? jarak(tb.x, tb.y, musuh.x, musuh.y) : 99999
      if (dariKu < 600) continue
      const skor = dariMusuh - dariKu * 0.5
      if (skor > skorTerbaik) {
        skorTerbaik = skor
        terbaik = { x: tb.x, y: tb.y }
      }
    }
    if (!terbaik) return
    x = terbaik.x + acakRentang(ai.rng, -200, 200)
    y = terbaik.y + acakRentang(ai.rng, -200, 200)
  } else if (perlu === 'tower' && musuh) {
    const dx = musuh.x - castle.x
    const dy = musuh.y - castle.y
    const d = Math.hypot(dx, dy) || 1
    x = castle.x + (dx / d) * 380 + acakRentang(ai.rng, -140, 140)
    y = castle.y + (dy / d) * 380 + acakRentang(ai.rng, -140, 140)
  }
  perintah.push({ jenis: 'bangun', ids: [pembangun.id], bangunan: perlu, x, y })
}

/** Melatih terus-menerus selama supply dan sumber daya mengizinkan. */
function aturPelatihan(
  dunia: Dunia, ai: KeadaanAi, aktif: Bangunan[], sisaSupply: number, perintah: Perintah[],
): void {
  const sd = dunia.tim[ai.tim].sumberDaya
  let sisa = sisaSupply

  for (const b of aktif) {
    if (b.antrean.length >= 2) continue
    const bisa = BANGUNAN[b.jenis].melatih.filter((p) => p !== 'pawn')
    if (bisa.length === 0) continue

    const peran = bisa[Math.floor(acakRentang(ai.rng, 0, bisa.length)) % bisa.length] as PeranUnit
    const def = UNIT[peran]
    if (sisa < def.pop) continue
    if (sd.gold < def.gold || sd.kayu < def.kayu || sd.daging < def.daging) continue

    perintah.push({ jenis: 'latih', bangunanId: b.id, peran })
    sisa -= def.pop
  }
}

/**
 * Militer: sebagian pasukan DITINGGAL menjaga basis, sisanya menyerang.
 *
 * Versi sebelumnya mengirim seluruh pasukan sekaligus; basis jadi kosong dan
 * siapa pun yang menang satu bentrokan langsung merata-tanahkan lawannya.
 */
function aturMiliter(
  dunia: Dunia, ai: KeadaanAi, set: Setelan, tentaraKu: Unit[], castle: Bangunan, perintah: Perintah[],
): void {
  const lawan: Tim = ai.tim === 'red' ? 'blue' : 'red'

  // Bersihkan id yang sudah gugur dari daftar penyerang.
  for (const id of [...ai.penyerang]) {
    if (!tentaraKu.some((u) => u.id === id)) ai.penyerang.delete(id)
  }

  const penyerang = tentaraKu.filter((u) => ai.penyerang.has(u.id))
  const cadangan = tentaraKu.filter((u) => !ai.penyerang.has(u.id))
  let jagaDituju = Math.max(2, Math.round(tentaraKu.length * set.porsiJaga))

  // Musuh di dekat basis: semua pulang membela.
  const penyusup = dunia.unit.find(
    (u) => u.tim === lawan && jarak(u.x, u.y, castle.x, castle.y) < 900)
  if (penyusup) {
    ai.menyerang = false
    ai.penyerang.clear()
    if (tentaraKu.length > 0) {
      perintah.push({
        jenis: 'serangPindah', ids: tentaraKu.map((u) => u.id),
        x: penyusup.x, y: penyusup.y,
      })
    }
    return
  }

  // Mundur kalau pasukan penyerang sudah tinggal sepertiga dari puncaknya.
  if (ai.menyerang && penyerang.length > 0 && penyerang.length < ai.puncakSerang * 0.25) {
    ai.menyerang = false
    ai.penyerang.clear()
    perintah.push({
      jenis: 'pindah', ids: penyerang.map((u) => u.id),
      x: castle.x + acakRentang(ai.rng, -220, 220),
      y: castle.y + acakRentang(ai.rng, -220, 220),
    })
    return
  }
  if (ai.menyerang && penyerang.length === 0) ai.menyerang = false

  // Eskalasi: makin lama match berjalan, makin berani AI menyerang dan makin
  // sedikit yang ditinggal menjaga. Dua AI yang sama kuat akan saling menunggu
  // selamanya tanpa ini — 7 dari 32 match mentok di batas waktu.
  const menit = dunia.tick / 3600
  const ambang = Math.max(3, Math.round(set.ambangSerang - Math.floor(menit / 4)))
  if (menit > 10) jagaDituju = Math.max(1, Math.round(jagaDituju * 0.5))
  if (menit > 16) jagaDituju = 0

  // Berangkat kalau cadangan sudah cukup besar DI ATAS kebutuhan jaga.
  if (!ai.menyerang && cadangan.length >= ambang + Math.min(3, jagaDituju)) {
    const berangkat = cadangan.slice(0, cadangan.length - jagaDituju)
    for (const u of berangkat) ai.penyerang.add(u.id)
    ai.menyerang = true
    ai.puncakSerang = berangkat.length
  } else if (ai.menyerang) {
    // Kirim bala bantuan, tetap menyisakan penjaga.
    const bisaKirim = Math.max(0, cadangan.length - jagaDituju)
    for (const u of cadangan.slice(0, bisaKirim)) ai.penyerang.add(u.id)
    ai.puncakSerang = Math.max(ai.puncakSerang, ai.penyerang.size)
  }

  if (ai.menyerang && ai.penyerang.size > 0) {
    const bangunanLawan = dunia.bangunan.filter((b) => b.tim === lawan && b.fase !== 'hancur')
    const sasaran =
      bangunanLawan.find((b) => b.jenis === 'castle') ?? terdekat(bangunanLawan, castle)
    if (sasaran) {
      const ids = [...ai.penyerang]
      perintah.push({ jenis: 'serangPindah', ids, x: sasaran.x, y: sasaran.y })
      const hero = tentaraKu.find((u) => u.hero && ai.penyerang.has(u.id))
      if (hero && hero.skillJeda <= 0) perintah.push({ jenis: 'skill', ids: [hero.id] })
    }
  }

  // Penjaga berkumpul di dekat castle.
  const nganggur = cadangan.filter((u) => u.tugas === 'diam')
  if (nganggur.length > 0) {
    perintah.push({
      jenis: 'pindah', ids: nganggur.map((u) => u.id),
      x: castle.x + acakRentang(ai.rng, -260, 260),
      y: castle.y + acakRentang(ai.rng, -260, 260),
    })
  }
}
