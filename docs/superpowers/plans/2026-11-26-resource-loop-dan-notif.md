# Resource Loop, Tree Regrowth, Sheep Respawn, Resource Rings & Missing-Resource Notifications Plan

> **For agentic workers:** Executing inline task-by-task with TDD, full `npm run periksa`, balance telemetry, commit/push to GitHub `master`, local server rebuild, and live GitHub Pages update (`npm run deploy:pages`).

**Goal:** Make Pawns auto-search nearby resources (950–1150px) when depleted, regrow chopped trees from stumps after 75s, respawn sheep from both Castle (4 / 25s) and Houses (+2 / 30s), highlight/select resources with rings + bottom panel stock inspection, and show specific red-ribbon toast notifications whenever clicking locked Build/Train/Research/Revive buttons.

**Architecture:** Deterministic regrowth (`dunia.tunggul`), auto-retarget in `pekerja.ts`, and Castle+House sheep respawn in `bangunan.ts` stay strictly inside `packages/sim` and sync via `snapshot.ts`; `packages/render` draws stumps + dashed hover / solid selection rings + stock labels; `packages/ui` replaces silent HTML `disabled` with clickable `.terkunci` buttons + warning toast + resource inspection panel; `packages/client` computes exact missing Gold/Wood/Meat/Supply/Building messages and tracks hovered/selected resources on both PC and mobile touch.

**Tech Stack:** TypeScript 5.9 monorepo, Vitest + jsdom, esbuild, GitHub Pages (`gh-pages`).

**Spec:** [docs/superpowers/specs/2026-11-26-resource-loop-dan-notif-design.md](../../specs/2026-11-26-resource-loop-dan-notif-design.md)

## Global Constraints
- `packages/sim` remains 100% deterministic & headless.
- `packages/ui` never imports `@hftf/render` or `custom_assets/UI`.
- All 240+ tests and `periksa:headless` must stay green.

---

### Task 1: Simulasi — Auto-Cari Resource, Tunggul & Pohon Tumbuh Lagi, Respawn Domba Castle+House (`packages/sim`)
- **Files**: `packages/sim/src/tipe.ts`, `packages/sim/src/dunia.ts`, `packages/sim/src/sistem/pekerja.ts`, `packages/sim/src/sistem/bangunan.ts`, `packages/sim/src/sistem/spawn.ts`, `packages/sim/src/snapshot.ts`, `packages/sim/test/resource-loop.test.ts`, `packages/sim/test/ekonomi.test.ts`
- **Steps**: Implement `Tunggul`, `langkahTunggul`, `cariSumberBerikut` (`950px`/`1150px`), Castle+House `langkahDomba`, snapshot sync, and unit tests; run `npm run typecheck && npx vitest run packages/sim`.

### Task 2: Renderer — Tunggul Pohon, Lingkaran Hover & Seleksi Resource + Label Sisa Stok (`packages/render`)
- **Files**: `packages/render/src/entitas.ts`
- **Steps**: Export `SumberVisual`, render `dunia.tunggul` (`SUMBER.pohon` frame 8), dashed hover ring + solid selection ring + compact stock pill above resource; run `npm run typecheck && npx vitest run packages/render`.

### Task 3: UI & Client — Inspeksi Resource, Kursor Panen, & Notif Kekurangan Resource (`packages/ui`, `packages/client`)
- **Files**: `packages/ui/src/gaya.ts`, `packages/ui/src/hud.ts`, `packages/ui/test/hud.test.ts`, `packages/client/src/input.ts`, `packages/client/src/sentuh.ts`, `packages/client/src/main.ts`
- **Steps**: Add `.terkunci` clickable cards, `#toast.peringatan`, resource inspection in `perbaruiSeleksi`, `sumberDiTitik` selection/hover, and exact Indonesian missing-resource/supply/building/queue toast feedback; run `npm run typecheck && npx vitest run packages/ui packages/client`.

### Task 4: Verifikasi Penuh, Commit, Restart Server Lokal & Update GitHub Pages
- **Steps**: Run `npm run periksa`, `N=8 MAKS=25 node scripts/uji-seimbang.mjs`, commit & push `master`, restart local server on `:8080` with freshly built `bundel.js`, and run `npm run deploy:pages` to update `https://ucup-baba.github.io/tiny-swords-warcraft-rts/`.
