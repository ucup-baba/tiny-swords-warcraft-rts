// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buatKamera } from '@hftf/render'
import { buatBangunan, buatDunia, buatUnit } from '@hftf/sim'
import { buatInput, pilihKursorKonteks, pilihPawnBangun } from '../src/input.js'
import { PengendaliSentuh } from '../src/sentuh.js'

describe('PengendaliSentuh — Mode 1 (Tap Pintar) & Mode 3 (Joystick + Seret)', () => {
  const buatFixture = (mode: 'tapPintar' | 'joystick' = 'tapPintar') => {
    const dunia = buatDunia({ seed: 990 })
    const kam = buatKamera()
    kam.lebar = 976
    kam.tinggi = 720
    const input = buatInput()
    const kirim = vi.fn()
    const tandaiBendera = vi.fn()
    const sorotSumber = vi.fn()
    const toast = vi.fn()
    const perbaruiHud = vi.fn()
    const setKotakUi = vi.fn()

    const pengendali = new PengendaliSentuh({
      dunia: () => dunia,
      tim: () => 'blue',
      faseMain: () => true,
      kam,
      input,
      kirim,
      tandaiBendera,
      sorotSumber,
      toast,
      perbaruiHud,
      bangunanTerpilih: () => dunia.bangunan.find((b) => b.id === input.bangunanTerpilih) ?? null,
      padaSentuhPertama: vi.fn(),
      setKotakUi,
    }, mode)

    return { dunia, kam, input, kirim, tandaiBendera, sorotSumber, toast, perbaruiHud, setKotakUi, pengendali }
  }

  it('Mode 1: tap pada unit memilihnya, lalu tap tanah memberi perintah pindah + bendera', () => {
    const { dunia, input, kirim, tandaiBendera, pengendali } = buatFixture('tapPintar')
    const castle = dunia.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const w = buatUnit(dunia, 'blue', 'warrior', castle.x + 180, castle.y + 40)

    pengendali.tanganiTap(w.x, w.y)
    expect(input.unitTerpilih.has(w.id)).toBe(true)

    pengendali.tanganiTap(w.x + 120, w.y + 30)
    expect(kirim).toHaveBeenCalledWith({ jenis: 'pindah', ids: [w.id], x: w.x + 120, y: w.y + 30 })
    expect(tandaiBendera).toHaveBeenCalledWith(w.x + 120, w.y + 30, 'pindah')
  })

  it('Mode 1: tap Barracks memilihnya, lalu tap tanah memindahkan Bendera Rally Point', () => {
    const { dunia, input, kirim, tandaiBendera, pengendali } = buatFixture('tapPintar')
    const castle = dunia.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const barracks = buatBangunan(dunia, 'blue', 'barracks', castle.x + 260, castle.y, 'aktif')

    pengendali.tanganiTap(barracks.x, barracks.y)
    expect(input.bangunanTerpilih).toBe(barracks.id)

    pengendali.tanganiTap(barracks.x + 200, barracks.y + 120)
    expect(kirim).toHaveBeenCalledWith({ jenis: 'rally', bangunanId: barracks.id, x: barracks.x + 200, y: barracks.y + 120 })
    expect(tandaiBendera).toHaveBeenCalledWith(barracks.x + 200, barracks.y + 120, 'rally')
  })

  it('Mode 3: vektor joystick menggeser kamera dengan benar dan pergantian mode tersimpan', () => {
    const { kam, pengendali } = buatFixture('joystick')
    kam.x = 500
    kam.y = 500
    pengendali.vektorJoystick = { x: 1, y: 0 }
    pengendali.langkahJoystick(0.5)
    expect(kam.x).toBeGreaterThan(500)

    pengendali.setMode('tapPintar')
    expect(pengendali.mode).toBe('tapPintar')
    expect(pengendali.toggleKotak()).toBe(true)
    expect(pengendali.toggleKotak()).toBe(false)
  })

  it('pilihPawnBangun tidak pernah menarik Pawn yang sedang membangun & memprioritaskan Pawn terpilih/diam terdekat', () => {
    const { dunia } = buatFixture('tapPintar')
    const pawns = dunia.unit.filter((u) => u.tim === 'blue' && u.peran === 'pawn')
    const [p0, p1, p2] = pawns as [typeof pawns[0], typeof pawns[0], typeof pawns[0]]
    p0.tugas = 'bangun'
    p1.tugas = 'tebang'
    p2.tugas = 'diam'
    for (const p of pawns.slice(3)) p.tugas = 'bangun'

    // Tanpa seleksi: prioritaskan Pawn diam (p2), bukan p0 yang sedang bangun atau p1 yang menebang
    const h1 = pilihPawnBangun(dunia, 'blue', p0.x, p0.y, new Set())
    expect(h1.pawn?.id).toBe(p2.id)

    // Jika p1 sedang dipilih (dan tidak bangun), prioritaskan p1
    const h2 = pilihPawnBangun(dunia, 'blue', p0.x, p0.y, new Set([p1.id]))
    expect(h2.pawn?.id).toBe(p1.id)

    // Jika SEMUA Pawn sedang bangun -> pawn: null, semuaSibuk: true (tidak merampas pekerja lain!)
    p1.tugas = 'bangun'
    p2.tugas = 'bangun'
    const h3 = pilihPawnBangun(dunia, 'blue', p0.x, p0.y, new Set([p0.id]))
    expect(h3.pawn).toBeNull()
    expect(h3.semuaSibuk).toBe(true)
    expect(h3.adaPawn).toBe(true)
  })

  it('tap resource saat Pawn terpilih memicu perintah kumpul dan sorotSumber (lingkaran konfirmasi)', () => {
    const { dunia, input, kirim, sorotSumber, pengendali } = buatFixture('tapPintar')
    const pawn = dunia.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const pohon = dunia.pohon[0]!
    input.unitTerpilih = new Set([pawn.id])

    pengendali.tanganiTap(pohon.x, pohon.y)
    expect(kirim).toHaveBeenCalledWith({ jenis: 'kumpul', ids: [pawn.id], targetId: pohon.id })
    expect(sorotSumber).toHaveBeenCalledWith(pohon.id)
  })

  it('pilihKursorKonteks menyesuaikan ikon resource khusus saat Pawn terpilih & memperbaiki kursor bangun sah vs terhalang', () => {
    const { dunia, input } = buatFixture('tapPintar')
    const pawn = dunia.unit.find((u) => u.tim === 'blue' && u.peran === 'pawn')!
    const hero = dunia.unit.find((u) => u.tim === 'blue' && u.hero)!
    const pohon = dunia.pohon[0]!
    const tambang = dunia.tambang[0]!
    const domba = dunia.domba[0]!
    const pondasi = buatBangunan(dunia, 'blue', 'house', pawn.x + 140, pawn.y, 'konstruksi')

    // Pawn hover pohon -> kursorKayu, tambang -> kursorGold, domba -> kursorDaging, pondasi -> kursorBangun
    input.mouse.wx = pohon.x; input.mouse.wy = pohon.y
    input.sumberHover = { jenis: 'pohon', id: pohon.id }
    expect(pilihKursorKonteks(dunia, 'blue', input, [pawn])).toBe('kursorKayu')
    // Non-pawn (Hero) hover pohon -> tetap panah biasa kursor01!
    expect(pilihKursorKonteks(dunia, 'blue', input, [hero])).toBe('kursor01')

    input.mouse.wx = tambang.x; input.mouse.wy = tambang.y
    input.sumberHover = { jenis: 'tambang', id: tambang.id }
    expect(pilihKursorKonteks(dunia, 'blue', input, [pawn])).toBe('kursorGold')
    expect(pilihKursorKonteks(dunia, 'blue', input, [hero])).toBe('kursor01')

    input.mouse.wx = domba.x; input.mouse.wy = domba.y
    input.sumberHover = { jenis: 'domba', id: domba.id }
    expect(pilihKursorKonteks(dunia, 'blue', input, [pawn])).toBe('kursorDaging')
    expect(pilihKursorKonteks(dunia, 'blue', input, [hero])).toBe('kursor01')

    input.mouse.wx = pondasi.x; input.mouse.wy = pondasi.y
    input.sumberHover = null
    expect(pilihKursorKonteks(dunia, 'blue', input, [pawn])).toBe('kursorBangun')
    expect(pilihKursorKonteks(dunia, 'blue', input, [hero])).toBe('kursor01')

    // Mode taruh bangunan: lokasi di atas bangunan lain (terhalang) -> kursor03 (larangan ⊘)
    input.hantuBangun = 'house'
    input.mouse.wx = pondasi.x; input.mouse.wy = pondasi.y
    expect(pilihKursorKonteks(dunia, 'blue', input, [pawn])).toBe('kursor03')
  })
})
