import { describe, expect, it } from 'vitest'
import {
  buatBangunan, buatDunia, buatUnit, hashDunia, keTile, langkahBanyak,
  langkah, tapakBangunan, terapkanPerintah, terhalangTile,
} from '../src/index.js'

describe('Halangan dinamis — unit tidak menembus bangunan, tambang, dan pohon', () => {
  it('unit memutar mengelilingi bangunan, tidak melewati tile interior tapak', () => {
    const d = buatDunia({ seed: 777 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    // Taruh barracks di ruang datar di selatan-timur castle
    const bx = castle.x + 260
    const by = castle.y
    const barracks = buatBangunan(d, 'blue', 'barracks', bx, by, 'aktif')
    const tapak = tapakBangunan(barracks)
    expect(terhalangTile(d.terrain, d.halangan, keTile(bx), keTile(by))).toBe(true)

    // Taruh unit di kiri barracks dan suruh berjalan lurus ke sisi kanan barracks
    const u = buatUnit(d, 'blue', 'warrior', bx - 220, by)
    terapkanPerintah(d, 'blue', { jenis: 'pindah', ids: [u.id], x: bx + 220, y: by })

    let tembus = false
    for (let i = 0; i < 420; i++) {
      langkah(d)
      const tx = keTile(u.x)
      const ty = keTile(u.y)
      if (tx >= tapak.x1 && tx <= tapak.x2 && ty >= tapak.y1 && ty <= tapak.y2) {
        tembus = true
        break
      }
      if (Math.hypot(u.x - (bx + 220), u.y - by) < 24) break
    }

    expect(tembus).toBe(false)
    expect(Math.hypot(u.x - (bx + 220), u.y - by)).toBeLessThan(80)
  })

  it('tile bangunan kembali bebas setelah bangunan hancur', () => {
    const d = buatDunia({ seed: 778 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const b = buatBangunan(d, 'red', 'house', castle.x + 240, castle.y, 'aktif')
    const tx = keTile(b.x)
    const ty = keTile(b.y)
    expect(terhalangTile(d.terrain, d.halangan, tx, ty)).toBe(true)

    const hero = buatUnit(d, 'blue', 'champion', b.x - 100, b.y)
    terapkanPerintah(d, 'blue', { jenis: 'serang', ids: [hero.id], targetId: b.id })
    langkahBanyak(d, 60 * 30)

    expect(b.fase).toBe('hancur')
    expect(terhalangTile(d.terrain, d.halangan, tx, ty)).toBe(false)
  })
})

describe('Animasi unit, arah hadap, membawa resource, & kejadian HP', () => {
  it('pawn menebang pohon -> aksi tebang -> bawa resource (bawaLari) -> setor', () => {
    const d = buatDunia({ seed: 779 })
    const pawn = d.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const pohon = d.pohon
      .slice()
      .sort((a, b) => Math.hypot(a.x - pawn.x, a.y - pawn.y) - Math.hypot(b.x - pawn.x, b.y - pawn.y))[0]!

    terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [pawn.id], targetId: pohon.id })

    let lihatTebang = false
    let lihatBawa = false
    let lihatSetor = false
    for (let i = 0; i < 60 * 25; i++) {
      langkah(d)
      if (pawn.aksi === 'tebang') lihatTebang = true
      if (pawn.bawaanJenis === 'kayu' && (pawn.aksi === 'bawaLari' || pawn.aksi === 'bawaDiam')) lihatBawa = true
      if (d.kejadian.some((k) => k.jenis === 'sumberDayaMasuk' && k.tim === 'blue' && k.jenis2 === 'kayu')) {
        lihatSetor = true
        break
      }
    }

    expect(lihatTebang).toBe(true)
    expect(lihatBawa).toBe(true)
    expect(lihatSetor).toBe(true)
  })

  it('unit menyerang memicu aksi serang + kejadian unitLuka, dan Monk memicu unitSembuh', () => {
    const d = buatDunia({ seed: 780 })
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const w = buatUnit(d, 'blue', 'warrior', castle.x + 180, castle.y + 180)
    const musuh = buatUnit(d, 'red', 'warrior', castle.x + 220, castle.y + 180)
    const monk = buatUnit(d, 'blue', 'monk', castle.x + 150, castle.y + 180)
    w.hp = 80

    let lihatSerang = false
    let lihatLuka = false
    let lihatSembuh = false
    for (let i = 0; i < 180; i++) {
      langkah(d)
      if (w.aksi === 'serang') lihatSerang = true
      if (d.kejadian.some((k) => k.jenis === 'unitLuka')) lihatLuka = true
      if (d.kejadian.some((k) => k.jenis === 'unitSembuh' && k.id === w.id)) lihatSembuh = true
      if (lihatSerang && lihatLuka && lihatSembuh) break
    }

    expect(lihatSerang).toBe(true)
    expect(lihatLuka).toBe(true)
    expect(lihatSembuh).toBe(true)
    void musuh
    void monk
  })
})

describe('Domba berjalan deterministik', () => {
  it('domba mulai berpindah secara deterministik tanpa merusak hashDunia', () => {
    const d1 = buatDunia({ seed: 781 })
    const d2 = buatDunia({ seed: 781 })
    const awal = d1.domba.map((s) => ({ x: s.x, y: s.y }))

    let adaBergerak = false
    for (let i = 0; i < 60 * 8; i++) {
      langkah(d1)
      langkah(d2)
      if (d1.domba.some((s) => s.bergerak)) adaBergerak = true
    }

    expect(adaBergerak).toBe(true)
    const pindah = d1.domba.some((s, idx) => Math.hypot(s.x - awal[idx]!.x, s.y - awal[idx]!.y) > 8)
    expect(pindah).toBe(true)
    expect(hashDunia(d1)).toBe(hashDunia(d2))
  })
})
