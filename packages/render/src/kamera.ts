import { DUNIA_H, DUNIA_W } from '@hftf/shared'

export interface Kamera {
  x: number
  y: number
  zoom: number
  lebar: number
  tinggi: number
}

export const buatKamera = (): Kamera => ({ x: 0, y: 0, zoom: 1, lebar: 800, tinggi: 600 })

const jepit = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

export function batasiKamera(k: Kamera): void {
  const vw = k.lebar / k.zoom
  const vh = k.tinggi / k.zoom
  k.x = jepit(k.x, 0, Math.max(0, DUNIA_W - vw))
  k.y = jepit(k.y, 0, Math.max(0, DUNIA_H - vh))
}

export function pusatkan(k: Kamera, x: number, y: number): void {
  k.x = x - k.lebar / k.zoom / 2
  k.y = y - k.tinggi / k.zoom / 2
  batasiKamera(k)
}

export const keLayarX = (k: Kamera, x: number): number => (x - k.x) * k.zoom
export const keLayarY = (k: Kamera, y: number): number => (y - k.y) * k.zoom
export const keDuniaX = (k: Kamera, sx: number): number => sx / k.zoom + k.x
export const keDuniaY = (k: Kamera, sy: number): number => sy / k.zoom + k.y

/** Kotak dunia yang sedang terlihat, dengan margin agar sprite tepi tidak terpotong. */
export function pandangan(k: Kamera, margin = 256): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: k.x - margin,
    y1: k.y - margin,
    x2: k.x + k.lebar / k.zoom + margin,
    y2: k.y + k.tinggi / k.zoom + margin,
  }
}
