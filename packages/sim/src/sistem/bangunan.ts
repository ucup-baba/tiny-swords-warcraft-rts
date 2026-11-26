import { DT_TETAP } from '@hftf/shared'
import { acak } from '../rng.js'
import { BANGUNAN } from '../definisi/bangunan.js'
import { RISET, TINGKAT_MAKS, risetDi, type JenisRiset } from '../definisi/riset.js'
import { REVIVE, UNIT } from '../definisi/unit.js'
import { posisiBebasDekat } from '../halangan.js'
import type { Bangunan, Dunia } from '../tipe.js'
import { musuhTerdekat } from '../util.js'
import { buatDomba } from './domba.js'
import { buatUnit } from './spawn.js'
import { adalahUnit } from '../util.js'
import { hpMaksHero, lukaiBangunan, tembak } from './tempur.js'

export function langkahBangunan(dunia: Dunia, b: Bangunan): void {
  if (b.fase === 'hancur') return

  if (b.fase === 'konstruksi') {
    if (b.sisaBangun <= 0) {
      b.fase = 'aktif'
      b.hp = b.hpMaks
      dunia.tim[b.tim].statistik.bangunanDibangun++
      dunia.kejadian.push({ jenis: 'bangunanSelesai', id: b.id, tim: b.tim, bangunan: b.jenis })
    }
    return
  }

  langkahAntrean(dunia, b)
  langkahRiset(dunia, b)
  langkahRevive(dunia, b)
  langkahTower(dunia, b)
  langkahDomba(dunia, b)
}

/** Jeda antar kemunculan domba dari satu House, dalam detik. */
const JEDA_DOMBA = 50
/** Batas domba hidup di sekitar satu House. */
const DOMBA_PER_HOUSE = 2
const RADIUS_PADANG = 260

/**
 * House memunculkan domba ternak (PRD §3). Ini satu-satunya sumber daging yang
 * terbarukan: domba awal habis dipanen, dan daging dari medan perang hanya ada
 * kalau sedang berperang. Tanpa ini ekonomi daging mati dan tidak ada pasukan
 * yang bisa dilatih sama sekali.
 */
function langkahDomba(dunia: Dunia, b: Bangunan): void {
  if (b.jenis !== 'house') return

  if (b.jedaDomba > 0) {
    b.jedaDomba -= DT_TETAP
    return
  }

  let dekat = 0
  for (const d of dunia.domba) {
    const dx = d.x - b.x
    const dy = d.y - b.y
    if (dx * dx + dy * dy <= RADIUS_PADANG * RADIUS_PADANG) dekat++
  }
  if (dekat >= DOMBA_PER_HOUSE) {
    b.jedaDomba = JEDA_DOMBA / 2
    return
  }

  const sudut = acak(dunia.rng) * Math.PI * 2
  const r = 95 + acak(dunia.rng) * 115
  const pos = posisiBebasDekat(dunia, b.x + Math.cos(sudut) * r, b.y + Math.sin(sudut) * r, b.x, b.y)
  dunia.domba.push(buatDomba(dunia.idBerikut++, pos.x, pos.y, 45, 2 + acak(dunia.rng) * 3))
  b.jedaDomba = JEDA_DOMBA
}

function langkahAntrean(dunia: Dunia, b: Bangunan): void {
  const sedang = b.antrean[0]
  if (!sedang) return

  sedang.sisaDetik -= DT_TETAP
  if (sedang.sisaDetik > 0) return

  b.antrean.shift()
  // Muncul di tepi bangunan menghadap rally, lalu berjalan ke Rally Point (ala Warcraft III).
  const dx = b.rallyX - b.x
  const dy = b.rallyY - b.y
  const d = Math.hypot(dx, dy) || 1
  const def = BANGUNAN[b.jenis]
  const pintuX = b.x + (dx / d) * (def.radius + 32)
  const pintuY = b.y + (dy / d) * (def.radius + 32)
  const pos = posisiBebasDekat(dunia, pintuX, pintuY, b.rallyX, b.rallyY)
  const u = buatUnit(dunia, b.tim, sedang.peran, pos.x, pos.y)
  if (Math.hypot(b.rallyX - pos.x, b.rallyY - pos.y) > 28) {
    u.tugas = 'pindah'
    u.tx = b.rallyX
    u.ty = b.rallyY
  }
  dunia.kejadian.push({ jenis: 'unitSelesai', id: u.id, tim: b.tim, peran: sedang.peran })
}

function langkahRiset(dunia: Dunia, b: Bangunan): void {
  if (!b.riset) return
  b.riset.sisaDetik -= DT_TETAP
  if (b.riset.sisaDetik > 0) return

  const jenis = b.riset.jenis
  b.riset = null
  const k = dunia.tim[b.tim]
  k.riset[jenis] = Math.min(TINGKAT_MAKS, k.riset[jenis] + 1)
  dunia.kejadian.push({ jenis: 'risetSelesai', tim: b.tim, riset: jenis, tingkat: k.riset[jenis] })
}

function langkahRevive(dunia: Dunia, b: Bangunan): void {
  if (b.jenis !== 'altar' || !b.revive) return

  b.revive.sisaDetik -= DT_TETAP
  if (b.revive.sisaDetik > 0) return

  const { peran, level } = b.revive
  b.revive = null

  const pos = posisiBebasDekat(dunia, b.x, b.y + BANGUNAN[b.jenis].radius + 32, b.rallyX, b.rallyY)
  const hero = buatUnit(dunia, b.tim, peran, pos.x, pos.y)
  if (Math.hypot(b.rallyX - pos.x, b.rallyY - pos.y) > 28) {
    hero.tugas = 'pindah'
    hero.tx = b.rallyX
    hero.ty = b.rallyY
  }
  hero.level = level
  hero.hpMaks = hpMaksHero(peran, level)
  hero.hp = Math.round(hero.hpMaks * REVIVE.hpSaatMuncul)
  hero.dmg = Math.round(UNIT[peran].dmg * (1 + (level - 1) * 0.12))

  const k = dunia.tim[b.tim]
  hero.xp = k.heroGugur?.xp ?? 0
  k.heroHidup = hero.id
  k.heroGugur = null
  dunia.kejadian.push({ jenis: 'heroBangkit', id: hero.id, tim: b.tim, level })
}

function langkahTower(dunia: Dunia, b: Bangunan): void {
  const def = BANGUNAN[b.jenis]
  if (def.jarak === undefined || def.dmg === undefined || def.jeda === undefined) return

  if (b.jedaTembak > 0) {
    b.jedaTembak -= DT_TETAP
    return
  }
  const target = musuhTerdekat(dunia, b.tim, b.x, b.y, def.jarak)
  if (!target) return

  tembak(dunia, b.tim, 'panah', b.x, b.y - 80, target.x, target.y, def.dmg, false,
    adalahUnit(target) ? target.id : null, 'tusuk')
  // Bangunan tidak bisa ditembak panah pengejar; kenakan langsung.
  if (!adalahUnit(target)) lukaiBangunan(dunia, target, def.dmg, b.tim, 'tusuk')
  b.jedaTembak = def.jeda
}

/** Masukkan unit ke antrean latih. Mengembalikan alasan gagal, atau null kalau berhasil. */
export function antreLatih(dunia: Dunia, b: Bangunan, peran: Parameters<typeof buatUnit>[2]): string | null {
  if (b.fase !== 'aktif') return 'Bangunan belum aktif'
  if (!BANGUNAN[b.jenis].melatih.includes(peran)) return 'Bangunan ini tidak melatih unit itu'
  if (b.antrean.length >= 5) return 'Antrean penuh'
  const def = UNIT[peran]
  const s = dunia.tim[b.tim].sumberDaya
  if (s.gold < def.gold || s.kayu < def.kayu || s.daging < def.daging) return 'Sumber daya kurang'
  s.gold -= def.gold
  s.kayu -= def.kayu
  s.daging -= def.daging
  b.antrean.push({ peran, sisaDetik: def.waktuLatih })
  return null
}

/** Batalkan satu antrean dan kembalikan biayanya penuh. */
export function batalLatih(dunia: Dunia, b: Bangunan, indeks: number): boolean {
  const item = b.antrean[indeks]
  if (!item) return false
  const def = UNIT[item.peran]
  const s = dunia.tim[b.tim].sumberDaya
  s.gold += def.gold
  s.kayu += def.kayu
  s.daging += def.daging
  b.antrean.splice(indeks, 1)
  return true
}

/**
 * Memulai riset di sebuah bangunan (PRD §20). Mengembalikan alasan gagal,
 * atau null kalau berhasil.
 */
export function mulaiRiset(dunia: Dunia, b: Bangunan, jenis: JenisRiset): string | null {
  if (b.fase !== 'aktif') return 'Bangunan belum aktif'
  if (b.riset) return 'Bangunan sedang meneliti'
  if (!risetDi(b.jenis).includes(jenis)) return 'Riset itu tidak dikerjakan di sini'

  const k = dunia.tim[b.tim]
  const tingkat = k.riset[jenis]
  if (tingkat >= TINGKAT_MAKS) return 'Riset sudah tingkat maksimum'

  // Bangunan lain milik tim ini sedang meneliti hal yang sama.
  if (dunia.bangunan.some((x) => x.tim === b.tim && x.riset?.jenis === jenis)) {
    return 'Riset itu sedang dikerjakan'
  }

  const biaya = RISET[jenis].tingkat[tingkat]!
  if (k.sumberDaya.gold < biaya.gold || k.sumberDaya.kayu < biaya.kayu) return 'Sumber daya kurang'
  k.sumberDaya.gold -= biaya.gold
  k.sumberDaya.kayu -= biaya.kayu
  b.riset = { jenis, sisaDetik: biaya.detik }
  return null
}

/** Mulai membangkitkan hero yang gugur di altar ini (PRD §11.3). */
export function mulaiRevive(dunia: Dunia, b: Bangunan): string | null {
  if (b.jenis !== 'altar') return 'Bukan Altar of Heroes'
  if (b.fase !== 'aktif') return 'Altar belum aktif'
  if (b.revive) return 'Altar sedang membangkitkan hero'

  const k = dunia.tim[b.tim]
  if (!k.heroGugur) return 'Tidak ada hero yang gugur'
  if (k.heroHidup !== null) return 'Hero masih hidup'

  const level = k.heroGugur.level
  const gold = REVIVE.goldPerLevel * level
  if (k.sumberDaya.gold < gold || k.sumberDaya.daging < REVIVE.daging) return 'Sumber daya kurang'
  k.sumberDaya.gold -= gold
  k.sumberDaya.daging -= REVIVE.daging

  b.revive = {
    peran: k.heroGugur.peran,
    level,
    sisaDetik: REVIVE.detikDasar + REVIVE.detikPerLevel * level,
  }
  return null
}

