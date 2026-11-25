// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { buatKonfirmasi, buatMenuJeda } from '../src/menu.js'

const teks = (el: HTMLElement): string => el.textContent ?? ''

describe('AC-14.2 — menu jeda LAN harus jujur', () => {
  it('menyatakan permainan TETAP BERJALAN di LAN', () => {
    const m = buatMenuJeda({ lan: true, suaraNyala: true, aksi: aksiKosong() })
    expect(teks(m)).toContain('tetap berjalan')
  })

  it('di solo menyatakan simulasi dihentikan', () => {
    const m = buatMenuJeda({ lan: false, suaraNyala: true, aksi: aksiKosong() })
    expect(teks(m)).toContain('dihentikan')
    expect(teks(m)).not.toContain('tetap berjalan')
  })
})

describe('AC-14.3 — isi menu jeda', () => {
  it('punya Lanjutkan, Suara, Menyerah, dan Keluar', () => {
    const m = buatMenuJeda({ lan: false, suaraNyala: true, aksi: aksiKosong() })
    const label = [...m.querySelectorAll('button')].map((b) => b.textContent)
    expect(label).toContain('Lanjutkan')
    expect(label).toContain('Menyerah')
    expect(label).toContain('Keluar ke Lobby')
    expect(label.some((l) => l?.startsWith('Suara'))).toBe(true)
  })

  it('menampilkan status suara yang sedang aktif', () => {
    expect(teks(buatMenuJeda({ lan: false, suaraNyala: false, aksi: aksiKosong() }))).toContain('Suara: OFF')
    expect(teks(buatMenuJeda({ lan: false, suaraNyala: true, aksi: aksiKosong() }))).toContain('Suara: ON')
  })

  it('memuat panduan kontrol', () => {
    const m = buatMenuJeda({ lan: false, suaraNyala: true, aksi: aksiKosong() })
    for (const k of ['F1', 'F2', 'Q', 'Ctrl+1..4']) expect(teks(m)).toContain(k)
  })
})

describe('AC-13.3 — surrender wajib konfirmasi', () => {
  it('tombol Menyerah tidak langsung menjalankan aksinya', () => {
    const aksi = aksiKosong()
    const m = buatMenuJeda({ lan: false, suaraNyala: true, aksi })
    const b = [...m.querySelectorAll('button')].find((x) => x.textContent === 'Menyerah')!
    b.click()
    // Aksi `menyerah` di client membuka dialog; di sini cukup dipastikan
    // tombolnya memanggil handler, bukan mengakhiri match sendiri.
    expect(aksi.menyerah).toHaveBeenCalledOnce()
  })

  it('dialog konfirmasi punya Batal dan tidak menjalankan apa pun sampai Ya', () => {
    const onYa = vi.fn()
    const onTidak = vi.fn()
    const d = buatKonfirmasi({ judul: 'Yakin?', pesan: 'tes', ya: 'Ya', onYa, onTidak })
    const tombol = [...d.querySelectorAll('button')].map((b) => b.textContent)
    expect(tombol).toContain('Batal')

    d.querySelectorAll('button')[0]!.click() // Batal lebih dulu
    expect(onTidak).toHaveBeenCalledOnce()
    expect(onYa).not.toHaveBeenCalled()
  })

  it('Ya memanggil onYa', () => {
    const onYa = vi.fn()
    const d = buatKonfirmasi({ judul: 'Yakin?', pesan: 'tes', ya: 'Ya', onYa, onTidak: vi.fn() })
    const ya = [...d.querySelectorAll('button')].find((b) => b.textContent === 'Ya')!
    ya.click()
    expect(onYa).toHaveBeenCalledOnce()
  })
})

function aksiKosong() {
  return { lanjutkan: vi.fn(), suara: vi.fn(), menyerah: vi.fn(), keluar: vi.fn() }
}
