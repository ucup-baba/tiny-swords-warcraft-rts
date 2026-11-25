import type { Tim } from '@hftf/shared'

export interface RingkasRoom {
  kode: string
  hostNama: string
  tamuNama: string | null
  jumlah: number
  mulai: boolean
}

export interface PendengarLan {
  daftar?(room: RingkasRoom[]): void
  room?(kode: string, peran: 'host' | 'tamu', tim: Tim, ringkas: RingkasRoom): void
  mulai?(seed: number, tim: Tim, heroBlue: string, heroRed: string): void
  cmd?(tim: Tim, cmd: unknown): void
  snapshot?(state: unknown): void
  lawanPutus?(detik: number): void
  lawanKembali?(): void
  lawanMenyerah?(): void
  galat?(pesan: string): void
  tersambung?(): void
  terputus?(): void
}

/**
 * Klien papan room LAN. Menyimpan token sesi supaya bisa menyambung ulang
 * setelah koneksi putus (PRD §15.2) — tanpa token, perangkat lain di LAN bisa
 * mengaku-aku sebagai pemain yang putus.
 */
export class KlienLan {
  private ws: WebSocket | null = null
  private token = ''
  private kodeRoom = ''
  private denyut = 0
  /**
   * Pesan yang dikirim sebelum socket terbuka. Tanpa antrean ini, "Buat Room"
   * yang diklik tepat setelah menyambung HILANG DIAM-DIAM — readyState masih
   * CONNECTING dan send() tidak boleh dipanggil.
   */
  private antrean: unknown[] = []

  constructor(private url: string, private pendengar: PendengarLan) {}

  get kode(): string {
    return this.kodeRoom
  }

  sambung(nama: string): void {
    const ws = new WebSocket(this.url)
    this.ws = ws

    ws.onopen = () => {
      this.kirimMentah({ t: 'halo', nama })
      for (const p of this.antrean) this.kirimMentah(p)
      this.antrean = []
      // Denyut ringan supaya koneksi tidak dianggap mati oleh perantara.
      this.denyut = window.setInterval(() => this.kirimMentah({ t: 'denyut' }), 20_000)
      this.pendengar.tersambung?.()
    }

    ws.onmessage = (e) => {
      let m: Record<string, unknown>
      try {
        m = JSON.parse(String(e.data)) as Record<string, unknown>
      } catch {
        return
      }
      switch (m['t']) {
        case 'halo':
          this.token = String(m['token'] ?? '')
          break
        case 'daftar':
          this.pendengar.daftar?.(m['room'] as RingkasRoom[])
          break
        case 'room':
          this.kodeRoom = String(m['kode'])
          this.pendengar.room?.(
            this.kodeRoom, m['peran'] as 'host' | 'tamu', m['tim'] as Tim, m['ringkas'] as RingkasRoom)
          break
        case 'mulai':
          this.pendengar.mulai?.(
            Number(m['seed']), m['tim'] as Tim, String(m['heroBlue']), String(m['heroRed']))
          break
        case 'cmd':
          this.pendengar.cmd?.(m['tim'] as Tim, m['cmd'])
          break
        case 'snapshot':
          this.pendengar.snapshot?.(m['state'])
          break
        case 'lawan-putus':
          this.pendengar.lawanPutus?.(Number(m['detik']))
          break
        case 'lawan-kembali':
          this.pendengar.lawanKembali?.()
          break
        case 'lawan-menyerah':
          this.pendengar.lawanMenyerah?.()
          break
        case 'galat':
          this.pendengar.galat?.(String(m['pesan']))
          break
      }
    }

    ws.onclose = () => {
      window.clearInterval(this.denyut)
      this.pendengar.terputus?.()
    }
    ws.onerror = () => this.pendengar.galat?.('Koneksi LAN bermasalah')
  }

  private kirimMentah(p: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(p))
      return
    }
    // Snapshot & denyut basi kalau ditunda; sisanya diantrekan.
    const jenis = (p as { t?: string }).t
    if (jenis !== 'snapshot' && jenis !== 'denyut') this.antrean.push(p)
  }

  buatRoom(hero: string): void {
    this.kirimMentah({ t: 'buat-room', hero })
  }

  gabung(kode: string, hero: string): void {
    this.kirimMentah({ t: 'gabung-room', kode, hero })
  }

  keluar(): void {
    this.kirimMentah({ t: 'keluar-room' })
    this.kodeRoom = ''
  }

  mulai(): void {
    this.kirimMentah({ t: 'mulai' })
  }

  /** Dipanggil setelah koneksi tersambung lagi (PRD §15.2). */
  sambungUlang(): void {
    if (this.kodeRoom && this.token) {
      this.kirimMentah({ t: 'sambung-ulang', kode: this.kodeRoom, token: this.token })
    }
  }

  kirimCmd(cmd: unknown): void {
    this.kirimMentah({ t: 'cmd', cmd })
  }

  kirimSnapshot(state: unknown): void {
    this.kirimMentah({ t: 'snapshot', state })
  }

  tutup(): void {
    window.clearInterval(this.denyut)
    this.ws?.close()
    this.ws = null
  }
}
