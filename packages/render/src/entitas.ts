import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_RED, BARIS, BARIS_PAWN, EFEK, GOBLIN as ASET_GOBLIN,
  HERO_BLUE, HERO_RED, SUMBER, UNIT_BLUE, UNIT_RED, frame, jumlahFrameBaris, type Aset,
} from '@hftf/aset'
import type { Tim } from '@hftf/shared'
import {
  AMBANG_API, BANGUNAN, peranGoblin, pernahLihat, terlihatDi,
  type Bangunan, type Dunia, type Unit,
} from '@hftf/sim'
import { gambarDari } from './gambar.js'
import type { Kamera } from './kamera.js'
import { pandangan } from './kamera.js'

const asetTim = <T>(tim: Tim, blue: T, red: T): T => (tim === 'red' ? red : blue)

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
  x: number, y: number, skala = 1, balik = false, pijak = PIJAK, rotasi = 0,
): void {
  const im = gambarDari(a)
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

function asetUnit(u: Unit, tim: Tim, t: number): { aset: Aset; indeks: number; skala: number } {
  const U = asetTim(tim, UNIT_BLUE, UNIT_RED)
  const H = asetTim(tim, HERO_BLUE, HERO_RED)
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
    return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.74 }
  }

  switch (u.peran) {
    case 'pawn': {
      const a = U.pawn
      let baris: number = BARIS_PAWN.diam
      if (aksi === 'tebang') baris = BARIS_PAWN.kapak
      else if (aksi === 'tambang' || aksi === 'bangun' || aksi === 'serang') baris = BARIS_PAWN.palu
      else if (aksi === 'bawaLari') baris = BARIS_PAWN.bawaLari
      else if (aksi === 'bawaDiam') baris = BARIS_PAWN.bawaDiam
      else if (aksi === 'lari') baris = BARIS_PAWN.lari
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.68 }
    }
    case 'warrior': {
      const a = U.warrior
      const baris = aksi === 'serang' ? BARIS.serang : aksi === 'lari' ? BARIS.lari : BARIS.idle
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.68 }
    }
    case 'archer': {
      const a = U.archer
      const baris = aksi === 'serang'
        ? barisArcherSerang(u.sudutSerang)
        : aksi === 'lari' ? BARIS.lari : BARIS.idle
      return { aset: a, indeks: frameDiBaris(a, baris, t, fase), skala: 0.68 }
    }
    case 'lancer': {
      const a = aksi === 'serang' ? U.lancerSerang : aksi === 'lari' ? U.lancerLari : U.lancerIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.43 }
    }
    case 'monk': {
      const a = aksi === 'serang' ? U.monkSembuh : aksi === 'lari' ? U.monkLari : U.monkIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.68 }
    }
    default: {
      const a = aksi === 'serang' ? U.mageSerang : aksi === 'lari' ? U.mageLari : U.mageIdle
      return { aset: a, indeks: Math.floor(t * a.fps + fase) % a.kolom, skala: 0.68 }
    }
  }
}

function asetBangunan(b: Bangunan, tim: Tim): Aset | null {
  const B = asetTim(tim, BANGUNAN_BLUE, BANGUNAN_RED)
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
    return map[b.jenis]
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
    return map[b.jenis]
  }
  return B[b.jenis] ?? null
}

/** Menggambar bendera Rally Point pixel-art yang berkibar di titik kumpul bangunan. */
function gambarBenderaRally(ctx: CanvasRenderingContext2D, x: number, y: number, tim: Tim, t: number): void {
  const kibar = Math.sin(t * 7) * 3
  const warnaKain = tim === 'blue' ? '#4a98f0' : '#e05a4a'
  const warnaTepi = tim === 'blue' ? '#1c4478' : '#7a2018'

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
  ctx.strokeStyle = tim === 'blue' ? '#4a86c8' : '#c85a4a'
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
  timSaya: Tim
  /** Fog aktif? Solo tetap memakainya; mematikannya hanya untuk debug. */
  fog: boolean
}

const cocokSumber = (a: SumberVisual | null | undefined, jenis: SumberVisual['jenis'], id: number): boolean =>
  Boolean(a && a.jenis === jenis && a.id === id)

/** Lingkaran sorot/seleksi dan label sisa stok untuk resource (pohon, tambang, domba, daging, tunggul). */
function gambarCincinSumber(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number,
  warna: string, terpilih: boolean, label: string, labelY: number,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(x, y + 3, rx, rx * 0.44, 0, 0, Math.PI * 2)
  ctx.fillStyle = terpilih ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)'
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
 * Menggambar seluruh entitas dengan urutan kedalaman berdasarkan y — supaya
 * yang di depan menutupi yang di belakang, bukan menurut urutan array.
 */
export function gambarEntitas(
  ctx: CanvasRenderingContext2D, dunia: Dunia, kam: Kamera, opsi: OpsiGambar,
): void {
  const p = pandangan(kam)
  const t = performance.now() / 1000

  type Item = { y: number; gambar: () => void }
  const antrean: Item[] = []
  const diLayar = (x: number, y: number): boolean => x > p.x1 && x < p.x2 && y > p.y1 && y < p.y2
  /** Terlihat SEKARANG — unit musuh hanya boleh tampak di sini (PRD §12.1). */
  const terlihat = (x: number, y: number): boolean =>
    diLayar(x, y) && (!opsi.fog || terlihatDi(dunia, opsi.timSaya, x, y))
  /** Pernah dilihat — terrain & bangunan diingat bentuk terakhirnya. */
  const diingat = (x: number, y: number): boolean =>
    diLayar(x, y) && (!opsi.fog || pernahLihat(dunia, opsi.timSaya, x, y))

  // Tunggul pohon (Tree.png baris 2 kolom 0 = frame 8), tumbuh kembali otomatis
  for (const tg of dunia.tunggul) {
    if (!diingat(tg.x, tg.y)) continue
    const ter = cocokSumber(opsi.terpilihSumber, 'tunggul', tg.id)
    const hov = cocokSumber(opsi.hoverSumber, 'tunggul', tg.id)
    antrean.push({
      y: tg.y - 4,
      gambar: () => {
        if (ter || hov) {
          gambarCincinSumber(ctx, tg.x, tg.y, 24, '#d4b07a', ter, `Tumbuh ${Math.max(1, Math.ceil(tg.sisaTumbuh))}s`, tg.y - 26)
        }
        sprite(ctx, SUMBER.pohon, 8, tg.x, tg.y, 0.62, false, 0.78)
      },
    })
  }

  // Pohon, tambang, domba, daging
  for (const o of dunia.pohon) {
    if (!diingat(o.x, o.y)) continue
    const ter = cocokSumber(opsi.terpilihSumber, 'pohon', o.id)
    const hov = cocokSumber(opsi.hoverSumber, 'pohon', o.id)
    antrean.push({
      y: o.y,
      gambar: () => {
        if (ter || hov) {
          gambarCincinSumber(ctx, o.x, o.y, 32, '#6ff088', ter, `${Math.round(o.kayu)} Kayu`, o.y - 84)
        }
        sprite(ctx, SUMBER.pohon, framePohon(t, o.id), o.x, o.y, 0.62, false, 0.78)
      },
    })
  }
  for (const o of dunia.tambang) {
    if (!diingat(o.x, o.y)) continue
    const ter = cocokSumber(opsi.terpilihSumber, 'tambang', o.id)
    const hov = cocokSumber(opsi.hoverSumber, 'tambang', o.id)
    const rx = o.jenis === 'mine' ? 62 : 34
    antrean.push({
      y: o.y,
      gambar: () => {
        if (ter || hov) {
          gambarCincinSumber(ctx, o.x, o.y, rx, '#ffd86b', ter, `${Math.round(o.gold)} Gold`, o.y - (o.jenis === 'mine' ? 76 : 48))
        }
        sprite(ctx, SUMBER.tambangAktif, 0, o.x, o.y, o.jenis === 'mine' ? 0.9 : 0.6, false, 0.82)
      },
    })
  }
  for (const o of dunia.domba) {
    if (!diingat(o.x, o.y)) continue
    const ter = cocokSumber(opsi.terpilihSumber, 'domba', o.id)
    const hov = cocokSumber(opsi.hoverSumber, 'domba', o.id)
    antrean.push({
      y: o.y,
      gambar: () => {
        if (ter || hov) {
          gambarCincinSumber(ctx, o.x, o.y, 24, '#ff9eb5', ter, `Domba • ${o.daging} Daging`, o.y - 38)
        }
        bayangan(ctx, o.x, o.y, 12)
        const a = o.bergerak ? SUMBER.dombaLompat : SUMBER.dombaDiam
        sprite(ctx, a, Math.floor(t * a.fps + o.id) % a.kolom, o.x, o.y, 0.56, o.arah < 0, 0.74)
      },
    })
  }
  for (const o of dunia.daging) {
    if (!diingat(o.x, o.y)) continue
    const ter = cocokSumber(opsi.terpilihSumber, 'daging', o.id)
    const hov = cocokSumber(opsi.hoverSumber, 'daging', o.id)
    antrean.push({
      y: o.y,
      gambar: () => {
        if (ter || hov) {
          gambarCincinSumber(ctx, o.x, o.y, 22, '#ff8a8a', ter, `+${o.jumlah} Daging`, o.y - 30)
        }
        sprite(ctx, SUMBER.dagingDiam, 0, o.x, o.y, 0.52, false, 0.74)
      },
    })
  }

  // Bangunan
  let rallyAktif: { b: Bangunan } | null = null
  for (const b of dunia.bangunan) {
    if (b.tim !== opsi.timSaya && !diingat(b.x, b.y)) continue
    if (b.tim === opsi.timSaya && !diLayar(b.x, b.y)) continue
    if (
      opsi.terpilihBangunan === b.id &&
      b.tim === opsi.timSaya &&
      b.fase === 'aktif' &&
      (BANGUNAN[b.jenis].melatih.length > 0 || b.jenis === 'altar')
    ) {
      rallyAktif = { b }
    }
    antrean.push({
      y: b.y,
      gambar: () => {
        const def = BANGUNAN[b.jenis]
        if (b.fase !== 'hancur') bayangan(ctx, b.x, b.y, def.w * 0.38)
        const a = asetBangunan(b, b.tim)
        if (a) sprite(ctx, a, 0, b.x, b.y, def.w / a.fw, false, 0.86)

        if (opsi.terpilihBangunan === b.id) {
          ctx.strokeStyle = '#ffd86b'
          ctx.lineWidth = 2
          ctx.strokeRect(b.x - def.w / 2, b.y - def.h * 0.55, def.w, def.h * 0.7)
        }

        // Api sesuai ambang PRD §3: <65% satu titik, <35% berkobar.
        if (b.fase === 'aktif' && b.hp < b.hpMaks * AMBANG_API.satuTitik) {
          const titik = b.hp < b.hpMaks * AMBANG_API.berkobar ? 3 : 1
          for (let i = 0; i < titik; i++) {
            const ox = (i - (titik - 1) / 2) * def.w * 0.28
            sprite(ctx, EFEK.api, Math.floor(t * EFEK.api.fps + i * 3), b.x + ox, b.y - def.h * 0.25, 0.6)
          }
        }

        if (b.fase !== 'hancur' && b.hp < b.hpMaks) {
          barHp(ctx, b.x, b.y - def.h * 0.62, def.w * 0.7, b.hp / b.hpMaks, b.tim)
        }
      },
    })
  }

  // Unit
  for (const u of dunia.unit) {
    if (u.tim !== opsi.timSaya && !terlihat(u.x, u.y)) continue
    if (u.tim === opsi.timSaya && !diLayar(u.x, u.y)) continue
    antrean.push({
      y: u.y,
      gambar: () => {
        const terpilih = opsi.terpilihUnit.has(u.id)
        if (terpilih) {
          ctx.strokeStyle = u.tim === opsi.timSaya ? '#8ef08e' : '#f08e8e'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(u.x, u.y + 4, 22, 10, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (u.hero && u.campId === null) {
          ctx.fillStyle = 'rgba(255,214,107,0.25)'
          ctx.beginPath()
          ctx.ellipse(u.x, u.y + 4, 26, 12, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        bayangan(ctx, u.x, u.y, u.hero ? 20 : 15)
        const { aset, indeks, skala } = asetUnit(u, u.tim, t)
        sprite(ctx, aset, indeks, u.x, u.y, skala, u.arah < 0)

        // Pawn membawa resource di atas tangan (emas/kayu/daging)
        if (u.peran === 'pawn' && u.bawaanJenis) {
          const asetBawa = u.bawaanJenis === 'gold'
            ? SUMBER.goldDiam
            : u.bawaanJenis === 'kayu' ? SUMBER.kayuDiam : SUMBER.dagingDiam
          const ayun = u.aksi === 'bawaLari' ? Math.sin(t * 14) * 2 : 0
          sprite(ctx, asetBawa, 0, u.x, u.y - 36 + ayun, 0.42, false, 0.6)
        }

        if (u.hp < u.hpMaks || terpilih) barHp(ctx, u.x, u.y - 62, 40, u.hp / u.hpMaks, u.tim)
        if (u.hero && u.campId === null) {
          ctx.fillStyle = '#ffd86b'
          ctx.font = "bold 12px 'Pixelify Sans', system-ui"
          ctx.textAlign = 'center'
          ctx.fillText(`Lv${u.level}`, u.x, u.y - 70)
        }
      },
    })
  }

  antrean.sort((a, b) => a.y - b.y)
  for (const item of antrean) item.gambar()

  // Garis & Bendera Rally Point bangunan yang sedang dipilih
  if (rallyAktif) {
    const { b } = rallyAktif
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
    if (opsi.fog && !terlihatDi(dunia, opsi.timSaya, pr.x, pr.y)) continue
    const U = asetTim(pr.tim, UNIT_BLUE, UNIT_RED)
    const a = pr.jenis === 'panah' ? U.panah : U.mageOrb
    const rot = pr.jenis === 'panah' ? Math.atan2(pr.ty - pr.y, pr.tx - pr.x) : 0
    sprite(ctx, a, pr.jenis === 'panah' ? 0 : Math.floor(t * 12), pr.x, pr.y, 0.72, false, 0.5, rot)
  }
}
