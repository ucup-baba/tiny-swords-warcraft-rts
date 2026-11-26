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
#pita-status.red { ${tigaIris(UI.pitaRed, 18, basis)}; }
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
`
}
