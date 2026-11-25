// Papan room LAN — diport dari math-strike-kerja24c/packages/shared/src/papan.ts
// Lihat PRD §15.3 poin 1, 3, 4.

export const PAPAN = {
  /** Ukuran pesan lobi paling besar (byte). */
  ukuranMaks: 16_384,
  /** Pesan paling banyak per detik per koneksi; lebih dari itu koneksi diputus. */
  pesanPerDetik: 50,
  /** Jeda ping aplikasi (ms) — tanpa ini socket mati menggantung selamanya. */
  pingMs: 25_000,
  /** Panjang kode room (PRD §15.3 poin 11). */
  panjangKode: 5,
  /** Grace period reconnect dalam detik (PRD §15.2). */
  graceDetik: 45,
} as const

/**
 * Kelompok jaringan sebuah alamat IP. Daftar room hanya beredar di dalam satu
 * kelompok, supaya room tidak bocor lintas jaringan (PRD §15.3 poin 1).
 * Semua alamat privat/loopback/link-local dianggap satu kelompok 'lokal'.
 */
export function kelompokWifi(ip: string): string {
  const alamat = ip.trim().replace(/^::ffff:/i, '')
  if (/^(10\.|127\.|192\.168\.|169\.254\.)/.test(alamat)) return 'lokal'
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(alamat)) return 'lokal'
  if (alamat.includes(':')) {
    const kecil = alamat.toLowerCase()
    if (kecil === '::1' || /^f[cd]/.test(kecil) || kecil.startsWith('fe80')) return 'lokal'
    const bagian = kecil.split('::')[0]?.split(':') ?? []
    return `${[...bagian, '0', '0', '0', '0'].slice(0, 4).join(':')}::/64`
  }
  return alamat
}
