/**
 * Autotile 4x4 untuk atlas Tiny Swords.
 *
 * Tata letak atlas (dibaca langsung dari Tilemap_Flat.png & Tilemap_Elevation.png):
 *   kolom 0 = tepi kiri, 1 = tengah, 2 = tepi kanan, 3 = sempit (selebar 1 tile)
 *   baris  0 = tepi atas, 1 = tengah, 2 = tepi bawah, 3 = pendek (setinggi 1 tile)
 *
 * Jadi sel dipilih dari ADA-TIDAKNYA tetangga sejenis di empat arah lurus.
 */
export function selAutotile(
  kiri: boolean, kanan: boolean, atas: boolean, bawah: boolean,
): { kol: number; bar: number } {
  const kol = kiri && kanan ? 1 : kiri ? 2 : kanan ? 0 : 3
  const bar = atas && bawah ? 1 : atas ? 2 : bawah ? 0 : 3
  return { kol, bar }
}

/** Offset kolom gugus rumput & pasir di dalam Tilemap_Flat (10 kolom). */
export const GUGUS_FLAT = { rumput: 0, pasir: 5 } as const

/**
 * Baris di dalam Tilemap_Elevation (4 kolom x 8 baris):
 *   0-2 permukaan plateau (atas / tengah / bawah)
 *   3   muka tebing, digambar DI BAWAH tepi bawah plateau
 *   4-5 plateau pendek + muka tebingnya
 *   7   anak tangga ramp
 */
export const BARIS_ELEV = { permukaanAtas: 0, permukaanTengah: 1, permukaanBawah: 2, tebing: 3, ramp: 7 } as const
