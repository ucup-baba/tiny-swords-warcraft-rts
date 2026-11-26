import { describe, expect, it } from 'vitest'
import {
  DETIK_TUMBUH_POHON, KAYU_POHON_BARU, PANEN, buatBangunan, buatDunia,
  hashDunia, langkahBanyak, terapkanPerintah,
} from '../src/index.js'

describe('Auto-cari resource, pohon tumbuh kembali, & respawn domba', () => {
  it('pawn otomatis pindah ke pohon terdekat berikutnya dalam radius setelah pohon pertama habis', () => {
    const d = buatDunia({ seed: 801 })
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const dekat = d.pohon
      .slice()
      .sort((a, b) => Math.hypot(a.x - castle.x, a.y - castle.y) - Math.hypot(b.x - castle.x, b.y - castle.y))[0]!
    dekat.kayu = PANEN.kayuPerAntar // habis dalam 1 kali panen

    const kayuAwal = d.tim.blue.sumberDaya.kayu
    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: dekat.id })
    langkahBanyak(d, 60 * 45)

    // Pohon awal sudah jadi tunggul, dan Pawn otomatis lanjut menebang pohon lain!
    expect(d.pohon.some((p) => p.id === dekat.id)).toBe(false)
    expect(d.tunggul.some((tg) => tg.x === dekat.x && tg.y === dekat.y)).toBe(true)
    expect(d.tim.blue.sumberDaya.kayu).toBeGreaterThan(kayuAwal + PANEN.kayuPerAntar)
  })

  it('tunggul pohon tumbuh kembali menjadi pohon utuh setelah 75 detik jika tidak ditimpa bangunan', () => {
    const d = buatDunia({ seed: 802 })
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const pohon = d.pohon
      .slice()
      .sort((a, b) => Math.hypot(a.x - pawn.x, a.y - pawn.y) - Math.hypot(b.x - pawn.x, b.y - pawn.y))[0]!
    const px = pohon.x
    const py = pohon.y
    pohon.kayu = PANEN.kayuPerAntar

    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: pohon.id })
    langkahBanyak(d, 60 * 18)
    expect(d.tunggul.some((tg) => tg.x === px && tg.y === py)).toBe(true)

    // Hentikan pawn supaya tidak menebang pohon baru tepat saat tumbuh
    terapkanPerintah(d, 'blue', { jenis: 'stop', ids: [pawn.id] })
    langkahBanyak(d, 60 * (DETIK_TUMBUH_POHON + 4))

    expect(d.tunggul.some((tg) => tg.x === px && tg.y === py)).toBe(false)
    const tumbuh = d.pohon.find((p) => p.x === px && p.y === py)
    expect(tumbuh).toBeDefined()
    expect(tumbuh!.kayu).toBe(KAYU_POHON_BARU)
  })

  it('tunggul yang ditimpa bangunan baru langsung hilang dan tidak tumbuh lagi', () => {
    const d = buatDunia({ seed: 803 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const tx = castle.x + 250
    const ty = castle.y
    d.tunggul.push({ id: d.idBerikut++, x: tx, y: ty, sisaTumbuh: 5 })

    buatBangunan(d, 'blue', 'house', tx, ty, 'aktif')
    expect(d.tunggul.some((tg) => tg.x === tx && tg.y === ty)).toBe(false)
  })

  it('Castle otomatis respawn domba hingga 4 ekor bila domba awal habis', () => {
    const d = buatDunia({ seed: 804 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    // Kosongkan semua domba di sisi biru
    d.domba = d.domba.filter((s) => Math.hypot(s.x - castle.x, s.y - castle.y) > 800)
    expect(d.domba.filter((s) => Math.hypot(s.x - castle.x, s.y - castle.y) <= 500).length).toBe(0)

    langkahBanyak(d, 60 * 60)
    const dekatCastle = d.domba.filter((s) => Math.hypot(s.x - castle.x, s.y - castle.y) <= 500)
    expect(dekatCastle.length).toBeGreaterThanOrEqual(2)
  })

  it('tetap 100% deterministik pada dua run identik', () => {
    const d1 = buatDunia({ seed: 805 })
    const d2 = buatDunia({ seed: 805 })
    langkahBanyak(d1, 60 * 35)
    langkahBanyak(d2, 60 * 35)
    expect(hashDunia(d1)).toBe(hashDunia(d2))
  })
})
