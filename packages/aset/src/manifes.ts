import type { Aset } from './jenis.js'

// Manifes aset — sumber tunggal path, ukuran frame, dan jumlah frame.
// Divalidasi terhadap berkas nyata di packages/aset/test/manifes.test.ts:
// path salah atau jumlah frame salah membuat `npm test` GAGAL, bukan jadi
// kotak kosong saat main (PRD §16.2).

const WARNA = { blue: 'Blue', red: 'Red' } as const
export type WarnaTim = keyof typeof WARNA

// --- Terrain -----------------------------------------------------------------

export const TERRAIN = {
  tanahDatar: { file: 'Terrain/Ground/Tilemap_Flat.png', pack: 'u010', fw: 64, fh: 64, kolom: 10, baris: 4, fps: 0 },
  tanahTinggi: { file: 'Terrain/Ground/Tilemap_Elevation.png', pack: 'u010', fw: 64, fh: 64, kolom: 4, baris: 8, fps: 0 },
  bayangTanah: { file: 'Terrain/Ground/Shadows.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  air: { file: 'Terrain/Water/Water.png', pack: 'u010', fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0 },
  busa: { file: 'Terrain/Water/Foam/Foam.png', pack: 'u010', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 9 },
  jembatan: { file: 'Terrain/Bridge/Bridge_All.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 4, fps: 0 },
  batuAir1: { file: 'Terrain/Water/Rocks/Rocks_01.png', pack: 'u010', fw: 128, fh: 128, kolom: 8, baris: 1, fps: 8 },
  batuAir2: { file: 'Terrain/Water/Rocks/Rocks_02.png', pack: 'u010', fw: 128, fh: 128, kolom: 8, baris: 1, fps: 8 },
  batuAir3: { file: 'Terrain/Water/Rocks/Rocks_03.png', pack: 'u010', fw: 128, fh: 128, kolom: 8, baris: 1, fps: 8 },
  batuAir4: { file: 'Terrain/Water/Rocks/Rocks_04.png', pack: 'u010', fw: 128, fh: 128, kolom: 8, baris: 1, fps: 8 },
} as const satisfies Record<string, Aset>

const ALASAN_TERRAIN_FREE = 'Free Pack menyediakan tileset tebing bertingkat berumput (rumput di atas tebing batu, lereng miring, & tebing laut) serta awan yang tidak ada di Update 010'

export const TERRAIN_FREE = {
  tileHijau: { file: 'Terrain/Tileset/Tilemap_color1.png', pack: 'free', fw: 64, fh: 64, kolom: 9, baris: 6, fps: 0, alasan: ALASAN_TERRAIN_FREE },
  awan1: { file: 'Terrain/Decorations/Clouds/Clouds_01.png', pack: 'free', fw: 576, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: ALASAN_TERRAIN_FREE },
  awan2: { file: 'Terrain/Decorations/Clouds/Clouds_02.png', pack: 'free', fw: 576, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: ALASAN_TERRAIN_FREE },
} as const satisfies Record<string, Aset>

const ALASAN_POHON_FREE = 'Free Pack punya 4 variasi pohon beranimasi (pinus gelap, pinus cerah, birch kuning-hijau, dan daun gugur emas) agar hutan di pojok pulau hidup seperti ilustrasi resmi'

export const POHON_FREE = {
  pinus1: { file: 'Terrain/Resources/Wood/Trees/Tree1.png', pack: 'free', fw: 192, fh: 256, kolom: 8, baris: 1, fps: 8, alasan: ALASAN_POHON_FREE },
  pinus2: { file: 'Terrain/Resources/Wood/Trees/Tree2.png', pack: 'free', fw: 192, fh: 256, kolom: 8, baris: 1, fps: 8, alasan: ALASAN_POHON_FREE },
  daun1: { file: 'Terrain/Resources/Wood/Trees/Tree3.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 8, alasan: ALASAN_POHON_FREE },
  daun2: { file: 'Terrain/Resources/Wood/Trees/Tree4.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 8, alasan: ALASAN_POHON_FREE },
  tunggul: { file: 'Terrain/Resources/Wood/Trees/Stump 1.png', pack: 'free', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: ALASAN_POHON_FREE },
} as const satisfies Record<string, Aset>

/**
 * Deco 01-18 TIDAK seragam ukurannya: sebagian 64x64, dua di antaranya 64x128,
 * dan satu 192x192. Ukurannya ditulis eksplisit — ditebak seragam berarti tiga
 * di antaranya tergambar terpotong.
 */
const UKURAN_DEKO: Record<string, [number, number]> = {
  '16': [64, 128], '17': [64, 128], '18': [192, 192],
}

export const DEKO = Object.fromEntries(
  Array.from({ length: 18 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    const [w, h] = UKURAN_DEKO[String(i + 1)] ?? [64, 64]
    return [`deco${n}`, { file: `Deco/${n}.png`, pack: 'u010', fw: w, fh: h, kolom: 1, baris: 1, fps: 0 }]
  }),
) as Record<string, Aset>

// --- Sumber daya -------------------------------------------------------------

export const SUMBER = {
  pohon: { file: 'Resources/Trees/Tree.png', pack: 'u010', fw: 192, fh: 192, kolom: 4, baris: 3, fps: 8 },
  tambangAktif: { file: 'Resources/Gold Mine/GoldMine_Active.png', pack: 'u010', fw: 192, fh: 128, kolom: 1, baris: 1, fps: 0 },
  tambangHabis: { file: 'Resources/Gold Mine/GoldMine_Destroyed.png', pack: 'u010', fw: 192, fh: 128, kolom: 1, baris: 1, fps: 0 },
  dombaDiam: { file: 'Resources/Sheep/HappySheep_Idle.png', pack: 'u010', fw: 128, fh: 128, kolom: 8, baris: 1, fps: 8 },
  dombaLompat: { file: 'Resources/Sheep/HappySheep_Bouncing.png', pack: 'u010', fw: 128, fh: 128, kolom: 6, baris: 1, fps: 10 },
  dagingMuncul: { file: 'Resources/Resources/M_Spawn.png', pack: 'u010', fw: 128, fh: 128, kolom: 7, baris: 1, fps: 12 },
  dagingDiam: { file: 'Resources/Resources/M_Idle.png', pack: 'u010', fw: 128, fh: 128, kolom: 1, baris: 1, fps: 0 },
  goldMuncul: { file: 'Resources/Resources/G_Spawn.png', pack: 'u010', fw: 128, fh: 128, kolom: 7, baris: 1, fps: 12 },
  goldDiam: { file: 'Resources/Resources/G_Idle.png', pack: 'u010', fw: 128, fh: 128, kolom: 1, baris: 1, fps: 0 },
  kayuMuncul: { file: 'Resources/Resources/W_Spawn.png', pack: 'u010', fw: 128, fh: 128, kolom: 7, baris: 1, fps: 12 },
  kayuDiam: { file: 'Resources/Resources/W_Idle.png', pack: 'u010', fw: 128, fh: 128, kolom: 1, baris: 1, fps: 0 },
} as const satisfies Record<string, Aset>

// --- Efek --------------------------------------------------------------------

export const EFEK = {
  api: { file: 'Effects/Fire/Fire.png', pack: 'u010', fw: 128, fh: 128, kolom: 7, baris: 1, fps: 12 },
  ledakan: { file: 'Effects/Explosion/Explosions.png', pack: 'u010', fw: 192, fh: 192, kolom: 9, baris: 1, fps: 14 },
  nisan: { file: 'Factions/Knights/Troops/Dead/Dead.png', pack: 'u010', fw: 128, fh: 128, kolom: 7, baris: 2, fps: 0 },
  sembuh: {
    file: 'Units/Blue Units/Monk/Heal_Effect.png', pack: 'free', fw: 192, fh: 192, kolom: 11, baris: 1, fps: 14,
    alasan: 'Efek heal hanya ada di Free Pack; Update 010 tidak punya Monk',
  },
} as const satisfies Record<string, Aset>

// --- Bangunan ----------------------------------------------------------------

function bangunanTim(warna: WarnaTim) {
  const W = WARNA[warna]
  return {
    castle: { file: `Factions/Knights/Buildings/Castle/Castle_${W}.png`, pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
    house: { file: `Factions/Knights/Buildings/House/House_${W}.png`, pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
    tower: { file: `Factions/Knights/Buildings/Tower/Tower_${W}.png`, pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
    barracks: {
      file: `Buildings/${W} Buildings/Barracks.png`, pack: 'free', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak punya Barracks',
    },
    archery: {
      file: `Buildings/${W} Buildings/Archery.png`, pack: 'free', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak punya Archery Range',
    },
    monastery: {
      file: `Buildings/${W} Buildings/Monastery.png`, pack: 'free', fw: 192, fh: 320, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak punya Monastery',
    },
    altar: {
      file: `Buildings/Altar_${W}.png`, pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0,
      alasan: 'Altar of Heroes tidak ada di pack resmi mana pun',
    },
  } as const satisfies Record<string, Aset>
}

export const BANGUNAN_BLUE = bangunanTim('blue')
export const BANGUNAN_RED = bangunanTim('red')

/** Bangunan resmi Update 010 warna tambahan (Purple & Yellow) untuk mode 4–6 pemain. */
export const BANGUNAN_U010_WARNA = {
  purple: {
    castle: { file: 'Factions/Knights/Buildings/Castle/Castle_Purple.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
    house: { file: 'Factions/Knights/Buildings/House/House_Purple.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
    tower: { file: 'Factions/Knights/Buildings/Tower/Tower_Purple.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
  },
  yellow: {
    castle: { file: 'Factions/Knights/Buildings/Castle/Castle_Yellow.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
    house: { file: 'Factions/Knights/Buildings/House/House_Yellow.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
    tower: { file: 'Factions/Knights/Buildings/Tower/Tower_Yellow.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
  },
} as const satisfies Record<'purple' | 'yellow', Record<'castle' | 'house' | 'tower', Aset>>

export const BANGUNAN_FASE = {
  castleKonstruksi: { file: 'Factions/Knights/Buildings/Castle/Castle_Construction.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
  castleHancur: { file: 'Factions/Knights/Buildings/Castle/Castle_Destroyed.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
  houseKonstruksi: { file: 'Factions/Knights/Buildings/House/House_Construction.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
  houseHancur: { file: 'Factions/Knights/Buildings/House/House_Destroyed.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
  towerKonstruksi: { file: 'Factions/Knights/Buildings/Tower/Tower_Construction.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
  towerHancur: { file: 'Factions/Knights/Buildings/Tower/Tower_Destroyed.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
  barracksKonstruksi: { file: 'Buildings/Barracks_Construction.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase konstruksi Barracks' },
  barracksHancur: { file: 'Buildings/Barracks_Destroyed.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase hancur Barracks' },
  archeryKonstruksi: { file: 'Buildings/Archery_Construction.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase konstruksi Archery' },
  archeryHancur: { file: 'Buildings/Archery_Destroyed.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase hancur Archery' },
  monasteryKonstruksi: { file: 'Buildings/Monastery_Construction.png', pack: 'custom', fw: 192, fh: 320, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase konstruksi Monastery' },
  monasteryHancur: { file: 'Buildings/Monastery_Destroyed.png', pack: 'custom', fw: 192, fh: 320, kolom: 1, baris: 1, fps: 0, alasan: 'Pack resmi tidak menyertakan fase hancur Monastery' },
  altarKonstruksi: { file: 'Buildings/Altar_Construction.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Altar of Heroes tidak ada di pack resmi' },
  altarHancur: { file: 'Buildings/Altar_Destroyed.png', pack: 'custom', fw: 192, fh: 256, kolom: 1, baris: 1, fps: 0, alasan: 'Altar of Heroes tidak ada di pack resmi' },
} as const satisfies Record<string, Aset>

// --- Unit --------------------------------------------------------------------
// Baris sheet Update 010 terverifikasi langsung dari contact sheet:
//   Pawn    (6x6): r0 idle, r1 lari, r2 palu (bangun/tambang), r3 kapak (tebang), r4 bawa diam, r5 bawa lari
//   Warrior (6x8): r0 idle, r1 lari, r2..r3 serang samping, r4..r5 bawah, r6..r7 atas
//   Archer  (8x7): r0 idle (6f), r1 lari (6f), r2 atas, r3 serong atas, r4 samping, r5 serong bawah, r6 bawah
export const BARIS = {
  idle: 0,
  lari: 1,
  serang: 2,
} as const

export const BARIS_PAWN = {
  diam: 0,
  lari: 1,
  palu: 2,
  kapak: 3,
  bawaDiam: 4,
  bawaLari: 5,
} as const

function unitTim(warna: WarnaTim) {
  const W = WARNA[warna]
  return {
    pawn: { file: `Factions/Knights/Troops/Pawn/${W}/Pawn_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 6, fps: 10 },
    warrior: { file: `Factions/Knights/Troops/Warrior/${W}/Warrior_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 8, fps: 12 },
    archer: {
      file: `Factions/Knights/Troops/Archer/${W}/Archer_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 8, baris: 7,
      frameBaris: [6, 6, 8, 8, 8, 8, 8], fps: 12,
    },

    lancerIdle: {
      file: `Units/${W} Units/Lancer/Lancer_Idle.png`, pack: 'free', fw: 320, fh: 320, kolom: 12, baris: 1, fps: 10,
      alasan: 'Update 010 tidak punya Lancer',
    },
    lancerLari: {
      file: `Units/${W} Units/Lancer/Lancer_Run.png`, pack: 'free', fw: 320, fh: 320, kolom: 6, baris: 1, fps: 12,
      alasan: 'Update 010 tidak punya Lancer',
    },
    lancerSerang: {
      file: `Units/${W} Units/Lancer/Lancer_Right_Attack.png`, pack: 'free', fw: 320, fh: 320, kolom: 3, baris: 1, fps: 10,
      alasan: 'Update 010 tidak punya Lancer',
    },

    monkIdle: {
      file: `Units/${W} Units/Monk/Idle.png`, pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 8,
      alasan: 'Update 010 tidak punya Monk',
    },
    monkLari: {
      file: `Units/${W} Units/Monk/Run.png`, pack: 'free', fw: 192, fh: 192, kolom: 4, baris: 1, fps: 10,
      alasan: 'Update 010 tidak punya Monk',
    },
    monkSembuh: {
      file: `Units/${W} Units/Monk/Heal.png`, pack: 'free', fw: 192, fh: 192, kolom: 11, baris: 1, fps: 12,
      alasan: 'Update 010 tidak punya Monk',
    },

    mageIdle: {
      file: `${W} Units/Mage/Mage_Idle.png`, pack: 'custom', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 8,
      alasan: 'Mage tidak ada di pack resmi mana pun',
    },
    mageLari: {
      file: `${W} Units/Mage/Mage_Run.png`, pack: 'custom', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 10,
      alasan: 'Mage tidak ada di pack resmi mana pun',
    },
    mageSerang: {
      file: `${W} Units/Mage/Mage_Attack.png`, pack: 'custom', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 10,
      alasan: 'Mage tidak ada di pack resmi mana pun',
    },
    mageOrb: {
      file: `${W} Units/Mage/Mage_Orb.png`, pack: 'custom', fw: 64, fh: 64, kolom: 4, baris: 1, fps: 12,
      alasan: 'Mage tidak ada di pack resmi mana pun',
    },

    panah: { file: 'Factions/Knights/Troops/Archer/Arrow/Arrow.png', pack: 'u010', fw: 64, fh: 64, kolom: 1, baris: 2, fps: 0 },
  } as const satisfies Record<string, Aset>
}

export const UNIT_BLUE = unitTim('blue')
export const UNIT_RED = unitTim('red')

/** Unit resmi Update 010 warna tambahan (Purple & Yellow); Archer Purple memakai nama berkas asli `Archer_Purlple.png`. */
export const UNIT_U010_WARNA = {
  purple: {
    warrior: { file: 'Factions/Knights/Troops/Warrior/Purple/Warrior_Purple.png', pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 8, fps: 12 },
    archer: {
      file: 'Factions/Knights/Troops/Archer/Purple/Archer_Purlple.png', pack: 'u010', fw: 192, fh: 192, kolom: 8, baris: 7,
      frameBaris: [6, 6, 8, 8, 8, 8, 8], fps: 12,
    },
  },
  yellow: {
    warrior: { file: 'Factions/Knights/Troops/Warrior/Yellow/Warrior_Yellow.png', pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 8, fps: 12 },
    archer: {
      file: 'Factions/Knights/Troops/Archer/Yellow/Archer_Yellow.png', pack: 'u010', fw: 192, fh: 192, kolom: 8, baris: 7,
      frameBaris: [6, 6, 8, 8, 8, 8, 8], fps: 12,
    },
  },
} as const satisfies Record<'purple' | 'yellow', Record<'warrior' | 'archer', Aset>>

const ALASAN_PAWN_FREE = 'Update 010 tidak punya animasi alat lengkap (beliung, pisau, jalan bawa alat, dan bawaan menyatu)'

/**
 * Seluruh 20 sheet Pawn resmi Tiny Swords (Free Pack) — animasi kontekstual:
 * jalan & diam memegang alat sesuai tugas (kapak/beliung/palu/pisau) dan membawa
 * kayu/emas/daging menyatu mulus tanpa sprite tempel terpisah.
 */
export const PAWN_FREE = {
  idle: { file: 'Units/Blue Units/Pawn/Pawn_Idle.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idleKapak: { file: 'Units/Blue Units/Pawn/Pawn_Idle Axe.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idleBeliung: { file: 'Units/Blue Units/Pawn/Pawn_Idle Pickaxe.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idlePalu: { file: 'Units/Blue Units/Pawn/Pawn_Idle Hammer.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idlePisau: { file: 'Units/Blue Units/Pawn/Pawn_Idle Knife.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idleKayu: { file: 'Units/Blue Units/Pawn/Pawn_Idle Wood.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idleGold: { file: 'Units/Blue Units/Pawn/Pawn_Idle Gold.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  idleDaging: { file: 'Units/Blue Units/Pawn/Pawn_Idle Meat.png', pack: 'free', fw: 192, fh: 192, kolom: 8, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },

  lari: { file: 'Units/Blue Units/Pawn/Pawn_Run.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariKapak: { file: 'Units/Blue Units/Pawn/Pawn_Run Axe.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariBeliung: { file: 'Units/Blue Units/Pawn/Pawn_Run Pickaxe.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariPalu: { file: 'Units/Blue Units/Pawn/Pawn_Run Hammer.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariPisau: { file: 'Units/Blue Units/Pawn/Pawn_Run Knife.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariKayu: { file: 'Units/Blue Units/Pawn/Pawn_Run Wood.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariGold: { file: 'Units/Blue Units/Pawn/Pawn_Run Gold.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },
  lariDaging: { file: 'Units/Blue Units/Pawn/Pawn_Run Meat.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 12, alasan: ALASAN_PAWN_FREE },

  aksiKapak: { file: 'Units/Blue Units/Pawn/Pawn_Interact Axe.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 11, alasan: ALASAN_PAWN_FREE },
  aksiBeliung: { file: 'Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png', pack: 'free', fw: 192, fh: 192, kolom: 6, baris: 1, fps: 11, alasan: ALASAN_PAWN_FREE },
  aksiPalu: { file: 'Units/Blue Units/Pawn/Pawn_Interact Hammer.png', pack: 'free', fw: 192, fh: 192, kolom: 3, baris: 1, fps: 10, alasan: ALASAN_PAWN_FREE },
  aksiPisau: { file: 'Units/Blue Units/Pawn/Pawn_Interact Knife.png', pack: 'free', fw: 192, fh: 192, kolom: 4, baris: 1, fps: 11, alasan: ALASAN_PAWN_FREE },
} as const satisfies Record<string, Aset>

export const HERO_PERAN = ['berserker', 'king', 'knight', 'champion'] as const
export type PeranHeroAset = (typeof HERO_PERAN)[number]

function heroTim(warna: WarnaTim): Record<PeranHeroAset, Record<'idle' | 'lari' | 'serang' | 'potret', Aset>> {
  const W = WARNA[warna]
  // Knight berkuda digambar di frame 256x256; tiga hero pejalan kaki 192x192.
  const buat = (h: PeranHeroAset) => {
    const F = h === 'knight' ? 256 : 192
    return {
    idle: { file: `Heroes/${W}/${h}/Idle.png`, pack: 'custom' as const, fw: F, fh: F, kolom: 4, baris: 1, fps: 8, alasan: 'Hero tidak ada di pack resmi' },
    lari: { file: `Heroes/${W}/${h}/Run.png`, pack: 'custom' as const, fw: F, fh: F, kolom: 4, baris: 1, fps: 12, alasan: 'Hero tidak ada di pack resmi' },
    serang: { file: `Heroes/${W}/${h}/Attack.png`, pack: 'custom' as const, fw: F, fh: F, kolom: 4, baris: 1, fps: 12, alasan: 'Hero tidak ada di pack resmi' },
    potret: { file: `Heroes/${W}/${h}/Portrait.png`, pack: 'custom' as const, fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0, alasan: 'Hero tidak ada di pack resmi' },
    }
  }
  return { berserker: buat('berserker'), king: buat('king'), knight: buat('knight'), champion: buat('champion') }
}

export const HERO_BLUE = heroTim('blue')
export const HERO_RED = heroTim('red')

// --- Goblin netral (PRD §10) -------------------------------------------------

export const GOBLIN = {
  torch: {
    file: 'Factions/Goblins/Troops/Torch/Red/Torch_Red.png', pack: 'u010', fw: 192, fh: 192, kolom: 7, baris: 5,
    frameBaris: [7, 6, 6, 6, 6], fps: 11,
  },
  tnt: {
    file: 'Factions/Goblins/Troops/TNT/Red/TNT_Red.png', pack: 'u010', fw: 192, fh: 192, kolom: 7, baris: 3,
    frameBaris: [6, 6, 7], fps: 11,
  },
  barrel: {
    file: 'Factions/Goblins/Troops/Barrel/Red/Barrel_Red.png', pack: 'u010', fw: 128, fh: 128, kolom: 6, baris: 6,
    frameBaris: [1, 6, 1, 6, 3, 3], fps: 10,
  },
  dinamit: { file: 'Factions/Goblins/Troops/TNT/Dynamite/Dynamite.png', pack: 'u010', fw: 64, fh: 64, kolom: 6, baris: 1, fps: 12 },
  rumah: { file: 'Factions/Goblins/Buildings/Wood_House/Goblin_House.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
  rumahHancur: { file: 'Factions/Goblins/Buildings/Wood_House/Goblin_House_Destroyed.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
} as const satisfies Record<string, Aset>

// --- UI (9-slice resmi Update 010, PRD §16.1) --------------------------------

export const UI = {
  panelUkir: { file: 'UI/Banners/Carved_9Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  panelUkir3: { file: 'UI/Banners/Carved_3Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 1, fps: 0 },
  bannerH: { file: 'UI/Banners/Banner_Horizontal.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  bannerV: { file: 'UI/Banners/Banner_Vertical.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },

  tombolBlue: { file: 'UI/Buttons/Button_Blue_9Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  tombolBlueTekan: { file: 'UI/Buttons/Button_Blue_9Slides_Pressed.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  tombolRed: { file: 'UI/Buttons/Button_Red_9Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  tombolRedTekan: { file: 'UI/Buttons/Button_Red_9Slides_Pressed.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  tombolHover: { file: 'UI/Buttons/Button_Hover_9Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },
  tombolMati: { file: 'UI/Buttons/Button_Disable_9Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 3, fps: 0 },

  pitaBlue: { file: 'UI/Ribbons/Ribbon_Blue_3Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 1, fps: 0 },
  pitaRed: { file: 'UI/Ribbons/Ribbon_Red_3Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 1, fps: 0 },
  pitaYellow: { file: 'UI/Ribbons/Ribbon_Yellow_3Slides.png', pack: 'u010', fw: 64, fh: 64, kolom: 3, baris: 1, fps: 0 },

  penunjuk: { file: 'UI/Pointers/01.png', pack: 'u010', fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0 },
  penunjukKotak: { file: 'UI/Pointers/02.png', pack: 'u010', fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0 },

  barBase: {
    file: 'UI Elements/UI Elements/Bars/BigBar_Base.png', pack: 'free', fw: 320, fh: 64, kolom: 1, baris: 1, fps: 0,
    alasan: 'Update 010 tidak punya bar HP',
  },
  barIsi: {
    file: 'UI Elements/UI Elements/Bars/BigBar_Fill.png', pack: 'free', fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0,
    alasan: 'Update 010 tidak punya bar HP',
  },
} as const satisfies Record<string, Aset>

/** Ikon Update 010 punya 3 state: Regular, Pressed, Disable. */
export const IKON = Object.fromEntries(
  (['Regular', 'Pressed', 'Disable'] as const).flatMap((state) =>
    Array.from({ length: 10 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0')
      return [`${state.toLowerCase()}${n}`, { file: `UI/Icons/${state}_${n}.png`, pack: 'u010', fw: 64, fh: 64, kolom: 1, baris: 1, fps: 0 }]
    }),
  ),
) as Record<string, Aset>

export const KURSOR = Object.fromEntries(
  Array.from({ length: 4 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    // Cursor_04 berukuran 128x128, tiga lainnya 64x64.
    const s = n === '04' ? 128 : 64
    return [`kursor${n}`, {
      file: `UI Elements/UI Elements/Cursors/Cursor_${n}.png`, pack: 'free', fw: s, fh: s, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak menyertakan kursor',
    }]
  }),
) as Record<string, Aset>

export const AVATAR = Object.fromEntries(
  Array.from({ length: 6 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return [`avatar${n}`, {
      file: `UI Elements/UI Elements/Human Avatars/Avatars_${n}.png`, pack: 'free', fw: 256, fh: 256, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak punya avatar potret',
    }]
  }),
) as Record<string, Aset>

/** Semua aset yang dipakai, rata, untuk validator dan preloader. */
export const SEMUA: Record<string, Aset> = {
  ...pref('terrain', TERRAIN), ...pref('terrainFree', TERRAIN_FREE), ...pref('pohonFree', POHON_FREE),
  ...pref('deko', DEKO), ...pref('sumber', SUMBER),
  ...pref('efek', EFEK), ...pref('bgBlue', BANGUNAN_BLUE), ...pref('bgRed', BANGUNAN_RED),
  ...pref('bgPurple', BANGUNAN_U010_WARNA.purple), ...pref('bgYellow', BANGUNAN_U010_WARNA.yellow),
  ...pref('bgFase', BANGUNAN_FASE), ...pref('unitBlue', UNIT_BLUE), ...pref('unitRed', UNIT_RED),
  ...pref('unitPurple', UNIT_U010_WARNA.purple), ...pref('unitYellow', UNIT_U010_WARNA.yellow),
  ...pref('pawnFree', PAWN_FREE),
  ...pref('goblin', GOBLIN), ...pref('ui', UI), ...pref('ikon', IKON),
  ...pref('kursor', KURSOR), ...pref('avatar', AVATAR),
  ...heroRata('heroBlue', HERO_BLUE), ...heroRata('heroRed', HERO_RED),
}

function pref(awalan: string, obj: Record<string, Aset>): Record<string, Aset> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${awalan}.${k}`, v]))
}

function heroRata(awalan: string, obj: Record<string, Record<string, Aset>>): Record<string, Aset> {
  const hasil: Record<string, Aset> = {}
  for (const [peran, bagian] of Object.entries(obj)) {
    for (const [nama, aset] of Object.entries(bagian)) hasil[`${awalan}.${peran}.${nama}`] = aset
  }
  return hasil
}
