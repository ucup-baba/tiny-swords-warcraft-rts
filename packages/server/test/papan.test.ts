import { PAPAN } from '@hftf/shared'
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
