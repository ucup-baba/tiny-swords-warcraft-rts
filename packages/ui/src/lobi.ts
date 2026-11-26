import { HERO_BLUE, type PeranHeroAset } from '@hftf/aset'
import {
  GOLD_AWAL_BAKU, GOLD_AWAL_MAKS, GOLD_AWAL_MIN, INFO_PETA, JENIS_PETA, KESULITAN_AI, LABEL_KESULITAN,
  PRESET_GOLD, TIM_PEMAIN, TINGGI, WARNA_TIM, buatSlotDefault, jepitGoldAwal,
  type HeroId, type JenisPeta, type JenisSlot, type KesulitanAi, type KonfigMatch, type KonfigSlot, type TimPemain,
} from '@hftf/shared'
import { UNIT, buatRng, buatTerrain, type Terrain, type TitikPenting } from '@hftf/sim'
import type { ModeSentuh } from './menu.js'
import { urlAset } from './sembilan.js'

export interface SlotRoomLobi {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
  terisi: boolean
}

export interface RoomLan {
  kode: string
  hostNama: string
  tamuNama: string | null
  jumlah: number
  maksPemain?: number
  peta?: JenisPeta
  goldAwal?: number
  slot?: SlotRoomLobi[]
}

export interface AksiLobi {
  mulaiSolo(hero: PeranHeroAset, kesulitan: 'normal' | 'sulit'): void
  mulaiMatch?(konfig: KonfigMatch): void
  buatRoom(nama: string, hero: PeranHeroAset): void
  buatRoomKonfig?(nama: string, konfig: KonfigMatch): void
  aturRoom?(konfig: KonfigMatch): void
  ubahSlotTamu?(opsi: { hero?: HeroId; aliansi?: number; tim?: TimPemain }): void
  gabungRoom(kode: string, nama: string, hero: PeranHeroAset): void
  mulaiLan(): void
  keluarRoom(): void
  ubahModeSentuh?(mode: ModeSentuh): void
  layarPenuh?(): void
}

const DAFTAR_HERO: readonly { id: HeroId; label: string }[] = [
  { id: 'king', label: 'Aldric (Raja)' },
  { id: 'berserker', label: 'Kael (Kapak)' },
  { id: 'knight', label: 'Valen (Kuda)' },
  { id: 'champion', label: 'Torin (Perisai)' },
]

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
  private slotTabel: HTMLElement
  private presetAliansiEl: HTMLElement
  private petaListEl: HTMLElement
  private goldPresetEl: HTMLElement
  private goldInput: HTMLInputElement
  private tombolBuat: HTMLButtonElement
  private tombolGabung: HTMLButtonElement
  private tombolMulaiLan: HTMLButtonElement
  private tombolKeluar: HTMLButtonElement
  private tombolMulaiSolo: HTMLButtonElement
  private inputNama: HTMLInputElement
  private inputKode: HTMLInputElement
  private alamat: HTMLElement
  private wadahModeSentuh: HTMLElement
  private pratinjauKanvas: HTMLCanvasElement
  private pratinjauKet: HTMLElement

  private petaDipilih: JenisPeta = 'klasik2'
  private goldAwal = GOLD_AWAL_BAKU
  private slot: KonfigSlot[] = buatSlotDefault('klasik2')
  private diDalamRoom = false
  private peranLan: 'host' | 'tamu' | null = null
  private timLanSaya: TimPemain | null = null
  private modeStatis = false
  private cachePeta = new Map<JenisPeta, { terrain: Terrain; titik: TitikPenting }>()

  constructor(private basis: string, private aksi: AksiLobi) {
    this.akar = el('div', 'hamparan')
    const kotak = el('div', 'kotak kotak-lobi')

    // --- Header bar: judul + nama pemain + kontrol HP + layar penuh ---
    const kepala = el('div', 'lobi-kepala')
    const kiriHead = el('div')
    kiriHead.append(
      el('h1', undefined, 'Tiny Swords: Warcraft RTS'),
      el('p', undefined, 'Lobi Pertempuran (2–6 Pemain / AI) · Pilih Peta, Tim, Kesulitan AI, dan Gold Awal'),
    )
    const alat = el('div', 'lobi-alat')
    this.inputNama = el('input', 'lobi-input')
    this.inputNama.value = 'Komandan'
    this.inputNama.maxLength = 16
    this.inputNama.style.width = '126px'
    this.inputNama.addEventListener('input', () => {
      if (!this.diDalamRoom && this.slot[0]) {
        this.slot[0].nama = this.inputNama.value.trim() || 'Komandan'
      }
    })
    const lblNama = el('label', undefined, 'Nama:')
    alat.append(lblNama, this.inputNama)

    this.wadahModeSentuh = el('div', 'lobi-preset-baris')
    for (const [m, label] of [['tapPintar', 'Tap HP'], ['joystick', 'Joystick']] as const) {
      const b = el('button', 'btn-kecil', label)
      b.type = 'button'
      b.dataset['modeSentuh'] = m
      b.addEventListener('click', () => {
        this.setModeSentuh(m)
        this.aksi.ubahModeSentuh?.(m)
      })
      this.wadahModeSentuh.append(b)
    }
    alat.append(this.wadahModeSentuh)

    if (this.aksi.layarPenuh) {
      const tFull = el('button', 'btn-kecil', '⛶ Layar Penuh')
      tFull.type = 'button'
      tFull.addEventListener('click', () => this.aksi.layarPenuh?.())
      alat.append(tFull)
    }
    kepala.append(kiriHead, alat)
    kotak.append(kepala)

    // --- Grid 2 kolom gaya Warcraft III ---
    const grid = el('div', 'lobi-grid')

    // Kolom kiri: Tabel 2-6 Slot Pemain + Kontrol LAN
    const kolKiri = el('div', 'lobi-kolom')
    const boxSlot = el('div', 'lobi-subkotak')
    const subHead = el('div', 'lobi-subjudul')
    subHead.append(el('h2', undefined, 'Daftar Pemain & AI (Maks 6 Pemain)'))
    this.presetAliansiEl = el('div', 'lobi-preset-baris')
    subHead.append(this.presetAliansiEl)
    boxSlot.append(subHead)

    const thead = el('div', 'slot-header')
    thead.append(
      el('span', undefined, '#'),
      el('span', undefined, 'Warna'),
      el('span', undefined, 'Pemain / Kesulitan AI'),
      el('span', undefined, 'Aliansi'),
      el('span', undefined, 'Hero Awal'),
    )
    boxSlot.append(thead)
    this.slotTabel = el('div', 'slot-tabel')
    boxSlot.append(this.slotTabel)
    kolKiri.append(boxSlot)

    // Panel LAN Multiplayer
    const boxLan = el('div', 'lobi-subkotak')
    const headLan = el('div', 'lobi-subjudul')
    headLan.append(el('h2', undefined, 'LAN Wi-Fi Multiplayer (2–6 Pemain)'))
    boxLan.append(headLan)
    this.alamat = el('p', undefined, 'Alamat LAN: —')
    boxLan.append(this.alamat)

    const barisLan = el('div', 'baris')
    this.tombolBuat = el('button', 'tombol-besar', 'Buat Room (Host)')
    this.tombolBuat.type = 'button'
    this.tombolBuat.addEventListener('click', () => {
      if (this.modeStatis) return
      const konfig = this.getKonfig()
      if (this.aksi.buatRoomKonfig) this.aksi.buatRoomKonfig(this.nama, konfig)
      else this.aksi.buatRoom(this.nama, this.hero)
    })

    this.inputKode = el('input', 'lobi-input')
    this.inputKode.placeholder = 'KODE'
    this.inputKode.maxLength = 5
    this.inputKode.style.cssText = 'width:92px;text-transform:uppercase;text-align:center'

    this.tombolGabung = el('button', 'tombol-besar merah', 'Gabung')
    this.tombolGabung.type = 'button'
    this.tombolGabung.addEventListener('click', () => {
      this.aksi.gabungRoom(this.inputKode.value.trim().toUpperCase(), this.nama, this.hero)
    })

    this.tombolMulaiLan = el('button', 'tombol-besar', 'MULAI PERANG LAN!')
    this.tombolMulaiLan.type = 'button'
    this.tombolMulaiLan.disabled = true
    this.tombolMulaiLan.addEventListener('click', () => this.aksi.mulaiLan())

    this.tombolKeluar = el('button', 'tombol-besar merah', 'Keluar Room')
    this.tombolKeluar.type = 'button'
    this.tombolKeluar.style.display = 'none'
    this.tombolKeluar.addEventListener('click', () => {
      this.resetStatusRoom()
      this.aksi.keluarRoom()
    })

    barisLan.append(this.tombolBuat, this.inputKode, this.tombolGabung, this.tombolMulaiLan, this.tombolKeluar)
    boxLan.append(barisLan)

    this.statusRoom = el('p', undefined, '')
    this.statusRoom.style.marginTop = '5px'
    this.daftarRoom = el('div', 'baris')
    boxLan.append(this.statusRoom, this.daftarRoom)
    kolKiri.append(boxLan)

    // Kolom kanan: Pilih Peta + Pratinjau + Gold Awal + Tombol Mulai
    const kolKanan = el('div', 'lobi-kolom')
    const boxPeta = el('div', 'lobi-subkotak')
    const headPeta = el('div', 'lobi-subjudul')
    headPeta.append(el('h2', undefined, 'Pilih Peta Pertempuran'))
    boxPeta.append(headPeta)

    this.petaListEl = el('div', 'peta-pilihan')
    for (const id of JENIS_PETA) {
      const info = INFO_PETA[id]
      const btn = el('button', 'peta-btn')
      btn.type = 'button'
      btn.dataset['peta'] = id
      const kiriP = el('span', undefined, info.nama)
      const kananP = el('span', 'peta-sub', `Maks ${info.maksPemain}P`)
      btn.append(kiriP, kananP)
      btn.addEventListener('click', () => this.ubahPeta(id))
      this.petaListEl.append(btn)
    }
    boxPeta.append(this.petaListEl)

    const bingkaiPreview = el('div', 'peta-pratinjau-bingkai')
    bingkaiPreview.style.marginTop = '6px'
    this.pratinjauKanvas = el('canvas')
    this.pratinjauKanvas.id = 'lobi-pratinjau-peta'
    this.pratinjauKanvas.width = 300
    this.pratinjauKanvas.height = 150
    this.pratinjauKet = el('span', 'peta-sub', INFO_PETA[this.petaDipilih].ringkas)
    this.pratinjauKet.style.color = '#d9c698'
    this.pratinjauKet.style.textAlign = 'center'
    bingkaiPreview.append(this.pratinjauKanvas, this.pratinjauKet)
    boxPeta.append(bingkaiPreview)
    kolKanan.append(boxPeta)

    // Custom Starting Gold
    const boxGold = el('div', 'lobi-subkotak')
    const headGold = el('div', 'lobi-subjudul')
    headGold.append(el('h2', undefined, 'Gold Awal (Custom)'), el('span', 'peta-sub', 'Kayu 220 · Daging 140'))
    boxGold.append(headGold)

    const barisGold = el('div', 'gold-baris')
    this.goldPresetEl = el('div', 'lobi-preset-baris')
    for (const nilai of PRESET_GOLD) {
      const b = el('button', 'btn-kecil', `${nilai}`)
      b.type = 'button'
      b.dataset['gold'] = String(nilai)
      b.addEventListener('click', () => this.setGoldAwal(nilai))
      this.goldPresetEl.append(b)
    }
    this.goldInput = el('input', 'gold-input')
    this.goldInput.type = 'number'
    this.goldInput.min = String(GOLD_AWAL_MIN)
    this.goldInput.max = String(GOLD_AWAL_MAKS)
    this.goldInput.step = '50'
    this.goldInput.value = String(this.goldAwal)
    this.goldInput.addEventListener('change', () => {
      this.setGoldAwal(Number(this.goldInput.value))
    })
    barisGold.append(this.goldPresetEl, this.goldInput)
    boxGold.append(barisGold)
    kolKanan.append(boxGold)

    // Tombol Mulai Solo / Skirmish utama
    this.tombolMulaiSolo = el('button', 'tombol-besar cta-mulai', '⚔ MULAI SOLO / SKIRMISH')
    this.tombolMulaiSolo.type = 'button'
    this.tombolMulaiSolo.addEventListener('click', () => this.mulaiSkirmish())
    kolKanan.append(this.tombolMulaiSolo)

    grid.append(kolKiri, kolKanan)
    kotak.append(grid)
    this.akar.append(kotak)

    this.setModeSentuh('tapPintar')
    this.segarkanSemuaUi()
  }

  private terbilangHostBebas(): boolean {
    return !this.diDalamRoom || this.peranLan === 'host'
  }

  private ubahPeta(peta: JenisPeta): void {
    if (!this.terbilangHostBebas()) return
    const maks = INFO_PETA[peta].maksPemain
    const bawaan = buatSlotDefault(peta, this.nama, this.hero)
    const baru: KonfigSlot[] = []
    const terpakai = new Set<TimPemain>()

    for (let i = 0; i < maks; i++) {
      const lama = this.slot[i]
      const sumber = lama ? { ...lama, indeks: i } : bawaan[i]!
      if (terpakai.has(sumber.tim)) {
        sumber.tim = TIM_PEMAIN.find((c) => !terpakai.has(c)) ?? sumber.tim
      }
      terpakai.add(sumber.tim)
      baru.push(sumber)
    }
    this.petaDipilih = peta
    this.slot = baru
    this.segarkanSemuaUi()
    this.kirimAturRoom()
  }

  private setGoldAwal(nilai: number): void {
    if (!this.terbilangHostBebas()) return
    this.goldAwal = jepitGoldAwal(nilai)
    this.goldInput.value = String(this.goldAwal)
    this.segarkanGoldUi()
    this.kirimAturRoom()
  }

  private terapkanPresetAliansi(mode: 'ffa' | '2v2' | '3v3' | '2v2v2'): void {
    if (!this.terbilangHostBebas()) return
    for (let i = 0; i < this.slot.length; i++) {
      const s = this.slot[i]!
      if (mode === 'ffa') s.aliansi = i + 1
      else if (mode === '2v2') s.aliansi = i < 2 ? 1 : i < 4 ? 2 : 3
      else if (mode === '3v3') s.aliansi = i < 3 ? 1 : 2
      else s.aliansi = Math.floor(i / 2) + 1
    }
    this.renderTabelSlot()
    this.kirimAturRoom()
  }

  private putarWarna(indeks: number): void {
    const s = this.slot[indeks]
    if (!s) return
    const bisaHost = this.terbilangHostBebas()
    const bisaTamuSendiri = this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya
    if (!bisaHost && !bisaTamuSendiri) return

    const pos = TIM_PEMAIN.indexOf(s.tim)
    const timBaru = TIM_PEMAIN[(pos + 1) % TIM_PEMAIN.length]!
    if (bisaTamuSendiri) {
      this.aksi.ubahSlotTamu?.({ tim: timBaru })
      return
    }
    const lain = this.slot.find((x, j) => j !== indeks && x.tim === timBaru)
    if (lain) lain.tim = s.tim
    s.tim = timBaru
    this.segarkanSemuaUi()
    this.kirimAturRoom()
  }

  private kirimAturRoom(): void {
    if (this.diDalamRoom && this.peranLan === 'host') {
      this.aksi.aturRoom?.(this.getKonfig())
    }
  }

  private mulaiSkirmish(): void {
    const konfig = this.getKonfig()
    const aktif = konfig.slot.filter((s) => s.jenis !== 'kosong')
    if (aktif.length < 2) {
      this.statusRoom.textContent = 'Minimal pilih 2 kerajaan aktif (Anda + minimal 1 AI).'
      return
    }
    if (new Set(aktif.map((s) => s.aliansi)).size < 2) {
      this.statusRoom.textContent = 'Minimal harus ada 2 Tim/Aliansi yang berbeda agar bisa bertempur.'
      return
    }
    if (this.aksi.mulaiMatch) {
      this.aksi.mulaiMatch(konfig)
      return
    }
    const aiPertama = aktif.find((s) => s.jenis === 'ai')
    const legacyKes = aiPertama && (aiPertama.kesulitanAi === 'susah' || aiPertama.kesulitanAi === 'extreme') ? 'sulit' : 'normal'
    this.aksi.mulaiSolo(this.hero, legacyKes)
  }

  private segarkanSemuaUi(): void {
    const hostBebas = this.terbilangHostBebas()
    this.goldInput.disabled = !hostBebas
    for (const b of Array.from(this.petaListEl.children) as HTMLButtonElement[]) {
      const id = b.dataset['peta'] as JenisPeta
      b.classList.toggle('aktif', id === this.petaDipilih)
      b.disabled = !hostBebas
    }
    this.pratinjauKet.textContent = INFO_PETA[this.petaDipilih].ringkas
    this.segarkanGoldUi()
    this.renderPresetAliansi()
    this.renderTabelSlot()
    this.gambarPratinjauPeta()
    this.tombolMulaiSolo.disabled = this.diDalamRoom
  }

  private segarkanGoldUi(): void {
    this.goldInput.value = String(this.goldAwal)
    const hostBebas = this.terbilangHostBebas()
    for (const b of Array.from(this.goldPresetEl.children) as HTMLButtonElement[]) {
      b.classList.toggle('aktif', Number(b.dataset['gold']) === this.goldAwal)
      b.disabled = !hostBebas
    }
  }

  private renderPresetAliansi(): void {
    this.presetAliansiEl.textContent = ''
    const n = this.slot.length
    const daftar: { id: 'ffa' | '2v2' | '3v3' | '2v2v2'; label: string }[] = [{ id: 'ffa', label: 'FFA' }]
    if (n === 4) daftar.push({ id: '2v2', label: '2v2' })
    if (n === 6) daftar.push({ id: '3v3', label: '3v3' }, { id: '2v2v2', label: '2v2v2' })
    const boleh = this.terbilangHostBebas()
    for (const p of daftar) {
      const b = el('button', 'btn-kecil', p.label)
      b.type = 'button'
      b.disabled = !boleh
      b.addEventListener('click', () => this.terapkanPresetAliansi(p.id))
      this.presetAliansiEl.append(b)
    }
  }

  private renderTabelSlot(): void {
    this.slotTabel.textContent = ''
    const hostBebas = this.terbilangHostBebas()
    const maks = this.slot.length

    for (let i = 0; i < maks; i++) {
      const s = this.slot[i]!
      const row = el('div', 'slot-baris')
      row.dataset['slotIndex'] = String(i)
      const milikSaya = (!this.diDalamRoom && i === 0) || (this.diDalamRoom && s.tim === this.timLanSaya)
      if (milikSaya) row.classList.add('saya')
      if (s.jenis === 'kosong') row.classList.add('kosong')

      row.append(el('span', 'slot-nomor', String(i + 1)))

      // Tombol warna kerajaan
      const infoWarna = WARNA_TIM[s.tim]
      const btnWarna = el('button', 'btn-warna', infoWarna.nama)
      btnWarna.type = 'button'
      btnWarna.style.background = infoWarna.utama
      btnWarna.disabled = !hostBebas && !(this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya)
      btnWarna.title = 'Klik untuk ganti warna'
      btnWarna.addEventListener('click', () => this.putarWarna(i))
      row.append(btnWarna)

      // Kolom Pemain / Kesulitan AI
      if (i === 0 || (this.diDalamRoom && (s.jenis === 'manusia' && s.nama !== 'Terbuka (LAN)'))) {
        const ikon = i === 0 && this.diDalamRoom ? '👑 ' : s.jenis === 'manusia' ? '👤 ' : ''
        const namaTampil = i === 0 ? (this.nama || 'Komandan') : s.nama
        row.append(el('span', 'slot-nama', `${ikon}${namaTampil}`))
      } else {
        const selTipe = el('select', 'lobi-select')
        selTipe.dataset['roleSelect'] = String(i)
        const opsi: { val: string; teks: string }[] = []
        if (this.diDalamRoom) opsi.push({ val: 'manusia', teks: 'Terbuka (Pemain LAN)' })
        for (const k of KESULITAN_AI) opsi.push({ val: `ai:${k}`, teks: LABEL_KESULITAN[k] })
        opsi.push({ val: 'kosong', teks: 'Kosong (Tutup)' })

        for (const o of opsi) {
          const opt = el('option', undefined, o.teks)
          opt.value = o.val
          selTipe.append(opt)
        }
        selTipe.value = s.jenis === 'ai' ? `ai:${s.kesulitanAi}` : s.jenis
        selTipe.disabled = !hostBebas
        selTipe.addEventListener('change', () => {
          const v = selTipe.value
          if (v === 'kosong') {
            s.jenis = 'kosong'
            s.nama = 'Kosong'
          } else if (v === 'manusia') {
            s.jenis = 'manusia'
            s.nama = 'Terbuka (LAN)'
          } else if (v.startsWith('ai:')) {
            s.jenis = 'ai'
            s.kesulitanAi = v.slice(3) as KesulitanAi
            s.nama = `AI ${WARNA_TIM[s.tim].nama}`
          }
          this.renderTabelSlot()
          this.gambarPratinjauPeta()
          this.kirimAturRoom()
        })
        row.append(selTipe)
      }

      // Kolom Aliansi (Tim 1..N)
      const selTim = el('select', 'lobi-select')
      selTim.dataset['aliansiSelect'] = String(i)
      for (let t = 1; t <= maks; t++) {
        const opt = el('option', undefined, `Tim ${t}`)
        opt.value = String(t)
        selTim.append(opt)
      }
      selTim.value = String(Math.min(maks, Math.max(1, s.aliansi)))
      const bolehUbahAliansi = hostBebas || (this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya)
      selTim.disabled = !bolehUbahAliansi || s.jenis === 'kosong'
      selTim.addEventListener('change', () => {
        const val = Number(selTim.value)
        if (this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya) {
          this.aksi.ubahSlotTamu?.({ aliansi: val })
          return
        }
        s.aliansi = val
        this.kirimAturRoom()
      })
      row.append(selTim)

      // Kolom Hero (potret mini + dropdown)
      const selHeroBox = el('div', 'slot-hero')
      const imHero = el('img')
      imHero.src = urlAset(HERO_BLUE[s.hero].potret, this.basis)
      const selHero = el('select', 'lobi-select')
      selHero.dataset['heroSelect'] = String(i)
      for (const h of DAFTAR_HERO) {
        const opt = el('option', undefined, h.label)
        opt.value = h.id
        selHero.append(opt)
      }
      selHero.value = s.hero
      const bolehUbahHero = hostBebas || (this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya)
      selHero.disabled = !bolehUbahHero || s.jenis === 'kosong'
      selHero.addEventListener('change', () => {
        const h = selHero.value as HeroId
        s.hero = h
        imHero.src = urlAset(HERO_BLUE[h].potret, this.basis)
        if (this.diDalamRoom && this.peranLan === 'tamu' && s.tim === this.timLanSaya) {
          this.aksi.ubahSlotTamu?.({ hero: h })
        } else {
          this.kirimAturRoom()
        }
      })
      selHeroBox.append(imHero, selHero)
      row.append(selHeroBox)

      this.slotTabel.append(row)
    }
    void UNIT
  }

  private gambarPratinjauPeta(): void {
    const ctx = this.pratinjauKanvas.getContext('2d')
    if (!ctx) return

    let data = this.cachePeta.get(this.petaDipilih)
    if (!data) {
      data = buatTerrain(buatRng(42), this.petaDipilih)
      this.cachePeta.set(this.petaDipilih, data)
    }

    const { terrain: t, titik } = data
    const w = this.pratinjauKanvas.width
    const h = this.pratinjauKanvas.height
    const sx = w / t.kolom
    const sy = h / t.baris

    for (let ty = 0; ty < t.baris; ty++) {
      for (let tx = 0; tx < t.kolom; tx++) {
        const idx = ty * t.kolom + tx
        const v = t.tinggi[idx]!
        ctx.fillStyle =
          (t.jembatan[idx] ?? 0) > 0 ? '#b5824c'
          : v === TINGGI.air ? '#245363'
          : t.ramp[idx] === 1 ? '#c2ad70'
          : v === TINGGI.plateau ? '#7f9e86'
          : '#5f8a4e'
        ctx.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy))
      }
    }

    // Emas di tengah
    ctx.fillStyle = '#ffd86b'
    ctx.beginPath()
    ctx.arc(titik.plateauPusat.tx * sx, titik.plateauPusat.ty * sy, 4, 0, Math.PI * 2)
    ctx.fill()

    // Penanda start tiap slot pemain
    for (let i = 0; i < titik.basis.length && i < this.slot.length; i++) {
      const s = this.slot[i]!
      if (s.jenis === 'kosong') continue
      const b = titik.basis[i]!
      const px = b.tx * sx
      const py = b.ty * sy
      ctx.fillStyle = WARNA_TIM[s.tim].utama
      ctx.beginPath()
      ctx.arc(px, py, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1b120b'
      ctx.lineWidth = 1.6
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = "700 9px 'Pixelify Sans', sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), px, py + 0.5)
    }
  }

  private resetStatusRoom(): void {
    this.diDalamRoom = false
    this.peranLan = null
    this.timLanSaya = null
    this.slot = buatSlotDefault(this.petaDipilih, this.nama, this.hero)
    this.segarkanSemuaUi()
  }

  setAlamat(url: string): void {
    this.alamat.textContent = `Alamat LAN: ${url}`
  }

  setModeSentuh(mode: ModeSentuh): void {
    for (const b of Array.from(this.wadahModeSentuh.children) as HTMLElement[]) {
      if (!b.dataset['modeSentuh']) continue
      b.style.outline = b.dataset['modeSentuh'] === mode ? '2px solid #ffd86b' : 'none'
    }
  }

  /** Mode web statis (GitHub Pages): Solo/Skirmish 2–6P vs AI aktif penuh, LAN nonaktif rapi tanpa error WS. */
  setModeStatis(catatan?: string): void {
    this.modeStatis = true
    this.alamat.textContent =
      catatan ?? 'Mode Web Statis (GitHub Pages) — Skirmish 2–6 Pemain vs AI aktif! LAN aktif saat dijalankan lewat server lokal (npm run dev).'
    this.tombolBuat.disabled = true
    this.tombolGabung.disabled = true
    this.inputKode.disabled = true
    this.tombolMulaiLan.disabled = true
    this.daftarRoom.textContent = ''
    this.daftarRoom.append(el('span', 'cip', 'LAN Wi-Fi aktif saat dijalankan dari server lokal (npm run dev).'))
  }

  setDaftarRoom(daftar: readonly RoomLan[]): void {
    this.daftarRoom.textContent = ''
    if (daftar.length === 0) {
      this.daftarRoom.append(el('span', 'cip', 'Belum ada room LAN aktif. Klik "Buat Room (Host)".'))
      return
    }
    for (const r of daftar) {
      const maks = r.maksPemain ?? 2
      const namaPeta = r.peta ? INFO_PETA[r.peta].nama.split(' ')[0] : ''
      const b = el('button', 'btn-kecil', `[${r.kode}] ${r.hostNama} (${r.jumlah}/${maks}${namaPeta ? ` · ${namaPeta}` : ''})`)
      b.type = 'button'
      b.addEventListener('click', () => this.aksi.gabungRoom(r.kode, this.nama, this.hero))
      this.daftarRoom.append(b)
    }
  }

  terimaRoomLan(kode: string, peran: 'host' | 'tamu', timSaya: TimPemain, ringkas: RoomLan): void {
    this.diDalamRoom = true
    this.peranLan = peran
    this.timLanSaya = timSaya
    if (ringkas.peta) this.petaDipilih = ringkas.peta
    if (ringkas.goldAwal !== undefined) this.goldAwal = ringkas.goldAwal
    if (ringkas.slot && ringkas.slot.length > 0) {
      this.slot = ringkas.slot.map((s) => ({
        indeks: s.indeks,
        tim: s.tim,
        jenis: s.jenis,
        aliansi: s.aliansi,
        hero: s.hero,
        kesulitanAi: s.kesulitanAi,
        nama: s.nama,
      }))
    }
    const terisi = ringkas.slot?.filter((s) => s.terisi) ?? []
    const aliansi = new Set(terisi.map((s) => s.aliansi))
    const siap = terisi.length >= 2 && aliansi.size >= 2
    const ket = `Room ${kode} (${peran === 'host' ? 'Host' : 'Tamu'} · ${WARNA_TIM[timSaya].nama}) — ${ringkas.jumlah}/${ringkas.maksPemain ?? 2} aktif`
    this.setStatusRoom(ket, siap && peran === 'host', true)
    this.segarkanSemuaUi()
  }

  setStatusRoom(teks: string, bisaMulai: boolean, diDalamRoom: boolean): void {
    this.statusRoom.textContent = teks
    this.tombolMulaiLan.disabled = !bisaMulai
    this.tombolKeluar.style.display = diDalamRoom ? '' : 'none'
    if (!diDalamRoom && this.diDalamRoom) {
      this.resetStatusRoom()
    }
  }

  getKonfig(): KonfigMatch {
    return {
      peta: this.petaDipilih,
      goldAwal: this.goldAwal,
      slot: this.slot.map((s) => ({ ...s })),
    }
  }

  get nama(): string {
    return this.inputNama.value.trim() || 'Komandan'
  }

  get hero(): PeranHeroAset {
    return (this.slot[0]?.hero ?? 'king') as PeranHeroAset
  }

  tampil(tampilkan: boolean): void {
    this.akar.style.display = tampilkan ? '' : 'none'
  }

  void(): void {
    void this.basis
  }
}
