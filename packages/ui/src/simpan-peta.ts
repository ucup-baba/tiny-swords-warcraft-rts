import { validasiDataPetaCustom, type DataPetaCustom } from '@hftf/shared'

const KUNCI_SIMPAN = 'hftf_peta_custom_v1'

function bacaStorageAman(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(KUNCI_SIMPAN)
  } catch {
    return null
  }
}

function tulisStorageAman(isi: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(KUNCI_SIMPAN, isi)
    return true
  } catch {
    return false
  }
}

/**
 * Memuat seluruh peta custom tersimpan dari `localStorage` (disaring ketat lewat `validasiDataPetaCustom`,
 * diurutkan dari yang terbaru diubah).
 */
export function muatDaftarPetaCustom(): DataPetaCustom[] {
  const mentah = bacaStorageAman()
  if (!mentah) return []
  try {
    const parsed = JSON.parse(mentah) as unknown
    if (!Array.isArray(parsed)) return []
    const hasil: DataPetaCustom[] = []
    const sudahId = new Set<string>()
    for (const item of parsed) {
      const valid = validasiDataPetaCustom(item)
      if (!valid || sudahId.has(valid.id)) continue
      sudahId.add(valid.id)
      hasil.push(valid)
    }
    hasil.sort((a, b) => b.diubahPada - a.diubahPada)
    return hasil
  } catch {
    return []
  }
}

/** Menyimpan (insert/update berdasar `id`) sebuah peta custom ke `localStorage`. */
export function simpanPetaCustom(data: DataPetaCustom): DataPetaCustom[] {
  const baru: DataPetaCustom = {
    ...data,
    diubahPada: Date.now(),
  }
  const daftar = muatDaftarPetaCustom().filter((x) => x.id !== baru.id)
  daftar.unshift(baru)
  tulisStorageAman(JSON.stringify(daftar))
  return daftar
}

/** Menghapus peta custom berdasarkan `id` dari `localStorage`. */
export function hapusPetaCustom(id: string): DataPetaCustom[] {
  const daftar = muatDaftarPetaCustom().filter((x) => x.id !== id)
  tulisStorageAman(JSON.stringify(daftar))
  return daftar
}

/** Mengekspor peta custom menjadi string JSON rapi siap unduh. */
export function eksporJsonPeta(data: DataPetaCustom): string {
  return JSON.stringify(data, null, 2)
}

/** Mengimpor dan memvalidasi teks JSON peta custom. */
export function imporJsonPeta(teks: string): { ok: true; data: DataPetaCustom } | { ok: false; galat: string } {
  try {
    const parsed = JSON.parse(teks) as unknown
    const valid = validasiDataPetaCustom(parsed)
    if (!valid) {
      return { ok: false, galat: 'Format JSON peta tidak valid atau versi tidak dikenali.' }
    }
    return { ok: true, data: valid }
  } catch {
    return { ok: false, galat: 'Berkas bukan JSON yang valid.' }
  }
}
