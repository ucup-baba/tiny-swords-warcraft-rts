import { UI } from '@hftf/aset'
import { sembilanIris, tigaIris } from './sembilan.js'

/**
 * Stylesheet resolusi tetap 1280x720 (nol scrollbar) berbasis 9-slice resmi
 * Update 010. Seluruh path diambil dari manifes aset.
 */
export function bangunGaya(basis = ''): string {
  return `
@font-face {
  font-family: 'Pixelify Sans';
  src: url('${basis}public/font/PixelifySans.ttf') format('truetype');
  font-weight: 400 700;
  font-display: block;
}

:root {
  --kayu-gelap: #3a2a1d;
  --kayu: #5c4330;
  --perkamen: #e8d5a9;
  --tinta: #24160b;
  --tinta-sekunder: #52341b;
  --emas: #ffd86b;
  --biru: #4a86c8;
  --merah: #c85a4a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #14100c;
  color: var(--perkamen);
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  -webkit-font-smoothing: none;
  font-smooth: never;
  user-select: none;
}

img, canvas { image-rendering: pixelated; }

/* --- Bingkai skala resolusi tetap 1280x720 (nol scrollbar, selalu terpusat di HP/Desktop) --- */
#bingkai-layar {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at center, #241b13 0%, #100c09 100%);
}

#akar {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1280px;
  height: 720px;
  display: flex;
  overflow: hidden;
  transform-origin: center center;
  transform: translate(-50%, -50%);
  outline: 2px solid #090705;
}

#panggung {
  position: relative;
  width: 976px;
  height: 720px;
  flex: none;
  overflow: hidden;
}

#kanvas {
  display: block;
  width: 976px;
  height: 720px;
  cursor: none;
  touch-action: none;
}

/* --- Tombol utilitas kanan-atas peta (Menu, Fullscreen, Kotak Seleksi) --- */
#tombol-atas {
  position: absolute;
  top: 8px;
  right: 10px;
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 14;
}
.btn-util {
  height: 34px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--tinta);
  cursor: pointer;
  background: transparent;
  white-space: nowrap;
  ${sembilanIris(UI.tombolBlue, 10, basis, 3)};
}
.btn-util.aktif {
  ${sembilanIris(UI.tombolBlueTekan, 10, basis, 3)};
  color: #fff;
  text-shadow: 0 1px 2px #000;
  outline: 2px solid var(--emas);
}

/* --- Virtual Joystick (Mode 3: Joystick + Seret Seleksi) --- */
#joystick {
  position: absolute;
  left: 16px;
  bottom: 168px;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(92, 67, 48, 0.72) 0%, rgba(36, 22, 11, 0.84) 100%);
  border: 3px solid rgba(255, 216, 107, 0.65);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  display: none;
  align-items: center;
  justify-content: center;
  touch-action: none;
  z-index: 15;
}
#joystick.tampil { display: flex; }
#joystick-kenop {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, #ffe699, #c68e32);
  border: 2.5px solid #2b1a0c;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  transform: translate(0px, 0px);
}

/* --- Layar Anjuran Putar Landscape (khusus HP berdiri / portrait) --- */
#layar-putar {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: none;
  place-items: center;
  padding: 20px;
  background: rgba(14, 10, 7, 0.94);
}
#layar-putar.tampil { display: grid; }
#layar-putar .kotak-putar {
  width: min(400px, 100%);
  padding: 22px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  ${sembilanIris(UI.panelUkir, 22, basis)};
  background: var(--kayu-gelap);
  color: var(--tinta);
}
#layar-putar .ikon-putar { font-size: 42px; line-height: 1; }
#layar-putar h2 { font-size: 20px; color: var(--tinta); margin: 0; }
#layar-putar p { font-size: 14px; font-weight: 700; color: #3d2410; line-height: 1.4; }
#layar-putar .baris { justify-content: center; }

/* --- Pita status kiri-atas --- */
#pita-status {
  position: absolute; top: 8px; left: 10px;
  display: flex; gap: 10px; align-items: center;
  padding: 5px 14px 9px; font-size: 14px; font-weight: 700; line-height: 1;
  color: var(--tinta); min-height: 38px;
  ${tigaIris(UI.pitaBlue, 18, basis)};
  z-index: 12;
  contain: layout paint style;
}
#pita-status.red { ${tigaIris(UI.pitaRed, 18, basis)}; color: #fff; text-shadow: 0 1px 2px #000; }
#pita-status.yellow { ${tigaIris(UI.pitaYellow, 18, basis)}; }
#pita-status .titik-tim {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1.5px solid #1b120b;
  flex: none;
}
#pita-status .pisah { opacity: 0.45; }

/* --- Sidebar kanan (304x720, pas tanpa scrollbar) --- */
#sisi {
  width: 304px;
  height: 720px;
  flex: none;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  ${sembilanIris(UI.panelUkir, 16, basis, 10)};
  background: var(--kayu-gelap);
  overflow: hidden;
  contain: layout paint style;
}
#sisi > *, #tab > *, #kisi-produksi > * { min-width: 0; }

#peta-mini-bingkai {
  ${sembilanIris(UI.bannerH, 14, basis, 6)};
  background: #26303a;
  padding: 2px;
  flex: none;
}
#peta-mini { display: block; width: 100%; height: 172px; cursor: crosshair; touch-action: none; }

#sumber-daya { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; flex: none; }
.sumber {
  display: flex; align-items: center; gap: 6px;
  height: 36px; padding: 2px 8px; font-size: 14px; font-weight: 700; line-height: 1;
  color: var(--tinta); overflow: hidden; white-space: nowrap;
  ${sembilanIris(UI.panelUkir3, 10, basis, 3)};
}
.sumber img { width: 24px; height: 24px; flex: none; object-fit: contain; }

#tab { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; flex: none; }
.tab-tombol {
  height: 34px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1;
  color: var(--tinta); cursor: pointer; background: transparent;
  white-space: nowrap; overflow: hidden;
  ${sembilanIris(UI.tombolBlue, 11, basis, 3)};
}
.tab-tombol[aria-selected="true"] { ${sembilanIris(UI.tombolBlueTekan, 11, basis, 3)}; color: #fff; text-shadow: 0 1px 2px #000; }
#akar.red .tab-tombol { ${sembilanIris(UI.tombolRed, 11, basis, 3)}; }
#akar.red .tab-tombol[aria-selected="true"] { ${sembilanIris(UI.tombolRedTekan, 11, basis, 3)}; color: #fff; text-shadow: 0 1px 2px #000; }

#kisi-produksi {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
  overflow: hidden; flex: 1; align-content: start;
}
.kartu {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  height: 86px; padding: 3px 4px; cursor: pointer; background: transparent;
  font-family: inherit; color: var(--tinta); overflow: hidden;
  ${sembilanIris(UI.tombolBlue, 12, basis, 4)};
}
.kartu.unit { height: 112px; gap: 2px; }
.kartu:disabled, .kartu.terkunci { ${sembilanIris(UI.tombolMati, 12, basis, 4)}; opacity: 0.84; }
.kartu:disabled { cursor: not-allowed; }
.kartu.terkunci { cursor: pointer; }
.kartu img { width: 38px; height: 38px; object-fit: contain; }
.kartu .nama { font-size: 11px; font-weight: 700; line-height: 1.05; text-align: center; }
.kartu .biaya { font-size: 10px; color: #3a2310; white-space: nowrap; font-weight: 700; }
.kartu .counter { font-size: 9px; color: #2b1d12; background: rgba(255,255,255,0.35); padding: 1px 4px; border-radius: 3px; white-space: nowrap; }

/* Sapuan gelap -> cerah ala Warcraft (progress pelatihan / riset / cooldown) */
.sapuan-gelap {
  position: absolute;
  left: 4px; right: 4px; top: 4px;
  background: rgba(16, 11, 7, 0.62);
  pointer-events: none;
  border-radius: 2px;
}
.badge-persen {
  position: absolute;
  top: 5px; right: 6px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(20, 14, 9, 0.88);
  color: var(--emas);
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
}

/* --- Tab Per Unit Dinamis (sembunyi jika jumlah 0) --- */
#tab-unit {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 132px;
  display: flex;
  flex-wrap: nowrap;
  gap: 5px;
  align-items: center;
  pointer-events: none;
  z-index: 11;
}
.tab-unit-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  padding: 0 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--tinta);
  cursor: pointer;
  background: transparent;
  white-space: nowrap;
  ${sembilanIris(UI.tombolBlue, 10, basis, 3)};
}
.tab-unit-btn.hero { ${sembilanIris(UI.tombolRed, 10, basis, 3)}; color: #fff; text-shadow: 0 1px 2px #000; }
.tab-unit-btn.aktif { outline: 2px solid var(--emas); transform: translateY(-2px); }
.tab-unit-btn img { width: 20px; height: 20px; object-fit: contain; }

/* --- Panel seleksi bawah Warcraft III (tinggi tetap 118px) --- */
#seleksi {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  height: 118px;
  padding: 8px 12px;
  display: grid;
  grid-template-columns: 242px 1fr 278px;
  gap: 10px;
  align-items: center;
  ${sembilanIris(UI.panelUkir, 16, basis, 8)};
  background: var(--kayu-gelap);
  overflow: hidden;
  z-index: 11;
  contain: layout paint style;
}

#seleksi-kiri {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
#seleksi-potret {
  width: 66px; height: 66px; flex: none;
  display: flex; align-items: center; justify-content: center;
  padding: 4px;
  ${sembilanIris(UI.panelUkir3, 10, basis, 4)};
}
#seleksi-potret img { width: 100%; height: 100%; object-fit: contain; }
#seleksi-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
#seleksi-judul { font-size: 14px; font-weight: 700; color: var(--tinta); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#seleksi-detail { font-size: 11px; font-weight: 700; color: var(--tinta-sekunder); line-height: 1.2; }

.hp-bar {
  position: relative;
  width: 100%;
  height: 15px;
  background: #21160e;
  border: 1.5px solid #4e341e;
  border-radius: 3px;
  overflow: hidden;
}
.hp-isi { height: 100%; background: #52c95f; }
.hp-teks {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px #000;
}

/* Zona tengah: grid unit mini atau progres pelatihan Warcraft */
#seleksi-tengah {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  min-width: 0;
}
.unit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: center;
  max-height: 92px;
  overflow: hidden;
}
.mini-unit {
  width: 40px; height: 44px; padding: 2px;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  background: rgba(36, 22, 11, 0.22);
  border: 1.5px solid rgba(58, 36, 18, 0.55);
  border-radius: 4px;
  cursor: pointer;
}
.mini-unit:hover { border-color: var(--emas); }
.mini-unit img { width: 30px; height: 30px; object-fit: contain; }
.mini-hp { width: 100%; height: 4px; background: #1c120b; border-radius: 2px; overflow: hidden; }
.mini-hp > div { height: 100%; background: #63e678; }

.progres-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  background: rgba(36, 22, 11, 0.16);
  border: 1.5px solid rgba(58, 36, 18, 0.45);
  border-radius: 5px;
}
.progres-ikon {
  position: relative;
  width: 52px; height: 52px; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: #2b1d12;
  border: 2px solid #6b4928;
  border-radius: 4px;
  overflow: hidden;
}
.progres-ikon img { width: 42px; height: 42px; object-fit: contain; }
.progres-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.progres-atas { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; font-weight: 700; color: var(--tinta); }
.progres-persen { color: #7a2d00; font-size: 13px; }
.progres-bar { width: 100%; height: 10px; background: #21160e; border: 1px solid #593b20; border-radius: 3px; overflow: hidden; }
.progres-isi { height: 100%; background: linear-gradient(90deg, #d89b28, #ffe066); }
.antrean-baris { display: flex; gap: 4px; margin-top: 2px; flex-wrap: nowrap; }
.antrean-slot {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 5px; font-family: inherit; font-size: 10px; font-weight: 700;
  color: #fff; background: #3b2616; border: 1px solid #7d5733; border-radius: 3px;
  cursor: pointer;
}
.antrean-slot:hover { background: #6b241c; border-color: #ff9090; }

.petunjuk-tengah {
  font-size: 12px; font-weight: 700; color: var(--tinta-sekunder); line-height: 1.35;
}

/* Zona kanan: Command Card 2x2 atau Riset Kontekstual */
#seleksi-aksi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  width: 100%;
}
.cmd-btn {
  position: relative;
  height: 40px;
  padding: 2px 4px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  font-family: inherit; font-size: 11px; font-weight: 700; line-height: 1.08;
  color: var(--tinta); cursor: pointer; background: transparent;
  overflow: hidden;
  ${sembilanIris(UI.tombolBlue, 10, basis, 3)};
}
.cmd-btn.aktif { ${sembilanIris(UI.tombolBlueTekan, 10, basis, 3)}; color: #fff; text-shadow: 0 1px 2px #000; }
.cmd-btn.riset { height: 80px; gap: 2px; padding: 4px 6px; }
.cmd-btn.merah { ${sembilanIris(UI.tombolRed, 10, basis, 3)}; color: #fff; text-shadow: 0 1px 2px #000; }
.cmd-btn:disabled, .cmd-btn.terkunci { ${sembilanIris(UI.tombolMati, 10, basis, 3)}; color: #544638; opacity: 0.84; }
.cmd-btn:disabled { cursor: not-allowed; }
.cmd-btn.terkunci { cursor: pointer; }
.cmd-sub { font-size: 9px; color: #402612; font-weight: 700; line-height: 1.05; }
.cmd-btn.merah .cmd-sub, .cmd-btn.aktif .cmd-sub { color: #ffe8b0; }

.cip {
  font-size: 11px; padding: 4px 7px; border-radius: 3px;
  background: rgba(36, 22, 11, 0.25); border: 1px solid rgba(58, 36, 18, 0.45);
  color: var(--tinta); font-weight: 700;
}

/* --- Hamparan & dialog (pas di 1280x720 tanpa scroll) --- */
.hamparan {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: rgba(12,9,6,0.82); z-index: 25;
}
.kotak {
  width: min(760px, 94%); max-height: 688px; overflow-y: auto; padding: 12px 18px;
  ${sembilanIris(UI.panelUkir, 20, basis)};
  background: var(--kayu-gelap);
  color: var(--tinta);
}
.kotak h1 { font-size: 20px; color: var(--tinta); margin-bottom: 2px; }
.kotak h2 { font-size: 14px; color: #4a2a0e; margin: 7px 0 3px; }
.kotak p { font-size: 12px; line-height: 1.35; margin-bottom: 4px; color: #362111; font-weight: 700; }
.baris { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; align-items: center; }
.tombol-besar {
  padding: 8px 16px; font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1.1;
  color: var(--tinta); cursor: pointer; background: transparent;
  ${sembilanIris(UI.tombolBlue, 12, basis, 4)};
}
.tombol-besar.merah { ${sembilanIris(UI.tombolRed, 12, basis, 4)}; color: #fff; text-shadow: 0 1px 2px #000; }
.tombol-besar:disabled { ${sembilanIris(UI.tombolMati, 12, basis, 4)}; cursor: not-allowed; }

#muat-bar { height: 16px; background: rgba(0,0,0,0.45); margin-top: 10px; }
#muat-isi { height: 100%; width: 0%; background: var(--emas); transition: width 0.12s linear; }

#kursor {
  position: absolute;
  width: 44px;
  height: 44px;
  pointer-events: none;
  z-index: 40;
  display: none;
  image-rendering: pixelated;
}
#kursor.tampil { display: block; }

#toast {
  position: absolute; top: 56px; left: 50%; transform: translateX(-50%);
  padding: 7px 18px; font-size: 14px; font-weight: 700; color: var(--tinta);
  ${tigaIris(UI.pitaYellow, 18, basis)};
  opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 30;
  white-space: nowrap;
}
#toast.peringatan {
  ${tigaIris(UI.pitaRed, 18, basis)};
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}
#toast.tampil { opacity: 1; }

/* --- Lobi Warcraft III (pas di 1280x720, hingga 6 pemain + peta + custom gold) --- */
.kotak.kotak-lobi {
  width: min(1120px, 96%);
  max-height: 688px;
  padding: 12px 16px;
}
.lobi-kepala {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 7px;
  border-bottom: 2px solid rgba(58, 36, 18, 0.35);
}
.lobi-alat {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.lobi-alat label {
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
}
.lobi-input {
  padding: 4px 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 248, 232, 0.88);
  border: 2px solid #6b4928;
  border-radius: 4px;
}
.lobi-grid {
  display: grid;
  grid-template-columns: 1fr 336px;
  gap: 12px;
  margin-top: 8px;
  align-items: start;
}
.lobi-kolom {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.lobi-subkotak {
  padding: 8px 10px;
  background: rgba(36, 22, 11, 0.14);
  border: 2px solid rgba(74, 48, 24, 0.45);
  border-radius: 6px;
}
.lobi-subjudul {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.lobi-subjudul h2 { margin: 0; font-size: 14px; color: #3d210a; }
.lobi-preset-baris { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-kecil {
  padding: 3px 8px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 244, 214, 0.72);
  border: 1.5px solid #6b4928;
  border-radius: 4px;
  cursor: pointer;
}
.btn-kecil.aktif, .btn-kecil:hover {
  background: #ffd86b;
  border-color: #2b1a0c;
}
.slot-tabel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.slot-header, .slot-baris {
  display: grid;
  grid-template-columns: 24px 82px 1fr 78px 138px;
  gap: 6px;
  align-items: center;
}
.slot-header {
  font-size: 11px;
  font-weight: 700;
  color: #4f2f12;
  padding: 0 4px 2px;
}
.slot-baris {
  padding: 4px 6px;
  background: rgba(255, 248, 228, 0.48);
  border: 1.5px solid rgba(74, 48, 24, 0.35);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}
.slot-baris.saya {
  background: rgba(255, 232, 160, 0.65);
  border-color: #b57b14;
}
.slot-baris.kosong {
  opacity: 0.68;
}
.slot-nomor { text-align: center; font-size: 12px; color: #3a2310; }
.btn-warna {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px #000, 0 0 2px #000;
  border: 1.5px solid #1b120b;
  border-radius: 4px;
  cursor: pointer;
  justify-content: center;
}
.btn-warna:disabled { cursor: default; opacity: 0.9; }
.lobi-select {
  width: 100%;
  padding: 3px 5px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.9);
  border: 1.5px solid #6b4928;
  border-radius: 4px;
}
.slot-nama {
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slot-hero {
  display: flex;
  align-items: center;
  gap: 4px;
}
.slot-hero img {
  width: 24px;
  height: 24px;
  flex: none;
  border: 1px solid #593b20;
  border-radius: 3px;
  background: #2b1d12;
}
.peta-pilihan {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 128px;
  overflow-y: auto;
  padding-right: 2px;
}
.peta-custom-baris {
  display: flex;
  gap: 4px;
  align-items: stretch;
}
.peta-custom-baris .peta-btn {
  flex: 1;
  min-width: 0;
}
.peta-edit-mini {
  flex: none;
  padding: 0 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 248, 228, 0.78);
  border: 2px solid #6b4928;
  border-radius: 5px;
  cursor: pointer;
}
.peta-edit-mini:hover {
  background: #ffd86b;
  border-color: #24160b;
}
.peta-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 248, 228, 0.62);
  border: 2px solid #6b4928;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
}
.peta-btn.aktif {
  background: #ffe38a;
  border-color: #24160b;
  outline: 2px solid #ffd86b;
}
.peta-btn .peta-sub { font-size: 10px; color: #52341b; }
.peta-pratinjau-bingkai {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: #1d2a33;
  border: 2px solid #4e341e;
  border-radius: 5px;
}
#lobi-pratinjau-peta {
  display: block;
  width: 300px;
  height: 150px;
  border-radius: 3px;
}
.gold-baris {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.gold-input {
  width: 78px;
  padding: 3px 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.95);
  border: 1.5px solid #6b4928;
  border-radius: 4px;
}
.cta-mulai {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
}

/* --- Pemisahan Lobi Awal: Menu Mode (Main vs AI / Wi-Fi LAN) & Hub Wi-Fi --- */
.lobi-judul-baris {
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn-kembali {
  padding: 5px 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 244, 214, 0.85);
  border: 2px solid #593b20;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-kembali:hover {
  background: #ffd86b;
  border-color: #24160b;
}
.mode-pilihan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
  align-items: stretch;
}
.mode-kartu {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 16px;
  background: rgba(255, 248, 228, 0.56);
  border: 2.5px solid #5c3c1e;
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.mode-lencana.editor {
  background: #5b2e7a;
  color: #f4d8ff;
}
.mode-kartu-atas {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mode-ikon {
  font-size: 32px;
  line-height: 1;
}
.mode-lencana {
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  background: #3d2410;
  color: #ffd86b;
  letter-spacing: 0.4px;
}
.mode-lencana.wifi {
  background: #1b4d3e;
  color: #a8ffda;
}
.mode-lencana.nonaktif {
  background: #5a4b3f;
  color: #e6d8c3;
}
.mode-kartu h2 {
  font-size: 20px;
  color: #24160b;
  margin: 4px 0 2px;
}
.mode-daftar {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: #3d2410;
}
.mode-daftar li::before {
  content: '▸ ';
  color: #8c4b14;
}
.mode-status-bar {
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(36, 22, 11, 0.14);
  border: 1.5px solid rgba(74, 48, 24, 0.35);
  color: #2e1b0c;
}
.wifi-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(36, 22, 11, 0.15);
  border: 1.5px solid rgba(74, 48, 24, 0.4);
  border-radius: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
}
.wifi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
  align-items: stretch;
}
.wifi-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 248, 228, 0.45);
  border: 2px solid rgba(74, 48, 24, 0.5);
  border-radius: 7px;
}
.wifi-panel h2 {
  margin: 0;
  font-size: 16px;
  color: #2d1808;
}
.wifi-pratinjau {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  background: #1d2a33;
  border: 2px solid #4e341e;
  border-radius: 5px;
}
.wifi-pratinjau canvas {
  display: block;
  width: 196px;
  height: 98px;
  border-radius: 3px;
  flex: none;
}
.wifi-pratinjau-info {
  font-size: 11px;
  font-weight: 700;
  color: #e8d5a9;
  line-height: 1.35;
}
.wifi-kode-baris {
  display: flex;
  gap: 8px;
  align-items: center;
}
.wifi-kode-input {
  flex: 1;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  text-align: center;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.96);
  border: 2px solid #593b20;
  border-radius: 5px;
}
.wifi-room-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 256px;
  overflow-y: auto;
  padding-right: 2px;
}
.wifi-room-kartu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 8px 10px;
  font-family: inherit;
  text-align: left;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.88);
  border: 2px solid #5c3c1e;
  border-radius: 6px;
  cursor: pointer;
}
.wifi-room-kartu:hover:not(:disabled) {
  background: #ffe8a3;
  border-color: #24160b;
}
.wifi-room-kartu:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: rgba(220, 210, 190, 0.65);
}
.wifi-room-atas, .wifi-room-bawah {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wifi-room-kode {
  display: inline-block;
  padding: 2px 6px;
  background: #2b1a0c;
  color: #ffd86b;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}
.wifi-room-host {
  font-size: 13px;
  font-weight: 700;
  color: #24160b;
}
.wifi-room-bawah {
  font-size: 11px;
  font-weight: 700;
  color: #52341b;
}
.wifi-badge-buka {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #1d6b3b;
  color: #fff;
}
.wifi-badge-penuh {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #9e2f24;
  color: #fff;
}
.room-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 7px 12px;
  background: linear-gradient(90deg, rgba(43, 26, 12, 0.88), rgba(68, 42, 18, 0.85));
  border: 2px solid #b57b14;
  border-radius: 6px;
  color: #f8e9c4;
}
.room-banner-kiri {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.room-kode-besar {
  padding: 3px 10px;
  background: #ffd86b;
  color: #24160b;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
}
.room-tunggu-box {
  padding: 10px 12px;
  text-align: center;
  background: rgba(36, 22, 11, 0.16);
  border: 2px dashed #6b4928;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #3d210a;
  line-height: 1.4;
}
.lobi-galat {
  font-size: 12px;
  font-weight: 700;
  color: #8f1d14;
  min-height: 16px;
}

/* ============================================================================
 * MAP EDITOR WYSIWYG (Desktop & Mobile Responsif, gaya perkamen Tiny Swords)
 * ========================================================================== */
#editor-peta {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: none;
  flex-direction: column;
  background: #162229;
  color: var(--tinta);
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  overflow: hidden;
}
#editor-peta.tampil { display: flex; }
#editor-peta input, #editor-peta select { user-select: text; }

.ed-atas {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  min-height: 48px;
  background: linear-gradient(180deg, #ead9b0 0%, #d8c18b 100%);
  border-bottom: 3px solid #593b20;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  overflow-x: auto;
  flex: none;
}
.ed-atas-grup {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.ed-nama {
  width: 168px;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.94);
  border: 2px solid #5c3c1e;
  border-radius: 5px;
}
.ed-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  padding: 0 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 248, 228, 0.85);
  border: 2px solid #5c3c1e;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}
.ed-btn:hover:not(:disabled) { background: #ffe48f; border-color: #24160b; }
.ed-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ed-btn.aktif {
  background: #ffd15c;
  border-color: #1f1207;
  outline: 2px solid #fff3c4;
}
.ed-btn.cta {
  background: linear-gradient(180deg, #52b868 0%, #2e8442 100%);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  border-color: #15401e;
}
.ed-btn.cta:hover:not(:disabled) { filter: brightness(1.08); background: linear-gradient(180deg, #52b868 0%, #2e8442 100%); }
.ed-btn.simpan {
  background: linear-gradient(180deg, #5695db 0%, #3263a3 100%);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  border-color: #18365c;
}
.ed-btn.simpan:hover:not(:disabled) { filter: brightness(1.08); background: linear-gradient(180deg, #5695db 0%, #3263a3 100%); }
.ed-btn.bahaya {
  background: #c85242;
  color: #fff;
  border-color: #5c1911;
}
.ed-mobile-btn { display: none; }

.ed-bioma-baris {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 5px;
  background: rgba(36, 22, 11, 0.14);
  border: 1.5px solid rgba(74, 48, 24, 0.4);
  border-radius: 5px;
}
.ed-bioma-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid #2b1a0c;
  cursor: pointer;
  padding: 0;
}
.ed-bioma-swatch.aktif {
  outline: 2.5px solid #ffd86b;
  transform: scale(1.1);
}
.ed-select {
  height: 32px;
  padding: 0 7px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--tinta);
  background: rgba(255, 250, 236, 0.94);
  border: 2px solid #5c3c1e;
  border-radius: 5px;
}

.ed-badan {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

/* Dock Palet Kiri */
.ed-palet {
  width: 256px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px;
  background: linear-gradient(180deg, #e8d5a9 0%, #d4bc84 100%);
  border-right: 3px solid #593b20;
  overflow-y: auto;
  z-index: 6;
}
.ed-subkotak {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px;
  background: rgba(36, 22, 11, 0.11);
  border: 1.5px solid rgba(74, 48, 24, 0.42);
  border-radius: 6px;
}
.ed-label {
  font-size: 11px;
  font-weight: 700;
  color: #4a2b10;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ed-alat-baris {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.ed-ukuran-baris {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.ed-kat-tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
}
.ed-kat-btn {
  height: 34px;
  padding: 0 2px;
  font-family: inherit;
  font-size: 15px;
  background: rgba(255, 248, 228, 0.72);
  border: 2px solid #6b4928;
  border-radius: 5px;
  cursor: pointer;
}
.ed-kat-btn.aktif {
  background: #ffd15c;
  border-color: #1f1207;
  outline: 2px solid #fff3c4;
}
.ed-item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  align-content: start;
}
.ed-item-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  color: var(--tinta);
  background: rgba(255, 249, 232, 0.85);
  border: 2px solid #6b4928;
  border-radius: 5px;
  cursor: pointer;
  min-width: 0;
}
.ed-item-btn:hover { background: #ffe9a8; }
.ed-item-btn.aktif {
  background: #ffd15c;
  border-color: #1f1207;
  box-shadow: 0 0 0 2px #fff3c4;
}
.ed-item-btn canvas, .ed-item-btn img {
  width: 28px;
  height: 28px;
  flex: none;
  object-fit: contain;
  border-radius: 3px;
  background: rgba(36, 22, 11, 0.12);
}
.ed-item-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ed-slot-baris {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.ed-slot-dot {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 2px solid #1b120b;
  color: #fff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  text-shadow: 0 1px 2px #000;
  cursor: pointer;
}
.ed-slot-dot.aktif { outline: 2.5px solid #ffd86b; transform: scale(1.08); }

/* Panggung Kanvas Hidup Tengah */
.ed-panggung {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #2b6a7a;
}
.ed-kanvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
.ed-zoom-pil {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(232, 213, 169, 0.92);
  border: 2px solid #593b20;
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  z-index: 4;
}
.ed-toast {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 7px 16px;
  background: rgba(43, 26, 12, 0.92);
  color: #ffd86b;
  border: 2px solid #b57b14;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 20;
  white-space: nowrap;
}
.ed-toast.peringatan { background: rgba(138, 30, 20, 0.94); color: #fff; border-color: #ff9f8e; }
.ed-toast.tampil { opacity: 1; }

/* Dock Minimap & Validasi Kanan */
.ed-kanan {
  width: 224px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: linear-gradient(180deg, #e8d5a9 0%, #d4bc84 100%);
  border-left: 3px solid #593b20;
  overflow-y: auto;
  z-index: 6;
}
.ed-minimap-box {
  padding: 4px;
  background: #1d2a33;
  border: 2.5px solid #4e341e;
  border-radius: 6px;
}
.ed-minimap {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  cursor: crosshair;
  touch-action: none;
}
.ed-valid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
.ed-valid-ok { color: #195e2c; }
.ed-valid-err { color: #8c1a10; }
.ed-valid-warn { color: #7a4c00; }
.ed-pintasan {
  font-size: 10.5px;
  line-height: 1.35;
  color: #4a2b10;
  font-weight: 700;
}

/* Modal Buka / Buat Peta */
.ed-modal-bg {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: none;
  place-items: center;
  padding: 16px;
  background: rgba(12, 9, 6, 0.72);
}
.ed-modal-bg.tampil { display: grid; }
.ed-modal {
  width: min(640px, 96%);
  max-height: 86vh;
  overflow-y: auto;
  padding: 16px 18px;
  background: linear-gradient(180deg, #eedcb3 0%, #dec58e 100%);
  border: 3px solid #4e341e;
  border-radius: 8px;
  color: var(--tinta);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65);
}
.ed-modal-kepala {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ed-modal h2 { margin: 0; font-size: 18px; }
.ed-modal h3 { margin: 0 0 6px; font-size: 13px; color: #4a2b10; }
.ed-modal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 7px;
}
.ed-tersimpan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 249, 232, 0.78);
  border: 1.5px solid #6b4928;
  border-radius: 5px;
}

/* Responsif Mobile (HP Landscape & Layar Sempit) */
@media (max-width: 900px), (max-height: 520px) {
  .ed-mobile-btn { display: inline-flex; }
  .ed-atas {
    flex-wrap: wrap;
    row-gap: 4px;
    column-gap: 6px;
    padding: 4px 6px;
    min-height: 0;
    overflow-x: visible;
  }
  .ed-atas-grup { gap: 4px; flex-wrap: wrap; }
  .ed-btn, .ed-select { height: 26px; padding: 0 6px; font-size: 11px; }
  .ed-bioma-swatch { width: 18px; height: 18px; }
  .ed-nama { width: 112px; height: 26px; padding: 2px 6px; font-size: 11px; }
  .ed-palet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    max-height: 48%;
    border-right: none;
    border-top: 3px solid #593b20;
    display: none;
  }
  .ed-palet.buka { display: flex; }
  .ed-item-grid { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }
  .ed-kanan {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 220px;
    display: none;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.45);
  }
  .ed-kanan.buka { display: flex; }
}
`
}
