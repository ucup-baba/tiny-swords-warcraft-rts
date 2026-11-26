import { SEMUA, frame, url, type Aset } from '@hftf/aset'

/** Cache gambar yang sudah dimuat, diindeks oleh url. */
const cache = new Map<string, HTMLImageElement>()

export function gambarDari(a: Aset): HTMLImageElement | null {
  return cache.get(url(a)) ?? null
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
export function potongSprite(a: Aset, indeks: number, ukuran = 64): string | null {
  const kunci = `${url(a)}#${indeks}@${ukuran}`
  const ada = cachePotong.get(kunci)
  if (ada) return ada

  const im = gambarDari(a)
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

/** Kotak piksel yang benar-benar berisi di dalam sebuah frame. */
function kotakIsi(
  im: HTMLImageElement, f: { sx: number; sy: number; sw: number; sh: number },
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
