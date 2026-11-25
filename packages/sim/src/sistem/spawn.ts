import type { Tim } from '@hftf/shared'
import { BANGUNAN, HP_AWAL_KONSTRUKSI, type JenisBangunan } from '../definisi/bangunan.js'
import { UNIT, type PeranUnit } from '../definisi/unit.js'
import type { Bangunan, Dunia, Unit } from '../tipe.js'

export function buatUnit(dunia: Dunia, tim: Tim, peran: PeranUnit, x: number, y: number): Unit {
  const def = UNIT[peran]
  const u: Unit = {
    id: dunia.idBerikut++,
    tim,
    peran,
    x,
    y,
    hp: def.hp,
    hpMaks: def.hp,
    dmg: def.dmg,
    jarak: def.jarak,
    jeda: def.jeda,
    kecepatan: def.kecepatan,
    jedaTimer: 0,
    tugas: 'diam',
    tx: x,
    ty: y,
    targetId: null,
    bawaanJenis: null,
    bawaanJumlah: 0,
    tikPanen: 0,
    jalur: null,
    jalurKeX: x,
    jalurKeY: y,
    campId: null,
    hero: def.hero === true,
    level: 1,
    xp: 0,
    skillJeda: 0,
  }
  dunia.unit.push(u)
  return u
}

export function buatBangunan(
  dunia: Dunia, tim: Tim, jenis: JenisBangunan, x: number, y: number,
  fase: 'konstruksi' | 'aktif' = 'aktif',
): Bangunan {
  const def = BANGUNAN[jenis]
  const b: Bangunan = {
    id: dunia.idBerikut++,
    tim,
    jenis,
    x,
    y,
    hp: fase === 'aktif' ? def.hp : Math.round(def.hp * HP_AWAL_KONSTRUKSI),
    hpMaks: def.hp,
    fase,
    sisaBangun: fase === 'aktif' ? 0 : def.waktuBangun,
    antrean: [],
    jedaTembak: 0,
    rallyX: x + (tim === 'blue' ? 95 : -95),
    rallyY: y + 60,
    revive: null,
    jedaDomba: 0,
  }
  dunia.bangunan.push(b)
  if (fase === 'aktif') dunia.tim[tim].statistik.bangunanDibangun++
  return b
}
