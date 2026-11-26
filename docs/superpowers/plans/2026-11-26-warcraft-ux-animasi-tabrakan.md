# Warcraft III UX, Animasi Lengkap, Anti-Tembus Bangunan & Layar 1280×720 Implementation Plan

> **For agentic workers:** Executing inline task-by-task following TDD and verifying with `npm run periksa`, `npm run bangun`, `scripts/uji-seimbang.mjs`, and real browser verification. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect research, armor/damage counters, rally point, Command Card, dynamic per-unit tabs, floating HP/resource numbers, Warcraft training progress sweep, fixed `1280×720` zero-scrollbar layout, crisp cropped icons/cursors, full unit/pawn/hero/goblin/sheep animations, and building/tree/mine collision avoidance across the monorepo.

**Architecture:** Deterministic occupancy grid (`Uint8Array`) and unit animation/facing/sheep movement live purely inside `packages/sim` alongside new damage/heal `Kejadian` events; `packages/aset` fixes sprite dimensions & per-row frame counts; `packages/render` renders full animations, carried resources, Rally Point & command flags, and floating combat text; `packages/ui` + `packages/client` lock `#akar` to `1280×720` scaled viewport with cropped icons/cursors, dynamic per-unit tabs, contextual building research & progress sweeps, and clean `Arrow`/`Edge`/`Middle-Drag` camera vs `A`/`S`/`H`/`Q` commands.

**Tech Stack:** TypeScript 5.9 monorepo (`@hftf/*`), Vitest + jsdom, esbuild, HTML5 Canvas 2D, WebSocket (`ws`).

**Spec:** [docs/superpowers/specs/2026-11-26-warcraft-ux-animasi-tabrakan-design.md](../../specs/2026-11-26-warcraft-ux-animasi-tabrakan-design.md)

## Global Constraints
- `packages/sim` MUST remain 100% headless and deterministic (no DOM, no `Math.random()`, no render imports; passes `npm run periksa:headless` and determinism tests).
- `packages/ui` MUST NOT import `@hftf/render`; portrait/icon/cursor crop providers are injected by `packages/client`.
- Fixed stage resolution: `#akar` is `1280×720` (`#panggung` `976×720` + `#sisi` `304×720`), scaled uniformly to fit any viewport with zero scrollbars.
- Research UI is contextual in the bottom selection panel when selecting `Barracks`, `Archery Range`, or `Monastery`; sidebar remains 3 tabs (`Bangun`, `Pasukan`, `Hero`).
- Per-unit filter tabs hide completely when unit count for that role is `0`.
- All unit tests (`npm run periksa`) and headless balance check (`scripts/uji-seimbang.mjs`) must stay green.

---

### Task 1: Simulasi — Occupancy Grid, Tabrakan, Unit Separation, State Animasi, Domba & Event HP

**Files:**
- Create: `packages/sim/src/halangan.ts`
- Create: `packages/sim/src/sistem/domba.ts`
- Modify: `packages/sim/src/tipe.ts`, `packages/sim/src/dunia.ts`, `packages/sim/src/jalur.ts`, `packages/sim/src/sistem/gerak.ts`, `packages/sim/src/sistem/spawn.ts`, `packages/sim/src/sistem/pekerja.ts`, `packages/sim/src/sistem/tempur.ts`, `packages/sim/src/sistem/bangunan.ts`, `packages/sim/src/sistem/goblin.ts`, `packages/sim/src/sistem/hero.ts`, `packages/sim/src/snapshot.ts`, `packages/sim/src/index.ts`
- Test: `packages/sim/test/animasi-halangan.test.ts`, `packages/sim/test/fog.test.ts`

**Interfaces:**
- Produces:
  - `AksiUnit = 'diam' | 'lari' | 'serang' | 'tebang' | 'tambang' | 'bangun' | 'bawaDiam' | 'bawaLari'`
  - `Unit.{ arah: 1 | -1, aksi: AksiUnit, tikAksi: number, sudutSerang: number }`
  - `Domba.{ asalX, asalY, tx, ty, jedaJalan, arah: 1 | -1, bergerak: boolean }`
  - `Dunia.halangan: Uint8Array` + `segarkanHalangan(dunia: Dunia): void`
  - `Kejadian` variants: `unitLuka`, `unitSembuh`, `bangunanLuka`
  - `Snapshot` includes `aksi`, `arah`, `tikAksi`, `sudutSerang`, `bawaanJenis`, `domba.{bergerak, arah}`, `bangunan.{rallyX, rallyY, antrean, riset, revive, sisaBangun}`, `riset`, and filtered `kejadian`.

- [ ] **Step 1**: Write failing tests in `packages/sim/test/animasi-halangan.test.ts` verifying:
  - Unit ordered across a Barracks/Castle footprint routes around it instead of passing through interior tiles.
  - Pawn harvesting tree/mine sets `aksi` to `'tebang'`/`'tambang'`, then `'bawaLari'` while returning with `bawaanJenis`.
  - Attacking unit sets `aksi = 'serang'`, faces target (`arah`), and emits `unitLuka` / `bangunanLuka`; Monk/Hero heal emits `unitSembuh`.
  - Sheep move deterministically around their origin without crossing water/cliffs/buildings.
  - Determinism holds across two identical seeds.
- [ ] **Step 2**: Implement `halangan.ts`, wire into `jalur.ts`, `gerak.ts` (including `pisahUnit`), `dunia.ts`, `spawn.ts`, `pekerja.ts`, `tempur.ts`, `bangunan.ts`, `goblin.ts`, `hero.ts`, `domba.ts`, and `snapshot.ts`; also inspect & fix the `fog.test.ts:92` regression if Archer dies to plateau goblins before `TICK_PER_FOG`.
- [ ] **Step 3**: Run `npm run typecheck && npx vitest run packages/sim` and `N=8 MAKS=25 node scripts/uji-seimbang.mjs` to confirm all sim tests pass and balance remains healthy.

---

### Task 2: Manifes Aset & Renderer — Animasi Lengkap, Fix Frame Kosong, Bendera Rally/Perintah & Floating Text

**Files:**
- Modify: `packages/aset/src/jenis.ts`, `packages/aset/src/manifes.ts`, `packages/aset/test/manifes.test.ts`
- Modify: `packages/render/src/entitas.ts`, `packages/render/src/efek.ts`, `packages/render/src/gambar.ts`, `packages/render/src/index.ts`

**Interfaces:**
- Produces:
  - `Aset.frameBaris?: readonly number[]` for accurate non-blinking animation on rows with fewer frames (`Archer`, `Torch`, `TNT`, `Barrel`).
  - `GOBLIN.barrel` fixed to `128×128, 6×6`.
  - `BANGUNAN_FASE` includes `barracksKonstruksi/Hancur`, `archeryKonstruksi/Hancur`, `monasteryKonstruksi/Hancur`, `altarKonstruksi/Hancur`.
  - `potongKursor(a: Aset, ukuran?: number)` in `gambar.ts` (crops transparent margin, preserves crisp pixel art).
  - `Efek.tandaiPerintah(x: number, y: number, jenis: 'pindah' | 'serang' | 'rally')` for animated ground command flags.
  - `Efek` renders floating combat/heal/resource text (`-24`, `+35`, `+15g`) triggered from `Kejadian`.
  - `gambarEntitas` renders full animations (`serang`, `tebang`, `tambang`, `bangun`, `bawaDiam`, `bawaLari` + overhead resource sprite), `u.arah` facing, bouncing walking sheep, and building Rally Point banner + dashed gold line.

- [ ] **Step 1**: Update `packages/aset` (`jenis.ts`, `manifes.ts`) with `frameBaris`, fixed `GOBLIN.barrel`, and all building construction/destroyed assets; run `npx vitest run packages/aset`.
- [ ] **Step 2**: Update `packages/render/src/gambar.ts`, `entitas.ts`, and `efek.ts` for full animations, carried resources, sheep bouncing, Rally Point flag, command flags, and floating HP/resource numbers.
- [ ] **Step 3**: Run `npm run typecheck && npx vitest run packages/aset packages/render`.

---

### Task 3: UI & Client — Layar Tetap 1280×720, Crop Ikon/Kursor, Tab Per Unit Dinamis, Command Card, Riset Kontekstual, Progres Pelatihan & Hotkey Bersih

**Files:**
- Modify: `packages/ui/src/gaya.ts`, `packages/ui/src/hud.ts`, `packages/ui/src/lobi.ts`
- Modify: `packages/client/src/input.ts`, `packages/client/src/main.ts`
- Modify: `packages/server/src/protokol.ts` (strict validation for `cmd` shape including `riset` & `rally`)
- Test: `packages/ui/test/hud.test.ts`, `packages/server/test/papan.test.ts`

**Interfaces:**
- Produces:
  - `#bingkai-layar` + `#akar` (`1280×720` fixed, auto `transform: scale(...)`, `0` scrollbars).
  - `Hud` `AksiHud` callbacks: `pilihTab`, `mulaiBangun`, `latih`, `batalLatih`, `riset`, `bangkitkanHero`, `pilihFilterUnit`, `perintahUnit` (`serang` | `stop` | `tahan` | `skill`), `fokusUnit`.
  - `Hud.pasangIkonSumber(p: (kunci: 'gold' | 'kayu' | 'daging' | 'supply') => string | null)` for cropped 26×26 resource icons.
  - Dynamic `#tab-unit` bar above `#seleksi` showing only unit roles with count `> 0`.
  - Warcraft III bottom panel: portrait + HP/armor info + center queue/sweep progress (`%`, dark-to-bright vertical wipe, click-to-cancel) or unit mini-grid + right Command Card (`A/S/H/Q` + cooldown sweep) OR contextual Research buttons (`Senjata Tajam`/`Baju Zirah`/`Busur Lentur`/`Fokus Arkana`).
  - Sidebar `Pasukan` cards show `ringkasCounter` badge + active training progress `%` sweep.
  - Camera pans with Arrow keys, Edge Scroll, and Middle-Click Drag (`button === 1`); `A` (Attack-Move) and `S` (Stop) never pan camera; right-click with selected production building sets Rally Point + spawns gold flag.

- [ ] **Step 1**: Write failing UI jsdom tests (`packages/ui/test/hud.test.ts`) verifying: dynamic unit tabs hide at 0 and appear at >0, contextual research buttons appear for Barracks/Archery/Monastery, Warcraft progress sweep `%` renders during training/research, and Command Card buttons fire callbacks.
- [ ] **Step 2**: Implement `packages/ui/src/gaya.ts`, `packages/ui/src/hud.ts`, `packages/client/src/input.ts`, `packages/client/src/main.ts`, and `packages/server/src/protokol.ts`.
- [ ] **Step 3**: Run `npm run periksa` & `npm run bangun` and verify 0 errors and all tests green.

---

### Task 4: Verifikasi Akhir — Balance Telemetry & Browser Real Testing

- [ ] **Step 1**: Run `npm run periksa` (full typecheck + all vitest suites + headless architecture gate) and `N=8 MAKS=25 node scripts/uji-seimbang.mjs`.
- [ ] **Step 2**: Run `npm run bangun`, start `node packages/server/dist/main.js` as background daemon, and verify in real browser at both `1280×720` and a narrower window (e.g. `960×640`) via the `browser` subagent:
  - 0 console errors, 0 failed/404 requests, **0 scrollbars** (`scrollHeight <= clientHeight` and `scrollWidth <= clientWidth` on sidebar & body).
  - Large crisp resource icons & cursor (`>= 36px` visual size).
  - Dynamic per-unit tabs appear only for existing roles and disappear when count = 0.
  - Pawn chop/mine/build/carry animations + walking sheep + units routing around buildings without walking through walls.
  - Building selection shows contextual Research buttons (`Senjata Tajam`, `Baju Zirah`), Warcraft dark→bright `%` training progress, and right-click Rally Point flag + ground command flags.
  - Floating `-DMG` / `+HEAL` numbers during combat.
- [ ] **Step 3**: Inspect all host-verified browser screenshots via `read_file` and commit cleanly.
