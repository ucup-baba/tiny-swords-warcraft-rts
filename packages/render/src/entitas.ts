import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_RED, BARIS, EFEK, GOBLIN as ASET_GOBLIN,
  HERO_BLUE, HERO_RED, SUMBER, UNIT_BLUE, UNIT_RED, frame, type Aset,
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
  x: number, y: number, skala = 1, balik = false, pijak = PIJAK,
): void {
  const im = gambarDari(a)
  if (!im) return
  const f = frame(a, indeks)
  const w = f.sw * skala
  const h = f.sh * skala
  ctx.save()
  ctx.translate(x, y)
  if (balik) ctx.scale(-1, 1)
  ctx.drawImage(im, f.sx, f.sy, f.sw, f.sh, -w / 2, -h * pijak, w, h)
  ctx.restore()
}

function asetUnit(u: Unit, tim: Tim): { aset: Aset; indeks: number; skala: number } {
  const U = asetTim(tim, UNIT_BLUE, UNIT_RED)
  const H = asetTim(tim, HERO_BLUE, HERO_RED)
  const bergerak = u.tugas === 'pindah' || u.tugas === 'serangPindah' || u.jalur !== null
  const t = performance.now() / 1000

  // Goblin netral punya sheet sendiri; peran unitnya hanya pembawa stat.
  if (u.campId !== null) {
    const a = ASET_GOBLIN[peranGoblin(u)]
    const kol = Math.floor(t * a.fps) % a.kolom
    return { aset: a, indeks: kol, skala: 0.6 }
  }

  if (u.hero) {
    const set = H[u.peran as keyof typeof H]
    const a = bergerak ? set.lari : set.idle
    return { aset: a, indeks: Math.floor(t * a.fps), skala: 0.72 }
  }

  switch (u.peran) {
    case 'pawn':
    case 'warrior':
    case 'archer': {
      const a = U[u.peran]
      const baris = bergerak ? BARIS.lari : BARIS.idle
      const kol = Math.floor(t * a.fps) % a.kolom
      return { aset: a, indeks: baris * a.kolom + kol, skala: 0.66 }
    }
    case 'lancer': {
      const a = bergerak ? U.lancerLari : U.lancerIdle
      return { aset: a, indeks: Math.floor(t * a.fps), skala: 0.42 }
    }
    case 'monk': {
      const a = bergerak ? U.monkLari : U.monkIdle
      return { aset: a, indeks: Math.floor(t * a.fps), skala: 0.66 }
    }
    default: {
      const a = bergerak ? U.mageLari : U.mageIdle
      return { aset: a, indeks: Math.floor(t * a.fps), skala: 0.66 }
    }
  }
}

function asetBangunan(b: Bangunan, tim: Tim): Aset | null {
  const B = asetTim(tim, BANGUNAN_BLUE, BANGUNAN_RED)
  if (b.fase === 'konstruksi') {
    if (b.jenis === 'castle') return BANGUNAN_FASE.castleKonstruksi
    if (b.jenis === 'tower') return BANGUNAN_FASE.towerKonstruksi
    return BANGUNAN_FASE.houseKonstruksi
  }
  if (b.fase === 'hancur') {
    if (b.jenis === 'castle') return BANGUNAN_FASE.castleHancur
    if (b.jenis === 'tower') return BANGUNAN_FASE.towerHancur
    return BANGUNAN_FASE.houseHancur
  }
  return B[b.jenis] ?? null
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
  ctx.fillStyle = 'rgba(22,18,14,0.85)'
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = porsi > 0.5 ? '#6fd36f' : porsi > 0.25 ? '#e8c75a' : '#e05a4a'
  ctx.fillRect(x - w / 2, y, w * porsi, h)
  ctx.strokeStyle = tim === 'blue' ? '#4a86c8' : '#c85a4a'
  ctx.lineWidth = 1
  ctx.strokeRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3)
}

export interface OpsiGambar {
  terpilihUnit: ReadonlySet<number>
  terpilihBangunan: number | null
  timSaya: Tim
  /** Fog aktif? Solo tetap memakainya; mematikannya hanya untuk debug. */
  fog: boolean
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

  // Pohon, tambang, domba, daging
  for (const o of dunia.pohon) {
    if (!diingat(o.x, o.y)) continue
    antrean.push({ y: o.y, gambar: () => sprite(ctx, SUMBER.pohon, framePohon(t, o.id), o.x, o.y, 0.62, false, 0.78) })
  }
  for (const o of dunia.tambang) {
    if (!diingat(o.x, o.y)) continue
    antrean.push({ y: o.y, gambar: () => sprite(ctx, SUMBER.tambangAktif, 0, o.x, o.y, o.jenis === 'mine' ? 0.9 : 0.6, false, 0.82) })
  }
  for (const o of dunia.domba) {
    if (!diingat(o.x, o.y)) continue
    antrean.push({ y: o.y, gambar: () => sprite(ctx, SUMBER.dombaDiam, Math.floor(t * 8 + o.id), o.x, o.y, 0.55, false, 0.74) })
  }
  for (const o of dunia.daging) {
    if (!diingat(o.x, o.y)) continue
    antrean.push({ y: o.y, gambar: () => sprite(ctx, SUMBER.dagingDiam, 0, o.x, o.y, 0.5, false, 0.74) })
  }

  // Bangunan
  for (const b of dunia.bangunan) {
    if (b.tim !== opsi.timSaya && !diingat(b.x, b.y)) continue
    if (b.tim === opsi.timSaya && !diLayar(b.x, b.y)) continue
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
        const { aset, indeks, skala } = asetUnit(u, u.tim)
        const balik = u.jalur ? (u.jalur.titik[u.jalur.ke]?.x ?? u.x) < u.x : false
        sprite(ctx, aset, indeks, u.x, u.y, skala, balik)

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

  // Proyektil di atas semuanya
  for (const pr of dunia.proyektil) {
    if (opsi.fog && !terlihatDi(dunia, opsi.timSaya, pr.x, pr.y)) continue
    const U = asetTim(pr.tim, UNIT_BLUE, UNIT_RED)
    const a = pr.jenis === 'panah' ? U.panah : U.mageOrb
    sprite(ctx, a, pr.jenis === 'panah' ? 0 : Math.floor(t * 12), pr.x, pr.y, 0.7, false, 0.5)
  }
}
