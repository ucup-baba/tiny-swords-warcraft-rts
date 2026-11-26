import { PETA_BARIS, PETA_KOLOM, TILE, TINGGI, type JenisPeta, type TemaBioma, type Tinggi } from '@hftf/shared'
import { acakBulat, type Rng } from './rng.js'

/**
 * Terrain sebagai DATA, bukan kode (PRD §9.2).
 */
export interface Terrain {
  kolom: number
  baris: number
  /** Ketinggian per tile: 0 air, 1 dataran, 2 plateau, 3 puncak. */
  tinggi: Uint8Array
  /** 0 = bukan ramp, 1 = tangga N/S, 2 = tangga barat (naik ke timur), 3 = tangga timur (naik ke barat). */
  ramp: Uint8Array
  /** 0 = bukan jembatan, 1 = jembatan horizontal, 2 = jembatan vertikal. */
  jembatan: Uint8Array
  /** 1 = jalan tanah/pasir keemasan penghubung markas, tangga, & jembatan (visual). */
  jalan: Uint8Array
  /** Tema bioma visual (1..5 -> Tilemap_color1..5 Free Pack). Default 1. */
  bioma?: TemaBioma
}

export const indeks = (t: Terrain, tx: number, ty: number): number => ty * t.kolom + tx

export function diDalam(t: Terrain, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < t.kolom && ty < t.baris
}

export function tinggiDi(t: Terrain, tx: number, ty: number): Tinggi {
  if (!diDalam(t, tx, ty)) return TINGGI.air
  return t.tinggi[indeks(t, tx, ty)] as Tinggi
}

export function adalahRamp(t: Terrain, tx: number, ty: number): boolean {
  return diDalam(t, tx, ty) && (t.ramp[indeks(t, tx, ty)] ?? 0) > 0
}

export function adalahJembatan(t: Terrain, tx: number, ty: number): boolean {
  return diDalam(t, tx, ty) && (t.jembatan[indeks(t, tx, ty)] ?? 0) > 0
}

export function adalahJalan(t: Terrain, tx: number, ty: number): boolean {
  return diDalam(t, tx, ty) && (t.jalan[indeks(t, tx, ty)] ?? 0) === 1
}

/** Tile bisa diinjak kalau bukan air. */
export function bisaDilewati(t: Terrain, tx: number, ty: number): boolean {
  return tinggiDi(t, tx, ty) !== TINGGI.air
}

/** Koordinat piksel -> tile. */
export const keTile = (px: number): number => Math.floor(px / TILE)
/** Tengah sebuah tile dalam piksel. */
export const keTengahPiksel = (t: number): number => t * TILE + TILE / 2

export function tinggiDiPiksel(t: Terrain, x: number, y: number): Tinggi {
  return tinggiDi(t, keTile(x), keTile(y))
}

/**
 * Boleh melangkah dari satu tile ke tile tetangga?
 *
 * Aturan inti PRD §9.2: beda ketinggian hanya boleh dilewati lewat ramp.
 * Tebing tidak bisa dipanjat — inilah yang menciptakan chokepoint.
 */
export function bolehLangkah(t: Terrain, dariX: number, dariY: number, keX: number, keY: number): boolean {
  if (!bisaDilewati(t, keX, keY)) return false
  const a = tinggiDi(t, dariX, dariY)
  const b = tinggiDi(t, keX, keY)
  if (a === b) return true
  if (Math.abs(a - b) > 1) return false
  // Beda 1 level: salah satu ujungnya harus ramp/tangga.
  return adalahRamp(t, dariX, dariY) || adalahRamp(t, keX, keY)
}

// ---------------------------------------------------------------------------
// Pembuatan peta
// ---------------------------------------------------------------------------

export interface TitikBasis {
  tx: number
  ty: number
  arahX: number
  arahY: number
  /** Tingkat ketinggian lahan tempat markas berdiri (dataran atau plateau benteng atas). */
  level?: Tinggi
  /** Koordinat pojok luar pulau untuk penempatan rumpun pohon indah. */
  pojokPohon?: readonly [number, number][]
}

export interface TitikPenting {
  /** Tengah plateau pusat. */
  plateauPusat: { tx: number; ty: number }
  /** Ramp menuju plateau pusat & benteng bertingkat. */
  ramp: { tx: number; ty: number }[]
  /** Plateau samping, satu per pemain (simetri rotasi). */
  plateauSamping: { tx: number; ty: number }[]
  /** Lokasi basis untuk tiap slot pemain pada peta ini. */
  basis: TitikBasis[]
  /** Lokasi tambang ekspansi berpenjaga camp goblin. */
  ekspansi: { tx: number; ty: number }[]
  /** Lokasi camp goblin tambahan (penjaga jalur/danau). */
  campTambahan?: { tx: number; ty: number }[]
  /** Pulau dekoratif kecil di laut untuk pepohonan scenic. */
  pulauKecil?: { tx: number; ty: number }[]
}

const SISIPAN_PANTAI = 4

function isiLingkaran(t: Terrain, cx: number, cy: number, r: number, nilai: Tinggi): void {
  for (let ty = Math.max(0, cy - r); ty <= Math.min(t.baris - 1, cy + r); ty++) {
    for (let tx = Math.max(0, cx - r); tx <= Math.min(t.kolom - 1, cx + r); tx++) {
      const dx = tx - cx
      const dy = ty - cy
      if (dx * dx + dy * dy <= r * r) t.tinggi[indeks(t, tx, ty)] = nilai
    }
  }
}

function isiKotak(
  t: Terrain, x1: number, y1: number, x2: number, y2: number, rSudut: number, nilai: Tinggi,
): void {
  for (let ty = Math.max(0, y1); ty <= Math.min(t.baris - 1, y2); ty++) {
    for (let tx = Math.max(0, x1); tx <= Math.min(t.kolom - 1, x2); tx++) {
      if (rSudut > 0) {
        const cx = tx < x1 + rSudut ? x1 + rSudut : tx > x2 - rSudut ? x2 - rSudut : tx
        const cy = ty < y1 + rSudut ? y1 + rSudut : ty > y2 - rSudut ? y2 - rSudut : ty
        const dx = tx - cx
        const dy = ty - cy
        if (dx * dx + dy * dy > rSudut * rSudut) continue
      }
      t.tinggi[indeks(t, tx, ty)] = nilai
    }
  }
}

function gambarJalanGaris(t: Terrain, x1: number, y1: number, x2: number, y2: number, setengahLebar = 1): void {
  const langkah = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1)
  for (let s = 0; s <= langkah; s++) {
    const cx = Math.round(x1 + ((x2 - x1) * s) / langkah)
    const cy = Math.round(y1 + ((y2 - y1) * s) / langkah)
    for (let dy = -setengahLebar; dy <= setengahLebar; dy++) {
      for (let dx = -setengahLebar; dx <= setengahLebar; dx++) {
        const tx = cx + dx
        const ty = cy + dy
        if (!diDalam(t, tx, ty)) continue
        const idx = indeks(t, tx, ty)
        if (t.tinggi[idx] !== TINGGI.air && t.jembatan[idx] === 0 && t.ramp[idx] === 0) {
          t.jalan[idx] = 1
        }
      }
    }
  }
}

function pasangRampKotak(
  t: Terrain, ramp: { tx: number; ty: number }[],
  x1: number, y1: number, x2: number, y2: number, arah: 1 | 2 | 3 = 1,
): void {
  for (let ty = y1; ty <= y2; ty++) {
    for (let tx = x1; tx <= x2; tx++) {
      if (!diDalam(t, tx, ty)) continue
      const idx = indeks(t, tx, ty)
      t.tinggi[idx] = TINGGI.plateau
      t.ramp[idx] = arah
    }
  }
  ramp.push({ tx: Math.round((x1 + x2) / 2), ty: Math.round((y1 + y2) / 2) })
}

/**
 * Merapikan plateau setelah tangga dipasang: gugus plateau kecil (bukan ramp) yang
 * terjepit di antara dua tangga diturunkan ke dataran, sehingga tidak ada lagi
 * blok tebing 1–2 tile yang tampak melayang/terputus di sudut benteng.
 */
function rapikanPlateau(t: Terrain, maksGugus = 8): void {
  const total = t.kolom * t.baris
  const sudah = new Uint8Array(total)
  const antre: number[] = []
  const gugus: number[] = []
  const plat = (i: number): boolean => t.tinggi[i] === TINGGI.plateau && (t.ramp[i] ?? 0) === 0
  for (let i0 = 0; i0 < total; i0++) {
    if (sudah[i0] === 1 || !plat(i0)) continue
    antre.length = 0
    gugus.length = 0
    antre.push(i0)
    sudah[i0] = 1
    while (antre.length > 0) {
      const i = antre.pop()!
      gugus.push(i)
      const tx = i % t.kolom
      const ty = (i - tx) / t.kolom
      const tetangga = [
        tx > 0 ? i - 1 : -1, tx < t.kolom - 1 ? i + 1 : -1,
        ty > 0 ? i - t.kolom : -1, ty < t.baris - 1 ? i + t.kolom : -1,
      ]
      for (const n of tetangga) {
        if (n < 0 || sudah[n] === 1 || !plat(n)) continue
        sudah[n] = 1
        antre.push(n)
      }
    }
    if (gugus.length <= maksGugus) {
      for (const i of gugus) t.tinggi[i] = TINGGI.dataran
    }
  }
}

function pasangJembatanHorizontal(t: Terrain, x1: number, x2: number, yTengah: number, setengahLebar = 1): void {
  // Pastikan kepala jembatan di kedua sisi berpijak pada dataran solid.
  isiKotak(t, x1 - 2, yTengah - 2, x1 - 1, yTengah + 2, 0, TINGGI.dataran)
  isiKotak(t, x2 + 1, yTengah - 2, x2 + 2, yTengah + 2, 0, TINGGI.dataran)
  for (let ty = yTengah - setengahLebar; ty <= yTengah + setengahLebar; ty++) {
    for (let tx = x1; tx <= x2; tx++) {
      if (!diDalam(t, tx, ty)) continue
      const idx = indeks(t, tx, ty)
      t.tinggi[idx] = TINGGI.dataran
      t.jembatan[idx] = 1
    }
  }
}

function pasangJembatanVertikal(t: Terrain, xTengah: number, y1: number, y2: number, setengahLebar = 1): void {
  isiKotak(t, xTengah - 2, y1 - 2, xTengah + 2, y1 - 1, 0, TINGGI.dataran)
  isiKotak(t, xTengah - 2, y2 + 1, xTengah + 2, y2 + 2, 0, TINGGI.dataran)
  for (let ty = y1; ty <= y2; ty++) {
    for (let tx = xTengah - setengahLebar; tx <= xTengah + setengahLebar; tx++) {
      if (!diDalam(t, tx, ty)) continue
      const idx = indeks(t, tx, ty)
      t.tinggi[idx] = TINGGI.dataran
      t.jembatan[idx] = 2
    }
  }
}

function buatTerrainKlasik2(rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jembatan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jalan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
  }

  // 1. Dataran di seluruh pulau, air di tepi.
  for (let ty = 0; ty < t.baris; ty++) {
    for (let tx = 0; tx < t.kolom; tx++) {
      const diTepi =
        tx < SISIPAN_PANTAI || ty < SISIPAN_PANTAI ||
        tx >= t.kolom - SISIPAN_PANTAI || ty >= t.baris - SISIPAN_PANTAI
      t.tinggi[indeks(t, tx, ty)] = diTepi ? TINGGI.air : TINGGI.dataran
    }
  }

  // 2. Teluk acak di tepi supaya garis pantainya tidak lurus membosankan.
  for (let i = 0; i < 14; i++) {
    const sisi = acakBulat(rng, 4)
    const sepanjang = SISIPAN_PANTAI + acakBulat(rng, t.kolom - SISIPAN_PANTAI * 2)
    const dalam = 2 + acakBulat(rng, 4)
    const cx = sisi === 0 || sisi === 1 ? sepanjang : sisi === 2 ? SISIPAN_PANTAI + dalam : t.kolom - SISIPAN_PANTAI - dalam
    const cy = sisi === 0 ? SISIPAN_PANTAI + dalam : sisi === 1 ? t.baris - SISIPAN_PANTAI - dalam : sepanjang
    isiLingkaran(t, cx, cy, dalam, TINGGI.air)
  }

  // 3. Plateau pusat — harta paling diperebutkan.
  const pusat = { tx: Math.floor(t.kolom / 2), ty: Math.floor(t.baris / 2) }
  isiLingkaran(t, pusat.tx, pusat.ty, 11, TINGGI.plateau)

  // 4. Plateau samping, simetri rotasi 180 derajat.
  const sampingA = { tx: 30, ty: 30 }
  const sampingB = { tx: t.kolom - sampingA.tx, ty: t.baris - sampingA.ty }
  for (const p of [sampingA, sampingB]) isiLingkaran(t, p.tx, p.ty, 7, TINGGI.plateau)

  // 5. Ramp: satu-satunya jalan naik. Tepat 3 ke plateau pusat, berjarak sama.
  const ramp: { tx: number; ty: number }[] = []
  const pasangRamp = (cx: number, cy: number, r: number, sudut: number): void => {
    const rx = Math.round(cx + Math.cos(sudut) * (r - 1))
    const ry = Math.round(cy + Math.sin(sudut) * (r - 1))
    // Ramp selebar 3 tile supaya pasukan bisa lewat tanpa tersangkut.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = rx + dx
        const ty = ry + dy
        if (!diDalam(t, tx, ty)) continue
        t.tinggi[indeks(t, tx, ty)] = TINGGI.plateau
        t.ramp[indeks(t, tx, ty)] = 1
      }
    }
    ramp.push({ tx: rx, ty: ry })
  }

  for (let i = 0; i < 3; i++) pasangRamp(pusat.tx, pusat.ty, 11, (i * 2 * Math.PI) / 3)
  // Dua ramp per plateau samping, saling berseberangan.
  for (const p of [sampingA, sampingB]) {
    pasangRamp(p.tx, p.ty, 7, Math.PI * 0.25)
    pasangRamp(p.tx, p.ty, 7, Math.PI * 1.25)
  }

  // 6. Jalan pasir visual menghubungkan kedua markas ke pusat (tidak mengubah tinggi/determinisme).
  gambarJalanGaris(t, 20, 76, 42, 57, 1)
  gambarJalanGaris(t, 76, 20, 55, 39, 1)
  gambarJalanGaris(t, 20, 76, 26, 36, 1)
  gambarJalanGaris(t, 76, 20, 70, 60, 1)

  return {
    terrain: t,
    titik: {
      plateauPusat: pusat,
      ramp,
      plateauSamping: [sampingA, sampingB],
      basis: [
        { tx: 20, ty: 76, arahX: 1, arahY: -1 },
        { tx: 76, ty: 20, arahX: -1, arahY: 1 },
      ],
      ekspansi: [],
    },
  }
}

/**
 * Peta 4 Pemain "Pulau Salib" (berdasarkan ilustrasi resmi 4 pulau bertingkat):
 * - 4 pulau sudut dengan benteng dataran tinggi (TINGGI.plateau) + 2 tangga batu turun ke teras jembatan.
 * - 8 jembatan kayu utuh tanpa sela melintasi kanal air menuju arena silang tengah.
 * - 4 danau bertebing batu, jalan pasir keemasan, pulau dekoratif di laut,
 *   plateau obelisk pusat dengan 4 tangga batu, serta 9 camp Goblin.
 */
function buatTerrainSalib4(_rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS), // default 0 = TINGGI.air
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jembatan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jalan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
  }

  // 1. Empat pulau sudut dasar (Level 1 dataran bertebing laut)
  isiKotak(t, 5, 5, 29, 29, 3, TINGGI.dataran)   // NW
  isiKotak(t, 66, 5, 90, 29, 3, TINGGI.dataran)  // NE
  isiKotak(t, 5, 66, 29, 90, 3, TINGGI.dataran)  // SW
  isiKotak(t, 66, 66, 90, 90, 3, TINGGI.dataran) // SE

  // 2. Benteng atas bertingkat (Level 2 plateau) di setiap pulau markas!
  isiKotak(t, 6, 6, 23, 23, 0, TINGGI.plateau)   // NW citadel
  isiKotak(t, 72, 6, 89, 23, 0, TINGGI.plateau)  // NE citadel
  isiKotak(t, 6, 72, 23, 89, 0, TINGGI.plateau)  // SW citadel
  isiKotak(t, 72, 72, 89, 89, 0, TINGGI.plateau) // SE citadel

  // 3. Arena silang tengah (Level 1 dataran) + 4 danau dalam
  isiKotak(t, 15, 34, 80, 61, 2, TINGGI.dataran)
  isiKotak(t, 34, 15, 61, 80, 2, TINGGI.dataran)
  for (const [lx, ly] of [[37, 37], [58, 37], [37, 58], [58, 58]] as const) {
    isiLingkaran(t, lx, ly, 3, TINGGI.air)
  }

  // Pulau mini dekoratif di perairan luar (persis seperti ilustrasi)
  const pulauKecil: { tx: number; ty: number }[] = [
    { tx: 48, ty: 5 }, { tx: 48, ty: 90 }, { tx: 5, ty: 48 }, { tx: 90, ty: 48 },
    { tx: 37, ty: 6 }, { tx: 58, ty: 6 }, { tx: 37, ty: 89 }, { tx: 58, ty: 89 },
    { tx: 6, ty: 37 }, { tx: 6, ty: 58 }, { tx: 89, ty: 37 }, { tx: 89, ty: 58 },
  ]
  for (let i = 0; i < pulauKecil.length; i++) {
    const p = pulauKecil[i]!
    isiLingkaran(t, p.tx, p.ty, i < 4 ? 2 : 1, TINGGI.dataran)
  }

  // 4. Delapan jembatan kayu menyeberangi kanal air (lebar 3 tile)
  pasangJembatanVertikal(t, 20, 30, 33)
  pasangJembatanVertikal(t, 75, 30, 33)
  pasangJembatanVertikal(t, 20, 62, 65)
  pasangJembatanVertikal(t, 75, 62, 65)

  pasangJembatanHorizontal(t, 30, 33, 20)
  pasangJembatanHorizontal(t, 62, 65, 20)
  pasangJembatanHorizontal(t, 30, 33, 75)
  pasangJembatanHorizontal(t, 62, 65, 75)

  // 5. Tangga batu (ramp) turun dari keempat benteng pulau menuju teras jembatan (arah 1=N/S, 2=Barat, 3=Timur)
  const ramp: { tx: number; ty: number }[] = []
  // NW citadel -> jembatan selatan (x=20) & jembatan timur (y=20)
  pasangRampKotak(t, ramp, 19, 22, 21, 23, 1)
  pasangRampKotak(t, ramp, 22, 19, 23, 21, 3)
  // NE citadel -> jembatan selatan (x=75) & jembatan barat (y=20)
  pasangRampKotak(t, ramp, 74, 22, 76, 23, 1)
  pasangRampKotak(t, ramp, 72, 19, 73, 21, 2)
  // SW citadel -> jembatan utara (x=20) & jembatan timur (y=75)
  pasangRampKotak(t, ramp, 19, 72, 21, 73, 1)
  pasangRampKotak(t, ramp, 22, 74, 23, 76, 3)
  // SE citadel -> jembatan utara (x=75) & jembatan barat (y=75)
  pasangRampKotak(t, ramp, 74, 72, 76, 73, 1)
  pasangRampKotak(t, ramp, 72, 74, 73, 76, 2)

  // 6. Plateau obelisk pusat bertebing lurus rapi (bulat sudut r=2) dengan 4 tangga batu simetris (N, S, W, E)
  const pusat = { tx: 48, ty: 48 }
  isiKotak(t, 41, 41, 55, 55, 0, TINGGI.plateau)
  pasangRampKotak(t, ramp, 47, 41, 49, 42, 1) // Utara
  pasangRampKotak(t, ramp, 47, 54, 49, 55, 1) // Selatan
  pasangRampKotak(t, ramp, 41, 47, 42, 49, 2) // Barat
  pasangRampKotak(t, ramp, 54, 47, 55, 49, 3) // Timur

  rapikanPlateau(t)

  // 7. Jalan pasir keemasan menghubungkan seluruh Castle -> Tangga -> Jembatan -> Pusat
  // Jalan di tiap pulau
  gambarJalanGaris(t, 14, 14, 20, 20, 1)
  gambarJalanGaris(t, 20, 24, 20, 29, 1)
  gambarJalanGaris(t, 24, 20, 29, 20, 1)

  gambarJalanGaris(t, 81, 14, 75, 20, 1)
  gambarJalanGaris(t, 75, 24, 75, 29, 1)
  gambarJalanGaris(t, 66, 20, 71, 20, 1)

  gambarJalanGaris(t, 14, 81, 20, 75, 1)
  gambarJalanGaris(t, 20, 66, 20, 71, 1)
  gambarJalanGaris(t, 24, 75, 29, 75, 1)

  gambarJalanGaris(t, 81, 81, 75, 75, 1)
  gambarJalanGaris(t, 75, 66, 75, 71, 1)
  gambarJalanGaris(t, 66, 75, 71, 75, 1)

  // Jalan silang utama di arena tengah + jalur penghubung jembatan
  gambarJalanGaris(t, 20, 48, 75, 48, 1)
  gambarJalanGaris(t, 48, 20, 48, 75, 1)
  gambarJalanGaris(t, 20, 34, 20, 61, 1)
  gambarJalanGaris(t, 75, 34, 75, 61, 1)
  gambarJalanGaris(t, 34, 20, 61, 20, 1)
  gambarJalanGaris(t, 34, 75, 61, 75, 1)

  return {
    terrain: t,
    titik: {
      plateauPusat: pusat,
      ramp,
      plateauSamping: [],
      basis: [
        {
          tx: 14, ty: 14, arahX: 1, arahY: 1, level: TINGGI.plateau,
          pojokPohon: [[7, 7], [11, 7], [7, 11], [21, 7], [7, 21]],
        },
        {
          tx: 81, ty: 14, arahX: -1, arahY: 1, level: TINGGI.plateau,
          pojokPohon: [[88, 7], [84, 7], [88, 11], [74, 7], [88, 21]],
        },
        {
          tx: 14, ty: 81, arahX: 1, arahY: -1, level: TINGGI.plateau,
          pojokPohon: [[7, 88], [11, 88], [7, 84], [21, 88], [7, 74]],
        },
        {
          tx: 81, ty: 81, arahX: -1, arahY: -1, level: TINGGI.plateau,
          pojokPohon: [[88, 88], [84, 88], [88, 84], [74, 88], [88, 74]],
        },
      ],
      ekspansi: [
        { tx: 48, ty: 20 },
        { tx: 48, ty: 75 },
        { tx: 20, ty: 48 },
        { tx: 75, ty: 48 },
      ],
      campTambahan: [
        { tx: 30, ty: 42 },
        { tx: 65, ty: 42 },
        { tx: 30, ty: 53 },
        { tx: 65, ty: 53 },
      ],
      pulauKecil,
    },
  }
}

/**
 * Peta 6 Pemain "Kepulauan Bintang":
 * - 6 pulau markas bertingkat (benteng plateau + tangga batu turun ke jembatan).
 * - 10 jembatan kayu utuh tanpa sela (6 radial ke pusat + 4 cincin antar-pulau).
 * - 2 danau besar bertebing batu, jalan pasir keemasan, plateau pusat bertangga, & 7 camp Goblin.
 */
function buatTerrainBintang6(_rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jembatan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jalan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
  }

  // 1. Tiga pulau utara (NW, N, NE) dan tiga pulau selatan (SW, S, SE)
  isiKotak(t, 5, 5, 27, 26, 2, TINGGI.dataran)   // NW
  isiKotak(t, 36, 5, 59, 26, 2, TINGGI.dataran)  // N
  isiKotak(t, 68, 5, 90, 26, 2, TINGGI.dataran)  // NE

  isiKotak(t, 5, 69, 27, 90, 2, TINGGI.dataran)  // SW
  isiKotak(t, 36, 69, 59, 90, 2, TINGGI.dataran) // S
  isiKotak(t, 68, 69, 90, 90, 2, TINGGI.dataran) // SE

  // 2. Benteng bertingkat (Level 2 plateau) pada setiap dari 6 pulau!
  isiKotak(t, 6, 6, 22, 21, 0, TINGGI.plateau)   // NW citadel
  isiKotak(t, 39, 6, 56, 21, 0, TINGGI.plateau)  // N citadel
  isiKotak(t, 73, 6, 89, 21, 0, TINGGI.plateau)  // NE citadel

  isiKotak(t, 6, 74, 22, 89, 0, TINGGI.plateau)  // SW citadel
  isiKotak(t, 39, 74, 56, 89, 0, TINGGI.plateau) // S citadel
  isiKotak(t, 73, 74, 89, 89, 0, TINGGI.plateau) // SE citadel

  // 3. Arena tengah lebar dengan leher utara/selatan + 2 danau besar di barat & timur
  isiKotak(t, 16, 33, 79, 62, 2, TINGGI.dataran)
  isiKotak(t, 40, 30, 55, 65, 2, TINGGI.dataran)
  isiLingkaran(t, 27, 48, 5, TINGGI.air)
  isiLingkaran(t, 68, 48, 5, TINGGI.air)

  // Pulau dekoratif kecil di laut tepi
  const pulauKecil: { tx: number; ty: number }[] = [
    { tx: 6, ty: 48 }, { tx: 89, ty: 48 }, { tx: 31, ty: 5 }, { tx: 64, ty: 5 },
    { tx: 31, ty: 90 }, { tx: 64, ty: 90 }, { tx: 9, ty: 36 }, { tx: 86, ty: 36 },
    { tx: 9, ty: 60 }, { tx: 86, ty: 60 },
  ]
  for (let i = 0; i < pulauKecil.length; i++) {
    const p = pulauKecil[i]!
    isiLingkaran(t, p.tx, p.ty, i < 6 ? 2 : 1, TINGGI.dataran)
  }

  // 4. Enam jembatan radial ke arena pusat
  pasangJembatanVertikal(t, 20, 27, 32) // NW -> Tengah
  pasangJembatanVertikal(t, 47, 27, 29) // N  -> Tengah
  pasangJembatanVertikal(t, 75, 27, 32) // NE -> Tengah
  pasangJembatanVertikal(t, 20, 63, 68) // SW -> Tengah
  pasangJembatanVertikal(t, 47, 66, 68) // S  -> Tengah
  pasangJembatanVertikal(t, 75, 63, 68) // SE -> Tengah

  // 5. Empat jembatan cincin antar-pulau utara dan antar-pulau selatan
  pasangJembatanHorizontal(t, 28, 35, 15) // NW <-> N
  pasangJembatanHorizontal(t, 60, 67, 15) // N  <-> NE
  pasangJembatanHorizontal(t, 28, 35, 80) // SW <-> S
  pasangJembatanHorizontal(t, 60, 67, 80) // S  <-> SE

  // 6. Tangga batu (ramp) turun dari keenam benteng pulau (arah 1=N/S, 2=Barat, 3=Timur)
  const ramp: { tx: number; ty: number }[] = []
  pasangRampKotak(t, ramp, 19, 20, 21, 21, 1) // NW selatan
  pasangRampKotak(t, ramp, 21, 14, 22, 16, 3) // NW timur
  pasangRampKotak(t, ramp, 46, 20, 48, 21, 1) // N selatan
  pasangRampKotak(t, ramp, 39, 14, 40, 16, 2) // N barat
  pasangRampKotak(t, ramp, 55, 14, 56, 16, 3) // N timur
  pasangRampKotak(t, ramp, 74, 20, 76, 21, 1) // NE selatan
  pasangRampKotak(t, ramp, 73, 14, 74, 16, 2) // NE barat

  pasangRampKotak(t, ramp, 19, 74, 21, 75, 1) // SW utara
  pasangRampKotak(t, ramp, 21, 79, 22, 81, 3) // SW timur
  pasangRampKotak(t, ramp, 46, 74, 48, 75, 1) // S utara
  pasangRampKotak(t, ramp, 39, 79, 40, 81, 2) // S barat
  pasangRampKotak(t, ramp, 55, 79, 56, 81, 3) // S timur
  pasangRampKotak(t, ramp, 74, 74, 76, 75, 1) // SE utara
  pasangRampKotak(t, ramp, 73, 79, 74, 81, 2) // SE barat

  // 7. Plateau pusat bertebing lurus rapi (r=2) dengan 4 tangga batu simetris (N, S, W, E)
  const pusat = { tx: 48, ty: 48 }
  isiKotak(t, 42, 42, 54, 54, 0, TINGGI.plateau)
  pasangRampKotak(t, ramp, 47, 42, 49, 43, 1) // Utara
  pasangRampKotak(t, ramp, 47, 53, 49, 54, 1) // Selatan
  pasangRampKotak(t, ramp, 42, 47, 43, 49, 2) // Barat
  pasangRampKotak(t, ramp, 53, 47, 54, 49, 3) // Timur

  rapikanPlateau(t)

  // 8. Jalan pasir keemasan menghubungkan seluruh 6 markas, tangga, jembatan, & pusat
  gambarJalanGaris(t, 14, 14, 20, 15, 1)
  gambarJalanGaris(t, 20, 22, 20, 26, 1)
  gambarJalanGaris(t, 23, 15, 27, 15, 1)

  gambarJalanGaris(t, 47, 14, 47, 26, 1)
  gambarJalanGaris(t, 36, 15, 59, 15, 1)

  gambarJalanGaris(t, 81, 14, 75, 15, 1)
  gambarJalanGaris(t, 75, 22, 75, 26, 1)
  gambarJalanGaris(t, 68, 15, 72, 15, 1)

  gambarJalanGaris(t, 14, 81, 20, 80, 1)
  gambarJalanGaris(t, 20, 69, 20, 73, 1)
  gambarJalanGaris(t, 23, 80, 27, 80, 1)

  gambarJalanGaris(t, 47, 69, 47, 81, 1)
  gambarJalanGaris(t, 36, 80, 59, 80, 1)

  gambarJalanGaris(t, 81, 81, 75, 80, 1)
  gambarJalanGaris(t, 75, 69, 75, 73, 1)
  gambarJalanGaris(t, 68, 80, 72, 80, 1)

  // Jalan arena pusat
  gambarJalanGaris(t, 48, 30, 48, 65, 1)
  gambarJalanGaris(t, 20, 35, 75, 35, 1)
  gambarJalanGaris(t, 20, 60, 75, 60, 1)
  gambarJalanGaris(t, 37, 35, 37, 60, 1)
  gambarJalanGaris(t, 58, 35, 58, 60, 1)
  gambarJalanGaris(t, 37, 48, 58, 48, 1)

  return {
    terrain: t,
    titik: {
      plateauPusat: pusat,
      ramp,
      plateauSamping: [],
      basis: [
        {
          tx: 14, ty: 13, arahX: 1, arahY: 1, level: TINGGI.plateau,
          pojokPohon: [[7, 7], [11, 7], [7, 11], [7, 19]],
        },
        {
          tx: 47, ty: 13, arahX: 0, arahY: 1, level: TINGGI.plateau,
          pojokPohon: [[40, 7], [43, 7], [55, 7], [52, 7]],
        },
        {
          tx: 81, ty: 13, arahX: -1, arahY: 1, level: TINGGI.plateau,
          pojokPohon: [[88, 7], [84, 7], [88, 11], [88, 19]],
        },
        {
          tx: 14, ty: 82, arahX: 1, arahY: -1, level: TINGGI.plateau,
          pojokPohon: [[7, 88], [11, 88], [7, 84], [7, 76]],
        },
        {
          tx: 47, ty: 82, arahX: 0, arahY: -1, level: TINGGI.plateau,
          pojokPohon: [[40, 88], [43, 88], [55, 88], [52, 88]],
        },
        {
          tx: 81, ty: 82, arahX: -1, arahY: -1, level: TINGGI.plateau,
          pojokPohon: [[88, 88], [84, 88], [88, 84], [88, 76]],
        },
      ],
      ekspansi: [
        { tx: 37, ty: 37 },
        { tx: 58, ty: 37 },
        { tx: 37, ty: 58 },
        { tx: 58, ty: 58 },
      ],
      campTambahan: [
        { tx: 19, ty: 48 },
        { tx: 76, ty: 48 },
      ],
      pulauKecil,
    },
  }
}

/**
 * Menghasilkan terrain & titik penting untuk salah satu peta (`klasik2`, `salib4`, `bintang6`).
 */
export function buatTerrain(rng: Rng, peta: JenisPeta = 'klasik2'): { terrain: Terrain; titik: TitikPenting } {
  if (peta === 'salib4') return buatTerrainSalib4(rng)
  if (peta === 'bintang6') return buatTerrainBintang6(rng)
  return buatTerrainKlasik2(rng)
}

/** Tile berjalan terdekat dari sebuah titik — untuk menaruh unit yang terjepit. */
export function tileLewatTerdekat(t: Terrain, tx: number, ty: number, maksRadius = 12): { tx: number; ty: number } | null {
  if (bisaDilewati(t, tx, ty)) return { tx, ty }
  for (let r = 1; r <= maksRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (bisaDilewati(t, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy }
      }
    }
  }
  return null
}
