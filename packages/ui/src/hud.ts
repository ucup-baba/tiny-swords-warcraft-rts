import { AVATAR, BANGUNAN_BLUE, HERO_BLUE, IKON, UNIT_BLUE } from '@hftf/aset'
import type { Tim } from '@hftf/shared'
import {
  BANGUNAN, UNIT, URUTAN_BANGUN, UNIT_HERO, UNIT_REGULER,
  supplyMaks, supplyTerpakai, type Bangunan, type Dunia, type Unit,
} from '@hftf/sim'
import { urlAset } from './sembilan.js'

export type Tab = 'bangun' | 'pasukan' | 'hero'

export interface AksiHud {
  pilihTab(t: Tab): void
  mulaiBangun(jenis: string): void
  latih(jenis: string): void
  bangkitkanHero(): void
}

/** Ikon untuk tiap jenis bangunan/unit. Dipisah supaya tidak tersebar di kode. */
const IKON_UNIT: Record<string, string> = {
  pawn: 'regular01', warrior: 'regular02', archer: 'regular03',
  lancer: 'regular04', monk: 'regular05', mage: 'regular06',
  berserker: 'regular07', king: 'regular08', knight: 'regular09', champion: 'regular10',
}
const IKON_SUMBER = { gold: 'regular03', kayu: 'regular02', daging: 'regular04', supply: 'regular06' } as const

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

export class Hud {
  readonly akar: HTMLElement
  readonly kanvas: HTMLCanvasElement
  readonly petaMini: HTMLCanvasElement
  private pita: HTMLElement
  private sumberEl: Record<string, HTMLElement> = {}
  private kisi: HTMLElement
  private tabEl: HTMLElement
  private seleksiJudul: HTMLElement
  private seleksiDetail: HTMLElement
  private seleksiDaftar: HTMLElement
  private seleksiPotret: HTMLImageElement
  private toast: HTMLElement
  private toastTimer = 0
  private tab: Tab = 'bangun'

  constructor(private basis: string, private aksi: AksiHud) {
    this.akar = el('div')
    this.akar.id = 'akar'

    const panggung = el('div')
    panggung.id = 'panggung'
    this.kanvas = el('canvas')
    this.kanvas.id = 'kanvas'
    panggung.append(this.kanvas)

    this.pita = el('div')
    this.pita.id = 'pita-status'
    panggung.append(this.pita)

    this.toast = el('div')
    this.toast.id = 'toast'
    panggung.append(this.toast)

    const seleksi = el('div')
    seleksi.id = 'seleksi'
    const potretKotak = el('div')
    potretKotak.id = 'seleksi-potret'
    this.seleksiPotret = el('img')
    potretKotak.append(this.seleksiPotret)
    const isi = el('div')
    isi.id = 'seleksi-isi'
    this.seleksiJudul = el('div')
    this.seleksiJudul.id = 'seleksi-judul'
    this.seleksiDetail = el('div')
    this.seleksiDetail.id = 'seleksi-detail'
    this.seleksiDaftar = el('div')
    this.seleksiDaftar.id = 'seleksi-daftar'
    isi.append(this.seleksiJudul, this.seleksiDetail, this.seleksiDaftar)
    seleksi.append(potretKotak, isi)
    panggung.append(seleksi)

    const sisi = el('aside')
    sisi.id = 'sisi'

    const miniBingkai = el('div')
    miniBingkai.id = 'peta-mini-bingkai'
    this.petaMini = el('canvas')
    this.petaMini.id = 'peta-mini'
    this.petaMini.width = 240
    this.petaMini.height = 212
    miniBingkai.append(this.petaMini)

    const sd = el('div')
    sd.id = 'sumber-daya'
    for (const [kunci, ikon] of Object.entries(IKON_SUMBER)) {
      const kotak = el('div', 'sumber')
      const im = el('img')
      im.src = urlAset(IKON[ikon]!, basis)
      const teks = el('span', undefined, '0')
      this.sumberEl[kunci] = teks
      kotak.append(im, teks)
      sd.append(kotak)
    }

    this.tabEl = el('div')
    this.tabEl.id = 'tab'
    for (const [kunci, label] of [['bangun', 'Bangun'], ['pasukan', 'Pasukan'], ['hero', 'Hero']] as const) {
      const b = el('button', 'tab-tombol', label)
      b.type = 'button'
      b.dataset['tab'] = kunci
      b.addEventListener('click', () => {
        this.tab = kunci
        this.aksi.pilihTab(kunci)
        this.perbaruiTab()
      })
      this.tabEl.append(b)
    }

    this.kisi = el('div')
    this.kisi.id = 'kisi-produksi'

    sisi.append(miniBingkai, sd, this.tabEl, this.kisi)
    this.akar.append(panggung, sisi)
    this.perbaruiTab()
  }

  tampilkanToast(pesan: string): void {
    this.toast.textContent = pesan
    this.toast.classList.add('tampil')
    this.toastTimer = 2.4
  }

  langkahToast(dt: number): void {
    if (this.toastTimer <= 0) return
    this.toastTimer -= dt
    if (this.toastTimer <= 0) this.toast.classList.remove('tampil')
  }

  private perbaruiTab(): void {
    for (const b of Array.from(this.tabEl.children) as HTMLElement[]) {
      b.setAttribute('aria-selected', String(b.dataset['tab'] === this.tab))
    }
  }

  setTim(tim: Tim): void {
    this.akar.classList.toggle('red', tim === 'red')
    this.pita.classList.toggle('red', tim === 'red')
  }

  perbaruiPita(dunia: Dunia, tim: Tim, mode: string): void {
    const detik = Math.floor(dunia.tick / 60)
    const mm = String(Math.floor(detik / 60)).padStart(2, '0')
    const ss = String(detik % 60).padStart(2, '0')
    const nama = tim === 'blue' ? 'BLUE KINGDOM' : 'RED EMPIRE'
    this.pita.textContent = ''
    for (const [i, bagian] of [nama, `${mm}:${ss}`, mode].entries()) {
      if (i > 0) this.pita.append(el('span', 'pisah', '•'))
      this.pita.append(el('span', undefined, bagian))
    }
  }

  perbaruiSumberDaya(dunia: Dunia, tim: Tim): void {
    const s = dunia.tim[tim].sumberDaya
    this.sumberEl['gold']!.textContent = String(Math.floor(s.gold))
    this.sumberEl['kayu']!.textContent = String(Math.floor(s.kayu))
    this.sumberEl['daging']!.textContent = String(Math.floor(s.daging))
    this.sumberEl['supply']!.textContent = `${supplyTerpakai(dunia, tim)}/${supplyMaks(dunia, tim)}`
  }

  /** Kartu produksi untuk tab yang sedang aktif. */
  perbaruiKisi(dunia: Dunia, tim: Tim, bangunanTerpilih: Bangunan | null): void {
    this.kisi.textContent = ''
    const s = dunia.tim[tim].sumberDaya

    if (this.tab === 'bangun') {
      for (const jenis of URUTAN_BANGUN) {
        const def = BANGUNAN[jenis]
        const mampu = s.gold >= def.gold && s.kayu >= def.kayu
        this.kisi.append(this.kartu({
          ikon: urlAset(BANGUNAN_BLUE[jenis]!, this.basis),
          nama: def.nama,
          biaya: `${def.gold}g ${def.kayu}k`,
          mati: !mampu,
          klik: () => this.aksi.mulaiBangun(jenis),
        }))
      }
      return
    }

    if (this.tab === 'pasukan') {
      for (const peran of UNIT_REGULER) {
        const def = UNIT[peran]
        const dari = bangunanTerpilih?.jenis === def.dariBangunan
        const mampu = s.gold >= def.gold && s.kayu >= def.kayu && s.daging >= def.daging
        this.kisi.append(this.kartu({
          ikon: urlAset(IKON[IKON_UNIT[peran]!]!, this.basis),
          nama: def.nama,
          biaya: `${def.gold}g ${def.daging}d`,
          mati: !mampu || !dari,
          klik: () => this.aksi.latih(peran),
        }))
      }
      return
    }

    // Tab hero: satu kartu "Bangkitkan" kalau hero sedang gugur (PRD §11.3).
    const k = dunia.tim[tim]
    if (k.heroGugur) {
      const biayaGold = 80 * k.heroGugur.level
      const punyaAltar = dunia.bangunan.some((b) => b.tim === tim && b.jenis === 'altar' && b.fase === 'aktif')
      this.kisi.append(this.kartu({
        ikon: urlAset(HERO_BLUE[k.heroGugur.peran].potret, this.basis),
        nama: punyaAltar ? 'Bangkitkan' : 'Perlu Altar',
        biaya: `${biayaGold}g 40d`,
        mati: !punyaAltar || s.gold < biayaGold || s.daging < 40,
        klik: () => this.aksi.bangkitkanHero(),
      }))
      const catatan = el('div', 'cip', punyaAltar
        ? `Hero Lv${k.heroGugur.level} menunggu di Altar`
        : 'Hero gugur. Bangun Altar of Heroes dulu!')
      catatan.style.gridColumn = '1 / -1'
      this.kisi.append(catatan)
      return
    }

    const hidup = dunia.unit.find((u) => u.tim === tim && u.hero)
    const info = el('div', 'cip', hidup
      ? `${UNIT[hidup.peran].nama} — Lv${hidup.level} (${hidup.xp} XP)`
      : 'Tidak ada hero')
    info.style.gridColumn = '1 / -1'
    this.kisi.append(info)
    void UNIT_HERO
  }

  private kartu(o: { ikon: string; nama: string; biaya: string; mati: boolean; klik: () => void }): HTMLElement {
    const b = el('button', 'kartu')
    b.type = 'button'
    b.disabled = o.mati
    const im = el('img')
    im.src = o.ikon
    b.append(im, el('span', 'nama', o.nama), el('span', 'biaya', o.biaya))
    b.addEventListener('click', o.klik)
    return b
  }

  perbaruiSeleksi(dunia: Dunia, unitTerpilih: Unit[], bangunanTerpilih: Bangunan | null): void {
    this.seleksiDaftar.textContent = ''

    if (bangunanTerpilih) {
      const def = BANGUNAN[bangunanTerpilih.jenis]
      this.seleksiPotret.src = urlAset(BANGUNAN_BLUE[bangunanTerpilih.jenis]!, this.basis)
      this.seleksiJudul.textContent = def.nama
      this.seleksiDetail.textContent =
        `HP ${Math.round(bangunanTerpilih.hp)}/${bangunanTerpilih.hpMaks}` +
        (bangunanTerpilih.fase === 'konstruksi' ? ` • membangun ${Math.ceil(bangunanTerpilih.sisaBangun)}s` : '')
      for (const a of bangunanTerpilih.antrean) {
        this.seleksiDaftar.append(el('span', 'cip', `${UNIT[a.peran].nama} ${Math.ceil(a.sisaDetik)}s`))
      }
      if (bangunanTerpilih.revive) {
        this.seleksiDaftar.append(el('span', 'cip', `Bangkit ${Math.ceil(bangunanTerpilih.revive.sisaDetik)}s`))
      }
      return
    }

    if (unitTerpilih.length === 0) {
      this.seleksiPotret.removeAttribute('src')
      this.seleksiJudul.textContent = '—'
      this.seleksiDetail.textContent = 'Klik unit, atau tarik kotak untuk memilih banyak'
      return
    }

    const utama = unitTerpilih.find((u) => u.hero) ?? unitTerpilih[0]!
    this.seleksiPotret.src = utama.hero
      ? urlAset(HERO_BLUE[utama.peran as keyof typeof HERO_BLUE].potret, this.basis)
      : urlAset(AVATAR['avatar01']!, this.basis)
    this.seleksiJudul.textContent = unitTerpilih.length > 1
      ? `${unitTerpilih.length} unit terpilih`
      : UNIT[utama.peran].nama
    this.seleksiDetail.textContent = utama.hero
      ? `HP ${Math.round(utama.hp)}/${utama.hpMaks} • Lv${utama.level} • ${utama.xp} XP` +
        (utama.skillJeda > 0 ? ` • skill ${Math.ceil(utama.skillJeda)}s` : ' • skill SIAP [Q]')
      : `HP ${Math.round(utama.hp)}/${utama.hpMaks} • DMG ${utama.dmg}`

    const per: Record<string, number> = {}
    for (const u of unitTerpilih) per[u.peran] = (per[u.peran] ?? 0) + 1
    for (const [peran, n] of Object.entries(per)) {
      this.seleksiDaftar.append(el('span', 'cip', `${UNIT[peran as keyof typeof UNIT].nama} ×${n}`))
    }
    void UNIT_BLUE
  }
}
