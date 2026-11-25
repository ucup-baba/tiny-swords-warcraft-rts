import { DT_TETAP, DUNIA_H, DUNIA_W } from '@hftf/shared'
import { acakRentang, buatRng } from './rng.js'
import type { Dunia, Entitas, Perintah } from './tipe.js'

const HP_AWAL = 100
const KECEPATAN_AWAL = 120

export function buatDunia(seed: number): Dunia {
  return { tick: 0, rng: buatRng(seed), entitas: [], idBerikut: 1 }
}

function jepit(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function terapkanPerintah(dunia: Dunia, p: Perintah): void {
  switch (p.jenis) {
    case 'spawn': {
      // Sebaran kecil memakai RNG dunia — tetap deterministik untuk seed sama.
      const dx = acakRentang(dunia.rng, -16, 16)
      const dy = acakRentang(dunia.rng, -16, 16)
      const x = jepit(p.x + dx, 0, DUNIA_W)
      const y = jepit(p.y + dy, 0, DUNIA_H)
      const e: Entitas = {
        id: dunia.idBerikut++,
        tim: p.tim,
        x,
        y,
        tx: x,
        ty: y,
        hp: HP_AWAL,
        kecepatan: KECEPATAN_AWAL,
      }
      dunia.entitas.push(e)
      return
    }
    case 'pindah': {
      const mau = new Set(p.ids)
      for (const e of dunia.entitas) {
        if (!mau.has(e.id)) continue
        e.tx = jepit(p.x, 0, DUNIA_W)
        e.ty = jepit(p.y, 0, DUNIA_H)
      }
      return
    }
    case 'lukai': {
      const e = dunia.entitas.find((k) => k.id === p.id)
      if (e) e.hp -= p.jumlah
      return
    }
  }
}

/**
 * Satu langkah simulasi dengan dt TETAP. Pemanggil tidak boleh mengirim dt
 * variabel — itu menghancurkan determinisme.
 */
export function langkah(dunia: Dunia): void {
  const dt = DT_TETAP
  for (const e of dunia.entitas) {
    const dx = e.tx - e.x
    const dy = e.ty - e.y
    const jarak = Math.hypot(dx, dy)
    const maju = e.kecepatan * dt
    if (jarak > maju) {
      e.x += (dx / jarak) * maju
      e.y += (dy / jarak) * maju
    } else {
      e.x = e.tx
      e.y = e.ty
    }
  }
  // Urutan stabil: buang yang mati dari belakang supaya indeks tidak bergeser.
  for (let i = dunia.entitas.length - 1; i >= 0; i--) {
    if (dunia.entitas[i]!.hp <= 0) dunia.entitas.splice(i, 1)
  }
  dunia.tick++
}

/** Jalankan sejumlah langkah. */
export function langkahBanyak(dunia: Dunia, jumlah: number): void {
  for (let i = 0; i < jumlah; i++) langkah(dunia)
}
