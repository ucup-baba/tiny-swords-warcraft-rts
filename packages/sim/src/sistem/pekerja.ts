import { DT_TETAP } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import { segarkanHalangan } from '../halangan.js'
import type { Dunia, Unit } from '../tipe.js'
import { castleTerdekat, jarak } from '../util.js'
import { PANEN, terima } from './ekonomi.js'
import { langkahMenuju } from './gerak.js'
import { langkahUnitTempur } from './tempur.js'

const JANGKAUAN_PANEN = 58
const JANGKAUAN_POHON = 90
const JANGKAUAN_TAMBANG_MINE = 112
const JANGKAUAN_TAMBANG_STONE = 86
const JANGKAUAN_ANTAR = BANGUNAN.castle.radius + 64

/** Radius luas pencarian otomatis saat resource yang sedang dipanen habis. */
export const RADIUS_AUTO_KAYU = 950
export const RADIUS_AUTO_GOLD = 1150
export const RADIUS_AUTO_DAGING = 950
/** Detik sebelum tunggul tumbuh kembali menjadi pohon penuh. */
export const DETIK_TUMBUH_POHON = 75
export const KAYU_POHON_BARU = 120

/** Kayu yang dihabiskan untuk memperbaiki 1 HP bangunan (PRD §3 poin 3). */
const KAYU_PER_HP = 0.06
const HP_PERBAIKI_PER_DETIK = 34
/** Kecepatan konstruksi satu pawn, relatif terhadap waktuBangun. */
const LAJU_BANGUN = 1

function hadapKe(u: Unit, tx: number): void {
  if (tx < u.x - 1) u.arah = -1
  else if (tx > u.x + 1) u.arah = 1
}

export function langkahPawn(dunia: Dunia, u: Unit): void {
  switch (u.tugas) {
    case 'tebang': return panenPohon(dunia, u)
    case 'tambang': return panenTambang(dunia, u)
    case 'gembala': return panenDomba(dunia, u)
    case 'pungut': return pungutDaging(dunia, u)
    case 'pulang': return antarPulang(dunia, u)
    case 'bangun': return bangunBangunan(dunia, u)
    case 'perbaiki': return perbaikiBangunan(dunia, u)
    default: return langkahUnitTempur(dunia, u)
  }
}

/** Setelah muatan penuh, pawn pulang ke castle terdekat. */
function mulaiPulang(dunia: Dunia, u: Unit): void {
  const castle = castleTerdekat(dunia, u.tim, u.x, u.y)
  if (!castle) {
    // Tidak punya castle: muatan tersimpan, pawn menganggur.
    u.tugas = 'diam'
    return
  }
  u.tugas = 'pulang'
  u.tx = castle.x
  u.ty = castle.y
}

/**
 * Mencari resource sejenis terdekat dalam radius luas saat target sebelumnya habis,
 * supaya Pawn otomatis lanjut bekerja tanpa nyasar menyeberang ke markas musuh.
 */
function cariSumberBerikut(
  dunia: Dunia, u: Unit, jenis: 'kayu' | 'gold' | 'daging', acuanX: number, acuanY: number,
): boolean {
  const pilihTerdekat = <T extends { id: number; x: number; y: number }>(
    daftar: readonly T[], maksJarak: number,
  ): T | null => {
    let terbaik: T | null = null
    let dMin = maksJarak
    for (const item of daftar) {
      const d = jarak(acuanX, acuanY, item.x, item.y)
      if (d <= dMin) {
        dMin = d
        terbaik = item
      }
    }
    return terbaik
  }

  if (jenis === 'kayu') {
    const p = pilihTerdekat(dunia.pohon, RADIUS_AUTO_KAYU)
    if (p) {
      u.tugas = 'tebang'
      u.targetId = p.id
      u.tikPanen = 0
      return true
    }
  } else if (jenis === 'gold') {
    const t = pilihTerdekat(dunia.tambang, RADIUS_AUTO_GOLD)
    if (t) {
      u.tugas = 'tambang'
      u.targetId = t.id
      u.tikPanen = 0
      return true
    }
  } else {
    // Prioritaskan daging jatuh medan perang yang dekat, lalu domba ternak.
    const dg = pilihTerdekat(dunia.daging, RADIUS_AUTO_DAGING)
    if (dg) {
      u.tugas = 'pungut'
      u.targetId = dg.id
      u.tikPanen = 0
      return true
    }
    const mbek = pilihTerdekat(dunia.domba, RADIUS_AUTO_DAGING)
    if (mbek) {
      u.tugas = 'gembala'
      u.targetId = mbek.id
      u.tikPanen = 0
      return true
    }
  }

  u.tugas = 'diam'
  u.targetId = null
  return false
}

function antarPulang(dunia: Dunia, u: Unit): void {
  const castle = castleTerdekat(dunia, u.tim, u.x, u.y)
  if (!castle) {
    u.tugas = 'diam'
    return
  }
  u.tx = castle.x
  u.ty = castle.y
  if (jarak(u.x, u.y, castle.x, castle.y) > JANGKAUAN_ANTAR) {
    langkahMenuju(dunia, u, castle.x, castle.y)
    return
  }

  if (u.bawaanJenis && u.bawaanJumlah > 0) {
    terima(dunia, u.tim, u.bawaanJenis, u.bawaanJumlah, castle.x, castle.y)
  }
  const jenisTadi = u.bawaanJenis
  u.bawaanJenis = null
  u.bawaanJumlah = 0

  // Kembali ke sumber yang sama kalau masih ada.
  if (u.targetId !== null) {
    if (jenisTadi === 'kayu' && dunia.pohon.some((p) => p.id === u.targetId)) {
      u.tugas = 'tebang'
      return
    }
    if (jenisTadi === 'gold' && dunia.tambang.some((t) => t.id === u.targetId)) {
      u.tugas = 'tambang'
      return
    }
  }

  // Sumber lama habis -> otomatis cari sumber sejenis terdekat dalam radius aman!
  if (jenisTadi) {
    cariSumberBerikut(dunia, u, jenisTadi, castle.x, castle.y)
    return
  }
  u.tugas = 'diam'
  u.targetId = null
}

function panenPohon(dunia: Dunia, u: Unit): void {
  const pohon = dunia.pohon.find((p) => p.id === u.targetId)
  if (!pohon) {
    cariSumberBerikut(dunia, u, 'kayu', u.x, u.y)
    return
  }
  if (jarak(u.x, u.y, pohon.x, pohon.y) > JANGKAUAN_POHON) {
    langkahMenuju(dunia, u, pohon.x, pohon.y)
    return
  }
  hadapKe(u, pohon.x)
  u.aksi = 'tebang'
  u.tikPanen += DT_TETAP
  if (u.tikPanen < PANEN.detikPerPanen) return
  u.tikPanen = 0

  const ambil = Math.min(PANEN.kayuPerAntar, pohon.kayu)
  pohon.kayu -= ambil
  u.bawaanJenis = 'kayu'
  u.bawaanJumlah = ambil
  if (pohon.kayu <= 0) {
    const i = dunia.pohon.indexOf(pohon)
    if (i >= 0) dunia.pohon.splice(i, 1)
    dunia.tunggul.push({
      id: dunia.idBerikut++,
      x: pohon.x,
      y: pohon.y,
      sisaTumbuh: DETIK_TUMBUH_POHON,
    })
    segarkanHalangan(dunia)
  }
  mulaiPulang(dunia, u)
}

function panenTambang(dunia: Dunia, u: Unit): void {
  const tambang = dunia.tambang.find((t) => t.id === u.targetId)
  if (!tambang) {
    cariSumberBerikut(dunia, u, 'gold', u.x, u.y)
    return
  }
  const jangkauan = tambang.jenis === 'mine' ? JANGKAUAN_TAMBANG_MINE : JANGKAUAN_TAMBANG_STONE
  if (jarak(u.x, u.y, tambang.x, tambang.y) > jangkauan) {
    langkahMenuju(dunia, u, tambang.x, tambang.y)
    return
  }
  hadapKe(u, tambang.x)
  u.aksi = 'tambang'
  u.tikPanen += DT_TETAP
  if (u.tikPanen < PANEN.detikPerPanen) return
  u.tikPanen = 0

  const ambil = Math.min(PANEN.goldPerAntar, tambang.gold)
  tambang.gold -= ambil
  u.bawaanJenis = 'gold'
  u.bawaanJumlah = ambil
  if (tambang.gold <= 0) {
    const i = dunia.tambang.indexOf(tambang)
    if (i >= 0) dunia.tambang.splice(i, 1)
    segarkanHalangan(dunia)
  }
  mulaiPulang(dunia, u)
}

function panenDomba(dunia: Dunia, u: Unit): void {
  const domba = dunia.domba.find((d) => d.id === u.targetId)
  if (!domba) {
    cariSumberBerikut(dunia, u, 'daging', u.x, u.y)
    return
  }
  if (jarak(u.x, u.y, domba.x, domba.y) > JANGKAUAN_PANEN) {
    langkahMenuju(dunia, u, domba.x, domba.y)
    return
  }
  hadapKe(u, domba.x)
  u.aksi = 'tebang'
  u.tikPanen += DT_TETAP
  if (u.tikPanen < PANEN.detikPerPanen) return
  u.tikPanen = 0

  u.bawaanJenis = 'daging'
  u.bawaanJumlah = PANEN.dagingDomba
  const i = dunia.domba.indexOf(domba)
  if (i >= 0) dunia.domba.splice(i, 1)
  u.targetId = null
  mulaiPulang(dunia, u)
}

function pungutDaging(dunia: Dunia, u: Unit): void {
  const daging = dunia.daging.find((d) => d.id === u.targetId)
  if (!daging) {
    cariSumberBerikut(dunia, u, 'daging', u.x, u.y)
    return
  }
  if (jarak(u.x, u.y, daging.x, daging.y) > JANGKAUAN_PANEN) {
    langkahMenuju(dunia, u, daging.x, daging.y)
    return
  }
  hadapKe(u, daging.x)
  u.aksi = 'bangun'
  u.bawaanJenis = 'daging'
  u.bawaanJumlah = daging.jumlah
  const i = dunia.daging.indexOf(daging)
  if (i >= 0) dunia.daging.splice(i, 1)
  u.targetId = null
  mulaiPulang(dunia, u)
}

function bangunBangunan(dunia: Dunia, u: Unit): void {
  const b = dunia.bangunan.find((x) => x.id === u.targetId)
  if (!b || b.fase !== 'konstruksi') {
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  const jangkauan = BANGUNAN[b.jenis].radius + 58
  if (jarak(u.x, u.y, b.x, b.y) > jangkauan) {
    langkahMenuju(dunia, u, b.x, b.y)
    return
  }
  hadapKe(u, b.x)
  u.aksi = 'bangun'
  b.sisaBangun -= DT_TETAP * LAJU_BANGUN
  const total = BANGUNAN[b.jenis].waktuBangun
  const porsi = 1 - Math.max(0, b.sisaBangun) / total
  b.hp = Math.max(b.hp, Math.round(b.hpMaks * (0.15 + 0.85 * porsi)))
}

function perbaikiBangunan(dunia: Dunia, u: Unit): void {
  const b = dunia.bangunan.find((x) => x.id === u.targetId)
  if (!b || b.fase !== 'aktif' || b.hp >= b.hpMaks) {
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  const jangkauan = BANGUNAN[b.jenis].radius + 58
  if (jarak(u.x, u.y, b.x, b.y) > jangkauan) {
    langkahMenuju(dunia, u, b.x, b.y)
    return
  }
  hadapKe(u, b.x)
  u.aksi = 'bangun'
  const naik = HP_PERBAIKI_PER_DETIK * DT_TETAP
  const biaya = naik * KAYU_PER_HP
  const s = dunia.tim[u.tim].sumberDaya
  if (s.kayu < biaya) return // kehabisan kayu: perbaikan berhenti, tugas tetap
  s.kayu -= biaya
  b.hp = Math.min(b.hpMaks, b.hp + naik)
}
