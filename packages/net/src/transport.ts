import type { Tim } from '@hftf/shared'

/** Perintah yang sudah diberi stempel tim pengirimnya. */
export interface PerintahMasuk<P> {
  tim: Tim
  perintah: P
}

/**
 * Antarmuka transport. Solo, host, dan guest memakai antarmuka yang sama —
 * itu sebabnya loop di client tidak perlu tahu sedang main sendirian atau LAN.
 */
export interface Transport<P, S> {
  readonly peran: 'solo' | 'host' | 'guest'
  /** Tim yang dikendalikan pemain di perangkat ini. */
  readonly timSaya: Tim

  /** Mengirim perintah pemain. Host menerapkannya langsung; guest meneruskannya. */
  kirim(p: P): void

  /** Perintah yang perlu diterapkan host langkah ini. Mengosongkan antrean. */
  ambilPerintah(): PerintahMasuk<P>[]

  /** Host memanggil ini untuk menyiarkan snapshot; solo mengabaikannya. */
  siarkan(snapshot: S): void

  /** Guest memanggil ini untuk mengambil snapshot terbaru; null kalau belum ada. */
  ambilSnapshot(): S | null

  tutup(): void
}

/** Transport untuk Solo vs AI: tidak ada jaringan sama sekali. */
export class TransportLokal<P, S> implements Transport<P, S> {
  readonly peran = 'solo' as const
  private antrean: PerintahMasuk<P>[] = []

  constructor(readonly timSaya: Tim) {}

  kirim(p: P): void {
    this.antrean.push({ tim: this.timSaya, perintah: p })
  }

  /** AI memasukkan perintahnya lewat jalur yang sama dengan pemain. */
  kirimSebagai(tim: Tim, p: P): void {
    this.antrean.push({ tim, perintah: p })
  }

  ambilPerintah(): PerintahMasuk<P>[] {
    const h = this.antrean
    this.antrean = []
    return h
  }

  siarkan(): void {
    /* solo tidak menyiarkan apa pun */
  }

  ambilSnapshot(): S | null {
    return null
  }

  tutup(): void {
    this.antrean = []
  }
}
