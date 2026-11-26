import { DUNIA_H, DUNIA_W, TILE, TINGGI, type Tim } from '@hftf/shared'
import { pernahLihat, terlihatDi, TICK_PER_FOG, type Dunia } from '@hftf/sim'
import type { Kamera } from './kamera.js'

/**
 * Minimap. Terrain dan lapisan fog-nya dicache di kanvas offscreen lalu di-blit
 * sekali per frame — menggambar 9.216 tile/fog tiap frame membuat FPS HP anjlok.
 */
export class Minimap {
  private latar: HTMLCanvasElement | null = null
  private fogKanvas: HTMLCanvasElement | null = null
  private fogCtx: CanvasRenderingContext2D | null = null
  private fogData: ImageData | null = null
  private slotFogTerakhir = -1
  private timFogTerakhir: Tim | null = null

  constructor(private dunia: Dunia) {}

  /** Dipanggil kalau terrain berubah (saat ini hanya sekali, saat mulai). */
  perbarui(): void {
    this.latar = null
  }

  /** Paksa rebuild tekstur fog minimap (mis. saat Guest menerima snapshot baru). */
  segarkanFog(): void {
    this.slotFogTerakhir = -1
  }

  private buatLatar(w: number, h: number): HTMLCanvasElement {
    const k = document.createElement('canvas')
    k.width = w
    k.height = h
    const c = k.getContext('2d', { alpha: false })
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

  gambar(
    ctx: CanvasRenderingContext2D, kam: Kamera, w: number, h: number, timSaya: Tim,
    fogBersama?: HTMLCanvasElement | null,
  ): void {
    if (!this.latar || this.latar.width !== w || this.latar.height !== h) {
      this.latar = this.buatLatar(w, h)
    }
    ctx.drawImage(this.latar, 0, 0)

    const px = (x: number): number => (x / DUNIA_W) * w
    const py = (y: number): number => (y / DUNIA_H) * h

    for (const b of this.dunia.bangunan) {
      if (b.fase === 'hancur') continue
      if (b.tim !== timSaya && !pernahLihat(this.dunia, timSaya, b.x, b.y)) continue
      ctx.fillStyle = b.tim === 'blue' ? '#5aa9ff' : b.tim === 'red' ? '#ff6a5a' : '#c9a227'
      const s = b.jenis === 'castle' ? 5 : 3
      ctx.fillRect(px(b.x) - s / 2, py(b.y) - s / 2, s, s)
    }
    for (const u of this.dunia.unit) {
      if (u.tim !== timSaya && !terlihatDi(this.dunia, timSaya, u.x, u.y)) continue
      ctx.fillStyle = u.tim === 'blue' ? '#9fd2ff' : u.tim === 'red' ? '#ffa89f' : '#e0c24a'
      const s = u.hero ? 4 : 2
      ctx.fillRect(px(u.x) - s / 2, py(u.y) - s / 2, s, s)
    }
    for (const t of this.dunia.tambang) {
      if (!pernahLihat(this.dunia, timSaya, t.x, t.y)) continue
      ctx.fillStyle = '#ffd86b'
      ctx.fillRect(px(t.x) - 2, py(t.y) - 2, 4, 4)
    }

    // Camp goblin: lingkaran peringatan, berkedip menjelang respawn (PRD §10.3).
    for (const c of this.dunia.camp) {
      const hidup = this.dunia.unit.some((u) => u.campId === c.id)
      const segeraKembali = !hidup && c.respawn > 0 && c.respawn < 10
      if (!hidup && !segeraKembali) continue
      ctx.strokeStyle = segeraKembali ? '#ffe08a' : '#c9a227'
      ctx.lineWidth = segeraKembali ? 2 : 1
      ctx.beginPath()
      ctx.arc(px(c.x), py(c.y), c.jenis === 'besar' ? 7 : 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Lapisan fog di minimap: pakai tekstur fogBersama dari LapisanFog (nol putImageData duplikat!)
    // atau fallback ke tekstur offscreen internal jika dipanggil mandiri.
    let sumberFog: HTMLCanvasElement | null = fogBersama ?? null
    if (!sumberFog) {
      const t2 = this.dunia.terrain
      if (!this.fogKanvas || this.fogKanvas.width !== t2.kolom || this.fogKanvas.height !== t2.baris) {
        this.fogKanvas = document.createElement('canvas')
        this.fogKanvas.width = t2.kolom
        this.fogKanvas.height = t2.baris
        this.fogCtx = this.fogKanvas.getContext('2d')
        this.fogData = this.fogCtx ? this.fogCtx.createImageData(t2.kolom, t2.baris) : null
        this.slotFogTerakhir = -1
      }
      const slotFog = Math.floor(this.dunia.tick / TICK_PER_FOG)
      if (this.fogCtx && this.fogData && (slotFog !== this.slotFogTerakhir || timSaya !== this.timFogTerakhir)) {
        this.slotFogTerakhir = slotFog
        this.timFogTerakhir = timSaya
        const fog = this.dunia.fog[timSaya]
        const pxFog = this.fogData.data
        const total = t2.kolom * t2.baris
        for (let i = 0; i < total; i++) {
          const o = i * 4
          pxFog[o] = 6
          pxFog[o + 1] = 8
          pxFog[o + 2] = 14
          pxFog[o + 3] = fog.kini[i] === 1 ? 0 : fog.pernah[i] === 1 ? 115 : 242
        }
        this.fogCtx.putImageData(this.fogData, 0, 0)
      }
      sumberFog = this.fogKanvas
    }
    if (sumberFog) {
      const halus = ctx.imageSmoothingEnabled
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(sumberFog, 0, 0, w, h)
      ctx.imageSmoothingEnabled = halus
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
