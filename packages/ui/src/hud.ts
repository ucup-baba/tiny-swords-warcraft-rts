import { AVATAR, BANGUNAN_BLUE, HERO_BLUE, SUMBER } from '@hftf/aset'
import { WARNA_TIM, type Tim } from '@hftf/shared'
import {
  BANGUNAN, DETIK_TUMBUH_POHON, KAYU_POHON_BARU, NAMA_BAJU, NAMA_SERANGAN, REVIVE, RISET, SKILL, TINGKAT_MAKS, UNIT,
  UNIT_REGULER, URUTAN_BANGUN, ringkasCounter, risetDi, supplyMaks, supplyTerpakai,
  type Bangunan, type Dunia, type JenisRiset, type PeranUnit, type Unit,
} from '@hftf/sim'
import type { ModeSentuh } from './menu.js'
import { urlAset } from './sembilan.js'

export type Tab = 'bangun' | 'pasukan' | 'hero'
export type FilterUnit = 'semua' | 'pawn' | 'warrior' | 'archer' | 'lancer' | 'monk' | 'mage' | 'hero'
export type PerintahKartu = 'serang' | 'stop' | 'tahan' | 'skill'
export type KunciSumber = 'gold' | 'kayu' | 'daging' | 'supply'
export interface SumberInfo {
  jenis: 'pohon' | 'tunggul' | 'tambang' | 'domba' | 'daging'
  id: number
}

/**
 * Penyedia gambar kecil (crop bounding-box) untuk kartu produksi & ikon sumber.
 * `ui` tidak boleh mengimpor `render` (PRD §8.2), jadi client yang menyuntikkannya.
 */
export type PenyediaPotret = (peran: string) => string | null
export type PenyediaIkonSumber = (kunci: KunciSumber) => string | null

export interface AksiHud {
  pilihTab(t: Tab): void
  mulaiBangun(jenis: string): void
  latih(jenis: string): void
  batalLatih?(bangunanId: number, indeks: number): void
  riset?(bangunanId: number, jenis: JenisRiset): void
  bangkitkanHero(): void
  pilihFilterUnit?(filter: FilterUnit): void
  perintahUnit?(perintah: PerintahKartu): void
  fokusUnit?(unitId: number): void
  bukaMenu?(): void
  kembaliEditor?(): void
  layarPenuh?(): void
  toggleKotak?(): void
  lewatPutar?(): void
}

const IKON_SUMBER_ASAL = {
  gold: SUMBER.goldDiam,
  kayu: SUMBER.kayuDiam,
  daging: SUMBER.dagingDiam,
  supply: BANGUNAN_BLUE.house,
} as const

const URUTAN_FILTER: readonly { kunci: FilterUnit; label: string; peranPotret: string }[] = [
  { kunci: 'semua', label: 'Semua', peranPotret: 'warrior' },
  { kunci: 'pawn', label: 'Pawn', peranPotret: 'pawn' },
  { kunci: 'warrior', label: 'Pedang', peranPotret: 'warrior' },
  { kunci: 'archer', label: 'Panah', peranPotret: 'archer' },
  { kunci: 'lancer', label: 'Tombak', peranPotret: 'lancer' },
  { kunci: 'monk', label: 'Monk', peranPotret: 'monk' },
  { kunci: 'mage', label: 'Mage', peranPotret: 'mage' },
  { kunci: 'hero', label: 'Hero', peranPotret: 'hero' },
]

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

function hitungFilter(dunia: Dunia, tim: Tim): Record<FilterUnit, number> {
  const c: Record<FilterUnit, number> = {
    semua: 0, pawn: 0, warrior: 0, archer: 0, lancer: 0, monk: 0, mage: 0, hero: 0,
  }
  for (const u of dunia.unit) {
    if (u.tim !== tim) continue
    if (u.hero) {
      c.hero++
      c.semua++
    } else if (u.peran === 'pawn') {
      c.pawn++
    } else {
      c[u.peran as Exclude<FilterUnit, 'semua' | 'hero' | 'pawn'>]++
      c.semua++
    }
  }
  return c
}

export class Hud {
  readonly bingkai: HTMLElement
  readonly akar: HTMLElement
  readonly kanvas: HTMLCanvasElement
  readonly petaMini: HTMLCanvasElement
  readonly tombolKotak: HTMLButtonElement
  readonly tombolFullscreen: HTMLButtonElement
  readonly tombolKembaliEditor: HTMLButtonElement
  readonly tombolMenu: HTMLButtonElement
  readonly joystickEl: HTMLElement
  readonly joystickKenop: HTMLElement
  readonly layarPutar: HTMLElement
  private pita: HTMLElement
  private sumberEl: Record<string, HTMLElement> = {}
  private sumberImgEl: Record<string, HTMLImageElement> = {}
  private kisi: HTMLElement
  private tabEl: HTMLElement
  private tabUnitEl: HTMLElement
  private seleksiPotret: HTMLImageElement
  private seleksiJudul: HTMLElement
  private seleksiDetail: HTMLElement
  private seleksiHpBar: HTMLElement
  private seleksiHpIsi: HTMLElement
  private seleksiHpTeks: HTMLElement
  private seleksiTengah: HTMLElement
  private seleksiAksi: HTMLElement
  private toast: HTMLElement
  private toastTimer = 0
  private tab: Tab = 'bangun'

  private potret: PenyediaPotret = () => null
  private kunciPita = ''
  private kunciTabUnit = ''
  private kunciTengah = ''
  private kunciAksi = ''
  private kunciKisi = ''
  private cacheSumber: Record<string, string> = {}
  private cachePotretSrc: string | null = null
  private cacheJudul = ''
  private cacheDetail = ''
  private cacheHpTampil = ''
  private cacheHpLebar = ''
  private cacheHpWarna = ''
  private cacheHpTeks = ''
  private miniHpEls: HTMLElement[] = []

  // Referensi dinamis untuk pembaruan 60fps tanpa menghancurkan DOM tombol
  private progresSapuan: HTMLElement | null = null
  private progresPersenEl: HTMLElement | null = null
  private progresIsiEl: HTMLElement | null = null
  private progresDetikEl: HTMLElement | null = null
  private skillSapuan: HTMLElement | null = null
  private skillLabelEl: HTMLElement | null = null
  private kartuSapuan = new Map<string, { sapuan: HTMLElement; badge: HTMLElement }>()
  private risetSapuan = new Map<string, { sapuan: HTMLElement; badge: HTMLElement }>()

  /** Dipasang client setelah aset selesai dimuat. */
  pasangPotret(p: PenyediaPotret): void {
    this.potret = p
    this.kunciKisi = ''
    this.kunciTabUnit = ''
    this.kunciTengah = ''
    this.cachePotretSrc = null
  }

  /** Memasang ikon sumber daya hasil crop bounding-box agar tajam 26x26px. */
  pasangIkonSumber(p: PenyediaIkonSumber): void {
    for (const kunci of Object.keys(IKON_SUMBER_ASAL) as KunciSumber[]) {
      const dataUrl = p(kunci)
      if (dataUrl && this.sumberImgEl[kunci]) {
        this.sumberImgEl[kunci]!.src = dataUrl
      }
    }
  }

  constructor(private basis: string, private aksi: AksiHud) {
    this.bingkai = el('div')
    this.bingkai.id = 'bingkai-layar'

    this.akar = el('div')
    this.akar.id = 'akar'

    const panggung = el('div')
    panggung.id = 'panggung'
    this.kanvas = el('canvas')
    this.kanvas.id = 'kanvas'
    this.kanvas.width = 976
    this.kanvas.height = 720
    panggung.append(this.kanvas)

    this.pita = el('div')
    this.pita.id = 'pita-status'
    panggung.append(this.pita)

    // Tombol utilitas kanan-atas peta (Kotak Seleksi mobile, Fullscreen, Menu Jeda)
    const tombolAtas = el('div')
    tombolAtas.id = 'tombol-atas'
    this.tombolKotak = el('button', 'btn-util', '⬚ Kotak')
    this.tombolKotak.type = 'button'
    this.tombolKotak.style.display = 'none'
    this.tombolKotak.title = 'Toggle mode seret kotak seleksi (HP)'
    this.tombolKotak.addEventListener('click', () => this.aksi.toggleKotak?.())

    this.tombolFullscreen = el('button', 'btn-util', '⛶')
    this.tombolFullscreen.type = 'button'
    this.tombolFullscreen.title = 'Layar Penuh (Landscape)'
    this.tombolFullscreen.addEventListener('click', () => this.aksi.layarPenuh?.())

    this.tombolKembaliEditor = el('button', 'btn-util', '← Editor')
    this.tombolKembaliEditor.type = 'button'
    this.tombolKembaliEditor.style.display = 'none'
    this.tombolKembaliEditor.title = 'Kembali mengedit peta di Map Editor'
    this.tombolKembaliEditor.addEventListener('click', () => this.aksi.kembaliEditor?.())

    this.tombolMenu = el('button', 'btn-util', '☰ Menu')
    this.tombolMenu.type = 'button'
    this.tombolMenu.title = 'Menu Jeda & Pengaturan Kontrol'
    this.tombolMenu.addEventListener('click', () => this.aksi.bukaMenu?.())

    tombolAtas.append(this.tombolKotak, this.tombolFullscreen, this.tombolKembaliEditor, this.tombolMenu)
    panggung.append(tombolAtas)

    // Virtual Joystick untuk Mode 3 (Joystick + Seret Seleksi)
    this.joystickEl = el('div')
    this.joystickEl.id = 'joystick'
    this.joystickKenop = el('div')
    this.joystickKenop.id = 'joystick-kenop'
    this.joystickEl.append(this.joystickKenop)
    panggung.append(this.joystickEl)

    this.toast = el('div')
    this.toast.id = 'toast'
    panggung.append(this.toast)

    // Tab Per Unit dinamis di atas panel seleksi
    this.tabUnitEl = el('div')
    this.tabUnitEl.id = 'tab-unit'
    panggung.append(this.tabUnitEl)

    // Panel seleksi bawah 3 zona Warcraft III
    const seleksi = el('div')
    seleksi.id = 'seleksi'

    const kiri = el('div')
    kiri.id = 'seleksi-kiri'
    const potretKotak = el('div')
    potretKotak.id = 'seleksi-potret'
    this.seleksiPotret = el('img')
    this.seleksiPotret.alt = ''
    this.seleksiPotret.style.visibility = 'hidden'
    potretKotak.append(this.seleksiPotret)

    const info = el('div')
    info.id = 'seleksi-info'
    this.seleksiJudul = el('div')
    this.seleksiJudul.id = 'seleksi-judul'
    this.seleksiHpBar = el('div', 'hp-bar')
    this.seleksiHpIsi = el('div', 'hp-isi')
    this.seleksiHpTeks = el('span', 'hp-teks', '')
    this.seleksiHpBar.append(this.seleksiHpIsi, this.seleksiHpTeks)
    this.seleksiDetail = el('div')
    this.seleksiDetail.id = 'seleksi-detail'
    info.append(this.seleksiJudul, this.seleksiHpBar, this.seleksiDetail)
    kiri.append(potretKotak, info)

    this.seleksiTengah = el('div')
    this.seleksiTengah.id = 'seleksi-tengah'

    this.seleksiAksi = el('div')
    this.seleksiAksi.id = 'seleksi-aksi'

    seleksi.append(kiri, this.seleksiTengah, this.seleksiAksi)
    panggung.append(seleksi)

    // Sidebar kanan 304x720
    const sisi = el('aside')
    sisi.id = 'sisi'

    const miniBingkai = el('div')
    miniBingkai.id = 'peta-mini-bingkai'
    this.petaMini = el('canvas')
    this.petaMini.id = 'peta-mini'
    this.petaMini.width = 256
    this.petaMini.height = 172
    miniBingkai.append(this.petaMini)

    const sd = el('div')
    sd.id = 'sumber-daya'
    for (const [kunci, aset] of Object.entries(IKON_SUMBER_ASAL)) {
      const kotak = el('div', 'sumber')
      const im = el('img')
      im.src = urlAset(aset, basis)
      this.sumberImgEl[kunci] = im
      const teks = el('span', undefined, '0')
      this.sumberEl[kunci] = teks
      kotak.append(im, teks)
      sd.append(kotak)
    }

    this.tabEl = el('div')
    this.tabEl.id = 'tab'
    for (const [kunci, label] of [['bangun', 'Bangun'], ['pasukan', 'Pasukan'], ['hero', 'Hero']] as const) {
      const b = el('button', 'tab-tombol', label)
      b.type = 'button'
      b.dataset['tab'] = kunci
      b.addEventListener('click', () => {
        this.tab = kunci
        this.kunciKisi = ''
        this.aksi.pilihTab(kunci)
        this.perbaruiTab()
      })
      this.tabEl.append(b)
    }

    this.kisi = el('div')
    this.kisi.id = 'kisi-produksi'

    sisi.append(miniBingkai, sd, this.tabEl, this.kisi)
    this.akar.append(panggung, sisi)
    this.bingkai.append(this.akar)

    // Layar anjuran putar HP ke Landscape (di luar #akar supaya terbaca jelas saat portrait)
    this.layarPutar = el('div')
    this.layarPutar.id = 'layar-putar'
    const kotakPutar = el('div', 'kotak-putar')
    kotakPutar.append(
      el('div', 'ikon-putar', '📱↻'),
      el('h2', undefined, 'Putar HP ke Landscape'),
      el('p', undefined, 'Game RTS ini beresolusi 1280×720 (mendatar). Putar layar HP Anda ke posisi Landscape agar peta & tombol nyaman dikendalikan.'),
    )
    const barisPutar = el('div', 'baris')
    const btnFullPutar = el('button', 'tombol-besar', '⛶ Layar Penuh (Landscape)')
    btnFullPutar.type = 'button'
    btnFullPutar.addEventListener('click', () => this.aksi.layarPenuh?.())
    const btnLewat = el('button', 'tombol-besar', 'Tetap Lanjut')
    btnLewat.type = 'button'
    btnLewat.addEventListener('click', () => this.aksi.lewatPutar?.())
    barisPutar.append(btnFullPutar, btnLewat)
    kotakPutar.append(barisPutar)
    this.layarPutar.append(kotakPutar)
    this.bingkai.append(this.layarPutar)

    this.perbaruiTab()
  }

  /** Atur tampilan kontrol mobile sesuai ModeSentuh (Mode 1 vs Mode 3). */
  setModeSentuh(mode: ModeSentuh, sentuhAktif: boolean): void {
    this.joystickEl.classList.toggle('tampil', mode === 'joystick')
    this.tombolKotak.style.display = mode === 'tapPintar' && sentuhAktif ? '' : 'none'
  }

  setKotakAktif(aktif: boolean): void {
    this.tombolKotak.classList.toggle('aktif', aktif)
    this.tombolKotak.textContent = aktif ? '⬚ Pilih: ON' : '⬚ Kotak'
  }

  setLayarPutar(tampil: boolean): void {
    this.layarPutar.classList.toggle('tampil', tampil)
  }

  setModeUjiEditor(aktif: boolean): void {
    this.tombolKembaliEditor.style.display = aktif ? 'inline-flex' : 'none'
  }

  tampilkanToast(pesan: string, peringatan = false): void {
    this.toast.textContent = pesan
    this.toast.classList.toggle('peringatan', peringatan)
    this.toast.classList.add('tampil')
    this.toastTimer = peringatan ? 3.0 : 2.4
  }

  langkahToast(dt: number): void {
    if (this.toastTimer <= 0) return
    this.toastTimer -= dt
    if (this.toastTimer <= 0) this.toast.classList.remove('tampil')
  }

  private perbaruiTab(): void {
    for (const b of Array.from(this.tabEl.children) as HTMLElement[]) {
      b.setAttribute('aria-selected', String(b.dataset['tab'] === this.tab))
    }
  }

  setTim(tim: Tim): void {
    const info = WARNA_TIM[tim]
    this.akar.dataset['tim'] = tim
    this.akar.classList.toggle('red', info.pita === 'red')
    this.pita.classList.toggle('red', info.pita === 'red')
    this.pita.classList.toggle('yellow', info.pita === 'yellow')
  }

  perbaruiPita(dunia: Dunia, tim: Tim, mode: string, fps?: number): void {
    const detik = Math.floor(dunia.tick / 60)
    const mm = String(Math.floor(detik / 60)).padStart(2, '0')
    const ss = String(detik % 60).padStart(2, '0')
    const info = WARNA_TIM[tim]
    const nama = info.kerajaan
    const labelFps = fps && fps > 0 ? `${Math.round(fps)} FPS` : ''
    const kunci = `${tim}|${nama}|${mm}:${ss}|${mode}|${labelFps}`
    if (kunci === this.kunciPita) return
    this.kunciPita = kunci
    this.pita.textContent = ''
    const titik = el('span', 'titik-tim')
    titik.style.background = info.utama
    this.pita.append(titik)
    const bagianDaftar = labelFps ? [nama, `${mm}:${ss}`, mode, labelFps] : [nama, `${mm}:${ss}`, mode]
    for (const [i, bagian] of bagianDaftar.entries()) {
      if (i > 0) this.pita.append(el('span', 'pisah', '•'))
      this.pita.append(el('span', undefined, bagian))
    }
  }

  perbaruiSumberDaya(dunia: Dunia, tim: Tim): void {
    const s = dunia.tim[tim].sumberDaya
    const nilai: Record<string, string> = {
      gold: String(Math.floor(s.gold)),
      kayu: String(Math.floor(s.kayu)),
      daging: String(Math.floor(s.daging)),
      supply: `${supplyTerpakai(dunia, tim)}/${supplyMaks(dunia, tim)}`,
    }
    for (const [k, v] of Object.entries(nilai)) {
      if (this.cacheSumber[k] === v) continue
      this.cacheSumber[k] = v
      this.sumberEl[k]!.textContent = v
    }
  }

  private setPotretSeleksi(src: string | null): void {
    if (this.cachePotretSrc === src) return
    this.cachePotretSrc = src
    if (src === null) {
      this.seleksiPotret.style.visibility = 'hidden'
      this.seleksiPotret.removeAttribute('src')
    } else {
      this.seleksiPotret.src = src
      this.seleksiPotret.style.visibility = 'visible'
    }
  }

  private setInfoSeleksi(judul: string, detail: string): void {
    if (this.cacheJudul !== judul) {
      this.cacheJudul = judul
      this.seleksiJudul.textContent = judul
    }
    if (this.cacheDetail !== detail) {
      this.cacheDetail = detail
      this.seleksiDetail.textContent = detail
    }
  }

  private setHpSeleksi(tampil: boolean, lebar = '', warna = '', teks = ''): void {
    const mode = tampil ? 'block' : 'none'
    if (this.cacheHpTampil !== mode) {
      this.cacheHpTampil = mode
      this.seleksiHpBar.style.display = mode
    }
    if (!tampil) return
    if (this.cacheHpLebar !== lebar) {
      this.cacheHpLebar = lebar
      this.seleksiHpIsi.style.width = lebar
    }
    if (this.cacheHpWarna !== warna) {
      this.cacheHpWarna = warna
      this.seleksiHpIsi.style.background = warna
    }
    if (this.cacheHpTeks !== teks) {
      this.cacheHpTeks = teks
      this.seleksiHpTeks.textContent = teks
    }
  }

  /**
   * Barisan tab per jenis unit tepat di atas panel bawah.
   * Jenis unit dengan jumlah 0 TIDAK ditampilkan sama sekali.
   */
  perbaruiTabUnit(dunia: Dunia, tim: Tim, unitTerpilih: Unit[]): void {
    const hit = hitungFilter(dunia, tim)
    let aktif: FilterUnit | null = null
    if (unitTerpilih.length > 0) {
      const semuaHero = unitTerpilih.every((u) => u.hero)
      const peranUnik = new Set(unitTerpilih.map((u) => u.peran))
      if (semuaHero && unitTerpilih.length === hit.hero) aktif = 'hero'
      else if (peranUnik.size === 1) {
        const p = unitTerpilih[0]!.peran as FilterUnit
        if (unitTerpilih.length === hit[p]) aktif = p
      } else if (unitTerpilih.every((u) => u.peran !== 'pawn') && unitTerpilih.length === hit.semua) {
        aktif = 'semua'
      }
    }

    const kunci = URUTAN_FILTER.map((f) => `${f.kunci}:${hit[f.kunci]}`).join('|') + `@${aktif ?? ''}`
    if (kunci === this.kunciTabUnit) return
    this.kunciTabUnit = kunci
    this.tabUnitEl.textContent = ''

    const heroHidup = dunia.unit.find((u) => u.tim === tim && u.hero)
    for (const item of URUTAN_FILTER) {
      const n = hit[item.kunci]
      if (n <= 0) continue
      const btn = el('button', 'tab-unit-btn')
      btn.type = 'button'
      btn.dataset['filter'] = item.kunci
      if (item.kunci === 'hero') btn.classList.add('hero')
      if (aktif === item.kunci) btn.classList.add('aktif')

      const im = el('img')
      if (item.kunci === 'hero' && heroHidup) {
        im.src = this.potret(`hero:${heroHidup.peran}`) ?? urlAset(HERO_BLUE[heroHidup.peran as keyof typeof HERO_BLUE].potret, this.basis)
      } else {
        im.src = this.potret(item.peranPotret) ?? urlAset(AVATAR['avatar01']!, this.basis)
      }
      btn.append(im, el('span', undefined, `${item.label} ${n}`))
      btn.addEventListener('click', () => this.aksi.pilihFilterUnit?.(item.kunci))
      this.tabUnitEl.append(btn)
    }
  }

  /** Kartu produksi sidebar (tanpa scrollbar, dengan info counter & progres pelatihan %). */
  perbaruiKisi(dunia: Dunia, tim: Tim, bangunanTerpilih: Bangunan | null): void {
    const s = dunia.tim[tim].sumberDaya
    const aktif = dunia.bangunan.filter((b) => b.tim === tim && b.fase === 'aktif')

    // Hitung kunci struktural supaya DOM kartu tidak dihancurkan 60x/detik.
    let kunci = `${this.tab}|`
    if (this.tab === 'bangun') {
      kunci += URUTAN_BANGUN.map((j) => {
        const d = BANGUNAN[j]
        return `${j}:${s.gold >= d.gold && s.kayu >= d.kayu ? 1 : 0}`
      }).join(',')
    } else if (this.tab === 'pasukan') {
      kunci += UNIT_REGULER.map((p) => {
        const d = UNIT[p]
        const punya = bangunanTerpilih?.jenis === d.dariBangunan || aktif.some((b) => b.jenis === d.dariBangunan)
        const mampu = s.gold >= d.gold && s.kayu >= d.kayu && s.daging >= d.daging
        return `${p}:${punya && mampu ? 1 : 0}`
      }).join(',')
    } else {
      const k = dunia.tim[tim]
      const punyaAltar = aktif.some((b) => b.jenis === 'altar')
      const hidup = dunia.unit.find((u) => u.tim === tim && u.hero)
      kunci += k.heroGugur
        ? `gugur:${k.heroGugur.level}:${punyaAltar ? 1 : 0}:${s.gold >= REVIVE.goldPerLevel * k.heroGugur.level && s.daging >= REVIVE.daging ? 1 : 0}`
        : `hidup:${hidup?.peran ?? ''}:${hidup?.level ?? 0}:${hidup?.xp ?? 0}`
    }

    if (kunci !== this.kunciKisi) {
      this.kunciKisi = kunci
      this.kisi.textContent = ''
      this.kartuSapuan.clear()

      if (this.tab === 'bangun') {
        for (const jenis of URUTAN_BANGUN) {
          const def = BANGUNAN[jenis]
          const mampu = s.gold >= def.gold && s.kayu >= def.kayu
          this.kisi.append(this.kartu({
            ikon: this.potret(`bg:${jenis}`) ?? urlAset(BANGUNAN_BLUE[jenis]!, this.basis),
            nama: def.nama,
            biaya: `${def.gold}g ${def.kayu}k`,
            mati: !mampu,
            klik: () => this.aksi.mulaiBangun(jenis),
          }))
        }
      } else if (this.tab === 'pasukan') {
        for (const peran of UNIT_REGULER) {
          const def = UNIT[peran]
          const punya = bangunanTerpilih?.jenis === def.dariBangunan || aktif.some((b) => b.jenis === def.dariBangunan)
          const mampu = s.gold >= def.gold && s.kayu >= def.kayu && s.daging >= def.daging
          const rc = ringkasCounter(def.serangan)
          const kartu = this.kartu({
            ikon: this.potret(peran) ?? urlAset(AVATAR['avatar01']!, this.basis),
            nama: def.nama,
            biaya: `${def.gold}g ${def.daging}d${def.kayu > 0 ? ` ${def.kayu}k` : ''}`,
            counter: `${NAMA_SERANGAN[def.serangan]} · vs ${rc.kuat}`,
            mati: !mampu || !punya,
            unit: true,
            klik: () => this.aksi.latih(peran),
          })
          const sapuan = el('div', 'sapuan-gelap')
          sapuan.style.display = 'none'
          const badge = el('span', 'badge-persen', '')
          badge.style.display = 'none'
          kartu.append(sapuan, badge)
          this.kartuSapuan.set(peran, { sapuan, badge })
          this.kisi.append(kartu)
        }
      } else {
        const k = dunia.tim[tim]
        if (k.heroGugur) {
          const biayaGold = REVIVE.goldPerLevel * k.heroGugur.level
          const punyaAltar = aktif.some((b) => b.jenis === 'altar')
          this.kisi.append(this.kartu({
            ikon: this.potret(`hero:${k.heroGugur.peran}`) ?? urlAset(HERO_BLUE[k.heroGugur.peran].potret, this.basis),
            nama: punyaAltar ? 'Bangkitkan' : 'Perlu Altar',
            biaya: `${biayaGold}g ${REVIVE.daging}d`,
            mati: !punyaAltar || s.gold < biayaGold || s.daging < REVIVE.daging,
            klik: () => this.aksi.bangkitkanHero(),
          }))
          const catatan = el('div', 'cip', punyaAltar
            ? `Hero Lv${k.heroGugur.level} siap dibangkitkan di Altar`
            : 'Hero gugur. Bangun Altar of Heroes dulu!')
          catatan.style.gridColumn = '1 / -1'
          this.kisi.append(catatan)
        } else {
          const hidup = dunia.unit.find((u) => u.tim === tim && u.hero)
          const info = el('div', 'cip', hidup
            ? `${UNIT[hidup.peran].nama} — Lv${hidup.level} (${hidup.xp} XP)`
            : 'Tidak ada hero')
          info.style.gridColumn = '1 / -1'
          this.kisi.append(info)
        }
      }
    }

    // Perbarui sapuan gelap->cerah + % pada kartu pasukan yang sedang dilatih (ringan, tanpa rebuild DOM).
    if (this.tab === 'pasukan') {
      for (const [peran, ref] of this.kartuSapuan) {
        const sedang = aktif.find((b) => b.antrean[0]?.peran === peran)
        if (!sedang || !sedang.antrean[0]) {
          ref.sapuan.style.display = 'none'
          ref.badge.style.display = 'none'
          continue
        }
        const total = UNIT[peran as PeranUnit].waktuLatih
        const porsi = Math.max(0, Math.min(1, 1 - sedang.antrean[0].sisaDetik / total))
        ref.sapuan.style.display = 'block'
        ref.sapuan.style.height = `calc(${((1 - porsi) * 100).toFixed(1)}% - 8px)`
        ref.badge.style.display = 'block'
        ref.badge.textContent = `${Math.round(porsi * 100)}%`
      }
    }
  }

  private kartu(o: {
    ikon: string; nama: string; biaya: string; counter?: string;
    mati: boolean; unit?: boolean; klik: () => void
  }): HTMLElement {
    const b = el('button', o.unit ? 'kartu unit' : 'kartu')
    b.type = 'button'
    // Pakai kelas .terkunci (bukan disabled HTML) supaya klik tetap bisa memunculkan
    // notifikasi alasan (kurang Gold/Kayu/Daging, Populasi penuh, atau bangunan belum ada).
    if (o.mati) {
      b.classList.add('terkunci')
      b.setAttribute('aria-disabled', 'true')
    }
    const im = el('img')
    im.src = o.ikon
    b.append(im, el('span', 'nama', o.nama), el('span', 'biaya', o.biaya))
    if (o.counter) b.append(el('span', 'counter', o.counter))
    b.addEventListener('click', o.klik)
    return b
  }

  perbaruiSeleksi(
    dunia: Dunia, tim: Tim, unitTerpilih: Unit[], bangunanTerpilih: Bangunan | null,
    modeSerang = false, sumberTerpilih: SumberInfo | null = null,
  ): void {
    // 1. Mode bangunan terpilih (termasuk Riset Kontekstual & Progres Pelatihan ala Warcraft!)
    if (bangunanTerpilih) {
      const def = BANGUNAN[bangunanTerpilih.jenis]
      this.setPotretSeleksi(
        this.potret(`bg:${bangunanTerpilih.jenis}:${bangunanTerpilih.tim}`) ??
        this.potret(`bg:${bangunanTerpilih.jenis}`) ??
        urlAset(BANGUNAN_BLUE[bangunanTerpilih.jenis]!, this.basis),
      )
      const porsiHp = Math.max(0, Math.min(1, bangunanTerpilih.hp / bangunanTerpilih.hpMaks))
      this.setHpSeleksi(
        true,
        `${(porsiHp * 100).toFixed(1)}%`,
        porsiHp > 0.5 ? '#52c95f' : porsiHp > 0.25 ? '#e0b83a' : '#d9534f',
        `${Math.round(bangunanTerpilih.hp)} / ${bangunanTerpilih.hpMaks}`,
      )

      let detail: string
      if (bangunanTerpilih.fase === 'konstruksi') {
        const porsiBangun = Math.round((1 - Math.max(0, bangunanTerpilih.sisaBangun) / def.waktuBangun) * 100)
        const jmlPekerja = dunia.unit.filter(
          (u) => u.tim === bangunanTerpilih.tim && u.peran === 'pawn' && u.tugas === 'bangun' && u.targetId === bangunanTerpilih.id,
        ).length
        if (jmlPekerja === 0) {
          detail = `Menunggu Pawn • ${porsiBangun}%`
        } else if (jmlPekerja === 1) {
          detail = `Membangun ${porsiBangun}% (${Math.ceil(bangunanTerpilih.sisaBangun)}s)`
        } else {
          const laju = 1 + 0.5 * (jmlPekerja - 1)
          detail = `Membangun ${porsiBangun}% (${Math.ceil(bangunanTerpilih.sisaBangun / laju)}s) • ${jmlPekerja} Pawn (${laju.toFixed(1)}×)`
        }
      } else {
        detail = def.melatih.length > 0
          ? `Aktif • Klik kanan peta: Rally`
          : def.supply > 0 ? `Aktif • +${def.supply} Populasi` : 'Aktif'
      }
      this.setInfoSeleksi(def.nama, detail)

      this.perbaruiTengahBangunan(dunia, bangunanTerpilih)
      this.perbaruiAksiBangunan(dunia, tim, bangunanTerpilih)
      return
    }

    // 1b. Mode resource terpilih (Pohon, Tunggul, Tambang, Domba, Daging)
    if (unitTerpilih.length === 0 && sumberTerpilih) {
      const tampil = this.tampilkanSumber(dunia, sumberTerpilih)
      if (tampil) return
    }

    // 2. Mode tidak ada seleksi
    if (unitTerpilih.length === 0) {
      this.setPotretSeleksi(null)
      this.setHpSeleksi(false)
      this.setInfoSeleksi('Siap Perintah', 'Klik unit/bangunan atau seret kotak seleksi')
      if (this.kunciTengah !== 'kosong') {
        this.kunciTengah = 'kosong'
        this.seleksiTengah.textContent = ''
        this.progresSapuan = null
        this.miniHpEls = []
        this.seleksiTengah.append(el('div', 'petunjuk-tengah',
          'Panah / tepi layar / klik tengah: geser kamera • Klik kanan: perintah pintar • [F2] Semua Pasukan'))
      }
      if (this.kunciAksi !== 'kosong') {
        this.kunciAksi = 'kosong'
        this.seleksiAksi.textContent = ''
        this.skillSapuan = null
      }
      return
    }

    // 3. Mode unit terpilih (Command Card + grid mini unit)
    const utama = unitTerpilih.find((u) => u.hero) ?? unitTerpilih[0]!
    const defUtama = UNIT[utama.peran]
    this.setPotretSeleksi(
      utama.hero
        ? (this.potret(`hero:${utama.peran}`) ?? urlAset(HERO_BLUE[utama.peran as keyof typeof HERO_BLUE].potret, this.basis))
        : (this.potret(utama.peran) ?? urlAset(AVATAR['avatar01']!, this.basis)),
    )
    const porsiHp = Math.max(0, Math.min(1, utama.hp / utama.hpMaks))
    this.setHpSeleksi(
      true,
      `${(porsiHp * 100).toFixed(1)}%`,
      porsiHp > 0.5 ? '#52c95f' : porsiHp > 0.25 ? '#e0b83a' : '#d9534f',
      `${Math.round(utama.hp)} / ${utama.hpMaks}`,
    )
    this.setInfoSeleksi(
      unitTerpilih.length > 1 ? `${unitTerpilih.length} Pasukan Terpilih` : defUtama.nama,
      utama.hero
        ? `Lv${utama.level} (${utama.xp} XP) • ${NAMA_SERANGAN[defUtama.serangan]} • ${NAMA_BAJU[defUtama.baju]}`
        : `DMG ${utama.dmg} • ${NAMA_SERANGAN[defUtama.serangan]} • ${NAMA_BAJU[defUtama.baju]}`,
    )

    // Tengah: mini-grid unit terpilih (klik untuk fokus unit tunggal)
    const kunciT = 'u:' + unitTerpilih.slice(0, 12).map((u) => u.id).join(',')
    if (kunciT !== this.kunciTengah) {
      this.kunciTengah = kunciT
      this.progresSapuan = null
      this.miniHpEls = []
      this.seleksiTengah.textContent = ''
      const grid = el('div', 'unit-grid')
      for (const u of unitTerpilih.slice(0, 12)) {
        const m = el('button', 'mini-unit')
        m.type = 'button'
        m.dataset['unitId'] = String(u.id)
        const im = el('img')
        im.src = u.hero
          ? (this.potret(`hero:${u.peran}`) ?? urlAset(HERO_BLUE[u.peran as keyof typeof HERO_BLUE].potret, this.basis))
          : (this.potret(u.peran) ?? urlAset(AVATAR['avatar01']!, this.basis))
        const bar = el('div', 'mini-hp')
        const isi = el('div')
        isi.style.width = `${Math.round((u.hp / u.hpMaks) * 100)}%`
        bar.append(isi)
        m.append(im, bar)
        m.addEventListener('click', () => this.aksi.fokusUnit?.(u.id))
        grid.append(m)
        this.miniHpEls.push(isi)
      }
      this.seleksiTengah.append(grid)
    } else {
      // Update lebar mini HP bar tanpa querySelectorAll tiap frame
      for (let i = 0; i < this.miniHpEls.length && i < unitTerpilih.length; i++) {
        const u = unitTerpilih[i]!
        const lebar = `${Math.max(0, Math.min(100, Math.round((u.hp / u.hpMaks) * 100)))}%`
        const isi = this.miniHpEls[i]!
        if (isi.style.width !== lebar) isi.style.width = lebar
      }
    }

    // Kanan: Command Card 2x2 [A] Serang, [S] Stop, [H] Tahan, [Q] Skill
    const hero = unitTerpilih.find((u) => u.hero)
    const kunciA = `cmd:${hero ? hero.peran : 'none'}:${hero && hero.skillJeda <= 0 ? 1 : 0}:${modeSerang ? 1 : 0}`
    if (kunciA !== this.kunciAksi) {
      this.kunciAksi = kunciA
      this.seleksiAksi.textContent = ''
      this.risetSapuan.clear()
      this.skillSapuan = null
      this.skillLabelEl = null

      const buatCmd = (label: string, sub: string, aksi: PerintahKartu, opts?: { aktif?: boolean; mati?: boolean; merah?: boolean }) => {
        const b = el('button', 'cmd-btn')
        b.type = 'button'
        b.dataset['cmd'] = aksi
        if (opts?.aktif) b.classList.add('aktif')
        if (opts?.merah) b.classList.add('merah')
        b.disabled = opts?.mati === true
        const l = el('span', undefined, label)
        const s = el('span', 'cmd-sub', sub)
        b.append(l, s)
        b.addEventListener('click', () => this.aksi.perintahUnit?.(aksi))
        return { b, s }
      }

      this.seleksiAksi.append(
        buatCmd('[A] Serang', 'Attack-Move', 'serang', { aktif: modeSerang }).b,
        buatCmd('[S] Stop', 'Hentikan', 'stop').b,
        buatCmd('[H] Tahan', 'Jaga Posisi', 'tahan').b,
      )

      const namaSkill = hero ? SKILL[hero.peran as keyof typeof SKILL].nama : 'Khusus Hero'
      const skill = buatCmd(
        '[Q] Skill',
        hero ? (hero.skillJeda > 0 ? `${Math.ceil(hero.skillJeda)}s` : namaSkill) : 'Khusus Hero',
        'skill',
        { mati: !hero || hero.skillJeda > 0, merah: Boolean(hero) },
      )
      if (hero) {
        const sapuan = el('div', 'sapuan-gelap')
        sapuan.style.display = hero.skillJeda > 0 ? 'block' : 'none'
        skill.b.append(sapuan)
        this.skillSapuan = sapuan
        this.skillLabelEl = skill.s
      }
      this.seleksiAksi.append(skill.b)
    }

    if (hero && this.skillSapuan && this.skillLabelEl) {
      const defS = SKILL[hero.peran as keyof typeof SKILL]
      if (hero.skillJeda > 0) {
        const sisaPorsi = Math.max(0, Math.min(1, hero.skillJeda / defS.jeda))
        this.skillSapuan.style.display = 'block'
        this.skillSapuan.style.height = `calc(${(sisaPorsi * 100).toFixed(1)}% - 8px)`
        this.skillLabelEl.textContent = `Cooldown ${Math.ceil(hero.skillJeda)}s`
      } else {
        this.skillSapuan.style.display = 'none'
        this.skillLabelEl.textContent = defS.nama
      }
    }
  }

  private perbaruiTengahBangunan(dunia: Dunia, b: Bangunan): void {
    const sedangLatih = b.antrean[0] ?? null
    const sedangRiset = b.riset
    const sedangRevive = b.revive
    const mode = sedangLatih
      ? `latih:${b.id}:${b.antrean.map((a) => a.peran).join(',')}`
      : sedangRiset
        ? `riset:${b.id}:${sedangRiset.jenis}`
        : sedangRevive
          ? `revive:${b.id}:${sedangRevive.peran}`
          : `diam:${b.id}:${b.fase}`

    if (mode !== this.kunciTengah) {
      this.kunciTengah = mode
      this.seleksiTengah.textContent = ''
      this.progresSapuan = null
      this.progresPersenEl = null
      this.progresIsiEl = null
      this.progresDetikEl = null

      if (!sedangLatih && !sedangRiset && !sedangRevive) {
        const teks = b.fase === 'konstruksi'
          ? 'Pilih Pawn tambahan lalu klik bangunan ini untuk kerja bakti (+50% tiap Pawn).'
          : BANGUNAN[b.jenis].melatih.length > 0
            ? 'Klik kanan di peta untuk memindahkan Bendera Rally Point.'
            : 'Bangunan aktif.'
        this.seleksiTengah.append(el('div', 'petunjuk-tengah', teks))
        return
      }

      const box = el('div', 'progres-box')
      const ikonKotak = el('div', 'progres-ikon')
      const im = el('img')
      let judul = ''
      if (sedangLatih) {
        im.src = this.potret(sedangLatih.peran) ?? urlAset(AVATAR['avatar01']!, this.basis)
        judul = `Melatih ${UNIT[sedangLatih.peran].nama}`
      } else if (sedangRiset) {
        im.src = this.potret(`bg:${b.jenis}`) ?? urlAset(BANGUNAN_BLUE[b.jenis]!, this.basis)
        judul = `Riset ${RISET[sedangRiset.jenis].nama}`
      } else if (sedangRevive) {
        im.src = this.potret(`hero:${sedangRevive.peran}`) ?? urlAset(HERO_BLUE[sedangRevive.peran].potret, this.basis)
        judul = `Bangkit ${UNIT[sedangRevive.peran].nama}`
      }
      const sapuan = el('div', 'sapuan-gelap')
      ikonKotak.append(im, sapuan)

      const info = el('div', 'progres-info')
      const atas = el('div', 'progres-atas')
      const labelEl = el('span', undefined, judul)
      const persenEl = el('span', 'progres-persen', '0%')
      atas.append(labelEl, persenEl)

      const bar = el('div', 'progres-bar')
      const isi = el('div', 'progres-isi')
      bar.append(isi)

      const detikEl = el('div', 'cmd-sub', '')
      info.append(atas, bar, detikEl)

      // Antrean klik-batal (seperti Warcraft III)
      if (b.antrean.length > 0) {
        const antreanEl = el('div', 'antrean-baris')
        for (let i = 0; i < b.antrean.length; i++) {
          const item = b.antrean[i]!
          const slot = el('button', 'antrean-slot', `${i + 1}. ${UNIT[item.peran].nama} ×`)
          slot.type = 'button'
          slot.title = 'Klik untuk membatalkan pelatihan (refund penuh)'
          const idx = i
          slot.addEventListener('click', () => this.aksi.batalLatih?.(b.id, idx))
          antreanEl.append(slot)
        }
        info.append(antreanEl)
      }

      box.append(ikonKotak, info)
      this.seleksiTengah.append(box)
      this.progresSapuan = sapuan
      this.progresPersenEl = persenEl
      this.progresIsiEl = isi
      this.progresDetikEl = detikEl
    }

    // Perbarui persentase & sapuan gelap -> cerah setiap frame
    if (this.progresSapuan && this.progresPersenEl && this.progresIsiEl && this.progresDetikEl) {
      let sisa = 0
      let total = 1
      if (sedangLatih) {
        sisa = sedangLatih.sisaDetik
        total = UNIT[sedangLatih.peran].waktuLatih
      } else if (sedangRiset) {
        sisa = sedangRiset.sisaDetik
        const lv = dunia.tim[b.tim].riset[sedangRiset.jenis]
        total = RISET[sedangRiset.jenis].tingkat[lv]?.detik ?? 30
      } else if (sedangRevive) {
        sisa = sedangRevive.sisaDetik
        total = REVIVE.detikDasar + REVIVE.detikPerLevel * sedangRevive.level
      }
      const porsi = Math.max(0, Math.min(1, 1 - sisa / Math.max(0.1, total)))
      const persen = Math.round(porsi * 100)
      this.progresSapuan.style.height = `calc(${((1 - porsi) * 100).toFixed(1)}% - 8px)`
      this.progresPersenEl.textContent = `${persen}%`
      this.progresIsiEl.style.width = `${(porsi * 100).toFixed(1)}%`
      this.progresDetikEl.textContent = `Sisa ${Math.max(1, Math.ceil(sisa))} detik`
    }
  }

  /** Tombol Riset Kontekstual (Pilihan 2) atau Bangkitkan Hero di sisi kanan panel bawah. */
  private perbaruiAksiBangunan(dunia: Dunia, tim: Tim, b: Bangunan): void {
    const daftarRiset = b.fase === 'aktif' ? risetDi(b.jenis) : []
    const s = dunia.tim[tim].sumberDaya
    const k = dunia.tim[tim]

    let kunci = `b:${b.id}:${b.fase}:${b.riset?.jenis ?? ''}:`
    kunci += daftarRiset.map((r) => {
      const lv = k.riset[r]
      const biaya = RISET[r].tingkat[lv]
      const mampu = biaya ? s.gold >= biaya.gold && s.kayu >= biaya.kayu : false
      const sibuk = dunia.bangunan.some((x) => x.tim === tim && x.riset?.jenis === r)
      return `${r}:${lv}:${mampu ? 1 : 0}:${sibuk ? 1 : 0}`
    }).join(',')
    if (b.jenis === 'altar') {
      kunci += `altar:${k.heroGugur?.level ?? 0}:${b.revive ? 1 : 0}:${s.gold >= REVIVE.goldPerLevel * (k.heroGugur?.level ?? 1) && s.daging >= REVIVE.daging ? 1 : 0}`
    }

    if (kunci !== this.kunciAksi) {
      this.kunciAksi = kunci
      this.seleksiAksi.textContent = ''
      this.skillSapuan = null
      this.risetSapuan.clear()

      if (daftarRiset.length > 0) {
        for (const r of daftarRiset) {
          const def = RISET[r]
          const lv = k.riset[r]
          const maks = lv >= TINGKAT_MAKS
          const biaya = def.tingkat[lv]
          const sedangIni = b.riset?.jenis === r
          const sibukLain = !sedangIni && (b.riset !== null || dunia.bangunan.some((x) => x.tim === tim && x.riset?.jenis === r))
          const mampu = biaya ? s.gold >= biaya.gold && s.kayu >= biaya.kayu : false

          const btn = el('button', 'cmd-btn riset')
          btn.type = 'button'
          btn.dataset['riset'] = r
          if (maks || sedangIni || sibukLain || !mampu) {
            btn.classList.add('terkunci')
            btn.setAttribute('aria-disabled', 'true')
          }
          btn.append(
            el('span', undefined, def.nama),
            el('span', 'cmd-sub', maks ? `MAKS (${lv}/${TINGKAT_MAKS})` : `${def.singkat} • Lv ${lv}/${TINGKAT_MAKS}`),
            el('span', 'cmd-sub', maks ? 'Selesai' : `${biaya!.gold}g ${biaya!.kayu}k`),
          )
          const sapuan = el('div', 'sapuan-gelap')
          sapuan.style.display = sedangIni ? 'block' : 'none'
          const badge = el('span', 'badge-persen', '')
          badge.style.display = sedangIni ? 'block' : 'none'
          btn.append(sapuan, badge)
          btn.addEventListener('click', () => this.aksi.riset?.(b.id, r))
          this.risetSapuan.set(r, { sapuan, badge })
          this.seleksiAksi.append(btn)
        }
      } else if (b.jenis === 'altar' && b.fase === 'aktif' && k.heroGugur && !b.revive) {
        const biayaGold = REVIVE.goldPerLevel * k.heroGugur.level
        const btn = el('button', 'cmd-btn riset merah')
        btn.type = 'button'
        btn.style.gridColumn = '1 / -1'
        if (s.gold < biayaGold || s.daging < REVIVE.daging) {
          btn.classList.add('terkunci')
          btn.setAttribute('aria-disabled', 'true')
        }
        btn.append(
          el('span', undefined, `Bangkitkan ${UNIT[k.heroGugur.peran].nama}`),
          el('span', 'cmd-sub', `Lv ${k.heroGugur.level} • ${biayaGold}g ${REVIVE.daging}d`),
        )
        btn.addEventListener('click', () => this.aksi.bangkitkanHero())
        this.seleksiAksi.append(btn)
      }
    }

    // Update sapuan % tombol riset yang sedang aktif
    for (const [r, ref] of this.risetSapuan) {
      if (b.riset?.jenis === r) {
        const lv = k.riset[r as JenisRiset]
        const total = RISET[r as JenisRiset].tingkat[lv]?.detik ?? 30
        const porsi = Math.max(0, Math.min(1, 1 - b.riset.sisaDetik / total))
        ref.sapuan.style.display = 'block'
        ref.sapuan.style.height = `calc(${((1 - porsi) * 100).toFixed(1)}% - 8px)`
        ref.badge.style.display = 'block'
        ref.badge.textContent = `${Math.round(porsi * 100)}%`
      } else {
        ref.sapuan.style.display = 'none'
        ref.badge.style.display = 'none'
      }
    }
  }

  /** Menampilkan inspeksi resource (pohon, tunggul, tambang, domba, daging) di panel bawah. */
  private tampilkanSumber(dunia: Dunia, s: SumberInfo): boolean {
    let judul = ''
    let detail = ''
    let petunjuk = 'Pilih Pawn lalu klik kanan (atau tap di HP) objek ini untuk memanen.'
    let nilai = 0
    let maks = 1
    let labelBar = ''
    let warnaBar = '#52c95f'
    let ikon = this.potret(s.jenis) ?? urlAset(SUMBER.kayuDiam, this.basis)

    if (s.jenis === 'pohon') {
      const p = dunia.pohon.find((x) => x.id === s.id)
      if (!p) return false
      judul = 'Pohon Pinus'
      nilai = Math.round(p.kayu)
      maks = KAYU_POHON_BARU
      labelBar = `${nilai} / ${maks} Kayu`
      detail = 'Sumber Kayu • Tumbuh lagi setelah ditebang'
      warnaBar = '#52c95f'
    } else if (s.jenis === 'tunggul') {
      const tg = dunia.tunggul.find((x) => x.id === s.id)
      if (!tg) return false
      judul = 'Tunggul Pohon'
      const porsi = Math.max(0, Math.min(1, 1 - tg.sisaTumbuh / DETIK_TUMBUH_POHON))
      nilai = Math.round(porsi * 100)
      maks = 100
      labelBar = `Tumbuh ${nilai}% (${Math.max(1, Math.ceil(tg.sisaTumbuh))}s)`
      detail = 'Sedang tumbuh kembali menjadi pohon utuh'
      petunjuk = 'Pohon akan otomatis tumbuh kembali selama tidak ditimpa bangunan.'
      warnaBar = '#c89b52'
    } else if (s.jenis === 'tambang') {
      const tb = dunia.tambang.find((x) => x.id === s.id)
      if (!tb) return false
      judul = tb.jenis === 'mine' ? 'Tambang Emas' : 'Batu Emas'
      nilai = Math.round(tb.gold)
      maks = Math.max(nilai, tb.jenis === 'mine' ? 4500 : 1400)
      labelBar = `${nilai} Gold`
      detail = 'Sumber Emas • Panen dengan Pawn'
      warnaBar = '#e8b931'
      ikon = this.potret('tambang') ?? urlAset(SUMBER.goldDiam, this.basis)
    } else if (s.jenis === 'domba') {
      const d = dunia.domba.find((x) => x.id === s.id)
      if (!d) return false
      judul = 'Domba Ternak'
      nilai = d.daging
      maks = 45
      labelBar = `${nilai} Daging`
      detail = 'Sumber Daging • Respawn di Castle & House'
      warnaBar = '#e87a90'
      ikon = this.potret('domba') ?? urlAset(SUMBER.dagingDiam, this.basis)
    } else {
      const dg = dunia.daging.find((x) => x.id === s.id)
      if (!dg) return false
      judul = 'Daging Medan Perang'
      nilai = dg.jumlah
      maks = 40
      labelBar = `+${nilai} Daging`
      detail = `Hilang dalam ${Math.max(1, Math.ceil(dg.sisaDetik))}s`
      warnaBar = '#e06060'
      ikon = this.potret('daging') ?? urlAset(SUMBER.dagingDiam, this.basis)
    }

    this.setPotretSeleksi(ikon)
    this.setHpSeleksi(
      true,
      `${Math.max(0, Math.min(100, (nilai / Math.max(1, maks)) * 100)).toFixed(1)}%`,
      warnaBar,
      labelBar,
    )
    this.setInfoSeleksi(judul, detail)

    const kunciT = `sumber:${s.jenis}:${s.id}`
    if (this.kunciTengah !== kunciT) {
      this.kunciTengah = kunciT
      this.progresSapuan = null
      this.seleksiTengah.textContent = ''
      this.seleksiTengah.append(el('div', 'petunjuk-tengah', petunjuk))
    }
    if (this.kunciAksi !== 'kosong') {
      this.kunciAksi = 'kosong'
      this.seleksiAksi.textContent = ''
      this.skillSapuan = null
      this.risetSapuan.clear()
    }
    return true
  }
}
