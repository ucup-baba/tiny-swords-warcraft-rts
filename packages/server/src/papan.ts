import {
  GOLD_AWAL_BAKU, INFO_PETA, PAPAN, TIM_PEMAIN, jepitGoldAwal, kelompokWifi,
  type HeroId, type JenisPeta, type JenisSlot, type KesulitanAi, type KonfigSlot, type TimPemain,
} from '@hftf/shared'
import type { DariPapan, KePapan, RingkasRoom, SlotRoom } from './protokol.js'

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
  kelompok: string
  kirim: (p: DariPapan) => void
  kode: string | null
  jendela: number
  hitung: number
}

interface SlotInternal {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
  perangkatId: string | null
}

interface PutusSlot {
  token: string
  peran: 'host' | 'tamu'
  indeksSlot: number
  sisaDetik: number
}

interface Room {
  kode: string
  hostId: string
  mulai: boolean
  kelompok: string
  peta: JenisPeta
  goldAwal: number
  slot: SlotInternal[]
  /** Token pemain yang sedang putus, untuk sambung ulang (PRD §15.2). */
  putus: Map<string, PutusSlot>
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
      const idxSlot = room.slot.findIndex((s) => s.perangkatId === id || (room.hostId === id && s.indeks === 0))
      const peran: 'host' | 'tamu' = room.hostId === id ? 'host' : 'tamu'
      const slot = idxSlot >= 0 ? room.slot[idxSlot]! : room.slot[0]!
      slot.perangkatId = null
      room.putus.set(p.token, {
        token: p.token,
        peran,
        indeksSlot: slot.indeks,
        sisaDetik: PAPAN.graceDetik,
      })
      for (const s of room.slot) {
        if (!s.perangkatId) continue
        this.perangkat.get(s.perangkatId)?.kirim({ t: 'lawan-putus', detik: PAPAN.graceDetik, tim: slot.tim })
      }
    } else if (room) {
      this.bubarkan(room, id)
    }

    this.perangkat.delete(id)
    this.umumkan(p.kelompok)
  }

  /** Dipanggil tiap detik oleh adapter; mengurus habisnya grace. */
  detak(): void {
    for (const room of [...this.room.values()]) {
      if (room.putus.size === 0) continue

      for (const [tok, entri] of [...room.putus.entries()]) {
        entri.sisaDetik -= 1
        if (entri.sisaDetik > 0) continue

        room.putus.delete(tok)
        const manusiaAktif = room.slot.filter((s) => s.jenis === 'manusia' && s.perangkatId !== null)
        const adaAi = room.slot.some((s) => s.jenis === 'ai')

        if (entri.peran === 'host' || (manusiaAktif.length <= 1 && !adaAi && room.putus.size === 0)) {
          // Grace habis dan tak ada lawan AI lain / host putus permanen -> match berakhir.
          for (const s of manusiaAktif) {
            const dev = s.perangkatId ? this.perangkat.get(s.perangkatId) : null
            if (dev) {
              dev.kirim({ t: 'lawan-menyerah' })
              dev.kode = null
            }
          }
          this.room.delete(room.kode)
          this.umumkan(room.kelompok)
          break
        } else {
          // Tamu di game 3+ pemain atau vs AI menyerah, sisa pemain lanjut.
          const slotKeluar = room.slot.find((s) => s.indeks === entri.indeksSlot)
          const host = this.perangkat.get(room.hostId)
          if (slotKeluar && host) {
            host.kirim({ t: 'cmd', tim: slotKeluar.tim, cmd: { jenis: 'menyerah' } })
          }
          for (const s of manusiaAktif) {
            this.perangkat.get(s.perangkatId!)?.kirim({ t: 'lawan-kembali' })
          }
        }
      }
    }
  }

  /** Memproses satu pesan; false berarti koneksi harus diputus. */
  pesan(id: string, mentah: KePapan | null): boolean {
    const p = this.perangkat.get(id)
    if (!p) return false

    const kini = this.opsi.sekarang()
    if (kini - p.jendela >= 1000) {
      p.jendela = kini
      p.hitung = 0
    }
    if (++p.hitung > PAPAN.pesanPerDetik) return false

    if (!mentah) return true

    switch (mentah.t) {
      case 'halo':
        p.nama = mentah.nama
        return true
      case 'denyut':
        return true
      case 'buat-room':
        this.buatRoom(p, mentah.hero, mentah.peta, mentah.goldAwal, mentah.slot)
        return true
      case 'atur-room':
        this.aturRoom(p, mentah.peta, mentah.goldAwal, mentah.slot)
        return true
      case 'ubah-slot':
        this.ubahSlot(p, mentah.hero, mentah.aliansi, mentah.tim)
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
        const r = p.kode ? this.room.get(p.kode) : null
        if (!r || r.hostId === p.id) return true
        const pengirim = r.slot.find((s) => s.perangkatId === p.id)
        if (!pengirim) return true
        this.perangkat.get(r.hostId)?.kirim({ t: 'cmd', tim: pengirim.tim, cmd: mentah.cmd })
        return true
      }
      case 'snapshot': {
        const r = p.kode ? this.room.get(p.kode) : null
        if (!r || r.hostId !== p.id) return true
        if (mentah.untuk) {
          const target = r.slot.find((s) => s.tim === mentah.untuk && s.perangkatId && s.perangkatId !== r.hostId)
          if (target?.perangkatId) {
            this.perangkat.get(target.perangkatId)?.kirim({ t: 'snapshot', state: mentah.state })
          }
          return true
        }
        for (const s of r.slot) {
          if (s.perangkatId && s.perangkatId !== r.hostId) {
            this.perangkat.get(s.perangkatId)?.kirim({ t: 'snapshot', state: mentah.state })
          }
        }
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
    const tamu = r.slot.find((s) => s.perangkatId && s.perangkatId !== r.hostId)
    const devTamu = tamu?.perangkatId ? this.perangkat.get(tamu.perangkatId) : null
    const jumlahManusia = r.slot.filter((s) => s.jenis === 'manusia' && s.perangkatId !== null).length
    const jumlahAi = r.slot.filter((s) => s.jenis === 'ai').length

    const slot: SlotRoom[] = r.slot.map((s) => ({
      indeks: s.indeks,
      tim: s.tim,
      jenis: s.jenis,
      aliansi: s.aliansi,
      hero: s.hero,
      kesulitanAi: s.kesulitanAi,
      nama: s.perangkatId ? (this.perangkat.get(s.perangkatId)?.nama ?? s.nama) : s.nama,
      terisi: (s.jenis === 'manusia' && s.perangkatId !== null) || s.jenis === 'ai',
    }))

    return {
      kode: r.kode,
      hostNama: host?.nama ?? 'Host',
      tamuNama: devTamu?.nama ?? null,
      jumlah: Math.max(1, jumlahManusia + jumlahAi),
      maksPemain: INFO_PETA[r.peta].maksPemain,
      mulai: r.mulai,
      peta: r.peta,
      goldAwal: r.goldAwal,
      slot,
    }
  }

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

  private siarkanRoom(r: Room): void {
    const ringkas = this.ringkas(r)
    for (const s of r.slot) {
      if (!s.perangkatId) continue
      const dev = this.perangkat.get(s.perangkatId)
      if (!dev) continue
      const peran: 'host' | 'tamu' = dev.id === r.hostId ? 'host' : 'tamu'
      dev.kirim({ t: 'room', kode: r.kode, peran, tim: s.tim, ringkas })
    }
  }

  private buatSlotRoomDefault(p: Perangkat, hero: string, peta: JenisPeta, masuk?: KonfigSlot[]): SlotInternal[] {
    const info = INFO_PETA[peta]
    const hasil: SlotInternal[] = []
    const dipakai = new Set<TimPemain>()

    for (let i = 0; i < info.maksPemain; i++) {
      const m = masuk?.[i]
      let tim: TimPemain = m?.tim ?? info.warnaDefault[i]!
      if (dipakai.has(tim)) {
        tim = TIM_PEMAIN.find((c) => !dipakai.has(c)) ?? tim
      }
      dipakai.add(tim)
      const jenis: JenisSlot = i === 0 ? 'manusia' : (m?.jenis ?? 'manusia')
      const heroPakai = (i === 0 ? hero : (m?.hero ?? 'champion')) as HeroId
      hasil.push({
        indeks: i,
        tim,
        jenis,
        aliansi: m?.aliansi ?? i + 1,
        hero: heroPakai,
        kesulitanAi: m?.kesulitanAi ?? 'medium',
        nama: i === 0 ? p.nama : jenis === 'ai' ? `AI ${tim.toUpperCase()}` : jenis === 'kosong' ? 'Kosong' : 'Terbuka (LAN)',
        perangkatId: i === 0 ? p.id : null,
      })
    }
    return hasil
  }

  private buatRoom(p: Perangkat, hero: string, petaMasuk?: JenisPeta, goldMasuk?: number, slotMasuk?: KonfigSlot[]): void {
    if (p.kode) {
      const lama = this.room.get(p.kode)
      if (lama) this.bubarkan(lama, p.id)
    }
    const peta: JenisPeta = petaMasuk ?? 'klasik2'
    const goldAwal = jepitGoldAwal(goldMasuk ?? GOLD_AWAL_BAKU)
    const kode = this.buatKode()
    const slot = this.buatSlotRoomDefault(p, hero, peta, slotMasuk)
    const room: Room = {
      kode,
      hostId: p.id,
      mulai: false,
      kelompok: p.kelompok,
      peta,
      goldAwal,
      slot,
      putus: new Map(),
    }
    this.room.set(kode, room)
    p.kode = kode
    p.hero = hero
    this.siarkanRoom(room)
    this.umumkan(p.kelompok)
  }

  private aturRoom(p: Perangkat, petaMasuk?: JenisPeta, goldMasuk?: number, slotMasuk?: KonfigSlot[]): void {
    const room = p.kode ? this.room.get(p.kode) : null
    if (!room || room.hostId !== p.id || room.mulai) return

    if (petaMasuk && petaMasuk !== room.peta) {
      const info = INFO_PETA[petaMasuk]
      const baru: SlotInternal[] = []
      for (let i = 0; i < info.maksPemain; i++) {
        const lama = room.slot[i]
        if (lama && lama.perangkatId) {
          baru.push({ ...lama, indeks: i })
        } else {
          baru.push({
            indeks: i,
            tim: info.warnaDefault[i]!,
            jenis: i === 0 ? 'manusia' : 'manusia',
            aliansi: i + 1,
            hero: 'champion',
            kesulitanAi: 'medium',
            nama: 'Terbuka (LAN)',
            perangkatId: null,
          })
        }
      }
      // Putuskan tamu yang melebihi kapasitas peta baru bila mengecil (mis. 6P -> 2P)
      for (let i = info.maksPemain; i < room.slot.length; i++) {
        const lebih = room.slot[i]
        if (lebih?.perangkatId) {
          const dev = this.perangkat.get(lebih.perangkatId)
          if (dev) {
            dev.kode = null
            dev.kirim({ t: 'galat', pesan: 'Host mengecilkan kapasitas peta' })
          }
        }
      }
      room.peta = petaMasuk
      room.slot = baru
    }

    if (goldMasuk !== undefined) {
      room.goldAwal = jepitGoldAwal(goldMasuk)
    }

    if (slotMasuk && slotMasuk.length > 0) {
      const dipakai = new Set<TimPemain>()
      for (let i = 0; i < room.slot.length; i++) {
        const cur = room.slot[i]!
        const incoming = slotMasuk.find((s) => s.indeks === i) ?? slotMasuk[i]
        if (!incoming) {
          dipakai.add(cur.tim)
          continue
        }
        let timPilih = incoming.tim
        if (dipakai.has(timPilih)) {
          timPilih = TIM_PEMAIN.find((c) => !dipakai.has(c)) ?? cur.tim
        }
        dipakai.add(timPilih)
        cur.tim = timPilih
        cur.aliansi = incoming.aliansi
        cur.kesulitanAi = incoming.kesulitanAi

        if (!cur.perangkatId) {
          cur.jenis = i === 0 ? 'manusia' : incoming.jenis
          cur.hero = incoming.hero
          cur.nama = cur.jenis === 'ai'
            ? `AI ${cur.tim.toUpperCase()}`
            : cur.jenis === 'kosong' ? 'Kosong' : 'Terbuka (LAN)'
        } else if (i === 0) {
          cur.hero = incoming.hero
        }
      }
    }

    this.siarkanRoom(room)
    this.umumkan(room.kelompok)
  }

  private ubahSlot(p: Perangkat, hero?: string, aliansi?: number, timBaru?: TimPemain): void {
    const room = p.kode ? this.room.get(p.kode) : null
    if (!room || room.mulai) return
    const cur = room.slot.find((s) => s.perangkatId === p.id)
    if (!cur) return

    if (hero) {
      cur.hero = hero as HeroId
      p.hero = hero
    }
    if (aliansi !== undefined) cur.aliansi = aliansi
    if (timBaru && timBaru !== cur.tim) {
      const lain = room.slot.find((s) => s.tim === timBaru)
      if (lain) lain.tim = cur.tim
      cur.tim = timBaru
    }

    this.siarkanRoom(room)
    this.umumkan(room.kelompok)
  }

  private gabung(p: Perangkat, kode: string, hero: string): void {
    const room = this.room.get(kode)
    if (!room || room.kelompok !== p.kelompok) {
      p.kirim({ t: 'galat', pesan: `Room "${kode}" tidak ditemukan di jaringan ini` })
      return
    }
    const slotKosong = room.mulai
      ? null
      : room.slot.find((s) => s.indeks > 0 && s.jenis === 'manusia' && s.perangkatId === null)
    if (!slotKosong || room.mulai) {
      p.kirim({ t: 'galat', pesan: `Room "${kode}" sudah penuh atau sedang bermain` })
      return
    }
    slotKosong.perangkatId = p.id
    slotKosong.nama = p.nama
    slotKosong.hero = hero as HeroId
    p.kode = kode
    p.hero = hero
    this.siarkanRoom(room)
    this.umumkan(p.kelompok)
  }

  private sambungUlang(p: Perangkat, kode: string, token: string): void {
    const room = this.room.get(kode)
    const entri = room?.putus.get(token)
    if (!room || !entri) {
      p.kirim({ t: 'galat', pesan: 'Sesi tidak bisa disambung lagi' })
      return
    }
    const peran = entri.peran
    const slot = room.slot.find((s) => s.indeks === entri.indeksSlot) ?? room.slot[0]!
    room.putus.delete(token)
    p.token = token
    p.kode = kode
    slot.perangkatId = p.id
    if (peran === 'host') room.hostId = p.id

    p.kirim({ t: 'room', kode, peran, tim: slot.tim, ringkas: this.ringkas(room) })
    if (room.putus.size === 0) {
      for (const s of room.slot) {
        if (s.perangkatId && s.perangkatId !== p.id) {
          this.perangkat.get(s.perangkatId)?.kirim({ t: 'lawan-kembali' })
        }
      }
    }
  }

  private mulai(p: Perangkat): void {
    const room = p.kode ? this.room.get(p.kode) : null
    if (!room || room.hostId !== p.id) return

    const aktif = room.slot.filter(
      (s) => (s.jenis === 'manusia' && s.perangkatId !== null) || s.jenis === 'ai',
    )
    if (aktif.length < 2) {
      p.kirim({ t: 'galat', pesan: 'Menunggu pemain kedua bergabung atau tambahkan AI' })
      return
    }
    const aliansiUnik = new Set(aktif.map((s) => s.aliansi))
    if (aliansiUnik.size < 2) {
      p.kirim({ t: 'galat', pesan: 'Minimal harus ada 2 pihak/aliansi yang saling berlawanan' })
      return
    }

    room.mulai = true
    const seed = this.opsi.acak(1_000_000)
    const hostSlot = room.slot[0]!
    const redSlot = room.slot.find((s) => s.tim === 'red') ?? room.slot[1] ?? hostSlot
    const slotKirim: SlotRoom[] = room.slot.map((s) => ({
      indeks: s.indeks,
      tim: s.tim,
      jenis: s.jenis === 'manusia' && !s.perangkatId ? 'kosong' : s.jenis,
      aliansi: s.aliansi,
      hero: s.hero,
      kesulitanAi: s.kesulitanAi,
      nama: s.perangkatId ? (this.perangkat.get(s.perangkatId)?.nama ?? s.nama) : s.nama,
      terisi: (s.jenis === 'manusia' && s.perangkatId !== null) || s.jenis === 'ai',
    }))

    for (const s of room.slot) {
      if (!s.perangkatId) continue
      this.perangkat.get(s.perangkatId)?.kirim({
        t: 'mulai',
        seed,
        tim: s.tim,
        heroBlue: hostSlot.hero,
        heroRed: redSlot.hero,
        peta: room.peta,
        goldAwal: room.goldAwal,
        slot: slotKirim,
      })
    }
    this.umumkan(room.kelompok)
  }

  private bubarkan(room: Room, olehId: string): void {
    if (room.hostId === olehId) {
      for (const s of room.slot) {
        if (s.perangkatId && s.perangkatId !== olehId) {
          const tamu = this.perangkat.get(s.perangkatId)
          if (tamu) {
            tamu.kode = null
            tamu.kirim({ t: 'galat', pesan: 'Host menutup room' })
          }
        }
      }
      this.room.delete(room.kode)
      return
    }
    const slot = room.slot.find((s) => s.perangkatId === olehId)
    if (slot) {
      slot.perangkatId = null
      slot.nama = 'Terbuka (LAN)'
      room.mulai = false
      this.siarkanRoom(room)
    }
  }
}
