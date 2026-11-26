import {
  BANGUNAN_BLUE, BANGUNAN_FASE, BANGUNAN_RED, BANGUNAN_U010_WARNA, BARIS,
  HERO_BLUE, HERO_RED, KURSOR, PAWN_FREE, SUMBER, UNIT_BLUE, UNIT_RED, UNIT_U010_WARNA,
  type Aset, type PeranHeroAset,
} from '@hftf/aset'
import {
  Efek, LapisanFog, Minimap, PeremajaTerrain, batasiKamera, buatKamera, buatKursorAksi,
  gambarEntitas, keLayarX, keLayarY, muatSemuaAset, potongKursor, potongSprite, pusatkan,
} from '@hftf/render'
import {
  KlienLan, KlienP2p, TransportLokal, p2pDidukungBrowser, pasangPolyfillP2p,
  type KlienMultiplayer, type MulaiLanInfo, type PendengarLan, type RingkasRoom,
} from '@hftf/net'
import {
  DT_TETAP, DUNIA_H, DUNIA_W, GOLD_AWAL_BAKU, WARNA_TIM, buatSlotDefault,
  type KonfigMatch, type Tim, type TimPemain,
} from '@hftf/shared'
import {
  BANGUNAN, REVIVE, RISET, TINGKAT_MAKS, UNIT, buatAi, buatDunia, buatSnapshot, langkahAi, langkahBanyak,
  hitungFog, supplyMaks, supplyTerpakai, terapkanPerintah, terapkanSnapshot, timMenang,
  type Bangunan, type Dunia, type JenisRiset, type KeadaanAi, type PeranUnit, type Perintah, type Snapshot, type Unit,
} from '@hftf/sim'
import { Hud, Lobi, bangunGaya, buatKonfirmasi, buatMenuJeda, urlAset, type FilterUnit, type ModeSentuh, type PerintahKartu } from '@hftf/ui'
import {
  bangunanDiTitik, buatInput, fokusKeCastle, gulirKamera, perbaruiMouseDunia,
  perintahKlikKanan, pilihKursorKonteks, pilihPawnBangun, seleksiKotak, sumberDiTitik, unitDiTitik, bolehTaruh,
  type JenisKursor,
} from './input.js'
import { PengendaliSentuh, deteksiPerangkatSentuh } from './sentuh.js'

const BASIS = ''
pasangPolyfillP2p()

type Fase = 'muat' | 'lobi' | 'main' | 'selesai'

class Permainan {
  private fase: Fase = 'muat'
  private dunia: Dunia | null = null
  private daftarAi: KeadaanAi[] = []
  private transport: TransportLokal<Perintah, never> | null = null
  private lan: KlienMultiplayer | null = null
  private modeKoneksi: 'lan' | 'p2p' = 'lan'
  private peran: 'solo' | 'host' | 'tamu' = 'solo'
  private peranLanRoom: 'host' | 'tamu' | null = null
  private tamuAktif: TimPemain[] = []
  private konfigTerakhir: KonfigMatch = {
    peta: 'klasik2',
    goldAwal: GOLD_AWAL_BAKU,
    slot: buatSlotDefault('klasik2'),
  }
  private asetSiap = false
  private akumulatorSiar = 0
  private overlayPutus: HTMLElement | null = null
  private menuJeda: HTMLElement | null = null
  private suaraNyala = true
  private timSaya: Tim = 'blue'
  private kam = buatKamera()
  private input = buatInput()
  private tombol = new Set<string>()
  private terrainRender: PeremajaTerrain | null = null
  private minimap: Minimap | null = null
  private fog: LapisanFog | null = null
  private efek = new Efek()
  private hud: Hud
  private lobi: Lobi
  private kursor: HTMLImageElement
  private ctx: CanvasRenderingContext2D | null = null
  private mctx: CanvasRenderingContext2D | null = null
  private akumulator = 0
  private akumulatorHud = 1
  private akumulatorMinimap = 1
  private waktuTerakhir = 0
  private posLama = new Map<number, { x: number; y: number }>()
  private fpsHitung = 0
  private fpsWaktu = 0
  private fpsTampil = 0
  private sorotSumber: { id: number; sisa: number; durasi: number } | null = null
  private klikTerakhir = { waktu: 0, id: -1 }
  private geserTengah = { aktif: false, x: 0, y: 0 }
  private kursorPotong = new Map<string, string>()
  private kursorAktif: JenisKursor = 'kursor01'
  private sentuh: PengendaliSentuh
  private perangkatSentuh = deteksiPerangkatSentuh()
  private abaikanPutar = false
  private modeStatis = false
  private timerNamaLan = 0

  constructor() {
    const gaya = document.createElement('style')
    gaya.textContent = bangunGaya(BASIS)
    document.head.append(gaya)

    this.hud = new Hud(BASIS, {
      pilihTab: () => this.perbaruiHud(),
      mulaiBangun: (jenis) => {
        if (!this.dunia) return
        const def = BANGUNAN[jenis as keyof typeof BANGUNAN]
        const kurang = this.teksKurang(def.gold, def.kayu, 0)
        if (kurang) {
          this.hud.tampilkanToast(`Kurang ${kurang} untuk membangun ${def.nama}!`, true)
          return
        }
        this.input.hantuBangun = jenis
        this.hud.tampilkanToast(`Pilih lokasi untuk ${def.nama}`)
      },
      latih: (peran) => {
        if (!this.dunia) return
        const def = UNIT[peran as PeranUnit]
        const semuaCocok = this.dunia.bangunan
          .filter((x) => x.tim === this.timSaya && x.fase === 'aktif' && x.jenis === def.dariBangunan)
        if (semuaCocok.length === 0) {
          this.hud.tampilkanToast(`Bangun ${BANGUNAN[def.dariBangunan!].nama} dulu untuk melatih ${def.nama}!`, true)
          return
        }
        let b = this.bangunanTerpilih()
        if (!b || b.fase !== 'aktif' || b.jenis !== def.dariBangunan || b.antrean.length >= 5) {
          b = semuaCocok.slice().sort((a, c) => a.antrean.length - c.antrean.length)[0] ?? null
        }
        if (!b || b.antrean.length >= 5) {
          this.hud.tampilkanToast(`Antrean ${BANGUNAN[def.dariBangunan!].nama} penuh (maks 5)!`, true)
          return
        }
        const popPakai = this.populasiDenganAntrean()
        const popMaks = supplyMaks(this.dunia, this.timSaya)
        if (popPakai + def.pop > popMaks) {
          this.hud.tampilkanToast(`Populasi penuh (${popPakai}/${popMaks}) — bangun House dulu!`, true)
          return
        }
        const kurang = this.teksKurang(def.gold, def.kayu, def.daging)
        if (kurang) {
          this.hud.tampilkanToast(`Kurang ${kurang} untuk melatih ${def.nama}!`, true)
          return
        }
        this.kirim({ jenis: 'latih', bangunanId: b.id, peran: peran as PeranUnit })
        this.input.unitTerpilih.clear()
        this.input.sumberTerpilih = null
        this.input.bangunanTerpilih = b.id
        this.perbaruiHud()
      },
      batalLatih: (bangunanId, indeks) => {
        this.kirim({ jenis: 'batalLatih', bangunanId, indeks })
        this.perbaruiHud()
      },
      riset: (bangunanId, jenis: JenisRiset) => {
        if (!this.dunia) return
        const def = RISET[jenis]
        const k = this.dunia.tim[this.timSaya]
        const lv = k.riset[jenis]
        if (lv >= TINGKAT_MAKS) {
          this.hud.tampilkanToast(`Riset ${def.nama} sudah tingkat maksimum!`, true)
          return
        }
        const b = this.dunia.bangunan.find((x) => x.id === bangunanId)
        if (!b || b.fase !== 'aktif') return
        if (b.riset) {
          this.hud.tampilkanToast(`Sedang meneliti ${RISET[b.riset.jenis].nama} di bangunan ini!`, true)
          return
        }
        if (this.dunia.bangunan.some((x) => x.tim === this.timSaya && x.riset?.jenis === jenis)) {
          this.hud.tampilkanToast(`Riset ${def.nama} sedang dikerjakan di bangunan lain!`, true)
          return
        }
        const biaya = def.tingkat[lv]!
        const kurang = this.teksKurang(biaya.gold, biaya.kayu, 0)
        if (kurang) {
          this.hud.tampilkanToast(`Kurang ${kurang} untuk riset ${def.nama}!`, true)
          return
        }
        this.kirim({ jenis: 'riset', bangunanId, riset: jenis })
        this.perbaruiHud()
      },
      bangkitkanHero: () => {
        if (!this.dunia) return
        const altar = this.dunia.bangunan.find(
          (b) => b.tim === this.timSaya && b.jenis === 'altar' && b.fase === 'aktif')
        if (!altar) {
          this.hud.tampilkanToast('Bangun Altar of Heroes dulu untuk membangkitkan Hero!', true)
          return
        }
        const gugur = this.dunia.tim[this.timSaya].heroGugur
        if (!gugur) return
        if (altar.revive) {
          this.hud.tampilkanToast('Hero sedang dibangkitkan di Altar!', true)
          return
        }
        const biayaGold = REVIVE.goldPerLevel * gugur.level
        const kurang = this.teksKurang(biayaGold, 0, REVIVE.daging)
        if (kurang) {
          this.hud.tampilkanToast(`Kurang ${kurang} untuk membangkitkan Hero!`, true)
          return
        }
        this.kirim({ jenis: 'bangkitkanHero', bangunanId: altar.id })
      },
      pilihFilterUnit: (filter) => this.pilihFilter(filter),
      perintahUnit: (cmd) => this.jalankanPerintahKartu(cmd),
      fokusUnit: (unitId) => {
        this.input.unitTerpilih = new Set([unitId])
        this.input.bangunanTerpilih = null
        this.input.sumberTerpilih = null
        this.perbaruiHud()
      },
      bukaMenu: () => this.bukaMenuJeda(),
      layarPenuh: () => void this.mintaLayarPenuh(),
      toggleKotak: () => this.sentuh.toggleKotak(),
      lewatPutar: () => {
        this.abaikanPutar = true
        this.hud.setLayarPutar(false)
      },
    })

    this.lobi = new Lobi(BASIS, {
      mulaiSolo: (hero, kesulitan) => {
        const slot = buatSlotDefault('klasik2', this.lobi.nama, hero)
        if (slot[1]) slot[1].kesulitanAi = kesulitan === 'sulit' ? 'susah' : 'medium'
        this.mulaiSkirmish({ peta: 'klasik2', goldAwal: GOLD_AWAL_BAKU, slot })
      },
      mulaiMatch: (konfig) => this.mulaiSkirmish(konfig),
      buatRoom: (nama, hero) => {
        if (this.modeStatis) return
        this.pastikanLan(nama)
        this.lan?.kirimNama(nama)
        this.lan?.buatRoom(hero)
      },
      buatRoomKonfig: (nama, konfig) => {
        if (this.modeStatis) return
        this.pastikanLan(nama)
        this.lan?.kirimNama(nama)
        const slotLan = konfig.slot.map((s, i) => (
          i === 0 ? { ...s, jenis: 'manusia' as const, nama } : { ...s }
        ))
        // Pastikan minimal ada slot terbuka agar teman di Wi-Fi selalu bisa bergabung
        if (slotLan.length > 1 && !slotLan.some((s, i) => i > 0 && s.jenis === 'manusia')) {
          for (let i = 1; i < slotLan.length; i++) {
            slotLan[i]!.jenis = 'manusia'
            slotLan[i]!.nama = 'Terbuka (LAN)'
          }
        }
        this.lan?.buatRoom(slotLan[0]?.hero ?? 'king', {
          peta: konfig.peta,
          goldAwal: konfig.goldAwal,
          slot: slotLan,
        })
      },
      aturRoom: (konfig) => {
        if (this.modeStatis) return
        this.lan?.aturRoom(konfig)
      },
      ubahSlotTamu: (opsi) => {
        if (this.modeStatis) return
        this.lan?.ubahSlot(opsi)
      },
      ubahNama: (nama) => {
        if (this.modeStatis || !this.lan) return
        window.clearTimeout(this.timerNamaLan)
        this.timerNamaLan = window.setTimeout(() => {
          this.lan?.kirimNama(nama)
        }, 250)
      },
      gabungRoom: (kode, nama, hero) => {
        if (this.modeStatis) return
        if (!kode) return this.hud.tampilkanToast('Masukkan kode room dulu', true)
        this.pastikanLan(nama)
        this.lan?.kirimNama(nama)
        this.lan?.gabung(kode, hero)
      },
      mulaiLan: () => this.lan?.mulai(),
      keluarRoom: () => {
        this.lan?.keluar()
        this.peranLanRoom = null
      },
      salinLinkRoom: (kode) => {
        const u = new URL(location.href)
        u.searchParams.set('room', kode)
        const teks = u.toString()
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(teks).then(
            () => this.hud.tampilkanToast(`Link room ${kode} disalin — kirim ke teman!`),
            () => this.hud.tampilkanToast(`Kode room: ${kode}`),
          )
        } else {
          this.hud.tampilkanToast(`Bagikan kode room: ${kode}`)
        }
      },
      ubahModeSentuh: (m) => this.terapkanModeSentuh(m),
      layarPenuh: () => void this.mintaLayarPenuh(),
    })

    const self = this
    this.sentuh = new PengendaliSentuh({
      dunia: () => self.dunia,
      tim: () => self.timSaya,
      faseMain: () => self.fase === 'main',
      kam: this.kam,
      get input() { return self.input },
      kirim: (p) => self.kirim(p),
      tandaiBendera: (wx, wy, jenis) => this.efek.tandaiPerintah(wx, wy, jenis),
      sorotSumber: (id) => { this.sorotSumber = { id, sisa: 1.5, durasi: 1.5 } },
      toast: (pesan) => this.hud.tampilkanToast(pesan),
      perbaruiHud: () => this.perbaruiHud(),
      bangunanTerpilih: () => this.bangunanTerpilih(),
      padaSentuhPertama: () => {
        this.perangkatSentuh = true
        this.kursor.style.display = 'none'
        this.hud.setModeSentuh(this.sentuh.mode, true)
      },
      setKotakUi: (aktif) => this.hud.setKotakAktif(aktif),
    })
    this.lobi.setModeSentuh(this.sentuh.mode)
    this.hud.setModeSentuh(this.sentuh.mode, this.perangkatSentuh)

    this.kursor = document.createElement('img')
    this.kursor.id = 'kursor'
    this.kursor.src = urlAset(KURSOR['kursor01']!, BASIS)

    document.body.append(this.hud.bingkai)
    this.hud.akar.append(this.lobi.akar)
    this.hud.akar.querySelector('#panggung')!.append(this.kursor)

    this.ctx = this.hud.kanvas.getContext('2d', { alpha: false })
    this.mctx = this.hud.petaMini.getContext('2d', { alpha: false })
    // Kait debug: memeriksa state dari console tanpa membongkar bundel.
    ;(window as unknown as Record<string, unknown>)['__hftf'] = this
    this.pasangInput()
    this.sentuh.pasang(this.hud.kanvas, this.hud.petaMini, this.hud.joystickEl, this.hud.joystickKenop)
    window.addEventListener('resize', () => this.ukurUlang())
    window.addEventListener('orientationchange', () => {
      this.ukurUlang()
      window.setTimeout(() => this.ukurUlang(), 150)
    })
    window.visualViewport?.addEventListener('resize', () => this.ukurUlang())
    document.addEventListener('fullscreenchange', () => this.ukurUlang())
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
    this.asetSiap = true
    this.segarkanPotretTim(this.timSaya)
    for (const nama of ['kursor01', 'kursor02', 'kursor03', 'kursor04'] as const) {
      const hasilPotong = potongKursor(KURSOR[nama]!, 42, nama === 'kursor03' || nama === 'kursor04')
      if (hasilPotong) this.kursorPotong.set(nama, hasilPotong)
    }
    const dasarPanah = KURSOR['kursor01']!
    const kursorKhusus: readonly [JenisKursor, Aset, string][] = [
      ['kursorKayu', SUMBER.kayuDiam, '#6ff088'],
      ['kursorGold', SUMBER.goldDiam, '#ffd86b'],
      ['kursorDaging', SUMBER.dagingDiam, '#ff9eb5'],
      ['kursorBangun', BANGUNAN_FASE.houseKonstruksi, '#7fc4ff'],
    ]
    for (const [nama, ikonAset, warna] of kursorKhusus) {
      const hasilAksi = buatKursorAksi(dasarPanah, ikonAset, warna, 44)
      if (hasilAksi) this.kursorPotong.set(nama, hasilAksi)
    }
    const awalKursor = this.kursorPotong.get('kursor01')
    if (awalKursor) this.kursor.src = awalKursor

    this.fase = 'lobi'
    this.lobi.tampil(true)

    // Deteksi server LAN lokal vs GitHub Pages (otomatis Online P2P WebRTC tanpa server lokal):
    const params = new URLSearchParams(location.search)
    const paksaP2p = params.get('mode') === 'p2p'
    const kodeUrl = params.get('room')?.trim().toUpperCase() ?? ''

    let lanTersedia = false
    if (!paksaP2p) {
      try {
        const r = await fetch(`${BASIS}alamat`)
        const ct = r.headers.get('content-type') ?? ''
        if (r.ok && ct.includes('application/json')) {
          const j = (await r.json()) as { url?: string }
          this.lobi.setAlamat(j.url ?? window.location.origin)
          lanTersedia = true
        }
      } catch {
        lanTersedia = false
      }
    }

    if (lanTersedia) {
      this.modeKoneksi = 'lan'
      this.modeStatis = false
      this.pastikanLan(this.lobi.nama)
    } else if (p2pDidukungBrowser()) {
      this.modeKoneksi = 'p2p'
      this.modeStatis = false
      this.lobi.setModeOnlineP2p(`${location.origin}${location.pathname}`)
      this.pastikanLan(this.lobi.nama)
    } else {
      this.modeStatis = true
      this.lobi.setModeStatis()
    }
    if (kodeUrl && !this.modeStatis) {
      this.lobi.bukaDenganKodeRoom(kodeUrl)
    }
    requestAnimationFrame((t) => this.bingkai(t))
  }

  /** Memperbarui ikon potret unit, hero, bangunan & supply sesuai warna tim pemain. */
  private segarkanPotretTim(timAktif: Tim): void {
    if (!this.asetSiap) return
    const tint = (t: Tim): Tim => (t === 'red' || t === 'blue' || t === 'neutral' ? 'blue' : t)
    const unitSet = (t: Tim) => (t === 'red' ? UNIT_RED : UNIT_BLUE)
    const heroSet = (t: Tim) => (t === 'red' ? HERO_RED : HERO_BLUE)
    const bgSet = (t: Tim) => (t === 'red' ? BANGUNAN_RED : BANGUNAN_BLUE)

    this.hud.pasangPotret((peran) => {
      if (peran.startsWith('bg:')) {
        const [, jenis, overrideTim] = peran.split(':')
        const t = (overrideTim as Tim) || timAktif
        if ((t === 'purple' || t === 'yellow') && (jenis === 'castle' || jenis === 'house' || jenis === 'tower')) {
          return potongSprite(BANGUNAN_U010_WARNA[t][jenis], 0, 64, 'blue')
        }
        const a = bgSet(t)[jenis as keyof typeof BANGUNAN_BLUE]
        return a ? potongSprite(a, 0, 64, tint(t)) : null
      }
      if (peran.startsWith('hero:')) {
        const h = peran.slice(5) as keyof typeof HERO_BLUE
        const a = heroSet(timAktif)[h]?.potret
        return a ? potongSprite(a, 0, 64, tint(timAktif)) : null
      }
      switch (peran) {
        case 'pawn': return potongSprite(PAWN_FREE.idle, 0, 64, timAktif)
        case 'warrior':
        case 'archer': {
          if (timAktif === 'purple' || timAktif === 'yellow') {
            const a = UNIT_U010_WARNA[timAktif][peran]
            return potongSprite(a, BARIS.idle * a.kolom, 64, 'blue')
          }
          const a = unitSet(timAktif)[peran]
          return potongSprite(a, BARIS.idle * a.kolom, 64, tint(timAktif))
        }
        case 'lancer': return potongSprite(unitSet(timAktif).lancerIdle, 0, 64, tint(timAktif))
        case 'monk': return potongSprite(unitSet(timAktif).monkIdle, 0, 64, tint(timAktif))
        case 'mage': return potongSprite(unitSet(timAktif).mageIdle, 0, 64, tint(timAktif))
        case 'pohon': return potongSprite(SUMBER.pohon, 0, 64)
        case 'tunggul': return potongSprite(SUMBER.pohon, 8, 64)
        case 'tambang': return potongSprite(SUMBER.tambangAktif, 0, 64)
        case 'domba': return potongSprite(SUMBER.dombaDiam, 0, 64)
        case 'daging': return potongSprite(SUMBER.dagingDiam, 0, 64)
        default: return null
      }
    })

    const houseAset = (timAktif === 'purple' || timAktif === 'yellow')
      ? BANGUNAN_U010_WARNA[timAktif].house
      : bgSet(timAktif).house
    const houseTint = (timAktif === 'purple' || timAktif === 'yellow') ? 'blue' : tint(timAktif)
    this.hud.pasangIkonSumber((kunci) => {
      switch (kunci) {
        case 'gold': return potongSprite(SUMBER.goldDiam, 0, 48)
        case 'kayu': return potongSprite(SUMBER.kayuDiam, 0, 48)
        case 'daging': return potongSprite(SUMBER.dagingDiam, 0, 48)
        case 'supply': return potongSprite(houseAset, 0, 48, houseTint)
      }
    })
  }

  /** Membuka koneksi multiplayer (Server LAN lokal atau Online P2P WebRTC) sekali saja, lalu dipakai ulang. */
  private pastikanLan(nama: string): void {
    if (this.lan) return
    const pendengar: PendengarLan = {
      daftar: (room: RingkasRoom[]) => this.lobi.setDaftarRoom(room),
      room: (kode, peran, tim, ringkas) => {
        this.peranLanRoom = peran
        this.lobi.terimaRoomLan(kode, peran, tim, ringkas)
      },
      mulai: (seed, tim, heroBlue, heroRed, info) => {
        this.mulaiLan(seed, tim, heroBlue, heroRed, info)
      },
      cmd: (tim, cmd) => {
        if (this.peran === 'host' && this.dunia) terapkanPerintah(this.dunia, tim, cmd as Perintah)
      },
      snapshot: (state) => {
        if (this.peran !== 'tamu' || !this.dunia) return
        const lama = new Map(this.dunia.unit.map((u) => [u.id, u]))
        terapkanSnapshot(this.dunia, state as Snapshot, lama, this.timSaya)
        if (this.dunia.kejadian.length > 0) {
          this.efek.serap(this.dunia.kejadian, this.timSaya)
          this.dunia.kejadian.length = 0
        }
        hitungFog(this.dunia)
        this.fog?.kotor()
        this.minimap?.segarkanFog()
      },
      lawanPutus: (detik) => this.tampilkanPutus(detik),
      lawanKembali: () => this.sembunyikanPutus(),
      lawanMenyerah: () => {
        this.sembunyikanPutus()
        if (this.dunia) this.dunia.hasil = { jenis: 'menang', tim: this.timSaya }
      },
      roomKeluar: (pesan) => {
        this.peranLanRoom = null
        this.lobi.keluarDariRoom(pesan)
        this.hud.tampilkanToast(pesan, true)
      },
      galat: (pesan) => {
        this.lobi.tampilkanGalatLan(pesan)
        this.hud.tampilkanToast(pesan, true)
      },
      tersambung: () => {
        this.lobi.setStatusKoneksi(true)
      },
      terputus: () => {
        this.lobi.setStatusKoneksi(false)
        if (this.modeKoneksi === 'p2p') return
        this.hud.tampilkanToast('Koneksi LAN terputus — mencoba menyambung lagi…')
        window.setTimeout(() => {
          this.lan = null
          this.pastikanLan(this.lobi.nama)
          window.setTimeout(() => this.lan?.sambungUlang(), 400)
        }, 1200)
      },
    }

    if (this.modeKoneksi === 'p2p') {
      this.lan = new KlienP2p(pendengar)
    } else {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      this.lan = new KlienLan(`${proto}://${location.host}/ws`, pendengar)
    }
    this.lan.sambung(nama)
  }

  private tampilkanPutus(detik: number): void {
    this.sembunyikanPutus()
    const el = document.createElement('div')
    el.className = 'hamparan'
    el.innerHTML = `<div class="kotak"><h1>Lawan terputus</h1>` +
      `<p>Menunggu lawan tersambung lagi… <strong id="hitung">${detik}</strong> detik</p>` +
      `<p>Simulasi dihentikan sementara di kedua sisi.</p></div>`
    this.hud.akar.querySelector('#panggung')!.append(el)
    this.overlayPutus = el
    let sisa = detik
    const timer = window.setInterval(() => {
      sisa--
      const h = el.querySelector('#hitung')
      if (h) h.textContent = String(Math.max(0, sisa))
      if (sisa <= 0 || !this.overlayPutus) window.clearInterval(timer)
    }, 1000)
  }

  private sembunyikanPutus(): void {
    this.overlayPutus?.remove()
    this.overlayPutus = null
  }

  private mulaiLan(seed: number, tim: TimPemain, heroBlue: string, heroRed: string, info?: MulaiLanInfo): void {
    this.timSaya = tim
    this.peran = this.peranLanRoom === 'host' ? 'host' : 'tamu'
    const peta = info?.peta ?? 'klasik2'
    const goldAwal = info?.goldAwal ?? GOLD_AWAL_BAKU
    const slotAktif = info?.slot && info.slot.length > 0
      ? info.slot.map((s) => ({
        indeks: s.indeks,
        tim: s.tim,
        jenis: s.terisi ? s.jenis : 'kosong' as const,
        aliansi: s.aliansi,
        hero: s.hero,
        kesulitanAi: s.kesulitanAi,
        nama: s.nama,
      }))
      : buatSlotDefault('klasik2')

    this.dunia = buatDunia({
      seed,
      peta,
      goldAwal,
      heroBlue: heroBlue as PeranHeroAset,
      heroRed: heroRed as PeranHeroAset,
      ...(info?.slot && info.slot.length > 0 ? { slot: slotAktif } : {}),
    })

    if (this.peran === 'host') {
      this.daftarAi = slotAktif
        .filter((s) => s.jenis === 'ai')
        .map((s) => buatAi(s.tim, s.kesulitanAi, seed))
      this.tamuAktif = slotAktif
        .filter((s) => s.jenis === 'manusia' && s.tim !== tim)
        .map((s) => s.tim)
    } else {
      this.daftarAi = []
      this.tamuAktif = []
    }

    this.transport = null
    this.terrainRender = new PeremajaTerrain(this.dunia.terrain)
    this.minimap = new Minimap(this.dunia)
    this.fog = new LapisanFog(this.dunia.terrain.kolom, this.dunia.terrain.baris)
    this.input = buatInput()
    this.hud.setTim(tim)
    this.segarkanPotretTim(tim)
    fokusKeCastle(this.dunia, tim, this.kam)
    hitungFog(this.dunia)
    this.lobi.tampil(false)
    this.kursor.style.display = this.perangkatSentuh ? 'none' : 'block'
    this.fase = 'main'
    this.posLama.clear()
    this.sorotSumber = null
    this.akumulatorHud = 1
    this.akumulatorMinimap = 1
    this.hud.setModeSentuh(this.sentuh.mode, this.perangkatSentuh)
    this.perbaruiHud()
  }

  private mulaiSkirmish(konfigMasuk: KonfigMatch): void {
    const konfig: KonfigMatch = {
      peta: konfigMasuk.peta,
      goldAwal: konfigMasuk.goldAwal,
      slot: konfigMasuk.slot.map((s) => ({ ...s })),
    }
    this.konfigTerakhir = konfig
    this.peran = 'solo'
    const slotManusia = konfig.slot.find((s) => s.jenis === 'manusia') ?? konfig.slot[0]!
    this.timSaya = slotManusia.tim
    const seed = Math.floor(Math.random() * 1_000_000)

    this.dunia = buatDunia({
      seed,
      peta: konfig.peta,
      goldAwal: konfig.goldAwal,
      slot: konfig.slot,
    })
    this.daftarAi = konfig.slot
      .filter((s) => s.jenis === 'ai')
      .map((s) => buatAi(s.tim, s.kesulitanAi, seed))
    this.tamuAktif = []
    this.transport = new TransportLokal<Perintah, never>(this.timSaya)
    this.terrainRender = new PeremajaTerrain(this.dunia.terrain)
    this.minimap = new Minimap(this.dunia)
    this.fog = new LapisanFog(this.dunia.terrain.kolom, this.dunia.terrain.baris)
    this.input = buatInput()
    this.hud.setTim(this.timSaya)
    this.segarkanPotretTim(this.timSaya)
    fokusKeCastle(this.dunia, this.timSaya, this.kam)
    this.lobi.tampil(false)
    this.kursor.style.display = this.perangkatSentuh ? 'none' : 'block'
    this.fase = 'main'
    this.posLama.clear()
    this.sorotSumber = null
    this.akumulatorHud = 1
    this.akumulatorMinimap = 1
    this.hud.setModeSentuh(this.sentuh.mode, this.perangkatSentuh)
    this.perbaruiHud()
  }

  private terapkanModeSentuh(mode: ModeSentuh): void {
    this.sentuh.setMode(mode)
    this.lobi.setModeSentuh(mode)
    this.hud.setModeSentuh(mode, this.perangkatSentuh)
    this.hud.tampilkanToast(mode === 'joystick' ? 'Mode 3: Virtual Joystick + Seret Seleksi' : 'Mode 1: Tap Pintar')
  }

  private async mintaLayarPenuh(): Promise<void> {
    try {
      const target = document.documentElement
      if (!document.fullscreenElement) {
        await target.requestFullscreen?.()
      }
      const orient = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
      await orient?.lock?.('landscape')
    } catch {
      // Browser iOS Safari / desktop tertentu tidak mendukung orientation.lock.
    }
    this.ukurUlang()
  }

  /**
   * Semua perintah pemain lewat sini. Guest MENGIRIM ke host dan tidak
   * menerapkannya sendiri — host yang authoritative (PRD §7).
   */
  private kirim(p: Perintah): void {
    if (!this.dunia || this.fase !== 'main') return
    if (this.peran === 'tamu') {
      this.lan?.kirimCmd(p)
      return
    }
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

  /** Menghitung selisih resource yang kurang agar notif jelas (mis. "35 Gold & 10 Daging"). */
  private teksKurang(gold: number, kayu: number, daging: number): string | null {
    if (!this.dunia) return null
    const s = this.dunia.tim[this.timSaya].sumberDaya
    const bagian: string[] = []
    if (s.gold < gold) bagian.push(`${Math.ceil(gold - s.gold)} Gold`)
    if (s.kayu < kayu) bagian.push(`${Math.ceil(kayu - s.kayu)} Kayu`)
    if (s.daging < daging) bagian.push(`${Math.ceil(daging - s.daging)} Daging`)
    return bagian.length > 0 ? bagian.join(' & ') : null
  }

  /** Total populasi aktif + unit yang sedang antre dilatih. */
  private populasiDenganAntrean(): number {
    if (!this.dunia) return 0
    let total = supplyTerpakai(this.dunia, this.timSaya)
    for (const b of this.dunia.bangunan) {
      if (b.tim !== this.timSaya || b.fase !== 'aktif') continue
      for (const a of b.antrean) total += UNIT[a.peran].pop
    }
    return total
  }

  private pilihFilter(filter: FilterUnit): void {
    if (!this.dunia) return
    const cocok = this.dunia.unit.filter((u) => {
      if (u.tim !== this.timSaya) return false
      if (filter === 'semua') return u.peran !== 'pawn'
      if (filter === 'hero') return u.hero
      return !u.hero && u.peran === filter
    })
    this.input.unitTerpilih = new Set(cocok.map((u) => u.id))
    this.input.bangunanTerpilih = null
    this.input.sumberTerpilih = null
    this.perbaruiHud()
  }

  private jalankanPerintahKartu(cmd: PerintahKartu): void {
    const ids = [...this.input.unitTerpilih]
    if (ids.length === 0) return
    if (cmd === 'serang') {
      this.input.modeSerang = true
      this.hud.tampilkanToast('Mode Serang [A]: klik kanan target atau tanah')
      this.perbaruiHud()
      return
    }
    this.input.modeSerang = false
    if (cmd === 'stop') this.kirim({ jenis: 'stop', ids })
    else if (cmd === 'tahan') this.kirim({ jenis: 'tahan', ids })
    else if (cmd === 'skill') this.kirim({ jenis: 'skill', ids })
    this.perbaruiHud()
  }

  /** Kursor berganti sesuai konteks — khusus Pawn menampilkan ikon resource (Kayu/Gold/Daging/Bangun). */
  private perbaruiKursor(): void {
    if (!this.dunia || this.fase !== 'main') return
    const nama = pilihKursorKonteks(this.dunia, this.timSaya, this.input, this.unitTerpilih())
    this.kursorAktif = nama
    const baru = this.kursorPotong.get(nama) ?? this.kursorPotong.get('kursor01') ?? urlAset(KURSOR['kursor01']!, BASIS)
    if (this.kursor.getAttribute('src') !== baru) this.kursor.src = baru
  }

  /**
   * Resolusi stage tetap 1280x720 (kanvas 976x720 + sidebar 304x720) yang
   * diskalakan otomatis mengikuti jendela browser — nol scrollbar di layar mana pun.
   */
  private ukurUlang(): void {
    const rect = this.hud.bingkai.getBoundingClientRect()
    const vw = rect.width > 0 ? rect.width : (window.visualViewport?.width ?? window.innerWidth)
    const vh = rect.height > 0 ? rect.height : (window.visualViewport?.height ?? window.innerHeight)
    const skala = Math.max(0.15, Math.min(vw / 1280, vh / 720))
    // #akar diposisikan absolute di (50%, 50%), jadi translate(-50%, -50%) wajib
    // sebelum scale() agar selalu tepat di tengah viewport meski layar HP < 1280x720.
    this.hud.akar.style.transform = `translate(-50%, -50%) scale(${skala})`
    const k = this.hud.kanvas
    k.width = 976
    k.height = 720
    this.kam.lebar = 976
    this.kam.tinggi = 720
    batasiKamera(this.kam)
    if (this.ctx) this.ctx.imageSmoothingEnabled = false

    // Tampilkan anjuran putar HP ke Landscape saat layar mobile dalam orientasi portrait.
    const portraitMobile = vh > vw && vw < 900 && this.perangkatSentuh
    if (!portraitMobile) this.abaikanPutar = false
    this.hud.setLayarPutar(portraitMobile && !this.abaikanPutar)
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private pasangInput(): void {
    const k = this.hud.kanvas

    k.addEventListener('contextmenu', (e) => e.preventDefault())

    // Kursor meninggalkan kanvas: hentikan gulir tepi, sembunyikan kursor.
    k.addEventListener('mouseleave', () => {
      this.input.mousePernahMasuk = false
      this.kursor.style.display = 'none'
    })
    k.addEventListener('mouseenter', () => {
      if (this.fase === 'main' && !this.perangkatSentuh) this.kursor.style.display = 'block'
    })

    k.addEventListener('mousemove', (e) => {
      const r = k.getBoundingClientRect()
      const sx = (e.clientX - r.left) * (k.width / Math.max(1, r.width))
      const sy = (e.clientY - r.top) * (k.height / Math.max(1, r.height))
      if (this.geserTengah.aktif) {
        const dx = sx - this.geserTengah.x
        const dy = sy - this.geserTengah.y
        this.geserTengah.x = sx
        this.geserTengah.y = sy
        this.kam.x -= dx / this.kam.zoom
        this.kam.y -= dy / this.kam.zoom
        batasiKamera(this.kam)
      }
      this.input.mouse.sx = sx
      this.input.mouse.sy = sy
      this.input.mousePernahMasuk = true
      perbaruiMouseDunia(this.input, this.kam)
      this.input.sumberHover = this.dunia && this.fase === 'main'
        ? sumberDiTitik(this.dunia, this.input.mouse.wx, this.input.mouse.wy)
        : null
      this.perbaruiKursor()
      const tengahKursor = this.kursorAktif === 'kursor03' || this.kursorAktif === 'kursor04'
      const geser = tengahKursor ? 21 : 3
      this.kursor.style.left = `${sx - geser}px`
      this.kursor.style.top = `${sy - geser}px`
      if (this.input.seret.aktif) {
        this.input.seret.x2 = this.input.mouse.wx
        this.input.seret.y2 = this.input.mouse.wy
      }
    })

    k.addEventListener('mousedown', (e) => {
      if (this.fase !== 'main' || !this.dunia) return
      const r = k.getBoundingClientRect()
      this.input.mouse.sx = (e.clientX - r.left) * (k.width / Math.max(1, r.width))
      this.input.mouse.sy = (e.clientY - r.top) * (k.height / Math.max(1, r.height))
      perbaruiMouseDunia(this.input, this.kam)
      const { wx, wy } = this.input.mouse

      if (e.button === 1) {
        e.preventDefault()
        this.geserTengah = { aktif: true, x: this.input.mouse.sx, y: this.input.mouse.sy }
        return
      }

      if (e.button === 0) {
        if (this.input.hantuBangun) {
          const jenis = this.input.hantuBangun as keyof typeof BANGUNAN
          if (!bolehTaruh(this.dunia, jenis, wx, wy)) {
            this.hud.tampilkanToast('Tidak bisa dibangun di sini', true)
            return
          }
          const pilih = pilihPawnBangun(this.dunia, this.timSaya, wx, wy, this.input.unitTerpilih)
          if (!pilih.adaPawn) {
            this.hud.tampilkanToast('Tidak ada Pawn', true)
            return
          }
          this.kirim({
            jenis: 'bangun',
            ids: pilih.pawn ? [pilih.pawn.id] : [],
            bangunan: jenis,
            x: wx,
            y: wy,
          })
          if (pilih.semuaSibuk) {
            this.hud.tampilkanToast('Pondasi ditaruh — Pawn pertama yang selesai akan otomatis melanjutkannya')
          }
          this.input.hantuBangun = null
          return
        }
        if (this.input.modeSerang && this.input.unitTerpilih.size > 0) {
          const ids = [...this.input.unitTerpilih]
          this.kirim({ jenis: 'serangPindah', ids, x: wx, y: wy })
          this.efek.tandaiPerintah(wx, wy, 'serang')
          this.input.modeSerang = false
          this.perbaruiHud()
          return
        }
        this.input.seret = { aktif: true, x1: wx, y1: wy, x2: wx, y2: wy }
        return
      }

      if (e.button === 2) {
        const ids = [...this.input.unitTerpilih]
        if (ids.length > 0) {
          const p = perintahKlikKanan(this.dunia, this.timSaya, ids, wx, wy, this.input.modeSerang)
          if (p) {
            this.kirim(p)
            if (p.jenis === 'kumpul') {
              this.sorotSumber = { id: p.targetId, sisa: 1.5, durasi: 1.5 }
            }
            const jenisFlag = p.jenis === 'serang' || p.jenis === 'serangPindah' ? 'serang' : 'pindah'
            this.efek.tandaiPerintah(wx, wy, jenisFlag)
          }
        } else {
          const b = this.bangunanTerpilih()
          if (
            b && b.tim === this.timSaya && b.fase === 'aktif' &&
            (BANGUNAN[b.jenis].melatih.length > 0 || b.jenis === 'altar')
          ) {
            this.kirim({ jenis: 'rally', bangunanId: b.id, x: wx, y: wy })
            this.efek.tandaiPerintah(wx, wy, 'rally')
            this.hud.tampilkanToast(`Bendera Rally Point ${BANGUNAN[b.jenis].nama} dipindahkan`)
          }
        }
        this.input.modeSerang = false
        this.input.hantuBangun = null
      }
    })

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.geserTengah.aktif = false
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
        this.input.sumberTerpilih = null
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
        this.input.sumberTerpilih = null
        this.perbaruiHud()
        return
      }

      const b = bangunanDiTitik(this.dunia, wx, wy)
      if (b && b.tim === this.timSaya) {
        this.input.unitTerpilih.clear()
        this.input.bangunanTerpilih = b.id
        this.input.sumberTerpilih = null
        this.perbaruiHud()
        return
      }

      const s = sumberDiTitik(this.dunia, wx, wy)
      this.input.unitTerpilih.clear()
      this.input.bangunanTerpilih = null
      this.input.sumberTerpilih = s
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
        if (ids.length > 0) {
          this.kirim({ jenis: 'serangPindah', ids, x: wx, y: wy })
          this.efek.tandaiPerintah(wx, wy, 'serang')
        } else {
          const b = this.bangunanTerpilih()
          if (b && b.tim === this.timSaya && b.fase === 'aktif' && (BANGUNAN[b.jenis].melatih.length > 0 || b.jenis === 'altar')) {
            this.kirim({ jenis: 'rally', bangunanId: b.id, x: wx, y: wy })
            this.efek.tandaiPerintah(wx, wy, 'rally')
          }
        }
      }
    })
    this.hud.petaMini.addEventListener('contextmenu', (e) => e.preventDefault())

    window.addEventListener('keydown', (e) => {
      this.tombol.add(e.code)
      if (this.fase !== 'main' || !this.dunia) return
      const ids = [...this.input.unitTerpilih]

      if (e.code === 'KeyA' && !e.repeat && ids.length > 0) {
        this.input.modeSerang = true
        this.perbaruiHud()
        return
      }
      if (e.code === 'Escape') {
        if (this.input.hantuBangun || this.input.modeSerang) {
          this.input.hantuBangun = null
          this.input.modeSerang = false
          this.perbaruiHud()
          return
        }
        this.bukaMenuJeda()
        return
      }
      if (e.code === 'KeyQ' && ids.length > 0) { this.kirim({ jenis: 'skill', ids }); return }
      if (e.code === 'KeyS' && !e.ctrlKey && ids.length > 0) {
        this.input.modeSerang = false
        this.kirim({ jenis: 'stop', ids })
        return
      }
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

  /** Menyimpan posisi unit & domba tepat sebelum tick sim untuk interpolasi 60/90/120Hz mulus. */
  private rekamPosisiLama(): void {
    const d = this.dunia
    if (!d) return
    if (d.tick % 180 === 0) this.posLama.clear()
    for (let i = 0; i < d.unit.length; i++) {
      const u = d.unit[i]!
      const ada = this.posLama.get(u.id)
      if (ada) { ada.x = u.x; ada.y = u.y }
      else this.posLama.set(u.id, { x: u.x, y: u.y })
    }
    for (let i = 0; i < d.domba.length; i++) {
      const mbek = d.domba[i]!
      const ada = this.posLama.get(mbek.id)
      if (ada) { ada.x = mbek.x; ada.y = mbek.y }
      else this.posLama.set(mbek.id, { x: mbek.x, y: mbek.y })
    }
  }

  private bingkai(t: number): void {
    let dt = Math.min(0.1, (t - this.waktuTerakhir) / 1000 || 0)
    this.waktuTerakhir = t
    // Ukur FPS aktual per detik untuk diagnostik di pita status.
    this.fpsHitung++
    if (this.fpsWaktu === 0) this.fpsWaktu = t
    else if (t - this.fpsWaktu >= 1000) {
      this.fpsTampil = Math.round((this.fpsHitung * 1000) / (t - this.fpsWaktu))
      this.fpsHitung = 0
      this.fpsWaktu = t
    }
    // Redam jitter kecil rAF di layar 60Hz (mis. 16.4ms -> 16.67ms) agar tidak selang-seling 0/2 tick.
    if (Math.abs(dt - DT_TETAP) < 0.0015) dt = DT_TETAP

    let pakaiInterpolasi = false
    if (this.fase === 'main' && this.dunia) {
      gulirKamera(this.kam, this.tombol, this.input, dt)
      this.sentuh.langkahJoystick(dt)
      batasiKamera(this.kam)

      // Guest TIDAK menjalankan simulasi: ia menggambar snapshot dari host.
      // Simulasi juga berhenti selama lawan terputus (PRD §15.2).
      const jedaSolo = this.peran === 'solo' && this.menuJeda !== null
      const bolehJalan = this.peran !== 'tamu' && this.overlayPutus === null && !jedaSolo

      if (bolehJalan) {
        pakaiInterpolasi = true
        // Langkah tetap: simulasi TIDAK boleh bergantung pada fps.
        // Batas 4 langkah/frame mencegah spiral lag di CPU HP saat ada lonjakan frame.
        this.akumulator += dt
        let langkah = 0
        while (this.akumulator >= DT_TETAP && langkah < 4) {
          this.rekamPosisiLama()
          for (const ai of this.daftarAi) {
            if (this.dunia.hasil.jenis !== 'berlangsung') break
            for (const p of langkahAi(this.dunia, ai)) terapkanPerintah(this.dunia, ai.tim, p)
          }
          langkahBanyak(this.dunia, 1)
          this.efek.serap(this.dunia.kejadian, this.timSaya)
          this.akumulator -= DT_TETAP
          langkah++
        }
        if (langkah >= 4 && this.akumulator > DT_TETAP * 2) {
          this.akumulator = 0
        }

        // Host menyiarkan snapshot (~15 Hz LAN, ~12 Hz P2P), disaring fog masing-masing pemain tamu.
        if (this.peran === 'host') {
          this.akumulatorSiar += dt
          const selang = this.modeKoneksi === 'p2p' ? 1 / 12 : 1 / 15
          if (this.akumulatorSiar >= selang) {
            this.akumulatorSiar = 0
            for (const timTamu of this.tamuAktif) {
              this.lan?.kirimSnapshot(buatSnapshot(this.dunia, timTamu), timTamu)
            }
          }
        }
      }
      if (this.dunia.hasil.jenis !== 'berlangsung') this.selesaikan()
    }

    this.efek.langkah(dt)
    if (this.sorotSumber) {
      this.sorotSumber.sisa -= dt
      if (this.sorotSumber.sisa <= 0) this.sorotSumber = null
    }
    this.hud.langkahToast(dt)
    this.akumulatorMinimap += dt
    const alpha = pakaiInterpolasi ? Math.max(0, Math.min(1, this.akumulator / DT_TETAP)) : 1
    this.gambar(alpha)
    if (this.fase === 'main') {
      this.akumulatorHud += dt
      if (this.akumulatorHud >= 0.1) {
        this.akumulatorHud = 0
        this.perbaruiHudRingan()
      }
    }
    requestAnimationFrame((n) => this.bingkai(n))
  }

  private gambar(alpha = 1): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (!this.dunia || this.fase === 'muat' || this.fase === 'lobi') {
      ctx.fillStyle = '#1d2a33'
      ctx.fillRect(0, 0, this.hud.kanvas.width, this.hud.kanvas.height)
      return
    }

    ctx.imageSmoothingEnabled = false
    const getar = this.efek.geser(1 / 60)
    ctx.save()
    ctx.translate(getar.x, getar.y)
    ctx.scale(this.kam.zoom, this.kam.zoom)
    ctx.translate(-this.kam.x, -this.kam.y)

    this.terrainRender?.gambar(ctx, this.kam, performance.now() / 1000)
    gambarEntitas(ctx, this.dunia, this.kam, {
      terpilihUnit: this.input.unitTerpilih,
      terpilihBangunan: this.input.bangunanTerpilih,
      terpilihSumber: this.input.sumberTerpilih,
      hoverSumber: this.input.sumberHover,
      sumberSorot: this.sorotSumber
        ? { id: this.sorotSumber.id, porsi: 1 - Math.max(0, this.sorotSumber.sisa) / this.sorotSumber.durasi }
        : null,
      timSaya: this.timSaya,
      fog: true,
      posLama: this.posLama,
      alpha,
    })

    this.efek.gambar(ctx)

    // Fog digambar DI ATAS entitas supaya unit di tepi pandangan ikut meredup.
    this.fog?.gambar(ctx, this.dunia, this.timSaya, this.kam)

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

    if (this.akumulatorMinimap >= 0.066) {
      this.akumulatorMinimap = 0
      if (this.mctx && this.minimap) {
        this.minimap.gambar(
          this.mctx, this.kam, this.hud.petaMini.width, this.hud.petaMini.height,
          this.timSaya, this.fog?.kanvas,
        )
      }
    }
  }

  private perbaruiHudRingan(): void {
    if (!this.dunia) return
    const unit = this.unitTerpilih()
    const bg = this.bangunanTerpilih()
    const labelJaringan = this.modeKoneksi === 'p2p' ? 'ONLINE' : 'LAN'
    this.hud.perbaruiPita(
      this.dunia, this.timSaya,
      this.peran === 'solo' ? 'SOLO vs AI' : this.peran === 'host' ? `${labelJaringan} (HOST)` : `${labelJaringan} (GUEST)`,
      this.fpsTampil,
    )
    this.hud.perbaruiSumberDaya(this.dunia, this.timSaya)
    this.hud.perbaruiTabUnit(this.dunia, this.timSaya, unit)
    this.hud.perbaruiSeleksi(
      this.dunia, this.timSaya, unit, bg, this.input.modeSerang, this.input.sumberTerpilih,
    )
    this.hud.perbaruiKisi(this.dunia, this.timSaya, bg)
  }

  private perbaruiHud(): void {
    this.akumulatorHud = 0
    this.perbaruiHudRingan()
  }

  /**
   * Menu jeda (PRD §14). Di solo simulasi berhenti; di LAN TIDAK — pause
   * otoritatif di LAN butuh protokol kesepakatan dua arah dan penanganan
   * pause-spam, yang di luar ruang lingkup Revisi 2.0.
   */
  private bukaMenuJeda(): void {
    if (this.fase !== 'main' || this.menuJeda) return
    const lan = this.peran !== 'solo'
    const menu = buatMenuJeda({
      lan,
      suaraNyala: this.suaraNyala,
      modeSentuh: this.sentuh.mode,
      aksi: {
        lanjutkan: () => this.tutupMenuJeda(),
        suara: () => {
          this.suaraNyala = !this.suaraNyala
          this.tutupMenuJeda()
          this.hud.tampilkanToast(this.suaraNyala ? 'Suara dinyalakan' : 'Suara dimatikan')
        },
        ubahModeSentuh: (m) => this.terapkanModeSentuh(m),
        layarPenuh: () => void this.mintaLayarPenuh(),
        menyerah: () => this.konfirmasiMenyerah(),
        keluar: () => this.konfirmasiKeluar(),
      },
    })
    this.hud.akar.querySelector('#panggung')!.append(menu)
    this.menuJeda = menu
  }

  private tutupMenuJeda(): void {
    this.menuJeda?.remove()
    this.menuJeda = null
  }

  private konfirmasiMenyerah(): void {
    const d = buatKonfirmasi({
      judul: 'Yakin menyerah?',
      pesan: 'Pertandingan berakhir dan lawan menang. Tidak bisa dibatalkan.',
      ya: 'Ya, menyerah',
      onYa: () => {
        d.remove()
        this.tutupMenuJeda()
        this.kirim({ jenis: 'menyerah' })
        // Solo: perintah diterapkan lokal. Guest: diteruskan ke host.
      },
      onTidak: () => d.remove(),
    })
    this.hud.akar.querySelector('#panggung')!.append(d)
  }

  private konfirmasiKeluar(): void {
    const d = buatKonfirmasi({
      judul: 'Keluar ke Lobby?',
      pesan: 'Pertandingan ini ditinggalkan.',
      ya: 'Ya, keluar',
      onYa: () => {
        d.remove()
        this.tutupMenuJeda()
        this.kembaliKeLobby()
      },
      onTidak: () => d.remove(),
    })
    this.hud.akar.querySelector('#panggung')!.append(d)
  }

  private kembaliKeLobby(): void {
    const bekasLan = this.peran !== 'solo'
    this.lan?.keluar()
    this.dunia = null
    this.daftarAi = []
    this.tamuAktif = []
    this.peranLanRoom = null
    this.peran = 'solo'
    this.fase = 'lobi'
    this.kursor.style.display = 'none'
    this.sembunyikanPutus()
    this.tutupMenuJeda()
    this.lobi.tampil(true)
    if (bekasLan && !this.modeStatis) {
      this.lobi.keluarDariRoom()
    } else {
      this.lobi.bukaLayar('pilih')
    }
  }

  private selesaikan(): void {
    if (this.fase === 'selesai' || !this.dunia) return
    this.fase = 'selesai'
    this.tutupMenuJeda()
    this.sembunyikanPutus()

    const h = this.dunia.hasil
    const menang = timMenang(this.dunia, this.timSaya)
    const pemenangLabel = h.jenis === 'menang' ? ` (${WARNA_TIM[h.tim].kerajaan})` : ''
    const judul = h.jenis === 'draw' ? 'SERI' : menang ? `KEMENANGAN KERAJAAN!${pemenangLabel}` : `KEKALAHAN${pemenangLabel}`
    const hero = this.dunia.tim[this.timSaya]
    const s = hero.statistik
    const menit = Math.floor(this.dunia.tick / 3600)
    const detikSisa = Math.floor((this.dunia.tick / 60) % 60)

    const kotak = document.createElement('div')
    kotak.className = 'hamparan'
    kotak.innerHTML =
      `<div class="kotak"><h1>${judul}</h1>` +
      `<p>Durasi: ${menit}m ${detikSisa}s</p>` +
      `<p>Musuh dikalahkan: ${s.bunuh} • Pasukan gugur: ${s.gugur}</p>` +
      `<p>Bangunan dibangun: ${s.bangunanDibangun} • hilang: ${s.bangunanHilang}</p>` +
      `<p>Camp goblin dibersihkan: ${s.campDibersihkan}</p>` +
      `<p>Level hero tertinggi: ${this.levelHeroTertinggi()}</p>` +
      `<p>Gold: ${Math.round(s.goldTerkumpul)} • Kayu: ${Math.round(s.kayuTerkumpul)} • Daging: ${Math.round(s.dagingTerkumpul)}</p>` +
      `<p>Sisa: ${Math.round(hero.sumberDaya.gold)}g • ${Math.round(hero.sumberDaya.kayu)}k • ${Math.round(hero.sumberDaya.daging)}d</p>` +
      `<div class="baris">` +
      `<button class="tombol-besar" id="kembali">Kembali ke Lobby</button>` +
      (this.peran === 'solo' ? `<button class="tombol-besar" id="ulang">Main Lagi</button>` : '') +
      `</div></div>`
    this.hud.akar.querySelector('#panggung')!.append(kotak)

    kotak.querySelector('#kembali')!.addEventListener('click', () => {
      kotak.remove()
      this.kembaliKeLobby()
    })
    kotak.querySelector('#ulang')?.addEventListener('click', () => {
      kotak.remove()
      this.mulaiSkirmish(this.konfigTerakhir)
    })
  }

  /** Level hero tertinggi yang pernah dicapai, termasuk hero yang gugur. */
  private levelHeroTertinggi(): number {
    if (!this.dunia) return 1
    const k = this.dunia.tim[this.timSaya]
    const hidup = this.dunia.unit.find((u) => u.tim === this.timSaya && u.hero)
    return Math.max(hidup?.level ?? 1, k.heroGugur?.level ?? 1)
  }
}

new Permainan()
