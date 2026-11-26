import { BONUS_TANAH_TINGGI, DT_TETAP, DUNIA_H, DUNIA_W } from '@hftf/shared'
import { terhalangTile } from '../halangan.js'
import { cariJalur } from '../jalur.js'
import { bolehLangkah, keTile, tinggiDiPiksel } from '../terrain.js'
import type { Dunia, Unit } from '../tipe.js'
import { jarak, jepit } from '../util.js'

/** Sedekat apa unit dianggap sudah sampai di satu titik jalur. */
const AMBANG_TITIK = 10
/** Jarak tujuan bergeser (piksel) sebelum jalur dihitung ulang. */
const AMBANG_HITUNG_ULANG = 96

/**
 * Melangkahkan unit menuju (tx, ty) dengan MENGHORMATI TEBING & HALANGAN
 * (bangunan, tambang, pohon).
 *
 * Gerak lurus dipakai selama langkah berikutnya sah dan bebas halangan.
 * Begitu terhalang beda ketinggian atau tapak bangunan/pohon, unit beralih
 * ke jalur A* untuk memutar.
 */
export function langkahMenuju(dunia: Dunia, u: Unit, tx: number, ty: number): boolean {
  const t = dunia.terrain

  // Jalur yang ada sudah basi kalau tujuannya bergeser jauh.
  if (u.jalur && jarak(u.jalurKeX, u.jalurKeY, tx, ty) > AMBANG_HITUNG_ULANG) u.jalur = null

  // Jika titik jalur berikutnya mendadak tertutup bangunan baru, hitung ulang.
  if (u.jalur) {
    const cek = u.jalur.titik[u.jalur.ke]
    if (cek && terhalangTile(t, dunia.halangan, keTile(cek.x), keTile(cek.y))) {
      u.jalur = null
    }
  }

  if (!u.jalur) {
    const lurusSah = langkahLurusSah(dunia, u, tx, ty)
    if (lurusSah) {
      if (majuLurus(u, tx, ty)) return true
      return false
    }
    u.jalur = cariJalur(t, u.x, u.y, tx, ty, dunia.halangan)
    u.jalurKeX = tx
    u.jalurKeY = ty
    // Tidak ada jalur sama sekali: diam di tempat daripada menembus tebing/bangunan.
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

/** Langkah lurus berikutnya tidak menembus tebing maupun tapak bangunan/pohon? */
function langkahLurusSah(dunia: Dunia, u: Unit, tx: number, ty: number): boolean {
  const t = dunia.terrain
  const d = jarak(u.x, u.y, tx, ty)
  if (d < 1) return true
  const ux = keTile(u.x)
  const uy = keTile(u.y)
  const maju = Math.min(d, Math.max(u.kecepatan * DT_TETAP * 2, 24))
  const nx = u.x + ((tx - u.x) / d) * maju
  const ny = u.y + ((ty - u.y) / d) * maju
  const ntx = keTile(nx)
  const nty = keTile(ny)
  if (!bolehLangkah(t, ux, uy, ntx, nty)) return false
  if (terhalangTile(t, dunia.halangan, ntx, nty)) {
    // Jika unit sedang terjebak di dalam tile halangan, izinkan melangkah keluar;
    // tapi jangan melangkah masuk ke tile halangan baru.
    if (ntx !== ux || nty !== uy) return false
    if (terhalangTile(t, dunia.halangan, keTile(tx), keTile(ty))) return false
  }
  return true
}

function majuLurus(u: Unit, tx: number, ty: number): boolean {
  const dx = tx - u.x
  const dy = ty - u.y
  const d = Math.hypot(dx, dy)
  if (dx < -0.5) u.arah = -1
  else if (dx > 0.5) u.arah = 1

  const maju = u.kecepatan * DT_TETAP
  if (d <= maju || d === 0) {
    u.x = jepit(tx, 0, DUNIA_W)
    u.y = jepit(ty, 0, DUNIA_H)
    return true
  }
  u.x = jepit(u.x + (dx / d) * maju, 0, DUNIA_W)
  u.y = jepit(u.y + (dy / d) * maju, 0, DUNIA_H)
  if (u.tikAksi <= 0) u.aksi = u.bawaanJenis ? 'bawaLari' : 'lari'
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
export function dorong(u: Unit, dariX: number, dariY: number, kekuatan: number, dunia?: Dunia): void {
  const dx = u.x - dariX
  const dy = u.y - dariY
  const d = Math.hypot(dx, dy)
  if (d === 0) return
  const nx = jepit(u.x + (dx / d) * kekuatan, 0, DUNIA_W)
  const ny = jepit(u.y + (dy / d) * kekuatan, 0, DUNIA_H)
  if (dunia) {
    const ux = keTile(u.x)
    const uy = keTile(u.y)
    const ntx = keTile(nx)
    const nty = keTile(ny)
    if (!bolehLangkah(dunia.terrain, ux, uy, ntx, nty) || terhalangTile(dunia.terrain, dunia.halangan, ntx, nty)) {
      return
    }
  }
  u.x = nx
  u.y = ny
}

const JARAK_PISAH = 22
const DORONG_PISAH = 1.6

/**
 * Dorongan pemisah lembut antar-unit agar pasukan tidak menumpuk di satu piksel,
 * tanpa pernah mendorong unit menembus tebing, air, atau bangunan.
 */
export function pisahUnit(dunia: Dunia): void {
  const daftar = dunia.unit
  const n = daftar.length
  const t = dunia.terrain
  for (let i = 0; i < n; i++) {
    const a = daftar[i]!
    for (let j = i + 1; j < n; j++) {
      const b = daftar[j]!
      const dx = b.x - a.x
      if (dx > JARAK_PISAH || dx < -JARAK_PISAH) continue
      const dy = b.y - a.y
      if (dy > JARAK_PISAH || dy < -JARAK_PISAH) continue
      const d2 = dx * dx + dy * dy
      if (d2 >= JARAK_PISAH * JARAK_PISAH) continue
      const d = Math.sqrt(d2)
      const ux = d > 0.01 ? dx / d : ((a.id % 2 === 0 ? 1 : -1))
      const uy = d > 0.01 ? dy / d : 0
      const geser = Math.min(DORONG_PISAH, (JARAK_PISAH - d) * 0.25)

      const anx = jepit(a.x - ux * geser, 0, DUNIA_W)
      const any = jepit(a.y - uy * geser, 0, DUNIA_H)
      if (
        bolehLangkah(t, keTile(a.x), keTile(a.y), keTile(anx), keTile(any)) &&
        !terhalangTile(t, dunia.halangan, keTile(anx), keTile(any))
      ) {
        a.x = anx
        a.y = any
      }

      const bnx = jepit(b.x + ux * geser, 0, DUNIA_W)
      const bny = jepit(b.y + uy * geser, 0, DUNIA_H)
      if (
        bolehLangkah(t, keTile(b.x), keTile(b.y), keTile(bnx), keTile(bny)) &&
        !terhalangTile(t, dunia.halangan, keTile(bnx), keTile(bny))
      ) {
        b.x = bnx
        b.y = bny
      }
    }
  }
}
