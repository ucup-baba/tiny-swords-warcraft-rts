import {
  PETA_BARIS, PETA_KOLOM, RAMP_MAKS, TINGGI, balikKodeRamp, cekValidasiPeta, decodeBiomaGrid,
  decodeRle, encodeRle, hitungTitikSimetri, validasiDataPetaCustom, type DataPetaCustom,
} from '@hftf/shared'
import { describe, expect, it } from 'vitest'
import {
  bolehLangkah, buatDunia, buatTemplatePetaCustom, buatTerrainDariCustom, cariJalur,
  eksporPetaBawaanKeCustom, hashDunia, keTengahPiksel, keTile, langkahBanyak,
  serialisasiTerrainCustom, type Terrain,
} from '../src/index.js'

function buatTerrainDatar(): Terrain {
  const total = PETA_KOLOM * PETA_BARIS
  return {
    kolom: PETA_KOLOM,
    baris: PETA_BARIS,
    tinggi: new Uint8Array(total).fill(TINGGI.dataran),
    ramp: new Uint8Array(total),
    jembatan: new Uint8Array(total),
    jalan: new Uint8Array(total),
    bioma: 1,
  }
}

describe('RLE, Simetri, & Validasi Peta Custom (@hftf/shared)', () => {
  it('encodeRle & decodeRle round-trip sempurna, menjepit batas, & ringkas pada grid 96x96', () => {
    const asli = new Uint8Array(PETA_KOLOM * PETA_BARIS)
    for (let i = 0; i < asli.length; i++) {
      asli[i] = i < 2000 ? 0 : i < 7000 ? 1 : i < 8500 ? 2 : 3
    }
    const rle = encodeRle(asli)
    expect(rle.length).toBeLessThan(64)
    const hasil = decodeRle(rle, asli.length, TINGGI.puncak)
    expect(hasil).toEqual(asli)

    // Nilai di luar batas dijepit ke maksNilai dan input buruk tetap aman
    const jepit = decodeRle('99*4,abc,2*3', 10, TINGGI.puncak)
    expect([...jepit.slice(0, 7)]).toEqual([3, 3, 3, 3, 2, 2, 2])
  })

  it('hitungTitikSimetri mendukung ke-5 mode simetri & balikKodeRamp membalik Timur<->Barat', () => {
    expect(hitungTitikSimetri(10, 20, 96, 96, 'mati')).toEqual([
      { tx: 10, ty: 20, balikX: false, balikY: false },
    ])
    expect(hitungTitikSimetri(10, 20, 96, 96, 'cerminX')).toEqual([
      { tx: 10, ty: 20, balikX: false, balikY: false },
      { tx: 85, ty: 20, balikX: true, balikY: false },
    ])
    expect(hitungTitikSimetri(10, 20, 96, 96, 'cerminY')).toEqual([
      { tx: 10, ty: 20, balikX: false, balikY: false },
      { tx: 10, ty: 75, balikX: false, balikY: true },
    ])
    expect(hitungTitikSimetri(10, 20, 96, 96, 'rotasi180')).toEqual([
      { tx: 10, ty: 20, balikX: false, balikY: false },
      { tx: 85, ty: 75, balikX: true, balikY: true },
    ])
    expect(hitungTitikSimetri(10, 20, 96, 96, 'empatArah')).toEqual([
      { tx: 10, ty: 20, balikX: false, balikY: false },
      { tx: 85, ty: 20, balikX: true, balikY: false },
      { tx: 10, ty: 75, balikX: false, balikY: true },
      { tx: 85, ty: 75, balikX: true, balikY: true },
    ])

    expect(balikKodeRamp(2, true)).toBe(3)
    expect(balikKodeRamp(3, true)).toBe(2)
    expect(balikKodeRamp(4, true)).toBe(5)
    expect(balikKodeRamp(5, true)).toBe(4)
    expect(balikKodeRamp(1, true)).toBe(1)
    expect(balikKodeRamp(2, false)).toBe(2)
    expect(balikKodeRamp(4, false)).toBe(4)
    expect(balikKodeRamp(5, false)).toBe(5)
  })

  it('validasiDataPetaCustom menerima data sah dan menolak bentuk/versi/RLE tidak sah', () => {
    const sah = buatTemplatePetaCustom('empatPulau', 'id-1', 'Pulau Empat', 100)
    const lolos = validasiDataPetaCustom(JSON.parse(JSON.stringify(sah)))
    expect(lolos).not.toBeNull()
    expect(lolos!.bioma).toBe(1)
    expect(lolos!.entitas.spawn).toHaveLength(4)

    expect(validasiDataPetaCustom(null)).toBeNull()
    expect(validasiDataPetaCustom('teks')).toBeNull()
    expect(validasiDataPetaCustom({ ...sah, versi: 2 })).toBeNull()
    expect(validasiDataPetaCustom({ ...sah, tinggiRle: 123 })).toBeNull()
    expect(validasiDataPetaCustom({ ...sah, tinggiRle: '0'.repeat(49_000) })).toBeNull()
    expect(validasiDataPetaCustom({ ...sah, entitas: null })).toBeNull()
  })

  it('cekValidasiPeta menolak <2 spawn, spawn di air, pulau terputus, & lompatan Lv.1->Lv.3 tanpa Lv.2', () => {
    const total = PETA_KOLOM * PETA_BARIS
    const kosong = encodeRle(new Uint8Array(total))
    const dasar = (tinggi: Uint8Array, ramp: Uint8Array, spawn: DataPetaCustom['entitas']['spawn']): DataPetaCustom => ({
      versi: 1,
      id: 'cek-uji',
      nama: 'Uji Validasi',
      bioma: 2,
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggiRle: encodeRle(tinggi),
      rampRle: encodeRle(ramp),
      jembatanRle: kosong,
      jalanRle: kosong,
      entitas: { spawn, pohon: [], tambang: [], domba: [], camp: [], deko: [], bangunan: [], bonus: [] },
      diubahPada: 1,
    })

    // 1 spawn saja -> ditolak
    const dataran = new Uint8Array(total).fill(TINGGI.dataran)
    const satuSpawn = cekValidasiPeta(dasar(dataran, new Uint8Array(total), [{ slot: 0, tx: 10, ty: 10 }]))
    expect(satuSpawn.siapMain).toBe(false)
    expect(satuSpawn.galat.some((g) => g.includes('Minimal butuh 2 Spawn'))).toBe(true)

    // Spawn di air -> ditolak
    const airSpawn = new Uint8Array(total).fill(TINGGI.dataran)
    airSpawn[10 * PETA_KOLOM + 10] = TINGGI.air
    const cekAir = cekValidasiPeta(dasar(airSpawn, new Uint8Array(total), [
      { slot: 0, tx: 10, ty: 10 },
      { slot: 1, tx: 30, ty: 30 },
    ]))
    expect(cekAir.siapMain).toBe(false)
    expect(cekAir.semuaSpawnDiDarat).toBe(false)

    // Pulau terputus lautan -> ditolak
    const pisah = new Uint8Array(total)
    pisah[10 * PETA_KOLOM + 10] = TINGGI.dataran
    pisah[10 * PETA_KOLOM + 11] = TINGGI.dataran
    pisah[50 * PETA_KOLOM + 50] = TINGGI.dataran
    pisah[50 * PETA_KOLOM + 51] = TINGGI.dataran
    const cekPisah = cekValidasiPeta(dasar(pisah, new Uint8Array(total), [
      { slot: 0, tx: 10, ty: 10 },
      { slot: 1, tx: 50, ty: 50 },
    ]))
    expect(cekPisah.siapMain).toBe(false)
    expect(cekPisah.semuaSpawnTerhubung).toBe(false)

    // Tebing Lv.1 langsung ke Lv.3 walau diberi ramp -> tetap tidak bisa dilalui (ditolak)
    const lv1Ke3 = new Uint8Array(total).fill(TINGGI.dataran)
    for (let y = 40; y <= 60; y++) {
      for (let x = 40; x <= 60; x++) lv1Ke3[y * PETA_KOLOM + x] = TINGGI.puncak
    }
    const ramp1Ke3 = new Uint8Array(total)
    for (let x = 45; x <= 55; x++) ramp1Ke3[40 * PETA_KOLOM + x] = 1
    const cekLoncat = cekValidasiPeta(dasar(lv1Ke3, ramp1Ke3, [
      { slot: 0, tx: 20, ty: 20 },
      { slot: 1, tx: 50, ty: 50 },
    ]))
    expect(cekLoncat.siapMain).toBe(false)
    expect(cekLoncat.semuaSpawnTerhubung).toBe(false)
  })
})

describe('Terrain 3-Tingkat, Template, & Ekspor Peta Bawaan (@hftf/sim)', () => {
  it('bolehLangkah mengizinkan Lv.1<->Lv.2 dan Lv.2<->Lv.3 lewat ramp, menolak tanpa ramp atau lompatan Lv.1<->Lv.3', () => {
    const t = buatTerrainDatar()
    t.tinggi[10 * PETA_KOLOM + 11] = TINGGI.plateau
    t.tinggi[10 * PETA_KOLOM + 12] = TINGGI.puncak
    t.tinggi[10 * PETA_KOLOM + 13] = TINGGI.puncak

    // Tanpa ramp: Lv.1 <-> Lv.2 maupun Lv.2 <-> Lv.3 terblokir
    expect(bolehLangkah(t, 10, 10, 11, 10)).toBe(false)
    expect(bolehLangkah(t, 11, 10, 12, 10)).toBe(false)

    // Beri ramp di plateau & puncak -> tangga 1-level bekerja dua arah
    t.ramp[10 * PETA_KOLOM + 11] = 2
    t.ramp[10 * PETA_KOLOM + 12] = 2
    expect(bolehLangkah(t, 10, 10, 11, 10)).toBe(true)
    expect(bolehLangkah(t, 11, 10, 10, 10)).toBe(true)
    expect(bolehLangkah(t, 11, 10, 12, 10)).toBe(true)
    expect(bolehLangkah(t, 12, 10, 11, 10)).toBe(true)

    // Batas puncak langsung bersebelahan dengan dataran (Lv.1 <-> Lv.3) tetap dilarang walau ada ramp
    t.tinggi[12 * PETA_KOLOM + 10] = TINGGI.dataran
    t.tinggi[12 * PETA_KOLOM + 11] = TINGGI.puncak
    t.ramp[12 * PETA_KOLOM + 11] = 2
    expect(bolehLangkah(t, 10, 12, 11, 12)).toBe(false)
    expect(bolehLangkah(t, 11, 12, 10, 12)).toBe(false)
  })

  it('buatTemplatePetaCustom menghasilkan 3 template valid; empatPulau memiliki puncak Lv.3 & simulasi deterministik 120 tick', () => {
    const t4 = buatTemplatePetaCustom('empatPulau', 'tpl-4p', 'Empat Pulau', 123)
    const tp = buatTemplatePetaCustom('pulau', 'tpl-2p', 'Pulau Datar', 123)
    const tl = buatTemplatePetaCustom('laut', 'tpl-laut', 'Lautan', 123)

    expect(cekValidasiPeta(t4).siapMain).toBe(true)
    expect(cekValidasiPeta(tp).siapMain).toBe(true)
    const cekLaut = cekValidasiPeta(tl)
    expect(validasiDataPetaCustom(tl)).not.toBeNull()
    expect(cekLaut.semuaSpawnDiDarat).toBe(true)
    expect(cekLaut.semuaSpawnTerhubung).toBe(false)

    const grid4 = decodeRle(t4.tinggiRle, PETA_KOLOM * PETA_BARIS, TINGGI.puncak)
    expect(grid4.includes(TINGGI.puncak)).toBe(true)

    const d1 = buatDunia({ seed: 1, petaCustom: t4 })
    const d2 = buatDunia({ seed: 1, petaCustom: t4 })
    langkahBanyak(d1, 120)
    langkahBanyak(d2, 120)
    expect(hashDunia(d1)).toBe(hashDunia(d2))
    expect(d1.pohon.length).toBeGreaterThanOrEqual(20)
    expect(d1.camp.length).toBeGreaterThan(0)
    expect(d1.dekoCustom?.length).toBeGreaterThan(0)
  })

  it('eksporPetaBawaanKeCustom mengekspor klasik2 (2P), salib4 (4P), & bintang6 (6P) secara valid dan siap dimainkan', () => {
    const kasus = [
      ['klasik2', 2],
      ['salib4', 4],
      ['bintang6', 6],
    ] as const

    for (const [peta, jumlahSpawn] of kasus) {
      const custom = eksporPetaBawaanKeCustom(peta, 7, `salin-${peta}`, `Salinan ${peta}`, 456)
      expect(validasiDataPetaCustom(custom)).not.toBeNull()
      expect(custom.entitas.spawn).toHaveLength(jumlahSpawn)
      expect(custom.entitas.pohon.length).toBeGreaterThan(0)
      expect(custom.entitas.tambang.length).toBeGreaterThan(0)
      expect(custom.entitas.camp.length).toBeGreaterThan(0)
      expect(custom.entitas.domba.length).toBeGreaterThan(0)

      const d = buatDunia({ seed: 7, petaCustom: custom })
      langkahBanyak(d, 60)
      expect(d.bangunan.filter((b) => b.jenis === 'castle')).toHaveLength(jumlahSpawn)
    }
  })

  it('tangga tunggal 1x1 di tebing selatan Lv.2 (h=1) & Lv.3 (h=2) mempertahankan ketinggian, valid, & dilalui A* tepat lewat 1 sel tersebut', () => {
    const total = PETA_KOLOM * PETA_BARIS
    const tinggi = new Uint8Array(total).fill(TINGGI.dataran)
    const ramp = new Uint8Array(total)
    const kosong = new Uint8Array(total)

    // Benteng Lv.2 di [20..30, 20..30] & Puncak Lv.3 di [22..28, 22..26]
    for (let ty = 20; ty <= 30; ty++) {
      for (let tx = 20; tx <= 30; tx++) tinggi[ty * PETA_KOLOM + tx] = TINGGI.plateau
    }
    for (let ty = 22; ty <= 26; ty++) {
      for (let tx = 22; tx <= 28; tx++) tinggi[ty * PETA_KOLOM + tx] = TINGGI.puncak
    }

    // Pasang tepat SATU tile tangga 1x1 di tebing selatan Lv.2 (25, 31) pada h=1
    // dan SATU tile tangga 1x1 di tebing selatan Lv.3 (25, 27) pada h=2
    ramp[31 * PETA_KOLOM + 25] = 1
    ramp[27 * PETA_KOLOM + 25] = 1

    const data: DataPetaCustom = {
      versi: 1,
      id: 'tangga-1x1',
      nama: 'Tangga 1x1 Murni',
      bioma: 1,
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggiRle: encodeRle(tinggi),
      rampRle: encodeRle(ramp),
      jembatanRle: encodeRle(kosong),
      jalanRle: encodeRle(kosong),
      entitas: {
        spawn: [
          { slot: 0, tx: 14, ty: 35 },
          { slot: 1, tx: 25, ty: 24 },
        ],
        pohon: [],
        tambang: [],
        domba: [],
        camp: [],
        deko: [],
        bangunan: [],
        bonus: [],
      },
      diubahPada: 1,
    }

    const hasil = buatTerrainDariCustom(data)
    const t = hasil.terrain
    // Tinggi tile tangga 1x1 tidak dipaksa naik ke plateau
    expect(t.tinggi[31 * PETA_KOLOM + 25]).toBe(TINGGI.dataran)
    expect(t.ramp[31 * PETA_KOLOM + 25]).toBe(1)
    expect(t.tinggi[27 * PETA_KOLOM + 25]).toBe(TINGGI.plateau)
    expect(t.ramp[27 * PETA_KOLOM + 25]).toBe(1)

    // Tebing di sebelah kiri/kanan tangga 1x1 tetap tidak bisa dipanjat
    expect(bolehLangkah(t, 24, 31, 24, 30)).toBe(false)
    expect(bolehLangkah(t, 26, 27, 26, 26)).toBe(false)
    expect(bolehLangkah(t, 25, 31, 25, 30)).toBe(true)
    expect(bolehLangkah(t, 25, 27, 25, 26)).toBe(true)

    expect(cekValidasiPeta(data).siapMain).toBe(true)
    const jalur = cariJalur(t, keTengahPiksel(14), keTengahPiksel(35), keTengahPiksel(25), keTengahPiksel(24))
    expect(jalur).not.toBeNull()
    expect(jalur!.titik.some((p) => keTile(p.x) === 25 && keTile(p.y) === 31)).toBe(true)
    expect(jalur!.titik.some((p) => keTile(p.x) === 25 && keTile(p.y) === 27)).toBe(true)
  })

  it('lereng rumput 1x1 (kode 4 Barat & 5 Timur) dipertahankan oleh RLE/validasi dan dilalui A* Lv.1 -> Lv.2 -> Lv.3', () => {
    const total = PETA_KOLOM * PETA_BARIS
    const tinggi = new Uint8Array(total).fill(TINGGI.dataran)
    const ramp = new Uint8Array(total)
    const kosong = new Uint8Array(total)

    // Plateau Lv.2 di [20..30, 20..26] & Puncak Lv.3 di [22..28, 21..24]
    for (let ty = 20; ty <= 26; ty++) {
      for (let tx = 20; tx <= 30; tx++) tinggi[ty * PETA_KOLOM + tx] = TINGGI.plateau
    }
    for (let ty = 21; ty <= 24; ty++) {
      for (let tx = 22; tx <= 28; tx++) tinggi[ty * PETA_KOLOM + tx] = TINGGI.puncak
    }

    // Pasang Lereng Rumput Barat (kode 4) 1x1 di sisi barat Lv.2 (20, 26)
    // dan Lereng Rumput Timur (kode 5) 1x1 di sisi timur Lv.3 (28, 24)
    ramp[26 * PETA_KOLOM + 20] = 4
    ramp[24 * PETA_KOLOM + 28] = 5

    // Round-trip RLE sampai RAMP_MAKS (5) tidak boleh terjepit ke 3
    const rampDekode = decodeRle(encodeRle(ramp), total, RAMP_MAKS)
    expect(rampDekode[26 * PETA_KOLOM + 20]).toBe(4)
    expect(rampDekode[24 * PETA_KOLOM + 28]).toBe(5)

    const data: DataPetaCustom = {
      versi: 1,
      id: 'lereng-rumput',
      nama: 'Lereng Rumput 3-Tingkat',
      bioma: 5,
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggiRle: encodeRle(tinggi),
      rampRle: encodeRle(ramp),
      jembatanRle: encodeRle(kosong),
      jalanRle: encodeRle(kosong),
      entitas: {
        spawn: [
          { slot: 0, tx: 16, ty: 26 },
          { slot: 1, tx: 25, ty: 22 },
        ],
        pohon: [],
        tambang: [],
        domba: [],
        camp: [],
        deko: [],
        bangunan: [],
        bonus: [],
      },
      diubahPada: 2,
    }

    const { terrain: t } = buatTerrainDariCustom(data)
    expect(t.ramp[26 * PETA_KOLOM + 20]).toBe(4)
    expect(t.ramp[24 * PETA_KOLOM + 28]).toBe(5)
    expect(bolehLangkah(t, 19, 26, 20, 26)).toBe(true)
    expect(bolehLangkah(t, 19, 25, 20, 25)).toBe(false)
    expect(bolehLangkah(t, 29, 24, 28, 24)).toBe(true)
    expect(bolehLangkah(t, 29, 23, 28, 23)).toBe(false)

    expect(cekValidasiPeta(data).siapMain).toBe(true)
    const jalur = cariJalur(t, keTengahPiksel(16), keTengahPiksel(26), keTengahPiksel(25), keTengahPiksel(22))
    expect(jalur).not.toBeNull()
    expect(jalur!.titik.some((p) => keTile(p.x) === 20 && keTile(p.y) === 26)).toBe(true)
    expect(jalur!.titik.some((p) => keTile(p.x) === 28 && keTile(p.y) === 24)).toBe(true)
  })

  it('bioma per-tile (biomaRle) & unit awal (kerajaan + goblin satuan) lolos validasi, serialisasi, & simulasi deterministik', () => {
    const total = PETA_KOLOM * PETA_BARIS
    const tinggi = new Uint8Array(total).fill(TINGGI.dataran)
    const biomaGrid = new Uint8Array(total).fill(1)
    const kosong = new Uint8Array(total)

    // Lantai 1 sisi barat Bioma 5 (Rawa), plateau tengah Bioma 4 (Zaitun), pulau timur Bioma 3 (Zamrud)
    for (let ty = 10; ty <= 40; ty++) {
      for (let tx = 10; tx <= 30; tx++) biomaGrid[ty * PETA_KOLOM + tx] = 5
    }
    for (let ty = 20; ty <= 30; ty++) {
      for (let tx = 40; tx <= 50; tx++) {
        tinggi[ty * PETA_KOLOM + tx] = TINGGI.plateau
        biomaGrid[ty * PETA_KOLOM + tx] = 4
      }
    }
    for (let ty = 10; ty <= 40; ty++) {
      for (let tx = 60; tx <= 80; tx++) biomaGrid[ty * PETA_KOLOM + tx] = 3
    }

    const tAsli: Terrain = {
      kolom: PETA_KOLOM,
      baris: PETA_BARIS,
      tinggi,
      ramp: kosong,
      jembatan: kosong,
      jalan: kosong,
      bioma: 1,
      biomaGrid,
    }
    const data = serialisasiTerrainCustom(tAsli, { id: 'mix-bioma', nama: 'Multi Bioma & Unit', diubahPada: 99 }, {
      spawn: [
        { slot: 0, tx: 18, ty: 25 },
        { slot: 1, tx: 72, ty: 25 },
      ],
      pohon: [],
      tambang: [],
      domba: [],
      camp: [],
      deko: [],
      bangunan: [],
      bonus: [],
      unit: [
        { tx: 22, ty: 25, jenis: 'lancer', slot: 0 },
        { tx: 68, ty: 25, jenis: 'mage', slot: 1 },
        { tx: 35, ty: 25, jenis: 'goblinTnt', slot: 2 }, // slot akan disanitasi ke -1 (Netral)
        { tx: 36, ty: 25, jenis: 'goblinBarrel', slot: -1 },
      ],
    })

    expect(data.biomaRle).toBeTruthy()
    const valid = validasiDataPetaCustom(JSON.parse(JSON.stringify(data)))
    expect(valid).not.toBeNull()
    expect(valid!.biomaRle).toBe(data.biomaRle)
    expect(valid!.entitas.unit).toHaveLength(4)
    expect(valid!.entitas.unit!.find((u) => u.jenis === 'goblinTnt')!.slot).toBe(-1)

    // Decode bioma per-tile akurat & tetap kompatibel peta lama tanpa biomaRle
    const decoded = decodeBiomaGrid(valid!.biomaRle, total, 1)
    expect(decoded[25 * PETA_KOLOM + 20]).toBe(5)
    expect(decoded[25 * PETA_KOLOM + 45]).toBe(4)
    expect(decoded[25 * PETA_KOLOM + 70]).toBe(3)
    const fallbackLama = decodeBiomaGrid(undefined, 16, 4)
    expect([...fallbackLama]).toEqual(Array(16).fill(4))

    // Masuk simulasi live: lancer biru, mage merah, & 2 goblin satuan muncul sesuai tempat dan deterministik
    const d1 = buatDunia({ seed: 11, petaCustom: valid! })
    const d2 = buatDunia({ seed: 11, petaCustom: valid! })
    expect(d1.terrain.biomaGrid![25 * PETA_KOLOM + 45]).toBe(4)
    expect(d1.unit.some((u) => u.tim === 'blue' && u.peran === 'lancer')).toBe(true)
    expect(d1.unit.some((u) => u.tim === 'red' && u.peran === 'mage')).toBe(true)
    const campSatuan = d1.camp.filter((c) => c.satuan !== undefined)
    expect(campSatuan).toHaveLength(2)
    for (const cs of campSatuan) {
      expect(d1.unit.filter((u) => u.campId === cs.id)).toHaveLength(1)
    }

    langkahBanyak(d1, 90)
    langkahBanyak(d2, 90)
    expect(hashDunia(d1)).toBe(hashDunia(d2))
  })
})
