#!/usr/bin/env node
/**
 * Harness keseimbangan: menjalankan banyak match AI vs AI headless dan
 * melaporkan sebarannya.
 *
 * Menyetel angka tanpa mengukur hanya memindahkan tebakan. Ini yang membuat
 * "match terlalu cepat" jadi pernyataan yang bisa diuji.
 */
const sim = await import('../packages/sim/dist/index.js')

const SEED = Number(process.env.SEED ?? 0)
const JUMLAH = Number(process.env.N ?? 24)
const MAKS_MENIT = Number(process.env.MAKS ?? 45)
const MAKS_TICK = MAKS_MENIT * 60 * 60
/** Sampel keadaan tiap 30 detik permainan. */
const JEDA_SAMPEL = 30 * 60

function mainkan(seed) {
  const d = sim.buatDunia({ seed, heroBlue: 'king', heroRed: 'champion' })
  const ai = { blue: sim.buatAi('blue', 'normal', seed), red: sim.buatAi('red', 'normal', seed) }
  const sampel = []

  let tick = 0
  for (; tick < MAKS_TICK && d.hasil.jenis === 'berlangsung'; tick++) {
    for (const p of sim.langkahAi(d, ai.blue)) sim.terapkanPerintah(d, 'blue', p)
    for (const p of sim.langkahAi(d, ai.red)) sim.terapkanPerintah(d, 'red', p)
    sim.langkahBanyak(d, 1)
    if (tick % JEDA_SAMPEL === 0) sampel.push(potret(d, tick))
  }
  sampel.push(potret(d, tick))

  return {
    seed,
    tick,
    menit: tick / 3600,
    hasil: d.hasil.jenis === 'menang' ? d.hasil.tim : d.hasil.jenis,
    sampel,
    stat: {
      blue: { ...d.tim.blue.statistik },
      red: { ...d.tim.red.statistik },
    },
  }
}

function potret(d, tick) {
  const per = (tim) => ({
    pawn: d.unit.filter((u) => u.tim === tim && u.peran === 'pawn').length,
    tentara: d.unit.filter((u) => u.tim === tim && u.peran !== 'pawn' && !u.hero).length,
    hero: d.unit.filter((u) => u.tim === tim && u.hero).length,
    bangunan: d.bangunan.filter((b) => b.tim === tim && b.fase === 'aktif').length,
    gold: Math.round(d.tim[tim].sumberDaya.gold),
    kayu: Math.round(d.tim[tim].sumberDaya.kayu),
    daging: Math.round(d.tim[tim].sumberDaya.daging),
  })
  return { menit: +(tick / 3600).toFixed(1), blue: per('blue'), red: per('red') }
}

const hasil = []
for (let i = 0; i < JUMLAH; i++) hasil.push(mainkan(SEED + i * 1013))

// --- Laporan --------------------------------------------------------------
const menit = hasil.map((h) => h.menit).sort((a, b) => a - b)
const persentil = (p) => menit[Math.min(menit.length - 1, Math.floor(menit.length * p))]
const hitung = (v) => hasil.filter((h) => h.hasil === v).length

console.log(`\n=== ${JUMLAH} match AI vs AI (batas ${MAKS_MENIT} menit) ===`)
console.log(`durasi  min ${menit[0].toFixed(1)}  p25 ${persentil(0.25).toFixed(1)}  median ${persentil(0.5).toFixed(1)}  p75 ${persentil(0.75).toFixed(1)}  maks ${menit[menit.length - 1].toFixed(1)} menit`)
console.log(`hasil   blue ${hitung('blue')}  red ${hitung('red')}  draw ${hitung('draw')}  tak selesai ${hitung('berlangsung')}`)
console.log(`cepat   <4 menit: ${hasil.filter((h) => h.menit < 4).length}   <2 menit: ${hasil.filter((h) => h.menit < 2).length}`)

const totalBunuh = hasil.reduce((a, h) => a + h.stat.blue.bunuh + h.stat.red.bunuh, 0)
const totalCamp = hasil.reduce((a, h) => a + h.stat.blue.campDibersihkan + h.stat.red.campDibersihkan, 0)
console.log(`rata2   ${(totalBunuh / JUMLAH).toFixed(1)} pembunuhan/match, ${(totalCamp / JUMLAH).toFixed(2)} camp dibersihkan/match`)

// Kurva rata-rata pasukan & ekonomi
console.log('\nmenit | pawn B/R | tentara B/R | bangunan B/R | gold B/R')
const maksSampel = Math.max(...hasil.map((h) => h.sampel.length))
for (let i = 0; i < Math.min(maksSampel, 21); i++) {
  const ada = hasil.filter((h) => h.sampel[i])
  if (ada.length < Math.max(2, JUMLAH * 0.25)) break
  const rata = (tim, k) => (ada.reduce((a, h) => a + h.sampel[i][tim][k], 0) / ada.length).toFixed(1)
  console.log(
    `${String(ada[0].sampel[i].menit).padStart(5)} | ` +
    `${rata('blue', 'pawn').padStart(4)}/${rata('red', 'pawn').padStart(4)} | ` +
    `${rata('blue', 'tentara').padStart(5)}/${rata('red', 'tentara').padStart(5)} | ` +
    `${rata('blue', 'bangunan').padStart(5)}/${rata('red', 'bangunan').padStart(5)} | ` +
    `${rata('blue', 'gold').padStart(6)}/${rata('red', 'gold').padStart(6)}  (n=${ada.length})`,
  )
}
console.log()
