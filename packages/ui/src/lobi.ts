import { HERO_BLUE, type PeranHeroAset } from '@hftf/aset'
import { UNIT } from '@hftf/sim'
import type { ModeSentuh } from './menu.js'
import { urlAset } from './sembilan.js'

export interface RoomLan {
  kode: string
  hostNama: string
  jumlah: number
}

export interface AksiLobi {
  mulaiSolo(hero: PeranHeroAset, kesulitan: 'normal' | 'sulit'): void
  buatRoom(nama: string, hero: PeranHeroAset): void
  gabungRoom(kode: string, nama: string, hero: PeranHeroAset): void
  mulaiLan(): void
  keluarRoom(): void
  ubahModeSentuh?(mode: ModeSentuh): void
  layarPenuh?(): void
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

export class Lobi {
  readonly akar: HTMLElement
  private daftarRoom: HTMLElement
  private statusRoom: HTMLElement
  private tombolBuat: HTMLButtonElement
  private tombolGabung: HTMLButtonElement
  private tombolMulaiLan: HTMLButtonElement
  private tombolKeluar: HTMLButtonElement
  private inputNama: HTMLInputElement
  private inputKode: HTMLInputElement
  private alamat: HTMLElement
  private wadahModeSentuh: HTMLElement
  private heroDipilih: PeranHeroAset = 'king'
  private kesulitan: 'normal' | 'sulit' = 'normal'

  constructor(private basis: string, private aksi: AksiLobi) {
    this.akar = el('div', 'hamparan')
    const kotak = el('div', 'kotak')

    kotak.append(el('h1', undefined, 'Tiny Swords: Warcraft RTS'))
    kotak.append(el('p', undefined, 'Bangun kerajaan, kumpulkan Gold · Kayu · Daging, dan hancurkan markas musuh.'))

    // Nama
    const barisNama = el('div', 'baris')
    this.inputNama = el('input')
    this.inputNama.value = 'Komandan'
    this.inputNama.style.cssText = 'padding:9px 12px;font-family:inherit;font-size:15px;flex:1;min-width:160px'
    barisNama.append(el('span', undefined, 'Nama:'), this.inputNama)
    kotak.append(barisNama)

    // Pilih hero (PRD §11.1 — hero dipilih SEBELUM match)
    kotak.append(el('h2', undefined, 'Pilih Hero'))
    const barisHero = el('div', 'baris')
    for (const h of ['berserker', 'king', 'knight', 'champion'] as PeranHeroAset[]) {
      const b = el('button', 'tombol-besar')
      b.type = 'button'
      b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 12px'
      const im = el('img')
      im.src = urlAset(HERO_BLUE[h].potret, basis)
      im.style.cssText = 'width:40px;height:40px'
      b.append(im, el('span', undefined, UNIT[h].nama.split(' ')[0] ?? h))
      b.addEventListener('click', () => {
        this.heroDipilih = h
        this.tandaiHero(barisHero, h)
      })
      b.dataset['hero'] = h
      barisHero.append(b)
    }
    kotak.append(barisHero)
    this.tandaiHero(barisHero, this.heroDipilih)

    // Solo
    kotak.append(el('h2', undefined, 'Main Sendiri (Solo vs AI)'))
    const barisSolo = el('div', 'baris')
    const pilihKesulitan = el('select')
    pilihKesulitan.style.cssText = 'padding:9px 12px;font-family:inherit;font-size:15px'
    for (const [v, t] of [['normal', 'Normal'], ['sulit', 'Sulit (Agresif)']] as const) {
      const o = el('option', undefined, t)
      o.value = v
      pilihKesulitan.append(o)
    }
    pilihKesulitan.addEventListener('change', () => {
      this.kesulitan = pilihKesulitan.value as 'normal' | 'sulit'
    })
    const tSolo = el('button', 'tombol-besar', 'MULAI SOLO vs AI')
    tSolo.type = 'button'
    tSolo.addEventListener('click', () => this.aksi.mulaiSolo(this.heroDipilih, this.kesulitan))
    barisSolo.append(pilihKesulitan, tSolo)
    if (this.aksi.layarPenuh) {
      const tFull = el('button', 'tombol-besar', '⛶ Layar Penuh')
      tFull.type = 'button'
      tFull.addEventListener('click', () => this.aksi.layarPenuh?.())
      barisSolo.append(tFull)
    }
    kotak.append(barisSolo)

    // Pilihan Kontrol Sentuh (HP/Tablet)
    this.wadahModeSentuh = el('div', 'baris')
    this.wadahModeSentuh.append(el('span', 'cip', 'Kontrol HP:'))
    for (const [m, label] of [['tapPintar', 'Mode 1: Tap Pintar'], ['joystick', 'Mode 3: Joystick']] as const) {
      const b = el('button', 'tombol-besar', label)
      b.type = 'button'
      b.dataset['modeSentuh'] = m
      b.style.padding = '6px 12px'
      b.style.fontSize = '12px'
      b.addEventListener('click', () => {
        this.setModeSentuh(m)
        this.aksi.ubahModeSentuh?.(m)
      })
      this.wadahModeSentuh.append(b)
    }
    kotak.append(this.wadahModeSentuh)
    this.setModeSentuh('tapPintar')

    // LAN
    kotak.append(el('h2', undefined, 'LAN Multiplayer (2 Pemain Wi-Fi)'))
    this.alamat = el('p', undefined, 'Alamat LAN: —')
    kotak.append(this.alamat)

    const barisLan = el('div', 'baris')
    this.tombolBuat = el('button', 'tombol-besar', 'Buat Room (Host)')
    this.tombolBuat.type = 'button'
    this.tombolBuat.addEventListener('click', () => this.aksi.buatRoom(this.inputNama.value, this.heroDipilih))
    this.inputKode = el('input')
    this.inputKode.placeholder = 'KODE ROOM'
    this.inputKode.maxLength = 5
    this.inputKode.style.cssText = 'padding:9px 12px;font-family:inherit;font-size:15px;width:140px;text-transform:uppercase'
    this.tombolGabung = el('button', 'tombol-besar merah', 'Gabung')
    this.tombolGabung.type = 'button'
    this.tombolGabung.addEventListener('click', () =>
      this.aksi.gabungRoom(this.inputKode.value.trim().toUpperCase(), this.inputNama.value, this.heroDipilih))
    barisLan.append(this.tombolBuat, this.inputKode, this.tombolGabung)
    kotak.append(barisLan)

    this.statusRoom = el('p', undefined, '')
    kotak.append(this.statusRoom)

    this.daftarRoom = el('div', 'baris')
    kotak.append(el('p', undefined, 'Room LAN aktif di jaringan ini:'), this.daftarRoom)

    const barisAksi = el('div', 'baris')
    this.tombolMulaiLan = el('button', 'tombol-besar', 'MULAI PERANG LAN!')
    this.tombolMulaiLan.type = 'button'
    this.tombolMulaiLan.disabled = true
    this.tombolMulaiLan.addEventListener('click', () => this.aksi.mulaiLan())
    this.tombolKeluar = el('button', 'tombol-besar merah', 'Keluar Room')
    this.tombolKeluar.type = 'button'
    this.tombolKeluar.style.display = 'none'
    this.tombolKeluar.addEventListener('click', () => this.aksi.keluarRoom())
    barisAksi.append(this.tombolMulaiLan, this.tombolKeluar)
    kotak.append(barisAksi)

    this.akar.append(kotak)
  }

  private tandaiHero(wadah: HTMLElement, h: PeranHeroAset): void {
    for (const b of Array.from(wadah.children) as HTMLElement[]) {
      b.style.outline = b.dataset['hero'] === h ? '3px solid #ffd86b' : 'none'
    }
  }

  setAlamat(url: string): void {
    this.alamat.textContent = `Alamat LAN: ${url}`
  }

  setModeSentuh(mode: ModeSentuh): void {
    for (const b of Array.from(this.wadahModeSentuh.children) as HTMLElement[]) {
      if (!b.dataset['modeSentuh']) continue
      b.style.outline = b.dataset['modeSentuh'] === mode ? '3px solid #ffd86b' : 'none'
    }
  }

  /** Mode web statis (GitHub Pages): Solo vs AI aktif penuh, LAN nonaktif rapi tanpa error WS. */
  setModeStatis(catatan?: string): void {
    this.alamat.textContent =
      catatan ?? 'Mode Web Statis (GitHub Pages) — Solo vs AI siap dimainkan! LAN 2 pemain aktif saat dijalankan lewat server lokal (npm run dev).'
    this.tombolBuat.disabled = true
    this.tombolGabung.disabled = true
    this.inputKode.disabled = true
    this.tombolMulaiLan.disabled = true
    this.daftarRoom.textContent = ''
    this.daftarRoom.append(el('span', 'cip', 'LAN hanya tersedia saat dijalankan dari server lokal (npm run dev).'))
  }

  setDaftarRoom(daftar: readonly RoomLan[]): void {
    this.daftarRoom.textContent = ''
    if (daftar.length === 0) {
      this.daftarRoom.append(el('span', 'cip', 'Belum ada room. Klik "Buat Room (Host)".'))
      return
    }
    for (const r of daftar) {
      const b = el('button', 'tombol-besar', `[${r.kode}] ${r.hostNama} (${r.jumlah}/2)`)
      b.type = 'button'
      b.addEventListener('click', () => this.aksi.gabungRoom(r.kode, this.inputNama.value, this.heroDipilih))
      this.daftarRoom.append(b)
    }
  }

  setStatusRoom(teks: string, bisaMulai: boolean, diDalamRoom: boolean): void {
    this.statusRoom.textContent = teks
    this.tombolMulaiLan.disabled = !bisaMulai
    this.tombolKeluar.style.display = diDalamRoom ? '' : 'none'
  }

  get nama(): string {
    return this.inputNama.value
  }

  get hero(): PeranHeroAset {
    return this.heroDipilih
  }

  tampil(tampilkan: boolean): void {
    this.akar.style.display = tampilkan ? '' : 'none'
  }

  void(): void {
    void this.basis
  }
}
