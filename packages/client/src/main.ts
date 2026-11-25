import { KURSOR, type PeranHeroAset } from '@hftf/aset'
import {
  Minimap, PeremajaTerrain, batasiKamera, buatKamera, gambarEntitas, keLayarX, keLayarY,
  muatSemuaAset, pusatkan,
} from '@hftf/render'
import { TransportLokal } from '@hftf/net'
import { DT_TETAP, DUNIA_H, DUNIA_W, type Tim } from '@hftf/shared'
import {
  BANGUNAN, buatAi, buatDunia, langkahAi, langkahBanyak, terapkanPerintah,
  type Bangunan, type Dunia, type KeadaanAi, type Perintah, type Unit,
} from '@hftf/sim'
import { Hud, Lobi, bangunGaya, urlAset } from '@hftf/ui'
import {
  bangunanDiTitik, buatInput, fokusKeCastle, gulirKamera, perbaruiMouseDunia,
  perintahKlikKanan, seleksiKotak, unitDiTitik, bolehTaruh,
} from './input.js'

const BASIS = ''

type Fase = 'muat' | 'lobi' | 'main' | 'selesai'

class Permainan {
  private fase: Fase = 'muat'
  private dunia: Dunia | null = null
  private ai: KeadaanAi | null = null
  private transport: TransportLokal<Perintah, never> | null = null
  private timSaya: Tim = 'blue'
  private kam = buatKamera()
  private input = buatInput()
  private tombol = new Set<string>()
  private terrainRender: PeremajaTerrain | null = null
  private minimap: Minimap | null = null
  private hud: Hud
  private lobi: Lobi
  private kursor: HTMLImageElement
  private ctx: CanvasRenderingContext2D | null = null
  private akumulator = 0
  private waktuTerakhir = 0
  private klikTerakhir = { waktu: 0, id: -1 }

  constructor() {
    const gaya = document.createElement('style')
    gaya.textContent = bangunGaya(BASIS)
    document.head.append(gaya)

    this.hud = new Hud(BASIS, {
      pilihTab: () => this.perbaruiHud(),
      mulaiBangun: (jenis) => {
        this.input.hantuBangun = jenis
        this.hud.tampilkanToast(`Pilih lokasi untuk ${BANGUNAN[jenis as keyof typeof BANGUNAN].nama}`)
      },
      latih: (peran) => {
        const b = this.bangunanTerpilih()
        if (!b) return this.hud.tampilkanToast('Pilih bangunan dulu')
        this.kirim({ jenis: 'latih', bangunanId: b.id, peran: peran as never })
      },
      bangkitkanHero: () => {
        const altar = this.dunia?.bangunan.find(
          (b) => b.tim === this.timSaya && b.jenis === 'altar' && b.fase === 'aktif')
        if (!altar) return this.hud.tampilkanToast('Bangun Altar of Heroes dulu!')
        this.kirim({ jenis: 'bangkitkanHero', bangunanId: altar.id })
      },
    })

    this.lobi = new Lobi(BASIS, {
      mulaiSolo: (hero, kesulitan) => this.mulaiSolo(hero, kesulitan),
      buatRoom: () => this.hud.tampilkanToast('LAN menyusul di milestone berikutnya'),
      gabungRoom: () => this.hud.tampilkanToast('LAN menyusul di milestone berikutnya'),
      mulaiLan: () => undefined,
      keluarRoom: () => undefined,
    })

    this.kursor = document.createElement('img')
    this.kursor.id = 'kursor'
    this.kursor.src = urlAset(KURSOR['kursor01']!, BASIS)

    document.body.append(this.hud.akar)
    this.hud.akar.querySelector('#panggung')!.append(this.lobi.akar, this.kursor)

    this.ctx = this.hud.kanvas.getContext('2d')
    this.pasangInput()
    window.addEventListener('resize', () => this.ukurUlang())
    this.ukurUlang()
    void this.boot()
  }

  private async boot(): Promise<void> {
    const kotak = document.createElement('div')
    kotak.className = 'hamparan'
    kotak.innerHTML =
      '<div class="kotak"><h1>Memuat aset Tiny Swords…</h1>' +
      '<div id="muat-bar"><div id="muat-isi"></div></div>' +
      '<p id="muat-teks" style="margin-top:8px"></p></div>'
    this.hud.akar.querySelector('#panggung')!.append(kotak)
    this.lobi.tampil(false)

    const isi = kotak.querySelector('#muat-isi') as HTMLElement
    const teks = kotak.querySelector('#muat-teks') as HTMLElement
    const hasil = await muatSemuaAset((k) => {
      isi.style.width = `${Math.round((k.selesai / k.total) * 100)}%`
      teks.textContent = `${k.selesai} / ${k.total}`
    }, BASIS)

    kotak.remove()
    if (hasil.gagal.length > 0) {
      console.error('Aset gagal dimuat:', hasil.gagal)
      this.hud.tampilkanToast(`${hasil.gagal.length} aset gagal dimuat — cek console`)
    }
    this.fase = 'lobi'
    this.lobi.tampil(true)
    this.lobi.setAlamat(window.location.origin)
    this.lobi.setStatusRoom('Mode LAN menyusul; Solo vs AI sudah bisa dimainkan.', false, false)
    requestAnimationFrame((t) => this.bingkai(t))
  }

  private mulaiSolo(hero: PeranHeroAset, kesulitan: 'normal' | 'sulit'): void {
    this.timSaya = 'blue'
    const seed = Math.floor(Math.random() * 1_000_000)
    this.dunia = buatDunia({ seed, heroBlue: hero, heroRed: 'champion' })
    this.ai = buatAi('red', kesulitan)
    this.transport = new TransportLokal<Perintah, never>('blue')
    this.terrainRender = new PeremajaTerrain(this.dunia.terrain)
    this.minimap = new Minimap(this.dunia)
    this.input = buatInput()
    this.hud.setTim('blue')
    fokusKeCastle(this.dunia, 'blue', this.kam)
    this.lobi.tampil(false)
    this.kursor.style.display = ''
    this.fase = 'main'
    this.perbaruiHud()
  }

  private kirim(p: Perintah): void {
    if (!this.dunia || this.fase !== 'main') return
    terapkanPerintah(this.dunia, this.timSaya, p)
  }

  private bangunanTerpilih(): Bangunan | null {
    if (!this.dunia || this.input.bangunanTerpilih === null) return null
    return this.dunia.bangunan.find((b) => b.id === this.input.bangunanTerpilih) ?? null
  }

  private unitTerpilih(): Unit[] {
    if (!this.dunia) return []
    return this.dunia.unit.filter((u) => this.input.unitTerpilih.has(u.id))
  }

  private ukurUlang(): void {
    const k = this.hud.kanvas
    const r = k.getBoundingClientRect()
    k.width = Math.max(320, Math.floor(r.width))
    k.height = Math.max(240, Math.floor(r.height))
    this.kam.lebar = k.width
    this.kam.tinggi = k.height
    batasiKamera(this.kam)
    if (this.ctx) this.ctx.imageSmoothingEnabled = false
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private pasangInput(): void {
    const k = this.hud.kanvas

    k.addEventListener('contextmenu', (e) => e.preventDefault())

    k.addEventListener('mousemove', (e) => {
      const r = k.getBoundingClientRect()
      this.input.mouse.sx = e.clientX - r.left
      this.input.mouse.sy = e.clientY - r.top
      perbaruiMouseDunia(this.input, this.kam)
      this.kursor.style.left = `${this.input.mouse.sx - 4}px`
      this.kursor.style.top = `${this.input.mouse.sy - 2}px`
      if (this.input.seret.aktif) {
        this.input.seret.x2 = this.input.mouse.wx
        this.input.seret.y2 = this.input.mouse.wy
      }
    })

    k.addEventListener('mousedown', (e) => {
      if (this.fase !== 'main' || !this.dunia) return
      perbaruiMouseDunia(this.input, this.kam)
      const { wx, wy } = this.input.mouse

      if (e.button === 0) {
        if (this.input.hantuBangun) {
          const jenis = this.input.hantuBangun as keyof typeof BANGUNAN
          if (!bolehTaruh(this.dunia, jenis, wx, wy)) {
            this.hud.tampilkanToast('Tidak bisa dibangun di sini')
            return
          }
          const pawn = this.dunia.unit.find((u) => u.tim === this.timSaya && u.peran === 'pawn')
          if (!pawn) {
            this.hud.tampilkanToast('Tidak ada Pawn')
            return
          }
          this.kirim({ jenis: 'bangun', ids: [pawn.id], bangunan: jenis, x: wx, y: wy })
          this.input.hantuBangun = null
          return
        }
        this.input.seret = { aktif: true, x1: wx, y1: wy, x2: wx, y2: wy }
        return
      }

      if (e.button === 2) {
        const ids = [...this.input.unitTerpilih]
        const p = perintahKlikKanan(this.dunia, this.timSaya, ids, wx, wy, this.input.modeSerang)
        if (p) this.kirim(p)
        this.input.modeSerang = false
        this.input.hantuBangun = null
      }
    })

    k.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.input.seret.aktif || !this.dunia) return
      this.input.seret.aktif = false
      const lebar = Math.abs(this.input.seret.x2 - this.input.seret.x1)
      const tinggi = Math.abs(this.input.seret.y2 - this.input.seret.y1)

      if (lebar > 12 || tinggi > 12) {
        const ids = seleksiKotak(this.dunia, this.timSaya, this.input)
        this.input.unitTerpilih = new Set(ids)
        this.input.bangunanTerpilih = null
        this.perbaruiHud()
        return
      }

      const { wx, wy } = this.input.mouse
      const u = unitDiTitik(this.dunia, wx, wy)
      if (u && u.tim === this.timSaya) {
        // Klik ganda -> pilih semua unit setipe (PRD §5.3).
        const sekarang = performance.now()
        const ganda = sekarang - this.klikTerakhir.waktu < 320 && this.klikTerakhir.id === u.id
        this.klikTerakhir = { waktu: sekarang, id: u.id }
        this.input.unitTerpilih = ganda
          ? new Set(this.dunia.unit.filter((x) => x.tim === this.timSaya && x.peran === u.peran).map((x) => x.id))
          : new Set([u.id])
        this.input.bangunanTerpilih = null
        this.perbaruiHud()
        return
      }

      const b = bangunanDiTitik(this.dunia, wx, wy)
      this.input.unitTerpilih.clear()
      this.input.bangunanTerpilih = b && b.tim === this.timSaya ? b.id : null
      this.perbaruiHud()
    })

    k.addEventListener('wheel', (e) => {
      e.preventDefault()
      const lama = this.kam.zoom
      this.kam.zoom = Math.max(0.45, Math.min(1.8, this.kam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)))
      // Zoom ke arah kursor supaya terasa alami.
      this.kam.x += this.input.mouse.sx * (1 / lama - 1 / this.kam.zoom)
      this.kam.y += this.input.mouse.sy * (1 / lama - 1 / this.kam.zoom)
      batasiKamera(this.kam)
    }, { passive: false })

    this.hud.petaMini.addEventListener('mousedown', (e) => {
      if (!this.dunia) return
      const r = this.hud.petaMini.getBoundingClientRect()
      const wx = ((e.clientX - r.left) / r.width) * DUNIA_W
      const wy = ((e.clientY - r.top) / r.height) * DUNIA_H
      if (e.button === 0) {
        pusatkan(this.kam, wx, wy)
      } else {
        const ids = [...this.input.unitTerpilih]
        if (ids.length > 0) this.kirim({ jenis: 'serangPindah', ids, x: wx, y: wy })
      }
    })
    this.hud.petaMini.addEventListener('contextmenu', (e) => e.preventDefault())

    window.addEventListener('keydown', (e) => {
      this.tombol.add(e.code)
      if (this.fase !== 'main' || !this.dunia) return
      const ids = [...this.input.unitTerpilih]

      if (e.code === 'KeyA' && !e.repeat && ids.length > 0) { this.input.modeSerang = true; return }
      if (e.code === 'Escape') { this.input.hantuBangun = null; this.input.modeSerang = false; return }
      if (e.code === 'KeyQ' && ids.length > 0) { this.kirim({ jenis: 'skill', ids }); return }
      if (e.code === 'KeyS' && e.ctrlKey) return
      if (e.code === 'KeyH' && ids.length > 0) { this.kirim({ jenis: 'tahan', ids }); return }
      if (e.code === 'Home') { fokusKeCastle(this.dunia, this.timSaya, this.kam); return }

      if (e.code === 'F1') {
        e.preventDefault()
        this.input.unitTerpilih = new Set(
          this.dunia.unit.filter((u) => u.tim === this.timSaya && u.peran === 'pawn').map((u) => u.id))
        this.perbaruiHud()
        return
      }
      if (e.code === 'F2') {
        e.preventDefault()
        this.input.unitTerpilih = new Set(
          this.dunia.unit.filter((u) => u.tim === this.timSaya && u.peran !== 'pawn').map((u) => u.id))
        this.perbaruiHud()
        return
      }

      const angka = /^Digit([1-4])$/.exec(e.code)
      if (angka) {
        const n = Number(angka[1])
        if (e.ctrlKey) {
          this.input.grup[n] = ids
          this.hud.tampilkanToast(`Grup ${n}: ${ids.length} unit`)
        } else {
          this.input.unitTerpilih = new Set(this.input.grup[n] ?? [])
          this.perbaruiHud()
        }
      }
    })
    window.addEventListener('keyup', (e) => this.tombol.delete(e.code))
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  private bingkai(t: number): void {
    const dt = Math.min(0.25, (t - this.waktuTerakhir) / 1000 || 0)
    this.waktuTerakhir = t

    if (this.fase === 'main' && this.dunia) {
      gulirKamera(this.kam, this.tombol, this.input.mouse.sx, this.input.mouse.sy)
      batasiKamera(this.kam)

      // Langkah tetap: simulasi TIDAK boleh bergantung pada fps.
      this.akumulator += dt
      let langkah = 0
      while (this.akumulator >= DT_TETAP && langkah < 8) {
        if (this.ai && this.dunia.hasil.jenis === 'berlangsung') {
          for (const p of langkahAi(this.dunia, this.ai)) terapkanPerintah(this.dunia, 'red', p)
        }
        langkahBanyak(this.dunia, 1)
        this.akumulator -= DT_TETAP
        langkah++
      }
      if (this.dunia.hasil.jenis !== 'berlangsung') this.selesaikan()
    }

    this.hud.langkahToast(dt)
    this.gambar()
    if (this.fase === 'main') this.perbaruiHudRingan()
    requestAnimationFrame((n) => this.bingkai(n))
  }

  private gambar(): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.hud.kanvas.width, this.hud.kanvas.height)
    if (!this.dunia || this.fase === 'muat' || this.fase === 'lobi') {
      ctx.fillStyle = '#1d2a33'
      ctx.fillRect(0, 0, this.hud.kanvas.width, this.hud.kanvas.height)
      return
    }

    ctx.imageSmoothingEnabled = false
    ctx.save()
    ctx.scale(this.kam.zoom, this.kam.zoom)
    ctx.translate(-this.kam.x, -this.kam.y)

    this.terrainRender?.gambar(ctx, this.kam, performance.now() / 1000)
    gambarEntitas(ctx, this.dunia, this.kam, {
      terpilihUnit: this.input.unitTerpilih,
      terpilihBangunan: this.input.bangunanTerpilih,
      timSaya: this.timSaya,
    })

    // Hantu bangunan: hijau kalau sah, merah kalau terhalang (PRD §3 poin 1).
    if (this.input.hantuBangun) {
      const jenis = this.input.hantuBangun as keyof typeof BANGUNAN
      const def = BANGUNAN[jenis]
      const sah = bolehTaruh(this.dunia, jenis, this.input.mouse.wx, this.input.mouse.wy)
      ctx.globalAlpha = 0.5
      ctx.fillStyle = sah ? '#6fd36f' : '#e05a4a'
      ctx.fillRect(this.input.mouse.wx - def.w / 2, this.input.mouse.wy - def.h * 0.5, def.w, def.h * 0.6)
      ctx.globalAlpha = 1
    }

    ctx.restore()

    // Kotak seleksi digambar di ruang layar supaya ketebalannya tetap.
    if (this.input.seret.aktif) {
      const x1 = keLayarX(this.kam, Math.min(this.input.seret.x1, this.input.seret.x2))
      const y1 = keLayarY(this.kam, Math.min(this.input.seret.y1, this.input.seret.y2))
      const x2 = keLayarX(this.kam, Math.max(this.input.seret.x1, this.input.seret.x2))
      const y2 = keLayarY(this.kam, Math.max(this.input.seret.y1, this.input.seret.y2))
      ctx.strokeStyle = '#8ef08e'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      ctx.setLineDash([])
    }

    const mctx = this.hud.petaMini.getContext('2d')
    if (mctx && this.minimap) {
      this.minimap.gambar(mctx, this.kam, this.hud.petaMini.width, this.hud.petaMini.height, this.timSaya)
    }
  }

  private perbaruiHudRingan(): void {
    if (!this.dunia) return
    this.hud.perbaruiPita(this.dunia, this.timSaya, 'SOLO vs AI')
    this.hud.perbaruiSumberDaya(this.dunia, this.timSaya)
    this.hud.perbaruiSeleksi(this.dunia, this.unitTerpilih(), this.bangunanTerpilih())
  }

  private perbaruiHud(): void {
    if (!this.dunia) return
    this.perbaruiHudRingan()
    this.hud.perbaruiKisi(this.dunia, this.timSaya, this.bangunanTerpilih())
  }

  private selesaikan(): void {
    if (this.fase === 'selesai' || !this.dunia) return
    this.fase = 'selesai'
    const h = this.dunia.hasil
    const menang = h.jenis === 'menang' && h.tim === this.timSaya
    const judul = h.jenis === 'draw' ? 'SERI' : menang ? 'KEMENANGAN KERAJAAN!' : 'KEKALAHAN'
    const s = this.dunia.tim[this.timSaya].statistik

    const kotak = document.createElement('div')
    kotak.className = 'hamparan'
    kotak.innerHTML =
      `<div class="kotak"><h1>${judul}</h1>` +
      `<p>Durasi: ${Math.floor(this.dunia.tick / 3600)}m ${Math.floor((this.dunia.tick / 60) % 60)}s</p>` +
      `<p>Musuh dikalahkan: ${s.bunuh} • Pasukan gugur: ${s.gugur}</p>` +
      `<p>Bangunan dibangun: ${s.bangunanDibangun} • hilang: ${s.bangunanHilang}</p>` +
      `<p>Gold terkumpul: ${Math.round(s.goldTerkumpul)} • Kayu: ${Math.round(s.kayuTerkumpul)} • Daging: ${Math.round(s.dagingTerkumpul)}</p>` +
      `<div class="baris"><button class="tombol-besar" id="kembali">Kembali ke Lobby</button></div></div>`
    this.hud.akar.querySelector('#panggung')!.append(kotak)
    kotak.querySelector('#kembali')!.addEventListener('click', () => {
      kotak.remove()
      this.dunia = null
      this.fase = 'lobi'
      this.kursor.style.display = 'none'
      this.lobi.tampil(true)
    })
  }
}

new Permainan()
