import {
  GOLD_AWAL_BAKU, INFO_PETA, PAPAN, TIM_PEMAIN, jepitGoldAwal,
  type HeroId, type JenisPeta, type JenisSlot, type KesulitanAi, type KonfigMatch, type KonfigSlot, type TimPemain,
} from '@hftf/shared'
import { joinRoom, type JsonValue } from 'trystero'
import type { KlienMultiplayer, PendengarLan, RingkasRoom, SlotRoom } from './lan.js'

const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const HOST_ID = '__HOST__'
const APP_ID_P2P = 'tiny-swords-warcraft-rts-p2p-v1'
const ROOM_LOBI_P2P = 'lobi-daftar-room'
const BATAS_BASI_IKLAN_MS = 16_000
const INTERVAL_IKLAN_MS = 4_000
const BATAS_GABUNG_MS = 15_000

/** 7 relay Nostr publik tercepat & aktif agar seluruh perangkat bertemu di relay yang sama. */
export const RELAY_P2P_BAKU: readonly string[] = [
  'wss://nostr-01.yakihonne.com',
  'wss://nostrelay.circum.space',
  'wss://nostr.sathoarder.com',
  'wss://relay.angor.io',
  'wss://fanfares.nostr1.com',
  'wss://bucket.coracle.social',
  'wss://relay.ditto.pub',
]

export const RTC_CONFIG_BAKU: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
  ],
}

export interface SaluranP2p<T> {
  kirim(data: T, target?: string): void
  padaPesan(fn: (data: T, peerId: string) => void): void
}

export interface RuangP2p {
  readonly siap: Promise<void>
  buatSaluran<T>(nama: string): SaluranP2p<T>
  padaPeerMasuk(fn: (peerId: string) => void): void
  padaPeerKeluar(fn: (peerId: string) => void): void
  daftarPeer(): string[]
  keluar(): void
}

export type PabrikRoomP2p = (roomId: string) => RuangP2p

/** Memastikan browser HP lama (Safari <17.4 / Android WebView lama) mendukung fitur yang dipakai Trystero. */
export function pasangPolyfillP2p(): void {
  const ctorPromise = Promise as unknown as Record<string, unknown>
  if (typeof ctorPromise['withResolvers'] !== 'function') {
    ctorPromise['withResolvers'] = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }
  const protoArr = Array.prototype as unknown as Record<string, unknown>
  if (typeof protoArr['toSorted'] !== 'function') {
    protoArr['toSorted'] = function (this: unknown[], cmp?: (a: unknown, b: unknown) => number) {
      return [...this].sort(cmp)
    }
  }
}

/** Mengecek apakah browser mendukung WebRTC + WebCrypto (HTTPS atau localhost). */
export function p2pDidukungBrowser(): boolean {
  return (
    typeof RTCPeerConnection === 'function' &&
    typeof WebSocket === 'function' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  )
}

export function buatPabrikTrystero(relayUrls: readonly string[] = RELAY_P2P_BAKU): PabrikRoomP2p {
  pasangPolyfillP2p()
  return (roomId: string): RuangP2p => {
    const room = joinRoom(
      {
        appId: APP_ID_P2P,
        identity: 'none',
        maxReceiveBytes: 2_000_000,
        rtcConfig: RTC_CONFIG_BAKU,
        relayConfig: {
          urls: [...relayUrls],
          warnOnRelayFailure: false,
        },
      },
      roomId,
    )
    return {
      siap: room.ready,
      buatSaluran<T>(nama: string): SaluranP2p<T> {
        const aksi = room.makeAction<JsonValue>(nama)
        return {
          kirim: (data, target) => {
            const opsi = target ? { target } : undefined
            void aksi.send(data as JsonValue, opsi).catch(() => {})
          },
          padaPesan: (fn) => {
            aksi.onMessage((data, ctx) => fn(data as T, ctx.peerId))
          },
        }
      },
      padaPeerMasuk: (fn) => {
        room.onPeerJoin((ctx) => fn(ctx.peerId))
      },
      padaPeerKeluar: (fn) => {
        room.onPeerLeave((ctx) => fn(ctx.peerId))
      },
      daftarPeer: () => Object.keys(room.getPeers()),
      keluar: () => {
        void room.leave().catch(() => {})
      },
    }
  }
}

type PesanLobi =
  | { t: 'iklan'; ringkas: RingkasRoom }
  | { t: 'tutup'; kode: string }
  | { t: 'minta' }

type PesanKontrol =
  | { t: 'sapa-host'; kode: string }
  | { t: 'gabung'; kode: string; hero: string; nama: string; token: string }
  | { t: 'halo'; nama: string }
  | { t: 'ubah-slot'; hero?: string; aliansi?: number; tim?: TimPemain }
  | { t: 'keluar' }
  | { t: 'room'; kode: string; peran: 'host' | 'tamu'; tim: TimPemain; ringkas: RingkasRoom }
  | {
      t: 'mulai'
      seed: number
      tim: TimPemain
      heroBlue: string
      heroRed: string
      peta: JenisPeta
      goldAwal: number
      slot: SlotRoom[]
    }
  | { t: 'room-keluar'; pesan: string }
  | { t: 'lawan-putus'; detik: number; tim?: TimPemain }
  | { t: 'lawan-kembali' }
  | { t: 'lawan-menyerah' }
  | { t: 'galat'; pesan: string }

type PesanGame =
  | { t: 'cmd'; cmd: unknown }
  | { t: 'snapshot'; state: unknown }

interface SlotHost {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
  peerId: string | null
  token: string | null
}

interface PutusEntri {
  token: string
  indeksSlot: number
  sisaDetik: number
}

interface RoomHost {
  kode: string
  peta: JenisPeta
  goldAwal: number
  mulai: boolean
  slot: SlotHost[]
  putus: Map<string, PutusEntri>
}

interface EntriIklan {
  peerId: string
  ringkas: RingkasRoom
  waktu: number
}

export interface OpsiKlienP2p {
  pabrik?: PabrikRoomP2p
  acak?: (n: number) => number
  sekarang?: () => number
}

/**
 * Klien multiplayer P2P WebRTC murni tanpa server lokal (jalan langsung dari GitHub Pages
 * di HP maupun Desktop, baik satu Wi-Fi maupun beda jaringan/4G/5G).
 *
 * Host menjalankan pengatur room di browser-nya sendiri, menyiarkan iklan room ke ruang
 * lobi bersama agar muncul otomatis di daftar HP teman, lalu seluruh data room & game
 * mengalir langsung via WebRTC DataChannel.
 */
export class KlienP2p implements KlienMultiplayer {
  readonly mode = 'p2p' as const

  private pabrik: PabrikRoomP2p
  private acak: (n: number) => number
  private sekarang: () => number
  private tokenSaya: string
  private namaSaya = 'Pemain'
  private heroSaya: HeroId = 'king'

  private lobiRoom: RuangP2p | null = null
  private saluranLobi: SaluranP2p<PesanLobi> | null = null
  private iklanRoom = new Map<string, EntriIklan>()

  private ruangGame: RuangP2p | null = null
  private saluranKontrol: SaluranP2p<PesanKontrol> | null = null
  private saluranGame: SaluranP2p<PesanGame> | null = null

  private kodeRoom = ''
  private peranAktif: 'host' | 'tamu' | null = null
  private roomHost: RoomHost | null = null
  private hostPeerId: string | null = null
  private sedangMain = false

  private timerLobi: ReturnType<typeof setInterval> | null = null
  private timerDetak: ReturnType<typeof setInterval> | null = null
  private timerGabung: ReturnType<typeof setTimeout> | null = null

  constructor(private pendengar: PendengarLan, opsi: OpsiKlienP2p = {}) {
    this.pabrik = opsi.pabrik ?? buatPabrikTrystero()
    this.acak = opsi.acak ?? ((n) => Math.floor(Math.random() * n))
    this.sekarang = opsi.sekarang ?? (() => Date.now())
    this.tokenSaya = this.buatAcak(20)
  }

  get kode(): string {
    return this.kodeRoom
  }

  sambung(nama: string): void {
    this.namaSaya = this.bersihkanNama(nama)
    if (this.lobiRoom) return

    const lobi = this.pabrik(ROOM_LOBI_P2P)
    this.lobiRoom = lobi
    const saluran = lobi.buatSaluran<PesanLobi>('lobi')
    this.saluranLobi = saluran

    saluran.padaPesan((msg, peerId) => this.terimaPesanLobi(msg, peerId))
    lobi.padaPeerMasuk((peerId) => {
      if (this.roomHost && !this.roomHost.mulai) {
        saluran.kirim({ t: 'iklan', ringkas: this.ringkasHost(this.roomHost) }, peerId)
      } else {
        saluran.kirim({ t: 'minta' }, peerId)
      }
    })
    lobi.padaPeerKeluar((peerId) => {
      let berubah = false
      for (const [k, entri] of [...this.iklanRoom.entries()]) {
        if (entri.peerId === peerId) {
          this.iklanRoom.delete(k)
          berubah = true
        }
      }
      if (berubah) this.siarkanDaftarLokal()
    })

    void lobi.siap.then(() => {
      if (this.lobiRoom !== lobi) return
      this.pendengar.tersambung?.()
      this.siarkanDaftarLokal()
      saluran.kirim({ t: 'minta' })
    }).catch(() => {
      this.pendengar.galat?.('Gagal tersambung ke jaringan P2P Online — cek koneksi internet Anda')
    })

    this.timerLobi = setInterval(() => this.detakLobi(), INTERVAL_IKLAN_MS)
  }

  kirimNama(nama: string): void {
    const bersih = this.bersihkanNama(nama)
    this.namaSaya = bersih
    if (this.peranAktif === 'host' && this.roomHost && !this.roomHost.mulai) {
      const s = this.roomHost.slot[0]
      if (s) s.nama = bersih
      this.siarkanRoomHost()
      this.iklankanRoomHost()
    } else if (this.peranAktif === 'tamu' && this.hostPeerId && this.saluranKontrol) {
      this.saluranKontrol.kirim({ t: 'halo', nama: bersih }, this.hostPeerId)
    }
  }

  buatRoom(hero: string, opsi?: Partial<KonfigMatch>): void {
    if (this.ruangGame) this.keluar()
    this.heroSaya = hero as HeroId

    const peta: JenisPeta = opsi?.peta ?? 'klasik2'
    const goldAwal = jepitGoldAwal(opsi?.goldAwal ?? GOLD_AWAL_BAKU)
    const kode = this.buatKodeUnik()
    const slot = this.buatSlotHost(hero as HeroId, peta, opsi?.slot)

    const room: RoomHost = {
      kode,
      peta,
      goldAwal,
      mulai: false,
      slot,
      putus: new Map(),
    }

    this.kodeRoom = kode
    this.peranAktif = 'host'
    this.roomHost = room
    this.hostPeerId = null
    this.sedangMain = false

    const ruang = this.pabrik(`room-${kode}`)
    this.ruangGame = ruang
    const kontrol = ruang.buatSaluran<PesanKontrol>('kontrol')
    const game = ruang.buatSaluran<PesanGame>('game')
    this.saluranKontrol = kontrol
    this.saluranGame = game

    kontrol.padaPesan((msg, peerId) => this.terimaKontrolHost(msg, peerId))
    game.padaPesan((msg, peerId) => this.terimaGameHost(msg, peerId))
    ruang.padaPeerMasuk((peerId) => {
      // Sapa balik peer baru agar permintaan gabung langsung terkirim tanpa race condition.
      if (this.roomHost && !this.roomHost.mulai) {
        kontrol.kirim({ t: 'sapa-host', kode }, peerId)
      }
    })
    ruang.padaPeerKeluar((peerId) => this.peerKeluarHost(peerId))

    this.mulaiTimerDetak()
    this.siarkanRoomHost()
    this.iklankanRoomHost()
  }

  aturRoom(opsi: { peta?: JenisPeta; goldAwal?: number; slot?: KonfigSlot[] }): void {
    const room = this.roomHost
    if (!room || this.peranAktif !== 'host' || room.mulai) return

    if (opsi.peta && opsi.peta !== room.peta) {
      const info = INFO_PETA[opsi.peta]
      const baru: SlotHost[] = []
      for (let i = 0; i < info.maksPemain; i++) {
        const lama = room.slot[i]
        if (lama && lama.peerId) {
          baru.push({ ...lama, indeks: i })
        } else {
          baru.push({
            indeks: i,
            tim: info.warnaDefault[i]!,
            jenis: 'manusia',
            aliansi: i + 1,
            hero: 'champion',
            kesulitanAi: 'medium',
            nama: 'Terbuka (LAN)',
            peerId: null,
            token: null,
          })
        }
      }
      for (let i = info.maksPemain; i < room.slot.length; i++) {
        const lebih = room.slot[i]
        if (lebih?.peerId && lebih.peerId !== HOST_ID) {
          this.saluranKontrol?.kirim({ t: 'room-keluar', pesan: 'Host mengecilkan kapasitas peta' }, lebih.peerId)
        }
      }
      room.peta = opsi.peta
      room.slot = baru
    }

    if (opsi.goldAwal !== undefined) {
      room.goldAwal = jepitGoldAwal(opsi.goldAwal)
    }

    if (opsi.slot && opsi.slot.length > 0) {
      const dipakai = new Set<TimPemain>()
      for (let i = 0; i < room.slot.length; i++) {
        const cur = room.slot[i]!
        const incoming = opsi.slot.find((s) => s.indeks === i) ?? opsi.slot[i]
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

        if (!cur.peerId) {
          cur.jenis = i === 0 ? 'manusia' : incoming.jenis
          cur.hero = incoming.hero
          cur.nama = cur.jenis === 'ai'
            ? `AI ${cur.tim.toUpperCase()}`
            : cur.jenis === 'kosong' ? 'Kosong' : 'Terbuka (LAN)'
        } else if (i === 0) {
          cur.hero = incoming.hero
          this.heroSaya = incoming.hero
        }
      }
    }

    this.siarkanRoomHost()
    this.iklankanRoomHost()
  }

  ubahSlot(opsi: { hero?: string; aliansi?: number; tim?: TimPemain }): void {
    if (this.peranAktif !== 'tamu' || !this.hostPeerId || !this.saluranKontrol) return
    if (opsi.hero) this.heroSaya = opsi.hero as HeroId
    this.saluranKontrol.kirim({ t: 'ubah-slot', ...opsi }, this.hostPeerId)
  }

  gabung(kodeMentah: string, hero: string): void {
    const kode = kodeMentah.trim().toUpperCase()
    if (!kode) {
      this.pendengar.galat?.('Masukkan kode room dulu')
      return
    }
    this.heroSaya = hero as HeroId

    // Idempoten: jika sudah berada di room yang sama, cukup kirim ulang permintaan sinkron.
    if (this.peranAktif === 'tamu' && this.kodeRoom === kode && this.hostPeerId && this.saluranKontrol) {
      this.saluranKontrol.kirim(
        { t: 'gabung', kode, hero: this.heroSaya, nama: this.namaSaya, token: this.tokenSaya },
        this.hostPeerId,
      )
      return
    }

    if (this.ruangGame) this.keluar()

    this.kodeRoom = kode
    this.peranAktif = 'tamu'
    this.hostPeerId = null
    this.sedangMain = false

    const ruang = this.pabrik(`room-${kode}`)
    this.ruangGame = ruang
    const kontrol = ruang.buatSaluran<PesanKontrol>('kontrol')
    const game = ruang.buatSaluran<PesanGame>('game')
    this.saluranKontrol = kontrol
    this.saluranGame = game

    const kirimGabungKe = (peerId: string) => {
      if (this.hostPeerId && this.hostPeerId !== peerId) return
      kontrol.kirim(
        { t: 'gabung', kode, hero: this.heroSaya, nama: this.namaSaya, token: this.tokenSaya },
        peerId,
      )
    }

    kontrol.padaPesan((msg, peerId) => this.terimaKontrolTamu(msg, peerId, kirimGabungKe))
    game.padaPesan((msg) => {
      if (msg.t === 'snapshot') this.pendengar.snapshot?.(msg.state)
    })
    ruang.padaPeerMasuk((peerId) => kirimGabungKe(peerId))
    ruang.padaPeerKeluar((peerId) => {
      if (peerId !== this.hostPeerId) return
      if (!this.sedangMain) {
        this.bersihkanRuangGame()
        this.pendengar.roomKeluar?.('Host menutup room atau terputus')
      } else {
        this.pendengar.lawanPutus?.(PAPAN.graceDetik)
      }
    })

    for (const p of ruang.daftarPeer()) kirimGabungKe(p)

    this.bersihkanTimerGabung()
    this.timerGabung = setTimeout(() => {
      if (this.peranAktif === 'tamu' && !this.hostPeerId && this.kodeRoom === kode) {
        this.bersihkanRuangGame()
        this.pendengar.galat?.(`Room "${kode}" tidak ditemukan atau Host gagal dihubungi. Cek kode & jaringan.`)
      }
    }, BATAS_GABUNG_MS)
  }

  keluar(): void {
    if (this.peranAktif === 'host' && this.roomHost) {
      const kodeLama = this.roomHost.kode
      for (const s of this.roomHost.slot) {
        if (s.peerId && s.peerId !== HOST_ID) {
          this.saluranKontrol?.kirim({ t: 'room-keluar', pesan: 'Host menutup room' }, s.peerId)
        }
      }
      this.saluranLobi?.kirim({ t: 'tutup', kode: kodeLama })
    } else if (this.peranAktif === 'tamu' && this.hostPeerId && this.saluranKontrol) {
      this.saluranKontrol.kirim({ t: 'keluar' }, this.hostPeerId)
    }
    this.bersihkanRuangGame()
  }

  mulai(): void {
    const room = this.roomHost
    if (!room || this.peranAktif !== 'host') return

    const aktif = room.slot.filter((s) => (s.jenis === 'manusia' && s.peerId !== null) || s.jenis === 'ai')
    if (aktif.length < 2) {
      this.pendengar.galat?.('Menunggu pemain kedua bergabung atau tambahkan AI')
      return
    }
    const aliansiUnik = new Set(aktif.map((s) => s.aliansi))
    if (aliansiUnik.size < 2) {
      this.pendengar.galat?.('Minimal harus ada 2 pihak/aliansi yang saling berlawanan')
      return
    }

    room.mulai = true
    this.sedangMain = true
    this.saluranLobi?.kirim({ t: 'tutup', kode: room.kode })

    const seed = this.acak(1_000_000)
    const hostSlot = room.slot[0]!
    const redSlot = room.slot.find((s) => s.tim === 'red') ?? room.slot[1] ?? hostSlot
    const slotKirim: SlotRoom[] = room.slot.map((s) => ({
      indeks: s.indeks,
      tim: s.tim,
      jenis: s.jenis === 'manusia' && !s.peerId ? 'kosong' : s.jenis,
      aliansi: s.aliansi,
      hero: s.hero,
      kesulitanAi: s.kesulitanAi,
      nama: s.nama,
      terisi: (s.jenis === 'manusia' && s.peerId !== null) || s.jenis === 'ai',
    }))

    for (const s of room.slot) {
      if (!s.peerId || s.peerId === HOST_ID) continue
      this.saluranKontrol?.kirim(
        {
          t: 'mulai',
          seed,
          tim: s.tim,
          heroBlue: hostSlot.hero,
          heroRed: redSlot.hero,
          peta: room.peta,
          goldAwal: room.goldAwal,
          slot: slotKirim,
        },
        s.peerId,
      )
    }

    this.pendengar.mulai?.(seed, hostSlot.tim, hostSlot.hero, redSlot.hero, {
      peta: room.peta,
      goldAwal: room.goldAwal,
      slot: slotKirim,
    })
  }

  sambungUlang(): void {
    if (this.peranAktif === 'tamu' && this.kodeRoom && this.hostPeerId && this.saluranKontrol) {
      this.saluranKontrol.kirim(
        { t: 'gabung', kode: this.kodeRoom, hero: this.heroSaya, nama: this.namaSaya, token: this.tokenSaya },
        this.hostPeerId,
      )
    }
  }

  kirimCmd(cmd: unknown): void {
    if (this.peranAktif !== 'tamu' || !this.hostPeerId || !this.saluranGame) return
    this.saluranGame.kirim({ t: 'cmd', cmd }, this.hostPeerId)
  }

  kirimSnapshot(state: unknown, untuk?: TimPemain): void {
    const room = this.roomHost
    if (this.peranAktif !== 'host' || !room || !this.saluranGame) return
    if (untuk) {
      const target = room.slot.find((s) => s.tim === untuk && s.peerId && s.peerId !== HOST_ID)
      if (target?.peerId) {
        this.saluranGame.kirim({ t: 'snapshot', state }, target.peerId)
      }
      return
    }
    for (const s of room.slot) {
      if (s.peerId && s.peerId !== HOST_ID) {
        this.saluranGame.kirim({ t: 'snapshot', state }, s.peerId)
      }
    }
  }

  tutup(): void {
    this.keluar()
    if (this.timerLobi !== null) {
      clearInterval(this.timerLobi)
      this.timerLobi = null
    }
    this.lobiRoom?.keluar()
    this.lobiRoom = null
    this.saluranLobi = null
    this.iklanRoom.clear()
  }

  // -------------------------------------------------------------------------
  // Penangan internal
  // -------------------------------------------------------------------------

  private terimaPesanLobi(msg: PesanLobi, peerId: string): void {
    if (msg.t === 'minta') {
      if (this.roomHost && !this.roomHost.mulai) {
        this.saluranLobi?.kirim({ t: 'iklan', ringkas: this.ringkasHost(this.roomHost) }, peerId)
      }
      return
    }
    if (msg.t === 'tutup') {
      if (this.iklanRoom.delete(msg.kode)) this.siarkanDaftarLokal()
      return
    }
    if (msg.t === 'iklan') {
      if (msg.ringkas.kode === this.kodeRoom) return
      if (msg.ringkas.mulai) {
        if (this.iklanRoom.delete(msg.ringkas.kode)) this.siarkanDaftarLokal()
        return
      }
      this.iklanRoom.set(msg.ringkas.kode, { peerId, ringkas: msg.ringkas, waktu: this.sekarang() })
      this.siarkanDaftarLokal()
    }
  }

  private detakLobi(): void {
    if (this.roomHost && !this.roomHost.mulai) {
      this.iklankanRoomHost()
    }
    const kini = this.sekarang()
    let berubah = false
    for (const [k, entri] of [...this.iklanRoom.entries()]) {
      if (kini - entri.waktu > BATAS_BASI_IKLAN_MS) {
        this.iklanRoom.delete(k)
        berubah = true
      }
    }
    if (berubah) this.siarkanDaftarLokal()
  }

  private siarkanDaftarLokal(): void {
    const daftar = [...this.iklanRoom.values()]
      .map((e) => e.ringkas)
      .sort((a, b) => a.kode.localeCompare(b.kode))
    this.pendengar.daftar?.(daftar)
  }

  private iklankanRoomHost(): void {
    if (!this.roomHost || this.roomHost.mulai || !this.saluranLobi) return
    this.saluranLobi.kirim({ t: 'iklan', ringkas: this.ringkasHost(this.roomHost) })
  }

  private terimaKontrolHost(msg: PesanKontrol, peerId: string): void {
    const room = this.roomHost
    if (!room) return

    if (msg.t === 'gabung') {
      if (msg.kode !== room.kode) return

      // Sambung ulang tamu yang sempat putus di tengah match
      const entriPutus = room.putus.get(msg.token)
      if (entriPutus) {
        const slot = room.slot.find((s) => s.indeks === entriPutus.indeksSlot)
        if (slot) {
          room.putus.delete(msg.token)
          slot.peerId = peerId
          slot.token = msg.token
          const ringkas = this.ringkasHost(room)
          this.saluranKontrol?.kirim({ t: 'room', kode: room.kode, peran: 'tamu', tim: slot.tim, ringkas }, peerId)
          if (room.putus.size === 0) {
            this.pendengar.lawanKembali?.()
            for (const s of room.slot) {
              if (s.peerId && s.peerId !== HOST_ID && s.peerId !== peerId) {
                this.saluranKontrol?.kirim({ t: 'lawan-kembali' }, s.peerId)
              }
            }
          }
          return
        }
      }

      // Idempoten: peer sudah terdaftar di room ini
      const sudahAda = room.slot.find((s) => s.peerId === peerId)
      if (sudahAda) {
        sudahAda.nama = this.bersihkanNama(msg.nama)
        sudahAda.hero = msg.hero as HeroId
        this.siarkanRoomHost()
        this.iklankanRoomHost()
        return
      }

      if (room.mulai) {
        this.saluranKontrol?.kirim({ t: 'galat', pesan: `Room "${room.kode}" sedang bermain` }, peerId)
        return
      }

      const slotKosong = room.slot.find((s) => s.indeks > 0 && s.jenis === 'manusia' && s.peerId === null)
      if (!slotKosong) {
        this.saluranKontrol?.kirim(
          { t: 'galat', pesan: `Room "${room.kode}" sudah penuh (tidak ada slot terbuka)` },
          peerId,
        )
        return
      }

      slotKosong.peerId = peerId
      slotKosong.token = msg.token
      slotKosong.nama = this.bersihkanNama(msg.nama)
      slotKosong.hero = msg.hero as HeroId
      this.siarkanRoomHost()
      this.iklankanRoomHost()
      return
    }

    if (msg.t === 'halo' && !room.mulai) {
      const s = room.slot.find((x) => x.peerId === peerId)
      if (!s) return
      s.nama = this.bersihkanNama(msg.nama)
      this.siarkanRoomHost()
      this.iklankanRoomHost()
      return
    }

    if (msg.t === 'ubah-slot' && !room.mulai) {
      const cur = room.slot.find((x) => x.peerId === peerId)
      if (!cur) return
      if (msg.hero) cur.hero = msg.hero as HeroId
      if (msg.aliansi !== undefined) cur.aliansi = Math.max(1, Math.min(6, Math.floor(msg.aliansi)))
      if (msg.tim && msg.tim !== cur.tim) {
        const lain = room.slot.find((x) => x.tim === msg.tim)
        if (lain) lain.tim = cur.tim
        cur.tim = msg.tim
      }
      this.siarkanRoomHost()
      this.iklankanRoomHost()
      return
    }

    if (msg.t === 'keluar') {
      this.peerKeluarHost(peerId)
    }
  }

  private terimaGameHost(msg: PesanGame, peerId: string): void {
    const room = this.roomHost
    if (!room || msg.t !== 'cmd') return
    const pengirim = room.slot.find((s) => s.peerId === peerId)
    if (!pengirim) return
    this.pendengar.cmd?.(pengirim.tim, msg.cmd)
  }

  private peerKeluarHost(peerId: string): void {
    const room = this.roomHost
    if (!room) return
    const slot = room.slot.find((s) => s.peerId === peerId)
    if (!slot) return

    if (!room.mulai) {
      slot.peerId = null
      slot.token = null
      slot.nama = 'Terbuka (LAN)'
      this.siarkanRoomHost()
      this.iklankanRoomHost()
      return
    }

    const tok = slot.token ?? peerId
    slot.peerId = null
    room.putus.set(tok, { token: tok, indeksSlot: slot.indeks, sisaDetik: PAPAN.graceDetik })
    this.pendengar.lawanPutus?.(PAPAN.graceDetik)
    for (const s of room.slot) {
      if (s.peerId && s.peerId !== HOST_ID) {
        this.saluranKontrol?.kirim({ t: 'lawan-putus', detik: PAPAN.graceDetik, tim: slot.tim }, s.peerId)
      }
    }
  }

  private mulaiTimerDetak(): void {
    if (this.timerDetak !== null) clearInterval(this.timerDetak)
    this.timerDetak = setInterval(() => {
      const room = this.roomHost
      if (!room || !room.mulai || room.putus.size === 0) return

      for (const [tok, entri] of [...room.putus.entries()]) {
        entri.sisaDetik -= 1
        if (entri.sisaDetik > 0) continue

        room.putus.delete(tok)
        const manusiaAktif = room.slot.filter((s) => s.jenis === 'manusia' && s.peerId !== null)
        const adaAi = room.slot.some((s) => s.jenis === 'ai')

        if (manusiaAktif.length <= 1 && !adaAi && room.putus.size === 0) {
          this.pendengar.lawanMenyerah?.()
          return
        }
        const slotKeluar = room.slot.find((s) => s.indeks === entri.indeksSlot)
        if (slotKeluar) {
          this.pendengar.cmd?.(slotKeluar.tim, { jenis: 'menyerah' })
        }
        this.pendengar.lawanKembali?.()
        for (const s of manusiaAktif) {
          if (s.peerId && s.peerId !== HOST_ID) {
            this.saluranKontrol?.kirim({ t: 'lawan-kembali' }, s.peerId)
          }
        }
      }
    }, 1000)
  }

  private terimaKontrolTamu(msg: PesanKontrol, peerId: string, kirimGabungKe: (id: string) => void): void {
    switch (msg.t) {
      case 'sapa-host':
        if (!this.hostPeerId && msg.kode === this.kodeRoom) kirimGabungKe(peerId)
        break
      case 'room':
        this.bersihkanTimerGabung()
        this.hostPeerId = peerId
        this.kodeRoom = msg.kode
        this.pendengar.room?.(msg.kode, 'tamu', msg.tim, msg.ringkas)
        break
      case 'mulai':
        this.sedangMain = true
        this.pendengar.mulai?.(msg.seed, msg.tim, msg.heroBlue, msg.heroRed, {
          peta: msg.peta,
          goldAwal: msg.goldAwal,
          slot: msg.slot,
        })
        break
      case 'room-keluar':
        this.bersihkanRuangGame()
        this.pendengar.roomKeluar?.(msg.pesan)
        break
      case 'galat':
        this.bersihkanTimerGabung()
        if (!this.hostPeerId) this.bersihkanRuangGame()
        this.pendengar.galat?.(msg.pesan)
        break
      case 'lawan-putus':
        this.pendengar.lawanPutus?.(msg.detik)
        break
      case 'lawan-kembali':
        this.pendengar.lawanKembali?.()
        break
      case 'lawan-menyerah':
        this.pendengar.lawanMenyerah?.()
        break
    }
  }

  private ringkasHost(room: RoomHost): RingkasRoom {
    const jumlahManusia = room.slot.filter((s) => s.jenis === 'manusia' && s.peerId !== null).length
    const jumlahAi = room.slot.filter((s) => s.jenis === 'ai').length
    const slotTerbuka = room.slot.filter((s) => s.indeks > 0 && s.jenis === 'manusia' && s.peerId === null).length
    const tamu = room.slot.find((s) => s.peerId !== null && s.peerId !== HOST_ID)

    const slot: SlotRoom[] = room.slot.map((s) => ({
      indeks: s.indeks,
      tim: s.tim,
      jenis: s.jenis,
      aliansi: s.aliansi,
      hero: s.hero,
      kesulitanAi: s.kesulitanAi,
      nama: s.nama,
      terisi: (s.jenis === 'manusia' && s.peerId !== null) || s.jenis === 'ai',
    }))

    return {
      kode: room.kode,
      hostNama: room.slot[0]?.nama ?? this.namaSaya,
      tamuNama: tamu?.nama ?? null,
      jumlah: Math.max(1, jumlahManusia + jumlahAi),
      jumlahManusia,
      slotTerbuka,
      maksPemain: INFO_PETA[room.peta].maksPemain,
      mulai: room.mulai,
      peta: room.peta,
      goldAwal: room.goldAwal,
      slot,
    }
  }

  private siarkanRoomHost(): void {
    const room = this.roomHost
    if (!room) return
    const ringkas = this.ringkasHost(room)
    const hostSlot = room.slot[0]!
    this.pendengar.room?.(room.kode, 'host', hostSlot.tim, ringkas)

    for (const s of room.slot) {
      if (!s.peerId || s.peerId === HOST_ID) continue
      this.saluranKontrol?.kirim(
        { t: 'room', kode: room.kode, peran: 'tamu', tim: s.tim, ringkas },
        s.peerId,
      )
    }
  }

  private buatSlotHost(hero: HeroId, peta: JenisPeta, masuk?: KonfigSlot[]): SlotHost[] {
    const info = INFO_PETA[peta]
    const hasil: SlotHost[] = []
    const dipakai = new Set<TimPemain>()

    for (let i = 0; i < info.maksPemain; i++) {
      const m = masuk?.[i]
      let tim: TimPemain = m?.tim ?? info.warnaDefault[i]!
      if (dipakai.has(tim)) tim = TIM_PEMAIN.find((c) => !dipakai.has(c)) ?? tim
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
        nama: i === 0
          ? this.namaSaya
          : jenis === 'ai' ? `AI ${tim.toUpperCase()}` : jenis === 'kosong' ? 'Kosong' : 'Terbuka (LAN)',
        peerId: i === 0 ? HOST_ID : null,
        token: i === 0 ? this.tokenSaya : null,
      })
    }
    return hasil
  }

  private bersihkanTimerGabung(): void {
    if (this.timerGabung !== null) {
      clearTimeout(this.timerGabung)
      this.timerGabung = null
    }
  }

  private bersihkanRuangGame(): void {
    this.bersihkanTimerGabung()
    if (this.timerDetak !== null) {
      clearInterval(this.timerDetak)
      this.timerDetak = null
    }
    this.ruangGame?.keluar()
    this.ruangGame = null
    this.saluranKontrol = null
    this.saluranGame = null
    this.kodeRoom = ''
    this.peranAktif = null
    this.roomHost = null
    this.hostPeerId = null
    this.sedangMain = false
  }

  private buatKodeUnik(): string {
    for (let i = 0; i < 32; i++) {
      const k = this.buatAcak(PAPAN.panjangKode)
      if (!this.iklanRoom.has(k)) return k
    }
    return this.buatAcak(PAPAN.panjangKode)
  }

  private buatAcak(panjang: number): string {
    let s = ''
    for (let i = 0; i < panjang; i++) s += ALFABET[this.acak(ALFABET.length)]
    return s
  }

  private bersihkanNama(nama: string): string {
    return nama.trim().slice(0, 18) || 'Pemain'
  }
}
