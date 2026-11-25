import { DT_TETAP, PETA_BARIS, PETA_KOLOM, TILE, type Tim } from '@hftf/shared'
import { BANGUNAN } from './definisi/bangunan.js'
import type { PeranHero } from './definisi/unit.js'
import type { Perintah } from './perintah.js'
import { buatRng } from './rng.js'
import { antreLatih, batalLatih, langkahBangunan, mulaiRevive } from './sistem/bangunan.js'
import { bayar } from './sistem/ekonomi.js'
import { pakaiSkill } from './sistem/hero.js'
import { langkahPawn } from './sistem/pekerja.js'
import { buatBangunan, buatUnit } from './sistem/spawn.js'
import { langkahAkhir } from './sistem/akhir.js'
import { langkahProyektil, langkahUnitTempur } from './sistem/tempur.js'
import type { Dunia, KeadaanTim, Statistik } from './tipe.js'
import { cariBangunan, cariUnit } from './util.js'

export interface OpsiDunia {
  seed: number
  heroBlue?: PeranHero
  heroRed?: PeranHero
}

function statistikKosong(): Statistik {
  return {
    bunuh: 0, gugur: 0, dagingDipungut: 0, bangunanDibangun: 0, bangunanHilang: 0,
    goldTerkumpul: 0, kayuTerkumpul: 0, dagingTerkumpul: 0, campDibersihkan: 0,
  }
}

function keadaanTim(hero: PeranHero): KeadaanTim {
  return {
    sumberDaya: { gold: 320, kayu: 220, daging: 140 },
    statistik: statistikKosong(),
    heroHidup: null,
    heroGugur: null,
    heroPilihan: hero,
    matiEkonomiDetik: 0,
    menyerah: false,
  }
}

export function buatDunia(opsi: OpsiDunia): Dunia {
  const dunia: Dunia = {
    tick: 0,
    rng: buatRng(opsi.seed),
    idBerikut: 1,
    hasil: { jenis: 'berlangsung' },
    bangunan: [],
    unit: [],
    pohon: [],
    tambang: [],
    domba: [],
    daging: [],
    proyektil: [],
    tim: {
      blue: keadaanTim(opsi.heroBlue ?? 'king'),
      red: keadaanTim(opsi.heroRed ?? 'champion'),
      neutral: keadaanTim('berserker'),
    },
    kejadian: [],
  }
  isiPeta(dunia)
  return dunia
}

/**
 * Peta simetri rotasi 180 derajat (PRD §9.3). Terrain, elevasi, dan camp goblin
 * menyusul di M3 dan M6 — di M1 semuanya masih dataran datar.
 */
function isiPeta(dunia: Dunia): void {
  const T = (n: number): number => n * TILE
  // Blue di barat-daya, Red hasil rotasi 180 derajat.
  const putar = (tx: number, ty: number): [number, number] => [PETA_KOLOM - tx, PETA_BARIS - ty]

  const basis: { tim: Tim; tx: number; ty: number }[] = [
    { tim: 'blue', tx: 20, ty: 76 },
    { tim: 'red', tx: putar(20, 76)[0], ty: putar(20, 76)[1] },
  ]

  for (const { tim, tx, ty } of basis) {
    const arah = tim === 'blue' ? 1 : -1

    buatBangunan(dunia, tim, 'castle', T(tx), T(ty), 'aktif')
    buatBangunan(dunia, tim, 'house', T(tx - 3 * arah), T(ty - 3 * arah), 'aktif')

    // 5 pawn: 2 langsung bekerja, 3 menganggur (PRD §9.3).
    for (let i = 0; i < 5; i++) {
      buatUnit(dunia, tim, 'pawn', T(tx + (i - 2) * 0.8 * arah), T(ty + 1.4 * arah))
    }

    // Tambang aman tanpa penjaga, <= 8 tile dari castle (PRD §9.3).
    dunia.tambang.push({
      id: dunia.idBerikut++, jenis: 'mine',
      x: T(tx - 6 * arah), y: T(ty + 2 * arah), gold: 3500,
    })
    // Hutan di dalam basis.
    for (let i = 0; i < 6; i++) {
      dunia.pohon.push({
        id: dunia.idBerikut++,
        x: T(tx + (4 + (i % 3) * 1.4) * arah),
        y: T(ty - (2 + Math.floor(i / 3) * 1.4) * arah),
        kayu: 90,
      })
    }
    // Domba di padang dekat basis.
    for (let i = 0; i < 4; i++) {
      dunia.domba.push({
        id: dunia.idBerikut++,
        x: T(tx + (i - 1.5) * 1.6 * arah),
        y: T(ty + 4.5 * arah),
        daging: 45,
      })
    }

    // Hero hidup sejak detik pertama, gratis, tanpa supply (PRD §11.1).
    const peran = dunia.tim[tim].heroPilihan
    const hero = buatUnit(dunia, tim, peran, T(tx + 2 * arah), T(ty + 2 * arah))
    dunia.tim[tim].heroHidup = hero.id
  }

  // Tambang tengah yang diperebutkan (penjaga goblin menyusul di M6).
  dunia.tambang.push({
    id: dunia.idBerikut++, jenis: 'mine',
    x: T(PETA_KOLOM / 2), y: T(PETA_BARIS / 2), gold: 4500,
  })
}

// ---------------------------------------------------------------------------
// Perintah
// ---------------------------------------------------------------------------

/** Unit milik `tim` dari daftar id. Perintah ke unit orang lain diabaikan. */
function unitMilik(dunia: Dunia, tim: Tim, ids: readonly number[]): ReturnType<typeof cariUnit>[] {
  const hasil = []
  for (const id of ids) {
    const u = cariUnit(dunia, id)
    if (u && u.tim === tim) hasil.push(u)
  }
  return hasil
}

export function terapkanPerintah(dunia: Dunia, tim: Tim, p: Perintah): void {
  if (dunia.hasil.jenis !== 'berlangsung') return

  switch (p.jenis) {
    case 'pindah':
    case 'serangPindah': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = p.jenis === 'pindah' ? 'pindah' : 'serangPindah'
        u.tx = p.x
        u.ty = p.y
        u.targetId = null
      }
      return
    }
    case 'serang': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'serang'
        u.targetId = p.targetId
      }
      return
    }
    case 'stop': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'diam'
        u.targetId = null
        u.tx = u.x
        u.ty = u.y
      }
      return
    }
    case 'tahan': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'tahan'
        u.targetId = null
      }
      return
    }
    case 'kumpul': {
      const pohon = dunia.pohon.some((x) => x.id === p.targetId)
      const tambang = dunia.tambang.some((x) => x.id === p.targetId)
      const domba = dunia.domba.some((x) => x.id === p.targetId)
      const daging = dunia.daging.some((x) => x.id === p.targetId)
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u || u.peran !== 'pawn') continue
        u.targetId = p.targetId
        u.tikPanen = 0
        u.tugas = pohon ? 'tebang' : tambang ? 'tambang' : domba ? 'gembala' : daging ? 'pungut' : 'diam'
      }
      return
    }
    case 'perbaiki': {
      const b = cariBangunan(dunia, p.targetId)
      if (!b || b.tim !== tim) return
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u || u.peran !== 'pawn') continue
        u.tugas = b.fase === 'konstruksi' ? 'bangun' : 'perbaiki'
        u.targetId = b.id
      }
      return
    }
    case 'bangun': {
      const pawn = unitMilik(dunia, tim, p.ids).find((u) => u?.peran === 'pawn')
      if (!pawn) return
      const def = BANGUNAN[p.bangunan]
      if (!bayar(dunia, tim, def.gold, def.kayu, 0)) return
      const b = buatBangunan(dunia, tim, p.bangunan, p.x, p.y, 'konstruksi')
      pawn.tugas = 'bangun'
      pawn.targetId = b.id
      return
    }
    case 'skill': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (u?.hero) pakaiSkill(dunia, u)
      }
      return
    }
    case 'latih': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      antreLatih(dunia, b, p.peran)
      return
    }
    case 'batalLatih': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      batalLatih(dunia, b, p.indeks)
      return
    }
    case 'rally': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      b.rallyX = p.x
      b.rallyY = p.y
      return
    }
    case 'bangkitkanHero': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      mulaiRevive(dunia, b)
      return
    }
    case 'menyerah': {
      dunia.tim[tim].menyerah = true
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Langkah simulasi
// ---------------------------------------------------------------------------

/** Satu langkah dengan dt TETAP. dt variabel menghancurkan determinisme. */
export function langkah(dunia: Dunia): void {
  dunia.kejadian.length = 0
  if (dunia.hasil.jenis !== 'berlangsung') return

  for (const b of dunia.bangunan) langkahBangunan(dunia, b)

  // Iterasi mundur: unit bisa dihapus di tengah langkah.
  for (let i = dunia.unit.length - 1; i >= 0; i--) {
    const u = dunia.unit[i]
    if (!u) continue
    if (u.skillJeda > 0) u.skillJeda -= DT_TETAP
    if (u.peran === 'pawn') langkahPawn(dunia, u)
    else langkahUnitTempur(dunia, u)
  }

  langkahProyektil(dunia)

  // Daging yang tergeletak membusuk supaya peta tidak penuh.
  for (let i = dunia.daging.length - 1; i >= 0; i--) {
    const d = dunia.daging[i]!
    d.sisaDetik -= DT_TETAP
    if (d.sisaDetik <= 0) dunia.daging.splice(i, 1)
  }

  langkahAkhir(dunia)
  dunia.tick++
}

export function langkahBanyak(dunia: Dunia, jumlah: number): void {
  for (let i = 0; i < jumlah; i++) langkah(dunia)
}

/** Detik permainan yang sudah berlalu. */
export const detik = (dunia: Dunia): number => dunia.tick * DT_TETAP
