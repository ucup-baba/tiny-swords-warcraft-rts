import { describe, expect, it } from 'vitest'
import {
  buatAi, buatDunia, hashDunia, langkahAi, langkahBanyak, terapkanPerintah,
} from '../src/index.js'
import type { Perintah } from '../src/index.js'

// AC-8.3: seed sama + perintah sama -> hash identik, selalu.

const SKENARIO: readonly { tick: number; tim: 'blue' | 'red'; perintah: Perintah }[] = [
  { tick: 5, tim: 'blue', perintah: { jenis: 'pindah', ids: [2, 3, 4], x: 2000, y: 3000 } },
  { tick: 30, tim: 'red', perintah: { jenis: 'pindah', ids: [20, 21], x: 4000, y: 2000 } },
  { tick: 90, tim: 'blue', perintah: { jenis: 'serangPindah', ids: [2, 3], x: 3072, y: 3072 } },
]

function jalankan(seed: number, tick: number): string {
  const d = buatDunia({ seed, heroBlue: 'king', heroRed: 'champion' })
  for (let t = 0; t < tick; t++) {
    for (const s of SKENARIO) if (s.tick === t) terapkanPerintah(d, s.tim, s.perintah)
    langkahBanyak(d, 1)
  }
  return hashDunia(d)
}

function jalankanDenganAi(seed: number, tick: number): string {
  const d = buatDunia({ seed })
  const ai = buatAi('red', 'normal')
  for (let t = 0; t < tick; t++) {
    for (const p of langkahAi(d, ai)) terapkanPerintah(d, 'red', p)
    langkahBanyak(d, 1)
  }
  return hashDunia(d)
}

describe('determinisme (AC-8.3)', () => {
  it('dua run dengan seed & perintah sama menghasilkan hash identik', () => {
    expect(jalankan(12345, 600)).toBe(jalankan(12345, 600))
  })

  it('tetap identik di lima run berturut-turut', () => {
    const harapan = jalankan(777, 400)
    for (let i = 0; i < 5; i++) expect(jalankan(777, 400)).toBe(harapan)
  })

  it('seed berbeda menghasilkan hash berbeda', () => {
    expect(jalankan(1, 600)).not.toBe(jalankan(2, 600))
  })

  it('jumlah tick berbeda menghasilkan hash berbeda', () => {
    expect(jalankan(12345, 200)).not.toBe(jalankan(12345, 600))
  })

  it('AI solo juga deterministik — RNG-nya dari dunia, bukan Math.random', () => {
    expect(jalankanDenganAi(99, 1800)).toBe(jalankanDenganAi(99, 1800))
  })

  it('AI dengan seed berbeda berperilaku berbeda', () => {
    expect(jalankanDenganAi(1, 1800)).not.toBe(jalankanDenganAi(2, 1800))
  })
})

describe('headless (AC-8.4)', () => {
  it('sim jalan tanpa DOM sama sekali', () => {
    expect((globalThis as Record<string, unknown>)['document']).toBeUndefined()
    expect((globalThis as Record<string, unknown>)['window']).toBeUndefined()
    const d = buatDunia({ seed: 42 })
    langkahBanyak(d, 600)
    expect(d.tick).toBe(600)
  })
})
