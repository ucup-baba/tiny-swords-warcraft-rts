export type ModeSentuh = 'tapPintar' | 'joystick'

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, kelas?: string, isi?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (kelas) e.className = kelas
  if (isi !== undefined) e.textContent = isi
  return e
}

export interface AksiMenu {
  lanjutkan(): void
  suara(): void
  menyerah(): void
  keluar(): void
  ubahModeSentuh?(mode: ModeSentuh): void
  layarPenuh?(): void
}

/**
 * Menu jeda (PRD §14) + pengaturan kontrol sentuh mobile (Mode 1 & Mode 3).
 *
 * Di LAN, simulasi TIDAK berhenti. Menu yang terlihat seperti pause padahal
 * dunia tetap jalan adalah jebakan, jadi labelnya wajib menyatakannya.
 */
export function buatMenuJeda(opsi: {
  lan: boolean
  suaraNyala: boolean
  modeSentuh?: ModeSentuh
  aksi: AksiMenu
}): HTMLElement {
  const hamparan = el('div', 'hamparan')
  const kotak = el('div', 'kotak')
  const modeAktif: ModeSentuh = opsi.modeSentuh ?? 'tapPintar'

  kotak.append(el('h1', undefined, 'Jeda'))
  if (opsi.lan) {
    const catatan = el('p', undefined, '⚠ Permainan tetap berjalan — ini LAN, dunia tidak berhenti.')
    catatan.style.color = '#8a2b10'
    kotak.append(catatan)
  } else {
    kotak.append(el('p', undefined, 'Simulasi dihentikan. Tekan Lanjutkan untuk kembali.'))
  }

  // Pilihan Mode Kontrol Sentuh (HP / Tablet)
  kotak.append(el('h2', undefined, 'Kontrol Sentuh (HP / Tablet)'))
  const barisMode = el('div', 'baris')
  const buatBtnMode = (mode: ModeSentuh, label: string, ket: string): HTMLButtonElement => {
    const b = el('button', 'tombol-besar', label)
    b.type = 'button'
    b.dataset['modeSentuh'] = mode
    b.title = ket
    if (modeAktif === mode) b.style.outline = '3px solid #ffd86b'
    b.addEventListener('click', () => {
      opsi.aksi.ubahModeSentuh?.(mode)
      for (const x of Array.from(barisMode.children) as HTMLElement[]) {
        x.style.outline = x.dataset['modeSentuh'] === mode ? '3px solid #ffd86b' : 'none'
      }
    })
    return b
  }
  barisMode.append(
    buatBtnMode('tapPintar', 'Mode 1: Tap Pintar', '1 jari geser kamera, tap = pilih/perintah, tahan/Kotak = drag pilih'),
    buatBtnMode('joystick', 'Mode 3: Joystick + Seret', 'Joystick geser kamera, seret 1 jari = kotak seleksi'),
  )
  kotak.append(barisMode)

  kotak.append(el('h2', undefined, 'Kontrol PC & Sentuh'))
  const daftar = el('div', 'baris')
  for (const [tombol, arti] of [
    ['Klik kiri / Tap', 'pilih unit'], ['Tarik / Kotak', 'pilih banyak'], ['Klik ganda', 'pilih setipe'],
    ['Klik kanan / Tap tujuan', 'gerak / serang / panen'], ['2 Jari', 'cubit zoom'],
    ['A', 'serang-gerak'], ['S', 'berhenti'], ['H', 'tahan posisi'], ['Q', 'skill hero'],
    ['F1', 'semua pekerja'], ['F2', 'semua pasukan'], ['Ctrl+1..4', 'simpan grup'],
    ['1..4', 'panggil grup'], ['Home', 'ke castle'], ['Esc / ☰', 'menu ini'],
  ] as const) {
    daftar.append(el('span', 'cip', `${tombol} — ${arti}`))
  }
  kotak.append(daftar)

  const aksi = el('div', 'baris')
  const tombolBaru = (teks: string, merah: boolean, klik: () => void): HTMLButtonElement => {
    const b = el('button', `tombol-besar${merah ? ' merah' : ''}`, teks)
    b.type = 'button'
    b.addEventListener('click', klik)
    return b
  }
  aksi.append(tombolBaru('Lanjutkan', false, opsi.aksi.lanjutkan))
  aksi.append(tombolBaru(opsi.suaraNyala ? 'Suara: ON' : 'Suara: OFF', false, opsi.aksi.suara))
  if (opsi.aksi.layarPenuh) {
    aksi.append(tombolBaru('⛶ Layar Penuh', false, opsi.aksi.layarPenuh))
  }
  aksi.append(tombolBaru('Menyerah', true, opsi.aksi.menyerah))
  aksi.append(tombolBaru('Keluar ke Lobby', true, opsi.aksi.keluar))
  kotak.append(aksi)

  hamparan.append(kotak)
  return hamparan
}

/** Dialog konfirmasi. Surrender TIDAK boleh satu klik (PRD §13.3). */
export function buatKonfirmasi(opsi: {
  judul: string
  pesan: string
  ya: string
  onYa(): void
  onTidak(): void
}): HTMLElement {
  const hamparan = el('div', 'hamparan')
  hamparan.style.zIndex = '50'
  const kotak = el('div', 'kotak')
  kotak.append(el('h1', undefined, opsi.judul), el('p', undefined, opsi.pesan))

  const baris = el('div', 'baris')
  const ya = el('button', 'tombol-besar merah', opsi.ya)
  ya.type = 'button'
  ya.addEventListener('click', opsi.onYa)
  const tidak = el('button', 'tombol-besar', 'Batal')
  tidak.type = 'button'
  tidak.addEventListener('click', opsi.onTidak)
  baris.append(tidak, ya)
  kotak.append(baris)
  hamparan.append(kotak)
  return hamparan
}
