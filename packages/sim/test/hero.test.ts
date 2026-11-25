import { describe, expect, it } from 'vitest'
import {
  REVIVE, SKILL, buatBangunan, buatDunia, buatUnit, langkahBanyak,
  lukaiBangunan, lukaiUnit, supplyTerpakai, tambahXp, terapkanPerintah,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 11, heroBlue: 'king', heroRed: 'champion' })

describe('hero sejak awal (PRD §11.1)', () => {
  it('tiap pemain mulai dengan tepat satu hero hidup', () => {
    const d = dunia0()
    for (const tim of ['blue', 'red'] as const) {
      const hero = d.unit.filter((u) => u.tim === tim && u.hero)
      expect(hero).toHaveLength(1)
      expect(d.tim[tim].heroHidup).toBe(hero[0]!.id)
    }
  })

  it('hero yang muncul sesuai pilihan lobi', () => {
    const d = buatDunia({ seed: 1, heroBlue: 'knight', heroRed: 'berserker' })
    expect(d.unit.find((u) => u.tim === 'blue' && u.hero)!.peran).toBe('knight')
    expect(d.unit.find((u) => u.tim === 'red' && u.hero)!.peran).toBe('berserker')
  })

  it('hero awal gratis dan tidak memakan supply', () => {
    const d = dunia0()
    expect(d.tim.blue.sumberDaya).toEqual({ gold: 320, kayu: 220, daging: 140 })
    expect(supplyTerpakai(d, 'blue')).toBe(5) // 5 pawn saja
  })

  it('hero mulai di level 1 tanpa xp', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    expect(hero.level).toBe(1)
    expect(hero.xp).toBe(0)
  })
})

describe('xp & level (PRD §4B)', () => {
  it('naik level saat xp mencapai ambang', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 100)
    expect(hero.level).toBe(2)
  })

  it('hp maksimum dan damage naik ikut level', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const hpAwal = hero.hpMaks
    const dmgAwal = hero.dmg
    tambahXp(d, hero, 100)
    expect(hero.hpMaks).toBeGreaterThan(hpAwal)
    expect(hero.dmg).toBeGreaterThan(dmgAwal)
  })

  it('berhenti di level 5', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 99999)
    expect(hero.level).toBe(5)
  })

  it('memancarkan kejadian heroNaikLevel', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 100)
    expect(d.kejadian.some((k) => k.jenis === 'heroNaikLevel')).toBe(true)
  })

  it('xp hanya masuk kalau hero cukup dekat (PRD §10.4)', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const jauh = buatUnit(d, 'red', 'warrior', hero.x + 3000, hero.y)
    lukaiUnit(d, jauh, 9999, null)
    expect(hero.xp).toBe(0)

    const dekat = buatUnit(d, 'red', 'warrior', hero.x + 100, hero.y)
    lukaiUnit(d, dekat, 9999, null)
    expect(hero.xp).toBeGreaterThan(0)
  })
})

describe('skill [Q] (PRD §4B)', () => {
  it('skill area melukai semua musuh dalam radius', () => {
    const d = buatDunia({ seed: 2, heroBlue: 'champion' })
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const a = buatUnit(d, 'red', 'warrior', hero.x + 60, hero.y)
    const b = buatUnit(d, 'red', 'warrior', hero.x + 120, hero.y)
    const jauh = buatUnit(d, 'red', 'warrior', hero.x + 900, hero.y)

    terapkanPerintah(d, 'blue', { jenis: 'skill', ids: [hero.id] })

    expect(a.hp).toBeLessThan(a.hpMaks)
    expect(b.hp).toBeLessThan(b.hpMaks)
    expect(jauh.hp).toBe(jauh.hpMaks)
  })

  it('Royal Blessing menyembuhkan sekutu, bukan melukai musuh', () => {
    const d = buatDunia({ seed: 2, heroBlue: 'king' })
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const sekutu = buatUnit(d, 'blue', 'warrior', hero.x + 60, hero.y)
    sekutu.hp = 30
    const musuh = buatUnit(d, 'red', 'warrior', hero.x + 60, hero.y + 20)

    terapkanPerintah(d, 'blue', { jenis: 'skill', ids: [hero.id] })

    expect(sekutu.hp).toBeGreaterThan(30)
    expect(musuh.hp).toBe(musuh.hpMaks)
  })

  it('skill masuk jeda dan tidak bisa dipakai dua kali beruntun', () => {
    const d = buatDunia({ seed: 2, heroBlue: 'champion' })
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const korban = buatUnit(d, 'red', 'warrior', hero.x + 60, hero.y)

    terapkanPerintah(d, 'blue', { jenis: 'skill', ids: [hero.id] })
    const hpSetelahSekali = korban.hp
    terapkanPerintah(d, 'blue', { jenis: 'skill', ids: [hero.id] })

    expect(korban.hp).toBe(hpSetelahSekali)
    expect(hero.skillJeda).toBeCloseTo(SKILL.champion.jeda, 1)
  })

  it('jeda skill berkurang seiring waktu', () => {
    const d = buatDunia({ seed: 2, heroBlue: 'champion' })
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    terapkanPerintah(d, 'blue', { jenis: 'skill', ids: [hero.id] })
    const awal = hero.skillJeda
    langkahBanyak(d, 60)
    expect(hero.skillJeda).toBeLessThan(awal)
  })
})

describe('hero gugur (PRD §11.2)', () => {
  it('hero yang mati masuk state gugur, bukan dihapus selamanya', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    lukaiUnit(d, hero, 9999, null)

    expect(d.tim.blue.heroHidup).toBeNull()
    expect(d.tim.blue.heroGugur).not.toBeNull()
    expect(d.tim.blue.heroGugur!.peran).toBe('king')
  })

  it('level dan xp tersimpan saat gugur (PRD AC-11.5)', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 250) // sampai level 3
    const levelSebelum = hero.level
    expect(levelSebelum).toBeGreaterThan(1)

    lukaiUnit(d, hero, 9999, null)
    expect(d.tim.blue.heroGugur!.level).toBe(levelSebelum)
  })

  it('memancarkan kejadian heroGugur dengan posisi nisan', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    const x = hero.x
    lukaiUnit(d, hero, 9999, null)
    const k = d.kejadian.find((e) => e.jenis === 'heroGugur')
    expect(k).toBeDefined()
    expect((k as { x: number }).x).toBe(x)
  })
})

describe('revive lewat Altar (PRD §11.3)', () => {
  it('TANPA Altar hero tidak bisa dibangkitkan selamanya', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    lukaiUnit(d, hero, 9999, null)
    langkahBanyak(d, 60 * 180) // 3 menit
    expect(d.tim.blue.heroHidup).toBeNull()
    expect(d.unit.some((u) => u.tim === 'blue' && u.hero)).toBe(false)
  })

  it('dengan Altar, hero bangkit dengan 50% hp dan level tetap', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 100) // level 2
    lukaiUnit(d, hero, 9999, null)

    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    d.tim.blue.sumberDaya.gold = 9999
    d.tim.blue.sumberDaya.daging = 9999
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })
    expect(altar.revive).not.toBeNull()

    langkahBanyak(d, 60 * 60)
    const bangkit = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    expect(bangkit).toBeDefined()
    expect(bangkit.level).toBe(2)
    expect(bangkit.hp).toBe(Math.round(bangkit.hpMaks * REVIVE.hpSaatMuncul))
    expect(d.tim.blue.heroGugur).toBeNull()
  })

  it('biaya revive berskala dengan level hero', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 100) // level 2
    lukaiUnit(d, hero, 9999, null)

    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    d.tim.blue.sumberDaya.gold = 1000
    d.tim.blue.sumberDaya.daging = 1000
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })

    expect(d.tim.blue.sumberDaya.gold).toBe(1000 - REVIVE.goldPerLevel * 2)
    expect(d.tim.blue.sumberDaya.daging).toBe(1000 - REVIVE.daging)
  })

  it('durasi revive berskala dengan level', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    lukaiUnit(d, hero, 9999, null)
    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    d.tim.blue.sumberDaya.gold = 9999
    d.tim.blue.sumberDaya.daging = 9999
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })
    expect(altar.revive!.sisaDetik).toBe(REVIVE.detikDasar + REVIVE.detikPerLevel * 1)
  })

  it('tidak bisa revive kalau hero masih hidup', () => {
    const d = dunia0()
    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })
    expect(altar.revive).toBeNull()
  })

  it('tidak bisa revive kalau sumber daya kurang', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    lukaiUnit(d, hero, 9999, null)
    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    d.tim.blue.sumberDaya.gold = 0
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })
    expect(altar.revive).toBeNull()
  })

  it('maksimal satu hero hidup per pemain (PRD AC-11.10)', () => {
    const d = dunia0()
    expect(d.unit.filter((u) => u.tim === 'blue' && u.hero)).toHaveLength(1)
  })
})

describe('altar hancur saat revive (PRD §11.3, AC-11.9)', () => {
  it('membatalkan revive dan mengembalikan biaya PENUH', () => {
    const d = dunia0()
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!
    tambahXp(d, hero, 100) // level 2
    lukaiUnit(d, hero, 9999, null)

    const altar = buatBangunan(d, 'blue', 'altar', 1500, 4800, 'aktif')
    d.tim.blue.sumberDaya.gold = 1000
    d.tim.blue.sumberDaya.daging = 1000
    terapkanPerintah(d, 'blue', { jenis: 'bangkitkanHero', bangunanId: altar.id })

    const goldSetelahBayar = d.tim.blue.sumberDaya.gold
    expect(goldSetelahBayar).toBe(1000 - REVIVE.goldPerLevel * 2)

    lukaiBangunan(d, altar, 99999, 'red')

    expect(altar.revive).toBeNull()
    expect(d.tim.blue.sumberDaya.gold).toBe(1000)
    expect(d.tim.blue.sumberDaya.daging).toBe(1000)
    // Hero tetap gugur dan menunggu Altar baru.
    expect(d.tim.blue.heroGugur).not.toBeNull()
  })
})
