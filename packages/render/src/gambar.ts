import { SEMUA, frame, url, type Aset } from '@hftf/aset'
import type { Tim } from '@hftf/shared'

/** Cache gambar yang sudah dimuat, diindeks oleh url. */
const cache = new Map<string, HTMLImageElement>()
const cacheTim = new Map<string, HTMLCanvasElement>()

export function gambarDari(a: Aset): HTMLImageElement | null {
  return cache.get(url(a)) ?? null
}

function rgbKeHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const maks = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (maks + min) / 2
  if (maks === min) return [0, 0, l]
  const d = maks - min
  const s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min)
  let h = 0
  if (maks === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (maks === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

function hslKeRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number): number => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [
    Math.round(hue(hn + 1 / 3) * 255),
    Math.round(hue(hn) * 255),
    Math.round(hue(hn - 1 / 3) * 255),
  ]
}

const TARGET_WARNA: Partial<Record<Tim, { hue: number; satMul: number; lumMul: number; desatBlack?: boolean }>> = {
  red: { hue: 4, satMul: 1.15, lumMul: 1.0 },
  yellow: { hue: 46, satMul: 1.25, lumMul: 1.14 },
  purple: { hue: 278, satMul: 1.05, lumMul: 1.0 },
  green: { hue: 132, satMul: 1.12, lumMul: 0.98 },
  black: { hue: 215, satMul: 0.16, lumMul: 0.56, desatBlack: true },
}

/**
 * Mengembalikan sprite yang sudah disesuaikan warna timnya (dengan cache kanvas 1x per aset+tim).
 * Hanya piksel baju/bendera biru (`h ∈ [180..250], s ≥ 0.20, l ∈ [0.19..0.80]`) yang digeser,
 * sehingga kulit, rambut, logam pisau/beliung, kayu, emas, daging, dan garis tepi tetap asli.
 */
export function gambarTim(a: Aset, tim: Tim): HTMLImageElement | HTMLCanvasElement | null {
  const im = gambarDari(a)
  if (!im || tim === 'blue' || tim === 'neutral') return im

  const kunci = `${url(a)}#${tim}`
  const ada = cacheTim.get(kunci)
  if (ada) return ada

  const target = TARGET_WARNA[tim]
  if (!target) return im

  const w = im.naturalWidth || im.width
  const h = im.naturalHeight || im.height
  if (w <= 0 || h <= 0) return im

  const kanvas = document.createElement('canvas')
  kanvas.width = w
  kanvas.height = h
  const c = kanvas.getContext('2d', { willReadFrequently: true })
  if (!c) return im
  c.drawImage(im, 0, 0)

  let imgData: ImageData
  try {
    imgData = c.getImageData(0, 0, w, h)
  } catch {
    return im
  }

  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const al = d[i + 3]!
    if (al < 24) continue
    const [hue, s, l] = rgbKeHsl(d[i]!, d[i + 1]!, d[i + 2]!)
    if (hue < 180 || hue > 250 || s < 0.20 || l < 0.19 || l > 0.80) continue

    const hueBaru = target.desatBlack ? hue : (hue - 208 + target.hue + 360) % 360
    const satBaru = Math.max(0, Math.min(1, s * target.satMul))
    const lumBaru = Math.max(0.08, Math.min(0.88, l * target.lumMul))
    const [r2, g2, b2] = hslKeRgb(hueBaru, satBaru, lumBaru)
    d[i] = r2
    d[i + 1] = g2
    d[i + 2] = b2
  }
  c.putImageData(imgData, 0, 0)
  cacheTim.set(kunci, kanvas)
  return kanvas
}

export interface KemajuanMuat {
  selesai: number
  total: number
  gagal: string[]
}

/**
 * Memuat seluruh aset di manifes. Yang gagal dicatat, bukan dilempar — satu
 * berkas hilang tidak boleh membuat seluruh game gagal start, tapi harus
 * kelihatan. Validator di packages/aset yang mencegahnya sampai ke sini.
 */
export async function muatSemuaAset(
  lapor?: (k: KemajuanMuat) => void,
  basis = '',
): Promise<KemajuanMuat> {
  const daftar = [...new Set(Object.values(SEMUA).map(url))]
  const k: KemajuanMuat = { selesai: 0, total: daftar.length, gagal: [] }

  await Promise.all(
    daftar.map(
      (u) =>
        new Promise<void>((selesai) => {
          const im = new Image()
          im.decoding = 'async'
          im.onload = () => {
            // Decode PNG di background thread saat layar muat, supaya drawImage()
            // pertama kali di tengah permainan tidak membekukan main thread 100-200ms!
            const simpan = (): void => {
              cache.set(u, im)
              k.selesai++
              lapor?.(k)
              selesai()
            }
            if (typeof im.decode === 'function') {
              im.decode().then(simpan, simpan)
            } else {
              simpan()
            }
          }
          im.onerror = () => {
            k.gagal.push(u)
            k.selesai++
            lapor?.(k)
            selesai()
          }
          im.src = basis + u.split('/').map(encodeURIComponent).join('/')
        }),
    ),
  )
  return k
}

const cachePotong = new Map<string, string>()

/**
 * Memotong satu frame sprite jadi data URL berukuran tetap.
 *
 * Dipakai kartu produksi di sidebar: menampilkan sprite unit yang SEBENARNYA
 * jauh lebih jelas daripada ikon generik, dan tidak bisa salah pasang.
 * Hasilnya di-cache karena kartu dibangun ulang tiap kali seleksi berubah.
 */
export function potongSprite(a: Aset, indeks: number, ukuran = 64, tim: Tim = 'blue'): string | null {
  const kunci = `${url(a)}#${indeks}@${ukuran}:${tim}`
  const ada = cachePotong.get(kunci)
  if (ada) return ada

  const im = gambarTim(a, tim)
  if (!im) return null

  const f = frame(a, indeks)
  const isi = kotakIsi(im, f)
  if (!isi) return null

  const k = document.createElement('canvas')
  k.width = ukuran
  k.height = ukuran
  const c = k.getContext('2d')
  if (!c) return null
  c.imageSmoothingEnabled = false

  // Diskalakan ke ISI sprite, bukan ke ukuran frame. Frame Tiny Swords punya
  // banyak ruang kosong, dan ukurannya berbeda-beda (192 vs 256 vs 320), jadi
  // skala tetap membuat sebagian unit tampak jauh lebih kecil dari yang lain.
  const margin = 0.88
  const skala = Math.min((ukuran * margin) / isi.w, (ukuran * margin) / isi.h)
  const w = isi.w * skala
  const h = isi.h * skala
  c.drawImage(im, isi.x, isi.y, isi.w, isi.h, (ukuran - w) / 2, (ukuran - h) / 2, w, h)

  const hasil = k.toDataURL('image/png')
  cachePotong.set(kunci, hasil)
  return hasil
}

/**
 * Memotong margin transparan dari aset kursor (`Cursor_01..04`) lalu
 * menskalakannya tajam agar kursor terlihat jelas (tidak mengecil ~15px).
 */
export function potongKursor(a: Aset, ukuran = 42, tengah = false): string | null {
  const kunci = `kursor:${url(a)}@${ukuran}:${tengah ? 1 : 0}`
  const ada = cachePotong.get(kunci)
  if (ada) return ada

  const im = gambarDari(a)
  if (!im) return null
  const f = frame(a, 0)
  const isi = kotakIsi(im, f)
  if (!isi) return null

  const k = document.createElement('canvas')
  k.width = ukuran
  k.height = ukuran
  const c = k.getContext('2d')
  if (!c) return null
  c.imageSmoothingEnabled = false

  const skala = Math.min((ukuran - 4) / isi.w, (ukuran - 4) / isi.h)
  const w = Math.round(isi.w * skala)
  const h = Math.round(isi.h * skala)
  const dx = tengah ? Math.round((ukuran - w) / 2) : 2
  const dy = tengah ? Math.round((ukuran - h) / 2) : 2
  c.drawImage(im, isi.x, isi.y, isi.w, isi.h, dx, dy, w, h)

  const hasil = k.toDataURL('image/png')
  cachePotong.set(kunci, hasil)
  return hasil
}

/**
 * Menggabungkan panah kursor (`Cursor_01`) di ujung klik kiri-atas dengan badge
 * ikon resource/aksi (Kayu, Emas, Daging, Bangun) di kanan-bawah — tajam & presisi.
 */
export function buatKursorAksi(
  dasar: Aset,
  ikon: Aset,
  warnaLingkar: string,
  ukuran = 44,
): string | null {
  const kunci = `kursorAksi:${url(dasar)}+${url(ikon)}:${warnaLingkar}@${ukuran}`
  const ada = cachePotong.get(kunci)
  if (ada) return ada

  const imDasar = gambarDari(dasar)
  const imIkon = gambarDari(ikon)
  if (!imDasar || !imIkon) return null

  const isiDasar = kotakIsi(imDasar, frame(dasar, 0))
  const isiIkon = kotakIsi(imIkon, frame(ikon, 0))
  if (!isiDasar || !isiIkon) return null

  const k = document.createElement('canvas')
  k.width = ukuran
  k.height = ukuran
  const c = k.getContext('2d')
  if (!c) return null
  c.imageSmoothingEnabled = false

  // 1. Lencana bulat gelap + cincin warna resource di sudut kanan-bawah
  const r = Math.round(ukuran * 0.31)
  const cx = ukuran - r - 2
  const cy = ukuran - r - 2
  c.fillStyle = 'rgba(20, 14, 9, 0.88)'
  c.beginPath()
  c.arc(cx, cy, r, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = warnaLingkar
  c.lineWidth = 2
  c.stroke()

  // 2. Ikon resource (Kayu / Gold / Daging / Bangun) tajam di tengah lencana
  const kotakIkon = Math.round(r * 1.48)
  const sIkon = Math.min(kotakIkon / isiIkon.w, kotakIkon / isiIkon.h)
  const iw = Math.round(isiIkon.w * sIkon)
  const ih = Math.round(isiIkon.h * sIkon)
  c.drawImage(
    imIkon,
    isiIkon.x, isiIkon.y, isiIkon.w, isiIkon.h,
    Math.round(cx - iw / 2), Math.round(cy - ih / 2), iw, ih,
  )

  // 3. Panah pointer tajam di kiri-atas supaya titik klik tetap persis di ujung panah
  const maksPanah = Math.round(ukuran * 0.56)
  const sPanah = Math.min(maksPanah / isiDasar.w, maksPanah / isiDasar.h)
  const pw = Math.round(isiDasar.w * sPanah)
  const ph = Math.round(isiDasar.h * sPanah)
  c.drawImage(imDasar, isiDasar.x, isiDasar.y, isiDasar.w, isiDasar.h, 1, 1, pw, ph)

  const hasil = k.toDataURL('image/png')
  cachePotong.set(kunci, hasil)
  return hasil
}

/** Kotak piksel yang benar-benar berisi di dalam sebuah frame. */
function kotakIsi(
  im: HTMLImageElement | HTMLCanvasElement, f: { sx: number; sy: number; sw: number; sh: number },
): { x: number; y: number; w: number; h: number } | null {
  const k = document.createElement('canvas')
  k.width = f.sw
  k.height = f.sh
  const c = k.getContext('2d', { willReadFrequently: true })
  if (!c) return null
  c.drawImage(im, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh)

  let data: Uint8ClampedArray
  try {
    data = c.getImageData(0, 0, f.sw, f.sh).data
  } catch {
    // Kanvas ternoda (mis. aset lintas-origin): pakai seluruh frame.
    return { x: f.sx, y: f.sy, w: f.sw, h: f.sh }
  }

  let x1 = f.sw
  let y1 = f.sh
  let x2 = -1
  let y2 = -1
  for (let y = 0; y < f.sh; y++) {
    for (let x = 0; x < f.sw; x++) {
      if (data[(y * f.sw + x) * 4 + 3]! <= 24) continue
      if (x < x1) x1 = x
      if (x > x2) x2 = x
      if (y < y1) y1 = y
      if (y > y2) y2 = y
    }
  }
  if (x2 < 0) return null
  return { x: f.sx + x1, y: f.sy + y1, w: x2 - x1 + 1, h: y2 - y1 + 1 }
}
