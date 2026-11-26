#!/usr/bin/env node
/**
 * Merakit paket statis ramping di `dist-pages/` khusus untuk GitHub Pages.
 *
 * Hanya menyalin file yang benar-benar dimuat browser:
 *   - index.html (path relatif ./bundel.js)
 *   - bundel.js
 *   - public/font/PixelifySans.ttf
 *   - seluruh aset yang terdaftar di manifes SEMUA (@hftf/aset)
 *   - .nojekyll
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const AKAR = resolve(process.cwd())
const TUJUAN = join(AKAR, 'dist-pages')

// 1. Kompilasi semua paket TypeScript & bangun bundel.js terbaru.
execFileSync('npm', ['run', 'bangun'], { cwd: AKAR, stdio: 'inherit' })

// 2. Muat manifes aset dari hasil build.
const aset = await import('../packages/aset/dist/index.js')
const daftarAset = [...new Set(Object.values(aset.SEMUA).map((a) => aset.url(a)))]

// 3. Bersihkan & isi ulang dist-pages/
rmSync(TUJUAN, { recursive: true, force: true })
mkdirSync(TUJUAN, { recursive: true })

let totalByte = 0
let jumlahFile = 0

function salin(rel) {
  const asal = join(AKAR, rel)
  if (!existsSync(asal)) throw new Error(`Berkas wajib tidak ditemukan: ${rel}`)
  const target = join(TUJUAN, rel)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(asal, target)
  totalByte += statSync(target).size
  jumlahFile++
}

salin('index.html')
salin('bundel.js')
salin('public/font/PixelifySans.ttf')

// Verifikasi index.html memakai path relatif (wajib untuk subpath GitHub Pages).
const html = readFileSync(join(TUJUAN, 'index.html'), 'utf8')
if (html.includes('src="/bundel.js"')) {
  throw new Error('index.html masih memakai path absolut /bundel.js — harus ./bundel.js!')
}

for (const rel of daftarAset) salin(rel)
writeFileSync(join(TUJUAN, '.nojekyll'), '')

console.log(`✔ dist-pages siap: ${jumlahFile} berkas (${(totalByte / (1024 * 1024)).toFixed(2)} MB)`)
