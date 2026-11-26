// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buatBangunan, buatDunia, buatUnit, antreLatih, mulaiRiset } from '@hftf/sim'
import { bangunGaya } from '../src/gaya.js'
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

  it('Lobi.setModeStatis menonaktifkan mode Wi-Fi LAN untuk GitHub Pages tanpa merusak Main vs AI', () => {
    const lobi = new Lobi('', {
      mulaiSolo: vi.fn(), buatRoom: vi.fn(), gabungRoom: vi.fn(), mulaiLan: vi.fn(), keluarRoom: vi.fn(),
    })
    lobi.setModeStatis()
    expect(lobi.akar.textContent).toContain('GitHub Pages')
    const btnWifi = lobi.akar.querySelector<HTMLButtonElement>('[data-pilih-mode="wifi"]')!
    const btnAi = lobi.akar.querySelector<HTMLButtonElement>('[data-pilih-mode="ai"]')!
    expect(btnWifi.disabled).toBe(true)
    expect(btnAi.disabled).toBe(false)

    // Masuk ke Main vs AI tetap normal
    btnAi.click()
    expect(lobi.layarAktif).toBe('ai')
    const btnSolo = [...lobi.akar.querySelectorAll('button')].find((b) => b.textContent?.includes('MULAI SOLO')) as HTMLButtonElement
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

  it('CSS bingkai layar memusatkan stage 1280x720 dengan position absolute + translate(-50%, -50%) tanpa grid clamping di layar HP', () => {
    const css = bangunGaya('')
    const blokBingkai = css.match(/#bingkai-layar\s*\{[^}]*\}/)?.[0] ?? ''
    const blokAkar = css.match(/#akar\s*\{[^}]*\}/)?.[0] ?? ''
    expect(blokBingkai).not.toContain('place-items: center')
    expect(blokBingkai).not.toContain('display: grid')
    expect(blokAkar).toContain('position: absolute')
    expect(blokAkar).toContain('left: 50%')
    expect(blokAkar).toContain('top: 50%')
    expect(blokAkar).toContain('translate(-50%, -50%)')
  })

  it('tombol 9-slice (.tab-tombol, .cmd-btn, #seleksi) memisahkan border-width tipis dari border-image-width agar teks tidak terpotong', () => {
    const css = bangunGaya('')
    const tab = css.match(/\.tab-tombol\s*\{[^}]*\}/)?.[0] ?? ''
    const cmd = css.match(/\.cmd-btn\s*\{[^}]*\}/)?.[0] ?? ''
    const seleksi = css.match(/#seleksi\s*\{[^}]*\}/)?.[0] ?? ''
    expect(tab).toContain('border-width: 3px')
    expect(tab).toContain('border-image-width: 11px')
    expect(cmd).toContain('border-width: 3px')
    expect(cmd).toContain('border-image-width: 10px')
    expect(seleksi).toContain('border-width: 8px')
    expect(seleksi).toContain('border-image-width: 16px')
  })

  it('perbaruiPita tidak membangun ulang DOM saat detik belum berubah (anti-thrash 60fps)', () => {
    const { hud } = buatHud()
    const d = buatDunia({ seed: 905 })
    d.tick = 120
    hud.perbaruiPita(d, 'blue', 'SOLO vs AI')
    const anakPertama = hud.akar.querySelector('#pita-status')?.firstChild
    d.tick = 125 // masih detik ke-2
    hud.perbaruiPita(d, 'blue', 'SOLO vs AI')
    expect(hud.akar.querySelector('#pita-status')?.firstChild).toBe(anakPertama)
  })
})

describe('Lobi Warcraft III — Pemisahan Main vs AI / Wi-Fi LAN, Peta 2/4/6P, 4 Tier AI, & Custom Gold', () => {
  it('berpindah peta mengubah jumlah slot & mendukung 4 tingkat kesulitan AI + custom gold awal di mode Main vs AI', () => {
    const mulaiMatch = vi.fn()
    const lobi = new Lobi('', {
      mulaiSolo: vi.fn(),
      mulaiMatch,
      buatRoom: vi.fn(),
      gabungRoom: vi.fn(),
      mulaiLan: vi.fn(),
      keluarRoom: vi.fn(),
    })

    // Awalnya di layar pilih mode (pemisahan Main vs AI vs Wi-Fi LAN)
    expect(lobi.layarAktif).toBe('pilih')
    lobi.akar.querySelector<HTMLButtonElement>('[data-pilih-mode="ai"]')!.click()
    expect(lobi.layarAktif).toBe('ai')

    // Awalnya peta klasik2 (2 slot)
    expect(lobi.akar.querySelectorAll('.slot-baris')).toHaveLength(2)

    // Pindah ke Pulau Salib (4P)
    lobi.akar.querySelector<HTMLButtonElement>('.peta-btn[data-peta="salib4"]')!.click()
    expect(lobi.akar.querySelectorAll('.slot-baris')).toHaveLength(4)

    // Pindah ke Kepulauan Bintang (6P)
    lobi.akar.querySelector<HTMLButtonElement>('.peta-btn[data-peta="bintang6"]')!.click()
    expect(lobi.akar.querySelectorAll('.slot-baris')).toHaveLength(6)

    // Dropdown AI harus menyediakan ke-4 tingkat (Gampang, Medium, Susah, Extreme)
    const selAi = lobi.akar.querySelector<HTMLSelectElement>('select[data-role-select="1"]')!
    const opsi = [...selAi.options].map((o) => o.value)
    expect(opsi).toContain('ai:gampang')
    expect(opsi).toContain('ai:medium')
    expect(opsi).toContain('ai:susah')
    expect(opsi).toContain('ai:extreme')
    selAi.value = 'ai:extreme'
    selAi.dispatchEvent(new Event('change'))

    // Atur custom gold awal via input angka
    const goldInput = lobi.akar.querySelector<HTMLInputElement>('#lobi-pratinjau-peta')
      ? lobi.akar.querySelectorAll<HTMLInputElement>('.gold-input')[1]!
      : lobi.akar.querySelector<HTMLInputElement>('.gold-input')!
    goldInput.value = '1750'
    goldInput.dispatchEvent(new Event('change'))

    // Aktifkan preset aliansi 3v3
    const btn3v3 = [...lobi.akar.querySelectorAll<HTMLButtonElement>('.btn-kecil')].find((b) => b.textContent === '3v3')!
    btn3v3.click()

    // Mulai pertandingan -> mengirim KonfigMatch lengkap
    const btnMulaiAi = [...lobi.akar.querySelectorAll<HTMLButtonElement>('.cta-mulai')]
      .find((b) => b.textContent?.includes('MULAI SOLO'))!
    btnMulaiAi.click()
    expect(mulaiMatch).toHaveBeenCalledTimes(1)
    const arg = mulaiMatch.mock.calls[0]![0]
    expect(arg.peta).toBe('bintang6')
    expect(arg.goldAwal).toBe(1750)
    expect(arg.slot).toHaveLength(6)
    expect(arg.slot[1].kesulitanAi).toBe('extreme')
    expect(arg.slot[0].aliansi).toBe(1)
    expect(arg.slot[3].aliansi).toBe(2)
  })

  it('mode Wi-Fi LAN: Buat Room membuka semua slot teman, daftar room menandai Terbuka vs Penuh, anti double-tap, dan tampilkan nama Host asli ke Tamu', () => {
    const buatRoomKonfig = vi.fn()
    const gabungRoom = vi.fn()
    const lobi = new Lobi('', {
      mulaiSolo: vi.fn(),
      buatRoom: vi.fn(),
      buatRoomKonfig,
      gabungRoom,
      mulaiLan: vi.fn(),
      keluarRoom: vi.fn(),
    })

    // Masuk ke Hub Wi-Fi LAN
    lobi.akar.querySelector<HTMLButtonElement>('[data-pilih-mode="wifi"]')!.click()
    expect(lobi.layarAktif).toBe('wifi')

    // Pilih peta Pulau Salib (4P) lalu Buat Room -> semua 3 slot lain harus terbuka ('manusia'), BUKAN AI
    lobi.akar.querySelector<HTMLButtonElement>('[data-wifi-peta="salib4"]')!.click()
    const btnBuat = [...lobi.akar.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('BUAT ROOM WI-FI'))!
    btnBuat.click()
    expect(buatRoomKonfig).toHaveBeenCalledTimes(1)
    const konfig = buatRoomKonfig.mock.calls[0]![1]
    expect(konfig.peta).toBe('salib4')
    expect(konfig.slot.map((s: { jenis: string }) => s.jenis)).toEqual(['manusia', 'manusia', 'manusia', 'manusia'])

    // Daftar room: 1 terbuka (3 slot), 1 penuh (0 slot)
    lobi.setDaftarRoom([
      { kode: 'BUKA1', hostNama: 'Budi', tamuNama: null, jumlah: 1, slotTerbuka: 3, maksPemain: 4, peta: 'salib4', goldAwal: 500 },
      { kode: 'PENU2', hostNama: 'Siti', tamuNama: 'Andi', jumlah: 2, slotTerbuka: 0, maksPemain: 2, peta: 'klasik2', goldAwal: 320 },
    ])
    const kartuBuka = lobi.akar.querySelector<HTMLButtonElement>('[data-room-kode="BUKA1"]')!
    const kartuPenuh = lobi.akar.querySelector<HTMLButtonElement>('[data-room-kode="PENU2"]')!
    expect(kartuBuka.disabled).toBe(false)
    expect(kartuBuka.textContent).toContain('TERBUKA (3 slot)')
    expect(kartuPenuh.disabled).toBe(true)
    expect(kartuPenuh.textContent).toContain('PENUH')

    // Tap cepat 2x pada room terbuka hanya mengirim 1 permintaan gabung (anti double-tap)
    kartuBuka.click()
    kartuBuka.click()
    expect(gabungRoom).toHaveBeenCalledTimes(1)
    expect(gabungRoom).toHaveBeenCalledWith('BUKA1', 'Komandan', 'king')

    // Terima konfirmasi masuk room sebagai Tamu -> otomatis ke layar 'room' & nama Host tetap 'Budi'
    lobi.terimaRoomLan('BUKA1', 'tamu', 'red', {
      kode: 'BUKA1',
      hostNama: 'Budi',
      tamuNama: 'Komandan',
      jumlah: 2,
      slotTerbuka: 2,
      maksPemain: 4,
      peta: 'salib4',
      goldAwal: 500,
      slot: [
        { indeks: 0, tim: 'blue', jenis: 'manusia', aliansi: 1, hero: 'king', kesulitanAi: 'medium', nama: 'Budi', terisi: true },
        { indeks: 1, tim: 'red', jenis: 'manusia', aliansi: 2, hero: 'knight', kesulitanAi: 'medium', nama: 'Komandan', terisi: true },
        { indeks: 2, tim: 'green', jenis: 'manusia', aliansi: 3, hero: 'champion', kesulitanAi: 'medium', nama: 'Terbuka (LAN)', terisi: false },
        { indeks: 3, tim: 'yellow', jenis: 'manusia', aliansi: 4, hero: 'berserker', kesulitanAi: 'medium', nama: 'Terbuka (LAN)', terisi: false },
      ],
    })
    expect(lobi.layarAktif).toBe('room')
    const baris0 = lobi.akar.querySelector('.slot-baris[data-slot-index="0"]')!
    const baris1 = lobi.akar.querySelector('.slot-baris[data-slot-index="1"]')!
    expect(baris0.textContent).toContain('Budi')
    expect(baris1.textContent).toContain('Komandan (Anda)')

    // Jika Host menutup room -> tamu kembali ke layar Wi-Fi
    lobi.keluarDariRoom('Host menutup room')
    expect(lobi.layarAktif).toBe('wifi')
    expect(lobi.akar.textContent).toContain('Host menutup room')
  })
})
