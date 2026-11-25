import { describe, expect, it } from 'vitest'
import { PAPAN, kelompokWifi } from '../src/index.js'

// Diport dari math-strike-kerja24c. PRD §15.3 poin 1.

describe('kelompokWifi', () => {
  it('semua alamat privat IPv4 masuk kelompok lokal', () => {
    for (const ip of ['192.168.1.5', '10.0.0.9', '172.16.3.1', '172.31.255.254', '127.0.0.1', '169.254.1.1']) {
      expect(kelompokWifi(ip)).toBe('lokal')
    }
  })

  it('172.15 dan 172.32 BUKAN rentang privat', () => {
    expect(kelompokWifi('172.15.0.1')).not.toBe('lokal')
    expect(kelompokWifi('172.32.0.1')).not.toBe('lokal')
  })

  it('alamat publik jadi kelompoknya sendiri', () => {
    expect(kelompokWifi('8.8.8.8')).toBe('8.8.8.8')
  })

  it('IPv4 ber-prefix IPv6 dinormalkan', () => {
    expect(kelompokWifi('::ffff:192.168.0.3')).toBe('lokal')
  })

  it('IPv6 lokal dan link-local masuk kelompok lokal', () => {
    for (const ip of ['::1', 'fe80::1', 'fd00::abcd', 'fc00::1']) {
      expect(kelompokWifi(ip)).toBe('lokal')
    }
  })

  it('IPv6 publik dikelompokkan per /64', () => {
    expect(kelompokWifi('2001:db8:85a3:1::8a2e')).toBe('2001:db8:85a3:1::/64')
  })

  it('spasi di tepi diabaikan', () => {
    expect(kelompokWifi('  192.168.1.1  ')).toBe('lokal')
  })
})

describe('konstanta papan', () => {
  it('batas sesuai PRD §15.3', () => {
    expect(PAPAN.pesanPerDetik).toBe(50)
    expect(PAPAN.ukuranMaks).toBe(16_384)
    expect(PAPAN.panjangKode).toBe(5)
    expect(PAPAN.graceDetik).toBe(45)
  })
})
