import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Penegak aturan arsitektur PRD §8.2. Ini yang membuat AC-8.2 nyata:
// pelanggaran dijaga tes, bukan niat baik.

const AKAR = fileURLToPath(new URL('../../..', import.meta.url))

/** Paket apa saja yang BOLEH diimpor tiap paket (PRD §8.2 poin 1). */
const BOLEH: Record<string, readonly string[]> = {
  shared: [],
  sim: ['shared'],
  aset: ['shared'],
  net: ['shared'],
  render: ['shared', 'sim', 'aset'],
  ui: ['shared', 'sim', 'aset'],
  client: ['shared', 'sim', 'aset', 'net', 'render', 'ui'],
  server: ['shared'],
}

/** API yang haram disentuh `sim` (PRD §8.2 poin 2). */
const HARAM_DI_SIM: readonly { pola: RegExp; nama: string }[] = [
  { pola: /\bdocument\b/, nama: 'document' },
  { pola: /\bwindow\b/, nama: 'window' },
  { pola: /\blocalStorage\b/, nama: 'localStorage' },
  { pola: /\bsessionStorage\b/, nama: 'sessionStorage' },
  { pola: /\bnew\s+Image\b/, nama: 'new Image' },
  { pola: /\bHTMLCanvasElement\b/, nama: 'HTMLCanvasElement' },
  { pola: /\bgetContext\b/, nama: 'getContext' },
  { pola: /\bfetch\s*\(/, nama: 'fetch()' },
  { pola: /\bMath\.random\b/, nama: 'Math.random()' },
  { pola: /\bDate\.now\b/, nama: 'Date.now()' },
  { pola: /\bperformance\.now\b/, nama: 'performance.now()' },
]

function berkasTs(dir: string): string[] {
  let hasil: string[] = []
  for (const nama of readdirSync(dir)) {
    const penuh = join(dir, nama)
    if (statSync(penuh).isDirectory()) hasil = hasil.concat(berkasTs(penuh))
    else if (nama.endsWith('.ts')) hasil.push(penuh)
  }
  return hasil
}

/** Semua target import/export-from dalam satu berkas. */
function targetImport(isi: string): string[] {
  const hasil: string[] = []
  const pola = /(?:^|\n)\s*(?:import|export)\b[^;\n]*?from\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = pola.exec(isi)) !== null) hasil.push(m[1]!)
  const dinamis = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = dinamis.exec(isi)) !== null) hasil.push(m[1]!)
  return hasil
}

describe('arah dependensi antar paket (PRD §8.2 poin 1)', () => {
  for (const [paket, bolehnya] of Object.entries(BOLEH)) {
    it(`@hftf/${paket} hanya mengimpor: ${bolehnya.join(', ') || '(tidak ada)'}`, () => {
      const src = join(AKAR, 'packages', paket, 'src')
      const pelanggaran: string[] = []

      for (const berkas of berkasTs(src)) {
        for (const target of targetImport(readFileSync(berkas, 'utf8'))) {
          const rel = relative(AKAR, berkas)

          // 1. Import antar-paket lewat nama @hftf/*
          const cocok = /^@hftf\/([a-z]+)/.exec(target)
          if (cocok) {
            const tujuan = cocok[1]!
            if (tujuan !== paket && !bolehnya.includes(tujuan)) {
              pelanggaran.push(`${rel} -> @hftf/${tujuan}`)
            }
            continue
          }

          // 2. Import relatif yang menembus keluar src paket ini
          if (target.startsWith('.')) {
            const tujuan = resolve(join(berkas, '..'), target)
            if (!tujuan.startsWith(src)) {
              pelanggaran.push(`${rel} -> ${target} (menembus keluar paket)`)
            }
          }
        }
      }

      expect(pelanggaran, `pelanggaran arah dependensi:\n${pelanggaran.join('\n')}`).toEqual([])
    })
  }
})

describe('kemurnian @hftf/sim (PRD §8.2 poin 2)', () => {
  it('tidak menyentuh DOM, Math.random, atau jam dinding', () => {
    const src = join(AKAR, 'packages', 'sim', 'src')
    const pelanggaran: string[] = []

    for (const berkas of berkasTs(src)) {
      const baris = readFileSync(berkas, 'utf8').split('\n')
      baris.forEach((isi, i) => {
        const kode = isi.replace(/\/\/.*$/, '') // abaikan komentar baris
        for (const { pola, nama } of HARAM_DI_SIM) {
          if (pola.test(kode)) {
            pelanggaran.push(`${relative(AKAR, berkas)}:${i + 1} memakai ${nama}`)
          }
        }
      })
    }

    expect(pelanggaran, `sim harus murni:\n${pelanggaran.join('\n')}`).toEqual([])
  })
})
