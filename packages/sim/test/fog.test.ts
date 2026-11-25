import { TILE, TINGGI } from '@hftf/shared'
import { describe, expect, it } from 'vitest'
import {
  PANDANG, TICK_PER_FOG, buatDunia, buatUnit, langkahBanyak, pernahLihat,
  saringUntuk, terlihatDi, tinggiDiPiksel,
} from '../src/index.js'

const dunia0 = () => {
  const d = buatDunia({ seed: 515 })
  langkahBanyak(d, TICK_PER_FOG + 1) // fog diperbarui 4x/detik, bukan tiap tick
  return d
}

describe('AC-12.1 — peta mulai gelap', () => {
  it('sebagian besar peta belum pernah dilihat saat mulai', () => {
    const d = dunia0()
    const total = d.terrain.kolom * d.terrain.baris
    let pernah = 0
    for (const v of d.fog.blue.pernah) pernah += v
    expect(pernah / total).toBeLessThan(0.2)
  })

  it('sekitar basis sendiri terlihat', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    expect(terlihatDi(d, 'blue', castle.x, castle.y)).toBe(true)
  })

  it('basis lawan tidak terlihat dari awal', () => {
    const d = dunia0()
    const musuh = d.bangunan.find((b) => b.tim === 'red' && b.jenis === 'castle')!
    expect(terlihatDi(d, 'blue', musuh.x, musuh.y)).toBe(false)
    expect(pernahLihat(d, 'blue', musuh.x, musuh.y)).toBe(false)
  })
})

describe('AC-12.2 / 12.3 — tiga tingkat & ingatan', () => {
  it('wilayah yang ditinggalkan jadi "pernah" tapi tidak "kini"', () => {
    const d = buatDunia({ seed: 515 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const jauhX = castle.x + 1400
    const jauhY = castle.y

    const pengintai = buatUnit(d, 'blue', 'archer', jauhX, jauhY)
    langkahBanyak(d, TICK_PER_FOG + 1)
    expect(terlihatDi(d, 'blue', jauhX, jauhY)).toBe(true)

    // Pengintai ditarik pulang.
    pengintai.x = castle.x
    pengintai.y = castle.y
    langkahBanyak(d, TICK_PER_FOG * 2)

    expect(terlihatDi(d, 'blue', jauhX, jauhY)).toBe(false)
    expect(pernahLihat(d, 'blue', jauhX, jauhY)).toBe(true)
  })
})

describe('AC-12.5 — hero melihat paling jauh', () => {
  it('radius hero lebih besar dari pawn dan unit tempur biasa', () => {
    expect(PANDANG.hero).toBeGreaterThan(PANDANG.tempur)
    expect(PANDANG.hero).toBeGreaterThan(PANDANG.pawn)
    expect(PANDANG.castle).toBeGreaterThan(PANDANG.hero)
  })
})

describe('AC-12.6 / 12.7 — elevasi', () => {
  it('isi plateau TIDAK terlihat dari dataran di bawahnya', () => {
    const d = buatDunia({ seed: 515 })
    const p = d.titik.plateauPusat

    // Cari dataran tepat di luar plateau.
    let bawah: { x: number; y: number } | null = null
    for (let r = 12; r <= 20 && !bawah; r++) {
      const x = (p.tx + r) * TILE + 32
      const y = p.ty * TILE + 32
      if (tinggiDiPiksel(d.terrain, x, y) === TINGGI.dataran) bawah = { x, y }
    }
    expect(bawah).not.toBeNull()

    buatUnit(d, 'blue', 'archer', bawah!.x, bawah!.y)
    langkahBanyak(d, TICK_PER_FOG + 1)

    // Pusat plateau jauh di dalam, harus tetap gelap walau jaraknya dekat.
    expect(terlihatDi(d, 'blue', p.tx * TILE + 32, p.ty * TILE + 32)).toBe(false)
  })

  it('berdiri DI plateau membuka isinya', () => {
    const d = buatDunia({ seed: 515 })
    const p = d.titik.plateauPusat
    buatUnit(d, 'blue', 'archer', p.tx * TILE + 32, p.ty * TILE + 32)
    langkahBanyak(d, TICK_PER_FOG + 1)
    expect(terlihatDi(d, 'blue', (p.tx + 4) * TILE, p.ty * TILE)).toBe(true)
  })
})

describe('AC-12.8 — anti-maphack', () => {
  it('saringUntuk membuang unit musuh yang sedang di fog', () => {
    const d = dunia0()
    const saring = saringUntuk(d, 'blue')
    const musuhBocor = saring.unit.filter(
      (u) => u.tim !== 'blue' && !terlihatDi(d, 'blue', u.x, u.y))
    expect(musuhBocor).toEqual([])
  })

  it('unit sendiri selalu lolos saringan', () => {
    const d = dunia0()
    const saring = saringUntuk(d, 'blue')
    const punyaku = d.unit.filter((u) => u.tim === 'blue').length
    expect(saring.unit.filter((u) => u.tim === 'blue')).toHaveLength(punyaku)
  })

  it('bangunan musuh yang belum pernah dilihat tidak ikut dikirim', () => {
    const d = dunia0()
    const saring = saringUntuk(d, 'blue')
    const bocor = saring.bangunan.filter(
      (b) => b.tim !== 'blue' && !pernahLihat(d, 'blue', b.x, b.y))
    expect(bocor).toEqual([])
  })

  it('bangunan musuh yang pernah dilihat TETAP dikirim — diingat bentuknya', () => {
    const d = buatDunia({ seed: 515 })
    const musuh = d.bangunan.find((b) => b.tim === 'red' && b.jenis === 'castle')!
    const mata = buatUnit(d, 'blue', 'archer', musuh.x, musuh.y)
    langkahBanyak(d, TICK_PER_FOG + 1)
    mata.x = 200
    mata.y = 200
    langkahBanyak(d, TICK_PER_FOG * 2)

    expect(terlihatDi(d, 'blue', musuh.x, musuh.y)).toBe(false)
    expect(saringUntuk(d, 'blue').bangunan.some((b) => b.id === musuh.id)).toBe(true)
  })
})

describe('AC-12.4 — fog deterministik', () => {
  it('fog tidak merusak determinisme simulasi', () => {
    const jalankan = () => {
      const d = buatDunia({ seed: 4242 })
      langkahBanyak(d, 600)
      let n = 0
      for (const v of d.fog.blue.pernah) n += v
      return n
    }
    expect(jalankan()).toBe(jalankan())
  })
})
