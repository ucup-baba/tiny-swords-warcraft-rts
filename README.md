# Tiny Swords: Warcraft RTS — LAN Edition

RTS bergaya Warcraft klasik dengan aset [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords)
(Pixel Frog), untuk 2 pemain lewat Wi-Fi/LAN.

- **Spesifikasi:** [`PRD_WARCRAFT_RTS.md`](PRD_WARCRAFT_RTS.md) — §1–7 asli, §8–18 Revisi 2.0
- **Audit kode lama:** [`docs/AUDIT_TAHAP_1.md`](docs/AUDIT_TAHAP_1.md)

## Status

Sedang dalam rewrite arsitektur dari `game.js` monolitik ke monorepo TypeScript.
Milestone ada di PRD §18. **Selesai: M0.**

Kode lama (`game.js`, `index.html`, `style.css`, `lan-server.mjs`) masih utuh dan
masih bisa dijalankan sampai digantikan per milestone.

## Perintah

```bash
npm install
npm run periksa          # typecheck + tes + cek headless (semua gerbang M0)
npm test                 # vitest saja
npm run typecheck        # tsc -b saja
npm run periksa:headless # AC-8.4 saja
node lan-server.mjs      # jalankan game LAMA di http://localhost:8080
```

## Struktur

| Paket | Isi | Boleh mengimpor |
| :--- | :--- | :--- |
| `@hftf/shared` | Konstanta, tipe, protokol LAN | — |
| `@hftf/sim` | **Inti simulasi deterministik.** Nol DOM | `shared` |
| `@hftf/aset` | Manifes aset + slicing sprite | `shared` |
| `@hftf/net` | Transport: Local \| Host \| Guest | `shared` |
| `@hftf/render` | Renderer canvas2d | `shared`, `sim`, `aset` |
| `@hftf/ui` | HUD, sidebar, lobi | `shared`, `sim`, `aset` |
| `@hftf/client` | Game loop, input, perekat | semua di atas |
| `@hftf/server` | HTTP statis + papan room WS | `shared` |

Arah dependensi dan kemurnian `sim` **ditegakkan tes**, bukan niat baik —
lihat `packages/shared/test/arsitektur.test.ts`. Menambahkan
`import { ctx } from '../render'` ke `packages/sim` membuat `npm test` gagal.

`legacy/` berisi prototipe di luar ruang lingkup PRD; tidak dibangun, tidak diimpor.
