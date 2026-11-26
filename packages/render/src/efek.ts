import { EFEK, frame, type Aset } from '@hftf/aset'
import type { Tim } from '@hftf/shared'
import type { Dunia, Kejadian } from '@hftf/sim'
import { gambarDari } from './gambar.js'

/**
 * Efek sekali-jalan (ledakan, nisan mati, bendera perintah, angka HP melayang)
 * yang dipicu oleh KEJADIAN dari sim atau input lokal.
 *
 * Sim tidak tahu apa pun soal partikel; ia hanya memancarkan data kejadian,
 * dan lapisan ini yang menerjemahkannya jadi gambar.
 */
interface Partikel {
  aset: Aset
  fps: number
  totalFrame: number
  x: number
  y: number
  umur: number
  skala: number
}

interface TeksMelayang {
  x: number
  y: number
  teks: string
  warna: string
  umur: number
  durasi: number
  ukuran: number
}

interface BenderaPerintah {
  x: number
  y: number
  jenis: 'pindah' | 'serang' | 'rally'
  umur: number
  durasi: number
}

export class Efek {
  private partikel: Partikel[] = []
  private teks: TeksMelayang[] = []
  private bendera: BenderaPerintah[] = []
  private getaran = { sisa: 0, kuat: 0 }

  /** Menancapkan bendera penanda perintah sementara di tanah saat klik kanan. */
  tandaiPerintah(x: number, y: number, jenis: 'pindah' | 'serang' | 'rally'): void {
    this.bendera.push({ x, y, jenis, umur: 0, durasi: 1.15 })
    if (this.bendera.length > 16) this.bendera.shift()
  }

  /** Membaca kejadian satu langkah sim. Dipanggil sekali per frame. */
  serap(kejadian: readonly Kejadian[], timSaya: Tim = 'blue'): void {
    for (const k of kejadian) {
      if (k.jenis === 'bangunanHancur') {
        this.partikel.push({
          aset: EFEK.ledakan, fps: EFEK.ledakan.fps, totalFrame: EFEK.ledakan.kolom,
          x: k.x, y: k.y - 40, umur: 0, skala: 1.4,
        })
        this.guncang(10, 0.3)
      } else if (k.jenis === 'skillHero') {
        this.partikel.push({
          aset: EFEK.ledakan, fps: EFEK.ledakan.fps, totalFrame: EFEK.ledakan.kolom,
          x: k.x, y: k.y - 20, umur: 0, skala: k.radius / 140,
        })
        this.guncang(5, 0.18)
      } else if (k.jenis === 'unitMati') {
        this.partikel.push({
          aset: EFEK.nisan, fps: 12, totalFrame: EFEK.nisan.kolom * EFEK.nisan.baris,
          x: k.x, y: k.y - 10, umur: 0, skala: 0.85,
        })
      } else if (k.jenis === 'unitLuka' || k.jenis === 'bangunanLuka') {
        const acakX = ((k.id * 17 + k.jumlah * 7) % 19) - 9
        const warna = k.tim === timSaya ? '#ff6b6b' : '#ffd86b'
        this.tambahTeks(k.x + acakX, k.y - (k.jenis === 'bangunanLuka' ? 76 : 54), `-${k.jumlah}`, warna, 0.85, 15)
      } else if (k.jenis === 'unitSembuh') {
        this.tambahTeks(k.x, k.y - 58, `+${k.jumlah}`, '#6ff088', 0.95, 15)
      } else if (k.jenis === 'sumberDayaMasuk' && k.tim === timSaya) {
        const huruf = k.jenis2 === 'gold' ? 'g' : k.jenis2 === 'kayu' ? 'k' : 'd'
        const warna = k.jenis2 === 'gold' ? '#ffd86b' : k.jenis2 === 'kayu' ? '#c8a978' : '#ff9090'
        this.tambahTeks(k.x, k.y - 60, `+${Math.round(k.jumlah)}${huruf}`, warna, 1.05, 15)
      } else if (k.jenis === 'heroNaikLevel' && k.tim === timSaya) {
        this.tambahTeks(0, 0, '', '#ffd86b', 0, 0) // no-op guard
      }
    }
  }

  private tambahTeks(x: number, y: number, teks: string, warna: string, durasi: number, ukuran: number): void {
    if (!teks || durasi <= 0) return
    this.teks.push({ x, y, teks, warna, umur: 0, durasi, ukuran })
    if (this.teks.length > 80) this.teks.shift()
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
    for (let i = this.partikel.length - 1; i >= 0; i--) {
      const p = this.partikel[i]!
      p.umur += dt
      if (p.umur > p.totalFrame / p.fps) this.partikel.splice(i, 1)
    }
    for (let i = this.teks.length - 1; i >= 0; i--) {
      const t = this.teks[i]!
      t.umur += dt
      t.y -= 32 * dt
      if (t.umur >= t.durasi) this.teks.splice(i, 1)
    }
    for (let i = this.bendera.length - 1; i >= 0; i--) {
      const b = this.bendera[i]!
      b.umur += dt
      if (b.umur >= b.durasi) this.bendera.splice(i, 1)
    }
  }

  gambar(ctx: CanvasRenderingContext2D): void {
    // 1. Bendera perintah di tanah
    for (const b of this.bendera) {
      const porsi = b.umur / b.durasi
      const alpha = porsi > 0.7 ? Math.max(0, 1 - (porsi - 0.7) / 0.3) : 1
      const tancap = b.umur < 0.14 ? (1 - b.umur / 0.14) * 16 : 0
      const kibar = Math.sin(b.umur * 16) * 2.5
      const warna = b.jenis === 'serang' ? '#f05a4a' : b.jenis === 'rally' ? '#ffd86b' : '#63e678'

      ctx.save()
      ctx.globalAlpha = alpha
      // Cincin riak di tanah
      ctx.strokeStyle = warna
      ctx.lineWidth = 2
      const rad = 8 + porsi * 16
      ctx.beginPath()
      ctx.ellipse(b.x, b.y + 2, rad, rad * 0.45, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Tiang & kain bendera kecil
      const yBase = b.y - tancap
      ctx.fillStyle = '#24180f'
      ctx.fillRect(b.x - 1.5, yBase - 28, 3.5, 29)
      ctx.fillStyle = '#c8a060'
      ctx.fillRect(b.x - 1, yBase - 27, 2, 27)

      ctx.beginPath()
      ctx.moveTo(b.x + 1, yBase - 27)
      ctx.lineTo(b.x + 17, yBase - 22 + kibar)
      ctx.lineTo(b.x + 1, yBase - 15)
      ctx.closePath()
      ctx.fillStyle = warna
      ctx.fill()
      ctx.strokeStyle = '#1b120b'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.restore()
    }

    // 2. Partikel ledakan & nisan mati (Dead.png 7x2)
    for (const p of this.partikel) {
      const im = gambarDari(p.aset)
      if (!im) continue
      const i = Math.floor(p.umur * p.fps)
      if (i >= p.totalFrame) continue
      const f = frame(p.aset, i)
      const w = f.sw * p.skala
      const h = f.sh * p.skala
      ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, p.x - w / 2, p.y - h / 2, w, h)
    }

    // 3. Angka nyawa & sumber daya melayang
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const t of this.teks) {
      const porsi = t.umur / t.durasi
      ctx.globalAlpha = porsi > 0.65 ? Math.max(0, 1 - (porsi - 0.65) / 0.35) : 1
      ctx.font = `700 ${t.ukuran}px 'Pixelify Sans', system-ui`
      ctx.lineWidth = 3.5
      ctx.strokeStyle = 'rgba(18, 12, 8, 0.92)'
      ctx.strokeText(t.teks, t.x, t.y)
      ctx.fillStyle = t.warna
      ctx.fillText(t.teks, t.x, t.y)
    }
    ctx.restore()
  }

  void(dunia: Dunia): void {
    void dunia
  }
}
