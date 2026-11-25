import type { Dunia } from './tipe.js'

/**
 * Hash state dunia untuk tes determinisme (AC-8.3) dan deteksi desync LAN.
 * Angka dibulatkan ke 1e-4 supaya noise floating-point tidak memberi hash
 * berbeda padahal state secara praktis sama.
 */
export function hashDunia(dunia: Dunia): string {
  let h = 0x811c9dc5 // FNV-1a 32-bit
  const serap = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
  }
  const n = (v: number): string => (Math.round(v * 1e4) / 1e4).toString()

  serap(`t${dunia.tick}|r${dunia.rng.state}|i${dunia.idBerikut}|h${dunia.hasil.jenis}`)
  if (dunia.hasil.jenis === 'menang') serap(dunia.hasil.tim)
  serap('|')

  for (const tim of ['blue', 'red', 'neutral'] as const) {
    const k = dunia.tim[tim]
    serap(`${tim}:${n(k.sumberDaya.gold)},${n(k.sumberDaya.kayu)},${n(k.sumberDaya.daging)},`)
    serap(`${k.heroHidup ?? '-'},${k.heroGugur ? `${k.heroGugur.peran}@${k.heroGugur.level}` : '-'},`)
    serap(`${k.statistik.bunuh},${k.statistik.gugur},${k.menyerah ? 1 : 0};`)
  }

  for (const b of dunia.bangunan) {
    serap(`B${b.id},${b.tim},${b.jenis},${n(b.x)},${n(b.y)},${n(b.hp)},${b.fase},${n(b.sisaBangun)},${b.antrean.length};`)
  }
  for (const u of dunia.unit) {
    serap(`U${u.id},${u.tim},${u.peran},${n(u.x)},${n(u.y)},${n(u.hp)},${u.tugas},${u.targetId ?? '-'},`)
    serap(`${u.bawaanJenis ?? '-'},${u.bawaanJumlah},${u.level},${u.xp};`)
  }
  for (const p of dunia.pohon) serap(`P${p.id},${p.kayu};`)
  for (const t of dunia.tambang) serap(`T${t.id},${t.gold};`)
  for (const d of dunia.domba) serap(`D${d.id};`)
  for (const d of dunia.daging) serap(`M${d.id},${d.jumlah},${n(d.sisaDetik)};`)
  for (const p of dunia.proyektil) serap(`X${p.id},${n(p.x)},${n(p.y)};`)

  return h.toString(16).padStart(8, '0')
}
