import { PETA_BARIS, PETA_KOLOM, TILE, TINGGI, type JenisPeta, type Tinggi } from '@hftf/shared'
import { acakBulat, type Rng } from './rng.js'

/**
 * Terrain sebagai DATA, bukan kode (PRD §9.2).
 */
export interface Terrain {
  kolom: number
  baris: number
  /** Ketinggian per tile: 0 air, 1 dataran, 2 plateau. */
  tinggi: Uint8Array
  /** 1 kalau tile ini ramp — satu-satunya jalan antar level. */
  ramp: Uint8Array
  /** 0 = bukan jembatan, 1 = jembatan horizontal, 2 = jembatan vertikal. */
  jembatan: Uint8Array
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
  return diDalam(t, tx, ty) && t.ramp[indeks(t, tx, ty)] === 1
}

export function adalahJembatan(t: Terrain, tx: number, ty: number): boolean {
  return diDalam(t, tx, ty) && (t.jembatan[indeks(t, tx, ty)] ?? 0) > 0
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
  // Beda level: salah satu ujungnya harus ramp.
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
}

export interface TitikPenting {
  /** Tengah plateau pusat. */
  plateauPusat: { tx: number; ty: number }
  /** Ramp menuju plateau pusat. */
  ramp: { tx: number; ty: number }[]
  /** Plateau samping, satu per pemain (simetri rotasi). */
  plateauSamping: { tx: number; ty: number }[]
  /** Lokasi basis untuk tiap slot pemain pada peta ini. */
  basis: TitikBasis[]
  /** Lokasi tambang ekspansi berpenjaga camp goblin. */
  ekspansi: { tx: number; ty: number }[]
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
 * Peta 4 Pemain "Pulau Salib":
 * 4 pulau basis di empat sudut, dipisahkan kanal air, dihubungkan 8 jembatan kayu
 * menuju arena salib tengah yang punya 4 danau & plateau obelisk pusat.
 */
function buatTerrainSalib4(_rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS), // default 0 = TINGGI.air
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jembatan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
  }

  // 1. Empat pulau sudut untuk 4 kerajaan (NW, NE, SW, SE)
  isiKotak(t, 5, 5, 29, 29, 3, TINGGI.dataran)
  isiKotak(t, 66, 5, 90, 29, 3, TINGGI.dataran)
  isiKotak(t, 5, 66, 29, 90, 3, TINGGI.dataran)
  isiKotak(t, 66, 66, 90, 90, 3, TINGGI.dataran)

  // 2. Arena silang tengah
  isiKotak(t, 15, 34, 80, 61, 2, TINGGI.dataran)
  isiKotak(t, 34, 15, 61, 80, 2, TINGGI.dataran)

  // 3. Empat danau kecil di dalam lengkung silang + pulau dekoratif kecil di laut tepi
  for (const [lx, ly] of [[36, 36], [59, 36], [36, 59], [59, 59]] as const) {
    isiLingkaran(t, lx, ly, 3, TINGGI.air)
  }
  for (const [ix, iy] of [[48, 5], [48, 90], [5, 48], [90, 48]] as const) {
    isiLingkaran(t, ix, iy, 2, TINGGI.dataran)
  }

  // 4. Delapan jembatan kayu menyeberangi kanal air dari tiap pulau ke lengan arena
  pasangJembatanVertikal(t, 20, 30, 33)
  pasangJembatanVertikal(t, 75, 30, 33)
  pasangJembatanVertikal(t, 20, 62, 65)
  pasangJembatanVertikal(t, 75, 62, 65)

  pasangJembatanHorizontal(t, 30, 33, 20)
  pasangJembatanHorizontal(t, 62, 65, 20)
  pasangJembatanHorizontal(t, 30, 33, 75)
  pasangJembatanHorizontal(t, 62, 65, 75)

  // 5. Plateau pusat dengan 4 tangga/ramp di N, S, E, W
  const pusat = { tx: 48, ty: 48 }
  isiLingkaran(t, pusat.tx, pusat.ty, 8, TINGGI.plateau)
  const ramp: { tx: number; ty: number }[] = []
  for (let i = 0; i < 4; i++) {
    const sudut = (i * Math.PI) / 2
    const rx = Math.round(pusat.tx + Math.cos(sudut) * 7)
    const ry = Math.round(pusat.ty + Math.sin(sudut) * 7)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = rx + dx
        const ty = ry + dy
        t.tinggi[indeks(t, tx, ty)] = TINGGI.plateau
        t.ramp[indeks(t, tx, ty)] = 1
      }
    }
    ramp.push({ tx: rx, ty: ry })
  }

  return {
    terrain: t,
    titik: {
      plateauPusat: pusat,
      ramp,
      plateauSamping: [],
      basis: [
        { tx: 16, ty: 16, arahX: 1, arahY: 1 },   // NW (Blue)
        { tx: 79, ty: 16, arahX: -1, arahY: 1 },  // NE (Red)
        { tx: 16, ty: 79, arahX: 1, arahY: -1 },  // SW (Green)
        { tx: 79, ty: 79, arahX: -1, arahY: -1 }, // SE (Yellow)
      ],
      ekspansi: [
        { tx: 48, ty: 19 },
        { tx: 48, ty: 76 },
        { tx: 19, ty: 48 },
        { tx: 76, ty: 48 },
      ],
    },
  }
}

/**
 * Peta 6 Pemain "Kepulauan Bintang":
 * 6 pulau basis mengelilingi peta (3 di utara, 3 di selatan), dihubungkan oleh
 * 10 jembatan kayu menuju arena pusat (dengan 2 danau besar & plateau obelisk tengah)
 * serta antar-pulau tetangga.
 */
function buatTerrainBintang6(_rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    jembatan: new Uint8Array(PETA_KOLOM * PETA_BARIS),
  }

  // 1. Tiga pulau utara (NW, N, NE) dan tiga pulau selatan (SW, S, SE)
  isiKotak(t, 5, 5, 27, 25, 2, TINGGI.dataran)   // NW
  isiKotak(t, 36, 5, 59, 25, 2, TINGGI.dataran)  // N
  isiKotak(t, 68, 5, 90, 25, 2, TINGGI.dataran)  // NE

  isiKotak(t, 5, 70, 27, 90, 2, TINGGI.dataran)  // SW
  isiKotak(t, 36, 70, 59, 90, 2, TINGGI.dataran) // S
  isiKotak(t, 68, 70, 90, 90, 2, TINGGI.dataran) // SE

  // 2. Arena tengah lebar dengan leher utara/selatan + 2 danau besar di barat & timur
  isiKotak(t, 16, 33, 79, 62, 2, TINGGI.dataran)
  isiKotak(t, 40, 30, 55, 65, 2, TINGGI.dataran)
  isiLingkaran(t, 26, 48, 5, TINGGI.air)
  isiLingkaran(t, 69, 48, 5, TINGGI.air)

  // Pulau batu dekoratif di laut tepi
  for (const [ix, iy] of [[5, 48], [90, 48], [31, 4], [64, 4], [31, 91], [64, 91]] as const) {
    isiLingkaran(t, ix, iy, 2, TINGGI.dataran)
  }

  // 3. Enam jembatan radial ke arena pusat
  pasangJembatanVertikal(t, 20, 26, 32) // NW -> Tengah
  pasangJembatanVertikal(t, 47, 26, 29) // N  -> Tengah
  pasangJembatanVertikal(t, 75, 26, 32) // NE -> Tengah
  pasangJembatanVertikal(t, 20, 63, 69) // SW -> Tengah
  pasangJembatanVertikal(t, 47, 66, 69) // S  -> Tengah
  pasangJembatanVertikal(t, 75, 63, 69) // SE -> Tengah

  // 4. Empat jembatan cincin antar-pulau utara dan antar-pulau selatan
  pasangJembatanHorizontal(t, 28, 35, 15) // NW <-> N
  pasangJembatanHorizontal(t, 60, 67, 15) // N  <-> NE
  pasangJembatanHorizontal(t, 28, 35, 80) // SW <-> S
  pasangJembatanHorizontal(t, 60, 67, 80) // S  <-> SE

  // 5. Plateau pusat dengan 4 ramp simetris
  const pusat = { tx: 48, ty: 48 }
  isiLingkaran(t, pusat.tx, pusat.ty, 7, TINGGI.plateau)
  const ramp: { tx: number; ty: number }[] = []
  for (let i = 0; i < 4; i++) {
    const sudut = (i * Math.PI) / 2
    const rx = Math.round(pusat.tx + Math.cos(sudut) * 6)
    const ry = Math.round(pusat.ty + Math.sin(sudut) * 6)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = rx + dx
        const ty = ry + dy
        t.tinggi[indeks(t, tx, ty)] = TINGGI.plateau
        t.ramp[indeks(t, tx, ty)] = 1
      }
    }
    ramp.push({ tx: rx, ty: ry })
  }

  return {
    terrain: t,
    titik: {
      plateauPusat: pusat,
      ramp,
      plateauSamping: [],
      basis: [
        { tx: 15, ty: 14, arahX: 1, arahY: 1 },   // NW (Blue)
        { tx: 47, ty: 14, arahX: 0, arahY: 1 },   // N  (Red)
        { tx: 79, ty: 14, arahX: -1, arahY: 1 },  // NE (Yellow)
        { tx: 15, ty: 81, arahX: 1, arahY: -1 },  // SW (Green)
        { tx: 47, ty: 81, arahX: 0, arahY: -1 },  // S  (Purple)
        { tx: 79, ty: 81, arahX: -1, arahY: -1 }, // SE (Black)
      ],
      ekspansi: [
        { tx: 37, ty: 37 },
        { tx: 58, ty: 37 },
        { tx: 37, ty: 58 },
        { tx: 58, ty: 58 },
      ],
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
