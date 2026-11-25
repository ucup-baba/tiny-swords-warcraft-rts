import { EFEK, frame } from '@hftf/aset'
import type { Dunia, Kejadian } from '@hftf/sim'
import { gambarDari } from './gambar.js'

/**
 * Efek sekali-jalan (ledakan, percikan) yang dipicu oleh KEJADIAN dari sim.
 *
 * Sim tidak boleh tahu soal partikel; ia hanya memancarkan data kejadian, dan
 * lapisan ini yang menerjemahkannya jadi gambar.
 */
interface Partikel {
  x: number
  y: number
  umur: number
  skala: number
}

export class Efek {
  private ledakan: Partikel[] = []
  private getaran = { sisa: 0, kuat: 0 }

  /** Membaca kejadian satu langkah sim. Dipanggil sekali per frame. */
  serap(kejadian: readonly Kejadian[]): void {
    for (const k of kejadian) {
      if (k.jenis === 'bangunanHancur') {
        this.ledakan.push({ x: k.x, y: k.y - 40, umur: 0, skala: 1.4 })
        this.guncang(10, 0.3)
      } else if (k.jenis === 'skillHero') {
        this.ledakan.push({ x: k.x, y: k.y - 20, umur: 0, skala: k.radius / 140 })
        this.guncang(5, 0.18)
      }
    }
  }

  guncang(kuat: number, detik: number): void {
    this.getaran.kuat = Math.max(this.getaran.kuat, kuat)
    this.getaran.sisa = Math.max(this.getaran.sisa, detik)
  }

  /** Geseran kamera akibat getaran; dipakai sebelum transform dunia. */
  geser(dt: number): { x: number; y: number } {
    if (this.getaran.sisa <= 0) return { x: 0, y: 0 }
    this.getaran.sisa -= dt
    const k = this.getaran.kuat * Math.max(0, this.getaran.sisa / 0.3)
    return { x: (Math.random() - 0.5) * k, y: (Math.random() - 0.5) * k }
  }

  langkah(dt: number): void {
    for (let i = this.ledakan.length - 1; i >= 0; i--) {
      const p = this.ledakan[i]!
      p.umur += dt
      if (p.umur > EFEK.ledakan.kolom / EFEK.ledakan.fps) this.ledakan.splice(i, 1)
    }
  }

  gambar(ctx: CanvasRenderingContext2D): void {
    const im = gambarDari(EFEK.ledakan)
    if (!im) return
    for (const p of this.ledakan) {
      const i = Math.floor(p.umur * EFEK.ledakan.fps)
      if (i >= EFEK.ledakan.kolom) continue
      const f = frame(EFEK.ledakan, i)
      const w = f.sw * p.skala
      const h = f.sh * p.skala
      ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, p.x - w / 2, p.y - h / 2, w, h)
    }
  }

  void(dunia: Dunia): void {
    void dunia
  }
}
