import { DUNIA_H, DUNIA_W, TILE, TINGGI, WARNA_TIM, type Tim } from '@hftf/shared'
import { pernahLihat, sekutu, terlihatDi, TICK_PER_FOG, type Dunia } from '@hftf/sim'
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
        const idx = ty * t.kolom + tx
        const v = t.tinggi[idx]!
        const bawahPlat = ty > 0 && v !== TINGGI.plateau && t.tinggi[(ty - 1) * t.kolom + tx] === TINGGI.plateau
        const bawahLaut = ty > 0 && v === TINGGI.air && t.tinggi[(ty - 1) * t.kolom + tx] !== TINGGI.air && (t.jembatan[(ty - 1) * t.kolom + tx] ?? 0) === 0
        c.fillStyle =
          (t.jembatan[idx] ?? 0) > 0 ? '#b87d45'
          : bawahLaut ? '#466c75'
          : v === TINGGI.air ? '#2b6a7a'
          : (t.ramp[idx] ?? 0) > 0 ? '#d4c387'
          : bawahPlat ? '#53737a'
          : (t.jalan?.[idx] ?? 0) === 1 ? '#cfb87c'
          : v === TINGGI.plateau ? '#86b562'
          : '#62964c'
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
      if (!sekutu(b.tim, timSaya, this.dunia) && !pernahLihat(this.dunia, timSaya, b.x, b.y)) continue
      ctx.fillStyle = WARNA_TIM[b.tim]?.utama ?? '#c9a227'
      const s = b.jenis === 'castle' ? 5 : 3
      ctx.fillRect(px(b.x) - s / 2, py(b.y) - s / 2, s, s)
    }
    for (const u of this.dunia.unit) {
      if (!sekutu(u.tim, timSaya, this.dunia) && !terlihatDi(this.dunia, timSaya, u.x, u.y)) continue
      ctx.fillStyle = WARNA_TIM[u.tim]?.terang ?? '#e0c24a'
      const s = u.hero ? 4 : 2
      ctx.fillRect(px(u.x) - s / 2, py(u.y) - s / 2, s, s)
    }
    for (const t of this.dunia.tambang) {
      if (!pernahLihat(this.dunia, timSaya, t.x, t.y)) continue
      ctx.fillStyle = '#ffd86b'
      ctx.fillRect(px(t.x) - 2, py(t.y) - 2, 4, 4)
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

    // Camp goblin tampil di ATAS fog (ala titik creep Warcraft III) agar lokasi Goblin jelas terlihat!
    for (const c of this.dunia.camp) {
      const hidup = c.respawn <= 0 && this.dunia.unit.some((u) => u.campId === c.id)
      const segeraKembali = !hidup && c.respawn > 0 && c.respawn < 10
      if (!hidup && !segeraKembali) continue
      const r = c.jenis === 'besar' ? 4.5 : 3.2
      ctx.fillStyle = c.jenis === 'besar' ? '#ff7b3a' : '#f2c14e'
      ctx.beginPath()
      ctx.arc(px(c.x), py(c.y), r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = segeraKembali ? '#ffffff' : '#2a1608'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }

    // Kotak kamera
    ctx.strokeStyle = WARNA_TIM[timSaya]?.terang ?? '#cfe9ff'
    ctx.lineWidth = 1.5
    ctx.strokeRect(
      px(kam.x), py(kam.y),
      px(kam.lebar / kam.zoom), py(kam.tinggi / kam.zoom),
    )
    void TILE
  }
}
