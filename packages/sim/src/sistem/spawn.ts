import { DUNIA_W, type Tim } from '@hftf/shared'
import { BANGUNAN, HP_AWAL_KONSTRUKSI, type JenisBangunan } from '../definisi/bangunan.js'
import { UNIT, type PeranUnit } from '../definisi/unit.js'
import { segarkanHalangan } from '../halangan.js'
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
    arah: dunia.peta === 'klasik2' ? (tim === 'red' ? -1 : 1) : (x > DUNIA_W / 2 ? -1 : 1),
    aksi: 'diam',
    tikAksi: 0,
    sudutSerang: 0,
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
    rallyX: x + (dunia.peta === 'klasik2' ? (tim === 'blue' ? 95 : -95) : (x < DUNIA_W / 2 ? 95 : -95)),
    rallyY: y + 60,
    revive: null,
    jedaDomba: jenis === 'castle' ? 25 : jenis === 'house' ? 30 : 0,
    riset: null,
  }
  dunia.bangunan.push(b)
  // Bersihkan tunggul yang tertutup tapak bangunan baru agar pohon tidak tumbuh di dalam bangunan.
  for (let i = dunia.tunggul.length - 1; i >= 0; i--) {
    const tg = dunia.tunggul[i]!
    if (Math.abs(tg.x - x) <= def.w * 0.5 && Math.abs(tg.y - y) <= def.h * 0.4) {
      dunia.tunggul.splice(i, 1)
    }
  }
  if (fase === 'aktif') dunia.tim[tim].statistik.bangunanDibangun++
  segarkanHalangan(dunia)
  return b
}
