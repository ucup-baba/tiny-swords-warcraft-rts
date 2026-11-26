import { terhalangTile, tileBebasTerdekat } from './halangan.js'
import { bolehLangkah, bisaDilewati, diDalam, indeks, keTile, keTengahPiksel, type Terrain } from './terrain.js'

/**
 * Pencarian jalur A* di grid tile yang menghormati tebing (PRD §9.2 / AC-9.3).
 *
 * Gerak lurus tidak cukup begitu ada elevasi: unit yang disuruh ke atas plateau
 * harus BERJALAN MEMUTAR KE RAMP, bukan menembus tebing.
 */

const BIAYA_LURUS = 10
const BIAYA_DIAGONAL = 14

/** Batas node yang diperiksa; cukup besar untuk jalur memutar pulau/jembatan. */
const MAKS_NODE = 9600

const ARAH: readonly [number, number, number][] = [
  [1, 0, BIAYA_LURUS], [-1, 0, BIAYA_LURUS], [0, 1, BIAYA_LURUS], [0, -1, BIAYA_LURUS],
  [1, 1, BIAYA_DIAGONAL], [1, -1, BIAYA_DIAGONAL], [-1, 1, BIAYA_DIAGONAL], [-1, -1, BIAYA_DIAGONAL],
]

/** Min-heap sederhana; cukup untuk grid seukuran ini dan tidak bergantung urutan Map. */
class Antrean {
  private data: { n: number; f: number }[] = []

  get kosong(): boolean {
    return this.data.length === 0
  }

  dorong(n: number, f: number): void {
    this.data.push({ n, f })
    let i = this.data.length - 1
    while (i > 0) {
      const induk = (i - 1) >> 1
      if (this.data[induk]!.f <= this.data[i]!.f) break
      ;[this.data[induk], this.data[i]] = [this.data[i]!, this.data[induk]!]
      i = induk
    }
  }

  ambil(): number {
    const atas = this.data[0]!
    const akhir = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = akhir
      let i = 0
      for (;;) {
        const kiri = i * 2 + 1
        const kanan = kiri + 1
        let kecil = i
        if (kiri < this.data.length && this.data[kiri]!.f < this.data[kecil]!.f) kecil = kiri
        if (kanan < this.data.length && this.data[kanan]!.f < this.data[kecil]!.f) kecil = kanan
        if (kecil === i) break
        ;[this.data[kecil], this.data[i]] = [this.data[i]!, this.data[kecil]!]
        i = kecil
      }
    }
    return atas.n
  }
}

export interface Jalur {
  /** Titik tengah tile dalam piksel, dari langkah berikutnya sampai tujuan. */
  titik: { x: number; y: number }[]
  /** Indeks titik yang sedang dituju. */
  ke: number
}

/** Heuristik octile — tepat untuk gerak 8 arah, jadi A*-nya tidak melebih-lebihkan. */
function heuristik(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx)
  const dy = Math.abs(ay - by)
  return BIAYA_LURUS * (dx + dy) + (BIAYA_DIAGONAL - 2 * BIAYA_LURUS) * Math.min(dx, dy)
}

export function cariJalur(
  t: Terrain,
  dariPxX: number, dariPxY: number,
  kePxX: number, kePxY: number,
  halangan?: Uint8Array,
): Jalur | null {
  const ax = keTile(dariPxX)
  const ay = keTile(dariPxY)
  let bx = keTile(kePxX)
  let by = keTile(kePxY)

  if (!diDalam(t, ax, ay) || !diDalam(t, bx, by)) return null

  const tujuanBebasAsli = bisaDilewati(t, bx, by) && !terhalangTile(t, halangan, bx, by)

  // Tujuan di air, tebing, atau dalam tapak bangunan/pohon: pakai tile bebas terdekat di sisi asal.
  if (!tujuanBebasAsli) {
    const ganti = tileBebasTerdekat(t, halangan, bx, by, ax, ay)
    if (!ganti) return null
    bx = ganti.tx
    by = ganti.ty
  }
  if (ax === bx && ay === by) {
    return tujuanBebasAsli
      ? { titik: [{ x: kePxX, y: kePxY }], ke: 0 }
      : { titik: [{ x: keTengahPiksel(bx), y: keTengahPiksel(by) }], ke: 0 }
  }

  const total = t.kolom * t.baris
  const g = new Float64Array(total).fill(Infinity)
  const dariMana = new Int32Array(total).fill(-1)
  const sudah = new Uint8Array(total)

  const mulai = indeks(t, ax, ay)
  const tujuan = indeks(t, bx, by)
  g[mulai] = 0

  const antrean = new Antrean()
  antrean.dorong(mulai, heuristik(ax, ay, bx, by))
  let diperiksa = 0

  while (!antrean.kosong) {
    const n = antrean.ambil()
    if (sudah[n]) continue
    sudah[n] = 1
    if (n === tujuan) break
    if (++diperiksa > MAKS_NODE) return null

    const nx = n % t.kolom
    const ny = (n - nx) / t.kolom

    for (const [dx, dy, biaya] of ARAH) {
      const mx = nx + dx
      const my = ny + dy
      if (!diDalam(t, mx, my)) continue
      if (!bolehLangkah(t, nx, ny, mx, my)) continue
      if (terhalangTile(t, halangan, mx, my)) continue
      // Diagonal tidak boleh memotong sudut tebing maupun sudut bangunan.
      if (dx !== 0 && dy !== 0) {
        if (!bolehLangkah(t, nx, ny, nx + dx, ny)) continue
        if (!bolehLangkah(t, nx, ny, nx, ny + dy)) continue
        if (terhalangTile(t, halangan, nx + dx, ny)) continue
        if (terhalangTile(t, halangan, nx, ny + dy)) continue
      }
      const m = indeks(t, mx, my)
      if (sudah[m]) continue
      const gBaru = g[n]! + biaya
      if (gBaru >= g[m]!) continue
      g[m] = gBaru
      dariMana[m] = n
      antrean.dorong(m, gBaru + heuristik(mx, my, bx, by))
    }
  }

  if (dariMana[tujuan] === -1 && tujuan !== mulai) return null

  // Runut balik.
  const balik: number[] = []
  for (let n = tujuan; n !== -1 && n !== mulai; n = dariMana[n]!) balik.push(n)
  balik.reverse()
  if (balik.length === 0) return null

  const titik = balik.map((n) => {
    const tx = n % t.kolom
    const ty = (n - tx) / t.kolom
    return { x: keTengahPiksel(tx), y: keTengahPiksel(ty) }
  })
  // Titik terakhir pakai tujuan asli hanya jika tile tujuan bebas.
  const akhir = titik[titik.length - 1]
  if (akhir && tujuanBebasAsli) {
    akhir.x = kePxX
    akhir.y = kePxY
  }
  return { titik, ke: 0 }
}
