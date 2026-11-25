import { DT_TETAP } from '@hftf/shared'
import { describe, expect, it } from 'vitest'
import { acak, buatDunia, buatRng, langkah, langkahBanyak, terapkanPerintah } from '../src/index.js'

describe('rng ber-seed', () => {
  it('seed sama menghasilkan urutan sama', () => {
    const a = buatRng(99)
    const b = buatRng(99)
    for (let i = 0; i < 50; i++) expect(acak(a)).toBe(acak(b))
  })

  it('selalu di rentang [0,1)', () => {
    const r = buatRng(5)
    for (let i = 0; i < 1000; i++) {
      const v = acak(r)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('seed 0 tidak membuat generator macet', () => {
    const r = buatRng(0)
    const nilai = new Set(Array.from({ length: 20 }, () => acak(r)))
    expect(nilai.size).toBeGreaterThan(15)
  })
})

describe('dunia', () => {
  it('spawn menambah entitas dengan id naik', () => {
    const d = buatDunia(1)
    terapkanPerintah(d, { jenis: 'spawn', tim: 'blue', x: 100, y: 100 })
    terapkanPerintah(d, { jenis: 'spawn', tim: 'red', x: 200, y: 200 })
    expect(d.entitas.map((e) => e.id)).toEqual([1, 2])
    expect(d.entitas.map((e) => e.tim)).toEqual(['blue', 'red'])
  })

  it('entitas bergerak menuju target dan berhenti tepat di sana', () => {
    const d = buatDunia(1)
    terapkanPerintah(d, { jenis: 'spawn', tim: 'blue', x: 0, y: 0 })
    const e = d.entitas[0]!
    e.x = 0
    e.y = 0
    terapkanPerintah(d, { jenis: 'pindah', ids: [e.id], x: 300, y: 0 })

    langkah(d)
    expect(e.x).toBeCloseTo(e.kecepatan * DT_TETAP, 6)

    langkahBanyak(d, 600)
    expect(e.x).toBe(300)
    expect(e.y).toBe(0)
  })

  it('entitas dengan hp habis dibuang', () => {
    const d = buatDunia(1)
    terapkanPerintah(d, { jenis: 'spawn', tim: 'blue', x: 10, y: 10 })
    terapkanPerintah(d, { jenis: 'spawn', tim: 'blue', x: 20, y: 20 })
    terapkanPerintah(d, { jenis: 'lukai', id: 1, jumlah: 999 })
    langkah(d)
    expect(d.entitas.map((e) => e.id)).toEqual([2])
  })

  it('tick naik satu tiap langkah', () => {
    const d = buatDunia(1)
    langkahBanyak(d, 37)
    expect(d.tick).toBe(37)
  })
})
