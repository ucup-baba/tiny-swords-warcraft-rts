import { DT_TETAP, TINGGI } from '@hftf/shared'
import { CAMP, GOBLIN, ISI_CAMP, type JenisCamp, type PeranGoblin } from '../definisi/goblin.js'
import { acakRentang } from '../rng.js'
import { keTengahPiksel, keTile, tinggiDi } from '../terrain.js'
import type { Camp, Dunia, Unit } from '../tipe.js'
import { bermusuhan, jarak } from '../util.js'
import { langkahMenuju } from './gerak.js'
import { lukaiUnit, tembak } from './tempur.js'

/** Goblin dibuat langsung di sini, bukan lewat buatUnit: statnya tabel sendiri. */
export function buatGoblin(dunia: Dunia, camp: Camp, peran: PeranGoblin, x: number, y: number): Unit {
  const def = GOBLIN[peran]
  const u: Unit = {
    id: dunia.idBerikut++,
    tim: 'neutral',
    // Peran goblin dipetakan ke peran unit terdekat untuk tipe; renderer
    // memakai campId + goblinPeran untuk memilih sprite yang benar.
    peran: peran === 'tnt' ? 'archer' : peran === 'barrel' ? 'pawn' : 'warrior',
    x, y,
    hp: def.hp, hpMaks: def.hp,
    dmg: def.dmg, jarak: def.jarak, jeda: def.jeda, kecepatan: def.kecepatan,
    jedaTimer: 0,
    tugas: 'tahan',
    tx: x, ty: y,
    targetId: null,
    bawaanJenis: null, bawaanJumlah: 0, tikPanen: 0,
    arah: 1, aksi: 'diam', tikAksi: 0, sudutSerang: 0,
    jalur: null, jalurKeX: x, jalurKeY: y,
    campId: camp.id,
    hero: false, level: 1, xp: 0, skillJeda: 0,
  }
  dunia.unit.push(u)
  return u
}

/** Peran goblin sebenarnya, dibaca balik dari statnya. */
export function peranGoblin(u: Unit): PeranGoblin {
  if (u.campId === null) return 'torch'
  if (u.dmg === GOBLIN.tnt.dmg && u.jarak === GOBLIN.tnt.jarak) return 'tnt'
  if (u.dmg === GOBLIN.barrel.dmg) return 'barrel'
  return 'torch'
}

export function isiCamp(dunia: Dunia, camp: Camp): void {
  const daftar = ISI_CAMP[camp.jenis]
  const levelCamp = tinggiDi(dunia.terrain, keTile(camp.x), keTile(camp.y))
  const rDasar = dunia.peta === 'klasik2' && !dunia.petaCustomNama ? 40 : 84
  for (const [i, peran] of daftar.entries()) {
    const sudut = (i / daftar.length) * Math.PI * 2
    const r = rDasar + acakRentang(dunia.rng, 0, 40)
    let gx = camp.x + Math.cos(sudut) * r
    let gy = camp.y + Math.sin(sudut) * r
    const lv = tinggiDi(dunia.terrain, keTile(gx), keTile(gy))
    if (lv === TINGGI.air || (levelCamp !== TINGGI.air && lv !== levelCamp)) {
      gx = keTengahPiksel(keTile(camp.x))
      gy = keTengahPiksel(keTile(camp.y))
    }
    buatGoblin(dunia, camp, peran, gx, gy)
  }
  camp.aggro = false
  camp.respawn = 0
  camp.pembunuhTerakhir = null
}

export function tambahCamp(dunia: Dunia, jenis: JenisCamp, x: number, y: number): Camp {
  const camp: Camp = { id: dunia.idBerikut++, jenis, x, y, aggro: false, respawn: 0, pembunuhTerakhir: null }
  dunia.camp.push(camp)
  isiCamp(dunia, camp)
  return camp
}

const anggotaCamp = (dunia: Dunia, camp: Camp): Unit[] =>
  dunia.unit.filter((u) => u.campId === camp.id)

export function langkahCamp(dunia: Dunia): void {
  for (const camp of dunia.camp) {
    const anggota = anggotaCamp(dunia, camp)

    // Camp kosong: hitung mundur respawn (PRD §10.3 poin 4).
    if (anggota.length === 0) {
      if (camp.respawn <= 0) {
        camp.respawn = CAMP.respawn
        dunia.kejadian.push({ jenis: 'campDibersihkan', campId: camp.id, x: camp.x, y: camp.y })
        if (camp.pembunuhTerakhir && camp.pembunuhTerakhir !== 'neutral') {
          dunia.tim[camp.pembunuhTerakhir].statistik.campDibersihkan++
        }
        continue
      }
      camp.respawn -= DT_TETAP
      if (camp.respawn <= 0) {
        isiCamp(dunia, camp)
        dunia.kejadian.push({ jenis: 'campRespawn', campId: camp.id, x: camp.x, y: camp.y })
      }
      continue
    }

    // Aggro bersama: satu goblin melihat musuh, seluruh camp ikut (PRD §10.3 poin 3).
    if (!camp.aggro) {
      for (const g of anggota) {
        const musuh = musuhDekat(dunia, g.x, g.y, CAMP.radiusAggro)
        if (musuh) {
          camp.aggro = true
          break
        }
      }
    }

    for (const g of anggota) langkahGoblin(dunia, camp, g)

    // Tidak ada lagi musuh di dalam tali: berhenti mengejar.
    if (camp.aggro) {
      const masihAda = dunia.unit.some(
        (u) => u.tim !== 'neutral' && jarak(u.x, u.y, camp.x, camp.y) <= CAMP.tali)
      if (!masihAda) camp.aggro = false
    }
  }
}

function musuhDekat(dunia: Dunia, x: number, y: number, radius: number): Unit | null {
  let terbaik: Unit | null = null
  let dekat = radius
  for (const u of dunia.unit) {
    if (!bermusuhan(u.tim, 'neutral', dunia)) continue
    const d = jarak(x, y, u.x, u.y)
    if (d < dekat) {
      dekat = d
      terbaik = u
    }
  }
  return terbaik
}

function langkahGoblin(dunia: Dunia, camp: Camp, g: Unit): void {
  if (g.jedaTimer > 0) g.jedaTimer -= DT_TETAP
  if (g.tikAksi > 0) g.tikAksi = Math.max(0, g.tikAksi - DT_TETAP)
  if (g.tikAksi <= 0) g.aksi = 'diam'

  const dariCamp = jarak(g.x, g.y, camp.x, camp.y)

  // Terikat camp: lewat tali -> pulang dan memulihkan HP (PRD §10.3 poin 2).
  if (dariCamp > CAMP.tali || !camp.aggro) {
    if (dariCamp > 50) {
      langkahMenuju(dunia, g, camp.x, camp.y)
      g.hp = Math.min(g.hpMaks, g.hp + CAMP.sembuhPulang * DT_TETAP)
      return
    }
    g.hp = Math.min(g.hpMaks, g.hp + CAMP.sembuhPulang * DT_TETAP)
    g.jalur = null
    return
  }

  const target = musuhDekat(dunia, g.x, g.y, CAMP.tali)
  if (!target) return

  const peran = peranGoblin(g)
  const def = GOBLIN[peran]

  if (jarak(g.x, g.y, target.x, target.y) > g.jarak) {
    langkahMenuju(dunia, g, target.x, target.y)
    return
  }
  if (target.x < g.x - 1) g.arah = -1
  else if (target.x > g.x + 1) g.arah = 1
  if (g.jedaTimer > 0) return

  g.aksi = 'serang'
  g.tikAksi = 0.5
  g.sudutSerang = Math.atan2(target.y - g.y, target.x - g.x)

  if (def.bomDiri) {
    // Barrel meledak di tempat lalu mati (PRD §10.2).
    for (let i = dunia.unit.length - 1; i >= 0; i--) {
      const k = dunia.unit[i]
      if (!k || !bermusuhan(k.tim, 'neutral', dunia)) continue
      if (jarak(g.x, g.y, k.x, k.y) <= 110) lukaiUnit(dunia, k, def.dmg, g)
    }
    lukaiUnit(dunia, g, g.hpMaks * 2, null)
    return
  }

  if (def.area) {
    tembak(dunia, 'neutral', 'orb', g.x, g.y - 24, target.x, target.y, def.dmg, true, target.id)
  } else {
    lukaiUnit(dunia, target, def.dmg, g)
  }
  g.jedaTimer = g.jeda
}
