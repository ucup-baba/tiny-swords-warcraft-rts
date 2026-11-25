import type { Tim } from '@hftf/shared'
import { saringUntuk } from './sistem/fog.js'
import type { Bangunan, Dunia, Unit } from './tipe.js'

/**
 * Snapshot authoritative host -> guest (PRD §7).
 *
 * Terrain TIDAK ikut dikirim: ia deterministik dari seed, jadi guest membangun
 * peta yang sama persis sendiri. Yang dikirim hanya yang berubah tiap tick.
 */
export interface Snapshot {
  tick: number
  hasil: Dunia['hasil']
  unit: SnapshotUnit[]
  bangunan: SnapshotBangunan[]
  sumberDaya: { gold: number; kayu: number; daging: number }
  /** Sumber daya di peta; jumlahnya kecil dan berubah lambat. */
  pohon: { id: number; x: number; y: number }[]
  tambang: { id: number; x: number; y: number; jenis: 'mine' | 'stone' }[]
  domba: { id: number; x: number; y: number }[]
  daging: { id: number; x: number; y: number }[]
}

type SnapshotUnit = [
  id: number, tim: Tim, peran: string, x: number, y: number,
  hp: number, hpMaks: number, level: number, camp: number,
]
type SnapshotBangunan = [
  id: number, tim: Tim, jenis: string, x: number, y: number,
  hp: number, hpMaks: number, fase: string,
]

const bulat = (v: number): number => Math.round(v * 10) / 10

/**
 * Membuat snapshot UNTUK SATU PEMAIN. Memakai saringUntuk supaya unit musuh
 * yang sedang di fog tidak ikut terkirim (PRD §12.3 / AC-12.8).
 */
export function buatSnapshot(dunia: Dunia, untuk: Tim): Snapshot {
  const saring = saringUntuk(dunia, untuk)
  return {
    tick: dunia.tick,
    hasil: dunia.hasil,
    unit: saring.unit.map((u): SnapshotUnit => [
      u.id, u.tim, u.peran, bulat(u.x), bulat(u.y),
      Math.round(u.hp), u.hpMaks, u.level, u.campId ?? -1,
    ]),
    bangunan: saring.bangunan.map((b): SnapshotBangunan => [
      b.id, b.tim, b.jenis, bulat(b.x), bulat(b.y), Math.round(b.hp), b.hpMaks, b.fase,
    ]),
    sumberDaya: { ...dunia.tim[untuk].sumberDaya },
    pohon: dunia.pohon.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    tambang: dunia.tambang.map((t) => ({ id: t.id, x: t.x, y: t.y, jenis: t.jenis })),
    domba: dunia.domba.map((d) => ({ id: d.id, x: d.x, y: d.y })),
    daging: dunia.daging.map((d) => ({ id: d.id, x: d.x, y: d.y })),
  }
}

/**
 * Menerapkan snapshot ke dunia guest. Guest TIDAK menjalankan simulasi — ia
 * hanya menggambar apa yang dikirim host, lalu menghitung fog-nya sendiri dari
 * unit miliknya (yang selalu lengkap di snapshot).
 */
export function terapkanSnapshot(dunia: Dunia, s: Snapshot, lamaUnit: Map<number, Unit>): void {
  dunia.tick = s.tick
  dunia.hasil = s.hasil

  const unitBaru: Unit[] = []
  for (const [id, tim, peran, x, y, hp, hpMaks, level, camp] of s.unit) {
    const lama = lamaUnit.get(id)
    if (lama) {
      lama.x = x
      lama.y = y
      lama.hp = hp
      lama.level = level
      unitBaru.push(lama)
      continue
    }
    unitBaru.push({
      id, tim, peran: peran as Unit['peran'], x, y,
      hp, hpMaks, dmg: 0, jarak: 0, jeda: 1, kecepatan: 0, jedaTimer: 0,
      tugas: 'diam', tx: x, ty: y, targetId: null,
      bawaanJenis: null, bawaanJumlah: 0, tikPanen: 0,
      jalur: null, jalurKeX: x, jalurKeY: y,
      campId: camp < 0 ? null : camp,
      hero: level > 0 && ['berserker', 'king', 'knight', 'champion'].includes(peran),
      level, xp: 0, skillJeda: 0,
    })
  }
  dunia.unit = unitBaru

  const lamaBangunan = new Map(dunia.bangunan.map((b) => [b.id, b]))
  dunia.bangunan = s.bangunan.map(([id, tim, jenis, x, y, hp, hpMaks, fase]): Bangunan => {
    const lama = lamaBangunan.get(id)
    if (lama) {
      lama.hp = hp
      lama.fase = fase as Bangunan['fase']
      return lama
    }
    return {
      id, tim, jenis: jenis as Bangunan['jenis'], x, y, hp, hpMaks,
      fase: fase as Bangunan['fase'], sisaBangun: 0, antrean: [],
      jedaTembak: 0, rallyX: x, rallyY: y, revive: null, jedaDomba: 0,
    }
  })

  dunia.pohon = s.pohon.map((p) => ({ ...p, kayu: 90 }))
  dunia.tambang = s.tambang.map((t) => ({ ...t, gold: 1000 }))
  dunia.domba = s.domba.map((d) => ({ ...d, daging: 45 }))
  dunia.daging = s.daging.map((d) => ({ ...d, jumlah: 18, sisaDetik: 30 }))
}
