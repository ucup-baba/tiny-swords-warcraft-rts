import { describe, expect, it } from 'vitest'
import { BARIS_ELEV, GUGUS_FLAT, selAutotile } from '../src/autotile.js'

// Tata letak atlas dibaca langsung dari Tilemap_Flat.png & Tilemap_Elevation.png.
// Tes ini mengunci pemetaannya supaya tidak diam-diam bergeser.

describe('selAutotile', () => {
  it('dikelilingi sejenis -> sel tengah', () => {
    expect(selAutotile(true, true, true, true)).toEqual({ kol: 1, bar: 1 })
  })

  it('tidak ada tetangga -> sel sempit & pendek', () => {
    expect(selAutotile(false, false, false, false)).toEqual({ kol: 3, bar: 3 })
  })

  it('hanya ada tetangga kanan -> tepi kiri', () => {
    expect(selAutotile(false, true, true, true).kol).toBe(0)
  })

  it('hanya ada tetangga kiri -> tepi kanan', () => {
    expect(selAutotile(true, false, true, true).kol).toBe(2)
  })

  it('hanya ada tetangga bawah -> tepi atas', () => {
    expect(selAutotile(true, true, false, true).bar).toBe(0)
  })

  it('hanya ada tetangga atas -> tepi bawah', () => {
    expect(selAutotile(true, true, true, false).bar).toBe(2)
  })

  it('selalu di dalam kisi 4x4', () => {
    for (const a of [true, false]) for (const b of [true, false])
      for (const c of [true, false]) for (const d of [true, false]) {
        const s = selAutotile(a, b, c, d)
        expect(s.kol).toBeGreaterThanOrEqual(0)
        expect(s.kol).toBeLessThan(4)
        expect(s.bar).toBeGreaterThanOrEqual(0)
        expect(s.bar).toBeLessThan(4)
      }
  })
})

describe('offset atlas', () => {
  it('gugus rumput di kolom 0, pasir di kolom 5', () => {
    expect(GUGUS_FLAT.rumput).toBe(0)
    expect(GUGUS_FLAT.pasir).toBe(5)
  })

  it('baris elevasi: permukaan 0-2, tebing 3, ramp 7', () => {
    expect(BARIS_ELEV.permukaanAtas).toBe(0)
    expect(BARIS_ELEV.permukaanBawah).toBe(2)
    expect(BARIS_ELEV.tebing).toBe(3)
    expect(BARIS_ELEV.ramp).toBe(7)
  })
})
