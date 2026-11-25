import { DUNIA_H, DUNIA_W, TILE, TINGGI, type Tim } from '@hftf/shared'
import type { Dunia } from '@hftf/sim'
import type { Kamera } from './kamera.js'

/**
 * Minimap. Terrain-nya digambar SEKALI ke kanvas offscreen lalu di-blit tiap
 * frame; hanya unit & bangunan yang digambar ulang. Menggambar 9.216 tile tiap
 * frame di minimap sama mahalnya dengan menggambar petanya dua kali.
 */
export class Minimap {
  private latar: HTMLCanvasElement | null = null

  constructor(private dunia: Dunia) {}

  /** Dipanggil kalau terrain berubah (saat ini hanya sekali, saat mulai). */
  perbarui(): void {
    this.latar = null
  }

  private buatLatar(w: number, h: number): HTMLCanvasElement {
    const k = document.createElement('canvas')
    k.width = w
    k.height = h
    const c = k.getContext('2d')
    if (!c) return k

    const t = this.dunia.terrain
    const sx = w / t.kolom
    const sy = h / t.baris
    for (let ty = 0; ty < t.baris; ty++) {
      for (let tx = 0; tx < t.kolom; tx++) {
        const v = t.tinggi[ty * t.kolom + tx]!
        c.fillStyle =
          v === TINGGI.air ? '#2f5f6e'
          : t.ramp[ty * t.kolom + tx] === 1 ? '#9c8f63'
          : v === TINGGI.plateau ? '#7f9e86'
          : '#5f8a4e'
        c.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy))
      }
    }
    return k
  }

  gambar(ctx: CanvasRenderingContext2D, kam: Kamera, w: number, h: number, timSaya: Tim): void {
    if (!this.latar || this.latar.width !== w || this.latar.height !== h) {
      this.latar = this.buatLatar(w, h)
    }
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.latar, 0, 0)

    const px = (x: number): number => (x / DUNIA_W) * w
    const py = (y: number): number => (y / DUNIA_H) * h

    for (const b of this.dunia.bangunan) {
      if (b.fase === 'hancur') continue
      ctx.fillStyle = b.tim === 'blue' ? '#5aa9ff' : b.tim === 'red' ? '#ff6a5a' : '#c9a227'
      const s = b.jenis === 'castle' ? 5 : 3
      ctx.fillRect(px(b.x) - s / 2, py(b.y) - s / 2, s, s)
    }
    for (const u of this.dunia.unit) {
      ctx.fillStyle = u.tim === 'blue' ? '#9fd2ff' : u.tim === 'red' ? '#ffa89f' : '#e0c24a'
      const s = u.hero ? 4 : 2
      ctx.fillRect(px(u.x) - s / 2, py(u.y) - s / 2, s, s)
    }
    for (const t of this.dunia.tambang) {
      ctx.fillStyle = '#ffd86b'
      ctx.fillRect(px(t.x) - 2, py(t.y) - 2, 4, 4)
    }

    // Kotak kamera
    ctx.strokeStyle = timSaya === 'blue' ? '#cfe9ff' : '#ffd7cf'
    ctx.lineWidth = 1.5
    ctx.strokeRect(
      px(kam.x), py(kam.y),
      px(kam.lebar / kam.zoom), py(kam.tinggi / kam.zoom),
    )
    void TILE
  }
}
