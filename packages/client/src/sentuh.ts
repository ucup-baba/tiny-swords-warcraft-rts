import { DUNIA_H, DUNIA_W, type Tim } from '@hftf/shared'
import { BANGUNAN, type Bangunan, type Dunia, type Perintah } from '@hftf/sim'
import { batasiKamera, pusatkan, type Kamera } from '@hftf/render'
import type { ModeSentuh } from '@hftf/ui'
import {
  bangunanDiTitik, bolehTaruh, perbaruiMouseDunia, perintahKlikKanan, pilihPawnBangun,
  seleksiKotak, sumberDiTitik, unitDiTitik, type KeadaanInput,
} from './input.js'

export const KUNCI_MODE_SENTUH = 'hftf.modeSentuh'

export function muatModeSentuh(): ModeSentuh {
  try {
    const v = window.localStorage.getItem(KUNCI_MODE_SENTUH)
    return v === 'joystick' ? 'joystick' : 'tapPintar'
  } catch {
    return 'tapPintar'
  }
}

export function simpanModeSentuh(mode: ModeSentuh): void {
  try {
    window.localStorage.setItem(KUNCI_MODE_SENTUH, mode)
  } catch {
    // Abaikan di mode privat / jsdom tanpa storage.
  }
}

export function deteksiPerangkatSentuh(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    Boolean(window.matchMedia?.('(pointer: coarse)').matches)
  )
}

export interface KaitSentuh {
  dunia(): Dunia | null
  tim(): Tim
  faseMain(): boolean
  kam: Kamera
  input: KeadaanInput
  kirim(p: Perintah): void
  tandaiBendera(wx: number, wy: number, jenis: 'pindah' | 'serang' | 'rally'): void
  sorotSumber?(id: number): void
  toast(pesan: string): void
  perbaruiHud(): void
  bangunanTerpilih(): Bangunan | null
  padaSentuhPertama(): void
  setKotakUi(aktif: boolean): void
}

const AMBANG_GESER = 10
const TAHAN_MARQUEE_MS = 350
const RADIUS_JOYSTICK = 36
const LAJU_JOYSTICK = 780

/**
 * Pengendali sentuh mobile (HP / Tablet) mendukung dua mode yang bisa dipilih
 * di Menu:
 *   - Mode 1 (`tapPintar`): 1 jari geser kamera, 2 jari cubit zoom, tap pilih/perintah,
 *     tombol Kotak atau tahan jari 0,35 detik untuk drag kotak seleksi.
 *   - Mode 3 (`joystick`): Virtual Joystick untuk geser kamera, seret 1 jari di peta
 *     langsung menggambar kotak seleksi, 2 jari cubit zoom, tap pilih/perintah.
 */
export class PengendaliSentuh {
  mode: ModeSentuh
  kotakAktif = false
  vektorJoystick = { x: 0, y: 0 }

  private tapTerakhir = { waktu: 0, id: -1 }
  private timerTahan: number | null = null
  private joyTouchId: number | null = null
  private aktifKanvas = {
    sedang: false,
    pinch: false,
    sudahGeser: false,
    marquee: false,
    siapMarquee: false,
    mulaiSx: 0,
    mulaiSy: 0,
    prevSx: 0,
    prevSy: 0,
    pinchJarak: 0,
    pinchZoom: 1,
    pinchMidSx: 0,
    pinchMidSy: 0,
  }

  constructor(private kait: KaitSentuh, modeAwal?: ModeSentuh) {
    this.mode = modeAwal ?? muatModeSentuh()
  }

  setMode(mode: ModeSentuh): void {
    this.mode = mode
    this.kotakAktif = false
    this.vektorJoystick = { x: 0, y: 0 }
    this.kait.setKotakUi(false)
    simpanModeSentuh(mode)
  }

  toggleKotak(): boolean {
    this.kotakAktif = !this.kotakAktif
    this.kait.setKotakUi(this.kotakAktif)
    if (this.kotakAktif) this.kait.toast('Seret jari di peta untuk memilih banyak pasukan')
    return this.kotakAktif
  }

  /** Geser kamera sesuai simpangan Virtual Joystick (Mode 3). Dipanggil per frame. */
  langkahJoystick(dt: number): void {
    const { x, y } = this.vektorJoystick
    if (x === 0 && y === 0) return
    this.kait.kam.x += (x * LAJU_JOYSTICK * dt) / this.kait.kam.zoom
    this.kait.kam.y += (y * LAJU_JOYSTICK * dt) / this.kait.kam.zoom
    batasiKamera(this.kait.kam)
  }

  pasang(
    kanvas: HTMLCanvasElement,
    petaMini: HTMLCanvasElement,
    joystickEl: HTMLElement,
    joystickKenop: HTMLElement,
  ): void {
    const keLayarKanvas = (clientX: number, clientY: number): { sx: number; sy: number } => {
      const r = kanvas.getBoundingClientRect()
      return {
        sx: (clientX - r.left) * (kanvas.width / Math.max(1, r.width)),
        sy: (clientY - r.top) * (kanvas.height / Math.max(1, r.height)),
      }
    }

    const batalTimer = (): void => {
      if (this.timerTahan !== null) {
        window.clearTimeout(this.timerTahan)
        this.timerTahan = null
      }
    }

    // --- 1. Sentuhan di kanvas peta ---
    kanvas.addEventListener('touchstart', (e) => {
      if (!this.kait.faseMain() || !this.kait.dunia()) return
      e.preventDefault()
      this.kait.padaSentuhPertama()
      batalTimer()

      if (e.touches.length >= 2) {
        const t0 = e.touches[0]!
        const t1 = e.touches[1]!
        const p0 = keLayarKanvas(t0.clientX, t0.clientY)
        const p1 = keLayarKanvas(t1.clientX, t1.clientY)
        this.aktifKanvas.sedang = true
        this.aktifKanvas.pinch = true
        this.aktifKanvas.marquee = false
        this.kait.input.seret.aktif = false
        this.aktifKanvas.pinchJarak = Math.max(1, Math.hypot(p1.sx - p0.sx, p1.sy - p0.sy))
        this.aktifKanvas.pinchZoom = this.kait.kam.zoom
        this.aktifKanvas.pinchMidSx = (p0.sx + p1.sx) / 2
        this.aktifKanvas.pinchMidSy = (p0.sy + p1.sy) / 2
        return
      }

      const t = e.touches[0]
      if (!t) return
      const { sx, sy } = keLayarKanvas(t.clientX, t.clientY)
      this.kait.input.mouse.sx = sx
      this.kait.input.mouse.sy = sy
      perbaruiMouseDunia(this.kait.input, this.kait.kam)
      const { wx, wy } = this.kait.input.mouse

      const siapMarquee = this.mode === 'joystick' || this.kotakAktif
      this.aktifKanvas = {
        ...this.aktifKanvas,
        sedang: true,
        pinch: false,
        sudahGeser: false,
        marquee: false,
        siapMarquee,
        mulaiSx: sx,
        mulaiSy: sy,
        prevSx: sx,
        prevSy: sy,
      }

      // Di Mode 1 (Tap Pintar), menahan jari 0,35 detik mengaktifkan kotak seleksi.
      if (!siapMarquee && !this.kait.input.hantuBangun) {
        this.timerTahan = window.setTimeout(() => {
          this.timerTahan = null
          if (!this.aktifKanvas.sedang || this.aktifKanvas.sudahGeser || this.aktifKanvas.pinch) return
          this.aktifKanvas.marquee = true
          this.kait.input.seret = { aktif: true, x1: wx, y1: wy, x2: wx, y2: wy }
          try { navigator.vibrate?.(18) } catch { /* noop */ }
          this.kait.toast('Mode kotak seleksi — seret untuk memilih pasukan')
        }, TAHAN_MARQUEE_MS)
      }
    }, { passive: false })

    kanvas.addEventListener('touchmove', (e) => {
      if (!this.aktifKanvas.sedang || !this.kait.faseMain()) return
      e.preventDefault()

      if (this.aktifKanvas.pinch && e.touches.length >= 2) {
        const t0 = e.touches[0]!
        const t1 = e.touches[1]!
        const p0 = keLayarKanvas(t0.clientX, t0.clientY)
        const p1 = keLayarKanvas(t1.clientX, t1.clientY)
        const jarakBaru = Math.max(1, Math.hypot(p1.sx - p0.sx, p1.sy - p0.sy))
        const midSx = (p0.sx + p1.sx) / 2
        const midSy = (p0.sy + p1.sy) / 2
        const zoomLama = this.kait.kam.zoom
        const zoomBaru = Math.max(0.45, Math.min(1.8, this.aktifKanvas.pinchZoom * (jarakBaru / this.aktifKanvas.pinchJarak)))
        this.kait.kam.zoom = zoomBaru
        this.kait.kam.x += midSx * (1 / zoomLama - 1 / zoomBaru) - (midSx - this.aktifKanvas.pinchMidSx) / zoomBaru
        this.kait.kam.y += midSy * (1 / zoomLama - 1 / zoomBaru) - (midSy - this.aktifKanvas.pinchMidSy) / zoomBaru
        this.aktifKanvas.pinchMidSx = midSx
        this.aktifKanvas.pinchMidSy = midSy
        batasiKamera(this.kait.kam)
        return
      }

      const t = e.touches[0]
      if (!t) return
      const { sx, sy } = keLayarKanvas(t.clientX, t.clientY)
      const jarakGeser = Math.hypot(sx - this.aktifKanvas.mulaiSx, sy - this.aktifKanvas.mulaiSy)
      if (jarakGeser > AMBANG_GESER) {
        this.aktifKanvas.sudahGeser = true
        batalTimer()
        if (this.aktifKanvas.siapMarquee && !this.aktifKanvas.marquee) {
          this.aktifKanvas.marquee = true
          this.kait.input.mouse.sx = this.aktifKanvas.mulaiSx
          this.kait.input.mouse.sy = this.aktifKanvas.mulaiSy
          perbaruiMouseDunia(this.kait.input, this.kait.kam)
          const { wx: x1, wy: y1 } = this.kait.input.mouse
          this.kait.input.seret = { aktif: true, x1, y1, x2: x1, y2: y1 }
        }
      }

      this.kait.input.mouse.sx = sx
      this.kait.input.mouse.sy = sy
      perbaruiMouseDunia(this.kait.input, this.kait.kam)

      if (this.aktifKanvas.marquee && this.kait.input.seret.aktif) {
        this.kait.input.seret.x2 = this.kait.input.mouse.wx
        this.kait.input.seret.y2 = this.kait.input.mouse.wy
      } else if (this.aktifKanvas.sudahGeser && !this.aktifKanvas.siapMarquee) {
        this.kait.kam.x -= (sx - this.aktifKanvas.prevSx) / this.kait.kam.zoom
        this.kait.kam.y -= (sy - this.aktifKanvas.prevSy) / this.kait.kam.zoom
        batasiKamera(this.kait.kam)
      }

      this.aktifKanvas.prevSx = sx
      this.aktifKanvas.prevSy = sy
    }, { passive: false })

    const akhiriKanvas = (e: TouchEvent): void => {
      if (!this.aktifKanvas.sedang) return
      batalTimer()
      if (e.touches.length > 0) return // Masih ada jari lain menempel (akhir pinch)

      const dunia = this.kait.dunia()
      const tim = this.kait.tim()
      const sedangPinch = this.aktifKanvas.pinch
      const sedangMarquee = this.aktifKanvas.marquee
      const sudahGeser = this.aktifKanvas.sudahGeser

      this.aktifKanvas.sedang = false
      this.aktifKanvas.pinch = false
      this.aktifKanvas.marquee = false

      if (!dunia || !this.kait.faseMain()) return

      if (sedangMarquee && this.kait.input.seret.aktif) {
        this.kait.input.seret.aktif = false
        const ids = seleksiKotak(dunia, tim, this.kait.input)
        this.kait.input.unitTerpilih = new Set(ids)
        this.kait.input.bangunanTerpilih = null
        this.kait.input.sumberTerpilih = null
        if (this.kotakAktif) {
          this.kotakAktif = false
          this.kait.setKotakUi(false)
        }
        this.kait.perbaruiHud()
        return
      }

      if (!sedangPinch && !sudahGeser) {
        this.tanganiTap(this.kait.input.mouse.wx, this.kait.input.mouse.wy)
      }
    }

    kanvas.addEventListener('touchend', akhiriKanvas, { passive: false })
    kanvas.addEventListener('touchcancel', akhiriKanvas, { passive: false })

    // --- 2. Sentuhan di Minimap ---
    const geserMinimap = (e: TouchEvent): void => {
      if (!this.kait.dunia()) return
      e.preventDefault()
      const t = e.touches[0]
      if (!t) return
      const r = petaMini.getBoundingClientRect()
      const wx = Math.max(0, Math.min(DUNIA_W, ((t.clientX - r.left) / Math.max(1, r.width)) * DUNIA_W))
      const wy = Math.max(0, Math.min(DUNIA_H, ((t.clientY - r.top) / Math.max(1, r.height)) * DUNIA_H))
      pusatkan(this.kait.kam, wx, wy)
      batasiKamera(this.kait.kam)
    }
    petaMini.addEventListener('touchstart', geserMinimap, { passive: false })
    petaMini.addEventListener('touchmove', geserMinimap, { passive: false })

    // --- 3. Virtual Joystick (Mode 3) ---
    const perbaruiJoy = (clientX: number, clientY: number): void => {
      const r = joystickEl.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const skala = 112 / Math.max(1, r.width)
      const dx = (clientX - cx) * skala
      const dy = (clientY - cy) * skala
      const d = Math.hypot(dx, dy)
      const clampD = Math.min(RADIUS_JOYSTICK, d)
      const ox = d > 0.01 ? (dx / d) * clampD : 0
      const oy = d > 0.01 ? (dy / d) * clampD : 0
      this.vektorJoystick = { x: ox / RADIUS_JOYSTICK, y: oy / RADIUS_JOYSTICK }
      joystickKenop.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`
    }

    const resetJoy = (): void => {
      this.joyTouchId = null
      this.vektorJoystick = { x: 0, y: 0 }
      joystickKenop.style.transform = 'translate(0px, 0px)'
    }

    joystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.kait.padaSentuhPertama()
      const t = e.changedTouches[0]
      if (!t) return
      this.joyTouchId = t.identifier
      perbaruiJoy(t.clientX, t.clientY)
    }, { passive: false })

    joystickEl.addEventListener('touchmove', (e) => {
      if (this.joyTouchId === null) return
      e.preventDefault()
      e.stopPropagation()
      for (const t of Array.from(e.touches)) {
        if (t.identifier === this.joyTouchId) {
          perbaruiJoy(t.clientX, t.clientY)
          break
        }
      }
    }, { passive: false })

    const lepasJoy = (e: TouchEvent): void => {
      if (this.joyTouchId === null) return
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyTouchId) {
          resetJoy()
          break
        }
      }
    }
    joystickEl.addEventListener('touchend', lepasJoy, { passive: false })
    joystickEl.addEventListener('touchcancel', lepasJoy, { passive: false })
  }

  /** Tap pintar satu jari: bangun / serang / pilih / perintah gerak / rally point. */
  tanganiTap(wx: number, wy: number): void {
    const dunia = this.kait.dunia()
    if (!dunia) return
    const tim = this.kait.tim()

    // 1. Sedang menaruh bangunan
    if (this.kait.input.hantuBangun) {
      const jenis = this.kait.input.hantuBangun as keyof typeof BANGUNAN
      if (!bolehTaruh(dunia, jenis, wx, wy)) {
        this.kait.toast('Tidak bisa dibangun di sini')
        return
      }
      const pilih = pilihPawnBangun(dunia, tim, wx, wy, this.kait.input.unitTerpilih)
      if (!pilih.adaPawn) {
        this.kait.toast('Tidak ada Pawn')
        return
      }
      this.kait.kirim({
        jenis: 'bangun',
        ids: pilih.pawn ? [pilih.pawn.id] : [],
        bangunan: jenis,
        x: wx,
        y: wy,
      })
      if (pilih.semuaSibuk) {
        this.kait.toast('Pondasi ditaruh — Pawn pertama yang selesai akan otomatis melanjutkannya')
      }
      this.kait.input.hantuBangun = null
      return
    }

    // 2. Mode Serang [A] aktif
    if (this.kait.input.modeSerang && this.kait.input.unitTerpilih.size > 0) {
      const ids = [...this.kait.input.unitTerpilih]
      this.kait.kirim({ jenis: 'serangPindah', ids, x: wx, y: wy })
      this.kait.tandaiBendera(wx, wy, 'serang')
      this.kait.input.modeSerang = false
      this.kait.perbaruiHud()
      return
    }

    // 3. Tap pada unit milik sendiri -> pilih (tap ganda -> pilih semua setipe)
    const u = unitDiTitik(dunia, wx, wy)
    if (u && u.tim === tim) {
      const sekarang = performance.now()
      const ganda = sekarang - this.tapTerakhir.waktu < 360 && this.tapTerakhir.id === u.id
      this.tapTerakhir = { waktu: sekarang, id: u.id }
      this.kait.input.unitTerpilih = ganda
        ? new Set(dunia.unit.filter((x) => x.tim === tim && x.peran === u.peran).map((x) => x.id))
        : new Set([u.id])
      this.kait.input.bangunanTerpilih = null
      this.kait.input.sumberTerpilih = null
      this.kait.perbaruiHud()
      return
    }

    // 4. Tap pada bangunan milik sendiri yang utuh -> pilih bangunan (untuk riset/pelatihan)
    const bTap = bangunanDiTitik(dunia, wx, wy)
    if (bTap && bTap.tim === tim && bTap.fase === 'aktif' && bTap.hp >= bTap.hpMaks) {
      this.kait.input.unitTerpilih.clear()
      this.kait.input.bangunanTerpilih = bTap.id
      this.kait.input.sumberTerpilih = null
      this.kait.perbaruiHud()
      return
    }

    // 5. Jika ada unit terpilih -> jalankan perintah pintar (gerak / serang / panen / perbaiki)
    const ids = [...this.kait.input.unitTerpilih]
    if (ids.length > 0) {
      const p = perintahKlikKanan(dunia, tim, ids, wx, wy, false)
      if (p) {
        this.kait.kirim(p)
        if (p.jenis === 'kumpul') this.kait.sorotSumber?.(p.targetId)
        const jenisFlag = p.jenis === 'serang' || p.jenis === 'serangPindah' ? 'serang' : 'pindah'
        this.kait.tandaiBendera(wx, wy, jenisFlag)
      }
      return
    }

    // 6. Jika bangunan sendiri (konstruksi/rusak) di-tap saat tidak ada unit terpilih -> pilih
    if (bTap && bTap.tim === tim) {
      this.kait.input.bangunanTerpilih = bTap.id
      this.kait.input.sumberTerpilih = null
      this.kait.perbaruiHud()
      return
    }

    // 6b. Tap pada resource (pohon, tambang, domba, daging, tunggul) -> pilih & tampilkan sisa stok!
    const sTap = sumberDiTitik(dunia, wx, wy)
    if (sTap) {
      this.kait.input.bangunanTerpilih = null
      this.kait.input.sumberTerpilih = sTap
      this.kait.perbaruiHud()
      return
    }

    // 7. Jika bangunan produksi sedang terpilih dan tap tanah -> pindah Bendera Rally Point
    const bAktif = this.kait.bangunanTerpilih()
    if (
      bAktif && bAktif.tim === tim && bAktif.fase === 'aktif' &&
      (BANGUNAN[bAktif.jenis].melatih.length > 0 || bAktif.jenis === 'altar')
    ) {
      this.kait.kirim({ jenis: 'rally', bangunanId: bAktif.id, x: wx, y: wy })
      this.kait.tandaiBendera(wx, wy, 'rally')
      this.kait.toast(`Bendera Rally Point ${BANGUNAN[bAktif.jenis].nama} dipindahkan`)
      return
    }

    this.kait.input.sumberTerpilih = null
    this.kait.perbaruiHud()
  }
}
