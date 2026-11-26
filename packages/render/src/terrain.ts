import { DEKO, TERRAIN, frame, url, type Aset } from '@hftf/aset'
import { TILE, TINGGI } from '@hftf/shared'
import type { Terrain } from '@hftf/sim'
import { BARIS_ELEV, GUGUS_FLAT, selAutotile } from './autotile.js'
import { gambarDari } from './gambar.js'
import type { Kamera } from './kamera.js'
import { pandangan } from './kamera.js'

const TILE_PER_CHUNK = 8
const UKURAN_CHUNK = TILE_PER_CHUNK * TILE
const MAKS_CHUNK = 20
/** Batas chunk baru yang dipanggang per frame agar geser kamera cepat tetap 60 FPS mulus. */
const MAKS_BAKE_PER_FRAME = 1

/** Hash koordinat -> angka. Deterministik, jadi dekorasi selalu sama persis. */
function cakar(x: number, y: number): number {
  let n = (x * 73856093) ^ (y * 19349663)
  n = (n ^ (n >>> 13)) >>> 0
  return (Math.imul(n, 1274126177) >>> 0) % 100000
}

const DAFTAR_DEKO: readonly (Aset | undefined)[] = Array.from({ length: 15 }, (_, i) =>
  DEKO[`deco${String(i + 1).padStart(2, '0')}`],
)

interface Chunk {
  kanvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
  bersih: boolean
  pakaiKe: number
}

/**
 * Perender terrain hibrida (Chunk 512x512 buram + budget panggang 1 chunk/frame):
 * - Saat normal: hanya 4–6 drawImage chunk buram (~0.2 ms, 60 FPS terkunci di HP).
 * - Saat geser kamera cepat: paling banyak 1 chunk dipanggang per frame (nol freeze);
 *   chunk sisanya digambar langsung untuk 1 frame dari tabel autotile datar lalu menyusul.
 * - Pool LRU maks 20 chunk (~20 MB VRAM) agar Chrome Android tidak pernah turun ke software.
 */
export class PeremajaTerrain {
  private readonly kolom: number
  private readonly baris: number
  private readonly kolomChunk: number
  private readonly barisChunk: number
  private readonly butuhAir: Uint8Array
  private readonly flatSx: Int16Array
  private readonly flatSy: Int16Array
  private readonly elevSx: Int16Array
  private readonly elevSy: Int16Array
  private readonly tebingSx: Int16Array
  private readonly jembatanSx: Int16Array
  private readonly jembatanSy: Int16Array
  /** Bit posisi melintang jembatan 3-tile: 0=top/kiri tepi, 1=tengah tak bertepi, 2=bawah/kanan tepi, 3=1-tile penuh. */
  private readonly jembatanSisi: Int8Array
  private readonly dekoIdx: Int8Array
  private readonly chunk = new Map<string, Chunk>()
  private urutanPakai = 0

  constructor(private terrain: Terrain) {
    this.kolom = terrain.kolom
    this.baris = terrain.baris
    this.kolomChunk = Math.ceil(this.kolom / TILE_PER_CHUNK)
    this.barisChunk = Math.ceil(this.baris / TILE_PER_CHUNK)
    const total = this.kolom * this.baris
    this.butuhAir = new Uint8Array(total)
    this.flatSx = new Int16Array(total).fill(-1)
    this.flatSy = new Int16Array(total).fill(-1)
    this.elevSx = new Int16Array(total).fill(-1)
    this.elevSy = new Int16Array(total).fill(-1)
    this.tebingSx = new Int16Array(total).fill(-1)
    this.jembatanSx = new Int16Array(total).fill(-1)
    this.jembatanSy = new Int16Array(total).fill(-1)
    this.jembatanSisi = new Int8Array(total).fill(-1)
    this.dekoIdx = new Int8Array(total).fill(-1)
    this.bangunTabel()
  }

  /** Membangun ulang tabel autotile & menandai seluruh chunk perlu dipanggang ulang. */
  kotorkanSemua(): void {
    this.bangunTabel()
    for (const c of this.chunk.values()) c.bersih = false
  }

  private bangunTabel(): void {
    const t = this.terrain
    const kol = this.kolom
    const bar = this.baris
    const h = (tx: number, ty: number): number => {
      if (tx < 0 || ty < 0 || tx >= kol || ty >= bar) return TINGGI.air
      return t.tinggi[ty * kol + tx]!
    }
    const ramp = (tx: number, ty: number): boolean =>
      tx >= 0 && ty >= 0 && tx < kol && ty < bar && t.ramp[ty * kol + tx] === 1
    const jemb = (tx: number, ty: number): number =>
      tx >= 0 && ty >= 0 && tx < kol && ty < bar ? (t.jembatan[ty * kol + tx] ?? 0) : 0
    // Jembatan berdiri di atas air, jadi rumput tepi tetap berbingkai pantai alami.
    const darat = (tx: number, ty: number): boolean => h(tx, ty) !== TINGGI.air && jemb(tx, ty) === 0
    const atas = (tx: number, ty: number): boolean => h(tx, ty) === TINGGI.plateau

    this.butuhAir.fill(0)
    this.flatSx.fill(-1)
    this.flatSy.fill(-1)
    this.elevSx.fill(-1)
    this.elevSy.fill(-1)
    this.tebingSx.fill(-1)
    this.jembatanSx.fill(-1)
    this.jembatanSy.fill(-1)
    this.jembatanSisi.fill(-1)
    this.dekoIdx.fill(-1)

    for (let ty = 0; ty < bar; ty++) {
      const barisOff = ty * kol
      for (let tx = 0; tx < kol; tx++) {
        const i = barisOff + tx
        const hv = h(tx, ty)
        const jv = jemb(tx, ty)
        if (hv === TINGGI.air) {
          this.butuhAir[i] = 1
          continue
        }
        if (jv > 0) {
          this.butuhAir[i] = 1
          if (jv === 1) {
            const kiri = jemb(tx - 1, ty) === 1
            const kanan = jemb(tx + 1, ty) === 1
            this.jembatanSx[i] = (!kiri ? 0 : !kanan ? 2 : 1) * TILE
            this.jembatanSy[i] = 0
            const atasJ = jemb(tx, ty - 1) === 1
            const bawahJ = jemb(tx, ty + 1) === 1
            this.jembatanSisi[i] = !atasJ && !bawahJ ? 3 : !atasJ ? 0 : !bawahJ ? 2 : 1
          } else {
            const atasJ = jemb(tx, ty - 1) === 2
            const bawahJ = jemb(tx, ty + 1) === 2
            this.jembatanSx[i] = 0
            this.jembatanSy[i] = (!atasJ ? 1 : !bawahJ ? 3 : 2) * TILE
            const kiri = jemb(tx - 1, ty) === 2
            const kanan = jemb(tx + 1, ty) === 2
            this.jembatanSisi[i] = !kiri && !kanan ? 3 : !kiri ? 0 : !kanan ? 2 : 1
          }
          continue
        }

        // 1. Rumput datar (tepi pantai butuh latar air di bawah sudut bulatnya).
        const sel = selAutotile(darat(tx - 1, ty), darat(tx + 1, ty), darat(tx, ty - 1), darat(tx, ty + 1))
        this.flatSx[i] = (GUGUS_FLAT.rumput + sel.kol) * TILE
        this.flatSy[i] = sel.bar * TILE
        if (sel.kol !== 1 || sel.bar !== 1) this.butuhAir[i] = 1

        // 2. Plateau / ramp + muka tebing jatuh ke tile (tx, ty + 1).
        if (hv === TINGGI.plateau) {
          if (ramp(tx, ty)) {
            const sr = selAutotile(ramp(tx - 1, ty), ramp(tx + 1, ty), true, true)
            this.elevSx[i] = sr.kol * TILE
            this.elevSy[i] = BARIS_ELEV.ramp * TILE
          } else {
            const sp = selAutotile(atas(tx - 1, ty), atas(tx + 1, ty), atas(tx, ty - 1), atas(tx, ty + 1))
            this.elevSx[i] = sp.kol * TILE
            this.elevSy[i] = Math.min(sp.bar, BARIS_ELEV.permukaanBawah) * TILE
            if (!atas(tx, ty + 1) && ty + 1 < bar) {
              this.tebingSx[(ty + 1) * kol + tx] = sp.kol * TILE
            }
          }
        }

        // 3. Dekorasi deterministik.
        if (!ramp(tx, ty)) {
          const acak = cakar(tx, ty)
          if (acak % 11 === 0) this.dekoIdx[i] = (acak >> 4) % 15
        }
      }
    }
  }

  gambar(ctx: CanvasRenderingContext2D, kam: Kamera, waktu: number): void {
    const p = pandangan(kam, TILE)
    const cx1 = Math.max(0, Math.floor(p.x1 / UKURAN_CHUNK))
    const cy1 = Math.max(0, Math.floor(p.y1 / UKURAN_CHUNK))
    const cx2 = Math.min(this.kolomChunk - 1, Math.floor(p.x2 / UKURAN_CHUNK))
    const cy2 = Math.min(this.barisChunk - 1, Math.floor(p.y2 / UKURAN_CHUNK))

    this.urutanPakai++
    let jumlahBake = 0
    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const kunci = `${cx},${cy}`
        const ada = this.chunk.get(kunci)
        if (ada && ada.bersih) {
          ada.pakaiKe = this.urutanPakai
          ctx.drawImage(ada.kanvas, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK)
          continue
        }
        // Saat geser cepat, panggang maksimal 1 chunk/frame; sisanya gambar langsung 1 frame.
        if (jumlahBake < MAKS_BAKE_PER_FRAME) {
          const c = this.ambilAtauDaurChunk(kunci)
          this.gambarRentangTile(c.ctx!, cx * TILE_PER_CHUNK, cy * TILE_PER_CHUNK, 0, 0)
          c.bersih = true
          c.pakaiKe = this.urutanPakai
          ctx.drawImage(c.kanvas, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK)
          jumlahBake++
        } else {
          this.gambarRentangTile(ctx, cx * TILE_PER_CHUNK, cy * TILE_PER_CHUNK, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK)
        }
      }
    }
    void url
    void waktu
  }

  private ambilAtauDaurChunk(kunci: string): Chunk {
    let c = this.chunk.get(kunci)
    if (c) return c
    if (this.chunk.size >= MAKS_CHUNK) {
      let kunciLama = ''
      let pakaiMin = Infinity
      let daur: Chunk | null = null
      for (const [k, item] of this.chunk) {
        if (item.pakaiKe < pakaiMin) {
          pakaiMin = item.pakaiKe
          kunciLama = k
          daur = item
        }
      }
      if (daur && kunciLama) {
        this.chunk.delete(kunciLama)
        daur.bersih = false
        c = daur
      }
    }
    if (!c) {
      const kanvas = document.createElement('canvas')
      kanvas.width = UKURAN_CHUNK
      kanvas.height = UKURAN_CHUNK
      c = {
        kanvas,
        ctx: kanvas.getContext('2d', { alpha: false }),
        bersih: false,
        pakaiKe: this.urutanPakai,
      }
    }
    this.chunk.set(kunci, c)
    return c
  }

  private gambarRentangTile(
    ctx: CanvasRenderingContext2D, tx0: number, ty0: number, asalPxX: number, asalPxY: number,
  ): void {
    ctx.imageSmoothingEnabled = false
    const kol = this.kolom
    const tx2 = Math.min(this.kolom - 1, tx0 + TILE_PER_CHUNK - 1)
    const ty2 = Math.min(this.baris - 1, ty0 + TILE_PER_CHUNK - 1)
    const air = gambarDari(TERRAIN.air)
    const datar = gambarDari(TERRAIN.tanahDatar)
    const tinggi = gambarDari(TERRAIN.tanahTinggi)

    // Pass 0: Air hanya di tile air / tepi pantai.
    if (air) {
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          if (this.butuhAir[off + tx] === 1) {
            ctx.drawImage(air, 0, 0, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
          }
        }
      }
    } else {
      ctx.fillStyle = '#3d7a8c'
      ctx.fillRect(asalPxX, asalPxY, UKURAN_CHUNK, UKURAN_CHUNK)
    }

    // Pass 1: Rumput datar.
    if (datar) {
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          const sx = this.flatSx[off + tx]!
          if (sx >= 0) {
            ctx.drawImage(datar, sx, this.flatSy[off + tx]!, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
          }
        }
      }
    }

    // Pass 1.5: Jembatan kayu utuh 1-dek lebar di atas kanal air (nol sekat hitam tengah).
    const jembIm = gambarDari(TERRAIN.jembatan)
    if (jembIm) {
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          const i = off + tx
          const jsx = this.jembatanSx[i]!
          if (jsx < 0) continue
          const jsy = this.jembatanSy[i]!
          const px = asalPxX + (tx - tx0) * TILE
          const sisi = this.jembatanSisi[i]!
          const horiz = jsy === 0
          if (sisi === 3) {
            ctx.drawImage(jembIm, jsx, jsy, TILE, TILE, px, py, TILE, TILE)
          } else if (horiz) {
            if (sisi === 0) {
              ctx.drawImage(jembIm, jsx, jsy, TILE, 48, px, py, TILE, 48)
              ctx.drawImage(jembIm, jsx, jsy + 16, TILE, 16, px, py + 48, TILE, 16)
            } else if (sisi === 1) {
              ctx.drawImage(jembIm, jsx, jsy + 16, TILE, 32, px, py, TILE, 32)
              ctx.drawImage(jembIm, jsx, jsy + 16, TILE, 32, px, py + 32, TILE, 32)
            } else {
              ctx.drawImage(jembIm, jsx, jsy + 16, TILE, 16, px, py, TILE, 16)
              ctx.drawImage(jembIm, jsx, jsy + 16, TILE, 48, px, py + 16, TILE, 48)
            }
          } else {
            if (sisi === 0) {
              ctx.drawImage(jembIm, jsx, jsy, 48, TILE, px, py, 48, TILE)
              ctx.drawImage(jembIm, jsx + 16, jsy, 16, TILE, px + 48, py, 16, TILE)
            } else if (sisi === 1) {
              ctx.drawImage(jembIm, jsx + 16, jsy, 32, TILE, px, py, 32, TILE)
              ctx.drawImage(jembIm, jsx + 16, jsy, 32, TILE, px + 32, py, 32, TILE)
            } else {
              ctx.drawImage(jembIm, jsx + 16, jsy, 16, TILE, px, py, 16, TILE)
              ctx.drawImage(jembIm, jsx + 16, jsy, 48, TILE, px + 16, py, 48, TILE)
            }
          }
        }
      }
    }

    // Pass 2: Plateau, ramp, & muka tebing.
    if (tinggi) {
      const tebingSy = BARIS_ELEV.tebing * TILE
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          const i = off + tx
          const tsx = this.tebingSx[i]!
          if (tsx >= 0) ctx.drawImage(tinggi, tsx, tebingSy, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
          const esx = this.elevSx[i]!
          if (esx >= 0) ctx.drawImage(tinggi, esx, this.elevSy[i]!, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
        }
      }
    }

    // Pass 3: Dekorasi rumput/batu/semak.
    for (let ty = ty0; ty <= ty2; ty++) {
      const off = ty * kol
      const py = asalPxY + (ty - ty0) * TILE
      for (let tx = tx0; tx <= tx2; tx++) {
        const dIdx = this.dekoIdx[off + tx]!
        if (dIdx < 0) continue
        const deko = DAFTAR_DEKO[dIdx]
        if (!deko) continue
        const im = gambarDari(deko)
        if (!im) continue
        const f = frame(deko, 0)
        ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, asalPxX + (tx - tx0) * TILE, py + TILE - f.sh, f.sw, f.sh)
      }
    }
  }
}
