import {
  DT_TETAP, GOLD_AWAL_BAKU, INFO_PETA, PETA_BARIS, PETA_KOLOM, TIM, TINGGI, encodeRle, jepitGoldAwal,
  type DataPetaCustom, type JenisPeta, type KonfigSlot, type PohonPetaCustom, type SpawnPetaCustom,
  type TambangPetaCustom, type Tim, type TimPemain,
} from '@hftf/shared'
import { BANGUNAN } from './definisi/bangunan.js'
import { SEMUA_RISET, type JenisRiset } from './definisi/riset.js'
import type { PeranHero } from './definisi/unit.js'
import { buatHalangan, segarkanHalangan, terhalangTile } from './halangan.js'
import type { Perintah } from './perintah.js'
import { buatRng } from './rng.js'
import { antreLatih, batalLatih, langkahBangunan, mulaiRevive, mulaiRiset } from './sistem/bangunan.js'
import { buatDomba, langkahDombaJalan } from './sistem/domba.js'
import { bayar } from './sistem/ekonomi.js'
import { pakaiSkill } from './sistem/hero.js'
import { KAYU_POHON_BARU, langkahPawn } from './sistem/pekerja.js'
import { buatBangunan, buatUnit } from './sistem/spawn.js'
import { langkahAkhir } from './sistem/akhir.js'
import { langkahCamp, tambahCamp } from './sistem/goblin.js'
import { buatFog, langkahFog, type Fog } from './sistem/fog.js'
import { langkahProyektil, langkahUnitTempur } from './sistem/tempur.js'
import type { Dunia, KeadaanTim, Statistik } from './tipe.js'
import { cariBangunan, cariUnit } from './util.js'
import {
  adalahJalan, adalahJembatan, adalahRamp, buatTerrain, indeks, keTengahPiksel, keTile, tinggiDi,
} from './terrain.js'
import { buatTerrainDariCustom } from './peta-custom.js'
import { batalkanJalur, pisahUnit } from './sistem/gerak.js'

export interface OpsiDunia {
  seed: number
  peta?: JenisPeta
  petaCustom?: DataPetaCustom
  goldAwal?: number
  heroBlue?: PeranHero
  heroRed?: PeranHero
  slot?: readonly KonfigSlot[]
}

function statistikKosong(): Statistik {
  return {
    bunuh: 0, gugur: 0, dagingDipungut: 0, bangunanDibangun: 0, bangunanHilang: 0,
    goldTerkumpul: 0, kayuTerkumpul: 0, dagingTerkumpul: 0, campDibersihkan: 0,
  }
}

function keadaanTim(hero: PeranHero, goldAwal = GOLD_AWAL_BAKU): KeadaanTim {
  return {
    sumberDaya: { gold: goldAwal, kayu: 220, daging: 140 },
    statistik: statistikKosong(),
    heroHidup: null,
    heroGugur: null,
    heroPilihan: hero,
    riset: Object.fromEntries(SEMUA_RISET.map((r) => [r, 0])) as Record<JenisRiset, number>,
    matiEkonomiDetik: 0,
    menyerah: false,
  }
}

export function buatDunia(opsi: OpsiDunia): Dunia {
  const peta: JenisPeta = opsi.peta ?? 'klasik2'
  const petaCustom = opsi.petaCustom
  const goldAwal = jepitGoldAwal(opsi.goldAwal ?? GOLD_AWAL_BAKU)
  const rng = buatRng(opsi.seed)
  const { terrain, titik } = petaCustom
    ? buatTerrainDariCustom(petaCustom)
    : buatTerrain(rng, peta)

  const info = INFO_PETA[peta]
  const maksSlot = petaCustom
    ? Math.max(2, Math.min(6, petaCustom.entitas.spawn.length || 2))
    : info.maksPemain
  let daftarSlot: KonfigSlot[]
  if (opsi.slot && opsi.slot.length > 0) {
    daftarSlot = opsi.slot
      .filter((s) => s.jenis !== 'kosong')
      .slice(0, maksSlot)
      .map((s, idx) => ({ ...s, indeks: Math.min(maksSlot - 1, Math.max(0, s.indeks ?? idx)) }))
  } else {
    const heroUrut: PeranHero[] = [
      opsi.heroBlue ?? 'king',
      opsi.heroRed ?? 'champion',
      'knight',
      'berserker',
      'champion',
      'knight',
    ]
    const warnaPakai = info.warnaDefault.length >= maksSlot
      ? info.warnaDefault.slice(0, maksSlot)
      : INFO_PETA.bintang6.warnaDefault.slice(0, maksSlot)
    daftarSlot = warnaPakai.map((tim, i) => ({
      indeks: i,
      tim,
      jenis: i === 0 ? 'manusia' : 'ai',
      aliansi: i + 1,
      hero: heroUrut[i % heroUrut.length]!,
      kesulitanAi: 'medium',
      nama: tim.toUpperCase(),
    }))
  }

  const pemainAktif: TimPemain[] = []
  const aliansi = Object.fromEntries(TIM.map((t, i) => [t, t === 'neutral' ? 0 : i + 1])) as Record<Tim, number>
  const heroPerTim = Object.fromEntries(TIM.map((t) => [t, 'king' as PeranHero])) as Record<Tim, PeranHero>
  heroPerTim.blue = opsi.heroBlue ?? 'king'
  heroPerTim.red = opsi.heroRed ?? 'champion'
  heroPerTim.neutral = 'berserker'

  for (const s of daftarSlot) {
    if (!pemainAktif.includes(s.tim)) pemainAktif.push(s.tim)
    aliansi[s.tim] = s.aliansi
    heroPerTim[s.tim] = s.hero as PeranHero
  }
  if (pemainAktif.length === 0) {
    pemainAktif.push('blue', 'red')
  }

  const fog = Object.fromEntries(
    TIM.map((t) => [t, buatFog(terrain.kolom, terrain.baris)]),
  ) as Record<Tim, Fog>
  const tim = Object.fromEntries(
    TIM.map((t) => [t, keadaanTim(heroPerTim[t], t === 'neutral' ? GOLD_AWAL_BAKU : goldAwal)]),
  ) as Record<Tim, KeadaanTim>

  const dunia: Dunia = {
    tick: 0,
    rng,
    idBerikut: 1,
    hasil: { jenis: 'berlangsung' },
    peta,
    pemainAktif,
    aliansi,
    terrain,
    titik,
    halangan: buatHalangan(terrain.kolom, terrain.baris),
    bangunan: [],
    unit: [],
    pohon: [],
    tunggul: [],
    tambang: [],
    domba: [],
    daging: [],
    proyektil: [],
    camp: [],
    fog,
    tim,
    ...(petaCustom ? {
      dekoCustom: petaCustom.entitas.deko.map((d) => ({ ...d })),
      petaCustomNama: petaCustom.nama,
    } : {}),
    kejadian: [],
  }
  if (petaCustom) {
    isiPetaCustom(dunia, petaCustom, daftarSlot)
  } else if (peta === 'klasik2') {
    isiPetaKlasik2(dunia, daftarSlot)
  } else {
    isiPetaKepulauan(dunia, daftarSlot)
  }
  return dunia
}

/**
 * Mengisi peta di atas terrain yang sudah dibentuk (PRD §9.3).
 * Simetri rotasi 180 derajat — bukan cermin.
 */
function isiPetaKlasik2(dunia: Dunia, daftarSlot: readonly KonfigSlot[]): void {
  const t = dunia.terrain
  const putar = (tx: number, ty: number): [number, number] => [PETA_KOLOM - tx, PETA_BARIS - ty]

  /** Tile dataran terdekat dari posisi yang diinginkan; teluk acak bisa menggeser rencana. */
  const dataranDekat = (tx: number, ty: number): [number, number] => {
    for (let r = 0; r <= 16; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          if (tinggiDi(t, tx + dx, ty + dy) === TINGGI.dataran) return [tx + dx, ty + dy]
        }
      }
    }
    return [tx, ty]
  }

  const basisA = dataranDekat(20, 76)
  const basisB = dataranDekat(...putar(20, 76))
  const timA: TimPemain = daftarSlot[0]?.tim ?? 'blue'
  const timB: TimPemain = daftarSlot[1]?.tim ?? 'red'

  for (const [tim, [btx, bty], arah] of [[timA, basisA, 1], [timB, basisB, -1]] as const) {
    const P = (tx: number, ty: number): [number, number] => [keTengahPiksel(tx), keTengahPiksel(ty)]

    const [cx, cy] = P(btx, bty)
    buatBangunan(dunia, tim, 'castle', cx, cy, 'aktif')

    const [hx, hy] = P(...dataranDekat(btx - 4 * arah, bty - 4 * arah))
    buatBangunan(dunia, tim, 'house', hx, hy, 'aktif')

    // 5 pawn (PRD §9.3).
    for (let i = 0; i < 5; i++) {
      const [px, py] = P(...dataranDekat(btx + (i - 2) * arah, bty + 2 * arah))
      buatUnit(dunia, tim, 'pawn', px, py)
    }

    // Tambang aman tanpa penjaga, dekat castle (PRD §9.3).
    const [mx, my] = P(...dataranDekat(btx - 6 * arah, bty + 3 * arah))
    dunia.tambang.push({ id: dunia.idBerikut++, jenis: 'mine', x: mx, y: my, gold: 3500 })

    // Hutan: 3 rumpun per pemain (PRD §9.3).
    const rumpun: [number, number][] = [
      [btx + 6 * arah, bty - 4 * arah],
      [btx + 16 * arah, bty - 12 * arah],
      [btx - 10 * arah, bty - 14 * arah],
    ]
    for (const [rx, ry] of rumpun) {
      for (let i = 0; i < 9; i++) {
        const [tx2, ty2] = dataranDekat(rx + (i % 3) * 2 * arah, ry + Math.floor(i / 3) * 2 * arah)
        const [wx, wy] = P(tx2, ty2)
        dunia.pohon.push({ id: dunia.idBerikut++, x: wx, y: wy, kayu: 120 })
      }
    }

    // Domba di padang dekat basis.
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = P(...dataranDekat(btx + (i - 2) * 2 * arah, bty + 6 * arah))
      dunia.domba.push(buatDomba(dunia.idBerikut++, sx, sy, 45, 1.2 + i * 0.8))
    }

    // Hero hidup sejak detik pertama, gratis, tanpa supply (PRD §11.1).
    const peran = dunia.tim[tim].heroPilihan
    const [ux, uy] = P(...dataranDekat(btx + 2 * arah, bty + 3 * arah))
    const hero = buatUnit(dunia, tim, peran, ux, uy)
    dunia.tim[tim].heroHidup = hero.id

    // Tambang ekspansi, jauh dari basis. Camp goblin penjaganya menyusul di M6.
    const [ex, ey] = P(...dataranDekat(btx + 22 * arah, bty - 14 * arah))
    dunia.tambang.push({ id: dunia.idBerikut++, jenis: 'stone', x: ex, y: ey, gold: 1400 })
  }

  // Tambang pusat di atas plateau — hanya bisa dicapai lewat ramp.
  const pusat = dunia.titik.plateauPusat
  dunia.tambang.push({
    id: dunia.idBerikut++, jenis: 'mine',
    x: keTengahPiksel(pusat.tx), y: keTengahPiksel(pusat.ty), gold: 4500,
  })

  for (const tb of dunia.tambang) {
    if (tb.jenis !== 'stone') continue
    tambahCamp(dunia, 'kecil', tb.x, tb.y)
  }
  tambahCamp(dunia, 'besar', keTengahPiksel(pusat.tx), keTengahPiksel(pusat.ty))
  for (const p of dunia.titik.plateauSamping) {
    tambahCamp(dunia, 'kecil', keTengahPiksel(p.tx), keTengahPiksel(p.ty))
  }

  // Hutan netral: dua rumpun besar di dekat tiap plateau samping, diperebutkan.
  for (const p of dunia.titik.plateauSamping) {
    for (const [ox, oy] of [[10, 10], [-12, 9]] as const) {
      for (let i = 0; i < 9; i++) {
        const tx = p.tx + ox + (i % 3) * 2
        const ty = p.ty + oy + Math.floor(i / 3) * 2
        if (tinggiDi(t, tx, ty) !== TINGGI.dataran) continue
        dunia.pohon.push({ id: dunia.idBerikut++, x: keTengahPiksel(tx), y: keTengahPiksel(ty), kayu: 120 })
      }
    }
  }
  segarkanHalangan(dunia)
}

function dekatJembatan(t: Dunia['terrain'], tx: number, ty: number): boolean {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (adalahJembatan(t, tx + dx, ty + dy)) return true
    }
  }
  return false
}

/**
 * Mengisi peta kepulauan multipemain (`salib4` 4P / `bintang6` 6P) beserta benteng
 * bertingkat simetris, hutan indah di pojok pulau & pulau kecil, tambang ekspansi,
 * serta camp Goblin lengkap di pusat arena & jalur jembatan/danau.
 */
function isiPetaKepulauan(dunia: Dunia, daftarSlot: readonly KonfigSlot[]): void {
  const t = dunia.terrain
  const P = (tx: number, ty: number): [number, number] => [keTengahPiksel(tx), keTengahPiksel(ty)]

  const lahanBebas = (
    tx: number, ty: number, level: number = TINGGI.dataran, hindariJalan = false,
  ): [number, number] => {
    for (let r = 0; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          const x = tx + dx
          const y = ty + dy
          if (
            tinggiDi(t, x, y) === level &&
            !adalahRamp(t, x, y) &&
            !dekatJembatan(t, x, y) &&
            (!hindariJalan || !adalahJalan(t, x, y))
          ) {
            return [x, y]
          }
        }
      }
    }
    return [tx, ty]
  }

  const tanamPohon = (tx: number, ty: number, jarakMin = 48): boolean => {
    if (tinggiDi(t, tx, ty) === TINGGI.air || adalahRamp(t, tx, ty) || adalahJalan(t, tx, ty) || dekatJembatan(t, tx, ty)) {
      return false
    }
    const [wx, wy] = P(tx, ty)
    if (dunia.bangunan.some((b) => Math.hypot(b.x - wx, b.y - wy) < 160)) return false
    if (dunia.tambang.some((m) => Math.hypot(m.x - wx, m.y - wy) < 110)) return false
    if (dunia.pohon.some((p) => Math.hypot(p.x - wx, p.y - wy) < jarakMin)) return false
    dunia.pohon.push({ id: dunia.idBerikut++, x: wx, y: wy, kayu: 120 })
    return true
  }

  for (let idx = 0; idx < dunia.titik.basis.length; idx++) {
    const b = dunia.titik.basis[idx]!
    const levelBasis = b.level ?? TINGGI.dataran
    const slot = daftarSlot.find((s) => s.indeks === idx) ?? null
    const sx = b.arahX !== 0 ? b.arahX : (idx % 2 === 0 ? 1 : -1)
    const sy = b.arahY !== 0 ? b.arahY : 1
    const [btx, bty] = lahanBebas(b.tx, b.ty, levelBasis)

    // Setiap pulau selalu memiliki 1 tambang emas utama di benteng (bahkan jika slot kosong).
    const [mx, my] = P(...lahanBebas(btx - 5 * sx, bty + 2 * sy, levelBasis, true))
    dunia.tambang.push({ id: dunia.idBerikut++, jenis: 'mine', x: mx, y: my, gold: 3500 })

    if (slot) {
      const tim = slot.tim

      const [cx, cy] = P(btx, bty)
      buatBangunan(dunia, tim, 'castle', cx, cy, 'aktif')

      const [hx, hy] = P(...lahanBebas(btx + 4 * sx, bty - 3 * sy, levelBasis, true))
      buatBangunan(dunia, tim, 'house', hx, hy, 'aktif')

      for (let i = 0; i < 5; i++) {
        const [px, py] = P(...lahanBebas(btx + (i - 2), bty + 3 * sy, levelBasis))
        buatUnit(dunia, tim, 'pawn', px, py)
      }

      for (let i = 0; i < 4; i++) {
        const [dx, dy] = P(...lahanBebas(btx - 4 * sx + i * 2 * sx, bty + 5 * sy, levelBasis))
        dunia.domba.push(buatDomba(dunia.idBerikut++, dx, dy, 45, 1.0 + i * 0.9))
      }

      const peran = dunia.tim[tim].heroPilihan
      const [ux, uy] = P(...lahanBebas(btx + 2 * sx, bty + 4 * sy, levelBasis))
      const hero = buatUnit(dunia, tim, peran, ux, uy)
      dunia.tim[tim].heroHidup = hero.id
    }

    // Hutan indah di pojok-pojok luar & tepi tebing pulau (persis seperti ilustrasi)
    const pojokList = b.pojokPohon ?? [
      [btx - 6 * sx, bty - 6 * sy],
      [btx + 5 * sx, bty - 6 * sy],
      [btx - 6 * sx, bty + 5 * sy],
    ]
    const polaRumpun: readonly [number, number][] = [
      [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [2, 1], [-1, 2], [1, -1],
    ]
    for (const [px0, py0] of pojokList) {
      let ditanam = 0
      for (const [ox, oy] of polaRumpun) {
        if (ditanam >= 4) break
        if (tanamPohon(px0 + ox, py0 + oy, 56)) ditanam++
      }
    }
  }

  // Tambang kaya di plateau pusat + camp besar penjaga Goblin
  const pusat = dunia.titik.plateauPusat
  dunia.tambang.push({
    id: dunia.idBerikut++,
    jenis: 'mine',
    x: keTengahPiksel(pusat.tx),
    y: keTengahPiksel(pusat.ty),
    gold: dunia.peta === 'bintang6' ? 6000 : 5000,
  })
  tambahCamp(dunia, 'besar', keTengahPiksel(pusat.tx), keTengahPiksel(pusat.ty))

  // Tambang ekspansi & camp kecil Goblin di arena tengah
  for (const ek of dunia.titik.ekspansi) {
    const [tx, ty] = lahanBebas(ek.tx, ek.ty, TINGGI.dataran)
    const [ex, ey] = P(tx, ty)
    dunia.tambang.push({ id: dunia.idBerikut++, jenis: 'stone', x: ex, y: ey, gold: 1500 })
    tambahCamp(dunia, 'kecil', ex, ey)

    // Pohon-pohon rindang di sekitar tepi ekspansi (tidak menghalangi jalan pasir)
    for (const [ox, oy] of [[-4, -3], [4, -3], [-4, 3], [4, 3], [-5, 0], [5, 0]] as const) {
      tanamPohon(tx + ox, ty + oy, 60)
    }
  }

  // Camp Goblin tambahan penjaga jalur jembatan & tepi danau
  for (const cp of dunia.titik.campTambahan ?? []) {
    const [tx, ty] = lahanBebas(cp.tx, cp.ty, TINGGI.dataran)
    const [gx, gy] = P(tx, ty)
    tambahCamp(dunia, 'kecil', gx, gy)
  }

  // Pepohonan pemanis di tepi pulau mini laut & di sekitar tepi arena tengah
  for (const pk of dunia.titik.pulauKecil ?? []) {
    tanamPohon(pk.tx, pk.ty, 44)
    tanamPohon(pk.tx + 1, pk.ty, 44)
  }
  const tepiHutanTengah: readonly [number, number][] = dunia.peta === 'salib4'
    ? [
        [36, 25], [59, 25], [36, 70], [59, 70],
        [25, 36], [25, 59], [70, 36], [70, 59],
        [42, 42], [54, 42], [42, 54], [54, 54],
      ]
    : [
        [33, 40], [62, 40], [33, 55], [62, 55],
        [43, 33], [52, 33], [43, 62], [52, 62],
        [18, 40], [77, 40], [18, 55], [77, 55],
      ]
  for (const [fx, fy] of tepiHutanTengah) {
    tanamPohon(fx, fy, 64)
    tanamPohon(fx + 1, fy - 1, 64)
  }

  segarkanHalangan(dunia)
}

/**
 * Mengisi `Dunia` dari data `DataPetaCustom` buatan Map Editor secara setia.
 */
function isiPetaCustom(dunia: Dunia, data: DataPetaCustom, daftarSlot: readonly KonfigSlot[]): void {
  const t = dunia.terrain
  const P = (tx: number, ty: number): [number, number] => [keTengahPiksel(tx), keTengahPiksel(ty)]

  const lahanBebas = (tx: number, ty: number, level: number): [number, number] => {
    for (let r = 0; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          const x = tx + dx
          const y = ty + dy
          if (tinggiDi(t, x, y) === level && !adalahRamp(t, x, y) && !dekatJembatan(t, x, y)) {
            return [x, y]
          }
        }
      }
    }
    return [tx, ty]
  }

  const spawns = [...data.entitas.spawn].sort((a, b) => a.slot - b.slot)
  for (let i = 0; i < spawns.length; i++) {
    const sp = spawns[i]!
    const slot = daftarSlot.find((s) => s.indeks === sp.slot) ?? daftarSlot[i] ?? null
    if (!slot) continue
    const tim = slot.tim
    const lv = tinggiDi(t, sp.tx, sp.ty) || TINGGI.dataran
    const [btx, bty] = lahanBebas(sp.tx, sp.ty, lv)
    const cx = btx < Math.floor(t.kolom / 2) ? 1 : -1
    const cy = bty < Math.floor(t.baris / 2) ? 1 : -1

    const [wx, wy] = P(btx, bty)
    buatBangunan(dunia, tim, 'castle', wx, wy, 'aktif')

    const [hx, hy] = P(...lahanBebas(btx + 4 * cx, bty - 3 * cy, lv))
    buatBangunan(dunia, tim, 'house', hx, hy, 'aktif')

    for (let k = 0; k < 5; k++) {
      const [px, py] = P(...lahanBebas(btx + (k - 2), bty + 3 * cy, lv))
      buatUnit(dunia, tim, 'pawn', px, py)
    }

    const peran = dunia.tim[tim].heroPilihan
    const [ux, uy] = P(...lahanBebas(btx + 2 * cx, bty + 4 * cy, lv))
    const hero = buatUnit(dunia, tim, peran, ux, uy)
    dunia.tim[tim].heroHidup = hero.id
  }

  for (const p of data.entitas.pohon) {
    if (tinggiDi(t, p.tx, p.ty) === TINGGI.air) continue
    const [wx, wy] = P(p.tx, p.ty)
    dunia.pohon.push({
      id: dunia.idBerikut++,
      x: wx,
      y: wy,
      kayu: p.kayu ?? 120,
      varian: p.varian,
    })
  }

  for (const m of data.entitas.tambang) {
    if (tinggiDi(t, m.tx, m.ty) === TINGGI.air) continue
    const [wx, wy] = P(m.tx, m.ty)
    dunia.tambang.push({
      id: dunia.idBerikut++,
      jenis: m.jenis === 'mine' ? 'mine' : 'stone',
      x: wx,
      y: wy,
      gold: m.gold ?? (m.jenis === 'mine' ? 3500 : 1200),
      ...(m.varian !== undefined ? { varian: m.varian } : {}),
    })
  }

  for (let i = 0; i < data.entitas.domba.length; i++) {
    const d = data.entitas.domba[i]!
    if (tinggiDi(t, d.tx, d.ty) === TINGGI.air) continue
    const [wx, wy] = P(d.tx, d.ty)
    dunia.domba.push(buatDomba(dunia.idBerikut++, wx, wy, 45, 1.0 + (i % 5) * 0.8))
  }

  for (const c of data.entitas.camp) {
    if (tinggiDi(t, c.tx, c.ty) === TINGGI.air) continue
    const [wx, wy] = P(c.tx, c.ty)
    tambahCamp(dunia, c.jenis, wx, wy)
  }

  for (const bg of data.entitas.bangunan) {
    if (tinggiDi(t, bg.tx, bg.ty) === TINGGI.air) continue
    const slotPemilik = bg.slot >= 0
      ? (daftarSlot.find((s) => s.indeks === bg.slot) ?? daftarSlot[bg.slot] ?? null)
      : null
    const tim: Tim = slotPemilik ? slotPemilik.tim : 'neutral'
    const [wx, wy] = P(bg.tx, bg.ty)
    const b = buatBangunan(dunia, tim, bg.jenis, wx, wy, 'aktif')
    if (bg.hancur) {
      b.fase = 'hancur'
      b.hp = 0
    }
  }

  for (const bn of data.entitas.bonus) {
    if (tinggiDi(t, bn.tx, bn.ty) === TINGGI.air) continue
    const [wx, wy] = P(bn.tx, bn.ty)
    if (bn.jenis === 'daging') {
      dunia.daging.push({ id: dunia.idBerikut++, x: wx, y: wy, jumlah: bn.jumlah, sisaDetik: 600 })
    } else if (bn.jenis === 'gold') {
      dunia.tambang.push({ id: dunia.idBerikut++, jenis: 'stone', x: wx, y: wy, gold: bn.jumlah, varian: 1 })
    } else {
      dunia.pohon.push({ id: dunia.idBerikut++, x: wx, y: wy, kayu: bn.jumlah, varian: 'pinus1' })
    }
  }

  segarkanHalangan(dunia)
}

/**
 * Mengekspor salinan peta bawaan (`klasik2`, `salib4`, `bintang6`) beserta seluruh hutan, tambang,
 * domba, & camp Goblin ke format `DataPetaCustom` supaya langsung bisa diedit ulang di Map Editor!
 */
export function eksporPetaBawaanKeCustom(
  peta: JenisPeta,
  seed = 42,
  id = `edit-${peta}`,
  nama = `${INFO_PETA[peta].nama} (Edit)`,
  diubahPada = 0,
): DataPetaCustom {
  const dunia = buatDunia({ seed, peta })
  const t = dunia.terrain
  const spawn: SpawnPetaCustom[] = dunia.titik.basis.map((b, idx) => ({
    slot: idx,
    tx: b.tx,
    ty: b.ty,
  }))
  const vars = ['pinus1', 'pinus2', 'daun1', 'daun2'] as const
  const pohon: PohonPetaCustom[] = dunia.pohon.map((p, idx) => ({
    tx: keTile(p.x),
    ty: keTile(p.y),
    varian: p.varian ?? vars[idx % vars.length]!,
    kayu: Math.round(p.kayu),
  }))
  const tambang: TambangPetaCustom[] = dunia.tambang.map((m, idx) => ({
    tx: keTile(m.x),
    ty: keTile(m.y),
    jenis: m.jenis === 'mine' ? 'mine' : 'node',
    gold: Math.round(m.gold),
    ...(m.jenis === 'stone' ? { varian: (idx % 6) + 1 } : {}),
  }))
  const domba = dunia.domba.map((d) => ({ tx: keTile(d.x), ty: keTile(d.y) }))
  const camp = dunia.camp.map((c) => ({ tx: keTile(c.x), ty: keTile(c.y), jenis: c.jenis }))

  return {
    versi: 1,
    id,
    nama,
    bioma: t.bioma ?? 1,
    kolom: t.kolom,
    baris: t.baris,
    tinggiRle: encodeRle(t.tinggi),
    rampRle: encodeRle(t.ramp),
    jembatanRle: encodeRle(t.jembatan),
    jalanRle: encodeRle(t.jalan),
    entitas: {
      spawn,
      pohon,
      tambang,
      domba,
      camp,
      deko: [],
      bangunan: [],
      bonus: [],
    },
    diubahPada,
  }
}

/**
 * Bangunan hanya boleh berdiri di tapak yang SERAGAM ketinggiannya dan BUKAN jembatan.
 */
export function bolehTaruhBangunan(dunia: Dunia, jenis: Parameters<typeof buatBangunan>[2], x: number, y: number): boolean {
  const def = BANGUNAN[jenis]
  const t = dunia.terrain
  const x1 = keTile(x - def.w / 2)
  const x2 = keTile(x + def.w / 2)
  const y1 = keTile(y - def.h / 4)
  const y2 = keTile(y + def.h / 4)

  const dasar = tinggiDi(t, keTile(x), keTile(y))
  if (dasar === TINGGI.air) return false

  for (let ty = y1; ty <= y2; ty++) {
    for (let tx = x1; tx <= x2; tx++) {
      if (tinggiDi(t, tx, ty) !== dasar) return false
      if (tx >= 0 && ty >= 0 && tx < t.kolom && ty < t.baris && t.jembatan[indeks(t, tx, ty)] !== 0) {
        return false
      }
    }
  }

  // Tidak boleh menimpa bangunan lain.
  for (const b of dunia.bangunan) {
    if (b.fase === 'hancur') continue
    const lain = BANGUNAN[b.jenis]
    if (Math.abs(b.x - x) < (lain.w + def.w) / 2 && Math.abs(b.y - y) < (lain.h + def.h) / 3) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Perintah
// ---------------------------------------------------------------------------

/** Unit milik `tim` dari daftar id. Perintah ke unit orang lain diabaikan. */
function unitMilik(dunia: Dunia, tim: Tim, ids: readonly number[]): ReturnType<typeof cariUnit>[] {
  const hasil = []
  for (const id of ids) {
    const u = cariUnit(dunia, id)
    if (u && u.tim === tim) hasil.push(u)
  }
  return hasil
}

export function terapkanPerintah(dunia: Dunia, tim: Tim, p: Perintah): void {
  if (dunia.hasil.jenis !== 'berlangsung') return

  switch (p.jenis) {
    case 'pindah':
    case 'serangPindah': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = p.jenis === 'pindah' ? 'pindah' : 'serangPindah'
        u.tx = p.x
        u.ty = p.y
        u.targetId = null
        batalkanJalur(u)
      }
      return
    }
    case 'serang': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'serang'
        u.targetId = p.targetId
        batalkanJalur(u)
      }
      return
    }
    case 'stop': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'diam'
        u.targetId = null
        u.tx = u.x
        u.ty = u.y
        batalkanJalur(u)
      }
      return
    }
    case 'tahan': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u) continue
        u.tugas = 'tahan'
        u.targetId = null
      }
      return
    }
    case 'kumpul': {
      const pohon = dunia.pohon.some((x) => x.id === p.targetId)
      const tambang = dunia.tambang.some((x) => x.id === p.targetId)
      const domba = dunia.domba.some((x) => x.id === p.targetId)
      const daging = dunia.daging.some((x) => x.id === p.targetId)
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u || u.peran !== 'pawn') continue
        u.targetId = p.targetId
        u.tikPanen = 0
        u.tugas = pohon ? 'tebang' : tambang ? 'tambang' : domba ? 'gembala' : daging ? 'pungut' : 'diam'
      }
      return
    }
    case 'perbaiki': {
      const b = cariBangunan(dunia, p.targetId)
      if (!b || b.tim !== tim) return
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (!u || u.peran !== 'pawn') continue
        u.tugas = b.fase === 'konstruksi' ? 'bangun' : 'perbaiki'
        u.targetId = b.id
        batalkanJalur(u)
      }
      return
    }
    case 'bangun': {
      const punyaPawn = dunia.unit.some((u) => u.tim === tim && u.peran === 'pawn')
      if (!punyaPawn) return
      const pawn = unitMilik(dunia, tim, p.ids).find((u) => u?.peran === 'pawn') ?? null
      // Jika ids diisi tapi bukan pawn milik tim sendiri, tolak perintah tidak sah.
      if (p.ids.length > 0 && !pawn) return
      if (!bolehTaruhBangunan(dunia, p.bangunan, p.x, p.y)) return
      const def = BANGUNAN[p.bangunan]
      if (!bayar(dunia, tim, def.gold, def.kayu, 0)) return
      const b = buatBangunan(dunia, tim, p.bangunan, p.x, p.y, 'konstruksi')
      if (pawn) {
        pawn.tugas = 'bangun'
        pawn.targetId = b.id
        batalkanJalur(pawn)
      }
      return
    }
    case 'skill': {
      for (const u of unitMilik(dunia, tim, p.ids)) {
        if (u?.hero) pakaiSkill(dunia, u)
      }
      return
    }
    case 'latih': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      antreLatih(dunia, b, p.peran)
      return
    }
    case 'batalLatih': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      batalLatih(dunia, b, p.indeks)
      return
    }
    case 'rally': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      b.rallyX = p.x
      b.rallyY = p.y
      return
    }
    case 'riset': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      mulaiRiset(dunia, b, p.riset)
      return
    }
    case 'bangkitkanHero': {
      const b = cariBangunan(dunia, p.bangunanId)
      if (!b || b.tim !== tim) return
      mulaiRevive(dunia, b)
      return
    }
    case 'menyerah': {
      dunia.tim[tim].menyerah = true
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Langkah simulasi
// ---------------------------------------------------------------------------

/** Satu langkah dengan dt TETAP. dt variabel menghancurkan determinisme. */
export function langkah(dunia: Dunia): void {
  dunia.kejadian.length = 0
  if (dunia.hasil.jenis !== 'berlangsung') return

  for (const b of dunia.bangunan) langkahBangunan(dunia, b)

  // Goblin dijalankan oleh sistem camp, bukan AI unit biasa (PRD §10.3).
  langkahCamp(dunia)

  // Giliran eksekusi DIBALIK setiap tick genap.
  //
  // Unit biru selalu dibuat lebih dulu di isiPeta, jadi dengan satu arah tetap
  // mereka selalu menyerang lebih dulu di tiap tick — pada pertukaran yang
  // saling mematikan, biru menang. Efeknya terukur: 58-60% kemenangan biru di
  // matchup hero yang sama persis. Membalik arah bergantian meratakannya,
  // dan tetap deterministik karena hanya bergantung pada nomor tick.
  const mundur = dunia.tick % 2 === 0
  const n = dunia.unit.length
  for (let k = 0; k < n; k++) {
    const i = mundur ? n - 1 - k : k
    const u = dunia.unit[i]
    if (!u || u.campId !== null) continue
    if (u.skillJeda > 0) u.skillJeda -= DT_TETAP
    if (u.tikAksi > 0) u.tikAksi = Math.max(0, u.tikAksi - DT_TETAP)
    if (u.tikAksi <= 0) u.aksi = u.bawaanJenis ? 'bawaDiam' : 'diam'
    if (u.peran === 'pawn') langkahPawn(dunia, u)
    else langkahUnitTempur(dunia, u)
  }

  langkahDombaJalan(dunia)
  pisahUnit(dunia)
  langkahProyektil(dunia)

  // Daging yang tergeletak membusuk supaya peta tidak penuh.
  for (let i = dunia.daging.length - 1; i >= 0; i--) {
    const d = dunia.daging[i]!
    d.sisaDetik -= DT_TETAP
    if (d.sisaDetik <= 0) dunia.daging.splice(i, 1)
  }

  // Tunggul pohon tumbuh kembali menjadi pohon utuh bila lokasi masih bebas.
  let adaTumbuh = false
  for (let i = dunia.tunggul.length - 1; i >= 0; i--) {
    const tg = dunia.tunggul[i]!
    tg.sisaTumbuh -= DT_TETAP
    if (tg.sisaTumbuh > 0) continue
    if (terhalangTile(dunia.terrain, dunia.halangan, keTile(tg.x), keTile(tg.y))) {
      dunia.tunggul.splice(i, 1)
      continue
    }
    const terinjak = dunia.unit.some((u) => Math.hypot(u.x - tg.x, u.y - tg.y) < 36)
    if (terinjak) {
      tg.sisaTumbuh = 5
      continue
    }
    dunia.tunggul.splice(i, 1)
    dunia.pohon.push({ id: dunia.idBerikut++, x: tg.x, y: tg.y, kayu: KAYU_POHON_BARU })
    adaTumbuh = true
  }
  if (adaTumbuh) segarkanHalangan(dunia)

  langkahFog(dunia)
  langkahAkhir(dunia)
  dunia.tick++
}

export function langkahBanyak(dunia: Dunia, jumlah: number): void {
  for (let i = 0; i < jumlah; i++) langkah(dunia)
}

/** Detik permainan yang sudah berlalu. */
export const detik = (dunia: Dunia): number => dunia.tick * DT_TETAP
