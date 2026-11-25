import { SEMUA, url, type Aset } from '@hftf/aset'

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
          im.onload = () => {
            cache.set(u, im)
            k.selesai++
            lapor?.(k)
            selesai()
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
