(() => {
  'use strict';

  const BASE = 'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/';
  const WORLD_W = 1920;
  const WORLD_H = 1024;
  const TILE = 64;

  // Island bounds (in tiles)
  const ISLAND = { x1: 2, y1: 2, x2: 27, y2: 12 }; // 26x11 grass tiles + cliff on y=13

  // Asset manifest
  const ASSET_PATHS = {
    tilemap: 'Terrain/Tileset/Tilemap_color1.png',
    waterBg: 'Terrain/Tileset/Water Background color.png',
    waterFoam: 'Terrain/Tileset/Water Foam.png',
    shadow: 'Terrain/Tileset/Shadow.png',
    tree1: 'Terrain/Resources/Wood/Trees/Tree1.png',
    tree2: 'Terrain/Resources/Wood/Trees/Tree2.png',
    bush1: 'Terrain/Decorations/Bushes/Bushe1.png',
    bush2: 'Terrain/Decorations/Bushes/Bushe2.png',
    rock1: 'Terrain/Decorations/Rocks/Rock1.png',
    rock2: 'Terrain/Decorations/Rocks/Rock2.png',
    goldStone: 'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png',
    sheepIdle: 'Terrain/Resources/Meat/Sheep/Sheep_Idle.png',
    sheepMove: 'Terrain/Resources/Meat/Sheep/Sheep_Move.png',

    blueCastle: 'Buildings/Blue Buildings/Castle.png',
    blueBarracks: 'Buildings/Blue Buildings/Barracks.png',
    blueArchery: 'Buildings/Blue Buildings/Archery.png',
    blueTower: 'Buildings/Blue Buildings/Tower.png',

    redCastle: 'Buildings/Red Buildings/Castle.png',
    redBarracks: 'Buildings/Red Buildings/Barracks.png',
    redTower: 'Buildings/Red Buildings/Tower.png',

    // Blue units
    blue_warrior_idle: 'Units/Blue Units/Warrior/Warrior_Idle.png',
    blue_warrior_run: 'Units/Blue Units/Warrior/Warrior_Run.png',
    blue_warrior_atk1: 'Units/Blue Units/Warrior/Warrior_Attack1.png',
    blue_warrior_atk2: 'Units/Blue Units/Warrior/Warrior_Attack2.png',
    blue_warrior_guard: 'Units/Blue Units/Warrior/Warrior_Guard.png',

    blue_archer_idle: 'Units/Blue Units/Archer/Archer_Idle.png',
    blue_archer_run: 'Units/Blue Units/Archer/Archer_Run.png',
    blue_archer_atk1: 'Units/Blue Units/Archer/Archer_Shoot.png',
    blue_arrow: 'Units/Blue Units/Archer/Arrow.png',

    blue_lancer_idle: 'Units/Blue Units/Lancer/Lancer_Idle.png',
    blue_lancer_run: 'Units/Blue Units/Lancer/Lancer_Run.png',
    blue_lancer_atk1: 'Units/Blue Units/Lancer/Lancer_Right_Attack.png',

    blue_monk_idle: 'Units/Blue Units/Monk/Idle.png',
    blue_monk_run: 'Units/Blue Units/Monk/Run.png',
    blue_monk_atk1: 'Units/Blue Units/Monk/Heal.png',
    blue_heal_fx: 'Units/Blue Units/Monk/Heal_Effect.png',

    blue_pawn_idle: 'Units/Blue Units/Pawn/Pawn_Idle.png',
    blue_pawn_run: 'Units/Blue Units/Pawn/Pawn_Run.png',
    blue_pawn_mine: 'Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png',
    blue_pawn_gold: 'Units/Blue Units/Pawn/Pawn_Run Gold.png',

    // Red units
    red_warrior_idle: 'Units/Red Units/Warrior/Warrior_Idle.png',
    red_warrior_run: 'Units/Red Units/Warrior/Warrior_Run.png',
    red_warrior_atk1: 'Units/Red Units/Warrior/Warrior_Attack1.png',
    red_warrior_atk2: 'Units/Red Units/Warrior/Warrior_Attack2.png',

    red_archer_idle: 'Units/Red Units/Archer/Archer_Idle.png',
    red_archer_run: 'Units/Red Units/Archer/Archer_Run.png',
    red_archer_atk1: 'Units/Red Units/Archer/Archer_Shoot.png',
    red_arrow: 'Units/Red Units/Archer/Arrow.png',

    red_lancer_idle: 'Units/Red Units/Lancer/Lancer_Idle.png',
    red_lancer_run: 'Units/Red Units/Lancer/Lancer_Run.png',
    red_lancer_atk1: 'Units/Red Units/Lancer/Lancer_Right_Attack.png',

    red_monk_idle: 'Units/Red Units/Monk/Idle.png',
    red_monk_run: 'Units/Red Units/Monk/Run.png',
    red_monk_atk1: 'Units/Red Units/Monk/Heal.png',
    red_heal_fx: 'Units/Red Units/Monk/Heal_Effect.png',

    // FX
    explosion: 'Particle FX/Explosion_01.png',
    dust: 'Particle FX/Dust_01.png',

    // Custom Tiny Swords-style Mage (Blue & Red)
    blue_mage_idle: '@custom_assets/Blue Units/Mage/Mage_Idle.png',
    blue_mage_run:  '@custom_assets/Blue Units/Mage/Mage_Run.png',
    blue_mage_atk1: '@custom_assets/Blue Units/Mage/Mage_Attack.png',
    blue_mage_orb:  '@custom_assets/Blue Units/Mage/Mage_Orb.png',

    red_mage_idle:  '@custom_assets/Red Units/Mage/Mage_Idle.png',
    red_mage_run:   '@custom_assets/Red Units/Mage/Mage_Run.png',
    red_mage_atk1:  '@custom_assets/Red Units/Mage/Mage_Attack.png',
    red_mage_orb:   '@custom_assets/Red Units/Mage/Mage_Orb.png',

    // Custom Giant Golem (Blue & Red, 320x320 frames, hand-illustrated Tiny Swords style)
    blue_golem_idle:  '@custom_assets/Blue Units/Golem/Golem_Idle.png?v=2',
    blue_golem_run:   '@custom_assets/Blue Units/Golem/Golem_Walk.png?v=2',
    blue_golem_atk1:  '@custom_assets/Blue Units/Golem/Golem_Attack.png?v=2',
    blue_golem_death: '@custom_assets/Blue Units/Golem/Golem_Death.png?v=2',

    red_golem_idle:   '@custom_assets/Red Units/Golem/Golem_Idle.png?v=2',
    red_golem_run:    '@custom_assets/Red Units/Golem/Golem_Walk.png?v=2',
    red_golem_atk1:   '@custom_assets/Red Units/Golem/Golem_Attack.png?v=2',
    red_golem_death:  '@custom_assets/Red Units/Golem/Golem_Death.png?v=2',

    // Custom Giant Dragon (Blue & Red, 320x320 frames, downward fire breath + death)
    blue_dragon_idle:     '@custom_assets/Blue Units/Dragon/Dragon_Idle.png?v=2',
    blue_dragon_run:      '@custom_assets/Blue Units/Dragon/Dragon_Fly.png?v=2',
    blue_dragon_atk1:     '@custom_assets/Blue Units/Dragon/Dragon_Attack.png?v=2',
    blue_dragon_death:    '@custom_assets/Blue Units/Dragon/Dragon_Death.png?v=2',

    red_dragon_idle:      '@custom_assets/Red Units/Dragon/Dragon_Idle.png?v=2',
    red_dragon_run:       '@custom_assets/Red Units/Dragon/Dragon_Fly.png?v=2',
    red_dragon_atk1:      '@custom_assets/Red Units/Dragon/Dragon_Attack.png?v=2',
    red_dragon_death:     '@custom_assets/Red Units/Dragon/Dragon_Death.png?v=2',
  };

  const UNIT_CONFIG = {
    hero:    { hp: 220, speed: 215, dmg: 28, range: 68,  atkCd: 0.48, frameW: 192, scale: 0.92, cost: 0,   reward: 0   },
    warrior: { hp: 120, speed: 125, dmg: 18, range: 56,  atkCd: 0.85, frameW: 192, scale: 0.82, cost: 30,  reward: 16  },
    archer:  { hp: 75,  speed: 115, dmg: 15, range: 270, atkCd: 1.35, frameW: 192, scale: 0.82, cost: 40,  reward: 22  },
    lancer:  { hp: 175, speed: 105, dmg: 30, range: 82,  atkCd: 1.05, frameW: 320, scale: 0.78, cost: 60,  reward: 30  },
    monk:    { hp: 90,  speed: 110, dmg: 24, range: 185, atkCd: 2.1,  frameW: 192, scale: 0.82, cost: 55,  reward: 28  },
    pawn:    { hp: 70,  speed: 120, dmg: 0,  range: 42,  atkCd: 1.0,  frameW: 192, scale: 0.78, cost: 25,  reward: 10  },
    mage:    { hp: 85,  speed: 112, dmg: 26, range: 265, atkCd: 1.85, frameW: 192, scale: 0.84, cost: 65,  reward: 34  },
    golem:   { hp: 460, speed: 70,  dmg: 52, range: 110, atkCd: 1.95, frameW: 320, scale: 0.96, cost: 110, reward: 85,  isBoss: true, hasDeath: true },
    dragon:  { hp: 360, speed: 105, dmg: 48, range: 155, atkCd: 1.85, frameW: 320, scale: 1.02, cost: 150, reward: 110, isBoss: true, hasDeath: true, flying: true },
  };

  // Web Audio Synth SFX (zero external audio files required)
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }
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
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'slash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.11);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === 'arrow') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now); osc.stop(now + 0.09);
      } else if (type === 'gold') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(760, now);
        osc.frequency.setValueAtTime(1040, now + 0.055);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.22);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now); osc.stop(now + 0.24);
      } else if (type === 'spawn') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);
      } else if (type === 'magic') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.22);
        gain.gain.setValueAtTime(0.075, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now); osc.stop(now + 0.24);
      } else if (type === 'slam') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'roar') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
        osc.frequency.exponentialRampToValueAtTime(68, now + 0.34);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.start(now); osc.stop(now + 0.36);
      } else if (type === 'bossDeath') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
        osc.start(now); osc.stop(now + 0.58);
      } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.start(now); osc.stop(now + 0.36);
      }
    }
  }

  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingFill = document.getElementById('loading-fill');
  const loadingStatus = document.getElementById('loading-status');
  const startOverlay = document.getElementById('start-overlay');
  const bannerToast = document.getElementById('banner-toast');
  const dialog = document.getElementById('game-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBody = document.getElementById('dialog-body');
  const dialogStats = document.getElementById('dialog-stats');
  const dialogPrimary = document.getElementById('dialog-primary');
  const dialogSecondary = document.getElementById('dialog-secondary');

  const ui = {
    blueHpBar: document.getElementById('blue-hp-bar'),
    blueHpText: document.getElementById('blue-hp-text'),
    redHpBar: document.getElementById('red-hp-bar'),
    redHpText: document.getElementById('red-hp-text'),
    heroHpBar: document.getElementById('hero-hp-bar'),
    heroHpText: document.getElementById('hero-hp-text'),
    goldCount: document.getElementById('gold-count'),
    waveCount: document.getElementById('wave-count'),
    scoreCount: document.getElementById('score-count'),
    rallyBtn: document.getElementById('btn-rally'),
    rallyLabel: document.getElementById('rally-label'),
    soundBtn: document.getElementById('btn-sound'),
    unitBtns: Array.from(document.querySelectorAll('.unit-btn')),
  };

  const sfx = new SoundFX();
  const images = {};

  // Input state
  const keys = new Set();
  const mouse = { x: WORLD_W * 0.5, y: WORLD_H * 0.5, left: false, right: false };

  // Game state
  let state = 'loading'; // loading | menu | playing | paused | victory | defeat
  let worldTime = 0;
  let lastTs = 0;
  let toastTimer = 0;
  let shakeTime = 0;
  let shakeMag = 0;

  // Camera transform (maps WORLD_W x WORLD_H into canvas)
  let cam = { scale: 1, ox: 0, oy: 0 };

  let gold = 120;
  let goldPassiveTimer = 0;
  let score = 0;
  let kills = 0;
  let wave = 1;
  let waveTimer = 6;
  let rallyMode = 'attack'; // 'attack' | 'defend'

  let blueCastle = null;
  let redCastle = null;
  let hero = null;
  let units = [];
  let projectiles = [];
  let effects = [];
  let floats = [];
  let props = [];
  let sheep = [];
  let goldMine = { x: 470, y: 245 };

  // Helpers
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function showToast(msg, duration = 2.4) {
    bannerToast.textContent = msg;
    bannerToast.classList.add('show');
    toastTimer = duration;
  }

  function addShake(mag, dur = 0.2) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = Math.max(shakeTime, dur);
  }

  function addFloat(x, y, text, color = '#fff') {
    floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function spawnFx(key, x, y, frameW = 192, fps = 14, scale = 0.9) {
    const img = images[key];
    if (!img) return;
    const frames = Math.max(1, Math.round(img.width / frameW));
    effects.push({ img, x, y, frameW, frameH: img.height, frames, fps, scale, t: 0 });
  }

  // Load all images
  async function loadAssets() {
    const entries = Object.entries(ASSET_PATHS);
    let loaded = 0;
    await Promise.all(entries.map(([key, rel]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        loaded++;
        const pct = Math.round((loaded / entries.length) * 100);
        loadingFill.style.width = `${pct}%`;
        loadingStatus.textContent = `Memuat aset (${loaded}/${entries.length})...`;
        resolve();
      };
      img.onerror = () => {
        console.warn('Gagal memuat:', rel);
        loaded++;
        resolve();
      };
      const fullPath = rel.startsWith('@') ? rel.slice(1) : (BASE + rel);
      img.src = encodeURI(fullPath);
    })));
  }

  // Build world props & initial entities
  function resetGame() {
    gold = 200;
    goldPassiveTimer = 0;
    score = 0;
    kills = 0;
    wave = 1;
    waveTimer = 4.5;
    rallyMode = 'attack';
    updateRallyUI();

    blueCastle = {
      team: 'blue',
      x: 270, y: 505,
      w: 240, h: 192,
      hp: 1000, maxHp: 1000,
      towerCd: 0,
      img: images.blueCastle,
    };
    redCastle = {
      team: 'red',
      x: 1650, y: 505,
      w: 240, h: 192,
      hp: 1200, maxHp: 1200,
      towerCd: 0,
      img: images.redCastle,
    };

    goldMine = { x: 475, y: 245 };

    units = [];
    projectiles = [];
    effects = [];
    floats = [];

    // Static decorative buildings & nature
    props = [
      { kind: 'building', img: images.blueBarracks, x: 245, y: 315, scale: 0.72 },
      { kind: 'building', img: images.blueArchery,  x: 245, y: 700, scale: 0.72 },
      { kind: 'building', img: images.blueTower,    x: 425, y: 375, scale: 0.72 },
      { kind: 'building', img: images.blueTower,    x: 425, y: 650, scale: 0.72 },

      { kind: 'building', img: images.redBarracks,  x: 1655, y: 315, scale: 0.72 },
      { kind: 'building', img: images.redTower,     x: 1495, y: 375, scale: 0.72 },
      { kind: 'building', img: images.redTower,     x: 1495, y: 650, scale: 0.72 },

      { kind: 'gold', img: images.goldStone, x: goldMine.x, y: goldMine.y, scale: 0.9 },

      // Trees around edges
      { kind: 'tree', img: images.tree1, x: 640,  y: 205, scale: 0.85, phase: 0.1 },
      { kind: 'tree', img: images.tree2, x: 930,  y: 190, scale: 0.82, phase: 1.2 },
      { kind: 'tree', img: images.tree1, x: 1230, y: 200, scale: 0.85, phase: 2.3 },
      { kind: 'tree', img: images.tree2, x: 1440, y: 215, scale: 0.8,  phase: 0.7 },
      { kind: 'tree', img: images.tree1, x: 610,  y: 785, scale: 0.85, phase: 1.8 },
      { kind: 'tree', img: images.tree2, x: 1020, y: 795, scale: 0.85, phase: 2.9 },
      { kind: 'tree', img: images.tree1, x: 1350, y: 780, scale: 0.82, phase: 0.4 },

      // Bushes & rocks
      { kind: 'bush', img: images.bush1, x: 780,  y: 230, scale: 0.75, phase: 0.3 },
      { kind: 'bush', img: images.bush2, x: 1120, y: 240, scale: 0.75, phase: 1.4 },
      { kind: 'bush', img: images.bush1, x: 820,  y: 775, scale: 0.75, phase: 2.1 },
      { kind: 'bush', img: images.bush2, x: 1190, y: 765, scale: 0.75, phase: 0.8 },
      { kind: 'rock', img: images.rock1, x: 540,  y: 265, scale: 0.85 },
      { kind: 'rock', img: images.rock2, x: 970,  y: 745, scale: 0.9 },
      { kind: 'rock', img: images.rock1, x: 1380, y: 265, scale: 0.85 },
    ];

    // Ambient grazing sheep
    sheep = [
      { x: 720, y: 310, vx: 0, vy: 0, state: 'idle', timer: 2.2, facing: 1, animT: 0 },
      { x: 860, y: 710, vx: 0, vy: 0, state: 'idle', timer: 3.1, facing: -1, animT: 1 },
      { x: 1160, y: 310, vx: 0, vy: 0, state: 'idle', timer: 1.7, facing: 1, animT: 2 },
    ];

    // Create Hero
    hero = createUnit('blue', 'hero', 530, 520);
    units.push(hero);

    // Starting garrison (includes Blue Mage & Giant Blue Golem!)
    units.push(createUnit('blue', 'pawn', 395, 430));
    units.push(createUnit('blue', 'warrior', 580, 460));
    units.push(createUnit('blue', 'archer', 515, 575));
    units.push(createUnit('blue', 'mage', 495, 485));
    units.push(createUnit('blue', 'golem', 645, 520));

    // Initial red defenders (includes Red Mage, Red Golem & Giant Red Dragon!)
    units.push(createUnit('red', 'warrior', 1400, 460));
    units.push(createUnit('red', 'mage', 1475, 565));
    const initRedGolem = createUnit('red', 'golem', 1345, 525);
    initRedGolem.hp = 290;
    initRedGolem.maxHp = 290;
    units.push(initRedGolem);
    const initRedDragon = createUnit('red', 'dragon', 1455, 430);
    initRedDragon.hp = 260;
    initRedDragon.maxHp = 260;
    units.push(initRedDragon);

    syncHUD();
  }

  function createUnit(team, role, x, y) {
    const cfg = UNIT_CONFIG[role];
    return {
      id: Math.random().toString(36).slice(2),
      team,
      role,
      isHero: role === 'hero',
      x, y,
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed,
      dmg: cfg.dmg,
      range: cfg.range,
      atkCd: cfg.atkCd,
      cdTimer: 0,
      frameW: cfg.frameW,
      scale: cfg.scale,
      reward: cfg.reward,
      isBoss: !!cfg.isBoss,
      hasDeath: !!cfg.hasDeath,
      flying: !!cfg.flying,
      facing: team === 'blue' ? 1 : -1,
      anim: 'idle',
      animT: rand(0, 1),
      atkTimer: 0,
      atkToggle: 0,
      pendingHit: null,
      guarding: false,
      hurtFlash: 0,
      // Pawn specific
      pawnState: 'toMine', // toMine | mining | toCastle
      pawnTimer: 0,
      dying: false,
      deathTimer: 0,
      deathDuration: 3.1,
      dead: false,
    };
  }

  function recruitUnit(role) {
    if (state !== 'playing') return;
    const cfg = UNIT_CONFIG[role];
    if (!cfg || gold < cfg.cost) {
      showToast('Emas tidak cukup!', 1.2);
      return;
    }
    gold -= cfg.cost;
    const spawnX = blueCastle.x + 115 + rand(-18, 28);
    const spawnY = blueCastle.y + rand(-110, 110);
    const u = createUnit('blue', role, spawnX, clamp(spawnY, 240, 740));
    units.push(u);
    spawnFx('dust', u.x, u.y + 18, 64, 14, u.isBoss ? 2.1 : 1.3);
    if (role === 'golem') {
      sfx.play('slam');
      addShake(4, 0.16);
      showToast('🪨 GIANT GOLEM DIPANGGIL!', 1.8);
    } else if (role === 'dragon') {
      sfx.play('roar');
      addShake(4, 0.16);
      showToast('🐉 GIANT DRAGON MENGUDARA!', 1.8);
    } else {
      sfx.play('spawn');
    }
    syncHUD();
  }

  function spawnWave(waveNum) {
    showToast(`⚔ WAVE ${waveNum} DATANG!`, 2.6);
    const warriors = 2 + Math.floor(waveNum * 0.9);
    const archers = Math.floor((waveNum + 1) / 2);
    const lancers = waveNum >= 2 ? Math.floor(waveNum / 2) : 0;
    const mages = waveNum >= 2 ? Math.floor(waveNum / 2) : 0;
    const monks = waveNum >= 3 ? Math.floor((waveNum - 1) / 3) : 0;
    const golems = waveNum >= 2 ? 1 : 0;
    const dragons = waveNum >= 3 ? 1 : 0;

    const batch = [];
    for (let i = 0; i < warriors; i++) batch.push('warrior');
    for (let i = 0; i < archers; i++) batch.push('archer');
    for (let i = 0; i < lancers; i++) batch.push('lancer');
    for (let i = 0; i < mages; i++) batch.push('mage');
    for (let i = 0; i < monks; i++) batch.push('monk');
    for (let i = 0; i < golems; i++) batch.push('golem');
    for (let i = 0; i < dragons; i++) batch.push('dragon');

    batch.forEach((role, idx) => {
      const sx = redCastle.x - 105 - (idx % 3) * 28 + rand(-10, 10);
      const sy = redCastle.y + rand(-130, 130);
      const u = createUnit('red', role, sx, clamp(sy, 245, 735));
      // Gentle scaling per wave
      const boost = 1 + (waveNum - 1) * 0.08;
      u.hp = Math.round(u.hp * boost);
      u.maxHp = u.hp;
      u.dmg = Math.round(u.dmg * (1 + (waveNum - 1) * 0.05));
      units.push(u);
    });
  }

  function toggleRally() {
    rallyMode = rallyMode === 'attack' ? 'defend' : 'attack';
    updateRallyUI();
    showToast(rallyMode === 'attack' ? '⚔ Pasukan: MAJU SERANG!' : '🛡 Pasukan: BERTAHAN DI KASTIL!', 1.6);
  }

  function updateRallyUI() {
    ui.rallyBtn.classList.toggle('attack', rallyMode === 'attack');
    ui.rallyBtn.classList.toggle('defend', rallyMode === 'defend');
    ui.rallyLabel.textContent = rallyMode === 'attack' ? '⚔ SERANG' : '🛡 BERTAHAN';
  }

  // Hero actions
  function triggerHeroAttack() {
    if (!hero || hero.dead || hero.cdTimer > 0) return;
    hero.guarding = false;
    hero.cdTimer = hero.atkCd;
    hero.atkTimer = 0.32;
    hero.atkToggle = 1 - hero.atkToggle;
    hero.anim = hero.atkToggle ? 'atk1' : 'atk2';
    hero.animT = 0;
    sfx.play('slash');

    // Damage enemies in front arc / close range
    const hitRange = hero.range + 24;
    let hitAny = false;
    for (const enemy of units) {
      if (enemy.dead || enemy.dying || enemy.team === 'blue') continue;
      const dx = enemy.x - hero.x;
      const dy = enemy.y - hero.y;
      const d = Math.hypot(dx, dy);
      if (d <= hitRange + (enemy.isBoss ? 22 : 0) && (dx * hero.facing > -24 || d < 46)) {
        dealDamage(enemy, hero.dmg, hero);
        if (!enemy.isBoss) enemy.x += hero.facing * 18;
        hitAny = true;
      }
    }
    // Also hit Red Castle if close
    if (Math.hypot(redCastle.x - hero.x, redCastle.y - hero.y) < 170) {
      damageCastle(redCastle, hero.dmg);
      hitAny = true;
    }
    if (hitAny) addShake(4, 0.12);
  }

  function dealDamage(target, amount, attacker) {
    if (target.dead || target.dying) return;
    let dmg = amount;
    if (target.isHero && target.guarding) {
      dmg = Math.max(2, Math.round(dmg * 0.25));
      addFloat(target.x, target.y - 54, 'GUARD!', '#8dd3ff');
      if (attacker && !attacker.dead && !attacker.dying && !attacker.isBoss) {
        attacker.x -= Math.sign(target.x - attacker.x || 1) * 24;
      }
    }
    target.hp -= dmg;
    target.hurtFlash = 0.14;
    addFloat(target.x + rand(-12, 12), target.y - (target.isBoss ? 92 : 44), `-${dmg}`, target.team === 'red' ? '#ffd166' : '#ff6b6b');
    sfx.play('hit');

    if (target.hp <= 0) {
      target.hp = 0;
      if (target.hasDeath) {
        // Play full 10-frame boss death animation (crumbling Golem / crashing Dragon)!
        target.dying = true;
        target.anim = 'death';
        target.animT = 0;
        target.deathTimer = target.deathDuration;
        sfx.play('bossDeath');
        addShake(7.5, 0.28);
      } else {
        target.dead = true;
        spawnFx('explosion', target.x, target.y - 10, 192, 16, 0.65);
      }
      if (target.team === 'red') {
        gold += target.reward;
        kills++;
        score += target.reward * 5;
        addFloat(target.x, target.y - (target.isBoss ? 120 : 68), `+${target.reward}g`, '#f5c542');
        sfx.play('gold');
        if (target.isBoss) {
          showToast(target.role === 'dragon' ? '🐉 RED DRAGON TUMBANG!' : '🪨 RED GOLEM RUNTUH!', 2.2);
        }
      } else if (target.isHero) {
        showToast('Hero gugur! Bangkit kembali di kastil dalam 4 detik...', 3.2);
        addShake(7, 0.25);
        setTimeout(() => {
          if (state === 'playing' && hero && hero.dead) {
            hero.dead = false;
            hero.hp = hero.maxHp;
            hero.x = blueCastle.x + 110;
            hero.y = blueCastle.y + 20;
            spawnFx('blue_heal_fx', hero.x, hero.y, 192, 15, 0.9);
            sfx.play('heal');
            showToast('Hero kembali ke medan perang!', 1.8);
          }
        }, 4000);
      }
    }
  }

  function damageCastle(castle, dmg) {
    castle.hp = Math.max(0, castle.hp - dmg);
    addFloat(castle.x + rand(-35, 35), castle.y - 80, `-${dmg}`, castle.team === 'red' ? '#ffd166' : '#ff5555');
    addShake(castle.team === 'blue' ? 6 : 3.5, 0.15);
    sfx.play('hit');

    if (castle.hp <= 0) {
      spawnFx('explosion', castle.x, castle.y - 20, 192, 12, 1.5);
      sfx.play('boom');
      endGame(castle.team === 'red');
    }
  }

  function endGame(won) {
    state = won ? 'victory' : 'defeat';
    dialogTitle.textContent = won ? '🏆 KEMENANGAN!' : '💀 KASTIL HANCUR!';
    dialogBody.textContent = won
      ? 'Selamat! Kastil Merah telah ditaklukkan dan Kerajaan Biru aman!'
      : 'Kastil Biru runtuh diserbu pasukan Merah. Coba lagi dengan strategi baru!';
    dialogStats.innerHTML = `
      <div class="dialog-stat-item">Wave: ${wave}</div>
      <div class="dialog-stat-item">Skor: ${score}</div>
      <div class="dialog-stat-item">Musuh Kalah: ${kills}</div>
      <div class="dialog-stat-item">Sisa Emas: ${gold}g</div>
    `;
    dialogPrimary.textContent = 'Main Lagi';
    dialogSecondary.style.display = 'none';
    dialog.showModal();
  }

  function openPauseOrHelp(mode) {
    if (state === 'playing') state = 'paused';
    dialogStats.innerHTML = '';
    dialogSecondary.style.display = 'inline-block';
    if (mode === 'help') {
      dialogTitle.textContent = 'Panduan Bermain';
      dialogBody.textContent =
        'Gerakkan Hero dengan WASD / Panah, tekan Space atau Klik Kiri untuk menebas, dan Shift atau Klik Kanan untuk Guard. Rekrut Warrior (1), Archer (2), Lancer (3), Monk (4), Pawn (5), Mage (6), serta Boss Raksasa: Giant Golem (7) & Giant Dragon (8). Tekan R untuk Maju Serang / Bertahan.';
    } else {
      dialogTitle.textContent = 'Permainan Dijeda';
      dialogBody.textContent = 'Istirahat sejenak sebelum melanjutkan pertempuran.';
    }
    dialogPrimary.textContent = 'Lanjutkan';
    dialog.showModal();
  }

  // Update loop
  function update(dt) {
    worldTime += dt;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) bannerToast.classList.remove('show');
    }
    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      if (shakeTime === 0) shakeMag = 0;
    }

    if (state !== 'playing') return;

    // Passive gold income
    goldPassiveTimer += dt;
    if (goldPassiveTimer >= 1.5) {
      goldPassiveTimer -= 1.5;
      gold += 4;
    }

    // Wave spawner
    waveTimer -= dt;
    if (waveTimer <= 0) {
      spawnWave(wave);
      wave++;
      waveTimer = Math.max(13, 21 - wave * 0.6);
    }

    // Castle defensive towers (shoot nearby enemies)
    updateCastleDefense(blueCastle, dt);
    updateCastleDefense(redCastle, dt);

    // Update Hero
    if (hero && !hero.dead) {
      updateHero(dt);
    }

    // Update AI Units (and play dying boss death animations)
    for (const u of units) {
      if (u.dead || u.isHero) continue;
      if (u.dying) {
        u.animT += dt;
        u.deathTimer -= dt;
        if (u.hurtFlash > 0) u.hurtFlash -= dt;
        if (u.deathTimer <= 0) u.dead = true;
        continue;
      }
      if (u.hurtFlash > 0) u.hurtFlash -= dt;
      if (u.cdTimer > 0) u.cdTimer -= dt;
      if (u.atkTimer > 0) u.atkTimer -= dt;

      // Trigger frame-synced boss impact (Golem Ground Slam on fist impact / Dragon downward fire breath on open jaw!)
      if (u.pendingHit) {
        u.pendingHit.delay -= dt;
        if (u.pendingHit.delay <= 0) {
          const hit = u.pendingHit;
          u.pendingHit = null;
          executeBossImpact(u, hit);
        }
      }

      if (u.role === 'pawn') {
        updatePawn(u, dt);
      } else if (u.role === 'monk') {
        updateMonk(u, dt);
      } else {
        updateCombatUnit(u, dt);
      }
      u.animT += dt;
    }

    // Remove dead non-hero units
    units = units.filter((u) => !u.dead || u.isHero);

    // Update Projectiles
    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.animT !== undefined) p.animT += dt;

      let hit = false;
      // Hit check against enemy units
      for (const u of units) {
        if (u.dead || u.dying || u.team === p.team) continue;
        const hitY = u.y - (u.isBoss ? 52 : 24);
        const hitR = (p.splash ? 36 : 30) + (u.isBoss ? 22 : 0);
        if (Math.hypot(u.x - p.x, hitY - p.y) < hitR) {
          dealDamage(u, p.dmg, null);
          if (p.splash) {
            for (const other of units) {
              if (other === u || other.dead || other.dying || other.team === p.team) continue;
              if (Math.hypot(other.x - p.x, (other.y - (other.isBoss ? 52 : 24)) - p.y) <= p.splash) {
                dealDamage(other, Math.round(p.dmg * 0.6), null);
              }
            }
            spawnFx('explosion', p.x, p.y, 192, 16, p.bigBlast ? 0.95 : 0.55);
            addShake(p.bigBlast ? 5.5 : 3, 0.14);
          }
          p.life = 0;
          hit = true;
          break;
        }
      }
      // Hit check against enemy castle
      if (!hit && p.life > 0) {
        const enemyCastle = p.team === 'blue' ? redCastle : blueCastle;
        if (Math.hypot(enemyCastle.x - p.x, enemyCastle.y - p.y) < 105) {
          damageCastle(enemyCastle, p.dmg);
          if (p.splash) spawnFx('explosion', p.x, p.y, 192, 16, p.bigBlast ? 0.95 : 0.55);
          p.life = 0;
        }
      }
    }
    projectiles = projectiles.filter((p) => p.life > 0);

    // Update FX
    for (const fx of effects) fx.t += dt;
    effects = effects.filter((fx) => fx.t < fx.frames / fx.fps);

    // Update floating texts
    for (const f of floats) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    floats = floats.filter((f) => f.life > 0);

    // Update ambient sheep
    for (const s of sheep) {
      s.animT += dt;
      s.timer -= dt;
      if (s.timer <= 0) {
        if (s.state === 'idle') {
          s.state = 'move';
          const ang = rand(0, Math.PI * 2);
          s.vx = Math.cos(ang) * 26;
          s.vy = Math.sin(ang) * 18;
          s.facing = s.vx >= 0 ? 1 : -1;
          s.timer = rand(1.2, 2.6);
        } else {
          s.state = 'idle';
          s.vx = 0; s.vy = 0;
          s.timer = rand(2.0, 4.5);
        }
      }
      if (s.state === 'move') {
        s.x = clamp(s.x + s.vx * dt, 580, 1340);
        s.y = clamp(s.y + s.vy * dt, 250, 740);
      }
    }

    syncHUD();
  }

  function updateCastleDefense(castle, dt) {
    castle.towerCd -= dt;
    if (castle.towerCd > 0) return;
    let nearest = null;
    let bestD = 360;
    for (const u of units) {
      if (u.dead || u.dying || u.team === castle.team) continue;
      const d = dist(castle, u);
      if (d < bestD) { bestD = d; nearest = u; }
    }
    if (nearest) {
      castle.towerCd = 1.45;
      fireArrow(castle.team, castle.x, castle.y - 70, nearest.x, nearest.y - 24, 14);
    }
  }

  function updateHero(dt) {
    if (hero.hurtFlash > 0) hero.hurtFlash -= dt;
    if (hero.cdTimer > 0) hero.cdTimer -= dt;
    if (hero.atkTimer > 0) hero.atkTimer -= dt;

    // Gentle HP regen when out of combat near Blue Castle
    if (dist(hero, blueCastle) < 220 && hero.hp < hero.maxHp) {
      hero.hp = Math.min(hero.maxHp, hero.hp + 10 * dt);
    }

    hero.guarding = (keys.has('ShiftLeft') || keys.has('ShiftRight') || mouse.right) && hero.atkTimer <= 0;

    let mx = 0, my = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      const spd = hero.guarding ? hero.speed * 0.45 : hero.speed;
      hero.x = clamp(hero.x + mx * spd * dt, ISLAND.x1 * TILE + 60, ISLAND.x2 * TILE - 10);
      hero.y = clamp(hero.y + my * spd * dt, ISLAND.y1 * TILE + 65, ISLAND.y2 * TILE + 18);
      if (mx !== 0) hero.facing = mx > 0 ? 1 : -1;
    }

    if (mouse.left || keys.has('Space')) {
      if (mouse.left && Math.abs(mouse.x - hero.x) > 8) {
        hero.facing = mouse.x >= hero.x ? 1 : -1;
      }
      triggerHeroAttack();
    }

    if (hero.atkTimer > 0) {
      // keep atk1/atk2
    } else if (hero.guarding) {
      hero.anim = 'guard';
    } else if (mx !== 0 || my !== 0) {
      hero.anim = 'run';
    } else {
      hero.anim = 'idle';
    }
    hero.animT += dt;
  }

  function updatePawn(u, dt) {
    if (u.pawnState === 'toMine') {
      const d = dist(u, goldMine);
      if (d > 44) {
        moveToward(u, goldMine.x, goldMine.y + 12, dt);
        u.anim = 'run';
      } else {
        u.pawnState = 'mining';
        u.pawnTimer = 2.4;
        u.anim = 'mine';
        u.facing = goldMine.x >= u.x ? 1 : -1;
      }
    } else if (u.pawnState === 'mining') {
      u.anim = 'mine';
      u.pawnTimer -= dt;
      if (u.pawnTimer <= 0) {
        u.pawnState = 'toCastle';
      }
    } else if (u.pawnState === 'toCastle') {
      const drop = { x: blueCastle.x + 85, y: blueCastle.y + 20 };
      if (dist(u, drop) > 40) {
        moveToward(u, drop.x, drop.y, dt);
        u.anim = 'gold';
      } else {
        gold += 18;
        score += 20;
        addFloat(u.x, u.y - 45, '+18g', '#f5c542');
        sfx.play('gold');
        u.pawnState = 'toMine';
      }
    }
  }

  function updateMonk(u, dt) {
    // Find injured ally
    let target = null;
    let bestScore = Infinity;
    for (const ally of units) {
      if (ally.dead || ally.dying || ally.team !== u.team || ally === u) continue;
      if (ally.hp < ally.maxHp) {
        const d = dist(u, ally);
        const prio = d + (ally.hp / ally.maxHp) * 200;
        if (prio < bestScore) { bestScore = prio; target = ally; }
      }
    }

    if (target) {
      const d = dist(u, target);
      if (d > u.range) {
        moveToward(u, target.x, target.y, dt);
        u.anim = 'run';
      } else if (u.cdTimer <= 0) {
        u.cdTimer = u.atkCd;
        u.atkTimer = 0.75;
        u.anim = 'atk1';
        u.animT = 0;
        u.facing = target.x >= u.x ? 1 : -1;
        target.hp = Math.min(target.maxHp, target.hp + u.dmg);
        addFloat(target.x, target.y - 48, `+${u.dmg}`, '#54f085');
        spawnFx(`${u.team}_heal_fx`, target.x, target.y, 192, 16, 0.8);
        if (u.team === 'blue') sfx.play('heal');
      } else if (u.atkTimer <= 0) {
        u.anim = 'idle';
      }
      return;
    }

    // Otherwise follow frontline / rally point
    const goalX = u.team === 'blue'
      ? (rallyMode === 'attack' ? Math.min(hero.x - 50, redCastle.x - 240) : blueCastle.x + 170)
      : blueCastle.x + 260;
    const goalY = u.team === 'blue' ? hero.y : blueCastle.y;
    if (Math.hypot(goalX - u.x, goalY - u.y) > 70) {
      moveToward(u, goalX, goalY, dt);
      u.anim = 'run';
    } else if (u.atkTimer <= 0) {
      u.anim = 'idle';
    }
  }

  function updateCombatUnit(u, dt) {
    // Let attack animations (especially Boss Ground Slam & Dragon Fire Breath) finish cleanly!
    if (u.isBoss && u.atkTimer > 0) return;

    // Acquire nearest enemy unit
    let target = null;
    let bestD = Infinity;
    const aggroRange = (u.team === 'blue' && rallyMode === 'defend') ? 320 : 520;

    for (const other of units) {
      if (other.dead || other.dying || other.team === u.team) continue;
      const d = dist(u, other);
      if (d < bestD && d < aggroRange) {
        bestD = d;
        target = other;
      }
    }

    const enemyCastle = u.team === 'blue' ? redCastle : blueCastle;

    if (target) {
      if (bestD > u.range) {
        moveToward(u, target.x, target.y, dt);
        u.anim = 'run';
      } else {
        u.facing = target.x >= u.x ? 1 : -1;
        if (u.cdTimer <= 0) {
          performUnitAttack(u, target, false);
        } else if (u.atkTimer <= 0) {
          u.anim = 'idle';
        }
      }
      return;
    }

    // Defend mode for Blue: hold near Blue Castle
    if (u.team === 'blue' && rallyMode === 'defend') {
      const guardX = blueCastle.x + 210;
      const guardY = blueCastle.y + ((u.id.charCodeAt(0) % 5) - 2) * 55;
      if (Math.hypot(guardX - u.x, guardY - u.y) > 36) {
        moveToward(u, guardX, guardY, dt);
        u.anim = 'run';
      } else {
        u.facing = 1;
        u.anim = 'idle';
      }
      return;
    }

    // March toward enemy castle
    const castleDist = dist(u, enemyCastle);
    const castleRange = u.range + 95;
    if (castleDist > castleRange) {
      moveToward(u, enemyCastle.x, enemyCastle.y, dt);
      u.anim = 'run';
    } else {
      u.facing = enemyCastle.x >= u.x ? 1 : -1;
      if (u.cdTimer <= 0) {
        performUnitAttack(u, enemyCastle, true);
      } else if (u.atkTimer <= 0) {
        u.anim = 'idle';
      }
    }
  }

  function performUnitAttack(u, target, isCastle) {
    u.cdTimer = u.atkCd;
    u.atkTimer = u.role === 'golem' ? 0.68
      : u.role === 'dragon' ? 0.68
      : u.role === 'archer' ? 0.55
      : u.role === 'mage' ? 0.52
      : 0.36;
    u.anim = 'atk1';
    u.animT = 0;

    if (u.role === 'archer') {
      fireArrow(u.team, u.x, u.y - 26, target.x, target.y - (isCastle ? 35 : 24), u.dmg);
    } else if (u.role === 'mage') {
      fireMagicOrb(u.team, u.x + u.facing * 20, u.y - 34, target.x, target.y - (isCastle ? 35 : 24), u.dmg);
    } else if (u.role === 'dragon') {
      // Sync downward diagonal fire breath impact with Frame 2 (when dragon pitches head down & opens jaws!)
      sfx.play('roar');
      u.pendingHit = { kind: 'dragonBreath', target, isCastle, delay: 0.24 };
    } else if (u.role === 'golem') {
      // Sync Ground Slam AoE shockwave with Frame 2 (when giant fists smash the ground!)
      u.pendingHit = { kind: 'golemSlam', target, isCastle, delay: 0.30 };
    } else if (isCastle) {
      damageCastle(target, u.dmg);
    } else {
      dealDamage(target, u.dmg, u);
    }
  }

  function executeBossImpact(u, hit) {
    if (u.dead || u.dying) return;
    const { kind, target, isCastle } = hit;

    if (kind === 'dragonBreath') {
      // Scorch the ground area diagonally below-front where the dragon's downward fire breath lands!
      const impactX = u.x + u.facing * 104;
      const impactY = u.y + 4;
      spawnFx('explosion', impactX, impactY - 12, 192, 16, 0.72);
      addShake(4.5, 0.16);
      if (isCastle) {
        damageCastle(target, u.dmg);
      } else if (target && !target.dead && !target.dying) {
        dealDamage(target, u.dmg, u);
      }
      for (const other of units) {
        if (other === target || other.dead || other.dying || other.team === u.team) continue;
        if (Math.hypot(other.x - impactX, other.y - impactY) <= 108) {
          dealDamage(other, Math.round(u.dmg * 0.7), u);
        }
      }
    } else if (kind === 'golemSlam') {
      // Heavy Ground Slam AoE shockwave + knockback!
      sfx.play('slam');
      addShake(6.0, 0.20);
      const slamX = u.x + u.facing * 64;
      const slamY = u.y;
      spawnFx('dust', slamX, slamY + 6, 64, 14, 2.0);
      if (isCastle) {
        damageCastle(target, u.dmg);
      } else if (target && !target.dead && !target.dying) {
        dealDamage(target, u.dmg, u);
      }
      for (const other of units) {
        if (other === target || other.dead || other.dying || other.team === u.team) continue;
        if (Math.hypot(other.x - slamX, other.y - slamY) <= 115) {
          dealDamage(other, Math.round(u.dmg * 0.65), u);
          if (!other.isBoss) other.x += u.facing * 26;
        }
      }
    }
  }

  function fireMagicOrb(team, sx, sy, tx, ty, dmg) {
    const ang = Math.atan2(ty - sy, tx - sx);
    const spd = 370;
    projectiles.push({
      team,
      x: sx, y: sy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      angle: ang,
      dmg,
      splash: 82,
      life: 1.8,
      animT: 0,
      frames: 4,
      frameW: 64,
      img: team === 'blue' ? images.blue_mage_orb : images.red_mage_orb,
    });
    sfx.play('magic');
  }

  function fireArrow(team, sx, sy, tx, ty, dmg) {
    const ang = Math.atan2(ty - sy, tx - sx);
    const spd = 480;
    projectiles.push({
      team,
      x: sx, y: sy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      angle: ang,
      dmg,
      life: 1.5,
      img: team === 'blue' ? images.blue_arrow : images.red_arrow,
    });
    sfx.play('arrow');
  }

  function moveToward(u, tx, ty, dt) {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const len = Math.hypot(dx, dy) || 1;
    u.x = clamp(u.x + (dx / len) * u.speed * dt, ISLAND.x1 * TILE + 55, ISLAND.x2 * TILE - 10);
    u.y = clamp(u.y + (dy / len) * u.speed * dt, ISLAND.y1 * TILE + 60, ISLAND.y2 * TILE + 18);
    if (Math.abs(dx) > 2) u.facing = dx > 0 ? 1 : -1;
  }

  // Rendering
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const sx = canvas.width / WORLD_W;
    const sy = canvas.height / WORLD_H;
    cam.scale = Math.min(sx, sy);
    cam.ox = (canvas.width - WORLD_W * cam.scale) * 0.5;
    cam.oy = (canvas.height - WORLD_H * cam.scale) * 0.5;
  }

  function drawTerrain() {
    // 1. Water background
    const water = images.waterBg;
    if (water) {
      const pat = ctx.createPattern(water, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = '#47a9b8';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // 2. Animated water foam around island shoreline
    const foam = images.waterFoam;
    if (foam) {
      const frame = Math.floor(worldTime * 8) % 16;
      const sx = frame * 192;
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx += 2) {
        ctx.drawImage(foam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y1 - 1) * TILE - 22, 192, 192);
        ctx.drawImage(foam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y2 + 1) * TILE - 32, 192, 192);
      }
      for (let gy = ISLAND.y1; gy <= ISLAND.y2 + 1; gy += 2) {
        ctx.drawImage(foam, sx, 0, 192, 192, (ISLAND.x1 - 1) * TILE - 22, gy * TILE - 32, 192, 192);
        ctx.drawImage(foam, sx, 0, 192, 192, ISLAND.x2 * TILE - 18, gy * TILE - 32, 192, 192);
      }
    }

    // 3. Island grass & southern cliff from Tilemap_color1.png (9x6 grid of 64x64)
    const tm = images.tilemap;
    if (!tm) return;

    // Southern cliff base (row 4 & row 5 of cols 5..7)
    for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
      const col = gx === ISLAND.x1 ? 5 : gx === ISLAND.x2 ? 7 : 6;
      ctx.drawImage(tm, col * TILE, 4 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 1) * TILE, TILE, TILE);
      ctx.drawImage(tm, col * TILE, 5 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 2) * TILE, TILE, TILE);
    }

    // Grass island (cols 0..2, rows 0..2)
    for (let gy = ISLAND.y1; gy <= ISLAND.y2; gy++) {
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
        const col = gx === ISLAND.x1 ? 0 : gx === ISLAND.x2 ? 2 : 1;
        const row = gy === ISLAND.y1 ? 0 : gy === ISLAND.y2 ? 2 : 1;
        ctx.drawImage(tm, col * TILE, row * TILE, TILE, TILE, gx * TILE, gy * TILE, TILE, TILE);
      }
    }

    // Subtle dirt battle lane across the center
    ctx.fillStyle = 'rgba(130, 96, 52, 0.16)';
    ctx.beginPath();
    ctx.roundRect(380, 465, 1160, 96, 48);
    ctx.fill();
  }

  function drawUnit(u) {
    const roleKey = u.isHero ? 'warrior' : u.role;
    const spriteKey = `${u.team}_${roleKey}_${u.anim}`;
    const fallbackKey = `${u.team}_${roleKey}_idle`;
    const img = images[spriteKey] || images[fallbackKey];
    if (!img) return;

    const fw = u.frameW;
    const fh = img.height;
    const frames = Math.max(1, Math.round(img.width / fw));

    let frame;
    if (u.dying && u.anim === 'death') {
      // Play hand-drawn 4–5 frame boss death sequence crisply at 4.5 fps, then hold final defeated pose!
      frame = Math.min(frames - 1, Math.floor(u.animT * 4.5));
    } else if (u.isBoss && u.anim === 'atk1') {
      // Play 4-frame attack smoothly across 0.68s without wrapping early
      frame = Math.min(frames - 1, Math.floor(u.animT * 6.0));
    } else {
      const fps = u.anim.startsWith('atk') ? 13 : u.anim === 'run' ? (u.isBoss ? 6.5 : 11) : (u.isBoss ? 5.5 : 8);
      frame = Math.floor(u.animT * fps) % frames;
    }

    const dw = fw * u.scale;
    const dh = fh * u.scale;

    // Ground shadow (skip generic canvas oval for custom bosses since their sprites include native pixel shadows!)
    if (!u.isBoss) {
      ctx.fillStyle = u.isHero ? 'rgba(45, 125, 210, 0.36)' : 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 8, u.isHero ? 26 : 19, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (u.isHero) {
      ctx.strokeStyle = '#7cd1ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 8, 28, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    // Fade out gently during final 0.65s of boss death linger
    if (u.dying && u.deathTimer < 0.65) {
      ctx.globalAlpha = clamp(u.deathTimer / 0.65, 0, 1);
    }
    // Custom 320x320 boss shadows sit at y=256 (0.80*dh), so offset by 0.30*dh puts shadow dead-on u.y!
    const yOffset = u.isBoss ? dh * 0.30 : dh * 0.34;
    ctx.translate(u.x, u.y - yOffset);
    ctx.scale(u.facing, 1);
    if (u.hurtFlash > 0) ctx.filter = 'brightness(1.85)';
    ctx.drawImage(img, frame * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
    ctx.restore();

    // Unit HP bar (hide while dying; larger gold-trimmed bar for Bosses!)
    if (!u.dying && (u.hp < u.maxHp || u.isHero || u.isBoss)) {
      const bw = u.isBoss ? 76 : u.isHero ? 54 : 38;
      const bh = u.isBoss ? 7 : 5;
      const bx = u.x - bw * 0.5;
      const by = u.y - (u.isBoss ? (u.role === 'dragon' ? 175 : 158) : 54);
      ctx.fillStyle = u.isBoss ? '#161c2e' : 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      if (u.isBoss) {
        ctx.strokeStyle = '#f5c542';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
      }
      ctx.fillStyle = u.isHero ? '#54f085' : u.team === 'blue' ? '#5ca9ff' : '#ff6b6b';
      ctx.fillRect(bx, by, bw * clamp(u.hp / u.maxHp, 0, 1), bh);
    }
  }

  function drawRenderables() {
    const list = [];

    // Castles
    [blueCastle, redCastle].forEach((c) => {
      if (!c || !c.img) return;
      list.push({
        y: c.y + 52,
        draw: () => {
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + 54, 108, 28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.drawImage(c.img, c.x - c.w * 0.5, c.y - c.h * 0.55, c.w, c.h);
        },
      });
    });

    // Props
    for (const p of props) {
      if (!p.img) continue;
      list.push({
        y: p.y,
        draw: () => {
          if (p.kind === 'tree') {
            const fw = 192, fh = p.img.height;
            const frame = Math.floor((worldTime + p.phase) * 6) % 8;
            const dw = fw * p.scale, dh = fh * p.scale;
            ctx.drawImage(p.img, frame * fw, 0, fw, fh, p.x - dw * 0.5, p.y - dh * 0.82, dw, dh);
          } else if (p.kind === 'bush') {
            const fw = 128, fh = 128;
            const frame = Math.floor((worldTime + p.phase) * 5) % 8;
            const dw = fw * p.scale, dh = fh * p.scale;
            ctx.drawImage(p.img, frame * fw, 0, fw, fh, p.x - dw * 0.5, p.y - dh * 0.65, dw, dh);
          } else {
            const dw = p.img.width * p.scale, dh = p.img.height * p.scale;
            ctx.drawImage(p.img, p.x - dw * 0.5, p.y - dh * 0.78, dw, dh);
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
          const frame = Math.floor(s.animT * 7) % frames;
          ctx.save();
          ctx.translate(s.x, s.y - 24);
          ctx.scale(s.facing, 1);
          ctx.drawImage(img, frame * 128, 0, 128, 128, -42, -42, 84, 84);
          ctx.restore();
        },
      });
    }

    // Units (flying dragons render above ground troops; fallen boss rubble renders beneath them)
    for (const u of units) {
      if (u.dead) continue;
      const sortY = u.dying ? u.y - 30 : (u.flying ? u.y + 45 : u.y);
      list.push({ y: sortY, draw: () => drawUnit(u) });
    }

    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#234d5b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    let sx = 0, sy = 0;
    if (shakeTime > 0) {
      sx = rand(-shakeMag, shakeMag);
      sy = rand(-shakeMag, shakeMag);
    }
    ctx.translate(cam.ox + sx * cam.scale, cam.oy + sy * cam.scale);
    ctx.scale(cam.scale, cam.scale);

    drawTerrain();
    drawRenderables();

    // Projectiles
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.img && p.frames > 1) {
        const fr = Math.floor((p.animT || 0) * 14) % p.frames;
        const sz = p.drawSize || 56;
        ctx.drawImage(p.img, fr * p.frameW, 0, p.frameW, p.img.height, -sz * 0.5, -sz * 0.5, sz, sz);
      } else if (p.img) {
        ctx.drawImage(p.img, -22, -22, 44, 44);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -2, 20, 4);
      }
      ctx.restore();
    }

    // Particle FX
    for (const fx of effects) {
      const frame = Math.min(fx.frames - 1, Math.floor(fx.t * fx.fps));
      const dw = fx.frameW * fx.scale;
      const dh = fx.frameH * fx.scale;
      ctx.drawImage(fx.img, frame * fx.frameW, 0, fx.frameW, fx.frameH, fx.x - dw * 0.5, fx.y - dh * 0.5, dw, dh);
    }

    // Floating combat text
    ctx.textAlign = 'center';
    ctx.font = '800 20px system-ui, sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function syncHUD() {
    if (!blueCastle || !redCastle) return;
    const bp = clamp((blueCastle.hp / blueCastle.maxHp) * 100, 0, 100);
    const rp = clamp((redCastle.hp / redCastle.maxHp) * 100, 0, 100);
    ui.blueHpBar.style.width = `${bp}%`;
    ui.blueHpText.textContent = `${Math.ceil(blueCastle.hp)} / ${blueCastle.maxHp}`;
    ui.redHpBar.style.width = `${rp}%`;
    ui.redHpText.textContent = `${Math.ceil(redCastle.hp)} / ${redCastle.maxHp}`;

    if (hero) {
      const hpPct = clamp((hero.hp / hero.maxHp) * 100, 0, 100);
      ui.heroHpBar.style.width = `${hpPct}%`;
      ui.heroHpText.textContent = hero.dead ? 'Respawning...' : `${Math.ceil(hero.hp)} / ${hero.maxHp}`;
    }

    ui.goldCount.textContent = Math.floor(gold);
    ui.waveCount.textContent = wave;
    ui.scoreCount.textContent = score;

    for (const btn of ui.unitBtns) {
      const role = btn.dataset.unit;
      btn.disabled = state !== 'playing' || gold < UNIT_CONFIG[role].cost;
    }
  }

  // Main animation loop
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // Coordinate helper
  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const cx = (clientX - rect.left) * dpr;
    const cy = (clientY - rect.top) * dpr;
    return {
      x: (cx - cam.ox) / cam.scale,
      y: (cy - cam.oy) / cam.scale,
    };
  }

  // Event listeners
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);

    if (e.repeat) return;
    if (e.code === 'Digit1') recruitUnit('warrior');
    else if (e.code === 'Digit2') recruitUnit('archer');
    else if (e.code === 'Digit3') recruitUnit('lancer');
    else if (e.code === 'Digit4') recruitUnit('monk');
    else if (e.code === 'Digit5') recruitUnit('pawn');
    else if (e.code === 'Digit6') recruitUnit('mage');
    else if (e.code === 'Digit7') recruitUnit('golem');
    else if (e.code === 'Digit8') recruitUnit('dragon');
    else if (e.code === 'KeyR' && state === 'playing') toggleRally();
    else if (e.code === 'KeyM') toggleSound();
    else if (e.code === 'KeyP' && (state === 'playing' || state === 'paused')) {
      if (dialog.open) { dialog.close(); state = 'playing'; }
      else openPauseOrHelp('pause');
    } else if (e.code === 'KeyH' && state === 'playing') {
      openPauseOrHelp('help');
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.code));

  canvas.addEventListener('mousemove', (e) => {
    const pt = screenToWorld(e.clientX, e.clientY);
    mouse.x = pt.x;
    mouse.y = pt.y;
  });

  canvas.addEventListener('mousedown', (e) => {
    const pt = screenToWorld(e.clientX, e.clientY);
    mouse.x = pt.x;
    mouse.y = pt.y;
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  ui.unitBtns.forEach((btn) => {
    btn.addEventListener('click', () => recruitUnit(btn.dataset.unit));
  });

  ui.rallyBtn.addEventListener('click', () => {
    if (state === 'playing') toggleRally();
  });

  function toggleSound() {
    sfx.muted = !sfx.muted;
    ui.soundBtn.textContent = sfx.muted ? '🔇' : '🔊';
  }

  ui.soundBtn.addEventListener('click', toggleSound);
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (state === 'playing') openPauseOrHelp('pause');
  });
  document.getElementById('btn-help').addEventListener('click', () => {
    if (state === 'playing' || state === 'paused') openPauseOrHelp('help');
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    state = 'playing';
    sfx.ensure();
    showToast('⚔ Pertahankan Kastil Biru!', 2.2);
    syncHUD();
  });

  dialogPrimary.addEventListener('click', () => {
    dialog.close();
    if (state === 'victory' || state === 'defeat') {
      resetGame();
      state = 'playing';
      showToast('⚔ Pertempuran Baru Dimulai!', 2.0);
    } else if (state === 'paused') {
      state = 'playing';
    }
  });

  dialogSecondary.addEventListener('click', () => {
    dialog.close();
    resetGame();
    state = 'playing';
    showToast('⚔ Pertempuran Baru Dimulai!', 2.0);
  });

  dialog.addEventListener('cancel', () => {
    if (state === 'paused') state = 'playing';
  });

  // Boot
  (async function init() {
    resizeCanvas();
    await loadAssets();
    resetGame();
    loadingOverlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    state = 'menu';
    requestAnimationFrame(frame);
  })();
})();
