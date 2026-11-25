(() => {
  'use strict';

  const FREE = 'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/';
  const U10 = 'Tiny Swords/Tiny Swords (Update 010)/';

  const TILE = 64;
  const MAP_COLS = 45;
  const MAP_ROWS = 30;
  const WORLD_W = MAP_COLS * TILE; // 2880
  const WORLD_H = MAP_ROWS * TILE; // 1920

  // Island bounds & central river split with 2 bridges
  const ISLAND = { x1: 2, y1: 2, x2: 42, y2: 26 };
  const RIVER_COLS = [21, 22, 23]; // Central north-south river channel
  const BRIDGES = [
    { y1: 7, y2: 9 },   // North bridge
    { y1: 19, y2: 21 }, // South bridge
  ];

  // Building Specs
  const BUILDING_DEFS = {
    castle:    { name: 'Castle',          wood: 220, gold: 250, meat: 0, hp: 1500, supply: 10, w: 230, h: 184, rad: 92, trains: ['pawn'], buildTime: 18, note: 'Markas & +10 Pop' },
    house:     { name: 'House',           wood: 50,  gold: 30,  meat: 0, hp: 420,  supply: 8,  w: 112, h: 168, rad: 46, trains: [], buildTime: 7, note: '+8 Pop & Domba' },
    barracks:  { name: 'Barracks',        wood: 90,  gold: 80,  meat: 0, hp: 750,  supply: 0,  w: 168, h: 224, rad: 64, trains: ['warrior', 'lancer'], buildTime: 10, note: 'Pedang & Tombak' },
    archery:   { name: 'Archery Range',   wood: 100, gold: 70,  meat: 0, hp: 650,  supply: 0,  w: 168, h: 224, rad: 64, trains: ['archer'], buildTime: 10, note: 'Latih Panah' },
    monastery: { name: 'Monastery',       wood: 110, gold: 120, meat: 0, hp: 700,  supply: 0,  w: 164, h: 268, rad: 64, trains: ['monk', 'mage'], buildTime: 11, note: 'Monk & Mage' },
    tower:     { name: 'Guard Tower',     wood: 75,  gold: 60,  meat: 0, hp: 550,  supply: 0,  w: 112, h: 224, rad: 46, trains: [], buildTime: 8, range: 350, dmg: 18, cd: 1.15, note: 'Panah Otomatis' },
    altar:     { name: 'Altar of Heroes', wood: 130, gold: 150, meat: 0, hp: 850,  supply: 0,  w: 168, h: 224, rad: 66, trains: ['berserker', 'king', 'knight', 'champion'], buildTime: 12, note: 'Panggil 4 Hero' },
  };
  const BUILDING_ORDER = ['house', 'barracks', 'archery', 'monastery', 'tower', 'altar', 'castle'];

  // Unit & 4 Hero Specs
  const UNIT_DEFS = {
    pawn:      { name: 'Pawn',       cat: 'pawn',   building: 'castle',    gold: 40,  wood: 0,  meat: 10, pop: 1, hp: 85,  speed: 132, dmg: 7,  range: 46,  cd: 1.0,  fw: 192, scale: 0.78, trainTime: 4.5, note: 'Pekerja' },
    warrior:   { name: 'Pedang',     cat: 'warrior',building: 'barracks',  gold: 55,  wood: 0,  meat: 20, pop: 1, hp: 150, speed: 126, dmg: 21, range: 54,  cd: 0.82, fw: 192, scale: 0.82, trainTime: 5.5, note: 'Infanteri' },
    archer:    { name: 'Panah',      cat: 'archer', building: 'archery',   gold: 50,  wood: 25, meat: 15, pop: 1, hp: 95,  speed: 120, dmg: 17, range: 285, cd: 1.25, fw: 192, scale: 0.82, trainTime: 5.5, note: 'Jarak Jauh' },
    lancer:    { name: 'Tombak',     cat: 'lancer', building: 'barracks',  gold: 85,  wood: 20, meat: 25, pop: 2, hp: 220, speed: 112, dmg: 32, range: 80,  cd: 1.02, fw: 320, scale: 0.78, trainTime: 7.0, note: 'Unit Berat' },
    monk:      { name: 'Monk',       cat: 'caster', building: 'monastery', gold: 80,  wood: 15, meat: 20, pop: 1, hp: 115, speed: 115, dmg: 28, range: 200, cd: 1.85, fw: 192, scale: 0.82, trainTime: 6.5, note: 'Penyembuh' },
    mage:      { name: 'Mage',       cat: 'caster', building: 'monastery', gold: 95,  wood: 20, meat: 25, pop: 2, hp: 105, speed: 114, dmg: 29, range: 265, cd: 1.65, fw: 192, scale: 0.84, trainTime: 7.5, note: 'Sihir Area' },

    // 4 Uploaded Heroes!
    berserker: { name: 'Kael Berserker',    cat: 'hero', isHero: true, building: 'altar', gold: 140, wood: 30, meat: 45, pop: 3, hp: 430, speed: 155, dmg: 38, range: 64, cd: 0.72, fw: 192, scale: 0.94, trainTime: 9.0, skillName: 'Pusaran', skillCd: 9,  note: 'Kapak Ganda AoE' },
    king:      { name: 'Raja Aldric',       cat: 'hero', isHero: true, building: 'altar', gold: 160, wood: 40, meat: 50, pop: 3, hp: 560, speed: 122, dmg: 34, range: 66, cd: 0.88, fw: 192, scale: 0.96, trainTime: 10,  skillName: 'Berkah',  skillCd: 11, note: 'Heal Sekutu' },
    knight:    { name: 'Sir Gareth Kuda',   cat: 'hero', isHero: true, building: 'altar', gold: 175, wood: 45, meat: 55, pop: 3, hp: 480, speed: 195, dmg: 44, range: 86, cd: 0.82, fw: 256, scale: 0.92, trainTime: 10,  skillName: 'Terjang', skillCd: 10, note: 'Kavaleri Cepat' },
    champion:  { name: 'Torin Greatsword',  cat: 'hero', isHero: true, building: 'altar', gold: 165, wood: 35, meat: 50, pop: 3, hp: 520, speed: 128, dmg: 48, range: 76, cd: 0.90, fw: 192, scale: 0.96, trainTime: 10,  skillName: 'Belah',   skillCd: 10, note: 'Tebasan Raksasa' },
  };
  const REGULAR_UNITS = ['pawn', 'warrior', 'archer', 'lancer', 'monk', 'mage'];
  const HERO_UNITS = ['berserker', 'king', 'knight', 'champion'];

  // Official Tiny Swords Asset Paths
  const ASSET_PATHS = {
    tilemap:     `${FREE}Terrain/Tileset/Tilemap_color1.png`,
    tilemapSand: `${FREE}Terrain/Tileset/Tilemap_color2.png`,
    waterBg:     `${FREE}Terrain/Tileset/Water Background color.png`,
    waterFoam:   `${FREE}Terrain/Tileset/Water Foam.png`,
    bridge:      `${U10}Terrain/Bridge/Bridge_All.png`,
    tree1:       `${FREE}Terrain/Resources/Wood/Trees/Tree1.png`,
    tree2:       `${FREE}Terrain/Resources/Wood/Trees/Tree2.png`,
    stump:       `${FREE}Terrain/Resources/Wood/Trees/Stump 1.png`,
    bush1:       `${FREE}Terrain/Decorations/Bushes/Bushe1.png`,
    bush2:       `${FREE}Terrain/Decorations/Bushes/Bushe2.png`,
    rock1:       `${FREE}Terrain/Decorations/Rocks/Rock1.png`,
    rock2:       `${FREE}Terrain/Decorations/Rocks/Rock2.png`,
    goldStone:   `${FREE}Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png`,
    goldMine:    `${U10}Resources/Gold Mine/GoldMine_Active.png`,
    goldMineDead:`${U10}Resources/Gold Mine/GoldMine_Destroyed.png`,
    meatSpawn:   `${U10}Resources/Resources/M_Spawn.png`,
    meatIdle:    `${U10}Resources/Resources/M_Idle.png`,
    sheepIdle:   `${FREE}Terrain/Resources/Meat/Sheep/Sheep_Idle.png`,
    sheepMove:   `${FREE}Terrain/Resources/Meat/Sheep/Sheep_Move.png`,
    deadSkull:   `${U10}Factions/Knights/Troops/Dead/Dead.png`,
    fire:        `${U10}Effects/Fire/Fire.png`,
    explosion1:  `${FREE}Particle FX/Explosion_01.png`,
    explosion2:  `${FREE}Particle FX/Explosion_02.png`,
    dust:        `${FREE}Particle FX/Dust_01.png`,
    ptrArrow:    `${U10}UI/Pointers/01.png`,
    ptrBox:      `${U10}UI/Pointers/02.png`,

    // Buildings (Active Blue/Red + Construction + Destroyed)
    blue_castle:    `${FREE}Buildings/Blue Buildings/Castle.png`,
    red_castle:     `${FREE}Buildings/Red Buildings/Castle.png`,
    castle_con:     `${U10}Factions/Knights/Buildings/Castle/Castle_Construction.png`,
    castle_des:     `${U10}Factions/Knights/Buildings/Castle/Castle_Destroyed.png`,

    blue_house:     `${FREE}Buildings/Blue Buildings/House1.png`,
    red_house:      `${FREE}Buildings/Red Buildings/House1.png`,
    house_con:      `${U10}Factions/Knights/Buildings/House/House_Construction.png`,
    house_des:      `${U10}Factions/Knights/Buildings/House/House_Destroyed.png`,

    blue_tower:     `${FREE}Buildings/Blue Buildings/Tower.png`,
    red_tower:      `${FREE}Buildings/Red Buildings/Tower.png`,
    tower_con:      `${U10}Factions/Knights/Buildings/Tower/Tower_Construction.png`,
    tower_des:      `${U10}Factions/Knights/Buildings/Tower/Tower_Destroyed.png`,

    blue_barracks:  `${FREE}Buildings/Blue Buildings/Barracks.png`,
    red_barracks:   `${FREE}Buildings/Red Buildings/Barracks.png`,
    barracks_con:   `custom_assets/Buildings/Barracks_Construction.png`,
    barracks_des:   `custom_assets/Buildings/Barracks_Destroyed.png`,

    blue_archery:   `${FREE}Buildings/Blue Buildings/Archery.png`,
    red_archery:    `${FREE}Buildings/Red Buildings/Archery.png`,
    archery_con:    `custom_assets/Buildings/Archery_Construction.png`,
    archery_des:    `custom_assets/Buildings/Archery_Destroyed.png`,

    blue_monastery: `${FREE}Buildings/Blue Buildings/Monastery.png`,
    red_monastery:  `${FREE}Buildings/Red Buildings/Monastery.png`,
    monastery_con:  `custom_assets/Buildings/Monastery_Construction.png`,
    monastery_des:  `custom_assets/Buildings/Monastery_Destroyed.png`,

    blue_altar:     `custom_assets/Buildings/Altar_Blue.png`,
    red_altar:      `custom_assets/Buildings/Altar_Red.png`,
    altar_con:      `custom_assets/Buildings/Altar_Construction.png`,
    altar_des:      `custom_assets/Buildings/Altar_Destroyed.png`,
  };

  // Add all Blue & Red regular units + 4 Heroes cleanly
  for (const team of ['blue', 'red']) {
    const T = team === 'blue' ? 'Blue' : 'Red';
    ASSET_PATHS[`${team}_pawn_idle`]    = `${FREE}Units/${T} Units/Pawn/Pawn_Idle.png`;
    ASSET_PATHS[`${team}_pawn_run`]     = `${FREE}Units/${T} Units/Pawn/Pawn_Run.png`;
    ASSET_PATHS[`${team}_pawn_run_wood`]= `${FREE}Units/${T} Units/Pawn/Pawn_Run Wood.png`;
    ASSET_PATHS[`${team}_pawn_run_gold`]= `${FREE}Units/${T} Units/Pawn/Pawn_Run Gold.png`;
    ASSET_PATHS[`${team}_pawn_run_meat`]= `${FREE}Units/${T} Units/Pawn/Pawn_Run Meat.png`;
    ASSET_PATHS[`${team}_pawn_axe`]     = `${FREE}Units/${T} Units/Pawn/Pawn_Interact Axe.png`;
    ASSET_PATHS[`${team}_pawn_pick`]    = `${FREE}Units/${T} Units/Pawn/Pawn_Interact Pickaxe.png`;
    ASSET_PATHS[`${team}_pawn_hammer`]  = `${FREE}Units/${T} Units/Pawn/Pawn_Interact Hammer.png`;
    ASSET_PATHS[`${team}_pawn_knife`]   = `${FREE}Units/${T} Units/Pawn/Pawn_Interact Knife.png`;

    ASSET_PATHS[`${team}_warrior_idle`] = `${FREE}Units/${T} Units/Warrior/Warrior_Idle.png`;
    ASSET_PATHS[`${team}_warrior_run`]  = `${FREE}Units/${T} Units/Warrior/Warrior_Run.png`;
    ASSET_PATHS[`${team}_warrior_atk`]  = `${FREE}Units/${T} Units/Warrior/Warrior_Attack1.png`;

    ASSET_PATHS[`${team}_archer_idle`]  = `${FREE}Units/${T} Units/Archer/Archer_Idle.png`;
    ASSET_PATHS[`${team}_archer_run`]   = `${FREE}Units/${T} Units/Archer/Archer_Run.png`;
    ASSET_PATHS[`${team}_archer_atk`]   = `${FREE}Units/${T} Units/Archer/Archer_Shoot.png`;
    ASSET_PATHS[`${team}_arrow`]        = `${FREE}Units/${T} Units/Archer/Arrow.png`;

    ASSET_PATHS[`${team}_lancer_idle`]  = `${FREE}Units/${T} Units/Lancer/Lancer_Idle.png`;
    ASSET_PATHS[`${team}_lancer_run`]   = `${FREE}Units/${T} Units/Lancer/Lancer_Run.png`;
    ASSET_PATHS[`${team}_lancer_atk`]   = `${FREE}Units/${T} Units/Lancer/Lancer_Right_Attack.png`;

    ASSET_PATHS[`${team}_monk_idle`]    = `${FREE}Units/${T} Units/Monk/Idle.png`;
    ASSET_PATHS[`${team}_monk_run`]     = `${FREE}Units/${T} Units/Monk/Run.png`;
    ASSET_PATHS[`${team}_monk_atk`]     = `${FREE}Units/${T} Units/Monk/Heal.png`;
    ASSET_PATHS[`${team}_heal_fx`]      = `${FREE}Units/${T} Units/Monk/Heal_Effect.png`;

    ASSET_PATHS[`${team}_mage_idle`]    = `custom_assets/${T} Units/Mage/Mage_Idle.png`;
    ASSET_PATHS[`${team}_mage_run`]     = `custom_assets/${T} Units/Mage/Mage_Run.png`;
    ASSET_PATHS[`${team}_mage_atk`]     = `custom_assets/${T} Units/Mage/Mage_Attack.png`;
    ASSET_PATHS[`${team}_mage_orb`]     = `custom_assets/${T} Units/Mage/Mage_Orb.png`;

    for (const h of HERO_UNITS) {
      ASSET_PATHS[`${team}_${h}_idle`] = `custom_assets/Heroes/${T}/${h}/Idle.png`;
      ASSET_PATHS[`${team}_${h}_run`]  = `custom_assets/Heroes/${T}/${h}/Run.png`;
      ASSET_PATHS[`${team}_${h}_atk`]  = `custom_assets/Heroes/${T}/${h}/Attack.png`;
    }
  }

  // UI Icon URL map for sidebar & selection cards
  const PORTRAIT_URL = {
    pawn:      `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_01.png`,
    warrior:   `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_02.png`,
    archer:    `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_03.png`,
    lancer:    `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_04.png`,
    monk:      `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_05.png`,
    mage:      `${FREE}UI Elements/UI Elements/Human Avatars/Avatars_06.png`,
    berserker: `custom_assets/Heroes/Blue/berserker/Portrait.png`,
    king:      `custom_assets/Heroes/Blue/king/Portrait.png`,
    knight:    `custom_assets/Heroes/Blue/knight/Portrait.png`,
    champion:  `custom_assets/Heroes/Blue/champion/Portrait.png`,
    castle:    `${FREE}Buildings/Blue Buildings/Castle.png`,
    house:     `${FREE}Buildings/Blue Buildings/House1.png`,
    barracks:  `${FREE}Buildings/Blue Buildings/Barracks.png`,
    archery:   `${FREE}Buildings/Blue Buildings/Archery.png`,
    monastery: `${FREE}Buildings/Blue Buildings/Monastery.png`,
    tower:     `${FREE}Buildings/Blue Buildings/Tower.png`,
    altar:     `custom_assets/Buildings/Altar_Blue.png`,
  };

  // Web Audio Synth SFX
  class SoundFX {
    constructor() { this.ctx = null; this.muted = false; }
    ensure() {
      if (this.muted) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    play(type) {
      const c = this.ensure();
      if (!c) return;
      const now = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      if (type === 'order') {
        o.type = 'triangle'; o.frequency.setValueAtTime(560, now); o.frequency.exponentialRampToValueAtTime(760, now + 0.06);
        g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        o.start(now); o.stop(now + 0.07);
      } else if (type === 'slash') {
        o.type = 'sawtooth'; o.frequency.setValueAtTime(320, now); o.frequency.exponentialRampToValueAtTime(85, now + 0.11);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o.start(now); o.stop(now + 0.12);
      } else if (type === 'arrow') {
        o.type = 'triangle'; o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        g.gain.setValueAtTime(0.045, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        o.start(now); o.stop(now + 0.09);
      } else if (type === 'build') {
        o.type = 'square'; o.frequency.setValueAtTime(220, now); o.frequency.setValueAtTime(330, now + 0.06);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        o.start(now); o.stop(now + 0.15);
      } else if (type === 'boom') {
        o.type = 'sawtooth'; o.frequency.setValueAtTime(115, now); o.frequency.exponentialRampToValueAtTime(28, now + 0.42);
        g.gain.setValueAtTime(0.13, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
        o.start(now); o.stop(now + 0.44);
      } else if (type === 'hero') {
        o.type = 'triangle';
        o.frequency.setValueAtTime(440, now); o.frequency.setValueAtTime(554, now + 0.09); o.frequency.setValueAtTime(659, now + 0.18); o.frequency.setValueAtTime(880, now + 0.27);
        g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        o.start(now); o.stop(now + 0.48);
      } else if (type === 'meat') {
        o.type = 'sine'; o.frequency.setValueAtTime(640, now); o.frequency.setValueAtTime(920, now + 0.05);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        o.start(now); o.stop(now + 0.15);
      }
    }
  }

  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const miniCanvas = document.getElementById('minimap-canvas');
  const mctx = miniCanvas.getContext('2d');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingFill = document.getElementById('loading-fill');
  const loadingStatus = document.getElementById('loading-status');
  const lobbyOverlay = document.getElementById('lobby-overlay');
  const alertToast = document.getElementById('alert-toast');
  const prodGrid = document.getElementById('prod-grid');
  const selGrid = document.getElementById('sel-grid');
  const dialog = document.getElementById('rts-dialog');

  const ui = {
    factionRibbon: document.getElementById('faction-ribbon'),
    factionLabel: document.getElementById('faction-label'),
    matchTimer: document.getElementById('match-timer'),
    modeBadge: document.getElementById('mode-badge'),
    sidebar: document.querySelector('.command-sidebar'),
    resGold: document.getElementById('res-gold'),
    resWood: document.getElementById('res-wood'),
    resMeat: document.getElementById('res-meat'),
    resPop: document.getElementById('res-pop'),
    armyBadge: document.getElementById('army-total-badge'),
    idlePawnBadge: document.getElementById('idle-pawn-badge'),
    selPortrait: document.getElementById('sel-portrait'),
    selLvl: document.getElementById('sel-level-badge'),
    selTitle: document.getElementById('sel-title'),
    selHpFill: document.getElementById('sel-hp-fill'),
    selHpText: document.getElementById('sel-hp-text'),
    selSub: document.getElementById('sel-sub'),
    cmdAttackMove: document.getElementById('cmd-attackmove'),
    cmdSkill: document.getElementById('cmd-skill'),
    cmdSkillLabel: document.getElementById('cmd-skill-label'),
    cancelBuildBtn: document.getElementById('btn-cancel-build'),
    soundBtn: document.getElementById('btn-sound'),
    // Lobby
    inputCmdName: document.getElementById('input-cmd-name'),
    lanUrlText: document.getElementById('lan-url-text'),
    lanLobbyControls: document.getElementById('lan-lobby-controls'),
    lanWaitingBox: document.getElementById('lan-waiting-box'),
    roomList: document.getElementById('room-list'),
    inputRoomCode: document.getElementById('input-room-code'),
    waitingCode: document.getElementById('waiting-code'),
    waitHostName: document.getElementById('wait-host-name'),
    waitGuestName: document.getElementById('wait-guest-name'),
    btnLaunchLan: document.getElementById('btn-launch-lan'),
  };

  const sfx = new SoundFX();
  const images = {};

  // Match & Network State
  let gameState = 'loading'; // loading | lobby | playing | over
  let netRole = 'solo';      // 'solo' | 'host' | 'guest'
  let myTeam = 'blue';       // 'blue' (Host / Solo) | 'red' (Guest)
  let aiDifficulty = 'normal';
  let ws = null;
  let lanInfo = { url: window.location.origin };
  let syncTimer = 0;
  let lastHudSync = 0;

  // World Simulation State
  let nextId = 1;
  let worldTime = 0;
  let matchTime = 0;
  let lastTs = 0;
  let toastTimer = 0;
  let shakeTime = 0;
  let shakeMag = 0;

  let resources = {
    blue: { gold: 320, wood: 220, meat: 140 },
    red:  { gold: 320, wood: 220, meat: 140 },
  };
  let stats = {
    blue: { kills: 0, lost: 0, meatLooted: 0, buildingsBuilt: 0 },
    red:  { kills: 0, lost: 0, meatLooted: 0, buildingsBuilt: 0 },
  };

  let buildings = [];
  let units = [];
  let trees = [];
  let mines = [];
  let sheep = [];
  let meatDrops = [];
  let projectiles = [];
  let fxList = [];
  let moveMarkers = [];
  let floats = [];
  let minimapAlerts = [];

  // Local Player UI / Camera / Selection State
  const cam = { x: 0, y: WORLD_H - 900, zoom: 1.0 };
  const keys = new Set();
  const mouse = { sx: 0, sy: 0, wx: 400, wy: 1400, downLeft: false, dragStartX: 0, dragStartY: 0, dragging: false };
  let activeTab = 'build';
  let buildGhost = null;      // null or building kind string
  let attackMoveMode = false;
  let selectedUnitIds = new Set();
  let selectedBuildingId = null;
  const controlGroups = { 1: [], 2: [], 3: [], 4: [] };
  let lastClickTime = 0;
  let lastClickUnitId = null;
  let aiTimer = 0;

  // Helpers
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const enemyOf = (t) => (t === 'blue' ? 'red' : 'blue');

  function showToast(msg, dur = 2.4) {
    alertToast.textContent = msg;
    alertToast.classList.add('show');
    toastTimer = dur;
  }

  function addShake(mag, dur = 0.22) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = Math.max(shakeTime, dur);
  }

  function addFloat(x, y, text, color = '#fff') {
    floats.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  function spawnFx(key, x, y, frameW = 192, fps = 14, scale = 0.9, frameH = null) {
    const img = images[key];
    if (!img) return;
    const cols = Math.max(1, Math.round(img.width / frameW));
    const fh = frameH || (img.height % frameW === 0 && img.height > frameW ? frameW : img.height);
    const rows = Math.max(1, Math.round(img.height / fh));
    const frames = cols * rows;
    fxList.push({ key, x, y, frameW, frameH: fh, cols, frames, fps, scale, t: 0 });
  }

  function isBridgeTile(tx, ty) {
    return RIVER_COLS.includes(tx) && BRIDGES.some((b) => ty >= b.y1 && ty <= b.y2);
  }

  function isWaterTile(tx, ty) {
    if (tx < ISLAND.x1 || tx > ISLAND.x2 || ty < ISLAND.y1 || ty > ISLAND.y2) return true;
    if (RIVER_COLS.includes(tx) && !isBridgeTile(tx, ty)) return true;
    return false;
  }

  function isWalkable(x, y) {
    if (x < (ISLAND.x1 + 0.3) * TILE || x > (ISLAND.x2 + 0.7) * TILE) return false;
    if (y < (ISLAND.y1 + 0.3) * TILE || y > (ISLAND.y2 + 0.7) * TILE) return false;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (isWaterTile(tx, ty)) return false;
    return true;
  }

  // Supply calculation
  function getSupply(team) {
    let cap = 0;
    for (const b of buildings) {
      if (b.team === team && b.state === 'active') cap += BUILDING_DEFS[b.kind].supply;
    }
    cap = Math.min(60, cap);
    let used = 0;
    for (const u of units) {
      if (u.team === team && !u.dead) used += UNIT_DEFS[u.role].pop;
    }
    return { used, cap };
  }

  function canAfford(team, g, w, m) {
    const r = resources[team];
    return r.gold >= g && r.wood >= w && r.meat >= m;
  }

  function spendResources(team, g, w, m) {
    resources[team].gold -= g;
    resources[team].wood -= w;
    resources[team].meat -= m;
  }

  // World Reset (Symmetrical Warcraft 2-Player Island)
  function initWorld() {
    nextId = 1;
    matchTime = 0;
    aiTimer = 1.5;
    resources = {
      blue: { gold: 320, wood: 220, meat: 140 },
      red:  { gold: 320, wood: 220, meat: 140 },
    };
    stats = {
      blue: { kills: 0, lost: 0, meatLooted: 0, buildingsBuilt: 0 },
      red:  { kills: 0, lost: 0, meatLooted: 0, buildingsBuilt: 0 },
    };
    buildings = [];
    units = [];
    trees = [];
    mines = [];
    sheep = [];
    meatDrops = [];
    projectiles = [];
    fxList = [];
    moveMarkers = [];
    floats = [];
    minimapAlerts = [];
    selectedUnitIds.clear();
    selectedBuildingId = null;
    buildGhost = null;
    attackMoveMode = false;

    // 1. Gold Mines & Gold Stones
    mines.push({ id: nextId++, kind: 'mine', x: 4.6 * TILE,  y: 23.8 * TILE, gold: 3500 }); // Blue safe mine
    mines.push({ id: nextId++, kind: 'mine', x: 40.4 * TILE, y: 5.2 * TILE,  gold: 3500 }); // Red safe mine
    mines.push({ id: nextId++, kind: 'mine', x: 22.5 * TILE, y: 14.5 * TILE, gold: 4500 }); // Center contested gold island!
    mines.push({ id: nextId++, kind: 'stone', x: 11.2 * TILE, y: 24.4 * TILE, gold: 700 });
    mines.push({ id: nextId++, kind: 'stone', x: 33.8 * TILE, y: 4.6 * TILE,  gold: 700 });
    mines.push({ id: nextId++, kind: 'stone', x: 18.6 * TILE, y: 13.8 * TILE, gold: 900 });
    mines.push({ id: nextId++, kind: 'stone', x: 26.4 * TILE, y: 15.2 * TILE, gold: 900 });

    // 2. Forests (Blue NW + SE, Red SE + NW, riverbanks)
    const treeCoords = [
      [4, 15], [5.5, 16], [4, 17.5], [6.5, 17], [13.5, 24.5], [15, 23.5], [16.5, 24.5], [14, 21.5],
      [15, 14.5], [17, 16], [17, 4.5], [18.5, 5.5], [16, 6.2],
      [40.5, 14], [39, 12.5], [40.5, 11.5], [38, 12], [31, 4.5], [29.5, 5.5], [28, 4.5], [30.5, 7.5],
      [29, 14], [27.5, 13], [27.5, 24.2], [26, 23], [28.5, 22.2],
    ];
    treeCoords.forEach(([tx, ty], i) => {
      trees.push({ id: nextId++, x: tx * TILE, y: ty * TILE, wood: 90, kind: (i % 2) + 1, phase: i * 0.4 });
    });

    // 3. Starting Sheep Herds
    [
      [6.2, 20.5], [7.8, 21.0], [11.5, 22.8],
      [38.5, 8.5], [37.0, 8.0], [33.5, 6.2],
      [17.5, 11.2], [27.5, 17.5],
    ].forEach(([sx, sy], i) => {
      sheep.push({ id: nextId++, x: sx * TILE, y: sy * TILE, meat: 45, vx: 0, vy: 0, state: 'idle', timer: 1.5 + i * 0.4, facing: i % 2 ? 1 : -1, animT: i });
    });

    // 4. Blue Kingdom Starting Base (Bottom-Left)
    const bCastle = addBuilding('blue', 'castle', 8.2 * TILE, 22.6 * TILE, 'active');
    addBuilding('blue', 'house',    6.0 * TILE, 19.6 * TILE, 'active');
    addBuilding('blue', 'barracks', 11.8 * TILE, 20.2 * TILE, 'active');

    // Blue Starting Pawns (2 already gathering Wood & Gold!) & Guards
    const bp1 = addUnit('blue', 'pawn', 6.4 * TILE, 23.0 * TILE);
    bp1.task = 'gather_mine'; bp1.targetId = mines[0].id;
    const bp2 = addUnit('blue', 'pawn', 6.0 * TILE, 18.2 * TILE);
    bp2.task = 'gather_tree'; bp2.targetId = trees[0].id;
    addUnit('blue', 'pawn', 9.8 * TILE, 22.8 * TILE);
    addUnit('blue', 'pawn', 10.6 * TILE, 22.0 * TILE);

    addUnit('blue', 'warrior', 13.0 * TILE, 21.6 * TILE);
    addUnit('blue', 'warrior', 13.6 * TILE, 20.2 * TILE);
    addUnit('blue', 'archer',  12.4 * TILE, 19.0 * TILE);

    // 5. Red Empire Starting Base (Top-Right)
    addBuilding('red', 'castle',   36.8 * TILE, 6.4 * TILE, 'active');
    addBuilding('red', 'house',    39.0 * TILE, 9.4 * TILE, 'active');
    addBuilding('red', 'barracks', 33.2 * TILE, 8.8 * TILE, 'active');

    const rp1 = addUnit('red', 'pawn', 38.6 * TILE, 6.0 * TILE);
    rp1.task = 'gather_mine'; rp1.targetId = mines[1].id;
    const rp2 = addUnit('red', 'pawn', 39.2 * TILE, 10.6 * TILE);
    rp2.task = 'gather_tree'; rp2.targetId = trees[13].id;
    addUnit('red', 'pawn', 35.2 * TILE, 6.2 * TILE);
    addUnit('red', 'pawn', 34.4 * TILE, 7.0 * TILE);

    addUnit('red', 'warrior', 32.0 * TILE, 7.4 * TILE);
    addUnit('red', 'warrior', 31.4 * TILE, 8.8 * TILE);
    addUnit('red', 'archer',  32.6 * TILE, 10.0 * TILE);

    // Focus camera onto our starting Castle!
    focusCameraOnTeam(myTeam);
    updateFactionTheme();
    syncHUD(true);
  }

  function addBuilding(team, kind, x, y, state = 'active') {
    const def = BUILDING_DEFS[kind];
    const b = {
      id: nextId++,
      team,
      kind,
      x, y,
      hp: state === 'active' ? def.hp : Math.round(def.hp * 0.15),
      maxHp: def.hp,
      state, // 'building' | 'active' | 'destroyed'
      queue: [],
      trainTimer: 0,
      rallyX: x + (team === 'blue' ? 95 : -95),
      rallyY: y + 60,
      towerCd: 0,
    };
    buildings.push(b);
    return b;
  }

  function addUnit(team, role, x, y) {
    const def = UNIT_DEFS[role];
    const u = {
      id: nextId++,
      team,
      role,
      x, y,
      hp: def.hp,
      maxHp: def.hp,
      dmg: def.dmg,
      speed: def.speed,
      range: def.range,
      cd: def.cd,
      cdTimer: 0,
      atkTimer: 0,
      facing: team === 'blue' ? 1 : -1,
      anim: 'idle',
      animT: rand(0, 1),
      hurtFlash: 0,
      dead: false,

      // Hero progression & active skill
      isHero: !!def.isHero,
      level: 1,
      xp: 0,
      skillCd: 0,

      // Warcraft AI / Order state
      task: 'idle', // idle | move | attackMove | attack | hold | gather_tree | gather_mine | gather_sheep | gather_meat | return | build | repair
      tx: x, ty: y,
      targetId: null,
      carryType: null, // 'wood' | 'gold' | 'meat'
      carryAmt: 0,
      gatherTick: 0,
    };
    units.push(u);
    return u;
  }

  function focusCameraOnTeam(team) {
    const c = buildings.find((b) => b.team === team && b.kind === 'castle' && b.state !== 'destroyed')
      || { x: team === 'blue' ? 8.2 * TILE : 36.8 * TILE, y: team === 'blue' ? 22.6 * TILE : 6.4 * TILE };
    const vw = canvas.width / cam.zoom;
    const vh = canvas.height / cam.zoom;
    cam.x = clamp(c.x - vw * 0.5, 0, Math.max(0, WORLD_W - vw));
    cam.y = clamp(c.y - vh * 0.5, 0, Math.max(0, WORLD_H - vh));
  }

  // Placement Validation for Building Construction
  function canPlaceBuildingAt(kind, wx, wy) {
    const def = BUILDING_DEFS[kind];
    if (!def) return false;
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    if (tx < ISLAND.x1 + 1 || tx > ISLAND.x2 - 1 || ty < ISLAND.y1 + 1 || ty > ISLAND.y2 - 1) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (isWaterTile(tx + dx, ty + dy)) return false;
      }
    }
    for (const b of buildings) {
      if (dist(wx, wy, b.x, b.y) < def.rad + BUILDING_DEFS[b.kind].rad + 14) return false;
    }
    for (const m of mines) {
      if (dist(wx, wy, m.x, m.y) < def.rad + 58) return false;
    }
    for (const t of trees) {
      if (t.wood > 0 && dist(wx, wy, t.x, t.y) < def.rad + 32) return false;
    }
    return true;
  }

  // Command Dispatcher (works identically for Solo, Host Blue, and Guest Red over LAN!)
  function sendOrApplyCommand(cmd) {
    if (gameState !== 'playing') return;
    if (netRole === 'guest') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'player_cmd', cmd }));
      }
      return;
    }
    applyTeamCommand(myTeam, cmd);
  }

  function applyTeamCommand(team, cmd) {
    if (!cmd || !cmd.kind) return;
    const getOwnedUnits = (ids) => units.filter((u) => !u.dead && u.team === team && ids.includes(u.id));

    if (cmd.kind === 'move' || cmd.kind === 'attackMove') {
      const group = getOwnedUnits(cmd.ids || []);
      const n = group.length;
      const cols = Math.ceil(Math.sqrt(n));
      group.forEach((u, i) => {
        const col = i % cols - (cols - 1) * 0.5;
        const row = Math.floor(i / cols) - Math.floor((n - 1) / cols) * 0.5;
        u.task = cmd.kind;
        u.tx = clamp(cmd.x + col * 46, ISLAND.x1 * TILE + 24, ISLAND.x2 * TILE + 24);
        u.ty = clamp(cmd.y + row * 42, ISLAND.y1 * TILE + 24, ISLAND.y2 * TILE + 24);
        u.targetId = null;
      });
    } else if (cmd.kind === 'stop' || cmd.kind === 'hold') {
      getOwnedUnits(cmd.ids || []).forEach((u) => {
        u.task = cmd.kind === 'hold' ? 'hold' : 'idle';
        u.targetId = null;
      });
    } else if (cmd.kind === 'attack') {
      getOwnedUnits(cmd.ids || []).forEach((u) => {
        u.task = 'attack';
        u.targetId = cmd.targetId;
      });
    } else if (cmd.kind === 'gather') {
      getOwnedUnits(cmd.ids || []).forEach((u) => {
        if (u.role !== 'pawn') return;
        u.task = cmd.gatherTask;
        u.targetId = cmd.targetId;
      });
    } else if (cmd.kind === 'repair') {
      getOwnedUnits(cmd.ids || []).forEach((u) => {
        if (u.role !== 'pawn') return;
        u.task = 'repair';
        u.targetId = cmd.buildingId;
      });
    } else if (cmd.kind === 'build') {
      const def = BUILDING_DEFS[cmd.bKind];
      if (!def) return;
      if (!canPlaceBuildingAt(cmd.bKind, cmd.x, cmd.y)) {
        if (team === myTeam) showToast('Lokasi bangunan terhalang!', 1.5);
        return;
      }
      if (!canAfford(team, def.gold, def.wood, def.meat)) {
        if (team === myTeam) showToast('Gold / Kayu tidak cukup!', 1.6);
        return;
      }
      spendResources(team, def.gold, def.wood, def.meat);
      const nb = addBuilding(team, cmd.bKind, cmd.x, cmd.y, 'building');
      stats[team].buildingsBuilt++;

      // Assign selected pawns or nearest available pawn to build immediately!
      let builders = getOwnedUnits(cmd.pawnIds || []).filter((u) => u.role === 'pawn');
      if (builders.length === 0) {
        const nearest = units
          .filter((u) => !u.dead && u.team === team && u.role === 'pawn')
          .sort((a, b) => dist(a.x, a.y, cmd.x, cmd.y) - dist(b.x, b.y, cmd.x, cmd.y))[0];
        if (nearest) builders = [nearest];
      }
      builders.forEach((p) => { p.task = 'build'; p.targetId = nb.id; });
      if (team === myTeam) sfx.play('build');
    } else if (cmd.kind === 'train') {
      const uDef = UNIT_DEFS[cmd.role];
      if (!uDef) return;
      const sup = getSupply(team);
      if (sup.used + uDef.pop > sup.cap) {
        if (team === myTeam) showToast('Populasi penuh! Bangun House (+8 Pop).', 1.8);
        return;
      }
      if (!canAfford(team, uDef.gold, uDef.wood, uDef.meat)) {
        if (team === myTeam) showToast('Gold / Kayu / Daging tidak cukup!', 1.6);
        return;
      }
      // Prefer selected matching building, else least-busy active building of required type
      let trainer = buildings.find((b) => b.id === cmd.buildingId && b.team === team && b.state === 'active' && BUILDING_DEFS[b.kind].trains.includes(cmd.role));
      if (!trainer) {
        trainer = buildings
          .filter((b) => b.team === team && b.state === 'active' && b.kind === uDef.building)
          .sort((a, b) => a.queue.length - b.queue.length)[0];
      }
      if (!trainer) {
        if (team === myTeam) showToast(`Bangun ${BUILDING_DEFS[uDef.building].name} terlebih dahulu!`, 2.0);
        return;
      }
      if (trainer.queue.length >= 6) return;
      spendResources(team, uDef.gold, uDef.wood, uDef.meat);
      trainer.queue.push(cmd.role);
      if (team === myTeam) sfx.play('order');
    } else if (cmd.kind === 'rally') {
      const b = buildings.find((x) => x.id === cmd.buildingId && x.team === team);
      if (b) { b.rallyX = cmd.x; b.rallyY = cmd.y; }
    } else if (cmd.kind === 'heroSkill') {
      const hero = units.find((u) => !u.dead && u.team === team && u.isHero && u.id === cmd.heroId)
        || units.find((u) => !u.dead && u.team === team && u.isHero && (cmd.ids || []).includes(u.id));
      if (hero) activateHeroSkill(hero);
    }
  }

  // Hero Active Skills [Q]
  function activateHeroSkill(h) {
    if (h.skillCd > 0) return;
    const def = UNIT_DEFS[h.role];
    h.skillCd = def.skillCd;
    h.atkTimer = 0.45;
    h.anim = 'atk';
    h.animT = 0;

    if (h.role === 'berserker') {
      // Whirlwind Cleave
      sfx.play('slash');
      addShake(6, 0.2);
      spawnFx('explosion1', h.x, h.y - 10, 192, 18, 0.85);
      addFloat(h.x, h.y - 68, '🪓 PUSARAN KAPAK!', '#ffd166');
      for (const e of units) {
        if (e.dead || e.team === h.team) continue;
        if (dist(h.x, h.y, e.x, e.y) <= 135) {
          dealUnitDamage(e, 75 + h.level * 12, h);
          const ang = Math.atan2(e.y - h.y, e.x - h.x);
          const nx = e.x + Math.cos(ang) * 38;
          const ny = e.y + Math.sin(ang) * 38;
          if (isWalkable(nx, ny)) { e.x = nx; e.y = ny; }
        }
      }
    } else if (h.role === 'king') {
      // Royal Blessing Heal
      sfx.play('hero');
      addFloat(h.x, h.y - 72, '👑 BERKAH RAJA!', '#ffdc00');
      for (const a of units) {
        if (a.dead || a.team !== h.team) continue;
        if (dist(h.x, h.y, a.x, a.y) <= 220) {
          const heal = 110 + h.level * 20;
          a.hp = Math.min(a.maxHp, a.hp + heal);
          spawnFx(`${h.team}_heal_fx`, a.x, a.y, 192, 16, 0.75);
          addFloat(a.x, a.y - 44, `+${heal}`, '#54f085');
        }
      }
    } else if (h.role === 'knight') {
      // Jousting Charge forward toward nearest enemy or facing
      sfx.play('slash');
      addShake(6, 0.22);
      const nearest = units.filter((e) => !e.dead && e.team !== h.team && dist(h.x, h.y, e.x, e.y) < 260)
        .sort((a, b) => dist(h.x, h.y, a.x, a.y) - dist(h.x, h.y, b.x, b.y))[0];
      const ang = nearest ? Math.atan2(nearest.y - h.y, nearest.x - h.x) : (h.facing > 0 ? 0 : Math.PI);
      const nx = h.x + Math.cos(ang) * 110;
      const ny = h.y + Math.sin(ang) * 110;
      if (isWalkable(nx, ny)) { h.x = nx; h.y = ny; }
      h.facing = Math.cos(ang) >= 0 ? 1 : -1;
      spawnFx('dust', h.x, h.y + 10, 64, 15, 1.8);
      addFloat(h.x, h.y - 74, '🐎 TERJANGAN LANCE!', '#8ce8ff');
      for (const e of units) {
        if (e.dead || e.team === h.team) continue;
        if (dist(h.x, h.y, e.x, e.y) <= 135) {
          dealUnitDamage(e, 95 + h.level * 14, h);
        }
      }
    } else if (h.role === 'champion') {
      // Titan Greatsword Cleave
      sfx.play('boom');
      addShake(8, 0.26);
      const fxX = h.x + h.facing * 56;
      spawnFx('explosion2', fxX, h.y - 12, 192, 16, 0.95);
      addFloat(h.x, h.y - 72, '⚔ TEBASAN RAKSASA!', '#d4edc2');
      for (const e of units) {
        if (e.dead || e.team === h.team) continue;
        if (dist(fxX, h.y, e.x, e.y) <= 155) {
          dealUnitDamage(e, 90 + h.level * 15, h);
        }
      }
      for (const b of buildings) {
        if (b.team === h.team || b.state === 'destroyed') continue;
        if (dist(fxX, h.y, b.x, b.y) <= 160) damageBuilding(b, 95, h.team);
      }
    }
  }

  // Combat, Dead Animation & Meat Drop on EVERY Unit Death!
  function dealUnitDamage(target, dmg, attacker) {
    if (target.dead) return;
    target.hp -= dmg;
    target.hurtFlash = 0.14;
    addFloat(target.x + rand(-8, 8), target.y - 42, `-${dmg}`, target.team === myTeam ? '#ff7070' : '#ffd166');

    if (target.hp <= 0) {
      target.hp = 0;
      target.dead = true;
      stats[target.team].lost++;

      // Play official Tiny Swords Dead.png skull pop animation (7x2 grid of 128x128)!
      spawnFx('deadSkull', target.x, target.y - 6, 128, 12, 0.9, 128);

      // BOTH enemy deaths AND allied unit deaths leave behind fresh collectible Meat (M_Spawn)!
      const meatVal = target.isHero ? 40 : 18;
      meatDrops.push({
        id: nextId++,
        x: target.x + rand(-10, 10),
        y: target.y + rand(-6, 6),
        meat: meatVal,
        t: 0,
        ttl: 55,
      });

      if (attacker && !attacker.dead && attacker.team !== target.team) {
        stats[attacker.team].kills++;
        if (attacker.isHero) {
          attacker.xp += target.isHero ? 100 : 35;
          while (attacker.xp >= attacker.level * 100 && attacker.level < 5) {
            attacker.xp -= attacker.level * 100;
            attacker.level++;
            attacker.maxHp += 55;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + 90);
            attacker.dmg += 6;
            addFloat(attacker.x, attacker.y - 78, `⭐ LEVEL ${attacker.level}!`, '#ffdc00');
            sfx.play('hero');
          }
        }
      }
    }
  }

  function damageBuilding(b, dmg, attackerTeam) {
    if (b.state === 'destroyed') return;
    b.hp = Math.max(0, b.hp - dmg);
    if (b.team === myTeam && Math.random() < 0.25) {
      minimapAlerts.push({ x: b.x, y: b.y, life: 1.5 });
      if (toastTimer <= 0) showToast(`🔥 ${BUILDING_DEFS[b.kind].name} diserang!`, 1.8);
    }

    if (b.hp <= 0) {
      b.hp = 0;
      b.state = 'destroyed';
      b.queue = [];
      spawnFx('explosion1', b.x - 24, b.y - 24, 192, 13, 1.35);
      spawnFx('explosion2', b.x + 24, b.y - 10, 192, 13, 1.25);
      addShake(9, 0.35);
      sfx.play('boom');
      if (b.team === myTeam) showToast(`💥 ${BUILDING_DEFS[b.kind].name} kita HANCUR!`, 2.8);
      else showToast(`🔥 ${BUILDING_DEFS[b.kind].name} musuh HANCUR!`, 2.5);

      // Check Victory / Defeat (all enemy Castles destroyed!)
      const blueCastles = buildings.filter((x) => x.team === 'blue' && x.kind === 'castle' && x.state !== 'destroyed').length;
      const redCastles = buildings.filter((x) => x.team === 'red' && x.kind === 'castle' && x.state !== 'destroyed').length;
      if (blueCastles === 0 || redCastles === 0) {
        const winner = redCastles === 0 ? 'blue' : 'red';
        endMatch(winner);
      }
    }
  }

  function endMatch(winner) {
    if (gameState === 'over') return;
    gameState = 'over';
    const won = winner === myTeam;
    const rib = document.getElementById('dlg-ribbon');
    rib.textContent = won ? '🏆 KEMENANGAN KERAJAAN!' : '💀 KEKALAHAN!';
    rib.className = 'modal-ribbon' + (won ? '' : ' red');

    const myStats = stats[myTeam];
    const res = resources[myTeam];
    document.getElementById('dlg-body').innerHTML = `
      <p style="font-weight:800;font-size:0.95rem;">${won ? 'Semua Castle musuh telah terbakar dan runtuh! Kerajaanmu menguasai seluruh lembah!' : 'Castle utama kerajaan kita telah hancur rata dengan tanah!'}</p>
      <p>⏱ Durasi Perang: <strong>${ui.matchTimer.textContent}</strong></p>
      <p>⚔ Musuh Dikalahkan: <strong>${myStats.kills}</strong> • Pasukan Gugur: <strong>${myStats.lost}</strong></p>
      <p>🥩 Daging Medan Perang &amp; Ternak: <strong>${myStats.meatLooted}</strong> • Bangunan Dibangun: <strong>${myStats.buildingsBuilt}</strong></p>
      <p>💰 Sisa Resource: <strong>${res.gold} Gold</strong> • <strong>${res.wood} Kayu</strong> • <strong>${res.meat} Daging</strong></p>
    `;
    document.getElementById('dlg-actions').innerHTML = `<button id="btn-back-lobby" class="ts-big-btn blue" type="button">Kembali ke Lobby</button>`;
    document.getElementById('btn-back-lobby').addEventListener('click', () => {
      dialog.close();
      openLobby();
    });
    dialog.showModal();
  }

  // Simulation Update (Host or Solo runs full simulation; Guest interpolates/receives authoritative snapshot)
  function updateSimulation(dt) {
    matchTime += dt;

    // 1. Buildings: Construction fallback & Unit Training Queues & Tower Defense
    for (const b of buildings) {
      if (b.state === 'destroyed') continue;
      if (b.state === 'active' && b.queue.length > 0) {
        const nextRole = b.queue[0];
        const def = UNIT_DEFS[nextRole];
        b.trainTimer += dt;
        if (b.trainTimer >= def.trainTime) {
          b.trainTimer = 0;
          b.queue.shift();
          const spawnAng = Math.atan2(b.rallyY - b.y, b.rallyX - b.x);
          const sx = b.x + Math.cos(spawnAng) * 76;
          const sy = b.y + Math.sin(spawnAng) * 76;
          const nu = addUnit(b.team, nextRole, sx, sy);
          if (dist(sx, sy, b.rallyX, b.rallyY) > 30) {
            nu.task = 'move';
            nu.tx = b.rallyX + rand(-22, 22);
            nu.ty = b.rallyY + rand(-22, 22);
          }
          spawnFx('dust', nu.x, nu.y + 12, 64, 15, 1.1);
          if (b.team === myTeam) {
            if (nu.isHero) { sfx.play('hero'); showToast(`👑 Hero ${def.name} telah tiba!`, 2.4); }
            else sfx.play('build');
          }
        }
      }

      // Guard Tower shoots arrows automatically
      if (b.state === 'active' && b.kind === 'tower') {
        b.towerCd -= dt;
        if (b.towerCd <= 0) {
          const tDef = BUILDING_DEFS.tower;
          const target = units
            .filter((u) => !u.dead && u.team !== b.team && dist(b.x, b.y, u.x, u.y) <= tDef.range)
            .sort((a, c) => dist(b.x, b.y, a.x, a.y) - dist(b.x, b.y, c.x, c.y))[0];
          if (target) {
            b.towerCd = tDef.cd;
            fireProjectile(b.team, 'arrow', b.x, b.y - 80, target.x, target.y - 24, tDef.dmg, false);
          }
        }
      }
    }

    // 2. Sheep grazing & periodic respawn near Houses
    for (const s of sheep) {
      s.animT += dt;
      s.timer -= dt;
      if (s.timer <= 0) {
        if (s.state === 'idle') {
          s.state = 'move';
          const ang = Math.random() * Math.PI * 2;
          s.vx = Math.cos(ang) * 24; s.vy = Math.sin(ang) * 18;
          s.facing = s.vx >= 0 ? 1 : -1;
          s.timer = rand(1.1, 2.4);
        } else {
          s.state = 'idle'; s.vx = 0; s.vy = 0; s.timer = rand(2.2, 4.5);
        }
      }
      if (s.state === 'move') {
        const nx = s.x + s.vx * dt;
        const ny = s.y + s.vy * dt;
        if (isWalkable(nx, ny)) { s.x = nx; s.y = ny; }
      }
    }
    if (sheep.length < 10 && Math.random() < dt * 0.14) {
      const houses = buildings.filter((b) => b.kind === 'house' && b.state === 'active');
      if (houses.length) {
        const h = houses[Math.floor(Math.random() * houses.length)];
        sheep.push({ id: nextId++, x: h.x + rand(-65, 65), y: h.y + rand(40, 80), meat: 45, vx: 0, vy: 0, state: 'idle', timer: 2, facing: 1, animT: 0 });
      }
    }

    // 3. Meat drops animation & TTL
    for (const m of meatDrops) { m.t += dt; m.ttl -= dt; }
    meatDrops = meatDrops.filter((m) => m.ttl > 0 && m.meat > 0);

    // 4. Units Update
    for (const u of units) {
      if (u.dead) continue;
      if (u.hurtFlash > 0) u.hurtFlash -= dt;
      if (u.cdTimer > 0) u.cdTimer -= dt;
      if (u.atkTimer > 0) u.atkTimer -= dt;
      if (u.skillCd > 0) u.skillCd = Math.max(0, u.skillCd - dt);
      u.animT += dt;

      // Combat units & Heroes automatically pick up battlefield Meat drops right underfoot!
      if (!u.isHero || true) {
        if (u.role !== 'pawn') {
          for (const m of meatDrops) {
            if (m.meat > 0 && dist(u.x, u.y, m.x, m.y) < 34) {
              resources[u.team].meat += m.meat;
              stats[u.team].meatLooted += m.meat;
              addFloat(m.x, m.y - 26, `+${m.meat} 🥩`, '#ff9b85');
              if (u.team === myTeam) sfx.play('meat');
              m.meat = 0;
            }
          }
        }
      }

      if (u.role === 'pawn') updatePawn(u, dt);
      else if (u.role === 'monk') updateMonk(u, dt);
      else updateCombatUnit(u, dt);
    }

    // Light unit separation so stacked troops fan out smoothly
    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      if (a.dead) continue;
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.1 && d < 28) {
          const push = (28 - d) * 0.25;
          const nx = (dx / d) * push;
          const ny = (dy / d) * push;
          if (isWalkable(a.x - nx, a.y - ny)) { a.x -= nx; a.y -= ny; }
          if (isWalkable(b.x + nx, b.y + ny)) { b.x += nx; b.y += ny; }
        }
      }
    }
    units = units.filter((u) => !u.dead);

    // 5. Projectiles
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.animT += dt;
      let hit = false;
      for (const u of units) {
        if (u.dead || u.team === p.team) continue;
        if (dist(u.x, u.y - 22, p.x, p.y) < (p.splash ? 34 : 28)) {
          dealUnitDamage(u, p.dmg, null);
          if (p.splash) {
            for (const o of units) {
              if (o !== u && !o.dead && o.team !== p.team && dist(o.x, o.y - 22, p.x, p.y) <= p.splash) {
                dealUnitDamage(o, Math.round(p.dmg * 0.65), null);
              }
            }
            spawnFx('explosion1', p.x, p.y, 192, 18, 0.52);
          }
          p.life = 0; hit = true; break;
        }
      }
      if (!hit && p.life > 0) {
        for (const b of buildings) {
          if (b.team === p.team || b.state === 'destroyed') continue;
          if (dist(b.x, b.y, p.x, p.y) < BUILDING_DEFS[b.kind].rad + 14) {
            damageBuilding(b, p.dmg, p.team);
            if (p.splash) spawnFx('explosion1', p.x, p.y, 192, 18, 0.52);
            p.life = 0; break;
          }
        }
      }
    }
    projectiles = projectiles.filter((p) => p.life > 0);

    // 6. Solo Red AI Brain
    if (netRole === 'solo') updateSoloAI(dt);
  }

  function stepUnitToward(u, tx, ty, dt) {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const step = Math.min(d, u.speed * dt);
    const vx = (dx / d) * step;
    const vy = (dy / d) * step;
    if (isWalkable(u.x + vx, u.y + vy)) {
      u.x += vx; u.y += vy;
    } else if (isWalkable(u.x + vx, u.y)) {
      u.x += vx;
    } else if (isWalkable(u.x, u.y + vy)) {
      u.y += vy;
    } else {
      // River pathfinding helper: steer toward nearest bridge!
      const nearBridge = BRIDGES.reduce((best, b) => {
        const by = ((b.y1 + b.y2) * 0.5 + 0.5) * TILE;
        return Math.abs(u.y - by) < Math.abs(u.y - best) ? by : best;
      }, ((BRIDGES[0].y1 + BRIDGES[0].y2) * 0.5 + 0.5) * TILE);
      const bdir = Math.sign(nearBridge - u.y) || 1;
      if (isWalkable(u.x, u.y + bdir * step)) u.y += bdir * step;
    }
    if (Math.abs(dx) > 2) u.facing = dx >= 0 ? 1 : -1;
    return false;
  }

  function nearestFriendlyCastle(team, x, y) {
    return buildings
      .filter((b) => b.team === team && b.kind === 'castle' && b.state === 'active')
      .sort((a, c) => dist(x, y, a.x, a.y) - dist(x, y, c.x, c.y))[0];
  }

  function updatePawn(u, dt) {
    if (u.task === 'move') {
      if (stepUnitToward(u, u.tx, u.ty, dt)) u.task = 'idle';
      u.anim = 'run';
      return;
    }
    if (u.task === 'hold') { u.anim = 'idle'; return; }

    // 1. Build unfinished building
    if (u.task === 'build') {
      const b = buildings.find((x) => x.id === u.targetId && x.state === 'building');
      if (!b) { u.task = 'idle'; return; }
      const reach = BUILDING_DEFS[b.kind].rad + 32;
      if (dist(u.x, u.y, b.x, b.y) > reach) {
        stepUnitToward(u, b.x, b.y, dt);
        u.anim = 'run';
      } else {
        u.facing = b.x >= u.x ? 1 : -1;
        u.anim = 'hammer';
        const rate = b.maxHp / BUILDING_DEFS[b.kind].buildTime;
        b.hp = Math.min(b.maxHp, b.hp + rate * dt);
        if (b.hp >= b.maxHp) {
          b.hp = b.maxHp;
          b.state = 'active';
          if (b.kind === 'house') {
            sheep.push({ id: nextId++, x: b.x + rand(-55, 55), y: b.y + 68, meat: 45, vx: 0, vy: 0, state: 'idle', timer: 2, facing: 1, animT: 0 });
          }
          spawnFx('dust', b.x, b.y, 64, 15, 1.6);
          if (b.team === myTeam) {
            sfx.play('build');
            showToast(`✅ ${BUILDING_DEFS[b.kind].name} selesai dibangun!`, 2.0);
          }
          u.task = 'idle';
        }
      }
      return;
    }

    // 2. Repair burning/damaged building
    if (u.task === 'repair') {
      const b = buildings.find((x) => x.id === u.targetId && x.team === u.team && x.state === 'active' && x.hp < x.maxHp);
      if (!b) { u.task = 'idle'; return; }
      const reach = BUILDING_DEFS[b.kind].rad + 32;
      if (dist(u.x, u.y, b.x, b.y) > reach) {
        stepUnitToward(u, b.x, b.y, dt);
        u.anim = 'run';
      } else {
        u.facing = b.x >= u.x ? 1 : -1;
        u.anim = 'hammer';
        b.hp = Math.min(b.maxHp, b.hp + 55 * dt);
        u.gatherTick += dt;
        if (u.gatherTick >= 1.0) {
          u.gatherTick = 0;
          if (resources[u.team].wood > 0) resources[u.team].wood = Math.max(0, resources[u.team].wood - 2);
        }
      }
      return;
    }

    // 3. Return carried Wood / Gold / Meat to Castle
    if (u.task === 'return') {
      const castle = nearestFriendlyCastle(u.team, u.x, u.y);
      if (!castle) { u.task = 'idle'; return; }
      if (dist(u.x, u.y, castle.x, castle.y) > BUILDING_DEFS.castle.rad + 26) {
        stepUnitToward(u, castle.x, castle.y, dt);
        u.anim = `run_${u.carryType}`;
      } else {
        resources[u.team][u.carryType] += u.carryAmt;
        const col = u.carryType === 'gold' ? '#ffd93d' : u.carryType === 'wood' ? '#d9a76a' : '#ff9b85';
        const icon = u.carryType === 'gold' ? '🪙' : u.carryType === 'wood' ? '🪵' : '🥩';
        if (u.carryType === 'meat') stats[u.team].meatLooted += u.carryAmt;
        addFloat(u.x, u.y - 45, `+${u.carryAmt} ${icon}`, col);
        const lastType = u.carryType;
        u.carryType = null; u.carryAmt = 0;
        // Resume gathering!
        if (lastType === 'wood') u.task = 'gather_tree';
        else if (lastType === 'gold') u.task = 'gather_mine';
        else u.task = 'gather_meat';
      }
      return;
    }

    // 4. Gather Wood from Tree
    if (u.task === 'gather_tree') {
      let tr = trees.find((x) => x.id === u.targetId && x.wood > 0);
      if (!tr) {
        tr = trees.filter((x) => x.wood > 0).sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
        if (!tr) { u.task = 'idle'; return; }
        u.targetId = tr.id;
      }
      if (dist(u.x, u.y, tr.x, tr.y) > 46) {
        stepUnitToward(u, tr.x, tr.y, dt);
        u.anim = 'run';
      } else {
        u.facing = tr.x >= u.x ? 1 : -1;
        u.anim = 'axe';
        u.gatherTick += dt;
        if (u.gatherTick >= 2.2) {
          u.gatherTick = 0;
          const take = Math.min(12, tr.wood);
          tr.wood -= take;
          u.carryType = 'wood'; u.carryAmt = take;
          u.task = 'return';
        }
      }
      return;
    }

    // 5. Gather Gold from Mine / Gold Stone
    if (u.task === 'gather_mine') {
      let mn = mines.find((x) => x.id === u.targetId && x.gold > 0);
      if (!mn) {
        mn = mines.filter((x) => x.gold > 0).sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
        if (!mn) { u.task = 'idle'; return; }
        u.targetId = mn.id;
      }
      const reach = mn.kind === 'mine' ? 68 : 48;
      if (dist(u.x, u.y, mn.x, mn.y) > reach) {
        stepUnitToward(u, mn.x, mn.y, dt);
        u.anim = 'run';
      } else {
        u.facing = mn.x >= u.x ? 1 : -1;
        u.anim = 'pick';
        u.gatherTick += dt;
        if (u.gatherTick >= 2.3) {
          u.gatherTick = 0;
          const take = Math.min(15, mn.gold);
          mn.gold -= take;
          u.carryType = 'gold'; u.carryAmt = take;
          u.task = 'return';
        }
      }
      return;
    }

    // 6. Gather Meat from Fallen Soldier Drops OR Sheep
    if (u.task === 'gather_meat') {
      let drop = meatDrops.find((m) => m.id === u.targetId && m.meat > 0)
        || meatDrops.filter((m) => m.meat > 0).sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
      if (drop) {
        u.targetId = drop.id;
        if (dist(u.x, u.y, drop.x, drop.y) > 34) {
          stepUnitToward(u, drop.x, drop.y, dt);
          u.anim = 'run';
        } else {
          u.carryType = 'meat'; u.carryAmt = drop.meat;
          drop.meat = 0;
          u.task = 'return';
        }
        return;
      }
      let sh = sheep.find((s) => s.id === u.targetId && s.meat > 0)
        || sheep.filter((s) => s.meat > 0).sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
      if (!sh) { u.task = 'idle'; return; }
      u.targetId = sh.id;
      if (dist(u.x, u.y, sh.x, sh.y) > 42) {
        stepUnitToward(u, sh.x, sh.y, dt);
        u.anim = 'run';
      } else {
        u.facing = sh.x >= u.x ? 1 : -1;
        u.anim = 'knife';
        u.gatherTick += dt;
        if (u.gatherTick >= 1.8) {
          u.gatherTick = 0;
          u.carryType = 'meat'; u.carryAmt = 22;
          sh.meat -= 22;
          if (sh.meat <= 0) sheep = sheep.filter((x) => x.id !== sh.id);
          u.task = 'return';
        }
      }
      return;
    }

    // 7. Attack enemy if explicitly ordered
    if (u.task === 'attack') {
      const target = findEntityById(u.targetId);
      if (!target || target.dead || target.state === 'destroyed') { u.task = 'idle'; return; }
      const reach = u.range + (target.kind ? BUILDING_DEFS[target.kind].rad : 0);
      if (dist(u.x, u.y, target.x, target.y) > reach) {
        stepUnitToward(u, target.x, target.y, dt);
        u.anim = 'run';
      } else {
        u.facing = target.x >= u.x ? 1 : -1;
        if (u.cdTimer <= 0) {
          u.cdTimer = u.cd; u.atkTimer = 0.4; u.anim = 'axe'; u.animT = 0;
          if (target.kind) damageBuilding(target, u.dmg, u.team);
          else dealUnitDamage(target, u.dmg, u);
        } else if (u.atkTimer <= 0) u.anim = 'idle';
      }
      return;
    }

    // Idle pawn: auto-collect nearby battlefield meat drop if very close!
    const nearMeat = meatDrops.find((m) => m.meat > 0 && dist(u.x, u.y, m.x, m.y) < 160);
    if (nearMeat) {
      u.task = 'gather_meat';
      u.targetId = nearMeat.id;
      return;
    }
    u.anim = 'idle';
  }

  function updateMonk(u, dt) {
    // Heal injured nearby friendly unit first
    const injured = units
      .filter((a) => !a.dead && a.team === u.team && a !== u && a.hp < a.maxHp && dist(u.x, u.y, a.x, a.y) <= (u.task === 'hold' ? u.range : 320))
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

    if (injured && u.task !== 'move') {
      if (dist(u.x, u.y, injured.x, injured.y) > u.range) {
        stepUnitToward(u, injured.x, injured.y, dt);
        u.anim = 'run';
      } else if (u.cdTimer <= 0) {
        u.cdTimer = u.cd; u.atkTimer = 0.65; u.anim = 'atk'; u.animT = 0;
        u.facing = injured.x >= u.x ? 1 : -1;
        injured.hp = Math.min(injured.maxHp, injured.hp + u.dmg);
        addFloat(injured.x, injured.y - 44, `+${u.dmg}`, '#54f085');
        spawnFx(`${u.team}_heal_fx`, injured.x, injured.y, 192, 16, 0.78);
      } else if (u.atkTimer <= 0) u.anim = 'idle';
      return;
    }

    if (u.task === 'move' || u.task === 'attackMove') {
      if (stepUnitToward(u, u.tx, u.ty, dt)) u.task = 'idle';
      u.anim = 'run';
      return;
    }
    if (u.atkTimer <= 0) u.anim = 'idle';
  }

  function findEntityById(id) {
    return units.find((u) => u.id === id) || buildings.find((b) => b.id === id) || null;
  }

  function findNearestEnemy(team, x, y, maxR) {
    let best = null;
    let bestD = maxR;
    for (const u of units) {
      if (u.dead || u.team === team) continue;
      const d = dist(x, y, u.x, u.y);
      if (d < bestD) { bestD = d; best = u; }
    }
    if (best) return best;
    for (const b of buildings) {
      if (b.team === team || b.state === 'destroyed') continue;
      const d = dist(x, y, b.x, b.y) - BUILDING_DEFS[b.kind].rad;
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  function updateCombatUnit(u, dt) {
    if (u.atkTimer > 0) {
      u.anim = 'atk';
      return;
    }

    // Direct move (ignores aggro until arriving)
    if (u.task === 'move') {
      if (stepUnitToward(u, u.tx, u.ty, dt)) u.task = 'idle';
      u.anim = 'run';
      return;
    }

    // Explicit target attack
    if (u.task === 'attack') {
      const target = findEntityById(u.targetId);
      if (!target || target.dead || target.state === 'destroyed') {
        u.task = 'idle';
      } else {
        const reach = u.range + (target.kind ? BUILDING_DEFS[target.kind].rad : 0);
        if (dist(u.x, u.y, target.x, target.y) > reach) {
          stepUnitToward(u, target.x, target.y, dt);
          u.anim = 'run';
        } else {
          performCombatAttack(u, target);
        }
        return;
      }
    }

    // Auto-acquire nearby enemy (Hold = strict range, AttackMove / Idle = 320px aggro)
    const aggroR = u.task === 'hold' ? u.range : 320;
    const foe = findNearestEnemy(u.team, u.x, u.y, aggroR);
    if (foe) {
      const reach = u.range + (foe.kind ? BUILDING_DEFS[foe.kind].rad : 0);
      if (dist(u.x, u.y, foe.x, foe.y) <= reach) {
        performCombatAttack(u, foe);
        return;
      }
      if (u.task !== 'hold') {
        stepUnitToward(u, foe.x, foe.y, dt);
        u.anim = 'run';
        return;
      }
    }

    // Continue AttackMove march if no foe within aggro
    if (u.task === 'attackMove') {
      if (stepUnitToward(u, u.tx, u.ty, dt)) u.task = 'idle';
      u.anim = 'run';
      return;
    }

    u.anim = 'idle';
  }

  function performCombatAttack(u, target) {
    u.facing = target.x >= u.x ? 1 : -1;
    if (u.cdTimer > 0) {
      u.anim = 'idle';
      return;
    }
    u.cdTimer = u.cd;
    u.atkTimer = u.isHero ? 0.44 : (u.role === 'archer' || u.role === 'mage' ? 0.50 : 0.36);
    u.anim = 'atk';
    u.animT = 0;

    if (u.role === 'archer') {
      fireProjectile(u.team, 'arrow', u.x, u.y - 24, target.x, target.y - 24, u.dmg, false);
    } else if (u.role === 'mage') {
      fireProjectile(u.team, 'orb', u.x + u.facing * 18, u.y - 30, target.x, target.y - 24, u.dmg, true);
    } else {
      if (target.kind) damageBuilding(target, u.dmg, u.team);
      else dealUnitDamage(target, u.dmg, u);
      if (u.team === myTeam && dist(u.x, u.y, cam.x + canvas.width * 0.5, cam.y + canvas.height * 0.5) < 900) {
        sfx.play('slash');
      }
    }
  }

  function fireProjectile(team, kind, sx, sy, tx, ty, dmg, isSplash) {
    const ang = Math.atan2(ty - sy, tx - sx);
    const spd = kind === 'arrow' ? 490 : 370;
    projectiles.push({
      team, kind,
      x: sx, y: sy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      angle: ang,
      dmg,
      splash: isSplash ? 78 : 0,
      life: 1.5,
      animT: 0,
    });
    if (team === myTeam) sfx.play('arrow');
  }

  // Smart Solo AI (Red Empire builds base, gathers all 3 resources, trains army & summons Heroes!)
  function updateSoloAI(dt) {
    aiTimer -= dt;
    if (aiTimer > 0) return;
    aiTimer = aiDifficulty === 'hard' ? 2.4 : 3.6;

    const red = 'red';
    const sup = getSupply(red);
    const redBuildings = buildings.filter((b) => b.team === red && b.state !== 'destroyed');
    const redCastle = redBuildings.find((b) => b.kind === 'castle');
    if (!redCastle) return;

    // 1. Keep idle AI pawns busy gathering Wood, Gold, and Meat drops
    const idlePawns = units.filter((u) => !u.dead && u.team === red && u.role === 'pawn' && u.task === 'idle');
    idlePawns.forEach((p, idx) => {
      if (meatDrops.length > 0 && idx % 3 === 0) {
        p.task = 'gather_meat'; p.targetId = meatDrops[0].id;
      } else if (idx % 2 === 0) {
        p.task = 'gather_mine'; p.targetId = mines[1].id;
      } else {
        const tr = trees.filter((t) => t.wood > 0).sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
        if (tr) { p.task = 'gather_tree'; p.targetId = tr.id; }
      }
    });

    // Repair burning AI buildings
    const burning = redBuildings.find((b) => b.state === 'active' && b.hp < b.maxHp * 0.65);
    if (burning && idlePawns[0]) {
      idlePawns[0].task = 'repair'; idlePawns[0].targetId = burning.id;
    }

    // 2. Build progression: House -> Archery -> Tower -> Altar -> Monastery
    const hasKind = (k) => redBuildings.some((b) => b.kind === k);
    const tryAiBuild = (kind, ox, oy) => {
      const def = BUILDING_DEFS[kind];
      if (!canAfford(red, def.gold, def.wood, def.meat)) return false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const bx = redCastle.x + ox + rand(-120, 120);
        const by = redCastle.y + oy + rand(-100, 100);
        if (canPlaceBuildingAt(kind, bx, by)) {
          applyTeamCommand(red, { kind: 'build', bKind: kind, x: bx, y: by, pawnIds: [] });
          return true;
        }
      }
      return false;
    };

    if (sup.used >= sup.cap - 2 && sup.cap < 48) tryAiBuild('house', -160, 180);
    else if (!hasKind('archery')) tryAiBuild('archery', -260, -20);
    else if (redBuildings.filter((b) => b.kind === 'tower').length < 2) tryAiBuild('tower', -340, 140);
    else if (!hasKind('altar')) tryAiBuild('altar', -220, 260);
    else if (!hasKind('monastery')) tryAiBuild('monastery', 120, 250);

    // 3. Train Pawns up to 5, Military & Heroes
    const redPawns = units.filter((u) => !u.dead && u.team === red && u.role === 'pawn').length;
    const redHeroes = units.filter((u) => !u.dead && u.team === red && u.isHero).length;
    if (redPawns < 5) applyTeamCommand(red, { kind: 'train', role: 'pawn' });

    if (hasKind('altar') && redHeroes < 2) {
      const pick = HERO_UNITS[Math.floor(Math.random() * HERO_UNITS.length)];
      applyTeamCommand(red, { kind: 'train', role: pick });
    }
    const pool = ['warrior', 'archer', 'warrior', 'lancer', 'mage', 'monk'];
    const role = pool[Math.floor(Math.random() * pool.length)];
    applyTeamCommand(red, { kind: 'train', role });

    // 4. Wave Attack or Base Defense
    const invaders = units.find((u) => !u.dead && u.team === 'blue' && dist(u.x, u.y, redCastle.x, redCastle.y) < 480);
    const army = units.filter((u) => !u.dead && u.team === red && u.role !== 'pawn' && u.task === 'idle');
    if (invaders && army.length > 0) {
      army.forEach((u) => { u.task = 'attackMove'; u.tx = invaders.x; u.ty = invaders.y; });
    } else if (army.length >= (aiDifficulty === 'hard' ? 4 : 6)) {
      const targetCastle = buildings.find((b) => b.team === 'blue' && b.state !== 'destroyed');
      if (targetCastle) {
        army.forEach((u) => {
          u.task = 'attackMove';
          u.tx = targetCastle.x + rand(-60, 60);
          u.ty = targetCastle.y + rand(-60, 60);
        });
      }
    }
  }

  // LAN Snapshot Serialization & Reconstruction (Host -> Guest)
  function buildLanSnapshot() {
    return {
      mt: Math.round(matchTime),
      res: resources,
      st: stats,
      b: buildings.map((x) => [x.id, x.team, x.kind, Math.round(x.x), Math.round(x.y), Math.round(x.hp), x.maxHp, x.state, x.queue, Number(x.trainTimer.toFixed(1))]),
      u: units.map((x) => [x.id, x.team, x.role, Math.round(x.x), Math.round(x.y), Math.round(x.hp), x.maxHp, x.facing, x.anim, x.level, Number(x.skillCd.toFixed(1))]),
      tr: trees.map((x) => [x.id, x.wood]),
      mn: mines.map((x) => [x.id, x.gold]),
      sh: sheep.map((x) => [x.id, Math.round(x.x), Math.round(x.y), x.facing, x.state]),
      md: meatDrops.map((x) => [x.id, Math.round(x.x), Math.round(x.y), x.meat]),
      pr: projectiles.map((x) => [x.team, x.kind, Math.round(x.x), Math.round(x.y), Number(x.angle.toFixed(2))]),
    };
  }

  function applyLanSnapshot(s) {
    matchTime = s.mt;
    resources = s.res;
    stats = s.st;
    buildings = s.b.map((r) => ({
      id: r[0], team: r[1], kind: r[2], x: r[3], y: r[4], hp: r[5], maxHp: r[6], state: r[7],
      queue: r[8], trainTimer: r[9], rallyX: r[3], rallyY: r[4] + 60,
    }));
    units = s.u.map((r) => ({
      id: r[0], team: r[1], role: r[2], x: r[3], y: r[4], hp: r[5], maxHp: r[6], facing: r[7],
      anim: r[8], level: r[9], skillCd: r[10], isHero: !!UNIT_DEFS[r[2]].isHero, animT: worldTime, hurtFlash: 0, dead: false,
    }));
    const treeMap = new Map(s.tr);
    trees.forEach((t) => { if (treeMap.has(t.id)) t.wood = treeMap.get(t.id); });
    const mineMap = new Map(s.mn);
    mines.forEach((m) => { if (mineMap.has(m.id)) m.gold = mineMap.get(m.id); });
    sheep = s.sh.map((r) => ({ id: r[0], x: r[1], y: r[2], facing: r[3], state: r[4], meat: 45, animT: worldTime }));
    meatDrops = s.md.map((r) => ({ id: r[0], x: r[1], y: r[2], meat: r[3], t: worldTime }));
    projectiles = s.pr.map((r) => ({ team: r[0], kind: r[1], x: r[2], y: r[3], angle: r[4], animT: worldTime }));

    // Check victory/defeat on Guest
    const blueC = buildings.filter((x) => x.team === 'blue' && x.kind === 'castle' && x.state !== 'destroyed').length;
    const redC = buildings.filter((x) => x.team === 'red' && x.kind === 'castle' && x.state !== 'destroyed').length;
    if (blueC === 0 || redC === 0) endMatch(redC === 0 ? 'blue' : 'red');
  }

  // Rendering World
  function drawTerrain() {
    if (images.waterBg) {
      ctx.fillStyle = ctx.createPattern(images.waterBg, 'repeat');
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = '#47a9b8';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // Water foam along island edges & central river
    if (images.waterFoam) {
      const fFr = Math.floor(worldTime * 7) % 16;
      const sx = fFr * 192;
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx += 2) {
        if (!RIVER_COLS.includes(gx)) {
          ctx.drawImage(images.waterFoam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y1 - 1) * TILE - 20, 192, 192);
          ctx.drawImage(images.waterFoam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y2 + 1) * TILE - 20, 192, 192);
        }
      }
    }

    const tm = images.tilemap;
    if (tm) {
      // Southern stone cliffs on both halves
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
        if (RIVER_COLS.includes(gx)) continue;
        const col = gx === ISLAND.x1 || gx === 24 ? 5 : (gx === ISLAND.x2 || gx === 20 ? 7 : 6);
        ctx.drawImage(tm, col * TILE, 4 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 1) * TILE, TILE, TILE);
        ctx.drawImage(tm, col * TILE, 5 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 2) * TILE, TILE, TILE);
      }
      // Grass island (left & right landmasses)
      for (let gy = ISLAND.y1; gy <= ISLAND.y2; gy++) {
        for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
          if (RIVER_COLS.includes(gx)) continue;
          const col = (gx === ISLAND.x1 || gx === 24) ? 0 : (gx === ISLAND.x2 || gx === 20) ? 2 : 1;
          const row = gy === ISLAND.y1 ? 0 : gy === ISLAND.y2 ? 2 : 1;
          ctx.drawImage(tm, col * TILE, row * TILE, TILE, TILE, gx * TILE, gy * TILE, TILE, TILE);
        }
      }
    }

    // Center Gold Mine island patch at bridge middle
    if (images.tilemapSand) {
      for (let gy = 13; gy <= 15; gy++) {
        for (let gx = 21; gx <= 23; gx++) {
          const col = gx === 21 ? 0 : gx === 23 ? 2 : 1;
          const row = gy === 13 ? 0 : gy === 15 ? 2 : 1;
          ctx.drawImage(images.tilemapSand, col * TILE, row * TILE, TILE, TILE, gx * TILE, gy * TILE, TILE, TILE);
        }
      }
    }

    // Scenic Dirt Roads connecting bases across bridges
    ctx.fillStyle = 'rgba(170, 134, 82, 0.36)';
    ctx.beginPath();
    ctx.roundRect(8 * TILE, 8 * TILE, 30 * TILE, 1.3 * TILE, 26);
    ctx.roundRect(8 * TILE, 20 * TILE, 30 * TILE, 1.3 * TILE, 26);
    ctx.roundRect(8 * TILE, 8 * TILE, 1.4 * TILE, 14 * TILE, 26);
    ctx.roundRect(36 * TILE, 8 * TILE, 1.4 * TILE, 14 * TILE, 26);
    ctx.fill();

    // Two Wooden Bridges across central river
    if (images.bridge) {
      for (const br of BRIDGES) {
        for (let gy = br.y1; gy <= br.y2; gy++) {
          ctx.drawImage(images.bridge, 0, 0, 64, 64, 21 * TILE, gy * TILE, TILE, TILE);
          ctx.drawImage(images.bridge, 64, 0, 64, 64, 22 * TILE, gy * TILE, TILE, TILE);
          ctx.drawImage(images.bridge, 128, 0, 64, 64, 23 * TILE, gy * TILE, TILE, TILE);
        }
      }
    }

    // Dropped Meat Pickups (M_Spawn / M_Idle)
    for (const m of meatDrops) {
      if (m.meat <= 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (m.t < 0.65 && images.meatSpawn) {
        const fr = Math.min(6, Math.floor(m.t * 11));
        ctx.drawImage(images.meatSpawn, fr * 128, 0, 128, 128, m.x - 36, m.y - 44, 72, 72);
      } else if (images.meatIdle) {
        const bob = Math.sin(worldTime * 4 + m.id) * 2.5;
        ctx.drawImage(images.meatIdle, m.x - 32, m.y - 38 + bob, 64, 64);
      }
    }

    // Move / Attack-Move Target Markers (Pointers/01.png)
    for (const mk of moveMarkers) {
      ctx.save();
      ctx.globalAlpha = clamp(mk.life / mk.maxLife, 0, 1);
      ctx.strokeStyle = mk.kind === 'attackMove' ? '#ff6b6b' : '#63e678';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(mk.x, mk.y, 18 * (1.2 - mk.life * 0.4), 8 * (1.2 - mk.life * 0.4), 0, 0, Math.PI * 2); ctx.stroke();
      if (images.ptrArrow) {
        const bob = Math.sin(worldTime * 14) * 4;
        ctx.drawImage(images.ptrArrow, mk.x - 16, mk.y - 34 + bob, 32, 32);
      }
      ctx.restore();
    }
  }

  function drawRenderables() {
    const list = [];

    // Gold Mines & Gold Stones
    for (const m of mines) {
      list.push({
        y: m.y + 8,
        draw: () => {
          if (m.kind === 'mine') {
            const img = m.gold > 0 ? images.goldMine : images.goldMineDead;
            if (img) ctx.drawImage(img, m.x - 96, m.y - 84, 192, 128);
          } else if (m.gold > 0 && images.goldStone) {
            ctx.drawImage(images.goldStone, m.x - 52, m.y - 64, 104, 104);
          }
        },
      });
    }

    // Trees / Stumps
    for (const t of trees) {
      list.push({
        y: t.y + 10,
        draw: () => {
          if (t.wood <= 0) {
            if (images.stump) ctx.drawImage(images.stump, t.x - 72, t.y - 144, 144, 192);
          } else {
            const img = t.kind === 1 ? images.tree1 : images.tree2;
            if (img) {
              const fr = Math.floor((worldTime + t.phase) * 5) % 8;
              ctx.drawImage(img, fr * 192, 0, 192, img.height, t.x - 84, t.y - img.height * 0.72, 168, img.height * 0.86);
            }
          }
        },
      });
    }

    // Sheep
    for (const s of sheep) {
      list.push({
        y: s.y,
        draw: () => {
          const img = s.state === 'move' ? images.sheepMove : images.sheepIdle;
          if (!img) return;
          const frames = Math.round(img.width / 128);
          const fr = Math.floor(s.animT * 6) % frames;
          ctx.save();
          ctx.translate(s.x, s.y - 20);
          ctx.scale(s.facing, 1);
          ctx.drawImage(img, fr * 128, 0, 128, 128, -38, -38, 76, 76);
          ctx.restore();
        },
      });
    }

    // Buildings (Construction -> Active -> Burning Fire.png -> Destroyed Rubble)
    for (const b of buildings) {
      list.push({
        y: b.y + 24,
        draw: () => {
          const def = BUILDING_DEFS[b.kind];
          let img;
          if (b.state === 'building') img = images[`${b.kind}_con`];
          else if (b.state === 'destroyed') img = images[`${b.kind}_des`];
          else img = images[`${b.team}_${b.kind}`];

          if (img) {
            ctx.drawImage(img, b.x - def.w * 0.5, b.y - def.h * 0.74, def.w, def.h);
          }

          // Burning Fire.png animation when damaged!
          if (b.state === 'active' && b.hp < b.maxHp * 0.65 && images.fire) {
            const fireCount = b.hp < b.maxHp * 0.35 ? 3 : 1;
            const offsets = [[0, -def.h * 0.38], [-def.w * 0.24, -def.h * 0.25], [def.w * 0.24, -def.h * 0.28]];
            for (let i = 0; i < fireCount; i++) {
              const fFr = Math.floor((worldTime * 11 + i * 2) % 7);
              const fw = Math.round(images.fire.width / 7);
              ctx.drawImage(images.fire, fFr * fw, 0, fw, images.fire.height,
                b.x + offsets[i][0] - 32, b.y + offsets[i][1] - 42, 64, 64);
            }
          }

          // Selection ring & Rally flag
          if (b.id === selectedBuildingId) {
            ctx.strokeStyle = '#63e678';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(b.x, b.y + 18, def.rad + 8, def.rad * 0.44, 0, 0, Math.PI * 2); ctx.stroke();
            if (b.state === 'active' && def.trains.length > 0) {
              ctx.setLineDash([6, 6]);
              ctx.strokeStyle = '#ffe66d';
              ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.rallyX, b.rallyY); ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = '#ffe66d';
              ctx.beginPath(); ctx.arc(b.rallyX, b.rallyY, 6, 0, Math.PI * 2); ctx.fill();
            }
          }

          // HP bar & construction/training progress
          if (b.state !== 'destroyed' && (b.hp < b.maxHp || b.id === selectedBuildingId || b.state === 'building')) {
            const bw = Math.min(110, def.w * 0.72);
            const bx = b.x - bw * 0.5;
            const by = b.y - def.h * 0.78;
            ctx.fillStyle = '#161c2e';
            ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
            ctx.fillStyle = b.state === 'building' ? '#f5c542' : (b.team === 'blue' ? '#5ca9ff' : '#ff6b6b');
            ctx.fillRect(bx, by, bw * clamp(b.hp / b.maxHp, 0, 1), 5);
          }
        },
      });
    }

    // Units & 4 Heroes
    for (const u of units) {
      if (u.dead) continue;
      list.push({
        y: u.y,
        draw: () => {
          const def = UNIT_DEFS[u.role];
          let animKey = u.anim;
          if (u.role === 'pawn') {
            if (u.anim === 'run_wood') animKey = 'run_wood';
            else if (u.anim === 'run_gold') animKey = 'run_gold';
            else if (u.anim === 'run_meat') animKey = 'run_meat';
            else if (['axe', 'pick', 'hammer', 'knife'].includes(u.anim)) animKey = u.anim;
            else animKey = u.anim === 'run' ? 'run' : 'idle';
          }
          const img = images[`${u.team}_${u.role}_${animKey}`] || images[`${u.team}_${u.role}_idle`];
          if (!img) return;

          const fw = def.fw;
          const fh = img.height;
          const frames = Math.max(1, Math.round(img.width / fw));
          const fps = u.anim === 'atk' ? 10 : u.anim.startsWith('run') ? 9.5 : 7;
          const fr = Math.floor(u.animT * fps) % frames;
          const dw = fw * def.scale;
          const dh = fh * def.scale;

          // Hero Golden Aura
          if (u.isHero) {
            ctx.strokeStyle = '#ffdc00';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(u.x, u.y + 8, 28, 11, 0, 0, Math.PI * 2); ctx.stroke();
          }

          // Warcraft Selection Circle + Pointers/02 brackets!
          if (selectedUnitIds.has(u.id)) {
            ctx.strokeStyle = u.team === myTeam ? '#54f085' : '#ff6b6b';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(u.x, u.y + 8, u.isHero ? 32 : 23, u.isHero ? 13 : 9, 0, 0, Math.PI * 2); ctx.stroke();
            if (images.ptrBox) ctx.drawImage(images.ptrBox, u.x - 24, u.y - 36, 48, 48);
          }

          ctx.save();
          ctx.translate(u.x, u.y - dh * (u.role === 'knight' ? 0.28 : 0.30));
          ctx.scale(u.facing, 1);
          if (u.hurtFlash > 0) ctx.filter = 'brightness(1.8)';
          ctx.drawImage(img, fr * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
          ctx.restore();

          if (u.hp < u.maxHp || selectedUnitIds.has(u.id) || u.isHero) {
            const bw = u.isHero ? 56 : 36;
            const bx = u.x - bw * 0.5;
            const by = u.y - (u.role === 'knight' ? 88 : u.isHero ? 64 : 50);
            ctx.fillStyle = '#161c2e';
            ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
            ctx.fillStyle = u.isHero ? '#ffdc00' : (u.team === 'blue' ? '#5ca9ff' : '#ff6b6b');
            ctx.fillRect(bx, by, bw * clamp(u.hp / u.maxHp, 0, 1), 4);
          }
        },
      });
    }

    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();
  }

  function renderWorld() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#234d5b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    let sx = 0, sy = 0;
    if (shakeTime > 0) { sx = rand(-shakeMag, shakeMag); sy = rand(-shakeMag, shakeMag); }
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x + sx, -cam.y + sy);

    drawTerrain();
    drawRenderables();

    // Building Placement Ghost Preview
    if (buildGhost) {
      const def = BUILDING_DEFS[buildGhost];
      const ok = canPlaceBuildingAt(buildGhost, mouse.wx, mouse.wy);
      const gImg = images[`${myTeam}_${buildGhost}`];
      ctx.save();
      ctx.globalAlpha = 0.65;
      if (gImg) ctx.drawImage(gImg, mouse.wx - def.w * 0.5, mouse.wy - def.h * 0.74, def.w, def.h);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = ok ? '#4ee476' : '#ff5555';
      ctx.beginPath(); ctx.ellipse(mouse.wx, mouse.wy + 12, def.rad, def.rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      canvas.className = ok ? 'cursor-build' : 'cursor-invalid';
    } else if (attackMoveMode) {
      canvas.className = 'cursor-attack';
    } else {
      canvas.className = '';
    }

    // Projectiles
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.kind === 'arrow') {
        const im = images[`${p.team}_arrow`];
        if (im) ctx.drawImage(im, -20, -20, 40, 40);
      } else {
        const im = images[`${p.team}_mage_orb`];
        if (im) {
          const fr = Math.floor(p.animT * 14) % 4;
          ctx.drawImage(im, fr * 64, 0, 64, 64, -24, -24, 48, 48);
        }
      }
      ctx.restore();
    }

    // Particles (supports single-row and multi-row sprite strips like Dead.png)
    for (const fx of fxList) {
      const img = images[fx.key];
      if (!img) continue;
      const fr = Math.min(fx.frames - 1, Math.floor(fx.t * fx.fps));
      const cols = fx.cols || fx.frames;
      const col = fr % cols;
      const row = Math.floor(fr / cols);
      const dw = fx.frameW * fx.scale;
      const dh = fx.frameH * fx.scale;
      ctx.drawImage(img, col * fx.frameW, row * fx.frameH, fx.frameW, fx.frameH, fx.x - dw * 0.5, fx.y - dh * 0.5, dw, dh);
    }

    // Floating feedback
    ctx.textAlign = 'center';
    ctx.font = '800 17px system-ui, sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Drag Marquee Selection Box (screen space)
    if (mouse.dragging) {
      const rx = Math.min(mouse.dragStartX, mouse.sx);
      const ry = Math.min(mouse.dragStartY, mouse.sy);
      const rw = Math.abs(mouse.sx - mouse.dragStartX);
      const rh = Math.abs(mouse.sy - mouse.dragStartY);
      ctx.fillStyle = 'rgba(84, 240, 133, 0.16)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#63e678';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
    }
  }

  function renderMinimap() {
    const mw = miniCanvas.width;
    const mh = miniCanvas.height;
    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;

    mctx.fillStyle = '#367e91';
    mctx.fillRect(0, 0, mw, mh);

    // Grass landmasses
    mctx.fillStyle = '#6fa352';
    mctx.fillRect(ISLAND.x1 * TILE * sx, ISLAND.y1 * TILE * sy, (21 - ISLAND.x1) * TILE * sx, (ISLAND.y2 - ISLAND.y1 + 1) * TILE * sy);
    mctx.fillRect(24 * TILE * sx, ISLAND.y1 * TILE * sy, (ISLAND.x2 - 23) * TILE * sx, (ISLAND.y2 - ISLAND.y1 + 1) * TILE * sy);

    // Bridges & center gold isle
    mctx.fillStyle = '#b88a55';
    for (const br of BRIDGES) {
      mctx.fillRect(21 * TILE * sx, br.y1 * TILE * sy, 3 * TILE * sx, (br.y2 - br.y1 + 1) * TILE * sy);
    }
    mctx.fillStyle = '#d4bd74';
    mctx.fillRect(21 * TILE * sx, 13 * TILE * sy, 3 * TILE * sx, 3 * TILE * sy);

    // Trees & Gold Mines
    mctx.fillStyle = '#2e6338';
    for (const t of trees) if (t.wood > 0) mctx.fillRect(t.x * sx - 2, t.y * sy - 2, 4, 4);
    mctx.fillStyle = '#ffdc00';
    for (const m of mines) if (m.gold > 0) mctx.fillRect(m.x * sx - 3, m.y * sy - 3, 6, 6);

    // Meat drops
    mctx.fillStyle = '#ff98a4';
    for (const d of meatDrops) if (d.meat > 0) mctx.fillRect(d.x * sx - 1.5, d.y * sy - 1.5, 3, 3);

    // Buildings
    for (const b of buildings) {
      if (b.state === 'destroyed') continue;
      mctx.fillStyle = b.team === 'blue' ? '#5ca9ff' : '#ff5c5c';
      const sz = b.kind === 'castle' ? 8 : 5;
      mctx.fillRect(b.x * sx - sz * 0.5, b.y * sy - sz * 0.5, sz, sz);
    }

    // Units & Heroes
    for (const u of units) {
      if (u.dead) continue;
      mctx.fillStyle = u.isHero ? '#ffdc00' : (u.team === 'blue' ? '#8ce8ff' : '#ff8c8c');
      const sz = u.isHero ? 4 : 2.5;
      mctx.fillRect(u.x * sx - sz * 0.5, u.y * sy - sz * 0.5, sz, sz);
    }

    // Attack alerts pulsing rings
    for (const a of minimapAlerts) {
      mctx.strokeStyle = '#ff3838';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.arc(a.x * sx, a.y * sy, 7 + Math.sin(worldTime * 16) * 3, 0, Math.PI * 2);
      mctx.stroke();
    }

    // Camera viewport box
    const vw = (canvas.width / cam.zoom) * sx;
    const vh = (canvas.height / cam.zoom) * sy;
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(cam.x * sx, cam.y * sy, vw, vh);
  }

  // HUD & Sidebar Synchronization
  function updateFactionTheme() {
    const isRed = myTeam === 'red';
    ui.factionLabel.textContent = isRed ? 'RED EMPIRE' : 'BLUE KINGDOM';
    ui.factionRibbon.classList.toggle('red', isRed);
    ui.sidebar.classList.toggle('red-theme', isRed);
    ui.modeBadge.textContent = netRole === 'solo' ? 'SOLO vs AI' : `LAN (${netRole.toUpperCase()})`;
  }

  function buildSidebarProductionGrid() {
    prodGrid.innerHTML = '';
    const r = resources[myTeam];
    const activeBuildings = new Set(buildings.filter((b) => b.team === myTeam && b.state === 'active').map((b) => b.kind));

    if (activeTab === 'build') {
      BUILDING_ORDER.forEach((kind) => {
        const def = BUILDING_DEFS[kind];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prod-card' + (buildGhost === kind ? ' active-build' : '');
        btn.disabled = !canAfford(myTeam, 0, def.wood, 0) || !canAfford(myTeam, def.gold, 0, 0);
        btn.innerHTML = `
          <img src="${PORTRAIT_URL[kind]}" alt="${def.name}">
          <span class="prod-title">${def.name}</span>
          <span class="prod-costs">🪙${def.gold} 🪵${def.wood}</span>
          <span class="prod-note">${def.note}</span>
        `;
        btn.addEventListener('click', () => {
          buildGhost = buildGhost === kind ? null : kind;
          attackMoveMode = false;
          ui.cancelBuildBtn.classList.toggle('hidden', !buildGhost);
          buildSidebarProductionGrid();
        });
        prodGrid.appendChild(btn);
      });
    } else {
      const list = activeTab === 'units' ? REGULAR_UNITS : HERO_UNITS;
      const sup = getSupply(myTeam);
      list.forEach((role) => {
        const def = UNIT_DEFS[role];
        const hasBldg = activeBuildings.has(def.building);
        const queued = buildings.filter((b) => b.team === myTeam && b.state === 'active')
          .reduce((acc, b) => acc + b.queue.filter((q) => q === role).length, 0);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prod-card';
        btn.disabled = !hasBldg || !canAfford(myTeam, def.gold, def.wood, def.meat) || (sup.used + def.pop > sup.cap);
        btn.innerHTML = `
          ${queued > 0 ? `<span class="queue-badge">${queued}</span>` : ''}
          <img src="${PORTRAIT_URL[role]}" alt="${def.name}">
          <span class="prod-title">${def.name}</span>
          <span class="prod-costs">🪙${def.gold} 🪵${def.wood} 🥩${def.meat}</span>
          <span class="prod-note">${hasBldg ? def.note : `Butuh ${BUILDING_DEFS[def.building].name}`}</span>
        `;
        btn.addEventListener('click', () => {
          sendOrApplyCommand({ kind: 'train', role, buildingId: selectedBuildingId });
          syncHUD(true);
        });
        prodGrid.appendChild(btn);
      });
    }
  }

  function syncSelectionPanel() {
    // Prune dead selections
    for (const id of Array.from(selectedUnitIds)) {
      if (!units.some((u) => u.id === id && !u.dead)) selectedUnitIds.delete(id);
    }

    const selUnits = units.filter((u) => selectedUnitIds.has(u.id));
    if (selUnits.length > 0) {
      const lead = selUnits[0];
      const def = UNIT_DEFS[lead.role];
      ui.selPortrait.src = PORTRAIT_URL[lead.role];
      ui.selTitle.textContent = selUnits.length > 1 ? `${selUnits.length} Pasukan Terpilih` : def.name;
      ui.selHpFill.style.width = `${clamp((lead.hp / lead.maxHp) * 100, 0, 100)}%`;
      ui.selHpText.textContent = `${Math.ceil(lead.hp)} / ${lead.maxHp}`;
      ui.selSub.textContent = lead.isHero ? `ATK ${lead.dmg} • ${def.skillName}` : def.note;
      ui.selLvl.textContent = `Lv ${lead.level}`;
      ui.selLvl.classList.toggle('hidden', !lead.isHero);

      const hero = selUnits.find((u) => u.isHero && u.team === myTeam);
      ui.cmdSkill.disabled = !hero || hero.skillCd > 0;
      ui.cmdSkillLabel.textContent = hero
        ? (hero.skillCd > 0 ? `${Math.ceil(hero.skillCd)}s` : UNIT_DEFS[hero.role].skillName)
        : 'Skill';

      selGrid.innerHTML = '';
      selUnits.slice(0, 18).forEach((u) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sel-unit-chip';
        chip.title = `${UNIT_DEFS[u.role].name} (Klik untuk fokus unit ini)`;
        chip.innerHTML = `
          <img src="${PORTRAIT_URL[u.role]}" alt="">
          <div class="mini-hp"><div style="width:${clamp((u.hp / u.maxHp) * 100, 0, 100)}%"></div></div>
        `;
        chip.addEventListener('click', () => {
          selectedUnitIds = new Set([u.id]);
          selectedBuildingId = null;
          syncHUD(true);
        });
        selGrid.appendChild(chip);
      });
      return;
    }

    const sb = buildings.find((b) => b.id === selectedBuildingId && b.state !== 'destroyed');
    if (sb) {
      const def = BUILDING_DEFS[sb.kind];
      ui.selPortrait.src = PORTRAIT_URL[sb.kind];
      ui.selTitle.textContent = def.name;
      ui.selHpFill.style.width = `${clamp((sb.hp / sb.maxHp) * 100, 0, 100)}%`;
      ui.selHpText.textContent = `${Math.ceil(sb.hp)} / ${sb.maxHp}`;
      ui.selSub.textContent = sb.state === 'building' ? 'Sedang dibangun...' : (sb.queue.length ? `Melatih: ${UNIT_DEFS[sb.queue[0]].name}` : def.note);
      ui.selLvl.classList.add('hidden');
      ui.cmdSkill.disabled = true;
      ui.cmdSkillLabel.textContent = 'Skill';

      selGrid.innerHTML = sb.queue.length
        ? sb.queue.map((r) => `<div class="sel-unit-chip"><img src="${PORTRAIT_URL[r]}" alt=""></div>`).join('')
        : `<div class="sel-empty-hint">${def.trains.length ? 'Klik kanan di medan untuk atur Rally Point, atau pilih unit di panel kanan.' : def.note}</div>`;
      return;
    }

    ui.selPortrait.src = PORTRAIT_URL.castle;
    ui.selTitle.textContent = myTeam === 'red' ? 'Red Empire' : 'Blue Kingdom';
    ui.selHpFill.style.width = '100%';
    ui.selHpText.textContent = 'Siap Tempur';
    ui.selSub.textContent = 'Pilih pasukan atau bangunan';
    ui.selLvl.classList.add('hidden');
    ui.cmdSkill.disabled = true;
    ui.cmdSkillLabel.textContent = 'Skill';
    selGrid.innerHTML = `<div class="sel-empty-hint">Tarik kotak klik-kiri untuk pilih banyak pasukan • Klik ganda unit untuk pilih semua tipe sejenis • Klik filter di atas untuk gerakan cepat per divisi!</div>`;
  }

  function syncHUD(forceRebuildGrid = false) {
    const mins = Math.floor(matchTime / 60);
    const secs = Math.floor(matchTime % 60);
    ui.matchTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const r = resources[myTeam];
    const sup = getSupply(myTeam);
    ui.resGold.textContent = r.gold;
    ui.resWood.textContent = r.wood;
    ui.resMeat.textContent = r.meat;
    ui.resPop.textContent = `${sup.used}/${sup.cap}`;

    // Update army & filter counts
    const mine = units.filter((u) => !u.dead && u.team === myTeam);
    const cnt = { warrior: 0, archer: 0, lancer: 0, caster: 0, hero: 0, pawn: 0, idlePawn: 0, army: 0 };
    for (const u of mine) {
      const cat = UNIT_DEFS[u.role].cat;
      cnt[cat]++;
      if (cat !== 'pawn') cnt.army++;
      else if (u.task === 'idle') cnt.idlePawn++;
    }
    ui.armyBadge.textContent = cnt.army;
    ui.idlePawnBadge.textContent = cnt.idlePawn;
    document.getElementById('cnt-warrior').textContent = cnt.warrior;
    document.getElementById('cnt-archer').textContent = cnt.archer;
    document.getElementById('cnt-lancer').textContent = cnt.lancer;
    document.getElementById('cnt-caster').textContent = cnt.caster;
    document.getElementById('cnt-hero').textContent = cnt.hero;
    document.getElementById('cnt-pawn').textContent = cnt.pawn;

    ui.cmdAttackMove.classList.toggle('active', attackMoveMode);
    ui.cancelBuildBtn.classList.toggle('hidden', !buildGhost);

    syncSelectionPanel();
    if (forceRebuildGrid) buildSidebarProductionGrid();
  }

  // Warcraft Selection Helpers (All Army, Filter by Type, Double-Click!)
  function selectByFilter(filter) {
    const mine = units.filter((u) => !u.dead && u.team === myTeam);
    // If multiple mixed combat units are already selected, narrowing by a combat filter filters the current selection (or selects all of that type if none in selection)!
    const curSel = mine.filter((u) => selectedUnitIds.has(u.id));
    let next = [];
    if (filter === 'all_army') {
      next = mine.filter((u) => u.role !== 'pawn');
    } else if (filter === 'idle_pawn') {
      next = mine.filter((u) => u.role === 'pawn' && u.task === 'idle');
      if (next.length === 0) next = mine.filter((u) => u.role === 'pawn');
    } else {
      const inCur = curSel.length > 1 ? curSel.filter((u) => UNIT_DEFS[u.role].cat === filter) : [];
      next = (inCur.length > 0 && inCur.length < curSel.length)
        ? inCur
        : mine.filter((u) => UNIT_DEFS[u.role].cat === filter);
    }

    selectedUnitIds = new Set(next.map((u) => u.id));
    selectedBuildingId = null;
    if (next.length > 0) sfx.play('order');
    syncHUD(true);
  }

  // Main Animation Loop
  function update(dt) {
    worldTime += dt;
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) alertToast.classList.remove('show');
    }
    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      if (shakeTime === 0) shakeMag = 0;
    }

    if (gameState !== 'playing') return;

    // Camera Panning via WASD / Arrow Keys
    let cx = 0, cy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) cy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) cy += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) cx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) cx += 1;
    if (cx !== 0 || cy !== 0) {
      const vw = canvas.width / cam.zoom;
      const vh = canvas.height / cam.zoom;
      cam.x = clamp(cam.x + cx * 720 * dt, 0, Math.max(0, WORLD_W - vw));
      cam.y = clamp(cam.y + cy * 720 * dt, 0, Math.max(0, WORLD_H - vh));
    }

    // FX, Markers, Floats, Alerts
    for (const fx of fxList) fx.t += dt;
    fxList = fxList.filter((fx) => fx.t < fx.frames / fx.fps);
    for (const mk of moveMarkers) mk.life -= dt;
    moveMarkers = moveMarkers.filter((mk) => mk.life > 0);
    for (const f of floats) { f.y -= 32 * dt; f.life -= dt; }
    floats = floats.filter((f) => f.life > 0);
    for (const a of minimapAlerts) a.life -= dt;
    minimapAlerts = minimapAlerts.filter((a) => a.life > 0);

    // Authoritative simulation on Solo / Host
    if (netRole !== 'guest') {
      updateSimulation(dt);
      if (netRole === 'host') {
        syncTimer += dt;
        if (syncTimer >= 0.066) {
          syncTimer = 0;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'state_sync', state: buildLanSnapshot() }));
          }
        }
      }
    }

    if (worldTime - lastHudSync > 0.25) {
      lastHudSync = worldTime;
      syncHUD(true);
    }
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    if (gameState === 'playing' || gameState === 'over') {
      renderWorld();
      renderMinimap();
    }
    requestAnimationFrame(frame);
  }

  // LAN WebSocket Connection & Lobby Logic (math-strike style)
  function initLAN() {
    fetch('/alamat')
      .then((r) => r.json())
      .then((d) => {
        lanInfo = d;
        ui.lanUrlText.textContent = d.url || window.location.origin;
      })
      .catch(() => { ui.lanUrlText.textContent = window.location.origin; });

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${window.location.host}/ws`);

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      if (msg.type === 'welcome' || msg.type === 'rooms_update') {
        renderRoomList(msg.rooms || []);
      } else if (msg.type === 'room_joined') {
        netRole = msg.role;
        myTeam = msg.team;
        ui.lanLobbyControls.classList.add('hidden');
        ui.lanWaitingBox.classList.remove('hidden');
        ui.waitingCode.textContent = msg.code;
        ui.waitHostName.textContent = msg.room.hostName;
        ui.waitGuestName.textContent = msg.room.guestName || 'Menunggu Pemain 2 bergabung...';
        ui.btnLaunchLan.disabled = !(netRole === 'host' && msg.room.guestName);
      } else if (msg.type === 'room_ready') {
        ui.waitHostName.textContent = msg.room.hostName;
        ui.waitGuestName.textContent = msg.room.guestName;
        ui.btnLaunchLan.disabled = netRole !== 'host';
        sfx.play('hero');
      } else if (msg.type === 'opponent_left') {
        showToast(msg.reason || 'Lawan keluar dari room LAN.', 3.0);
        if (gameState === 'playing') {
          openLobby();
        } else if (msg.room) {
          ui.waitGuestName.textContent = 'Menunggu Pemain 2 bergabung...';
          ui.btnLaunchLan.disabled = true;
        } else {
          resetLobbyLanUI();
        }
      } else if (msg.type === 'error_msg') {
        showToast(msg.message, 2.5);
      } else if (msg.type === 'game_start') {
        myTeam = msg.team;
        netRole = myTeam === 'blue' ? 'host' : 'guest';
        lobbyOverlay.classList.add('hidden');
        initWorld();
        gameState = 'playing';
        sfx.play('hero');
        showToast(`⚔ Perang LAN Dimulai (${myTeam === 'blue' ? 'BLUE' : 'RED'})!`, 2.6);
      } else if (msg.type === 'state_sync' && netRole === 'guest') {
        applyLanSnapshot(msg.state);
      } else if (msg.type === 'player_cmd' && netRole === 'host') {
        applyTeamCommand('red', msg.cmd);
      }
    };
  }

  function renderRoomList(list) {
    if (!list || list.length === 0) {
      ui.roomList.textContent = 'Belum ada room LAN aktif. Klik "Buat Room (Host)" untuk memulai!';
      return;
    }
    ui.roomList.innerHTML = '';
    list.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'room-item';
      row.innerHTML = `<span>[${r.code}] <strong>${r.hostName}</strong> (${r.count}/2)</span>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-copy-btn';
      btn.textContent = 'Gabung';
      btn.addEventListener('click', () => {
        ws?.send(JSON.stringify({ type: 'join_room', code: r.code, playerName: ui.inputCmdName.value.trim() || 'Pemain 2' }));
      });
      row.appendChild(btn);
      ui.roomList.appendChild(row);
    });
  }

  function resetLobbyLanUI() {
    netRole = 'solo';
    myTeam = 'blue';
    ui.lanLobbyControls.classList.remove('hidden');
    ui.lanWaitingBox.classList.add('hidden');
  }

  function openLobby() {
    gameState = 'lobby';
    resetLobbyLanUI();
    ws?.send(JSON.stringify({ type: 'leave_room' }));
    ws?.send(JSON.stringify({ type: 'list_rooms' }));
    lobbyOverlay.classList.remove('hidden');
  }

  function openHelpModal() {
    document.getElementById('dlg-ribbon').textContent = 'PANDUAN WARCRAFT RTS';
    document.getElementById('dlg-ribbon').className = 'modal-ribbon';
    document.getElementById('dlg-body').innerHTML = `
      <p><strong>Seleksi Warcraft:</strong> Klik kiri unit, <strong>Drag kotak hijau</strong> untuk memilih banyak pasukan, atau <strong>Klik Ganda</strong> unit untuk memilih semua unit bertipe sama! Pakai tombol filter di atas panel bawah (Pedang, Panah, Tombak, Sihir, Hero) atau <strong>[F2] Semua Pasukan</strong>.</p>
      <p><strong>Perintah Klik Kanan:</strong> Klik kanan tanah = Jalan • Musuh = Serang • Pohon/Gold Mine/Domba/Daging Jatuh = Kumpul Resource • Bangunan Rusak (dengan Pawn) = Perbaiki!</p>
      <p><strong>Resource Daging 🥩:</strong> Didapat dari <strong>Domba Ternak</strong> maupun <strong>Daging yang jatuh setiap kali prajurit musuh ATAU prajurit kita gugur</strong>!</p>
      <p><strong>Hotkey Penting:</strong> <kbd>A</kbd> Serang-Maju • <kbd>Q</kbd> Skill Hero • <kbd>S</kbd> Stop • <kbd>H</kbd> Tahan • <kbd>Ctrl+1..4</kbd> Simpan Grup • <kbd>WASD</kbd>/Minimap Geser Peta.</p>
    `;
    document.getElementById('dlg-actions').innerHTML = `<button id="dlg-close" class="ts-big-btn blue" type="button">Siap Tempur!</button>`;
    document.getElementById('dlg-close').addEventListener('click', () => dialog.close());
    dialog.showModal();
  }

  // Input Event Handlers
  function updateMouseWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    mouse.sx = (clientX - rect.left) * dpr;
    mouse.sy = (clientY - rect.top) * dpr;
    mouse.wx = cam.x + mouse.sx / cam.zoom;
    mouse.wy = cam.y + mouse.sy / cam.zoom;
  }

  canvas.addEventListener('mousemove', (e) => {
    updateMouseWorld(e.clientX, e.clientY);
    if (mouse.downLeft && Math.hypot(mouse.sx - mouse.dragStartX, mouse.sy - mouse.dragStartY) > 10) {
      mouse.dragging = true;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;
    updateMouseWorld(e.clientX, e.clientY);

    if (e.button === 0) {
      if (buildGhost) {
        const pawnIds = Array.from(selectedUnitIds);
        sendOrApplyCommand({ kind: 'build', bKind: buildGhost, x: mouse.wx, y: mouse.wy, pawnIds });
        if (!keys.has('ShiftLeft')) buildGhost = null;
        syncHUD(true);
        return;
      }
      if (attackMoveMode) {
        attackMoveMode = false;
        const ids = Array.from(selectedUnitIds);
        if (ids.length) {
          sendOrApplyCommand({ kind: 'attackMove', ids, x: mouse.wx, y: mouse.wy });
          moveMarkers.push({ x: mouse.wx, y: mouse.wy, kind: 'attackMove', life: 0.7, maxLife: 0.7 });
          sfx.play('order');
        }
        syncHUD();
        return;
      }
      mouse.downLeft = true;
      mouse.dragStartX = mouse.sx;
      mouse.dragStartY = mouse.sy;
      mouse.dragging = false;
    } else if (e.button === 2) {
      if (buildGhost) {
        buildGhost = null; syncHUD(true); return;
      }
      if (attackMoveMode) {
        attackMoveMode = false; syncHUD(); return;
      }
      issueSmartRightClick(mouse.wx, mouse.wy);
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || !mouse.downLeft) return;
    mouse.downLeft = false;
    if (gameState !== 'playing') { mouse.dragging = false; return; }

    if (mouse.dragging) {
      // Marquee Box Selection
      mouse.dragging = false;
      const wx1 = cam.x + Math.min(mouse.dragStartX, mouse.sx) / cam.zoom;
      const wy1 = cam.y + Math.min(mouse.dragStartY, mouse.sy) / cam.zoom;
      const wx2 = cam.x + Math.max(mouse.dragStartX, mouse.sx) / cam.zoom;
      const wy2 = cam.y + Math.max(mouse.dragStartY, mouse.sy) / cam.zoom;

      const caught = units.filter((u) => !u.dead && u.team === myTeam && u.x >= wx1 && u.x <= wx2 && u.y >= wy1 && u.y <= wy2);
      if (caught.length > 0) {
        // Prefer combat units if box caught both army & pawns (classic Warcraft feel), unless Shift held
        const combat = caught.filter((u) => u.role !== 'pawn');
        const chosen = combat.length > 0 ? combat : caught;
        if (!keys.has('ShiftLeft')) selectedUnitIds.clear();
        chosen.forEach((u) => selectedUnitIds.add(u.id));
        selectedBuildingId = null;
        sfx.play('order');
      }
      syncHUD(true);
      return;
    }

    // Single Click OR Double-Click Same Type!
    const clickedUnit = units
      .filter((u) => !u.dead && u.team === myTeam && dist(u.x, u.y - 16, mouse.wx, mouse.wy) < (u.isHero ? 38 : 30))
      .sort((a, b) => dist(a.x, a.y, mouse.wx, mouse.wy) - dist(b.x, b.y, mouse.wx, mouse.wy))[0];

    if (clickedUnit) {
      const now = performance.now();
      if (lastClickUnitId === clickedUnit.id && (now - lastClickTime) < 380) {
        // Double-click -> select ALL units of the SAME type visible on screen!
        const vw = canvas.width / cam.zoom;
        const vh = canvas.height / cam.zoom;
        const same = units.filter((u) =>
          !u.dead && u.team === myTeam && u.role === clickedUnit.role
          && u.x >= cam.x - 40 && u.x <= cam.x + vw + 40 && u.y >= cam.y - 40 && u.y <= cam.y + vh + 40
        );
        selectedUnitIds = new Set(same.map((u) => u.id));
      } else {
        if (!keys.has('ShiftLeft')) selectedUnitIds.clear();
        selectedUnitIds.add(clickedUnit.id);
      }
      lastClickUnitId = clickedUnit.id;
      lastClickTime = now;
      selectedBuildingId = null;
      sfx.play('order');
      syncHUD(true);
      return;
    }

    // Check friendly or enemy building click
    const clickedB = buildings.find((b) => b.state !== 'destroyed' && dist(b.x, b.y - 24, mouse.wx, mouse.wy) < BUILDING_DEFS[b.kind].rad + 14);
    if (clickedB) {
      selectedUnitIds.clear();
      selectedBuildingId = clickedB.id;
      syncHUD(true);
      return;
    }

    if (!keys.has('ShiftLeft')) {
      selectedUnitIds.clear();
      selectedBuildingId = null;
      syncHUD(true);
    }
  });

  function issueSmartRightClick(wx, wy) {
    const ids = Array.from(selectedUnitIds);
    if (ids.length === 0) {
      if (selectedBuildingId) {
        sendOrApplyCommand({ kind: 'rally', buildingId: selectedBuildingId, x: wx, y: wy });
        moveMarkers.push({ x: wx, y: wy, kind: 'move', life: 0.7, maxLife: 0.7 });
        sfx.play('order');
      }
      return;
    }

    // 1. Enemy unit or enemy building -> Attack!
    const foeU = units.find((u) => !u.dead && u.team !== myTeam && dist(u.x, u.y - 16, wx, wy) < 34);
    if (foeU) {
      sendOrApplyCommand({ kind: 'attack', ids, targetId: foeU.id });
      moveMarkers.push({ x: foeU.x, y: foeU.y, kind: 'attackMove', life: 0.65, maxLife: 0.65 });
      sfx.play('order');
      return;
    }
    const foeB = buildings.find((b) => b.team !== myTeam && b.state !== 'destroyed' && dist(b.x, b.y - 20, wx, wy) < BUILDING_DEFS[b.kind].rad + 14);
    if (foeB) {
      sendOrApplyCommand({ kind: 'attack', ids, targetId: foeB.id });
      moveMarkers.push({ x: foeB.x, y: foeB.y, kind: 'attackMove', life: 0.65, maxLife: 0.65 });
      sfx.play('order');
      return;
    }

    // 2. If Pawns selected: Tree, Mine, Meat Drop, Sheep, or Friendly Building (Build/Repair)!
    const hasPawn = ids.some((id) => units.find((u) => u.id === id)?.role === 'pawn');
    if (hasPawn) {
      const frB = buildings.find((b) => b.team === myTeam && (b.state === 'building' || (b.state === 'active' && b.hp < b.maxHp))
        && dist(b.x, b.y - 20, wx, wy) < BUILDING_DEFS[b.kind].rad + 14);
      if (frB) {
        if (frB.state === 'building') {
          ids.forEach((id) => { const u = units.find((x) => x.id === id); if (u?.role === 'pawn') { u.task = 'build'; u.targetId = frB.id; } });
          if (netRole === 'guest') sendOrApplyCommand({ kind: 'repair', ids, buildingId: frB.id });
        } else {
          sendOrApplyCommand({ kind: 'repair', ids, buildingId: frB.id });
        }
        sfx.play('build');
        return;
      }

      const md = meatDrops.find((m) => m.meat > 0 && dist(m.x, m.y, wx, wy) < 38);
      if (md) { sendOrApplyCommand({ kind: 'gather', ids, gatherTask: 'gather_meat', targetId: md.id }); sfx.play('order'); return; }

      const sh = sheep.find((s) => s.meat > 0 && dist(s.x, s.y - 12, wx, wy) < 38);
      if (sh) { sendOrApplyCommand({ kind: 'gather', ids, gatherTask: 'gather_meat', targetId: sh.id }); sfx.play('order'); return; }

      const mn = mines.find((m) => m.gold > 0 && dist(m.x, m.y - 16, wx, wy) < (m.kind === 'mine' ? 76 : 48));
      if (mn) { sendOrApplyCommand({ kind: 'gather', ids, gatherTask: 'gather_mine', targetId: mn.id }); sfx.play('order'); return; }

      const tr = trees.find((t) => t.wood > 0 && dist(t.x, t.y - 26, wx, wy) < 54);
      if (tr) { sendOrApplyCommand({ kind: 'gather', ids, gatherTask: 'gather_tree', targetId: tr.id }); sfx.play('order'); return; }
    }

    // 3. Standard Ground Move
    sendOrApplyCommand({ kind: 'move', ids, x: wx, y: wy });
    moveMarkers.push({ x: wx, y: wy, kind: 'move', life: 0.7, maxLife: 0.7 });
    sfx.play('order');
  }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Interactive Minimap (Left-click pan, Right-click rally/move!)
  let miniDown = false;
  function miniToWorld(e) {
    const r = miniCanvas.getBoundingClientRect();
    const wx = clamp(((e.clientX - r.left) / r.width) * WORLD_W, 0, WORLD_W);
    const wy = clamp(((e.clientY - r.top) / r.height) * WORLD_H, 0, WORLD_H);
    return { wx, wy };
  }
  miniCanvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;
    const { wx, wy } = miniToWorld(e);
    if (e.button === 0) {
      miniDown = true;
      const vw = canvas.width / cam.zoom;
      const vh = canvas.height / cam.zoom;
      cam.x = clamp(wx - vw * 0.5, 0, Math.max(0, WORLD_W - vw));
      cam.y = clamp(wy - vh * 0.5, 0, Math.max(0, WORLD_H - vh));
    } else if (e.button === 2) {
      const ids = Array.from(selectedUnitIds);
      if (ids.length) {
        sendOrApplyCommand({ kind: 'attackMove', ids, x: wx, y: wy });
        moveMarkers.push({ x: wx, y: wy, kind: 'attackMove', life: 0.8, maxLife: 0.8 });
        sfx.play('order');
      }
    }
  });
  miniCanvas.addEventListener('mousemove', (e) => {
    if (!miniDown) return;
    const { wx, wy } = miniToWorld(e);
    const vw = canvas.width / cam.zoom;
    const vh = canvas.height / cam.zoom;
    cam.x = clamp(wx - vw * 0.5, 0, Math.max(0, WORLD_W - vw));
    cam.y = clamp(wy - vh * 0.5, 0, Math.max(0, WORLD_H - vh));
  });
  window.addEventListener('mouseup', () => { miniDown = false; });
  miniCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard Shortcuts (Warcraft Hotkeys)
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F1', 'F2'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat || gameState !== 'playing') return;

    if (e.code === 'Escape') { buildGhost = null; attackMoveMode = false; syncHUD(true); }
    else if (e.code === 'F2') selectByFilter('all_army');
    else if (e.code === 'F1') selectByFilter('idle_pawn');
    else if (e.code === 'Home') focusCameraOnTeam(myTeam);
    else if (e.code === 'KeyA') { if (selectedUnitIds.size) { attackMoveMode = !attackMoveMode; syncHUD(); } }
    else if (e.code === 'KeyS') sendOrApplyCommand({ kind: 'stop', ids: Array.from(selectedUnitIds) });
    else if (e.code === 'KeyH') sendOrApplyCommand({ kind: 'hold', ids: Array.from(selectedUnitIds) });
    else if (e.code === 'KeyQ') sendOrApplyCommand({ kind: 'heroSkill', ids: Array.from(selectedUnitIds) });
    else if (e.code === 'KeyM') toggleSound();
    else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      const g = Number(e.code.replace('Digit', ''));
      if (e.ctrlKey) {
        controlGroups[g] = Array.from(selectedUnitIds);
        showToast(`Grup [${g}] disimpan (${controlGroups[g].length} unit)`, 1.2);
      } else {
        const alive = (controlGroups[g] || []).filter((id) => units.some((u) => u.id === id && !u.dead));
        if (alive.length) { selectedUnitIds = new Set(alive); selectedBuildingId = null; syncHUD(true); }
      }
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  // UI Button Bindings
  document.querySelectorAll('.prod-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.prod-tab').forEach((b) => b.classList.toggle('active', b === btn));
      buildSidebarProductionGrid();
    });
  });

  document.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => selectByFilter(btn.dataset.filter));
  });

  document.getElementById('btn-all-army-top').addEventListener('click', () => selectByFilter('all_army'));
  document.getElementById('btn-idle-pawn').addEventListener('click', () => selectByFilter('idle_pawn'));
  document.getElementById('btn-home').addEventListener('click', () => focusCameraOnTeam(myTeam));
  document.getElementById('btn-help').addEventListener('click', openHelpModal);
  document.getElementById('btn-lobby').addEventListener('click', openLobby);
  ui.cancelBuildBtn.addEventListener('click', () => { buildGhost = null; syncHUD(true); });

  ui.cmdAttackMove.addEventListener('click', () => { if (selectedUnitIds.size) { attackMoveMode = !attackMoveMode; syncHUD(); } });
  document.getElementById('cmd-stop').addEventListener('click', () => sendOrApplyCommand({ kind: 'stop', ids: Array.from(selectedUnitIds) }));
  document.getElementById('cmd-hold').addEventListener('click', () => sendOrApplyCommand({ kind: 'hold', ids: Array.from(selectedUnitIds) }));
  ui.cmdSkill.addEventListener('click', () => sendOrApplyCommand({ kind: 'heroSkill', ids: Array.from(selectedUnitIds) }));

  document.querySelectorAll('.grp-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const g = Number(b.dataset.grp);
      const alive = (controlGroups[g] || []).filter((id) => units.some((u) => u.id === id && !u.dead));
      if (alive.length) { selectedUnitIds = new Set(alive); selectedBuildingId = null; syncHUD(true); }
    });
  });

  function toggleSound() {
    sfx.muted = !sfx.muted;
    ui.soundBtn.style.opacity = sfx.muted ? '0.5' : '1';
  }
  ui.soundBtn.addEventListener('click', toggleSound);

  // Lobby Buttons
  document.getElementById('btn-start-solo').addEventListener('click', () => {
    netRole = 'solo';
    myTeam = 'blue';
    aiDifficulty = document.querySelector('input[name="ai-diff"]:checked')?.value || 'normal';
    lobbyOverlay.classList.add('hidden');
    initWorld();
    gameState = 'playing';
    sfx.ensure();
    sfx.play('hero');
    showToast('⚔ Pertahankan Castle Biru & Hancurkan Kekaisaran Merah!', 2.8);
  });

  document.getElementById('btn-copy-lan').addEventListener('click', () => {
    navigator.clipboard?.writeText(lanInfo.url || window.location.origin);
    showToast('📋 Alamat LAN disalin!', 1.5);
  });
  document.getElementById('btn-create-room').addEventListener('click', () => {
    ws?.send(JSON.stringify({ type: 'create_room', playerName: ui.inputCmdName.value.trim() || 'Pemain 1' }));
  });
  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = ui.inputRoomCode.value.trim().toUpperCase();
    if (!code) { showToast('Masukkan kode room!', 1.5); return; }
    ws?.send(JSON.stringify({ type: 'join_room', code, playerName: ui.inputCmdName.value.trim() || 'Pemain 2' }));
  });
  document.getElementById('btn-leave-room').addEventListener('click', openLobby);
  document.getElementById('btn-launch-lan').addEventListener('click', () => {
    ws?.send(JSON.stringify({ type: 'start_game' }));
  });

  // Canvas resize
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    cam.zoom = clamp(canvas.width / 1180, 0.72, 1.15);
  }
  window.addEventListener('resize', resizeCanvas);

  // Load all official + custom sprites
  async function loadAssets() {
    const entries = Object.entries(ASSET_PATHS);
    let done = 0;
    await Promise.all(entries.map(([key, rel]) => new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        images[key] = im;
        done++;
        const pct = Math.round((done / entries.length) * 100);
        loadingFill.style.width = `${pct}%`;
        loadingStatus.textContent = `Memuat aset Tiny Swords (${done}/${entries.length})...`;
        res();
      };
      im.onerror = () => {
        console.warn('Gagal muat aset:', rel);
        done++;
        res();
      };
      im.src = encodeURI(rel);
    })));
  }

  // Boot
  (async function boot() {
    resizeCanvas();
    await loadAssets();
    initLAN();
    loadingOverlay.classList.add('hidden');
    lobbyOverlay.classList.remove('hidden');
    gameState = 'lobby';
    requestAnimationFrame(frame);
  })();
})();
