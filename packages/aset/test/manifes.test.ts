import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PRIORITAS, SEMUA, frame, url } from '../src/index.js'

// Validator aset (PRD §16.2). Path salah atau jumlah frame salah membuat
// `npm test` GAGAL — bukan jadi kotak kosong saat main.

const AKAR = fileURLToPath(new URL('../../..', import.meta.url))

/** Lebar & tinggi PNG dari header IHDR-nya. */
function ukuranPng(absolut: string): { w: number; h: number } {
  const buf = readFileSync(absolut)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('bukan PNG')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

const entri = Object.entries(SEMUA)

describe('manifes aset', () => {
  it('tidak kosong', () => {
    expect(entri.length).toBeGreaterThan(100)
  })

  it('AC-16.1 — setiap berkas yang dirujuk benar-benar ada', () => {
    const hilang = entri
      .filter(([, a]) => !existsSync(join(AKAR, url(a))))
      .map(([k, a]) => `${k} -> ${url(a)}`)
    expect(hilang, `aset hilang:\n${hilang.join('\n')}`).toEqual([])
  })

  it('AC-16.2 — dimensi gambar cocok dengan kolom x baris yang dideklarasikan', () => {
    const salah: string[] = []
    for (const [k, a] of entri) {
      const abs = join(AKAR, url(a))
      if (!existsSync(abs)) continue
      const { w, h } = ukuranPng(abs)
      const harapW = a.fw * a.kolom
      const harapH = a.fh * a.baris
      if (w !== harapW || h !== harapH) {
        salah.push(`${k}: gambar ${w}x${h}, manifes bilang ${harapW}x${harapH} (${a.kolom}x${a.baris} frame ${a.fw}x${a.fh})`)
      }
    }
    expect(salah, `slicing salah:\n${salah.join('\n')}`).toEqual([])
  })

  it('AC-16.3 — pack di bawah prioritas tertinggi WAJIB menyebut alasannya', () => {
    const tanpaAlasan = entri
      .filter(([, a]) => PRIORITAS[a.pack] > 0 && !a.alasan)
      .map(([k, a]) => `${k} memakai pack '${a.pack}' tanpa alasan`)
    expect(tanpaAlasan, `aturan prioritas §16.1:\n${tanpaAlasan.join('\n')}`).toEqual([])
  })

  it('mayoritas aset diambil dari Update 010', () => {
    const u010 = entri.filter(([, a]) => a.pack === 'u010').length
    expect(u010 / entri.length).toBeGreaterThan(0.5)
  })

  it('frame() tetap di dalam batas sheet dan membungkus dengan benar', () => {
    for (const [, a] of entri) {
      const total = a.kolom * a.baris
      for (const i of [0, 1, total - 1, total, total + 3, -1]) {
        const f = frame(a, i)
        expect(f.sx).toBeGreaterThanOrEqual(0)
        expect(f.sy).toBeGreaterThanOrEqual(0)
        expect(f.sx + f.sw).toBeLessThanOrEqual(a.fw * a.kolom)
        expect(f.sy + f.sh).toBeLessThanOrEqual(a.fh * a.baris)
      }
    }
  })
})

// --- AC-16.4: chrome UI custom tidak boleh dipakai lagi ----------------------

function berkasSumber(dir: string): string[] {
  if (!existsSync(dir)) return []
  let hasil: string[] = []
  for (const nama of readdirSync(dir)) {
    if (nama === 'node_modules' || nama === 'dist') continue
    const penuh = join(dir, nama)
    if (statSync(penuh).isDirectory()) hasil = hasil.concat(berkasSumber(penuh))
    else if (/\.(ts|js|css|html)$/.test(nama)) hasil.push(penuh)
  }
  return hasil
}

describe('AC-16.4 — chrome UI memakai 9-slice resmi, bukan custom', () => {
  it('tidak ada rujukan custom_assets/UI di packages/', () => {
    const pelanggaran: string[] = []
    for (const f of berkasSumber(join(AKAR, 'packages'))) {
      // Berkas tes ini sendiri menyebut string itu untuk mencarinya.
      if (f.endsWith('manifes.test.ts')) continue
      const isi = readFileSync(f, 'utf8')
      if (isi.includes('custom_assets/UI')) pelanggaran.push(relative(AKAR, f))
    }
    expect(pelanggaran, `custom_assets/UI masih dipakai di:\n${pelanggaran.join('\n')}`).toEqual([])
  })
})
