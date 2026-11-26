import type {
  HeroId, JenisPeta, JenisSlot, KesulitanAi, KonfigMatch, KonfigSlot, Tim, TimPemain,
} from '@hftf/shared'

export interface SlotRoom {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
  terisi: boolean
}

export interface RingkasRoom {
  kode: string
  hostNama: string
  tamuNama: string | null
  jumlah: number
  jumlahManusia?: number
  slotTerbuka?: number
  maksPemain: number
  mulai: boolean
  peta: JenisPeta
  goldAwal: number
  slot: SlotRoom[]
}

export interface MulaiLanInfo {
  peta: JenisPeta
  goldAwal: number
  slot: SlotRoom[]
}

export interface PendengarLan {
  daftar?(room: RingkasRoom[]): void
  room?(kode: string, peran: 'host' | 'tamu', tim: TimPemain, ringkas: RingkasRoom): void
  mulai?(seed: number, tim: TimPemain, heroBlue: string, heroRed: string, info?: MulaiLanInfo): void
  cmd?(tim: Tim, cmd: unknown): void
  snapshot?(state: unknown): void
  lawanPutus?(detik: number): void
  lawanKembali?(): void
  lawanMenyerah?(): void
  roomKeluar?(pesan: string): void
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
            this.kodeRoom, m['peran'] as 'host' | 'tamu', m['tim'] as TimPemain, m['ringkas'] as RingkasRoom)
          break
        case 'mulai':
          this.pendengar.mulai?.(
            Number(m['seed']),
            m['tim'] as TimPemain,
            String(m['heroBlue']),
            String(m['heroRed']),
            {
              peta: (m['peta'] as JenisPeta) ?? 'klasik2',
              goldAwal: Number(m['goldAwal'] ?? 320),
              slot: (m['slot'] as SlotRoom[]) ?? [],
            },
          )
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
        case 'room-keluar':
          this.kodeRoom = ''
          this.pendengar.roomKeluar?.(String(m['pesan'] ?? 'Keluar dari room'))
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

  kirimNama(nama: string): void {
    const bersih = nama.trim().slice(0, 18) || 'Pemain'
    this.kirimMentah({ t: 'halo', nama: bersih })
  }

  buatRoom(hero: string, opsi?: Partial<KonfigMatch>): void {
    this.kirimMentah({
      t: 'buat-room',
      hero,
      ...(opsi?.peta ? { peta: opsi.peta } : {}),
      ...(opsi?.goldAwal !== undefined ? { goldAwal: opsi.goldAwal } : {}),
      ...(opsi?.slot ? { slot: opsi.slot } : {}),
    })
  }

  aturRoom(opsi: { peta?: JenisPeta; goldAwal?: number; slot?: KonfigSlot[] }): void {
    this.kirimMentah({ t: 'atur-room', ...opsi })
  }

  ubahSlot(opsi: { hero?: string; aliansi?: number; tim?: TimPemain }): void {
    this.kirimMentah({ t: 'ubah-slot', ...opsi })
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

  kirimSnapshot(state: unknown, untuk?: TimPemain): void {
    this.kirimMentah(untuk ? { t: 'snapshot', state, untuk } : { t: 'snapshot', state })
  }

  tutup(): void {
    window.clearInterval(this.denyut)
    this.ws?.close()
    this.ws = null
  }
}
