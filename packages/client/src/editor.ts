import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_U010_WARNA, DEKO, DEKO_FREE, EDITOR_U010,
  GOBLIN as ASET_GOBLIN, PAWN_FREE, POHON_FREE, SUMBER, TERRAIN, TERRAIN_FREE,
  UNIT_BLUE, UNIT_U010_WARNA, frame, type Aset,
} from '@hftf/aset'
import {
  DUNIA_H, DUNIA_W, INFO_BIOMA, INFO_PETA, JENIS_PETA, PETA_BARIS, PETA_KOLOM,
  RAMP_MAKS, TILE, TIM_PEMAIN, TINGGI, WARNA_TIM, balikKodeRamp, buatIdPetaCustom, cekValidasiPeta,
  decodeBiomaGrid, decodeRle, encodeRle, hitungTitikSimetri, type BangunanPetaCustom,
  type BonusPetaCustom, type CampPetaCustom, type DataPetaCustom, type DekoPetaCustom,
  type EntitasPetaCustom, type JenisBangunanCustom, type JenisDekoCustom, type JenisPeta,
  type JenisUnitCustom, type ModeSimetri, type PohonPetaCustom, type SpawnPetaCustom,
  type TambangPetaCustom, type TemaBioma, type Tinggi, type UnitPetaCustom, type VarianPohonCustom,
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

type AlatEditor = 'pilih' | 'kuas' | 'isi' | 'hapus' | 'pipet' | 'geser'
type KategoriPalet = 'terrain' | 'karakter' | 'bangunan' | 'resource' | 'deko'
type FilterLayer = 'semua' | 'terrain' | 'karakter' | 'resource' | 'deko'
type FilterLantai = 0 | 1 | 2 | 3
type FilterPemain = 'semua' | -1 | 0 | 1 | 2 | 3 | 4 | 5
type BentukKuas = 'bulat' | 'kotak'
type GrupEntitas = 'spawn' | 'unit' | 'bangunan' | 'camp' | 'tambang' | 'pohon' | 'domba' | 'bonus' | 'deko'

interface RefEntitas {
  grup: GrupEntitas
  indeks: number
}

type JenisItem =
  | { kat: 'terrain'; mode: 'air' | 'dataran' | 'plateau' | 'puncak' | 'bioma' | 'jalan' | 'hapusJalan' | 'rampAuto' | 'rampNS' | 'rampBarat' | 'rampTimur' | 'rampRumputBarat' | 'rampRumputTimur' | 'jembH' | 'jembV' }
  | { kat: 'spawn' }
  | { kat: 'unit'; jenis: JenisUnitCustom }
  | { kat: 'tambang'; jenis: 'mine' | 'node'; varian?: number }
  | { kat: 'hutanAcak' }
  | { kat: 'pohon'; varian: VarianPohonCustom }
  | { kat: 'domba' }
  | { kat: 'bonus'; jenis: 'daging' | 'gold' | 'kayu'; jumlah: number }
  | { kat: 'camp'; jenis: 'kecil' | 'besar' }
  | { kat: 'deko'; jenis: JenisDekoCustom }
  | { kat: 'bangunan'; jenis: JenisBangunanCustom }

function asetBiomaEditor(bioma?: TemaBioma): Aset {
  switch (bioma) {
    case 2: return TERRAIN_FREE.tileBioma2
    case 3: return TERRAIN_FREE.tileBioma3
    case 4: return TERRAIN_FREE.tileBioma4
    case 5: return TERRAIN_FREE.tileBioma5
    default: return TERRAIN_FREE.tileHijau
  }
}

interface SnapshotRiwayat {
  bioma: TemaBioma
  biomaRle: string
  tinggiRle: string
  rampRle: string
  jembatanRle: string
  jalanRle: string
  entitasJson: string
}

const MAKS_RIWAYAT = 40

const WARNA_SLOTS = TIM_PEMAIN

const KATALOG_TERRAIN: readonly {
  id: string
  label: string
  aset?: Aset
  ikutBioma?: boolean
  sx?: number
  sy?: number
  sw?: number
  sh?: number
  item: JenisItem
}[] = [
  { id: 't-air', label: 'Air Laut', aset: TERRAIN.air, item: { kat: 'terrain', mode: 'air' } },
  { id: 't-lv1', label: 'Daratan Lv.1', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'dataran' } },
  { id: 't-lv2', label: 'Plateau Lv.2', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 5 * 64, sy: 0, item: { kat: 'terrain', mode: 'plateau' } },
  { id: 't-lv3', label: 'Puncak Lv.3', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 7 * 64, sy: 0, item: { kat: 'terrain', mode: 'puncak' } },
  { id: 't-bio', label: 'Cat Bioma', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 6 * 64, sy: 2 * 64, item: { kat: 'terrain', mode: 'bioma' } },
  { id: 't-jln', label: 'Jalan Pasir', aset: TERRAIN.tanahDatar, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'jalan' } },
  { id: 't-hjln', label: 'Hapus Jalan', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 6 * 64, sy: 64, item: { kat: 'terrain', mode: 'hapusJalan' } },
  { id: 't-ra', label: 'Tangga Auto', aset: TERRAIN.tanahTinggi, sx: 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampAuto' } },
  { id: 't-rns', label: 'Tangga N/S', aset: TERRAIN.tanahTinggi, sx: 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampNS' } },
  { id: 't-rb', label: 'Tangga Barat', aset: TERRAIN.tanahTinggi, sx: 0, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampBarat' } },
  { id: 't-rt', label: 'Tangga Timur', aset: TERRAIN.tanahTinggi, sx: 2 * 64, sy: 7 * 64, item: { kat: 'terrain', mode: 'rampTimur' } },
  { id: 't-lrb', label: 'Lereng Barat', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 0, sy: 4 * 64, sw: 64, sh: 128, item: { kat: 'terrain', mode: 'rampRumputBarat' } },
  { id: 't-lrt', label: 'Lereng Timur', aset: TERRAIN_FREE.tileHijau, ikutBioma: true, sx: 3 * 64, sy: 4 * 64, sw: 64, sh: 128, item: { kat: 'terrain', mode: 'rampRumputTimur' } },
  { id: 't-jh', label: 'Jemb Horiz', aset: TERRAIN.jembatan, sx: 64, sy: 0, item: { kat: 'terrain', mode: 'jembH' } },
  { id: 't-jv', label: 'Jemb Vert', aset: TERRAIN.jembatan, sx: 0, sy: 2 * 64, item: { kat: 'terrain', mode: 'jembV' } },
]

const KATALOG_KARAKTER: readonly { id: string; label: string; aset: Aset; item: JenisItem }[] = [
  { id: 's-spawn', label: 'Spawn Pemain', aset: BANGUNAN_BLUE.castle, item: { kat: 'spawn' } },
  { id: 'u-pawn', label: 'Pawn', aset: PAWN_FREE.idle, item: { kat: 'unit', jenis: 'pawn' } },
  { id: 'u-warrior', label: 'Warrior', aset: UNIT_BLUE.warrior, item: { kat: 'unit', jenis: 'warrior' } },
  { id: 'u-archer', label: 'Archer', aset: UNIT_BLUE.archer, item: { kat: 'unit', jenis: 'archer' } },
  { id: 'u-lancer', label: 'Lancer', aset: UNIT_BLUE.lancerIdle, item: { kat: 'unit', jenis: 'lancer' } },
  { id: 'u-monk', label: 'Monk', aset: UNIT_BLUE.monkIdle, item: { kat: 'unit', jenis: 'monk' } },
  { id: 'u-mage', label: 'Mage', aset: UNIT_BLUE.mageIdle, item: { kat: 'unit', jenis: 'mage' } },
  { id: 'u-gtorch', label: 'Goblin Torch', aset: ASET_GOBLIN.torch, item: { kat: 'unit', jenis: 'goblinTorch' } },
  { id: 'u-gtnt', label: 'Goblin TNT', aset: ASET_GOBLIN.tnt, item: { kat: 'unit', jenis: 'goblinTnt' } },
  { id: 'u-gbarrel', label: 'Goblin Barrel', aset: ASET_GOBLIN.barrel, item: { kat: 'unit', jenis: 'goblinBarrel' } },
  { id: 'g-kecil', label: 'Camp Kecil', aset: ASET_GOBLIN.torch, item: { kat: 'camp', jenis: 'kecil' } },
  { id: 'g-besar', label: 'Camp Boss', aset: ASET_GOBLIN.barrel, item: { kat: 'camp', jenis: 'besar' } },
]

const KATALOG_RESOURCE: readonly { id: string; label: string; aset: Aset; item: JenisItem }[] = [
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

const KATALOG_BANGUNAN: readonly { id: string; label: string; aset: Aset; item: JenisItem }[] = [
  { id: 'b-house', label: 'House', aset: BANGUNAN_BLUE.house, item: { kat: 'bangunan', jenis: 'house' } },
  { id: 'b-tower', label: 'Guard Tower', aset: BANGUNAN_BLUE.tower, item: { kat: 'bangunan', jenis: 'tower' } },
  { id: 'b-bar', label: 'Barracks', aset: BANGUNAN_BLUE.barracks, item: { kat: 'bangunan', jenis: 'barracks' } },
  { id: 'b-arc', label: 'Archery', aset: BANGUNAN_BLUE.archery, item: { kat: 'bangunan', jenis: 'archery' } },
  { id: 'b-mon', label: 'Monastery', aset: BANGUNAN_BLUE.monastery, item: { kat: 'bangunan', jenis: 'monastery' } },
  { id: 'b-alt', label: 'Altar Hero', aset: BANGUNAN_BLUE.altar, item: { kat: 'bangunan', jenis: 'altar' } },
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

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

interface EntitasEditor extends EntitasPetaCustom {
  unit: UnitPetaCustom[]
}

function klonEntitas(e: EntitasPetaCustom): EntitasEditor {
  const salin = JSON.parse(JSON.stringify(e)) as EntitasPetaCustom
  return { ...salin, unit: salin.unit ? [...salin.unit] : [] }
}

function layerDariGrup(g: GrupEntitas): Exclude<FilterLayer, 'semua'> {
  if (g === 'spawn' || g === 'unit' || g === 'bangunan' || g === 'camp') return 'karakter'
  if (g === 'tambang' || g === 'pohon' || g === 'domba' || g === 'bonus') return 'resource'
  return 'deko'
}

function bolehDekoDiAir(jenis: JenisDekoCustom): boolean {
  return jenis.startsWith('batuAir') || jenis === 'bebek' || jenis.startsWith('awan')
}

function asetUnitEditor(u: UnitPetaCustom): {
  aset: Aset
  timWarna?: (typeof TIM_PEMAIN)[number] | 'neutral'
  skala: number
  pijak: number
} {
  if (u.jenis === 'goblinTorch') return { aset: ASET_GOBLIN.torch, skala: 0.64, pijak: 0.68 }
  if (u.jenis === 'goblinTnt') return { aset: ASET_GOBLIN.tnt, skala: 0.64, pijak: 0.68 }
  if (u.jenis === 'goblinBarrel') return { aset: ASET_GOBLIN.barrel, skala: 0.72, pijak: 0.68 }
  const tim = u.slot >= 0 && u.slot < WARNA_SLOTS.length ? WARNA_SLOTS[u.slot]! : 'neutral'
  if (u.jenis === 'pawn') return { aset: PAWN_FREE.idle, timWarna: tim, skala: 0.62, pijak: 0.68 }
  if (u.jenis === 'warrior') {
    if (tim === 'purple' || tim === 'yellow') return { aset: UNIT_U010_WARNA[tim].warrior, timWarna: 'blue', skala: 0.64, pijak: 0.68 }
    return { aset: UNIT_BLUE.warrior, timWarna: tim, skala: 0.64, pijak: 0.68 }
  }
  if (u.jenis === 'archer') {
    if (tim === 'purple' || tim === 'yellow') return { aset: UNIT_U010_WARNA[tim].archer, timWarna: 'blue', skala: 0.64, pijak: 0.68 }
    return { aset: UNIT_BLUE.archer, timWarna: tim, skala: 0.64, pijak: 0.68 }
  }
  if (u.jenis === 'lancer') return { aset: UNIT_BLUE.lancerIdle, timWarna: tim, skala: 0.56, pijak: 0.66 }
  if (u.jenis === 'monk') return { aset: UNIT_BLUE.monkIdle, timWarna: tim, skala: 0.64, pijak: 0.68 }
  return { aset: UNIT_BLUE.mageIdle, timWarna: tim, skala: 0.64, pijak: 0.68 }
}

const NAMA_UNIT_LABEL: Record<JenisUnitCustom, string> = {
  pawn: 'Pawn',
  warrior: 'Warrior',
  archer: 'Archer',
  lancer: 'Lancer',
  monk: 'Monk',
  mage: 'Mage',
  goblinTorch: 'Goblin Torch',
  goblinTnt: 'Goblin TNT',
  goblinBarrel: 'Goblin Barrel',
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
function gambarIkonMini(
  kanvas: HTMLCanvasElement, aset: Aset,
  sxPaksa?: number, syPaksa?: number, swPaksa?: number, shPaksa?: number,
): void {
  const ctx = kanvas.getContext('2d')
  const im = gambarDari(aset)
  if (!ctx || !im) return
  ctx.clearRect(0, 0, kanvas.width, kanvas.height)
  ctx.imageSmoothingEnabled = false
  const f = sxPaksa !== undefined && syPaksa !== undefined
    ? { sx: sxPaksa, sy: syPaksa, sw: swPaksa ?? 64, sh: shPaksa ?? 64 }
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
  private btnPathing: HTMLButtonElement
  private biomaBtns: HTMLButtonElement[] = []
  private filterLayerBtns: HTMLButtonElement[] = []
  private filterLantaiBtns: HTMLButtonElement[] = []
  private filterPemainBtns: HTMLButtonElement[] = []
  private grupFilterLantai: HTMLElement
  private grupFilterPemain: HTMLElement
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
  private inspectorEl: HTMLElement
  private validasiEl: HTMLElement
  private statistikEl: HTMLElement
  private infoTileEl: HTMLElement
  private zoomLbl: HTMLButtonElement
  private toastEl: HTMLElement
  private modalBg: HTMLElement
  private modalTersimpanEl: HTMLElement
  private inputImpor: HTMLInputElement
  private semuaIkonMini: { k: HTMLCanvasElement; aset: Aset; sx?: number; sy?: number; sw?: number; sh?: number }[] = []

  private terbuka = false
  private idPeta = buatIdPetaCustom()
  private terrain: Terrain
  private entitas: EntitasEditor
  private renderTerrain: PeremajaTerrain
  private kam: Kamera = buatKamera()

  private alat: AlatEditor = 'kuas'
  private kategori: KategoriPalet = 'terrain'
  private itemIdAktif = 't-lv2'
  private itemAktif: JenisItem = { kat: 'terrain', mode: 'plateau' }
  private biomaKuas: TemaBioma = 1
  private ukuranKuas = 1
  private bentukKuas: BentukKuas = 'bulat'
  private simetri: ModeSimetri = 'mati'
  private tampilGrid = false
  private tampilPathing = false
  private filterLayer: FilterLayer = 'semua'
  private filterLantai: FilterLantai = 0
  private filterPemain: FilterPemain = 'semua'
  private slotDipilih = 0
  private bangunanHancur = false
  private hapusTanah = false

  private seleksi: RefEntitas[] = []
  private sedangSeretEntitas = false
  private seretAsal = { tx: 0, ty: 0 }
  private seretOffset = { dx: 0, dy: 0 }
  private marqueeAwal: { wx: number; wy: number } | null = null
  private marqueeAkhir: { wx: number; wy: number } | null = null

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
    this.biomaKuas = this.terrain.bioma ?? 1
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
    biomaBox.title = 'Kuas Bioma Per-Area / Per-Pulau / Per-Lantai (Tilemap 1..5)'
    for (const bId of [1, 2, 3, 4, 5] as const) {
      const sw = el('button', 'ed-bioma-swatch')
      sw.type = 'button'
      sw.title = `Kuas Bioma ${bId}: ${INFO_BIOMA[bId].nama} — ${INFO_BIOMA[bId].ringkas}`
      sw.style.background = INFO_BIOMA[bId].warnaPlateau
      sw.dataset['bioma'] = String(bId)
      sw.addEventListener('click', () => {
        this.biomaKuas = bId
        this.kategori = 'terrain'
        this.itemIdAktif = 't-bio'
        this.itemAktif = { kat: 'terrain', mode: 'bioma' }
        if (this.alat !== 'isi') this.setAlat('kuas')
        this.segarkanBiomaUi()
        this.renderPaletItem()
        this.tampilkanToast(`Kuas Bioma: ${INFO_BIOMA[bId].nama} (lukis area atau pakai 🪣 Isi per pulau/lantai)`)
      })
      this.biomaBtns.push(sw)
      biomaBox.append(sw)
    }
    const btnBiomaSemua = el('button', 'ed-chip', '🌐')
    btnBiomaSemua.type = 'button'
    btnBiomaSemua.dataset['biomaTerapkanSemua'] = '1'
    btnBiomaSemua.title = 'Terapkan Bioma aktif ke seluruh peta (atau ke Lantai aktif bila filter lantai menyala)'
    btnBiomaSemua.addEventListener('click', () => this.terapkanBiomaMassal())
    biomaBox.append(btnBiomaSemua)

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

    // === 1.5. BAR FILTER FOKUS & KUNCI LAYER (ALA WC3 WORLD EDITOR / RA3 WORLD BUILDER) ===
    const filterBar = el('div', 'ed-filter-bar')

    const grupLayer = el('div', 'ed-filter-grup')
    grupLayer.append(el('span', 'ed-filter-lbl', 'Fokus:'))
    for (const [id, lbl, tip] of [
      ['semua', '🌐 Semua', 'Edit semua lapisan secara bebas'],
      ['terrain', '⛰️ Terrain', 'Fokus & kunci ke Terrain saja (entitas lain abu-abu & aman)'],
      ['karakter', '⚔️ Karakter', 'Fokus Spawn, Unit, Bangunan, & Camp Goblin (lainnya kabut tipis & terkunci)'],
      ['resource', '⛏️ Resource', 'Fokus Tambang, Batu Emas, Pohon, Domba, & Bonus (lainnya terkunci)'],
      ['deko', '🌿 Deko', 'Fokus Dekorasi saja (terrain, karakter, & resource terkunci)'],
    ] as const) {
      const b = el('button', 'ed-chip', lbl)
      b.type = 'button'
      b.title = tip
      b.dataset['filterLayer'] = id
      b.addEventListener('click', () => this.setFilterLayer(id))
      this.filterLayerBtns.push(b)
      grupLayer.append(b)
    }

    this.grupFilterLantai = el('div', 'ed-filter-grup')
    this.grupFilterLantai.append(el('span', 'ed-filter-lbl', 'Lantai:'))
    for (const [lv, lbl, tip] of [
      [0, 'Semua', 'Edit semua tingkat lantai'],
      [1, 'Lv.1', 'Kunci ketat ke Lantai 1 (Dataran) — Lv.2 & Lv.3 abu-abu & aman'],
      [2, 'Lv.2', 'Kunci ketat ke Lantai 2 (Plateau) — Lv.1 & Lv.3 abu-abu & aman'],
      [3, 'Lv.3', 'Kunci ketat ke Lantai 3 (Puncak) — Lv.1 & Lv.2 abu-abu & aman'],
    ] as readonly [FilterLantai, string, string][]) {
      const b = el('button', 'ed-chip', lbl)
      b.type = 'button'
      b.title = tip
      b.dataset['filterLantai'] = String(lv)
      b.addEventListener('click', () => this.setFilterLantai(lv))
      this.filterLantaiBtns.push(b)
      this.grupFilterLantai.append(b)
    }

    this.grupFilterPemain = el('div', 'ed-filter-grup')
    this.grupFilterPemain.append(el('span', 'ed-filter-lbl', 'Pemain:'))
    const opsiPemain: readonly { val: FilterPemain; lbl: string; warna?: string; tip: string }[] = [
      { val: 'semua', lbl: 'Semua', tip: 'Tampilkan & edit objek semua pemain' },
      { val: -1, lbl: 'N', warna: '#7d7360', tip: 'Fokus objek Netral & Goblin saja' },
      ...WARNA_SLOTS.map((tim, i) => ({
        val: i as FilterPemain,
        lbl: `P${i + 1}`,
        warna: WARNA_TIM[tim].utama,
        tip: `Fokus objek Pemain ${i + 1} (${WARNA_TIM[tim].nama}) saja`,
      })),
    ]
    for (const op of opsiPemain) {
      const b = el('button', op.warna ? 'ed-chip pemain' : 'ed-chip', op.lbl)
      b.type = 'button'
      b.title = op.tip
      if (op.warna) b.style.background = op.warna
      b.dataset['filterPemain'] = String(op.val)
      b.addEventListener('click', () => this.setFilterPemain(op.val))
      this.filterPemainBtns.push(b)
      this.grupFilterPemain.append(b)
    }

    this.btnPathing = el('button', 'ed-chip', '🧭 Pathing')
    this.btnPathing.type = 'button'
    this.btnPathing.dataset['togglePathing'] = '1'
    this.btnPathing.title = 'Tampilkan peta jalan / chokepoint / tebing (P)'
    this.btnPathing.addEventListener('click', () => {
      this.tampilPathing = !this.tampilPathing
      this.btnPathing.classList.toggle('aktif', this.tampilPathing)
      this.tampilkanToast(this.tampilPathing ? 'Pathing Map: Hijau=Jalan · Kuning=Ramp/Jemb · Merah=Blokir' : 'Pathing Map: Off')
    })

    filterBar.append(grupLayer, this.grupFilterLantai, this.grupFilterPemain, this.btnPathing)
    this.akar.append(filterBar)

    // === 2. BADAN UTAMA (PALET KIRI | KANVAS TENGAH | MINIMAP & VALIDASI KANAN) ===
    const badan = el('div', 'ed-badan')

    // 2a. Dock Palet Kiri
    this.paletDock = el('aside', 'ed-palet buka')
    const boxAlat = el('div', 'ed-subkotak')
    boxAlat.append(el('div', 'ed-label', 'Alat Editor'))
    this.kontainerAlat = el('div', 'ed-alat-baris')
    for (const [id, ikon, tip] of [
      ['pilih', '🖱️', 'Pilih & Pindah Objek / Seret Kotak (V)'],
      ['kuas', '🖌️', 'Kuas Lukis (B)'],
      ['isi', '🪣', 'Ember Isi Terrain / Bioma (F)'],
      ['hapus', '🧹', 'Hapus Sesuai Filter Aktif (E)'],
      ['pipet', '💧', 'Pipet Ambil Contoh & Bioma (I)'],
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

    // Kategori Palet (5 tab selaras dengan Filter Layer)
    const boxKat = el('div', 'ed-subkotak')
    this.kontainerKat = el('div', 'ed-kat-tabs')
    for (const [k, ikon, tip] of [
      ['terrain', '⛰️', 'Terrain, Bioma Per-Area, Elevasi 3 Tingkat, Tangga & Lereng, Jembatan'],
      ['karakter', '⚔️', 'Spawn Pemain, Unit/Pasukan Awal, & Camp Goblin'],
      ['bangunan', '🏰', 'Bangunan Kerajaan, Reruntuhan, & Struktur Goblin'],
      ['resource', '⛏️', 'Tambang Emas, Batu Emas, Hutan/Pohon, Domba, & Bonus'],
      ['deko', '🌿', '42 Dekorasi (Semak, Batu, Karang, Api, Bebek, Awan)'],
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

    // 2c. Dock Kanan (Minimap Live + Inspector Objek + Validasi + Pintasan)
    this.kananDock = el('aside', 'ed-kanan')
    const miniBox = el('div', 'ed-minimap-box')
    this.minimapKanvas = el('canvas', 'ed-minimap')
    this.minimapKanvas.width = 192
    this.minimapKanvas.height = 192
    this.mctx = this.minimapKanvas.getContext('2d', { alpha: false })
    miniBox.append(this.minimapKanvas)

    this.inspectorEl = el('div', 'ed-inspector')

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
      '• V: Pilih & pindah objek (Del: hapus)\n• Klik kanan: hapus sesuai filter\n• R: putar tangga/lereng · P: Pathing\n• Spasi / WASD / 2 Jari: geser & zoom\n• Ctrl+Z / Ctrl+Y: Undo/Redo',
    )
    pintasanEl.style.whiteSpace = 'pre-line'
    tipBox.append(this.infoTileEl, pintasanEl)

    this.kananDock.append(miniBox, this.inspectorEl, validBox, statBox, tipBox)
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
    this.segarkanFilterUi()
    this.segarkanAlatUi()
    this.renderPaletItem()
    this.renderInspector()
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
      ramp: decodeRle(data.rampRle, total, RAMP_MAKS),
      jembatan: decodeRle(data.jembatanRle, total, 2),
      jalan: decodeRle(data.jalanRle, total, 1),
      bioma: data.bioma,
      biomaGrid: decodeBiomaGrid(data.biomaRle, total, data.bioma),
    }
    this.biomaKuas = data.bioma
    this.entitas = klonEntitas(data.entitas)
    this.seleksi = []
    this.riwayatUndo = []
    this.riwayatRedo = []
    this.renderTerrain.setTerrain(this.terrain, true)
    this.minimapKotor = true
    this.segarkanBiomaUi()
    if (this.kategori === 'terrain') this.renderPaletItem()
    this.segarkanAlatUi()
    this.renderInspector()
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
    if (a !== 'pilih') {
      this.seleksi = []
      this.renderInspector()
    }
    this.kanvas.style.cursor = a === 'geser' ? 'grab' : a === 'pipet' ? 'copy' : a === 'pilih' ? 'default' : 'crosshair'
    this.segarkanAlatUi()
  }

  private setFilterLayer(layer: FilterLayer): void {
    this.filterLayer = layer
    if (layer !== 'semua' && layer !== 'terrain') {
      this.filterLantai = 0
    }
    this.seleksi = this.seleksi.filter((r) => this.refLolosFilter(r))
    this.segarkanFilterUi()
    this.renderInspector()
    const nama: Record<FilterLayer, string> = {
      semua: 'Semua Lapisan',
      terrain: 'Terrain (entitas lain terkunci)',
      karakter: 'Karakter & Bangunan (terrain & lainnya terkunci)',
      resource: 'Resource (lainnya terkunci)',
      deko: 'Dekorasi (lainnya terkunci)',
    }
    this.tampilkanToast(`Fokus: ${nama[layer]}`)
  }

  private setFilterLantai(lv: FilterLantai): void {
    this.filterLantai = lv
    if (lv !== 0 && this.filterLayer !== 'semua' && this.filterLayer !== 'terrain') {
      this.filterLayer = 'terrain'
    }
    this.seleksi = this.seleksi.filter((r) => this.refLolosFilter(r))
    this.segarkanFilterUi()
    this.renderInspector()
    this.tampilkanToast(lv === 0 ? 'Filter Lantai: Semua Lantai' : `Kunci Lantai Lv.${lv} — lantai lain abu-abu & terkunci!`)
  }

  private setFilterPemain(p: FilterPemain): void {
    this.filterPemain = p
    if (p !== 'semua') {
      this.slotDipilih = p
      if (this.filterLayer === 'terrain' || this.filterLayer === 'resource' || this.filterLayer === 'deko') {
        this.filterLayer = 'karakter'
        this.filterLantai = 0
      }
    }
    this.seleksi = this.seleksi.filter((r) => this.refLolosFilter(r))
    this.segarkanFilterUi()
    this.renderKonteksAlat()
    this.renderInspector()
    const lbl = p === 'semua' ? 'Semua Pemain' : p === -1 ? 'Netral & Goblin' : `Pemain ${p + 1} (${WARNA_TIM[WARNA_SLOTS[p]!].nama})`
    this.tampilkanToast(`Filter Pemain: ${lbl}`)
  }

  private segarkanFilterUi(): void {
    for (const b of this.filterLayerBtns) {
      b.classList.toggle('aktif', b.dataset['filterLayer'] === this.filterLayer)
    }
    for (const b of this.filterLantaiBtns) {
      b.classList.toggle('aktif', Number(b.dataset['filterLantai']) === this.filterLantai)
    }
    for (const b of this.filterPemainBtns) {
      b.classList.toggle('aktif', b.dataset['filterPemain'] === String(this.filterPemain))
    }
    this.grupFilterLantai.style.opacity = (this.filterLayer === 'semua' || this.filterLayer === 'terrain') ? '1' : '0.45'
    this.grupFilterPemain.style.opacity = (this.filterLayer === 'semua' || this.filterLayer === 'karakter') ? '1' : '0.45'
  }

  private terapkanBiomaMassal(): void {
    if (this.filterLayer !== 'semua' && this.filterLayer !== 'terrain') {
      this.tampilkanToast('Filter bukan Terrain — ubah Fokus ke Semua / Terrain dulu!', true)
      return
    }
    const grid = this.pastikanBiomaGrid()
    this.dorongUndo()
    let ubah = 0
    for (let i = 0; i < grid.length; i++) {
      if (this.filterLantai !== 0 && this.terrain.tinggi[i] !== this.filterLantai) continue
      if (grid[i] !== this.biomaKuas) {
        grid[i] = this.biomaKuas
        ubah++
      }
    }
    if (this.filterLantai === 0) this.terrain.bioma = this.biomaKuas
    if (ubah === 0) {
      this.riwayatUndo.pop()
      this.segarkanAlatUi()
      this.tampilkanToast('Bioma target sudah sama.')
      return
    }
    this.renderTerrain.kotorkanSemua()
    this.minimapKotor = true
    this.segarkanBiomaUi()
    this.tampilkanToast(
      this.filterLantai === 0
        ? `Seluruh peta diubah ke Bioma: ${INFO_BIOMA[this.biomaKuas].nama}`
        : `Semua Lantai Lv.${this.filterLantai} diubah ke Bioma: ${INFO_BIOMA[this.biomaKuas].nama}`,
    )
  }

  private pastikanBiomaGrid(): Uint8Array {
    const total = PETA_KOLOM * PETA_BARIS
    if (!this.terrain.biomaGrid || this.terrain.biomaGrid.length !== total) {
      this.terrain.biomaGrid = new Uint8Array(total).fill(this.terrain.bioma ?? 1)
    }
    return this.terrain.biomaGrid
  }

  private segarkanBiomaUi(): void {
    const b = this.biomaKuas
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
    if (
      this.itemAktif.kat === 'spawn' ||
      this.itemAktif.kat === 'bangunan' ||
      (this.itemAktif.kat === 'unit' && !this.itemAktif.jenis.startsWith('goblin'))
    ) {
      const box = el('div', 'ed-slot-baris')
      box.style.marginTop = '4px'
      if (this.itemAktif.kat === 'bangunan' || this.itemAktif.kat === 'unit') {
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

    const tambahTombol = (
      id: string, label: string, aset: Aset | undefined, item: JenisItem,
      sx?: number, sy?: number, sw?: number, sh?: number,
    ): void => {
      const btn = el('button', `ed-item-btn${this.itemIdAktif === id ? ' aktif' : ''}`)
      btn.type = 'button'
      btn.dataset['itemId'] = id
      btn.title = label
      const k = el('canvas')
      k.width = 28
      k.height = 28
      if (aset) {
        gambarIkonMini(k, aset, sx, sy, sw, sh)
        this.semuaIkonMini.push({
          k, aset,
          ...(sx !== undefined ? { sx } : {}),
          ...(sy !== undefined ? { sy } : {}),
          ...(sw !== undefined ? { sw } : {}),
          ...(sh !== undefined ? { sh } : {}),
        })
      }
      btn.append(k, el('span', undefined, label))
      btn.addEventListener('click', () => {
        this.itemIdAktif = id
        this.itemAktif = item
        if (this.alat === 'pilih' || this.alat === 'geser' || this.alat === 'hapus' || this.alat === 'pipet') {
          this.setAlat('kuas')
        }
        this.segarkanPilihanItemUi()
        this.renderKonteksAlat()
      })
      this.kontainerItem.append(btn)
    }

    if (this.kategori === 'terrain') {
      const asetBio = asetBiomaEditor(this.biomaKuas)
      for (const it of KATALOG_TERRAIN) {
        tambahTombol(it.id, it.label, it.ikutBioma ? asetBio : it.aset, it.item, it.sx, it.sy, it.sw, it.sh)
      }
    } else if (this.kategori === 'karakter') {
      for (const it of KATALOG_KARAKTER) tambahTombol(it.id, it.label, it.aset, it.item)
    } else if (this.kategori === 'bangunan') {
      for (const it of KATALOG_BANGUNAN) tambahTombol(it.id, it.label, it.aset, it.item)
    } else if (this.kategori === 'resource') {
      for (const it of KATALOG_RESOURCE) tambahTombol(it.id, it.label, it.aset, it.item)
    } else {
      for (const [jenis, label] of NAMA_DEKO_CUSTOM) {
        tambahTombol(`dk-${jenis}`, label, infoAsetDekoCustom(jenis).aset, { kat: 'deko', jenis })
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
      gambarIkonMini(item.k, item.aset, item.sx, item.sy, item.sw, item.sh)
    }
  }

  // --- Undo / Redo ---

  private tangkapSnapshot(): SnapshotRiwayat {
    return {
      bioma: this.terrain.bioma ?? 1,
      biomaRle: encodeRle(this.pastikanBiomaGrid()),
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
    this.pastikanBiomaGrid().set(decodeBiomaGrid(s.biomaRle, total, s.bioma))
    this.terrain.tinggi.set(decodeRle(s.tinggiRle, total, TINGGI.puncak))
    this.terrain.ramp.set(decodeRle(s.rampRle, total, RAMP_MAKS))
    this.terrain.jembatan.set(decodeRle(s.jembatanRle, total, 2))
    this.terrain.jalan.set(decodeRle(s.jalanRle, total, 1))
    this.entitas = klonEntitas(JSON.parse(s.entitasJson) as EntitasPetaCustom)
    this.seleksi = []
    this.renderTerrain.kotorkanSemua()
    this.minimapKotor = true
    this.segarkanBiomaUi()
    if (this.kategori === 'terrain') this.renderPaletItem()
    this.segarkanAlatUi()
    this.renderInspector()
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

  // --- Filter Layer / Lantai / Pemain, Seleksi, Pindah, & Inspector ---

  private bolehEditTerrainDi(tx: number, ty: number): boolean {
    if (this.filterLayer !== 'semua' && this.filterLayer !== 'terrain') return false
    if (this.filterLantai !== 0) {
      return this.terrain.tinggi[ty * PETA_KOLOM + tx] === this.filterLantai
    }
    return true
  }

  private lolosFilterEntitas(grup: GrupEntitas, slotPemilik: number, tx: number, ty: number): boolean {
    const lyr = layerDariGrup(grup)
    if (this.filterLayer !== 'semua' && this.filterLayer !== lyr) return false
    if (this.filterLantai !== 0 && this.terrain.tinggi[ty * PETA_KOLOM + tx] !== this.filterLantai) return false
    if (this.filterPemain !== 'semua') {
      if (lyr === 'karakter') return slotPemilik === this.filterPemain
      if (this.filterPemain >= 0) return false
    }
    return true
  }

  private ambilObjekRef(ref: RefEntitas): { tx: number; ty: number; slot: number } | null {
    switch (ref.grup) {
      case 'spawn': {
        const o = this.entitas.spawn[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: o.slot } : null
      }
      case 'unit': {
        const o = this.entitas.unit[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: o.slot } : null
      }
      case 'bangunan': {
        const o = this.entitas.bangunan[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: o.slot } : null
      }
      case 'camp': {
        const o = this.entitas.camp[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
      case 'tambang': {
        const o = this.entitas.tambang[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
      case 'pohon': {
        const o = this.entitas.pohon[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
      case 'domba': {
        const o = this.entitas.domba[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
      case 'bonus': {
        const o = this.entitas.bonus[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
      case 'deko': {
        const o = this.entitas.deko[ref.indeks]
        return o ? { tx: o.tx, ty: o.ty, slot: -1 } : null
      }
    }
  }

  private refLolosFilter(ref: RefEntitas): boolean {
    const o = this.ambilObjekRef(ref)
    if (!o) return false
    return this.lolosFilterEntitas(ref.grup, o.slot, o.tx, o.ty)
  }

  private apakahTerpilih(grup: GrupEntitas, indeks: number): boolean {
    return this.seleksi.some((s) => s.grup === grup && s.indeks === indeks)
  }

  private adaEntitasSolidDi(tx: number, ty: number, kecualikan?: { grup: GrupEntitas; indeks?: number }): boolean {
    const cek = <T extends { tx: number; ty: number }>(g: GrupEntitas, arr: T[]): boolean =>
      arr.some((e, idx) =>
        e.tx === tx && e.ty === ty &&
        !(kecualikan && kecualikan.grup === g && (kecualikan.indeks === undefined || kecualikan.indeks === idx)),
      )
    return (
      cek('spawn', this.entitas.spawn) ||
      cek('bangunan', this.entitas.bangunan) ||
      cek('tambang', this.entitas.tambang) ||
      cek('camp', this.entitas.camp) ||
      cek('pohon', this.entitas.pohon)
    )
  }

  private cariEntitasDi(tx: number, ty: number): RefEntitas | null {
    const urutan: readonly GrupEntitas[] = ['spawn', 'unit', 'bangunan', 'camp', 'tambang', 'domba', 'bonus', 'pohon', 'deko']
    const lenGrup = (g: GrupEntitas): number => this.entitas[g].length
    for (const g of urutan) {
      for (let i = lenGrup(g) - 1; i >= 0; i--) {
        const ref: RefEntitas = { grup: g, indeks: i }
        const o = this.ambilObjekRef(ref)
        if (!o || !this.lolosFilterEntitas(g, o.slot, o.tx, o.ty)) continue
        if (o.tx === tx && o.ty === ty) return ref
      }
    }
    return null
  }

  private cariEntitasDalamKotak(x1: number, y1: number, x2: number, y2: number): RefEntitas[] {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    const hasil: RefEntitas[] = []
    const urutan: readonly GrupEntitas[] = ['spawn', 'unit', 'bangunan', 'camp', 'tambang', 'domba', 'bonus', 'pohon', 'deko']
    for (const g of urutan) {
      const len = this.entitas[g].length
      for (let i = 0; i < len; i++) {
        const ref: RefEntitas = { grup: g, indeks: i }
        const o = this.ambilObjekRef(ref)
        if (!o || !this.lolosFilterEntitas(g, o.slot, o.tx, o.ty)) continue
        const wx = o.tx * TILE + TILE / 2
        const wy = o.ty * TILE + TILE / 2
        if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) hasil.push(ref)
      }
    }
    return hasil
  }

  private bolehTaruhRefDi(ref: RefEntitas, nx: number, ny: number): boolean {
    if (!this.tileDalamBatas(nx, ny)) return false
    const lv = this.terrain.tinggi[ny * PETA_KOLOM + nx]!
    if (this.filterLantai !== 0 && lv !== this.filterLantai) return false
    if (ref.grup === 'deko') {
      const d = this.entitas.deko[ref.indeks]
      if (!d) return false
      if (lv === TINGGI.air && !bolehDekoDiAir(d.jenis)) return false
      return true
    }
    return lv !== TINGGI.air
  }

  private pindahTerpilih(dx: number, dy: number): void {
    if (this.seleksi.length === 0 || (dx === 0 && dy === 0)) return
    let adaValid = false
    for (const r of this.seleksi) {
      const o = this.ambilObjekRef(r)
      if (o && this.bolehTaruhRefDi(r, o.tx + dx, o.ty + dy)) {
        adaValid = true
        break
      }
    }
    if (!adaValid) {
      this.tampilkanToast('Tujuan pindah tidak sah (air / di luar filter lantai)!', true)
      return
    }
    this.dorongUndo()
    let terpindah = 0
    for (const r of this.seleksi) {
      const o = this.ambilObjekRef(r)
      if (!o) continue
      const nx = o.tx + dx
      const ny = o.ty + dy
      if (!this.bolehTaruhRefDi(r, nx, ny)) continue
      const item = this.entitas[r.grup][r.indeks]
      if (item) {
        item.tx = nx
        item.ty = ny
        terpindah++
      }
    }
    if (terpindah > 0) {
      this.minimapKotor = true
      this.renderInspector()
      this.perbaruiValidasiUi()
      this.tampilkanToast(`Dipindah: ${terpindah} objek`)
    } else {
      this.riwayatUndo.pop()
      this.segarkanAlatUi()
    }
  }

  private hapusTerpilih(): void {
    if (this.seleksi.length === 0) return
    this.dorongUndo()
    const perGrup = new Map<GrupEntitas, Set<number>>()
    for (const r of this.seleksi) {
      let s = perGrup.get(r.grup)
      if (!s) { s = new Set<number>(); perGrup.set(r.grup, s) }
      s.add(r.indeks)
    }
    const jumlah = this.seleksi.length
    const buang = <T>(g: GrupEntitas, arr: T[]): T[] => {
      const s = perGrup.get(g)
      return s ? arr.filter((_, i) => !s.has(i)) : arr
    }
    this.entitas.spawn = buang('spawn', this.entitas.spawn)
    this.entitas.unit = buang('unit', this.entitas.unit)
    this.entitas.bangunan = buang('bangunan', this.entitas.bangunan)
    this.entitas.camp = buang('camp', this.entitas.camp)
    this.entitas.tambang = buang('tambang', this.entitas.tambang)
    this.entitas.pohon = buang('pohon', this.entitas.pohon)
    this.entitas.domba = buang('domba', this.entitas.domba)
    this.entitas.bonus = buang('bonus', this.entitas.bonus)
    this.entitas.deko = buang('deko', this.entitas.deko)
    this.seleksi = []
    this.minimapKotor = true
    this.renderInspector()
    this.perbaruiValidasiUi()
    this.tampilkanToast(`Dihapus: ${jumlah} objek terpilih`)
  }

  private renderInspector(): void {
    this.inspectorEl.textContent = ''
    this.seleksi = this.seleksi.filter((r) => this.ambilObjekRef(r) !== null)
    if (this.seleksi.length === 0) {
      this.inspectorEl.classList.remove('tampil')
      return
    }
    this.inspectorEl.classList.add('tampil')

    if (this.seleksi.length > 1) {
      const head = el('div', 'ed-label', `Inspector (${this.seleksi.length} objek)`)
      this.inspectorEl.append(head)
      const adaPemilik = this.seleksi.some((r) =>
        r.grup === 'bangunan' || (r.grup === 'unit' && !this.entitas.unit[r.indeks]?.jenis.startsWith('goblin')),
      )
      if (adaPemilik) {
        const barisSlot = el('div', 'ed-slot-baris')
        const buatDot = (sl: number, lbl: string, warna: string): void => {
          const b = el('button', 'ed-slot-dot', lbl)
          b.type = 'button'
          b.style.background = warna
          b.addEventListener('click', () => {
            this.dorongUndo()
            for (const r of this.seleksi) {
              if (r.grup === 'bangunan') {
                const bg = this.entitas.bangunan[r.indeks]
                if (bg) bg.slot = sl
              } else if (r.grup === 'unit') {
                const u = this.entitas.unit[r.indeks]
                if (u && !u.jenis.startsWith('goblin')) u.slot = sl
              }
            }
            this.minimapKotor = true
            this.renderInspector()
          })
          barisSlot.append(b)
        }
        buatDot(-1, 'N', '#7d7360')
        WARNA_SLOTS.forEach((tim, i) => buatDot(i, `P${i + 1}`, WARNA_TIM[tim].utama))
        this.inspectorEl.append(el('div', 'ed-pintasan', 'Ubah Pemilik Massal:'), barisSlot)
      }
      const btnDel = el('button', 'ed-btn bahaya', `🗑 Hapus ${this.seleksi.length} Objek (Del)`)
      btnDel.type = 'button'
      btnDel.addEventListener('click', () => this.hapusTerpilih())
      this.inspectorEl.append(btnDel)
      return
    }

    const ref = this.seleksi[0]!
    const info = this.ambilObjekRef(ref)
    if (!info) return
    const judulMap: Record<GrupEntitas, string> = {
      spawn: `Spawn P${info.slot + 1}`,
      unit: NAMA_UNIT_LABEL[this.entitas.unit[ref.indeks]?.jenis ?? 'warrior'],
      bangunan: `Bangunan: ${this.entitas.bangunan[ref.indeks]?.jenis ?? ''}`,
      camp: `Camp Goblin (${this.entitas.camp[ref.indeks]?.jenis ?? 'kecil'})`,
      tambang: this.entitas.tambang[ref.indeks]?.jenis === 'mine' ? 'Tambang Emas' : 'Batu Emas',
      pohon: `Pohon (${this.entitas.pohon[ref.indeks]?.varian ?? 'pinus1'})`,
      domba: 'Domba',
      bonus: `Bonus ${this.entitas.bonus[ref.indeks]?.jenis ?? ''}`,
      deko: `Dekorasi: ${this.entitas.deko[ref.indeks]?.jenis ?? ''}`,
    }
    this.inspectorEl.append(
      el('div', 'ed-label', judulMap[ref.grup]),
      el('div', 'ed-pintasan', `Posisi: (${info.tx}, ${info.ty}) · Seret untuk pindah`),
    )

    // Kontrol pemilik (Spawn / Bangunan / Unit non-goblin)
    if (
      ref.grup === 'spawn' ||
      ref.grup === 'bangunan' ||
      (ref.grup === 'unit' && !this.entitas.unit[ref.indeks]?.jenis.startsWith('goblin'))
    ) {
      const box = el('div', 'ed-slot-baris')
      const tambahDot = (sl: number, lbl: string, warna: string): void => {
        const b = el('button', `ed-slot-dot${info.slot === sl ? ' aktif' : ''}`, lbl)
        b.type = 'button'
        b.style.background = warna
        b.addEventListener('click', () => {
          this.dorongUndo()
          if (ref.grup === 'spawn') {
            const sp = this.entitas.spawn[ref.indeks]
            if (sp) {
              const lain = this.entitas.spawn.find((s, i) => i !== ref.indeks && s.slot === sl)
              if (lain) lain.slot = sp.slot
              sp.slot = sl
              this.entitas.spawn.sort((a, b2) => a.slot - b2.slot)
              const baruIdx = this.entitas.spawn.indexOf(sp)
              if (baruIdx >= 0) this.seleksi = [{ grup: 'spawn', indeks: baruIdx }]
            }
          } else if (ref.grup === 'bangunan') {
            const bg = this.entitas.bangunan[ref.indeks]
            if (bg) bg.slot = sl
          } else if (ref.grup === 'unit') {
            const u = this.entitas.unit[ref.indeks]
            if (u) u.slot = sl
          }
          this.minimapKotor = true
          this.renderInspector()
          this.perbaruiValidasiUi()
        })
        box.append(b)
      }
      if (ref.grup !== 'spawn') tambahDot(-1, 'N', '#7d7360')
      WARNA_SLOTS.forEach((tim, i) => tambahDot(i, `P${i + 1}`, WARNA_TIM[tim].utama))
      this.inspectorEl.append(box)
    }

    if (ref.grup === 'bangunan') {
      const bg = this.entitas.bangunan[ref.indeks]
      if (bg) {
        const btnH = el('button', `ed-btn${bg.hancur ? ' aktif' : ''}`, bg.hancur ? 'Fase: Reruntuhan' : 'Fase: Bangunan Utuh')
        btnH.type = 'button'
        btnH.addEventListener('click', () => {
          this.dorongUndo()
          if (bg.hancur) delete bg.hancur
          else bg.hancur = true
          this.renderInspector()
        })
        this.inspectorEl.append(btnH)
      }
    } else if (ref.grup === 'camp') {
      const cp = this.entitas.camp[ref.indeks]
      if (cp) {
        const btnC = el('button', 'ed-btn', cp.jenis === 'besar' ? 'Tipe: Camp Boss (ubah ke Kecil)' : 'Tipe: Camp Kecil (ubah ke Boss)')
        btnC.type = 'button'
        btnC.addEventListener('click', () => {
          this.dorongUndo()
          cp.jenis = cp.jenis === 'besar' ? 'kecil' : 'besar'
          this.minimapKotor = true
          this.renderInspector()
        })
        this.inspectorEl.append(btnC)
      }
    } else if (ref.grup === 'tambang') {
      const mb = this.entitas.tambang[ref.indeks]
      if (mb) {
        const row = el('div', 'ed-insp-row')
        const inp = el('input', 'ed-insp-num')
        inp.type = 'number'
        inp.min = '100'
        inp.max = '10000'
        inp.step = '100'
        inp.value = String(mb.gold ?? (mb.jenis === 'mine' ? 3500 : 1200))
        inp.addEventListener('change', () => {
          const v = Math.max(100, Math.min(10000, Math.round(Number(inp.value) || 1200)))
          this.dorongUndo()
          mb.gold = v
          inp.value = String(v)
        })
        row.append(el('span', 'ed-pintasan', 'Gold:'), inp)
        for (const preset of [1500, 3500, 6000]) {
          const bp = el('button', 'ed-chip', `${preset}`)
          bp.type = 'button'
          bp.addEventListener('click', () => {
            this.dorongUndo()
            mb.gold = preset
            this.renderInspector()
          })
          row.append(bp)
        }
        this.inspectorEl.append(row)
      }
    } else if (ref.grup === 'pohon') {
      const ph = this.entitas.pohon[ref.indeks]
      if (ph) {
        const row = el('div', 'ed-insp-row')
        const inp = el('input', 'ed-insp-num')
        inp.type = 'number'
        inp.min = '20'
        inp.max = '500'
        inp.step = '20'
        inp.value = String(ph.kayu ?? 120)
        inp.addEventListener('change', () => {
          const v = Math.max(20, Math.min(500, Math.round(Number(inp.value) || 120)))
          this.dorongUndo()
          ph.kayu = v
          inp.value = String(v)
        })
        row.append(el('span', 'ed-pintasan', 'Kayu:'), inp)
        this.inspectorEl.append(row)
      }
    } else if (ref.grup === 'bonus') {
      const bn = this.entitas.bonus[ref.indeks]
      if (bn) {
        const row = el('div', 'ed-insp-row')
        const inp = el('input', 'ed-insp-num')
        inp.type = 'number'
        inp.min = '5'
        inp.max = '500'
        inp.value = String(bn.jumlah)
        inp.addEventListener('change', () => {
          const v = Math.max(5, Math.min(500, Math.round(Number(inp.value) || 25)))
          this.dorongUndo()
          bn.jumlah = v
          inp.value = String(v)
        })
        row.append(el('span', 'ed-pintasan', 'Jumlah:'), inp)
        this.inspectorEl.append(row)
      }
    }

    const btnDel = el('button', 'ed-btn bahaya', '🗑 Hapus Objek (Del)')
    btnDel.type = 'button'
    btnDel.addEventListener('click', () => this.hapusTerpilih())
    this.inspectorEl.append(btnDel)
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
      if (this.filterLayer !== 'semua' && this.filterLayer !== 'terrain') {
        if (this.tergambarPadaGores.size === 0) {
          this.tampilkanToast(`Terrain terkunci (Fokus aktif: ${this.filterLayer}) — ubah Fokus ke Semua / Terrain!`, true)
        }
        return
      }
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
          if (!this.bolehEditTerrainDi(x, y)) continue
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

    // Cek kunci layer sebelum melukis entitas
    const targetGrup: GrupEntitas =
      this.itemAktif.kat === 'hutanAcak' ? 'pohon' : this.itemAktif.kat
    const targetLayer = layerDariGrup(targetGrup)
    if (this.filterLayer !== 'semua' && this.filterLayer !== targetLayer) {
      if (this.tergambarPadaGores.size === 0) {
        this.tampilkanToast(`Terkunci oleh Fokus "${this.filterLayer}" — ganti Fokus ke Semua / ${targetLayer}!`, true)
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
          if (!this.lolosFilterEntitas('pohon', -1, x, y)) continue
          const idx = y * PETA_KOLOM + x
          if (this.terrain.tinggi[idx] === TINGGI.air || this.terrain.jembatan[idx]! > 0 || this.terrain.ramp[idx]! > 0) continue
          if (this.adaEntitasSolidDi(x, y, { grup: 'pohon' })) continue
          const jarakPohon = this.ukuranKuas > 1 ? 1.35 : 0.5
          if (this.entitas.pohon.some((p) => Math.hypot(p.tx - x, p.ty - y) < jarakPohon)) continue
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
      const baseSlot = Math.max(0, this.filterPemain !== 'semua' && this.filterPemain >= 0 ? this.filterPemain : this.slotDipilih)
      titikSim.forEach((s, i) => {
        const sl = (baseSlot + i) % 6
        if (this.filterLantai !== 0 && this.terrain.tinggi[s.ty * PETA_KOLOM + s.tx] !== this.filterLantai) return
        if (this.filterPemain !== 'semua' && sl !== this.filterPemain) return
        if (this.terrain.tinggi[s.ty * PETA_KOLOM + s.tx] === TINGGI.air) {
          this.terrain.tinggi[s.ty * PETA_KOLOM + s.tx] = TINGGI.dataran
          this.pastikanBiomaGrid()[s.ty * PETA_KOLOM + s.tx] = this.biomaKuas
          this.renderTerrain.kotorkanArea(s.tx, s.ty, s.tx, s.ty)
        }
        this.entitas.spawn = this.entitas.spawn.filter((sp) => sp.slot !== sl && !(sp.tx === s.tx && sp.ty === s.ty))
        this.entitas.spawn.push({ slot: sl, tx: s.tx, ty: s.ty })
        this.entitas.spawn.sort((a, b) => a.slot - b.slot)
        this.goresBerubah = true
      })
      if (this.goresBerubah) this.minimapKotor = true
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
    const bolehAtasAir = item.kat === 'deko' && bolehDekoDiAir(item.jenis)
    if (lv === TINGGI.air && !bolehAtasAir) return
    if (this.filterLantai !== 0 && lv !== this.filterLantai) return

    const slotAktif = this.filterPemain !== 'semua' ? this.filterPemain : this.slotDipilih
    switch (item.kat) {
      case 'unit': {
        const slot = item.jenis.startsWith('goblin') ? -1 : slotAktif
        if (!this.lolosFilterEntitas('unit', slot, tx, ty)) return
        this.entitas.unit = this.entitas.unit.filter((u) => !(u.tx === tx && u.ty === ty))
        this.entitas.unit.push({ tx, ty, jenis: item.jenis, slot })
        this.goresBerubah = true
        break
      }
      case 'tambang':
        if (!this.lolosFilterEntitas('tambang', -1, tx, ty)) return
        if (this.adaEntitasSolidDi(tx, ty, { grup: 'tambang' })) {
          this.tampilkanToast(`Tile (${tx}, ${ty}) sudah terisi objek solid lain!`, true)
          return
        }
        this.entitas.tambang = this.entitas.tambang.filter((m) => !(m.tx === tx && m.ty === ty))
        this.entitas.tambang.push({
          tx, ty, jenis: item.jenis,
          gold: item.jenis === 'mine' ? 3500 : 1200,
          ...(item.varian !== undefined ? { varian: item.varian } : {}),
        })
        this.goresBerubah = true
        break
      case 'pohon':
        if (!this.lolosFilterEntitas('pohon', -1, tx, ty)) return
        if (this.adaEntitasSolidDi(tx, ty, { grup: 'pohon' })) return
        this.entitas.pohon = this.entitas.pohon.filter((p) => !(p.tx === tx && p.ty === ty))
        this.entitas.pohon.push({ tx, ty, varian: item.varian, kayu: 120 })
        this.goresBerubah = true
        break
      case 'domba':
        if (!this.lolosFilterEntitas('domba', -1, tx, ty)) return
        this.entitas.domba = this.entitas.domba.filter((d) => !(d.tx === tx && d.ty === ty))
        this.entitas.domba.push({ tx, ty })
        this.goresBerubah = true
        break
      case 'bonus':
        if (!this.lolosFilterEntitas('bonus', -1, tx, ty)) return
        this.entitas.bonus = this.entitas.bonus.filter((b) => !(b.tx === tx && b.ty === ty))
        this.entitas.bonus.push({ tx, ty, jenis: item.jenis, jumlah: item.jumlah })
        this.goresBerubah = true
        break
      case 'camp':
        if (!this.lolosFilterEntitas('camp', -1, tx, ty)) return
        if (this.adaEntitasSolidDi(tx, ty, { grup: 'camp' })) {
          this.tampilkanToast(`Tile (${tx}, ${ty}) sudah terisi objek solid lain!`, true)
          return
        }
        this.entitas.camp = this.entitas.camp.filter((c) => !(c.tx === tx && c.ty === ty))
        this.entitas.camp.push({ tx, ty, jenis: item.jenis })
        this.goresBerubah = true
        break
      case 'deko':
        if (!this.lolosFilterEntitas('deko', -1, tx, ty)) return
        this.entitas.deko = this.entitas.deko.filter((d) => !(d.tx === tx && d.ty === ty && d.jenis === item.jenis))
        this.entitas.deko.push({ tx, ty, jenis: item.jenis })
        this.goresBerubah = true
        break
      case 'bangunan':
        if (!this.lolosFilterEntitas('bangunan', slotAktif, tx, ty)) return
        if (this.adaEntitasSolidDi(tx, ty, { grup: 'bangunan' })) {
          this.tampilkanToast(`Tile (${tx}, ${ty}) sudah terisi objek solid lain!`, true)
          return
        }
        this.entitas.bangunan = this.entitas.bangunan.filter((b) => !(b.tx === tx && b.ty === ty))
        this.entitas.bangunan.push({
          tx, ty, jenis: item.jenis, slot: slotAktif,
          ...(this.bangunanHancur ? { hancur: true } : {}),
        })
        this.goresBerubah = true
        break
    }
  }

  private deteksiArahRampAuto(tx: number, ty: number): 1 | 2 | 3 {
    const h = this.terrain.tinggi[ty * PETA_KOLOM + tx]!
    const hKiri = tinggiDi(this.terrain, tx - 1, ty)
    const hKanan = tinggiDi(this.terrain, tx + 1, ty)
    const hAtas = tinggiDi(this.terrain, tx, ty - 1)
    const hBawah = tinggiDi(this.terrain, tx, ty + 1)
    const ns = (hAtas > TINGGI.air && hAtas !== h) || (hBawah > TINGGI.air && hBawah !== h)
    const naikTimur = hKanan > h
    const naikBarat = hKiri > h
    const turunBarat = hKiri > TINGGI.air && hKiri < h
    const turunTimur = hKanan > TINGGI.air && hKanan < h
    if ((naikTimur || turunBarat) && !ns && !(naikBarat || turunTimur)) return 2
    if ((naikBarat || turunTimur) && !ns && !(naikTimur || turunBarat)) return 3
    if (ns) return 1
    // Periksa juga tangga batu kiri/kanan di atas/bawah supaya lebar tangga konsisten
    if (ty > 0) {
      const rAtas = this.terrain.ramp[(ty - 1) * PETA_KOLOM + tx] ?? 0
      if (rAtas === 2 || rAtas === 3) return rAtas
    }
    if (ty + 1 < PETA_BARIS) {
      const rBawah = this.terrain.ramp[(ty + 1) * PETA_KOLOM + tx] ?? 0
      if (rBawah === 2 || rBawah === 3) return rBawah
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
    const bioGrid = this.pastikanBiomaGrid()
    const bLama = bioGrid[idx]!

    switch (mode) {
      case 'air':
        this.terrain.tinggi[idx] = TINGGI.air
        this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.bersihkanEntitasAtasAir(tx, ty)
        break
      case 'dataran':
        if (hLama === TINGGI.air) bioGrid[idx] = this.biomaKuas
        this.terrain.tinggi[idx] = TINGGI.dataran
        this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'plateau':
        if (hLama === TINGGI.air) bioGrid[idx] = this.biomaKuas
        this.terrain.tinggi[idx] = TINGGI.plateau
        if (hLama !== TINGGI.plateau) this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'puncak':
        if (hLama === TINGGI.air) bioGrid[idx] = this.biomaKuas
        this.terrain.tinggi[idx] = TINGGI.puncak
        if (hLama !== TINGGI.puncak) this.terrain.ramp[idx] = 0
        this.terrain.jembatan[idx] = 0
        break
      case 'bioma':
        if (hLama !== TINGGI.air && jLama === 0) {
          bioGrid[idx] = this.biomaKuas
        }
        break
      case 'jalan':
        if (hLama !== TINGGI.air && jLama === 0 && rLama === 0) this.terrain.jalan[idx] = 1
        break
      case 'hapusJalan':
        this.terrain.jalan[idx] = 0
        break
      case 'rampAuto': {
        if (this.terrain.tinggi[idx] === TINGGI.air) {
          this.terrain.tinggi[idx] = TINGGI.dataran
          bioGrid[idx] = this.biomaKuas
        }
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.terrain.ramp[idx] = this.deteksiArahRampAuto(tx, ty)
        break
      }
      case 'rampNS':
        if (this.terrain.tinggi[idx] === TINGGI.air) {
          this.terrain.tinggi[idx] = TINGGI.dataran
          bioGrid[idx] = this.biomaKuas
        }
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        this.terrain.ramp[idx] = 1
        break
      case 'rampBarat':
      case 'rampTimur': {
        if (this.terrain.tinggi[idx] === TINGGI.air) {
          this.terrain.tinggi[idx] = TINGGI.dataran
          bioGrid[idx] = this.biomaKuas
        }
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        const kode = mode === 'rampBarat' ? 2 : 3
        this.terrain.ramp[idx] = balikKodeRamp(kode, balikX)
        break
      }
      case 'rampRumputBarat':
      case 'rampRumputTimur': {
        if (this.terrain.tinggi[idx] === TINGGI.air) {
          this.terrain.tinggi[idx] = TINGGI.dataran
          bioGrid[idx] = this.biomaKuas
        }
        this.terrain.jembatan[idx] = 0
        this.terrain.jalan[idx] = 0
        const kode = balikKodeRamp(mode === 'rampRumputBarat' ? 4 : 5, balikX)
        // Jika diklik di samping tebing plateau/puncak (+1 level solid), otomatis samakan tinggi & bioma agar lereng menyatu mulus!
        const hx = kode === 4 ? tx + 1 : tx - 1
        if (hx >= 0 && hx < PETA_KOLOM && this.filterLantai === 0) {
          const idxTinggi = ty * PETA_KOLOM + hx
          const hSamping = this.terrain.tinggi[idxTinggi]!
          const rSamping = this.terrain.ramp[idxTinggi]!
          if (rSamping === 0 && hSamping === this.terrain.tinggi[idx]! + 1 && hSamping <= TINGGI.puncak) {
            this.terrain.tinggi[idx] = hSamping
            bioGrid[idx] = bioGrid[idxTinggi]!
          }
        }
        this.terrain.ramp[idx] = kode
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
      this.terrain.jalan[idx] !== jlnLama ||
      bioGrid[idx] !== bLama
    )
  }

  private bersihkanEntitasAtasAir(tx: number, ty: number): void {
    const bukanDi = <T extends { tx: number; ty: number }>(arr: T[]): T[] =>
      arr.filter((e) => !(e.tx === tx && e.ty === ty))
    this.entitas.spawn = bukanDi(this.entitas.spawn)
    this.entitas.unit = bukanDi(this.entitas.unit)
    this.entitas.pohon = bukanDi(this.entitas.pohon)
    this.entitas.tambang = bukanDi(this.entitas.tambang)
    this.entitas.domba = bukanDi(this.entitas.domba)
    this.entitas.camp = bukanDi(this.entitas.camp)
    this.entitas.bangunan = bukanDi(this.entitas.bangunan)
    this.entitas.bonus = bukanDi(this.entitas.bonus)
    this.entitas.deko = this.entitas.deko.filter(
      (d) => !(d.tx === tx && d.ty === ty) || bolehDekoDiAir(d.jenis),
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
    const saringGrup = <T extends { tx: number; ty: number }>(
      grup: GrupEntitas,
      arr: T[],
      ambilSlot: (e: T) => number,
    ): T[] => arr.filter((e) => {
      if (!sel.has(e.ty * PETA_KOLOM + e.tx)) return true
      // Hapus HANYA entitas yang lolos filter layer, lantai, & pemain aktif!
      return !this.lolosFilterEntitas(grup, ambilSlot(e), e.tx, e.ty)
    })

    this.entitas.spawn = saringGrup('spawn', this.entitas.spawn, (e) => e.slot)
    this.entitas.unit = saringGrup('unit', this.entitas.unit, (e) => e.slot)
    this.entitas.pohon = saringGrup('pohon', this.entitas.pohon, () => -1)
    this.entitas.tambang = saringGrup('tambang', this.entitas.tambang, () => -1)
    this.entitas.domba = saringGrup('domba', this.entitas.domba, () => -1)
    this.entitas.camp = saringGrup('camp', this.entitas.camp, () => -1)
    this.entitas.bangunan = saringGrup('bangunan', this.entitas.bangunan, (e) => e.slot)
    this.entitas.bonus = saringGrup('bonus', this.entitas.bonus, () => -1)
    this.entitas.deko = saringGrup('deko', this.entitas.deko, () => -1)
    if (JSON.stringify(this.entitas) !== sebelum) {
      this.goresBerubah = true
      this.seleksi = []
      this.renderInspector()
    }

    // Hapus fitur terrain (tangga, jembatan, jalan, tanah->air) HANYA jika filter mengizinkan edit terrain & lantai!
    if (this.filterLayer === 'semua' || this.filterLayer === 'terrain') {
      for (const idx of sel) {
        const tx = idx % PETA_KOLOM
        const ty = (idx - tx) / PETA_KOLOM
        if (!this.bolehEditTerrainDi(tx, ty)) continue
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
    }
    if (maxX >= 0) {
      this.renderTerrain.kotorkanArea(minX, minY, maxX, maxY)
    }
    if (this.goresBerubah) this.minimapKotor = true
  }

  private isiBanjir(tx0: number, ty0: number): void {
    if (this.itemAktif.kat !== 'terrain') {
      this.tampilkanToast('Ember Isi hanya untuk kuas Terrain / Bioma / Jalan / Air!', true)
      return
    }
    if (!this.bolehEditTerrainDi(tx0, ty0)) {
      this.tampilkanToast(
        this.filterLantai !== 0
          ? `Tile terkunci — Fokus Lantai Lv.${this.filterLantai} aktif!`
          : `Terrain terkunci — Fokus "${this.filterLayer}" aktif!`,
        true,
      )
      return
    }
    const mode = this.itemAktif.mode
    const bioGrid = this.pastikanBiomaGrid()
    const titikSim = hitungTitikSimetri(tx0, ty0, PETA_KOLOM, PETA_BARIS, this.simetri)
    const visited = new Uint8Array(PETA_KOLOM * PETA_BARIS)
    let diubah = false
    this.dorongUndo()

    for (const s of titikSim) {
      const start = s.ty * PETA_KOLOM + s.tx
      if (visited[start] === 1 || !this.bolehEditTerrainDi(s.tx, s.ty)) continue
      const targetH = this.terrain.tinggi[start]!
      const targetJ = this.terrain.jembatan[start]!
      const targetB = bioGrid[start]!
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
          if (mode === 'bioma' && bioGrid[ni] !== targetB) continue
          if (!this.bolehEditTerrainDi(nx, ny)) continue
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
    if (sp && this.lolosFilterEntitas('spawn', sp.slot, tx, ty)) {
      this.slotDipilih = sp.slot
      this.pilihDariPipet('karakter', 's-spawn', { kat: 'spawn' }, `Pipet: Spawn P${sp.slot + 1}`)
      return
    }
    const un = this.entitas.unit.find(cocok)
    if (un && this.lolosFilterEntitas('unit', un.slot, tx, ty)) {
      this.slotDipilih = un.slot
      const idUnit: Record<JenisUnitCustom, string> = {
        pawn: 'u-pawn', warrior: 'u-warrior', archer: 'u-archer', lancer: 'u-lancer',
        monk: 'u-monk', mage: 'u-mage', goblinTorch: 'u-gtorch', goblinTnt: 'u-gtnt', goblinBarrel: 'u-gbarrel',
      }
      this.pilihDariPipet('karakter', idUnit[un.jenis], { kat: 'unit', jenis: un.jenis }, `Pipet: ${NAMA_UNIT_LABEL[un.jenis]}`)
      return
    }
    const mb = this.entitas.tambang.find(cocok)
    if (mb && this.lolosFilterEntitas('tambang', -1, tx, ty)) {
      const id = mb.jenis === 'mine' ? 's-mine' : `s-g${mb.varian ?? 1}`
      this.pilihDariPipet(
        'resource', id,
        { kat: 'tambang', jenis: mb.jenis, ...(mb.varian !== undefined ? { varian: mb.varian } : {}) },
        'Pipet: Tambang Emas',
      )
      return
    }
    const ph = this.entitas.pohon.find(cocok)
    if (ph && this.lolosFilterEntitas('pohon', -1, tx, ty)) {
      const idMap: Record<VarianPohonCustom, string> = { pinus1: 's-p1', pinus2: 's-p2', daun1: 's-d1', daun2: 's-d2', klasik: 's-pk' }
      this.pilihDariPipet('resource', idMap[ph.varian], { kat: 'pohon', varian: ph.varian }, `Pipet: Pohon ${ph.varian}`)
      return
    }
    const cp = this.entitas.camp.find(cocok)
    if (cp && this.lolosFilterEntitas('camp', -1, tx, ty)) {
      this.pilihDariPipet('karakter', cp.jenis === 'besar' ? 'g-besar' : 'g-kecil', { kat: 'camp', jenis: cp.jenis }, `Pipet: Camp ${cp.jenis}`)
      return
    }
    const bg = this.entitas.bangunan.find(cocok)
    if (bg && this.lolosFilterEntitas('bangunan', bg.slot, tx, ty)) {
      this.slotDipilih = bg.slot
      this.bangunanHancur = Boolean(bg.hancur)
      this.pilihDariPipet('bangunan', `b-${bg.jenis === 'barracks' ? 'bar' : bg.jenis === 'archery' ? 'arc' : bg.jenis === 'monastery' ? 'mon' : bg.jenis === 'altar' ? 'alt' : bg.jenis}`, { kat: 'bangunan', jenis: bg.jenis }, `Pipet: ${bg.jenis}`)
      return
    }
    const dk = this.entitas.deko.find(cocok)
    if (dk && this.lolosFilterEntitas('deko', -1, tx, ty)) {
      this.pilihDariPipet('deko', `dk-${dk.jenis}`, { kat: 'deko', jenis: dk.jenis }, `Pipet: ${dk.jenis}`)
      return
    }

    const idx = ty * PETA_KOLOM + tx
    const bioVal = this.pastikanBiomaGrid()[idx]!
    if (bioVal >= 1 && bioVal <= 5) {
      this.biomaKuas = bioVal as TemaBioma
      this.segarkanBiomaUi()
    }
    const jv = this.terrain.jembatan[idx]!
    if (jv > 0) {
      this.pilihDariPipet('terrain', jv === 1 ? 't-jh' : 't-jv', { kat: 'terrain', mode: jv === 1 ? 'jembH' : 'jembV' }, 'Pipet: Jembatan')
      return
    }
    const rv = this.terrain.ramp[idx]!
    if (rv > 0) {
      if (rv === 4 || rv === 5) {
        const id = rv === 4 ? 't-lrb' : 't-lrt'
        const mode = rv === 4 ? 'rampRumputBarat' : 'rampRumputTimur'
        this.pilihDariPipet('terrain', id, { kat: 'terrain', mode }, `Pipet: Lereng Rumput ${rv === 4 ? 'Barat' : 'Timur'}`)
        return
      }
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
    this.pilihDariPipet('terrain', p[0], { kat: 'terrain', mode: p[1] }, `Pipet: ${p[2]} · ${INFO_BIOMA[this.biomaKuas].nama}`)
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
      rampRumputBarat: ['t-lrt', 'rampRumputTimur', 'Lereng Timur'],
      rampRumputTimur: ['t-lrb', 'rampRumputBarat', 'Lereng Barat'],
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
      `Spawn: ${e.spawn.length}/6 · Unit: ${e.unit.length} · Tambang: ${e.tambang.length}\n` +
      `Pohon: ${e.pohon.length} · Domba: ${e.domba.length}\n` +
      `Goblin: ${e.camp.length} camp · Bangunan: ${e.bangunan.length} · Deko: ${e.deko.length}`
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

  private titikKanvas(cx: number, cy: number): { sx: number; sy: number; wx: number; wy: number; tx: number; ty: number } {
    const r = this.kanvas.getBoundingClientRect()
    const sx = cx - r.left
    const sy = cy - r.top
    const wx = keDuniaX(this.kam, sx)
    const wy = keDuniaY(this.kam, sy)
    return { sx, sy, wx, wy, tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) }
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

      // Alat Pilih & Pindah (V): pilih objek, seret untuk pindah, atau seret kotak multi-seleksi
      if (this.alat === 'pilih' && e.button === 0) {
        const kena = this.cariEntitasDi(p.tx, p.ty)
        if (kena) {
          const sudahAda = this.apakahTerpilih(kena.grup, kena.indeks)
          if (e.shiftKey) {
            if (sudahAda) {
              this.seleksi = this.seleksi.filter((s) => !(s.grup === kena.grup && s.indeks === kena.indeks))
            } else {
              this.seleksi.push(kena)
            }
          } else if (!sudahAda) {
            this.seleksi = [kena]
          }
          if (this.seleksi.length > 0) {
            this.sedangSeretEntitas = true
            this.seretAsal = { tx: p.tx, ty: p.ty }
            this.seretOffset = { dx: 0, dy: 0 }
            this.kanvas.style.cursor = 'move'
          }
          this.renderInspector()
        } else {
          if (!e.shiftKey) {
            this.seleksi = []
            this.renderInspector()
          }
          this.marqueeAwal = { wx: p.wx, wy: p.wy }
          this.marqueeAkhir = { wx: p.wx, wy: p.wy }
        }
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
      if (this.sedangSeretEntitas) {
        this.seretOffset = { dx: p.tx - this.seretAsal.tx, dy: p.ty - this.seretAsal.ty }
        return
      }
      if (this.marqueeAwal) {
        this.marqueeAkhir = { wx: p.wx, wy: p.wy }
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
        this.kanvas.style.cursor = this.alat === 'geser' ? 'grab' : this.alat === 'pilih' ? 'default' : 'crosshair'
      }
      if (this.sedangSeretEntitas) {
        this.sedangSeretEntitas = false
        this.kanvas.style.cursor = 'default'
        const { dx, dy } = this.seretOffset
        this.seretOffset = { dx: 0, dy: 0 }
        if (dx !== 0 || dy !== 0) {
          this.pindahTerpilih(dx, dy)
        }
      }
      if (this.marqueeAwal && this.marqueeAkhir) {
        const hasil = this.cariEntitasDalamKotak(
          this.marqueeAwal.wx, this.marqueeAwal.wy,
          this.marqueeAkhir.wx, this.marqueeAkhir.wy,
        )
        if (hasil.length > 0) {
          for (const h of hasil) {
            if (!this.apakahTerpilih(h.grup, h.indeks)) this.seleksi.push(h)
          }
          this.renderInspector()
        }
        this.marqueeAwal = null
        this.marqueeAkhir = null
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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.seleksi.length > 0) {
          e.preventDefault()
          this.hapusTerpilih()
        }
        return
      }
      if (e.key === 'Escape') {
        if (this.seleksi.length > 0) {
          this.seleksi = []
          this.renderInspector()
        }
        return
      }
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          this.spasiTahan = true
          this.kanvas.style.cursor = 'grab'
          break
        case 'v': this.setAlat('pilih'); break
        case 'b': this.setAlat('kuas'); break
        case 'f': this.setAlat('isi'); break
        case 'e': this.setAlat('hapus'); break
        case 'i': this.setAlat('pipet'); break
        case 'r': this.putarArahItem(); break
        case 'g': this.btnGrid.click(); break
        case 'p': this.btnPathing.click(); break
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
        this.kanvas.style.cursor = this.alat === 'geser' ? 'grab' : this.alat === 'pilih' ? 'default' : 'crosshair'
      }
    })
  }

  private batalkanGores(): void {
    this.sedangLukis = false
    this.sedangHapusCepat = false
    this.sedangSeretEntitas = false
    this.seretOffset = { dx: 0, dy: 0 }
    this.marqueeAwal = null
    this.marqueeAkhir = null
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
    if (h > TINGGI.air) {
      const bVal = this.pastikanBiomaGrid()[idx]!
      const bio = INFO_BIOMA[(bVal >= 1 && bVal <= 5 ? bVal : 1) as TemaBioma]
      ket.push(bio.nama)
    }
    if (this.terrain.jembatan[idx]! > 0) ket.push('Jembatan')
    const rvInfo = this.terrain.ramp[idx]!
    if (rvInfo >= 4) ket.push(rvInfo === 4 ? 'Lereng Rumput Barat' : 'Lereng Rumput Timur')
    else if (rvInfo > 0) ket.push('Tangga Batu')
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
    this.gambarKabutFilter(ctx)
    if (this.tampilPathing) this.gambarPathingOverlay(ctx)
    this.gambarGridDanSimetri(ctx)
    this.gambarSemuaEntitas(ctx, t)
    this.gambarMarquee(ctx)
    this.gambarGhost(ctx, t)

    ctx.restore()
  }

  /**
   * Meredupkan area/lantai di luar fokus filter dengan lapisan abu-abu / awan tipis
   * (ala World Editor / World Builder) agar objek atau lantai aktif menonjol jelas.
   */
  private gambarKabutFilter(ctx: CanvasRenderingContext2D): void {
    const x1 = Math.max(0, Math.floor(this.kam.x / TILE))
    const y1 = Math.max(0, Math.floor(this.kam.y / TILE))
    const x2 = Math.min(PETA_KOLOM - 1, Math.ceil((this.kam.x + this.kam.lebar / this.kam.zoom) / TILE))
    const y2 = Math.min(PETA_BARIS - 1, Math.ceil((this.kam.y + this.kam.tinggi / this.kam.zoom) / TILE))

    if (this.filterLantai !== 0) {
      ctx.fillStyle = 'rgba(38, 46, 56, 0.56)'
      for (let ty = y1; ty <= y2; ty++) {
        const off = ty * PETA_KOLOM
        for (let tx = x1; tx <= x2; tx++) {
          if (this.terrain.tinggi[off + tx] !== this.filterLantai) {
            ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE)
          }
        }
      }
      return
    }

    if (this.filterLayer === 'karakter' || this.filterLayer === 'resource' || this.filterLayer === 'deko') {
      ctx.fillStyle = 'rgba(218, 224, 232, 0.40)'
      ctx.fillRect(x1 * TILE, y1 * TILE, (x2 - x1 + 1) * TILE, (y2 - y1 + 1) * TILE)
    } else if (this.filterLayer === 'semua' && this.filterPemain !== 'semua') {
      ctx.fillStyle = 'rgba(218, 224, 232, 0.24)'
      ctx.fillRect(x1 * TILE, y1 * TILE, (x2 - x1 + 1) * TILE, (y2 - y1 + 1) * TILE)
    }
  }

  /** Overlay Pathing Map ala Warcraft III World Editor (`P`): Hijau=Jalan, Kuning=Ramp/Jembatan, Merah=Terblokir/Tebing. */
  private gambarPathingOverlay(ctx: CanvasRenderingContext2D): void {
    const x1 = Math.max(0, Math.floor(this.kam.x / TILE))
    const y1 = Math.max(0, Math.floor(this.kam.y / TILE))
    const x2 = Math.min(PETA_KOLOM - 1, Math.ceil((this.kam.x + this.kam.lebar / this.kam.zoom) / TILE))
    const y2 = Math.min(PETA_BARIS - 1, Math.ceil((this.kam.y + this.kam.tinggi / this.kam.zoom) / TILE))

    const blokir = new Set<number>()
    for (const p of this.entitas.pohon) blokir.add(p.ty * PETA_KOLOM + p.tx)
    for (const m of this.entitas.tambang) blokir.add(m.ty * PETA_KOLOM + m.tx)
    for (const sp of this.entitas.spawn) blokir.add(sp.ty * PETA_KOLOM + sp.tx)
    for (const bg of this.entitas.bangunan) {
      if (!bg.hancur) blokir.add(bg.ty * PETA_KOLOM + bg.tx)
    }

    ctx.save()
    for (let ty = y1; ty <= y2; ty++) {
      const off = ty * PETA_KOLOM
      for (let tx = x1; tx <= x2; tx++) {
        const idx = off + tx
        const h = this.terrain.tinggi[idx]!
        const j = this.terrain.jembatan[idx]!
        const r = this.terrain.ramp[idx]!
        if (h === TINGGI.air && j === 0) {
          ctx.fillStyle = 'rgba(220, 56, 48, 0.34)'
        } else if (j > 0 || r > 0) {
          ctx.fillStyle = 'rgba(255, 214, 70, 0.44)'
        } else if (blokir.has(idx)) {
          ctx.fillStyle = 'rgba(235, 86, 52, 0.48)'
        } else {
          ctx.fillStyle = 'rgba(64, 204, 98, 0.24)'
        }
        ctx.fillRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2)

        // Tandai garis tebing yang tidak bisa dipanjat (beda elevasi tanpa ramp)
        if (h > TINGGI.air) {
          ctx.strokeStyle = 'rgba(255, 76, 60, 0.85)'
          ctx.lineWidth = 3 / this.kam.zoom
          if (tx + 1 < PETA_KOLOM) {
            const hR = this.terrain.tinggi[idx + 1]!
            const rR = this.terrain.ramp[idx + 1]!
            if (hR > TINGGI.air && hR !== h && (Math.abs(hR - h) > 1 || (r === 0 && rR === 0))) {
              ctx.beginPath()
              ctx.moveTo((tx + 1) * TILE, ty * TILE)
              ctx.lineTo((tx + 1) * TILE, (ty + 1) * TILE)
              ctx.stroke()
            }
          }
          if (ty + 1 < PETA_BARIS) {
            const hD = this.terrain.tinggi[idx + PETA_KOLOM]!
            const rD = this.terrain.ramp[idx + PETA_KOLOM]!
            if (hD > TINGGI.air && hD !== h && (Math.abs(hD - h) > 1 || (r === 0 && rD === 0))) {
              ctx.beginPath()
              ctx.moveTo(tx * TILE, (ty + 1) * TILE)
              ctx.lineTo((tx + 1) * TILE, (ty + 1) * TILE)
              ctx.stroke()
            }
          }
        }
      }
    }
    ctx.restore()
  }

  private gambarMarquee(ctx: CanvasRenderingContext2D): void {
    if (!this.marqueeAwal || !this.marqueeAkhir) return
    const x = Math.min(this.marqueeAwal.wx, this.marqueeAkhir.wx)
    const y = Math.min(this.marqueeAwal.wy, this.marqueeAkhir.wy)
    const w = Math.abs(this.marqueeAkhir.wx - this.marqueeAwal.wx)
    const h = Math.abs(this.marqueeAkhir.wy - this.marqueeAwal.wy)
    ctx.save()
    ctx.fillStyle = 'rgba(255, 216, 107, 0.18)'
    ctx.strokeStyle = '#ffd86b'
    ctx.lineWidth = 2 / this.kam.zoom
    ctx.setLineDash([8 / this.kam.zoom, 5 / this.kam.zoom])
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
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

    const bungkus = (
      grup: GrupEntitas, indeks: number, slot: number, tx: number, ty: number,
      gambarIsi: (wx: number, wy: number) => void,
      yOffset = 0,
    ): void => {
      const lolos = this.lolosFilterEntitas(grup, slot, tx, ty)
      const terpilih = this.apakahTerpilih(grup, indeks)
      const geserX = terpilih && this.sedangSeretEntitas ? this.seretOffset.dx : 0
      const geserY = terpilih && this.sedangSeretEntitas ? this.seretOffset.dy : 0
      const drawTx = tx + geserX
      const drawTy = ty + geserY
      const [wx, wy] = P(drawTx, drawTy)
      antre.push({
        y: wy + yOffset,
        fn: () => {
          ctx.save()
          if (!lolos) {
            ctx.globalAlpha = 0.22
          } else if (terpilih && this.sedangSeretEntitas) {
            ctx.globalAlpha = 0.78
          }
          // Sorotan cincin kepemilikan saat Filter Pemain aktif pada lapisan Karakter
          if (lolos && this.filterPemain !== 'semua' && layerDariGrup(grup) === 'karakter') {
            const warnaPem = slot >= 0 && slot < WARNA_SLOTS.length
              ? WARNA_TIM[WARNA_SLOTS[slot]!].utama
              : '#d4b34a'
            ctx.strokeStyle = warnaPem
            ctx.lineWidth = 3 / this.kam.zoom
            ctx.beginPath()
            ctx.ellipse(wx, wy + 12, 26, 14, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
          gambarIsi(wx, wy)
          if (terpilih) {
            const sah = !this.sedangSeretEntitas || this.bolehTaruhRefDi({ grup, indeks }, drawTx, drawTy)
            ctx.globalAlpha = 1
            ctx.strokeStyle = sah ? '#ffd86b' : '#ff5247'
            ctx.fillStyle = sah ? 'rgba(255, 216, 107, 0.16)' : 'rgba(255, 82, 71, 0.26)'
            ctx.lineWidth = 2.6 / this.kam.zoom
            ctx.fillRect(drawTx * TILE + 2, drawTy * TILE + 2, TILE - 4, TILE - 4)
            ctx.strokeRect(drawTx * TILE + 2, drawTy * TILE + 2, TILE - 4, TILE - 4)
          }
          ctx.restore()
        },
      })
    }

    for (let i = 0; i < this.entitas.pohon.length; i++) {
      const p = this.entitas.pohon[i]!
      const info = asetPohonVarian(p.varian)
      bungkus('pohon', i, -1, p.tx, p.ty, (wx, wy) => {
        const fr = Math.floor(t * 6 + i * 0.7) % info.aset.kolom
        sprite(ctx, info.aset, fr, wx, wy, info.skala, false, info.pijak)
      })
    }

    for (let i = 0; i < this.entitas.tambang.length; i++) {
      const m = this.entitas.tambang[i]!
      bungkus('tambang', i, -1, m.tx, m.ty, (wx, wy) => {
        if (m.jenis === 'node' && m.varian && m.varian >= 1 && m.varian <= 6) {
          sprite(ctx, BATU_EMAS_ASET[m.varian - 1]!, 0, wx, wy, 0.78, false, 0.80)
        } else {
          sprite(ctx, SUMBER.tambangAktif, 0, wx, wy, 0.9, false, 0.82)
        }
      })
    }

    for (let i = 0; i < this.entitas.domba.length; i++) {
      const d = this.entitas.domba[i]!
      bungkus('domba', i, -1, d.tx, d.ty, (wx, wy) => {
        sprite(ctx, SUMBER.dombaDiam, Math.floor(t * 8 + i) % SUMBER.dombaDiam.kolom, wx, wy, 0.56, false, 0.74)
      })
    }

    for (let i = 0; i < this.entitas.bonus.length; i++) {
      const b = this.entitas.bonus[i]!
      const a = b.jenis === 'gold' ? SUMBER.goldDiam : b.jenis === 'kayu' ? SUMBER.kayuDiam : SUMBER.dagingDiam
      bungkus('bonus', i, -1, b.tx, b.ty, (wx, wy) => sprite(ctx, a, 0, wx, wy, 0.52, false, 0.74))
    }

    for (let i = 0; i < this.entitas.camp.length; i++) {
      const c = this.entitas.camp[i]!
      bungkus('camp', i, -1, c.tx, c.ty, (wx, wy) => {
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
      }, -20)
    }

    for (let i = 0; i < this.entitas.bangunan.length; i++) {
      const bg = this.entitas.bangunan[i]!
      const info = asetBangunanEditor(bg)
      const def = BANGUNAN[bg.jenis]
      bungkus('bangunan', i, bg.slot, bg.tx, bg.ty, (wx, wy) => {
        sprite(ctx, info.aset, 0, wx, wy, def.w / info.aset.fw, false, 0.86, 0, info.timWarna)
      })
    }

    for (let i = 0; i < this.entitas.unit.length; i++) {
      const u = this.entitas.unit[i]!
      const info = asetUnitEditor(u)
      bungkus('unit', i, u.slot, u.tx, u.ty, (wx, wy) => {
        const fr = Math.floor(t * 7 + i * 0.6) % Math.max(1, info.aset.kolom)
        sprite(ctx, info.aset, fr, wx, wy, info.skala, false, info.pijak, 0, info.timWarna)
        const lblTim = u.slot >= 0 ? `P${u.slot + 1}` : 'N'
        const warna = u.slot >= 0 && u.slot < WARNA_SLOTS.length ? WARNA_TIM[WARNA_SLOTS[u.slot]!].utama : '#c9a227'
        ctx.fillStyle = warna
        ctx.strokeStyle = '#1b120b'
        ctx.lineWidth = 2
        ctx.fillRect(wx - 13, wy - 56, 26, 13)
        ctx.strokeRect(wx - 13, wy - 56, 26, 13)
        ctx.fillStyle = '#fff'
        ctx.font = "bold 9px 'Pixelify Sans', sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(lblTim, wx, wy - 49.5)
      })
    }

    for (let i = 0; i < this.entitas.deko.length; i++) {
      const d = this.entitas.deko[i]!
      const yOffset = d.jenis.startsWith('awan') ? 100_000 : 0
      bungkus('deko', i, -1, d.tx, d.ty, (wx, wy) => gambarDekoCustom(ctx, d.jenis, wx, wy, t, i), yOffset)
    }

    for (let i = 0; i < this.entitas.spawn.length; i++) {
      const sp = this.entitas.spawn[i]!
      const tim = WARNA_SLOTS[sp.slot] ?? 'blue'
      const warna = WARNA_TIM[tim]
      const tampilZona = this.filterLayer === 'karakter' || this.itemAktif.kat === 'spawn' || this.apakahTerpilih('spawn', i)
      bungkus('spawn', i, sp.slot, sp.tx, sp.ty, (wx, wy) => {
        // Cincin zona aman markas awal (Start Location ala WC3 World Editor)
        if (tampilZona) {
          ctx.save()
          ctx.strokeStyle = warna.utama
          ctx.lineWidth = 2 / this.kam.zoom
          ctx.setLineDash([10 / this.kam.zoom, 6 / this.kam.zoom])
          ctx.beginPath()
          ctx.arc(wx, wy, 4.5 * TILE, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        ctx.save()
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.88)
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
      })
    }

    antre.sort((a, b) => a.y - b.y)
    for (const item of antre) item.fn()
  }

  private gambarGhost(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.hoverTile || this.alat === 'pilih' || this.alat === 'geser') return
    const { tx, ty } = this.hoverTile
    if (!this.tileDalamBatas(tx, ty)) return
    const titikSim = hitungTitikSimetri(tx, ty, PETA_KOLOM, PETA_BARIS, this.simetri)
    const offsets = (this.alat === 'kuas' && (this.itemAktif.kat === 'terrain' || this.itemAktif.kat === 'hutanAcak')) || this.alat === 'hapus'
      ? this.daftarOffsetKuas(this.ukuranKuas, this.bentukKuas)
      : ([[0, 0]] as const)

    ctx.save()
    for (const s of titikSim) {
      if (
        this.alat === 'kuas' &&
        this.itemAktif.kat === 'terrain' &&
        (this.itemAktif.mode === 'rampRumputBarat' || this.itemAktif.mode === 'rampRumputTimur')
      ) {
        const imBio = gambarDari(asetBiomaEditor(this.biomaKuas))
        if (imBio) {
          const kode = balikKodeRamp(this.itemAktif.mode === 'rampRumputBarat' ? 4 : 5, s.balikX)
          const kolSrc = kode === 4 ? 0 : 3
          ctx.globalAlpha = 0.62
          for (const [dx, dy] of offsets) {
            const x = s.tx + dx
            const y = s.ty + dy
            if (!this.tileDalamBatas(x, y)) continue
            ctx.drawImage(imBio, kolSrc * TILE, 4 * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE)
            if (y + 1 < PETA_BARIS) {
              ctx.drawImage(imBio, kolSrc * TILE, 5 * TILE, TILE, TILE, x * TILE, (y + 1) * TILE, TILE, TILE)
            }
          }
        }
      } else if (this.alat === 'kuas' && this.itemAktif.kat !== 'terrain' && this.itemAktif.kat !== 'hutanAcak') {
        ctx.globalAlpha = 0.58
        const wx = s.tx * TILE + TILE / 2
        const wy = s.ty * TILE + TILE / 2
        const slotPratinjau = this.filterPemain !== 'semua' ? this.filterPemain : this.slotDipilih
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
        } else if (this.itemAktif.kat === 'unit') {
          const sl = this.itemAktif.jenis.startsWith('goblin') ? -1 : slotPratinjau
          const info = asetUnitEditor({ tx: s.tx, ty: s.ty, jenis: this.itemAktif.jenis, slot: sl })
          sprite(ctx, info.aset, 0, wx, wy, info.skala, false, info.pijak, 0, info.timWarna)
        } else if (this.itemAktif.kat === 'camp') {
          sprite(ctx, ASET_GOBLIN.rumah, 0, wx - 130, wy - 28, 0.72, false, 0.84)
        } else if (this.itemAktif.kat === 'domba') {
          sprite(ctx, SUMBER.dombaDiam, 0, wx, wy, 0.56, false, 0.74)
        } else if (this.itemAktif.kat === 'bangunan') {
          const info = asetBangunanEditor({ tx: s.tx, ty: s.ty, jenis: this.itemAktif.jenis, slot: slotPratinjau, hancur: this.bangunanHancur })
          const def = BANGUNAN[this.itemAktif.jenis]
          sprite(ctx, info.aset, 0, wx, wy, def.w / info.aset.fw, false, 0.86, 0, info.timWarna)
        }
      }
      ctx.globalAlpha = 1
      ctx.lineWidth = 2 / this.kam.zoom
      for (const [dx, dy] of offsets) {
        const x = s.tx + dx
        const y = s.ty + dy
        if (!this.tileDalamBatas(x, y)) continue
        const terkunci = this.alat === 'kuas' && this.itemAktif.kat === 'terrain' && !this.bolehEditTerrainDi(x, y)
        ctx.strokeStyle = this.alat === 'hapus' || terkunci ? '#ff695c' : '#ffd86b'
        ctx.fillStyle = this.alat === 'hapus' || terkunci ? 'rgba(255, 80, 64, 0.22)' : 'rgba(255, 216, 107, 0.16)'
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
        const bioDef = this.terrain.bioma ?? 1
        const bioGrid = this.terrain.biomaGrid
        for (let ty = 0; ty < PETA_BARIS; ty++) {
          for (let tx = 0; tx < PETA_KOLOM; tx++) {
            const idx = ty * PETA_KOLOM + tx
            const v = this.terrain.tinggi[idx]!
            const bVal = bioGrid?.[idx]
            const bioma = INFO_BIOMA[(bVal && bVal >= 1 && bVal <= 5 ? bVal : bioDef) as TemaBioma]
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
        for (const u of this.entitas.unit) {
          const tim = u.slot >= 0 && u.slot < WARNA_SLOTS.length ? WARNA_SLOTS[u.slot]! : 'neutral'
          mc.fillStyle = WARNA_TIM[tim].terang
          mc.fillRect(u.tx * sx - 1, u.ty * sy - 1, 3, 3)
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

function eksporSiapTerrain(data: DataPetaCustom): { terrain: Terrain; entitas: EntitasEditor } {
  const total = PETA_KOLOM * PETA_BARIS
  return {
    terrain: {
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggi: decodeRle(data.tinggiRle, total, TINGGI.puncak),
      ramp: decodeRle(data.rampRle, total, RAMP_MAKS),
      jembatan: decodeRle(data.jembatanRle, total, 2),
      jalan: decodeRle(data.jalanRle, total, 1),
      bioma: data.bioma,
      biomaGrid: decodeBiomaGrid(data.biomaRle, total, data.bioma),
    },
    entitas: klonEntitas(data.entitas),
  }
}
