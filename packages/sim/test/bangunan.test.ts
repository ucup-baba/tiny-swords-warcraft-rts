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

  it('kerja bakti multi-Pawn menambah +50% kecepatan tiap Pawn pembantu (2 Pawn = 1.5x)', () => {
    // 1 Pawn vs 2 Pawn persis di samping bangunan konstruksi yang sama
    const d1 = dunia0()
    const d2 = dunia0()
    const p1 = d1.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const b1 = buatBangunan(d1, 'blue', 'barracks', p1.x + 20, p1.y, 'konstruksi')
    p1.tugas = 'bangun'
    p1.targetId = b1.id

    const pawns2 = d2.unit.filter((u) => u.tim === 'blue' && u.peran === 'pawn')
    const p2a = pawns2[0]!
    const p2b = pawns2[1]!
    const b2 = buatBangunan(d2, 'blue', 'barracks', p2a.x + 20, p2a.y, 'konstruksi')
    p2b.x = p2a.x
    p2b.y = p2a.y + 10
    p2a.tugas = 'bangun'; p2a.targetId = b2.id
    p2b.tugas = 'bangun'; p2b.targetId = b2.id

    // Setelah 60 tick (1 detik): 1 Pawn kurangi 1.0s, 2 Pawn kurangi 1.5s
    const awal = BANGUNAN.barracks.waktuBangun
    langkahBanyak(d1, 60)
    langkahBanyak(d2, 60)
    expect(awal - b1.sisaBangun).toBeCloseTo(1.0, 2)
    expect(awal - b2.sisaBangun).toBeCloseTo(1.5, 2)
  })

  it('pondasi tanpa pekerja (ids: []) tetap bisa ditaruh saat semua Pawn sibuk dan otomatis dilanjutkan Pawn yang selesai duluan', () => {
    const d = dunia0()
    d.tim.blue.sumberDaya = { gold: 500, kayu: 500, daging: 200 }
    // Sisakan tepat 1 Pawn supaya semua Pawn langsung sibuk setelah bangunan ke-1
    const semuaPawn = d.unit.filter((u) => u.tim === 'blue' && u.peran === 'pawn')
    const satu = semuaPawn[0]!
    d.unit = d.unit.filter((u) => u.tim !== 'blue' || u.peran !== 'pawn' || u.id === satu.id)

    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [satu.id], bangunan: 'house', x: satu.x + 70, y: satu.y })
    const b1 = d.bangunan.find((x) => x.fase === 'konstruksi')!
    expect(satu.tugas).toBe('bangun')
    expect(satu.targetId).toBe(b1.id)

    // Taruh bangunan ke-2 dengan ids: [] -> b1 TIDAK ditinggalkan, b2 tetap jadi pondasi
    terapkanPerintah(d, 'blue', { jenis: 'bangun', ids: [], bangunan: 'house', x: satu.x + 220, y: satu.y })
    const konstruksi = d.bangunan.filter((x) => x.fase === 'konstruksi')
    expect(konstruksi).toHaveLength(2)
    expect(satu.targetId).toBe(b1.id)

    // Biarkan simulasi berjalan -> satu Pawn menyelesaikan b1 lalu otomatis lanjut menyelesaikan b2!
    langkahBanyak(d, 60 * 35)
    expect(konstruksi[0]!.fase).toBe('aktif')
    expect(konstruksi[1]!.fase).toBe('aktif')
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
