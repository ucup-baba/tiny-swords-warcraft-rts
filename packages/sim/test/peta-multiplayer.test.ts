import { TILE, TINGGI, buatSlotDefault } from '@hftf/shared'
import { describe, expect, it } from 'vitest'
import {
  adalahJembatan, adalahRamp, bermusuhan, bolehTaruhBangunan, buatAi, buatDunia, buatSnapshot,
  cariJalur, hashDunia, hitungFog, keTengahPiksel, keTile, langkahAi, langkahBanyak, sekutu,
  terapkanPerintah, terapkanSnapshot, terlihatDi, timMenang,
} from '../src/index.js'

describe('Peta baru 4P (salib4) & 6P (bintang6) + jembatan', () => {
  it('salib4 memiliki 4 basis, danau, jembatan horizontal+vertikal, dan semua basis terhubung A*', () => {
    const d = buatDunia({ seed: 101, peta: 'salib4', goldAwal: 500 })
    const castles = d.bangunan.filter((b) => b.jenis === 'castle')
    expect(castles).toHaveLength(4)
    expect(d.pemainAktif).toEqual(['blue', 'red', 'green', 'yellow'])

    let bridgeH = 0
    let bridgeV = 0
    let bridgeTile: { tx: number; ty: number } | null = null
    for (let ty = 0; ty < d.terrain.baris; ty++) {
      for (let tx = 0; tx < d.terrain.kolom; tx++) {
        const j = d.terrain.jembatan[ty * d.terrain.kolom + tx] ?? 0
        if (j === 1) bridgeH++
        if (j === 2) bridgeV++
        if (j > 0 && !bridgeTile) bridgeTile = { tx, ty }
      }
    }
    expect(bridgeH).toBeGreaterThan(0)
    expect(bridgeV).toBeGreaterThan(0)
    expect(bridgeTile).not.toBeNull()
    expect(adalahJembatan(d.terrain, bridgeTile!.tx, bridgeTile!.ty)).toBe(true)
    expect(bolehTaruhBangunan(d, 'house', keTengahPiksel(bridgeTile!.tx), keTengahPiksel(bridgeTile!.ty))).toBe(false)

    // Setiap basis harus dapat mencapai basis lain DAN plateau pusat via jembatan + ramp
    const pusatX = keTengahPiksel(d.titik.plateauPusat.tx)
    const pusatY = keTengahPiksel(d.titik.plateauPusat.ty)
    for (const c of castles) {
      const kePusat = cariJalur(d.terrain, c.x, c.y, pusatX, pusatY)
      expect(kePusat, `jalur ${c.tim} -> pusat`).not.toBeNull()
      expect(kePusat!.titik.some((t) => adalahRamp(d.terrain, keTile(t.x), keTile(t.y)))).toBe(true)
      expect(kePusat!.titik.some((t) => adalahJembatan(d.terrain, keTile(t.x), keTile(t.y)))).toBe(true)

      for (const tujuan of castles) {
        if (c === tujuan) continue
        const j = cariJalur(d.terrain, c.x, c.y, tujuan.x, tujuan.y)
        expect(j, `jalur ${c.tim} -> ${tujuan.tim}`).not.toBeNull()
      }
    }
  })

  it('bintang6 memiliki 6 basis warna unik dan seluruh pulau terhubung melewati jembatan', () => {
    const d = buatDunia({ seed: 202, peta: 'bintang6', goldAwal: 1200 })
    const castles = d.bangunan.filter((b) => b.jenis === 'castle')
    expect(castles).toHaveLength(6)
    expect(d.pemainAktif).toEqual(['blue', 'red', 'yellow', 'green', 'purple', 'black'])

    for (const c of castles) {
      expect(d.tim[c.tim].sumberDaya.gold).toBe(1200)
    }

    const pusatX = keTengahPiksel(d.titik.plateauPusat.tx)
    const pusatY = keTengahPiksel(d.titik.plateauPusat.ty)
    for (const c of castles) {
      const kePusat = cariJalur(d.terrain, c.x, c.y, pusatX, pusatY)
      expect(kePusat, `jalur ${c.tim} -> pusat`).not.toBeNull()
      expect(kePusat!.titik.some((t) => adalahJembatan(d.terrain, keTile(t.x), keTile(t.y)))).toBe(true)
    }
    // Cek jalur langsung pulau ujung ke seberang (NW Blue -> SE Black)
    const nw = castles[0]!
    const se = castles[5]!
    const lintas = cariJalur(d.terrain, nw.x, nw.y, se.x, se.y)
    expect(lintas).not.toBeNull()
    expect(lintas!.titik.some((t) => d.terrain.tinggi[keTile(t.y) * d.terrain.kolom + keTile(t.x)] === TINGGI.air)).toBe(false)
  })
})

describe('Custom Gold, Aliansi 6 Pemain, & 4 Tier AI', () => {
  it('custom goldAwal diterapkan & dijepit pada rentang aman (100..10000)', () => {
    const terlaluKecil = buatDunia({ seed: 1, goldAwal: 10 })
    const terlaluBesar = buatDunia({ seed: 1, goldAwal: 99999 })
    expect(terlaluKecil.tim.blue.sumberDaya.gold).toBe(100)
    expect(terlaluBesar.tim.blue.sumberDaya.gold).toBe(10000)
  })

  it('aliansi 3v3: sekutu tidak bermusuhan, berbagi fog, dan menang bersama', () => {
    const slot = buatSlotDefault('bintang6').map((s, i) => ({
      ...s,
      aliansi: i < 3 ? 1 : 2,
    }))
    const d = buatDunia({ seed: 303, peta: 'bintang6', slot })
    expect(sekutu('blue', 'red', d)).toBe(true)
    expect(sekutu('blue', 'yellow', d)).toBe(true)
    expect(bermusuhan('blue', 'red', d)).toBe(false)
    expect(bermusuhan('blue', 'green', d)).toBe(true)

    // Sekutu melihat posisi Castle temannya melalui shared vision
    hitungFog(d)
    const castleRed = d.bangunan.find((b) => b.tim === 'red' && b.jenis === 'castle')!
    expect(terlihatDi(d, 'blue', castleRed.x, castleRed.y)).toBe(true)

    // Menyerah 2 anggota Tim 2 belum selesai -> menyerah anggota ke-3 Tim 2 baru Tim 1 menang bersama
    terapkanPerintah(d, 'green', { jenis: 'menyerah' })
    terapkanPerintah(d, 'purple', { jenis: 'menyerah' })
    langkahBanyak(d, 1)
    expect(d.hasil.jenis).toBe('berlangsung')

    terapkanPerintah(d, 'black', { jenis: 'menyerah' })
    langkahBanyak(d, 1)
    expect(d.hasil.jenis).toBe('menang')
    expect(timMenang(d, 'blue')).toBe(true)
    expect(timMenang(d, 'red')).toBe(true)
    expect(timMenang(d, 'yellow')).toBe(true)
    expect(timMenang(d, 'black')).toBe(false)
  })

  it('keempat tier AI (gampang/medium/susah/extreme) jalan deterministik di peta 4P', () => {
    const run = (): { hash: string; bangunanExtreme: number; bangunanGampang: number } => {
      const slot = buatSlotDefault('salib4')
      slot[0]!.jenis = 'ai'
      slot[0]!.kesulitanAi = 'gampang'
      slot[1]!.kesulitanAi = 'medium'
      slot[2]!.kesulitanAi = 'susah'
      slot[3]!.kesulitanAi = 'extreme'
      const d = buatDunia({ seed: 404, peta: 'salib4', goldAwal: 800, slot })
      const ais = slot.map((s) => buatAi(s.tim, s.kesulitanAi, 404))
      for (let t = 0; t < 60 * 35; t++) {
        for (const ai of ais) {
          for (const p of langkahAi(d, ai)) terapkanPerintah(d, ai.tim, p)
        }
        langkahBanyak(d, 1)
      }
      return {
        hash: hashDunia(d),
        bangunanExtreme: d.bangunan.filter((b) => b.tim === 'yellow').length,
        bangunanGampang: d.bangunan.filter((b) => b.tim === 'blue').length,
      }
    }
    const r1 = run()
    const r2 = run()
    expect(r1.hash).toBe(r2.hash)
    expect(r1.bangunanExtreme).toBeGreaterThanOrEqual(r1.bangunanGampang)
  })
})

describe('Animasi Free Pack Pawn & Snapshot Multi-Tim', () => {
  it('pawn menggunakan aksi sembelih untuk domba dan membawa tugas+sumberDaya di snapshot untuk tim hijau', () => {
    const d = buatDunia({ seed: 505, peta: 'salib4', goldAwal: 650 })
    const pawnGreen = d.unit.find((u) => u.tim === 'green' && u.peran === 'pawn')!
    const dombaDekat = d.domba
      .slice()
      .sort((a, b) => Math.hypot(a.x - pawnGreen.x, a.y - pawnGreen.y) - Math.hypot(b.x - pawnGreen.x, b.y - pawnGreen.y))[0]!

    terapkanPerintah(d, 'green', { jenis: 'kumpul', ids: [pawnGreen.id], targetId: dombaDekat.id })
    expect(pawnGreen.tugas).toBe('gembala')

    let lihatSembelih = false
    let lihatBawaDaging = false
    for (let i = 0; i < 60 * 12; i++) {
      langkahBanyak(d, 1)
      if (pawnGreen.aksi === 'sembelih') lihatSembelih = true
      if (pawnGreen.bawaanJenis === 'daging') {
        lihatBawaDaging = true
        break
      }
    }
    expect(lihatSembelih).toBe(true)
    expect(lihatBawaDaging).toBe(true)

    // Snapshot ke Guest Hijau membawa riset, gold, aksi, & tugas Pawn
    const snap = buatSnapshot(d, 'green')
    expect(snap.untuk).toBe('green')
    expect(snap.sumberDaya.gold).toBe(650)

    const tamu = buatDunia({ seed: 505, peta: 'salib4', goldAwal: 100 })
    terapkanSnapshot(tamu, snap, new Map(), 'green')
    expect(tamu.tim.green.sumberDaya.gold).toBe(650)
    const salinan = tamu.unit.find((u) => u.id === pawnGreen.id)!
    expect(salinan.bawaanJenis).toBe('daging')
    expect(salinan.tugas).toBe('pulang')
    void TILE
  })
})
