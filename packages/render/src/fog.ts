import { TILE, type Tim } from '@hftf/shared'
import { TICK_PER_FOG, type Dunia } from '@hftf/sim'
import { pandangan, type Kamera } from './kamera.js'

/**
 * Lapisan fog of war. Digambar ke kanvas seukuran GRID TILE (96x96 piksel)
 * lalu hanya potongan yang terlihat kamera yang diperbesar dengan penghalusan —
 * hemat bandwidth GPU di HP dan hanya diperbarui 4x/detik mengikuti TICK_PER_FOG.
 */
export class LapisanFog {
  readonly kanvas: HTMLCanvasElement
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

    // Di peta utama, gambar fog dengan penggabungan rentang horizontal (RLE fillRect):
    // - Nol overdraw di tile terlihat (kini === 1) tempat markas & pasukan berada
    // - Nol scaling bilinear 64x penuh layar yang menyedot GPU HP Android (-4.5ms -> ~0.15ms!)
    // - Tekstur 96x96 `this.kanvas` di atas tetap dipakai ulang oleh Minimap.
    const p = pandangan(kam, TILE)
    const tx1 = Math.max(0, Math.floor(p.x1 / TILE))
    const ty1 = Math.max(0, Math.floor(p.y1 / TILE))
    const tx2 = Math.min(this.kolom, Math.ceil(p.x2 / TILE))
    const ty2 = Math.min(this.baris, Math.ceil(p.y2 / TILE))
    if (tx2 <= tx1 || ty2 <= ty1) return

    const { kini, pernah } = dunia.fog[tim]
    const kol = this.kolom

    // Pass 1: Wilayah belum pernah dilihat (hitam pekat buram, tanpa alpha-blend).
    ctx.fillStyle = '#06080e'
    for (let ty = ty1; ty < ty2; ty++) {
      const off = ty * kol
      const py = ty * TILE
      let tx = tx1
      while (tx < tx2) {
        if (kini[off + tx] === 1 || pernah[off + tx] === 1) { tx++; continue }
        const awal = tx
        while (tx < tx2 && kini[off + tx] !== 1 && pernah[off + tx] !== 1) tx++
        ctx.fillRect(awal * TILE, py, (tx - awal) * TILE, TILE)
      }
    }

    // Pass 2: Wilayah pernah dilihat tapi sedang gelap (setengah transparan).
    ctx.fillStyle = 'rgba(6,8,14,0.54)'
    for (let ty = ty1; ty < ty2; ty++) {
      const off = ty * kol
      const py = ty * TILE
      let tx = tx1
      while (tx < tx2) {
        if (kini[off + tx] === 1 || pernah[off + tx] !== 1) { tx++; continue }
        const awal = tx
        while (tx < tx2 && kini[off + tx] !== 1 && pernah[off + tx] === 1) tx++
        ctx.fillRect(awal * TILE, py, (tx - awal) * TILE, TILE)
      }
    }
  }
}
