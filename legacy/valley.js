(() => {
  'use strict';

  const BASE = 'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/';
  const TILE = 64;
  const COLS = 30;
  const ROWS = 20;
  const WORLD_W = COLS * TILE; // 1920
  const WORLD_H = ROWS * TILE; // 1280

  // Main grass island bounds (in tiles)
  const ISLAND = { x1: 2, y1: 2, x2: 27, y2: 16 };
  // Farmable plot area (11 x 7 tiles right below the Farmhouse)
  const FARM_BOX = { x1: 4, y1: 7, x2: 14, y2: 13 };
  // Cozy pond (south-west corner of island)
  const POND_BOX = { x1: 3, y1: 14, x2: 6, y2: 15 };

  // Preset Color Palettes for Character Creator
  const HAIR_PRESETS = [
    { name: 'Oranye Ichigo/Nami', hex: '#f28c28' },
    { name: 'Hitam Legam',        hex: '#2d3244' },
    { name: 'Biru Samudra',       hex: '#3b82d6' },
    { name: 'Merah Ruby',         hex: '#db4854' },
    { name: 'Pirang Emas',        hex: '#f0c446' },
    { name: 'Perak Salju',        hex: '#dce5f2' },
    { name: 'Hijau Zamrud',       hex: '#3da868' },
    { name: 'Pink Sakura',        hex: '#ec74a8' },
    { name: 'Ungu Mistis',        hex: '#985ad6' },
    { name: 'Cokelat Hangat',     hex: '#7c4e32' },
  ];

  const SKIN_PRESETS = [
    { name: 'Porselen',       hex: '#fae0ca' },
    { name: 'Peach Hangat',   hex: '#f3cba5' },
    { name: 'Kuning Langsat', hex: '#e3b184' },
    { name: 'Sawo Matang',    hex: '#c88f62' },
    { name: 'Cokelat Madu',   hex: '#a56c43' },
    { name: 'Cokelat Gelap',  hex: '#784930' },
  ];

  const OUTFIT_PRESETS = [
    { name: 'Biru Tiny Swords', hex: '#4697ac' },
    { name: 'Merah Ksatria',    hex: '#d95858' },
    { name: 'Hijau Rimba',      hex: '#4f9c5f' },
    { name: 'Ungu Bangsawan',   hex: '#845aa8' },
    { name: 'Emas Panen',       hex: '#cf9e3e' },
    { name: 'Arang Gelap',      hex: '#4e5869' },
  ];

  const CROPS = {
    turnip:     { name: 'Lobak',         emoji: '🥕', seedCost: 10, sellPrice: 30,  days: 2, regrow: false, energy: 18, color1: '#f08a34', color2: '#ffd080', leaf: '#58b848' },
    strawberry: { name: 'Stroberi',      emoji: '🍓', seedCost: 25, sellPrice: 65,  days: 3, regrow: true,  energy: 28, color1: '#e64258', color2: '#ff8da1', leaf: '#4da84c' },
    pumpkin:    { name: 'Labu Emas',     emoji: '🎃', seedCost: 45, sellPrice: 140, days: 4, regrow: false, energy: 40, color1: '#e87d24', color2: '#ffc247', leaf: '#428f3e' },
    starflower: { name: 'Bunga Bintang', emoji: '🌻', seedCost: 70, sellPrice: 240, days: 5, regrow: false, energy: 55, color1: '#ffd93d', color2: '#fff6b0', leaf: '#46b57c' },
  };
  const SEED_ORDER = ['turnip', 'strawberry', 'pumpkin', 'starflower'];

  const ASSET_PATHS = {
    tilemap:     'Terrain/Tileset/Tilemap_color1.png',
    tilemapSand: 'Terrain/Tileset/Tilemap_color2.png',
    waterBg:     'Terrain/Tileset/Water Background color.png',
    waterFoam:   'Terrain/Tileset/Water Foam.png',
    tree1:       'Terrain/Resources/Wood/Trees/Tree1.png',
    tree2:       'Terrain/Resources/Wood/Trees/Tree2.png',
    stump1:      'Terrain/Resources/Wood/Trees/Stump 1.png',
    bush1:       'Terrain/Decorations/Bushes/Bushe1.png',
    bush2:       'Terrain/Decorations/Bushes/Bushe2.png',
    rock1:       'Terrain/Decorations/Rocks/Rock1.png',
    rock2:       'Terrain/Decorations/Rocks/Rock2.png',
    duck:        'Terrain/Decorations/Rubber Duck/Rubber duck.png',
    goldStone:   'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png',
    sheepIdle:   'Terrain/Resources/Meat/Sheep/Sheep_Idle.png',
    sheepMove:   'Terrain/Resources/Meat/Sheep/Sheep_Move.png',

    house1:      'Buildings/Blue Buildings/House1.png',
    house2:      'Buildings/Blue Buildings/House2.png',
    house3:      'Buildings/Blue Buildings/House3.png',
    monastery:   'Buildings/Blue Buildings/Monastery.png',
    tower:       'Buildings/Blue Buildings/Tower.png',

    npcPawn:     'Units/Blue Units/Pawn/Pawn_Idle.png',
    npcMonk:     'Units/Blue Units/Monk/Idle.png',
    npcArcher:   'Units/Blue Units/Archer/Archer_Idle.png',
    npcMage:     '@custom_assets/Blue Units/Mage/Mage_Idle.png',
    guardianDragon: '@custom_assets/Blue Units/Dragon/Dragon_Idle.png?v=2',

    dust:        'Particle FX/Dust_01.png',
    waterSplash: 'Particle FX/Water Splash.png',
    arrow:       'Units/Blue Units/Archer/Arrow.png',

    // Complete 9-animation 2.5D Male (Ichigo) & Female (Nami) sprites + recolor masks!
    male_walk_down:        '@custom_assets/Farmers/Male/Walk_Down.png?v=4',
    male_walk_down_mask:   '@custom_assets/Farmers/Male/Walk_Down_Mask.png?v=4',
    male_walk_up:          '@custom_assets/Farmers/Male/Walk_Up.png?v=4',
    male_walk_up_mask:     '@custom_assets/Farmers/Male/Walk_Up_Mask.png?v=4',
    male_walk_side:        '@custom_assets/Farmers/Male/Walk_Side.png?v=4',
    male_walk_side_mask:   '@custom_assets/Farmers/Male/Walk_Side_Mask.png?v=4',
    male_hoe:              '@custom_assets/Farmers/Male/Hoe.png?v=4',
    male_hoe_mask:         '@custom_assets/Farmers/Male/Hoe_Mask.png?v=4',
    male_axe:              '@custom_assets/Farmers/Male/Axe.png?v=4',
    male_axe_mask:         '@custom_assets/Farmers/Male/Axe_Mask.png?v=4',
    male_water:            '@custom_assets/Farmers/Male/Water.png?v=4',
    male_water_mask:       '@custom_assets/Farmers/Male/Water_Mask.png?v=4',
    male_fish:             '@custom_assets/Farmers/Male/Fish.png?v=4',
    male_fish_mask:        '@custom_assets/Farmers/Male/Fish_Mask.png?v=4',
    male_sword:            '@custom_assets/Farmers/Male/Sword.png?v=4',
    male_sword_mask:       '@custom_assets/Farmers/Male/Sword_Mask.png?v=4',
    male_bow:              '@custom_assets/Farmers/Male/Bow.png?v=4',
    male_bow_mask:         '@custom_assets/Farmers/Male/Bow_Mask.png?v=4',

    female_walk_down:      '@custom_assets/Farmers/Female/Walk_Down.png?v=4',
    female_walk_down_mask: '@custom_assets/Farmers/Female/Walk_Down_Mask.png?v=4',
    female_walk_up:        '@custom_assets/Farmers/Female/Walk_Up.png?v=4',
    female_walk_up_mask:   '@custom_assets/Farmers/Female/Walk_Up_Mask.png?v=4',
    female_walk_side:      '@custom_assets/Farmers/Female/Walk_Side.png?v=4',
    female_walk_side_mask: '@custom_assets/Farmers/Female/Walk_Side_Mask.png?v=4',
    female_hoe:            '@custom_assets/Farmers/Female/Hoe.png?v=4',
    female_hoe_mask:       '@custom_assets/Farmers/Female/Hoe_Mask.png?v=4',
    female_axe:            '@custom_assets/Farmers/Female/Axe.png?v=4',
    female_axe_mask:       '@custom_assets/Farmers/Female/Axe_Mask.png?v=4',
    female_water:          '@custom_assets/Farmers/Female/Water.png?v=4',
    female_water_mask:     '@custom_assets/Farmers/Female/Water_Mask.png?v=4',
    female_fish:           '@custom_assets/Farmers/Female/Fish.png?v=4',
    female_fish_mask:      '@custom_assets/Farmers/Female/Fish_Mask.png?v=4',
    female_sword:          '@custom_assets/Farmers/Female/Sword.png?v=4',
    female_sword_mask:     '@custom_assets/Farmers/Female/Sword_Mask.png?v=4',
    female_bow:            '@custom_assets/Farmers/Female/Bow.png?v=4',
    female_bow_mask:       '@custom_assets/Farmers/Female/Bow_Mask.png?v=4',
  };

  // Cozy Web Audio Synth SFX
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

      if (type === 'hoe') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);
      } else if (type === 'plant') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.setValueAtTime(480, now + 0.045);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === 'harvest') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(700, now + 0.05);
        osc.frequency.setValueAtTime(920, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === 'chop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(62, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now); osc.stop(now + 0.09);
      } else if (type === 'mine') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(780, now);
        osc.frequency.setValueAtTime(1120, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'heart') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'morning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1);
        osc.frequency.setValueAtTime(659, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now); osc.stop(now + 0.55);
      }
    }
  }

  // DOM References
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const previewCanvas = document.getElementById('creator-preview');
  const previewCtx = previewCanvas.getContext('2d');
  const hudAvatarCanvas = document.getElementById('hud-avatar');
  const hudAvatarCtx = hudAvatarCanvas.getContext('2d');
  const dialogueAvatarCanvas = document.getElementById('dialogue-avatar');
  const dialogueAvatarCtx = dialogueAvatarCanvas.getContext('2d');

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingFill = document.getElementById('loading-fill');
  const loadingStatus = document.getElementById('loading-status');
  const creatorOverlay = document.getElementById('creator-overlay');
  const bannerToast = document.getElementById('banner-toast');
  const interactHint = document.getElementById('interact-hint');
  const interactText = document.getElementById('interact-text');
  const dialogueBox = document.getElementById('dialogue-box');
  const dialogueName = document.getElementById('dialogue-name');
  const dialogueHearts = document.getElementById('dialogue-hearts');
  const dialogueText = document.getElementById('dialogue-text');
  const dialogueShopBtn = document.getElementById('dialogue-shop-btn');
  const modalDialog = document.getElementById('modal-dialog');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalFooter = document.getElementById('modal-footer');

  const ui = {
    playerName: document.getElementById('hud-player-name'),
    farmName: document.getElementById('hud-farm-name'),
    day: document.getElementById('hud-day'),
    time: document.getElementById('hud-time'),
    gold: document.getElementById('gold-count'),
    wood: document.getElementById('wood-count'),
    ore: document.getElementById('ore-count'),
    harvest: document.getElementById('harvest-count'),
    energyBar: document.getElementById('energy-bar'),
    energyText: document.getElementById('energy-text'),
    waterBadge: document.getElementById('water-badge'),
    activeSeedEmoji: document.getElementById('active-seed-emoji'),
    activeSeedName: document.getElementById('active-seed-name'),
    activeSeedCount: document.getElementById('active-seed-count'),
    soundBtn: document.getElementById('btn-sound'),
    toolBtns: Array.from(document.querySelectorAll('.tool-btn')),
    seedPills: Array.from(document.querySelectorAll('.seed-pill')),
    inputName: document.getElementById('input-player-name'),
    inputFarm: document.getElementById('input-farm-name'),
    customHair: document.getElementById('custom-hair-color'),
    customSkin: document.getElementById('custom-skin-color'),
    customOutfit: document.getElementById('custom-outfit-color'),
    btnStartFarm: document.getElementById('btn-start-farm'),
  };

  const sfx = new SoundFX();
  const images = {};

  // Character appearance (customizable anytime!)
  const appearance = {
    gender: 'male', // 'male' (Ichigo) | 'female' (Nami)
    name: 'Ichigo',
    farmName: 'Kebun Harapan',
    hair: '#f28c28',
    skin: '#f3cba5',
    outfit: '#4697ac',
  };

  // Cached recolored offscreen sprite sheets for all 9 animations
  const ANIM_KEYS = ['walk_down', 'walk_up', 'walk_side', 'hoe', 'axe', 'water', 'fish', 'sword', 'bow'];
  const playerSprites = {};
  let previewPose = 'walk_down';
  let hasStarted = false;

  // Game state
  let mode = 'loading'; // loading | creator | playing | dialogue | modal
  let worldTime = 0;
  let lastTs = 0;
  let toastTimer = 0;
  const keys = new Set();
  const mouse = { sx: 0, sy: 0, wx: 560, wy: 520, tileX: 8, tileY: 8 };

  // Smooth camera following player
  const cam = { x: 0, y: 0, zoom: 1.15 };

  // Stardew Time & Stats
  let day = 1;
  let seasonIdx = 0;
  const SEASONS = ['Musim Semi', 'Musim Panas', 'Musim Gugur'];
  let minuteOfDay = 6 * 60; // 06:00
  let clockAcc = 0;

  let gold = 150;
  let wood = 12;
  let ore = 0;
  let energy = 100;
  let maxEnergy = 100;
  let waterLevel = 16;
  const maxWater = 16;

  let activeTool = 'hoe';
  let activeSeed = 'turnip';

  const seeds = { turnip: 6, strawberry: 2, pumpkin: 0, starflower: 0 };
  const bag = { turnip: 0, strawberry: 0, pumpkin: 0, starflower: 0, wool: 0 };
  const shippedToday = { cropsVal: 0, cropsCount: 0, woolVal: 0, woodVal: 0, oreVal: 0 };

  // Player entity (true 2.5D 4-way movement + dedicated tool/weapon animations!)
  const player = {
    x: 608,
    y: 448,
    speed: 225,
    dir: 'down', // 'down' | 'up' | 'side'
    facing: 1,
    moving: false,
    anim: 'walk_down',
    animT: 0,
    actionTimer: 0,
    actionDur: 0.45,
  };
  let arrows = [];

  // Farm grid map: key `${tx},${ty}` -> { tilled, watered, crop, stage, daysGrown }
  const plots = new Map();
  let trees = [];
  let rocks = [];
  let sheep = [];
  let npcs = [];
  let buildings = [];
  let decorations = [];
  let fxList = [];
  let floats = [];
  let duck = { x: 4.8 * TILE, y: 14.9 * TILE, dir: 1, t: 0 };
  let activeInteract = null;
  let activeNpc = null;

  // Helpers
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  };

  function showToast(msg, dur = 2.4) {
    bannerToast.textContent = msg;
    bannerToast.classList.add('show');
    toastTimer = dur;
  }

  function addFloat(x, y, text, color = '#fff') {
    floats.push({ x, y, text, color, life: 1.05, maxLife: 1.05 });
  }

  function spawnFx(key, x, y, frameW = 64, fps = 14, scale = 1.2) {
    const img = images[key];
    if (!img) return;
    const frames = Math.max(1, Math.round(img.width / frameW));
    fxList.push({ img, x, y, frameW, frameH: img.height, frames, fps, scale, t: 0 });
  }

  // Real-time Pixel-Art Recolorer using our pre-computed Hair/Skin/Outfit Mask PNGs!
  function recolorSheet(baseImg, maskImg, hairHex, skinHex, outfitHex) {
    const w = baseImg.width;
    const h = baseImg.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d', { willReadFrequently: true });
    octx.drawImage(baseImg, 0, 0);

    const mcan = document.createElement('canvas');
    mcan.width = w;
    mcan.height = h;
    const mctx = mcan.getContext('2d', { willReadFrequently: true });
    mctx.drawImage(maskImg, 0, 0);

    const bData = octx.getImageData(0, 0, w, h);
    const mData = mctx.getImageData(0, 0, w, h).data;
    const px = bData.data;

    const [hr, hg, hb] = hexToRgb(hairHex);
    const [sr, sg, sb] = hexToRgb(skinHex);
    const [or, og, ob] = hexToRgb(outfitHex);

    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      const mr = mData[i];     // Hair cel luminance
      const mg = mData[i + 1]; // Skin cel luminance
      const mb = mData[i + 2]; // Outfit cel luminance

      if (mr > 0) {
        const f = mr < 130 ? 0.62 : (mr < 210 ? 0.86 : 1.12);
        const lift = mr > 210 ? 14 : 0;
        px[i]     = clamp(Math.round(hr * f + lift), 0, 255);
        px[i + 1] = clamp(Math.round(hg * f + lift), 0, 255);
        px[i + 2] = clamp(Math.round(hb * f + lift), 0, 255);
      } else if (mg > 0) {
        const f = mg < 190 ? 0.78 : 1.04;
        px[i]     = clamp(Math.round(sr * f), 0, 255);
        px[i + 1] = clamp(Math.round(sg * f), 0, 255);
        px[i + 2] = clamp(Math.round(sb * f), 0, 255);
      } else if (mb > 0) {
        const f = mb < 190 ? 0.72 : 1.06;
        px[i]     = clamp(Math.round(or * f), 0, 255);
        px[i + 1] = clamp(Math.round(og * f), 0, 255);
        px[i + 2] = clamp(Math.round(ob * f), 0, 255);
      }
    }
    octx.putImageData(bData, 0, 0);
    return out;
  }

  function rebuildPlayerSprites() {
    const g = appearance.gender;
    for (const k of ANIM_KEYS) {
      const baseImg = images[`${g}_${k}`];
      const maskImg = images[`${g}_${k}_mask`];
      if (baseImg && maskImg) {
        playerSprites[k] = recolorSheet(baseImg, maskImg, appearance.hair, appearance.skin, appearance.outfit);
      }
    }
    renderHudAvatar();
  }

  function renderHudAvatar() {
    const src = playerSprites.walk_down || playerSprites.walk_side;
    if (!src) return;
    hudAvatarCtx.imageSmoothingEnabled = false;
    hudAvatarCtx.clearRect(0, 0, 44, 44);
    hudAvatarCtx.drawImage(src, 44, 34, 104, 104, 0, 0, 44, 44);
  }

  // Build Character Creator Swatches
  function setupCreatorUI() {
    function buildSwatches(containerId, presets, prop, customInput) {
      const box = document.getElementById(containerId);
      box.innerHTML = '';
      presets.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch' + (appearance[prop].toLowerCase() === p.hex.toLowerCase() ? ' active' : '');
        btn.style.background = p.hex;
        btn.title = p.name;
        btn.dataset.hex = p.hex;
        btn.addEventListener('click', () => {
          appearance[prop] = p.hex;
          customInput.value = p.hex;
          syncCreatorSwatches();
          rebuildPlayerSprites();
          sfx.play('plant');
        });
        box.appendChild(btn);
      });
      customInput.addEventListener('input', (e) => {
        appearance[prop] = e.target.value;
        syncCreatorSwatches();
        rebuildPlayerSprites();
      });
    }

    buildSwatches('hair-swatches', HAIR_PRESETS, 'hair', ui.customHair);
    buildSwatches('skin-swatches', SKIN_PRESETS, 'skin', ui.customSkin);
    buildSwatches('outfit-swatches', OUTFIT_PRESETS, 'outfit', ui.customOutfit);

    document.querySelectorAll('.gender-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newGender = btn.dataset.gender;
        appearance.gender = newGender;
        // Helpful auto-switch default name Ichigo <-> Nami if player hasn't typed a custom name
        const curName = ui.inputName.value.trim();
        if (newGender === 'female' && (curName === '' || curName === 'Ichigo')) {
          ui.inputName.value = 'Nami';
        } else if (newGender === 'male' && (curName === '' || curName === 'Nami')) {
          ui.inputName.value = 'Ichigo';
        }
        appearance.name = ui.inputName.value.trim() || (newGender === 'male' ? 'Ichigo' : 'Nami');
        document.querySelectorAll('.gender-btn').forEach((b) => b.classList.toggle('active', b === btn));
        rebuildPlayerSprites();
        sfx.play('plant');
      });
    });

    document.querySelectorAll('.pose-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        previewPose = btn.dataset.pose;
        document.querySelectorAll('.pose-btn').forEach((b) => b.classList.toggle('active', b === btn));
      });
    });

    document.getElementById('btn-random-look').addEventListener('click', () => {
      appearance.hair = HAIR_PRESETS[Math.floor(Math.random() * HAIR_PRESETS.length)].hex;
      appearance.skin = SKIN_PRESETS[Math.floor(Math.random() * SKIN_PRESETS.length)].hex;
      appearance.outfit = OUTFIT_PRESETS[Math.floor(Math.random() * OUTFIT_PRESETS.length)].hex;
      ui.customHair.value = appearance.hair;
      ui.customSkin.value = appearance.skin;
      ui.customOutfit.value = appearance.outfit;
      syncCreatorSwatches();
      rebuildPlayerSprites();
      sfx.play('harvest');
    });

    ui.btnStartFarm.addEventListener('click', () => {
      appearance.name = ui.inputName.value.trim() || (appearance.gender === 'male' ? 'Ichigo' : 'Nami');
      appearance.farmName = ui.inputFarm.value.trim() || 'Kebun Harapan';
      ui.playerName.textContent = appearance.name;
      ui.farmName.textContent = appearance.farmName;
      creatorOverlay.classList.add('hidden');
      mode = 'playing';
      sfx.ensure();
      if (!hasStarted) {
        hasStarted = true;
        sfx.play('morning');
        showToast(`☀ Selamat datang di ${appearance.farmName}, ${appearance.name}!`, 3.0);
      } else {
        sfx.play('heart');
        showToast('✨ Penampilan karakter diperbarui!', 1.8);
      }
      syncHUD();
    });
  }

  function syncCreatorSwatches() {
    const check = (id, val) => {
      document.querySelectorAll(`#${id} .swatch`).forEach((el) => {
        el.classList.toggle('active', el.dataset.hex.toLowerCase() === val.toLowerCase());
      });
    };
    check('hair-swatches', appearance.hair);
    check('skin-swatches', appearance.skin);
    check('outfit-swatches', appearance.outfit);
  }

  function openWardrobe() {
    ui.inputName.value = appearance.name;
    ui.inputFarm.value = appearance.farmName;
    ui.customHair.value = appearance.hair;
    ui.customSkin.value = appearance.skin;
    ui.customOutfit.value = appearance.outfit;
    document.querySelectorAll('.gender-btn').forEach((b) => b.classList.toggle('active', b.dataset.gender === appearance.gender));
    syncCreatorSwatches();
    ui.btnStartFarm.textContent = hasStarted ? '✓ SIMPAN GAYA' : '🌾 MULAI BERTANI!';
    creatorOverlay.classList.remove('hidden');
    mode = 'creator';
  }

  // World Initialization
  function initWorld() {
    plots.clear();
    // Starter garden plots so the farm immediately looks alive & inviting!
    const starters = [
      [5, 8, 'turnip', 3, true],  // Ready to harvest right away!
      [6, 8, 'turnip', 2, true],
      [7, 8, 'strawberry', 2, true],
      [5, 9, 'turnip', 1, false],
      [6, 9, null, 0, false],
      [7, 9, null, 0, false],
    ];
    for (const [tx, ty, crop, stage, watered] of starters) {
      plots.set(`${tx},${ty}`, { tilled: true, watered, crop, stage });
    }

    // Buildings (with solid collision boxes & interaction points)
    buildings = [
      { id: 'farmhouse', label: 'Rumah Kebun', img: images.house1, x: 9.0 * TILE, y: 5.5 * TILE, scale: 1.0, colW: 112, colH: 76, doorX: 9.0 * TILE, doorY: 6.15 * TILE },
      { id: 'shopHouse', label: 'Toko Benih Desa', img: images.house2, x: 20.5 * TILE, y: 6.2 * TILE, scale: 1.0, colW: 112, colH: 76 },
      { id: 'monastery', label: 'Kuil Lembah', img: images.monastery, x: 24.5 * TILE, y: 6.8 * TILE, scale: 0.85, colW: 130, colH: 88 },
      { id: 'villa',     label: 'Rumah Ranger', img: images.house3, x: 21.0 * TILE, y: 13.0 * TILE, scale: 1.0, colW: 112, colH: 76 },
      { id: 'tower',     label: 'Menara Penjaga', img: images.tower, x: 25.2 * TILE, y: 13.2 * TILE, scale: 0.88, colW: 92, colH: 72 },
    ];

    // Chop-able Forest Trees (regrow after 2 days when chopped!)
    trees = [
      { id: 1, x: 4.5 * TILE,  y: 4.2 * TILE,  img: images.tree1, hp: 3, cutDay: null, phase: 0.2 },
      { id: 2, x: 13.2 * TILE, y: 4.3 * TILE,  img: images.tree2, hp: 3, cutDay: null, phase: 1.1 },
      { id: 3, x: 15.6 * TILE, y: 4.7 * TILE,  img: images.tree1, hp: 3, cutDay: null, phase: 2.0 },
      { id: 4, x: 16.5 * TILE, y: 12.2 * TILE, img: images.tree2, hp: 3, cutDay: null, phase: 0.7 },
      { id: 5, x: 15.4 * TILE, y: 14.8 * TILE, img: images.tree1, hp: 3, cutDay: null, phase: 1.8 },
      { id: 6, x: 11.5 * TILE, y: 15.2 * TILE, img: images.tree2, hp: 3, cutDay: null, phase: 2.5 },
      { id: 7, x: 18.0 * TILE, y: 4.4 * TILE,  img: images.tree1, hp: 3, cutDay: null, phase: 0.5 },
      { id: 8, x: 23.0 * TILE, y: 15.0 * TILE, img: images.tree2, hp: 3, cutDay: null, phase: 1.4 },
    ];

    // Mine-able Gold Ore Stones on north/east ridge!
    rocks = [
      { id: 1, x: 16.4 * TILE, y: 7.4 * TILE,  hp: 3, mined: false },
      { id: 2, x: 17.6 * TILE, y: 8.6 * TILE,  hp: 3, mined: false },
      { id: 3, x: 16.8 * TILE, y: 9.8 * TILE,  hp: 3, mined: false },
      { id: 4, x: 18.2 * TILE, y: 11.0 * TILE, hp: 3, mined: false },
    ];

    // Cute Grazing Sheep (pet them daily for hearts & Wool!)
    sheep = [
      { id: 1, name: 'Moli',  x: 5.5 * TILE, y: 5.3 * TILE, vx: 0, vy: 0, state: 'idle', timer: 2.2, facing: 1, animT: 0, petted: false },
      { id: 2, name: 'Kapas', x: 6.9 * TILE, y: 5.6 * TILE, vx: 0, vy: 0, state: 'idle', timer: 3.0, facing: -1, animT: 1, petted: false },
      { id: 3, name: 'Bubu',  x: 11.4 * TILE, y: 5.4 * TILE, vx: 0, vy: 0, state: 'idle', timer: 1.8, facing: 1, animT: 2, petted: false },
    ];

    // Friendly Village NPCs (Stardew-style hearts & dialogue!)
    npcs = [
      {
        id: 'merchant',
        name: 'Pak Tani (Pedagang)',
        x: 19.6 * TILE, y: 7.8 * TILE,
        img: images.npcPawn, frameW: 192, scale: 0.88, facing: -1,
        hearts: 1, talkedToday: false, isShop: true,
        lines: [
          'Halo petani baru! Lagi cari benih Lobak, Stroberi, Labu Emas, atau Bunga Bintang? Semua segar di tokoku!',
          'Tips: Jangan lupa siram tanaman setiap hari pakai Penyiram (2) biar besok pagi langsung tumbuh besar!',
          'Hasil panenmu bisa langsung dijual di Peti Jual sebelah rumahmu atau langsung di tokoku ya!',
        ],
      },
      {
        id: 'monk',
        name: 'Suhu Alden (Kuil)',
        x: 24.4 * TILE, y: 8.5 * TILE,
        img: images.npcMonk, frameW: 192, scale: 0.88, facing: -1,
        hearts: 1, talkedToday: false, healsEnergy: true,
        lines: [
          'Kedamaian menyertaimu! Udara lembah ini terasa hangat — istirahatkan tenagamu sejenak (+25 Energi!).',
          'Merawat domba dan tanaman dengan sabar adalah sihir paling indah di Tiny Swords Valley.',
          'Jika energimu menipis, makan hasil panenmu atau tidurlah di rumah sebelum larut malam.',
        ],
      },
      {
        id: 'archer',
        name: 'Kira (Penjaga Hutan)',
        x: 20.6 * TILE, y: 14.5 * TILE,
        img: images.npcArcher, frameW: 192, scale: 0.88, facing: -1,
        hearts: 1, talkedToday: false,
        lines: [
          'Hei! Rambutmu keren banget hari ini! Hutan di tengah pulau penuh kayu bagus dan batu emas.',
          'Aku lihat bebek karet di kolam kebunmu makin ceria. Jangan lupa isi ulang penyiram di kolam itu ya!',
          'Stroberi itu favoritku — sekali matang, besok-besoknya bisa dipanen lagi tanpa beli benih baru!',
        ],
      },
      {
        id: 'mage',
        name: 'Merlin (Penyihir Desa)',
        x: 22.8 * TILE, y: 11.2 * TILE,
        img: images.npcMage, frameW: 192, scale: 0.90, facing: -1,
        hearts: 1, talkedToday: false,
        lines: [
          'Ohoho! Bunga Bintang yang kau tanam menyimpan energi bintang — harganya paling mahal di seluruh desa!',
          'Lihat naga biru di tebing timur? Tenang, dia Naga Penjaga yang jinak dan suka bau Labu Emas panggang!',
          'Kalau ingin ganti warna rambut atau baju, klik saja profilmu di pojok kiri atas atau tekan C!',
        ],
      },
      {
        id: 'dragon',
        name: 'Azure (Naga Penjaga)',
        x: 25.8 * TILE, y: 10.6 * TILE,
        img: images.guardianDragon, frameW: 320, scale: 0.68, facing: -1,
        hearts: 2, talkedToday: false,
        lines: [
          '*Grrrr... puuurrr!* (Naga Penjaga mengibas sayap lembut — sepertinya dia menyukai kebunmu!)',
          '*Sniff sniff!* (Azure mengendus aroma tanaman segar dan meniupkan percikan bintang biru kecil!)',
        ],
      },
    ];

    // Decorative bushes & rocks
    decorations = [
      { kind: 'bush', img: images.bush1, x: 3.4 * TILE,  y: 6.2 * TILE,  scale: 0.72, phase: 0.3 },
      { kind: 'bush', img: images.bush2, x: 14.8 * TILE, y: 6.4 * TILE,  scale: 0.72, phase: 1.5 },
      { kind: 'bush', img: images.bush1, x: 8.6 * TILE,  y: 15.2 * TILE, scale: 0.75, phase: 2.1 },
      { kind: 'bush', img: images.bush2, x: 18.6 * TILE, y: 14.8 * TILE, scale: 0.75, phase: 0.8 },
      { kind: 'bush', img: images.bush1, x: 26.2 * TILE, y: 7.5 * TILE,  scale: 0.72, phase: 1.9 },
      { kind: 'rock', img: images.rock1, x: 3.6 * TILE,  y: 12.6 * TILE, scale: 0.82 },
      { kind: 'rock', img: images.rock2, x: 19.0 * TILE, y: 6.0 * TILE,  scale: 0.82 },
    ];
  }

  // Shipping Bin position right next to Farmhouse
  const SHIPPING_BIN = { x: 10.6 * TILE, y: 5.95 * TILE };

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

  // Tile & Collision Helpers
  function isPondTile(tx, ty) {
    return tx >= POND_BOX.x1 && tx <= POND_BOX.x2 && ty >= POND_BOX.y1 && ty <= POND_BOX.y2;
  }

  function isFarmTile(tx, ty) {
    return tx >= FARM_BOX.x1 && tx <= FARM_BOX.x2 && ty >= FARM_BOX.y1 && ty <= FARM_BOX.y2 && !isPondTile(tx, ty);
  }

  function isWalkable(nx, ny) {
    const pad = 22;
    if (nx < ISLAND.x1 * TILE + 26 || nx > (ISLAND.x2 + 1) * TILE - 26) return false;
    if (ny < ISLAND.y1 * TILE + 36 || ny > (ISLAND.y2 + 1) * TILE - 18) return false;

    // Pond water collision
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);
    if (isPondTile(tx, ty)) return false;

    // Buildings collision
    for (const b of buildings) {
      if (Math.abs(nx - b.x) < b.colW * 0.5 + pad * 0.4 && ny > b.y - b.colH * 0.72 && ny < b.y + 12) {
        return false;
      }
    }
    // Uncut trees
    for (const t of trees) {
      if (t.cutDay === null && dist(nx, ny, t.x, t.y) < 28) return false;
    }
    // Unmined gold stones
    for (const r of rocks) {
      if (!r.mined && dist(nx, ny, r.x, r.y) < 30) return false;
    }
    return true;
  }

  // Tool & Farming Actions
  function consumeEnergy(cost) {
    if (energy < cost) {
      showToast('⚡ Energi habis! Makan buah atau tidur di rumah (T).', 2.2);
      return false;
    }
    energy = Math.max(0, energy - cost);
    return true;
  }

  function getTargetTile(useMouse) {
    if (useMouse) {
      const tx = Math.floor(mouse.wx / TILE);
      const ty = Math.floor(mouse.wy / TILE);
      // Only allow clicking within generous 2.2-tile reach of player; otherwise step toward player's facing tile
      if (dist(player.x, player.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE) <= TILE * 2.35) {
        if (Math.abs(mouse.wx - player.x) > 8) player.facing = mouse.wx >= player.x ? 1 : -1;
        return { tx, ty, wx: (tx + 0.5) * TILE, wy: (ty + 0.5) * TILE };
      }
    }
    const tx = Math.floor((player.x + player.facing * 42) / TILE);
    const ty = Math.floor((player.y + 6) / TILE);
    return { tx, ty, wx: (tx + 0.5) * TILE, wy: (ty + 0.5) * TILE };
  }

  function triggerToolAction(useMouse = false) {
    if (mode !== 'playing' || player.actionTimer > 0) return;
    const target = getTargetTile(useMouse);
    const key = `${target.tx},${target.ty}`;

    // Map active tool to its dedicated custom 2.5D hand-drawn animation!
    const animMap = {
      hoe: 'hoe',
      seed: 'hoe',
      water: 'water',
      axe: 'axe',
      pickaxe: 'hoe',
      fish: 'fish',
      sword: 'sword',
      bow: 'bow',
      hand: 'hoe',
    };
    player.actionDur = activeTool === 'fish' ? 0.85 : activeTool === 'water' ? 0.52 : 0.44;
    player.actionTimer = player.actionDur;
    player.anim = animMap[activeTool] || 'hoe';
    player.animT = 0;

    if (activeTool === 'fish') {
      const nearWater = isPondTile(target.tx, target.ty)
        || target.tx <= ISLAND.x1 || target.tx >= ISLAND.x2
        || target.ty <= ISLAND.y1 || target.ty >= ISLAND.y2
        || dist(player.x, player.y, 4.8 * TILE, 14.6 * TILE) < 165;
      if (!nearWater) {
        showToast('🎣 Pergi ke tepi Kolam Bebek atau Pantai untuk memancing!', 2.0);
        sfx.play('water');
        return;
      }
      if (!consumeEnergy(3)) return;
      spawnFx('waterSplash', player.x + player.facing * 56, player.y + 8, 192, 14, 0.55);
      sfx.play('water');
      const roll = Math.random();
      const catchItem = roll < 0.18
        ? { name: 'Ikan Bintang 🌟', val: 120 }
        : roll < 0.55
        ? { name: 'Ikan Lembah 🐠', val: 65 }
        : { name: 'Ikan Mas 🐟', val: 45 };
      gold += catchItem.val;
      shippedToday.cropsVal += catchItem.val;
      shippedToday.cropsCount++;
      addFloat(player.x + player.facing * 30, player.y - 52, `🎣 ${catchItem.name} +${catchItem.val}g!`, '#7ee8ff');
      sfx.play('coin');
      syncHUD();
      return;
    }

    if (activeTool === 'sword') {
      sfx.play('chop');
      spawnFx('dust', player.x + player.facing * 42, player.y, 64, 16, 1.0);
      addFloat(player.x + player.facing * 36, player.y - 44, '⚔ SLASH!', '#d4edc2');
      // Fun bonus: sword can also clear trees/bushes or harvest ripe crops in front!
      tryHarvestPlot(key, target.wx, target.wy);
      syncHUD();
      return;
    }

    if (activeTool === 'bow') {
      const ang = useMouse ? Math.atan2(mouse.wy - (player.y - 26), mouse.wx - player.x) : (player.facing > 0 ? 0 : Math.PI);
      arrows.push({
        x: player.x + Math.cos(ang) * 26,
        y: player.y - 26 + Math.sin(ang) * 16,
        vx: Math.cos(ang) * 520,
        vy: Math.sin(ang) * 520,
        ang,
        life: 1.1,
      });
      sfx.play('plant');
      addFloat(player.x + player.facing * 26, player.y - 48, '🏹 Panah!', '#ffe66d');
      syncHUD();
      return;
    }

    if (activeTool === 'hoe') {
      if (!isFarmTile(target.tx, target.ty)) {
        showToast('Cangkul hanya bisa di petak tanah kebun!', 1.5);
        sfx.play('hoe');
        return;
      }
      const existing = plots.get(key);
      if (existing && existing.tilled) {
        showToast('Tanah ini sudah dicangkul — tanam benih (3) atau siram (2)!', 1.6);
        return;
      }
      if (!consumeEnergy(2)) return;
      plots.set(key, { tilled: true, watered: false, crop: null, stage: 0 });
      spawnFx('dust', target.wx, target.wy, 64, 15, 1.1);
      addFloat(target.wx, target.wy - 22, 'Digarap!', '#e8c488');
      sfx.play('hoe');
    } else if (activeTool === 'water') {
      // Check refill at pond or outer shoreline!
      const nearWater = isPondTile(target.tx, target.ty)
        || target.tx <= ISLAND.x1 || target.tx >= ISLAND.x2
        || target.ty <= ISLAND.y1 || target.ty >= ISLAND.y2
        || dist(player.x, player.y, 4.8 * TILE, 14.6 * TILE) < 150;
      if (nearWater && !isFarmTile(target.tx, target.ty)) {
        waterLevel = maxWater;
        spawnFx('waterSplash', target.wx, target.wy, 192, 16, 0.55);
        addFloat(player.x, player.y - 54, '💧 Penyiram Penuh!', '#7ee8ff');
        sfx.play('water');
        syncHUD();
        return;
      }
      if (waterLevel <= 0) {
        showToast('💧 Air habis! Isi ulang di kolam bebek atau tepi pantai.', 2.0);
        return;
      }
      const plot = plots.get(key);
      if (!plot || !plot.tilled) {
        showToast('Cangkul tanahnya dulu (1) sebelum menyiram!', 1.5);
        return;
      }
      if (!consumeEnergy(1)) return;
      waterLevel--;
      plot.watered = true;
      spawnFx('waterSplash', target.wx, target.wy, 192, 18, 0.45);
      addFloat(target.wx, target.wy - 22, '💧 Basah', '#7ee8ff');
      sfx.play('water');
    } else if (activeTool === 'seed') {
      const plot = plots.get(key);
      if (!plot || !plot.tilled) {
        showToast('Cangkul rumput dulu (1) baru tanam benih!', 1.6);
        return;
      }
      if (plot.crop) {
        showToast('Petak ini sudah ada tanamannya!', 1.4);
        return;
      }
      if (seeds[activeSeed] <= 0) {
        showToast(`Benih ${CROPS[activeSeed].name} habis! Beli di Toko Desa (B).`, 1.9);
        return;
      }
      seeds[activeSeed]--;
      plot.crop = activeSeed;
      plot.stage = 0;
      spawnFx('dust', target.wx, target.wy, 64, 16, 0.85);
      addFloat(target.wx, target.wy - 22, `${CROPS[activeSeed].emoji} Ditanam!`, '#b8f576');
      sfx.play('plant');
    } else if (activeTool === 'axe') {
      // Find nearest tree within reach
      let hitTree = null;
      for (const t of trees) {
        if (t.cutDay !== null) continue;
        if (dist(player.x, player.y, t.x, t.y) < 115 || dist(target.wx, target.wy, t.x, t.y) < 75) {
          hitTree = t;
          break;
        }
      }
      if (!hitTree) {
        sfx.play('chop');
        return;
      }
      if (!consumeEnergy(4)) return;
      hitTree.hp--;
      spawnFx('dust', hitTree.x, hitTree.y - 20, 64, 16, 1.2);
      sfx.play('chop');
      if (hitTree.hp <= 0) {
        hitTree.cutDay = day;
        wood += 4;
        addFloat(hitTree.x, hitTree.y - 54, '+4 Kayu 🪵', '#f5d28c');
        sfx.play('harvest');
      } else {
        addFloat(hitTree.x, hitTree.y - 46, `Tebang (${3 - hitTree.hp}/3)`, '#fff');
      }
    } else if (activeTool === 'pickaxe') {
      let hitRock = null;
      for (const r of rocks) {
        if (r.mined) continue;
        if (dist(player.x, player.y, r.x, r.y) < 115 || dist(target.wx, target.wy, r.x, r.y) < 70) {
          hitRock = r;
          break;
        }
      }
      if (!hitRock) {
        sfx.play('mine');
        return;
      }
      if (!consumeEnergy(5)) return;
      hitRock.hp--;
      spawnFx('dust', hitRock.x, hitRock.y - 10, 64, 16, 1.1);
      sfx.play('mine');
      if (hitRock.hp <= 0) {
        hitRock.mined = true;
        ore += 2;
        addFloat(hitRock.x, hitRock.y - 44, '+2 Bijih Emas ⛏', '#ffd93d');
        sfx.play('coin');
      } else {
        addFloat(hitRock.x, hitRock.y - 36, `Tambang (${3 - hitRock.hp}/3)`, '#ffd93d');
      }
    } else if (activeTool === 'hand') {
      // Harvest ripe crop on target tile, OR interact with nearby sheep/NPC/bin!
      if (!tryHarvestPlot(key, target.wx, target.wy)) {
        triggerContextInteract();
      }
    }
    syncHUD();
  }

  function tryHarvestPlot(key, wx, wy) {
    const plot = plots.get(key);
    if (!plot || !plot.crop) return false;
    const spec = CROPS[plot.crop];
    if (plot.stage < spec.days) return false;

    bag[plot.crop]++;
    addFloat(wx, wy - 28, `+1 ${spec.emoji} ${spec.name}!`, '#ffe66d');
    spawnFx('dust', wx, wy, 64, 15, 0.9);
    sfx.play('harvest');

    if (spec.regrow) {
      plot.stage = Math.max(1, spec.days - 1); // Strawberry regrows!
    } else {
      plot.crop = null;
      plot.stage = 0;
    }
    syncHUD();
    return true;
  }

  function findNearestInteractable() {
    // 1. Ripe crop right under/near player
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = `${ptx + dx},${pty + dy}`;
        const p = plots.get(k);
        if (p && p.crop && p.stage >= CROPS[p.crop].days) {
          const cx = (ptx + dx + 0.5) * TILE;
          const cy = (pty + dy + 0.5) * TILE;
          if (dist(player.x, player.y, cx, cy) < 86) {
            return { type: 'harvest', key: k, x: cx, y: cy, label: `Panen ${CROPS[p.crop].emoji} ${CROPS[p.crop].name}` };
          }
        }
      }
    }

    // 2. Farmhouse Door -> Sleep
    const fh = buildings[0];
    if (dist(player.x, player.y, fh.doorX, fh.doorY) < 88) {
      return { type: 'sleep', x: fh.doorX, y: fh.doorY, label: 'Tidur di Rumah (Ganti Hari)' };
    }

    // 3. Shipping Bin -> Sell All Harvests
    if (dist(player.x, player.y, SHIPPING_BIN.x, SHIPPING_BIN.y) < 84) {
      return { type: 'bin', x: SHIPPING_BIN.x, y: SHIPPING_BIN.y, label: 'Masukkan Panen ke Peti Jual' };
    }

    // 4. Village NPCs
    for (const n of npcs) {
      if (dist(player.x, player.y, n.x, n.y) < 96) {
        return { type: 'npc', npc: n, x: n.x, y: n.y, label: `Bicara dengan ${n.name}` };
      }
    }

    // 5. Sheep -> Pet
    for (const s of sheep) {
      if (dist(player.x, player.y, s.x, s.y) < 78) {
        return { type: 'sheep', sheep: s, x: s.x, y: s.y, label: `Elus Domba ${s.name}` };
      }
    }
    return null;
  }

  function triggerContextInteract() {
    const it = findNearestInteractable();
    if (!it) return;

    if (it.type === 'harvest') {
      tryHarvestPlot(it.key, it.x, it.y);
    } else if (it.type === 'sleep') {
      sleepAndAdvanceDay();
    } else if (it.type === 'bin') {
      shipAllFromBag();
    } else if (it.type === 'sheep') {
      const s = it.sheep;
      sfx.play('heart');
      if (!s.petted) {
        s.petted = true;
        bag.wool++;
        addFloat(s.x, s.y - 42, '♥ +1 Wol Domba!', '#ff9eb5');
        showToast(`🐑 ${s.name} senang sekali! Kamu dapat +1 Wol (35g).`, 2.0);
      } else {
        addFloat(s.x, s.y - 42, '♥ Mbeee~', '#ff9eb5');
      }
      syncHUD();
    } else if (it.type === 'npc') {
      openDialogue(it.npc);
    }
  }

  function shipAllFromBag() {
    let totalVal = 0;
    let totalItems = 0;
    for (const id of SEED_ORDER) {
      if (bag[id] > 0) {
        totalVal += bag[id] * CROPS[id].sellPrice;
        totalItems += bag[id];
        shippedToday.cropsCount += bag[id];
        shippedToday.cropsVal += bag[id] * CROPS[id].sellPrice;
        bag[id] = 0;
      }
    }
    if (bag.wool > 0) {
      totalVal += bag.wool * 35;
      totalItems += bag.wool;
      shippedToday.woolVal += bag.wool * 35;
      bag.wool = 0;
    }
    if (totalItems === 0) {
      showToast('Tas panen kosong! Panen tanaman atau elus domba dulu ya.', 1.8);
      return;
    }
    gold += totalVal;
    sfx.play('coin');
    addFloat(SHIPPING_BIN.x, SHIPPING_BIN.y - 36, `+${totalVal}g!`, '#ffd93d');
    showToast(`💰 Terjual ${totalItems} hasil kebun seharga +${totalVal}g!`, 2.4);
    syncHUD();
  }

  // NPC Dialogue
  function openDialogue(npc) {
    activeNpc = npc;
    mode = 'dialogue';
    if (!npc.talkedToday) {
      npc.talkedToday = true;
      npc.hearts = Math.min(5, npc.hearts + 1);
      if (npc.healsEnergy) {
        energy = Math.min(maxEnergy, energy + 25);
        addFloat(player.x, player.y - 54, '+25 ⚡ Energi!', '#8ce352');
      }
      sfx.play('heart');
    }
    dialogueName.textContent = npc.name;
    dialogueHearts.textContent = '♥ '.repeat(npc.hearts) + '♡ '.repeat(5 - npc.hearts);
    const line = npc.lines[(day + npc.hearts) % npc.lines.length];
    dialogueText.textContent = line;
    dialogueShopBtn.classList.toggle('hidden', !npc.isShop);

    // Draw crisp NPC portrait into dialogue canvas
    dialogueAvatarCtx.imageSmoothingEnabled = false;
    dialogueAvatarCtx.clearRect(0, 0, 76, 76);
    if (npc.img) {
      const fw = npc.frameW;
      const pad = fw === 320 ? 48 : 38;
      dialogueAvatarCtx.drawImage(npc.img, pad, pad - 12, fw - pad * 2, fw - pad * 2, 0, 0, 76, 76);
    }

    dialogueBox.classList.remove('hidden');
    syncHUD();
  }

  function closeDialogue() {
    dialogueBox.classList.add('hidden');
    activeNpc = null;
    if (mode === 'dialogue') mode = 'playing';
  }

  // Village Shop Modal
  function openShopModal() {
    closeDialogue();
    mode = 'modal';
    modalTitle.textContent = '🛒 Toko Desa — Pak Tani';
    renderShopBody();
    modalFooter.innerHTML = `<button id="shop-done-btn" class="primary-btn" type="button">Selesai Belanja</button>`;
    document.getElementById('shop-done-btn').addEventListener('click', closeModal);
    modalDialog.showModal();
  }

  function renderShopBody() {
    let html = '';
    // Buy seeds
    for (const id of SEED_ORDER) {
      const c = CROPS[id];
      html += `
        <div class="shop-row">
          <div class="shop-info">
            <span class="shop-title">${c.emoji} Benih ${c.name} <small>(Stok: ${seeds[id]})</small></span>
            <span class="shop-sub">Tumbuh ${c.days} hari${c.regrow ? ' • Panen berulang!' : ''} • Harga jual ${c.sellPrice}g</span>
          </div>
          <button class="shop-buy-btn" data-buy="${id}" type="button" ${gold < c.seedCost ? 'disabled' : ''}>Beli ${c.seedCost}g</button>
        </div>
      `;
    }

    // Energy Snack
    html += `
      <div class="shop-row">
        <div class="shop-info">
          <span class="shop-title">🍎 Pai Apel Desa</span>
          <span class="shop-sub">Pulihkan +50 Energi langsung (Energi: ${energy}/${maxEnergy})</span>
        </div>
        <button class="shop-buy-btn" data-buy="pie" type="button" ${gold < 25 || energy >= maxEnergy ? 'disabled' : ''}>Beli 25g</button>
      </div>
    `;

    // Quick Sell Harvests + Wood/Ore
    const totalHarvestCount = SEED_ORDER.reduce((s, id) => s + bag[id], 0) + bag.wool;
    const totalHarvestVal = SEED_ORDER.reduce((s, id) => s + bag[id] * CROPS[id].sellPrice, 0) + bag.wool * 35;
    html += `
      <div class="shop-row">
        <div class="shop-info">
          <span class="shop-title">🧺 Jual Semua Hasil Panen &amp; Wol (${totalHarvestCount} item)</span>
          <span class="shop-sub">Total nilai jual: ${totalHarvestVal}g</span>
        </div>
        <button class="shop-buy-btn shop-sell-btn" data-sell="harvest" type="button" ${totalHarvestCount === 0 ? 'disabled' : ''}>Jual +${totalHarvestVal}g</button>
      </div>
      <div class="shop-row">
        <div class="shop-info">
          <span class="shop-title">⛏ Jual Kayu (${wood} × 5g) &amp; Bijih Emas (${ore} × 35g)</span>
          <span class="shop-sub">Total nilai bahan tambang &amp; hutan: ${wood * 5 + ore * 35}g</span>
        </div>
        <button class="shop-buy-btn shop-sell-btn" data-sell="materials" type="button" ${(wood + ore) === 0 ? 'disabled' : ''}>Jual +${wood * 5 + ore * 35}g</button>
      </div>
    `;

    modalContent.innerHTML = html;

    modalContent.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.buy;
        if (id === 'pie') {
          if (gold < 25) return;
          gold -= 25;
          energy = Math.min(maxEnergy, energy + 50);
          sfx.play('heart');
        } else {
          const cost = CROPS[id].seedCost;
          if (gold < cost) return;
          gold -= cost;
          seeds[id]++;
          activeSeed = id;
          sfx.play('coin');
        }
        syncHUD();
        renderShopBody();
      });
    });

    modalContent.querySelectorAll('[data-sell]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.sell === 'harvest') {
          shipAllFromBag();
        } else {
          const val = wood * 5 + ore * 35;
          if (val <= 0) return;
          shippedToday.woodVal += wood * 5;
          shippedToday.oreVal += ore * 35;
          gold += val;
          wood = 0;
          ore = 0;
          sfx.play('coin');
          showToast(`💰 Kayu & Bijih Emas terjual +${val}g!`, 2.0);
          syncHUD();
        }
        renderShopBody();
      });
    });
  }

  // Sleep & Advance to Next Day (Stardew Overnight Growth!)
  function sleepAndAdvanceDay() {
    closeDialogue();
    mode = 'modal';

    // Grow all watered crops overnight!
    let grownCount = 0;
    let ripeNow = 0;
    for (const plot of plots.values()) {
      if (plot.crop && plot.watered) {
        const spec = CROPS[plot.crop];
        if (plot.stage < spec.days) {
          plot.stage++;
          grownCount++;
          if (plot.stage >= spec.days) ripeNow++;
        }
      }
      plot.watered = false; // Morning soil dries fresh
    }

    // Regrow trees cut 2+ days ago & respawn gold stones
    for (const t of trees) {
      if (t.cutDay !== null && day - t.cutDay >= 2) {
        t.cutDay = null;
        t.hp = 3;
      }
    }
    for (const r of rocks) {
      r.mined = false;
      r.hp = 3;
    }
    for (const s of sheep) s.petted = false;
    for (const n of npcs) n.talkedToday = false;

    // Auto-ship any bag items? Keep bag items optional, show today's earnings!
    const totalEarned = shippedToday.cropsVal + shippedToday.woolVal + shippedToday.woodVal + shippedToday.oreVal;
    const finishedDay = day;

    day++;
    if (day % 15 === 1 && day > 1) seasonIdx = (seasonIdx + 1) % SEASONS.length;
    minuteOfDay = 6 * 60;
    energy = maxEnergy;
    player.x = buildings[0].doorX;
    player.y = buildings[0].doorY + 26;

    modalTitle.textContent = `🌙 Laporan Hari ke-${finishedDay}`;
    modalContent.innerHTML = `
      <div class="summary-grid">
        <span>Hasil Panen Terjual (${shippedToday.cropsCount})</span><span>+${shippedToday.cropsVal}g</span>
        <span>Wol Domba Terjual</span><span>+${shippedToday.woolVal}g</span>
        <span>Kayu &amp; Bijih Emas</span><span>+${shippedToday.woodVal + shippedToday.oreVal}g</span>
        <span>Tanaman Tumbuh Semalam</span><span>🌱 ${grownCount} petak${ripeNow ? ` (${ripeNow} siap panen!)` : ''}</span>
        <span class="summary-total">Total Pendapatan Hari Ini</span><span class="summary-total">+${totalEarned}g</span>
      </div>
      <p style="text-align:center;font-weight:700;color:#5c381e;">Energi pulih penuh 100/100 ⚡ — Selamat pagi di Hari ke-${day}!</p>
    `;

    // Reset daily ledger
    shippedToday.cropsVal = 0;
    shippedToday.cropsCount = 0;
    shippedToday.woolVal = 0;
    shippedToday.woodVal = 0;
    shippedToday.oreVal = 0;

    modalFooter.innerHTML = `<button id="wake-btn" class="primary-btn" type="button">☀ Bangun Pagi (Hari ${day})</button>`;
    document.getElementById('wake-btn').addEventListener('click', () => {
      closeModal();
      sfx.play('morning');
      showToast(`☀ Hari ${day} — ${SEASONS[seasonIdx]}!`, 2.4);
    });
    modalDialog.showModal();
    syncHUD();
  }

  function openHelpModal() {
    closeDialogue();
    mode = 'modal';
    modalTitle.textContent = '📖 Panduan Tiny Swords Valley';
    modalContent.innerHTML = `
      <p><strong>Gerak &amp; Aksi:</strong> Gunakan <kbd>WASD</kbd> / Panah untuk berjalan, <kbd>Klik Kiri</kbd> atau <kbd>Space</kbd> memakai alat aktif, dan <kbd>E</kbd> untuk interaksi (panen, elus domba, obrol NPC, jual panen, tidur).</p>
      <p><strong>Cara Bertani:</strong><br>
      1. Pilih <strong>Cangkul (1)</strong> lalu klik petak kebun untuk menggarap tanah.<br>
      2. Pilih <strong>Benih (3)</strong> (tekan <kbd>Q</kbd> ganti jenis benih) untuk menanam.<br>
      3. Pilih <strong>Siram (2)</strong> agar tanaman tumbuh saat kamu tidur! (Isi ulang air di kolam bebek).<br>
      4. Tekan <kbd>T</kbd> atau klik pintu Rumah Biru untuk <strong>Tidur &amp; Ganti Hari</strong>.<br>
      5. Panen tanaman matang dengan <kbd>E</kbd> atau <strong>Panen (6)</strong>, lalu jual di Peti Jual atau <strong>Toko Desa (B)</strong>!</p>
      <p><strong>Custom Karakter:</strong> Klik avatar di pojok kiri atas (atau tekan <kbd>C</kbd>) kapan saja untuk ganti <strong>Pemuda (Ichigo) / Perempuan (Nami)</strong>, <strong>Warna Rambut</strong>, <strong>Warna Kulit</strong>, dan <strong>Warna Baju</strong>!</p>
    `;
    modalFooter.innerHTML = `<button id="help-ok" class="primary-btn" type="button">Mengerti!</button>`;
    document.getElementById('help-ok').addEventListener('click', closeModal);
    modalDialog.showModal();
  }

  function closeModal() {
    if (modalDialog.open) modalDialog.close();
    if (mode === 'modal') mode = 'playing';
  }

  // Update Loop
  function update(dt) {
    worldTime += dt;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) bannerToast.classList.remove('show');
    }

    // Always animate pond duck & creator preview
    duck.t += dt;
    duck.x += duck.dir * 16 * dt;
    if (duck.x > 6.1 * TILE) duck.dir = -1;
    if (duck.x < 3.6 * TILE) duck.dir = 1;

    if (mode === 'creator') {
      renderCreatorPreview();
      return;
    }
    if (mode !== 'playing') return;

    // In-game Stardew clock (10 mins every 4.5s)
    clockAcc += dt;
    if (clockAcc >= 4.5) {
      clockAcc -= 4.5;
      minuteOfDay += 10;
      if (minuteOfDay >= 24 * 60) {
        showToast('🌙 Sudah larut malam! Waktunya tidur...', 2.0);
        sleepAndAdvanceDay();
        return;
      }
      syncHUD();
    }

    // Player Movement (True 2.5D Harvest Moon: Grand Bazaar 4-Way Movement!)
    if (player.actionTimer > 0) {
      player.actionTimer = Math.max(0, player.actionTimer - dt);
      player.animT += dt;
    } else {
      let mx = 0, my = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

      player.moving = (mx !== 0 || my !== 0);
      if (player.moving) {
        const len = Math.hypot(mx, my);
        mx /= len; my /= len;
        const nx = player.x + mx * player.speed * dt;
        const ny = player.y + my * player.speed * dt;
        if (isWalkable(nx, player.y)) player.x = nx;
        if (isWalkable(player.x, ny)) player.y = ny;

        // Pick 2.5D facing direction: Up (back view), Down (front view), or Side (left/right profile!)
        if (Math.abs(mx) >= Math.abs(my)) {
          player.dir = 'side';
          player.facing = mx > 0 ? 1 : -1;
        } else {
          player.dir = my < 0 ? 'up' : 'down';
        }
        player.animT += dt;
      } else {
        player.animT = 0;
      }
      player.anim = player.dir === 'up' ? 'walk_up' : player.dir === 'down' ? 'walk_down' : 'walk_side';
    }

    // Update flying hunting arrows
    for (const a of arrows) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
    }
    arrows = arrows.filter((a) => a.life > 0);

    // Update grazing sheep
    for (const s of sheep) {
      s.animT += dt;
      s.timer -= dt;
      if (s.timer <= 0) {
        if (s.state === 'idle') {
          s.state = 'move';
          const ang = Math.random() * Math.PI * 2;
          s.vx = Math.cos(ang) * 28;
          s.vy = Math.sin(ang) * 22;
          s.facing = s.vx >= 0 ? 1 : -1;
          s.timer = 1.2 + Math.random() * 1.5;
        } else {
          s.state = 'idle';
          s.vx = 0; s.vy = 0;
          s.timer = 2.0 + Math.random() * 2.5;
        }
      }
      if (s.state === 'move') {
        const nx = clamp(s.x + s.vx * dt, 4.2 * TILE, 12.6 * TILE);
        const ny = clamp(s.y + s.vy * dt, 4.4 * TILE, 6.4 * TILE);
        if (dist(nx, ny, buildings[0].x, buildings[0].y) > 95) {
          s.x = nx; s.y = ny;
        }
      }
    }

    // FX & Floats
    for (const fx of fxList) fx.t += dt;
    fxList = fxList.filter((fx) => fx.t < fx.frames / fx.fps);
    for (const f of floats) {
      f.y -= 32 * dt;
      f.life -= dt;
    }
    floats = floats.filter((f) => f.life > 0);

    // Context interact hint
    activeInteract = findNearestInteractable();
    if (activeInteract) {
      interactText.textContent = activeInteract.label;
      interactHint.classList.remove('hidden');
    } else {
      interactHint.classList.add('hidden');
    }

    // Smooth camera tracking
    const viewW = canvas.width / cam.zoom;
    const viewH = canvas.height / cam.zoom;
    const targetX = clamp(player.x - viewW * 0.5, 0, Math.max(0, WORLD_W - viewW));
    const targetY = clamp(player.y - viewH * 0.5, 0, Math.max(0, WORLD_H - viewH));
    cam.x += (targetX - cam.x) * Math.min(1, dt * 8);
    cam.y += (targetY - cam.y) * Math.min(1, dt * 8);

    // Update mouse world coords
    mouse.wx = cam.x + mouse.sx / cam.zoom;
    mouse.wy = cam.y + mouse.sy / cam.zoom;
    mouse.tileX = Math.floor(mouse.wx / TILE);
    mouse.tileY = Math.floor(mouse.wy / TILE);
  }

  // Rendering: Creator Live Animated Preview
  function renderCreatorPreview() {
    const sheet = playerSprites[previewPose] || playerSprites.walk_down;
    if (!sheet) return;
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const fps = previewPose === 'fish' ? 5 : 7;
    const frame = Math.floor(worldTime * fps) % 4;
    previewCtx.drawImage(sheet, frame * 192 + 24, 16, 144, 144, 10, 10, 200, 200);
  }

  // Rendering: Pixel-Art Crops (Tiny Swords thick #161c2e outline style!)
  function drawCrop(cx, cy, cropId, stage) {
    const c = CROPS[cropId];
    const ratio = stage / c.days;
    const sway = Math.sin(worldTime * 3.2 + cx * 0.05) * 2.2;
    const ripe = stage >= c.days;

    ctx.save();
    ctx.translate(cx, cy + 12);

    if (stage === 0) {
      // Planted seeds
      ctx.fillStyle = '#161c2e';
      for (const [ox, oy] of [[-10, -4], [6, -8], [-2, 4], [12, 2]]) {
        ctx.fillRect(ox - 1, oy - 1, 6, 6);
        ctx.fillStyle = '#efe1ab';
        ctx.fillRect(ox, oy, 4, 4);
        ctx.fillStyle = '#161c2e';
      }
    } else if (ratio < 0.6) {
      // Cute green sprout
      ctx.fillStyle = '#161c2e';
      ctx.beginPath();
      ctx.ellipse(-6 + sway * 0.3, -10, 8, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(6 + sway * 0.3, -10, 8, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.leaf;
      ctx.beginPath();
      ctx.ellipse(-6 + sway * 0.3, -10, 6, 3.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(6 + sway * 0.3, -10, 6, 3.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (!ripe) {
      // Leafy growing plant
      ctx.fillStyle = '#161c2e';
      ctx.beginPath();
      ctx.ellipse(sway * 0.4, -14, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.leaf;
      ctx.beginPath();
      ctx.ellipse(sway * 0.4, -14, 12.5, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9ee06e';
      ctx.beginPath();
      ctx.ellipse(-3 + sway * 0.4, -17, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // RIPE HARVESTABLE CROP with gentle happy bounce & sparkle!
      const bounce = Math.abs(Math.sin(worldTime * 3.5 + cx * 0.03)) * 3;
      ctx.translate(0, -bounce);

      // Bushy base leaves
      ctx.fillStyle = '#161c2e';
      ctx.beginPath();
      ctx.ellipse(sway * 0.3, -12, 19, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.leaf;
      ctx.beginPath();
      ctx.ellipse(sway * 0.3, -12, 16, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant fruit / flower head
      ctx.fillStyle = '#161c2e';
      ctx.beginPath();
      ctx.ellipse(sway * 0.5, -22, 14, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.color1;
      ctx.beginPath();
      ctx.ellipse(sway * 0.5, -22, 11.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.color2;
      ctx.beginPath();
      ctx.ellipse(-3 + sway * 0.5, -25, 5.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Twinkling ripe harvest star!
      const sp = 0.55 + 0.45 * Math.sin(worldTime * 6 + cx);
      ctx.fillStyle = `rgba(255, 250, 190, ${sp})`;
      ctx.fillRect(10, -37, 4, 10);
      ctx.fillRect(7, -34, 10, 4);
    }

    ctx.restore();
  }

  function drawTerrain() {
    // 1. Ocean Water
    if (images.waterBg) {
      ctx.fillStyle = ctx.createPattern(images.waterBg, 'repeat');
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = '#47a9b8';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // 2. Animated Shoreline Foam
    if (images.waterFoam) {
      const fFrame = Math.floor(worldTime * 7) % 16;
      const sx = fFrame * 192;
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx += 2) {
        ctx.drawImage(images.waterFoam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y1 - 1) * TILE - 22, 192, 192);
        ctx.drawImage(images.waterFoam, sx, 0, 192, 192, gx * TILE - 32, (ISLAND.y2 + 1) * TILE - 24, 192, 192);
      }
      for (let gy = ISLAND.y1; gy <= ISLAND.y2 + 1; gy += 2) {
        ctx.drawImage(images.waterFoam, sx, 0, 192, 192, (ISLAND.x1 - 1) * TILE - 22, gy * TILE - 32, 192, 192);
        ctx.drawImage(images.waterFoam, sx, 0, 192, 192, ISLAND.x2 * TILE - 18, gy * TILE - 32, 192, 192);
      }
    }

    // 3. Lush Grass Island + Southern Cliff
    const tm = images.tilemap;
    if (tm) {
      for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
        const col = gx === ISLAND.x1 ? 5 : gx === ISLAND.x2 ? 7 : 6;
        ctx.drawImage(tm, col * TILE, 4 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 1) * TILE, TILE, TILE);
        ctx.drawImage(tm, col * TILE, 5 * TILE, TILE, TILE, gx * TILE, (ISLAND.y2 + 2) * TILE, TILE, TILE);
      }
      for (let gy = ISLAND.y1; gy <= ISLAND.y2; gy++) {
        for (let gx = ISLAND.x1; gx <= ISLAND.x2; gx++) {
          const col = gx === ISLAND.x1 ? 0 : gx === ISLAND.x2 ? 2 : 1;
          const row = gy === ISLAND.y1 ? 0 : gy === ISLAND.y2 ? 2 : 1;
          ctx.drawImage(tm, col * TILE, row * TILE, TILE, TILE, gx * TILE, gy * TILE, TILE, TILE);
        }
      }
    }

    // 4. Cozy Dirt Paths linking Farmhouse -> Farm -> Village Square
    ctx.fillStyle = 'rgba(182, 146, 92, 0.45)';
    ctx.beginPath();
    ctx.roundRect(8.5 * TILE, 6.0 * TILE, 14.5 * TILE, 1.0 * TILE, 26);
    ctx.roundRect(18.5 * TILE, 6.4 * TILE, 1.3 * TILE, 7.6 * TILE, 26);
    ctx.roundRect(18.8 * TILE, 9.8 * TILE, 6.2 * TILE, 1.2 * TILE, 26);
    ctx.fill();

    // 5. Cozy Farm Pond (south-west) + Swimming Rubber Duck!
    const px = POND_BOX.x1 * TILE;
    const py = POND_BOX.y1 * TILE;
    const pw = (POND_BOX.x2 - POND_BOX.x1 + 1) * TILE;
    const ph = (POND_BOX.y2 - POND_BOX.y1 + 1) * TILE;
    ctx.fillStyle = '#367e91';
    ctx.beginPath();
    ctx.roundRect(px + 6, py + 6, pw - 12, ph - 12, 24);
    ctx.fill();
    ctx.fillStyle = '#53b5c7';
    ctx.beginPath();
    ctx.roundRect(px + 12, py + 12, pw - 24, ph - 24, 20);
    ctx.fill();
    ctx.strokeStyle = '#d4f2e8';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (images.duck) {
      const df = Math.floor(worldTime * 4) % 3;
      ctx.save();
      ctx.translate(duck.x, duck.y);
      ctx.scale(duck.dir, 1);
      ctx.drawImage(images.duck, df * 32, 0, 32, 32, -20, -20, 40, 40);
      ctx.restore();
    }

    // 6. Subtle Wooden Fence framing the Farmable Meadow
    const fx = FARM_BOX.x1 * TILE;
    const fy = FARM_BOX.y1 * TILE;
    const fw = (FARM_BOX.x2 - FARM_BOX.x1 + 1) * TILE;
    const fh = (FARM_BOX.y2 - FARM_BOX.y1 + 1) * TILE;
    ctx.strokeStyle = 'rgba(90, 56, 30, 0.42)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(fx - 4, fy - 4, fw + 8, fh + 8);
    ctx.setLineDash([]);

    // 7. Tilled Soil & Watered Soil Plots
    for (const [k, p] of plots.entries()) {
      const [tx, ty] = k.split(',').map(Number);
      const sx = tx * TILE + 5;
      const sy = ty * TILE + 5;
      const sz = TILE - 10;
      ctx.fillStyle = '#161c2e';
      ctx.beginPath();
      ctx.roundRect(sx - 2, sy - 2, sz + 4, sz + 4, 8);
      ctx.fill();
      ctx.fillStyle = p.watered ? '#573620' : '#9c6e44';
      ctx.beginPath();
      ctx.roundRect(sx, sy, sz, sz, 6);
      ctx.fill();
      // Furrow lines
      ctx.fillStyle = p.watered ? '#3f2413' : '#7a5230';
      ctx.fillRect(sx + 6, sy + 12, sz - 12, 4);
      ctx.fillRect(sx + 6, sy + 26, sz - 12, 4);
      ctx.fillRect(sx + 6, sy + 40, sz - 12, 4);
    }

    // 8. Tile Hover / Target Highlight (Stardew cursor box!)
    if (mode === 'playing' && ['hoe', 'water', 'seed', 'hand'].includes(activeTool)) {
      const target = getTargetTile(true);
      if (isFarmTile(target.tx, target.ty) || (activeTool === 'water' && isPondTile(target.tx, target.ty))) {
        ctx.strokeStyle = activeTool === 'water' ? '#7ee8ff' : '#ffe66d';
        ctx.lineWidth = 3;
        ctx.strokeRect(target.tx * TILE + 3, target.ty * TILE + 3, TILE - 6, TILE - 6);
      }
    }
  }

  function drawShippingBin() {
    const bx = SHIPPING_BIN.x;
    const by = SHIPPING_BIN.y;
    ctx.fillStyle = 'rgba(15, 18, 26, 0.3)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 10, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden chest in Tiny Swords thick-outline style
    ctx.fillStyle = '#161c2e';
    ctx.fillRect(bx - 24, by - 26, 48, 36);
    ctx.fillStyle = '#9c6438';
    ctx.fillRect(bx - 21, by - 23, 42, 30);
    ctx.fillStyle = '#c4864f';
    ctx.fillRect(bx - 21, by - 23, 42, 11);
    ctx.fillStyle = '#161c2e';
    ctx.fillRect(bx - 21, by - 12, 42, 3);
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(bx - 5, by - 15, 10, 10);

    // Floating label
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText('PETI JUAL', bx, by - 32);
    ctx.fillStyle = '#ffe66d';
    ctx.fillText('PETI JUAL', bx, by - 32);
  }

  function drawRenderables() {
    const list = [];

    // Crops (y-sorted)
    for (const [k, p] of plots.entries()) {
      if (!p.crop) continue;
      const [tx, ty] = k.split(',').map(Number);
      const cx = (tx + 0.5) * TILE;
      const cy = (ty + 0.5) * TILE;
      list.push({ y: cy + 8, draw: () => drawCrop(cx, cy, p.crop, p.stage) });
    }

    // Shipping bin
    list.push({ y: SHIPPING_BIN.y + 8, draw: drawShippingBin });

    // Buildings
    for (const b of buildings) {
      if (!b.img) continue;
      list.push({
        y: b.y + 12,
        draw: () => {
          const dw = b.img.width * b.scale;
          const dh = b.img.height * b.scale;
          ctx.drawImage(b.img, b.x - dw * 0.5, b.y - dh * 0.78, dw, dh);

          // Warm cozy evening window glow after 18:00!
          if (minuteOfDay >= 18 * 60) {
            const glow = clamp((minuteOfDay - 18 * 60) / 120, 0, 1) * 0.45;
            const grd = ctx.createRadialGradient(b.x, b.y - 26, 6, b.x, b.y - 26, 95);
            grd.addColorStop(0, `rgba(255, 220, 120, ${glow})`);
            grd.addColorStop(1, 'rgba(255, 180, 60, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(b.x, b.y - 26, 95, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
    }

    // Trees / Stumps
    for (const t of trees) {
      list.push({
        y: t.y + 8,
        draw: () => {
          if (t.cutDay !== null) {
            if (images.stump1) {
              const dw = 192 * 0.72, dh = 256 * 0.72;
              ctx.drawImage(images.stump1, t.x - dw * 0.5, t.y - dh * 0.80, dw, dh);
            }
          } else if (t.img) {
            const fr = Math.floor((worldTime + t.phase) * 5) % 8;
            const dw = 192 * 0.85, dh = t.img.height * 0.85;
            ctx.drawImage(t.img, fr * 192, 0, 192, t.img.height, t.x - dw * 0.5, t.y - dh * 0.82, dw, dh);
          }
        },
      });
    }

    // Gold Ore Rocks
    for (const r of rocks) {
      if (r.mined || !images.goldStone) continue;
      list.push({
        y: r.y + 8,
        draw: () => {
          const dw = 128 * 0.85, dh = 128 * 0.85;
          ctx.drawImage(images.goldStone, r.x - dw * 0.5, r.y - dh * 0.75, dw, dh);
        },
      });
    }

    // Bushes & Decorative Rocks
    for (const d of decorations) {
      if (!d.img) continue;
      list.push({
        y: d.y,
        draw: () => {
          if (d.kind === 'bush') {
            const fr = Math.floor((worldTime + d.phase) * 5) % 8;
            const dw = 128 * d.scale, dh = 128 * d.scale;
            ctx.drawImage(d.img, fr * 128, 0, 128, 128, d.x - dw * 0.5, d.y - dh * 0.65, dw, dh);
          } else {
            const dw = d.img.width * d.scale, dh = d.img.height * d.scale;
            ctx.drawImage(d.img, d.x - dw * 0.5, d.y - dh * 0.75, dw, dh);
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
          ctx.translate(s.x, s.y - 22);
          ctx.scale(s.facing, 1);
          ctx.drawImage(img, fr * 128, 0, 128, 128, -42, -42, 84, 84);
          ctx.restore();
        },
      });
    }

    // Village NPCs
    for (const n of npcs) {
      if (!n.img) continue;
      list.push({
        y: n.y,
        draw: () => {
          const fw = n.frameW;
          const fh = n.img.height;
          const frames = Math.max(1, Math.round(n.img.width / fw));
          const fr = Math.floor(worldTime * (fw === 320 ? 5.5 : 7)) % frames;
          const dw = fw * n.scale;
          const dh = fh * n.scale;
          ctx.save();
          ctx.translate(n.x, n.y - dh * (fw === 320 ? 0.30 : 0.34));
          ctx.scale(n.facing, 1);
          ctx.drawImage(n.img, fr * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
          ctx.restore();

          // Subtle name plate when close
          if (dist(player.x, player.y, n.x, n.y) < 170) {
            ctx.font = '800 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(n.name, n.x, n.y - (fw === 320 ? 115 : 58));
            ctx.fillStyle = '#fff5d1';
            ctx.fillText(n.name, n.x, n.y - (fw === 320 ? 115 : 58));
          }
        },
      });
    }

    // Customized 2.5D Player Farmer (Ichigo-style Male / Nami-style Female — 4-way walk + 6 dedicated tool/combat anims!)
    list.push({
      y: player.y,
      draw: () => {
        const sheet = playerSprites[player.anim] || playerSprites.walk_down;
        if (!sheet) return;
        let fr = 0;
        if (player.actionTimer > 0) {
          const progress = clamp(player.animT / Math.max(0.01, player.actionDur), 0, 0.99);
          fr = Math.floor(progress * 4);
        } else if (player.moving) {
          fr = Math.floor(player.animT * 8.5) % 4;
        }
        const scale = 0.88;
        const dw = 192 * scale;
        const dh = 192 * scale;
        const flip = (player.actionTimer > 0 || player.dir === 'side') ? player.facing : 1;
        ctx.save();
        ctx.translate(player.x, player.y - dh * 0.21);
        ctx.scale(flip, 1);
        ctx.drawImage(sheet, fr * 192, 0, 192, 192, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.restore();
      },
    });

    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();
  }

  function drawDayNightTint() {
    // 06:00..16:30 clear bright day
    // 16:30..19:00 cozy golden-hour sunset
    // 19:00..24:00 twilight night blue
    if (minuteOfDay < 16.5 * 60) return;

    if (minuteOfDay < 19 * 60) {
      const t = (minuteOfDay - 16.5 * 60) / (2.5 * 60);
      ctx.fillStyle = `rgba(235, 130, 45, ${(t * 0.22).toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const t = clamp((minuteOfDay - 19 * 60) / (3.5 * 60), 0, 1);
      ctx.fillStyle = `rgba(18, 28, 66, ${(0.18 + t * 0.34).toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2b5d6c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    drawTerrain();
    drawRenderables();

    // Flying Hunting Arrows
    for (const a of arrows) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.ang);
      if (images.arrow) {
        ctx.drawImage(images.arrow, -22, -22, 44, 44);
      } else {
        ctx.fillStyle = '#ffe66d';
        ctx.fillRect(-10, -2, 20, 4);
      }
      ctx.restore();
    }

    // Particles
    for (const fx of fxList) {
      const fr = Math.min(fx.frames - 1, Math.floor(fx.t * fx.fps));
      const dw = fx.frameW * fx.scale;
      const dh = fx.frameH * fx.scale;
      ctx.drawImage(fx.img, fr * fx.frameW, 0, fx.frameW, fx.frameH, fx.x - dw * 0.5, fx.y - dh * 0.5, dw, dh);
    }

    // Floating Feedback Text
    ctx.textAlign = 'center';
    ctx.font = '800 17px system-ui, sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawDayNightTint();
  }

  function syncHUD() {
    const hrs = Math.floor(minuteOfDay / 60);
    const mins = minuteOfDay % 60;
    const icon = hrs >= 19 ? '🌙' : hrs >= 17 ? '🌇' : '☀';
    ui.day.textContent = `Hari ${day} • ${SEASONS[seasonIdx]}`;
    ui.time.textContent = `${icon} ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    ui.gold.textContent = gold;
    ui.wood.textContent = wood;
    ui.ore.textContent = ore;
    const totalHarvest = SEED_ORDER.reduce((s, id) => s + bag[id], 0) + bag.wool;
    ui.harvest.textContent = totalHarvest;

    ui.energyBar.style.width = `${clamp((energy / maxEnergy) * 100, 0, 100)}%`;
    ui.energyText.textContent = `${energy} / ${maxEnergy}`;
    ui.waterBadge.textContent = `${waterLevel}/${maxWater}`;

    const s = CROPS[activeSeed];
    ui.activeSeedEmoji.textContent = s.emoji;
    ui.activeSeedName.textContent = s.name;
    ui.activeSeedCount.textContent = `x${seeds[activeSeed]}`;

    for (const id of SEED_ORDER) {
      document.getElementById(`seed-${id}`).textContent = seeds[id];
    }

    ui.toolBtns.forEach((b) => b.classList.toggle('active', b.dataset.tool === activeTool));
    ui.seedPills.forEach((b) => b.classList.toggle('active', b.dataset.seed === activeSeed));
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    // Keep crisp cozy Stardew zoom that adapts nicely to viewport width
    cam.zoom = clamp((canvas.width / 1380), 0.85, 1.45);
  }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // Controls & Event Listeners
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('keydown', (e) => {
    // Do not hijack typing inside character name / farm name inputs!
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
    if (e.repeat) return;

    if (mode === 'dialogue') {
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Escape') closeDialogue();
      return;
    }
    if (mode !== 'playing') return;

    if (e.code === 'Digit1') { activeTool = 'hoe'; syncHUD(); }
    else if (e.code === 'Digit2') { activeTool = 'water'; syncHUD(); }
    else if (e.code === 'Digit3') { activeTool = 'seed'; syncHUD(); }
    else if (e.code === 'Digit4') { activeTool = 'axe'; syncHUD(); }
    else if (e.code === 'Digit5') { activeTool = 'pickaxe'; syncHUD(); }
    else if (e.code === 'Digit6') { activeTool = 'fish'; syncHUD(); }
    else if (e.code === 'Digit7') { activeTool = 'sword'; syncHUD(); }
    else if (e.code === 'Digit8') { activeTool = 'bow'; syncHUD(); }
    else if (e.code === 'Digit9') { activeTool = 'hand'; syncHUD(); }
    else if (e.code === 'KeyQ') {
      const idx = (SEED_ORDER.indexOf(activeSeed) + 1) % SEED_ORDER.length;
      activeSeed = SEED_ORDER[idx];
      activeTool = 'seed';
      syncHUD();
    } else if (e.code === 'Space') {
      triggerToolAction(false);
    } else if (e.code === 'KeyE') {
      triggerContextInteract();
    } else if (e.code === 'KeyB') {
      openShopModal();
    } else if (e.code === 'KeyT') {
      sleepAndAdvanceDay();
    } else if (e.code === 'KeyC') {
      openWardrobe();
    } else if (e.code === 'KeyM') {
      toggleSound();
    } else if (e.code === 'KeyH') {
      openHelpModal();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.code));

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    mouse.sx = (e.clientX - rect.left) * dpr;
    mouse.sy = (e.clientY - rect.top) * dpr;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (mode === 'dialogue') { closeDialogue(); return; }
    if (mode !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    mouse.sx = (e.clientX - rect.left) * dpr;
    mouse.sy = (e.clientY - rect.top) * dpr;
    mouse.wx = cam.x + mouse.sx / cam.zoom;
    mouse.wy = cam.y + mouse.sy / cam.zoom;
    if (e.button === 0) triggerToolAction(true);
    else if (e.button === 2) triggerContextInteract();
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  ui.toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      syncHUD();
    });
  });

  ui.seedPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSeed = btn.dataset.seed;
      activeTool = 'seed';
      syncHUD();
    });
  });

  function toggleSound() {
    sfx.muted = !sfx.muted;
    ui.soundBtn.textContent = sfx.muted ? '🔇' : '🔊';
  }

  document.getElementById('btn-wardrobe').addEventListener('click', openWardrobe);
  document.getElementById('btn-shop').addEventListener('click', openShopModal);
  document.getElementById('btn-sleep').addEventListener('click', sleepAndAdvanceDay);
  ui.soundBtn.addEventListener('click', toggleSound);
  document.getElementById('btn-help').addEventListener('click', openHelpModal);
  document.getElementById('modal-close-x').addEventListener('click', closeModal);
  modalDialog.addEventListener('cancel', closeModal);
  document.getElementById('dialogue-close-btn').addEventListener('click', closeDialogue);
  dialogueShopBtn.addEventListener('click', openShopModal);

  // Boot Sequence
  (async function init() {
    resizeCanvas();
    await loadAssets();
    initWorld();
    setupCreatorUI();
    rebuildPlayerSprites();
    syncHUD();
    loadingOverlay.classList.add('hidden');
    openWardrobe();
    requestAnimationFrame(frame);
  })();
})();
