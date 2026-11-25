import { describe, expect, it } from 'vitest'
import { buatDunia, hashDunia, langkahBanyak, terapkanPerintah } from '../src/index.js'
import type { Perintah } from '../src/index.js'

// AC-8.3: seed sama + daftar perintah sama -> hash state akhir identik.

const SKENARIO: readonly { padaTick: number; perintah: Perintah }[] = [
  { padaTick: 0, perintah: { jenis: 'spawn', tim: 'blue', x: 500, y: 500 } },
  { padaTick: 0, perintah: { jenis: 'spawn', tim: 'blue', x: 520, y: 500 } },
  { padaTick: 0, perintah: { jenis: 'spawn', tim: 'red', x: 3000, y: 3000 } },
  { padaTick: 10, perintah: { jenis: 'pindah', ids: [1, 2], x: 1200, y: 900 } },
  { padaTick: 40, perintah: { jenis: 'lukai', id: 3, jumlah: 60 } },
  { padaTick: 60, perintah: { jenis: 'pindah', ids: [1], x: 200, y: 2000 } },
  { padaTick: 90, perintah: { jenis: 'lukai', id: 2, jumlah: 150 } },
]

function jalankan(seed: number, totalTick: number): string {
  const dunia = buatDunia(seed)
  for (let t = 0; t < totalTick; t++) {
    for (const s of SKENARIO) {
      if (s.padaTick === t) terapkanPerintah(dunia, s.perintah)
    }
    langkahBanyak(dunia, 1)
  }
  return hashDunia(dunia)
}

describe('determinisme sim (AC-8.3)', () => {
  it('dua run dengan seed & perintah sama menghasilkan hash identik', () => {
    expect(jalankan(12345, 300)).toBe(jalankan(12345, 300))
  })

  it('tetap identik walau dijalankan berulang kali', () => {
    const harapan = jalankan(777, 200)
    for (let i = 0; i < 5; i++) expect(jalankan(777, 200)).toBe(harapan)
  })

  it('seed berbeda menghasilkan hash berbeda', () => {
    expect(jalankan(1, 300)).not.toBe(jalankan(2, 300))
  })

  it('jumlah tick berbeda menghasilkan hash berbeda', () => {
    expect(jalankan(12345, 100)).not.toBe(jalankan(12345, 300))
  })
})

describe('headless (AC-8.4)', () => {
  it('sim jalan tanpa DOM sama sekali', () => {
    expect((globalThis as Record<string, unknown>)['document']).toBeUndefined()
    expect((globalThis as Record<string, unknown>)['window']).toBeUndefined()
    const dunia = buatDunia(42)
    terapkanPerintah(dunia, { jenis: 'spawn', tim: 'blue', x: 100, y: 100 })
    langkahBanyak(dunia, 120)
    expect(dunia.tick).toBe(120)
    expect(dunia.entitas).toHaveLength(1)
  })
})
