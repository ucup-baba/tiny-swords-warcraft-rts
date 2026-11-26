# Design Spec: Auto-Cari Resource, Pohon Tumbuh Lagi, Respawn Domba, Lingkaran Penanda Resource & Notifikasi Kekurangan Resource

**Tanggal:** 2026-11-26  
**Pendekatan:** Pendekatan A — Siklus Penuh di `sim` + Lingkaran Hover/Seleksi & Panel Inspeksi Resource + Tombol `.terkunci` Ber-Notif  
**Cakupan Paket:** `packages/sim`, `packages/render`, `packages/ui`, `packages/client`

---

## 1. Tujuan

Menyempurnakan rasa manajemen ekonomi Warcraft III di PC maupun Mobile dengan 5 perbaikan terpadu:

1. **Pawn otomatis mencari resource berikutnya** dalam radius luas saat pohon, tambang, domba, atau daging yang sedang dipanen habis.
2. **Pohon dapat tumbuh kembali** dari tunggul pohon resmi (`Tree.png` `r2c0`) setelah ~75 detik selama tidak tertimpa bangunan.
3. **Respawn domba ("mbek") berkelanjutan** dari **Castle** (hingga 4 ekor, jeda 25 detik) dan tiap **House** aktif (hingga +2 ekor, jeda 30 detik).
4. **Lingkaran penanda & inspeksi resource** (pohon, tunggul, tambang emas, domba, daging jatuh) saat *hover* di PC maupun saat diklik/di-tap di PC & HP, lengkap dengan sisa stok di panel bawah.
5. **Notifikasi toast spesifik saat kekurangan resource / syarat belum terpenuhi** ketika pemain mengklik kartu `Bangun`, `Pasukan`, `Hero`, atau `Riset` yang terkunci.

---

## 2. Bagian 1 — Simulasi Ekonomi & Regenerasi (`packages/sim`)

### 2.1 Auto-Cari Resource Habis (`packages/sim/src/sistem/pekerja.ts`)
- Menambah konstanta radius pencarian otomatis:
  - `RADIUS_AUTO_KAYU = 950` (~15 tile)
  - `RADIUS_AUTO_GOLD = 1150` (~18 tile)
  - `RADIUS_AUTO_DAGING = 950` (~15 tile)
- Menambah fungsi deterministik `cariSumberBerikut(dunia, u, jenis, asalX, asalY)`:
  - Mencari objek terdekat (`dunia.pohon` untuk `'kayu'`, `dunia.tambang` untuk `'gold'`, prioritas `dunia.daging` lalu `dunia.domba` untuk `'daging'`) yang jaraknya dari titik acuan `(asalX, asalY)` (atau `castleTerdekat`) `<= radius` yang sesuai.
  - Dipanggil di dua momen:
    1. **Saat tiba di target yang keburu habis** (`panenPohon`, `panenTambang`, `panenDomba`, `pungutDaging` ketika `targetId` tidak ditemukan lagi) → langsung beralih ke sumber sejenis terdekat dalam radius, tidak langsung `diam`.
    2. **Setelah setor ke Castle (`antarPulang`)** bila `targetId` lama sudah habis / null (mis. setelah pohon tumbang, tambang habis, atau memanen domba/daging) → langsung lanjut ke sumber sejenis terdekat dalam radius! Baru berhenti `diam` jika memang tidak ada sumber sejenis dalam radius tersebut.
- Memperbarui `ekonomi.test.ts` pada kasus domba agar memeriksa `daging >= dagingAwal + PANEN.dagingDomba` (karena Pawn kini otomatis melanjutkan ke domba/daging berikutnya dalam radius 950 px).

### 2.2 Pohon Tumbuh Lagi via `dunia.tunggul` (`tipe.ts`, `dunia.ts`, `pekerja.ts`, `halangan.ts`)
- Menambah interface `Tunggul { id: number; x: number; y: number; sisaTumbuh: number }` dan array `tunggul: Tunggul[]` pada `Dunia`.
- Saat `pohon.kayu <= 0` di `panenPohon`:
  - Pohon dihapus dari `dunia.pohon` (sehingga halangan tile langsung terbuka & konsisten dengan tes `pohon habis dibuang dari peta`).
  - Sebuah `Tunggul` dimasukkan ke `dunia.tunggul` pada `(pohon.x, pohon.y)` dengan `sisaTumbuh = 75` detik.
- Saat bangunan baru diletakkan (`buatBangunan`), tunggul yang berada di dalam tapak bangunan dihapus agar pohon tidak tumbuh menembus bangunan.
- Di `langkah()` (`dunia.ts`), setiap tick `t.sisaTumbuh -= DT_TETAP`:
  - Ketika `<= 0`: cek apakah tile `(t.x, t.y)` bebas dari bangunan (`!terhalangTile`) dan tidak ada unit tepat di titik batang (`jarak < 36`).
  - Jika sedang ada unit berdiri tepat di atas tunggul, tunda `5` detik; jika bebas, hapus tunggul, tambahkan `Pohon { id, x, y, kayu: 120 }` ke `dunia.pohon`, dan panggil `segarkanHalangan(dunia)`.

### 2.3 Respawn Domba dari Castle & House (`packages/sim/src/sistem/bangunan.ts`)
- Memperluas `langkahDomba(dunia, b)` agar aktif pada **`castle`** maupun **`house`** (`fase === 'aktif'`):
  - **`castle`**: `jeda = 25` detik, batas `4` domba dalam radius `320 px`.
  - **`house`**: `jeda = 30` detik, batas `2` domba dalam radius `260 px`.
- Domba baru dimunculkan di titik bebas (`posisiBebasDekat`) pada jarak `95..210 px` dari bangunan menggunakan `buatDomba()` sehingga langsung dapat berjalan-jalan deterministik.

### 2.4 Sinkronisasi LAN (`packages/sim/src/snapshot.ts`)
- Menyertakan `kayu` pada `Snapshot.pohon`, `gold` pada `Snapshot.tambang`, `daging` pada `Snapshot.domba`, serta daftar `tunggul: { id, x, y, sisaTumbuh }[]` agar Guest LAN melihat sisa stok resource dan tunggul pohon secara akurat.

---

## 3. Bagian 2 — Lingkaran Penanda & Inspeksi Resource (`packages/render`, `packages/client`, `packages/ui`)

### 3.1 Identifikasi Resource yang Disorot / Dipilih
Menambah tipe ringan `SumberTerpilih = { jenis: 'pohon' | 'tunggul' | 'tambang' | 'domba' | 'daging'; id: number }` pada `KeadaanInput` (`sumberTerpilih: SumberTerpilih | null`, `sumberHover: SumberTerpilih | null`) dan `OpsiGambar` di `entitas.ts`:
- Fungsi `sumberDiTitik(dunia, x, y)` di `packages/client/src/input.ts` memeriksa klik/hover pada `pohon` (radius 44), `tambang` (radius 64 untuk `mine`, 42 untuk `stone`), `domba` (radius 34), `daging` (radius 34), dan `tunggul` (radius 32).

### 3.2 Visual Lingkaran Penanda & Tunggul di Renderer (`packages/render/src/entitas.ts`)
- **Tunggul pohon (`dunia.tunggul`)**: dirender memakai `SUMBER.pohon` frame `8` (`r2c0` — tunggul resmi `Tree.png`!).
- **Lingkaran Hover (`opsi.hoverSumber`)**: saat kursor melayang di atas pohon, tambang, domba, atau daging:
  - Menggambar **lingkaran sorot putus-putus** di dasar objek: hijau `#6ff088` (pohon), emas `#ffd86b` (tambang), merah muda `#ff9eb5` (domba/daging), cokelat muda `#d4b07a` (tunggul).
  - Menggambar **pill label kecil di atas objek** menampilkan sisa stok (`120 Kayu`, `3500 Gold`, `45 Daging`, atau `Tumbuh 42s`).
- **Lingkaran Seleksi (`opsi.terpilihSumber`)**: saat resource diklik (PC) atau di-tap (HP, ketika tidak sedang memerintah unit):
  - Menggambar **lingkaran seleksi solid** di dasar objek (persis gaya lingkaran unit/bangunan) + label sisa stok.
- **Kursor kontekstual (`main.ts`)**: saat Pawn terpilih dan kursor melayang di atas resource (pohon/tambang/domba/daging), kursor berubah ke `kursor03` (aksi kerja) sebagai pertanda klik kanan siap panen!

### 3.3 Inspeksi Resource di Panel Seleksi Bawah (`packages/ui/src/hud.ts`)
- Memperluas `perbaruiSeleksi(...)` menerima parameter opsional `sumberTerpilih: SumberTerpilih | null`:
  - Menampilkan potret resource (`potongSprite` untuk `pohon`, `tambang`, `domba`, `daging`), judul (`Pohon Pinus`, `Tambang Emas`, `Batu Emas`, `Domba Ternak`, `Daging Medan Perang`, `Tunggul Pohon`), **HP/kapasitas bar** (`120 / 120 Kayu`, `3500 / 3500 Gold`, `45 / 45 Daging`, atau progres tumbuh `%` untuk tunggul), serta petunjuk singkat di zona tengah (`Pilih Pawn lalu klik kanan / tap di sini untuk memanen`).

---

## 4. Bagian 3 — Notifikasi Kekurangan Resource & Syarat Produksi (`packages/ui`, `packages/client`)

- **Tombol `.terkunci` tetap bisa diklik**:
  - Pada kartu `Bangun`, `Pasukan`, `Hero`, dan tombol `Riset Kontekstual` di [hud.ts](file:///home/server/project/Me/hope%20for%20the%20future./packages/ui/src/hud.ts), mengganti `b.disabled = o.mati` menjadi kelas CSS `.terkunci` + `aria-disabled="true"` (tampilan redup `UI.tombolMati` sama persis, tetapi klik tidak ditelan browser!).
  - Untuk tombol riset yang sudah `MAKS` (`3/3`) atau sedang berjalan, tetap menampilkan info rapi saat diklik (`"Riset Senjata Tajam sudah tingkat maksimum!"` / `"Sedang meneliti Senjata Tajam..."`).
- **Pesan Toast Spesifik & Jelas (`packages/client/src/main.ts` + helper `alasanGagal...`)**:
  - **Bangun**: jika Gold/Kayu kurang → `"Kurang 40 Gold, 30 Kayu untuk membangun Barracks!"`.
  - **Latih Pasukan**:
    1. Belum punya bangunan aktif (`Barracks`/`Archery`/`Monastery`) → `"Bangun Barracks dulu untuk melatih Pedang!"`
    2. Antrean semua bangunan cocok penuh (`5/5`) → `"Antrean Barracks penuh (maks 5)!"`
    3. Populasi penuh (`supplyTerpakai + popUnit > supplyMaks`, memperhitungkan unit dalam antrean) → `"Populasi penuh (18/18) — bangun House dulu!"`
    4. Gold / Kayu / Daging kurang → `"Kurang 25 Gold, 10 Daging untuk melatih Pedang!"`
  - **Riset**: jika sedang meneliti, sudah MAKS, atau kurang Gold/Kayu → `"Kurang 60 Gold, 30 Kayu untuk riset Senjata Tajam!"`.
  - **Bangkitkan Hero**: jika belum punya Altar atau kurang Gold/Daging → `"Kurang 80 Gold, 20 Daging untuk membangkitkan Hero!"`.
- **Toast Peringatan Merah**: `tampilkanToast(pesan, peringatan = false)` memberi varian visual pita merah (`UI.pitaRed`) untuk notifikasi kekurangan/gagal agar langsung kontras dan terbaca cepat dibanding toast info kuning biasa.

---

## 5. Rencana Pengujian

- **Tes Simulasi (`packages/sim/test/resource-loop.test.ts`)**:
  - Pawn otomatis pindah ke pohon terdekat berikutnya dalam radius `950 px` setelah pohon pertama tumbang, dan berhenti jika tidak ada pohon dalam `950 px`.
  - Pohon yang habis menghasilkan `Tunggul` di `dunia.tunggul`, lalu tumbuh kembali ke `dunia.pohon` setelah `75` detik (dan dibatalkan bila ditimpa bangunan).
  - Castle respawn domba hingga 4 ekor dalam jeda 25 detik dan House menambah +2 domba dalam jeda 30 detik.
  - Determinisme (`hashDunia`) tetap 100% identik di 2 run.
- **Tes UI (`packages/ui/test/hud.test.ts`)**:
  - Kartu `.terkunci` tetap memanggil handler saat diklik agar client dapat memunculkan notif kekurangan resource.
  - Memilih `sumberTerpilih` (`pohon`/`tambang`/`domba`/`tunggul`) menampilkan nama & bar sisa stok di `#seleksi`.
- **Gerbang Penuh**: `npm run periksa` (semua vitest + typecheck + headless gate), `N=8 MAKS=25 node scripts/uji-seimbang.mjs`, lalu `npm run deploy:pages` untuk memperbarui versi live di GitHub Pages!
