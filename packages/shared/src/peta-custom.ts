import { PETA_BARIS, PETA_KOLOM, TINGGI } from './konstanta.js'

/** 5 tema bioma resmi Tiny Swords Free Pack (Tilemap_color1..5.png). */
export const DAFTAR_BIOMA = [1, 2, 3, 4, 5] as const
export type TemaBioma = (typeof DAFTAR_BIOMA)[number]

/**
 * Kode grid `ramp`:
 * - `0`: bukan ramp
 * - `1`: tangga batu N/S
 * - `2`: tangga batu barat (naik ke timur)
 * - `3`: tangga batu timur (naik ke barat)
 * - `4`: lereng rumput barat (Tilemap_color kol 0, naik ke timur)
 * - `5`: lereng rumput timur (Tilemap_color kol 3, naik ke barat)
 */
export const RAMP_MAKS = 5

export const INFO_BIOMA: Record<TemaBioma, {
  nama: string
  ringkas: string
  warnaDataran: string
  warnaPlateau: string
  warnaPuncak: string
}> = {
  1: { nama: 'Padang Cerah',  ringkas: 'Rumput musim semi hangat',    warnaDataran: '#7ea84c', warnaPlateau: '#98b653', warnaPuncak: '#b2cf6a' },
  2: { nama: 'Hutan Segar',   ringkas: 'Hijau subur klasik',          warnaDataran: '#6c9849', warnaPlateau: '#84ae57', warnaPuncak: '#9cc76f' },
  3: { nama: 'Rimba Zamrud',  ringkas: 'Hijau zamrud pekat',          warnaDataran: '#4b9251', warnaPlateau: '#61aa63', warnaPuncak: '#7cc27e' },
  4: { nama: 'Lembah Zaitun', ringkas: 'Dataran tinggi zaitun gugur', warnaDataran: '#6d834f', warnaPlateau: '#83995e', warnaPuncak: '#9db377' },
  5: { nama: 'Rawa Mistis',   ringkas: 'Hijau toska sejuk mistis',    warnaDataran: '#448275', warnaPlateau: '#57998b', warnaPuncak: '#71b3a5' },
}

export type ModeSimetri = 'mati' | 'cerminX' | 'cerminY' | 'empatArah' | 'rotasi180'

export const VARIAN_POHON_CUSTOM = ['pinus1', 'pinus2', 'daun1', 'daun2', 'klasik'] as const
export type VarianPohonCustom = (typeof VARIAN_POHON_CUSTOM)[number]

export const JENIS_DEKO_CUSTOM = [
  'deco01', 'deco02', 'deco03', 'deco04', 'deco05', 'deco06',
  'deco07', 'deco08', 'deco09', 'deco10', 'deco11', 'deco12',
  'deco13', 'deco14', 'deco15', 'deco16', 'deco17', 'deco18',
  'semak1', 'semak2', 'semak3', 'semak4',
  'batu1', 'batu2', 'batu3', 'batu4',
  'batuAir1', 'batuAir2', 'batuAir3', 'batuAir4',
  'tunggul1', 'tunggul2', 'tunggul3', 'tunggul4',
  'awan1', 'awan2', 'awan3', 'awan4',
  'api1', 'api2', 'api3',
  'bebek',
  'gubukGoblin', 'menaraGoblin', 'menaraGoblinHancur', 'tambangNonaktif',
] as const
export type JenisDekoCustom = (typeof JENIS_DEKO_CUSTOM)[number]

export const JENIS_BANGUNAN_CUSTOM = ['house', 'tower', 'barracks', 'archery', 'monastery', 'altar'] as const
export type JenisBangunanCustom = (typeof JENIS_BANGUNAN_CUSTOM)[number]

export interface SpawnPetaCustom {
  /** Indeks slot pemain (0..5). */
  slot: number
  tx: number
  ty: number
}

export interface PohonPetaCustom {
  tx: number
  ty: number
  varian: VarianPohonCustom
  kayu?: number
}

export interface TambangPetaCustom {
  tx: number
  ty: number
  jenis: 'mine' | 'node'
  gold?: number
  /** Variasi sprite Gold Stone 1..6 (khusus jenis === 'node'). */
  varian?: number
}

export interface CampPetaCustom {
  tx: number
  ty: number
  jenis: 'kecil' | 'besar'
}

export interface DekoPetaCustom {
  tx: number
  ty: number
  jenis: JenisDekoCustom
}

export interface BangunanPetaCustom {
  tx: number
  ty: number
  jenis: JenisBangunanCustom
  /** Indeks slot pemilik 0..5, atau -1 untuk bangunan netral/reruntuhan. */
  slot: number
  hancur?: boolean
}

export interface BonusPetaCustom {
  tx: number
  ty: number
  jenis: 'daging' | 'gold' | 'kayu'
  jumlah: number
}

export interface EntitasPetaCustom {
  spawn: SpawnPetaCustom[]
  pohon: PohonPetaCustom[]
  tambang: TambangPetaCustom[]
  domba: { tx: number; ty: number }[]
  camp: CampPetaCustom[]
  deko: DekoPetaCustom[]
  bangunan: BangunanPetaCustom[]
  bonus: BonusPetaCustom[]
}

/**
 * Format data peta buatan pengguna yang ringkas (~3–15 KB berkat RLE),
 * deterministik, dan aman dikirim lewat localStorage, JSON, LAN WebSocket, maupun P2P WebRTC.
 */
export interface DataPetaCustom {
  versi: 1
  id: string
  nama: string
  bioma: TemaBioma
  kolom: number
  baris: number
  /** Grid tinggi (0 air, 1 dataran, 2 plateau, 3 puncak) terkompresi RLE. */
  tinggiRle: string
  /** Grid ramp (0 bukan, 1 N/S, 2 barat, 3 timur) terkompresi RLE. */
  rampRle: string
  /** Grid jembatan (0 bukan, 1 horizontal, 2 vertikal) terkompresi RLE. */
  jembatanRle: string
  /** Grid jalan pasir (0 bukan, 1 jalan) terkompresi RLE. */
  jalanRle: string
  entitas: EntitasPetaCustom
  diubahPada: number
}

/** Mengompresi array byte menjadi string RLE ringkas, mis. "0*120,1*15,2". */
export function encodeRle(arr: Uint8Array): string {
  if (arr.length === 0) return ''
  const bagian: string[] = []
  let nilai = arr[0]!
  let hitung = 1
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i]!
    if (v === nilai) {
      hitung++
    } else {
      bagian.push(hitung > 1 ? `${nilai}*${hitung}` : String(nilai))
      nilai = v
      hitung = 1
    }
  }
  bagian.push(hitung > 1 ? `${nilai}*${hitung}` : String(nilai))
  return bagian.join(',')
}

/** Mendekode string RLE kembali menjadi Uint8Array dengan batas panjang & nilai aman. */
export function decodeRle(rle: string, panjang: number, maksNilai: number): Uint8Array {
  const hasil = new Uint8Array(panjang)
  if (!rle || typeof rle !== 'string') return hasil
  const potongan = rle.split(',')
  let pos = 0
  for (let i = 0; i < potongan.length && pos < panjang; i++) {
    const seg = potongan[i]!
    if (!seg) continue
    const bintang = seg.indexOf('*')
    let nilai = 0
    let ulang = 1
    if (bintang >= 0) {
      nilai = Number(seg.slice(0, bintang))
      ulang = Number(seg.slice(bintang + 1))
    } else {
      nilai = Number(seg)
    }
    if (!Number.isFinite(nilai) || !Number.isFinite(ulang) || ulang <= 0) continue
    const bersih = Math.max(0, Math.min(maksNilai, Math.floor(nilai)))
    const batas = Math.min(panjang, pos + Math.floor(ulang))
    for (let k = pos; k < batas; k++) hasil[k] = bersih
    pos = batas
  }
  return hasil
}

/** Menghasilkan daftar koordinat simetri unik untuk satu titik tile sesuai ModeSimetri. */
export function hitungTitikSimetri(
  tx: number, ty: number, kolom: number, baris: number, mode: ModeSimetri,
): { tx: number; ty: number; balikX: boolean; balikY: boolean }[] {
  const mx = kolom - 1 - tx
  const my = baris - 1 - ty
  const mentah: { tx: number; ty: number; balikX: boolean; balikY: boolean }[] = [
    { tx, ty, balikX: false, balikY: false },
  ]
  if (mode === 'cerminX') {
    mentah.push({ tx: mx, ty, balikX: true, balikY: false })
  } else if (mode === 'cerminY') {
    mentah.push({ tx, ty: my, balikX: false, balikY: true })
  } else if (mode === 'empatArah') {
    mentah.push(
      { tx: mx, ty, balikX: true, balikY: false },
      { tx, ty: my, balikX: false, balikY: true },
      { tx: mx, ty: my, balikX: true, balikY: true },
    )
  } else if (mode === 'rotasi180') {
    mentah.push({ tx: mx, ty: my, balikX: true, balikY: true })
  }
  const unik: typeof mentah = []
  const sudah = new Set<number>()
  for (const p of mentah) {
    if (p.tx < 0 || p.ty < 0 || p.tx >= kolom || p.ty >= baris) continue
    const k = p.ty * kolom + p.tx
    if (sudah.has(k)) continue
    sudah.add(k)
    unik.push(p)
  }
  return unik
}

/** Membalik kode ramp Timur <-> Barat (tangga batu 2<->3 dan lereng rumput 4<->5) ketika kuas cermin horizontal aktif. */
export function balikKodeRamp(kode: number, balikX: boolean): number {
  if (!balikX) return kode
  if (kode === 2) return 3
  if (kode === 3) return 2
  if (kode === 4) return 5
  if (kode === 5) return 4
  return kode
}

export function buatIdPetaCustom(): string {
  const waktu = Date.now().toString(36)
  const acak = Math.floor(Math.random() * 0xfffff).toString(36).padStart(4, '0')
  return `custom-${waktu}-${acak}`
}

const SET_POHON = new Set<string>(VARIAN_POHON_CUSTOM)
const SET_DEKO = new Set<string>(JENIS_DEKO_CUSTOM)
const SET_BANGUNAN = new Set<string>(JENIS_BANGUNAN_CUSTOM)
const SET_BIOMA = new Set<number>(DAFTAR_BIOMA)

const bulatDalam = (v: unknown, min: number, maks: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(maks, Math.floor(v))) : null

/**
 * Validasi ketat & sanitasi `DataPetaCustom` dari localStorage, impor JSON, atau paket jaringan LAN/P2P.
 * Mengembalikan `null` bila format tidak sah atau melampaui batas wajar.
 */
export function validasiDataPetaCustom(raw: unknown): DataPetaCustom | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o['versi'] !== 1) return null
  const id = typeof o['id'] === 'string' && o['id'].trim().length > 0 ? o['id'].trim().slice(0, 64) : buatIdPetaCustom()
  const nama = typeof o['nama'] === 'string' && o['nama'].trim().length > 0 ? o['nama'].trim().slice(0, 40) : 'Peta Custom'
  const biomaMentah = typeof o['bioma'] === 'number' ? Math.floor(o['bioma']) : 1
  const bioma: TemaBioma = SET_BIOMA.has(biomaMentah) ? (biomaMentah as TemaBioma) : 1
  const kolom = o['kolom'] === PETA_KOLOM ? PETA_KOLOM : PETA_KOLOM
  const baris = o['baris'] === PETA_BARIS ? PETA_BARIS : PETA_BARIS

  if (
    typeof o['tinggiRle'] !== 'string' || o['tinggiRle'].length > 48_000 ||
    typeof o['rampRle'] !== 'string' || o['rampRle'].length > 48_000 ||
    typeof o['jembatanRle'] !== 'string' || o['jembatanRle'].length > 48_000 ||
    typeof o['jalanRle'] !== 'string' || o['jalanRle'].length > 48_000
  ) {
    return null
  }

  const entRaw = o['entitas']
  if (!entRaw || typeof entRaw !== 'object') return null
  const er = entRaw as Record<string, unknown>

  const spawn: SpawnPetaCustom[] = []
  if (Array.isArray(er['spawn'])) {
    const slotPakai = new Set<number>()
    for (const item of er['spawn'].slice(0, 6)) {
      if (!item || typeof item !== 'object') continue
      const s = item as Record<string, unknown>
      const slot = bulatDalam(s['slot'], 0, 5)
      const tx = bulatDalam(s['tx'], 1, kolom - 2)
      const ty = bulatDalam(s['ty'], 1, baris - 2)
      if (slot === null || tx === null || ty === null || slotPakai.has(slot)) continue
      slotPakai.add(slot)
      spawn.push({ slot, tx, ty })
    }
    spawn.sort((a, b) => a.slot - b.slot)
  }

  const pohon: PohonPetaCustom[] = []
  if (Array.isArray(er['pohon'])) {
    for (const item of er['pohon'].slice(0, 600)) {
      if (!item || typeof item !== 'object') continue
      const p = item as Record<string, unknown>
      const tx = bulatDalam(p['tx'], 0, kolom - 1)
      const ty = bulatDalam(p['ty'], 0, baris - 1)
      if (tx === null || ty === null) continue
      const varian = typeof p['varian'] === 'string' && SET_POHON.has(p['varian'])
        ? (p['varian'] as VarianPohonCustom)
        : 'pinus1'
      const kayu = bulatDalam(p['kayu'], 20, 500)
      pohon.push(kayu !== null ? { tx, ty, varian, kayu } : { tx, ty, varian })
    }
  }

  const tambang: TambangPetaCustom[] = []
  if (Array.isArray(er['tambang'])) {
    for (const item of er['tambang'].slice(0, 64)) {
      if (!item || typeof item !== 'object') continue
      const m = item as Record<string, unknown>
      const tx = bulatDalam(m['tx'], 0, kolom - 1)
      const ty = bulatDalam(m['ty'], 0, baris - 1)
      if (tx === null || ty === null) continue
      const jenis = m['jenis'] === 'node' ? 'node' : 'mine'
      const gold = bulatDalam(m['gold'], 100, 10000)
      const varian = bulatDalam(m['varian'], 1, 6)
      tambang.push({
        tx, ty, jenis,
        ...(gold !== null ? { gold } : {}),
        ...(varian !== null ? { varian } : {}),
      })
    }
  }

  const domba: { tx: number; ty: number }[] = []
  if (Array.isArray(er['domba'])) {
    for (const item of er['domba'].slice(0, 120)) {
      if (!item || typeof item !== 'object') continue
      const d = item as Record<string, unknown>
      const tx = bulatDalam(d['tx'], 0, kolom - 1)
      const ty = bulatDalam(d['ty'], 0, baris - 1)
      if (tx !== null && ty !== null) domba.push({ tx, ty })
    }
  }

  const camp: CampPetaCustom[] = []
  if (Array.isArray(er['camp'])) {
    for (const item of er['camp'].slice(0, 32)) {
      if (!item || typeof item !== 'object') continue
      const c = item as Record<string, unknown>
      const tx = bulatDalam(c['tx'], 0, kolom - 1)
      const ty = bulatDalam(c['ty'], 0, baris - 1)
      if (tx === null || ty === null) continue
      camp.push({ tx, ty, jenis: c['jenis'] === 'besar' ? 'besar' : 'kecil' })
    }
  }

  const deko: DekoPetaCustom[] = []
  if (Array.isArray(er['deko'])) {
    for (const item of er['deko'].slice(0, 800)) {
      if (!item || typeof item !== 'object') continue
      const d = item as Record<string, unknown>
      const tx = bulatDalam(d['tx'], 0, kolom - 1)
      const ty = bulatDalam(d['ty'], 0, baris - 1)
      if (tx === null || ty === null) continue
      if (typeof d['jenis'] !== 'string' || !SET_DEKO.has(d['jenis'])) continue
      deko.push({ tx, ty, jenis: d['jenis'] as JenisDekoCustom })
    }
  }

  const bangunan: BangunanPetaCustom[] = []
  if (Array.isArray(er['bangunan'])) {
    for (const item of er['bangunan'].slice(0, 96)) {
      if (!item || typeof item !== 'object') continue
      const b = item as Record<string, unknown>
      const tx = bulatDalam(b['tx'], 0, kolom - 1)
      const ty = bulatDalam(b['ty'], 0, baris - 1)
      const slot = bulatDalam(b['slot'], -1, 5)
      if (tx === null || ty === null || slot === null) continue
      if (typeof b['jenis'] !== 'string' || !SET_BANGUNAN.has(b['jenis'])) continue
      bangunan.push({
        tx, ty, jenis: b['jenis'] as JenisBangunanCustom, slot,
        ...(b['hancur'] === true ? { hancur: true } : {}),
      })
    }
  }

  const bonus: BonusPetaCustom[] = []
  if (Array.isArray(er['bonus'])) {
    for (const item of er['bonus'].slice(0, 96)) {
      if (!item || typeof item !== 'object') continue
      const b = item as Record<string, unknown>
      const tx = bulatDalam(b['tx'], 0, kolom - 1)
      const ty = bulatDalam(b['ty'], 0, baris - 1)
      if (tx === null || ty === null) continue
      const jenis = b['jenis'] === 'gold' ? 'gold' : b['jenis'] === 'kayu' ? 'kayu' : 'daging'
      const jumlah = bulatDalam(b['jumlah'], 5, 500) ?? 30
      bonus.push({ tx, ty, jenis, jumlah })
    }
  }

  // Pastikan panjang RLE valid dengan decode-encode cepat tidak melempar error
  decodeRle(o['tinggiRle'], kolom * baris, TINGGI.puncak)

  return {
    versi: 1,
    id,
    nama,
    bioma,
    kolom,
    baris,
    tinggiRle: o['tinggiRle'],
    rampRle: o['rampRle'],
    jembatanRle: o['jembatanRle'],
    jalanRle: o['jalanRle'],
    entitas: { spawn, pohon, tambang, domba, camp, deko, bangunan, bonus },
    diubahPada: typeof o['diubahPada'] === 'number' && Number.isFinite(o['diubahPada']) ? o['diubahPada'] : Date.now(),
  }
}

export interface HasilValidasiPeta {
  siapMain: boolean
  jumlahSpawn: number
  semuaSpawnDiDarat: boolean
  semuaSpawnTerhubung: boolean
  peringatan: string[]
  galat: string[]
}

/**
 * Mengecek kelayakan peta custom secara real-time untuk panel validasi Map Editor:
 *   - Minimal 2 titik spawn pemain di daratan (bukan air)
 *   - Semua spawn saling terhubung lewat darat / jembatan / tangga (BFS menghormati elevasi!)
 *   - Peringatan ramah bila ada markas yang jauh dari Tambang Emas atau belum ada Pohon / Goblin
 */
export function cekValidasiPeta(data: DataPetaCustom): HasilValidasiPeta {
  const galat: string[] = []
  const peringatan: string[] = []
  const kol = data.kolom
  const bar = data.baris
  const total = kol * bar
  const tinggi = decodeRle(data.tinggiRle, total, TINGGI.puncak)
  const ramp = decodeRle(data.rampRle, total, RAMP_MAKS)

  const spawn = data.entitas.spawn
  if (spawn.length < 2) {
    galat.push(`Minimal butuh 2 Spawn Pemain (sekarang ${spawn.length}).`)
  }

  let semuaSpawnDiDarat = true
  for (const s of spawn) {
    const idx = s.ty * kol + s.tx
    if (tinggi[idx] === TINGGI.air) {
      semuaSpawnDiDarat = false
      galat.push(`Spawn Pemain #${s.slot + 1} berada di atas air!`)
    }
  }

  // BFS konektivitas dari Spawn pertama ke semua Spawn lainnya
  let semuaSpawnTerhubung = true
  if (spawn.length >= 2 && semuaSpawnDiDarat) {
    const visited = new Uint8Array(total)
    const antre = new Int32Array(total)
    let head = 0
    let tail = 0
    const awal = spawn[0]!.ty * kol + spawn[0]!.tx
    visited[awal] = 1
    antre[tail++] = awal
    while (head < tail) {
      const cur = antre[head++]!
      const cx = cur % kol
      const cy = (cur - cx) / kol
      const hA = tinggi[cur]!
      const rA = ramp[cur]! > 0
      const tetangga = [
        cx > 0 ? cur - 1 : -1,
        cx + 1 < kol ? cur + 1 : -1,
        cy > 0 ? cur - kol : -1,
        cy + 1 < bar ? cur + kol : -1,
      ]
      for (const n of tetangga) {
        if (n < 0 || visited[n] === 1) continue
        const hB = tinggi[n]!
        if (hB === TINGGI.air) continue
        if (hA !== hB) {
          if (Math.abs(hA - hB) > 1) continue
          if (!rA && ramp[n]! === 0) continue
        }
        visited[n] = 1
        antre[tail++] = n
      }
    }
    for (let i = 1; i < spawn.length; i++) {
      const s = spawn[i]!
      if (visited[s.ty * kol + s.tx] !== 1) {
        semuaSpawnTerhubung = false
        galat.push(`Spawn #${s.slot + 1} belum terhubung ke Spawn #${spawn[0]!.slot + 1} (pasang jembatan/tangga!).`)
      }
    }
  }

  // Peringatan lembut (tidak memblokir main, tapi sangat membantu balance RTS!)
  for (const s of spawn) {
    const dekatTambang = data.entitas.tambang.some((m) => Math.hypot(m.tx - s.tx, m.ty - s.ty) <= 14)
    if (!dekatTambang) {
      peringatan.push(`Spawn #${s.slot + 1} belum punya Tambang Emas dekat markas.`)
    }
  }
  if (data.entitas.pohon.length < 10) {
    peringatan.push(`Pohon masih sedikit (${data.entitas.pohon.length}) — tambah hutan agar ekonomi kayu lancar.`)
  }
  if (data.entitas.camp.length === 0) {
    peringatan.push('Belum ada Camp Goblin untuk leveling Hero.')
  }

  return {
    siapMain: galat.length === 0,
    jumlahSpawn: spawn.length,
    semuaSpawnDiDarat,
    semuaSpawnTerhubung,
    peringatan,
    galat,
  }
}
