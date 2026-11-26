// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buatKamera } from '@hftf/render'
import { buatBangunan, buatDunia, buatUnit } from '@hftf/sim'
import { buatInput } from '../src/input.js'
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
      toast,
      perbaruiHud,
      bangunanTerpilih: () => dunia.bangunan.find((b) => b.id === input.bangunanTerpilih) ?? null,
      padaSentuhPertama: vi.fn(),
      setKotakUi,
    }, mode)

    return { dunia, kam, input, kirim, tandaiBendera, toast, perbaruiHud, setKotakUi, pengendali }
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
})
