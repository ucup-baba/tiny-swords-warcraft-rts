import { IKON, UI } from '@hftf/aset'
import { sembilanIris, tigaIris, urlAset } from './sembilan.js'

/**
 * Stylesheet dibangun dari manifes aset, bukan ditulis tangan dengan path
 * literal. Kalau sebuah aset pindah, yang berubah hanya manifes.
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
  --emas: #ffd86b;
  --biru: #4a86c8;
  --merah: #c85a4a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow: hidden;
  background: #1a1410;
  color: var(--perkamen);
  font-family: 'Pixelify Sans', system-ui, sans-serif;
  -webkit-font-smoothing: none;
  font-smooth: never;
}

img, canvas { image-rendering: pixelated; }

#akar { display: flex; height: 100vh; }

#panggung { position: relative; flex: 1; min-width: 0; }
#kanvas { display: block; width: 100%; height: 100%; cursor: none; }

/* --- Pita status kiri-atas --- */
#pita-status {
  position: absolute; top: 10px; left: 10px;
  display: flex; gap: 10px; align-items: center;
  padding: 6px 10px; font-size: 15px; font-weight: 700;
  color: #2b1d12; min-height: 42px;
  ${tigaIris(UI.pitaBlue, 18, basis)};
}
#pita-status.red { ${tigaIris(UI.pitaRed, 18, basis)}; }
#pita-status .pisah { opacity: 0.45; }

/* --- Sidebar kanan --- */
#sisi {
  width: 304px; flex: none; min-width: 0;
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px;
  ${sembilanIris(UI.panelUkir, 18, basis)};
  background: var(--kayu-gelap);
  overflow: hidden;
}
/* Tanpa min-width:0 anak grid/flex menolak mengecil dan memaksa scroll. */
#sisi > *, #tab > *, #kisi-produksi > * { min-width: 0; }

#peta-mini-bingkai { ${sembilanIris(UI.bannerH, 16, basis)}; background: #26303a; padding: 2px; }
#peta-mini { display: block; width: 100%; height: 196px; cursor: crosshair; }

#sumber-daya { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.sumber {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 6px; font-size: 14px; font-weight: 700;
  color: #2b1d12; overflow: hidden; white-space: nowrap;
  ${sembilanIris(UI.panelUkir3, 12, basis)};
}
.sumber img { width: 24px; height: 24px; flex: none; object-fit: contain; }

#tab { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.tab-tombol {
  padding: 6px 2px; font-family: inherit; font-size: 13px; font-weight: 700;
  color: #2b1d12; cursor: pointer; background: transparent;
  white-space: nowrap; overflow: hidden;
  ${sembilanIris(UI.tombolBlue, 12, basis)};
}
.tab-tombol[aria-selected="true"] { ${sembilanIris(UI.tombolBlueTekan, 12, basis)}; }
#akar.red .tab-tombol { ${sembilanIris(UI.tombolRed, 12, basis)}; }
#akar.red .tab-tombol[aria-selected="true"] { ${sembilanIris(UI.tombolRedTekan, 12, basis)}; }

#kisi-produksi {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
  overflow-y: auto; overflow-x: hidden; flex: 1; align-content: start;
}
.kartu {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 4px 2px; cursor: pointer; background: transparent;
  font-family: inherit; color: #2b1d12;
  ${sembilanIris(UI.tombolBlue, 13, basis)};
}
.kartu:disabled { ${sembilanIris(UI.tombolMati, 13, basis)}; cursor: not-allowed; opacity: 0.85; }
.kartu img { width: 40px; height: 40px; }
.kartu .nama { font-size: 11px; font-weight: 700; line-height: 1.05; text-align: center; overflow-wrap: anywhere; }
.kartu .biaya { font-size: 10px; color: #4a3520; white-space: nowrap; }

/* --- Panel seleksi bawah --- */
#seleksi {
  position: absolute; left: 10px; right: 10px; bottom: 10px;
  min-height: 92px; padding: 10px 14px;
  display: flex; gap: 12px; align-items: center;
  ${sembilanIris(UI.panelUkir, 20, basis)};
  background: var(--kayu-gelap);
}
#seleksi-potret { width: 64px; height: 64px; flex: none; ${sembilanIris(UI.panelUkir3, 10, basis)}; }
#seleksi-potret img { width: 100%; height: 100%; object-fit: contain; }
#seleksi-isi { flex: 1; min-width: 0; }
#seleksi-judul { font-size: 16px; font-weight: 700; color: var(--emas); }
#seleksi-detail { font-size: 14px; color: #f3e6c4; }
#seleksi-daftar { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; max-height: 42px; overflow: hidden; }
.cip {
  font-size: 11px; padding: 2px 7px; border-radius: 3px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,216,107,0.3);
}

/* --- Hamparan & dialog --- */
.hamparan {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: rgba(12,9,6,0.82); z-index: 20;
}
.kotak {
  width: min(640px, 92%); max-height: 88vh; overflow-y: auto; padding: 26px 30px;
  ${sembilanIris(UI.panelUkir, 26, basis)};
  background: var(--kayu-gelap);
}
.kotak h1 { font-size: 24px; color: var(--emas); margin-bottom: 4px; }
.kotak h2 { font-size: 18px; color: var(--emas); margin: 14px 0 6px; }
.kotak p { font-size: 15px; line-height: 1.5; margin-bottom: 8px; color: #f3e6c4; }
.baris { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.tombol-besar {
  padding: 12px 22px; font-family: inherit; font-size: 16px; font-weight: 700;
  color: #2b1d12; cursor: pointer; background: transparent;
  ${sembilanIris(UI.tombolBlue, 18, basis)};
}
.tombol-besar.merah { ${sembilanIris(UI.tombolRed, 18, basis)}; }
.tombol-besar:disabled { ${sembilanIris(UI.tombolMati, 18, basis)}; cursor: not-allowed; }

#muat-bar { height: 16px; background: rgba(0,0,0,0.45); margin-top: 10px; }
#muat-isi { height: 100%; width: 0%; background: var(--emas); transition: width 0.12s linear; }

#kursor { position: absolute; width: 32px; height: 32px; pointer-events: none; z-index: 30; display: none; }
#kursor.tampil { display: block; }

#toast {
  position: absolute; top: 64px; left: 50%; transform: translateX(-50%);
  padding: 8px 16px; font-size: 15px; font-weight: 700; color: #2b1d12;
  ${tigaIris(UI.pitaYellow, 18, basis)};
  opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 25;
}
#toast.tampil { opacity: 1; }

.ikon-kecil { width: 20px; height: 20px; vertical-align: middle; }
`.trim() + `\n/* ikon tersedia: ${Object.keys(IKON).length} */\n`
}

export const urlIkon = (nama: keyof typeof IKON, basis = ''): string => urlAset(IKON[nama]!, basis)
