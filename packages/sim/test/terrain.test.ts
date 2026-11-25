import { BONUS_TANAH_TINGGI, DUNIA_H, DUNIA_W, PETA_BARIS, PETA_KOLOM, TILE, TINGGI } from '@hftf/shared'
import { describe, expect, it } from 'vitest'
import {
  adalahRamp, bolehLangkah, bolehTaruhBangunan, buatDunia, buatUnit, cariJalur,
  jangkauanEfektif, keTile, langkahBanyak, terapkanPerintah, tinggiDi, tinggiDiPiksel,
} from '../src/index.js'

const dunia0 = () => buatDunia({ seed: 4242 })

describe('AC-9.1 — ukuran peta', () => {
  it('96x96 tile = 6144x6144 piksel', () => {
    expect(PETA_KOLOM).toBe(96)
    expect(PETA_BARIS).toBe(96)
    expect(DUNIA_W).toBe(6144)
    expect(DUNIA_H).toBe(6144)
  })

  it('terrain punya satu entri per tile', () => {
    const d = dunia0()
    expect(d.terrain.tinggi.length).toBe(96 * 96)
    expect(d.terrain.ramp.length).toBe(96 * 96)
  })
})

describe('AC-9.2 — tiga tingkat ketinggian benar-benar ada', () => {
  it('air, dataran, dan plateau semuanya hadir', () => {
    const d = dunia0()
    const hitung = { air: 0, dataran: 0, plateau: 0 }
    for (const v of d.terrain.tinggi) {
      if (v === TINGGI.air) hitung.air++
      else if (v === TINGGI.dataran) hitung.dataran++
      else hitung.plateau++
    }
    expect(hitung.air).toBeGreaterThan(500)
    expect(hitung.dataran).toBeGreaterThan(3000)
    expect(hitung.plateau).toBeGreaterThan(300)
  })

  it('ada plateau di pusat peta', () => {
    const d = dunia0()
    const p = d.titik.plateauPusat
    expect(tinggiDi(d.terrain, p.tx, p.ty)).toBe(TINGGI.plateau)
  })

  it('tepi peta adalah air', () => {
    const d = dunia0()
    for (const [tx, ty] of [[0, 0], [95, 0], [0, 95], [95, 95], [48, 1]]) {
      expect(tinggiDi(d.terrain, tx!, ty!)).toBe(TINGGI.air)
    }
  })
})

describe('AC-9.3 / AC-9.4 — tebing & ramp', () => {
  it('tidak boleh melangkah langsung dari dataran ke plateau', () => {
    const d = dunia0()
    const t = d.terrain
    let diuji = 0
    for (let ty = 1; ty < 95 && diuji < 40; ty++) {
      for (let tx = 1; tx < 95 && diuji < 40; tx++) {
        if (tinggiDi(t, tx, ty) !== TINGGI.dataran) continue
        if (tinggiDi(t, tx + 1, ty) !== TINGGI.plateau) continue
        if (adalahRamp(t, tx, ty) || adalahRamp(t, tx + 1, ty)) continue
        expect(bolehLangkah(t, tx, ty, tx + 1, ty)).toBe(false)
        diuji++
      }
    }
    expect(diuji).toBeGreaterThan(0)
  })

  it('ramp menghubungkan dua level', () => {
    const d = dunia0()
    expect(d.titik.ramp.length).toBeGreaterThanOrEqual(3)
    for (const r of d.titik.ramp) expect(adalahRamp(d.terrain, r.tx, r.ty)).toBe(true)
  })

  it('plateau pusat bisa dicapai dari basis — jalurnya lewat ramp', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const p = d.titik.plateauPusat
    const jalur = cariJalur(d.terrain, castle.x, castle.y, p.tx * TILE + 32, p.ty * TILE + 32)
    expect(jalur).not.toBeNull()
    const lewatRamp = jalur!.titik.some((t) => adalahRamp(d.terrain, keTile(t.x), keTile(t.y)))
    expect(lewatRamp).toBe(true)
  })

  it('unit tidak memanjat tebing — berakhir di level yang sah', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const u = buatUnit(d, 'blue', 'warrior', castle.x, castle.y)
    const p = d.titik.plateauPusat
    terapkanPerintah(d, 'blue', { jenis: 'pindah', ids: [u.id], x: p.tx * TILE + 32, y: p.ty * TILE + 32 })
    langkahBanyak(d, 60 * 120)
    expect(tinggiDiPiksel(d.terrain, u.x, u.y)).not.toBe(TINGGI.air)
  }, 30_000)

  it('jalur ke tile air dialihkan ke darat, bukan gagal diam-diam', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const jalur = cariJalur(d.terrain, castle.x, castle.y, 1 * TILE, 1 * TILE)
    if (jalur) {
      const akhir = jalur.titik[jalur.titik.length - 1]!
      expect(tinggiDiPiksel(d.terrain, akhir.x, akhir.y)).not.toBe(TINGGI.air)
    }
  })
})

describe('AC-9.6 — bangunan tidak boleh menjembatani dua level', () => {
  it('menolak penempatan tepat di tepi tebing', () => {
    const d = dunia0()
    const t = d.terrain
    let ketemu = false
    for (let ty = 2; ty < 94 && !ketemu; ty++) {
      for (let tx = 2; tx < 94 && !ketemu; tx++) {
        if (tinggiDi(t, tx, ty) !== TINGGI.dataran) continue
        if (tinggiDi(t, tx + 1, ty) !== TINGGI.plateau) continue
        expect(bolehTaruhBangunan(d, 'barracks', tx * TILE + 32, ty * TILE + 32)).toBe(false)
        ketemu = true
      }
    }
    expect(ketemu).toBe(true)
  })

  it('menolak penempatan di air', () => {
    const d = dunia0()
    expect(bolehTaruhBangunan(d, 'house', 1 * TILE, 1 * TILE)).toBe(false)
  })

  it('menerima penempatan di dataran yang lapang', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    let adaYangBoleh = false
    for (let r = 4; r <= 10 && !adaYangBoleh; r++) {
      for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
        if (bolehTaruhBangunan(d, 'house', castle.x + dx! * TILE, castle.y + dy! * TILE)) adaYangBoleh = true
      }
    }
    expect(adaYangBoleh).toBe(true)
  })

  it('menolak penempatan yang menimpa bangunan lain', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    expect(bolehTaruhBangunan(d, 'house', castle.x, castle.y)).toBe(false)
  })
})

describe('AC-9.5 — bonus tanah tinggi', () => {
  it('menyerang ke bawah dari plateau menambah jangkauan 15%', () => {
    const d = dunia0()
    const p = d.titik.plateauPusat
    const diAtas = buatUnit(d, 'blue', 'archer', p.tx * TILE + 32, p.ty * TILE + 32)
    expect(tinggiDiPiksel(d.terrain, diAtas.x, diAtas.y)).toBe(TINGGI.plateau)

    // Cari tile dataran di luar plateau untuk dijadikan sasaran.
    let sasaran: { x: number; y: number } | null = null
    for (let r = 12; r <= 24 && !sasaran; r++) {
      const x = (p.tx + r) * TILE + 32
      const y = p.ty * TILE + 32
      if (tinggiDiPiksel(d.terrain, x, y) === TINGGI.dataran) sasaran = { x, y }
    }
    expect(sasaran).not.toBeNull()

    const keBawah = jangkauanEfektif(d, diAtas, sasaran!.x, sasaran!.y)
    expect(keBawah).toBeCloseTo(diAtas.jarak * BONUS_TANAH_TINGGI.jarakSerang, 3)
    expect(keBawah).toBeGreaterThan(diAtas.jarak)
  })

  it('menyerang ke atas TIDAK dapat bonus', () => {
    const d = dunia0()
    const p = d.titik.plateauPusat
    let bawah: { x: number; y: number } | null = null
    for (let r = 12; r <= 24 && !bawah; r++) {
      const x = (p.tx + r) * TILE + 32
      const y = p.ty * TILE + 32
      if (tinggiDiPiksel(d.terrain, x, y) === TINGGI.dataran) bawah = { x, y }
    }
    const diBawah = buatUnit(d, 'blue', 'archer', bawah!.x, bawah!.y)
    const keAtas = jangkauanEfektif(d, diBawah, p.tx * TILE + 32, p.ty * TILE + 32)
    expect(keAtas).toBe(diBawah.jarak)
  })

  it('sama level berarti jangkauan biasa', () => {
    const d = dunia0()
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const u = buatUnit(d, 'blue', 'archer', castle.x, castle.y)
    expect(jangkauanEfektif(d, u, castle.x + 200, castle.y)).toBe(u.jarak)
  })
})

describe('AC-9.7 — spawn simetri rotasi & berjarak', () => {
  it('kedua castle berjarak minimal 70 tile', () => {
    const d = dunia0()
    const b = d.bangunan.find((x) => x.tim === 'blue' && x.jenis === 'castle')!
    const r = d.bangunan.find((x) => x.tim === 'red' && x.jenis === 'castle')!
    expect(Math.hypot(b.x - r.x, b.y - r.y) / TILE).toBeGreaterThanOrEqual(70)
  })

  it('kedua pemain mulai dengan isi basis yang sama', () => {
    const d = dunia0()
    for (const jenis of ['castle', 'house'] as const) {
      expect(d.bangunan.filter((b) => b.tim === 'blue' && b.jenis === jenis).length)
        .toBe(d.bangunan.filter((b) => b.tim === 'red' && b.jenis === jenis).length)
    }
    expect(d.unit.filter((u) => u.tim === 'blue').length).toBe(d.unit.filter((u) => u.tim === 'red').length)
  })

  it('kedua basis berdiri di dataran, bukan air atau plateau', () => {
    const d = dunia0()
    for (const b of d.bangunan.filter((x) => x.jenis === 'castle')) {
      expect(tinggiDiPiksel(d.terrain, b.x, b.y)).toBe(TINGGI.dataran)
    }
  })

  it('tambang pusat ada di atas plateau', () => {
    const d = dunia0()
    const p = d.titik.plateauPusat
    const pusat = d.tambang.find((t) => Math.abs(t.x / TILE - p.tx) < 2 && Math.abs(t.y / TILE - p.ty) < 2)
    expect(pusat).toBeDefined()
    expect(tinggiDiPiksel(d.terrain, pusat!.x, pusat!.y)).toBe(TINGGI.plateau)
  })
})

describe('House memunculkan domba (PRD §3)', () => {
  it('populasi domba bertambah seiring waktu', () => {
    const d = dunia0()
    d.domba.length = 0
    langkahBanyak(d, 60 * 120)
    expect(d.domba.length).toBeGreaterThan(0)
  }, 30_000)
})
