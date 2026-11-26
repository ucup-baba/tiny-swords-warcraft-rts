import {
  PETA_BARIS, PETA_KOLOM, TINGGI, decodeRle, encodeRle,
  type CampPetaCustom, type DataPetaCustom, type DekoPetaCustom, type EntitasPetaCustom,
  type PohonPetaCustom, type SpawnPetaCustom, type TambangPetaCustom, type Tinggi,
} from '@hftf/shared'
import { indeks, tinggiDi, type Terrain, type TitikBasis, type TitikPenting } from './terrain.js'

/**
 * Mengonversi `DataPetaCustom` menjadi struktur `Terrain` + `TitikPenting` siap pakai `sim` & `render`.
 * Fungsi murni (deterministik, bebas DOM dan jam dinding).
 */
export function buatTerrainDariCustom(data: DataPetaCustom): { terrain: Terrain; titik: TitikPenting } {
  const kol = PETA_KOLOM
  const bar = PETA_BARIS
  const total = kol * bar
  const t: Terrain = {
    kolom: kol,
    baris: bar,
    tinggi: decodeRle(data.tinggiRle, total, TINGGI.puncak),
    ramp: decodeRle(data.rampRle, total, 3),
    jembatan: decodeRle(data.jembatanRle, total, 2),
    jalan: decodeRle(data.jalanRle, total, 1),
    bioma: data.bioma,
  }

  // Pastikan setiap jembatan bisa diinjak (>= dataran) walaupun data lama sempat berbeda
  for (let i = 0; i < total; i++) {
    if (t.jembatan[i]! > 0 && t.tinggi[i] === TINGGI.air) {
      t.tinggi[i] = TINGGI.dataran
    }
    if (t.ramp[i]! > 0 && t.tinggi[i]! < TINGGI.plateau) {
      t.tinggi[i] = TINGGI.plateau
    }
  }

  const cx = Math.floor(kol / 2)
  const cy = Math.floor(bar / 2)
  const sortedSpawn = [...data.entitas.spawn].sort((a, b) => a.slot - b.slot)
  const basis: TitikBasis[] = sortedSpawn.map((s) => ({
    tx: s.tx,
    ty: s.ty,
    arahX: s.tx < cx ? 1 : s.tx > cx ? -1 : 0,
    arahY: s.ty < cy ? 1 : s.ty > cy ? -1 : 1,
    level: tinggiDi(t, s.tx, s.ty) || TINGGI.dataran,
  }))

  const ramp: { tx: number; ty: number }[] = []
  for (let ty = 0; ty < bar; ty++) {
    for (let tx = 0; tx < kol; tx++) {
      if (t.ramp[ty * kol + tx]! > 0 && tx % 2 === 0 && ty % 2 === 0) {
        ramp.push({ tx, ty })
      }
    }
  }

  const campBesar = data.entitas.camp.find((c) => c.jenis === 'besar')
  const plateauPusat = campBesar
    ? { tx: campBesar.tx, ty: campBesar.ty }
    : { tx: cx, ty: cy }

  const ekspansi = data.entitas.tambang
    .filter((m) => !sortedSpawn.some((s) => Math.hypot(s.tx - m.tx, s.ty - m.ty) < 12))
    .map((m) => ({ tx: m.tx, ty: m.ty }))

  return {
    terrain: t,
    titik: {
      plateauPusat,
      ramp,
      plateauSamping: [],
      basis,
      ekspansi,
    },
  }
}

/**
 * Mengompresi ulang `Terrain` + entitas kembali ke `DataPetaCustom`.
 */
export function serialisasiTerrainCustom(
  t: Terrain,
  meta: { id: string; nama: string; diubahPada: number },
  entitas: EntitasPetaCustom,
): DataPetaCustom {
  return {
    versi: 1,
    id: meta.id,
    nama: meta.nama,
    bioma: t.bioma ?? 1,
    kolom: t.kolom,
    baris: t.baris,
    tinggiRle: encodeRle(t.tinggi),
    rampRle: encodeRle(t.ramp),
    jembatanRle: encodeRle(t.jembatan),
    jalanRle: encodeRle(t.jalan),
    entitas,
    diubahPada: meta.diubahPada,
  }
}

export type JenisTemplateCustom = 'empatPulau' | 'pulau' | 'laut'

/**
 * Membuat template peta siap edit/main langsung di Map Editor.
 * - `'empatPulau'`: 4 pulau berjembatan + benteng Lv.2 + puncak obelisk **Lv.3** di tengah!
 * - `'pulau'`: pulau datar luas 2 pemain + danau tengah + hutan rimbun.
 * - `'laut'`: lautan luas dengan 2 pulau sudut awal siap dipahat.
 */
export function buatTemplatePetaCustom(
  template: JenisTemplateCustom,
  id: string,
  nama: string,
  diubahPada = 0,
): DataPetaCustom {
  const kol = PETA_KOLOM
  const bar = PETA_BARIS
  const t: Terrain = {
    kolom: kol,
    baris: bar,
    tinggi: new Uint8Array(kol * bar),
    ramp: new Uint8Array(kol * bar),
    jembatan: new Uint8Array(kol * bar),
    jalan: new Uint8Array(kol * bar),
    bioma: 1,
  }

  const kotak = (x1: number, y1: number, x2: number, y2: number, val: Tinggi): void => {
    for (let ty = Math.max(0, y1); ty <= Math.min(bar - 1, y2); ty++) {
      for (let tx = Math.max(0, x1); tx <= Math.min(kol - 1, x2); tx++) {
        t.tinggi[indeks(t, tx, ty)] = val
      }
    }
  }
  const lingkaran = (cx: number, cy: number, r: number, val: Tinggi): void => {
    for (let ty = Math.max(0, cy - r); ty <= Math.min(bar - 1, cy + r); ty++) {
      for (let tx = Math.max(0, cx - r); tx <= Math.min(kol - 1, cx + r); tx++) {
        const dx = tx - cx
        const dy = ty - cy
        if (dx * dx + dy * dy <= r * r) t.tinggi[indeks(t, tx, ty)] = val
      }
    }
  }
  const jalan = (x1: number, y1: number, x2: number, y2: number): void => {
    const langkah = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1)
    for (let s = 0; s <= langkah; s++) {
      const cx = Math.round(x1 + ((x2 - x1) * s) / langkah)
      const cy = Math.round(y1 + ((y2 - y1) * s) / langkah)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = cx + dx
          const ty = cy + dy
          if (tx < 0 || ty < 0 || tx >= kol || ty >= bar) continue
          const idx = indeks(t, tx, ty)
          if (t.tinggi[idx] !== TINGGI.air && t.jembatan[idx] === 0 && t.ramp[idx] === 0) {
            t.jalan[idx] = 1
          }
        }
      }
    }
  }
  const rampKotak = (x1: number, y1: number, x2: number, y2: number, lv: Tinggi, arah: 1 | 2 | 3): void => {
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        if (tx < 0 || ty < 0 || tx >= kol || ty >= bar) continue
        const idx = indeks(t, tx, ty)
        t.tinggi[idx] = lv
        t.ramp[idx] = arah
        t.jalan[idx] = 0
      }
    }
  }
  const jembH = (x1: number, x2: number, y: number): void => {
    kotak(x1 - 2, y - 2, x1 - 1, y + 2, TINGGI.dataran)
    kotak(x2 + 1, y - 2, x2 + 2, y + 2, TINGGI.dataran)
    for (let dy = -1; dy <= 1; dy++) {
      for (let tx = x1; tx <= x2; tx++) {
        const idx = indeks(t, tx, y + dy)
        t.tinggi[idx] = TINGGI.dataran
        t.jembatan[idx] = 1
      }
    }
  }
  const jembV = (x: number, y1: number, y2: number): void => {
    kotak(x - 2, y1 - 2, x + 2, y1 - 1, TINGGI.dataran)
    kotak(x - 2, y2 + 1, x + 2, y2 + 2, TINGGI.dataran)
    for (let ty = y1; ty <= y2; ty++) {
      for (let dx = -1; dx <= 1; dx++) {
        const idx = indeks(t, x + dx, ty)
        t.tinggi[idx] = TINGGI.dataran
        t.jembatan[idx] = 2
      }
    }
  }

  const spawn: SpawnPetaCustom[] = []
  const pohon: PohonPetaCustom[] = []
  const tambang: TambangPetaCustom[] = []
  const domba: { tx: number; ty: number }[] = []
  const camp: CampPetaCustom[] = []
  const deko: DekoPetaCustom[] = []

  const tanamHutan4 = (pts: readonly [number, number][]): void => {
    const vars = ['pinus1', 'pinus2', 'daun1', 'daun2'] as const
    pts.forEach(([tx, ty], i) => {
      if (tx < 1 || ty < 1 || tx >= kol - 1 || ty >= bar - 1) return
      const idx = indeks(t, tx, ty)
      if (t.tinggi[idx] !== TINGGI.air && t.jembatan[idx] === 0 && t.ramp[idx] === 0 && t.jalan[idx] === 0) {
        pohon.push({ tx, ty, varian: vars[i % vars.length]!, kayu: 120 })
      }
    })
  }

  if (template === 'laut') {
    lingkaran(16, 16, 8, TINGGI.dataran)
    lingkaran(79, 79, 8, TINGGI.dataran)
    lingkaran(48, 48, 5, TINGGI.dataran)
    spawn.push({ slot: 0, tx: 16, ty: 15 }, { slot: 1, tx: 79, ty: 80 })
    tambang.push({ tx: 12, ty: 19, jenis: 'mine', gold: 3500 }, { tx: 83, ty: 76, jenis: 'mine', gold: 3500 })
    domba.push({ tx: 15, ty: 19 }, { tx: 18, ty: 18 }, { tx: 80, ty: 76 }, { tx: 77, ty: 77 })
    camp.push({ tx: 48, ty: 48, jenis: 'kecil' })
    tanamHutan4([[11, 12], [13, 10], [84, 83], [82, 85]])
    deko.push({ tx: 48, ty: 34, jenis: 'bebek' }, { tx: 30, ty: 60, jenis: 'batuAir1' })
    return serialisasiTerrainCustom(t, { id, nama, diubahPada }, { spawn, pohon, tambang, domba, camp, deko, bangunan: [], bonus: [] })
  }

  if (template === 'pulau') {
    kotak(9, 9, 86, 86, TINGGI.dataran)
    lingkaran(48, 48, 6, TINGGI.air)
    kotak(42, 23, 54, 34, TINGGI.plateau)
    kotak(42, 62, 54, 73, TINGGI.plateau)
    rampKotak(47, 23, 49, 24, TINGGI.plateau, 1)
    rampKotak(47, 72, 49, 73, TINGGI.plateau, 1)
    jalan(20, 74, 48, 28)
    jalan(75, 21, 48, 67)
    spawn.push({ slot: 0, tx: 19, ty: 75 }, { slot: 1, tx: 76, ty: 20 })
    tambang.push(
      { tx: 14, ty: 71, jenis: 'mine', gold: 3500 },
      { tx: 81, ty: 24, jenis: 'mine', gold: 3500 },
      { tx: 48, ty: 28, jenis: 'mine', gold: 4500 },
      { tx: 48, ty: 68, jenis: 'mine', gold: 4500 },
      { tx: 32, ty: 48, jenis: 'node', gold: 1500, varian: 1 },
      { tx: 64, ty: 48, jenis: 'node', gold: 1500, varian: 3 },
    )
    domba.push({ tx: 22, ty: 79 }, { tx: 24, ty: 77 }, { tx: 73, ty: 16 }, { tx: 71, ty: 18 })
    camp.push({ tx: 48, ty: 28, jenis: 'kecil' }, { tx: 48, ty: 68, jenis: 'kecil' }, { tx: 32, ty: 48, jenis: 'kecil' }, { tx: 64, ty: 48, jenis: 'kecil' })
    tanamHutan4([
      [13, 81], [15, 83], [12, 78], [82, 14], [80, 12], [83, 17],
      [35, 35], [60, 35], [35, 60], [60, 60],
    ])
    deko.push({ tx: 48, ty: 48, jenis: 'bebek' }, { tx: 25, ty: 74, jenis: 'semak1' }, { tx: 70, ty: 22, jenis: 'semak2' })
    return serialisasiTerrainCustom(t, { id, nama, diubahPada }, { spawn, pohon, tambang, domba, camp, deko, bangunan: [], bonus: [] })
  }

  // Template utama: 'empatPulau' — memperagakan 3 Tingkat Daratan (Lv.1 -> Lv.2 -> Puncak Lv.3)!
  kotak(5, 5, 29, 29, TINGGI.dataran)
  kotak(66, 5, 90, 29, TINGGI.dataran)
  kotak(5, 66, 29, 90, TINGGI.dataran)
  kotak(66, 66, 90, 90, TINGGI.dataran)

  // Benteng sudut Lv.2
  kotak(7, 7, 23, 23, TINGGI.plateau)
  kotak(72, 7, 88, 23, TINGGI.plateau)
  kotak(7, 72, 23, 88, TINGGI.plateau)
  kotak(72, 72, 88, 88, TINGGI.plateau)

  // Pulau pusat Lv.1 + Teras Tengah Lv.2 + Puncak Obelisk Lv.3!
  kotak(31, 31, 64, 64, TINGGI.dataran)
  kotak(37, 37, 58, 58, TINGGI.plateau)
  kotak(43, 43, 52, 52, TINGGI.puncak)

  // 4 danau bersih di teras Lv.1 luar (berjarak aman dari plateau Lv.2)
  lingkaran(34, 34, 2, TINGGI.air)
  lingkaran(61, 34, 2, TINGGI.air)
  lingkaran(34, 61, 2, TINGGI.air)
  lingkaran(61, 61, 2, TINGGI.air)

  // Jembatan penghubung
  jembV(20, 30, 35)
  jembV(75, 30, 35)
  jembV(20, 60, 65)
  jembV(75, 60, 65)
  jembH(30, 35, 20)
  jembH(60, 65, 20)
  jembH(30, 35, 75)
  jembH(60, 65, 75)
  kotak(20 - 1, 36, 30, 48, TINGGI.dataran)
  kotak(65, 36, 76, 48, TINGGI.dataran)
  kotak(20 - 1, 48, 30, 59, TINGGI.dataran)
  kotak(65, 48, 76, 59, TINGGI.dataran)
  kotak(36, 19, 59, 30, TINGGI.dataran)
  kotak(36, 65, 59, 76, TINGGI.dataran)

  // Tangga sudut Lv.2 -> Lv.1
  rampKotak(19, 22, 21, 23, TINGGI.plateau, 1)
  rampKotak(22, 19, 23, 21, TINGGI.plateau, 3)
  rampKotak(74, 22, 76, 23, TINGGI.plateau, 1)
  rampKotak(72, 19, 73, 21, TINGGI.plateau, 2)
  rampKotak(19, 72, 21, 73, TINGGI.plateau, 1)
  rampKotak(22, 74, 23, 76, TINGGI.plateau, 3)
  rampKotak(74, 72, 76, 73, TINGGI.plateau, 1)
  rampKotak(72, 74, 73, 76, TINGGI.plateau, 2)

  // Tangga pusat Lv.1 -> Lv.2
  rampKotak(46, 37, 49, 38, TINGGI.plateau, 1)
  rampKotak(46, 57, 49, 58, TINGGI.plateau, 1)
  rampKotak(37, 46, 38, 49, TINGGI.plateau, 2)
  rampKotak(57, 46, 58, 49, TINGGI.plateau, 3)

  // Tangga puncak Lv.2 -> Lv.3 (Puncak Tertinggi!)
  rampKotak(47, 43, 48, 44, TINGGI.puncak, 1)
  rampKotak(47, 51, 48, 52, TINGGI.puncak, 1)
  rampKotak(43, 47, 44, 48, TINGGI.puncak, 2)
  rampKotak(51, 47, 52, 48, TINGGI.puncak, 3)

  // Jalan pasir
  jalan(14, 14, 20, 20)
  jalan(81, 14, 75, 20)
  jalan(14, 81, 20, 75)
  jalan(81, 81, 75, 75)
  jalan(48, 20, 48, 75)
  jalan(20, 48, 75, 48)
  jalan(20, 24, 20, 48)
  jalan(75, 24, 75, 48)
  jalan(20, 48, 20, 71)
  jalan(75, 48, 75, 71)
  jalan(24, 20, 48, 20)
  jalan(48, 20, 71, 20)
  jalan(24, 75, 48, 75)
  jalan(48, 75, 71, 75)

  spawn.push(
    { slot: 0, tx: 14, ty: 14 },
    { slot: 1, tx: 81, ty: 14 },
    { slot: 2, tx: 14, ty: 81 },
    { slot: 3, tx: 81, ty: 81 },
  )

  tambang.push(
    { tx: 9, ty: 16, jenis: 'mine', gold: 3500 },
    { tx: 86, ty: 16, jenis: 'mine', gold: 3500 },
    { tx: 9, ty: 79, jenis: 'mine', gold: 3500 },
    { tx: 86, ty: 79, jenis: 'mine', gold: 3500 },
    { tx: 48, ty: 48, jenis: 'mine', gold: 6000 },
    { tx: 48, ty: 20, jenis: 'node', gold: 1500, varian: 1 },
    { tx: 48, ty: 75, jenis: 'node', gold: 1500, varian: 2 },
    { tx: 20, ty: 48, jenis: 'node', gold: 1500, varian: 3 },
    { tx: 75, ty: 48, jenis: 'node', gold: 1500, varian: 4 },
  )

  camp.push(
    { tx: 48, ty: 48, jenis: 'besar' },
    { tx: 48, ty: 20, jenis: 'kecil' },
    { tx: 48, ty: 75, jenis: 'kecil' },
    { tx: 20, ty: 48, jenis: 'kecil' },
    { tx: 75, ty: 48, jenis: 'kecil' },
  )

  domba.push(
    { tx: 12, ty: 19 }, { tx: 14, ty: 19 },
    { tx: 83, ty: 19 }, { tx: 81, ty: 19 },
    { tx: 12, ty: 76 }, { tx: 14, ty: 76 },
    { tx: 83, ty: 76 }, { tx: 81, ty: 76 },
  )

  tanamHutan4([
    [8, 8], [10, 8], [8, 10], [21, 9],
    [87, 8], [85, 8], [87, 10], [74, 9],
    [8, 87], [10, 87], [8, 85], [21, 86],
    [87, 87], [85, 87], [87, 85], [74, 86],
    [40, 40], [55, 40], [40, 55], [55, 55],
  ])

  deko.push(
    { tx: 34, ty: 34, jenis: 'bebek' },
    { tx: 46, ty: 45, jenis: 'api1' },
    { tx: 50, ty: 45, jenis: 'api1' },
    { tx: 16, ty: 12, jenis: 'semak1' },
    { tx: 79, ty: 12, jenis: 'semak2' },
    { tx: 16, ty: 83, jenis: 'semak3' },
    { tx: 79, ty: 83, jenis: 'semak4' },
    { tx: 44, ty: 10, jenis: 'awan1' },
    { tx: 52, ty: 86, jenis: 'awan2' },
  )

  return serialisasiTerrainCustom(
    t,
    { id, nama, diubahPada },
    { spawn, pohon, tambang, domba, camp, deko, bangunan: [], bonus: [] },
  )
}
