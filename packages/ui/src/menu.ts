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
}

/**
 * Menu jeda (PRD §14).
 *
 * Di LAN, simulasi TIDAK berhenti. Menu yang terlihat seperti pause padahal
 * dunia tetap jalan adalah jebakan, jadi labelnya wajib menyatakannya.
 */
export function buatMenuJeda(opsi: {
  lan: boolean
  suaraNyala: boolean
  aksi: AksiMenu
}): HTMLElement {
  const hamparan = el('div', 'hamparan')
  const kotak = el('div', 'kotak')

  kotak.append(el('h1', undefined, 'Jeda'))
  if (opsi.lan) {
    const catatan = el('p', undefined, '⚠ Permainan tetap berjalan — ini LAN, dunia tidak berhenti.')
    catatan.style.color = '#ffd86b'
    kotak.append(catatan)
  } else {
    kotak.append(el('p', undefined, 'Simulasi dihentikan. Tekan Lanjutkan untuk kembali.'))
  }

  kotak.append(el('h2', undefined, 'Kontrol'))
  const daftar = el('div', 'baris')
  for (const [tombol, arti] of [
    ['Klik kiri', 'pilih unit'], ['Tarik', 'pilih banyak'], ['Klik ganda', 'pilih setipe'],
    ['Klik kanan', 'gerak / serang / panen'], ['A', 'serang-gerak'], ['S', 'berhenti'],
    ['H', 'tahan posisi'], ['Q', 'skill hero'], ['F1', 'semua pekerja'], ['F2', 'semua pasukan'],
    ['Ctrl+1..4', 'simpan grup'], ['1..4', 'panggil grup'], ['Home', 'kembali ke castle'],
    ['Esc', 'menu ini'],
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
  hamparan.style.zIndex = '40'
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
