import { DEKO, TERRAIN, frame, url } from '@hftf/aset'
import { TILE, TINGGI } from '@hftf/shared'
import type { Terrain } from '@hftf/sim'
import { BARIS_ELEV, GUGUS_FLAT, selAutotile } from './autotile.js'
import { gambarDari } from './gambar.js'
import type { Kamera } from './kamera.js'
import { pandangan } from './kamera.js'

/**
 * Terrain digambar per CHUNK ke canvas offscreen lalu di-blit.
 *
 * Peta 96x96 = 9.216 tile; menggambar tile satu per satu tiap frame membuat
 * peta sebesar ini tidak mungkin 60 fps. Chunk hanya digambar ulang kalau
 * datanya berubah.
 */
const TILE_PER_CHUNK = 16

/** Hash koordinat -> angka. Deterministik, jadi chunk selalu digambar sama. */
function cakar(x: number, y: number): number {
  let n = (x * 73856093) ^ (y * 19349663)
  n = (n ^ (n >>> 13)) >>> 0
  return (Math.imul(n, 1274126177) >>> 0) % 100000
}
const UKURAN_CHUNK = TILE_PER_CHUNK * TILE

interface Chunk {
  kanvas: HTMLCanvasElement
  bersih: boolean
}

export class PeremajaTerrain {
  private chunk = new Map<string, Chunk>()
  private kolomChunk: number
  private barisChunk: number

  constructor(private terrain: Terrain) {
    this.kolomChunk = Math.ceil(terrain.kolom / TILE_PER_CHUNK)
    this.barisChunk = Math.ceil(terrain.baris / TILE_PER_CHUNK)
  }

  /** Menandai seluruh chunk perlu digambar ulang (mis. setelah aset selesai dimuat). */
  kotorkanSemua(): void {
    for (const c of this.chunk.values()) c.bersih = false
  }

  gambar(ctx: CanvasRenderingContext2D, kam: Kamera, waktu: number): void {
    const p = pandangan(kam, UKURAN_CHUNK)
    const cx1 = Math.max(0, Math.floor(p.x1 / UKURAN_CHUNK))
    const cy1 = Math.max(0, Math.floor(p.y1 / UKURAN_CHUNK))
    const cx2 = Math.min(this.kolomChunk - 1, Math.floor(p.x2 / UKURAN_CHUNK))
    const cy2 = Math.min(this.barisChunk - 1, Math.floor(p.y2 / UKURAN_CHUNK))

    this.gambarAir(ctx, kam, waktu)

    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const c = this.chunkDi(cx, cy)
        ctx.drawImage(c.kanvas, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK)
      }
    }
  }

  /** Air sebagai pola berulang + busa beranimasi di tepi pandangan. */
  private gambarAir(ctx: CanvasRenderingContext2D, kam: Kamera, waktu: number): void {
    const air = gambarDari(TERRAIN.air)
    const p = pandangan(kam)
    if (air) {
      const pola = ctx.createPattern(air, 'repeat')
      if (pola) {
        ctx.fillStyle = pola
        ctx.fillRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
        return
      }
    }
    ctx.fillStyle = '#3d7a8c'
    ctx.fillRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
    void waktu
  }

  private chunkDi(cx: number, cy: number): Chunk {
    const kunci = `${cx},${cy}`
    let c = this.chunk.get(kunci)
    if (!c) {
      const kanvas = document.createElement('canvas')
      kanvas.width = UKURAN_CHUNK
      kanvas.height = UKURAN_CHUNK
      c = { kanvas, bersih: false }
      this.chunk.set(kunci, c)
    }
    if (!c.bersih) {
      this.gambarChunk(c, cx, cy)
      c.bersih = true
    }
    return c
  }

  private gambarChunk(c: Chunk, cx: number, cy: number): void {
    const ctx = c.kanvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, UKURAN_CHUNK, UKURAN_CHUNK)

    const t = this.terrain
    const datar = gambarDari(TERRAIN.tanahDatar)
    const tinggi = gambarDari(TERRAIN.tanahTinggi)
    const tx0 = cx * TILE_PER_CHUNK
    const ty0 = cy * TILE_PER_CHUNK

    const h = (tx: number, ty: number): number => {
      if (tx < 0 || ty < 0 || tx >= t.kolom || ty >= t.baris) return TINGGI.air
      return t.tinggi[ty * t.kolom + tx]!
    }
    const ramp = (tx: number, ty: number): boolean =>
      tx >= 0 && ty >= 0 && tx < t.kolom && ty < t.baris && t.ramp[ty * t.kolom + tx] === 1

    // 1. Lapisan tanah: semua tile bukan air memakai autotile rumput.
    if (datar) {
      for (let dy = 0; dy < TILE_PER_CHUNK; dy++) {
        for (let dx = 0; dx < TILE_PER_CHUNK; dx++) {
          const tx = tx0 + dx
          const ty = ty0 + dy
          if (h(tx, ty) === TINGGI.air) continue
          const darat = (a: number, b: number): boolean => h(a, b) !== TINGGI.air
          const { kol, bar } = selAutotile(darat(tx - 1, ty), darat(tx + 1, ty), darat(tx, ty - 1), darat(tx, ty + 1))
          ctx.drawImage(
            datar,
            (GUGUS_FLAT.rumput + kol) * TILE, bar * TILE, TILE, TILE,
            dx * TILE, dy * TILE, TILE, TILE,
          )
        }
      }
    }

    // 2. Lapisan plateau + muka tebing + anak tangga ramp.
    if (tinggi) {
      for (let dy = 0; dy < TILE_PER_CHUNK; dy++) {
        for (let dx = 0; dx < TILE_PER_CHUNK; dx++) {
          const tx = tx0 + dx
          const ty = ty0 + dy
          if (h(tx, ty) !== TINGGI.plateau) continue

          if (ramp(tx, ty)) {
            const { kol } = selAutotile(ramp(tx - 1, ty), ramp(tx + 1, ty), true, true)
            ctx.drawImage(tinggi, kol * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, dx * TILE, dy * TILE, TILE, TILE)
            continue
          }

          const atas = (a: number, b: number): boolean => h(a, b) === TINGGI.plateau
          const { kol, bar } = selAutotile(atas(tx - 1, ty), atas(tx + 1, ty), atas(tx, ty - 1), atas(tx, ty + 1))
          const barPermukaan = Math.min(bar, BARIS_ELEV.permukaanBawah)
          ctx.drawImage(tinggi, kol * TILE, barPermukaan * TILE, TILE, TILE, dx * TILE, dy * TILE, TILE, TILE)

          // Muka tebing menggantung di bawah tepi bawah plateau.
          if (!atas(tx, ty + 1)) {
            ctx.drawImage(
              tinggi, kol * TILE, BARIS_ELEV.tebing * TILE, TILE, TILE,
              dx * TILE, (dy + 1) * TILE, TILE, TILE,
            )
          }
        }
      }
    }

    // 3. Dekorasi: rumput, batu, semak. Ditaruh deterministik dari koordinat
    //    tile supaya chunk yang digambar ulang selalu sama persis.
    for (let dy = 0; dy < TILE_PER_CHUNK; dy++) {
      for (let dx = 0; dx < TILE_PER_CHUNK; dx++) {
        const tx = tx0 + dx
        const ty = ty0 + dy
        if (h(tx, ty) === TINGGI.air || ramp(tx, ty)) continue
        const acak = cakar(tx, ty)
        if (acak % 11 !== 0) continue
        const nomor = String((acak >> 4) % 15 + 1).padStart(2, '0')
        const deko = DEKO[`deco${nomor}`]
        if (!deko) continue
        const im = gambarDari(deko)
        if (!im) continue
        const f = frame(deko, 0)
        ctx.drawImage(
          im, f.sx, f.sy, f.sw, f.sh,
          dx * TILE, dy * TILE + TILE - f.sh, f.sw, f.sh,
        )
      }
    }
    void url
  }
}
