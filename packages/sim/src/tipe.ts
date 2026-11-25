import type { Tim } from '@hftf/shared'
import type { JenisBangunan } from './definisi/bangunan.js'
import type { JenisCamp } from './definisi/goblin.js'
import type { PeranHero, PeranUnit } from './definisi/unit.js'
import type { Jalur } from './jalur.js'
import type { Rng } from './rng.js'
import type { Terrain, TitikPenting } from './terrain.js'

// ---------------------------------------------------------------------------
// Sumber daya & statistik
// ---------------------------------------------------------------------------

export interface SumberDaya {
  gold: number
  kayu: number
  daging: number
}

export interface Statistik {
  bunuh: number
  gugur: number
  dagingDipungut: number
  bangunanDibangun: number
  bangunanHilang: number
  goldTerkumpul: number
  kayuTerkumpul: number
  dagingTerkumpul: number
  campDibersihkan: number
}

// ---------------------------------------------------------------------------
// Entitas dunia
// ---------------------------------------------------------------------------

export type FaseBangunan = 'konstruksi' | 'aktif' | 'hancur'

export interface AntreanLatih {
  peran: PeranUnit
  sisaDetik: number
}

export interface Bangunan {
  id: number
  tim: Tim
  jenis: JenisBangunan
  x: number
  y: number
  hp: number
  hpMaks: number
  fase: FaseBangunan
  /** Sisa detik konstruksi; 0 saat sudah aktif. */
  sisaBangun: number
  antrean: AntreanLatih[]
  /** Jeda tembak tower. */
  jedaTembak: number
  /** Titik kumpul unit yang baru selesai dilatih. */
  rallyX: number
  rallyY: number
  /** Antrean revive hero (khusus altar, PRD §11.3). */
  revive: { peran: PeranHero; level: number; sisaDetik: number } | null
  /** Hitung mundur memunculkan domba berikutnya (khusus house, PRD §3). */
  jedaDomba: number
}

export type TugasUnit =
  | 'diam'
  | 'pindah'
  | 'serangPindah'
  | 'serang'
  | 'tahan'
  | 'tebang'
  | 'tambang'
  | 'gembala'
  | 'pungut'
  | 'pulang'
  | 'bangun'
  | 'perbaiki'

export type JenisBawaan = 'kayu' | 'gold' | 'daging'

export interface Unit {
  id: number
  tim: Tim
  peran: PeranUnit
  x: number
  y: number
  hp: number
  hpMaks: number
  dmg: number
  jarak: number
  jeda: number
  kecepatan: number
  /** Hitung mundur sampai boleh menyerang lagi. */
  jedaTimer: number

  tugas: TugasUnit
  /** Tujuan gerak. */
  tx: number
  ty: number
  /** Target tugas: musuh, pohon, tambang, domba, daging, atau bangunan. */
  targetId: number | null

  bawaanJenis: JenisBawaan | null
  bawaanJumlah: number
  /** Akumulator waktu untuk satu kali panen. */
  tikPanen: number

  /**
   * Jalur hasil A* yang sedang diikuti. Turunan dari terrain + posisi, jadi
   * TIDAK masuk hash: A* deterministik, menghitungnya ulang memberi hasil sama.
   */
  jalur: Jalur | null
  /** Tujuan saat jalur dihitung — dipakai menentukan kapan perlu hitung ulang. */
  jalurKeX: number
  jalurKeY: number

  /** Camp goblin tempat unit ini terikat; null untuk unit pemain (PRD §10.3). */
  campId: number | null

  /** Hero saja. */
  hero: boolean
  level: number
  xp: number
  skillJeda: number
}

export interface Pohon {
  id: number
  x: number
  y: number
  kayu: number
}

export interface Tambang {
  id: number
  x: number
  y: number
  gold: number
  /** 'mine' punya cadangan besar, 'stone' kecil. */
  jenis: 'mine' | 'stone'
}

export interface Domba {
  id: number
  x: number
  y: number
  daging: number
}

export interface DagingJatuh {
  id: number
  x: number
  y: number
  jumlah: number
  /** Hilang sendiri setelah sekian detik supaya peta tidak penuh. */
  sisaDetik: number
}

export interface Proyektil {
  id: number
  tim: Tim
  jenis: 'panah' | 'orb'
  x: number
  y: number
  tx: number
  ty: number
  kecepatan: number
  dmg: number
  area: boolean
  /** Unit yang ditembak; proyektil tetap melanjutkan ke titik target kalau hilang. */
  targetId: number | null
}

/** Hero yang gugur tapi belum dibangkitkan (PRD §11.2). */
/** Satu camp goblin penjaga harta (PRD §10). */
export interface Camp {
  id: number
  jenis: JenisCamp
  x: number
  y: number
  /** Sedang mengejar? Satu goblin kena aggro berarti SELURUH camp ikut. */
  aggro: boolean
  /** Hitung mundur respawn; 0 berarti camp sedang utuh atau siap terisi. */
  respawn: number
  /** Tim yang menjatuhkan goblin terakhir — yang berhak atas kredit camp. */
  pembunuhTerakhir: Tim | null
}

export interface HeroGugur {
  peran: PeranHero
  level: number
  xp: number
  /** Tempat nisan. */
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Dunia
// ---------------------------------------------------------------------------

export type HasilMatch =
  | { jenis: 'berlangsung' }
  | { jenis: 'menang'; tim: Tim }
  | { jenis: 'draw' }

export interface KeadaanTim {
  sumberDaya: SumberDaya
  statistik: Statistik
  /** Hero yang sedang hidup, null kalau belum ada atau sedang gugur. */
  heroHidup: number | null
  /** Hero yang gugur dan menunggu Altar (PRD §11.3). */
  heroGugur: HeroGugur | null
  /** Hero pilihan pemain dari lobi (PRD §11.1). */
  heroPilihan: PeranHero
  /** Detik sejak kondisi mati-ekonomi terpenuhi (PRD §13.1 poin 2). */
  matiEkonomiDetik: number
  menyerah: boolean
}

export interface Dunia {
  tick: number
  rng: Rng
  idBerikut: number
  hasil: HasilMatch

  terrain: Terrain
  titik: TitikPenting

  bangunan: Bangunan[]
  unit: Unit[]
  pohon: Pohon[]
  tambang: Tambang[]
  domba: Domba[]
  daging: DagingJatuh[]
  proyektil: Proyektil[]

  camp: Camp[]

  tim: Record<Tim, KeadaanTim>

  /** Kejadian yang perlu dilihat lapisan render/ui. Dikosongkan tiap langkah. */
  kejadian: Kejadian[]
}

/**
 * Kejadian sebagai data, bukan callback. `sim` tidak boleh tahu soal suara atau
 * partikel — lapisan di atasnya yang menerjemahkan ini.
 */
export type Kejadian =
  | { jenis: 'unitMati'; id: number; tim: Tim; peran: PeranUnit; x: number; y: number }
  | { jenis: 'bangunanHancur'; id: number; tim: Tim; bangunan: JenisBangunan; x: number; y: number }
  | { jenis: 'bangunanSelesai'; id: number; tim: Tim; bangunan: JenisBangunan }
  | { jenis: 'unitSelesai'; id: number; tim: Tim; peran: PeranUnit }
  | { jenis: 'skillHero'; id: number; tim: Tim; peran: PeranUnit; x: number; y: number; radius: number }
  | { jenis: 'heroNaikLevel'; id: number; tim: Tim; level: number }
  | { jenis: 'heroGugur'; tim: Tim; x: number; y: number }
  | { jenis: 'heroBangkit'; id: number; tim: Tim; level: number }
  | { jenis: 'sumberDayaMasuk'; tim: Tim; jenis2: JenisBawaan; jumlah: number; x: number; y: number }
  | { jenis: 'campDibersihkan'; campId: number; x: number; y: number }
  | { jenis: 'campRespawn'; campId: number; x: number; y: number }
  | { jenis: 'matchSelesai'; hasil: HasilMatch }
