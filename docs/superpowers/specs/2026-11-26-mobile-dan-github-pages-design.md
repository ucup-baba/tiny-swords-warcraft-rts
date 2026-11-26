# Design Spec: Dukungan Mobile (Touch RTS + Landscape) & Hosting GitHub Pages

**Tanggal:** 2026-11-26  
**Pendekatan:** Pendekatan A — Modul Sentuh Terpadu (`sentuh.ts`) + Build Ramping ke Branch `gh-pages`  
**Target Repo:** `https://github.com/ucup-baba/tiny-swords-warcraft-rts` (Public)  
**Target Live URL:** `https://ucup-baba.github.io/tiny-swords-warcraft-rts/`

---

## 1. Tujuan

Membuat **Tiny Swords: Warcraft RTS** nyaman dimainkan di layar sentuh HP/tablet (dengan 2 mode kontrol sentuh yang dapat dipilih di Menu + anjuran orientasi Landscape & Fullscreen), sekaligus mempublikasikan repo baru di GitHub dan meng-hosting versi web statisnya secara ramping dan bebas error di **GitHub Pages** tanpa merusak mode LAN lokal (`npm run dev`).

---

## 2. Bagian 1 — Kontrol Sentuh Mobile, Virtual Joystick & Orientasi Landscape (`packages/ui` + `packages/client`)

### 2.1 Dua Mode Kontrol Sentuh (Pilihan di Menu, Tersimpan di `localStorage`)
Menambah tipe `ModeSentuh = 'tapPintar' | 'joystick'` (disimpan di `localStorage` kunci `'hftf.modeSentuh'`, default `'tapPintar'`).

1. **Mode 1 — Tap Pintar (`'tapPintar'`, Default)**
   - **Geser 1 jari (`> 10px`)**: menggeser kamera (*pan*) mulus mengikuti gerakan jari (koordinat dikonversi melalui rasio stage `976×720`).
   - **Cubit 2 jari (*pinch-zoom*)**: memperbesar/memperkecil zoom kamera (`0.45..1.8`) berpusat di titik tengah kedua jari.
   - **Tap cepat (`≤ 10px`)**:
     - Jika menyentuh unit milik sendiri → memilih unit (tap ganda `< 350ms` pada unit yang sama → memilih seluruh unit setipe).
     - Jika ada unit terpilih dan tap menyentuh tanah, musuh, pohon, tambang, domba, daging, atau bangunan rusak → menjalankan `perintahKlikKanan()` dan menancapkan Bendera Perintah.
     - Jika tidak ada unit terpilih tapi ada bangunan produksi terpilih dan tap pada tanah → memindahkan Bendera Rally Point (`rally`).
     - Jika menyentuh bangunan sendiri → memilih bangunan (menampilkan Riset Kontekstual & Progres Pelatihan).
   - **Kotak Seleksi Banyak Unit (*Marquee*)**:
     - Tekan tombol toggle **`⬚ Kotak`** di pojok kanan-atas peta, **atau** tahan jari **350 ms** tanpa menggeser → masuk mode seret kotak seleksi; setelah jari dilepas, unit di dalam kotak terpilih dan otomatis kembali ke mode geser kamera.

2. **Mode 3 — Virtual Joystick + Seret Seleksi (`'joystick'`)**
   - Menampilkan **Virtual Joystick** analog bergaya kayu/perkamen di pojok kiri-bawah `#panggung` (`left: 14px, bottom: 168px`, tepat di atas `#tab-unit`) untuk menggeser kamera 360° (`laju = 780 px/detik × magnitudo stik`).
   - **Seret 1 jari di peta (`> 10px`)**: langsung menggambar kotak seleksi (*marquee*) untuk memilih pasukan.
   - **Cubit 2 jari**: tetap *pinch-zoom*.
   - **Tap cepat (`≤ 10px`)**: memilih unit/bangunan atau menjalankan perintah pintar / Rally Point sama seperti Mode 1.

### 2.2 Penyesuaian UX Mobile & Minimap Touch
- **Deteksi sentuh**: saat menerima `touchstart` atau `matchMedia('(pointer: coarse)')`, kursor palsu `#kursor` otomatis disembunyikan agar tidak membeku di tengah layar.
- **`index.html`**: menambahkan meta viewport anti-zoom browser (`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`), `mobile-web-app-capable`, dan `theme-color`.
- **CSS `touch-action: none`**: dipasang pada `#kanvas`, `#peta-mini`, dan `#joystick` agar browser HP tidak memicu pull-to-refresh atau pinch-zoom halaman.
- **Minimap Sentuh**: `touchstart` & `touchmove` di `#peta-mini` langsung menggeser kamera mengikuti jari.
- **Tombol Utilitas Atas (`#tombol-atas`)** di pojok kanan-atas `#panggung`:
  - **`⬚ Kotak`** (tampil saat mode sentuh `tapPintar` aktif pada perangkat sentuh — highlight emas saat aktif).
  - **`⛶`** (tombol Layar Penuh / Fullscreen + mencoba `screen.orientation.lock('landscape')` di Android Chrome).
  - **`☰ Menu`** (selalu tampil agar Menu Jeda & pengaturan bisa dibuka tanpa tombol `Esc`).
- **Menu Jeda (`packages/ui/src/menu.ts`)**:
  - Menambahkan bagian **Mode Kontrol Sentuh**: 2 tombol pilihan (`Tap Pintar` | `Joystick + Seret`) dengan indikator aktif dan callback `ubahModeSentuh(mode)`.
  - Menambahkan tombol **Layar Penuh** dan ringkasan kontrol sentuh.
- **Layar Anjuran Landscape (`#layar-putar`)**:
  - Otomatis muncul bila perangkat dalam posisi berdiri (`window.innerHeight > window.innerWidth && window.innerWidth < 900`) dan belum di-dismiss.
  - Menampilkan teks anjuran *"Putar HP ke posisi mendatar (Landscape) agar peta & tombol nyaman dimainkan"*, tombol **`⛶ Layar Penuh (Landscape)`**, dan tombol **`Tetap Lanjut`** (menyembunyikan overlay untuk sesi ini).

---

## 3. Bagian 2 — Adaptasi Web Statis & Publikasi GitHub Pages (`index.html`, `client`, `lobi`, `scripts`)

### 3.1 Path Relatif & Deteksi Mode Statis
- **`index.html`**: mengganti `/bundel.js` menjadi `./bundel.js` agar berjalan di root (`/`) maupun subpath GitHub Pages (`/tiny-swords-warcraft-rts/`).
- **Deteksi server LAN saat boot (`packages/client/src/main.ts`)**:
  - Saat boot, lakukan `fetch('./alamat')` dan periksa `res.ok` serta `content-type` bertipe `application/json`.
  - Jika berhasil (dijalankan lewat server Node lokal `npm run dev` / `npm run mulai`): tampilkan alamat LAN asli dan aktifkan `pastikanLan()` (WebSocket `/ws`) seperti semula.
  - Jika gagal / 404 (dijalankan di GitHub Pages statis): **jangan** panggil `pastikanLan()` sehingga **0 error WebSocket** dan **0 spam toast reconnect**; panggil `lobi.setModeStatis()` yang menonaktifkan tombol Buat/Gabung Room LAN dan menampilkan keterangan jelas bahwa Solo vs AI siap dimainkan penuh dan LAN 2 pemain aktif lewat server lokal (`npm run dev`).

### 3.2 Script Build Ramping & Deploy ke Branch `gh-pages`
- **`scripts/bangun-pages.mjs`**:
  - Menjalankan kompilasi & bundling (`npm run bangun`).
  - Merakit direktori bersih `dist-pages/` berisi hanya aset produksi:
    - `index.html`, `bundel.js`, `.nojekyll`, `public/font/PixelifySans.ttf`,
    - Seluruh berkas gambar yang direferensikan oleh `SEMUA` di `packages/aset/dist/index.js` (mempertahankan struktur folder persis sama, membuang `legacy/`, `node_modules/`, source TS, dan aset mentah tak terpakai).
  - Memverifikasi bahwa 100% file `SEMUA` hadir di `dist-pages/` sebelum selesai.
- **`package.json`**: menambah script `"bangun:pages": "node scripts/bangun-pages.mjs"` dan `"deploy:pages": "node scripts/deploy-pages.mjs"`.
- **`.gitignore`**: menambahkan `dist-pages/`.
- **Publikasi GitHub**:
  - Membuat repo publik **`ucup-baba/tiny-swords-warcraft-rts`** via `gh repo create` dan push branch `master`.
  - Mem-push isi `dist-pages/` sebagai commit bersih ke branch **`gh-pages`**.
  - Mengaktifkan GitHub Pages (`source.branch = "gh-pages"`, `source.path = "/"`) via `gh api` dan memverifikasi bahwa `https://ucup-baba.github.io/tiny-swords-warcraft-rts/` merespons HTTP 200 bersama `bundel.js` dan aset utamanya.

---

## 4. Rencana Pengujian

- **Tes Unit & UI (`vitest`)**:
  - Tes `packages/client/test/sentuh.test.ts` (jsdom): verifikasi Mode 1 (`tapPintar` pan, tap pilih, tap perintah, toggle kotak marquee, pinch zoom) dan Mode 3 (`joystick` vektor gerak kamera & seret 1 jari marquee) + persistensi `localStorage`.
  - Tes `packages/ui/test/menu.test.ts` & `hud.test.ts`: verifikasi tombol switcher `Tap Pintar` / `Joystick + Seret` di Menu Jeda, tombol `☰ Menu` & `⬚ Kotak` di HUD, serta `Lobi.setModeStatis()`.
- **Tes Integritas Build Statis**:
  - `npm run periksa` (typecheck + seluruh tes vitest + headless gate) lolos 100%.
  - `npm run bangun:pages` menghasilkan `dist-pages/` lengkap dengan 0 aset hilang & `./bundel.js` relatif.
- **Verifikasi Live GitHub Pages**:
  - Cek status build Pages (`gh api repos/ucup-baba/tiny-swords-warcraft-rts/pages`) dan verifikasi `curl -I` ke `https://ucup-baba.github.io/tiny-swords-warcraft-rts/`, `bundel.js`, dan sampel sprite aset mengembalikan `HTTP 200`.
