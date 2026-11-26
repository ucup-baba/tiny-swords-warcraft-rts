import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_RED, BANGUNAN_U010_WARNA, BARIS, EFEK, GOBLIN as ASET_GOBLIN,
  HERO_BLUE, HERO_RED, PAWN_FREE, SUMBER, UNIT_BLUE, UNIT_RED, UNIT_U010_WARNA, frame, jumlahFrameBaris, type Aset,
} from '@hftf/aset'
import { WARNA_TIM, type Tim } from '@hftf/shared'
import {
  AMBANG_API, BANGUNAN, peranGoblin, pernahLihat, sekutu, terlihatDi,
  type Bangunan, type Dunia, type Unit,
} from '@hftf/sim'
import { gambarDari, gambarTim } from './gambar.js'
import type { Kamera } from './kamera.js'
import { pandangan } from './kamera.js'

const unitPack = (tim: Tim) => (tim === 'red' ? UNIT_RED : UNIT_BLUE)
const heroPack = (tim: Tim) => (tim === 'red' ? HERO_RED : HERO_BLUE)
const bangunanPack = (tim: Tim) => (tim === 'red' ? BANGUNAN_RED : BANGUNAN_BLUE)
const warnaTintUmum = (tim: Tim): Tim => (tim === 'red' || tim === 'blue' || tim === 'neutral' ? 'blue' : tim)

/**
 * Frame pohon yang sedang goyang.
 *
 * Tree.png adalah sheet 4x3, tapi hanya BARIS 0 yang berisi pohon utuh:
 * baris 1 punya 2 frame lalu 2 frame kosong, baris 2 hanya tunggul lalu
 * 3 frame kosong. Memutar kedua belas frame membuat pohon lenyap 42% waktu.
 */
const FRAME_POHON_GOYANG = 4
function framePohon(detik: number, benih: number): number {
  return Math.floor(detik * 4 + benih) % FRAME_POHON_GOYANG
}

/**
 * Porsi tinggi frame tempat KAKI karakter berada. Sprite Tiny Swords digambar
 * di kanvas 192x192 dengan banyak ruang kosong di atas; kakinya ada di sekitar
 * 68% ke bawah. Menggambar dari tepi bawah frame membuat unit tampak melayang
 * jauh di atas posisi sebenarnya.
 */
const PIJAK = 0.68

/** Menggambar satu frame sprite dengan kaki karakter tepat di (x, y). */
function sprite(
  ctx: CanvasRenderingContext2D, a: Aset, indeks: number,
  x: number, y: number, skala = 1, balik = false, pijak = PIJAK, rotasi = 0, tim?: Tim,
): void {
  const im = tim && tim !== 'blue' && tim !== 'neutral' ? gambarTim(a, tim) : gambarDari(a)
  if (!im) return
  const f = frame(a, indeks)
  const w = f.sw * skala
  const h = f.sh * skala
  if (!balik && rotasi === 0) {
    ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, x - w / 2, y - h * pijak, w, h)
    return
  }
  ctx.save()
  ctx.translate(x, y)
  if (rotasi !== 0) ctx.rotate(rotasi)
  if (balik) ctx.scale(-1, 1)
  ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, -w / 2, -h * pijak, w, h)
  ctx.restore()
}

/** Indeks frame pada baris tertentu dengan jumlah frame aktif akurat (anti-kedip). */
function frameDiBaris(a: Aset, baris: number, detik: number, fase = 0): number {
  const n = Math.max(1, jumlahFrameBaris(a, baris))
  const kol = Math.floor(detik * Math.max(1, a.fps) + fase) % n
  return baris * a.kolom + kol
}

/** Pilih baris tembak Archer (r2 atas .. r6 bawah) dari sudut target. */
function barisArcherSerang(sudut: number): number {
  const absY = Math.sin(sudut)
  if (absY < -0.75) return 2
  if (absY < -0.30) return 3
  if (absY <= 0.30) return 4
  if (absY <= 0.75) return 5
  return 6
}

function asetPawnFree(u: Unit): Aset {
  const sedangLari = u.aksi === 'lari' || u.aksi === 'bawaLari'

  // 1. Membawa hasil panen: gunakan sprite Pawn + kayu/emas/daging menyatu.
  if (u.bawaanJenis === 'kayu') return sedangLari ? PAWN_FREE.lariKayu : PAWN_FREE.idleKayu
  if (u.bawaanJenis === 'gold') return sedangLari ? PAWN_FREE.lariGold : PAWN_FREE.idleGold
  if (u.bawaanJenis === 'daging') return sedangLari ? PAWN_FREE.lariDaging : PAWN_FREE.idleDaging

  // 2. Sedang mengayun alat (interaksi aktif)
  if (u.aksi === 'tebang') return PAWN_FREE.aksiKapak
  if (u.aksi === 'tambang') return PAWN_FREE.aksiBeliung
  if (u.aksi === 'bangun') return PAWN_FREE.aksiPalu
  if (u.aksi === 'sembelih' || u.aksi === 'serang') return PAWN_FREE.aksiPisau

  // 3. Berjalan atau diam bersiap sesuai tugas (kapak/beliung/palu/pisau sudah di tangan)
  if (u.tugas === 'tebang') return sedangLari ? PAWN_FREE.lariKapak : PAWN_FREE.idleKapak
  if (u.tugas === 'tambang') return sedangLari ? PAWN_FREE.lariBeliung : PAWN_FREE.idleBeliung
  if (u.tugas === 'bangun' || u.tugas === 'perbaiki') return sedangLari ? PAWN_FREE.lariPalu : PAWN_FREE.idlePalu
  if (u.tugas === 'gembala' || u.tugas === 'pungut' || u.tugas === 'serang' || u.tugas === 'serangPindah') {
    return sedangLari ? PAWN_FREE.lariPisau : PAWN_FREE.idlePisau
  }
  return sedangLari ? PAWN_FREE.lari : PAWN_FREE.idle
}

function asetUnit(u: Unit, tim: Tim, t: number): { aset: Aset; indeks: number; skala: number; timWarna?: Tim } {
  const U = unitPack(tim)
  const H = heroPack(tim)
  const tint = warnaTintUmum(tim)
  const aksi = u.aksi
  const fase = u.id * 0.37

  // Goblin netral punya sheet sendiri; peran unitnya hanya pembawa stat.
  if (u.campId !== null) {
    const peranG = peranGoblin(u)
    const a = ASET_GOBLIN[peranG]
    if (peranG === 'barrel') {
      const baris = aksi === 'serang' ? 4 : aksi === 'lari' ? 1 : 0
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.72 }
    }
    const baris = aksi === 'serang' ? 2 : aksi === 'lari' ? 1 : 0
    return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.62 }
  }

  if (u.hero) {
    const set = H[u.peran as keyof typeof H]
    const a = aksi === 'serang' ? set.serang : aksi === 'lari' ? set.lari : set.idle
    return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.74, timWarna: tint }
  }

  switch (u.peran) {
    case 'pawn': {
      const a = asetPawnFree(u)
      // Sheet Free Pack Pawn semuanya berbasis biru -> recolor ringan per tim di cache kanvas.
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.68, timWarna: tim }
    }
    case 'warrior': {
      const a = (tim === 'purple' || tim === 'yellow') ? UNIT_U010_WARNA[tim].warrior : U.warrior
      const tintW = (tim === 'purple' || tim === 'yellow') ? 'blue' : tint
      const baris = aksi === 'serang' ? BARIS.serang : aksi === 'lari' ? BARIS.lari : BARIS.idle
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.68, timWarna: tintW }
    }
    case 'archer': {
      const a = (tim === 'purple' || tim === 'yellow') ? UNIT_U010_WARNA[tim].archer : U.archer
      const tintA = (tim === 'purple' || tim === 'yellow') ? 'blue' : tint
      const baris = aksi === 'serang'
        ? barisArcherSerang(u.sudutSerang)
        : aksi === 'lari' ? BARIS.lari : BARIS.idle
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.68, timWarna: tintA }
    }
    case 'lancer': {
      const a = aksi === 'serang' ? U.lancerSerang : aksi === 'lari' ? U.lancerLari : U.lancerIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.43, timWarna: tint }
    }
    case 'monk': {
      const a = aksi === 'serang' ? U.monkSembuh : aksi === 'lari' ? U.monkLari : U.monkIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.68, timWarna: tint }
    }
    default: {
      const a = aksi === 'serang' ? U.mageSerang : aksi === 'lari' ? U.mageLari : U.mageIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.68, timWarna: tint }
    }
  }
}

function asetBangunan(b: Bangunan, tim: Tim): { aset: Aset; timWarna?: Tim } | null {
  if (b.fase === 'konstruksi') {
    const map: Record<Bangunan['jenis'], Aset> = {
      castle: BANGUNAN_FASE.castleKonstruksi,
      house: BANGUNAN_FASE.houseKonstruksi,
      tower: BANGUNAN_FASE.towerKonstruksi,
      barracks: BANGUNAN_FASE.barracksKonstruksi,
      archery: BANGUNAN_FASE.archeryKonstruksi,
      monastery: BANGUNAN_FASE.monasteryKonstruksi,
      altar: BANGUNAN_FASE.altarKonstruksi,
    }
    return { aset: map[b.jenis] }
  }
  if (b.fase === 'hancur') {
    const map: Record<Bangunan['jenis'], Aset> = {
      castle: BANGUNAN_FASE.castleHancur,
      house: BANGUNAN_FASE.houseHancur,
      tower: BANGUNAN_FASE.towerHancur,
      barracks: BANGUNAN_FASE.barracksHancur,
      archery: BANGUNAN_FASE.archeryHancur,
      monastery: BANGUNAN_FASE.monasteryHancur,
      altar: BANGUNAN_FASE.altarHancur,
    }
    return { aset: map[b.jenis] }
  }
  if ((tim === 'purple' || tim === 'yellow') && (b.jenis === 'castle' || b.jenis === 'house' || b.jenis === 'tower')) {
    return { aset: BANGUNAN_U010_WARNA[tim][b.jenis], timWarna: 'blue' }
  }
  const B = bangunanPack(tim)
  const aset = B[b.jenis]
  return aset ? { aset, timWarna: warnaTintUmum(tim) } : null
}

/** Menggambar bendera Rally Point pixel-art yang berkibar di titik kumpul bangunan. */
function gambarBenderaRally(ctx: CanvasRenderingContext2D, x: number, y: number, tim: Tim, t: number): void {
  const kibar = Math.sin(t * 7) * 3
  const warna = WARNA_TIM[tim]
  const warnaKain = warna.utama
  const warnaTepi = warna.gelap

  // Cincin tanah
  ctx.strokeStyle = '#ffd86b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 14, 6, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Tiang kayu + ujung emas
  ctx.fillStyle = '#24180f'
  ctx.fillRect(x - 2, y - 38, 5, 40)
  ctx.fillStyle = '#8b5e34'
  ctx.fillRect(x - 1, y - 37, 3, 38)
  ctx.fillStyle = '#ffd86b'
  ctx.fillRect(x - 2, y - 41, 5, 4)

  // Kain bendera berkibar
  ctx.beginPath()
  ctx.moveTo(x + 2, y - 36)
  ctx.lineTo(x + 24, y - 32 + kibar)
  ctx.lineTo(x + 20, y - 24 + kibar * 0.7)
  ctx.lineTo(x + 24, y - 17 + kibar)
  ctx.lineTo(x + 2, y - 19)
  ctx.closePath()
  ctx.fillStyle = warnaKain
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = warnaTepi
  ctx.stroke()
}

/** Bayangan lonjong di bawah entitas supaya tidak tampak melayang. */
function bayangan(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number): void {
  ctx.fillStyle = 'rgba(22,28,46,0.26)'
  ctx.beginPath()
  ctx.ellipse(x, y + 3, rx, rx * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function barHp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, porsi: number, tim: Tim): void {
  const h = 6
  const isi = Math.max(0, Math.min(1, porsi))
  ctx.fillStyle = 'rgba(22,18,14,0.85)'
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = isi > 0.5 ? '#6fd36f' : isi > 0.25 ? '#e8c75a' : '#e05a4a'
  ctx.fillRect(x - w / 2, y, w * isi, h)
  ctx.strokeStyle = WARNA_TIM[tim]?.utama ?? '#c85a4a'
  ctx.lineWidth = 1
  ctx.strokeRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3)
}

export interface SumberVisual {
  jenis: 'pohon' | 'tunggul' | 'tambang' | 'domba' | 'daging'
  id: number
}

export interface OpsiGambar {
  terpilihUnit: ReadonlySet<number>
  terpilihBangunan: number | null
  terpilihSumber?: SumberVisual | null
  hoverSumber?: SumberVisual | null
  /** Sorotan konfirmasi berdenyut (0..1) saat Pawn baru diperintahkan memanen resource. */
  sumberSorot?: { id: number; porsi: number } | null
  timSaya: Tim
  /** Fog aktif? Solo tetap memakainya; mematikannya hanya untuk debug. */
  fog: boolean
  /** Posisi tick sebelumnya + fraksi interpolasi [0..1] agar 90/120Hz mulus tanpa patah-patah. */
  posLama?: ReadonlyMap<number, { x: number; y: number }>
  alpha?: number
}

const targetSumberSet = new Set<number>()

type ItemRender =
  | { jenis: 0; y: number; obj: Dunia['tunggul'][number] }
  | { jenis: 1; y: number; obj: Dunia['pohon'][number] }
  | { jenis: 2; y: number; obj: Dunia['tambang'][number] }
  | { jenis: 3; y: number; obj: Dunia['domba'][number]; x: number; yr: number }
  | { jenis: 4; y: number; obj: Dunia['daging'][number] }
  | { jenis: 5; y: number; obj: Bangunan }
  | { jenis: 6; y: number; obj: Unit; x: number; yr: number }

const antreanBersama: ItemRender[] = []

function posisiHalus(
  id: number, x: number, y: number,
  posLama: ReadonlyMap<number, { x: number; y: number }> | undefined, alpha: number,
): [number, number] {
  if (!posLama || alpha >= 0.999) return [x, y]
  const lama = posLama.get(id)
  if (!lama || Math.abs(x - lama.x) > 64 || Math.abs(y - lama.y) > 64) return [x, y]
  return [lama.x + (x - lama.x) * alpha, lama.y + (y - lama.y) * alpha]
}

const cocokSumber = (a: SumberVisual | null | undefined, jenis: SumberVisual['jenis'], id: number): boolean =>
  Boolean(a && a.jenis === jenis && a.id === id)

/** Lingkaran sorot/seleksi dan label sisa stok untuk resource (pohon, tambang, domba, daging, tunggul). */
function gambarCincinSumber(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number,
  warna: string, terpilih: boolean, label: string, labelY: number,
  denyutPorsi?: number,
): void {
  ctx.save()
  // Efek denyut riak mengembang saat Pawn baru diperintahkan memanen resource ini
  if (denyutPorsi !== undefined && denyutPorsi >= 0 && denyutPorsi <= 1) {
    const riakRx = rx + denyutPorsi * 18
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - denyutPorsi) * 0.9
    ctx.beginPath()
    ctx.ellipse(x, y + 3, riakRx, riakRx * 0.44, 0, 0, Math.PI * 2)
    ctx.strokeStyle = warna
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  ctx.beginPath()
  ctx.ellipse(x, y + 3, rx, rx * 0.44, 0, 0, Math.PI * 2)
  ctx.fillStyle = terpilih ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)'
  ctx.fill()
  ctx.strokeStyle = warna
  ctx.lineWidth = terpilih ? 2.6 : 2.2
  if (!terpilih) ctx.setLineDash([6, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Pill label kecil sisa resource di atas objek
  ctx.font = "700 12px 'Pixelify Sans', system-ui"
  const tw = ctx.measureText(label).width
  const pw = tw + 12
  const ph = 18
  ctx.fillStyle = 'rgba(20, 14, 9, 0.86)'
  ctx.fillRect(x - pw / 2, labelY - ph / 2, pw, ph)
  ctx.strokeStyle = warna
  ctx.lineWidth = 1.2
  ctx.strokeRect(x - pw / 2, labelY - ph / 2, pw, ph)
  ctx.fillStyle = warna
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, labelY)
  ctx.restore()
}

/**
 * Menggambar seluruh entitas dengan urutan kedalaman berdasarkan y — tanpa alokasi
 * closure per-entitas tiap frame (bebas jeda GC di HP).
 */
export function gambarEntitas(
  ctx: CanvasRenderingContext2D, dunia: Dunia, kam: Kamera, opsi: OpsiGambar,
): void {
  const p = pandangan(kam)
  const t = performance.now() / 1000
  const alpha = opsi.alpha ?? 1
  const posLama = opsi.posLama

  const antrean = antreanBersama
  antrean.length = 0
  // Kumpulkan ID resource yang sedang ditarget oleh Pawn yang dipilih pemain (nol alokasi)
  targetSumberSet.clear()
  if (opsi.terpilihUnit.size > 0) {
    for (const u of dunia.unit) {
      if (
        u.peran === 'pawn' && u.targetId !== null && opsi.terpilihUnit.has(u.id) &&
        (u.tugas === 'tebang' || u.tugas === 'tambang' || u.tugas === 'gembala' || u.tugas === 'pungut' || u.tugas === 'pulang')
      ) {
        targetSumberSet.add(u.targetId)
      }
    }
  }
  const sorot = opsi.sumberSorot ?? null
  const x1 = p.x1, x2 = p.x2, y1 = p.y1, y2 = p.y2
  const fogAktif = opsi.fog
  const timSaya = opsi.timSaya
  const diLayar = (x: number, y: number): boolean => x > x1 && x < x2 && y > y1 && y < y2
  const terlihat = (x: number, y: number): boolean =>
    diLayar(x, y) && (!fogAktif || terlihatDi(dunia, timSaya, x, y))
  const diingat = (x: number, y: number): boolean =>
    diLayar(x, y) && (!fogAktif || pernahLihat(dunia, timSaya, x, y))

  for (const tg of dunia.tunggul) {
    if (diingat(tg.x, tg.y)) antrean.push({ jenis: 0, y: tg.y - 4, obj: tg })
  }
  for (const o of dunia.pohon) {
    if (diingat(o.x, o.y)) antrean.push({ jenis: 1, y: o.y, obj: o })
  }
  for (const o of dunia.tambang) {
    if (diingat(o.x, o.y)) antrean.push({ jenis: 2, y: o.y, obj: o })
  }
  for (const o of dunia.domba) {
    if (!diingat(o.x, o.y)) continue
    const [rx, ry] = posisiHalus(o.id, o.x, o.y, posLama, alpha)
    antrean.push({ jenis: 3, y: ry, obj: o, x: rx, yr: ry })
  }
  for (const o of dunia.daging) {
    if (diingat(o.x, o.y)) antrean.push({ jenis: 4, y: o.y, obj: o })
  }

  let rallyAktif: Bangunan | null = null
  for (const b of dunia.bangunan) {
    if (!sekutu(b.tim, timSaya, dunia) ? !diingat(b.x, b.y) : !diLayar(b.x, b.y)) continue
    if (
      opsi.terpilihBangunan === b.id &&
      b.tim === timSaya &&
      b.fase === 'aktif' &&
      (BANGUNAN[b.jenis].melatih.length > 0 || b.jenis === 'altar')
    ) {
      rallyAktif = b
    }
    antrean.push({ jenis: 5, y: b.y, obj: b })
  }

  for (const u of dunia.unit) {
    if (!sekutu(u.tim, timSaya, dunia) ? !terlihat(u.x, u.y) : !diLayar(u.x, u.y)) continue
    const [rx, ry] = posisiHalus(u.id, u.x, u.y, posLama, alpha)
    antrean.push({ jenis: 6, y: ry, obj: u, x: rx, yr: ry })
  }

  antrean.sort((a, b) => a.y - b.y)

  for (let i = 0; i < antrean.length; i++) {
    const item = antrean[i]!
    switch (item.jenis) {
      case 0: {
        const tg = item.obj
        const ter = cocokSumber(opsi.terpilihSumber, 'tunggul', tg.id)
        const hov = cocokSumber(opsi.hoverSumber, 'tunggul', tg.id)
        if (ter || hov) {
          gambarCincinSumber(ctx, tg.x, tg.y, 24, '#d4b07a', ter, `Tumbuh ${Math.max(1, Math.ceil(tg.sisaTumbuh))}s`, tg.y - 26)
        }
        sprite(ctx, SUMBER.pohon, 8, tg.x, tg.y, 0.62, false, 0.78)
        break
      }
      case 1: {
        const o = item.obj
        const ter = cocokSumber(opsi.terpilihSumber, 'pohon', o.id)
        const hov = cocokSumber(opsi.hoverSumber, 'pohon', o.id)
        const ditarget = targetSumberSet.has(o.id)
        const kenaSorot = sorot?.id === o.id
        if (ter || hov || ditarget || kenaSorot) {
          gambarCincinSumber(
            ctx, o.x, o.y, 32, '#6ff088', ter || ditarget || kenaSorot, `${Math.round(o.kayu)} Kayu`, o.y - 84,
            kenaSorot ? sorot!.porsi : undefined,
          )
        }
        sprite(ctx, SUMBER.pohon, framePohon(t, o.id), o.x, o.y, 0.62, false, 0.78)
        break
      }
      case 2: {
        const o = item.obj
        const ter = cocokSumber(opsi.terpilihSumber, 'tambang', o.id)
        const hov = cocokSumber(opsi.hoverSumber, 'tambang', o.id)
        const ditarget = targetSumberSet.has(o.id)
        const kenaSorot = sorot?.id === o.id
        if (ter || hov || ditarget || kenaSorot) {
          const rx = o.jenis === 'mine' ? 62 : 34
          gambarCincinSumber(
            ctx, o.x, o.y, rx, '#ffd86b', ter || ditarget || kenaSorot, `${Math.round(o.gold)} Gold`, o.y - (o.jenis === 'mine' ? 76 : 48),
            kenaSorot ? sorot!.porsi : undefined,
          )
        }
        sprite(ctx, SUMBER.tambangAktif, 0, o.x, o.y, o.jenis === 'mine' ? 0.9 : 0.6, false, 0.82)
        break
      }
      case 3: {
        const o = item.obj
        const ter = cocokSumber(opsi.terpilihSumber, 'domba', o.id)
        const hov = cocokSumber(opsi.hoverSumber, 'domba', o.id)
        const ditarget = targetSumberSet.has(o.id)
        const kenaSorot = sorot?.id === o.id
        if (ter || hov || ditarget || kenaSorot) {
          gambarCincinSumber(
            ctx, item.x, item.yr, 24, '#ff9eb5', ter || ditarget || kenaSorot, `Domba • ${o.daging} Daging`, item.yr - 38,
            kenaSorot ? sorot!.porsi : undefined,
          )
        }
        bayangan(ctx, item.x, item.yr, 12)
        const a = o.bergerak ? SUMBER.dombaLompat : SUMBER.dombaDiam
        sprite(ctx, a, Math.floor(t * a.fps + o.id) % a.kolom, item.x, item.yr, 0.56, o.arah < 0, 0.74)
        break
      }
      case 4: {
        const o = item.obj
        const ter = cocokSumber(opsi.terpilihSumber, 'daging', o.id)
        const hov = cocokSumber(opsi.hoverSumber, 'daging', o.id)
        const ditarget = targetSumberSet.has(o.id)
        const kenaSorot = sorot?.id === o.id
        if (ter || hov || ditarget || kenaSorot) {
          gambarCincinSumber(
            ctx, o.x, o.y, 22, '#ff8a8a', ter || ditarget || kenaSorot, `+${o.jumlah} Daging`, o.y - 30,
            kenaSorot ? sorot!.porsi : undefined,
          )
        }
        sprite(ctx, SUMBER.dagingDiam, 0, o.x, o.y, 0.52, false, 0.74)
        break
      }
      case 5: {
        const b = item.obj
        const def = BANGUNAN[b.jenis]
        if (b.fase !== 'hancur') bayangan(ctx, b.x, b.y, def.w * 0.38)
        const hasilBg = asetBangunan(b, b.tim)
        if (hasilBg) sprite(ctx, hasilBg.aset, 0, b.x, b.y, def.w / hasilBg.aset.fw, false, 0.86, 0, hasilBg.timWarna)

        if (opsi.terpilihBangunan === b.id) {
          ctx.strokeStyle = '#ffd86b'
          ctx.lineWidth = 2
          ctx.strokeRect(b.x - def.w / 2, b.y - def.h * 0.55, def.w, def.h * 0.7)
        }

        if (b.fase === 'aktif' && b.hp < b.hpMaks * AMBANG_API.satuTitik) {
          const titik = b.hp < b.hpMaks * AMBANG_API.berkobar ? 3 : 1
          for (let j = 0; j < titik; j++) {
            const ox = (j - (titik - 1) / 2) * def.w * 0.28
            sprite(ctx, EFEK.api, Math.floor(t * EFEK.api.fps + j * 3), b.x + ox, b.y - def.h * 0.25, 0.6)
          }
        }

        if (b.fase !== 'hancur' && b.hp < b.hpMaks) {
          barHp(ctx, b.x, b.y - def.h * 0.62, def.w * 0.7, b.hp / b.hpMaks, b.tim)
        }
        break
      }
      case 6: {
        const u = item.obj
        const ux = item.x
        const uy = item.yr
        const terpilih = opsi.terpilihUnit.has(u.id)
        if (terpilih) {
          ctx.strokeStyle = sekutu(u.tim, timSaya, dunia) ? '#8ef08e' : '#f08e8e'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(ux, uy + 4, 22, 10, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (u.hero && u.campId === null) {
          ctx.fillStyle = 'rgba(255,214,107,0.25)'
          ctx.beginPath()
          ctx.ellipse(ux, uy + 4, 26, 12, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // Sheet Free Pack Pawn sudah membawa bayangan bawaan di bawah kaki.
        if (!(u.peran === 'pawn' && u.campId === null)) {
          bayangan(ctx, ux, uy, u.hero ? 20 : 15)
        }
        const { aset, indeks, skala, timWarna } = asetUnit(u, u.tim, t)
        sprite(ctx, aset, indeks, ux, uy, skala, u.arah < 0, PIJAK, 0, timWarna)

        if (u.hp < u.hpMaks || terpilih) barHp(ctx, ux, uy - 62, 40, u.hp / u.hpMaks, u.tim)
        if (u.hero && u.campId === null) {
          ctx.fillStyle = '#ffd86b'
          ctx.font = "bold 12px 'Pixelify Sans', system-ui"
          ctx.textAlign = 'center'
          ctx.fillText(`Lv${u.level}`, ux, uy - 70)
        }
        break
      }
    }
  }
  antrean.length = 0

  // Garis & Bendera Rally Point bangunan yang sedang dipilih
  if (rallyAktif) {
    const b = rallyAktif
    ctx.save()
    ctx.setLineDash([7, 5])
    ctx.strokeStyle = 'rgba(255, 216, 107, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(b.rallyX, b.rallyY)
    ctx.stroke()
    ctx.setLineDash([])
    gambarBenderaRally(ctx, b.rallyX, b.rallyY, b.tim, t)
    ctx.restore()
  }

  // Proyektil di atas semuanya
  for (const pr of dunia.proyektil) {
    if (fogAktif && !terlihatDi(dunia, timSaya, pr.x, pr.y)) continue
    const U = unitPack(pr.tim)
    const a = pr.jenis === 'panah' ? U.panah : U.mageOrb
    const rot = pr.jenis === 'panah' ? Math.atan2(pr.ty - pr.y, pr.tx - pr.x) : 0
    sprite(ctx, a, pr.jenis === 'panah' ? 0 : Math.floor(t * 12), pr.x, pr.y, 0.72, false, 0.5, rot, warnaTintUmum(pr.tim))
  }
}
