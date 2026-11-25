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
  goldDiam: { file: 'Resources/Resources/G_Idle.png', pack: 'u010', fw: 128, fh: 128, kolom: 1, baris: 1, fps: 0 },
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

export const BANGUNAN_FASE = {
  castleKonstruksi: { file: 'Factions/Knights/Buildings/Castle/Castle_Construction.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
  castleHancur: { file: 'Factions/Knights/Buildings/Castle/Castle_Destroyed.png', pack: 'u010', fw: 320, fh: 256, kolom: 1, baris: 1, fps: 0 },
  houseKonstruksi: { file: 'Factions/Knights/Buildings/House/House_Construction.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
  houseHancur: { file: 'Factions/Knights/Buildings/House/House_Destroyed.png', pack: 'u010', fw: 128, fh: 192, kolom: 1, baris: 1, fps: 0 },
  towerKonstruksi: { file: 'Factions/Knights/Buildings/Tower/Tower_Construction.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
  towerHancur: { file: 'Factions/Knights/Buildings/Tower/Tower_Destroyed.png', pack: 'u010', fw: 128, fh: 256, kolom: 1, baris: 1, fps: 0 },
} as const satisfies Record<string, Aset>

// --- Unit --------------------------------------------------------------------
//
// CATATAN: sheet Update 010 tidak menyertakan dokumentasi arti tiap baris.
// Dari contact sheet, baris 0 tampak idle dan baris 1 tampak run. Indeks baris
// dikumpulkan di BARIS di bawah supaya mudah dikoreksi SETELAH dilihat langsung
// di browser pada M4 — jangan sebar angka baris ke kode renderer.
export const BARIS = {
  idle: 0,
  lari: 1,
  serang: 2,
} as const

function unitTim(warna: WarnaTim) {
  const W = WARNA[warna]
  return {
    pawn: { file: `Factions/Knights/Troops/Pawn/${W}/Pawn_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 6, fps: 10 },
    warrior: { file: `Factions/Knights/Troops/Warrior/${W}/Warrior_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 6, baris: 8, fps: 10 },
    archer: { file: `Factions/Knights/Troops/Archer/${W}/Archer_${W}.png`, pack: 'u010', fw: 192, fh: 192, kolom: 8, baris: 7, fps: 10 },

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
  torch: { file: 'Factions/Goblins/Troops/Torch/Red/Torch_Red.png', pack: 'u010', fw: 192, fh: 192, kolom: 7, baris: 5, fps: 10 },
  tnt: { file: 'Factions/Goblins/Troops/TNT/Red/TNT_Red.png', pack: 'u010', fw: 192, fh: 192, kolom: 7, baris: 3, fps: 10 },
  barrel: { file: 'Factions/Goblins/Troops/Barrel/Red/Barrel_Red.png', pack: 'u010', fw: 192, fh: 192, kolom: 4, baris: 4, fps: 10 },
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
  Array.from({ length: 25 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return [`avatar${n}`, {
      file: `UI Elements/UI Elements/Human Avatars/Avatars_${n}.png`, pack: 'free', fw: 256, fh: 256, kolom: 1, baris: 1, fps: 0,
      alasan: 'Update 010 tidak punya avatar potret',
    }]
  }),
) as Record<string, Aset>

/** Semua aset yang dipakai, rata, untuk validator dan preloader. */
export const SEMUA: Record<string, Aset> = {
  ...pref('terrain', TERRAIN), ...pref('deko', DEKO), ...pref('sumber', SUMBER),
  ...pref('efek', EFEK), ...pref('bgBlue', BANGUNAN_BLUE), ...pref('bgRed', BANGUNAN_RED),
  ...pref('bgFase', BANGUNAN_FASE), ...pref('unitBlue', UNIT_BLUE), ...pref('unitRed', UNIT_RED),
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
