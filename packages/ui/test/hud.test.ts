// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buatBangunan, buatDunia, buatUnit, antreLatih, mulaiRiset } from '@hftf/sim'
import { Hud } from '../src/hud.js'
import { Lobi } from '../src/lobi.js'

describe('HUD Warcraft III — tab per unit, riset kontekstual, progres %, dan Command Card', () => {
  const buatHud = () => {
    const callbacks = {
      pilihTab: vi.fn(),
      mulaiBangun: vi.fn(),
      latih: vi.fn(),
      batalLatih: vi.fn(),
      riset: vi.fn(),
      bangkitkanHero: vi.fn(),
      pilihFilterUnit: vi.fn(),
      perintahUnit: vi.fn(),
      fokusUnit: vi.fn(),
    }
    const hud = new Hud('', callbacks)
    return { hud, callbacks }
  }

  it('tab per unit hanya muncul jika jumlah unit > 0 dan hilang jika 0', () => {
    const { hud, callbacks } = buatHud()
    const d = buatDunia({ seed: 901 })

    // Awal match: hanya ada 5 Pawn + 1 Hero (0 Pedang, 0 Panah, 0 Tombak, 0 Monk, 0 Mage)
    hud.perbaruiTabUnit(d, 'blue', [])
    const tombolAwal = [...hud.akar.querySelectorAll<HTMLButtonElement>('.tab-unit-btn')].map((b) => b.dataset['filter'])
    expect(tombolAwal).toEqual(['semua', 'pawn', 'hero'])
    expect(tombolAwal).not.toContain('warrior')
    expect(tombolAwal).not.toContain('archer')

    // Tambah 2 Pedang -> tab 'warrior' muncul dan bisa diklik
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    buatUnit(d, 'blue', 'warrior', castle.x + 120, castle.y)
    buatUnit(d, 'blue', 'warrior', castle.x + 140, castle.y)
    hud.perbaruiTabUnit(d, 'blue', [])

    const btnPedang = hud.akar.querySelector<HTMLButtonElement>('.tab-unit-btn[data-filter="warrior"]')
    expect(btnPedang).not.toBeNull()
    expect(btnPedang!.textContent).toContain('Pedang 2')
    btnPedang!.click()
    expect(callbacks.pilihFilterUnit).toHaveBeenCalledWith('warrior')
  })

  it('memilih Barracks menampilkan tombol Riset kontekstual & progres pelatihan % ala Warcraft', () => {
    const { hud, callbacks } = buatHud()
    const d = buatDunia({ seed: 902 })
    d.tim.blue.sumberDaya = { gold: 500, kayu: 500, daging: 300 }
    const castle = d.bangunan.find((b) => b.tim === 'blue' && b.jenis === 'castle')!
    const barracks = buatBangunan(d, 'blue', 'barracks', castle.x + 240, castle.y, 'aktif')

    // Antre latih warrior dan setengah jalan
    antreLatih(d, barracks, 'warrior')
    barracks.antrean[0]!.sisaDetik /= 2

    hud.perbaruiSeleksi(d, 'blue', [], barracks)

    // Progres % harus muncul sekitar 50% dengan sapuan gelap->cerah
    const persen = hud.akar.querySelector('.progres-persen')
    expect(persen?.textContent).toBe('50%')
    expect(hud.akar.querySelector('.progres-ikon .sapuan-gelap')).not.toBeNull()

    // Tombol riset kontekstual Barracks: Senjata Tajam & Baju Zirah
    const btnTajam = hud.akar.querySelector<HTMLButtonElement>('.cmd-btn[data-riset="senjataTajam"]')
    const btnZirah = hud.akar.querySelector<HTMLButtonElement>('.cmd-btn[data-riset="bajuZirah"]')
    expect(btnTajam).not.toBeNull()
    expect(btnZirah).not.toBeNull()
    btnTajam!.click()
    expect(callbacks.riset).toHaveBeenCalledWith(barracks.id, 'senjataTajam')

    // Klik slot antrean memanggil batalLatih
    const slot = hud.akar.querySelector<HTMLButtonElement>('.antrean-slot')
    slot!.click()
    expect(callbacks.batalLatih).toHaveBeenCalledWith(barracks.id, 0)

    // Mulai riset -> tombol riset menampilkan badge %
    mulaiRiset(d, barracks, 'senjataTajam')
    hud.perbaruiSeleksi(d, 'blue', [], barracks)
    expect(btnTajam!.querySelector('.badge-persen')).not.toBeNull()
  })

  it('memilih unit menampilkan Command Card [A]/[S]/[H]/[Q] yang aktif', () => {
    const { hud, callbacks } = buatHud()
    const d = buatDunia({ seed: 903 })
    const hero = d.unit.find((u) => u.tim === 'blue' && u.hero)!

    hud.perbaruiSeleksi(d, 'blue', [hero], null)
    const btnStop = hud.akar.querySelector<HTMLButtonElement>('.cmd-btn[data-cmd="stop"]')
    const btnSkill = hud.akar.querySelector<HTMLButtonElement>('.cmd-btn[data-cmd="skill"]')
    expect(btnStop).not.toBeNull()
    expect(btnSkill).not.toBeNull()
    expect(btnSkill!.disabled).toBe(false)

    btnStop!.click()
    btnSkill!.click()
    expect(callbacks.perintahUnit).toHaveBeenCalledWith('stop')
    expect(callbacks.perintahUnit).toHaveBeenCalledWith('skill')
  })

  it('kontrol mobile HUD: mode joystick menampilkan joystick, mode tapPintar menampilkan tombol Kotak, dan layar putar bisa di-toggle', () => {
    const { hud } = buatHud()
    hud.setModeSentuh('joystick', true)
    expect(hud.joystickEl.classList.contains('tampil')).toBe(true)
    expect(hud.tombolKotak.style.display).toBe('none')

    hud.setModeSentuh('tapPintar', true)
    expect(hud.joystickEl.classList.contains('tampil')).toBe(false)
    expect(hud.tombolKotak.style.display).toBe('')

    hud.setKotakAktif(true)
    expect(hud.tombolKotak.classList.contains('aktif')).toBe(true)

    hud.setLayarPutar(true)
    expect(hud.layarPutar.classList.contains('tampil')).toBe(true)
  })

  it('Lobi.setModeStatis menonaktifkan tombol LAN untuk GitHub Pages tanpa merusak Solo vs AI', () => {
    const lobi = new Lobi('', {
      mulaiSolo: vi.fn(), buatRoom: vi.fn(), gabungRoom: vi.fn(), mulaiLan: vi.fn(), keluarRoom: vi.fn(),
    })
    lobi.setModeStatis()
    expect(lobi.akar.textContent).toContain('GitHub Pages')
    const btnBuat = [...lobi.akar.querySelectorAll('button')].find((b) => b.textContent?.includes('Buat Room')) as HTMLButtonElement
    const btnSolo = [...lobi.akar.querySelectorAll('button')].find((b) => b.textContent?.includes('MULAI SOLO')) as HTMLButtonElement
    expect(btnBuat.disabled).toBe(true)
    expect(btnSolo.disabled).toBe(false)
  })

  it('kartu terkunci tetap bisa diklik agar notifikasi kekurangan resource muncul & inspeksi resource tampil di panel bawah', () => {
    const { hud, callbacks } = buatHud()
    const d = buatDunia({ seed: 904 })
    d.tim.blue.sumberDaya = { gold: 0, kayu: 0, daging: 0 }

    // Kartu Bangun kekurangan resource -> pakai kelas .terkunci (bukan disabled) sehingga klik tetap masuk!
    hud.perbaruiKisi(d, 'blue', null)
    const kartuHouse = hud.akar.querySelector<HTMLButtonElement>('.kartu.terkunci')
    expect(kartuHouse).not.toBeNull()
    expect(kartuHouse!.disabled).toBe(false)
    kartuHouse!.click()
    expect(callbacks.mulaiBangun).toHaveBeenCalled()

    // Toast peringatan memakai kelas .peringatan
    hud.tampilkanToast('Kurang 30 Gold!', true)
    expect(hud.akar.querySelector('#toast.peringatan.tampil')).not.toBeNull()

    // Memilih resource pohon menampilkan judul & sisa kayu di panel seleksi bawah
    const pohon = d.pohon[0]!
    hud.perbaruiSeleksi(d, 'blue', [], null, false, { jenis: 'pohon', id: pohon.id })
    expect(hud.akar.querySelector('#seleksi-judul')?.textContent).toBe('Pohon Pinus')
    expect(hud.akar.querySelector('.hp-teks')?.textContent).toContain('Kayu')
  })
})
