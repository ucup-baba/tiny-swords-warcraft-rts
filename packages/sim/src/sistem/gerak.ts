import { BONUS_TANAH_TINGGI, DT_TETAP, DUNIA_H, DUNIA_W } from '@hftf/shared'
import { cariJalur } from '../jalur.js'
import { bolehLangkah, keTile, tinggiDiPiksel } from '../terrain.js'
import type { Dunia, Unit } from '../tipe.js'
import { jarak, jepit } from '../util.js'

/** Sedekat apa unit dianggap sudah sampai di satu titik jalur. */
const AMBANG_TITIK = 10
/** Jarak tujuan bergeser (piksel) sebelum jalur dihitung ulang. */
const AMBANG_HITUNG_ULANG = 96

/**
 * Melangkahkan unit menuju (tx, ty) dengan MENGHORMATI TEBING (PRD §9.2).
 *
 * Gerak lurus dipakai selama langkah berikutnya sah. Begitu terhalang beda
 * ketinggian, unit beralih ke jalur A* — inilah yang membuat unit berjalan
 * memutar ke ramp alih-alih memanjat tebing (AC-9.3).
 */
export function langkahMenuju(dunia: Dunia, u: Unit, tx: number, ty: number): boolean {
  const t = dunia.terrain

  // Jalur yang ada sudah basi kalau tujuannya bergeser jauh.
  if (u.jalur && jarak(u.jalurKeX, u.jalurKeY, tx, ty) > AMBANG_HITUNG_ULANG) u.jalur = null

  if (!u.jalur) {
    const lurusSah = langkahLurusSah(dunia, u, tx, ty)
    if (lurusSah) {
      if (majuLurus(u, tx, ty)) return true
      return false
    }
    u.jalur = cariJalur(t, u.x, u.y, tx, ty)
    u.jalurKeX = tx
    u.jalurKeY = ty
    // Tidak ada jalur sama sekali: diam di tempat daripada menembus tebing.
    if (!u.jalur) return true
  }

  const titik = u.jalur.titik[u.jalur.ke]
  if (!titik) {
    u.jalur = null
    return true
  }

  if (majuLurus(u, titik.x, titik.y) || jarak(u.x, u.y, titik.x, titik.y) <= AMBANG_TITIK) {
    u.jalur.ke++
    if (u.jalur.ke >= u.jalur.titik.length) {
      u.jalur = null
      return true
    }
  }
  return false
}

/** Langkah lurus berikutnya tidak menembus tebing? */
function langkahLurusSah(dunia: Dunia, u: Unit, tx: number, ty: number): boolean {
  const t = dunia.terrain
  const d = jarak(u.x, u.y, tx, ty)
  if (d < 1) return true
  const maju = Math.min(d, u.kecepatan * DT_TETAP * 2)
  const nx = u.x + ((tx - u.x) / d) * maju
  const ny = u.y + ((ty - u.y) / d) * maju
  return bolehLangkah(t, keTile(u.x), keTile(u.y), keTile(nx), keTile(ny))
}

function majuLurus(u: Unit, tx: number, ty: number): boolean {
  const dx = tx - u.x
  const dy = ty - u.y
  const d = Math.hypot(dx, dy)
  const maju = u.kecepatan * DT_TETAP
  if (d <= maju || d === 0) {
    u.x = jepit(tx, 0, DUNIA_W)
    u.y = jepit(ty, 0, DUNIA_H)
    return true
  }
  u.x = jepit(u.x + (dx / d) * maju, 0, DUNIA_W)
  u.y = jepit(u.y + (dy / d) * maju, 0, DUNIA_H)
  return false
}

/** Membatalkan jalur — dipanggil saat unit menerima perintah baru. */
export function batalkanJalur(u: Unit): void {
  u.jalur = null
}

export function dalamJangkauan(u: Unit, x: number, y: number, jangkauan: number): boolean {
  return jarak(u.x, u.y, x, y) <= jangkauan
}

/**
 * Jangkauan serang efektif. Unit yang berdiri lebih tinggi dari targetnya
 * mendapat +15% jarak (PRD §9.2 / AC-9.5); menyerang ke atas tidak dapat bonus.
 */
export function jangkauanEfektif(dunia: Dunia, u: Unit, targetX: number, targetY: number): number {
  const akuDi = tinggiDiPiksel(dunia.terrain, u.x, u.y)
  const diaDi = tinggiDiPiksel(dunia.terrain, targetX, targetY)
  return akuDi > diaDi ? u.jarak * BONUS_TANAH_TINGGI.jarakSerang : u.jarak
}

/** Mendorong unit menjauh dari titik — knockback skill hero. */
export function dorong(u: Unit, dariX: number, dariY: number, kekuatan: number): void {
  const dx = u.x - dariX
  const dy = u.y - dariY
  const d = Math.hypot(dx, dy)
  if (d === 0) return
  u.x = jepit(u.x + (dx / d) * kekuatan, 0, DUNIA_W)
  u.y = jepit(u.y + (dy / d) * kekuatan, 0, DUNIA_H)
}
