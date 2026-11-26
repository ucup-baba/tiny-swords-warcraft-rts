import { DT_TETAP, type Tim } from '@hftf/shared'
import type { Bangunan, Dunia, Perintah, Unit } from '@hftf/sim'
import { BANGUNAN, bolehTaruhBangunan } from '@hftf/sim'
import { keDuniaX, keDuniaY, pusatkan, type Kamera } from '@hftf/render'

export interface SumberPilihan {
  jenis: 'pohon' | 'tunggul' | 'tambang' | 'domba' | 'daging'
  id: number
}

export interface KeadaanInput {
  unitTerpilih: Set<number>
  bangunanTerpilih: number | null
  sumberTerpilih: SumberPilihan | null
  sumberHover: SumberPilihan | null
  hantuBangun: string | null
  modeSerang: boolean
  seret: { aktif: boolean; x1: number; y1: number; x2: number; y2: number }
  mouse: { sx: number; sy: number; wx: number; wy: number }
  /**
   * Mouse pernah benar-benar bergerak di atas kanvas?
   *
   * Tanpa penanda ini, posisi awal (0,0) jatuh di zona gulir-tepi dan kamera
   * tergulir ke pojok kiri-atas sebelum pemain menyambung apa pun.
   */
  mousePernahMasuk: boolean
  grup: Record<number, number[]>
}

export const buatInput = (): KeadaanInput => ({
  unitTerpilih: new Set(),
  bangunanTerpilih: null,
  sumberTerpilih: null,
  sumberHover: null,
  hantuBangun: null,
  modeSerang: false,
  seret: { aktif: false, x1: 0, y1: 0, x2: 0, y2: 0 },
  mouse: { sx: -1, sy: -1, wx: 0, wy: 0 },
  mousePernahMasuk: false,
  grup: { 1: [], 2: [], 3: [], 4: [] },
})

const RADIUS_KLIK_UNIT = 30

export function unitDiTitik(dunia: Dunia, x: number, y: number): Unit | null {
  let terbaik: Unit | null = null
  let dekat = RADIUS_KLIK_UNIT
  for (const u of dunia.unit) {
    const d = Math.hypot(u.x - x, u.y - y)
    if (d < dekat) {
      dekat = d
      terbaik = u
    }
  }
  return terbaik
}

export function bangunanDiTitik(dunia: Dunia, x: number, y: number): Bangunan | null {
  for (const b of dunia.bangunan) {
    if (b.fase === 'hancur') continue
    const def = BANGUNAN[b.jenis]
    if (Math.abs(b.x - x) <= def.w / 2 && y >= b.y - def.h * 0.6 && y <= b.y + def.h * 0.15) return b
  }
  return null
}

/** Mengembalikan resource (pohon, tambang, domba, daging, tunggul) tepat di bawah titik (x, y). */
export function sumberDiTitik(dunia: Dunia, x: number, y: number): SumberPilihan | null {
  for (const d of dunia.daging) if (Math.hypot(d.x - x, d.y - y) <= 36) return { jenis: 'daging', id: d.id }
  for (const d of dunia.domba) if (Math.hypot(d.x - x, d.y - y) <= 36) return { jenis: 'domba', id: d.id }
  for (const t of dunia.tambang) {
    const r = t.jenis === 'mine' ? 68 : 42
    if (Math.hypot(t.x - x, t.y - y) <= r) return { jenis: 'tambang', id: t.id }
  }
  for (const p of dunia.pohon) if (Math.hypot(p.x - x, p.y - y) <= 48) return { jenis: 'pohon', id: p.id }
  for (const tg of dunia.tunggul) if (Math.hypot(tg.x - x, tg.y - y) <= 32) return { jenis: 'tunggul', id: tg.id }
  return null
}

/** Sesuatu yang bisa dipanen/diperbaiki di titik ini? */
export function sasaranKlikKanan(
  dunia: Dunia, tim: Tim, x: number, y: number,
): { jenis: 'musuh' | 'kumpul' | 'perbaiki'; id: number } | null {
  const u = unitDiTitik(dunia, x, y)
  if (u && u.tim !== tim) return { jenis: 'musuh', id: u.id }

  const b = bangunanDiTitik(dunia, x, y)
  if (b && b.tim !== tim) return { jenis: 'musuh', id: b.id }
  if (b && b.tim === tim && (b.fase === 'konstruksi' || b.hp < b.hpMaks)) return { jenis: 'perbaiki', id: b.id }

  const dekat = <T extends { id: number; x: number; y: number }>(daftar: readonly T[], r: number): T | null => {
    for (const o of daftar) if (Math.hypot(o.x - x, o.y - y) < r) return o
    return null
  }
  const sumber =
    dekat(dunia.pohon, 46) ?? dekat(dunia.tambang, 70) ?? dekat(dunia.domba, 40) ?? dekat(dunia.daging, 40)
  if (sumber) return { jenis: 'kumpul', id: sumber.id }
  return null
}

/** Perintah klik kanan pintar (PRD §5.7). */
export function perintahKlikKanan(
  dunia: Dunia, tim: Tim, ids: number[], x: number, y: number, serangPaksa: boolean,
): Perintah | null {
  if (ids.length === 0) return null
  if (serangPaksa) return { jenis: 'serangPindah', ids, x, y }

  const s = sasaranKlikKanan(dunia, tim, x, y)
  if (s?.jenis === 'musuh') return { jenis: 'serang', ids, targetId: s.id }
  if (s?.jenis === 'kumpul') return { jenis: 'kumpul', ids, targetId: s.id }
  if (s?.jenis === 'perbaiki') return { jenis: 'perbaiki', ids, targetId: s.id }
  return { jenis: 'pindah', ids, x, y }
}

/** Seleksi kotak (marquee), PRD §5.2 — hanya unit sendiri. */
export function seleksiKotak(dunia: Dunia, tim: Tim, k: KeadaanInput): number[] {
  const x1 = Math.min(k.seret.x1, k.seret.x2)
  const x2 = Math.max(k.seret.x1, k.seret.x2)
  const y1 = Math.min(k.seret.y1, k.seret.y2)
  const y2 = Math.max(k.seret.y1, k.seret.y2)
  const hasil: number[] = []
  for (const u of dunia.unit) {
    if (u.tim !== tim) continue
    if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) hasil.push(u.id)
  }
  return hasil
}

/**
 * Gulir kamera dengan tombol Panah atau tepi layar.
 * WASD sengaja TIDAK menggeser kamera supaya [A] (Attack-Move) dan [S] (Stop)
 * tidak bentrok saat memberi perintah pasukan ala Warcraft III.
 */
export function gulirKamera(
  kam: Kamera, tombol: ReadonlySet<string>, k: KeadaanInput,
): void {
  const laju = 900 * DT_TETAP * (tombol.has('ShiftLeft') ? 2 : 1)
  let dx = 0
  let dy = 0
  if (tombol.has('ArrowLeft')) dx -= laju
  if (tombol.has('ArrowRight')) dx += laju
  if (tombol.has('ArrowUp')) dy -= laju
  if (tombol.has('ArrowDown')) dy += laju

  // Gulir tepi hanya setelah mouse benar-benar pernah ada di atas kanvas.
  if (k.mousePernahMasuk) {
    const TEPI = 24
    const { sx, sy } = k.mouse
    if (sx >= 0 && sx < TEPI) dx -= laju
    if (sx > kam.lebar - TEPI && sx <= kam.lebar) dx += laju
    if (sy >= 0 && sy < TEPI) dy -= laju
    if (sy > kam.tinggi - TEPI && sy <= kam.tinggi) dy += laju
  }

  kam.x += dx / kam.zoom
  kam.y += dy / kam.zoom
}

export function perbaruiMouseDunia(k: KeadaanInput, kam: Kamera): void {
  k.mouse.wx = keDuniaX(kam, k.mouse.sx)
  k.mouse.wy = keDuniaY(kam, k.mouse.sy)
}

export function fokusKeCastle(dunia: Dunia, tim: Tim, kam: Kamera): void {
  const c = dunia.bangunan.find((b) => b.tim === tim && b.jenis === 'castle' && b.fase !== 'hancur')
  if (c) pusatkan(kam, c.x, c.y)
}

export const bolehTaruh = bolehTaruhBangunan
