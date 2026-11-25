import { describe, expect, it } from 'vitest'
import {
  buatAi, buatDunia, detik, hashDunia, langkahAi, langkahBanyak, terapkanPerintah,
} from '../src/index.js'
import type { Dunia } from '../src/index.js'

// M1 selesai bila satu match penuh bisa disimulasikan di test, tanpa browser.

const MAKS_TICK = 60 * 60 * 25 // 25 menit waktu permainan

function mainkanSampaiSelesai(seed: number): { d: Dunia; tick: number } {
  const d = buatDunia({ seed, heroBlue: 'king', heroRed: 'champion' })
  const aiBlue = buatAi('blue', 'normal')
  const aiRed = buatAi('red', 'normal')

  let tick = 0
  while (d.hasil.jenis === 'berlangsung' && tick < MAKS_TICK) {
    for (const p of langkahAi(d, aiBlue)) terapkanPerintah(d, 'blue', p)
    for (const p of langkahAi(d, aiRed)) terapkanPerintah(d, 'red', p)
    langkahBanyak(d, 1)
    tick++
  }
  return { d, tick }
}

describe('match penuh AI vs AI, headless', () => {
  it('berjalan sampai ada pemenang tanpa crash', () => {
    const { d, tick } = mainkanSampaiSelesai(2026)
    expect(d.hasil.jenis).not.toBe('berlangsung')
    expect(tick).toBeLessThan(MAKS_TICK)
  }, 60_000)

  it('ekonomi benar-benar berjalan — kedua pihak memanen', () => {
    const { d } = mainkanSampaiSelesai(2026)
    for (const tim of ['blue', 'red'] as const) {
      const s = d.tim[tim].statistik
      expect(s.goldTerkumpul + s.kayuTerkumpul).toBeGreaterThan(0)
    }
  }, 60_000)

  it('pertempuran benar-benar terjadi', () => {
    const { d } = mainkanSampaiSelesai(2026)
    const totalBunuh = d.tim.blue.statistik.bunuh + d.tim.red.statistik.bunuh
    expect(totalBunuh).toBeGreaterThan(0)
  }, 60_000)

  it('bangunan benar-benar didirikan di luar yang awal', () => {
    const { d } = mainkanSampaiSelesai(2026)
    const dibangun = d.tim.blue.statistik.bangunanDibangun + d.tim.red.statistik.bangunanDibangun
    expect(dibangun).toBeGreaterThan(4) // 2 castle + 2 house awal
  }, 60_000)

  it('match penuh deterministik — dua run identik hasil & hash-nya', () => {
    const a = mainkanSampaiSelesai(31337)
    const b = mainkanSampaiSelesai(31337)
    expect(a.tick).toBe(b.tick)
    expect(a.d.hasil).toEqual(b.d.hasil)
    expect(hashDunia(a.d)).toBe(hashDunia(b.d))
  }, 120_000)

  it('tidak ada unit yang keluar batas peta', () => {
    const { d } = mainkanSampaiSelesai(2026)
    for (const u of d.unit) {
      expect(u.x).toBeGreaterThanOrEqual(0)
      expect(u.y).toBeGreaterThanOrEqual(0)
      expect(u.x).toBeLessThanOrEqual(6144)
      expect(u.y).toBeLessThanOrEqual(6144)
    }
  }, 60_000)

  it('waktu permainan masuk akal, bukan nol dan bukan mentok', () => {
    const { d } = mainkanSampaiSelesai(2026)
    expect(detik(d)).toBeGreaterThan(30)
  }, 60_000)
})
