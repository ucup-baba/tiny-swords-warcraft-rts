import { PETA_BARIS, PETA_KOLOM, TILE, TINGGI, type Tinggi } from '@hftf/shared'
import { acakBulat, type Rng } from './rng.js'

/**
 * Terrain sebagai DATA, bukan kode (PRD §9.2).
 *
 * Implementasi lama menggambar peta dengan indeks tile hardcode di dalam fungsi
 * gambar — itu sebabnya peta tidak bisa punya ketinggian dan tidak bisa diuji.
 * Di sini terrain adalah array yang bisa dibaca sim, renderer, DAN tes.
 */
export interface Terrain {
  kolom: number
  baris: number
  /** Ketinggian per tile: 0 air, 1 dataran, 2 plateau. */
  tinggi: Uint8Array
  /** 1 kalau tile ini ramp — satu-satunya jalan antar level. */
  ramp: Uint8Array
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

export interface TitikPenting {
  /** Tengah plateau pusat. */
  plateauPusat: { tx: number; ty: number }
  /** Ramp menuju plateau pusat. */
  ramp: { tx: number; ty: number }[]
  /** Plateau samping, satu per pemain (simetri rotasi). */
  plateauSamping: { tx: number; ty: number }[]
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

/**
 * Peta simetri rotasi 180 derajat (PRD §9.3) — bukan simetri cermin, supaya
 * kedua basis menghadap medan yang sama bentuknya tapi tidak terlihat seperti
 * pantulan.
 */
export function buatTerrain(rng: Rng): { terrain: Terrain; titik: TitikPenting } {
  const t: Terrain = {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(PETA_KOLOM * PETA_BARIS),
    ramp: new Uint8Array(PETA_KOLOM * PETA_BARIS),
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

  return { terrain: t, titik: { plateauPusat: pusat, ramp, plateauSamping: [sampingA, sampingB] } }
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
