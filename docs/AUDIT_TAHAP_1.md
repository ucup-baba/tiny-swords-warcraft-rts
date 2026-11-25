# Audit Tahap 1 — Tiny Swords: Warcraft RTS (LAN Edition)

**Tanggal:** 2026-11-25
**Status:** Audit baca-saja. **Belum ada satu baris kode pun yang diubah.**
**Ruang lingkup:** `PRD_WARCRAFT_RTS.md`, `game.js` (2.744 baris), `index.html`, `style.css`, `lan-server.mjs`
**Tidak disentuh:** folder `hope for the future 3d`

> Catatan: `castle-defense.*`, `valley.*`, dan `character-assets.html` ada di folder ini tapi di luar
> ruang lingkup PRD. Perlu keputusan: diarsipkan atau dihapus (lihat §6).

---

## 1. Tabel Fitur PRD → Status Implementasi

Legenda: **[OK]** selesai · **[~]** sebagian · **[X]** belum ada · **[BUG]** ada tapi salah

### 1.1 Ekonomi & Resource (PRD §2)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 2.1 | Wood: Pawn tebang pohon → antar ke Castle | **[OK]** | `updatePawn`, `+12/trip` |
| 2.2 | Gold: Pawn tambang Gold Mine / Gold Stone | **[OK]** | 3 mine + 4 stone |
| 2.3 | Meat dari ternak domba | **[OK]** | 8 domba, `gather_sheep` |
| 2.4 | Meat drop saat unit gugur (kita & musuh) | **[OK]** | `meatDrops.push` + `Dead.png` |
| 2.5 | Supply: Castle +10, House +8, maks 50 | **[OK]** | `getSupply()` |
| 2.6 | Ikon resource pakai ikon resmi | **[BUG]** | Pakai Free Pack `Icon_02/03/04/06`. PRD & aturan prioritas minta Update 010 `UI/Icons/Regular_*` |

### 1.2 Bangunan & Siklus Hidup (PRD §3)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 3.1 | 7 jenis bangunan + biaya + HP | **[OK]** | `BUILDING_DEFS` cocok dengan PRD |
| 3.2 | Fase *Under Construction* + Pawn memalu | **[OK]** | `Pawn_Interact Hammer`, HP mulai 15% |
| 3.3 | Ghost preview hijau/merah | **[OK]** | `canPlaceBuildingAt` + `buildGhost` |
| 3.4 | Fase *Active* (latih unit, tower nembak) | **[OK]** | — |
| 3.5 | Fase *Burning*: <65% = 1 api, <35% = 3 api | **[OK]** | `game.js:1738` persis sesuai PRD |
| 3.6 | Fase *Destroyed* + ledakan + screen shake | **[OK]** | `addShake(9, 0.35)` |
| 3.7 | Pawn **Repair** bangunan rusak | **[OK]** | `task 'repair'` |
| 3.8 | Aset Construction/Destroyed Barracks/Archery/Monastery/Altar | **[~]** | Custom placeholder, 3–6 KB, kasar |

### 1.3 Unit & Hero (PRD §4)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 4.1 | 6 unit reguler (Pawn/Warrior/Archer/Lancer/Monk/Mage) | **[OK]** | Angka sesuai PRD |
| 4.2 | 4 Hero + biaya + HP + speed | **[OK]** | `HERO_UNITS` |
| 4.3 | Hero XP & Level 1–5 | **[OK]** | `u.xp`, `u.level` |
| 4.4 | Skill `[Q]` tiap Hero | **[OK]** | `activateHeroSkill` |
| 4.5 | Monk auto-heal + `Heal_Effect` | **[OK]** | `updateMonk` |
| 4.6 | Mage bola sihir AoE | **[OK]** | `fireProjectile(..., isSplash)` |
| 4.7 | **Hero sudah ada sejak awal match** | **[X]** | `initWorld` hanya spawn 4 pawn + 2 warrior + 1 archer. Hero wajib dibeli dari Altar |
| 4.8 | **Hero mati → bangun/pakai Altar untuk hidup lagi** | **[X]** | Hero mati = hilang permanen. Tidak ada sistem revive |
| 4.9 | Portrait Hero ikut warna faksi | **[BUG]** | `PORTRAIT_URL` hardcode `Heroes/Blue/` → pemain Red lihat portrait biru |
| 4.10 | Animasi Hero mati | **[X]** | Aset `Death`/`Dead` untuk Hero tidak ada |

### 1.4 Kontrol & Seleksi (PRD §5)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 5.1 | Klik kiri pilih 1 unit/bangunan | **[OK]** | — |
| 5.2 | Drag marquee box | **[OK]** | `mouse.dragging` |
| 5.3 | Double-click → pilih semua tipe sama | **[OK]** | `lastClickTime` + `lastClickUnitId` |
| 5.4 | `[F1]` pekerja, `[F2]` semua pasukan | **[OK]** | — |
| 5.5 | Filter per tipe (pedang/panah/tombak/sihir/hero) | **[OK]** | `selectByFilter` |
| 5.6 | Control group `Ctrl+1..4`, tekan 2× = center | **[OK]** | `controlGroups` |
| 5.7 | Smart right-click (move/attack/gather/build/repair) | **[OK]** | `issueSmartRightClick` |
| 5.8 | `[A]` attack-move | **[OK]** | `attackMoveMode` |
| 5.9 | `[S]` stop, `[H]` hold | **[OK]** | `game.js:632` |
| 5.10 | Kursor resmi `Cursor_01..04` | **[BUG]** | Pakai `custom_assets/UI/cursor_*.png` (32×32 buatan sendiri). Aset resmi ada tapi tidak dipakai |

### 1.5 UI/UX (PRD §6)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 6.1 | Minimap kanan atas + klik kiri loncat kamera | **[OK]** | `renderMinimap`, `miniToWorld` |
| 6.2 | Minimap klik kanan kirim pasukan | **[OK]** | — |
| 6.3 | Command Sidebar + 3 tab produksi | **[OK]** | `buildSidebarProductionGrid` |
| 6.4 | Panel seleksi bawah + avatar + HP bar | **[OK]** | `syncSelectionPanel` |
| 6.5 | Panel/tombol/ribbon pakai aset resmi Tiny Swords | **[BUG]** | **Semua** chrome UI dari `custom_assets/UI/*` — nol aset resmi di `style.css` |
| 6.6 | **Font bergaya Tiny Swords** | **[X]** | `style.css:24` = `system-ui, -apple-system, "Segoe UI", Roboto` — font OS biasa, bukan pixel font |

### 1.6 LAN Multiplayer (PRD §7)

| # | Fitur PRD | Status | Catatan |
|---|---|:---:|---|
| 7.1 | `GET /alamat` deteksi IPv4 LAN + filter virtual iface | **[OK]** | Regex identik math-strike |
| 7.2 | `GET /healthz` → 200 ok | **[OK]** | — |
| 7.3 | WebSocket RFC 6455 (<126 / 126 / 127) | **[OK]** | Ditulis tangan, jalan |
| 7.4 | Host buat room → kode 4 huruf | **[OK]** | `genRoomCode` |
| 7.5 | Room otomatis muncul di daftar Guest | **[~]** | Muncul, tapi ke **semua** client tanpa filter jaringan (lihat §3) |
| 7.6 | Authoritative host 60 FPS + snapshot ~15 Hz | **[OK]** | `buildLanSnapshot` / `applyLanSnapshot` |
| 7.7 | Guest kirim `player_cmd` | **[OK]** | — |
| 7.8 | Mode Solo vs AI | **[OK]** | `updateSoloAI`, 3 difficulty |

### 1.7 Yang PRD belum sebut sama sekali

| Fitur | Status | Kenapa penting |
|---|:---:|---|
| **Kondisi menang/kalah** | **[~]** | Ada: `blueC === 0 \|\| redC === 0` (semua Castle hancur). Tapi tidak ada *surrender*, tidak ada kondisi draw, tidak ada cek "tidak bisa bangun lagi" |
| **Fog of War** | **[X]** | 0 referensi. Seluruh map kelihatan sejak detik pertama — ini menghapus seluruh elemen scouting RTS |
| **Pause** | **[X]** | 0 referensi |
| **Disconnect / reconnect LAN** | **[~]** | Server kirim `opponent_left`; client terima. Tapi tidak ada reconnect, tidak ada grace period, tidak ada ping/pong timeout |
| **Elevation / ketinggian peta** | **[X]** | 0 referensi. Aset resmi tersedia tapi tidak dipakai |
| **Goblin / creep netral penjaga harta** | **[X]** | 0 referensi. Aset resmi lengkap tersedia tapi tidak dipakai |
| **Ukuran peta** | **[~]** | 45×30 tile = 2.880×1.920 px. Sangat kecil untuk RTS 2 pemain |
| **Tes otomatis** | **[X]** | Nol tes. Bandingkan: math-strike punya 1.612 baris tes |
| **Version control** | **[X]** | Folder ini **bukan git repository**. Tidak ada riwayat, tidak ada jalan mundur |

---

## 2. Audit Pemakaian Aset

### 2.1 Aturan prioritas vs kenyataan

Aturan kamu: **Update 010 → Free Pack → custom_assets**.
Kenyataan di kode: **hampir terbalik.**

| Kategori | Dipakai sekarang | Tersedia di Update 010 | Verdict |
|---|---|---|---|
| Tilemap tanah | Free Pack `Tilemap_color1.png` (576×384) | `Tilemap_Flat.png` (640×256, autotile 10×4) | **Turun kelas** |
| **Tilemap elevation** | — tidak ada — | `Tilemap_Elevation.png` (256×512, 4×8) | **Tidak dipakai** |
| Air | Free Pack `Water Background color` | `Water/Water.png` + `Foam/Foam.png` (8 frame) | **Turun kelas** |
| Bayangan tanah | — | `Ground/Shadows.png` (3×3) | **Tidak dipakai** |
| Pohon | Free Pack `Tree1/Tree2` | `Resources/Trees/Tree.png` (768×576, beranimasi) | **Turun kelas** |
| Domba | Free Pack `Sheep_Idle` | `HappySheep_Idle/Bouncing/All` | **Turun kelas** |
| Castle/House/Tower aktif | Free Pack `Blue Buildings/*` | `Knights/Buildings/*/Castle_Blue.png` dll | **Turun kelas** |
| Pawn/Warrior/Archer | Free Pack (sheet terpisah) | `Knights/Troops/*/Warrior_Blue.png` (1152×1536, 6×8 anim) | **Turun kelas** |
| **UI panel/tombol/ribbon** | `custom_assets/UI/*` (16 file) | `UI/Banners/Carved_9Slides`, `UI/Buttons/Button_Blue_9Slides`, `UI/Ribbons/Ribbon_*_3Slides` — semua 9-slice siap diskalakan | **Tidak dipakai (0 referensi)** |
| Ikon | Free Pack `Icon_01..12` | `UI/Icons/Regular_01..10` + `Pressed_*` + `Disable_*` (punya state!) | **Turun kelas** |
| Kursor | `custom_assets/UI/cursor_*.png` | Free Pack `Cursors/Cursor_01..04` | **Tidak dipakai (0 referensi)** |
| Ledakan | Free Pack `Explosion_01/02` | `Effects/Explosion/Explosions.png` | **Turun kelas** |
| Dekorasi | Free Pack bushes/rocks | `Deco/01..18.png` + `Water/Rocks/Rocks_01..04` | **Tidak dipakai** |
| **Faksi Goblin** | — | `Goblins/Troops/{Torch,TNT,Barrel}` + `Goblin_House` + `Wood_Tower` | **Tidak dipakai** |

Dari seluruh Update 010, hanya **15 file** yang dipakai (Fire, Dead, Bridge, GoldMine, M_Spawn/M_Idle, Pointers 01–02, dan 6 Construction/Destroyed). Sisanya nol.

**Inilah akar keluhan kamu**: peta monoton (tilemap kecil tanpa elevation), UI tidak nyatu (panel custom + font OS), altar jelek (custom).

### 2.2 Batas aturan yang tidak bisa dipenuhi 100%

Update 010 faksi Knights **tidak punya** Lancer, Monk, Mage. Jadi Free Pack tetap wajib untuk 3 unit itu. Aturan prioritas harus dibaca per-aset, bukan per-pack.

### 2.3 Daftar aset yang benar-benar belum ada

| Aset | Keterangan |
|---|---|
| **Font pixel** | Paket Tiny Swords tidak menyertakan font apa pun. Harus diambil dari luar & **di-host lokal** (.woff2 di repo) karena LAN sering tanpa internet |
| **Hero: animasi Death/Dead** | Hanya ada Idle/Run/Attack/Portrait |
| **Altar of Heroes (4 state)** | Ada tapi jelek — perlu dibuat ulang |
| **Construction/Destroyed** Barracks/Archery/Monastery | Placeholder kasar 3–6 KB |
| **Tekstur fog of war** | Tidak ada — tapi bisa digambar prosedural, tidak perlu aset |
| Tower terbakar/hancur | **Tidak kurang** — `Tower_Destroyed.png` + `Fire.png` sudah ada di Update 010 dan sudah dipakai |
| Mage / Golem / Dragon | Custom, tidak ada di pack resmi. Golem & Dragon belum dipakai di game |

---

## 3. `lan-server.mjs` vs `math-strike-kerja24c`

Yang **sudah** ditiru dengan benar: regex filter interface virtual, bentuk `alamatLan()`, pemisahan `/alamat` + `/healthz`, papan room di `/ws`.

Yang **belum** ditiru:

| # | Di math-strike | Di `lan-server.mjs` | Dampak |
|---|---|---|---|
| 1 | `kelompokWifi(ip)` — room hanya beredar di dalam satu kelompok jaringan | Broadcast ke **semua** client | Di jaringan multi-subnet / kalau server kena expose, room bocor lintas jaringan |
| 2 | `alamatPerangkat(req)` — baca `X-Forwarded-For`, hanya percaya kalau socket lokal (anti-spoof) | IP client tidak pernah dibaca | Tidak bisa grouping, tidak bisa rate-limit per device |
| 3 | Rate limit `pesanPerDetik: 50`, lebih dari itu `close(1008)` | **Tidak ada** | Satu client nakal/bug loop bisa membanjiri host |
| 4 | `maxPayload: 16_384` di WebSocketServer | Hanya hard cap 8 MB di frame 64-bit | Frame 16-bit sampai 64 KB lolos tanpa batas |
| 5 | Validasi skema ketat (`infoSah`: cek tipe, panjang, rentang 0–64) | Hanya `String(...).slice(0,18)` untuk nama; `cmd` & `state` direlay mentah | Guest bisa kirim `cmd` sembarang bentuk ke host |
| 6 | Ping tiap 25 s + `terminate()` kalau tidak ada pong | Balas ping, **tidak pernah** inisiasi | Socket mati (HP masuk sleep, Wi-Fi drop) menggantung selamanya |
| 7 | Host reconnect pakai kode room lama kalau masih bebas | Host putus → room **dihapus** | Wi-Fi kedip = match hilang total |
| 8 | `info-room` — host push update (jumlah pemain, fase) lalu papan umumkan ulang | Hanya recompute saat join/leave | Daftar room bisa basi |
| 9 | `PapanInti` = class murni tanpa transport + `papan-ws.ts` = adapter + `alamat-lan.ts` murni. Semua ada tes | Satu file 458 baris, semua tercampur, **nol tes** | Tidak bisa dites tanpa buka socket |
| 10 | Pakai library `ws` | RFC 6455 tulis tangan ~110 baris | Tidak validasi bit RSV, tidak paksa frame client harus mask, `fragChunks` bocor kalau fragmen biner |
| 11 | Kode room 5 huruf | 4 karakter | Ruang kode lebih kecil (sepele) |

**Perbedaan arsitektur yang perlu keputusan sadar:** math-strike pakai server hanya sebagai *papan sinyal*, lalu data game lewat **WebRTC P2P** ("Data game tidak lewat sini"). `lan-server.mjs` me-relay seluruh snapshot lewat server. Untuk 2 pemain di LAN, relay lebih sederhana dan masih cepat — ini **pilihan yang wajar**, bukan cacat. Tapi perlu dicatat di PRD supaya tidak terkesan kelewat.

---

## 4. Rekomendasi Arsitektur (Next vs Rust)

Toolchain yang ada di mesin ini: Node v20.20.2, npm 10.8.2, Rust 1.99.1, cargo 1.99.1. **Tidak ada** pnpm, **tidak ada** wasm-pack.

### Rekomendasi: **TypeScript npm-workspaces monorepo — bentuknya mengikuti `math-strike-kerja24c`. Bukan Next.js, bukan Rust.**

**Kenapa bukan Next.js.** Next itu framework React SSR. Untuk RTS canvas, SSR / RSC / file-routing tidak memberi apa pun — yang didapat malah hydration, kompleksitas bundler, dan tekanan re-render React di HUD yang harus jalan 60 fps. Lobinya cuma 2 layar. Next akan dilawan arah, bukan dibantu.

**Kenapa bukan Rust (untuk sekar).** Rust + WASM baru menang kalau butuh >1.000 unit atau lockstep deterministik dengan replay. Kita tidak butuh keduanya — 2 pemain, authoritative host snapshot. Biayanya: wasm-pack belum ada, setiap sentuhan DOM/aset harus lewat batas FFI, debugging lebih berat, dan kecepatan iterasi konten gameplay (yang porsinya ~80% dari sisa kerja) turun tajam.
**Tapi pintunya dibiarkan terbuka:** kalau paket `sim` murni, bebas DOM, dan deterministik di balik satu antarmuka, dia bisa ditukar ke core Rust/WASM nanti **tanpa menyentuh** render/ui/net.

**Kenapa TS workspaces.** Konsisten dengan codebase kamu sendiri yang sudah terbukti, nol toolchain baru, vitest untuk nguji sim (tempat bug RTS bersembunyi), esbuild untuk bundle cepat, dan server bisa pakai modul sim yang sama persis untuk mode dedicated host.

### Rancangan paket

```
hope-for-the-future/
  packages/
    shared/    protokol pesan LAN, konstanta, kelompokWifi, tipe bersama
    sim/       INTI: simulasi RTS deterministik. NOL DOM, NOL import ke render/ui
    aset/      manifes aset + definisi slicing sprite (divalidasi saat build)
    render/    renderer canvas2d: terrain, sprite, fx, minimap (baca state read-only)
    ui/        HUD / sidebar / lobby — TS + web component, bukan React
    net/       antarmuka Transport: LocalTransport | HostTransport | GuestTransport
    client/    komposisi: game loop, input, perekat sim+render+ui+net
    server/    http statis + papan room ws + alamat-lan (port dari math-strike)
  public/assets/   Tiny Swords (Update 010) + (Free Pack) + custom
  docs/  scripts/
```

**Aturan "clean"-nya (satu aturan, ini yang bikin bedanya):** arah dependensi satu arah saja.
`server → shared`, `client → {sim, render, ui, net, aset, shared}`, dan **`sim` tidak bergantung pada apa pun selain `shared`**.
`sim` tidak boleh menyentuh `document`, `Image`, `canvas`, atau `Math.random` (RNG di-inject dengan seed).
Hasilnya: sim bisa dites headless, bisa di-replay dari seed + daftar command — dan itulah satu-satunya cara RTS LAN bisa di-debug.

### Alternatif kalau kamu tetap mau Next
Next dipakai **hanya** sebagai shell lobby/menu, canvas jadi client-only island (`dynamic(..., {ssr:false})`), dan `packages/sim` tetap persis seperti di atas. Bisa, tapi menambah ~40 MB dependensi dan satu build step untuk keuntungan yang hampir nol di game ini.

---

## 5. Jawaban untuk 5 Keluhan Kamu

| Keluhan | Akar masalah | Rencana |
|---|---|---|
| **Peta monoton, tidak ada naik-turun** | `drawTerrain()` hardcode indeks tile; satu pulau persegi + 3 kolom sungai; `Tilemap_Elevation.png` tidak dipakai | Data terrain jadi heightmap per tile (level 0 air/pantai, 1 dataran, 2 plateau). Tepi plateau auto-tile pakai cliff set resmi. **Ramp jadi satu-satunya jalan antar level** → chokepoint. Bonus jarak pandang/serang di tanah tinggi (ala WC3) |
| **Peta kecil sekali** | 45×30 tile = 2.880×1.920 px | Naik ke **96×96 tile = 6.144×6.144 px** (±11× luas sekarang). Butuh chunked rendering + minimap yang di-regenerate, bukan digambar ulang tiap frame |
| **Tidak ada goblin penjaga harta** | Faksi Goblin Update 010 sama sekali tidak dipakai | Camp creep netral (`team: 'neutral'`): Torch (jarak dekat), TNT (pelempar), Barrel (bom diri) jaga `Goblin_House` + harta. Pasif sampai kamu masuk radius aggro, balik ke camp, respawn tiap N menit. Mati → drop gold/meat + XP hero. Ditaruh di gold tengah & tiap plateau |
| **Hero harus ada dari awal; mati → bangun Altar dulu** | `initWorld` tidak spawn hero; hero mati = hilang permanen | Spawn 1 hero di awal (dipilih di lobby). Hero mati → masuk state `fallen`, bukan dihapus. Revive lewat Altar (bayar gold + tunggu). Butuh aset animasi mati hero |
| **Altar jelek** | `custom_assets/Buildings/Altar_Blue.png` buatan sendiri | Lihat §6 — alur imagine-agy |
| **Font jelek, tidak cocok UI** | `style.css:24` = `system-ui` — font OS, bukan pixel font. Dan seluruh chrome UI pakai panel custom, bukan 9-slice resmi | Ganti ke pixel font ber-lisensi bebas, **di-host lokal**. Lalu ganti seluruh panel/tombol/ribbon ke 9-slice resmi Update 010. Dua-duanya harus seiring — font pixel di atas panel custom tetap tidak nyatu |

---

## 6. `imagine-agy` / Antigravity — Hasil Pengecekan

**Jawaban singkat: ya, saya bisa mengarahkannya dari CLI — tapi defaultnya rusak di mesin ini
dan harus selalu di-override.**

### 6.1 Yang terverifikasi

| Cek | Hasil |
|---|---|
| `agy` terpasang | **Ya** — `/home/server/.local/bin/agy`, v1.0.10 |
| `agy` sudah sign-in & responsif | **Ya** — `agy -p "Reply with exactly one word: PONG"` → `PONG`, exit 0 |
| `npx imagine-agy doctor` | Binary agy ditemukan. Skill Claude Code belum dipasang — **tidak perlu**, CLI dipanggil langsung dari Bash |
| Jalur generate sampai ke backend gambar | **Ya** — ditandai balasan `429 RESOURCE_EXHAUSTED` dari `generate_image` (bukan error lokal) |
| Ada gambar yang berhasil dihasilkan | **Belum** — kuota backend gambar habis di 3 percobaan |

### 6.2 Dua jebakan yang ditemukan lewat percobaan

**Jebakan 1 — model default tidak ada.** imagine-agy memakai `--model gemini-3.1-pro-low`.
Model itu **tidak ada** di instalasi agy ini. agy menolaknya lalu mencetak daftar model yang
tersedia; imagine-agy membaca keluaran itu sebagai "tidak ada gambar" dan melapor:

```
✖ No image at the expected path.
```

Pesan itu **menyesatkan** — tidak ada gambar karena prompt-nya tidak pernah dijalankan.
**`--model` wajib dipasang eksplisit setiap kali.** Konsekuensi penting: kalau skill
`/imagine-agy` dipasang lalu dipanggil dari Claude Code, skill itu juga memakai default yang
sama dan akan gagal dengan pesan yang sama membingungkan.

Model yang benar-benar ada di sini (`agy models`):

```
gemini-4-neon-{low,medium,high,xhigh}      gemini-4-hydrogen-{low,medium,high,xhigh}
gemini-4-carbon-{low,medium,high}          gemini-4-argon-{low,medium,high}
gemini-pro-orchestrator{,-neon,-argon}     gemini-3.8-flash-{low,medium,high}
claude-opus-5-5-{low,medium,high}          claude-sonnet-5-5-{low,medium,high}
gpt-oss-120b-medium
```

**Jebakan 2 — kuota per-model.** Dengan `--model gemini-4-hydrogen-low`, agy menjawab:

```
RESOURCE_EXHAUSTED (code 429): You have exhausted your capacity on this model.
Your quota will reset after 9m18s.
```

Dicoba lagi dengan driver lain (`gemini-3.8-flash-low`) — hasilnya 429 juga, tapi pesannya
berbeda dan lebih informatif:

```
The image generation request failed due to model quota exhaustion:
RESOURCE_EXHAUSTED (code 429): You have exhausted your capacity on this model.
Your quota will reset after ~8 minutes.
```

Bedanya penting: di sini driver-nya **menerima tugas dan benar-benar memanggil `generate_image`**,
lalu backend gambar itulah yang kehabisan kuota. Jadi kuotanya ada di **backend pembuat gambar**
dan dipakai bersama lintas driver model — **pindah driver tidak menolong.** Konsekuensinya:
pembuatan aset massal harus dijadwal dengan jeda, tidak bisa ditembak berurutan.

> **Status akhir pengecekan:** 3 percobaan, nol gambar berhasil. Jalurnya terbukti tersambung
> sampai ke backend gambar (dibuktikan oleh 429, bukan error lokal), tapi **kualitas output
> belum terbukti** karena kuota habis. Perlu diulang setelah kuota reset.

### 6.3 Batas teknis yang tetap berlaku

Terlepas dari dua jebakan di atas, imagine-agy mengeluarkan **JPG** dari model gambar AI:
tanpa kanal alpha, tepi anti-aliased, palet bebas, ukuran tidak presisi. Sprite game butuh
kebalikannya — PNG beralpha, tepi tajam, palet terbatas, ukuran pas (Altar = 192×256).
Opsi `--ratio` pun hanya menerima `1:1 | 16:9 | 9:16 | 4:3 | 3:4`, jadi 192×256 (= 3:4) harus
diminta sebagai `3:4` lalu dipotong presisi di pipeline.

**Output imagine-agy tidak bisa langsung dipakai sebagai sprite.**

Alur yang diusulkan:

1. `imagine-agy --model <eksplisit>` → **concept art** (komposisi, siluet, arah warna).
2. Pipeline Python/Pillow: ambil palet asli dari sprite Tiny Swords resmi → quantize ke palet
   itu → resize nearest-neighbor ke ukuran tile pas → potong background jadi alpha →
   bersihkan piksel nyasar.
3. Review bareng kamu, ulang kalau belum pas.

Untuk Altar saya sarankan **digambar langsung** di Pillow dari palet resmi (hasilnya paling
tajam dan ukurannya pasti), dengan imagine-agy hanya sebagai referensi bentuk.

---

## 7. Dua Hal yang Saya Minta Diputuskan Sebelum Tahap 2

1. **`git init` dulu.** Folder ini bukan git repo. Rewrite arsitektur tanpa version control itu kerja tanpa jaring. `game.js` 115 KB yang sekarang jalan harus bisa dikembalikan.
2. **`castle-defense.*` dan `valley.*`** (total ~3.740 baris) di luar ruang lingkup PRD. Diarsipkan ke `legacy/`, atau dihapus?

---

## 8. Usulan Milestone (urut prioritas — detailnya di Tahap 2)

| M | Isi | Kenapa urutannya di sini |
|:---:|---|---|
| **M0** | `git init` + commit kode sekarang + rangka monorepo + CI vitest | Jaring keselamatan sebelum apa pun disentuh |
| **M1** | `packages/sim` murni + tes: ekonomi, bangunan, tempur, hero. Headless, tanpa render | Inti yang benar dulu; semua milestone lain bergantung ke sini |
| **M2** | `packages/aset` manifes + validator + pindah ke aset resmi Update 010 (tilemap, unit, bangunan, ikon, kursor) | Menyelesaikan "turun kelas" aset; pondasi visual |
| **M3** | Terrain baru: 96×96, heightmap + elevation + cliff + ramp + autotile. Minimap chunked | Keluhan "monoton & kecil" |
| **M4** | UI rebuild: 9-slice resmi + pixel font lokal | Keluhan "font & UI tidak nyatu" |
| **M5** | Hero dari awal + state `fallen` + revive via Altar + Altar baru + animasi mati | Keluhan hero & altar |
| **M6** | Camp goblin netral penjaga harta + respawn + drop XP | Keluhan goblin |
| **M7** | Fog of war + bonus visi tanah tinggi | Butuh M3 (elevation) lebih dulu |
| **M8** | Server LAN: port `PapanInti` + `kelompokWifi` + rate limit + validasi skema + ping/pong + reconnect | 11 temuan di §3 |
| **M9** | Pause + menang/kalah lengkap (surrender, draw) + layar hasil | — |
| **M10** | Polish: Deco, bayangan, partikel, Explosions resmi, SFX | Terakhir, setelah semua sistem stabil |
