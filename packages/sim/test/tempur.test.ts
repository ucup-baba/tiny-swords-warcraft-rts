import { describe, expect, it } from 'vitest'
import {
  buatBangunan, buatDunia, buatUnit, langkah, langkahBanyak, lukaiBangunan,
  lukaiUnit, terapkanPerintah,
} from '../src/index.js'

/**
 * Arena bersih untuk menguji satu sistem saja.
 *
 * Tiap tim TETAP diberi castle di sudut yang jauh: tanpa castle, langkahAkhir
 * langsung mengakhiri match di langkah pertama (PRD §13.1) dan seluruh
 * simulasi berhenti. Castle-nya jauh di luar radius aggro 320 supaya tidak
 * ikut campur dalam pertempuran yang diuji.
 */
const kosong = () => {
  const d = buatDunia({ seed: 7 })
  d.unit.length = 0
  d.bangunan.length = 0
  d.pohon.length = 0
  d.tambang.length = 0
  d.domba.length = 0
  d.tim.blue.heroHidup = null
  d.tim.red.heroHidup = null
  buatBangunan(d, 'blue', 'castle', 5800, 5800, 'aktif')
  buatBangunan(d, 'red', 'castle', 200, 200, 'aktif')
  d.tim.blue.statistik.bangunanDibangun = 0
  d.tim.red.statistik.bangunanDibangun = 0
  return d
}

describe('kerusakan unit', () => {
  it('unit yang hp-nya habis dibuang dan dicatat statistiknya', () => {
    const d = kosong()
    const korban = buatUnit(d, 'red', 'warrior', 500, 500)
    const pembunuh = buatUnit(d, 'blue', 'warrior', 520, 500)

    lukaiUnit(d, korban, 9999, pembunuh)

    expect(d.unit.some((u) => u.id === korban.id)).toBe(false)
    expect(d.tim.red.statistik.gugur).toBe(1)
    expect(d.tim.blue.statistik.bunuh).toBe(1)
  })

  it('unit biasa menjatuhkan daging saat gugur (PRD §2)', () => {
    const d = kosong()
    const korban = buatUnit(d, 'red', 'warrior', 500, 500)
    lukaiUnit(d, korban, 9999, null)
    expect(d.daging).toHaveLength(1)
    expect(d.daging[0]!.jumlah).toBe(18)
  })

  it('hero TIDAK menjatuhkan daging (PRD §11.2)', () => {
    const d = kosong()
    const hero = buatUnit(d, 'red', 'king', 500, 500)
    d.tim.red.heroHidup = hero.id
    lukaiUnit(d, hero, 9999, null)
    expect(d.daging).toHaveLength(0)
  })

  it('memancarkan kejadian unitMati', () => {
    const d = kosong()
    const korban = buatUnit(d, 'red', 'pawn', 100, 100)
    lukaiUnit(d, korban, 9999, null)
    expect(d.kejadian.some((k) => k.jenis === 'unitMati')).toBe(true)
  })
})

describe('pertempuran jarak dekat', () => {
  it('dua warrior bermusuhan saling bunuh sampai tersisa satu', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'warrior', 500, 500)
    buatUnit(d, 'red', 'warrior', 540, 500)
    langkahBanyak(d, 60 * 30)
    expect(d.unit.length).toBeLessThanOrEqual(1)
  })

  it('lancer mengalahkan pawn karena hp & damage lebih besar', () => {
    const d = kosong()
    const lancer = buatUnit(d, 'blue', 'lancer', 500, 500)
    buatUnit(d, 'red', 'pawn', 540, 500)
    langkahBanyak(d, 60 * 25)
    expect(d.unit.map((u) => u.id)).toEqual([lancer.id])
  })
})

describe('unit jarak jauh & proyektil', () => {
  it('archer menembakkan proyektil, bukan memukul langsung', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'archer', 500, 500)
    buatUnit(d, 'red', 'warrior', 700, 500)
    langkah(d)
    expect(d.proyektil.length).toBeGreaterThan(0)
    expect(d.proyektil[0]!.jenis).toBe('panah')
  })

  it('proyektil akhirnya mengenai dan melukai targetnya', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'archer', 500, 500)
    const target = buatUnit(d, 'red', 'warrior', 700, 500)
    const hpAwal = target.hp
    langkahBanyak(d, 60)
    expect(target.hp).toBeLessThan(hpAwal)
  })

  it('orb mage melukai beberapa musuh sekaligus (area)', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'mage', 400, 500)
    const a = buatUnit(d, 'red', 'pawn', 600, 500)
    const b = buatUnit(d, 'red', 'pawn', 630, 520)
    langkahBanyak(d, 90)
    expect(a.hp).toBeLessThan(a.hpMaks)
    expect(b.hp).toBeLessThan(b.hpMaks)
  })
})

describe('monk menyembuhkan, bukan menyerang', () => {
  it('menyembuhkan sekutu yang terluka', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'monk', 500, 500)
    const terluka = buatUnit(d, 'blue', 'warrior', 560, 500)
    terluka.hp = 40
    langkahBanyak(d, 60 * 4)
    expect(terluka.hp).toBeGreaterThan(40)
  })

  it('tidak pernah menyembuhkan melewati hp maksimum', () => {
    const d = kosong()
    buatUnit(d, 'blue', 'monk', 500, 500)
    const terluka = buatUnit(d, 'blue', 'warrior', 560, 500)
    terluka.hp = terluka.hpMaks - 1
    langkahBanyak(d, 60 * 10)
    expect(terluka.hp).toBe(terluka.hpMaks)
  })
})

describe('tahan posisi (PRD §5.9)', () => {
  it('unit yang menahan tidak mengejar musuh di luar jangkauannya', () => {
    const d = kosong()
    const w = buatUnit(d, 'blue', 'warrior', 500, 500)
    buatUnit(d, 'red', 'warrior', 900, 500)
    terapkanPerintah(d, 'blue', { jenis: 'tahan', ids: [w.id] })
    langkahBanyak(d, 60 * 3)
    expect(w.x).toBe(500)
    expect(w.y).toBe(500)
  })
})

describe('kerusakan bangunan', () => {
  it('bangunan hancur saat hp habis dan memancarkan kejadian', () => {
    const d = kosong()
    const b = buatBangunan(d, 'red', 'house', 800, 800, 'aktif')
    lukaiBangunan(d, b, 9999, 'blue')
    expect(b.fase).toBe('hancur')
    expect(d.tim.red.statistik.bangunanHilang).toBe(1)
    expect(d.kejadian.some((k) => k.jenis === 'bangunanHancur')).toBe(true)
  })

  it('bangunan yang sudah hancur tidak bisa dilukai lagi', () => {
    const d = kosong()
    const b = buatBangunan(d, 'red', 'house', 800, 800, 'aktif')
    lukaiBangunan(d, b, 9999, 'blue')
    lukaiBangunan(d, b, 9999, 'blue')
    expect(d.tim.red.statistik.bangunanHilang).toBe(1)
  })
})

describe('guard tower (PRD §3)', () => {
  it('menembak musuh yang masuk radius', () => {
    const d = kosong()
    buatBangunan(d, 'blue', 'tower', 500, 500, 'aktif')
    const musuh = buatUnit(d, 'red', 'pawn', 700, 500)
    const hpAwal = musuh.hp
    langkahBanyak(d, 60 * 2)
    expect(musuh.hp).toBeLessThan(hpAwal)
  })

  it('mengabaikan musuh di luar radius 340', () => {
    const d = kosong()
    buatBangunan(d, 'blue', 'tower', 500, 500, 'aktif')
    const jauh = buatUnit(d, 'red', 'pawn', 1200, 500)
    jauh.tugas = 'tahan'
    langkahBanyak(d, 60 * 2)
    expect(jauh.hp).toBe(jauh.hpMaks)
  })
})
