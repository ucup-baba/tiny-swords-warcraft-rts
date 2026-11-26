# Design Spec: Animasi Lengkap, Anti-Tembus Bangunan, Layar Tetap 1280×720, & UI Warcraft III

**Tanggal:** 2026-11-26  
**Pendekatan:** Pendekatan A — Event-Driven Simulasi + Occupancy Grid A\* + Stage Tetap `1280×720`  
**Cakupan Paket:** `packages/aset`, `packages/sim`, `packages/render`, `packages/ui`, `packages/client`, `packages/server`

---

## 1. Tujuan & Masalah yang Diselesaikan

Menyambungkan seluruh sistem Warcraft III yang baru dibangun di `packages/sim` (`riset`, segitiga counter `tempur`, `rally`) ke pengalaman bermain penuh, sekaligus membereskan 8 kekurangan nyata dari sesi uji main:

1. **Animasi belum hidup**: Unit hanya memutar `idle` dan `lari` — belum ada animasi serang, menebang pohon, menambang emas, membangun, memikul resource di atas kepala, arah hadap akurat, serta domba berjalan/melompat. Selain itu ditemukan bug frame kosong pada `Archer` (`r0`/`r1` hanya 6/8 frame), `Torch`/`TNT` (6/7 frame), dan salah dimensi pada `Barrel_Red.png` (`128×128` 6×6, bukan `192×192` 4×4).
2. **Unit masih menembus bangunan, tambang, dan pohon**: A\* (`jalur.ts`) dan gerak lurus (`gerak.ts`) hanya memeriksa air & tebing, belum menandai tapak bangunan/tambang/pohon sebagai penghalang.
3. **Ikon sumber daya & kursor tampak terlalu kecil**: `G_Idle`/`W_Idle`/`M_Idle` (`128×128`) dan `Cursor_01..03` (`64×64`) memiliki ruang transparan besar di sekeliling gambarnya, sehingga saat dirender tanpa crop ke bounding-box tampilannya menyusut jadi ~8–15 px.
4. **Scrollbar muncul di layar kecil/pendek & memotong tab**: Layout `100vh` fleksibel memunculkan scrollbar putih horizontal/vertikal di sidebar dan memotong tab `Hero`.
5. **Fitur `sim` belum terhubung ke pemain manusia**: Riset 3 tingkat (`Senjata Tajam`, `Baju Zirah`, `Busur Lentur`, `Fokus Arkana`), ringkasan counter armor/serangan, dan Rally Point bangunan baru dipakai AI.
6. **Flag tentara belum ada**: Belum ada visual bendera Rally Point pada bangunan maupun bendera penanda perintah sementara di tanah saat klik kanan pindah/serang.
7. **Tab per unit & HUD Warcraft III belum lengkap**: Belum ada barisan filter cepat per peran unit yang dinamis (tersembunyi bila jumlah = `0`), Command Card (`Serang [A]`, `Stop [S]`, `Tahan [H]`, `Skill [Q]`), progres pelatihan/riset/revive ala Warcraft (sapuan gelap→cerah + `%`), angka nyawa melayang (`-DMG` / `+HEAL`), serta pemisahan kamera dari `A`/`S`.

---

## 2. Bagian 1 — Simulasi, Tabrakan, Domba & LAN (`packages/sim` + `packages/server`)

### 2.1 Peta Halangan Dinamis (*Occupancy Grid*) & *Unit Separation*
- Menambah modul `packages/sim/src/halangan.ts` yang mengelola bitmask `Uint8Array` berukuran `terrain.kolom * terrain.baris` (`96×96`):
  - **Bangunan (`fase !== 'hancur'`)**: menandai tapak persegi di sekitar `(b.x, b.y)` menggunakan proporsi tapak dasar (`±def.w * 0.38` horizontal, `[-def.h * 0.28, +def.h * 0.14]` vertikal agar unit masih bisa melintas rapi di belakang atap namun tidak menembus badan bangunan).
  - **Tambang (`dunia.tambang`)**: menandai tile pusat tambang (`±42 px` untuk `mine`, `±24 px` untuk `stone`).
  - **Pohon (`dunia.pohon`)**: menandai tile batang pohon (`keTile(p.x), keTile(p.y)`).
  - `halangan` diturunkan secara deterministik dari entitas `dunia` (dibangun saat `buatDunia`, diperbarui lewat `tandaiHalangan(dunia)` ketika bangunan mulai dibangun, bangunan hancur, pohon habis ditebang, atau tambang habis) — tidak masuk `hashDunia` karena sepenuhnya turunan deterministik.
- **`jalur.ts` & `gerak.ts`**:
  - `cariJalur(terrain, halangan, ...)` memblokir tile yang bertanda `halangan[idx] !== 0`.
  - Jika titik tujuan `(kePxX, kePxY)` berada di tile terhalang (mis. Pawn disuruh menebang pohon, menambang, membangun, atau pasukan menyerang bangunan), `cariJalur` otomatis memilih **tile bebas terdekat di tepi objek** yang bisa dicapai dari arah unit.
  - `langkahLurusSah` memeriksa baik `bolehLangkah(terrain)` maupun `halangan[idx] === 0`; jika terhalang, unit otomatis beralih ke A\*.
  - Saat unit berada tepat di dalam tile terhalang (mis. baru lahir di sebelah bangunan atau bangunan baru ditaruh), gerak keluar menuju tile bebas terdekat tetap diizinkan agar unit tidak pernah terperangkap.
  - **Jangkauan tepi objek**: `JANGKAUAN_PANEN` (pohon/tambang), `bangun`/`perbaiki`, dan `serang` bangunan memperhitungkan radius tapak target (`def.radius` bangunan atau `40 px` tambang) sehingga unit bisa bekerja/menyerang dari tepi luar tapak terhalang.
  - **Pemisah antar-unit (*Unit Separation*)**: fungsi ringan `pisahUnit(dunia)` di akhir tick mendorong lembut pasangan unit yang jaraknya `< 24 px` selama posisi hasil tidak melanggar tebing/air/halangan.

### 2.2 State Animasi & Arah Hadap di `Unit`
Menambah 3 field di interface `Unit` ([tipe.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/sim/src/tipe.ts)):
- `arah: 1 | -1` — default `1` (kanan), diperbarui setiap kali `majuLurus` bergerak (`dx < -0.5` → `-1`, `dx > 0.5` → `1`) dan setiap kali menyerang/memanen/membangun menghadap ke koordinat target (`target.x < u.x` → `-1`).
- `aksi: AksiUnit` — union `'diam' | 'lari' | 'serang' | 'tebang' | 'tambang' | 'bangun' | 'bawaDiam' | 'bawaLari'`.
- `tikAksi: number` — hitungan mundur (detik) pengunci animasi serang (`0.45s`) atau ayunan kerja supaya animasi pukul/panah/heal selesai terlihat mulus di renderer & snapshot 15 Hz LAN.
- `sudutSerang: number` — sudut radian ke target saat terakhir menyerang (digunakan Archer memilih baris bidik atas/horizontal/bawah).

Aturan transisi `u.aksi` per tick:
- Jika `tikAksi > 0`: pertahankan `aksi` sekarang sampai timer habis (kecuali unit berganti tugas pindah).
- Saat `performAttack` / `tembak` / `sembuhkan` / `pakaiSkill`: set `aksi = 'serang'`, `tikAksi = 0.48`.
- Saat Pawn dalam jangkauan panen pohon: `aksi = 'tebang'`; tambang: `aksi = 'tambang'`; bangun/perbaiki: `aksi = 'bangun'`.
- Saat Pawn memiliki `bawaanJenis !== null`: jika bergerak → `'bawaLari'`, jika berhenti → `'bawaDiam'`.
- Selain itu: jika berpindah posisi pada tick ini → `'lari'`, selainnya → `'diam'`.

### 2.3 Domba Berjalan Deterministik
Memperluas `Domba` di [tipe.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/sim/src/tipe.ts):
- Tambah `asalX`, `asalY`, `tx`, `ty`, `jedaJalan`, `arah: 1 | -1`, `bergerak: boolean`.
- Modul `packages/sim/src/sistem/domba.ts` dipanggil di `langkah()` memakai `dunia.rng`: setiap `2.5–5.5` detik domba memilih titik acak dalam radius `110 px` dari `(asalX, asalY)` yang lolos `bisaDilewati` + `!halangan`, berjalan lambat (`36 px/detik`) sampai tiba, lalu berhenti merumput.

### 2.4 Event Angka Nyawa & Sinkronisasi LAN
- Menambah 3 varian ke `Kejadian` ([tipe.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/sim/src/tipe.ts)):
  - `{ jenis: 'unitLuka'; id: number; tim: Tim; x: number; y: number; jumlah: number }`
  - `{ jenis: 'unitSembuh'; id: number; tim: Tim; x: number; y: number; jumlah: number }`
  - `{ jenis: 'bangunanLuka'; id: number; tim: Tim; x: number; y: number; jumlah: number }`
- `lukaiUnit`, `sembuhkan`, `tambahXp` (heal naik level), dan `lukaiBangunan` memancarkan kejadian tersebut dengan angka bulat `Math.max(1, Math.round(jumlah))`.
- **[snapshot.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/sim/src/snapshot.ts)**: menyertakan `arah`, `aksi`, `tikAksi`, `sudutSerang` pada unit; `bergerak`, `arah` pada domba; `riset` pada `tim` & `bangunan`; serta kejadian `unitLuka`/`unitSembuh`/`bangunanLuka` yang lolos filter Fog of War (`terlihatDi`).
- **[perintah.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/sim/src/perintah.ts)** & **[protokol.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/server/src/protokol.ts)**: memastikan perintah `riset` dan `rally` tervalidasi ketat untuk Host maupun Guest LAN (termasuk batas panjang/tipe properti di `pesanSah`).

---

## 3. Bagian 2 — Renderer, Animasi, Flag Tentara & Angka Melayang (`packages/aset` + `packages/render`)

### 3.1 Perbaikan Manifes & Mapping Baris Sprite Terverifikasi
Di [manifes.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/aset/src/manifes.ts) & [entitas.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/render/src/entitas.ts):
- Memperbaiki `GOBLIN.barrel`: `fw: 128, fh: 128, kolom: 6, baris: 6` (sebelumnya `192×192 4×4` yang memotong tubuh barrel).
- Menambahkan dukungan jumlah frame aktif per baris (`frameBaris`) agar frame kosong di ujung baris tidak pernah diputar:
  - **Pawn (`6×6`, `192×192`)**: `r0` (6f) diam, `r1` (6f) lari, `r2` (6f) palu (bangun/tambang/perbaiki), `r3` (6f) kapak (tebang), `r4` (6f) bawa diam, `r5` (6f) bawa lari. Saat `u.bawaanJenis !== null`, menggambar sprite resource (`G_Idle` / `W_Idle` / `M_Idle`) tepat di atas tangan Pawn (`y - 52`).
  - **Warrior (`6×8`, `192×192`)**: `r0` (6f) diam, `r1` (6f) lari, `r2` (6f) tebas horizontal.
  - **Archer (`8×7`, `192×192`)**: `r0` (6f) diam, `r1` (6f) lari, `r2`/`r3`/`r4`/`r5`/`r6` (8f) menembak sesuai `sudutSerang` (atas / serong atas / lurus / serong bawah / bawah).
  - **Lancer**: `lancerIdle`, `lancerLari`, `lancerSerang`.
  - **Monk**: `monkIdle`, `monkLari`, `monkSembuh`.
  - **Mage**: `mageIdle`, `mageLari`, `mageSerang`.
  - **4 Hero**: `idle`, `lari`, `serang`.
  - **Goblin**: `Torch` (`r0`: 7f diam, `r1`: 6f lari, `r2`: 6f serang api), `TNT` (`r0`: 6f diam, `r1`: 6f lari, `r2`: 7f lempar dinamit), `Barrel` (`r0`: diam, `r1`: lari, `r2`: serang).
- **Domba**: memakai `SUMBER.dombaLompat` (`HappySheep_Bouncing.png`) + flip `o.arah < 0` saat `o.bergerak === true`, dan `SUMBER.dombaDiam` saat diam.
- **Arah hadap**: `balik = u.arah < 0` dipakai konsisten untuk semua unit, hero, pawn, dan goblin.
- **Konstruksi bangunan**: selain `Castle`/`House`/`Tower` resmi, menambahkan mapping `Barracks`/`Archery`/`Monastery`/`Altar` Construction & Destroyed dari `custom_assets/Buildings/` ke `BANGUNAN_FASE` agar tidak memakai sprite rumah generik saat dibangun/hancur.

### 3.2 Flag Tentara (2 Jenis)
1. **Bendera Rally Point Bangunan** (digambar di `entitas.ts` saat `opsi.terpilihBangunan === b.id` dan bangunan aktif dapat melatih unit):
   - Garis putus-putus emas menghubungkan `(b.x, b.y)` ke `(b.rallyX, b.rallyY)`.
   - Tiang kayu + kain bendera berkibar bergaya pixel-art (biru untuk `blue`, merah untuk `red`) tertancap di `(b.rallyX, b.rallyY)` dengan cincin dasar.
2. **Bendera Penanda Perintah di Tanah** (dikelola di `packages/render/src/efek.ts`):
   - Dipicu oleh client setiap kali pemain memberi perintah klik kanan `pindah` (bendera hijau/biru), `serang` / `serangPindah` (bendera merah + cincin target), atau `rally` (bendera emas).
   - Animasi tancap singkat (`0.15s` turun memantul) lalu berkibar & memudar habis dalam `1.1s`.

### 3.3 Angka Nyawa Melayang (*Floating Combat & Resource Text*)
Dikelola di `packages/render/src/efek.ts` sebagai daftar teks melayang ringan yang dipicu dari `dunia.kejadian`:
- `unitLuka` / `bangunanLuka`: `-24` (merah terang `#ff6b6b` untuk tim sendiri, kuning-oranye `#ffd86b` untuk musuh), naik perlahan `28 px` selama `0.85s` dengan outline hitam tebal 3 px agar tajam di atas rumput.
- `unitSembuh`: `+35` (hijau cerah `#6ff088`).
- `sumberDayaMasuk`: `+15g` / `+12k` / `+18d` berwarna emas / kayu / merah muda di atas titik setor/pungut.
- `heroNaikLevel`: `NAIK LEVEL!` emas di atas Hero.

---

## 4. Bagian 3 — Layar Tetap `1280×720`, UI Warcraft III, Tab Per Unit, Riset & Kontrol (`packages/ui` + `packages/client`)

### 4.1 Layar Resolusi Tetap `1280×720` (Nol Scrollbar)
- Membungkus `#akar` di dalam `#bingkai-layar` (`position: fixed; inset: 0; background: #14100c; overflow: hidden; display: grid; place-items: center;`).
- `#akar` memiliki ukuran tetap **`width: 1280px; height: 720px; transform-origin: center center;`** dan diskalakan secara real-time saat `load` & `resize` dengan `skala = Math.min(window.innerWidth / 1280, window.innerHeight / 720)`.
- Area peta `#panggung` berukuran pas **`976×720`** dan sidebar kanan `#sisi` **`304×720`** — semua komponen (`minimap 184px`, `4 sumber daya`, `3 tab`, `kisi kartu 2×4`, `panel bawah`) didesain dengan tinggi eksak yang totalnya `≤ 720px` sehingga **tidak pernah memunculkan scrollbar** di resolusi monitor mana pun.
- **Konversi koordinat mouse & kursor**: `client.ts` membagi koordinat relatif terhadap `panggung.getBoundingClientRect()` dengan faktor `skala` (atau proporsi `976 / rect.width`) sehingga klik, marquee drag, hover, minimap, dan posisi `#kursor` tetap akurat 1:1 di seluruh ukuran layar.

### 4.2 Perbaikan Ikon Sumber Daya & Kursor Besar Tajam
- **Ikon sumber daya**: menggunakan `potongSprite()` (trim otomatis ke bounding-box non-transparan, sama seperti potret kartu) untuk `G_Idle`, `W_Idle`, `M_Idle`, dan `House`, ditampilkan pada ukuran **`26×26 px`** dengan `image-rendering: pixelated` sehingga ikon emas, kayu, daging, dan populasi langsung besar, jelas, dan tajam.
- **Kursor kustom**: `Cursor_01..04` di-crop ke bounding-box non-transparan saat boot dan dirender pada ukuran efektif **`40×44 px`** (naik ~2.5× dari ukuran efektif ~15 px sebelumnya) dengan offset hotspot tepat di ujung panah/tangan.

### 4.3 Tab Per Unit Dinamis (Sembunyi Saat Jumlah 0)
- Dipasang tepat di atas panel seleksi bawah (`#tab-unit`), rata kiri-tengah, melayang tipis tanpa menghalangi peta.
- Urutan tombol: `Semua` (semua pasukan tempur, muncul bila total tentara `> 0`), diikuti per peran (`Pawn`, `Pedang`, `Panah`, `Tombak`, `Monk`, `Mage`, `Hero`).
- **Aturan tampil**: tombol suatu peran **hanya dirender/ditampilkan bila pemain memiliki `≥ 1` unit peran tersebut**; begitu semua unit peran itu gugur (`0`), tabnya langsung hilang.
- Setiap tombol menampilkan **ikon crop unit + jumlah** (mis. ikon Pedang `4`), dengan highlight emas bila seleksi aktif saat ini seluruhnya adalah peran tersebut; 1 klik langsung memilih semua unit peran itu.

### 4.4 Panel Seleksi Bawah ala Warcraft III (Kontekstual)
Tinggi tetap `116px` di bagian bawah `#panggung` (`956px` lebar), terbagi 3 zona rapi (teks kontras tinggi: judul emas/cokelat tua di atas panel yang jelas dibaca):
1. **Zona Kiri — Potret & Stat**: Potret unit/bangunan + bar HP + angka `HP 150/150` + stat serangan/baju (`Tebas • Berat` atau `Hero Lv 2 • XP 65%`).
2. **Zona Tengah — Isi Kontekstual**:
   - **Banyak unit terpilih**: grid ikon mini unit terpilih dengan mini-bar HP (klik salah satu untuk fokus ke unit itu; klik sambil tahan Shift untuk buang).
   - **Bangunan aktif terpilih (`Castle`/`Barracks`/`Archery`/`Monastery`/`Altar`)**:
     - **Progres Pelatihan / Riset / Revive ala Warcraft III**: ikon unit/riset yang sedang diproses ditutupi **lapisan gelap yang menyapu turun→naik (gelap menjadi cerah) seiring progres**, disertai **progress bar** dan angka persentase **`65%`** + daftar slot antrean berikutnya (klik slot antrean untuk membatalkan pelatihan lewat perintah `batalLatih`).
3. **Zona Kanan — Command Card / Riset Kontekstual**:
   - **Unit terpilih**: tombol 2×2 — `Serang [A]`, `Stop [S]`, `Tahan [H]`, dan `Skill [Q]` (khusus Hero; tombol skill menampilkan **sapuan gelap→cerah cooldown + sisa detik `7s`**).
   - **Bangunan riset terpilih (`Barracks`/`Archery`/`Monastery`)**: tombol **Riset Kontekstual** (Pilihan 2):
     - Barracks → `Senjata Tajam (Lv 0/3)` & `Baju Zirah (Lv 0/3)`
     - Archery Range → `Busur Lentur (Lv 0/3)`
     - Monastery → `Fokus Arkana (Lv 0/3)`
     - Menampilkan biaya (`100g 60k`), progres `%` saat sedang diriset, dan label `MAKS` saat mencapai Lv 3.
   - **Bangunan produksi terpilih**: petunjuk singkat `Klik kanan peta: pasang Rally Point`.

### 4.5 Sidebar Kanan (`304×720`, 0 Scrollbar) & Info Counter
- Tetap 3 tab (`Bangun`, `Pasukan`, `Hero`) dengan 2 kolom kartu kompak sehingga seluruh 7 bangunan (termasuk `Altar of Heroes` & `Castle`), 6 unit, atau status Hero + tombol Revive muat tanpa scroll.
- Kartu unit di tab `Pasukan` menampilkan **badge counter ringkas** dari `ringkasCounter()` (mis. `Tebas · Kuat vs Ringan`) serta **indikator sapuan gelap→cerah + `%`** langsung di kartu jika ada bangunan yang sedang melatih unit tersebut!

### 4.6 Perbaikan Kontrol Keyboard & Klik Kanan Rally
- **Pisahkan kamera dari `A`/`S`**:
  - Geser kamera memakai **Tombol Panah (`ArrowUp/Down/Left/Right`)**, **Edge Scroll** (tepi kanvas), dan **Drag Tombol Tengah Mouse (`button === 1`)**.
  - Hotkey komando murni ala Warcraft III: `A` = Attack-Move (tanpa menggeser kamera!), `S` = Stop (mengirim perintah `{ jenis: 'stop', ids }`), `H` = Hold, `Q` = Skill Hero, `F1` = Pilih Pawn, `F2` = Pilih Semua Pasukan, `Ctrl+1..4` / `1..4` = Grup kontrol, `Home` = Fokus Castle.
- **Klik Kanan Rally Point**: jika sebuah bangunan produksi sedang terpilih (dan tidak ada unit terpilih), klik kanan pada peta mengirim `{ jenis: 'rally', bangunanId, x, y }` dan menancapkan Bendera Rally Point baru.

---

## 5. Penanganan Kasus Tepi & Rencana Pengujian

- **Unit lahir / bangunan baru di dekat unit**: `langkahLurusSah` mengizinkan unit yang telanjur berada di dalam tile halangan melangkah keluar ke tile bebas terdekat; `spawnUnit` mencari titik bebas di luar tapak bangunan menuju arah Rally Point.
- **Anti-Desync LAN**: Semua perubahan `sim` (occupancy grid, domba jalan, aksi, kejadian luka/sembuh) 100% deterministik; `hashDunia` tetap lulus tes determinisme 2 run identik.
- **Pengujian Otomatis (`npm test`)**:
  - Tes unit `halangan` + A\* mengelilingi bangunan & pohon (unit tidak pernah melewati interior tapak bangunan).
  - Tes `domba` bergerak deterministik & tidak menembus tebing/bangunan.
  - Tes `aksi`/`arah` Pawn (tebang, tambang, bawa resource) & kejadian `unitLuka`/`unitSembuh`/`bangunanLuka`.
  - Tes validasi `riset` & `rally` di server LAN (`papan.test.ts`).
  - Tes UI jsdom untuk Tab Per Unit dinamis (sembunyi saat `0`, tampil saat `> 0`), Riset kontekstual di panel bawah, progres `%` pelatihan, dan Command Card.
- **Pengujian Keseimbangan (`scripts/uji-seimbang.mjs`)**: memastikan tabrakan bangunan & separation tidak memecah keseimbangan AI (durasi tetap sehat, 0 match rusak/macet).
- **Verifikasi Browser Nyata**: membuka game di browser pada resolusi berbeda (mis. `1280×720` & `1024×680`), memverifikasi 0 scrollbar, ikon & kursor besar tajam, animasi serang/tebang/tambang/bawa/domba jalan, unit memutar mengelilingi bangunan, bendera Rally Point & perintah tanah, angka HP melayang, progres pelatihan gelap→cerah `%`, Riset kontekstual di Barracks, dan Tab Per Unit dinamis.
