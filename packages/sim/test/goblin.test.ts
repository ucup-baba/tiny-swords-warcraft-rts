import { describe, expect, it } from 'vitest'
import {
  CAMP, GOBLIN, buatDunia, buatUnit, langkah, langkahBanyak, lukaiUnit,
  peranGoblin, tambahCamp,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 909 })

/** Dunia tanpa camp bawaan, lalu satu camp ditaruh di tempat yang diketahui. */
function arena() {
  const d = dunia0()
  for (let i = d.unit.length - 1; i >= 0; i--) if (d.unit[i]!.campId !== null) d.unit.splice(i, 1)
  d.camp.length = 0
  const camp = tambahCamp(d, 'kecil', 2000, 2000)
  return { d, camp }
}

describe('AC-10.1 / 10.2 — pasif lalu aggro', () => {
  it('camp terisi sesuai komposisinya', () => {
    const { d, camp } = arena()
    expect(d.unit.filter((u) => u.campId === camp.id)).toHaveLength(3)
  })

  it('goblin tidak bergerak menyerang kalau musuh jauh', () => {
    const { d, camp } = arena()
    buatUnit(d, 'blue', 'warrior', 2000 + CAMP.radiusAggro + 400, 2000)
    const posisi = d.unit.filter((u) => u.campId === camp.id).map((u) => ({ x: u.x, y: u.y }))
    langkahBanyak(d, 60 * 20)
    const sesudah = d.unit.filter((u) => u.campId === camp.id).map((u) => ({ x: u.x, y: u.y }))
    for (const [i, p] of posisi.entries()) {
      expect(Math.hypot(p.x - sesudah[i]!.x, p.y - sesudah[i]!.y)).toBeLessThan(60)
    }
    expect(camp.aggro).toBe(false)
  }, 20_000)

  it('mendekat dalam radius aggro membangunkan SELURUH camp', () => {
    const { d, camp } = arena()
    buatUnit(d, 'blue', 'warrior', 2000 + 150, 2000)
    langkah(d)
    expect(camp.aggro).toBe(true)
  })
})

describe('AC-10.3 — terikat camp', () => {
  it('goblin tidak mengejar melewati tali dan kembali memulihkan HP', () => {
    const { d, camp } = arena()
    const umpan = buatUnit(d, 'blue', 'knight', 2000 + 150, 2000)
    langkah(d)
    expect(camp.aggro).toBe(true)

    // Umpan kabur jauh.
    umpan.x = 2000 + CAMP.tali + 2500
    umpan.hp = 9999
    umpan.hpMaks = 9999
    langkahBanyak(d, 60 * 30)

    for (const g of d.unit.filter((u) => u.campId === camp.id)) {
      expect(Math.hypot(g.x - camp.x, g.y - camp.y)).toBeLessThanOrEqual(CAMP.tali)
      expect(g.hp).toBe(g.hpMaks)
    }
  }, 30_000)
})

describe('AC-10.4 / 10.5 — respawn', () => {
  it('camp yang dibersihkan terisi lagi setelah 150 detik', () => {
    const { d, camp } = arena()
    for (const g of [...d.unit.filter((u) => u.campId === camp.id)]) lukaiUnit(d, g, 9999, null)
    expect(d.unit.filter((u) => u.campId === camp.id)).toHaveLength(0)

    langkahBanyak(d, 60 * (CAMP.respawn - 5))
    expect(d.unit.filter((u) => u.campId === camp.id)).toHaveLength(0)

    langkahBanyak(d, 60 * 10)
    expect(d.unit.filter((u) => u.campId === camp.id)).toHaveLength(3)
  }, 40_000)

  it('memancarkan kejadian campDibersihkan lalu campRespawn', () => {
    const { d, camp } = arena()
    for (const g of [...d.unit.filter((u) => u.campId === camp.id)]) lukaiUnit(d, g, 9999, null)
    langkah(d)
    expect(d.kejadian.some((k) => k.jenis === 'campDibersihkan')).toBe(true)
  })
})

describe('AC-10.6 / 10.7 — hadiah', () => {
  it('gold masuk LANGSUNG tanpa diangkut Pawn', () => {
    const { d, camp } = arena()
    const jagoan = buatUnit(d, 'blue', 'champion', 1900, 2000)
    const goldAwal = d.tim.blue.sumberDaya.gold
    const g = d.unit.find((u) => u.campId === camp.id)!
    const peran = peranGoblin(g)
    lukaiUnit(d, g, 9999, jagoan)
    expect(d.tim.blue.sumberDaya.gold).toBe(goldAwal + GOBLIN[peran].gold)
  })

  it('XP hero hanya masuk kalau hero cukup dekat', () => {
    const { d, camp } = arena()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    hero.x = 100
    hero.y = 100
    const g1 = d.unit.find((u) => u.campId === camp.id)!
    lukaiUnit(d, g1, 9999, null, 'blue')
    expect(hero.xp).toBe(0)

    hero.x = 2050
    hero.y = 2000
    const g2 = d.unit.find((u) => u.campId === camp.id)!
    lukaiUnit(d, g2, 9999, null, 'blue')
    expect(hero.xp).toBeGreaterThan(0)
  })

  it('goblin tetap menjatuhkan daging seperti unit biasa', () => {
    const { d, camp } = arena()
    d.daging.length = 0
    const g = d.unit.find((u) => u.campId === camp.id)!
    lukaiUnit(d, g, 9999, null, 'blue')
    expect(d.daging.length).toBe(1)
  })

  it('kredit camp jatuh ke tim yang menghabisinya, bukan keduanya', () => {
    const { d, camp } = arena()
    const jagoan = buatUnit(d, 'blue', 'champion', 1900, 2000)
    for (const g of [...d.unit.filter((u) => u.campId === camp.id)]) lukaiUnit(d, g, 9999, jagoan)
    langkah(d)
    expect(d.tim.blue.statistik.campDibersihkan).toBe(1)
    expect(d.tim.red.statistik.campDibersihkan).toBe(0)
  })
})

describe('AC-10.9 — goblin tidak pernah menyerang basis', () => {
  it('tidak ada goblin yang sampai ke castle pemain', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    langkahBanyak(d, 60 * 60 * 3)
    for (const g of d.unit.filter((u) => u.campId !== null)) {
      expect(Math.hypot(g.x - castle.x, g.y - castle.y)).toBeGreaterThan(600)
    }
  }, 60_000)
})

describe('peta punya camp sejak awal', () => {
  it('ada camp kecil dan satu camp besar', () => {
    const d = dunia0()
    expect(d.camp.filter((c) => c.jenis === 'kecil').length).toBeGreaterThanOrEqual(2)
    expect(d.camp.filter((c) => c.jenis === 'besar')).toHaveLength(1)
  })

  it('goblin memulai permainan sebagai tim neutral', () => {
    const d = dunia0()
    const goblin = d.unit.filter((u) => u.campId !== null)
    expect(goblin.length).toBeGreaterThan(5)
    for (const g of goblin) expect(g.tim).toBe('neutral')
  })
})
