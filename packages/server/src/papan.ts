import { PAPAN, kelompokWifi } from '@hftf/shared'
import type { DariPapan, KePapan, RingkasRoom } from './protokol.js'

/**
 * Papan room LAN tanpa transport — class murni, bisa dites tanpa membuka
 * socket. Adapter WebSocket-nya terpisah di papan-ws.ts.
 *
 * Pola ini diport dari math-strike-kerja24c; `lan-server.mjs` lama mencampur
 * frame WebSocket, routing HTTP, dan logika room dalam satu berkas 458 baris
 * tanpa satu pun tes.
 */

const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface OpsiPapan {
  acak: (n: number) => number
  sekarang: () => number
}

interface Perangkat {
  id: string
  token: string
  nama: string
  hero: string
  /** Kelompok jaringan; daftar room hanya beredar di dalam satu kelompok. */
  kelompok: string
  kirim: (p: DariPapan) => void
  kode: string | null
  /** Jendela rate limit. */
  jendela: number
  hitung: number
}

interface Room {
  kode: string
  hostId: string
  tamuId: string | null
  mulai: boolean
  kelompok: string
  /** Token pemain yang sedang putus, untuk sambung ulang (PRD §15.2). */
  putus: { token: string; peran: 'host' | 'tamu'; sisaDetik: number } | null
  heroHost: string
  heroTamu: string
}

export class PapanInti {
  private perangkat = new Map<string, Perangkat>()
  private room = new Map<string, Room>()

  constructor(private opsi: OpsiPapan) {}

  get jumlahRoom(): number {
    return this.room.size
  }

  // -------------------------------------------------------------------------

  sambung(id: string, ip: string, kirim: (p: DariPapan) => void): string {
    const token = this.buatToken()
    const kelompok = kelompokWifi(ip)
    this.perangkat.set(id, {
      id, token, nama: 'Pemain', hero: 'king', kelompok, kirim,
      kode: null, jendela: this.opsi.sekarang(), hitung: 0,
    })
    kirim({ t: 'halo', id, token })
    kirim({ t: 'daftar', room: this.daftar(kelompok) })
    return token
  }

  putus(id: string): void {
    const p = this.perangkat.get(id)
    if (!p) return
    const room = p.kode ? this.room.get(p.kode) : null

    if (room && room.mulai) {
      // Match berjalan: room DIPERTAHANKAN dan diberi grace (PRD §15.2).
      // Versi lama langsung menghapus room begitu host putus.
      const peran = room.hostId === id ? 'host' : 'tamu'
      room.putus = { token: p.token, peran, sisaDetik: PAPAN.graceDetik }
      const lawanId = peran === 'host' ? room.tamuId : room.hostId
      const lawan = lawanId ? this.perangkat.get(lawanId) : null
      lawan?.kirim({ t: 'lawan-putus', detik: PAPAN.graceDetik })
    } else if (room) {
      this.bubarkan(room, id)
    }

    this.perangkat.delete(id)
    this.umumkan(p.kelompok)
  }

  /** Dipanggil tiap detik oleh adapter; mengurus habisnya grace. */
  detak(): void {
    for (const room of [...this.room.values()]) {
      if (!room.putus) continue
      room.putus.sisaDetik -= 1
      if (room.putus.sisaDetik > 0) continue

      // Grace habis: pihak yang putus kalah (PRD §13.1 poin 4).
      const sisaId = room.putus.peran === 'host' ? room.tamuId : room.hostId
      const sisa = sisaId ? this.perangkat.get(sisaId) : null
      sisa?.kirim({ t: 'lawan-menyerah' })
      if (sisa) sisa.kode = null
      this.room.delete(room.kode)
      this.umumkan(room.kelompok)
    }
  }

  /** Memproses satu pesan; false berarti koneksi harus diputus. */
  pesan(id: string, mentah: KePapan | null): boolean {
    const p = this.perangkat.get(id)
    if (!p) return false

    // Rate limit per koneksi (PRD §15.3 poin 3).
    const kini = this.opsi.sekarang()
    if (kini - p.jendela >= 1000) {
      p.jendela = kini
      p.hitung = 0
    }
    if (++p.hitung > PAPAN.pesanPerDetik) return false

    if (!mentah) return true // pesan cacat diabaikan, koneksi tetap hidup

    switch (mentah.t) {
      case 'halo':
        p.nama = mentah.nama
        return true
      case 'denyut':
        return true
      case 'buat-room':
        this.buatRoom(p, mentah.hero)
        return true
      case 'gabung-room':
        this.gabung(p, mentah.kode, mentah.hero)
        return true
      case 'keluar-room':
        if (p.kode) {
          const r = this.room.get(p.kode)
          if (r) this.bubarkan(r, p.id)
          p.kode = null
          this.umumkan(p.kelompok)
        }
        return true
      case 'sambung-ulang':
        this.sambungUlang(p, mentah.kode, mentah.token)
        return true
      case 'mulai':
        this.mulai(p)
        return true
      case 'cmd': {
        // Hanya tamu yang mengirim cmd, dan hanya ke host roomnya sendiri.
        const r = p.kode ? this.room.get(p.kode) : null
        if (!r || r.tamuId !== p.id) return true
        this.perangkat.get(r.hostId)?.kirim({ t: 'cmd', tim: 'red', cmd: mentah.cmd })
        return true
      }
      case 'snapshot': {
        // Hanya host yang menyiarkan snapshot.
        const r = p.kode ? this.room.get(p.kode) : null
        if (!r || r.hostId !== p.id || !r.tamuId) return true
        this.perangkat.get(r.tamuId)?.kirim({ t: 'snapshot', state: mentah.state })
        return true
      }
    }
  }

  // -------------------------------------------------------------------------

  private buatToken(): string {
    let s = ''
    for (let i = 0; i < 24; i++) s += ALFABET[this.opsi.acak(ALFABET.length)]
    return s
  }

  private buatKode(): string {
    for (let i = 0; i < 64; i++) {
      let k = ''
      for (let j = 0; j < PAPAN.panjangKode; j++) k += ALFABET[this.opsi.acak(ALFABET.length)]
      if (!this.room.has(k)) return k
    }
    throw new Error('Gagal membuat kode room yang unik')
  }

  private ringkas(r: Room): RingkasRoom {
    const host = this.perangkat.get(r.hostId)
    const tamu = r.tamuId ? this.perangkat.get(r.tamuId) : null
    return {
      kode: r.kode,
      hostNama: host?.nama ?? 'Host',
      tamuNama: tamu?.nama ?? null,
      jumlah: tamu ? 2 : 1,
      mulai: r.mulai,
    }
  }

  /** Room hanya beredar di dalam satu kelompok jaringan (PRD §15.3 poin 1). */
  private daftar(kelompok: string): RingkasRoom[] {
    const hasil: RingkasRoom[] = []
    for (const r of this.room.values()) {
      if (r.kelompok !== kelompok || r.mulai) continue
      hasil.push(this.ringkas(r))
    }
    return hasil
  }

  private umumkan(kelompok: string): void {
    const daftar = this.daftar(kelompok)
    for (const p of this.perangkat.values()) {
      if (p.kelompok === kelompok && !p.kode) p.kirim({ t: 'daftar', room: daftar })
    }
  }

  private buatRoom(p: Perangkat, hero: string): void {
    if (p.kode) {
      const lama = this.room.get(p.kode)
      if (lama) this.bubarkan(lama, p.id)
    }
    const kode = this.buatKode()
    const room: Room = {
      kode, hostId: p.id, tamuId: null, mulai: false,
      kelompok: p.kelompok, putus: null, heroHost: hero, heroTamu: 'champion',
    }
    this.room.set(kode, room)
    p.kode = kode
    p.hero = hero
    p.kirim({ t: 'room', kode, peran: 'host', tim: 'blue', ringkas: this.ringkas(room) })
    this.umumkan(p.kelompok)
  }

  private gabung(p: Perangkat, kode: string, hero: string): void {
    const room = this.room.get(kode)
    if (!room || room.kelompok !== p.kelompok) {
      p.kirim({ t: 'galat', pesan: `Room "${kode}" tidak ditemukan di jaringan ini` })
      return
    }
    if (room.tamuId || room.mulai) {
      p.kirim({ t: 'galat', pesan: `Room "${kode}" sudah penuh atau sedang bermain` })
      return
    }
    room.tamuId = p.id
    room.heroTamu = hero
    p.kode = kode
    p.hero = hero
    const ringkas = this.ringkas(room)
    p.kirim({ t: 'room', kode, peran: 'tamu', tim: 'red', ringkas })
    this.perangkat.get(room.hostId)?.kirim({ t: 'room', kode, peran: 'host', tim: 'blue', ringkas })
    this.umumkan(p.kelompok)
  }

  private sambungUlang(p: Perangkat, kode: string, token: string): void {
    const room = this.room.get(kode)
    if (!room?.putus || room.putus.token !== token) {
      p.kirim({ t: 'galat', pesan: 'Sesi tidak bisa disambung lagi' })
      return
    }
    // Token sesi mencegah orang lain di LAN mengaku-aku sebagai pemain yang
    // putus (PRD §15.2 / AC-15.7).
    const peran = room.putus.peran
    p.token = token
    p.kode = kode
    if (peran === 'host') room.hostId = p.id
    else room.tamuId = p.id
    room.putus = null

    p.kirim({ t: 'room', kode, peran, tim: peran === 'host' ? 'blue' : 'red', ringkas: this.ringkas(room) })
    const lawanId = peran === 'host' ? room.tamuId : room.hostId
    if (lawanId) this.perangkat.get(lawanId)?.kirim({ t: 'lawan-kembali' })
  }

  private mulai(p: Perangkat): void {
    const room = p.kode ? this.room.get(p.kode) : null
    if (!room || room.hostId !== p.id) return
    if (!room.tamuId) {
      p.kirim({ t: 'galat', pesan: 'Menunggu pemain kedua bergabung' })
      return
    }
    room.mulai = true
    const seed = this.opsi.acak(1_000_000)
    const host = this.perangkat.get(room.hostId)
    const tamu = this.perangkat.get(room.tamuId)
    host?.kirim({ t: 'mulai', seed, tim: 'blue', heroBlue: room.heroHost, heroRed: room.heroTamu })
    tamu?.kirim({ t: 'mulai', seed, tim: 'red', heroBlue: room.heroHost, heroRed: room.heroTamu })
    this.umumkan(room.kelompok)
  }

  private bubarkan(room: Room, olehId: string): void {
    if (room.hostId === olehId) {
      const tamu = room.tamuId ? this.perangkat.get(room.tamuId) : null
      if (tamu) {
        tamu.kode = null
        tamu.kirim({ t: 'galat', pesan: 'Host menutup room' })
      }
      this.room.delete(room.kode)
      return
    }
    if (room.tamuId === olehId) {
      room.tamuId = null
      room.mulai = false
      this.perangkat.get(room.hostId)?.kirim({
        t: 'room', kode: room.kode, peran: 'host', tim: 'blue', ringkas: this.ringkas(room),
      })
    }
  }
}
