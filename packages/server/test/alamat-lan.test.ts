import { describe, expect, it } from 'vitest'
import { alamatKlien, alamatLan } from '../src/alamat-lan.js'
import { berkasAman } from '../src/statis.js'

describe('AC-15.11 — deteksi alamat LAN', () => {
  it('menyaring antarmuka virtual Docker/VPN/bridge', () => {
    const palsu = {
      eth0: [{ address: '192.168.1.5', family: 'IPv4', internal: false }],
      docker0: [{ address: '172.17.0.1', family: 'IPv4', internal: false }],
      'br-abc': [{ address: '172.18.0.1', family: 'IPv4', internal: false }],
      veth1: [{ address: '10.1.2.3', family: 'IPv4', internal: false }],
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
    } as never
    expect(alamatLan(palsu)).toEqual(['192.168.1.5'])
  })

  it('mengembalikan null kalau tidak ada alamat LAN', () => {
    expect(alamatKlien([], 8080)).toBeNull()
  })

  it('membentuk URL siap salin', () => {
    expect(alamatKlien(['192.168.0.7'], 8080)).toBe('http://192.168.0.7:8080')
  })
})

describe('penyajian berkas statis', () => {
  it('menolak path traversal keluar dari akar', () => {
    expect(berkasAman(process.cwd(), '/../../etc/passwd')).toBeNull()
    expect(berkasAman(process.cwd(), '/%2e%2e/%2e%2e/etc/passwd')).toBeNull()
  })

  it('menolak berkas yang tidak ada', () => {
    expect(berkasAman(process.cwd(), '/tidak-ada-sama-sekali.txt')).toBeNull()
  })

  it('menyajikan berkas yang ada di dalam akar', () => {
    expect(berkasAman(process.cwd(), '/package.json')).not.toBeNull()
  })

  it('akar memetakan ke index.html', () => {
    expect(berkasAman(process.cwd(), '/')).toContain('index.html')
  })
})
