import { DT_TETAP, DUNIA_H, DUNIA_W } from '@hftf/shared'
import { terhalangTile } from '../halangan.js'
import { acakRentang } from '../rng.js'
import { bolehLangkah, keTile } from '../terrain.js'
import type { Domba, Dunia } from '../tipe.js'
import { jepit } from '../util.js'

const KECEPATAN_DOMBA = 36
const RADIUS_JELAJAH = 115

/** Membuat objek domba lengkap dengan state gerak deterministik. */
export function buatDomba(id: number, x: number, y: number, daging = 45, jedaAwal = 1.5): Domba {
  return {
    id, x, y, daging,
    asalX: x, asalY: y,
    tx: x, ty: y,
    jedaJalan: jedaAwal,
    arah: 1,
    bergerak: false,
  }
}

/**
 * Menggerakkan domba berkeliaran santai di sekitar padang asalnya.
 * 100% deterministik memakai `dunia.rng` dan menghormati tebing + halangan bangunan.
 */
export function langkahDombaJalan(dunia: Dunia): void {
  const t = dunia.terrain
  for (const d of dunia.domba) {
    if (d.bergerak) {
      const dx = d.tx - d.x
      const dy = d.ty - d.y
      const jarak = Math.hypot(dx, dy)
      const maju = KECEPATAN_DOMBA * DT_TETAP
      if (dx < -0.5) d.arah = -1
      else if (dx > 0.5) d.arah = 1

      if (jarak <= maju || jarak < 1) {
        d.x = d.tx
        d.y = d.ty
        d.bergerak = false
        d.jedaJalan = acakRentang(dunia.rng, 2.2, 5.2)
        continue
      }

      const nx = jepit(d.x + (dx / jarak) * maju, 64, DUNIA_W - 64)
      const ny = jepit(d.y + (dy / jarak) * maju, 64, DUNIA_H - 64)
      const okTebing = bolehLangkah(t, keTile(d.x), keTile(d.y), keTile(nx), keTile(ny))
      const okHalangan = !terhalangTile(t, dunia.halangan, keTile(nx), keTile(ny))
      if (okTebing && okHalangan) {
        d.x = nx
        d.y = ny
      } else {
        d.bergerak = false
        d.jedaJalan = acakRentang(dunia.rng, 1.5, 3.5)
      }
      continue
    }

    d.jedaJalan -= DT_TETAP
    if (d.jedaJalan > 0) continue

    const sudut = acakRentang(dunia.rng, 0, Math.PI * 2)
    const r = acakRentang(dunia.rng, 34, RADIUS_JELAJAH)
    const nx = jepit(d.asalX + Math.cos(sudut) * r, 64, DUNIA_W - 64)
    const ny = jepit(d.asalY + Math.sin(sudut) * r, 64, DUNIA_H - 64)
    const ntx = keTile(nx)
    const nty = keTile(ny)
    if (bolehLangkah(t, keTile(d.x), keTile(d.y), ntx, nty) && !terhalangTile(t, dunia.halangan, ntx, nty)) {
      d.tx = nx
      d.ty = ny
      d.bergerak = true
    } else {
      d.jedaJalan = acakRentang(dunia.rng, 1.2, 2.8)
    }
  }
}
