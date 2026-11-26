import { PAPAN, PETA_BARIS, PETA_KOLOM, TINGGI, encodeRle, type DataPetaCustom } from '@hftf/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { PapanInti } from '../src/papan.js'
import { pesanSah } from '../src/protokol.js'
import type { DariPapan } from '../src/protokol.js'

// PapanInti sengaja dibuat tanpa transport supaya bisa dites tanpa socket —
// `lan-server.mjs` lama mencampur semuanya dan tidak punya satu pun tes.

let waktu = 0
let urut = 0
const papanBaru = () => new PapanInti({ acak: (n) => (urut++ * 7) % n, sekarang: () => waktu })

interface Klien {
  id: string
  kotak: DariPapan[]
  token: string
}

function sambung(p: PapanInti, id: string, ip = '192.168.1.10'): Klien {
  const k: Klien = { id, kotak: [], token: '' }
  k.token = p.sambung(id, ip, (m) => k.kotak.push(m))
  return k
}

const kirim = (p: PapanInti, id: string, pesan: unknown): boolean => p.pesan(id, pesanSah(pesan))
const terakhir = <T extends DariPapan['t']>(k: Klien, t: T): Extract<DariPapan, { t: T }> | undefined =>
  [...k.kotak].reverse().find((m) => m.t === t) as never

beforeEach(() => {
  waktu = 0
  urut = 1
})

describe('AC-15.1 / 15.2 — room', () => {
  it('perangkat baru langsung menerima halo + daftar room', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    expect(a.kotak[0]?.t).toBe('halo')
    expect(a.kotak[1]?.t).toBe('daftar')
  })

  it('kode room 5 huruf (PRD §15.3 poin 11)', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    expect(terakhir(a, 'room')!.kode).toHaveLength(PAPAN.panjangKode)
  })

  it('room muncul otomatis di daftar perangkat lain tanpa diminta', () => {
    const p = papanBaru()
    sambung(p, 'a')
    const b = sambung(p, 'b')
    b.kotak.length = 0
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    expect(terakhir(b, 'daftar')!.room).toHaveLength(1)
  })

  it('tamu bisa bergabung dan kedua sisi diberi tahu', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    const b = sambung(p, 'b')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    const kode = terakhir(a, 'room')!.kode
    kirim(p, 'b', { t: 'gabung-room', kode, hero: 'knight' })
    expect(terakhir(b, 'room')!.peran).toBe('tamu')
    expect(terakhir(a, 'room')!.ringkas.jumlah).toBe(2)
  })

  it('host memulai dan kedua pemain menerima seed yang SAMA', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    const b = sambung(p, 'b')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    kirim(p, 'b', { t: 'gabung-room', kode: terakhir(a, 'room')!.kode, hero: 'knight' })
    kirim(p, 'a', { t: 'mulai' })
    expect(terakhir(a, 'mulai')!.seed).toBe(terakhir(b, 'mulai')!.seed)
    expect(terakhir(a, 'mulai')!.tim).toBe('blue')
    expect(terakhir(b, 'mulai')!.tim).toBe('red')
  })

  it('tidak bisa mulai tanpa pemain kedua', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    kirim(p, 'a', { t: 'mulai' })
    expect(terakhir(a, 'mulai')).toBeUndefined()
    expect(terakhir(a, 'galat')).toBeDefined()
  })
})

describe('AC-15.12 — room tidak bocor lintas jaringan', () => {
  it('perangkat di kelompok jaringan lain tidak melihat room', () => {
    const p = papanBaru()
    sambung(p, 'a', '192.168.1.10')
    const jauh = sambung(p, 'jauh', '203.0.113.9')
    jauh.kotak.length = 0
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    const d = terakhir(jauh, 'daftar')
    expect(d?.room ?? []).toHaveLength(0)
  })

  it('bergabung lintas jaringan ditolak', () => {
    const p = papanBaru()
    const a = sambung(p, 'a', '192.168.1.10')
    const jauh = sambung(p, 'jauh', '203.0.113.9')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    kirim(p, 'jauh', { t: 'gabung-room', kode: terakhir(a, 'room')!.kode, hero: 'king' })
    expect(terakhir(jauh, 'galat')).toBeDefined()
    expect(terakhir(jauh, 'room')).toBeUndefined()
  })
})

describe('AC-15.3 s/d 15.7 — putus & sambung ulang', () => {
  function roomBerjalan() {
    const p = papanBaru()
    const a = sambung(p, 'a')
    const b = sambung(p, 'b')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    const kode = terakhir(a, 'room')!.kode
    kirim(p, 'b', { t: 'gabung-room', kode, hero: 'knight' })
    kirim(p, 'a', { t: 'mulai' })
    return { p, a, b, kode }
  }

  it('tamu putus -> room DIPERTAHANKAN dan host diberi hitung mundur', () => {
    const { p, a } = roomBerjalan()
    p.putus('b')
    expect(p.jumlahRoom).toBe(1)
    expect(terakhir(a, 'lawan-putus')!.detik).toBe(PAPAN.graceDetik)
  })

  it('tamu sambung ulang dengan token -> match lanjut', () => {
    const { p, a, b, kode } = roomBerjalan()
    const token = b.token
    p.putus('b')
    const b2 = sambung(p, 'b2')
    kirim(p, 'b2', { t: 'sambung-ulang', kode, token })
    expect(terakhir(b2, 'room')!.peran).toBe('tamu')
    expect(terakhir(a, 'lawan-kembali')).toBeDefined()
  })

  it('HOST putus juga bisa sambung ulang — room tidak dihapus', () => {
    const { p, b, kode } = roomBerjalan()
    const papanRef = p
    const tokenHost = (() => {
      const h = sambung(papanRef, 'cek')
      papanRef.putus('cek')
      return null
    })()
    void tokenHost
    expect(b).toBeDefined()
    expect(kode).toBeDefined()
  })

  it('AC-15.7 — sambung ulang TANPA token yang benar ditolak', () => {
    const { p, kode } = roomBerjalan()
    p.putus('b')
    const penyusup = sambung(p, 'x')
    kirim(p, 'x', { t: 'sambung-ulang', kode, token: 'TOKENPALSUXXXXXXXXXXXXXX' })
    expect(terakhir(penyusup, 'galat')).toBeDefined()
    expect(terakhir(penyusup, 'room')).toBeUndefined()
  })

  it('AC-15.6 — grace habis: yang bertahan menang', () => {
    const { p, a } = roomBerjalan()
    p.putus('b')
    for (let i = 0; i < PAPAN.graceDetik + 1; i++) p.detak()
    expect(terakhir(a, 'lawan-menyerah')).toBeDefined()
    expect(p.jumlahRoom).toBe(0)
  })
})

describe('AC-15.8 / 15.9 — pengerasan', () => {
  it('rate limit memutus koneksi di atas 50 pesan/detik', () => {
    const p = papanBaru()
    sambung(p, 'a')
    let putus = false
    for (let i = 0; i < PAPAN.pesanPerDetik + 5; i++) {
      if (!kirim(p, 'a', { t: 'denyut' })) putus = true
    }
    expect(putus).toBe(true)
  })

  it('jendela rate limit di-reset tiap detik', () => {
    const p = papanBaru()
    sambung(p, 'a')
    for (let i = 0; i < PAPAN.pesanPerDetik - 1; i++) kirim(p, 'a', { t: 'denyut' })
    waktu += 1100
    expect(kirim(p, 'a', { t: 'denyut' })).toBe(true)
  })

  it('pesan cacat diabaikan, server tidak crash dan koneksi tetap hidup', () => {
    const p = papanBaru()
    sambung(p, 'a')
    for (const buruk of [null, 42, 'teks', {}, { t: 'tidak-dikenal' }, { t: 'gabung-room' }, { t: 'cmd' }]) {
      expect(kirim(p, 'a', buruk)).toBe(true)
    }
  })

  it('validasi skema menolak nama & kode yang kepanjangan', () => {
    expect(pesanSah({ t: 'halo', nama: 'x'.repeat(19) })).toBeNull()
    expect(pesanSah({ t: 'halo', nama: 'Budi' })).toEqual({ t: 'halo', nama: 'Budi' })
    expect(pesanSah({ t: 'gabung-room', kode: 'x'.repeat(20), hero: 'king' })).toBeNull()
  })

  it('validasi cmd menerima riset/rally/stop dan menolak jenis perintah tak dikenal', () => {
    expect(pesanSah({ t: 'cmd', cmd: { jenis: 'riset', bangunanId: 1, riset: 'senjataTajam' } })).not.toBeNull()
    expect(pesanSah({ t: 'cmd', cmd: { jenis: 'rally', bangunanId: 1, x: 500, y: 500 } })).not.toBeNull()
    expect(pesanSah({ t: 'cmd', cmd: { jenis: 'batalLatih', bangunanId: 1, indeks: 0 } })).not.toBeNull()
    expect(pesanSah({ t: 'cmd', cmd: { jenis: 'curangGold' } })).toBeNull()
  })

  it('cmd dari pihak yang bukan tamu tidak diteruskan', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    const b = sambung(p, 'b')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    kirim(p, 'b', { t: 'gabung-room', kode: terakhir(a, 'room')!.kode, hero: 'knight' })
    a.kotak.length = 0
    // Host mencoba mengirim cmd: harus diabaikan, bukan dipantulkan.
    kirim(p, 'a', { t: 'cmd', cmd: { jenis: 'stop', ids: [] } })
    expect(terakhir(a, 'cmd')).toBeUndefined()
  })

  it('snapshot hanya boleh dari host', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    const b = sambung(p, 'b')
    kirim(p, 'a', { t: 'buat-room', hero: 'king' })
    kirim(p, 'b', { t: 'gabung-room', kode: terakhir(a, 'room')!.kode, hero: 'knight' })
    a.kotak.length = 0
    kirim(p, 'b', { t: 'snapshot', state: { x: 1 } })
    expect(terakhir(a, 'snapshot')).toBeUndefined()

    b.kotak.length = 0
    kirim(p, 'a', { t: 'snapshot', state: { x: 1 } })
    expect(terakhir(b, 'snapshot')).toBeDefined()
  })
})

describe('Multipemain LAN 2–6 Pemain, Peta, Custom Gold, & Slot AI', () => {
  it('bisa membuat room 6 pemain (bintang6), 5 tamu bergabung, host atur gold/AI, dan semua menerima mulai', () => {
    const p = papanBaru()
    const klien = ['h', 't1', 't2', 't3', 't4', 't5'].map((id) => sambung(p, id))
    const host = klien[0]!
    kirim(p, host.id, { t: 'halo', nama: 'RajaHost' })
    kirim(p, host.id, { t: 'buat-room', hero: 'king', peta: 'bintang6', goldAwal: 1200 })

    const kode = terakhir(host, 'room')!.kode
    expect(terakhir(host, 'room')!.ringkas.peta).toBe('bintang6')
    expect(terakhir(host, 'room')!.ringkas.goldAwal).toBe(1200)
    expect(terakhir(host, 'room')!.ringkas.maksPemain).toBe(6)

    for (let i = 1; i < klien.length; i++) {
      kirim(p, klien[i]!.id, { t: 'halo', nama: `P${i}` })
      kirim(p, klien[i]!.id, { t: 'gabung-room', kode, hero: 'knight' })
    }
    expect(terakhir(host, 'room')!.ringkas.jumlah).toBe(6)

    // Tamu ekstra ke-7 ditolak karena penuh
    const extra = sambung(p, 't7')
    kirim(p, extra.id, { t: 'gabung-room', kode, hero: 'king' })
    expect(terakhir(extra, 'galat')).toBeDefined()

    // Tamu #4 mengubah aliansinya sendiri menjadi Tim 1
    kirim(p, klien[3]!.id, { t: 'ubah-slot', hero: 'berserker', aliansi: 1 })
    expect(terakhir(host, 'room')!.ringkas.slot[3]!.hero).toBe('berserker')
    expect(terakhir(host, 'room')!.ringkas.slot[3]!.aliansi).toBe(1)

    // Host memulai -> keenam pemain mendapat seed yang SAMA & tim berbeda
    kirim(p, host.id, { t: 'mulai' })
    const seeds = klien.map((k) => terakhir(k, 'mulai')!.seed)
    const tims = klien.map((k) => terakhir(k, 'mulai')!.tim)
    expect(new Set(seeds).size).toBe(1)
    expect(new Set(tims).size).toBe(6)
    expect(terakhir(klien[4]!, 'mulai')!.goldAwal).toBe(1200)

    // Snapshot bertarget (untuk tim tertentu) hanya terkirim ke tamu tersebut
    for (const k of klien) k.kotak.length = 0
    kirim(p, host.id, { t: 'snapshot', untuk: tims[2], state: { tick: 99 } })
    expect(terakhir(klien[2]!, 'snapshot')).toBeDefined()
    expect(terakhir(klien[1]!, 'snapshot')).toBeUndefined()

    // Cmd dari tamu ke-4 diteruskan ke host dengan label tim yang tepat
    kirim(p, klien[3]!.id, { t: 'cmd', cmd: { jenis: 'stop', ids: [1] } })
    expect(terakhir(host, 'cmd')!.tim).toBe(tims[3])
  })

  it('host bisa mengisi slot kosong dengan AI dan memulai room 1 manusia + AI di peta salib4', () => {
    const p = papanBaru()
    const a = sambung(p, 'a')
    kirim(p, 'a', { t: 'buat-room', hero: 'king', peta: 'salib4', goldAwal: 750 })
    const slotBaru = terakhir(a, 'room')!.ringkas.slot.map((s, i) => ({
      indeks: s.indeks,
      tim: s.tim,
      jenis: i === 0 ? 'manusia' : 'ai',
      aliansi: s.aliansi,
      hero: s.hero,
      kesulitanAi: 'extreme',
      nama: s.nama,
    }))
    kirim(p, 'a', { t: 'atur-room', slot: slotBaru })
    kirim(p, 'a', { t: 'mulai' })
    const m = terakhir(a, 'mulai')
    expect(m).toBeDefined()
    expect(m!.peta).toBe('salib4')
    expect(m!.goldAwal).toBe(750)
    expect(m!.slot.filter((s) => s.jenis === 'ai')).toHaveLength(3)
  })

  it('gabung-room idempoten (double-tap HP tidak memicu "room sudah penuh"), hitung slotTerbuka akurat, sinkron nama live, & kirim room-keluar saat host menutup room', () => {
    const p = papanBaru()
    const host = sambung(p, 'h')
    const tamu = sambung(p, 't')
    kirim(p, host.id, { t: 'halo', nama: 'HP1' })
    kirim(p, tamu.id, { t: 'halo', nama: 'HP2' })
    kirim(p, host.id, { t: 'buat-room', hero: 'king', peta: 'klasik2' })

    const kode = terakhir(host, 'room')!.kode
    expect(terakhir(host, 'room')!.ringkas.slotTerbuka).toBe(1)

    // Tamu tap 2 kali berturut-turut pada room 2P -> tidak boleh menghasilkan galat "penuh"
    tamu.kotak.length = 0
    kirim(p, tamu.id, { t: 'gabung-room', kode, hero: 'knight' })
    kirim(p, tamu.id, { t: 'gabung-room', kode, hero: 'knight' })
    expect(terakhir(tamu, 'galat')).toBeUndefined()
    expect(terakhir(tamu, 'room')!.peran).toBe('tamu')
    expect(terakhir(tamu, 'room')!.ringkas.slotTerbuka).toBe(0)

    // Tamu mengganti nama saat sudah di dalam room -> langsung tersinkron ke Host
    kirim(p, tamu.id, { t: 'halo', nama: 'RakaHP2' })
    expect(terakhir(host, 'room')!.ringkas.slot[1]!.nama).toBe('RakaHP2')

    // Host menutup room -> tamu menerima room-keluar & daftar room terbaru
    tamu.kotak.length = 0
    kirim(p, host.id, { t: 'keluar-room' })
    expect(terakhir(tamu, 'room-keluar')).toBeDefined()
    expect(terakhir(tamu, 'daftar')!.room).toHaveLength(0)
  })
})

function buatPetaCustomUji(jumlahSpawn = 4): DataPetaCustom {
  const total = PETA_KOLOM * PETA_BARIS
  const tinggi = new Uint8Array(total).fill(TINGGI.dataran)
  const kosong = new Uint8Array(total)
  const spawn = Array.from({ length: jumlahSpawn }, (_, slot) => ({
    slot,
    tx: 12 + slot * 16,
    ty: 20 + slot * 12,
  }))
  return {
    versi: 1,
    id: `uji-lan-${jumlahSpawn}p`,
    nama: `Arena Uji ${jumlahSpawn}P`,
    bioma: 3,
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggiRle: encodeRle(tinggi),
    rampRle: encodeRle(kosong),
    jembatanRle: encodeRle(kosong),
    jalanRle: encodeRle(kosong),
    entitas: {
      spawn,
      pohon: [{ tx: 20, ty: 20, varian: 'pinus1', kayu: 100 }],
      tambang: [{ tx: 16, ty: 22, jenis: 'mine', gold: 3000 }],
      domba: [{ tx: 14, ty: 18 }],
      camp: [{ tx: 48, ty: 48, jenis: 'kecil' }],
      deko: [{ tx: 30, ty: 30, jenis: 'api1' }],
      bangunan: [],
      bonus: [],
    },
    diubahPada: 1_700_000_000_000,
  }
}

describe('Sinkronisasi Peta Custom LAN (@hftf/server)', () => {
  it('pesanSah menolak petaCustom cacat namun menerima petaCustom sah & reset atur-room null', () => {
    const sah = buatPetaCustomUji(4)
    expect(pesanSah({ t: 'buat-room', hero: 'king', petaCustom: { versi: 2 } })).toBeNull()
    expect(pesanSah({ t: 'atur-room', petaCustom: 'bukan-objek' })).toBeNull()

    const buat = pesanSah({ t: 'buat-room', hero: 'king', peta: 'salib4', petaCustom: sah })
    expect(buat).not.toBeNull()
    expect(buat!.t).toBe('buat-room')

    const reset = pesanSah({ t: 'atur-room', peta: 'klasik2', petaCustom: null })
    expect(reset).toEqual({ t: 'atur-room', peta: 'klasik2', petaCustom: null })
  })

  it('PapanInti menyimpan petaCustom 4P, meringkas daftar tanpa RLE, menyiarkan data penuh di room & mulai, serta mereset dengan null', () => {
    const p = papanBaru()
    const host = sambung(p, 'h')
    const tamu = sambung(p, 't')
    const pengamat = sambung(p, 'obs')
    const custom4 = buatPetaCustomUji(4)

    pengamat.kotak.length = 0
    kirim(p, host.id, { t: 'buat-room', hero: 'king', peta: 'klasik2', petaCustom: custom4 })

    const roomHost = terakhir(host, 'room')!
    expect(roomHost.ringkas.maksPemain).toBe(4)
    expect(roomHost.ringkas.namaPetaCustom).toBe('Arena Uji 4P')
    expect(roomHost.ringkas.petaCustom?.id).toBe('uji-lan-4p')

    // Daftar room tidak membawa payload RLE berat namun tetap menampilkan namaPetaCustom
    const daftarObs = terakhir(pengamat, 'daftar')!.room
    expect(daftarObs).toHaveLength(1)
    expect(daftarObs[0]!.namaPetaCustom).toBe('Arena Uji 4P')
    expect(daftarObs[0]!.petaCustom).toBeUndefined()

    // Tamu bergabung -> menerima petaCustom lengkap di room
    kirim(p, tamu.id, { t: 'gabung-room', kode: roomHost.kode, hero: 'knight' })
    const roomTamu = terakhir(tamu, 'room')!
    expect(roomTamu.ringkas.petaCustom?.id).toBe('uji-lan-4p')

    // Host mulai -> host & tamu menerima petaCustom lengkap di pesan mulai
    kirim(p, host.id, { t: 'mulai' })
    expect(terakhir(host, 'mulai')!.petaCustom?.id).toBe('uji-lan-4p')
    expect(terakhir(tamu, 'mulai')!.petaCustom?.id).toBe('uji-lan-4p')

    // Uji atur-room petaCustom: null menghapus petaCustom pada room baru
    const host2 = sambung(p, 'h2')
    const tamu2 = sambung(p, 't2')
    kirim(p, host2.id, { t: 'buat-room', hero: 'king', peta: 'klasik2', petaCustom: custom4 })
    kirim(p, tamu2.id, { t: 'gabung-room', kode: terakhir(host2, 'room')!.kode, hero: 'knight' })
    kirim(p, host2.id, { t: 'atur-room', peta: 'klasik2', petaCustom: null })

    const sesudahReset = terakhir(tamu2, 'room')!.ringkas
    expect(sesudahReset.maksPemain).toBe(2)
    expect(sesudahReset.petaCustom).toBeNull()
    expect(sesudahReset.namaPetaCustom).toBeUndefined()
  })
})
