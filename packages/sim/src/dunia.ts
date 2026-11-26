import { DT_TETAP, PETA_BARIS, PETA_KOLOM, TILE, TINGGI, type Tim } from '@hftf/shared'
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
import { buatFog, langkahFog } from './sistem/fog.js'
import { langkahProyektil, langkahUnitTempur } from './sistem/tempur.js'
import type { Dunia, KeadaanTim, Statistik } from './tipe.js'
import { cariBangunan, cariUnit } from './util.js'
import { buatTerrain, keTengahPiksel, keTile, tinggiDi, type Terrain } from './terrain.js'
import { batalkanJalur, pisahUnit } from './sistem/gerak.js'

export interface OpsiDunia {
  seed: number
  heroBlue?: PeranHero
  heroRed?: PeranHero
}

function statistikKosong(): Statistik {
  return {
    bunuh: 0, gugur: 0, dagingDipungut: 0, bangunanDibangun: 0, bangunanHilang: 0,
    goldTerkumpul: 0, kayuTerkumpul: 0, dagingTerkumpul: 0, campDibersihkan: 0,
  }
}

function keadaanTim(hero: PeranHero): KeadaanTim {
  return {
    sumberDaya: { gold: 320, kayu: 220, daging: 140 },
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
  const rng = buatRng(opsi.seed)
  const { terrain, titik } = buatTerrain(rng)
  const dunia: Dunia = {
    tick: 0,
    rng,
    idBerikut: 1,
    hasil: { jenis: 'berlangsung' },
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
    fog: {
      blue: buatFog(terrain.kolom, terrain.baris),
      red: buatFog(terrain.kolom, terrain.baris),
      neutral: buatFog(terrain.kolom, terrain.baris),
    },
    tim: {
      blue: keadaanTim(opsi.heroBlue ?? 'king'),
      red: keadaanTim(opsi.heroRed ?? 'champion'),
      neutral: keadaanTim('berserker'),
    },
    kejadian: [],
  }
  isiPeta(dunia)
  return dunia
}

/**
 * Mengisi peta di atas terrain yang sudah dibentuk (PRD §9.3).
 * Simetri rotasi 180 derajat — bukan cermin.
 */
function isiPeta(dunia: Dunia): void {
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

  const basisBlue = dataranDekat(20, 76)
  const basisRed = dataranDekat(...putar(20, 76))

  for (const [tim, [btx, bty]] of [['blue', basisBlue], ['red', basisRed]] as const) {
    const arah = tim === 'blue' ? 1 : -1
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

    // Hutan: 3 rumpun per pemain (PRD §9.3). Satu di dalam basis, dua lagi
    // harus diperebutkan. Versi pertama hanya menaruh 8 pohon per basis dan
    // 25 pohon di SELURUH peta — totalnya 2.250 kayu, kurang dari biaya tiga
    // Castle, jadi ekonomi kayu mati sebelum match separuh jalan.
    const rumpun: [number, number][] = [
      [btx + 6 * arah, bty - 4 * arah],
      [btx + 16 * arah, bty - 12 * arah],
      [btx - 10 * arah, bty - 14 * arah],
    ]
    for (const [rx, ry] of rumpun) {
      for (let i = 0; i < 9; i++) {
        // Offset DI DALAM rumpun juga harus dicerminkan dengan `arah`.
        // Tanpa itu kedua rumpun menjulur ke arah absolut yang sama dan biru
        // berakhir dengan 457 kayu lebih banyak dalam radius 20 tile — 22%
        // keunggulan ekonomi yang tidak disengaja.
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

  // Camp goblin penjaga harta (PRD §10.5): satu camp kecil per tambang
  // ekspansi, dan satu camp besar menjaga tambang pusat di atas plateau.
  // Camp ditaruh TEPAT di tambang yang dijaganya. Offset absolut membuat
  // jaraknya ke tiap basis berbeda dan merusak simetri rotasi.
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

/**
 * Bangunan hanya boleh berdiri di tapak yang SERAGAM ketinggiannya — tidak
 * boleh menjembatani dua level (PRD §9.4 / AC-9.6).
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
