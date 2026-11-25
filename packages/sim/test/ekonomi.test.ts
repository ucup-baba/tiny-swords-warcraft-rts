import { describe, expect, it } from 'vitest'
import {
  BANGUNAN, PANEN, buatBangunan, buatDunia, buatUnit, langkahBanyak,
  mampuBayar, bayar, supplyMaks, supplyTerpakai, terapkanPerintah,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 1 })

describe('sumber daya awal (PRD §9.3)', () => {
  it('kedua pemain mulai dengan 320 gold / 220 kayu / 140 daging', () => {
    const d = dunia0()
    for (const tim of ['blue', 'red'] as const) {
      expect(d.tim[tim].sumberDaya).toEqual({ gold: 320, kayu: 220, daging: 140 })
    }
  })
})

describe('supply (PRD §2)', () => {
  it('castle memberi +10 dan house +8', () => {
    const d = dunia0()
    // Peta awal: 1 castle + 1 house per pemain.
    expect(supplyMaks(d, 'blue')).toBe(BANGUNAN.castle.supply + BANGUNAN.house.supply)
    expect(supplyMaks(d, 'blue')).toBe(18)
  })

  it('dibatasi maksimum 50', () => {
    const d = dunia0()
    for (let i = 0; i < 10; i++) buatBangunan(d, 'blue', 'house', 1000 + i * 200, 1000, 'aktif')
    expect(supplyMaks(d, 'blue')).toBe(50)
  })

  it('bangunan dalam konstruksi belum memberi supply', () => {
    const d = dunia0()
    const sebelum = supplyMaks(d, 'blue')
    buatBangunan(d, 'blue', 'house', 1000, 1000, 'konstruksi')
    expect(supplyMaks(d, 'blue')).toBe(sebelum)
  })

  it('hero tidak memakan supply (PRD §11.1)', () => {
    const d = dunia0()
    const sebelum = supplyTerpakai(d, 'blue')
    buatUnit(d, 'blue', 'king', 1000, 1000)
    expect(supplyTerpakai(d, 'blue')).toBe(sebelum)
  })

  it('5 pawn awal memakan 5 pop', () => {
    const d = dunia0()
    expect(supplyTerpakai(d, 'blue')).toBe(5)
  })
})

describe('bayar', () => {
  it('menolak kalau sumber daya kurang dan tidak mengubah apa pun', () => {
    const d = dunia0()
    expect(mampuBayar(d, 'blue', 9999, 0, 0)).toBe(false)
    expect(bayar(d, 'blue', 9999, 0, 0)).toBe(false)
    expect(d.tim.blue.sumberDaya.gold).toBe(320)
  })

  it('mengurangi tepat sesuai biaya', () => {
    const d = dunia0()
    expect(bayar(d, 'blue', 100, 50, 20)).toBe(true)
    expect(d.tim.blue.sumberDaya).toEqual({ gold: 220, kayu: 170, daging: 120 })
  })
})

describe('siklus panen pawn', () => {
  it('pawn menebang pohon lalu mengantar kayu ke castle', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const pohon = d.pohon[0]!
    const kayuAwal = d.tim.blue.sumberDaya.kayu

    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: pohon.id })
    langkahBanyak(d, 60 * 40)

    expect(d.tim.blue.sumberDaya.kayu).toBeGreaterThan(kayuAwal)
    expect(d.tim.blue.statistik.kayuTerkumpul).toBeGreaterThanOrEqual(PANEN.kayuPerAntar)
  })

  it('pawn menambang gold lalu mengantar ke castle', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const tambang = d.tambang.find((t) => t.x < 3000)!
    const goldAwal = d.tim.blue.sumberDaya.gold

    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: tambang.id })
    langkahBanyak(d, 60 * 40)

    expect(d.tim.blue.sumberDaya.gold).toBeGreaterThan(goldAwal)
  })

  it('memanen domba memberi daging dan domba ITU hilang', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const domba = d.domba.find((s) => s.x < 3000)!
    const dagingAwal = d.tim.blue.sumberDaya.daging

    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: domba.id })
    langkahBanyak(d, 60 * 40)

    // Jumlah total tidak dipakai sebagai patokan: House memunculkan domba baru
    // selama 40 detik itu (PRD §3). Yang diperiksa adalah domba yang dipanen.
    expect(d.domba.some((s) => s.id === domba.id)).toBe(false)
    expect(d.tim.blue.sumberDaya.daging).toBe(dagingAwal + PANEN.dagingDomba)
  })

  it('pohon habis dibuang dari peta', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const pohon = d.pohon[0]!
    pohon.kayu = PANEN.kayuPerAntar // tinggal satu kali antar
    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: pohon.id })
    langkahBanyak(d, 60 * 30)
    expect(d.pohon.some((p) => p.id === pohon.id)).toBe(false)
  })
})
