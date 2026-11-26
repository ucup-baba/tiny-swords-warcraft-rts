import { PETA_BARIS, PETA_KOLOM, TINGGI, encodeRle, type DataPetaCustom } from '@hftf/shared'
import { describe, expect, it, vi } from 'vitest'
import { KlienP2p, type PabrikRoomP2p, type RuangP2p, type SaluranP2p } from '../src/p2p.js'
import type { MulaiLanInfo, PendengarLan, RingkasRoom } from '../src/lan.js'

/** Jaringan P2P in-memory deterministik untuk menguji KlienP2p tanpa WebRTC asli. */
class JaringanP2pSemu {
  private ruangan = new Map<string, Map<string, NodeRuang>>()

  pabrikUntuk(peerId: string): PabrikRoomP2p {
    const ruangan = this.ruangan
    return (roomId: string): RuangP2p => {
      let anggota = ruangan.get(roomId)
      if (!anggota) {
        anggota = new Map()
        ruangan.set(roomId, anggota)
      }
      const node: NodeRuang = {
        peerId,
        saluran: new Map(),
        masuk: [],
        keluar: [],
      }
      const sudahAda = [...anggota.entries()]
      anggota.set(peerId, node)

      // Beri tahu peer yang sudah ada dan peer baru secara asinkron (setelah listener terpasang)
      queueMicrotask(() => {
        if (!anggota!.has(peerId)) return
        for (const [idLain, nodeLain] of sudahAda) {
          if (!anggota!.has(idLain)) continue
          for (const fn of nodeLain.masuk) fn(peerId)
          for (const fn of node.masuk) fn(idLain)
        }
      })

      return {
        siap: Promise.resolve(),
        buatSaluran<T>(nama: string): SaluranP2p<T> {
          const daftarFn: ((data: T, dari: string) => void)[] = []
          node.saluran.set(nama, daftarFn as ((data: unknown, dari: string) => void)[])
          return {
            kirim: (data, target) => {
              const grup = ruangan.get(roomId)
              if (!grup) return
              const klon = JSON.parse(JSON.stringify(data)) as T
              for (const [idTujuan, tujuan] of grup.entries()) {
                if (idTujuan === peerId) continue
                if (target && idTujuan !== target) continue
                const fns = tujuan.saluran.get(nama)
                if (fns) for (const fn of fns) fn(klon, peerId)
              }
            },
            padaPesan: (fn) => {
              daftarFn.push(fn)
            },
          }
        },
        padaPeerMasuk: (fn) => {
          node.masuk.push(fn)
        },
        padaPeerKeluar: (fn) => {
          node.keluar.push(fn)
        },
        daftarPeer: () => [...(ruangan.get(roomId)?.keys() ?? [])].filter((id) => id !== peerId),
        keluar: () => {
          const grup = ruangan.get(roomId)
          if (!grup || !grup.delete(peerId)) return
          for (const [, lain] of grup.entries()) {
            for (const fn of lain.keluar) fn(peerId)
          }
        },
      }
    }
  }
}

interface NodeRuang {
  peerId: string
  saluran: Map<string, ((data: unknown, dari: string) => void)[]>
  masuk: ((peerId: string) => void)[]
  keluar: ((peerId: string) => void)[]
}

const flush = () => new Promise<void>((r) => setTimeout(r, 10))

describe('KlienP2p — Multiplayer Serverless WebRTC (2–6 Pemain tanpa Server Lokal)', () => {
  it('Host buat room -> muncul otomatis di daftar lobi Tamu, gabung idempoten, sinkron hero, mulai dengan seed sama, & kirim cmd/snapshot', async () => {
    const net = new JaringanP2pSemu()
    let urut = 1
    const acak = (n: number) => (urut++ * 7) % n

    let daftarTamu: RingkasRoom[] = []
    let roomHost: { kode: string; ringkas: RingkasRoom } | null = null
    let roomTamu: { kode: string; tim: string; ringkas: RingkasRoom } | null = null
    let mulaiHost: { seed: number; tim: string; info?: MulaiLanInfo } | null = null
    let mulaiTamu: { seed: number; tim: string; info?: MulaiLanInfo } | null = null
    const galatTamu = vi.fn()
    const cmdDiterima = vi.fn()
    const snapDiterima = vi.fn()

    const host = new KlienP2p(
      {
        room: (kode, _peran, _tim, ringkas) => { roomHost = { kode, ringkas } },
        mulai: (seed, tim, _hb, _hr, info) => { mulaiHost = { seed, tim, ...(info ? { info } : {}) } },
        cmd: cmdDiterima,
      },
      { pabrik: net.pabrikUntuk('peer-host'), acak },
    )

    const tamu = new KlienP2p(
      {
        daftar: (d) => { daftarTamu = d },
        room: (kode, _peran, tim, ringkas) => { roomTamu = { kode, tim, ringkas } },
        mulai: (seed, tim, _hb, _hr, info) => { mulaiTamu = { seed, tim, ...(info ? { info } : {}) } },
        snapshot: snapDiterima,
        galat: galatTamu,
      },
      { pabrik: net.pabrikUntuk('peer-tamu'), acak },
    )

    host.sambung('HostHP')
    tamu.sambung('TamuHP')
    await flush()

    // Host membuat room 4P (Pulau Salib, Gold 750)
    host.buatRoom('king', { peta: 'salib4', goldAwal: 750 })
    await flush()

    expect(roomHost).not.toBeNull()
    const kode = roomHost!.kode
    expect(kode).toHaveLength(5)
    expect(daftarTamu).toHaveLength(1)
    expect(daftarTamu[0]!.kode).toBe(kode)
    expect(daftarTamu[0]!.hostNama).toBe('HostHP')
    expect(daftarTamu[0]!.slotTerbuka).toBe(3)
    expect(daftarTamu[0]!.goldAwal).toBe(750)

    // Tamu tap 2x (double-tap HP) -> tetap masuk mulus tanpa galat "penuh"
    tamu.gabung(kode, 'knight')
    await flush()
    tamu.gabung(kode, 'knight')
    await flush()

    expect(galatTamu).not.toHaveBeenCalled()
    expect(roomTamu!.kode).toBe(kode)
    expect(roomTamu!.tim).toBe('red')
    expect(roomTamu!.ringkas.slot[0]!.nama).toBe('HostHP')
    expect(roomTamu!.ringkas.slot[1]!.nama).toBe('TamuHP')

    // Tamu ubah Hero & Aliansi -> Host langsung menerima pembaruan
    tamu.ubahSlot({ hero: 'berserker', aliansi: 2 })
    await flush()
    expect(roomHost!.ringkas.slot[1]!.hero).toBe('berserker')

    // Host memulai match -> seed identik, iklan room hilang dari daftar lobi
    host.mulai()
    await flush()
    expect(mulaiHost!.seed).toBe(mulaiTamu!.seed)
    expect(mulaiHost!.tim).toBe('blue')
    expect(mulaiTamu!.tim).toBe('red')
    expect(mulaiTamu!.info?.peta).toBe('salib4')
    expect(mulaiTamu!.info?.goldAwal).toBe(750)
    expect(daftarTamu).toHaveLength(0)

    // Lalu lintas gameplay P2P (cmd Tamu -> Host, snapshot Host -> Tamu)
    tamu.kirimCmd({ jenis: 'stop', ids: [1] })
    host.kirimSnapshot({ tick: 42 }, 'red')
    expect(cmdDiterima).toHaveBeenCalledWith('red', { jenis: 'stop', ids: [1] })
    expect(snapDiterima).toHaveBeenCalledWith({ tick: 42 })

    host.tutup()
    tamu.tutup()
  })

  it('mendukung 6 pemain di Kepulauan Bintang, menolak pemain ke-7, & mengirim roomKeluar saat Host menutup room', async () => {
    const net = new JaringanP2pSemu()
    let urut = 3
    const acak = (n: number) => (urut++ * 5) % n

    let kodeRoom = ''
    const host = new KlienP2p(
      { room: (k) => { kodeRoom = k } },
      { pabrik: net.pabrikUntuk('h'), acak },
    )
    host.sambung('Raja')
    host.buatRoom('king', { peta: 'bintang6', goldAwal: 1000 })
    await flush()

    const keluarCallbacks: ReturnType<typeof vi.fn>[] = []
    const paraTamu: KlienP2p[] = []
    for (let i = 1; i <= 5; i++) {
      const onKeluar = vi.fn()
      keluarCallbacks.push(onKeluar)
      const pendengar: PendengarLan = { roomKeluar: onKeluar }
      const t = new KlienP2p(pendengar, { pabrik: net.pabrikUntuk(`t${i}`), acak })
      t.sambung(`Teman${i}`)
      t.gabung(kodeRoom, 'knight')
      paraTamu.push(t)
    }
    await flush()

    // Pemain ke-7 ditolak karena 6/6 penuh
    const galat7 = vi.fn()
    const t7 = new KlienP2p({ galat: galat7 }, { pabrik: net.pabrikUntuk('t7'), acak })
    t7.sambung('Telat')
    t7.gabung(kodeRoom, 'king')
    await flush()
    expect(galat7).toHaveBeenCalled()

    // Host menutup room -> semua tamu menerima roomKeluar
    host.keluar()
    await flush()
    for (const fn of keluarCallbacks) expect(fn).toHaveBeenCalledWith('Host menutup room')

    host.tutup()
    for (const t of paraTamu) t.tutup()
    t7.tutup()
  })

  it('menyinkronkan peta custom 4P ke tamu tanpa mengirim RLE berat pada iklan daftar lobi', async () => {
    const net = new JaringanP2pSemu()
    let urut = 5
    const acak = (n: number) => (urut++ * 11) % n
    const total = PETA_KOLOM * PETA_BARIS
    const custom4: DataPetaCustom = {
      versi: 1,
      id: 'p2p-custom-4p',
      nama: 'Pulau P2P 4P',
      bioma: 5,
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggiRle: encodeRle(new Uint8Array(total).fill(TINGGI.dataran)),
      rampRle: encodeRle(new Uint8Array(total)),
      jembatanRle: encodeRle(new Uint8Array(total)),
      jalanRle: encodeRle(new Uint8Array(total)),
      entitas: {
        spawn: [
          { slot: 0, tx: 14, ty: 14 },
          { slot: 1, tx: 80, ty: 14 },
          { slot: 2, tx: 14, ty: 80 },
          { slot: 3, tx: 80, ty: 80 },
        ],
        pohon: [],
        tambang: [{ tx: 18, ty: 16, jenis: 'mine', gold: 3000 }],
        domba: [],
        camp: [],
        deko: [],
        bangunan: [],
        bonus: [],
      },
      diubahPada: 1_700_000_000_000,
    }

    let daftarTamu: RingkasRoom[] = []
    let roomTamu: RingkasRoom | null = null
    let mulaiTamu: MulaiLanInfo | undefined
    let kode = ''

    const host = new KlienP2p(
      { room: (k) => { kode = k } },
      { pabrik: net.pabrikUntuk('p-h'), acak },
    )
    const tamu = new KlienP2p(
      {
        daftar: (d) => { daftarTamu = d },
        room: (_k, _p, _t, ringkas) => { roomTamu = ringkas },
        mulai: (_s, _t, _hb, _hr, info) => { mulaiTamu = info },
      },
      { pabrik: net.pabrikUntuk('p-t'), acak },
    )

    host.sambung('Host')
    tamu.sambung('Tamu')
    await flush()

    host.buatRoom('king', { peta: 'klasik2', petaCustom: custom4, goldAwal: 500 })
    await flush()

    expect(daftarTamu).toHaveLength(1)
    expect(daftarTamu[0]!.maksPemain).toBe(4)
    expect(daftarTamu[0]!.namaPetaCustom).toBe('Pulau P2P 4P')
    expect(daftarTamu[0]!.petaCustom).toBeUndefined()

    tamu.gabung(kode, 'knight')
    await flush()

    expect(roomTamu).not.toBeNull()
    expect(roomTamu!.petaCustom?.id).toBe('p2p-custom-4p')
    expect(roomTamu!.petaCustom?.bioma).toBe(5)

    host.mulai()
    await flush()

    expect(mulaiTamu?.petaCustom?.id).toBe('p2p-custom-4p')

    host.tutup()
    tamu.tutup()
  })
})
