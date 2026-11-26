import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import { GOBLIN } from '../definisi/goblin.js'
import {
  BONUS_BAJU_PER_TINGKAT, BONUS_SERANG_PER_TINGKAT, RISET, SEMUA_RISET,
} from '../definisi/riset.js'
import { pengali, type JenisBaju, type JenisSerangan } from '../definisi/tempur.js'
import { REVIVE, UNIT, type KategoriUnit } from '../definisi/unit.js'
import { segarkanHalangan } from '../halangan.js'
import type { Bangunan, Dunia, Unit } from '../tipe.js'
import { adalahUnit, bermusuhan, cariUnit, jarak, musuhTerdekat, sekutu } from '../util.js'
import { peranGoblin } from './goblin.js'
import { jangkauanEfektif, langkahMenuju } from './gerak.js'

/** XP hero per unit musuh yang dibunuh. Goblin punya tabelnya sendiri (PRD §10.4). */
const XP_BUNUH: Record<KategoriUnit, number> = {
  pawn: 8, warrior: 14, archer: 12, lancer: 20, caster: 18, hero: 60,
}

/** Radius hero harus berada agar dapat XP dari sebuah kematian (PRD §10.4). */
export const RADIUS_XP = 400

/** Berapa daging yang dijatuhkan unit yang gugur (PRD §2). */
const DAGING_JATUH = 18
const DAGING_HIDUP_DETIK = 45

/** Aggro otomatis saat unit sedang tidak diperintah apa-apa. */
export const RADIUS_AGGRO = 320

export function hpMaksHero(peran: Unit['peran'], level: number): number {
  const def = UNIT[peran]
  return Math.round(def.hp * (1 + (level - 1) * 0.18))
}

export function dmgHero(peran: Unit['peran'], level: number): number {
  const def = UNIT[peran]
  return Math.round(def.dmg * (1 + (level - 1) * 0.12))
}

// ---------------------------------------------------------------------------
// Kerusakan
// ---------------------------------------------------------------------------

export function lukaiUnit(
  dunia: Dunia, target: Unit, dmg: number, penyerang: Unit | null,
  timSumber?: Tim, jenisSerangan?: JenisSerangan,
): void {
  const pembunuh: Tim | null = penyerang?.tim ?? timSumber ?? null
  // Tipe serangan diambil dari penyerang kalau tidak disebut. Pemanggil yang
  // sengaja tidak memberi tipe (tes, bunuh paksa) mendapat kerusakan mentah.
  const serangan: JenisSerangan | null =
    jenisSerangan ?? (penyerang ? UNIT[penyerang.peran].serangan : null)
  const baju: JenisBaju = UNIT[target.peran].baju

  const besar = kerusakanAkhir(dunia, dmg, serangan, pembunuh, baju, target.tim)
  target.hp -= besar
  if (besar >= 0.5) {
    dunia.kejadian.push({
      jenis: 'unitLuka', id: target.id, tim: target.tim, x: target.x, y: target.y,
      jumlah: Math.max(1, Math.round(besar)),
    })
  }
  if (target.hp > 0) return

  const k = dunia.tim[target.tim]
  k.statistik.gugur++
  if (pembunuh && bermusuhan(pembunuh, target.tim, dunia)) dunia.tim[pembunuh].statistik.bunuh++

  // Goblin menjatuhkan gold LANGSUNG ke pembunuhnya (PRD §10.4) - tidak perlu
  // diangkut Pawn, berbeda dari tambang.
  if (target.tim === 'neutral' && pembunuh && pembunuh !== 'neutral') {
    const peran = peranGoblin(target)
    const def = GOBLIN[peran]
    dunia.tim[pembunuh].sumberDaya.gold += def.gold
    dunia.tim[pembunuh].statistik.goldTerkumpul += def.gold
    const camp = dunia.camp.find((c) => c.id === target.campId)
    if (camp) camp.pembunuhTerakhir = pembunuh
  }

  // Hero tidak dihapus — masuk state gugur dan menunggu Altar (PRD §11.2).
  if (target.hero) {
    k.heroHidup = null
    k.heroGugur = {
      peran: target.peran as 'berserker' | 'king' | 'knight' | 'champion',
      level: target.level,
      xp: target.xp,
      x: target.x,
      y: target.y,
    }
    dunia.kejadian.push({ jenis: 'heroGugur', tim: target.tim, x: target.x, y: target.y })
  } else {
    // Unit biasa menjatuhkan daging; hero TIDAK (PRD §11.2 poin 4).
    dunia.daging.push({
      id: dunia.idBerikut++,
      x: target.x,
      y: target.y,
      jumlah: DAGING_JATUH,
      sisaDetik: DAGING_HIDUP_DETIK,
    })
  }

  dunia.kejadian.push({
    jenis: 'unitMati', id: target.id, tim: target.tim, peran: target.peran, x: target.x, y: target.y,
  })

  // XP goblin punya tabelnya sendiri (PRD §10.4).
  const xp = target.tim === 'neutral'
    ? GOBLIN[peranGoblin(target)].xp
    : XP_BUNUH[UNIT[target.peran].kategori]
  beriXpSekitar(dunia, target, xp)

  const i = dunia.unit.indexOf(target)
  if (i >= 0) dunia.unit.splice(i, 1)
}

/** Hero yang hidup dan cukup dekat dengan kematian ini mendapat XP (PRD §10.4). */
export function beriXpSekitar(dunia: Dunia, korban: { x: number; y: number; tim: Tim }, xp: number): void {
  for (const u of dunia.unit) {
    if (!u.hero || !bermusuhan(u.tim, korban.tim, dunia)) continue
    if (jarak(u.x, u.y, korban.x, korban.y) > RADIUS_XP) continue
    tambahXp(dunia, u, xp)
  }
}

export function tambahXp(dunia: Dunia, hero: Unit, xp: number): void {
  if (hero.level >= 5) return
  hero.xp += xp
  const ambang = [100, 240, 430, 680]
  while (hero.level < 5 && hero.xp >= (ambang[hero.level - 1] ?? Infinity)) {
    hero.level++
    const hpBaru = hpMaksHero(hero.peran, hero.level)
    // Naik level menyembuhkan sebesar tambahan HP maksimumnya.
    const tambah = hpBaru - hero.hpMaks
    hero.hp += tambah
    hero.hpMaks = hpBaru
    hero.dmg = dmgHero(hero.peran, hero.level)
    if (tambah > 0) {
      dunia.kejadian.push({
        jenis: 'unitSembuh', id: hero.id, tim: hero.tim, x: hero.x, y: hero.y, jumlah: Math.round(tambah),
      })
    }
    dunia.kejadian.push({ jenis: 'heroNaikLevel', id: hero.id, tim: hero.tim, level: hero.level })
  }
}

/**
 * Ketahanan bangunan terhadap serangan yang tipe-nya tidak diketahui
 * (mis. skill hero, ledakan). Serangan bertipe memakai tabel PENGALI yang
 * baris 'bangunan'-nya sudah mencakup pelemahan ini.
 */
export const KETAHANAN_BANGUNAN = 0.45

/** Tambahan kerusakan dari riset serangan tim penyerang (PRD §20). */
export function bonusSerang(dunia: Dunia, tim: Tim | null, serangan: JenisSerangan): number {
  if (!tim) return 1
  const riset = dunia.tim[tim].riset
  let tingkat = 0
  for (const r of SEMUA_RISET) {
    if (RISET[r].memperkuat === serangan) tingkat += riset[r]
  }
  return 1 + tingkat * BONUS_SERANG_PER_TINGKAT
}

/** Pengurangan kerusakan dari riset Baju Zirah tim yang diserang (PRD §20). */
export function faktorBaju(dunia: Dunia, tim: Tim): number {
  return Math.max(0.3, 1 - dunia.tim[tim].riset.bajuZirah * BONUS_BAJU_PER_TINGKAT)
}

/**
 * Kerusakan akhir: tipe serangan vs tipe baju, lalu riset kedua belah pihak.
 *
 * Dipusatkan di sini supaya tidak ada jalur serangan yang lupa menerapkannya.
 */
function kerusakanAkhir(
  dunia: Dunia, mentah: number, serangan: JenisSerangan | null,
  timPenyerang: Tim | null, baju: JenisBaju, timTarget: Tim,
): number {
  if (!serangan) return mentah
  return mentah * pengali(serangan, baju) * bonusSerang(dunia, timPenyerang, serangan) * faktorBaju(dunia, timTarget)
}

export function lukaiBangunan(
  dunia: Dunia, b: Bangunan, dmg: number, penyerang: Tim | null, jenisSerangan?: JenisSerangan,
): void {
  if (b.fase === 'hancur') return
  const besar = jenisSerangan
    ? kerusakanAkhir(dunia, dmg, jenisSerangan, penyerang, 'bangunan', b.tim)
    : dmg * KETAHANAN_BANGUNAN
  b.hp -= besar
  if (besar >= 0.5) {
    dunia.kejadian.push({
      jenis: 'bangunanLuka', id: b.id, tim: b.tim, x: b.x, y: b.y,
      jumlah: Math.max(1, Math.round(besar)),
    })
  }
  if (b.hp > 0) return

  b.hp = 0
  b.fase = 'hancur'
  segarkanHalangan(dunia)

  // Antrean latih hangus; biayanya tidak dikembalikan.
  b.antrean.length = 0

  // Riset yang sedang berjalan dikembalikan penuh, sama seperti revive.
  if (b.riset) {
    const tingkat = dunia.tim[b.tim].riset[b.riset.jenis]
    const biaya = RISET[b.riset.jenis].tingkat[tingkat]
    if (biaya) {
      dunia.tim[b.tim].sumberDaya.gold += biaya.gold
      dunia.tim[b.tim].sumberDaya.kayu += biaya.kayu
    }
    b.riset = null
  }

  // Tapi revive yang sedang berjalan DIKEMBALIKAN PENUH (PRD §11.3).
  if (b.revive) {
    const k = dunia.tim[b.tim]
    k.sumberDaya.gold += REVIVE.goldPerLevel * b.revive.level
    k.sumberDaya.daging += REVIVE.daging
    b.revive = null
  }

  dunia.tim[b.tim].statistik.bangunanHilang++
  dunia.kejadian.push({
    jenis: 'bangunanHancur', id: b.id, tim: b.tim, bangunan: b.jenis, x: b.x, y: b.y,
  })
}

export function sembuhkan(target: Unit, jumlah: number, dunia?: Dunia): void {
  const sebelum = target.hp
  target.hp = Math.min(target.hpMaks, target.hp + jumlah)
  const naik = target.hp - sebelum
  if (dunia && naik >= 0.5) {
    dunia.kejadian.push({
      jenis: 'unitSembuh', id: target.id, tim: target.tim, x: target.x, y: target.y,
      jumlah: Math.max(1, Math.round(naik)),
    })
  }
}

// ---------------------------------------------------------------------------
// Proyektil
// ---------------------------------------------------------------------------

const KECEPATAN_PANAH = 620
const KECEPATAN_ORB = 440
const RADIUS_SPLASH = 90

export function tembak(
  dunia: Dunia, tim: Tim, jenis: 'panah' | 'orb',
  x: number, y: number, tx: number, ty: number,
  dmg: number, area: boolean, targetId: number | null,
  serangan: JenisSerangan = jenis === 'panah' ? 'tusuk' : 'sihir',
): void {
  dunia.proyektil.push({
    id: dunia.idBerikut++, tim, jenis, x, y, tx, ty,
    kecepatan: jenis === 'panah' ? KECEPATAN_PANAH : KECEPATAN_ORB,
    dmg, area, targetId, serangan,
  })
}

export function langkahProyektil(dunia: Dunia): void {
  for (let i = dunia.proyektil.length - 1; i >= 0; i--) {
    const p = dunia.proyektil[i]!

    // Mengejar target selama targetnya masih hidup.
    if (p.targetId !== null) {
      const t = cariUnit(dunia, p.targetId)
      if (t) {
        p.tx = t.x
        p.ty = t.y
      } else {
        p.targetId = null
      }
    }

    const dx = p.tx - p.x
    const dy = p.ty - p.y
    const d = Math.hypot(dx, dy)
    const maju = p.kecepatan * DT_TETAP

    if (d > maju) {
      p.x += (dx / d) * maju
      p.y += (dy / d) * maju
      continue
    }

    // Kena.
    p.x = p.tx
    p.y = p.ty
    if (p.area) {
      for (let j = dunia.unit.length - 1; j >= 0; j--) {
        const u = dunia.unit[j]
        if (!u || !bermusuhan(u.tim, p.tim, dunia)) continue
        if (jarak(p.x, p.y, u.x, u.y) <= RADIUS_SPLASH) lukaiUnit(dunia, u, p.dmg, null, p.tim, p.serangan)
      }
    } else if (p.targetId !== null) {
      const t = cariUnit(dunia, p.targetId)
      if (t && bermusuhan(t.tim, p.tim, dunia)) lukaiUnit(dunia, t, p.dmg, null, p.tim, p.serangan)
    }

    // Bangunan di titik jatuh juga terkena. Tanpa ini archer dan mage sama
    // sekali TIDAK bisa melukai bangunan: proyektil ke bangunan dikirim dengan
    // targetId null, dan kedua cabang di atas melewatkannya.
    const bangunanKena = dunia.bangunan.find(
      (b) => b.fase !== 'hancur' && bermusuhan(b.tim, p.tim, dunia) &&
        jarak(p.x, p.y, b.x, b.y) <= BANGUNAN[b.jenis].radius)
    if (bangunanKena) lukaiBangunan(dunia, bangunanKena, p.dmg, p.tim, p.serangan)

    dunia.proyektil.splice(i, 1)
  }
}

// ---------------------------------------------------------------------------
// Perilaku unit tempur
// ---------------------------------------------------------------------------

function seranganKena(dunia: Dunia, u: Unit, target: Unit | Bangunan): void {
  const def = UNIT[u.peran]
  if (target.x < u.x - 1) u.arah = -1
  else if (target.x > u.x + 1) u.arah = 1
  u.aksi = 'serang'
  u.tikAksi = 0.48
  u.sudutSerang = Math.atan2(target.y - u.y, target.x - u.x)

  if (def.area) {
    tembak(dunia, u.tim, 'orb', u.x, u.y - 30, target.x, target.y, u.dmg, true,
      adalahUnit(target) ? target.id : null, def.serangan)
    return
  }
  if (def.jarak > 150) {
    tembak(dunia, u.tim, 'panah', u.x, u.y - 24, target.x, target.y, u.dmg, false,
      adalahUnit(target) ? target.id : null, def.serangan)
    return
  }
  if (adalahUnit(target)) lukaiUnit(dunia, target, u.dmg, u)
  else lukaiBangunan(dunia, target, u.dmg, u.tim, def.serangan)
}

/**
 * Jangkauan efektif terhadap sebuah target: memperhitungkan ukuran bangunan
 * DAN bonus tanah tinggi (PRD §9.2).
 */
function jangkauanKe(dunia: Dunia, u: Unit, target: Unit | Bangunan): number {
  const dasar = jangkauanEfektif(dunia, u, target.x, target.y)
  return adalahUnit(target) ? dasar : dasar + BANGUNAN[target.jenis].radius + 16
}

export function langkahUnitTempur(dunia: Dunia, u: Unit): void {
  if (u.jedaTimer > 0) u.jedaTimer -= DT_TETAP

  // Monk menyembuhkan, bukan menyerang.
  if (UNIT[u.peran].penyembuh) {
    langkahMonk(dunia, u)
    return
  }

  let target: Unit | Bangunan | null = null

  if (u.tugas === 'serang' && u.targetId !== null) {
    target =
      dunia.unit.find((x) => x.id === u.targetId) ??
      dunia.bangunan.find((x) => x.id === u.targetId && x.fase !== 'hancur') ??
      null
    if (!target) {
      u.tugas = 'diam'
      u.targetId = null
    }
  }

  if (!target && u.tugas !== 'pindah') {
    // Tahan hanya menyerang yang masuk jangkauan; lainnya punya radius aggro.
    const radius = u.tugas === 'tahan' ? u.jarak : RADIUS_AGGRO
    target = musuhTerdekat(dunia, u.tim, u.x, u.y, radius)
  }

  if (target) {
    const jangkauan = jangkauanKe(dunia, u, target)
    if (jarak(u.x, u.y, target.x, target.y) <= jangkauan) {
      if (u.jedaTimer <= 0) {
        seranganKena(dunia, u, target)
        u.jedaTimer = u.jeda
      }
      return
    }
    // Unit yang menahan posisi tidak mengejar.
    if (u.tugas !== 'tahan') {
      langkahMenuju(dunia, u, target.x, target.y)
      return
    }
  }

  if (u.tugas === 'pindah' || u.tugas === 'serangPindah') {
    if (langkahMenuju(dunia, u, u.tx, u.ty)) u.tugas = 'diam'
  }
}

const RADIUS_CARI_SEMBUH = 320

function langkahMonk(dunia: Dunia, u: Unit): void {
  let pasien: Unit | null = null
  let terparah = 1
  const radius = u.tugas === 'tahan' ? u.jarak : RADIUS_CARI_SEMBUH

  for (const s of dunia.unit) {
    if (!sekutu(s.tim, u.tim, dunia) || s === u || s.hp >= s.hpMaks) continue
    if (jarak(u.x, u.y, s.x, s.y) > radius) continue
    const porsi = s.hp / s.hpMaks
    if (porsi < terparah) {
      terparah = porsi
      pasien = s
    }
  }

  if (pasien) {
    if (jarak(u.x, u.y, pasien.x, pasien.y) <= u.jarak) {
      if (pasien.x < u.x - 1) u.arah = -1
      else if (pasien.x > u.x + 1) u.arah = 1
      if (u.jedaTimer <= 0) {
        u.aksi = 'serang'
        u.tikAksi = 0.65
        sembuhkan(pasien, u.dmg, dunia)
        u.jedaTimer = u.jeda
      }
    } else if (u.tugas !== 'tahan') {
      langkahMenuju(dunia, u, pasien.x, pasien.y)
    }
    return
  }

  if (u.tugas === 'pindah' || u.tugas === 'serangPindah') {
    if (langkahMenuju(dunia, u, u.tx, u.ty)) u.tugas = 'diam'
  }
}
