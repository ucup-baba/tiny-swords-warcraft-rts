import {
  GOLD_AWAL_BAKU, JENIS_PETA, KESULITAN_AI, PAPAN, TIM_PEMAIN, jepitGoldAwal,
  type HeroId, type JenisPeta, type JenisSlot, type KesulitanAi, type KonfigSlot, type TimPemain,
} from '@hftf/shared'

export interface SlotRoom {
  indeks: number
  tim: TimPemain
  jenis: JenisSlot
  aliansi: number
  hero: HeroId
  kesulitanAi: KesulitanAi
  nama: string
  terisi: boolean
}

export interface RingkasRoom {
  kode: string
  hostNama: string
  tamuNama: string | null
  jumlah: number
  jumlahManusia?: number
  slotTerbuka?: number
  maksPemain: number
  mulai: boolean
  peta: JenisPeta
  goldAwal: number
  slot: SlotRoom[]
}

/** Pesan dari perangkat ke papan. */
export type KePapan =
  | { t: 'halo'; nama: string }
  | { t: 'buat-room'; hero: string; peta?: JenisPeta; goldAwal?: number; slot?: KonfigSlot[] }
  | { t: 'atur-room'; peta?: JenisPeta; goldAwal?: number; slot?: KonfigSlot[] }
  | { t: 'ubah-slot'; hero?: string; aliansi?: number; tim?: TimPemain }
  | { t: 'gabung-room'; kode: string; hero: string }
  | { t: 'keluar-room' }
  | { t: 'mulai' }
  | { t: 'sambung-ulang'; kode: string; token: string }
  | { t: 'cmd'; cmd: unknown }
  | { t: 'snapshot'; state: unknown; untuk?: TimPemain }
  | { t: 'denyut' }

/** Pesan dari papan ke perangkat. */
export type DariPapan =
  | { t: 'halo'; id: string; token: string }
  | { t: 'daftar'; room: RingkasRoom[] }
  | { t: 'room'; kode: string; peran: 'host' | 'tamu'; tim: TimPemain; ringkas: RingkasRoom }
  | {
      t: 'mulai'
      seed: number
      tim: TimPemain
      heroBlue: string
      heroRed: string
      peta: JenisPeta
      goldAwal: number
      slot: SlotRoom[]
    }
  | { t: 'cmd'; tim: TimPemain; cmd: unknown }
  | { t: 'snapshot'; state: unknown }
  | { t: 'lawan-putus'; detik: number; tim?: TimPemain }
  | { t: 'lawan-kembali' }
  | { t: 'lawan-menyerah' }
  | { t: 'room-keluar'; pesan: string }
  | { t: 'galat'; pesan: string }

const teks = (v: unknown, maks: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= maks

const TIM_SET = new Set<string>(TIM_PEMAIN)
const PETA_SET = new Set<string>(JENIS_PETA)
const AI_SET = new Set<string>(KESULITAN_AI)
const HERO_SET = new Set<string>(['berserker', 'king', 'knight', 'champion'])
const JENIS_SLOT_SET = new Set<string>(['manusia', 'ai', 'kosong'])

const JENIS_PERINTAH_SAH = new Set([
  'pindah', 'serangPindah', 'serang', 'stop', 'tahan', 'kumpul', 'perbaiki',
  'bangun', 'skill', 'latih', 'batalLatih', 'rally', 'riset', 'bangkitkanHero', 'menyerah',
])

const cmdSah = (v: unknown): boolean => {
  if (!v || typeof v !== 'object') return false
  const jenis = (v as Record<string, unknown>)['jenis']
  return typeof jenis === 'string' && JENIS_PERINTAH_SAH.has(jenis)
}

function slotSah(v: unknown): KonfigSlot[] | undefined {
  if (!Array.isArray(v) || v.length === 0 || v.length > PAPAN.maksPemain) return undefined
  const hasil: KonfigSlot[] = []
  for (let i = 0; i < v.length; i++) {
    const raw = v[i]
    if (!raw || typeof raw !== 'object') return undefined
    const s = raw as Record<string, unknown>
    const tim = s['tim']
    const jenis = s['jenis']
    const hero = s['hero']
    const kes = s['kesulitanAi']
    const al = s['aliansi']
    const nama = s['nama']
    if (
      typeof tim !== 'string' || !TIM_SET.has(tim) ||
      typeof jenis !== 'string' || !JENIS_SLOT_SET.has(jenis) ||
      typeof hero !== 'string' || !HERO_SET.has(hero) ||
      typeof kes !== 'string' || !AI_SET.has(kes) ||
      typeof al !== 'number' || !Number.isFinite(al) || al < 1 || al > 6 ||
      typeof nama !== 'string' || nama.length > 24
    ) {
      return undefined
    }
    hasil.push({
      indeks: typeof s['indeks'] === 'number' ? Math.max(0, Math.min(5, Math.floor(s['indeks']))) : i,
      tim: tim as TimPemain,
      jenis: jenis as JenisSlot,
      aliansi: Math.floor(al),
      hero: hero as HeroId,
      kesulitanAi: kes as KesulitanAi,
      nama,
    })
  }
  return hasil
}

/**
 * Validasi skema KETAT untuk setiap pesan masuk (PRD §15.3 poin 5).
 */
export function pesanSah(x: unknown): KePapan | null {
  if (!x || typeof x !== 'object') return null
  const m = x as Record<string, unknown>
  switch (m['t']) {
    case 'halo':
      return teks(m['nama'], 18) ? { t: 'halo', nama: m['nama'] } : null
    case 'buat-room': {
      if (!teks(m['hero'], 16)) return null
      const peta = typeof m['peta'] === 'string' && PETA_SET.has(m['peta']) ? (m['peta'] as JenisPeta) : undefined
      const goldAwal = typeof m['goldAwal'] === 'number' && Number.isFinite(m['goldAwal'])
        ? jepitGoldAwal(m['goldAwal'])
        : undefined
      const slot = m['slot'] !== undefined ? slotSah(m['slot']) : undefined
      if (m['slot'] !== undefined && !slot) return null
      return {
        t: 'buat-room',
        hero: m['hero'],
        ...(peta !== undefined ? { peta } : {}),
        ...(goldAwal !== undefined ? { goldAwal } : {}),
        ...(slot !== undefined ? { slot } : {}),
      }
    }
    case 'atur-room': {
      const peta = typeof m['peta'] === 'string' && PETA_SET.has(m['peta']) ? (m['peta'] as JenisPeta) : undefined
      const goldAwal = typeof m['goldAwal'] === 'number' && Number.isFinite(m['goldAwal'])
        ? jepitGoldAwal(m['goldAwal'])
        : undefined
      const slot = m['slot'] !== undefined ? slotSah(m['slot']) : undefined
      if (m['slot'] !== undefined && !slot) return null
      return {
        t: 'atur-room',
        ...(peta !== undefined ? { peta } : {}),
        ...(goldAwal !== undefined ? { goldAwal } : {}),
        ...(slot !== undefined ? { slot } : {}),
      }
    }
    case 'ubah-slot': {
      const hero = teks(m['hero'], 16) && HERO_SET.has(m['hero']) ? m['hero'] : undefined
      const aliansi = typeof m['aliansi'] === 'number' && Number.isFinite(m['aliansi']) && m['aliansi'] >= 1 && m['aliansi'] <= 6
        ? Math.floor(m['aliansi'])
        : undefined
      const tim = typeof m['tim'] === 'string' && TIM_SET.has(m['tim']) ? (m['tim'] as TimPemain) : undefined
      return {
        t: 'ubah-slot',
        ...(hero !== undefined ? { hero } : {}),
        ...(aliansi !== undefined ? { aliansi } : {}),
        ...(tim !== undefined ? { tim } : {}),
      }
    }
    case 'gabung-room':
      return teks(m['kode'], 8) && teks(m['hero'], 16)
        ? { t: 'gabung-room', kode: m['kode'].toUpperCase(), hero: m['hero'] }
        : null
    case 'sambung-ulang':
      return teks(m['kode'], 8) && teks(m['token'], 64)
        ? { t: 'sambung-ulang', kode: m['kode'].toUpperCase(), token: m['token'] }
        : null
    case 'keluar-room':
      return { t: 'keluar-room' }
    case 'mulai':
      return { t: 'mulai' }
    case 'denyut':
      return { t: 'denyut' }
    case 'cmd':
      return cmdSah(m['cmd']) ? { t: 'cmd', cmd: m['cmd'] } : null
    case 'snapshot': {
      if (!m['state'] || typeof m['state'] !== 'object') return null
      const untuk = typeof m['untuk'] === 'string' && TIM_SET.has(m['untuk']) ? (m['untuk'] as TimPemain) : undefined
      return {
        t: 'snapshot',
        state: m['state'],
        ...(untuk !== undefined ? { untuk } : {}),
      }
    }
    default:
      return null
  }
}

export { GOLD_AWAL_BAKU, PAPAN }
