import { TILE, type Tim } from '@hftf/shared'
import type { Dunia } from '@hftf/sim'
import type { Kamera } from './kamera.js'

/**
 * Lapisan fog of war. Digambar ke kanvas seukuran GRID TILE (96x96 piksel)
 * lalu diperbesar dengan penghalusan — jadi tepinya lembut tanpa harus
 * menggambar 9.216 kotak tiap frame.
 */
export class LapisanFog {
  private kanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private data: ImageData | null = null
  private tickTerakhir = -1

  constructor(private kolom: number, private baris: number) {
    this.kanvas = document.createElement('canvas')
    this.kanvas.width = kolom
    this.kanvas.height = baris
    this.ctx = this.kanvas.getContext('2d')
    if (this.ctx) this.data = this.ctx.createImageData(kolom, baris)
  }

  gambar(ctx: CanvasRenderingContext2D, dunia: Dunia, tim: Tim, kam: Kamera): void {
    if (!this.ctx || !this.data) return

    // Grid fog hanya berubah 4x/detik; tidak perlu dibangun ulang tiap frame.
    if (dunia.tick !== this.tickTerakhir) {
      this.tickTerakhir = dunia.tick
      const fog = dunia.fog[tim]
      const px = this.data.data
      for (let i = 0; i < this.kolom * this.baris; i++) {
        const o = i * 4
        px[o] = 6
        px[o + 1] = 8
        px[o + 2] = 14
        // Tiga tingkat (PRD §12.1): belum pernah / pernah / terlihat sekarang.
        px[o + 3] = fog.kini[i] === 1 ? 0 : fog.pernah[i] === 1 ? 140 : 255
      }
      this.ctx.putImageData(this.data, 0, 0)
    }

    const halus = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.kanvas, 0, 0, this.kolom * TILE, this.baris * TILE)
    ctx.imageSmoothingEnabled = halus
    void kam
  }
}
