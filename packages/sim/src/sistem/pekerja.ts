import { DT_TETAP } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import type { Dunia, Unit } from '../tipe.js'
import { castleTerdekat, jarak } from '../util.js'
import { PANEN, terima } from './ekonomi.js'
import { langkahMenuju } from './gerak.js'
import { langkahUnitTempur } from './tempur.js'

const JANGKAUAN_PANEN = 56
const JANGKAUAN_ANTAR = 110

/** Kayu yang dihabiskan untuk memperbaiki 1 HP bangunan (PRD §3 poin 3). */
const KAYU_PER_HP = 0.06
const HP_PERBAIKI_PER_DETIK = 34
/** Kecepatan konstruksi satu pawn, relatif terhadap waktuBangun. */
const LAJU_BANGUN = 1

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

function antarPulang(dunia: Dunia, u: Unit): void {
  const castle = castleTerdekat(dunia, u.tim, u.x, u.y)
  if (!castle) {
    u.tugas = 'diam'
    return
  }
  u.tx = castle.x
  u.ty = castle.y
  if (jarak(u.x, u.y, castle.x, castle.y) > JANGKAUAN_ANTAR) {
    langkahMenuju(u, castle.x, castle.y)
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
  u.tugas = 'diam'
  u.targetId = null
}

function panenPohon(dunia: Dunia, u: Unit): void {
  const pohon = dunia.pohon.find((p) => p.id === u.targetId)
  if (!pohon) {
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  if (jarak(u.x, u.y, pohon.x, pohon.y) > JANGKAUAN_PANEN) {
    langkahMenuju(u, pohon.x, pohon.y)
    return
  }
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
  }
  mulaiPulang(dunia, u)
}

function panenTambang(dunia: Dunia, u: Unit): void {
  const tambang = dunia.tambang.find((t) => t.id === u.targetId)
  if (!tambang) {
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  if (jarak(u.x, u.y, tambang.x, tambang.y) > JANGKAUAN_PANEN) {
    langkahMenuju(u, tambang.x, tambang.y)
    return
  }
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
  }
  mulaiPulang(dunia, u)
}

function panenDomba(dunia: Dunia, u: Unit): void {
  const domba = dunia.domba.find((d) => d.id === u.targetId)
  if (!domba) {
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  if (jarak(u.x, u.y, domba.x, domba.y) > JANGKAUAN_PANEN) {
    langkahMenuju(u, domba.x, domba.y)
    return
  }
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
    u.tugas = 'diam'
    u.targetId = null
    return
  }
  if (jarak(u.x, u.y, daging.x, daging.y) > JANGKAUAN_PANEN) {
    langkahMenuju(u, daging.x, daging.y)
    return
  }
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
  const jangkauan = BANGUNAN[b.jenis].radius + 40
  if (jarak(u.x, u.y, b.x, b.y) > jangkauan) {
    langkahMenuju(u, b.x, b.y)
    return
  }
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
  const jangkauan = BANGUNAN[b.jenis].radius + 40
  if (jarak(u.x, u.y, b.x, b.y) > jangkauan) {
    langkahMenuju(u, b.x, b.y)
    return
  }
  const naik = HP_PERBAIKI_PER_DETIK * DT_TETAP
  const biaya = naik * KAYU_PER_HP
  const s = dunia.tim[u.tim].sumberDaya
  if (s.kayu < biaya) return // kehabisan kayu: perbaikan berhenti, tugas tetap
  s.kayu -= biaya
  b.hp = Math.min(b.hpMaks, b.hp + naik)
}
