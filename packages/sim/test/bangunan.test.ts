import { describe, expect, it } from 'vitest'
import {
  BANGUNAN, UNIT, buatBangunan, buatDunia, langkahBanyak, terapkanPerintah,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 3 })

describe('siklus konstruksi (PRD §3)', () => {
  it('bangunan baru mulai di 15% hp dan fase konstruksi', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [pawn.id], bangunan: 'house', x: pawn.x + 100, y: pawn.y })
    const b = d.bangunan.find((x) => x.fase === 'konstruksi')!
    expect(b.hp).toBe(Math.round(BANGUNAN.house.hp * 0.15))
  })

  it('biaya dibayar di muka saat perintah bangun', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const goldAwal = d.tim.blue.sumberDaya.gold
    const kayuAwal = d.tim.blue.sumberDaya.kayu
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [pawn.id], bangunan: 'house', x: pawn.x + 100, y: pawn.y })
    expect(d.tim.blue.sumberDaya.gold).toBe(goldAwal - BANGUNAN.house.gold)
    expect(d.tim.blue.sumberDaya.kayu).toBe(kayuAwal - BANGUNAN.house.kayu)
  })

  it('tidak membangun kalau sumber daya kurang', () => {
    const d = dunia0()
    d.tim.blue.sumberDaya.gold = 0
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const jumlah = d.bangunan.length
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [pawn.id], bangunan: 'barracks', x: pawn.x + 100, y: pawn.y })
    expect(d.bangunan.length).toBe(jumlah)
  })

  it('pawn menyelesaikan konstruksi sampai aktif dan hp penuh', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [pawn.id], bangunan: 'house', x: pawn.x + 80, y: pawn.y })
    const b = d.bangunan.find((x) => x.fase === 'konstruksi')!
    langkahBanyak(d, 60 * 20)
    expect(b.fase).toBe('aktif')
    expect(b.hp).toBe(b.hpMaks)
  })

  it('memancarkan kejadian bangunanSelesai', () => {
    const d = dunia0()
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [pawn.id], bangunan: 'house', x: pawn.x + 80, y: pawn.y })
    let lihat = false
    for (let i = 0; i < 60 * 20; i++) {
      langkahBanyak(d, 1)
      if (d.kejadian.some((k) => k.jenis === 'bangunanSelesai')) lihat = true
    }
    expect(lihat).toBe(true)
  })
})

describe('antrean latih', () => {
  it('castle melatih pawn dan memotong biayanya', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const goldAwal = d.tim.blue.sumberDaya.gold
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
    expect(castle.antrean).toHaveLength(1)
    expect(d.tim.blue.sumberDaya.gold).toBe(goldAwal - UNIT.pawn.gold)
  })

  it('unit muncul di titik rally setelah waktu latih', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const jumlah = d.unit.filter((u) => u.tim === 'blue').length
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
    langkahBanyak(d, Math.ceil(UNIT.pawn.waktuLatih * 60) + 2)
    expect(d.unit.filter((u) => u.tim === 'blue').length).toBe(jumlah + 1)
  })

  it('menolak unit yang tidak dilatih bangunan itu', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: castle.id, peran: 'mage' })
    expect(castle.antrean).toHaveLength(0)
  })

  it('bangunan dalam konstruksi tidak bisa melatih', () => {
    const d = dunia0()
    const b = buatBangunan(d, 'blue', 'barracks', 2000, 2000, 'konstruksi')
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: b.id, peran: 'warrior' })
    expect(b.antrean).toHaveLength(0)
  })

  it('batal latih mengembalikan biaya penuh', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const goldAwal = d.tim.blue.sumberDaya.gold
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: castle.id, peran: 'pawn' })
    terapkanPerintah(d, 'blue', { jenis: 'batalLatih', bangunanId: castle.id, indeks: 0 })
    expect(castle.antrean).toHaveLength(0)
    expect(d.tim.blue.sumberDaya.gold).toBe(goldAwal)
  })

  it('perintah ke bangunan tim lain diabaikan', () => {
    const d = dunia0()
    const castleMerah = d.bangunan.find((b) => b.tim === 'red' && b.jenis === 'castle')!
    terapkanPerintah(d, 'blue', { jenis: 'latih', bangunanId: castleMerah.id, peran: 'pawn' })
    expect(castleMerah.antrean).toHaveLength(0)
  })
})

describe('perbaikan (PRD §3 poin 3)', () => {
  it('pawn memulihkan hp dan menghabiskan kayu', () => {
    const d = dunia0()
    const house = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'house')!
    house.hp = 100
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const kayuAwal = d.tim.blue.sumberDaya.kayu

    terapkanPerintah(d, 'blue', { jenis: 'perbaiki', ids: [pawn.id], targetId: house.id })
    langkahBanyak(d, 60 * 10)

    expect(house.hp).toBeGreaterThan(100)
    expect(d.tim.blue.sumberDaya.kayu).toBeLessThan(kayuAwal)
  })

  it('berhenti tepat di hp maksimum', () => {
    const d = dunia0()
    const house = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'house')!
    house.hp = house.hpMaks - 20
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    terapkanPerintah(d, 'blue', { jenis: 'perbaiki', ids: [pawn.id], targetId: house.id })
    langkahBanyak(d, 60 * 20)
    expect(house.hp).toBe(house.hpMaks)
  })
})

describe('rally point', () => {
  it('bisa dipindah dan unit baru muncul di sana', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    terapkanPerintah(d, 'blue', { jenis: 'rally', bangunanId: castle.id, x: 1111, y: 2222 })
    expect(castle.rallyX).toBe(1111)
    expect(castle.rallyY).toBe(2222)
  })
})
