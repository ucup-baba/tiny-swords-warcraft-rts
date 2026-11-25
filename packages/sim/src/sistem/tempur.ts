import { DT_TETAP, type Tim } from '@hftf/shared'
import { BANGUNAN } from '../definisi/bangunan.js'
import { REVIVE, UNIT, type KategoriUnit } from '../definisi/unit.js'
import type { Bangunan, Dunia, Unit } from '../tipe.js'
import { adalahUnit, bermusuhan, cariUnit, jarak, musuhTerdekat } from '../util.js'
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

export function lukaiUnit(dunia: Dunia, target: Unit, dmg: number, penyerang: Unit | null): void {
  target.hp -= dmg
  if (target.hp > 0) return

  const k = dunia.tim[target.tim]
  k.statistik.gugur++
  if (penyerang) dunia.tim[penyerang.tim].statistik.bunuh++

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

  beriXpSekitar(dunia, target, XP_BUNUH[UNIT[target.peran].kategori])

  const i = dunia.unit.indexOf(target)
  if (i >= 0) dunia.unit.splice(i, 1)
}

/** Hero yang hidup dan cukup dekat dengan kematian ini mendapat XP (PRD §10.4). */
export function beriXpSekitar(dunia: Dunia, korban: { x: number; y: number; tim: Tim }, xp: number): void {
  for (const u of dunia.unit) {
    if (!u.hero || !bermusuhan(u.tim, korban.tim)) continue
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
    hero.hp += hpBaru - hero.hpMaks
    hero.hpMaks = hpBaru
    hero.dmg = dmgHero(hero.peran, hero.level)
    dunia.kejadian.push({ jenis: 'heroNaikLevel', id: hero.id, tim: hero.tim, level: hero.level })
  }
}

export function lukaiBangunan(dunia: Dunia, b: Bangunan, dmg: number, penyerang: Tim | null): void {
  if (b.fase === 'hancur') return
  b.hp -= dmg
  if (b.hp > 0) return

  b.hp = 0
  b.fase = 'hancur'

  // Antrean latih hangus; biayanya tidak dikembalikan.
  b.antrean.length = 0

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

export function sembuhkan(target: Unit, jumlah: number): void {
  target.hp = Math.min(target.hpMaks, target.hp + jumlah)
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
): void {
  dunia.proyektil.push({
    id: dunia.idBerikut++, tim, jenis, x, y, tx, ty,
    kecepatan: jenis === 'panah' ? KECEPATAN_PANAH : KECEPATAN_ORB,
    dmg, area, targetId,
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
        if (!u || !bermusuhan(u.tim, p.tim)) continue
        if (jarak(p.x, p.y, u.x, u.y) <= RADIUS_SPLASH) lukaiUnit(dunia, u, p.dmg, null)
      }
    } else if (p.targetId !== null) {
      const t = cariUnit(dunia, p.targetId)
      if (t && bermusuhan(t.tim, p.tim)) lukaiUnit(dunia, t, p.dmg, null)
    }
    dunia.proyektil.splice(i, 1)
  }
}

// ---------------------------------------------------------------------------
// Perilaku unit tempur
// ---------------------------------------------------------------------------

function seranganKena(dunia: Dunia, u: Unit, target: Unit | Bangunan): void {
  const def = UNIT[u.peran]
  if (def.area) {
    tembak(dunia, u.tim, 'orb', u.x, u.y - 30, target.x, target.y, u.dmg, true,
      adalahUnit(target) ? target.id : null)
    return
  }
  if (def.jarak > 150) {
    tembak(dunia, u.tim, 'panah', u.x, u.y - 24, target.x, target.y, u.dmg, false,
      adalahUnit(target) ? target.id : null)
    return
  }
  if (adalahUnit(target)) lukaiUnit(dunia, target, u.dmg, u)
  else lukaiBangunan(dunia, target, u.dmg, u.tim)
}

/**
 * Jangkauan efektif terhadap sebuah target: memperhitungkan ukuran bangunan
 * DAN bonus tanah tinggi (PRD §9.2).
 */
function jangkauanKe(dunia: Dunia, u: Unit, target: Unit | Bangunan): number {
  const dasar = jangkauanEfektif(dunia, u, target.x, target.y)
  return adalahUnit(target) ? dasar : dasar + BANGUNAN[target.jenis].radius
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
    if (s.tim !== u.tim || s === u || s.hp >= s.hpMaks) continue
    if (jarak(u.x, u.y, s.x, s.y) > radius) continue
    const porsi = s.hp / s.hpMaks
    if (porsi < terparah) {
      terparah = porsi
      pasien = s
    }
  }

  if (pasien) {
    if (jarak(u.x, u.y, pasien.x, pasien.y) <= u.jarak) {
      if (u.jedaTimer <= 0) {
        sembuhkan(pasien, u.dmg)
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
