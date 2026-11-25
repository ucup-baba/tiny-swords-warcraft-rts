import { DT_TETAP, DUNIA_H, DUNIA_W } from '@hftf/shared'
import type { Unit } from '../tipe.js'
import { jarak, jepit } from '../util.js'

/**
 * Melangkahkan unit menuju (tx, ty). Mengembalikan true kalau sudah sampai.
 * Gerak lurus tanpa pathfinding — pathfinding yang menghormati cliff masuk M3
 * bersama terrain (PRD §18 M3).
 */
export function langkahMenuju(u: Unit, tx: number, ty: number): boolean {
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

/** Sudah cukup dekat untuk berinteraksi dengan sesuatu di (x,y)? */
export function dalamJangkauan(u: Unit, x: number, y: number, jangkauan: number): boolean {
  return jarak(u.x, u.y, x, y) <= jangkauan
}

/** Mendorong unit menjauh dari titik — dipakai knockback skill hero. */
export function dorong(u: Unit, dariX: number, dariY: number, kekuatan: number): void {
  const dx = u.x - dariX
  const dy = u.y - dariY
  const d = Math.hypot(dx, dy)
  if (d === 0) return
  u.x = jepit(u.x + (dx / d) * kekuatan, 0, DUNIA_W)
  u.y = jepit(u.y + (dy / d) * kekuatan, 0, DUNIA_H)
}
