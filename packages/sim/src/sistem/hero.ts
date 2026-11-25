import { SKILL, type PeranHero } from '../definisi/unit.js'
import type { Dunia, Unit } from '../tipe.js'
import { bermusuhan, jarak } from '../util.js'
import { dorong } from './gerak.js'
import { lukaiUnit, sembuhkan } from './tempur.js'

const PERAN_HERO: readonly string[] = ['berserker', 'king', 'knight', 'champion']

export const adalahHero = (peran: string): peran is PeranHero => PERAN_HERO.includes(peran)

/**
 * Mengaktifkan skill [Q] hero (PRD §4B). Mengembalikan alasan gagal, atau null
 * kalau berhasil.
 */
export function pakaiSkill(dunia: Dunia, u: Unit): string | null {
  if (!u.hero || !adalahHero(u.peran)) return 'Bukan hero'
  if (u.skillJeda > 0) return 'Skill belum siap'

  const def = SKILL[u.peran]
  u.skillJeda = def.jeda

  if (def.menyembuhkan) {
    // Royal Blessing: menyembuhkan semua sekutu di sekitar, termasuk diri sendiri.
    for (const s of dunia.unit) {
      if (s.tim !== u.tim) continue
      if (jarak(u.x, u.y, s.x, s.y) > def.radius) continue
      sembuhkan(s, def.nilai)
    }
  } else {
    // Iterasi mundur: lukaiUnit bisa menghapus unit dari array.
    for (let i = dunia.unit.length - 1; i >= 0; i--) {
      const t = dunia.unit[i]
      if (!t || !bermusuhan(t.tim, u.tim)) continue
      if (jarak(u.x, u.y, t.x, t.y) > def.radius) continue
      if (def.dorongan) dorong(t, u.x, u.y, def.dorongan)
      lukaiUnit(dunia, t, def.nilai, u)
    }
  }

  dunia.kejadian.push({
    jenis: 'skillHero', id: u.id, tim: u.tim, peran: u.peran,
    x: u.x, y: u.y, radius: def.radius,
  })
  return null
}
