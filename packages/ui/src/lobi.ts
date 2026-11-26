import { HERO_BLUE, type PeranHeroAset } from '@hftf/aset'
import {
  GOLD_AWAL_BAKU, GOLD_AWAL_MAKS, GOLD_AWAL_MIN, INFO_PETA, JENIS_PETA, KESULITAN_AI, LABEL_KESULITAN,
  PRESET_GOLD, TIM_PEMAIN, TINGGI, WARNA_TIM, buatSlotDefault, jepitGoldAwal,
  type HeroId, type JenisPeta, type JenisSlot, type KesulitanAi, type KonfigMatch, type KonfigSlot, type TimPemain,
} from '@hftf/shared'
import { UNIT, buatRng, buatTerrain, type Terrain, type TitikPenting } from '@hftf/sim'
import type { ModeSentuh } from './menu.js'
import { urlAset } from './sembilan.js'

export type LayarLobi = 'pilih' | 'ai' | 'wifi' | 'room'

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
  jumlahManusia?: number
  slotTerbuka?: number
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
  ubahNama?(nama: string): void
  gabungRoom(kode: string, nama: string, hero: PeranHeroAset): void
  mulaiLan(): void
  keluarRoom(): void
  salinLinkRoom?(kode: string): void
  ubahModeSentuh?(mode: ModeSentuh): void
  layarPenuh?(): void
}

interface SlotLobi extends KonfigSlot {
  terisi: boolean
}

const DAFTAR_HERO: readonly { id: HeroId; label: string }[] = [
  { id: 'king', label: 'Aldric (Raja)' },
  { id: 'berserker', label: 'Kael (Kapak)' },
  { id: 'knight', label: 'Valen (Kuda)' },
  { id: 'champion', label: 'Torin (Perisai)' },
]

const HERO_URUT: readonly HeroId[] = ['king', 'champion', 'knight', 'berserker', 'champion', 'knight']

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

function buatSlotAiLobi(peta: JenisPeta, nama: string, hero: HeroId): SlotLobi[] {
  return buatSlotDefault(peta, nama, hero).map((s) => ({
    ...s,
    terisi: s.jenis !== 'kosong',
  }))
}

function buatSlotLanTerbuka(peta: JenisPeta, namaHost: string, heroHost: HeroId): SlotLobi[] {
  const info = INFO_PETA[peta]
  return info.warnaDefault.map((tim, i) => ({
    indeks: i,
    tim,
    jenis: 'manusia',
    aliansi: i + 1,
    hero: i === 0 ? heroHost : HERO_URUT[i % HERO_URUT.length]!,
    kesulitanAi: 'medium',
    nama: i === 0 ? namaHost : 'Terbuka (LAN)',
    terisi: i === 0,
  }))
}

function hitungSlotTerbukaRoom(r: RoomLan): number {
  if (typeof r.slotTerbuka === 'number') return r.slotTerbuka
  if (r.slot && r.slot.length > 0) {
    return r.slot.filter((s) => s.indeks > 0 && s.jenis === 'manusia' && !s.terisi).length
  }
  return Math.max(0, (r.maksPemain ?? 2) - r.jumlah)
}

export class Lobi {
  readonly akar: HTMLElement

  // Header bersama
  private tombolKembali: HTMLButtonElement
  private judulUtama: HTMLElement
  private subJudul: HTMLElement
  private inputNama: HTMLInputElement
  private wadahModeSentuh: HTMLElement

  // 3 wadah layar: Pilih Mode | Hub Wi-Fi | Setup Pertempuran (AI / Ruang Room)
  private layarPilihEl: HTMLElement
  private layarWifiEl: HTMLElement
  private layarSetupEl: HTMLElement

  // Elemen layar Pilih Mode
  private btnPilihAi: HTMLButtonElement
  private btnPilihWifi: HTMLButtonElement
  private lencanaWifi: HTMLElement
  private statusWifiMenu: HTMLElement

  // Elemen layar Hub Wi-Fi (Buat Room vs Gabung Room)
  private alamatEl: HTMLElement
  private badgeKoneksiEl: HTMLElement
  private wifiPetaListEl: HTMLElement
  private wifiPratinjauKanvas: HTMLCanvasElement
  private wifiPratinjauInfo: HTMLElement
  private wifiGoldPresetEl: HTMLElement
  private wifiGoldInput: HTMLInputElement
  private tombolBuat: HTMLButtonElement
  private inputKode: HTMLInputElement
  private tombolGabung: HTMLButtonElement
  private badgeJumlahRoom: HTMLElement
  private daftarRoomEl: HTMLElement
  private wifiGalatEl: HTMLElement

  // Elemen layar Setup (AI Skirmish & Ruang Tunggu Room Wi-Fi)
  private roomBannerEl: HTMLElement
  private roomKodeBesarEl: HTMLElement
  private roomInfoPeranEl: HTMLElement
  private tombolSalinLink: HTMLButtonElement
  private tombolKeluarBanner: HTMLButtonElement
  private judulTabelSlot: HTMLElement
  private slotTabel: HTMLElement
  private presetAliansiEl: HTMLElement
  private petaListEl: HTMLElement
  private pratinjauKanvas: HTMLCanvasElement
  private pratinjauKet: HTMLElement
  private goldPresetEl: HTMLElement
  private goldInput: HTMLInputElement
  private tombolMulaiSolo: HTMLButtonElement
  private tombolMulaiLan: HTMLButtonElement
  private boxTungguTamu: HTMLElement
  private statusSetupEl: HTMLElement

  // State internal
  private layar: LayarLobi = 'pilih'
  private petaDipilih: JenisPeta = 'klasik2'
  private goldAwal = GOLD_AWAL_BAKU
  private slot: SlotLobi[] = buatSlotAiLobi('klasik2', 'Komandan', 'king')
  private diDalamRoom = false
  private kodeRoomAktif = ''
  private peranLan: 'host' | 'tamu' | null = null
  private timLanSaya: TimPemain | null = null
  private modeStatis = false
  private modeJaringan: 'lan' | 'p2p' = 'lan'
  private lanTersambung = false
  private sedangGabung = false
  private alamatLanTeks = '—'
  private roomTersedia: RoomLan[] = []
  private cachePeta = new Map<JenisPeta, { terrain: Terrain; titik: TitikPenting }>()

  constructor(private basis: string, private aksi: AksiLobi) {
    this.akar = el('div', 'hamparan')
    const kotak = el('div', 'kotak kotak-lobi')

    // === HEADER BERSAMA ===
    const kepala = el('div', 'lobi-kepala')
    const kiriHead = el('div', 'lobi-judul-baris')
    this.tombolKembali = el('button', 'btn-kembali', '← Kembali')
    this.tombolKembali.type = 'button'
    this.tombolKembali.style.display = 'none'
    this.tombolKembali.addEventListener('click', () => this.kembali())

    const teksHead = el('div')
    this.judulUtama = el('h1', undefined, 'Tiny Swords: Warcraft RTS')
    this.subJudul = el('p', undefined, 'Pilih mode permainan: Main vs AI (Skirmish) atau Multiplayer Wi-Fi / LAN (2–6 Pemain)')
    teksHead.append(this.judulUtama, this.subJudul)
    kiriHead.append(this.tombolKembali, teksHead)

    const alat = el('div', 'lobi-alat')
    this.inputNama = el('input', 'lobi-input')
    this.inputNama.value = 'Komandan'
    this.inputNama.maxLength = 16
    this.inputNama.style.width = '126px'
    this.inputNama.addEventListener('input', () => {
      const nama = this.nama
      if (!this.diDalamRoom && this.slot[0]) {
        this.slot[0].nama = nama
      }
      this.aksi.ubahNama?.(nama)
    })
    alat.append(el('label', undefined, 'Nama:'), this.inputNama)

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

    // === LAYAR 1: PILIH MODE (MAIN vs AI / MAIN WI-FI LAN) ===
    this.layarPilihEl = el('div')
    const gridMode = el('div', 'mode-pilihan-grid')

    // Kartu 1: Main vs AI
    const kartuAi = el('div', 'mode-kartu')
    const atasAi = el('div', 'mode-kartu-atas')
    atasAi.append(el('span', 'mode-ikon', '⚔️'), el('span', 'mode-lencana', 'OFFLINE · 2–6 PEMAIN'))
    const daftarAi = el('ul', 'mode-daftar')
    daftarAi.append(
      el('li', undefined, '3 Peta: Lembah Klasik (2P), Pulau Salib (4P), Kepulauan Bintang (6P)'),
      el('li', undefined, '4 Tingkat AI: Gampang, Medium, Susah, Extreme'),
      el('li', undefined, 'Preset Aliansi FFA / 2v2 / 3v3 / 2v2v2 & Custom Gold Awal'),
    )
    const statusAiMenu = el('div', 'mode-status-bar', '● Siap dimainkan kapan saja — cocok untuk solo & latihan strategi')
    this.btnPilihAi = el('button', 'tombol-besar cta-mulai', '⚔ MAIN vs AI (SKIRMISH)')
    this.btnPilihAi.type = 'button'
    this.btnPilihAi.dataset['pilihMode'] = 'ai'
    this.btnPilihAi.addEventListener('click', () => this.bukaLayar('ai'))
    const isiAi = el('div')
    isiAi.append(atasAi, el('h2', undefined, 'Main vs AI (Skirmish)'), daftarAi)
    const bawahAi = el('div', 'lobi-kolom')
    bawahAi.append(statusAiMenu, this.btnPilihAi)
    kartuAi.append(isiAi, bawahAi)

    // Kartu 2: Main Wi-Fi / LAN
    const kartuWifi = el('div', 'mode-kartu')
    const atasWifi = el('div', 'mode-kartu-atas')
    this.lencanaWifi = el('span', 'mode-lencana wifi', 'MULTIPLAYER · 2–6 HP/PC')
    atasWifi.append(el('span', 'mode-ikon', '📶'), this.lencanaWifi)
    const daftarWifi = el('ul', 'mode-daftar')
    daftarWifi.append(
      el('li', undefined, 'Buat Room (Host): semua slot otomatis terbuka untuk teman Wi-Fi'),
      el('li', undefined, 'Gabung Room (Tamu): masukkan Kode 5 huruf atau tap daftar Room aktif'),
      el('li', undefined, 'Bisa campur Pemain + AI, ganti Warna, Aliansi, & Hero bersama'),
    )
    this.statusWifiMenu = el('div', 'mode-status-bar', '○ Menghubungkan ke server Wi-Fi LAN…')
    this.btnPilihWifi = el('button', 'tombol-besar cta-mulai merah', '📶 MAIN WI-FI / LAN')
    this.btnPilihWifi.type = 'button'
    this.btnPilihWifi.dataset['pilihMode'] = 'wifi'
    this.btnPilihWifi.addEventListener('click', () => {
      if (this.modeStatis) return
      this.bukaLayar('wifi')
    })
    const isiWifi = el('div')
    isiWifi.append(atasWifi, el('h2', undefined, 'Main Wi-Fi / LAN'), daftarWifi)
    const bawahWifi = el('div', 'lobi-kolom')
    bawahWifi.append(this.statusWifiMenu, this.btnPilihWifi)
    kartuWifi.append(isiWifi, bawahWifi)

    gridMode.append(kartuAi, kartuWifi)
    this.layarPilihEl.append(gridMode)
    kotak.append(this.layarPilihEl)

    // === LAYAR 2: HUB WI-FI / LAN (BUAT ROOM vs GABUNG ROOM) ===
    this.layarWifiEl = el('div')
    const infoWifiBar = el('div', 'wifi-info-bar')
    this.alamatEl = el('span', undefined, 'Alamat LAN: —')
    this.badgeKoneksiEl = el('span', 'cip', '○ Menyambung ke server Wi-Fi…')
    infoWifiBar.append(this.alamatEl, this.badgeKoneksiEl)
    this.layarWifiEl.append(infoWifiBar)

    const wifiGrid = el('div', 'wifi-grid')

    // Panel Kiri Wi-Fi: Buat Room (Host)
    const panelBuat = el('div', 'wifi-panel')
    panelBuat.append(
      el('h2', undefined, '👑 1. Buat Room Baru (Host)'),
      el('p', undefined, 'Pilih peta & gold awal. Semua slot lain otomatis Terbuka untuk teman Wi-Fi (AI bisa ditambah di dalam room).'),
    )
    this.wifiPetaListEl = el('div', 'peta-pilihan')
    for (const id of JENIS_PETA) {
      const info = INFO_PETA[id]
      const btn = el('button', 'peta-btn')
      btn.type = 'button'
      btn.dataset['wifiPeta'] = id
      btn.append(el('span', undefined, info.nama), el('span', 'peta-sub', `Maks ${info.maksPemain}P`))
      btn.addEventListener('click', () => this.ubahPeta(id))
      this.wifiPetaListEl.append(btn)
    }
    panelBuat.append(this.wifiPetaListEl)

    const wifiPrevBox = el('div', 'wifi-pratinjau')
    this.wifiPratinjauKanvas = el('canvas')
    this.wifiPratinjauKanvas.width = 196
    this.wifiPratinjauKanvas.height = 98
    this.wifiPratinjauInfo = el('div', 'wifi-pratinjau-info', INFO_PETA[this.petaDipilih].ringkas)
    wifiPrevBox.append(this.wifiPratinjauKanvas, this.wifiPratinjauInfo)
    panelBuat.append(wifiPrevBox)

    const wifiGoldBaris = el('div', 'gold-baris')
    wifiGoldBaris.append(el('span', 'slot-nama', 'Gold Awal:'))
    this.wifiGoldPresetEl = el('div', 'lobi-preset-baris')
    for (const nilai of PRESET_GOLD) {
      const b = el('button', 'btn-kecil', `${nilai}`)
      b.type = 'button'
      b.dataset['wifiGold'] = String(nilai)
      b.addEventListener('click', () => this.setGoldAwal(nilai))
      this.wifiGoldPresetEl.append(b)
    }
    this.wifiGoldInput = el('input', 'gold-input')
    this.wifiGoldInput.type = 'number'
    this.wifiGoldInput.min = String(GOLD_AWAL_MIN)
    this.wifiGoldInput.max = String(GOLD_AWAL_MAKS)
    this.wifiGoldInput.step = '50'
    this.wifiGoldInput.value = String(this.goldAwal)
    this.wifiGoldInput.addEventListener('change', () => this.setGoldAwal(Number(this.wifiGoldInput.value)))
    wifiGoldBaris.append(this.wifiGoldPresetEl, this.wifiGoldInput)
    panelBuat.append(wifiGoldBaris)

    this.tombolBuat = el('button', 'tombol-besar cta-mulai', '👑 BUAT ROOM WI-FI (HOST)')
    this.tombolBuat.type = 'button'
    this.tombolBuat.addEventListener('click', () => {
      if (this.modeStatis) return
      this.wifiGalatEl.textContent = ''
      const slotTerbuka = buatSlotLanTerbuka(this.petaDipilih, this.nama, this.hero)
      const konfig: KonfigMatch = {
        peta: this.petaDipilih,
        goldAwal: this.goldAwal,
        slot: slotTerbuka.map(({ terisi: _t, ...s }) => s),
      }
      this.aksi.ubahNama?.(this.nama)
      if (this.aksi.buatRoomKonfig) this.aksi.buatRoomKonfig(this.nama, konfig)
      else this.aksi.buatRoom(this.nama, this.hero)
    })
    panelBuat.append(this.tombolBuat)

    // Panel Kanan Wi-Fi: Gabung Room (Kode atau Tap Daftar Room di Bawah)
    const panelGabung = el('div', 'wifi-panel')
    panelGabung.append(
      el('h2', undefined, '🚪 2. Gabung Room Teman (Tamu)'),
      el('p', undefined, 'Masukkan Kode Room 5 huruf dari teman, atau langsung tap room yang muncul di bawah.'),
    )

    const barisKode = el('div', 'wifi-kode-baris')
    this.inputKode = el('input', 'wifi-kode-input')
    this.inputKode.placeholder = 'KODE ROOM'
    this.inputKode.maxLength = 5
    this.inputKode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.gabungKeRoom(this.inputKode.value)
    })
    this.tombolGabung = el('button', 'tombol-besar merah', 'Gabung Kode')
    this.tombolGabung.type = 'button'
    this.tombolGabung.addEventListener('click', () => this.gabungKeRoom(this.inputKode.value))
    barisKode.append(this.inputKode, this.tombolGabung)
    panelGabung.append(barisKode)

    const headDaftar = el('div', 'lobi-subjudul')
    headDaftar.style.marginTop = '4px'
    headDaftar.style.marginBottom = '2px'
    this.badgeJumlahRoom = el('span', 'cip', '0 Room Aktif')
    headDaftar.append(el('h2', undefined, 'Daftar Room Wi-Fi Aktif'), this.badgeJumlahRoom)
    panelGabung.append(headDaftar)

    this.daftarRoomEl = el('div', 'wifi-room-list')
    this.wifiGalatEl = el('div', 'lobi-galat', '')
    panelGabung.append(this.daftarRoomEl, this.wifiGalatEl)

    wifiGrid.append(panelBuat, panelGabung)
    this.layarWifiEl.append(wifiGrid)
    kotak.append(this.layarWifiEl)

    // === LAYAR 3: SETUP PERTEMPURAN WARCRAFT III (SKIRMISH AI & RUANG TUNGGU ROOM WI-FI) ===
    this.layarSetupEl = el('div')

    // Banner Room Wi-Fi (hanya tampil saat layar === 'room')
    this.roomBannerEl = el('div', 'room-banner')
    const bannerKiri = el('div', 'room-banner-kiri')
    this.roomKodeBesarEl = el('span', 'room-kode-besar', 'KODE: -----')
    this.roomInfoPeranEl = el('span', undefined, '')
    bannerKiri.append(this.roomKodeBesarEl, this.roomInfoPeranEl)
    const bannerKanan = el('div', 'baris')
    bannerKanan.style.marginTop = '0'
    this.tombolSalinLink = el('button', 'btn-kembali', '📋 Salin Link')
    this.tombolSalinLink.type = 'button'
    this.tombolSalinLink.addEventListener('click', () => {
      if (this.kodeRoomAktif) this.aksi.salinLinkRoom?.(this.kodeRoomAktif)
    })
    this.tombolKeluarBanner = el('button', 'tombol-besar merah', 'Keluar Room')
    this.tombolKeluarBanner.type = 'button'
    this.tombolKeluarBanner.addEventListener('click', () => this.keluarRoomOlehPengguna())
    bannerKanan.append(this.tombolSalinLink, this.tombolKeluarBanner)
    this.roomBannerEl.append(bannerKiri, bannerKanan)
    this.layarSetupEl.append(this.roomBannerEl)

    // Grid 2 kolom gaya Warcraft III
    const grid = el('div', 'lobi-grid')

    // Kolom Kiri: Tabel 2–6 Slot Pemain
    const kolKiri = el('div', 'lobi-kolom')
    const boxSlot = el('div', 'lobi-subkotak')
    const subHead = el('div', 'lobi-subjudul')
    this.judulTabelSlot = el('h2', undefined, 'Daftar Pemain & AI (Maks 6 Pemain)')
    this.presetAliansiEl = el('div', 'lobi-preset-baris')
    subHead.append(this.judulTabelSlot, this.presetAliansiEl)
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

    this.statusSetupEl = el('div', 'lobi-galat', '')
    kolKiri.append(this.statusSetupEl)

    // Kolom Kanan: Pilih Peta + Pratinjau + Gold Awal + Tombol Mulai
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
      btn.append(el('span', undefined, info.nama), el('span', 'peta-sub', `Maks ${info.maksPemain}P`))
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
    this.goldInput.addEventListener('change', () => this.setGoldAwal(Number(this.goldInput.value)))
    barisGold.append(this.goldPresetEl, this.goldInput)
    boxGold.append(barisGold)
    kolKanan.append(boxGold)

    // Tombol CTA Solo / Skirmish
    this.tombolMulaiSolo = el('button', 'tombol-besar cta-mulai', '⚔ MULAI SOLO / SKIRMISH')
    this.tombolMulaiSolo.type = 'button'
    this.tombolMulaiSolo.addEventListener('click', () => this.mulaiSkirmish())

    // Tombol CTA Host LAN
    this.tombolMulaiLan = el('button', 'tombol-besar cta-mulai', '⚔ MULAI PERANG WI-FI!')
    this.tombolMulaiLan.type = 'button'
    this.tombolMulaiLan.disabled = true
    this.tombolMulaiLan.addEventListener('click', () => this.aksi.mulaiLan())

    // Kotak info untuk Tamu LAN
    this.boxTungguTamu = el(
      'div',
      'room-tunggu-box',
      '⏳ Menunggu Host memulai pertandingan… Anda bebas pilih Warna, Aliansi, & Hero pada slot Anda di sebelah kiri.',
    )

    kolKanan.append(this.tombolMulaiSolo, this.tombolMulaiLan, this.boxTungguTamu)

    grid.append(kolKiri, kolKanan)
    this.layarSetupEl.append(grid)
    kotak.append(this.layarSetupEl)
    this.akar.append(kotak)

    this.setModeSentuh('tapPintar')
    this.renderDaftarRoom()
    this.segarkanSemuaUi()
  }

  get layarAktif(): LayarLobi {
    return this.layar
  }

  bukaLayar(tujuan: LayarLobi): void {
    if (tujuan === 'wifi' && this.modeStatis) return
    this.layar = tujuan
    this.wifiGalatEl.textContent = ''
    this.statusSetupEl.textContent = ''

    if (tujuan === 'ai' && !this.diDalamRoom) {
      // Pastikan slot Skirmish memakai AI (bukan bekas 'Terbuka (LAN)')
      if (this.slot.some((s, i) => i > 0 && s.jenis === 'manusia')) {
        this.slot = buatSlotAiLobi(this.petaDipilih, this.nama, this.hero)
      }
    }
    this.segarkanSemuaUi()
  }

  private kembali(): void {
    if (this.layar === 'room') {
      this.keluarRoomOlehPengguna()
      return
    }
    this.bukaLayar('pilih')
  }

  private keluarRoomOlehPengguna(): void {
    this.resetStatusRoom()
    this.aksi.keluarRoom()
    this.bukaLayar(this.modeStatis ? 'pilih' : 'wifi')
  }

  private gabungKeRoom(kodeMentah: string): void {
    if (this.modeStatis || this.sedangGabung) return
    const kode = kodeMentah.trim().toUpperCase()
    if (!kode) {
      this.wifiGalatEl.textContent = 'Masukkan kode room 5 huruf dulu, atau tap salah satu room di bawah.'
      return
    }
    this.wifiGalatEl.textContent = `Menghubungkan ke room ${kode}…`
    this.sedangGabung = true
    this.renderDaftarRoom()
    this.tombolGabung.disabled = true
    this.aksi.ubahNama?.(this.nama)
    this.aksi.gabungRoom(kode, this.nama, this.hero)
  }

  private terbilangHostBebas(): boolean {
    return !this.diDalamRoom || this.peranLan === 'host'
  }

  private ubahPeta(peta: JenisPeta): void {
    if (!this.terbilangHostBebas()) return
    const maks = INFO_PETA[peta].maksPemain
    const bawaan = this.diDalamRoom
      ? buatSlotLanTerbuka(peta, this.nama, this.hero)
      : buatSlotAiLobi(peta, this.nama, this.hero)
    const baru: SlotLobi[] = []
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
      this.statusSetupEl.textContent = 'Minimal pilih 2 kerajaan aktif (Anda + minimal 1 AI).'
      return
    }
    if (new Set(aktif.map((s) => s.aliansi)).size < 2) {
      this.statusSetupEl.textContent = 'Minimal harus ada 2 Tim/Aliansi yang berbeda agar bisa bertempur.'
      return
    }
    this.statusSetupEl.textContent = ''
    if (this.aksi.mulaiMatch) {
      this.aksi.mulaiMatch(konfig)
      return
    }
    const aiPertama = aktif.find((s) => s.jenis === 'ai')
    const legacyKes = aiPertama && (aiPertama.kesulitanAi === 'susah' || aiPertama.kesulitanAi === 'extreme') ? 'sulit' : 'normal'
    this.aksi.mulaiSolo(this.hero, legacyKes)
  }

  private segarkanHeader(): void {
    this.tombolKembali.style.display = this.layar === 'pilih' ? 'none' : ''
    this.tombolKembali.textContent = this.layar === 'room' ? '← Keluar Room' : '← Kembali'

    const modeLabel = this.modeJaringan === 'p2p' ? 'Online P2P / Wi-Fi' : 'Wi-Fi / LAN'
    if (this.layar === 'pilih') {
      this.judulUtama.textContent = 'Tiny Swords: Warcraft RTS'
      this.subJudul.textContent = `Pilih mode permainan: Main vs AI (Skirmish) atau Multiplayer ${modeLabel} (2–6 Pemain)`
    } else if (this.layar === 'ai') {
      this.judulUtama.textContent = '⚔ Main vs AI (Skirmish)'
      this.subJudul.textContent = 'Atur Peta (2–6P), Tingkat AI (Gampang–Extreme), Aliansi, Hero, & Custom Gold Awal'
    } else if (this.layar === 'wifi') {
      this.judulUtama.textContent = `📶 Main ${modeLabel} (2–6 Pemain)`
      this.subJudul.textContent = 'Pilih Buat Room (Host) atau Gabung Room teman lewat Kode / Daftar Room di bawah'
    } else {
      this.judulUtama.textContent = `📶 Ruang Tunggu Room ${this.kodeRoomAktif}`
      this.subJudul.textContent = this.peranLan === 'host'
        ? 'Anda adalah Host — teman bisa langsung masuk lewat Kode, Link, atau Daftar Room; AI bisa ditambah di slot terbuka'
        : 'Anda adalah Tamu — pilih Warna, Aliansi, & Hero Anda sambil menunggu Host memulai'
    }
  }

  private segarkanStatusWifi(): void {
    if (this.modeStatis) {
      this.lencanaWifi.className = 'mode-lencana nonaktif'
      this.lencanaWifi.textContent = 'KHUSUS SERVER LOKAL'
      this.statusWifiMenu.textContent =
        'Mode Web Statis (GitHub Pages) — Skirmish 2–6 Pemain vs AI aktif penuh! LAN Wi-Fi aktif lewat server lokal (npm run dev).'
      this.btnPilihWifi.disabled = true
      this.tombolBuat.disabled = true
      this.tombolGabung.disabled = true
      this.inputKode.disabled = true
      return
    }
    this.lencanaWifi.className = 'mode-lencana wifi'
    this.lencanaWifi.textContent = this.modeJaringan === 'p2p' ? 'ONLINE P2P · 2–6 HP/PC' : 'LAN WI-FI · 2–6 HP/PC'
    this.btnPilihWifi.textContent = this.modeJaringan === 'p2p'
      ? '🌐 MAIN ONLINE / WI-FI (P2P)'
      : '📶 MAIN WI-FI / LAN'
    this.btnPilihWifi.disabled = false
    this.tombolBuat.disabled = false
    this.tombolGabung.disabled = this.sedangGabung
    this.inputKode.disabled = false

    const jmlBuka = this.roomTersedia.filter((r) => hitungSlotTerbukaRoom(r) > 0).length
    if (this.modeJaringan === 'p2p') {
      if (this.lanTersambung) {
        this.badgeKoneksiEl.textContent = '● Terhubung ke Jaringan Online P2P'
        this.statusWifiMenu.textContent = jmlBuka > 0
          ? `● Online P2P Siap (tanpa server lokal) · ${jmlBuka} room terbuka menunggu pemain`
          : '● Online P2P Siap (tanpa server lokal) · Cukup buka link GitHub ini di HP/PC!'
      } else {
        this.badgeKoneksiEl.textContent = '○ Menghubungkan ke Jaringan Online P2P…'
        this.statusWifiMenu.textContent = '○ Menghubungkan ke jaringan Online P2P (WebRTC)…'
      }
      return
    }
    if (this.lanTersambung) {
      this.badgeKoneksiEl.textContent = '● Terhubung ke Server Wi-Fi'
      this.statusWifiMenu.textContent = jmlBuka > 0
        ? `● Server Wi-Fi Siap · ${jmlBuka} room terbuka menunggu pemain (${this.alamatLanTeks})`
        : `● Server Wi-Fi Siap · Klik untuk Buat Room atau Gabung (${this.alamatLanTeks})`
    } else {
      this.badgeKoneksiEl.textContent = '○ Menghubungkan ke Server Wi-Fi…'
      this.statusWifiMenu.textContent = '○ Menghubungkan ke server Wi-Fi LAN…'
    }
  }

  private segarkanSemuaUi(): void {
    this.segarkanHeader()
    this.segarkanStatusWifi()

    this.layarPilihEl.style.display = this.layar === 'pilih' ? '' : 'none'
    this.layarWifiEl.style.display = this.layar === 'wifi' ? '' : 'none'
    this.layarSetupEl.style.display = this.layar === 'ai' || this.layar === 'room' ? '' : 'none'

    const modeRoom = this.layar === 'room' && this.diDalamRoom
    this.roomBannerEl.style.display = modeRoom ? '' : 'none'
    this.judulTabelSlot.textContent = modeRoom
      ? 'Daftar Pemain Room Wi-Fi (Maks 6 Pemain)'
      : 'Daftar Pemain & AI (Maks 6 Pemain)'

    this.tombolMulaiSolo.style.display = this.layar === 'ai' ? '' : 'none'
    this.tombolMulaiLan.style.display = modeRoom && this.peranLan === 'host' ? '' : 'none'
    this.boxTungguTamu.style.display = modeRoom && this.peranLan === 'tamu' ? '' : 'none'

    const hostBebas = this.terbilangHostBebas()
    this.goldInput.disabled = !hostBebas
    for (const b of Array.from(this.petaListEl.children) as HTMLButtonElement[]) {
      const id = b.dataset['peta'] as JenisPeta
      b.classList.toggle('aktif', id === this.petaDipilih)
      b.disabled = !hostBebas
    }
    for (const b of Array.from(this.wifiPetaListEl.children) as HTMLButtonElement[]) {
      const id = b.dataset['wifiPeta'] as JenisPeta
      b.classList.toggle('aktif', id === this.petaDipilih)
    }

    this.pratinjauKet.textContent = INFO_PETA[this.petaDipilih].ringkas
    this.wifiPratinjauInfo.textContent = `${INFO_PETA[this.petaDipilih].nama} · ${INFO_PETA[this.petaDipilih].ringkas}`

    this.segarkanGoldUi()
    this.renderPresetAliansi()
    this.renderTabelSlot()
    this.gambarPratinjauKe(this.pratinjauKanvas, this.slot)
    this.gambarPratinjauKe(this.wifiPratinjauKanvas, buatSlotLanTerbuka(this.petaDipilih, this.nama, this.hero))
    this.tombolMulaiSolo.disabled = this.diDalamRoom
  }

  private segarkanGoldUi(): void {
    this.goldInput.value = String(this.goldAwal)
    this.wifiGoldInput.value = String(this.goldAwal)
    const hostBebas = this.terbilangHostBebas()
    for (const b of Array.from(this.goldPresetEl.children) as HTMLButtonElement[]) {
      b.classList.toggle('aktif', Number(b.dataset['gold']) === this.goldAwal)
      b.disabled = !hostBebas
    }
    for (const b of Array.from(this.wifiGoldPresetEl.children) as HTMLButtonElement[]) {
      b.classList.toggle('aktif', Number(b.dataset['wifiGold']) === this.goldAwal)
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
      const diisiManusia = i === 0 || (this.diDalamRoom && s.jenis === 'manusia' && s.terisi)
      if (diisiManusia) {
        const ikon = i === 0 && this.diDalamRoom ? '👑 ' : '👤 '
        const namaAsli = !this.diDalamRoom && i === 0 ? this.nama : s.nama
        const akhiran = this.diDalamRoom && milikSaya ? ' (Anda)' : ''
        row.append(el('span', 'slot-nama', `${ikon}${namaAsli}${akhiran}`))
      } else if (!hostBebas) {
        // Tampilan Tamu untuk slot non-manusia-terisi (read-only jelas)
        const teksSlot = s.jenis === 'manusia'
          ? '⏳ Terbuka (Menunggu Pemain Wi-Fi)'
          : s.jenis === 'ai'
            ? `🤖 ${LABEL_KESULITAN[s.kesulitanAi]}`
            : 'Kosong (Tutup)'
        row.append(el('span', 'slot-nama', teksSlot))
      } else {
        const selTipe = el('select', 'lobi-select')
        selTipe.dataset['roleSelect'] = String(i)
        const opsi: { val: string; teks: string }[] = []
        if (this.diDalamRoom) opsi.push({ val: 'manusia', teks: 'Terbuka (Pemain Wi-Fi)' })
        for (const k of KESULITAN_AI) opsi.push({ val: `ai:${k}`, teks: LABEL_KESULITAN[k] })
        opsi.push({ val: 'kosong', teks: 'Kosong (Tutup)' })

        for (const o of opsi) {
          const opt = el('option', undefined, o.teks)
          opt.value = o.val
          selTipe.append(opt)
        }
        selTipe.value = s.jenis === 'ai' ? `ai:${s.kesulitanAi}` : s.jenis
        selTipe.addEventListener('change', () => {
          const v = selTipe.value
          if (v === 'kosong') {
            s.jenis = 'kosong'
            s.nama = 'Kosong'
            s.terisi = false
          } else if (v === 'manusia') {
            s.jenis = 'manusia'
            s.nama = 'Terbuka (LAN)'
            s.terisi = false
          } else if (v.startsWith('ai:')) {
            s.jenis = 'ai'
            s.kesulitanAi = v.slice(3) as KesulitanAi
            s.nama = `AI ${WARNA_TIM[s.tim].nama}`
            s.terisi = true
          }
          this.renderTabelSlot()
          this.gambarPratinjauKe(this.pratinjauKanvas, this.slot)
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

  private renderDaftarRoom(): void {
    this.daftarRoomEl.textContent = ''
    this.badgeJumlahRoom.textContent = `${this.roomTersedia.length} Room Aktif`

    if (this.roomTersedia.length === 0) {
      this.daftarRoomEl.append(
        el('div', 'room-tunggu-box', 'Belum ada room Wi-Fi aktif di jaringan ini.\nMinta teman klik "Buat Room Wi-Fi", atau buat room sendiri di panel kiri.'),
      )
      return
    }

    for (const r of this.roomTersedia) {
      const maks = r.maksPemain ?? 2
      const terbuka = hitungSlotTerbukaRoom(r)
      const penuh = terbuka <= 0
      const namaPeta = r.peta ? INFO_PETA[r.peta].nama : 'Lembah Klasik (2P)'
      const gold = r.goldAwal ?? GOLD_AWAL_BAKU

      const kartu = el('button', 'wifi-room-kartu')
      kartu.type = 'button'
      kartu.dataset['roomKode'] = r.kode
      kartu.disabled = penuh || this.sedangGabung || this.modeStatis

      const atas = el('div', 'wifi-room-atas')
      const kiriAtas = el('div', 'baris')
      kiriAtas.style.marginTop = '0'
      kiriAtas.append(el('span', 'wifi-room-kode', r.kode), el('span', 'wifi-room-host', `👑 ${r.hostNama}`))
      const badge = el('span', penuh ? 'wifi-badge-penuh' : 'wifi-badge-buka', penuh ? 'PENUH' : `TERBUKA (${terbuka} slot)`)
      atas.append(kiriAtas, badge)

      const bawah = el('div', 'wifi-room-bawah')
      bawah.append(
        el('span', undefined, `${namaPeta} · Gold ${gold}`),
        el('span', undefined, `${r.jumlah}/${maks} aktif`),
      )
      kartu.append(atas, bawah)
      kartu.addEventListener('click', () => this.gabungKeRoom(r.kode))
      this.daftarRoomEl.append(kartu)
    }
  }

  private gambarPratinjauKe(kanvas: HTMLCanvasElement, daftarSlot: readonly SlotLobi[]): void {
    const ctx = kanvas.getContext('2d')
    if (!ctx) return

    let data = this.cachePeta.get(this.petaDipilih)
    if (!data) {
      data = buatTerrain(buatRng(42), this.petaDipilih)
      this.cachePeta.set(this.petaDipilih, data)
    }

    const { terrain: t, titik } = data
    const w = kanvas.width
    const h = kanvas.height
    const sx = w / t.kolom
    const sy = h / t.baris

    for (let ty = 0; ty < t.baris; ty++) {
      for (let tx = 0; tx < t.kolom; tx++) {
        const idx = ty * t.kolom + tx
        const v = t.tinggi[idx]!
        const bawahPlat = ty > 0 && v !== TINGGI.plateau && t.tinggi[(ty - 1) * t.kolom + tx] === TINGGI.plateau
        const bawahLaut = ty > 0 && v === TINGGI.air && t.tinggi[(ty - 1) * t.kolom + tx] !== TINGGI.air && (t.jembatan[(ty - 1) * t.kolom + tx] ?? 0) === 0
        ctx.fillStyle =
          (t.jembatan[idx] ?? 0) > 0 ? '#b87d45'
          : bawahLaut ? '#466c75'
          : v === TINGGI.air ? '#26697a'
          : (t.ramp[idx] ?? 0) > 0 ? '#dfd095'
          : bawahPlat ? '#53737a'
          : (t.jalan?.[idx] ?? 0) === 1 ? '#d4bd80'
          : v === TINGGI.plateau ? '#87b862'
          : '#62964c'
        ctx.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy))
      }
    }

    ctx.fillStyle = '#ffd86b'
    ctx.beginPath()
    ctx.arc(titik.plateauPusat.tx * sx, titik.plateauPusat.ty * sy, Math.max(3, w * 0.013), 0, Math.PI * 2)
    ctx.fill()

    const r = w < 220 ? 5 : 6.5
    for (let i = 0; i < titik.basis.length && i < daftarSlot.length; i++) {
      const s = daftarSlot[i]!
      if (s.jenis === 'kosong') continue
      const b = titik.basis[i]!
      const px = b.tx * sx
      const py = b.ty * sy
      ctx.fillStyle = WARNA_TIM[s.tim].utama
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1b120b'
      ctx.lineWidth = 1.4
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${w < 220 ? 8 : 9}px 'Pixelify Sans', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), px, py + 0.5)
    }
  }

  private resetStatusRoom(): void {
    this.diDalamRoom = false
    this.kodeRoomAktif = ''
    this.peranLan = null
    this.timLanSaya = null
    this.sedangGabung = false
    this.slot = buatSlotAiLobi(this.petaDipilih, this.nama, this.hero)
    this.segarkanSemuaUi()
  }

  setAlamat(url: string): void {
    this.modeJaringan = 'lan'
    this.alamatLanTeks = url
    this.alamatEl.textContent = `Alamat LAN: ${url} (Buka alamat ini di HP teman pada Wi-Fi yang sama)`
    this.segarkanStatusWifi()
  }

  /** Mode Online P2P WebRTC murni (GitHub Pages): 2–6 pemain tanpa server lokal di HP & Desktop. */
  setModeOnlineP2p(urlBerbagi?: string): void {
    this.modeStatis = false
    this.modeJaringan = 'p2p'
    this.alamatLanTeks = urlBerbagi ?? 'GitHub Pages P2P'
    this.alamatEl.textContent =
      'Mode Online P2P (Tanpa Server Lokal) — Cukup buka link yang sama di HP/Desktop (Wi-Fi maupun 4G/5G)!'
    this.segarkanSemuaUi()
    this.renderDaftarRoom()
  }

  /** Membuka layar Multiplayer dengan kode room terisi otomatis (mis. dari link ?room=XXXXX). */
  bukaDenganKodeRoom(kode: string): void {
    const bersih = kode.trim().toUpperCase().slice(0, 5)
    if (!bersih || this.modeStatis) return
    this.inputKode.value = bersih
    this.bukaLayar('wifi')
    this.wifiGalatEl.textContent = `Kode room ${bersih} terisi otomatis — ubah Nama jika perlu lalu klik "Gabung Kode".`
  }

  setStatusKoneksi(tersambung: boolean): void {
    this.lanTersambung = tersambung
    if (!tersambung) this.sedangGabung = false
    this.segarkanStatusWifi()
    this.renderDaftarRoom()
  }

  setModeSentuh(mode: ModeSentuh): void {
    for (const b of Array.from(this.wadahModeSentuh.children) as HTMLElement[]) {
      if (!b.dataset['modeSentuh']) continue
      b.style.outline = b.dataset['modeSentuh'] === mode ? '2px solid #ffd86b' : 'none'
    }
  }

  /** Mode web statis (GitHub Pages): Solo/Skirmish 2–6P vs AI aktif penuh, Wi-Fi LAN nonaktif rapi tanpa error WS. */
  setModeStatis(catatan?: string): void {
    this.modeStatis = true
    this.alamatLanTeks = 'Mode Statis'
    this.alamatEl.textContent =
      catatan ?? 'Mode Web Statis (GitHub Pages) — Skirmish 2–6 Pemain vs AI aktif! LAN aktif saat dijalankan lewat server lokal (npm run dev).'
    if (this.layar === 'wifi' || this.layar === 'room') this.layar = 'pilih'
    this.segarkanSemuaUi()
    this.renderDaftarRoom()
  }

  setDaftarRoom(daftar: readonly RoomLan[]): void {
    this.roomTersedia = [...daftar]
    this.renderDaftarRoom()
    this.segarkanStatusWifi()
  }

  terimaRoomLan(kode: string, peran: 'host' | 'tamu', timSaya: TimPemain, ringkas: RoomLan): void {
    this.diDalamRoom = true
    this.kodeRoomAktif = kode
    this.peranLan = peran
    this.timLanSaya = timSaya
    this.sedangGabung = false
    this.layar = 'room'
    this.wifiGalatEl.textContent = ''
    this.statusSetupEl.textContent = ''

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
        terisi: s.terisi,
      }))
    }

    const terisi = ringkas.slot?.filter((s) => s.terisi) ?? []
    const aliansi = new Set(terisi.map((s) => s.aliansi))
    const terbuka = hitungSlotTerbukaRoom(ringkas)
    const siap = terisi.length >= 2 && aliansi.size >= 2

    this.roomKodeBesarEl.textContent = `KODE: ${kode}`
    const peranTeks = peran === 'host' ? '👑 HOST' : '👤 TAMU'
    this.roomInfoPeranEl.textContent =
      `${peranTeks} · Warna ${WARNA_TIM[timSaya].nama} · ${ringkas.jumlah}/${ringkas.maksPemain ?? 2} siap · ${terbuka} slot Wi-Fi terbuka`

    this.tombolMulaiLan.disabled = !(siap && peran === 'host')
    if (peran === 'host' && !siap) {
      this.statusSetupEl.textContent = terisi.length < 2
        ? 'Menunggu minimal 1 teman bergabung lewat Wi-Fi, atau tambahkan AI pada slot terbuka.'
        : 'Minimal harus ada 2 Tim/Aliansi berbeda agar pertandingan bisa dimulai.'
    }

    this.segarkanSemuaUi()
  }

  keluarDariRoom(pesan?: string): void {
    this.resetStatusRoom()
    this.bukaLayar(this.modeStatis ? 'pilih' : 'wifi')
    if (pesan) this.wifiGalatEl.textContent = pesan
  }

  tampilkanGalatLan(pesan: string): void {
    this.sedangGabung = false
    this.tombolGabung.disabled = this.modeStatis
    this.renderDaftarRoom()
    if (this.layar === 'wifi') this.wifiGalatEl.textContent = pesan
    else if (this.layar === 'room') this.statusSetupEl.textContent = pesan
  }

  setStatusRoom(teks: string, bisaMulai: boolean, diDalamRoom: boolean): void {
    this.tombolMulaiLan.disabled = !bisaMulai
    if (!diDalamRoom && this.diDalamRoom) {
      this.resetStatusRoom()
      this.bukaLayar(this.modeStatis ? 'pilih' : 'wifi')
    }
    if (this.layar === 'wifi') this.wifiGalatEl.textContent = teks
    else if (this.layar === 'room') this.statusSetupEl.textContent = teks
  }

  getKonfig(): KonfigMatch {
    return {
      peta: this.petaDipilih,
      goldAwal: this.goldAwal,
      slot: this.slot.map(({ terisi: _t, ...s }) => ({ ...s })),
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
