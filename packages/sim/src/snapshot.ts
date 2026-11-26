import type { Tim } from '@hftf/shared'
import type { JenisRiset } from './definisi/riset.js'
import { segarkanHalangan } from './halangan.js'
import { saringUntuk, terlihatDi } from './sistem/fog.js'
import type { AksiUnit, AntreanLatih, Bangunan, Dunia, JenisBawaan, Kejadian, TugasUnit, Unit } from './tipe.js'

/**
 * Snapshot authoritative host -> guest (PRD §7).
 *
 * Terrain TIDAK ikut dikirim: ia deterministik dari seed, jadi guest membangun
 * peta yang sama persis sendiri. Yang dikirim hanya yang berubah tiap tick.
 */
export interface Snapshot {
  tick: number
  untuk?: Tim
  hasil: Dunia['hasil']
  unit: SnapshotUnit[]
  bangunan: SnapshotBangunan[]
  sumberDaya: { gold: number; kayu: number; daging: number }
  riset?: Record<JenisRiset, number>
  /** Sumber daya di peta; jumlahnya kecil dan berubah lambat. */
  pohon: { id: number; x: number; y: number; kayu?: number }[]
  tunggul?: { id: number; x: number; y: number; sisaTumbuh: number }[]
  tambang: { id: number; x: number; y: number; jenis: 'mine' | 'stone'; gold?: number }[]
  domba: { id: number; x: number; y: number; daging?: number; bergerak?: boolean; arah?: 1 | -1 }[]
  daging: { id: number; x: number; y: number; jumlah?: number }[]
  kejadian?: Kejadian[]
}

type SnapshotUnit = [
  id: number, tim: Tim, peran: string, x: number, y: number,
  hp: number, hpMaks: number, level: number, camp: number,
  arah?: 1 | -1, aksi?: AksiUnit, bawaan?: JenisBawaan | null,
  sudutSerang?: number, skillJeda?: number, tugas?: TugasUnit,
]
type SnapshotBangunan = [
  id: number, tim: Tim, jenis: string, x: number, y: number,
  hp: number, hpMaks: number, fase: string,
  rallyX?: number | null, rallyY?: number | null, sisaBangun?: number,
  antrean?: AntreanLatih[] | null, riset?: Bangunan['riset'], revive?: Bangunan['revive'],
]

const bulat = (v: number): number => Math.round(v * 10) / 10

function kejadianTerlihat(dunia: Dunia, untuk: Tim, k: Kejadian): boolean {
  switch (k.jenis) {
    case 'unitLuka':
    case 'unitSembuh':
    case 'bangunanLuka':
    case 'bangunanHancur':
    case 'skillHero':
    case 'unitMati':
      return k.tim === untuk || terlihatDi(dunia, untuk, k.x, k.y)
    case 'sumberDayaMasuk':
    case 'heroNaikLevel':
    case 'risetSelesai':
    case 'unitSelesai':
    case 'bangunanSelesai':
    case 'heroBangkit':
    case 'heroGugur':
      return k.tim === untuk
    default:
      return false
  }
}

/**
 * Membuat snapshot UNTUK SATU PEMAIN. Memakai saringUntuk supaya unit musuh
 * yang sedang di fog tidak ikut terkirim (PRD §12.3 / AC-12.8).
 */
export function buatSnapshot(dunia: Dunia, untuk: Tim): Snapshot {
  const saring = saringUntuk(dunia, untuk)
  return {
    tick: dunia.tick,
    untuk,
    hasil: dunia.hasil,
    unit: saring.unit.map((u): SnapshotUnit => [
      u.id, u.tim, u.peran, bulat(u.x), bulat(u.y),
      Math.round(u.hp), u.hpMaks, u.level, u.campId ?? -1,
      u.arah, u.aksi, u.bawaanJenis, bulat(u.sudutSerang), bulat(u.skillJeda), u.tugas,
    ]),
    bangunan: saring.bangunan.map((b): SnapshotBangunan => [
      b.id, b.tim, b.jenis, bulat(b.x), bulat(b.y), Math.round(b.hp), b.hpMaks, b.fase,
      b.tim === untuk ? bulat(b.rallyX) : null,
      b.tim === untuk ? bulat(b.rallyY) : null,
      bulat(b.sisaBangun),
      b.tim === untuk ? b.antrean.map((a) => ({ peran: a.peran, sisaDetik: bulat(a.sisaDetik) })) : null,
      b.tim === untuk && b.riset ? { jenis: b.riset.jenis, sisaDetik: bulat(b.riset.sisaDetik) } : null,
      b.tim === untuk && b.revive ? { ...b.revive, sisaDetik: bulat(b.revive.sisaDetik) } : null,
    ]),
    sumberDaya: { ...dunia.tim[untuk].sumberDaya },
    riset: { ...dunia.tim[untuk].riset },
    pohon: dunia.pohon.map((p) => ({ id: p.id, x: p.x, y: p.y, kayu: Math.round(p.kayu) })),
    tunggul: dunia.tunggul.map((tg) => ({ id: tg.id, x: tg.x, y: tg.y, sisaTumbuh: Math.ceil(tg.sisaTumbuh) })),
    tambang: dunia.tambang.map((t) => ({ id: t.id, x: t.x, y: t.y, jenis: t.jenis, gold: Math.round(t.gold) })),
    domba: dunia.domba.map((d) => ({ id: d.id, x: bulat(d.x), y: bulat(d.y), daging: d.daging, bergerak: d.bergerak, arah: d.arah })),
    daging: dunia.daging.map((d) => ({ id: d.id, x: d.x, y: d.y, jumlah: d.jumlah })),
    kejadian: dunia.kejadian.filter((k) => kejadianTerlihat(dunia, untuk, k)),
  }
}

/**
 * Menerapkan snapshot ke dunia guest. Guest TIDAK menjalankan simulasi — ia
 * hanya menggambar apa yang dikirim host, lalu menghitung fog-nya sendiri dari
 * unit miliknya (yang selalu lengkap di snapshot).
 */
export function terapkanSnapshot(dunia: Dunia, s: Snapshot, lamaUnit: Map<number, Unit>, untuk?: Tim): void {
  dunia.tick = s.tick
  dunia.hasil = s.hasil

  const unitBaru: Unit[] = []
  for (const [
    id, tim, peran, x, y, hp, hpMaks, level, camp,
    arah, aksi, bawaan, sudutSerang, skillJeda, tugas,
  ] of s.unit) {
    const lama = lamaUnit.get(id)
    if (lama) {
      lama.x = x
      lama.y = y
      lama.hp = hp
      lama.hpMaks = hpMaks
      lama.level = level
      if (arah !== undefined) lama.arah = arah
      if (aksi !== undefined) lama.aksi = aksi
      if (bawaan !== undefined) lama.bawaanJenis = bawaan
      if (sudutSerang !== undefined) lama.sudutSerang = sudutSerang
      if (skillJeda !== undefined) lama.skillJeda = skillJeda
      if (tugas !== undefined) lama.tugas = tugas
      unitBaru.push(lama)
      continue
    }
    unitBaru.push({
      id, tim, peran: peran as Unit['peran'], x, y,
      hp, hpMaks, dmg: 0, jarak: 0, jeda: 1, kecepatan: 0, jedaTimer: 0,
      tugas: tugas ?? 'diam', tx: x, ty: y, targetId: null,
      bawaanJenis: bawaan ?? null, bawaanJumlah: 0, tikPanen: 0,
      arah: arah ?? (tim === 'red' ? -1 : 1),
      aksi: aksi ?? 'diam',
      tikAksi: 0,
      sudutSerang: sudutSerang ?? 0,
      jalur: null, jalurKeX: x, jalurKeY: y,
      campId: camp < 0 ? null : camp,
      hero: level > 0 && ['berserker', 'king', 'knight', 'champion'].includes(peran),
      level, xp: 0, skillJeda: skillJeda ?? 0,
    })
  }
  dunia.unit = unitBaru

  const lamaBangunan = new Map(dunia.bangunan.map((b) => [b.id, b]))
  dunia.bangunan = s.bangunan.map(([
    id, tim, jenis, x, y, hp, hpMaks, fase,
    rallyX, rallyY, sisaBangun, antrean, riset, revive,
  ]): Bangunan => {
    const lama = lamaBangunan.get(id)
    if (lama) {
      lama.hp = hp
      lama.fase = fase as Bangunan['fase']
      if (rallyX !== undefined && rallyX !== null) lama.rallyX = rallyX
      if (rallyY !== undefined && rallyY !== null) lama.rallyY = rallyY
      if (sisaBangun !== undefined) lama.sisaBangun = sisaBangun
      if (antrean !== undefined && antrean !== null) lama.antrean = antrean
      if (riset !== undefined) lama.riset = riset
      if (revive !== undefined) lama.revive = revive
      return lama
    }
    return {
      id, tim, jenis: jenis as Bangunan['jenis'], x, y, hp, hpMaks,
      fase: fase as Bangunan['fase'], sisaBangun: sisaBangun ?? 0,
      antrean: antrean ?? [],
      jedaTembak: 0,
      rallyX: rallyX ?? x,
      rallyY: rallyY ?? y,
      revive: revive ?? null,
      jedaDomba: 0,
      riset: riset ?? null,
    }
  })

  const timTarget = untuk ?? s.untuk ?? 'red'
  if (s.sumberDaya) {
    dunia.tim[timTarget].sumberDaya = { ...s.sumberDaya }
  }
  if (s.riset) {
    dunia.tim[timTarget].riset = { ...s.riset }
  }

  dunia.pohon = s.pohon.map((p) => ({ id: p.id, x: p.x, y: p.y, kayu: p.kayu ?? 120 }))
  dunia.tunggul = (s.tunggul ?? []).map((tg) => ({ ...tg }))
  dunia.tambang = s.tambang.map((t) => ({ id: t.id, x: t.x, y: t.y, jenis: t.jenis, gold: t.gold ?? 1000 }))
  dunia.domba = s.domba.map((d) => ({
    id: d.id, x: d.x, y: d.y, daging: d.daging ?? 45,
    asalX: d.x, asalY: d.y, tx: d.x, ty: d.y, jedaJalan: 2,
    arah: d.arah ?? 1, bergerak: d.bergerak ?? false,
  }))
  dunia.daging = s.daging.map((d) => ({ id: d.id, x: d.x, y: d.y, jumlah: d.jumlah ?? 18, sisaDetik: 30 }))
  if (s.kejadian) dunia.kejadian = s.kejadian
  segarkanHalangan(dunia)
}
