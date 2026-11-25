import { describe, expect, it } from 'vitest'
import {
  GRACE_MATI_EKONOMI, buatDunia, langkah, langkahBanyak, lukaiBangunan, terapkanPerintah,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 5 })

const hancurkanCastle = (d: ReturnType<typeof dunia0>, tim: 'blue' | 'red') => {
  for (const b of d.bangunan) {
    if (b.tim === tim && b.jenis === 'castle') lukaiBangunan(d, b, 999999, null)
  }
}

/**
 * Kalah seketika: castle habis DAN tidak ada pawn yang bisa membangun ulang.
 * Castle saja tidak cukup — dengan pawn + gold, tim masih boleh bangkit
 * (PRD §13.1 sebagaimana direvisi; lihat catatan di sistem/akhir.ts).
 */
const habisiTim = (d: ReturnType<typeof dunia0>, tim: 'blue' | 'red') => {
  for (let i = d.unit.length - 1; i >= 0; i--) {
    if (d.unit[i]!.tim === tim) d.unit.splice(i, 1)
  }
  hancurkanCastle(d, tim)
}

describe('kondisi menang (PRD §13.1)', () => {
  it('match berjalan selama kedua castle berdiri', () => {
    const d = dunia0()
    langkahBanyak(d, 60 * 5)
    expect(d.hasil.jenis).toBe('berlangsung')
  })

  it('castle hancur dan tak ada yang bisa membangun ulang = kalah', () => {
    const d = dunia0()
    habisiTim(d, 'red')
    langkah(d)
    expect(d.hasil).toEqual({ jenis: 'menang', tim: 'blue' })
  })

  it('memancarkan kejadian matchSelesai', () => {
    const d = dunia0()
    habisiTim(d, 'red')
    langkah(d)
    expect(d.kejadian.some((k) => k.jenis === 'matchSelesai')).toBe(true)
  })

  it('simulasi berhenti setelah match selesai', () => {
    const d = dunia0()
    habisiTim(d, 'red')
    langkah(d)
    const tick = d.tick
    langkahBanyak(d, 100)
    expect(d.tick).toBe(tick)
  })
})

describe('draw (PRD §13.2)', () => {
  it('kedua pihak habis di langkah yang sama = draw', () => {
    const d = dunia0()
    habisiTim(d, 'blue')
    habisiTim(d, 'red')
    langkah(d)
    expect(d.hasil).toEqual({ jenis: 'draw' })
  })
})

describe('surrender (PRD §13.3)', () => {
  it('menyerah membuat lawan menang', () => {
    const d = dunia0()
    terapkanPerintah(d, 'blue', { jenis: 'menyerah' })
    langkah(d)
    expect(d.hasil).toEqual({ jenis: 'menang', tim: 'red' })
  })

  it('kedua pemain menyerah = draw', () => {
    const d = dunia0()
    terapkanPerintah(d, 'blue', { jenis: 'menyerah' })
    terapkanPerintah(d, 'red', { jenis: 'menyerah' })
    langkah(d)
    expect(d.hasil).toEqual({ jenis: 'draw' })
  })
})

describe('castle habis (PRD §13.1, direvisi)', () => {
  it('castle habis TANPA pawn = langsung kalah', () => {
    const d = dunia0()
    for (let i = d.unit.length - 1; i >= 0; i--) {
      if (d.unit[i]!.tim === 'red' && d.unit[i]!.peran === 'pawn') d.unit.splice(i, 1)
    }
    hancurkanCastle(d, 'red')
    langkah(d)
    expect(d.hasil).toEqual({ jenis: 'menang', tim: 'blue' })
  })

  it('castle habis TAPI punya pawn + gold cukup = masih hidup', () => {
    const d = dunia0()
    d.tim.red.sumberDaya.gold = 9999
    hancurkanCastle(d, 'red')
    langkahBanyak(d, 60 * 10)
    expect(d.hasil.jenis).toBe('berlangsung')
  })

  it('castle habis + punya pawn + gold kurang = kalah setelah grace 20 detik', () => {
    const d = dunia0()
    d.tim.red.sumberDaya.gold = 0
    hancurkanCastle(d, 'red')

    langkahBanyak(d, 60 * (GRACE_MATI_EKONOMI - 2))
    expect(d.hasil.jenis).toBe('berlangsung')

    langkahBanyak(d, 60 * 4)
    expect(d.hasil).toEqual({ jenis: 'menang', tim: 'blue' })
  })

  it('hitungan grace di-reset kalau gold kembali cukup', () => {
    const d = dunia0()
    d.tim.red.sumberDaya.gold = 0
    hancurkanCastle(d, 'red')
    langkahBanyak(d, 60 * 10)
    expect(d.tim.red.matiEkonomiDetik).toBeGreaterThan(0)

    d.tim.red.sumberDaya.gold = 9999
    langkah(d)
    expect(d.tim.red.matiEkonomiDetik).toBe(0)
  })

  it('punya castle berarti hitungan grace selalu nol', () => {
    const d = dunia0()
    d.tim.blue.sumberDaya.gold = 0
    langkahBanyak(d, 60 * 5)
    expect(d.tim.blue.matiEkonomiDetik).toBe(0)
  })
})

describe('perintah setelah match selesai diabaikan', () => {
  it('menyerah setelah menang tidak mengubah hasil', () => {
    const d = dunia0()
    habisiTim(d, 'red')
    langkah(d)
    terapkanPerintah(d, 'blue', { jenis: 'menyerah' })
    expect(d.hasil).toEqual({ jenis: 'menang', tim: 'blue' })
  })
})
