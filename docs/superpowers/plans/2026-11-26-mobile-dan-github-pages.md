# Mobile Touch Controls & GitHub Pages Hosting Implementation Plan

> **For agentic workers:** Executing inline task-by-task following TDD, verifying with `npm run periksa` and `npm run bangun:pages`, then creating the public GitHub repository `ucup-baba/tiny-swords-warcraft-rts` and deploying live to GitHub Pages.

**Goal:** Enable comfortable mobile touch RTS gameplay (selectable Mode 1 Smart Tap and Mode 3 Virtual Joystick + Drag Select, pinch-zoom, minimap touch, fullscreen + landscape prompt) and deploy a lean static build to GitHub Pages at `https://ucup-baba.github.io/tiny-swords-warcraft-rts/` without breaking local LAN mode.

**Architecture:** `packages/ui` provides the mobile utility buttons (`☰ Menu`, `⛶`, `⬚ Kotak`), Virtual Joystick overlay, Portrait-to-Landscape prompt, Mode switcher in Pause Menu, and `Lobi.setModeStatis()`; `packages/client` adds a dedicated `sentuh.ts` touch/pinch/joystick module and auto-detects static hosting (`./alamat`) on boot; `scripts/bangun-pages.mjs` + `scripts/deploy-pages.mjs` package only manifest-referenced assets + `bundel.js` + `index.html` into `dist-pages/` and publish to `gh-pages`.

**Tech Stack:** TypeScript 5.9 monorepo, Vitest + jsdom, esbuild, GitHub CLI (`gh`).

**Spec:** [docs/superpowers/specs/2026-11-26-mobile-dan-github-pages-design.md](../../specs/2026-11-26-mobile-dan-github-pages-design.md)

## Global Constraints
- `packages/sim` remains untouched & 100% deterministic.
- `packages/ui` MUST NOT import `@hftf/render` or reference `custom_assets/UI`.
- Desktop mouse + keyboard controls MUST remain 100% intact.
- Local LAN multiplayer (`npm run dev`) MUST continue working identically when `/alamat` returns JSON.
- GitHub Pages build MUST use relative paths (`./bundel.js`) and emit 0 WebSocket errors when hosted statically.

---

### Task 1: Mobile UI, Menu Mode Switcher, Virtual Joystick, Portrait Overlay & Static Lobby (`packages/ui`)

**Files:**
- Modify: `packages/ui/src/gaya.ts`, `packages/ui/src/hud.ts`, `packages/ui/src/menu.ts`, `packages/ui/src/lobi.ts`, `packages/ui/src/index.ts`
- Test: `packages/ui/test/menu.test.ts`, `packages/ui/test/hud.test.ts`

**Interfaces:**
- Produces:
  - `export type ModeSentuh = 'tapPintar' | 'joystick'`
  - `Hud` elements & methods: `tombolMenu`, `tombolFullscreen`, `tombolKotak`, `joystickEl`, `joystickKenop`, `layarPutar`, `setModeSentuh(mode: ModeSentuh, sentuhAktif: boolean)`, `setKotakAktif(aktif: boolean)`, `setLayarPutar(tampil: boolean)`
  - `AksiHud` optional callbacks: `bukaMenu?()`, `layarPenuh?()`, `toggleKotak?()`, `lewatPutar?()`
  - `buatMenuJeda` options: `modeSentuh?: ModeSentuh`, `aksi.ubahModeSentuh?(m: ModeSentuh)`, `aksi.layarPenuh?()`
  - `Lobi.setModeStatis(pesan?: string)`

- [ ] **Step 1**: Update `gaya.ts`, `hud.ts`, `menu.ts`, `lobi.ts`, and `index.ts`.
- [ ] **Step 2**: Add jsdom tests in `packages/ui/test/menu.test.ts` & `packages/ui/test/hud.test.ts` covering `ubahModeSentuh`, mobile utility buttons, joystick visibility per mode, landscape overlay, and `Lobi.setModeStatis()`.
- [ ] **Step 3**: Run `npm run typecheck && npx vitest run packages/ui`.

---

### Task 2: Touch Controls Module, Pinch-Zoom, Minimap Touch, Static Detection & `index.html` (`packages/client` + `index.html`)

**Files:**
- Create: `packages/client/src/sentuh.ts`
- Create: `packages/client/test/sentuh.test.ts`
- Modify: `packages/client/src/main.ts`, `index.html`

**Interfaces:**
- Produces:
  - `PengendaliSentuh` class in `packages/client/src/sentuh.ts`:
    - Handles Mode 1 (`tapPintar`: 1-finger pan, 2-finger pinch-zoom, tap select/double-tap/command/rally, toggle `Kotak` or 350ms hold marquee).
    - Handles Mode 3 (`joystick`: virtual joystick camera velocity vector + 1-finger canvas marquee + 2-finger pinch-zoom + tap select/command/rally).
    - Handles minimap touch pan (`touchstart`/`touchmove`).
    - Reads/writes `'hftf.modeSentuh'` in `localStorage`.
- [ ] **Step 1**: Update `index.html` with relative `./bundel.js` and mobile viewport meta tags.
- [ ] **Step 2**: Implement `packages/client/src/sentuh.ts` and integrate with `packages/client/src/main.ts` (including static hosting auto-detection via `fetch('./alamat')`, fullscreen + `orientation.lock('landscape')`, portrait check, hiding `#kursor` on touch, and applying joystick camera velocity inside `bingkai()`).
- [ ] **Step 3**: Write & run tests in `packages/client/test/sentuh.test.ts` (`npx vitest run packages/client`).

---

### Task 3: Lean GitHub Pages Build & Deploy Scripts

**Files:**
- Create: `scripts/bangun-pages.mjs`
- Create: `scripts/deploy-pages.mjs`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1**: Add `dist-pages/` to `.gitignore` and scripts `"bangun:pages"` + `"deploy:pages"` to `package.json`.
- [ ] **Step 2**: Implement `scripts/bangun-pages.mjs` (runs `npm run bangun`, copies `index.html`, `bundel.js`, `public/font/PixelifySans.ttf`, `.nojekyll`, and every file in `SEMUA` from `packages/aset/dist/index.js`, verifying 0 missing assets).
- [ ] **Step 3**: Implement `scripts/deploy-pages.mjs` (runs `bangun-pages.mjs`, builds clean orphan commit from `dist-pages/` on `gh-pages`, pushes to `origin gh-pages`).

---

### Task 4: Full Verification, GitHub Repo Creation, & Live Pages Deployment

- [ ] **Step 1**: Run `npm run periksa` (typecheck + all vitest suites + headless gate) and `npm run bangun:pages`.
- [ ] **Step 2**: Commit all changes on `master`.
- [ ] **Step 3**: Create public repo `ucup-baba/tiny-swords-warcraft-rts` via `gh repo create`, push `master`, run `npm run deploy:pages` to push `gh-pages`, enable GitHub Pages on `gh-pages:/`, and verify live HTTP 200 on `https://ucup-baba.github.io/tiny-swords-warcraft-rts/` (index + `bundel.js` + font + sprite asset).
