import { describe, expect, it } from 'vitest'
import {
  BANGUNAN, KETAHANAN_BANGUNAN, buatAi, buatBangunan, buatDunia, buatUnit,
  langkahAi, langkahBanyak, lukaiBangunan, terapkanPerintah,
} from '../src/index.js'

// Regresi untuk cacat keseimbangan yang ditemukan lewat harness
// scripts/uji-seimbang.mjs. Semuanya pernah lolos dari tes satuan karena
// hanya muncul sebagai perilaku jangka panjang.

/**
 * Arena bersih. Menaruh sasaran di koordinat sembarang berbahaya: titik yang
 * "kosong" bisa jatuh tepat di camp goblin, dan unit uji akan menembak goblin
 * alih-alih sasaran yang dimaksud.
 */
function arena() {
  const d = buatDunia({ seed: 1 })
  d.unit.length = 0
  d.camp.length = 0
  d.bangunan.length = 0
  buatBangunan(d, 'blue', 'castle', 5900, 5900, 'aktif')
  buatBangunan(d, 'red', 'castle', 300, 300, 'aktif')
  return d
}

describe('unit jarak jauh bisa melukai bangunan', () => {
  it('archer merusak bangunan musuh', () => {
    const d = arena()
    const b = buatBangunan(d, 'red', 'house', 3000, 3000, 'aktif')
    buatUnit(d, 'blue', 'archer', 3000 - 200, 3000)
    const hpAwal = b.hp
    langkahBanyak(d, 60 * 6)
    // Proyektil ke bangunan dikirim dengan targetId null; sebelum diperbaiki,
    // kedua cabang penanganan tumbukan melewatkannya dan bangunan TIDAK PERNAH
    // menerima kerusakan dari unit jarak jauh.
    expect(b.hp).toBeLessThan(hpAwal)
  }, 20_000)

  it('mage dengan serangan area juga merusak bangunan', () => {
    const d = arena()
    const b = buatBangunan(d, 'red', 'house', 3400, 3400, 'aktif')
    buatUnit(d, 'blue', 'mage', 3400 - 200, 3400)
    const hpAwal = b.hp
    langkahBanyak(d, 60 * 6)
    expect(b.hp).toBeLessThan(hpAwal)
  }, 20_000)
})

describe('ketahanan bangunan', () => {
  it('bangunan hanya menerima sebagian kerusakan', () => {
    const d = buatDunia({ seed: 1 })
    const b = buatBangunan(d, 'red', 'castle', 2000, 2000, 'aktif')
    const hpAwal = b.hp
    lukaiBangunan(d, b, 1000, 'blue')
    expect(hpAwal - b.hp).toBeCloseTo(1000 * KETAHANAN_BANGUNAN, 3)
  })

  it('castle tidak bisa dirobohkan secepat unit', () => {
    // 1.500 HP dengan ketahanan 0.45 berarti butuh >3.300 damage mentah.
    const butuh = BANGUNAN.castle.hp / KETAHANAN_BANGUNAN
    expect(butuh).toBeGreaterThan(3000)
  })

  it('kerusakan besar tetap menghancurkan', () => {
    const d = buatDunia({ seed: 1 })
    const b = buatBangunan(d, 'red', 'house', 2000, 2000, 'aktif')
    lukaiBangunan(d, b, 99999, 'blue')
    expect(b.fase).toBe('hancur')
  })
})

describe('AI punya RNG sendiri', () => {
  it('langkahAi tidak pernah menyentuh RNG dunia', () => {
    const d = buatDunia({ seed: 4242 })
    const ai = buatAi('blue', 'normal', 4242)
    const sebelum = d.rng.state
    for (let i = 0; i < 400; i++) {
      langkahAi(d, ai)
      ai.timer = 0 // paksa mengambil keputusan tiap panggilan
    }
    // Dua AI yang berbagi dunia.rng membuat perilakunya terkopel dan hasil
    // match bergantung pada urutan pemanggilan.
    expect(d.rng.state).toBe(sebelum)
  })

  it('AI biru dan merah tidak pernah identik walau seed sama', () => {
    const biru = buatAi('blue', 'normal', 99)
    const merah = buatAi('red', 'normal', 99)
    expect(biru.rng.state).not.toBe(merah.rng.state)
  })

  it('seed sama menghasilkan AI yang sama persis', () => {
    expect(buatAi('blue', 'normal', 7).rng.state).toBe(buatAi('blue', 'normal', 7).rng.state)
  })
})

describe('peta punya kayu yang cukup', () => {
  it('total kayu di peta cukup untuk ekonomi panjang', () => {
    const d = buatDunia({ seed: 11 })
    const total = d.pohon.reduce((a, p) => a + p.kayu, 0)
    // Versi pertama hanya punya 25 pohon / 2.250 kayu di SELURUH peta - kurang
    // dari biaya tiga Castle, jadi ekonomi kayu mati sebelum match separuh jalan.
    expect(d.pohon.length).toBeGreaterThan(60)
    expect(total).toBeGreaterThan(BANGUNAN.castle.kayu * 20)
  })

  it('kedua pemain punya hutan sama dekatnya', () => {
    const d = buatDunia({ seed: 11 })
    const dekat = (tim: 'blue' | 'red'): number => {
      const c = d.bangunan.find((b) => b.tim === tim && b.jenis === 'castle')!
      return Math.min(...d.pohon.map((p) => Math.hypot(p.x - c.x, p.y - c.y)))
    }
    // Tidak dituntut identik: dataranDekat() menggeser rumpun kalau tempatnya
    // kebetulan air. Selisih di bawah 3 tile tidak berpengaruh ke permainan.
    expect(Math.abs(dekat('blue') - dekat('red'))).toBeLessThan(3 * 64)
  })
})

describe('AI mengalihkan pekerja sesuai kelangkaan', () => {
  it('pawn dipindah ke kayu saat kayu habis meski tidak ada yang menganggur', () => {
    const d = buatDunia({ seed: 21 })
    const ai = buatAi('blue', 'normal', 21)

    // Semua pawn menambang gold, lalu kayu dibuat habis.
    const tambang = d.tambang[0]!
    for (const p of d.unit.filter((u) => u.tim === 'blue' && u.peran === 'pawn')) {
      terapkanPerintah(d, 'blue', { jenis: 'kumpul', ids: [p.id], targetId: tambang.id })
    }
    langkahBanyak(d, 60 * 3)
    d.tim.blue.sumberDaya.kayu = 0
    d.tim.blue.sumberDaya.gold = 5000

    let kePohon = 0
    for (let i = 0; i < 40; i++) {
      ai.timer = 0
      for (const p of langkahAi(d, ai)) {
        if (p.jenis === 'kumpul' && d.pohon.some((x) => x.id === p.targetId)) kePohon++
        terapkanPerintah(d, 'blue', p)
      }
      langkahBanyak(d, 30)
    }
    expect(kePohon).toBeGreaterThan(0)
  }, 30_000)
})

describe('AI bertahan, bukan hanya menyerbu', () => {
  it('menyisakan penjaga di basis saat menyerang', () => {
    const d = buatDunia({ seed: 31 })
    const ai = buatAi('blue', 'normal', 31)
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    for (let i = 0; i < 16; i++) buatUnit(d, 'blue', 'warrior', castle.x + i * 10, castle.y)

    ai.timer = 0
    for (const p of langkahAi(d, ai)) terapkanPerintah(d, 'blue', p)
    expect(ai.menyerang).toBe(true)
    // Tidak semua ikut menyerang: sebagian tetap tinggal.
    const tentara = d.unit.filter((u) => u.tim === 'blue' && u.peran !== 'pawn')
    expect(ai.penyerang.size).toBeLessThan(tentara.length)
    expect(ai.penyerang.size).toBeGreaterThan(0)
  })

  it('semua pasukan pulang saat ada musuh di dekat basis', () => {
    const d = buatDunia({ seed: 31 })
    const ai = buatAi('blue', 'normal', 31)
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    for (let i = 0; i < 16; i++) buatUnit(d, 'blue', 'warrior', castle.x + i * 10, castle.y)
    ai.timer = 0
    for (const p of langkahAi(d, ai)) terapkanPerintah(d, 'blue', p)
    expect(ai.menyerang).toBe(true)

    buatUnit(d, 'red', 'warrior', castle.x + 300, castle.y)
    ai.timer = 0
    langkahAi(d, ai)
    expect(ai.menyerang).toBe(false)
    expect(ai.penyerang.size).toBe(0)
  })
})
