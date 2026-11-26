import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_U010_WARNA, DEKO, DEKO_FREE, EDITOR_U010,
  GOBLIN as ASET_GOBLIN, POHON_FREE, SUMBER, TERRAIN, TERRAIN_FREE, frame, type Aset,
} from '@hftf/aset'
import {
  DUNIA_H, DUNIA_W, INFO_BIOMA, INFO_PETA, JENIS_PETA, PETA_BARIS, PETA_KOLOM,
  TILE, TIM_PEMAIN, TINGGI, WARNA_TIM, balikKodeRamp, buatIdPetaCustom, cekValidasiPeta,
  decodeRle, encodeRle, hitungTitikSimetri, type BangunanPetaCustom, type BonusPetaCustom,
  type CampPetaCustom, type DataPetaCustom, type DekoPetaCustom, type EntitasPetaCustom,
  type JenisBangunanCustom, type JenisDekoCustom, type JenisPeta, type ModeSimetri,
  type PohonPetaCustom, type SpawnPetaCustom, type TambangPetaCustom, type TemaBioma,
  type Tinggi, type VarianPohonCustom,
} from '@hftf/shared'
import {
  BANGUNAN, buatTemplatePetaCustom, eksporPetaBawaanKeCustom, serialisasiTerrainCustom,
  tinggiDi, type JenisTemplateCustom, type Terrain,
} from '@hftf/sim'
import {
  PeremajaTerrain, batasiKamera, buatKamera, gambarDekoCustom, gambarDari,
  gambarTim, infoAsetDekoCustom, keDuniaX, keDuniaY, keLayarX, keLayarY, pusatkan, sprite,
  type Kamera,
} from '@hftf/render'
import {
  eksporJsonPeta, hapusPetaCustom, imporJsonPeta, muatDaftarPetaCustom, simpanPetaCustom,
} from '@hftf/ui'

export interface AksiEditor {
  tutupKeLobi(): void
  ujiPeta(data: DataPetaCustom): void
  petaTersimpan?(): void
}

type AlatEditor = 'kuas' | 'isi' | 'hapus' | 'pipet' | 'geser'
type KategoriPalet = 'terrain' | 'sumber' | 'goblin' | 'deko' | 'bangunan'
type BentukKuas = 'bulat' | 'kotak'

type JenisItem =
  | { kat: 'terrain'; mode: 'air' | 'dataran' | 'plateau' | 'puncak' | 'jalan' | 'hapusJalan' | 'rampAuto' | 'rampNS' | 'rampBarat' | 'rampTimur' | 'jembH' | 'jembV' }
  | { kat: 'spawn' }
  | { kat: 'tambang'; jenis: 'mine' | 'node'; varian?: number }
  | { kat: 'hutanAcak' }
  | { kat: 'pohon'; varian: VarianPohonCustom }
  | { kat: 'domba' }
  | { kat: 'bonus'; jenis: 'daging' | 'gold' | 'kayu'; jumlah: number }
  | { kat: 'camp'; jenis: 'kecil' | 'besar' }
  | { kat: 'deko'; jenis: JenisDekoCustom }
  | { kat: 'bangunan'; jenis: JenisBangunanCustom }

interface SnapshotRiwayat {
  bioma: TemaBioma
  tinggiRle: string
  rampRle: string
  jembatanRle: string
  jalanRle: string
  entitasJson: string
}

const MAKS_RIWAYAT = 40

const WARNA_SLOTS = TIM_PEMAIN

const KATALOG_TERRAIN: readonly { id: string; label: string; aset?: Aset; sx?: number; sy?: number; item: JenisItem }[] = [
  { id: 't-air', label: 'Air Laut', aset: TERRAIN.air, item: { kat: 'terrain', mode: 'air' } },
  { id: 't-lv1', label: 'Daratan Lv.1', aset: TERRAIN_FREE.tileHijau, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'dataran' } },
  { id: 't-lv2', label: 'Plateau Lv.2', aset: TERRAIN_FREE.tileHijau, sx: 5 * 64, sy: 0, item: { kat: 'terrain', mode: 'plateau' } },
  { id: 't-lv3', label: 'Puncak Lv.3', aset: TERRAIN_FREE.tileHijau, sx: 7 * 64, sy: 0, item: { kat: 'terrain', mode: 'puncak' } },
  { id: 't-jln', label: 'Jalan Pasir', aset: TERRAIN.tanahDatar, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'jalan' } },
  { id: 't-hjln', label: 'Hapus Jalan', aset: TERRAIN_FREE.tileHijau, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'hapusJalan' } },
  { id: 't-ra', label: 'Tangga Auto', aset: TERRAIN.tanahTinggi, sx: 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampAuto' } },
  { id: 't-rns', label: 'Tangga N/S', aset: TERRAIN.tanahTinggi, sx: 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampNS' } },
  { id: 't-rb', label: 'Tangga Barat', aset: TERRAIN.tanahTinggi, sx: 0, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampBarat' } },
  { id: 't-rt', label: 'Tangga Timur', aset: TERRAIN.tanahTinggi, sx: 2 * 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampTimur' } },
  { id: 't-jh', label: 'Jemb Horiz', aset: TERRAIN.jembatan, sx: 64, sy: 0, item: { kat: 'terrain', mode: 'jembH' } },
  { id: 't-jv', label: 'Jemb Vert', aset: TERRAIN.jembatan, sx: 0, sy: 2 * 64, item: { kat: 'terrain', mode: 'jembV' } },
]

const KATALOG_SUMBER: readonly { id: string; label: string; aset: Aset; item: JenisItem }[] = [
  { id: 's-spawn', label: 'Spawn Pemain', aset: BANGUNAN_BLUE.castle, item: { kat: 'spawn' } },
  { id: 's-mine', label: 'Tambang Emas', aset: SUMBER.tambangAktif, item: { kat: 'tambang', jenis: 'mine' } },
  { id: 's-g1', label: 'Batu Emas 1', aset: DEKO_FREE.batuEmas1, item: { kat: 'tambang', jenis: 'node', varian: 1 } },
  { id: 's-g2', label: 'Batu Emas 2', aset: DEKO_FREE.batuEmas2, item: { kat: 'tambang', jenis: 'node', varian: 2 } },
  { id: 's-g3', label: 'Batu Emas 3', aset: DEKO_FREE.batuEmas3, item: { kat: 'tambang', jenis: 'node', varian: 3 } },
  { id: 's-g4', label: 'Batu Emas 4', aset: DEKO_FREE.batuEmas4, item: { kat: 'tambang', jenis: 'node', varian: 4 } },
  { id: 's-g5', label: 'Batu Emas 5', aset: DEKO_FREE.batuEmas5, item: { kat: 'tambang', jenis: 'node', varian: 5 } },
  { id: 's-g6', label: 'Batu Emas 6', aset: DEKO_FREE.batuEmas6, item: { kat: 'tambang', jenis: 'node', varian: 6 } },
  { id: 's-hutan', label: 'Hutan Acak', aset: POHON_FREE.pinus1, item: { kat: 'hutanAcak' } },
  { id: 's-p1', label: 'Pinus Gelap', aset: POHON_FREE.pinus1, item: { kat: 'pohon', varian: 'pinus1' } },
  { id: 's-p2', label: 'Pinus Cerah', aset: POHON_FREE.pinus2, item: { kat: 'pohon', varian: 'pinus2' } },
  { id: 's-d1', label: 'Pohon Birch', aset: POHON_FREE.daun1, item: { kat: 'pohon', varian: 'daun1' } },
  { id: 's-d2', label: 'Daun Emas', aset: POHON_FREE.daun2, item: { kat: 'pohon', varian: 'daun2' } },
  { id: 's-pk', label: 'Pohon Klasik', aset: SUMBER.pohon, item: { kat: 'pohon', varian: 'klasik' } },
  { id: 's-domba', label: 'Domba', aset: SUMBER.dombaDiam, item: { kat: 'domba' } },
  { id: 's-daging', label: 'Daging +25', aset: SUMBER.dagingDiam, item: { kat: 'bonus', jenis: 'daging', jumlah: 25 } },
  { id: 's-gold', label: 'Gold +150', aset: SUMBER.goldDiam, item: { kat: 'bonus', jenis: 'gold', jumlah: 150 } },
  { id: 's-kayu', label: 'Kayu +150', aset: SUMBER.kayuDiam, item: { kat: 'bonus', jenis: 'kayu', jumlah: 150 } },
]

const KATALOG_GOBLIN: readonly { id: string; label: string; aset: Aset; item: JenisItem }[] = [
  { id: 'g-kecil', label: 'Camp Kecil', aset: ASET_GOBLIN.torch, item: { kat: 'camp', jenis: 'kecil' } },
  { id: 'g-besar', label: 'Camp Boss', aset: ASET_GOBLIN.barrel, item: { kat: 'camp', jenis: 'besar' } },
  { id: 'g-rumah', label: 'Gubuk Goblin', aset: ASET_GOBLIN.rumah, item: { kat: 'deko', jenis: 'gubukGoblin' } },
  { id: 'g-menara', label: 'Menara Goblin', aset: EDITOR_U010.menaraGoblinRed, item: { kat: 'deko', jenis: 'menaraGoblin' } },
  { id: 'g-hancur', label: 'Menara Hancur', aset: EDITOR_U010.menaraGoblinHancur, item: { kat: 'deko', jenis: 'menaraGoblinHancur' } },
  { id: 'g-totem', label: 'Totem Tengkorak', aset: DEKO['deco16']!, item: { kat: 'deko', jenis: 'deco16' } },
  { id: 'g-tb', label: 'Tambang Mati', aset: EDITOR_U010.tambangNonaktif, item: { kat: 'deko', jenis: 'tambangNonaktif' } },
]

const NAMA_DEKO_CUSTOM: readonly [JenisDekoCustom, string][] = [
  ['semak1', 'Semak 1'], ['semak2', 'Semak 2'], ['semak3', 'Semak 3'], ['semak4', 'Semak 4'],
  ['batu1', 'Batu 1'], ['batu2', 'Batu 2'], ['batu3', 'Batu 3'], ['batu4', 'Batu 4'],
  ['batuAir1', 'Karang Air 1'], ['batuAir2', 'Karang Air 2'], ['batuAir3', 'Karang Air 3'], ['batuAir4', 'Karang Air 4'],
  ['tunggul1', 'Tunggul 1'], ['tunggul2', 'Tunggul 2'], ['tunggul3', 'Tunggul 3'], ['tunggul4', 'Tunggul 4'],
  ['api1', 'Api Obor 1'], ['api2', 'Api Obor 2'], ['api3', 'Api Obor 3'], ['bebek', 'Bebek Air'],
  ['awan1', 'Awan 1'], ['awan2', 'Awan 2'], ['awan3', 'Awan 3'], ['awan4', 'Awan 4'],
  ...Array.from({ length: 18 }, (_, i): [JenisDekoCustom, string] => {
    const n = String(i + 1).padStart(2, '0')
    return [`deco${n}` as JenisDekoCustom, `Deko #${n}`]
  }),
]

const KATALOG_BANGUNAN: readonly { id: string; label: string; aset: Aset; jenis: JenisBangunanCustom }[] = [
  { id: 'b-house', label: 'House', aset: BANGUNAN_BLUE.house, jenis: 'house' },
  { id: 'b-tower', label: 'Guard Tower', aset: BANGUNAN_BLUE.tower, jenis: 'tower' },
  { id: 'b-bar', label: 'Barracks', aset: BANGUNAN_BLUE.barracks, jenis: 'barracks' },
  { id: 'b-arc', label: 'Archery', aset: BANGUNAN_BLUE.archery, jenis: 'archery' },
  { id: 'b-mon', label: 'Monastery', aset: BANGUNAN_BLUE.monastery, jenis: 'monastery' },
  { id: 'b-alt', label: 'Altar Hero', aset: BANGUNAN_BLUE.altar, jenis: 'altar' },
]

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

function klonEntitas(e: EntitasPetaCustom): EntitasPetaCustom {
  return JSON.parse(JSON.stringify(e)) as EntitasPetaCustom
}

function asetPohonVarian(v: VarianPohonCustom): { aset: Aset; skala: number; pijak: number } {
  switch (v) {
    case 'klasik': return { aset: SUMBER.pohon, skala: 0.72, pijak: 0.84 }
    case 'pinus2': return { aset: POHON_FREE.pinus2, skala: 0.54, pijak: 0.84 }
    case 'daun1': return { aset: POHON_FREE.daun1, skala: 0.62, pijak: 0.82 }
    case 'daun2': return { aset: POHON_FREE.daun2, skala: 0.62, pijak: 0.82 }
    default: return { aset: POHON_FREE.pinus1, skala: 0.56, pijak: 0.84 }
  }
}

const BATU_EMAS_ASET: readonly Aset[] = [
  DEKO_FREE.batuEmas1, DEKO_FREE.batuEmas2, DEKO_FREE.batuEmas3,
  DEKO_FREE.batuEmas4, DEKO_FREE.batuEmas5, DEKO_FREE.batuEmas6,
]

function asetBangunanEditor(b: BangunanPetaCustom): { aset: Aset; timWarna?: (typeof TIM_PEMAIN)[number] | 'neutral' } {
  if (b.hancur) {
    const h: Record<JenisBangunanCustom, Aset> = {
      house: BANGUNAN_FASE.houseHancur,
      tower: BANGUNAN_FASE.towerHancur,
      barracks: BANGUNAN_FASE.barracksHancur,
      archery: BANGUNAN_FASE.archeryHancur,
      monastery: BANGUNAN_FASE.monasteryHancur,
      altar: BANGUNAN_FASE.altarHancur,
    }
    return { aset: h[b.jenis] }
  }
  const tim = b.slot >= 0 && b.slot < WARNA_SLOTS.length ? WARNA_SLOTS[b.slot]! : 'neutral'
  if ((tim === 'purple' || tim === 'yellow') && (b.jenis === 'house' || b.jenis === 'tower')) {
    return { aset: BANGUNAN_U010_WARNA[tim][b.jenis], timWarna: 'blue' }
  }
  return { aset: BANGUNAN_BLUE[b.jenis], timWarna: tim }
}

/** Menggambar thumbnail sprite 28x28 terpotong rapi ke elemen kanvas mini. */
function gambarIkonMini(kanvas: HTMLCanvasElement, aset: Aset, sxPaksa?: number, syPaksa?: number): void {
  const ctx = kanvas.getContext('2d')
  const im = gambarDari(aset)
  if (!ctx || !im) return
  ctx.clearRect(0, 0, kanvas.width, kanvas.height)
  ctx.imageSmoothingEnabled = false
  const f = sxPaksa !== undefined && syPaksa !== undefined
    ? { sx: sxPaksa, sy: syPaksa, sw: 64, sh: 64 }
    : frame(aset, 0)
  const rasio = Math.min(kanvas.width / f.sw, kanvas.height / f.sh)
  const dw = f.sw * rasio
  const dh = f.sh * rasio
  ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, (kanvas.width - dw) / 2, (kanvas.height - dh) / 2, dw, dh)
}

/**
 * Pengendali penuh Map Editor interaktif (WYSIWYG):
 * - 3 tingkat daratan (Air / Lv.1 / Lv.2 / Lv.3) + 5 Bioma Tilemap_color1..5
 * - Seluruh aset Tiny Swords (pohon, batu emas, camp Goblin, 42 dekorasi, bangunan)
 * - Kuas Simetri (4 arah / Cermin X / Cermin Y / Rotasi 180°), Undo/Redo 40 langkah, Flood Fill
 * - Edit salinan peta bawaan, Simpan ke Lobi, Ekspor/Impor JSON, & Uji Peta 1 Klik!
 */
export class PengendaliEditor {
  readonly akar: HTMLElement
  private inputNama: HTMLInputElement
  private selectSimetri: HTMLSelectElement
  private btnUndo: HTMLButtonElement
  private btnRedo: HTMLButtonElement
  private btnGrid: HTMLButtonElement
  private biomaBtns: HTMLButtonElement[] = []
  private paletDock: HTMLElement
  private kananDock: HTMLElement
  private kontainerAlat: HTMLElement
  private kontainerUkuran: HTMLElement
  private kontainerKonteks: HTMLElement
  private kontainerKat: HTMLElement
  private kontainerItem: HTMLElement
  private kanvasBox: HTMLElement
  private kanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private minimapKanvas: HTMLCanvasElement
  private mctx: CanvasRenderingContext2D | null
  private validasiEl: HTMLElement
  private statistikEl: HTMLElement
  private infoTileEl: HTMLElement
  private zoomLbl: HTMLButtonElement
  private toastEl: HTMLElement
  private modalBg: HTMLElement
  private modalTersimpanEl: HTMLElement
  private inputImpor: HTMLInputElement
  private semuaIkonMini: { k: HTMLCanvasElement; aset: Aset; sx?: number; sy?: number }[] = []

  private terbuka = false
  private idPeta = buatIdPetaCustom()
  private terrain: Terrain
  private entitas: EntitasPetaCustom
  private renderTerrain: PeremajaTerrain
  private kam: Kamera = buatKamera()

  private alat: AlatEditor = 'kuas'
  private kategori: KategoriPalet = 'terrain'
  private itemIdAktif = 't-lv2'
  private itemAktif: JenisItem = { kat: 'terrain', mode: 'plateau' }
  private ukuranKuas = 1
  private bentukKuas: BentukKuas = 'bulat'
  private simetri: ModeSimetri = 'mati'
  private tampilGrid = false
  private slotDipilih = 0
  private bangunanHancur = false
  private hapusTanah = false

  private riwayatUndo: SnapshotRiwayat[] = []
  private riwayatRedo: SnapshotRiwayat[] = []
  private snapSebelumGores: SnapshotRiwayat | null = null
  private goresBerubah = false
  private tergambarPadaGores = new Set<string>()
  private hoverTile: { tx: number; ty: number } | null = null
  private sedangLukis = false
  private sedangHapusCepat = false
  private sedangGeser = false
  private spasiTahan = false
  private geserTerakhir = { x: 0, y: 0 }
  private geserMinimap = false
  private tombolPan = new Set<string>()
  private jariSentuh = new Map<number, { x: number; y: number }>()
  private cubitAwal: { jarak: number; zoom: number } | null = null

  private rafId = 0
  private waktuTerakhirMs = 0
  private toastTimer = 0
  private minimapCache: HTMLCanvasElement | null = null
  private minimapKotor = true
  private ro: ResizeObserver | null = null

  constructor(private aksi: AksiEditor) {
    const awal = buatTemplatePetaCustom('empatPulau', this.idPeta, 'Pulau Kuat 3-Tingkat', Date.now())
    const konv = eksporSiapTerrain(awal)
    this.terrain = konv.terrain
    this.entitas = konv.entitas
    this.renderTerrain = new PeremajaTerrain(this.terrain, { tanpaDekoAcak: true })

    this.akar = el('div')
    this.akar.id = 'editor-peta'

    // === 1. BAR ATAS ===
    const atas = el('div', 'ed-atas')
    const grupKiri = el('div', 'ed-atas-grup')
    const btnLobi = el('button', 'ed-btn', '← Lobi')
    btnLobi.type = 'button'
    btnLobi.addEventListener('click', () => this.tutupKeLobi())

    this.inputNama = el('input', 'ed-nama')
    this.inputNama.value = 'Pulau Kuat 3-Tingkat'
    this.inputNama.maxLength = 36
    this.inputNama.placeholder = 'Nama Peta...'

    const btnBukaModal = el('button', 'ed-btn', '📂 Peta / Impor')
    btnBukaModal.type = 'button'
    btnBukaModal.addEventListener('click', () => this.bukaModalPeta())
    grupKiri.append(btnLobi, this.inputNama, btnBukaModal)

    const grupTengah = el('div', 'ed-atas-grup')
    const biomaBox = el('div', 'ed-bioma-baris')
    biomaBox.title = 'Tema Bioma (Free Pack Tilemap 1..5)'
    for (const bId of [1, 2, 3, 4, 5] as const) {
      const sw = el('button', 'ed-bioma-swatch')
      sw.type = 'button'
      sw.title = `${INFO_BIOMA[bId].nama} — ${INFO_BIOMA[bId].ringkas}`
      sw.style.background = INFO_BIOMA[bId].warnaPlateau
      sw.dataset['bioma'] = String(bId)
      sw.addEventListener('click', () => {
        this.dorongUndo()
        this.terrain.bioma = bId
        this.segarkanBiomaUi()
        this.renderTerrain.kotorkanSemua()
        this.minimapKotor = true
        this.tampilkanToast(`Bioma: ${INFO_BIOMA[bId].nama}`)
      })
      this.biomaBtns.push(sw)
      biomaBox.append(sw)
    }

    this.btnUndo = el('button', 'ed-btn', '↩')
    this.btnUndo.type = 'button'
    this.btnUndo.title = 'Undo (Ctrl+Z)'
    this.btnUndo.addEventListener('click', () => this.undo())

    this.btnRedo = el('button', 'ed-btn', '↪')
    this.btnRedo.type = 'button'
    this.btnRedo.title = 'Redo (Ctrl+Y)'
    this.btnRedo.addEventListener('click', () => this.redo())

    this.selectSimetri = el('select', 'ed-select')
    this.selectSimetri.title = 'Kuas Simetri Cermin / Rotasi'
    for (const [val, label] of [
      ['mati', '🪞 Simetri: Off'],
      ['empatArah', '✚ Simetri: 4-Arah'],
      ['cerminX', '↔ Simetri: Kiri-Kanan'],
      ['cerminY', '↕ Simetri: Atas-Bawah'],
      ['rotasi180', '↻ Simetri: Rotasi 180°'],
    ] as const) {
      const opt = el('option', undefined, label)
      opt.value = val
      this.selectSimetri.append(opt)
    }
    this.selectSimetri.addEventListener('change', () => {
      this.simetri = this.selectSimetri.value as ModeSimetri
      this.tampilkanToast(`Simetri: ${this.selectSimetri.selectedOptions[0]?.textContent ?? this.simetri}`)
    })

    this.btnGrid = el('button', 'ed-btn', '▦ Grid')
    this.btnGrid.type = 'button'
    this.btnGrid.title = 'Tampilkan / sembunyikan grid tile (G)'
    this.btnGrid.addEventListener('click', () => {
      this.tampilGrid = !this.tampilGrid
      this.btnGrid.classList.toggle('aktif', this.tampilGrid)
    })

    grupTengah.append(biomaBox, this.btnUndo, this.btnRedo, this.selectSimetri, this.btnGrid)

    const grupKanan = el('div', 'ed-atas-grup')
    const btnPaletHp = el('button', 'ed-btn ed-mobile-btn', '🧰 Palet')
    btnPaletHp.type = 'button'
    btnPaletHp.addEventListener('click', () => {
      this.kananDock.classList.remove('buka')
      this.paletDock.classList.toggle('buka')
    })
    const btnInfoHp = el('button', 'ed-btn ed-mobile-btn', '🗺️ Info')
    btnInfoHp.type = 'button'
    btnInfoHp.addEventListener('click', () => {
      this.paletDock.classList.remove('buka')
      this.kananDock.classList.toggle('buka')
    })

    const btnUji = el('button', 'ed-btn cta', '▶ Uji Peta')
    btnUji.type = 'button'
    btnUji.addEventListener('click', () => this.ujiPetaSekarang())

    const btnSimpan = el('button', 'ed-btn simpan', '💾 Simpan')
    btnSimpan.type = 'button'
    btnSimpan.addEventListener('click', () => this.simpanSekarang())

    grupKanan.append(btnPaletHp, btnInfoHp, btnUji, btnSimpan)
    atas.append(grupKiri, grupTengah, grupKanan)
    this.akar.append(atas)

    // === 2. BADAN UTAMA (PALET KIRI | KANVAS TENGAH | MINIMAP & VALIDASI KANAN) ===
    const badan = el('div', 'ed-badan')

    // 2a. Dock Palet Kiri
    this.paletDock = el('aside', 'ed-palet buka')
    const boxAlat = el('div', 'ed-subkotak')
    boxAlat.append(el('div', 'ed-label', 'Alat Lukis'))
    this.kontainerAlat = el('div', 'ed-alat-baris')
    for (const [id, ikon, tip] of [
      ['kuas', '🖌️', 'Kuas Lukis (B)'],
      ['isi', '🪣', 'Ember Isi Terrain (F)'],
      ['hapus', '🧹', 'Hapus Entitas / Terrain (E)'],
      ['pipet', '💧', 'Pipet Ambil Contoh (I)'],
      ['geser', '✋', 'Geser Kamera (Spasi)'],
    ] as const) {
      const b = el('button', 'ed-btn', ikon)
      b.type = 'button'
      b.title = tip
      b.dataset['alat'] = id
      b.addEventListener('click', () => this.setAlat(id))
      this.kontainerAlat.append(b)
    }
    boxAlat.append(this.kontainerAlat)

    this.kontainerUkuran = el('div', 'ed-ukuran-baris')
    for (const sz of [1, 3, 5, 7]) {
      const b = el('button', 'ed-btn', `${sz}×${sz}`)
      b.type = 'button'
      b.dataset['ukuran'] = String(sz)
      b.addEventListener('click', () => {
        this.ukuranKuas = sz
        this.segarkanAlatUi()
      })
      this.kontainerUkuran.append(b)
    }
    const btnBentuk = el('button', 'ed-btn', '● Bulat')
    btnBentuk.type = 'button'
    btnBentuk.dataset['bentuk'] = '1'
    btnBentuk.addEventListener('click', () => {
      this.bentukKuas = this.bentukKuas === 'bulat' ? 'kotak' : 'bulat'
      btnBentuk.textContent = this.bentukKuas === 'bulat' ? '● Bulat' : '■ Kotak'
    })
    this.kontainerUkuran.append(btnBentuk)
    boxAlat.append(this.kontainerUkuran)

    this.kontainerKonteks = el('div')
    boxAlat.append(this.kontainerKonteks)
    this.paletDock.append(boxAlat)

    // Kategori Palet (5 tab)
    const boxKat = el('div', 'ed-subkotak')
    this.kontainerKat = el('div', 'ed-kat-tabs')
    for (const [k, ikon, tip] of [
      ['terrain', '⛰️', 'Terrain, Elevasi 3 Tingkat, Tangga, Jembatan'],
      ['sumber', '⛏️', 'Spawn, Tambang Emas, Pohon, Domba'],
      ['goblin', '👹', 'Camp & Bangunan Goblin'],
      ['deko', '🌿', 'Semak, Batu, Karang, Api, Bebek, Deko'],
      ['bangunan', '🏰', 'Bangunan & Reruntuhan'],
    ] as const) {
      const b = el('button', 'ed-kat-btn', ikon)
      b.type = 'button'
      b.title = tip
      b.dataset['kat'] = k
      b.addEventListener('click', () => {
        this.kategori = k
        this.renderPaletItem()
      })
      this.kontainerKat.append(b)
    }
    this.kontainerItem = el('div', 'ed-item-grid')
    boxKat.append(this.kontainerKat, this.kontainerItem)
    this.paletDock.append(boxKat)

    // 2b. Panggung Kanvas Tengah
    this.kanvasBox = el('div', 'ed-panggung')
    this.kanvas = el('canvas', 'ed-kanvas')
    this.ctx = this.kanvas.getContext('2d', { alpha: false })

    const zoomPil = el('div', 'ed-zoom-pil')
    const btnZMin = el('button', 'ed-btn', '−')
    btnZMin.type = 'button'
    btnZMin.addEventListener('click', () => this.ubahZoom(this.kam.zoom * 0.8))
    this.zoomLbl = el('button', 'ed-btn', '65%')
    this.zoomLbl.type = 'button'
    this.zoomLbl.title = 'Klik untuk reset zoom 100%'
    this.zoomLbl.addEventListener('click', () => this.ubahZoom(1))
    const btnZPlus = el('button', 'ed-btn', '+')
    btnZPlus.type = 'button'
    btnZPlus.addEventListener('click', () => this.ubahZoom(this.kam.zoom * 1.25))
    const btnTengah = el('button', 'ed-btn', '⌖')
    btnTengah.type = 'button'
    btnTengah.title = 'Pusatkan kamera ke tengah peta'
    btnTengah.addEventListener('click', () => pusatkan(this.kam, DUNIA_W / 2, DUNIA_H / 2))
    zoomPil.append(btnZMin, this.zoomLbl, btnZPlus, btnTengah)

    this.toastEl = el('div', 'ed-toast')
    this.kanvasBox.append(this.kanvas, zoomPil, this.toastEl)

    // 2c. Dock Kanan (Minimap Live + Validasi + Pintasan)
    this.kananDock = el('aside', 'ed-kanan')
    const miniBox = el('div', 'ed-minimap-box')
    this.minimapKanvas = el('canvas', 'ed-minimap')
    this.minimapKanvas.width = 192
    this.minimapKanvas.height = 192
    this.mctx = this.minimapKanvas.getContext('2d', { alpha: false })
    miniBox.append(this.minimapKanvas)

    const validBox = el('div', 'ed-subkotak')
    validBox.append(el('div', 'ed-label', 'Validasi Peta'))
    this.validasiEl = el('div', 'ed-valid')
    validBox.append(this.validasiEl)

    const statBox = el('div', 'ed-subkotak')
    statBox.append(el('div', 'ed-label', 'Isi Peta'))
    this.statistikEl = el('div', 'ed-pintasan')
    statBox.append(this.statistikEl)

    const tipBox = el('div', 'ed-subkotak')
    tipBox.append(el('div', 'ed-label', 'Info & Pintasan'))
    this.infoTileEl = el('div', 'ed-pintasan', 'Arahkan kursor ke peta')
    const pintasanEl = el(
      'div',
      'ed-pintasan',
      '• Klik kanan: hapus cepat\n• R: putar tangga/jembatan\n• Spasi / WASD / 2 Jari: geser & zoom\n• Ctrl+Z / Ctrl+Y: Undo/Redo',
    )
    pintasanEl.style.whiteSpace = 'pre-line'
    tipBox.append(this.infoTileEl, pintasanEl)

    this.kananDock.append(miniBox, validBox, statBox, tipBox)
    badan.append(this.paletDock, this.kanvasBox, this.kananDock)
    this.akar.append(badan)

    // === 3. MODAL BUKA / TEMPLATE / IMPOR / EKSPOR ===
    this.modalBg = el('div', 'ed-modal-bg')
    const modal = el('div', 'ed-modal')
    const modHead = el('div', 'ed-modal-kepala')
    const btnTutupMod = el('button', 'ed-btn bahaya', '✕ Tutup')
    btnTutupMod.type = 'button'
    btnTutupMod.addEventListener('click', () => this.modalBg.classList.remove('tampil'))
    modHead.append(el('h2', undefined, '📂 Buka, Template, & Ekspor Peta'), btnTutupMod)
    modal.append(modHead)

    // Salinan peta bawaan
    const secBawaan = el('div')
    secBawaan.append(el('h3', undefined, 'Edit Salinan Peta Bawaan (Semua Aset Utuh)'))
    const gridBawaan = el('div', 'ed-modal-grid')
    for (const id of JENIS_PETA) {
      const btn = el('button', 'ed-btn', `🗺️ ${INFO_PETA[id].nama}`)
      btn.type = 'button'
      btn.addEventListener('click', () => {
        const salin = eksporPetaBawaanKeCustom(id, 42, buatIdPetaCustom(), `${INFO_PETA[id].nama} (Edit)`, Date.now())
        this.muatData(salin)
        this.modalBg.classList.remove('tampil')
        this.tampilkanToast(`Salinan "${INFO_PETA[id].nama}" siap diedit!`)
      })
      gridBawaan.append(btn)
    }
    secBawaan.append(gridBawaan)

    // Template kosong / baru
    const secTmpl = el('div')
    secTmpl.append(el('h3', undefined, 'Buat dari Template Baru'))
    const gridTmpl = el('div', 'ed-modal-grid')
    for (const [tpl, lbl] of [
      ['empatPulau', '🏔️ 4 Pulau 3-Tingkat'],
      ['pulau', '🌿 Pulau Datar 2P'],
      ['laut', '🌊 Lautan Kosong'],
    ] as readonly [JenisTemplateCustom, string][]) {
      const btn = el('button', 'ed-btn', lbl)
      btn.type = 'button'
      btn.addEventListener('click', () => {
        const baru = buatTemplatePetaCustom(tpl, buatIdPetaCustom(), lbl.replace(/^[^\s]+\s/, ''), Date.now())
        this.muatData(baru)
        this.modalBg.classList.remove('tampil')
        this.tampilkanToast(`Template baru "${baru.nama}" dibuka`)
      })
      gridTmpl.append(btn)
    }
    secTmpl.append(gridTmpl)

    // Impor / Ekspor JSON
    const secFile = el('div')
    secFile.append(el('h3', undefined, 'Berkas Peta (.json)'))
    const barisFile = el('div', 'ed-atas-grup')
    this.inputImpor = el('input')
    this.inputImpor.type = 'file'
    this.inputImpor.accept = '.json,application/json'
    this.inputImpor.style.display = 'none'
    this.inputImpor.addEventListener('change', () => {
      const berkas = this.inputImpor.files?.[0]
      if (!berkas) return
      void berkas.text().then((teks) => {
        const res = imporJsonPeta(teks)
        this.inputImpor.value = ''
        if (!res.ok) {
          this.tampilkanToast(res.galat, true)
          return
        }
        this.muatData({ ...res.data, id: buatIdPetaCustom(), diubahPada: Date.now() })
        this.modalBg.classList.remove('tampil')
        this.tampilkanToast(`Berhasil mengimpor "${res.data.nama}"!`)
      })
    })
    const btnImpor = el('button', 'ed-btn', '📥 Impor JSON')
    btnImpor.type = 'button'
    btnImpor.addEventListener('click', () => this.inputImpor.click())

    const btnEkspor = el('button', 'ed-btn simpan', '📤 Unduh JSON')
    btnEkspor.type = 'button'
    btnEkspor.addEventListener('click', () => this.unduhJson())
    barisFile.append(this.inputImpor, btnImpor, btnEkspor)
    secFile.append(barisFile)

    // Peta tersimpan
    const secSimpan = el('div')
    secSimpan.append(el('h3', undefined, 'Peta Tersimpan Saya'))
    this.modalTersimpanEl = el('div', 'ed-atas-grup')
    this.modalTersimpanEl.style.flexDirection = 'column'
    this.modalTersimpanEl.style.alignItems = 'stretch'
    secSimpan.append(this.modalTersimpanEl)

    modal.append(secBawaan, secTmpl, secFile, secSimpan)
    this.modalBg.append(modal)
    this.modalBg.addEventListener('click', (e) => {
      if (e.target === this.modalBg) this.modalBg.classList.remove('tampil')
    })
    this.akar.append(this.modalBg)

    document.body.append(this.akar)

    this.pasangEvent()
    this.segarkanBiomaUi()
    this.segarkanAlatUi()
    this.renderPaletItem()
    this.perbaruiValidasiUi()
    this.ukurKanvas()
    pusatkan(this.kam, DUNIA_W / 2, DUNIA_H / 2)
    this.kam.zoom = 0.6
    pusatkan(this.kam, DUNIA_W / 2, DUNIA_H / 2)
  }

  get aktif(): boolean {
    return this.terbuka
  }

  get dataSekarang(): DataPetaCustom {
    const nama = this.inputNama.value.trim() || 'Peta Custom'
    return serialisasiTerrainCustom(
      this.terrain,
      { id: this.idPeta, nama, diubahPada: Date.now() },
      klonEntitas(this.entitas),
    )
  }

  buka(dataAwal?: DataPetaCustom): void {
    if (dataAwal) {
      this.muatData(dataAwal)
    }
    this.terbuka = true
    this.akar.classList.add('tampil')
    this.ukurKanvas()
    this.segarkanSemuaIkonMini()
    this.renderTerrain.kotorkanSemua()
    this.minimapKotor = true
    this.mulaiLoop()
  }

  tutup(): void {
    this.terbuka = false
    this.akar.classList.remove('tampil')
    this.modalBg.classList.remove('tampil')
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  private tutupKeLobi(): void {
    this.tutup()
    this.aksi.tutupKeLobi()
  }

  private muatData(data: DataPetaCustom): void {
    this.idPeta = data.id || buatIdPetaCustom()
    this.inputNama.value = data.nama
    const total = PETA_KOLOM * PETA_BARIS
    this.terrain = {
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggi: decodeRle(data.tinggiRle, total, TINGGI.puncak),
      ramp: decodeRle(data.rampRle, total, 3),
      jembatan: decodeRle(data.jembatanRle, total, 2),
      jalan: decodeRle(data.jalanRle, total, 1),
      bioma: data.bioma,
    }
    this.entitas = klonEntitas(data.entitas)
    this.riwayatUndo = []
    this.riwayatRedo = []
    this.renderTerrain.setTerrain(this.terrain, true)
    this.minimapKotor = true
    this.segarkanBiomaUi()
    this.segarkanAlatUi()
    this.perbaruiValidasiUi()
    pusatkan(this.kam, DUNIA_W / 2, DUNIA_H / 2)
  }

  private simpanSekarang(): DataPetaCustom {
    const data = this.dataSekarang
    simpanPetaCustom(data)
    this.aksi.petaTersimpan?.()
    this.tampilkanToast(`✔ Tersimpan: "${data.nama}" — siap dimainkan dari Lobi!`)
    return data
  }

  private ujiPetaSekarang(): void {
    const data = this.dataSekarang
    const cek = cekValidasiPeta(data)
    if (!cek.siapMain) {
      this.perbaruiValidasiUi()
      this.kananDock.classList.add('buka')
      this.tampilkanToast(cek.galat[0] ?? 'Perbaiki validasi peta sebelum Uji Peta!', true)
      return
    }
    simpanPetaCustom(data)
    this.aksi.petaTersimpan?.()
    this.tutup()
    this.aksi.ujiPeta(data)
  }

  private unduhJson(): void {
    const data = this.dataSekarang
    const teks = eksporJsonPeta(data)
    const blob = new Blob([teks], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `${data.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'peta'}.json`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1500)
    this.tampilkanToast(`Diekspor: ${a.download}`)
  }

  private bukaModalPeta(): void {
    this.modalTersimpanEl.textContent = ''
    const daftar = muatDaftarPetaCustom()
    if (daftar.length === 0) {
      this.modalTersimpanEl.append(
        el('div', 'ed-pintasan', 'Belum ada peta tersimpan. Klik "💾 Simpan" untuk menyimpan peta ini.'),
      )
    } else {
      for (const m of daftar) {
        const row = el('div', 'ed-tersimpan-row')
        const jmlSpawn = Math.max(2, m.entitas.spawn.length)
        const info = el('span', 'ed-pintasan', `🗺️ ${m.nama} · Maks ${jmlSpawn}P · Bioma ${m.bioma}`)
        const aksiBox = el('div', 'ed-atas-grup')
        const btnBuka = el('button', 'ed-btn', 'Buka')
        btnBuka.type = 'button'
        btnBuka.addEventListener('click', () => {
          this.muatData(m)
          this.modalBg.classList.remove('tampil')
          this.tampilkanToast(`Dibuka: "${m.nama}"`)
        })
        const btnHapus = el('button', 'ed-btn bahaya', '🗑')
        btnHapus.type = 'button'
        btnHapus.title = 'Hapus peta'
        btnHapus.addEventListener('click', () => {
          hapusPetaCustom(m.id)
          this.aksi.petaTersimpan?.()
          this.bukaModalPeta()
        })
        aksiBox.append(btnBuka, btnHapus)
        row.append(info, aksiBox)
        this.modalTersimpanEl.append(row)
      }
    }
    this.modalBg.classList.add('tampil')
  }

  private setAlat(a: AlatEditor): void {
    this.alat = a
    this.kanvas.style.cursor = a === 'geser' ? 'grab' : a === 'pipet' ? 'copy' : 'crosshair'
    this.segarkanAlatUi()
  }

  private segarkanBiomaUi(): void {
    const b = this.terrain.bioma ?? 1
    for (const btn of this.biomaBtns) {
      btn.classList.toggle('aktif', Number(btn.dataset['bioma']) === b)
    }
  }

  private segarkanAlatUi(): void {
    for (const b of Array.from(this.kontainerAlat.children) as HTMLElement[]) {
      b.classList.toggle('aktif', b.dataset['alat'] === this.alat)
    }
    for (const b of Array.from(this.kontainerUkuran.children) as HTMLElement[]) {
      if (b.dataset['ukuran']) {
        b.classList.toggle('aktif', Number(b.dataset['ukuran']) === this.ukuranKuas)
      }
    }
    this.btnUndo.disabled = this.riwayatUndo.length === 0
    this.btnRedo.disabled = this.riwayatRedo.length === 0
    this.zoomLbl.textContent = `${Math.round(this.kam.zoom * 100)}%`
    this.renderKonteksAlat()
  }

  private renderKonteksAlat(): void {
    this.kontainerKonteks.textContent = ''
    if (this.alat === 'hapus') {
      const btn = el('button', `ed-btn${this.hapusTanah ? ' aktif' : ''}`, this.hapusTanah ? 'Mode Hapus: Entitas + Tanah→Air' : 'Mode Hapus: Entitas & Jalan Saja')
      btn.type = 'button'
      btn.style.width = '100%'
      btn.style.marginTop = '4px'
      btn.addEventListener('click', () => {
        this.hapusTanah = !this.hapusTanah
        this.renderKonteksAlat()
      })
      this.kontainerKonteks.append(btn)
      return
    }
    if (this.itemAktif.kat === 'spawn' || this.itemAktif.kat === 'bangunan') {
      const box = el('div', 'ed-slot-baris')
      box.style.marginTop = '4px'
      if (this.itemAktif.kat === 'bangunan') {
        const btnNet = el('button', `ed-slot-dot${this.slotDipilih === -1 ? ' aktif' : ''}`, 'N')
        btnNet.type = 'button'
        btnNet.title = 'Netral'
        btnNet.style.background = '#7d7360'
        btnNet.addEventListener('click', () => { this.slotDipilih = -1; this.renderKonteksAlat() })
        box.append(btnNet)
      } else if (this.slotDipilih < 0) {
        this.slotDipilih = 0
      }
      for (let i = 0; i < WARNA_SLOTS.length; i++) {
        const tim = WARNA_SLOTS[i]!
        const b = el('button', `ed-slot-dot${this.slotDipilih === i ? ' aktif' : ''}`, `P${i + 1}`)
        b.type = 'button'
        b.title = `Pemain ${i + 1} (${WARNA_TIM[tim].nama})`
        b.style.background = WARNA_TIM[tim].utama
        b.addEventListener('click', () => {
          this.slotDipilih = i
          this.renderKonteksAlat()
        })
        box.append(b)
      }
      this.kontainerKonteks.append(box)

      if (this.itemAktif.kat === 'bangunan') {
        const btnH = el('button', `ed-btn${this.bangunanHancur ? ' aktif' : ''}`, this.bangunanHancur ? 'Fase: Reruntuhan' : 'Fase: Bangunan Utuh')
        btnH.type = 'button'
        btnH.style.width = '100%'
        btnH.style.marginTop = '4px'
        btnH.addEventListener('click', () => {
          this.bangunanHancur = !this.bangunanHancur
          this.renderKonteksAlat()
        })
        this.kontainerKonteks.append(btnH)
      }
    }
  }

  private renderPaletItem(): void {
    for (const b of Array.from(this.kontainerKat.children) as HTMLElement[]) {
      b.classList.toggle('aktif', b.dataset['kat'] === this.kategori)
    }
    this.kontainerItem.textContent = ''
    this.semuaIkonMini = []

    const tambahTombol = (id: string, label: string, aset: Aset | undefined, item: JenisItem, sx?: number, sy?: number): void => {
      const btn = el('button', `ed-item-btn${this.itemIdAktif === id ? ' aktif' : ''}`)
      btn.type = 'button'
      btn.dataset['itemId'] = id
      btn.title = label
      const k = el('canvas')
      k.width = 28
      k.height = 28
      if (aset) {
        gambarIkonMini(k, aset, sx, sy)
        this.semuaIkonMini.push({
          k, aset,
          ...(sx !== undefined ? { sx } : {}),
          ...(sy !== undefined ? { sy } : {}),
        })
      }
      btn.append(k, el('span', undefined, label))
      btn.addEventListener('click', () => {
        this.itemIdAktif = id
        this.itemAktif = item
        if (this.alat === 'geser' || this.alat === 'hapus' || this.alat === 'pipet') {
          this.setAlat('kuas')
        }
        this.segarkanPilihanItemUi()
        this.renderKonteksAlat()
      })
      this.kontainerItem.append(btn)
    }

    if (this.kategori === 'terrain') {
      for (const it of KATALOG_TERRAIN) tambahTombol(it.id, it.label, it.aset, it.item, it.sx, it.sy)
    } else if (this.kategori === 'sumber') {
      for (const it of KATALOG_SUMBER) tambahTombol(it.id, it.label, it.aset, it.item)
    } else if (this.kategori === 'goblin') {
      for (const it of KATALOG_GOBLIN) tambahTombol(it.id, it.label, it.aset, it.item)
    } else if (this.kategori === 'deko') {
      for (const [jenis, label] of NAMA_DEKO_CUSTOM) {
        tambahTombol(`dk-${jenis}`, label, infoAsetDekoCustom(jenis).aset, { kat: 'deko', jenis })
      }
    } else {
      for (const it of KATALOG_BANGUNAN) {
        tambahTombol(it.id, it.label, it.aset, { kat: 'bangunan', jenis: it.jenis })
      }
    }
  }

  private segarkanPilihanItemUi(): void {
    for (const b of Array.from(this.kontainerItem.children) as HTMLElement[]) {
      b.classList.toggle('aktif', b.dataset['itemId'] === this.itemIdAktif)
    }
  }

  private segarkanSemuaIkonMini(): void {
    for (const item of this.semuaIkonMini) {
      gambarIkonMini(item.k, item.aset, item.sx, item.sy)
    }
  }

  // --- Undo / Redo ---

  private tangkapSnapshot(): SnapshotRiwayat {
    return {
      bioma: this.terrain.bioma ?? 1,
      tinggiRle: encodeRle(this.terrain.tinggi),
      rampRle: encodeRle(this.terrain.ramp),
      jembatanRle: encodeRle(this.terrain.jembatan),
      jalanRle: encodeRle(this.terrain.jalan),
      entitasJson: JSON.stringify(this.entitas),
    }
  }

  private pulihkanSnapshot(s: SnapshotRiwayat): void {
    const total = PETA_KOLOM * PETA_BARIS
    this.terrain.bioma = s.bioma
    this.terrain.tinggi.set(decodeRle(s.tinggiRle, total, TINGGI.puncak))
    this.terrain.ramp.set(decodeRle(s.rampRle, total, 3))
    this.terrain.jembatan.set(decodeRle(s.jembatanRle, total, 2))
    this.terrain.jalan.set(decodeRle(s.jalanRle, total, 1))
    this.entitas = JSON.parse(s.entitasJson) as EntitasPetaCustom
    this.renderTerrain.kotorkanSemua()
    this.minimapKotor = true
    this.segarkanBiomaUi()
    this.segarkanAlatUi()
    this.perbaruiValidasiUi()
  }

  private dorongUndo(): void {
    this.riwayatUndo.push(this.tangkapSnapshot())
    if (this.riwayatUndo.length > MAKS_RIWAYAT) this.riwayatUndo.shift()
    this.riwayatRedo = []
    this.segarkanAlatUi()
  }

  private undo(): void {
    const s = this.riwayatUndo.pop()
    if (!s) return
    this.riwayatRedo.push(this.tangkapSnapshot())
    this.pulihkanSnapshot(s)
    this.tampilkanToast('↩ Undo')
  }

  private redo(): void {
    const s = this.riwayatRedo.pop()
    if (!s) return
    this.riwayatUndo.push(this.tangkapSnapshot())
    this.pulihkanSnapshot(s)
    this.tampilkanToast('↪ Redo')
  }

  // --- Aplikasi Kuas, Flood Fill, Hapus, & Pipet ---

  private daftarOffsetKuas(ukuran: number, bentuk: BentukKuas): readonly [number, number][] {
    const r = Math.floor(ukuran / 2)
    if (r <= 0) return [[0, 0]]
    const out: [number, number][] = []
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (bentuk === 'bulat' && dx * dx + dy * dy > r * r + 0.35) continue
        out.push([dx, dy])
      }
    }
    return out
  }

  private tileDalamBatas(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < PETA_KOLOM && ty < PETA_BARIS
  }

  private kuasDi(tx: number, ty: number, paksaHapus = false): void {
    if (!this.tileDalamBatas(tx, ty)) return
    const alat = paksaHapus ? 'hapus' : this.alat
    if (alat === 'pipet') {
      this.ambilPipet(tx, ty)
      return
    }
    if (alat === 'isi') {
      this.isiBanjir(tx, ty)
      return
    }

    const titikSim = hitungTitikSimetri(tx, ty, PETA_KOLOM, PETA_BARIS, this.simetri)
    if (alat === 'hapus') {
      this.hapusDiTitik(titikSim)
      return
    }

    if (this.itemAktif.kat === 'terrain') {
      const mode = this.itemAktif.mode
      const offsets = this.daftarOffsetKuas(this.ukuranKuas, this.bentukKuas)
      let minX = PETA_KOLOM, minY = PETA_BARIS, maxX = -1, maxY = -1
      for (const s of titikSim) {
        for (const [dx, dy] of offsets) {
          const x = s.tx + dx
          const y = s.ty + dy
          if (!this.tileDalamBatas(x, y)) continue
          const k = `${x},${y}`
          if (this.tergambarPadaGores.has(k)) continue
          this.tergambarPadaGores.add(k)
          if (this.terapkanTerrainTile(x, y, mode, s.balikX)) {
            this.goresBerubah = true
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
        }
      }
      if (maxX >= 0) {
        this.renderTerrain.kotorkanArea(minX, minY, maxX, maxY)
        this.minimapKotor = true
      }
      return
    }

    if (this.itemAktif.kat === 'hutanAcak') {
      const offsets = this.daftarOffsetKuas(this.ukuranKuas, this.bentukKuas)
      const vars: readonly VarianPohonCustom[] = ['pinus1', 'pinus2', 'daun1', 'daun2']
      for (const s of titikSim) {
        for (const [dx, dy] of offsets) {
          const x = s.tx + dx
          const y = s.ty + dy
          if (!this.tileDalamBatas(x, y)) continue
          const idx = y * PETA_KOLOM + x
          if (this.terrain.tinggi[idx] === TINGGI.air || this.terrain.jembatan[idx]! > 0 || this.terrain.ramp[idx]! > 0) continue
          if (this.entitas.pohon.some((p) => Math.hypot(p.tx - x, p.ty - y) < 1.35)) continue
          const acak = Math.abs((x * 73856093) ^ (y * 19349663)) % 10
          if (this.ukuranKuas > 1 && acak >= 5) continue
          this.entitas.pohon.push({ tx: x, ty: y, varian: vars[acak % vars.length]!, kayu: 120 })
          this.goresBerubah = true
        }
      }
      if (this.goresBerubah) this.minimapKotor = true
      return
    }

    // Penempatan entitas tunggal per stroke per tile
    const kSim = `${tx},${ty}`
    if (this.tergambarPadaGores.has(kSim)) return
    this.tergambarPadaGores.add(kSim)

    if (this.itemAktif.kat === 'spawn') {
      const baseSlot = Math.max(0, this.slotDipilih)
      titikSim.forEach((s, i) => {
        if (this.terrain.tinggi[s.ty * PETA_KOLOM + s.tx] === TINGGI.air) {
          this.terrain.tinggi[s.ty * PETA_KOLOM + s.tx] = TINGGI.dataran
          this.renderTerrain.kotorkanArea(s.tx, s.ty, s.tx, s.ty)
        }
        const sl = (baseSlot + i) % 6
        this.entitas.spawn = this.entitas.spawn.filter((sp) => sp.slot !== sl && !(sp.tx === s.tx && sp.ty === s.ty))
        this.entitas.spawn.push({ slot: sl, tx: s.tx, ty: s.ty })
        this.entitas.spawn.sort((a, b) => a.slot - b.slot)
        this.goresBerubah = true
      })
      this.minimapKotor = true
      return
    }

    for (const s of titikSim) {
      this.taruhEntitasDi(s.tx, s.ty, this.itemAktif)
    }
    if (this.goresBerubah) this.minimapKotor = true
  }

  private taruhEntitasDi(tx: number, ty: number, item: JenisItem): void {
    const idx = ty * PETA_KOLOM + tx
    const lv = this.terrain.tinggi[idx]!
    const bolehAtasAir = item.kat === 'deko' && (
      item.jenis.startsWith('batuAir') || item.jenis === 'bebek' || item.jenis.startsWith('awan')
    )
    if (lv === TINGGI.air && !bolehAtasAir) return

    switch (item.kat) {
      case 'tambang':
        this.entitas.tambang = this.entitas.tambang.filter((m) => !(m.tx === tx && m.ty === ty))
        this.entitas.tambang.push({
          tx, ty, jenis: item.jenis,
          gold: item.jenis === 'mine' ? 3500 : 1200,
          ...(item.varian !== undefined ? { varian: item.varian } : {}),
        })
        this.goresBerubah = true
        break
      case 'pohon':
        this.entitas.pohon = this.entitas.pohon.filter((p) => !(p.tx === tx && p.ty === ty))
        this.entitas.pohon.push({ tx, ty, varian: item.varian, kayu: 120 })
        this.goresBerubah = true
        break
      case 'domba':
        this.entitas.domba = this.entitas.domba.filter((d) => !(d.tx === tx && d.ty === ty))
        this.entitas.domba.push({ tx, ty })
        this.goresBerubah = true
        break
      case 'bonus':
        this.entitas.bonus = this.entitas.bonus.filter((b) => !(b.tx === tx && b.ty === ty))
        this.entitas.bonus.push({ tx, ty, jenis: item.jenis, jumlah: item.jumlah })
        this.goresBerubah = true
        break
      case 'camp':
        this.entitas.camp = this.entitas.camp.filter((c) => !(c.tx === tx && c.ty === ty))
        this.entitas.camp.push({ tx, ty, jenis: item.jenis })
        this.goresBerubah = true
        break
      case 'deko':
        this.entitas.deko = this.entitas.deko.filter((d) => !(d.tx === tx && d.ty === ty && d.jenis === item.jenis))
        this.entitas.deko.push({ tx, ty, jenis: item.jenis })
        this.goresBerubah = true
        break
      case 'bangunan':
        this.entitas.bangunan = this.entitas.bangunan.filter((b) => !(b.tx === tx && b.ty === ty))
        this.entitas.bangunan.push({
          tx, ty, jenis: item.jenis, slot: this.slotDipilih,
          ...(this.bangunanHancur ? { hancur: true } : {}),
        })
        this.goresBerubah = true
        break
    }
  }

  private deteksiArahRampAuto(tx: number, ty: number): 1 | 2 | 3 {
    const h = this.terrain.tinggi[ty * PETA_KOLOM + tx]!
    const kiri = tinggiDi(this.terrain, tx - 1, ty) < h
    const kanan = tinggiDi(this.terrain, tx + 1, ty) < h
    const atas = tinggiDi(this.terrain, tx, ty - 1) < h
    const bawah = tinggiDi(this.terrain, tx, ty + 1) < h
    if ((kiri || kanan) && !atas && !bawah) return kiri ? 2 : 3
    // Periksa juga tangga kiri/kanan di atas/bawah supaya lebar tangga konsisten
    if (ty > 0 && (this.terrain.ramp[(ty - 1) * PETA_KOLOM + tx] ?? 0) >= 2) {
      return this.terrain.ramp[(ty - 1) * PETA_KOLOM + tx] as 2 | 3
    }
    if (ty + 1 < PETA_BARIS && (this.terrain.ramp[(ty + 1) * PETA_KOLOM + tx] ?? 0) >= 2) {
      return this.terrain.ramp[(ty + 1) * PETA_KOLOM + tx] as 2 | 3
    }
    return 1
  }

  private terapkanTerrainTile(
    tx: number, ty: number,
    mode: Extract<JenisItem, { kat: 'terrain' }>['mode'],
    balikX: boolean,
  ): boolean {
    const idx = ty * PETA_KOLOM + tx
    const hLama = this.terrain.tinggi[idx]!
    const rLama = this.terrain.ramp[idx]!
    const jLama = this.terrain.jembatan[idx]!
    const jlnLama = this.terrain.jalan[idx]!

    switch (mode) {
      case 'air':
        this.terrain.tinggi[idx] = TINGGI.air
        this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.bersihkanEntitasAtasAir(tx, ty)
        break
      case 'dataran':
        this.terrain.tinggi[idx] = TINGGI.dataran
        this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'plateau':
        this.terrain.tinggi[idx] = TINGGI.plateau
        if (hLama !== TINGGI.plateau) this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'puncak':
        this.terrain.tinggi[idx] = TINGGI.puncak
        if (hLama !== TINGGI.puncak) this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'jalan':
        if (hLama !== TINGGI.air && jLama === 0 && rLama === 0) this.terrain.jalan[idx] = 1
        break
      case 'hapusJalan':
        this.terrain.jalan[idx] = 0
        break
      case 'rampAuto': {
        const targetLv = hLama >= TINGGI.plateau ? hLama : TINGGI.plateau
        this.terrain.tinggi[idx] = targetLv
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.terrain.ramp[idx] = this.deteksiArahRampAuto(tx, ty)
        break
      }
      case 'rampNS':
        this.terrain.tinggi[idx] = hLama >= TINGGI.plateau ? hLama : TINGGI.plateau
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.terrain.ramp[idx] = 1
        break
      case 'rampBarat':
      case 'rampTimur': {
        this.terrain.tinggi[idx] = hLama >= TINGGI.plateau ? hLama : TINGGI.plateau
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        const kode = mode === 'rampBarat' ? 2 : 3
        this.terrain.ramp[idx] = balikKodeRamp(kode, balikX)
        break
      }
      case 'jembH':
      case 'jembV':
        this.terrain.tinggi[idx] = TINGGI.dataran
        this.terrain.ramp[idx] = 0
        this.terrain.jalan[idx] = 0
        this.terrain.jembatan[idx] = mode === 'jembH' ? 1 : 2
        break
    }
    return (
      this.terrain.tinggi[idx] !== hLama ||
      this.terrain.ramp[idx] !== rLama ||
      this.terrain.jembatan[idx] !== jLama ||
      this.terrain.jalan[idx] !== jlnLama
    )
  }

  private bersihkanEntitasAtasAir(tx: number, ty: number): void {
    const bukanDi = <T extends { tx: number; ty: number }>(arr: T[]): T[] =>
      arr.filter((e) => !(e.tx === tx && e.ty === ty))
    this.entitas.spawn = bukanDi(this.entitas.spawn)
    this.entitas.pohon = bukanDi(this.entitas.pohon)
    this.entitas.tambang = bukanDi(this.entitas.tambang)
    this.entitas.domba = bukanDi(this.entitas.domba)
    this.entitas.camp = bukanDi(this.entitas.camp)
    this.entitas.bangunan = bukanDi(this.entitas.bangunan)
    this.entitas.bonus = bukanDi(this.entitas.bonus)
    this.entitas.deko = this.entitas.deko.filter(
      (d) => !(d.tx === tx && d.ty === ty) || d.jenis.startsWith('batuAir') || d.jenis === 'bebek' || d.jenis.startsWith('awan'),
    )
  }

  private hapusDiTitik(titikSim: { tx: number; ty: number }[]): void {
    const offsets = this.daftarOffsetKuas(this.ukuranKuas, this.bentukKuas)
    let minX = PETA_KOLOM, minY = PETA_BARIS, maxX = -1, maxY = -1
    const sel = new Set<number>()
    for (const s of titikSim) {
      for (const [dx, dy] of offsets) {
        const x = s.tx + dx
        const y = s.ty + dy
        if (this.tileDalamBatas(x, y)) sel.add(y * PETA_KOLOM + x)
      }
    }
    const sebelum = JSON.stringify(this.entitas)
    const saring = <T extends { tx: number; ty: number }>(arr: T[]): T[] =>
      arr.filter((e) => !sel.has(e.ty * PETA_KOLOM + e.tx))
    this.entitas.spawn = saring(this.entitas.spawn)
    this.entitas.pohon = saring(this.entitas.pohon)
    this.entitas.tambang = saring(this.entitas.tambang)
    this.entitas.domba = saring(this.entitas.domba)
    this.entitas.camp = saring(this.entitas.camp)
    this.entitas.bangunan = saring(this.entitas.bangunan)
    this.entitas.bonus = saring(this.entitas.bonus)
    this.entitas.deko = saring(this.entitas.deko)
    if (JSON.stringify(this.entitas) !== sebelum) this.goresBerubah = true

    for (const idx of sel) {
      const tx = idx % PETA_KOLOM
      const ty = (idx - tx) / PETA_KOLOM
      let ubah = false
      if (this.terrain.ramp[idx]! > 0) { this.terrain.ramp[idx] = 0; ubah = true }
      if (this.terrain.jembatan[idx]! > 0) {
        this.terrain.jembatan[idx] = 0
        this.terrain.tinggi[idx] = TINGGI.air
        ubah = true
      }
      if (this.terrain.jalan[idx]! > 0) { this.terrain.jalan[idx] = 0; ubah = true }
      if (this.hapusTanah && this.terrain.tinggi[idx] !== TINGGI.air) {
        this.terrain.tinggi[idx] = TINGGI.air
        ubah = true
      }
      if (ubah) {
        this.goresBerubah = true
        if (tx < minX) minX = tx
        if (ty < minY) minY = ty
        if (tx > maxX) maxX = tx
        if (ty > maxY) maxY = ty
      }
    }
    if (maxX >= 0) {
      this.renderTerrain.kotorkanArea(minX, minY, maxX, maxY)
    }
    if (this.goresBerubah) this.minimapKotor = true
  }

  private isiBanjir(tx0: number, ty0: number): void {
    if (this.itemAktif.kat !== 'terrain') {
      this.tampilkanToast('Ember Isi hanya untuk kuas Terrain / Jalan / Air!', true)
      return
    }
    const mode = this.itemAktif.mode
    const titikSim = hitungTitikSimetri(tx0, ty0, PETA_KOLOM, PETA_BARIS, this.simetri)
    const visited = new Uint8Array(PETA_KOLOM * PETA_BARIS)
    let diubah = false
    this.dorongUndo()

    for (const s of titikSim) {
      const start = s.ty * PETA_KOLOM + s.tx
      if (visited[start] === 1) continue
      const targetH = this.terrain.tinggi[start]!
      const targetJ = this.terrain.jembatan[start]!
      const antre = [start]
      visited[start] = 1
      while (antre.length > 0) {
        const cur = antre.pop()!
        const cx = cur % PETA_KOLOM
        const cy = (cur - cx) / PETA_KOLOM
        if (this.terapkanTerrainTile(cx, cy, mode, s.balikX)) diubah = true
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx
          const ny = cy + dy
          if (!this.tileDalamBatas(nx, ny)) continue
          const ni = ny * PETA_KOLOM + nx
          if (visited[ni] === 1) continue
          if (this.terrain.tinggi[ni] !== targetH || this.terrain.jembatan[ni] !== targetJ) continue
          visited[ni] = 1
          antre.push(ni)
        }
      }
    }
    if (diubah) {
      this.renderTerrain.kotorkanSemua()
      this.minimapKotor = true
      this.perbaruiValidasiUi()
    } else {
      this.riwayatUndo.pop()
      this.segarkanAlatUi()
    }
  }

  private ambilPipet(tx: number, ty: number): void {
    const cocok = (e: { tx: number; ty: number }): boolean => e.tx === tx && e.ty === ty
    const sp = this.entitas.spawn.find(cocok)
    if (sp) {
      this.slotDipilih = sp.slot
      this.pilihDariPipet('sumber', 's-spawn', { kat: 'spawn' }, `Pipet: Spawn P${sp.slot + 1}`)
      return
    }
    const mb = this.entitas.tambang.find(cocok)
    if (mb) {
      const id = mb.jenis === 'mine' ? 's-mine' : `s-g${mb.varian ?? 1}`
      this.pilihDariPipet(
        'sumber', id,
        { kat: 'tambang', jenis: mb.jenis, ...(mb.varian !== undefined ? { varian: mb.varian } : {}) },
        'Pipet: Tambang Emas',
      )
      return
    }
    const ph = this.entitas.pohon.find(cocok)
    if (ph) {
      const idMap: Record<VarianPohonCustom, string> = { pinus1: 's-p1', pinus2: 's-p2', daun1: 's-d1', daun2: 's-d2', klasik: 's-pk' }
      this.pilihDariPipet('sumber', idMap[ph.varian], { kat: 'pohon', varian: ph.varian }, `Pipet: Pohon ${ph.varian}`)
      return
    }
    const cp = this.entitas.camp.find(cocok)
    if (cp) {
      this.pilihDariPipet('goblin', cp.jenis === 'besar' ? 'g-besar' : 'g-kecil', { kat: 'camp', jenis: cp.jenis }, `Pipet: Camp ${cp.jenis}`)
      return
    }
    const bg = this.entitas.bangunan.find(cocok)
    if (bg) {
      this.slotDipilih = bg.slot
      this.bangunanHancur = Boolean(bg.hancur)
      this.pilihDariPipet('bangunan', `b-${bg.jenis === 'barracks' ? 'bar' : bg.jenis === 'archery' ? 'arc' : bg.jenis === 'monastery' ? 'mon' : bg.jenis === 'altar' ? 'alt' : bg.jenis}`, { kat: 'bangunan', jenis: bg.jenis }, `Pipet: ${bg.jenis}`)
      return
    }
    const dk = this.entitas.deko.find(cocok)
    if (dk) {
      this.pilihDariPipet('deko', `dk-${dk.jenis}`, { kat: 'deko', jenis: dk.jenis }, `Pipet: ${dk.jenis}`)
      return
    }

    const idx = ty * PETA_KOLOM + tx
    const jv = this.terrain.jembatan[idx]!
    if (jv > 0) {
      this.pilihDariPipet('terrain', jv === 1 ? 't-jh' : 't-jv', { kat: 'terrain', mode: jv === 1 ? 'jembH' : 'jembV' }, 'Pipet: Jembatan')
      return
    }
    const rv = this.terrain.ramp[idx]!
    if (rv > 0) {
      const id = rv === 1 ? 't-rns' : rv === 2 ? 't-rb' : 't-rt'
      const mode = rv === 1 ? 'rampNS' : rv === 2 ? 'rampBarat' : 'rampTimur'
      this.pilihDariPipet('terrain', id, { kat: 'terrain', mode }, 'Pipet: Tangga Batu')
      return
    }
    if (this.terrain.jalan[idx] === 1) {
      this.pilihDariPipet('terrain', 't-jln', { kat: 'terrain', mode: 'jalan' }, 'Pipet: Jalan Pasir')
      return
    }
    const h = this.terrain.tinggi[idx]!
    const lvMap = {
      0: ['t-air', 'air', 'Air Laut'],
      1: ['t-lv1', 'dataran', 'Daratan Lv.1'],
      2: ['t-lv2', 'plateau', 'Plateau Lv.2'],
      3: ['t-lv3', 'puncak', 'Puncak Lv.3'],
    } as const
    const p = lvMap[h as 0 | 1 | 2 | 3] ?? lvMap[1]
    this.pilihDariPipet('terrain', p[0], { kat: 'terrain', mode: p[1] }, `Pipet: ${p[2]}`)
  }

  private pilihDariPipet(kat: KategoriPalet, id: string, item: JenisItem, toast: string): void {
    this.kategori = kat
    this.itemIdAktif = id
    this.itemAktif = item
    this.alat = 'kuas'
    this.kanvas.style.cursor = 'crosshair'
    this.renderPaletItem()
    this.segarkanAlatUi()
    this.tampilkanToast(toast)
  }

  private putarArahItem(): void {
    if (this.itemAktif.kat !== 'terrain') return
    const urutan: Record<string, [string, Extract<JenisItem, { kat: 'terrain' }>['mode'], string]> = {
      rampAuto: ['t-rns', 'rampNS', 'Tangga N/S'],
      rampNS: ['t-rb', 'rampBarat', 'Tangga Barat'],
      rampBarat: ['t-rt', 'rampTimur', 'Tangga Timur'],
      rampTimur: ['t-ra', 'rampAuto', 'Tangga Auto'],
      jembH: ['t-jv', 'jembV', 'Jembatan Vertikal'],
      jembV: ['t-jh', 'jembH', 'Jembatan Horizontal'],
    }
    const next = urutan[this.itemAktif.mode]
    if (!next) return
    this.itemIdAktif = next[0]
    this.itemAktif = { kat: 'terrain', mode: next[1] }
    this.segarkanPilihanItemUi()
    this.tampilkanToast(`Putar: ${next[2]}`)
  }

  private perbaruiValidasiUi(): void {
    const data = this.dataSekarang
    const v = cekValidasiPeta(data)
    this.validasiEl.textContent = ''
    if (v.siapMain) {
      this.validasiEl.append(el('div', 'ed-valid-ok', `✔ Siap Dimainkan (${v.jumlahSpawn}P · Terhubung)`))
    } else {
      for (const g of v.galat) {
        this.validasiEl.append(el('div', 'ed-valid-err', `✖ ${g}`))
      }
    }
    for (const w of v.peringatan.slice(0, 3)) {
      this.validasiEl.append(el('div', 'ed-valid-warn', `⚠ ${w}`))
    }

    const e = this.entitas
    this.statistikEl.textContent =
      `Spawn: ${e.spawn.length}/6 · Tambang: ${e.tambang.length}\n` +
      `Pohon: ${e.pohon.length} · Domba: ${e.domba.length}\n` +
      `Goblin: ${e.camp.length} camp · Deko: ${e.deko.length + e.bangunan.length}`
    this.statistikEl.style.whiteSpace = 'pre-line'
  }

  private tampilkanToast(pesan: string, peringatan = false): void {
    this.toastEl.textContent = pesan
    this.toastEl.classList.toggle('peringatan', peringatan)
    this.toastEl.classList.add('tampil')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('tampil'), 2200)
  }

  // --- Kamera & Event ---

  private ubahZoom(target: number, sx?: number, sy?: number): void {
    const lama = this.kam.zoom
    const baru = Math.max(0.32, Math.min(1.8, target))
    const px = sx ?? this.kam.lebar / 2
    const py = sy ?? this.kam.tinggi / 2
    this.kam.zoom = baru
    this.kam.x += px * (1 / lama - 1 / baru)
    this.kam.y += py * (1 / lama - 1 / baru)
    batasiKamera(this.kam)
    this.zoomLbl.textContent = `${Math.round(baru * 100)}%`
  }

  private ukurKanvas(): void {
    const rect = this.kanvasBox.getBoundingClientRect()
    const w = Math.max(300, Math.floor(rect.width))
    const h = Math.max(200, Math.floor(rect.height))
    if (this.kanvas.width !== w || this.kanvas.height !== h) {
      this.kanvas.width = w
      this.kanvas.height = h
      this.kam.lebar = w
      this.kam.tinggi = h
      batasiKamera(this.kam)
    }
  }

  private titikKanvas(cx: number, cy: number): { sx: number; sy: number; tx: number; ty: number } {
    const r = this.kanvas.getBoundingClientRect()
    const sx = cx - r.left
    const sy = cy - r.top
    const wx = keDuniaX(this.kam, sx)
    const wy = keDuniaY(this.kam, sy)
    return { sx, sy, tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) }
  }

  private pasangEvent(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.ukurKanvas())
      this.ro.observe(this.kanvasBox)
    }

    this.kanvas.addEventListener('contextmenu', (e) => e.preventDefault())

    this.kanvas.addEventListener('pointerdown', (e) => {
      if (!this.terbuka) return
      this.kanvas.setPointerCapture(e.pointerId)
      this.jariSentuh.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const p = this.titikKanvas(e.clientX, e.clientY)
      this.hoverTile = { tx: p.tx, ty: p.ty }

      if (this.jariSentuh.size >= 2) {
        // Cubit 2 jari di HP/Tablet
        this.batalkanGores()
        const [a, b] = [...this.jariSentuh.values()]
        if (a && b) {
          this.cubitAwal = { jarak: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.kam.zoom }
          this.geserTerakhir = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        }
        return
      }

      if (e.button === 1 || this.spasiTahan || this.alat === 'geser') {
        this.sedangGeser = true
        this.geserTerakhir = { x: e.clientX, y: e.clientY }
        this.kanvas.style.cursor = 'grabbing'
        return
      }

      const hapusCepat = e.button === 2
      this.sedangHapusCepat = hapusCepat
      this.sedangLukis = true
      this.tergambarPadaGores.clear()
      this.goresBerubah = false
      this.snapSebelumGores = (this.alat !== 'pipet' && this.alat !== 'isi') ? this.tangkapSnapshot() : null
      this.kuasDi(p.tx, p.ty, hapusCepat)
    })

    this.kanvas.addEventListener('pointermove', (e) => {
      if (!this.terbuka) return
      if (this.jariSentuh.has(e.pointerId)) {
        this.jariSentuh.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
      if (this.jariSentuh.size >= 2 && this.cubitAwal) {
        const [a, b] = [...this.jariSentuh.values()]
        if (a && b) {
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const r = this.kanvas.getBoundingClientRect()
          this.ubahZoom(this.cubitAwal.zoom * (d / this.cubitAwal.jarak), mx - r.left, my - r.top)
          this.kam.x -= (mx - this.geserTerakhir.x) / this.kam.zoom
          this.kam.y -= (my - this.geserTerakhir.y) / this.kam.zoom
          batasiKamera(this.kam)
          this.geserTerakhir = { x: mx, y: my }
        }
        return
      }

      const p = this.titikKanvas(e.clientX, e.clientY)
      this.hoverTile = { tx: p.tx, ty: p.ty }
      this.perbaruiInfoTile(p.tx, p.ty)

      if (this.sedangGeser) {
        this.kam.x -= (e.clientX - this.geserTerakhir.x) / this.kam.zoom
        this.kam.y -= (e.clientY - this.geserTerakhir.y) / this.kam.zoom
        batasiKamera(this.kam)
        this.geserTerakhir = { x: e.clientX, y: e.clientY }
        return
      }
      if (this.sedangLukis) {
        this.kuasDi(p.tx, p.ty, this.sedangHapusCepat)
      }
    })

    const selesaiPointer = (e: PointerEvent): void => {
      this.jariSentuh.delete(e.pointerId)
      if (this.jariSentuh.size < 2) this.cubitAwal = null
      if (this.sedangGeser) {
        this.sedangGeser = false
        this.kanvas.style.cursor = this.alat === 'geser' ? 'grab' : 'crosshair'
      }
      if (this.sedangLukis) {
        this.sedangLukis = false
        this.sedangHapusCepat = false
        this.tergambarPadaGores.clear()
        if (this.goresBerubah && this.snapSebelumGores) {
          this.riwayatUndo.push(this.snapSebelumGores)
          if (this.riwayatUndo.length > MAKS_RIWAYAT) this.riwayatUndo.shift()
          this.riwayatRedo = []
          this.segarkanAlatUi()
          this.perbaruiValidasiUi()
        }
        this.snapSebelumGores = null
        this.goresBerubah = false
      }
    }
    this.kanvas.addEventListener('pointerup', selesaiPointer)
    this.kanvas.addEventListener('pointercancel', selesaiPointer)
    this.kanvas.addEventListener('pointerleave', () => { this.hoverTile = null })

    this.kanvas.addEventListener('wheel', (e) => {
      if (!this.terbuka) return
      e.preventDefault()
      const p = this.titikKanvas(e.clientX, e.clientY)
      this.ubahZoom(this.kam.zoom * (e.deltaY > 0 ? 0.9 : 1.1), p.sx, p.sy)
    }, { passive: false })

    // Minimap klik/seret untuk pindah kamera instan
    const geserMini = (e: PointerEvent): void => {
      const r = this.minimapKanvas.getBoundingClientRect()
      const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
      const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
      pusatkan(this.kam, fx * DUNIA_W, fy * DUNIA_H)
    }
    this.minimapKanvas.addEventListener('pointerdown', (e) => {
      this.geserMinimap = true
      this.minimapKanvas.setPointerCapture(e.pointerId)
      geserMini(e)
    })
    this.minimapKanvas.addEventListener('pointermove', (e) => {
      if (this.geserMinimap) geserMini(e)
    })
    this.minimapKanvas.addEventListener('pointerup', () => { this.geserMinimap = false })
    this.minimapKanvas.addEventListener('pointercancel', () => { this.geserMinimap = false })

    // Pintasan keyboard global hanya saat Editor aktif & fokus bukan di input teks
    window.addEventListener('keydown', (e) => {
      if (!this.terbuka) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) this.redo()
        else this.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        this.redo()
        return
      }
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          this.spasiTahan = true
          this.kanvas.style.cursor = 'grab'
          break
        case 'b': this.setAlat('kuas'); break
        case 'f': this.setAlat('isi'); break
        case 'e': this.setAlat('hapus'); break
        case 'i': this.setAlat('pipet'); break
        case 'r': this.putarArahItem(); break
        case 'g': this.btnGrid.click(); break
        case '1': this.ukuranKuas = 1; this.segarkanAlatUi(); break
        case '2': this.ukuranKuas = 3; this.segarkanAlatUi(); break
        case '3': this.ukuranKuas = 5; this.segarkanAlatUi(); break
        case '4': this.ukuranKuas = 7; this.segarkanAlatUi(); break
        case 'w': case 'a': case 's': case 'd':
        case 'arrowup': case 'arrowdown': case 'arrowleft': case 'arrowright':
          this.tombolPan.add(e.key.toLowerCase())
          break
      }
    })
    window.addEventListener('keyup', (e) => {
      this.tombolPan.delete(e.key.toLowerCase())
      if (e.key === ' ') {
        this.spasiTahan = false
        this.kanvas.style.cursor = this.alat === 'geser' ? 'grab' : 'crosshair'
      }
    })
  }

  private batalkanGores(): void {
    this.sedangLukis = false
    this.sedangHapusCepat = false
    this.tergambarPadaGores.clear()
    this.snapSebelumGores = null
    this.goresBerubah = false
  }

  private perbaruiInfoTile(tx: number, ty: number): void {
    if (!this.tileDalamBatas(tx, ty)) {
      this.infoTileEl.textContent = 'Di luar batas peta'
      return
    }
    const idx = ty * PETA_KOLOM + tx
    const h = this.terrain.tinggi[idx]!
    const namaLv = h === 0 ? 'Air' : h === 1 ? 'Daratan Lv.1' : h === 2 ? 'Plateau Lv.2' : 'Puncak Lv.3'
    const ket: string[] = [`(${tx}, ${ty}) · ${namaLv}`]
    if (this.terrain.jembatan[idx]! > 0) ket.push('Jembatan')
    if (this.terrain.ramp[idx]! > 0) ket.push('Tangga')
    if (this.terrain.jalan[idx] === 1) ket.push('Jalan')
    this.infoTileEl.textContent = ket.join(' · ')
  }

  // --- Loop Render Hidup (60 FPS) ---

  private mulaiLoop(): void {
    if (this.rafId) return
    this.waktuTerakhirMs = performance.now()
    const langkah = (sekarang: number): void => {
      if (!this.terbuka) {
        this.rafId = 0
        return
      }
      const dt = Math.min(0.05, Math.max(0.001, (sekarang - this.waktuTerakhirMs) / 1000))
      this.waktuTerakhirMs = sekarang
      this.gerakKamera(dt)
      this.gambarKanvas(sekarang / 1000)
      this.gambarMinimap()
      this.rafId = requestAnimationFrame(langkah)
    }
    this.rafId = requestAnimationFrame(langkah)
  }

  private gerakKamera(dt: number): void {
    let vx = 0, vy = 0
    if (this.tombolPan.has('a') || this.tombolPan.has('arrowleft')) vx -= 1
    if (this.tombolPan.has('d') || this.tombolPan.has('arrowright')) vx += 1
    if (this.tombolPan.has('w') || this.tombolPan.has('arrowup')) vy -= 1
    if (this.tombolPan.has('s') || this.tombolPan.has('arrowdown')) vy += 1
    if (vx !== 0 || vy !== 0) {
      const kec = 880 / this.kam.zoom
      this.kam.x += vx * kec * dt
      this.kam.y += vy * kec * dt
      batasiKamera(this.kam)
    }
  }

  private gambarKanvas(t: number): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#1b4956'
    ctx.fillRect(0, 0, this.kanvas.width, this.kanvas.height)

    ctx.save()
    ctx.scale(this.kam.zoom, this.kam.zoom)
    ctx.translate(-this.kam.x, -this.kam.y)

    this.renderTerrain.gambar(ctx, this.kam, t, true)
    this.gambarGridDanSimetri(ctx)
    this.gambarSemuaEntitas(ctx, t)
    this.gambarGhost(ctx, t)

    ctx.restore()
  }

  private gambarGridDanSimetri(ctx: CanvasRenderingContext2D): void {
    if (this.tampilGrid) {
      const tx1 = Math.max(0, Math.floor(this.kam.x / TILE))
      const ty1 = Math.max(0, Math.floor(this.kam.y / TILE))
      const tx2 = Math.min(PETA_KOLOM, Math.ceil((this.kam.x + this.kam.lebar / this.kam.zoom) / TILE))
      const ty2 = Math.min(PETA_BARIS, Math.ceil((this.kam.y + this.kam.tinggi / this.kam.zoom) / TILE))
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.lineWidth = 1 / this.kam.zoom
      ctx.beginPath()
      for (let tx = tx1; tx <= tx2; tx++) {
        ctx.moveTo(tx * TILE, ty1 * TILE)
        ctx.lineTo(tx * TILE, ty2 * TILE)
      }
      for (let ty = ty1; ty <= ty2; ty++) {
        ctx.moveTo(tx1 * TILE, ty * TILE)
        ctx.lineTo(tx2 * TILE, ty * TILE)
      }
      ctx.stroke()
    }

    if (this.simetri !== 'mati') {
      ctx.save()
      ctx.setLineDash([12, 8])
      ctx.lineWidth = 2.5 / this.kam.zoom
      ctx.strokeStyle = 'rgba(255, 216, 107, 0.72)'
      if (this.simetri === 'cerminX' || this.simetri === 'empatArah') {
        ctx.beginPath()
        ctx.moveTo(DUNIA_W / 2, 0)
        ctx.lineTo(DUNIA_W / 2, DUNIA_H)
        ctx.stroke()
      }
      if (this.simetri === 'cerminY' || this.simetri === 'empatArah') {
        ctx.beginPath()
        ctx.moveTo(0, DUNIA_H / 2)
        ctx.lineTo(DUNIA_W, DUNIA_H / 2)
        ctx.stroke()
      }
      if (this.simetri === 'rotasi180') {
        ctx.beginPath()
        ctx.arc(DUNIA_W / 2, DUNIA_H / 2, 34, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  private gambarSemuaEntitas(ctx: CanvasRenderingContext2D, t: number): void {
    type ItemDraw = { y: number; fn: () => void }
    const antre: ItemDraw[] = []
    const P = (tx: number, ty: number): [number, number] => [tx * TILE + TILE / 2, ty * TILE + TILE / 2]

    for (let i = 0; i < this.entitas.pohon.length; i++) {
      const p = this.entitas.pohon[i]!
      const [wx, wy] = P(p.tx, p.ty)
      const info = asetPohonVarian(p.varian)
      antre.push({
        y: wy,
        fn: () => {
          const fr = Math.floor(t * 6 + i * 0.7) % info.aset.kolom
          sprite(ctx, info.aset, fr, wx, wy, info.skala, false, info.pijak)
        },
      })
    }

    for (const m of this.entitas.tambang) {
      const [wx, wy] = P(m.tx, m.ty)
      antre.push({
        y: wy,
        fn: () => {
          if (m.jenis === 'node' && m.varian && m.varian >= 1 && m.varian <= 6) {
            sprite(ctx, BATU_EMAS_ASET[m.varian - 1]!, 0, wx, wy, 0.78, false, 0.80)
          } else {
            sprite(ctx, SUMBER.tambangAktif, 0, wx, wy, 0.9, false, 0.82)
          }
        },
      })
    }

    for (let i = 0; i < this.entitas.domba.length; i++) {
      const d = this.entitas.domba[i]!
      const [wx, wy] = P(d.tx, d.ty)
      antre.push({
        y: wy,
        fn: () => sprite(ctx, SUMBER.dombaDiam, Math.floor(t * 8 + i) % SUMBER.dombaDiam.kolom, wx, wy, 0.56, false, 0.74),
      })
    }

    for (const b of this.entitas.bonus) {
      const [wx, wy] = P(b.tx, b.ty)
      const a = b.jenis === 'gold' ? SUMBER.goldDiam : b.jenis === 'kayu' ? SUMBER.kayuDiam : SUMBER.dagingDiam
      antre.push({ y: wy, fn: () => sprite(ctx, a, 0, wx, wy, 0.52, false, 0.74) })
    }

    for (let i = 0; i < this.entitas.camp.length; i++) {
      const c = this.entitas.camp[i]!
      const [wx, wy] = P(c.tx, c.ty)
      antre.push({
        y: wy - 20,
        fn: () => {
          sprite(ctx, ASET_GOBLIN.rumah, 0, wx - 130, wy - 28, 0.72, false, 0.84)
          sprite(ctx, DEKO['deco16']!, 0, wx + 114, wy + 18, 0.92, false, 0.88)
          const unitGob = c.jenis === 'besar'
            ? [ASET_GOBLIN.torch, ASET_GOBLIN.tnt, ASET_GOBLIN.barrel, ASET_GOBLIN.torch, ASET_GOBLIN.tnt]
            : [ASET_GOBLIN.torch, ASET_GOBLIN.torch, ASET_GOBLIN.tnt]
          unitGob.forEach((a, idx) => {
            const sd = (idx / unitGob.length) * Math.PI * 2
            const gx = wx + Math.cos(sd) * 90
            const gy = wy + Math.sin(sd) * 90
            sprite(ctx, a, Math.floor(t * 8 + idx) % 6, gx, gy, a === ASET_GOBLIN.barrel ? 0.72 : 0.62, gx > wx, 0.68)
          })
          ctx.fillStyle = c.jenis === 'besar' ? '#ff8b4a' : '#f2c14e'
          ctx.font = "bold 12px 'Pixelify Sans', sans-serif"
          ctx.textAlign = 'center'
          ctx.fillText(c.jenis === 'besar' ? 'GOBLIN BOSS' : 'CAMP GOBLIN', wx, wy - 62)
        },
      })
    }

    for (const bg of this.entitas.bangunan) {
      const [wx, wy] = P(bg.tx, bg.ty)
      const info = asetBangunanEditor(bg)
      const def = BANGUNAN[bg.jenis]
      antre.push({
        y: wy,
        fn: () => sprite(ctx, info.aset, 0, wx, wy, def.w / info.aset.fw, false, 0.86, 0, info.timWarna),
      })
    }

    for (let i = 0; i < this.entitas.deko.length; i++) {
      const d = this.entitas.deko[i]!
      const [wx, wy] = P(d.tx, d.ty)
      const ySort = d.jenis.startsWith('awan') ? wy + 100_000 : wy
      antre.push({ y: ySort, fn: () => gambarDekoCustom(ctx, d.jenis, wx, wy, t, i) })
    }

    for (const sp of this.entitas.spawn) {
      const [wx, wy] = P(sp.tx, sp.ty)
      const tim = WARNA_SLOTS[sp.slot] ?? 'blue'
      const warna = WARNA_TIM[tim]
      antre.push({
        y: wy,
        fn: () => {
          ctx.save()
          ctx.globalAlpha = 0.88
          const a = tim === 'purple' || tim === 'yellow' ? BANGUNAN_U010_WARNA[tim].castle : BANGUNAN_BLUE.castle
          const tw = tim === 'purple' || tim === 'yellow' ? 'blue' : tim
          sprite(ctx, a, 0, wx, wy, BANGUNAN.castle.w / a.fw, false, 0.86, 0, tw)
          ctx.restore()
          ctx.fillStyle = warna.utama
          ctx.strokeStyle = '#1b120b'
          ctx.lineWidth = 3
          ctx.fillRect(wx - 36, wy - 122, 72, 22)
          ctx.strokeRect(wx - 36, wy - 122, 72, 22)
          ctx.fillStyle = '#fff'
          ctx.font = "bold 13px 'Pixelify Sans', sans-serif"
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`SPAWN P${sp.slot + 1}`, wx, wy - 111)
        },
      })
    }

    antre.sort((a, b) => a.y - b.y)
    for (const item of antre) item.fn()
  }

  private gambarGhost(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.hoverTile) return
    const { tx, ty } = this.hoverTile
    if (!this.tileDalamBatas(tx, ty)) return
    const titikSim = hitungTitikSimetri(tx, ty, PETA_KOLOM, PETA_BARIS, this.simetri)
    const offsets = (this.alat === 'kuas' && (this.itemAktif.kat === 'terrain' || this.itemAktif.kat === 'hutanAcak')) || this.alat === 'hapus'
      ? this.daftarOffsetKuas(this.ukuranKuas, this.bentukKuas)
      : ([[0, 0]] as const)

    ctx.save()
    for (const s of titikSim) {
      if (this.alat === 'kuas' && this.itemAktif.kat !== 'terrain' && this.itemAktif.kat !== 'hutanAcak') {
        ctx.globalAlpha = 0.58
        const wx = s.tx * TILE + TILE / 2
        const wy = s.ty * TILE + TILE / 2
        if (this.itemAktif.kat === 'deko') {
          gambarDekoCustom(ctx, this.itemAktif.jenis, wx, wy, t, 0)
        } else if (this.itemAktif.kat === 'pohon') {
          const i = asetPohonVarian(this.itemAktif.varian)
          sprite(ctx, i.aset, 0, wx, wy, i.skala, false, i.pijak)
        } else if (this.itemAktif.kat === 'tambang') {
          const a = this.itemAktif.jenis === 'mine' ? SUMBER.tambangAktif : BATU_EMAS_ASET[(this.itemAktif.varian ?? 1) - 1]!
          sprite(ctx, a, 0, wx, wy, this.itemAktif.jenis === 'mine' ? 0.9 : 0.78, false, 0.82)
        } else if (this.itemAktif.kat === 'spawn') {
          sprite(ctx, BANGUNAN_BLUE.castle, 0, wx, wy, BANGUNAN.castle.w / BANGUNAN_BLUE.castle.fw, false, 0.86)
        } else if (this.itemAktif.kat === 'camp') {
          sprite(ctx, ASET_GOBLIN.rumah, 0, wx - 130, wy - 28, 0.72, false, 0.84)
        } else if (this.itemAktif.kat === 'domba') {
          sprite(ctx, SUMBER.dombaDiam, 0, wx, wy, 0.56, false, 0.74)
        } else if (this.itemAktif.kat === 'bangunan') {
          const info = asetBangunanEditor({ tx: s.tx, ty: s.ty, jenis: this.itemAktif.jenis, slot: this.slotDipilih, hancur: this.bangunanHancur })
          const def = BANGUNAN[this.itemAktif.jenis]
          sprite(ctx, info.aset, 0, wx, wy, def.w / info.aset.fw, false, 0.86, 0, info.timWarna)
        }
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = this.alat === 'hapus' ? '#ff695c' : '#ffd86b'
      ctx.fillStyle = this.alat === 'hapus' ? 'rgba(255, 80, 64, 0.20)' : 'rgba(255, 216, 107, 0.16)'
      ctx.lineWidth = 2 / this.kam.zoom
      for (const [dx, dy] of offsets) {
        const x = s.tx + dx
        const y = s.ty + dy
        if (!this.tileDalamBatas(x, y)) continue
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE)
      }
    }
    ctx.restore()
  }

  private gambarMinimap(): void {
    const c = this.mctx
    if (!c) return
    const w = this.minimapKanvas.width
    const h = this.minimapKanvas.height
    const sx = w / PETA_KOLOM
    const sy = h / PETA_BARIS

    if (!this.minimapCache || this.minimapKotor) {
      if (!this.minimapCache) {
        this.minimapCache = document.createElement('canvas')
        this.minimapCache.width = w
        this.minimapCache.height = h
      }
      const mc = this.minimapCache.getContext('2d', { alpha: false })
      if (mc) {
        const bioma = INFO_BIOMA[this.terrain.bioma ?? 1]
        for (let ty = 0; ty < PETA_BARIS; ty++) {
          for (let tx = 0; tx < PETA_KOLOM; tx++) {
            const idx = ty * PETA_KOLOM + tx
            const v = this.terrain.tinggi[idx]!
            const bawahPlat = ty > 0 && v < TINGGI.plateau && this.terrain.tinggi[(ty - 1) * PETA_KOLOM + tx] === TINGGI.plateau
            const bawahPuncak = ty > 0 && v < TINGGI.puncak && this.terrain.tinggi[(ty - 1) * PETA_KOLOM + tx] === TINGGI.puncak
            const bawahLaut = ty > 0 && v === TINGGI.air && this.terrain.tinggi[(ty - 1) * PETA_KOLOM + tx] !== TINGGI.air && this.terrain.jembatan[(ty - 1) * PETA_KOLOM + tx] === 0
            mc.fillStyle =
              this.terrain.jembatan[idx]! > 0 ? '#b87d45'
              : bawahLaut ? '#466c75'
              : v === TINGGI.air ? '#26697a'
              : this.terrain.ramp[idx]! > 0 ? '#dfd095'
              : bawahPlat || bawahPuncak ? '#53737a'
              : this.terrain.jalan[idx] === 1 ? '#d4bd80'
              : v === TINGGI.puncak ? bioma.warnaPuncak
              : v === TINGGI.plateau ? bioma.warnaPlateau
              : bioma.warnaDataran
            mc.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy))
          }
        }
        for (const p of this.entitas.pohon) {
          mc.fillStyle = '#254a1f'
          mc.fillRect(p.tx * sx, p.ty * sy, Math.max(2, sx), Math.max(2, sy))
        }
        for (const m of this.entitas.tambang) {
          mc.fillStyle = '#ffd86b'
          mc.fillRect(m.tx * sx - 1.5, m.ty * sy - 1.5, 4, 4)
        }
        for (const cp of this.entitas.camp) {
          mc.fillStyle = cp.jenis === 'besar' ? '#ff7b3a' : '#f2c14e'
          mc.beginPath()
          mc.arc(cp.tx * sx, cp.ty * sy, cp.jenis === 'besar' ? 4 : 2.8, 0, Math.PI * 2)
          mc.fill()
        }
        for (const sp of this.entitas.spawn) {
          const tim = WARNA_SLOTS[sp.slot] ?? 'blue'
          mc.fillStyle = WARNA_TIM[tim].utama
          mc.beginPath()
          mc.arc(sp.tx * sx, sp.ty * sy, 5, 0, Math.PI * 2)
          mc.fill()
          mc.strokeStyle = '#1b120b'
          mc.lineWidth = 1.4
          mc.stroke()
        }
      }
      this.minimapKotor = false
    }

    c.drawImage(this.minimapCache, 0, 0)
    c.strokeStyle = '#ffd86b'
    c.lineWidth = 1.5
    c.strokeRect(
      (this.kam.x / DUNIA_W) * w,
      (this.kam.y / DUNIA_H) * h,
      ((this.kam.lebar / this.kam.zoom) / DUNIA_W) * w,
      ((this.kam.tinggi / this.kam.zoom) / DUNIA_H) * h,
    )

    void gambarTim
    void keLayarX
    void keLayarY
  }
}

function eksporSiapTerrain(data: DataPetaCustom): { terrain: Terrain; entitas: EntitasPetaCustom } {
  const total = PETA_KOLOM * PETA_BARIS
  return {
    terrain: {
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggi: decodeRle(data.tinggiRle, total, TINGGI.puncak),
      ramp: decodeRle(data.rampRle, total, 3),
      jembatan: decodeRle(data.jembatanRle, total, 2),
      jalan: decodeRle(data.jalanRle, total, 1),
      bioma: data.bioma,
    },
    entitas: klonEntitas(data.entitas),
  }
}
