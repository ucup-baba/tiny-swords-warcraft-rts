import { BANGUNAN } from './definisi/bangunan.js'
import { bisaDilewati, diDalam, indeks, keTengahPiksel, keTile, type Terrain } from './terrain.js'
import type { Bangunan, Dunia } from './tipe.js'

/**
 * Peta halangan dinamis di atas grid tile Terrain.
 *
 * Nilai 0 = bebas dilalui, > 0 = tertutup tapak bangunan, tambang, atau pohon.
 * Sepenuhnya turunan deterministik dari entitas `dunia`, sehingga tidak perlu
 * masuk hash determinisme maupun snapshot jaringan.
 */
export const buatHalangan = (kolom: number, baris: number): Uint8Array =>
  new Uint8Array(kolom * baris)

/** Batas tile tapak fisik sebuah bangunan (bagian dasar tempat dinding berdiri). */
export function tapakBangunan(b: Bangunan): { x1: number; x2: number; y1: number; y2: number } {
  const def = BANGUNAN[b.jenis]
  return {
    x1: keTile(b.x - def.w * 0.36),
    x2: keTile(b.x + def.w * 0.36),
    y1: keTile(b.y - def.h * 0.24),
    y2: keTile(b.y + def.h * 0.12),
  }
}

/** Menghitung ulang seluruh peta halangan dari bangunan aktif/konstruksi, tambang, dan pohon. */
export function segarkanHalangan(dunia: Dunia): void {
  const h = dunia.halangan
  const t = dunia.terrain
  h.fill(0)

  const tandai = (tx: number, ty: number, kode: number): void => {
    if (!diDalam(t, tx, ty)) return
    h[indeks(t, tx, ty)] = kode
  }

  for (const b of dunia.bangunan) {
    if (b.fase === 'hancur') continue
    const { x1, x2, y1, y2 } = tapakBangunan(b)
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) tandai(tx, ty, 1)
    }
  }

  for (const tb of dunia.tambang) {
    const rx = tb.jenis === 'mine' ? 38 : 20
    const x1 = keTile(tb.x - rx)
    const x2 = keTile(tb.x + rx)
    const y1 = keTile(tb.y - 24)
    const y2 = keTile(tb.y + 10)
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) tandai(tx, ty, 2)
    }
  }

  for (const p of dunia.pohon) {
    tandai(keTile(p.x), keTile(p.y), 3)
  }
}

export function terhalangTile(t: Terrain, halangan: Uint8Array | undefined, tx: number, ty: number): boolean {
  if (!halangan || !diDalam(t, tx, ty)) return false
  return halangan[indeks(t, tx, ty)] !== 0
}

/**
 * Tile berjalan terdekat yang TIDAK terhalang. Kalau `(dariTx, dariTy)` diberikan,
 * memilih kandidat pada cincin terdekat yang paling dekat ke posisi asal agar
 * unit berhenti di sisi dekat objek, bukan memutar ke belakang.
 */
export function tileBebasTerdekat(
  t: Terrain,
  halangan: Uint8Array | undefined,
  tx: number, ty: number,
  dariTx?: number, dariTy?: number,
): { tx: number; ty: number } | null {
  for (let r = 0; r <= 12; r++) {
    let terbaik: { tx: number; ty: number } | null = null
    let skorTerbaik = Infinity
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const x = tx + dx
        const y = ty + dy
        if (!bisaDilewati(t, x, y)) continue
        if (terhalangTile(t, halangan, x, y)) continue
        const skor = dariTx !== undefined && dariTy !== undefined
          ? Math.hypot(x - dariTx, y - dariTy)
          : dx * dx + dy * dy
        if (skor < skorTerbaik) {
          skorTerbaik = skor
          terbaik = { tx: x, ty: y }
        }
      }
    }
    if (terbaik) return terbaik
  }
  return null
}

/** Koordinat piksel bebas terdekat untuk memunculkan unit di luar tapak bangunan. */
export function posisiBebasDekat(
  dunia: Dunia, x: number, y: number, arahX?: number, arahY?: number,
): { x: number; y: number } {
  const tx = keTile(x)
  const ty = keTile(y)
  const dtx = arahX !== undefined ? keTile(arahX) : undefined
  const dty = arahY !== undefined ? keTile(arahY) : undefined
  if (bisaDilewati(dunia.terrain, tx, ty) && !terhalangTile(dunia.terrain, dunia.halangan, tx, ty)) {
    return { x, y }
  }
  const ganti = tileBebasTerdekat(dunia.terrain, dunia.halangan, tx, ty, dtx, dty)
  if (!ganti) return { x, y }
  return { x: keTengahPiksel(ganti.tx), y: keTengahPiksel(ganti.ty) }
}
