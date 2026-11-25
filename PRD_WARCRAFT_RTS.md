# Product Requirements Document (PRD)
## Tiny Swords: Warcraft RTS (LAN Edition)

**Versi:** 1.0  
**Genre:** Classic Real-Time Strategy (RTS) — Terinspirasi **Warcraft III** & **Command & Conquer / Red Alert** Command Sidebar  
**Gaya Visual:** 100% Pixel Frog *Tiny Swords* (Unit, Bangunan, Terrain, Efek Api/Ledakan, Kursor, Banner, Ribbon, Ikon, dan Panel Kayu/Perkamen)  
**Target Platform:** Web Browser (HTML5 Canvas 2D + Node.js HTTP/WebSocket LAN Server)

---

## 1. Visi & Tujuan Produk
Membangun game strategi real-time (**RTS**) bergaya **Warcraft klasik** yang autentik, responsif, dan siap dimainkan 2 pemain lewat jaringan Wi-Fi/LAN lokal dengan memanfaatkan seluruh aset resmi **Tiny Swords** (termasuk UI, banner, tombol, ikon, dan kursor mouse), ditambah **4 Hero legendaris**, **siklus bangunan (dibangun → aktif → terbakar → hancur menjadi puing)**, **ekonomi 3 resource (Kayu, Gold, Daging)**, **Minimap interaktif di kanan atas + Command Sidebar RTS**, serta **Multiplayer LAN 2 Pemain** yang mencontoh arsitektur server LAN di `/home/server/project/math-strike-kerja24c`.

---

## 2. Sistem Ekonomi & Resource (3 Sumber Daya + Supply)
Setiap faksi (**Blue Kingdom** dan **Red Empire**) mengelola 3 resource utama + Supply/Populasi:

| Resource | Ikon Resmi Tiny Swords | Cara Mendapatkan | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Wood (Kayu)** | `UI/Icons/Icon_02.png` (`W_Idle.png`) | Pekerja (**Pawn**) menebang pohon hutan (`Tree1`/`Tree2`) → membawa kayu (`Pawn_Run Wood`) ke Castle (`+12 Wood/trip`). | Membangun semua bangunan, melatih Archer, Guard Tower, & Hero Hall. |
| **Gold (Emas)** | `UI/Icons/Icon_03.png` (`G_Idle.png`) | Pekerja (**Pawn**) menambang **Gold Mine** (`GoldMine_Active.png`) atau **Gold Stone** → membawa emas (`Pawn_Run Gold`) ke Castle (`+15 Gold/trip`). | Melatih semua unit, bangunan tingkat lanjut, & memanggil Hero. |
| **Meat (Daging)** | `UI/Icons/Icon_04.png` (`M_Idle.png` / `M_Spawn.png`) | 1) **Ternak Domba**: Domba berkeliaran di padang rumput sekitar House & dipanen Pawn (`+22 Meat`).<br>2) **Medan Perang (Drop Daging saat Gugur)**: **Setiap kali prajurit musuh ATAU prajurit kita gugur**, mereka memutar animasi mati (`Dead.png`) dan **menjatuhkan Daging (`M_Spawn.png` → `M_Idle.png`)** di tanah yang dapat diambil oleh Pawn (`Pawn_Run Meat`) maupun dipungut Hero (`+18 Meat`)! | Biaya melatih seluruh pasukan & Hero kerajaan. |
| **Supply (Populasi)** | `UI/Icons/Icon_06.png` | **Castle** memberi `+10 Supply`; setiap **House** menambah `+8 Supply` (maks `50`). | Membatasi jumlah total pasukan & pekerja aktif. |

---

## 3. Faksi, Bangunan, & Siklus Hidup Bangunan
Semua bangunan memiliki **4 fase visual autentik**:
1. **Under Construction (`*_Construction.png`)**: Saat Pawn ditugaskan membangun di lokasi pilihan (dengan *ghost preview* hijau = valid / merah = terhalang + kursor `cursor_build.png` / `cursor_invalid.png`), bangunan muncul berupa kerangka konstruksi kayu (`15% HP`) dan naik hingga `100% HP` sambil Pawn memalu (`Pawn_Interact Hammer.png`).
2. **Active (`Buildings/{Blue|Red}/*.png`)**: Berfungsi penuh (melatih unit, menembak panah untuk Tower, menyimpan resource untuk Castle, menambah Supply + domba untuk House).
3. **Burning / Damaged (`Fire.png` 7-frame animated flames)**:
   - `< 65% HP`: 1 titik api menyala di atap/dinding.
   - `< 35% HP`: 2–3 titik api berkobar hebat.
   - Pawn dapat diperintahkan **Repair** (klik kanan pada bangunan rusak) untuk memadamkan api dan memulihkan HP (memakai sedikit Kayu).
4. **Destroyed (`*_Destroyed.png` + `Explosion_01/02.png`)**: Saat HP mencapai `0`, muncul ledakan besar + *screen shake*, bangunan berubah permanen menjadi **puing reruntuhan hangus**.

### Daftar Bangunan
| Bangunan | Biaya (Wood / Gold) | HP | Fungsi Utama | Aset Construction & Destroyed |
| :--- | :---: | :---: | :--- | :--- |
| **Castle (Town Hall)** | 220W / 250G | 1500 | Markas utama, drop-off resource, melatih **Pawn**, `+10 Supply`. Semua Castle hancur = Kalah! | Resmi Update 010 |
| **House (Farm House)** | 50W / 30G | 420 | Menambah **`+8 Supply`** & memunculkan 1 **Domba ternak**! | Resmi Update 010 |
| **Barracks** | 90W / 80G | 750 | Melatih **Warrior** (Pedang) dan **Lancer** (Tombak). | Dibuat khusus gaya Tiny Swords |
| **Archery Range** | 100W / 70G | 650 | Melatih **Archer** (Panah). | Dibuat khusus gaya Tiny Swords |
| **Monastery** | 110W / 120G | 700 | Melatih **Monk** (Penyembuh) dan **Mage** (Penyihir AoE). | Dibuat khusus gaya Tiny Swords |
| **Guard Tower** | 75W / 60G | 550 | Menara pertahanan otomatis menembak panah ke musuh dalam radius `340px`. | Resmi Update 010 |
| **Altar of Heroes** | 130W / 150G | 850 | Memanggil **4 Hero Legendaris**! | Dibuat khusus gaya Tiny Swords |

---

## 4. Daftar Unit Pasukan & 4 Hero Legendaris

### A. Pekerja & Pasukan Reguler
| Unit | Dilatih di | Biaya (G / W / M) | HP | DMG | Jarak | Peran |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Pawn** | Castle | 40G / 0W / 10M | 85 | 6 | 42 | Tebang kayu, tambang emas, kumpul daging, bangun & perbaiki bangunan. |
| **Warrior** *(Pedang)* | Barracks | 55G / 0W / 20M | 150 | 20 | 54 | Infanteri garis depan tangguh. |
| **Archer** *(Panah)* | Archery | 50G / 25W / 15M | 95 | 17 | 285 | Penyerang jarak jauh dengan anak panah. |
| **Lancer** *(Tombak)* | Barracks | 85G / 20W / 25M | 220 | 32 | 80 | Pasukan berat berjangkauan panjang & anti-kavaleri. |
| **Monk** *(Penyembuh)* | Monastery | 80G / 15W / 20M | 110 | +26 Heal | 195 | Menyembuhkan pasukan & Hero sekutu secara otomatis (`Heal_Effect`). |
| **Mage** *(Penyihir)* | Monastery | 95G / 20W / 25M | 105 | 28 AoE | 265 | Menembakkan bola sihir area (*splash damage*). |

### B. 4 Hero Legendaris (Blue & Red)
Setiap Hero memiliki HP besar, **XP & Level (`Lv 1–5`)** dari membunuh musuh, aura emas, serta **Skill Aktif (`[Q]` atau tombol Skill)**:
1. **Berserker — *Kael Kapak Ganda*** *(140G / 30W / 45M | HP 420 | DMG 38 | Speed 155)*  
   - **Skill `[Q]` — Whirlwind Cleave**: Serangan berputar ganda menghantam semua musuh di sekitar (`radius 125px`, `75 DMG` + dorong mundur).
2. **Paladin King — *Raja Aldric*** *(160G / 40W / 50M | HP 560 | DMG 32 | Speed 122)*  
   - **Skill `[Q]` — Royal Blessing**: Memulihkan `+110 HP` ke semua sekutu sekitar (`radius 210px`) + efek cahaya emas.
3. **Cavalry Knight — *Sir Gareth Berkuda*** *(175G / 45W / 55M | HP 480 | DMG 44 | Speed 195)*  
   - **Skill `[Q]` — Jousting Charge**: Menerjang ke depan dengan tombak menembus barisan musuh (`95 DMG` + *knockback* kuat).
4. **Greatsword Champion — *Torin Pedang Raksasa*** *(165G / 35W / 50M | HP 520 | DMG 48 | Speed 128)*  
   - **Skill `[Q]` — Titan Cleave**: Tebasan gelombang pedang raksasa (`radius 160px`, `85 DMG` + *screen shake*).

---

## 5. Kontrol Warcraft 100% & Sistem Seleksi Pasukan
- **Klik Kiri**: Memilih 1 unit atau 1 bangunan.
- **Drag Kotak Seleksi (Marquee Box)**: Tarik klik kiri untuk memilih semua unit milik kita dalam kotak hijau/emas.
- **Klik Ganda (Double-Click) Unit**: Otomatis memilih **semua unit bertipe sama** (misal double-click Warrior → semua Pedang terpilih).
- **Tombol Seleksi Cepat & Filter Pasukan**:
  - **`[F2]` Semua Pasukan**: Memilih seluruh pasukan tempur (non-pekerja).
  - **Filter Per Tipe**: Tombol instan untuk memilih **Semua Pedang (Warrior)**, **Semua Panah (Archer)**, **Semua Tombak (Lancer)**, **Semua Sihir (Monk/Mage)**, **Semua Hero**, dan **`[F1]` Pekerja** — plus klik kartu/ikon tipe di panel bawah untuk menyaring pilihan campuran langsung ke tipe tersebut!
- **Control Groups**: `Ctrl + 1..4` menyimpan grup pasukan; `1..4` memanggil grup (tekan 2× untuk memusatkan kamera).
- **Smart Right-Click**:
  - Tanah → **Move** (`Pointers/01.png` animasi panah target).
  - Musuh / Bangunan Musuh → **Attack Target**.
  - Pohon / Gold Mine / Gold Stone / Domba / Daging Jatuh / Bangunan Rusak (saat memilih Pawn) → **Gather / Build / Repair**.
  - **`[A]` + Klik Kiri** → **Attack-Move** (maju menyerang setiap musuh di jalur).
  - **`[S]`** → Stop, **`[H]`** → Hold Position, **`[Q]`** → Aktifkan Skill Hero terpilih.

---

## 6. UI/UX — 100% Aset Tiny Swords + Layout Sidebar RTS
- **Minimap Kanan Atas** (`banner_panel.png`): Menampilkan pulau, jembatan, sungai, pohon, Gold Mine, domba, daging jatuh, bangunan/unit Blue & Red, kedip serangan merah, dan kotak kamera. Klik kiri untuk loncat kamera; klik kanan untuk mengirim pasukan!
- **Command Sidebar Kanan** (`wood_panel.png` + `slot_wood.png` + `btn_blue/red.png` + `SmallRibbons`):
  - Panel 4 Resource (`Icon_03` Gold, `Icon_02` Wood, `Icon_04` Meat, `Icon_06` Supply).
  - 3 Tab Produksi: **Bangun (`Icon_01`)**, **Pasukan (`Icon_05`)**, **Hero (`Icon_06`)**.
- **Panel Seleksi Bawah** (`banner_panel.png` + `BigBar_Base/Fill` + `Human Avatars` / Hero `Portrait.png`) + Filter Pasukan + Command Card.
- **Kursor Resmi Tiny Swords**: `Cursor_01` (default), `Cursor_02` (interaksi/tombol), `Cursor_03` (area bangun terhalang), `Cursor_04`/`Icon_05` (serang), `Icon_01` (bangun).

---

## 7. Arsitektur LAN Multiplayer 2 Pemain (`lan-server.mjs`)
Mencontoh langsung arsitektur server LAN di `/home/server/project/math-strike-kerja24c`:
- **Server HTTP + WebSocket Node.js (`lan-server.mjs`)**:
  - `GET /alamat` (meniru `alamat-lan.ts`): mendeteksi alamat IPv4 Wi-Fi/LAN lokal (menyaring interface virtual `docker`, `br-`, `veth`, `virbr`, `vmnet`, `tun`, `tap`) dan mengembalikan URL siap salin (`http://192.168.x.x:8080`).
  - `GET /healthz`: mengembalikan `200 ok`.
  - **Papan Room LAN (`/ws`, RFC 6455)**:
    - Mendukung payload WebSocket `<126`, 16-bit (`126`), dan 64-bit (`127`) secara penuh.
    - Host (**Blue Kingdom**) membuat room → dapat **Kode Room 4 Huruf** dan langsung muncul otomatis di daftar **"Room LAN Aktif"** milik Guest (**Red Empire**) di jaringan yang sama.
    - **Authoritative Host Sync**: Host menjalankan simulasi 60 FPS dan mengirim snapshot terkompresi (`~15 Hz`) ke Guest; Guest mengirim perintah RTS (`player_cmd`) ke Host dengan latensi LAN minimal.
  - Juga tersedia mode **Solo vs AI (Skirmish)** langsung dari lobi!

---
---

# BAGIAN II — Tambahan PRD (Revisi 2.0)

> Bagian ini **menambah**, tidak mengganti, Bagian I (§1–§7). Di mana ada bentrok, **Bagian II yang menang** —
> bentrok yang diketahui ditandai dengan **[REVISI §x]**.
> Dasar: audit `docs/AUDIT_TAHAP_1.md` (2026-11-25).

---

## 8. Arsitektur Teknis & Struktur Repo **[REVISI §1: target platform]**

Implementasi berpindah dari satu file `game.js` (2.744 baris, IIFE) ke **monorepo TypeScript
npm-workspaces**, mengikuti bentuk `/home/server/project/math-strike-kerja24c`.

**Keputusan yang sudah diambil:** TypeScript, **bukan** Next.js, **bukan** Rust.
Next tidak memberi apa pun untuk RTS canvas (SSR/routing tak terpakai, React menekan HUD 60 fps).
Rust/WASM baru menang di >1.000 unit atau lockstep deterministik — tidak dibutuhkan untuk 2 pemain
authoritative-host, dan `wasm-pack` belum terpasang. Pintu Rust tetap terbuka lewat aturan §8.2.

### 8.1 Struktur paket

```
packages/
  shared/   protokol pesan LAN, konstanta, kelompokWifi, tipe bersama
  sim/      INTI: simulasi RTS deterministik. NOL DOM, NOL import ke render/ui
  aset/     manifes aset + definisi slicing sprite (divalidasi saat build)
  render/   renderer canvas2d: terrain, sprite, fx, minimap (baca state read-only)
  ui/       HUD / sidebar / lobby — TS + web component, bukan React
  net/      antarmuka Transport: LocalTransport | HostTransport | GuestTransport
  client/   komposisi: game loop, input, perekat sim+render+ui+net
  server/   http statis + papan room ws + alamat-lan (port dari math-strike)
public/assets/   Tiny Swords (Update 010) + (Free Pack) + custom_assets
docs/  scripts/
```

Toolchain: Node 20.x, npm workspaces, TypeScript 5.9, **vitest** (tes), **esbuild** (bundle).
Tanpa dependensi runtime di `sim` dan `shared`.

### 8.2 Aturan arsitektur (ini yang bikin "clean")

1. **Arah dependensi satu arah.** `server → shared`; `client → {sim, render, ui, net, aset, shared}`;
   **`sim` tidak bergantung pada apa pun selain `shared`.**
2. **`sim` haram menyentuh:** `document`, `window`, `Image`, `canvas`, `Date.now()`, `Math.random()`.
   Waktu masuk sebagai `dt` dari pemanggil; keacakan lewat RNG ber-seed yang di-inject.
3. **`sim` deterministik.** `seed + daftar command berurutan` → state akhir yang identik, selalu.
   Ini yang membuat replay dan debugging LAN mungkin.
4. **`render` dan `ui` hanya membaca** state `sim`; keduanya tidak pernah memutasinya.
   Satu-satunya jalan mengubah state adalah mengirim `Command`.
5. **Semua perubahan state lewat `Command`.** Sumbernya input lokal, AI, atau jaringan — jalurnya sama.
6. Pelanggaran aturan 1–2 **dijaga tes**, bukan niat baik (lihat AC-8.2).

### 8.3 Pintu keluar ke Rust

Karena `sim` murni dan berada di balik satu antarmuka, core-nya bisa ditukar ke Rust/WASM nanti
tanpa menyentuh `render`, `ui`, atau `net`. Itu keputusan terpisah, **bukan bagian dari Revisi 2.0.**

---

## 9. Peta: Ukuran, Elevasi, & Spawn **[REVISI §1 & §6]**

Masalah sekarang: peta 45×30 tile (2.880×1.920 px), satu pulau persegi + 3 kolom sungai, elevasi nol,
`drawTerrain()` hardcode indeks tile. Hasilnya datar dan monoton.

### 9.1 Ukuran

| Parameter | Lama | **Baru** |
| :--- | :---: | :---: |
| Ukuran tile | 64 px | 64 px (tetap) |
| Dimensi peta | 45×30 | **96×96 tile** |
| Dunia | 2.880×1.920 px | **6.144×6.144 px** (±11× luas) |

Konsekuensi teknis: terrain **wajib** dirender per-chunk dengan culling + di-cache ke offscreen
canvas per chunk (regenerate hanya saat tile berubah). Minimap di-render ke offscreen sekali lalu
di-blit, **bukan** digambar ulang tiap frame.

### 9.2 Elevasi — aset `Tilemap_Elevation.png` (Update 010, 256×512 = 4×8 tile)

Terrain disimpan sebagai **data**, bukan kode: tiap tile punya `{ height, surface, passable }`.

| Level | Nama | Isi |
| :---: | :--- | :--- |
| `0` | Air / Pantai | Laut, sungai, pantai. Tidak bisa dilewati kecuali jembatan |
| `1` | Dataran | Ketinggian dasar. Mayoritas peta, basis kedua pemain |
| `2` | Plateau | Tanah tinggi. Tepinya **cliff** — tidak bisa dipanjat |

- Tepi antar-level **auto-tile** memakai cliff set resmi + `Ground/Shadows.png` untuk bayangan tebing.
- **Ramp adalah satu-satunya jalan antar level.** Ini sumber chokepoint — penangkal utama "monoton".
- **Bonus tanah tinggi** (ala Warcraft III): unit di level lebih tinggi dari targetnya dapat
  **+15% jarak serang** dan **+1 tile jarak pandang**. Unit di level lebih rendah yang menyerang ke atas
  **tidak** dapat bonus. Nilai ini wajib ada di satu tempat (`sim/konstanta.ts`) agar bisa di-tuning.

### 9.3 Layout & Spawn (simetri rotasi 180°, bukan simetri cermin)

| Elemen | Posisi |
| :--- | :--- |
| Basis Blue | Kuadran barat-daya, level 1 |
| Basis Red | Kuadran timur-laut, level 1 (rotasi 180° dari Blue) |
| Jarak antar-basis | ≥ 70 tile (jalur terpendek berjalan kaki) |
| Gold Mine aman | 1 per pemain, ≤ 8 tile dari Castle, **tanpa** penjaga |
| Gold Mine ekspansi | 2 per pemain, 18–28 tile dari Castle, **dijaga camp goblin kecil** (§10) |
| Gold Mine tengah | 1 di pusat peta, level 2 (plateau), **dijaga camp goblin besar** |
| Hutan | ≥ 3 rumpun per pemain; 1 di dalam basis, sisanya harus diperebutkan |
| Domba | 4 per pemain di padang dekat basis + 6 netral di tengah peta |
| Ramp ke plateau tengah | Tepat 3 ramp, berjarak sama — chokepoint utama |

**Spawn pemain** (`initWorld`, menggantikan isi lama):

| Isi | Jumlah |
| :--- | :---: |
| Castle | 1 (aktif) |
| House | 1 (aktif) |
| Pawn | 5 (2 sudah menambang/menebang, 3 idle) |
| **Hero** | **1 — lihat §11** |
| Pasukan awal | 0 (dihapus; hero menggantikan peran pengawal awal) |

Resource awal tetap `320 Gold / 220 Wood / 140 Meat`.

### 9.4 Aturan penempatan bangunan

Bangunan hanya boleh di tile `passable` dengan **`height` seragam** di seluruh tapaknya — tidak boleh
menjembatani dua level. Guard Tower **boleh** di plateau (dan mendapat bonus §9.2 — itu memang gunanya).

---

## 10. Creep Netral — Camp Goblin Penjaga Harta **[BARU]**

Aset faksi Goblin Update 010 sudah lengkap di repo dan sama sekali belum dipakai:
`Goblins/Troops/{Torch,TNT,Barrel}` (sheet animasi penuh), `Goblin_House`, `Wood_Tower`.

### 10.1 Faksi ketiga

Tim baru `neutral` — **bukan** Blue dan bukan Red. Blue dan Red keduanya memusuhi `neutral`;
`neutral` memusuhi keduanya. Goblin **tidak** punya ekonomi, **tidak** membangun, **tidak** menyerang basis.

### 10.2 Unit goblin

| Unit | Aset | HP | DMG | Jarak | Peran |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Goblin Torch** | `Troops/Torch/Red/Torch_Red.png` (1344×960, 7×5) | 120 | 16 | 48 | Penjaga jarak dekat |
| **Goblin TNT** | `Troops/TNT/Red/TNT_Red.png` (1344×576, 7×3) | 95 | 22 AoE | 220 | Pelempar dinamit, splash |
| **Goblin Barrel** | `Troops/Barrel/Red/Barrel_Red.png` | 70 | 45 AoE | 0 | Bom diri — meledak saat kontak, mati |

### 10.3 Perilaku camp (model creep Warcraft III)

1. **Pasif.** Goblin berdiri di camp dan **tidak menyerang** sampai ada unit musuh masuk
   **radius aggro `280 px`**.
2. **Terikat camp.** Mengejar paling jauh **`420 px`** dari titik camp, lalu **kembali** dan
   memulihkan HP penuh (`+8 HP/detik` saat kembali). Tidak bisa dipancing keluar jauh.
3. **Aggro bersama.** Satu goblin kena aggro → **seluruh camp** ikut aggro.
4. **Respawn.** Camp yang habis dibersihkan **respawn penuh setelah `150 detik`**.
   Hitungan mulai saat goblin terakhir mati. Ada peringatan visual di minimap 10 detik sebelum respawn.
5. **Tidak saling serang.** Goblin tidak pernah menyerang goblin lain.

### 10.4 Hadiah

| Hadiah | Nilai |
| :--- | :--- |
| Gold | Torch `+25`, TNT `+35`, Barrel `+15` — **langsung masuk**, tidak perlu diangkut Pawn |
| Meat | Setiap goblin mati menjatuhkan `M_Spawn.png` → `M_Idle.png` seperti unit biasa (§2) |
| **XP Hero** | Torch `+12`, TNT `+18`, Barrel `+8` — **hanya** kalau hero ada dalam radius `400 px` saat goblin mati |

Ini membuat "farming creep" jadi jalur naik level hero yang sah, persis seperti Warcraft III.

### 10.5 Komposisi & penempatan camp

| Tipe camp | Isi | Jumlah di peta | Menjaga |
| :--- | :--- | :---: | :--- |
| **Kecil** | 2 Torch + 1 TNT | 4 (2 per pemain) | Gold Mine ekspansi |
| **Besar** | 3 Torch + 2 TNT + 1 Barrel + 1 `Goblin_House` | 1 | Gold Mine tengah di plateau |

Camp kecil **harus** bisa dibersihkan oleh 1 hero level 1 + 2 pasukan. Camp besar **tidak boleh** bisa
dibersihkan sebelum menit ke-8 permainan normal — ini yang menjaga gold tengah tetap jadi rebutan
mid-game, bukan rush awal.

---

## 11. Hero: Tersedia Sejak Awal, Mati, & Revive via Altar **[REVISI §3 & §4]**

Masalah sekarang: hero harus dibeli dari Altar (tidak ada di awal), dan hero yang mati **hilang permanen**.

### 11.1 Hero awal

- Setiap pemain **mulai dengan 1 hero, hidup, di samping Castle.**
- Pilihan hero dilakukan **di lobi sebelum match** (4 pilihan §4B). Di Solo vs AI, AI memilih acak.
- Hero awal **gratis** — tidak memakan Gold/Wood/Meat dan **tidak** memakan Supply.
- **Satu pemain maksimal 1 hero hidup sekaligus.**

### 11.2 Kematian hero **[REVISI §4]**

Hero **tidak dihapus** dari permainan saat HP habis. Ia masuk state **`fallen`**:

1. Memutar animasi mati, lalu meninggalkan **batu nisan** di tempat ia gugur (`Deco` + `Dead.png`).
2. Hero hilang dari kendali, dari panel seleksi, dan dari minimap.
3. **Level dan XP hero tetap tersimpan** — tidak hangus.
4. Hero yang `fallen` **tidak** menjatuhkan Meat (berbeda dari unit biasa).

### 11.3 Revive — wajib lewat Altar of Heroes

| Kondisi | Aturan |
| :--- | :--- |
| Prasyarat | Harus ada **Altar of Heroes** milik pemain dalam state `active` |
| Tidak punya Altar | Hero tetap `fallen` **selamanya** sampai Altar dibangun. Inilah hukumannya |
| Biaya revive | `80 Gold × level hero` + `40 Meat` |
| Waktu revive | `25 detik + (8 detik × level hero)` |
| Tempat muncul | Di Altar yang memproses revive |
| HP saat muncul | **50%** dari HP maksimum di level itu |
| Altar hancur saat proses | Revive **dibatalkan**, biaya **dikembalikan penuh** |

Altar punya antrean sendiri terpisah dari antrean latih unit. UI-nya: kartu hero `fallen` muncul di
tab Hero dengan tombol **"Bangkitkan"** + biaya + sisa waktu.

**Alur yang dituju:** kamu main dengan hero dari detik pertama → hero mati → kamu sadar belum bangun
Altar → kamu harus investasi `130W / 150G` di tengah tekanan perang untuk mendapatkannya kembali.

### 11.4 Altar of Heroes — desain ulang aset **[REVISI §3]**

Aset `custom_assets/Buildings/Altar_{Blue,Red,Construction,Destroyed}.png` sekarang buatan sendiri dan
kualitasnya di bawah standar pack resmi. **Wajib dibuat ulang**, 4 state, pakai pipeline §16.3.

Spesifikasi wajib: ukuran kanvas **192×256 px**, PNG beralpha, palet **diambil dari sprite Tiny Swords
resmi** (bukan dikira-kira), outline gelap tebal 1 px ala Pixel Frog, titik pijak (anchor) di
tengah-bawah, bayangan menyatu dengan `Ground/Shadows.png`.

---

## 12. Fog of War **[BARU]**

Sekarang nol — seluruh peta terlihat sejak detik pertama, yang menghapus seluruh elemen scouting RTS.

### 12.1 Tiga tingkat visibilitas (model Warcraft III)

| Tingkat | Tampilan | Isi |
| :--- | :--- | :--- |
| **Unexplored** | Hitam pekat | Belum pernah dilihat. Terrain tidak digambar |
| **Explored (fogged)** | Terrain gelap ±55% | Pernah dilihat. **Terrain & bangunan ingat bentuk terakhir**; unit musuh **tidak terlihat** |
| **Visible** | Terang penuh | Dalam jarak pandang unit/bangunan sendiri sekarang |

### 12.2 Jarak pandang

| Entitas | Jarak pandang |
| :--- | :---: |
| Pawn | 340 px |
| Unit tempur | 420 px |
| Archer / Mage | 480 px |
| **Hero** | **560 px** |
| Castle | 620 px |
| Guard Tower | 540 px |
| Bangunan lain | 380 px |
| Goblin (neutral) | — tidak membuka fog untuk siapa pun |

**Bonus elevasi:** entitas di plateau (`height 2`) mendapat **+64 px** jarak pandang. Entitas di
`height 1` **tidak bisa melihat ke atas plateau** lebih dari 1 tile dari tepi cliff — tanah tinggi
menyembunyikan isinya. Ini yang membuat plateau layak direbut.

### 12.3 Implementasi

- Grid visibilitas **per tile** (96×96), bukan per piksel. Diperbarui **4×/detik**, bukan tiap frame.
- Dua bitmap per pemain: `everSeen` dan `visibleNow`.
- Dirender sebagai satu layer gelap di atas terrain, ditapis bilinear agar tepinya lembut.
- Minimap menghormati fog: wilayah unexplored hitam, fogged gelap, unit musuh hanya tampil di visible.
- **Fog bersifat per-pemain dan dihitung di `sim`.** Host **tidak boleh** mengirim posisi unit yang
  berada di fog milik Guest di dalam snapshot — kalau dikirim, Guest bisa maphack dengan membaca
  memori. Ini syarat keamanan, bukan optimasi.

---

## 13. Kondisi Menang, Kalah, Draw, & Surrender **[REVISI §3]**

Sekarang hanya: semua Castle satu pihak hancur.

### 13.1 Kondisi kalah (mana pun yang lebih dulu terjadi)

> **Koreksi Revisi 2.0.1 (ditemukan saat M1).** Rumusan pertama bagian ini cacat: poin 1
> ("semua Castle hancur = kalah") langsung memicu kekalahan, sehingga poin 2 yang
> mensyaratkan "tidak punya Castle **dan** tidak punya Pawn **dan** Gold kurang" **tidak
> pernah mungkin tercapai** — grace 20 detiknya kode mati. Ketahuan hanya karena tes
> mencoba memicunya. Kedua poin digabung di bawah supaya dua-duanya hidup.

1. **Semua Castle hancur DAN tidak ada Pawn tersisa** → kalah **seketika**.
   Tanpa Pawn tidak ada yang bisa membangun Castle baru, jadi tidak ada jalan kembali.
2. **Semua Castle hancur, masih punya Pawn, tapi Gold < biaya Castle (`250`)**
   → diberi **grace `20 detik`** untuk mengumpulkan Gold dan membangun Castle baru.
   Kalau Gold kembali cukup sebelum grace habis, hitungan **di-reset** dan match lanjut.
   Kalau tidak, kalah.
3. **Surrender** — pemain menyerah sendiri (§13.3).
4. **Disconnect melebihi batas** — lihat §15.3.

Efeknya pada permainan: menghancurkan Castle lawan tidak lagi otomatis menang. Lawan yang
masih punya Pawn dan Gold boleh membangun ulang — jadi comeback mungkin, dan pemain yang
menyerang harus benar-benar membersihkan, bukan sekadar menyentuh Castle.

### 13.2 Draw

- Kedua Castle terakhir hancur dalam **jendela 1 detik** yang sama (saling bunuh) → **Draw**.
- Kedua pemain surrender dalam jendela 3 detik → **Draw**.
- **Tidak ada batas waktu match.** Tidak ada draw karena kehabisan waktu.

### 13.3 Surrender

Tombol di menu pause (§14). **Wajib konfirmasi** dialog "Yakin menyerah?" — tidak boleh satu klik.
Di LAN, surrender langsung mengakhiri match untuk kedua pemain.

### 13.4 Layar hasil

Menampilkan: Menang/Kalah/Draw, durasi, unit dibunuh, unit gugur, bangunan dibangun/hilang,
gold+wood+meat terkumpul total, level hero tertinggi, **jumlah camp goblin dibersihkan**, sisa resource.
Tombol: "Kembali ke Lobby" dan "Rematch" (LAN: perlu persetujuan kedua pemain).

---

## 14. Pause **[BARU]**

| Mode | Perilaku |
| :--- | :--- |
| **Solo vs AI** | Pause penuh — `sim` berhenti, timer berhenti, render tetap jalan (frame beku). `[Esc]` atau tombol pause |
| **LAN 2 pemain** | **Pause tidak menghentikan simulasi.** `[Esc]` hanya membuka menu overlay; dunia tetap jalan di belakangnya |

Alasan: pause otoritatif di LAN butuh protokol kesepakatan dua arah + penanganan abuse (pause spam
sebagai senjata). Di luar ruang lingkup Revisi 2.0. **Yang dilarang:** membuat menu LAN *terlihat*
seperti pause padahal dunia jalan — overlay LAN wajib menampilkan label **"Permainan tetap berjalan"**
yang jelas.

Isi menu: Lanjutkan · Panduan Kontrol · Suara on/off · **Surrender** · Keluar ke Lobby.

---

## 15. LAN: Disconnect & Reconnect **[REVISI §7]**

Sekarang: server kirim `opponent_left`, client terima, room **dihapus** saat host putus. Tidak ada
reconnect, tidak ada ping/pong, tidak ada rate limit. Wi-Fi kedip sekali = match hilang total.

### 15.1 Deteksi (port dari math-strike `papan-ws.ts`)

- **Ping aplikasi tiap `25 detik`**; tidak ada pong dalam `2 interval` → koneksi dianggap mati dan
  di-`terminate()`. Wajib — tanpa ini socket HP yang masuk sleep menggantung selamanya.
- Server menandai `lastSeen` per client.

### 15.2 Grace period & reconnect

| Kejadian | Perilaku |
| :--- | :--- |
| Koneksi putus | Room **tidak dihapus**. Masuk state `paused_disconnect`, **grace `45 detik`** |
| Tampilan lawan | Overlay "Menunggu <nama> tersambung lagi… 45" + hitung mundur |
| Simulasi selama grace | **Berhenti** di kedua sisi (ini satu-satunya pause otoritatif yang ada) |
| Host kembali | Host mendaftar ulang **kode room lama** kalau masih bebas (pola math-strike), lalu kirim snapshot penuh |
| Guest kembali | Guest join ulang pakai kode yang sama, terima snapshot penuh, lanjut |
| Grace habis | Pihak yang putus **kalah** (§13.1 poin 4). Pihak yang tinggal menang |

Reconnect butuh **token sesi** (`sessionToken`) yang dipegang client sejak `room_joined`, agar
pihak lain di LAN tidak bisa mengaku-aku sebagai pemain yang putus.

### 15.3 Pengerasan server — 11 temuan audit §3

Wajib diport dari `math-strike-kerja24c`:

| # | Yang diport |
| :---: | :--- |
| 1 | `kelompokWifi(ip)` — daftar room hanya beredar di dalam satu kelompok jaringan |
| 2 | `alamatPerangkat(req)` — `X-Forwarded-For` hanya dipercaya kalau socket lokal (anti-spoof) |
| 3 | Rate limit **50 pesan/detik** per koneksi → `close(1008)` |
| 4 | `maxPayload` **16 KB** untuk pesan lobi (snapshot game punya jalur & batas sendiri) |
| 5 | Validasi skema ketat gaya `infoSah()` untuk **semua** pesan masuk, termasuk `player_cmd` dan `state_sync` |
| 6 | Ping/pong + liveness timeout (§15.1) |
| 7 | Host reconnect dengan kode room lama (§15.2) |
| 8 | `info-room` — host push update, papan umumkan ulang |
| 9 | Pisah `PapanInti` (class murni, tanpa transport) dari adapter ws — **wajib ada tes** |
| 10 | Ganti RFC 6455 tulis tangan ke library `ws` |
| 11 | Kode room **5 huruf** (dari 4) |

### 15.4 Catatan arsitektur yang disengaja

math-strike memakai server hanya sebagai **papan sinyal**, lalu data game lewat **WebRTC P2P**.
Proyek ini **sengaja** me-relay snapshot lewat server: 2 pemain di LAN, latensi relay masih di bawah
satu frame, dan ini menghapus seluruh kerumitan ICE/STUN/NAT. **Ini pilihan sadar, bukan kelewatan.**

---

## 16. Pipeline Aset & Font **[REVISI §6]**

### 16.1 Aturan prioritas aset (ditegakkan, bukan imbauan)

Urutan: **`Tiny Swords (Update 010)` → `Tiny Swords (Free Pack)` → `custom_assets`.**

Audit menemukan urutan ini **hampir terbalik** di kode lama: dari seluruh Update 010 hanya **15 file**
yang dipakai. Tilemap, air, pohon, domba, Castle/House/Tower, Pawn/Warrior/Archer, ikon, dan ledakan
semuanya diambil dari Free Pack yang lebih miskin; seluruh chrome UI dan kursor dari `custom_assets`.

Yang **wajib** pindah ke Update 010:

| Kategori | Ganti ke |
| :--- | :--- |
| Tilemap tanah | `Terrain/Ground/Tilemap_Flat.png` (640×256, autotile 10×4) |
| Tilemap elevasi | `Terrain/Ground/Tilemap_Elevation.png` (256×512) — **baru dipakai** |
| Bayangan tanah | `Terrain/Ground/Shadows.png` — **baru dipakai** |
| Air + busa | `Terrain/Water/Water.png` + `Water/Foam/Foam.png` (8 frame) |
| Batu air | `Terrain/Water/Rocks/Rocks_01..04.png` — **baru dipakai** |
| Pohon | `Resources/Trees/Tree.png` (768×576, beranimasi) |
| Domba | `Resources/Sheep/HappySheep_{Idle,Bouncing,All}.png` |
| Castle/House/Tower | `Factions/Knights/Buildings/*/{Castle,House,Tower}_{Blue,Red}.png` |
| Pawn/Warrior/Archer | `Factions/Knights/Troops/*/..._{Blue,Red}.png` (1152×1536, 6×8 animasi) |
| **Panel/tombol/ribbon UI** | `UI/Banners/Carved_9Slides`, `UI/Buttons/Button_{Blue,Red}_9Slides`, `UI/Ribbons/Ribbon_*_3Slides` — **9-slice, baru dipakai** |
| Ikon | `UI/Icons/Regular_01..10` + `Pressed_*` + `Disable_*` (punya state) |
| Ledakan | `Effects/Explosion/Explosions.png` |
| Dekorasi | `Deco/01..18.png` — **baru dipakai** |
| Goblin | `Factions/Goblins/**` — **baru dipakai** (§10) |
| Kursor | Free Pack `UI Elements/Cursors/Cursor_01..04.png` (tidak ada di Update 010) |

**Batas yang diakui:** Update 010 faksi Knights **tidak punya** Lancer, Monk, Mage. Free Pack tetap
wajib untuk 3 unit itu. Aturan prioritas dibaca **per-aset**, bukan per-pack.

### 16.2 `packages/aset` — manifes tervalidasi

Satu manifes TypeScript jadi sumber tunggal: path, ukuran frame, jumlah frame, fps, anchor, dan
**pack asal** tiap aset. Script `scripts/periksa-aset.mjs` dijalankan di CI dan memeriksa:

1. Setiap path di manifes **benar-benar ada** di disk.
2. Dimensi PNG **cocok** dengan `frameW × kolom` dan `frameH × baris` yang dideklarasikan.
3. Tidak ada aset dari pack prioritas lebih rendah kalau padanannya ada di pack lebih tinggi
   (kecuali yang terdaftar di whitelist pengecualian §16.1).

Hasilnya: aset hilang atau salah-slice **gagal di CI**, bukan jadi kotak kosong saat main.

### 16.3 Pembuatan aset yang kurang

Aset yang benar-benar belum ada: **Altar 4 state** (ulang), **animasi Death/Dead hero**,
**Construction/Destroyed** Barracks/Archery/Monastery (placeholder kasar 3–6 KB), **font pixel**.

**Alur `imagine-agy` (Antigravity) — terverifikasi di audit §6:**

1. `imagine-agy generate "<prompt>" --model gemini-4-neon-high --ratio 3:4 -o concept.jpg`
   → **concept art** (komposisi, siluet, arah warna).
2. Pipeline Python/Pillow: ambil palet asli dari sprite Tiny Swords resmi → quantize ke palet itu →
   resize nearest-neighbor ke ukuran pas → potong background jadi alpha → bersihkan piksel nyasar.
3. Review manual, ulang kalau belum pas.

**Dua jebakan yang wajib diingat** (detail di `docs/AUDIT_TAHAP_1.md` §6):

- **`--model` wajib eksplisit.** Default imagine-agy (`gemini-3.1-pro-low`) **tidak ada** di mesin ini;
  agy menolaknya lalu mencetak daftar model, dan imagine-agy melapor "No image at the expected path" —
  pesan yang menyesatkan. **Model yang dipakai proyek ini: `gemini-4-neon-high`.**
- **Kuota ada di backend `generate_image`** dan dipakai bersama lintas driver model — pindah model
  tidak menolong. Pembuatan aset massal **harus dijadwal dengan jeda**, tidak bisa ditembak berurutan.

**Output imagine-agy adalah JPG** tanpa alpha, tepi anti-aliased, palet bebas. **Tidak bisa dipakai
langsung sebagai sprite.** Untuk Altar, menggambar langsung di Pillow dari palet resmi lebih disukai
(hasil paling tajam, ukuran pasti), dengan imagine-agy hanya sebagai referensi bentuk.

#### 16.3.1 Hasil uji coba nyata (2026-11-25) — dua cacat yang wajib dihindari

Satu siklus penuh sudah dijalankan: concept art lewat `gemini-4-neon-high`, lalu dikonversi dengan
pipeline Pillow (`docs/aset-eksperimen/konversi.py`). **Mekanismenya bekerja** — background magenta
terkunci bersih jadi alpha, ukuran keluar tepat 192×256 RGBA, warna terkunci ke palet resmi.
**Tapi hasilnya belum layak pakai**, karena dua cacat berikut:

**Cacat 1 — proyeksi salah.** Bangunan Tiny Swords digambar **menghadap depan dengan sedikit
kemiringan atas**. Concept yang dihasilkan **isometrik (menghadap sudut)**. Ini **tidak bisa
diperbaiki di pipeline** — harus diperbaiki di prompt. Prompt wajib menyebut
*"front-facing three-quarter view, slight top-down tilt, NOT isometric, NOT corner-on"* dan sebaiknya
menyertakan sprite bangunan resmi sebagai rujukan gaya.

**Cacat 2 — palet runtuh ke satu rumpun warna.** Palet resmi sangat disiplin: `Castle_Blue.png`
hanya memakai **10 warna opak**. Pemetaan "warna terdekat" membuat seluruh batu biru-abu jatuh ke
rumpun kayu cokelat, sehingga altar keluar serba krem dan kehilangan identitas warna Tiny Swords.
Perbaikan: palet dipisah **per material** (batu biru-abu, kayu cokelat, kain faksi, aksen emas),
lalu tiap wilayah gambar dipetakan ke rumpun materialnya sendiri — bukan satu pemetaan global.

**Pembanding yang jujur:** altar lama (`custom_assets/Buildings/Altar_Blue.png`, 27 warna opak)
ternyata **sudah benar proyeksinya** dan paletnya dekat dengan resmi. Kelemahan aslinya bukan
"salah gaya", melainkan **terlalu ramai dan terbaca sebagai castle mini, bukan altar** — siluetnya
tidak khas. Jadi target M5 bukan "ganti karena jelek", melainkan **sederhanakan siluetnya** agar
langsung terbaca sebagai altar, dengan proyeksi dan palet yang sudah benar itu dipertahankan.

Berkas uji coba disimpan di `docs/aset-eksperimen/` sebagai rujukan M5.

### 16.4 Font **[REVISI §6]**

Sekarang `style.css:24` = `system-ui, -apple-system, "Segoe UI", Roboto` — font OS biasa, bukan pixel
font. Ini penyebab UI terasa tidak nyatu.

| Syarat | Aturan |
| :--- | :--- |
| Gaya | Pixel/bitmap font, bobot tebal, cocok dengan outline tebal Pixel Frog |
| Lisensi | Bebas untuk dipakai & didistribusikan (OFL atau sepadan) |
| **Hosting** | **Wajib self-host `.woff2` di dalam repo.** Dilarang CDN/Google Fonts — LAN sering tanpa internet |
| Karakter | Harus mendukung teks Indonesia (ASCII + tanda baca); tidak butuh diakritik luas |
| Ukuran render | Ukuran font **kelipatan bulat** dari ukuran piksel dasar agar tidak blur |
| `image-rendering` | `pixelated` pada semua `<img>` dan canvas |

**Font dan panel wajib diganti seiring.** Pixel font di atas panel `custom_assets` tetap tidak akan
nyatu — pilihan font final diputuskan di M4 bersama migrasi 9-slice resmi.

---

## 17. Acceptance Criteria

Semua AC di bawah **bisa dites manual** oleh satu orang. Kolom "Cara tes" adalah langkah yang
benar-benar dilakukan, bukan deskripsi. `[H]` = dites di Host, `[G]` = di Guest, `[S]` = Solo vs AI.

### AC-8 — Arsitektur

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-8.1 | `npm test` hijau, `npm run typecheck` tanpa error | Jalankan keduanya di root |
| AC-8.2 | Aturan dependensi ditegakkan otomatis | Tambah `import { ctx } from '../render'` di `packages/sim` → `npm test` **harus gagal** |
| AC-8.3 | `sim` deterministik | Jalankan `npm test -- determinisme`: seed sama + command sama → hash state akhir identik di 2 run |
| AC-8.4 | `sim` jalan headless | `node -e "import('./packages/sim/dist/index.js')"` tanpa DOM → tidak crash |

### AC-9 — Peta & Elevasi

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-9.1 | Peta 96×96 tile | Mulai match, tekan tombol fokus, scroll ke 4 sudut — minimap menunjukkan kamera mencapai semua tepi |
| AC-9.2 | Ada 3 level ketinggian terlihat jelas | Pandang plateau tengah: tepi cliff + bayangan terlihat, bukan tile datar |
| AC-9.3 | Cliff tidak bisa dipanjat | Pilih unit di level 1, klik kanan di atas plateau menembus cliff → unit **berjalan memutar ke ramp**, tidak memanjat |
| AC-9.4 | Ramp bisa dilewati | Klik kanan di ramp → unit naik ke plateau |
| AC-9.5 | Bonus tanah tinggi aktif | Taruh Archer di plateau + Archer di dataran, suruh keduanya serang target di dataran → Archer plateau mulai menembak dari jarak lebih jauh |
| AC-9.6 | Bangunan tidak bisa menjembatani 2 level | Coba taruh Barracks tepat di tepi cliff → ghost **merah**, klik ditolak |
| AC-9.7 | Spawn simetri & jarak | Bandingkan basis Blue dan Red di minimap: rotasi 180°, jarak jalan ≥ 70 tile |
| AC-9.8 | Performa peta besar | Scroll penuh diagonal selama 10 detik di peta penuh unit → tidak ada stutter kasat mata |

### AC-10 — Camp Goblin

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-10.1 | Goblin pasif sebelum didekati | Berdiri `>300 px` dari camp selama 30 detik → goblin tidak bergerak menyerang |
| AC-10.2 | Aggro pada `280 px` | Jalan mendekat perlahan → seluruh camp mulai menyerang bersamaan |
| AC-10.3 | Terikat camp | Pancing goblin lalu kabur jauh → goblin berhenti di `±420 px`, kembali, dan HP-nya terisi lagi |
| AC-10.4 | Respawn 150 detik | Bersihkan camp kecil, catat waktu → camp penuh lagi pada `150 detik` ±2 detik |
| AC-10.5 | Peringatan respawn | 10 detik sebelum respawn → penanda muncul di minimap |
| AC-10.6 | Hadiah gold langsung | Catat Gold, bunuh 1 Torch → Gold naik `+25` tanpa Pawn mengangkut |
| AC-10.7 | XP hero butuh kedekatan | Bunuh goblin **tanpa** hero di dekatnya → XP hero **tidak** naik. Ulangi dengan hero dalam `400 px` → XP naik |
| AC-10.8 | Camp besar tahan rush | Serang camp besar pada menit ke-5 dengan pasukan maksimal yang mungkin → **gagal** membersihkan |
| AC-10.9 | Goblin tidak menyerang basis | Tunggu 10 menit tanpa mendekati camp → tidak ada goblin yang pernah datang ke basis |

### AC-11 — Hero & Revive

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-11.1 | Hero ada sejak detik pertama | Mulai match → hero terpilih sudah hidup di samping Castle |
| AC-11.2 | Hero awal gratis & tanpa Supply | Catat Gold/Wood/Meat dan Supply sebelum-sesudah spawn → tidak berubah |
| AC-11.3 | Pilihan hero di lobi dipatuhi | Pilih Paladin di lobi → yang muncul Paladin, bukan acak |
| AC-11.4 | Hero mati jadi `fallen`, bukan hilang | Bunuh hero sendiri → animasi mati + batu nisan; hero hilang dari panel tapi match lanjut |
| AC-11.5 | Level & XP tersimpan | Naikkan hero ke Lv 3, biarkan mati, revive → hero kembali **Lv 3**, bukan Lv 1 |
| AC-11.6 | Tanpa Altar, hero tidak bisa kembali | Hero mati tanpa punya Altar, tunggu 3 menit → tidak ada cara membangkitkan; tab Hero menunjukkan syarat Altar |
| AC-11.7 | Revive bekerja | Bangun Altar → tombol "Bangkitkan" aktif → bayar → hero muncul di Altar dengan **50% HP** |
| AC-11.8 | Biaya & waktu skala level | Revive hero Lv 1 vs Lv 3 → biaya dan durasi Lv 3 lebih besar sesuai §11.3 |
| AC-11.9 | Altar hancur membatalkan revive | Mulai revive, hancurkan Altar sendiri → revive batal, biaya **kembali penuh** |
| AC-11.10 | Maks 1 hero hidup | Dengan hero hidup, buka tab Hero → tidak bisa memanggil hero kedua |
| AC-11.11 | Hero `fallen` tidak drop Meat | Bunuh hero → tidak ada `M_Spawn` di tempatnya |
| AC-11.12 | Altar baru layak | Bandingkan Altar di samping Castle resmi → palet, outline, dan skala konsisten; tidak terlihat asing |

### AC-12 — Fog of War

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-12.1 | Peta mulai gelap | Mulai match → hanya sekitar basis yang terang; sisanya hitam |
| AC-12.2 | Tiga tingkat terlihat beda | Kirim unit menjelajah lalu tarik kembali → wilayah itu jadi gelap-sedang (bukan hitam, bukan terang) |
| AC-12.3 | Bangunan diingat, unit tidak | Lihat basis musuh lalu mundur → bangunan musuh **tetap tergambar**; unit musuh **hilang** |
| AC-12.4 | Fog hormat di minimap | Bandingkan minimap dengan layar → wilayah unexplored hitam di minimap juga |
| AC-12.5 | Hero melihat paling jauh | Bandingkan radius terang hero vs Pawn → hero jelas lebih luas |
| AC-12.6 | Plateau menyembunyikan isinya | Taruh unit di dataran dekat cliff → isi atas plateau **tidak** terlihat |
| AC-12.7 | Bonus visi elevasi | Naikkan unit yang sama ke plateau → radius terangnya bertambah |
| AC-12.8 | **Anti-maphack** `[G]` | Di Guest, inspeksi snapshot yang diterima (DevTools) → **tidak ada** posisi unit musuh yang sedang di fog |

### AC-13 — Menang / Kalah / Draw

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-13.1 | Hancurkan semua Castle = menang | `[S]` hancurkan Castle AI → layar kemenangan |
| AC-13.2a | Castle habis tanpa Pawn = kalah seketika | Hancurkan Castle sendiri dan habiskan semua Pawn → kalah pada langkah itu juga |
| AC-13.2b | Castle habis + Pawn + Gold cukup = masih hidup | Hancurkan Castle sendiri, sisakan Pawn, pastikan Gold ≥ 250 → match **lanjut**, bisa bangun Castle baru |
| AC-13.2c | Castle habis + Pawn + Gold kurang = kalah setelah grace | Sama, tapi Gold < 250 → bertahan ~18 detik lalu kalah pada detik ke-20 |
| AC-13.2d | Grace di-reset kalau Gold pulih | Saat hitungan grace jalan, tambahkan Gold ≥ 250 → hitungan kembali nol |
| AC-13.3 | Surrender butuh konfirmasi | Klik Surrender → dialog muncul; "Tidak" membatalkan, match lanjut |
| AC-13.4 | Surrender LAN mengakhiri keduanya | `[H]` surrender → `[G]` juga melihat layar hasil |
| AC-13.5 | Draw saling bunuh | Atur agar dua Castle terakhir hancur hampir bersamaan → layar **Draw** |
| AC-13.6 | Tidak ada batas waktu | Main pasif 20 menit → match tidak pernah berakhir sendiri |
| AC-13.7 | Statistik lengkap & benar | Bandingkan angka di layar hasil dengan yang kamu hitung manual selama match (kills, camp dibersihkan) |

### AC-14 — Pause

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-14.1 | Pause solo benar-benar berhenti | `[S]` tekan `[Esc]` → unit berhenti total, timer berhenti; lanjut → semuanya jalan lagi |
| AC-14.2 | LAN tidak berhenti tapi jujur | `[H]` tekan `[Esc]` → overlay muncul dengan label **"Permainan tetap berjalan"**, dan unit di belakang overlay **terlihat terus bergerak** |
| AC-14.3 | Menu pause lengkap | Buka menu → ada Lanjutkan, Panduan, Suara, Surrender, Keluar |

### AC-15 — LAN Disconnect & Reconnect

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-15.1 | Room muncul otomatis | `[H]` buat room → `[G]` melihatnya di daftar tanpa refresh |
| AC-15.2 | Kode room 5 huruf | Buat room → kode 5 karakter |
| AC-15.3 | Guest putus → grace, bukan mati | `[G]` tutup tab → `[H]` melihat overlay hitung mundur `45` dan simulasi berhenti |
| AC-15.4 | Guest reconnect berhasil | Buka lagi, join kode sama dalam 45 detik → match lanjut dari posisi yang sama |
| AC-15.5 | Host reconnect berhasil | `[H]` putuskan Wi-Fi 10 detik lalu sambungkan → room kode lama hidup kembali, `[G]` lanjut |
| AC-15.6 | Grace habis = kalah | `[G]` tutup tab, tunggu `>45 detik` → `[H]` menang, `[G]` kalah |
| AC-15.7 | Token sesi mencegah pembajakan | Dari perangkat ketiga, coba join kode room yang sedang grace **tanpa** token → ditolak |
| AC-15.8 | Rate limit aktif | Kirim >50 pesan/detik dari console DevTools → koneksi ditutup dengan kode `1008` |
| AC-15.9 | Pesan cacat ditolak | Kirim `player_cmd` berbentuk acak → host **tidak** crash dan perintah diabaikan |
| AC-15.10 | Socket mati terdeteksi | Matikan Wi-Fi `[G]` tanpa menutup tab → dalam `≤50 detik` host masuk state grace |
| AC-15.11 | `/alamat` benar | Buka `http://<ip>:8080/alamat` → JSON berisi IP LAN asli, bukan `127.0.0.1` |
| AC-15.12 | Room tidak bocor lintas jaringan | Jalankan 2 client di subnet berbeda → masing-masing **tidak** melihat room yang lain |

### AC-16 — Aset & Font

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-16.1 | Validator aset aktif | Ubah satu path di manifes jadi salah → `npm test` **gagal** dengan pesan path tidak ada |
| AC-16.2 | Validator dimensi aktif | Deklarasikan jumlah frame yang salah → `npm test` **gagal** |
| AC-16.3 | Prioritas Update 010 ditegakkan | Cari `Free Pack` di `packages/aset` → hanya muncul untuk Lancer, Monk, Cursor, dan whitelist §16.1 |
| AC-16.4 | Panel UI resmi dipakai | Cari `custom_assets/UI` di seluruh source → **nol hasil** |
| AC-16.5 | Font self-host | Matikan internet, muat ulang game → font tetap pixel font, bukan fallback OS |
| AC-16.6 | Tidak ada blur | Zoom kamera penuh ke unit → piksel tajam, tidak kabur |
| AC-16.7 | Semua aset dimuat | Buka DevTools Network, mulai match → **nol** request 404 |

---

## 18. Milestone — Urut Prioritas

Aturan: tiap milestone berakhir dengan sesuatu yang **bisa dijalankan dan dites manual**.
Setelah tiap milestone: jalankan game, tes di **2 tab browser (host & guest)**, laporkan hasilnya.
Tidak ada milestone yang boleh dimulai sebelum AC milestone sebelumnya hijau.

### M0 — Jaring Keselamatan & Rangka *(prasyarat mutlak)*
`git init` + commit kode lama apa adanya · rangka monorepo npm-workspaces · tsconfig · vitest + esbuild ·
CI lokal (`npm test`, `npm run typecheck`) · tes penegak aturan dependensi (AC-8.2).
**Selesai bila:** AC-8.1 … AC-8.4 hijau. Kode lama masih bisa dijalankan & dikembalikan.
> Tanpa git, seluruh rencana ini kerja tanpa jaring. `game.js` 115 KB yang sekarang **jalan** harus bisa dipulihkan.

### M1 — `packages/sim`: Inti Deterministik
Port ekonomi (3 resource + Supply), siklus bangunan 4 fase, tempur, Pawn gather/build/repair,
hero XP/level/skill, AI solo — **semuanya headless, tanpa render.** RNG ber-seed. Tes unit per sistem.
**Selesai bila:** AC-8.3 hijau; satu match penuh bisa disimulasikan di test tanpa browser.
> Inti yang benar dulu. Semua milestone lain bergantung ke sini, jadi bug di sini paling mahal.

### M2 — `packages/aset` + Migrasi ke Update 010
Manifes aset tervalidasi · `scripts/periksa-aset.mjs` di CI · pindahkan tilemap, air, pohon, domba,
Castle/House/Tower, Pawn/Warrior/Archer, ikon, ledakan, kursor ke aset resmi prioritas tertinggi.
**Selesai bila:** AC-16.1 … AC-16.4, AC-16.7 hijau.
> Menyelesaikan "turun kelas" aset dan jadi pondasi visual M3–M5. Dikerjakan sebelum terrain
> supaya terrain baru tidak dibangun di atas tilemap yang salah.

### M3 — Terrain Baru: 96×96 + Elevasi
Terrain sebagai data (`height`/`surface`/`passable`) · autotile flat + elevation + cliff + shadow ·
ramp · chunked render + culling + cache per chunk · minimap offscreen · pathfinding hormat cliff ·
bonus jarak serang tanah tinggi.
**Selesai bila:** AC-9.1 … AC-9.8 hijau.
> Menjawab keluhan **"peta monoton & kecil sekali"**.

### M4 — UI Rebuild: 9-Slice Resmi + Pixel Font
Renderer 9-slice untuk `Carved_9Slides` / `Button_*_9Slides` / `Ribbon_*_3Slides` · ikon
`Regular`/`Pressed`/`Disable` · buang seluruh `custom_assets/UI` · pilih & self-host pixel font ·
`image-rendering: pixelated` menyeluruh · sidebar, panel seleksi, minimap frame, lobi.
**Selesai bila:** AC-16.4 … AC-16.6 hijau.
> Menjawab keluhan **"font jelek, ndak cocok sama UI"** — font dan panel diganti seiring, karena
> salah satunya saja tidak akan nyatu.

### M5 — Hero Sejak Awal + `fallen` + Revive + Altar Baru
Pilihan hero di lobi · spawn hero gratis tanpa Supply · state `fallen` + batu nisan ·
antrean revive di Altar (biaya & durasi skala level) · pembatalan + refund saat Altar hancur ·
**aset Altar 4 state dibuat ulang** + animasi Death/Dead hero (pipeline §16.3).
**Selesai bila:** AC-11.1 … AC-11.12 hijau.
> Menjawab **"harusnya sudah punya hero di awal, kalau mati harus bangun altar dulu"** dan
> **"altarnya kok jelek kali"**.

### M6 — Camp Goblin Netral
Faksi `neutral` · 3 unit goblin dari aset Update 010 · perilaku camp (pasif → aggro `280` → terikat
`420` → kembali & heal) · respawn `150 s` + peringatan minimap · hadiah gold langsung + Meat +
XP hero berbasis kedekatan · 4 camp kecil + 1 camp besar.
**Selesai bila:** AC-10.1 … AC-10.9 hijau.
> Menjawab **"ada npc goblin yang jaga harta"**. Setelah M3 karena camp besar ditaruh di plateau.

### M7 — Fog of War
Grid visibilitas per tile, update 4×/detik · 3 tingkat (unexplored/fogged/visible) · memori bangunan ·
jarak pandang per entitas + bonus elevasi + cliff menyembunyikan plateau · fog di minimap ·
**penyaringan snapshot anti-maphack.**
**Selesai bila:** AC-12.1 … AC-12.8 hijau.
> Butuh M3 lebih dulu (aturan elevasi). AC-12.8 adalah syarat keamanan, bukan polish.

### M8 — Pengerasan Server LAN
Port `PapanInti` murni + tes · `kelompokWifi` · `alamatPerangkat` anti-spoof · rate limit 50/s ·
`maxPayload` · validasi skema semua pesan · ping/pong + liveness · grace `45 s` + reconnect +
`sessionToken` · kode room 5 huruf · ganti ke library `ws`.
**Selesai bila:** AC-15.1 … AC-15.12 hijau.
> 11 temuan audit §3. Ditaruh setelah gameplay stabil supaya tes reconnect punya match nyata untuk dipulihkan.

### M9 — Pause + Menang/Kalah Lengkap
Pause solo otoritatif · overlay LAN jujur ("Permainan tetap berjalan") · menu pause ·
surrender + konfirmasi · mati ekonomi · draw · layar hasil lengkap · rematch.
**Selesai bila:** AC-13.1 … AC-13.7 dan AC-14.1 … AC-14.3 hijau.

### M10 — Polish
`Deco/01..18` · `Rocks_01..04` · bayangan tanah · `Explosions.png` resmi · partikel · SFX ·
screen shake halus · animasi domba `HappySheep_Bouncing` · kursor 4 state.
**Selesai bila:** tidak ada regresi di seluruh AC M0–M9.

---

### Ringkasan pemetaan keluhan → milestone

| Keluhan | Dijawab di |
| :--- | :--- |
| Peta monoton, ndak ada naik turun | **M3** |
| Peta kecil sekali | **M3** |
| Ndak ada NPC goblin jaga harta | **M6** |
| Harusnya sudah punya hero di awal | **M5** |
| Kalau mati harus bangun altar dulu | **M5** |
| Altarnya jelek | **M5** (aset) + pipeline **§16.3** |
| Font jelek, ndak cocok sama UI | **M4** |
| Arsitektur bersih (Next/Rust → TS) | **M0** + **M1** |

---

## 19. Keseimbangan Pertandingan **[BARU — Revisi 2.1]**

Bagian ini ditambahkan setelah pengukuran, bukan dari perkiraan. Alatnya
`scripts/uji-seimbang.mjs`: menjalankan puluhan match AI vs AI headless dan
melaporkan sebaran durasi, tingkat kemenangan, serta kurva ekonomi & pasukan.

### 19.1 Keadaan sebelum penyetelan

| Ukuran | Nilai |
| :--- | :--- |
| Durasi median | **2,3 menit** |
| Match di bawah 4 menit | **23 dari 24** |
| Tingkat kemenangan | blue 8, red 15 |
| Pasukan puncak | ±7 unit |
| Gold menganggur di menit 2,5 | **±1.700** |

Diagnosisnya: **supply, bukan ekonomi**, yang jadi leher botol. Castle (+10) dan
House (+8) memberi 18 populasi, 11 di antaranya dimakan Pawn, jadi pasukan
mentok di 7 sementara gold menumpuk tanpa bisa dibelanjakan.

### 19.2 Empat cacat yang ditemukan

1. **Peta kekurangan kayu.** Seluruh peta hanya punya 25 pohon / 2.250 kayu —
   kurang dari biaya tiga Castle. Ekonomi kayu mati sebelum match separuh jalan.
   Sekarang 3 rumpun per pemain + 4 rumpun netral, ±2× lipat lebih banyak kayu.
2. **Pekerja tidak pernah dialihkan.** Logika kelangkaan hanya menyentuh Pawn
   yang menganggur, padahal siklus panen selalu kembali ke sumber yang sama.
   Pawn yang di menit pertama dikirim ke tambang tidak pernah pindah seumur
   match: gold 2.800 sementara kayu 20.
3. **Unit jarak jauh tidak bisa melukai bangunan sama sekali.** Proyektil ke
   bangunan dikirim tanpa `targetId`, dan penanganan tumbukan melewatkannya.
   Hanya serangan jarak dekat dan menara yang berfungsi melawan bangunan.
4. **Kedua AI berbagi satu RNG.** Perilaku mereka terkopel, dan hasil match
   bergantung pada urutan pemanggilan — merah menang 10–5 kalau dipanggil
   lebih dulu, padahal petanya simetris sempurna. Tiap AI kini punya RNG
   sendiri yang diturunkan dari seed match.

### 19.3 Aturan baru

**Ketahanan bangunan.** Bangunan hanya menerima **45%** kerusakan dari unit.
HP di tabel §3 **tidak berubah**; ini aturan pelemahan terpisah. Tanpa ini
pasukan 15 orang merobohkan Castle 1.500 HP dalam ±4 detik, sehingga satu
serbuan yang berhasil langsung mengakhiri pertandingan.

**Perilaku AI.** AI kini: menjaga bantalan supply agar House dibangun sebelum
populasi mentok · menempatkan Pawn ke sumber daya paling langka dan
**mengalihkan** yang sudah bekerja · membangun menara **di dalam** basis ·
membangun **Castle kedua** (karena kalah berarti semua Castle hancur, §13.1) ·
**memperbaiki** bangunan rusak · meninggalkan garnisun 28–35% · memanggil semua
pasukan pulang saat basis diserbu · mundur bila pasukan penyerang tinggal
seperempat · dan **meningkatkan agresi** seiring match berlarut agar dua AI
yang sama kuat tidak saling menunggu sampai batas waktu.

### 19.4 Hasil terukur

90 match AI vs AI, tiga set seed independen, batas 30 menit:

| Ukuran | Sebelum | **Sesudah** |
| :--- | :---: | :---: |
| Durasi median | 2,3 mnt | **4,6 – 5,6 mnt** |
| Durasi minimum | 2,1 mnt | **3,0 mnt** |
| Persentil 75 | 2,5 mnt | **8,0 – 14,4 mnt** |
| Match < 2 menit | ada | **nol** |
| Tingkat kemenangan | 35% / 65% | **47,5% / 52,5%** |
| Pembunuhan per match | 40,6 | **±89** |
| Camp dibersihkan per match | 2,92 | **±4,9** |

### 19.5 Batas yang diakui

Durasi median ±5 menit masih lebih pendek dari RTS komersial. Sisa jaraknya
**bukan soal penyetelan angka** melainkan sistem yang memang belum ada:
tidak ada tingkat teknologi, tidak ada upgrade, dan tidak ada saling-counter
antar jenis unit. Ketiganya membuat pertandingan sungguhan punya beberapa fase;
di sini hanya ada satu.

Sekitar 11% match masih mentok di batas waktu — dua AI yang sama kuat dan
sama-sama bertahan. Dalam permainan sungguhan pemainlah yang memutus kebuntuan.

### AC-19 — Acceptance Criteria

| ID | Kriteria | Cara tes |
| :--- | :--- | :--- |
| AC-19.1 | Tidak ada match yang selesai di bawah 2 menit | `N=30 node scripts/uji-seimbang.mjs` → baris "cepat" menunjukkan `<2 menit: 0` |
| AC-19.2 | Tingkat kemenangan kedua pihak dalam 40–60% | Jalankan 3 set seed (`SEED=0`, `77777`, `424242`), jumlahkan |
| AC-19.3 | Unit jarak jauh merusak bangunan | Pilih Archer, klik kanan bangunan musuh → HP bangunan turun |
| AC-19.4 | Bangunan tahan terhadap unit | Serang Castle penuh dengan 10 unit → butuh jauh lebih lama dari 5 detik |
| AC-19.5 | AI membangun menara & Castle kedua | Main solo 8 menit tanpa menyerang → AI punya menara di basis dan Castle kedua |
| AC-19.6 | AI memanggil pasukan pulang saat diserbu | Kirim beberapa unit ke basis AI → pasukannya yang sedang menyerang berbalik |
| AC-19.7 | Kayu tidak habis di tengah match | Main solo 10 menit → masih ada pohon tersisa di peta |
