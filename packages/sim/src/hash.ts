import type { Dunia } from './tipe.js'

/**
 * Hash state dunia. Dipakai tes determinisme (PRD AC-8.3): seed sama +
 * perintah sama harus menghasilkan hash identik.
 *
 * Posisi dibulatkan ke 1e-6 supaya noise floating-point tidak membuat hash
 * berbeda padahal state secara praktis sama.
 */
export function hashDunia(dunia: Dunia): string {
  let h = 0x811c9dc5 // FNV-1a 32-bit offset basis
  const serap = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
  }
  const bulat = (v: number): string => (Math.round(v * 1e6) / 1e6).toString()

  serap(`t${dunia.tick}|r${dunia.rng.state}|n${dunia.idBerikut}|`)
  for (const e of dunia.entitas) {
    serap(`${e.id},${e.tim},${bulat(e.x)},${bulat(e.y)},${bulat(e.tx)},${bulat(e.ty)},${e.hp},${e.kecepatan};`)
  }
  return h.toString(16).padStart(8, '0')
}
