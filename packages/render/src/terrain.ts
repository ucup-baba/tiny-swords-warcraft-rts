import { DEKO, TERRAIN, TERRAIN_FREE, frame, url, type Aset } from '@hftf/aset'
import { TILE, TINGGI, type TemaBioma } from '@hftf/shared'
import type { Terrain } from '@hftf/sim'

function asetBioma(bioma?: TemaBioma): Aset {
  switch (bioma) {
    case 2: return TERRAIN_FREE.tileBioma2
    case 3: return TERRAIN_FREE.tileBioma3
    case 4: return TERRAIN_FREE.tileBioma4
    case 5: return TERRAIN_FREE.tileBioma5
    default: return TERRAIN_FREE.tileHijau
  }
}
import { BARIS_ELEV, GUGUS_FLAT, selAutotile } from './autotile.js'
import { gambarDari } from './gambar.js'
import type { Kamera } from './kamera.js'
import { pandangan } from './kamera.js'

const TILE_PER_CHUNK = 8
const UKURAN_CHUNK = TILE_PER_CHUNK * TILE
const MAKS_CHUNK = 20
/** Batas chunk baru yang dipanggang per frame agar geser kamera cepat tetap 60 FPS mulus. */
const MAKS_BAKE_PER_FRAME = 1

/** Hash koordinat -> angka. Deterministik, jadi dekorasi selalu sama persis. */
function cakar(x: number, y: number): number {
  let n = (x * 73856093) ^ (y * 19349663)
  n = (n ^ (n >>> 13)) >>> 0
  return (Math.imul(n, 1274126177) >>> 0) % 100000
}

const DAFTAR_DEKO: readonly (Aset | undefined)[] = Array.from({ length: 15 }, (_, i) =>
  DEKO[`deco${String(i + 1).padStart(2, '0')}`],
)

const BATU_AIR: readonly Aset[] = [
  TERRAIN.batuAir1, TERRAIN.batuAir2, TERRAIN.batuAir3, TERRAIN.batuAir4,
]

interface Chunk {
  kanvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
  bersih: boolean
  pakaiKe: number
}

interface RentangJembatan {
  horiz: boolean
  x1: number
  x2: number
  y1: number
  y2: number
}

interface BatuAirPos {
  x: number
  y: number
  varian: number
  fase: number
}

interface AwanPos {
  x0: number
  y: number
  varian: 0 | 1
  kecepatan: number
  skala: number
}

export interface OpsiRenderTerrain {
  /** Matikan dekorasi prosedural (dipakai pada peta custom & Map Editor agar 100% WYSIWYG). */
  tanpaDekoAcak?: boolean
}

/**
 * Perender terrain bertingkat 3 level bergaya Tiny Swords resmi (5 tema bioma Tilemap_color1..5 + Update 010):
 * - Pulau Level 1 (dataran) duduk di atas tebing batu laut + busa pantai lembut.
 * - Benteng & Plateau Level 2 duduk di atas tebing batu + bayangan tebing + tangga batu N/S/W/E.
 * - Puncak Level 3 duduk bertumpuk rapi di atas Level 2 dengan tebing, tangga, & highlight puncak cerah.
 * - Jalan tanah/pasir keemasan, jembatan kayu tanpa sela air, batu air beranimasi, & awan lembut.
 */
export class PeremajaTerrain {
  private readonly kolom: number
  private readonly baris: number
  private readonly kolomChunk: number
  private readonly barisChunk: number
  private tanpaDekoAcak: boolean
  private readonly butuhAir: Uint8Array
  private readonly busaPantai: Uint8Array
  /** Level 1 (dataran) pakai blok elevated Tilemap_color1..5 (kol 5..8, bar 0..3). */
  private readonly daratKol: Int8Array
  private readonly daratBar: Int8Array
  /** Tebing laut jatuh ke tile air (tx, ty+1): nilai 0..3 = kol (5+k, bar 5). */
  private readonly tebingLautKol: Int8Array
  /** Jalan pasir pada seluruh level permukaan (Tilemap_Flat kol 5..8). */
  private readonly jalanSx: Int16Array
  private readonly jalanSy: Int16Array
  /** Level 2 (plateau) permukaan rumput bertingkat (kol 5..8, bar 0..3). */
  private readonly platKol: Int8Array
  private readonly platBar: Int8Array
  /** Tebing plateau Lv.2 jatuh ke tile (tx, ty+1): kol 0..3, baris 4 (di atas rumput) atau 5 (di atas air). */
  private readonly tebingPlatKol: Int8Array
  private readonly tebingPlatBar: Int8Array
  /** Ramp Lv.1 <-> Lv.2: 0=bukan, 1=N/S, 2=barat, 3=timur. */
  private readonly jenisRamp: Uint8Array
  private readonly rampKol: Int8Array
  private readonly rampBar: Int8Array
  /** Tangga lanjutan di kaki tebing selatan ramp Lv.2 (ty+1). */
  private readonly tanggaBawahKol: Int8Array
  /** Level 3 (puncak) permukaan tertinggi bertumpuk di atas Level 2. */
  private readonly puncakKol: Int8Array
  private readonly puncakBar: Int8Array
  private readonly tebingPuncakKol: Int8Array
  private readonly tebingPuncakBar: Int8Array
  /** Ramp Lv.2 <-> Lv.3: 0=bukan, 1=N/S, 2=barat, 3=timur. */
  private readonly jenisRamp3: Uint8Array
  private readonly ramp3Kol: Int8Array
  private readonly ramp3Bar: Int8Array
  private readonly tangga3BawahKol: Int8Array
  private readonly dekoIdx: Int8Array

  private daftarJembatan: RentangJembatan[] = []
  private daftarBatuAir: BatuAirPos[] = []
  private daftarAwan: AwanPos[] = []
  private tanggaBarat: HTMLCanvasElement | null = null
  private tanggaTimur: HTMLCanvasElement | null = null
  private readonly chunk = new Map<string, Chunk>()
  private urutanPakai = 0

  constructor(private terrain: Terrain, opsi: OpsiRenderTerrain = {}) {
    this.kolom = terrain.kolom
    this.baris = terrain.baris
    this.kolomChunk = Math.ceil(this.kolom / TILE_PER_CHUNK)
    this.barisChunk = Math.ceil(this.baris / TILE_PER_CHUNK)
    this.tanpaDekoAcak = opsi.tanpaDekoAcak ?? false
    const total = this.kolom * this.baris
    this.butuhAir = new Uint8Array(total)
    this.busaPantai = new Uint8Array(total)
    this.daratKol = new Int8Array(total).fill(-1)
    this.daratBar = new Int8Array(total).fill(-1)
    this.tebingLautKol = new Int8Array(total).fill(-1)
    this.jalanSx = new Int16Array(total).fill(-1)
    this.jalanSy = new Int16Array(total).fill(-1)
    this.platKol = new Int8Array(total).fill(-1)
    this.platBar = new Int8Array(total).fill(-1)
    this.tebingPlatKol = new Int8Array(total).fill(-1)
    this.tebingPlatBar = new Int8Array(total).fill(-1)
    this.jenisRamp = new Uint8Array(total)
    this.rampKol = new Int8Array(total).fill(-1)
    this.rampBar = new Int8Array(total).fill(-1)
    this.tanggaBawahKol = new Int8Array(total).fill(-1)
    this.puncakKol = new Int8Array(total).fill(-1)
    this.puncakBar = new Int8Array(total).fill(-1)
    this.tebingPuncakKol = new Int8Array(total).fill(-1)
    this.tebingPuncakBar = new Int8Array(total).fill(-1)
    this.jenisRamp3 = new Uint8Array(total)
    this.ramp3Kol = new Int8Array(total).fill(-1)
    this.ramp3Bar = new Int8Array(total).fill(-1)
    this.tangga3BawahKol = new Int8Array(total).fill(-1)
    this.dekoIdx = new Int8Array(total).fill(-1)
    this.bangunTabel()
  }

  /** Membangun ulang tabel autotile & menandai seluruh chunk perlu dipanggang ulang. */
  kotorkanSemua(): void {
    this.bangunTabel()
    for (const c of this.chunk.values()) c.bersih = false
  }

  /** Memperbarui hanya chunk yang menyentuh kotak tile [tx1..tx2, ty1..ty2] (cepat untuk kuas Editor!). */
  kotorkanArea(tx1: number, ty1: number, tx2: number, ty2: number): void {
    this.bangunTabel()
    const cx1 = Math.max(0, Math.floor((Math.min(tx1, tx2) - 2) / TILE_PER_CHUNK))
    const cy1 = Math.max(0, Math.floor((Math.min(ty1, ty2) - 2) / TILE_PER_CHUNK))
    const cx2 = Math.min(this.kolomChunk - 1, Math.floor((Math.max(tx1, tx2) + 2) / TILE_PER_CHUNK))
    const cy2 = Math.min(this.barisChunk - 1, Math.floor((Math.max(ty1, ty2) + 2) / TILE_PER_CHUNK))
    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const c = this.chunk.get(`${cx},${cy}`)
        if (c) c.bersih = false
      }
    }
  }

  /** Mengganti referensi Terrain (mis. undo/redo atau buka template baru di Editor). */
  setTerrain(terrain: Terrain, tanpaDekoAcak?: boolean): void {
    this.terrain = terrain
    if (tanpaDekoAcak !== undefined) this.tanpaDekoAcak = tanpaDekoAcak
    this.kotorkanSemua()
  }

  private bangunTabel(): void {
    const t = this.terrain
    const kol = this.kolom
    const bar = this.baris
    const h = (tx: number, ty: number): number => {
      if (tx < 0 || ty < 0 || tx >= kol || ty >= bar) return TINGGI.air
      return t.tinggi[ty * kol + tx]!
    }
    const rampVal = (tx: number, ty: number): number =>
      tx >= 0 && ty >= 0 && tx < kol && ty < bar ? (t.ramp[ty * kol + tx] ?? 0) : 0
    const isRamp = (tx: number, ty: number): boolean => rampVal(tx, ty) > 0
    const jemb = (tx: number, ty: number): number =>
      tx >= 0 && ty >= 0 && tx < kol && ty < bar ? (t.jembatan[ty * kol + tx] ?? 0) : 0
    const jln = (tx: number, ty: number): boolean =>
      tx >= 0 && ty >= 0 && tx < kol && ty < bar && (t.jalan?.[ty * kol + tx] ?? 0) === 1
    const darat = (tx: number, ty: number): boolean => h(tx, ty) !== TINGGI.air && jemb(tx, ty) === 0
    const atas2 = (tx: number, ty: number): boolean => h(tx, ty) >= TINGGI.plateau
    const atas3 = (tx: number, ty: number): boolean => h(tx, ty) >= TINGGI.puncak
    const isRampLv = (tx: number, ty: number, lv: number): boolean => h(tx, ty) === lv && rampVal(tx, ty) > 0

    this.butuhAir.fill(0)
    this.busaPantai.fill(0)
    this.daratKol.fill(-1)
    this.daratBar.fill(-1)
    this.tebingLautKol.fill(-1)
    this.jalanSx.fill(-1)
    this.jalanSy.fill(-1)
    this.platKol.fill(-1)
    this.platBar.fill(-1)
    this.tebingPlatKol.fill(-1)
    this.tebingPlatBar.fill(-1)
    this.jenisRamp.fill(0)
    this.rampKol.fill(-1)
    this.rampBar.fill(-1)
    this.tanggaBawahKol.fill(-1)
    this.puncakKol.fill(-1)
    this.puncakBar.fill(-1)
    this.tebingPuncakKol.fill(-1)
    this.tebingPuncakBar.fill(-1)
    this.jenisRamp3.fill(0)
    this.ramp3Kol.fill(-1)
    this.ramp3Bar.fill(-1)
    this.tangga3BawahKol.fill(-1)
    this.dekoIdx.fill(-1)
    this.daftarJembatan = []
    this.daftarBatuAir = []
    this.daftarAwan = []

    // 1. Kumpulkan rentang jembatan yang menyatu (untuk gambar utuh tanpa sela & tanpa terpotong chunk).
    const sudahJemb = new Uint8Array(kol * bar)
    for (let ty = 0; ty < bar; ty++) {
      for (let tx = 0; tx < kol; tx++) {
        const jv = jemb(tx, ty)
        if (jv === 0 || sudahJemb[ty * kol + tx] === 1) continue
        let x2 = tx
        while (x2 + 1 < kol && jemb(x2 + 1, ty) === jv && sudahJemb[ty * kol + x2 + 1] === 0) x2++
        let y2 = ty
        while (y2 + 1 < bar) {
          let penuh = true
          for (let x = tx; x <= x2; x++) {
            if (jemb(x, y2 + 1) !== jv || sudahJemb[(y2 + 1) * kol + x] === 1) {
              penuh = false
              break
            }
          }
          if (!penuh) break
          y2++
        }
        for (let y = ty; y <= y2; y++) {
          for (let x = tx; x <= x2; x++) sudahJemb[y * kol + x] = 1
        }
        this.daftarJembatan.push({ horiz: jv === 1, x1: tx, x2, y1: ty, y2 })
      }
    }

    // 2. Hitung autotile daratan, tebing laut, busa pantai, jalan pasir, plateau, tebing plateau, & ramp.
    for (let ty = 0; ty < bar; ty++) {
      const off = ty * kol
      for (let tx = 0; tx < kol; tx++) {
        const i = off + tx
        const hv = h(tx, ty)
        const jv = jemb(tx, ty)

        if (hv === TINGGI.air || jv > 0) {
          this.butuhAir[i] = 1
          // Batu air dekoratif di perairan terbuka (jauh dari jembatan & tebing selatan)
          if (
            !this.tanpaDekoAcak &&
            hv === TINGGI.air &&
            !darat(tx, ty - 1) && !darat(tx, ty - 2) &&
            !darat(tx - 1, ty) && !darat(tx + 1, ty) && !darat(tx, ty + 1) &&
            jemb(tx - 1, ty) === 0 && jemb(tx + 1, ty) === 0 &&
            jemb(tx, ty - 1) === 0 && jemb(tx, ty + 1) === 0
          ) {
            const ac = cakar(tx, ty)
            if (ac % 37 === 0) {
              this.daftarBatuAir.push({
                x: tx * TILE + TILE / 2,
                y: ty * TILE + TILE / 2,
                varian: (ac >> 3) % BATU_AIR.length,
                fase: (ac % 17) * 0.4,
              })
            }
          }
          continue
        }

        // Daratan Level 1 (pakai elevated grass Tilemap_color1 kol 5..8 + tebing laut baris 5 di selatan!)
        const sel = selAutotile(darat(tx - 1, ty), darat(tx + 1, ty), darat(tx, ty - 1), darat(tx, ty + 1))
        this.daratKol[i] = sel.kol
        this.daratBar[i] = sel.bar
        if (sel.kol !== 1 || sel.bar !== 1) {
          this.butuhAir[i] = 1
          this.busaPantai[i] = 1
        }
        // Jika tile langsung di selatan adalah air (bukan jembatan), pasang tebing batu laut!
        if (ty + 1 < bar && h(tx, ty + 1) === TINGGI.air && jemb(tx, ty + 1) === 0) {
          const idxBawah = (ty + 1) * kol + tx
          this.tebingLautKol[idxBawah] = sel.kol
          this.butuhAir[idxBawah] = 1
          this.busaPantai[idxBawah] = 1
        }

        // Jalan tanah/pasir keemasan
        if (jln(tx, ty) && !isRamp(tx, ty)) {
          const sj = selAutotile(
            jln(tx - 1, ty) || jemb(tx - 1, ty) === 1 || isRamp(tx - 1, ty),
            jln(tx + 1, ty) || jemb(tx + 1, ty) === 1 || isRamp(tx + 1, ty),
            jln(tx, ty - 1) || jemb(tx, ty - 1) === 2 || isRamp(tx, ty - 1),
            jln(tx, ty + 1) || jemb(tx, ty + 1) === 2 || isRamp(tx, ty + 1),
          )
          this.jalanSx[i] = (GUGUS_FLAT.pasir + sj.kol) * TILE
          this.jalanSy[i] = sj.bar * TILE
        }

        // Level 2: Plateau & Ramp / Tangga batu Lv.1 <-> Lv.2
        if (hv >= TINGGI.plateau) {
          const rv2 = hv === TINGGI.plateau ? rampVal(tx, ty) : 0
          if (rv2 === 1) {
            const sr = selAutotile(isRampLv(tx - 1, ty, TINGGI.plateau) && rampVal(tx - 1, ty) === 1, isRampLv(tx + 1, ty, TINGGI.plateau) && rampVal(tx + 1, ty) === 1, true, true)
            this.jenisRamp[i] = 1
            this.rampKol[i] = sr.kol
            if (ty + 1 < bar && h(tx, ty + 1) === TINGGI.dataran && !isRamp(tx, ty + 1)) {
              this.tanggaBawahKol[(ty + 1) * kol + tx] = sr.kol
            }
          } else if (rv2 === 2 || rv2 === 3) {
            const sb = selAutotile(true, true, isRampLv(tx, ty - 1, TINGGI.plateau) && rampVal(tx, ty - 1) === rv2, isRampLv(tx, ty + 1, TINGGI.plateau) && rampVal(tx, ty + 1) === rv2)
            this.jenisRamp[i] = rv2
            this.rampBar[i] = sb.bar
            if (ty + 1 < bar && !atas2(tx, ty + 1) && !isRampLv(tx, ty + 1, TINGGI.plateau)) {
              const idxBawah = (ty + 1) * kol + tx
              const kiriPlat = atas2(tx - 1, ty)
              const kananPlat = atas2(tx + 1, ty)
              this.tebingPlatKol[idxBawah] = kiriPlat && kananPlat ? 1 : kiriPlat ? 2 : kananPlat ? 0 : 3
              this.tebingPlatBar[idxBawah] = h(tx, ty + 1) === TINGGI.air ? 5 : 4
            }
          } else {
            const sp = selAutotile(
              atas2(tx - 1, ty), atas2(tx + 1, ty), atas2(tx, ty - 1), atas2(tx, ty + 1),
            )
            this.platKol[i] = sp.kol
            this.platBar[i] = sp.bar
            if (ty + 1 < bar && !atas2(tx, ty + 1) && !isRampLv(tx, ty + 1, TINGGI.plateau)) {
              const idxBawah = (ty + 1) * kol + tx
              this.tebingPlatKol[idxBawah] = sp.kol
              this.tebingPlatBar[idxBawah] = h(tx, ty + 1) === TINGGI.air ? 5 : 4
            }
          }
        }

        // Level 3: Puncak tertinggi & Ramp / Tangga batu Lv.2 <-> Lv.3
        if (hv === TINGGI.puncak) {
          const rv3 = rampVal(tx, ty)
          if (rv3 === 1) {
            const sr3 = selAutotile(isRampLv(tx - 1, ty, TINGGI.puncak) && rampVal(tx - 1, ty) === 1, isRampLv(tx + 1, ty, TINGGI.puncak) && rampVal(tx + 1, ty) === 1, true, true)
            this.jenisRamp3[i] = 1
            this.ramp3Kol[i] = sr3.kol
            if (ty + 1 < bar && h(tx, ty + 1) === TINGGI.plateau && !isRamp(tx, ty + 1)) {
              this.tangga3BawahKol[(ty + 1) * kol + tx] = sr3.kol
            }
          } else if (rv3 === 2 || rv3 === 3) {
            const sb3 = selAutotile(true, true, isRampLv(tx, ty - 1, TINGGI.puncak) && rampVal(tx, ty - 1) === rv3, isRampLv(tx, ty + 1, TINGGI.puncak) && rampVal(tx, ty + 1) === rv3)
            this.jenisRamp3[i] = rv3
            this.ramp3Bar[i] = sb3.bar
            if (ty + 1 < bar && !atas3(tx, ty + 1) && !isRampLv(tx, ty + 1, TINGGI.puncak)) {
              const idxBawah = (ty + 1) * kol + tx
              const kiriP = atas3(tx - 1, ty)
              const kananP = atas3(tx + 1, ty)
              this.tebingPuncakKol[idxBawah] = kiriP && kananP ? 1 : kiriP ? 2 : kananP ? 0 : 3
              this.tebingPuncakBar[idxBawah] = h(tx, ty + 1) === TINGGI.air ? 5 : 4
            }
          } else {
            const s3 = selAutotile(
              atas3(tx - 1, ty), atas3(tx + 1, ty), atas3(tx, ty - 1), atas3(tx, ty + 1),
            )
            this.puncakKol[i] = s3.kol
            this.puncakBar[i] = s3.bar
            if (ty + 1 < bar && !atas3(tx, ty + 1) && !isRampLv(tx, ty + 1, TINGGI.puncak)) {
              const idxBawah = (ty + 1) * kol + tx
              this.tebingPuncakKol[idxBawah] = s3.kol
              this.tebingPuncakBar[idxBawah] = h(tx, ty + 1) === TINGGI.air ? 5 : 4
            }
          }
        }
      }
    }

    // 3. Dekorasi rumput/bunga/jamur/batu prosedural (hanya untuk peta bawaan, bukan peta custom WYSIWYG).
    if (!this.tanpaDekoAcak) {
      for (let ty = 0; ty < bar; ty++) {
        const off = ty * kol
        for (let tx = 0; tx < kol; tx++) {
          const i = off + tx
          if (!darat(tx, ty)) continue
          if (isRamp(tx, ty) || jln(tx, ty)) continue
          if (
            this.tebingPlatKol[i]! >= 0 || this.tanggaBawahKol[i]! >= 0 ||
            this.tebingPuncakKol[i]! >= 0 || this.tangga3BawahKol[i]! >= 0
          ) continue
          const acak = cakar(tx, ty)
          if (acak % 9 === 0) this.dekoIdx[i] = (acak >> 4) % 15
        }
      }

      // 4. Awan dekoratif lembut melayang di pinggiran laut luar peta (seperti ilustrasi Free Pack).
      const duniaW = kol * TILE
      const duniaH = bar * TILE
      for (let k = 0; k < 10; k++) {
        const sisiAtasBawah = k < 6
        const y = sisiAtasBawah
          ? (k % 2 === 0 ? 110 + k * 28 : duniaH - 170 - (k % 3) * 32)
          : 900 + (k - 6) * 1150
        const x0 = sisiAtasBawah
          ? ((k * 1070) % duniaW)
          : (k % 2 === 0 ? 90 : duniaW - 260)
        this.daftarAwan.push({
          x0,
          y,
          varian: (k % 2) as 0 | 1,
          kecepatan: 10 + (k % 4) * 4,
          skala: 0.45 + (k % 3) * 0.12,
        })
      }
    }
  }

  gambar(ctx: CanvasRenderingContext2D, kam: Kamera, waktu: number, cepat = false): void {
    const p = pandangan(kam, TILE * 2)
    const cx1 = Math.max(0, Math.floor(p.x1 / UKURAN_CHUNK))
    const cy1 = Math.max(0, Math.floor(p.y1 / UKURAN_CHUNK))
    const cx2 = Math.min(this.kolomChunk - 1, Math.floor(p.x2 / UKURAN_CHUNK))
    const cy2 = Math.min(this.barisChunk - 1, Math.floor(p.y2 / UKURAN_CHUNK))

    this.urutanPakai++
    let jumlahBake = 0
    const batasBake = cepat ? 8 : MAKS_BAKE_PER_FRAME
    for (let cy = cy1; cy <= cy2; cy++) {
      for (let cx = cx1; cx <= cx2; cx++) {
        const kunci = `${cx},${cy}`
        const ada = this.chunk.get(kunci)
        if (ada && ada.bersih) {
          ada.pakaiKe = this.urutanPakai
          ctx.drawImage(ada.kanvas, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK, UKURAN_CHUNK + 0.75, UKURAN_CHUNK + 0.75)
          continue
        }
        if (jumlahBake < batasBake) {
          const c = this.ambilAtauDaurChunk(kunci)
          this.gambarRentangTile(c.ctx!, cx * TILE_PER_CHUNK, cy * TILE_PER_CHUNK, 0, 0)
          c.bersih = true
          c.pakaiKe = this.urutanPakai
          ctx.drawImage(c.kanvas, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK, UKURAN_CHUNK + 0.75, UKURAN_CHUNK + 0.75)
          jumlahBake++
        } else {
          this.gambarRentangTile(ctx, cx * TILE_PER_CHUNK, cy * TILE_PER_CHUNK, cx * UKURAN_CHUNK, cy * UKURAN_CHUNK)
        }
      }
    }

    // Pass dinamis ringan: batu air beranimasi, jembatan utuh tanpa sela, & awan lembut di tepi laut.
    this.gambarBatuAir(ctx, p, waktu)
    this.gambarJembatanUtuh(ctx, p)
    this.gambarAwanTepi(ctx, p, waktu)
    void url
  }

  private gambarBatuAir(
    ctx: CanvasRenderingContext2D,
    p: { x1: number; y1: number; x2: number; y2: number },
    waktu: number,
  ): void {
    for (let i = 0; i < this.daftarBatuAir.length; i++) {
      const b = this.daftarBatuAir[i]!
      if (b.x < p.x1 - 64 || b.x > p.x2 + 64 || b.y < p.y1 - 64 || b.y > p.y2 + 64) continue
      const aset = BATU_AIR[b.varian]!
      const im = gambarDari(aset)
      if (!im) continue
      const f = frame(aset, Math.floor(waktu * aset.fps + b.fase) % aset.kolom)
      ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, b.x - 44, b.y - 44, 88, 88)
    }
  }

  /**
   * Menggambar setiap jembatan kayu secara utuh dalam satu pass (melewati batas chunk
   * dan menancap 14px ke kedua tepi daratan sehingga NOL sela air di kedua ujung!).
   */
  private gambarJembatanUtuh(
    ctx: CanvasRenderingContext2D,
    p: { x1: number; y1: number; x2: number; y2: number },
  ): void {
    const jembIm = gambarDari(TERRAIN.jembatan)
    if (!jembIm) return
    ctx.imageSmoothingEnabled = false

    for (let idx = 0; idx < this.daftarJembatan.length; idx++) {
      const j = this.daftarJembatan[idx]!
      const bx1 = j.x1 * TILE - 20
      const bx2 = (j.x2 + 1) * TILE + 20
      const by1 = j.y1 * TILE - 20
      const by2 = (j.y2 + 1) * TILE + 20
      if (bx2 < p.x1 || bx1 > p.x2 || by2 < p.y1 || by1 > p.y2) continue

      if (j.horiz) {
        const tinggiTile = j.y2 - j.y1 + 1
        const kiriPx = j.x1 * TILE
        const kananPx = (j.x2 + 1) * TILE
        const deckMulai = kiriPx - 12
        const deckAkhir = kananPx + 12

        for (let ty = j.y1; ty <= j.y2; ty++) {
          const py = ty * TILE
          const sisi = tinggiTile === 1 ? 3 : ty === j.y1 ? 0 : ty === j.y2 ? 2 : 1

          // 1. Papan tengah menerus dari tepi darat kiri (-12px) sampai darat kanan (+12px) — NOL sela!
          for (let dx = deckMulai; dx < deckAkhir; dx += TILE) {
            const w = Math.min(TILE, deckAkhir - dx)
            this.potongJembHoriz(ctx, jembIm, TILE, 0, w, dx, py, sisi)
          }
          // 2. Tiang ujung kiri (kol 0, piksel solid sx=18..63 -> lebar 46px) menancap di darat kiri
          this.potongJembHoriz(ctx, jembIm, 18, 0, 46, kiriPx - 14, py, sisi)
          // 3. Tiang ujung kanan (kol 2, piksel solid sx=0..45 -> lebar 46px) menancap di darat kanan
          this.potongJembHoriz(ctx, jembIm, 2 * TILE, 0, 46, kananPx - 32, py, sisi)
        }
      } else {
        const lebarTile = j.x2 - j.x1 + 1
        const atasPx = j.y1 * TILE
        const bawahPx = (j.y2 + 1) * TILE
        const deckMulai = atasPx - 12
        const deckAkhir = bawahPx + 12

        for (let tx = j.x1; tx <= j.x2; tx++) {
          const px = tx * TILE
          const sisi = lebarTile === 1 ? 3 : tx === j.x1 ? 0 : tx === j.x2 ? 2 : 1

          // 1. Papan vertikal menerus dari darat atas (-12px) sampai darat bawah (+12px) — NOL sela!
          for (let dy = deckMulai; dy < deckAkhir; dy += TILE) {
            const h = Math.min(TILE, deckAkhir - dy)
            this.potongJembVert(ctx, jembIm, 0, 2 * TILE, h, px, dy, sisi)
          }
          // 2. Tiang ujung atas (bar 1, piksel solid sy=64+17..127 -> tinggi 47px) menancap di darat atas
          this.potongJembVert(ctx, jembIm, 0, TILE + 17, 47, px, atasPx - 14, sisi)
          // 3. Tiang ujung bawah (bar 3, piksel solid sy=192..238 -> tinggi 47px) menancap di darat bawah
          this.potongJembVert(ctx, jembIm, 0, 3 * TILE, 47, px, bawahPx - 33, sisi)
        }
      }
    }
  }

  private potongJembHoriz(
    ctx: CanvasRenderingContext2D, im: HTMLImageElement,
    sx: number, sy: number, sw: number, dx: number, dy: number, sisi: number,
  ): void {
    if (sisi === 3) {
      ctx.drawImage(im, sx, sy, sw, TILE, dx, dy, sw, TILE)
    } else if (sisi === 0) {
      ctx.drawImage(im, sx, sy, sw, 48, dx, dy, sw, 48)
      ctx.drawImage(im, sx, sy + 16, sw, 16, dx, dy + 48, sw, 16)
    } else if (sisi === 1) {
      ctx.drawImage(im, sx, sy + 16, sw, 32, dx, dy, sw, 32)
      ctx.drawImage(im, sx, sy + 16, sw, 32, dx, dy + 32, sw, 32)
    } else {
      ctx.drawImage(im, sx, sy + 16, sw, 16, dx, dy, sw, 16)
      ctx.drawImage(im, sx, sy + 16, sw, 48, dx, dy + 16, sw, 48)
    }
  }

  private potongJembVert(
    ctx: CanvasRenderingContext2D, im: HTMLImageElement,
    sx: number, sy: number, sh: number, dx: number, dy: number, sisi: number,
  ): void {
    if (sisi === 3) {
      ctx.drawImage(im, sx, sy, TILE, sh, dx, dy, TILE, sh)
    } else if (sisi === 0) {
      ctx.drawImage(im, sx, sy, 48, sh, dx, dy, 48, sh)
      ctx.drawImage(im, sx + 16, sy, 16, sh, dx + 48, dy, 16, sh)
    } else if (sisi === 1) {
      ctx.drawImage(im, sx + 16, sy, 32, sh, dx, dy, 32, sh)
      ctx.drawImage(im, sx + 16, sy, 32, sh, dx + 32, dy, 32, sh)
    } else {
      ctx.drawImage(im, sx + 16, sy, 16, sh, dx, dy, 16, sh)
      ctx.drawImage(im, sx + 16, sy, 48, sh, dx + 16, dy, 48, sh)
    }
  }

  private gambarAwanTepi(
    ctx: CanvasRenderingContext2D,
    p: { x1: number; y1: number; x2: number; y2: number },
    waktu: number,
  ): void {
    const a1 = gambarDari(TERRAIN_FREE.awan1)
    const a2 = gambarDari(TERRAIN_FREE.awan2)
    if (!a1 && !a2) return
    const duniaW = this.kolom * TILE
    ctx.save()
    ctx.globalAlpha = 0.65
    for (let i = 0; i < this.daftarAwan.length; i++) {
      const aw = this.daftarAwan[i]!
      const im = aw.varian === 0 ? (a1 ?? a2) : (a2 ?? a1)
      if (!im) continue
      const w = 576 * aw.skala
      const h = 256 * aw.skala
      const x = ((aw.x0 + waktu * aw.kecepatan) % (duniaW + w)) - w / 2
      if (x + w < p.x1 || x > p.x2 || aw.y + h < p.y1 || aw.y > p.y2) continue
      ctx.drawImage(im, x, aw.y, w, h)
    }
    ctx.restore()
  }

  private ambilAtauDaurChunk(kunci: string): Chunk {
    let c = this.chunk.get(kunci)
    if (c) return c
    if (this.chunk.size >= MAKS_CHUNK) {
      let kunciLama = ''
      let pakaiMin = Infinity
      let daur: Chunk | null = null
      for (const [k, item] of this.chunk) {
        if (item.pakaiKe < pakaiMin) {
          pakaiMin = item.pakaiKe
          kunciLama = k
          daur = item
        }
      }
      if (daur && kunciLama) {
        this.chunk.delete(kunciLama)
        daur.bersih = false
        c = daur
      }
    }
    if (!c) {
      const kanvas = document.createElement('canvas')
      kanvas.width = UKURAN_CHUNK
      kanvas.height = UKURAN_CHUNK
      c = {
        kanvas,
        ctx: kanvas.getContext('2d', { alpha: false }),
        bersih: false,
        pakaiKe: this.urutanPakai,
      }
    }
    this.chunk.set(kunci, c)
    return c
  }

  /**
   * Membangun strip 64x256 (4 sel vertikal: atas, tengah, bawah, sempit) tangga batu Barat/Timur
   * dengan memutar Tilemap_Elevation baris 7 tepat 90° sehingga motif batu 100% serasi dengan tangga N/S!
   */
  private ambilTanggaEW(tinggiIm: HTMLImageElement, arah: 2 | 3): HTMLCanvasElement | null {
    if (arah === 2 && this.tanggaBarat) return this.tanggaBarat
    if (arah === 3 && this.tanggaTimur) return this.tanggaTimur
    const k = document.createElement('canvas')
    k.width = TILE
    k.height = TILE * 4
    const c = k.getContext('2d')
    if (!c) return null
    c.imageSmoothingEnabled = false
    // Barat (turun ke kiri, putar +90°): kol 0->atas, 1->tengah, 2->bawah, 3->sempit
    // Timur (turun ke kanan, putar -90°): kol 2->atas, 1->tengah, 0->bawah, 3->sempit
    const petaKol = arah === 2 ? [0, 1, 2, 3] : [2, 1, 0, 3]
    const sudut = arah === 2 ? Math.PI / 2 : -Math.PI / 2
    for (let bar = 0; bar < 4; bar++) {
      c.save()
      c.translate(TILE / 2, bar * TILE + TILE / 2)
      c.rotate(sudut)
      c.drawImage(tinggiIm, petaKol[bar]! * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, -TILE / 2, -TILE / 2, TILE, TILE)
      c.restore()
    }
    if (arah === 2) this.tanggaBarat = k
    else this.tanggaTimur = k
    return k
  }

  private gambarRentangTile(
    ctx: CanvasRenderingContext2D, tx0: number, ty0: number, asalPxX: number, asalPxY: number,
  ): void {
    ctx.imageSmoothingEnabled = false
    const kol = this.kolom
    const tx2 = Math.min(this.kolom - 1, tx0 + TILE_PER_CHUNK - 1)
    const ty2 = Math.min(this.baris - 1, ty0 + TILE_PER_CHUNK - 1)
    const air = gambarDari(TERRAIN.air)
    const busa = gambarDari(TERRAIN.busa)
    const datar = gambarDari(TERRAIN.tanahDatar)
    const tinggiU010 = gambarDari(TERRAIN.tanahTinggi)
    const bayang = gambarDari(TERRAIN.bayangTanah)
    const tileFree = gambarDari(asetBioma(this.terrain.bioma))

    // Pass 0: Air laut turquoise.
    if (air) {
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          if (this.butuhAir[off + tx] === 1) {
            ctx.drawImage(air, 0, 0, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
          }
        }
      }
    } else {
      ctx.fillStyle = '#3d7a8c'
      ctx.fillRect(asalPxX, asalPxY, UKURAN_CHUNK, UKURAN_CHUNK)
    }

    // Pass 0.5: Busa pantai lembut di bawah tepi pulau & kaki tebing laut (dibakar di bawah tebing).
    if (busa) {
      for (let ty = Math.max(0, ty0 - 1); ty <= Math.min(this.baris - 1, ty2 + 1); ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = Math.max(0, tx0 - 1); tx <= Math.min(this.kolom - 1, tx2 + 1); tx++) {
          if (this.busaPantai[off + tx] !== 1) continue
          const f = frame(TERRAIN.busa, cakar(tx, ty) % TERRAIN.busa.kolom)
          const px = asalPxX + (tx - tx0) * TILE
          ctx.drawImage(busa, f.sx, f.sy, f.sw, f.sh, px - 64, py - 64, 192, 192)
        }
      }
    }

    // Pass 1: Daratan Level 1 (blok elevated Tilemap_color1 kol 5..8) + tebing batu laut (baris 5).
    for (let ty = ty0; ty <= ty2; ty++) {
      const off = ty * kol
      const py = asalPxY + (ty - ty0) * TILE
      for (let tx = tx0; tx <= tx2; tx++) {
        const i = off + tx
        const px = asalPxX + (tx - tx0) * TILE

        const tlKol = this.tebingLautKol[i]!
        if (tlKol >= 0 && tileFree) {
          ctx.drawImage(tileFree, (5 + tlKol) * TILE, 5 * TILE, TILE, TILE, px, py, TILE, TILE)
        }

        const dk = this.daratKol[i]!
        if (dk >= 0) {
          const db = this.daratBar[i]!
          if (tileFree) {
            ctx.drawImage(tileFree, (5 + dk) * TILE, db * TILE, TILE, TILE, px, py, TILE, TILE)
          } else if (datar) {
            ctx.drawImage(datar, (GUGUS_FLAT.rumput + dk) * TILE, db * TILE, TILE, TILE, px, py, TILE, TILE)
          }
        }
      }
    }

    // Pass 1.5: Jalan pasir keemasan pada Level 1 (dataran).
    if (datar) {
      for (let ty = ty0; ty <= ty2; ty++) {
        const off = ty * kol
        const py = asalPxY + (ty - ty0) * TILE
        for (let tx = tx0; tx <= tx2; tx++) {
          const i = off + tx
          const jsx = this.jalanSx[i]!
          if (jsx >= 0 && this.platKol[i]! < 0 && this.puncakKol[i]! < 0 && this.jenisRamp[i] === 0 && this.jenisRamp3[i] === 0) {
            ctx.drawImage(datar, jsx, this.jalanSy[i]!, TILE, TILE, asalPxX + (tx - tx0) * TILE, py, TILE, TILE)
          }
        }
      }
    }

    // Pass 2: Tebing Batu Plateau Lv.2, tangga batu Lv.2, & permukaan Plateau Level 2!
    for (let ty = ty0; ty <= ty2; ty++) {
      const off = ty * kol
      const py = asalPxY + (ty - ty0) * TILE
      for (let tx = tx0; tx <= tx2; tx++) {
        const i = off + tx
        const px = asalPxX + (tx - tx0) * TILE

        // 2a. Tebing batu plateau Lv.2 di atas rumput / air + bayangan jatuh di kakinya
        const tpk = this.tebingPlatKol[i]!
        if (tpk >= 0) {
          const tpb = this.tebingPlatBar[i]!
          if (tpb === 4 && bayang) {
            ctx.save()
            ctx.globalAlpha = 0.45
            ctx.drawImage(bayang, TILE, TILE, TILE, TILE, px, py + 12, TILE, TILE)
            ctx.restore()
          }
          if (tileFree) {
            ctx.drawImage(tileFree, (5 + tpk) * TILE, tpb * TILE, TILE, TILE, px, py, TILE, TILE)
          } else if (tinggiU010) {
            ctx.drawImage(tinggiU010, tpk * TILE, BARIS_ELEV.tebing * TILE, TILE, TILE, px, py, TILE, TILE)
          }
        }

        // 2b. Lanjutan kaki tangga selatan Lv.2
        const tbk = this.tanggaBawahKol[i]!
        if (tbk >= 0 && tinggiU010) {
          ctx.drawImage(tinggiU010, tbk * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, px, py, TILE, TILE)
        }

        // 2c. Permukaan Plateau Level 2
        const pk = this.platKol[i]!
        if (pk >= 0) {
          const pb = this.platBar[i]!
          if (tileFree) {
            ctx.drawImage(tileFree, (5 + pk) * TILE, pb * TILE, TILE, TILE, px, py, TILE, TILE)
          } else if (tinggiU010) {
            ctx.drawImage(tinggiU010, pk * TILE, Math.min(pb, BARIS_ELEV.permukaanBawah) * TILE, TILE, TILE, px, py, TILE, TILE)
          }
          const jsx = this.jalanSx[i]!
          if (jsx >= 0 && datar && this.puncakKol[i]! < 0 && this.jenisRamp3[i] === 0) {
            ctx.drawImage(datar, jsx, this.jalanSy[i]!, TILE, TILE, px, py, TILE, TILE)
          }
        }

        // 2d. Tile Ramp / Tangga batu Lv.1 <-> Lv.2
        const jr = this.jenisRamp[i]!
        if (jr === 1 && tinggiU010) {
          ctx.drawImage(tinggiU010, this.rampKol[i]! * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, px, py, TILE, TILE)
        } else if ((jr === 2 || jr === 3) && tinggiU010) {
          const strip = this.ambilTanggaEW(tinggiU010, jr)
          if (strip) {
            ctx.drawImage(strip, 0, this.rampBar[i]! * TILE, TILE, TILE, px, py, TILE, TILE)
          }
        }
      }
    }

    // Pass 2.5: Tebing Batu Puncak Lv.3, tangga batu Lv.3, & permukaan Puncak Level 3!
    for (let ty = ty0; ty <= ty2; ty++) {
      const off = ty * kol
      const py = asalPxY + (ty - ty0) * TILE
      for (let tx = tx0; tx <= tx2; tx++) {
        const i = off + tx
        const px = asalPxX + (tx - tx0) * TILE

        const tp3k = this.tebingPuncakKol[i]!
        if (tp3k >= 0) {
          const tp3b = this.tebingPuncakBar[i]!
          if (tp3b === 4 && bayang) {
            ctx.save()
            ctx.globalAlpha = 0.45
            ctx.drawImage(bayang, TILE, TILE, TILE, TILE, px, py + 12, TILE, TILE)
            ctx.restore()
          }
          if (tileFree) {
            ctx.drawImage(tileFree, (5 + tp3k) * TILE, tp3b * TILE, TILE, TILE, px, py, TILE, TILE)
          } else if (tinggiU010) {
            ctx.drawImage(tinggiU010, tp3k * TILE, BARIS_ELEV.tebing * TILE, TILE, TILE, px, py, TILE, TILE)
          }
        }

        const tb3k = this.tangga3BawahKol[i]!
        if (tb3k >= 0 && tinggiU010) {
          ctx.drawImage(tinggiU010, tb3k * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, px, py, TILE, TILE)
        }

        const p3k = this.puncakKol[i]!
        if (p3k >= 0) {
          const p3b = this.puncakBar[i]!
          if (tileFree) {
            ctx.drawImage(tileFree, (5 + p3k) * TILE, p3b * TILE, TILE, TILE, px, py, TILE, TILE)
            ctx.fillStyle = 'rgba(255, 252, 214, 0.11)'
            ctx.fillRect(px, py, TILE, TILE)
          } else if (tinggiU010) {
            ctx.drawImage(tinggiU010, p3k * TILE, Math.min(p3b, BARIS_ELEV.permukaanBawah) * TILE, TILE, TILE, px, py, TILE, TILE)
          }
          const jsx = this.jalanSx[i]!
          if (jsx >= 0 && datar) {
            ctx.drawImage(datar, jsx, this.jalanSy[i]!, TILE, TILE, px, py, TILE, TILE)
          }
        }

        const jr3 = this.jenisRamp3[i]!
        if (jr3 === 1 && tinggiU010) {
          ctx.drawImage(tinggiU010, this.ramp3Kol[i]! * TILE, BARIS_ELEV.ramp * TILE, TILE, TILE, px, py, TILE, TILE)
        } else if ((jr3 === 2 || jr3 === 3) && tinggiU010) {
          const strip = this.ambilTanggaEW(tinggiU010, jr3)
          if (strip) {
            ctx.drawImage(strip, 0, this.ramp3Bar[i]! * TILE, TILE, TILE, px, py, TILE, TILE)
          }
        }
      }
    }

    // Pass 3: Dekorasi rumput/bunga/batu/semak di padang rumput terbuka.
    for (let ty = ty0; ty <= ty2; ty++) {
      const off = ty * kol
      const py = asalPxY + (ty - ty0) * TILE
      for (let tx = tx0; tx <= tx2; tx++) {
        const dIdx = this.dekoIdx[off + tx]!
        if (dIdx < 0) continue
        const deko = DAFTAR_DEKO[dIdx]
        if (!deko) continue
        const im = gambarDari(deko)
        if (!im) continue
        const f = frame(deko, 0)
        ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, asalPxX + (tx - tx0) * TILE, py + TILE - f.sh, f.sw, f.sh)
      }
    }
  }
}
