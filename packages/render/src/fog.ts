import { TILE, type Tim } from '@hftf/shared'
import { TICK_PER_FOG, type Dunia } from '@hftf/sim'
import { pandangan, type Kamera } from './kamera.js'

/**
 * Lapisan fog of war. Digambar ke kanvas seukuran GRID TILE (96x96 piksel)
 * lalu hanya potongan yang terlihat kamera yang diperbesar dengan penghalusan —
 * hemat bandwidth GPU di HP dan hanya diperbarui 4x/detik mengikuti TICK_PER_FOG.
 */
export class LapisanFog {
  private kanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private data: ImageData | null = null
  private slotTerakhir = -1
  private timTerakhir: Tim | null = null

  constructor(private kolom: number, private baris: number) {
    this.kanvas = document.createElement('canvas')
    this.kanvas.width = kolom
    this.kanvas.height = baris
    this.ctx = this.kanvas.getContext('2d')
    if (this.ctx) this.data = this.ctx.createImageData(kolom, baris)
  }

  /** Paksa rebuild tekstur fog segera (dipakai Guest setelah menerima snapshot). */
  kotor(): void {
    this.slotTerakhir = -1
  }

  gambar(ctx: CanvasRenderingContext2D, dunia: Dunia, tim: Tim, kam: Kamera): void {
    if (!this.ctx || !this.data) return

    // Grid fog di sim hanya berubah setiap TICK_PER_FOG (4x/detik), bukan 60x/detik.
    const slot = Math.floor(dunia.tick / TICK_PER_FOG)
    if (slot !== this.slotTerakhir || tim !== this.timTerakhir) {
      this.slotTerakhir = slot
      this.timTerakhir = tim
      const fog = dunia.fog[tim]
      const px = this.data.data
      const total = this.kolom * this.baris
      for (let i = 0; i < total; i++) {
        const o = i * 4
        px[o] = 6
        px[o + 1] = 8
        px[o + 2] = 14
        // Tiga tingkat (PRD §12.1): belum pernah / pernah / terlihat sekarang.
        px[o + 3] = fog.kini[i] === 1 ? 0 : fog.pernah[i] === 1 ? 140 : 255
      }
      this.ctx.putImageData(this.data, 0, 0)
    }

    // Hanya gambar potongan fog di dalam jendela kamera (hemat ~25x overdraw GPU di HP).
    const p = pandangan(kam, TILE * 2)
    const tx1 = Math.max(0, Math.floor(p.x1 / TILE))
    const ty1 = Math.max(0, Math.floor(p.y1 / TILE))
    const tx2 = Math.min(this.kolom, Math.ceil(p.x2 / TILE))
    const ty2 = Math.min(this.baris, Math.ceil(p.y2 / TILE))
    const sw = tx2 - tx1
    const sh = ty2 - ty1
    if (sw <= 0 || sh <= 0) return

    const halus = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(
      this.kanvas,
      tx1, ty1, sw, sh,
      tx1 * TILE, ty1 * TILE, sw * TILE, sh * TILE,
    )
    ctx.imageSmoothingEnabled = halus
  }
}
