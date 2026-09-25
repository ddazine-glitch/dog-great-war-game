"use strict";

/* ===================== 상수 ===================== */
const CANVAS_W = 960, CANVAS_H = 360, LANE_Y = 250;
const LEFT_BASE_X = 60, RIGHT_BASE_X = CANVAS_W - 60;
const ALLY_SPAWN_X = RIGHT_BASE_X - 35;
const ENEMY_SPAWN_X = LEFT_BASE_X + 35;
const PLAYER_BASE_MAX_HP = 500;
const SAVE_KEY = "doggreatwar_save_v1";

const STAGE_HP_MUL = { 1: 1, 2: 1.6, 3: 2.6 };
const STAGE_ATK_MUL = { 1: 1, 2: 1.5, 3: 2.2 };
const FEEDS_TO_STAGE2 = 3;
const FEEDS_TO_STAGE3 = 8;

const ALLY_TYPES = [
  { id: "hippo",    name: "하마",   emoji: "🦛", cost: 50,  cooldown: 2600, hp: 130, atk: 11, range: 42, atkInterval: 1200, speed: 34 },
  { id: "pig",      name: "돼지",   emoji: "🐷", cost: 35,  cooldown: 1800, hp: 70,  atk: 9,  range: 34, atkInterval: 900,  speed: 46 },
  { id: "kingpig",  name: "왕돼지", emoji: "🐖", cost: 90,  cooldown: 4200, hp: 110, atk: 16, range: 40, atkInterval: 1000, speed: 38 },
  { id: "dog",      name: "강아지", emoji: "🐶", cost: 25,  cooldown: 1400, hp: 46,  atk: 7,  range: 32, atkInterval: 750,  speed: 58 },
  { id: "bulldog",  name: "불독",   emoji: "🐕", cost: 60,  cooldown: 2600, hp: 150, atk: 13, range: 34, atkInterval: 1100, speed: 28 },
  { id: "chicken",  name: "닭다리", emoji: "🍗", cost: 70,  cooldown: 3000, hp: 55,  atk: 22, range: 50, atkInterval: 700,  speed: 40 },
  { id: "guidedog", name: "안내견", emoji: "🦮", cost: 100, cooldown: 4500, hp: 95,  atk: 18, range: 44, atkInterval: 850,  speed: 48 },
];

const FRUITS = [
  { id: "red",    name: "빨강 열매", emoji: "🍎", flavor: "공격력" },
  { id: "orange", name: "주황 열매", emoji: "🍊", flavor: "체력" },
  { id: "yellow", name: "노랑 열매", emoji: "🍋", flavor: "공격속도" },
  { id: "green",  name: "초록 열매", emoji: "🍏", flavor: "이동속도" },
  { id: "purple", name: "보라 열매", emoji: "🍇", flavor: "사거리" },
];

const CAT_DEFS = {
  white:  { name: "흰 고양이",   emoji: "🐱", tier: 1, hp: 42,  atk: 6,  speed: 24, range: 30, atkInterval: 1000 },
  gray:   { name: "회색 고양이", emoji: "🐈", tier: 1, hp: 46,  atk: 6,  speed: 24, range: 30, atkInterval: 1000 },
  black:  { name: "검은 고양이", emoji: "🐈‍⬛", tier: 1, hp: 50,  atk: 7,  speed: 23, range: 30, atkInterval: 1000 },
  armor:  { name: "갑옷 고양이", emoji: "🐱", badge: "🛡️", tier: 2, hp: 100, atk: 10, speed: 20, range: 32, atkInterval: 1000 },
  horn:   { name: "뿔 고양이",   emoji: "🐱", badge: "😈", tier: 2, hp: 90,  atk: 13, speed: 22, range: 32, atkInterval: 950 },
  wing:   { name: "날개 고양이", emoji: "🐱", badge: "🦋", tier: 3, hp: 150, atk: 18, speed: 26, range: 34, atkInterval: 900 },
  energy: { name: "에너지 고양이", emoji: "🐱", badge: "⚡", tier: 3, hp: 160, atk: 20, speed: 24, range: 36, atkInterval: 850 },
  boss:   { name: "보스 고양이", emoji: "🐯", badge: "👑", tier: 4, hp: 2200, atk: 34, speed: 14, range: 44, atkInterval: 850 },
};
const TIER_POOL = {
  1: ["white", "gray", "black"],
  2: ["armor", "horn"],
  3: ["wing", "energy"],
};

const STAGES = (() => {
  const list = [];
  let gi = 0;
  for (let chapter = 1; chapter <= 3; chapter++) {
    for (let s = 1; s <= 3; s++) {
      gi++;
      const pool = chapter === 1 ? [1] : chapter === 2 ? [1, 2] : [1, 2, 3];
      list.push({
        id: `${chapter}-${s}`,
        label: `${chapter}-${s}`,
        chapter, stageNum: s, globalIndex: gi,
        tierPool: pool,
        enemyBaseMaxHp: 260 + gi * 130,
        spawnInterval: Math.max(950, 2500 - gi * 140),
        catStatMul: 1 + (gi - 1) * 0.16,
        moneyPerTick: 4 + gi * 0.4,
        fruitReward: 1 + Math.floor(gi / 2),
        isBoss: false,
      });
    }
  }
  list.push({
    id: "boss", label: "최종 보스", chapter: 4, stageNum: 1, globalIndex: gi + 1,
    tierPool: [1, 2, 3], includeBoss: true,
    enemyBaseMaxHp: 3600, spawnInterval: 1500, catStatMul: 2.1,
    moneyPerTick: 8, fruitReward: 12, isBoss: true,
  });
  return list;
})();

/* ===================== 세이브 데이터 ===================== */
function defaultSave() {
  const allies = {};
  ALLY_TYPES.forEach(t => { allies[t.id] = { stage: 1, feeds: 0, bonus: { atk: 0, hp: 0, atkSpeed: 0, speed: 0, range: 0 } }; });
  return {
    unlockedIndex: 1,
    fruits: { red: 3, orange: 3, yellow: 2, green: 2, purple: 1 },
    allies,
  };
}
let save = loadSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const def = defaultSave();
    return Object.assign(def, parsed, { allies: Object.assign(def.allies, parsed.allies || {}) });
  } catch (e) { return defaultSave(); }
}
function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function getAllyStats(typeId) {
  const base = ALLY_TYPES.find(t => t.id === typeId);
  const prog = save.allies[typeId];
  const maxHp = Math.round(base.hp * STAGE_HP_MUL[prog.stage] + prog.bonus.hp);
  const atk = Math.round(base.atk * STAGE_ATK_MUL[prog.stage] + prog.bonus.atk);
  const atkInterval = Math.max(250, base.atkInterval * (1 - prog.bonus.atkSpeed));
  const speed = base.speed * (1 + prog.bonus.speed);
  const range = base.range + prog.bonus.range;
  return { base, prog, maxHp, atk, atkInterval, speed, range, stage: prog.stage };
}

function feedFruit(typeId, fruitId) {
  if (save.fruits[fruitId] <= 0) return false;
  const prog = save.allies[typeId];
  if (prog.stage >= 3) return false;
  save.fruits[fruitId]--;
  const base = ALLY_TYPES.find(t => t.id === typeId);
  if (fruitId === "red") prog.bonus.atk += base.atk * 0.10;
  else if (fruitId === "orange") prog.bonus.hp += base.hp * 0.12;
  else if (fruitId === "yellow") prog.bonus.atkSpeed = Math.min(0.4, prog.bonus.atkSpeed + 0.05);
  else if (fruitId === "green") prog.bonus.speed += 0.07;
  else if (fruitId === "purple") prog.bonus.range += 3;
  prog.feeds++;
  const threshold = prog.stage === 1 ? FEEDS_TO_STAGE2 : FEEDS_TO_STAGE3;
  if (prog.feeds >= threshold && prog.stage < 3) {
    prog.stage++;
    playSfx("evolve");
  } else {
    playSfx("feed");
  }
  persistSave();
  return true;
}

/* ===================== 오디오 ===================== */
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  } else if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
function tone(freq, dur, type, vol, delay) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + (delay || 0);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol || 0.15, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}
function playSfx(name) {
  if (!audioCtx) return;
  switch (name) {
    case "spawnAlly": tone(500, 0.09, "triangle", 0.12); tone(760, 0.09, "triangle", 0.1, 0.05); break;
    case "spawnEnemy": tone(220, 0.14, "sawtooth", 0.1); break;
    case "hit": tone(180, 0.05, "square", 0.06); break;
    case "death": tone(120, 0.12, "square", 0.08); break;
    case "baseHit": tone(90, 0.2, "sawtooth", 0.12); break;
    case "cannon": tone(80, 0.3, "sawtooth", 0.18); tone(400, 0.15, "square", 0.08, 0.02); break;
    case "click": tone(700, 0.04, "sine", 0.08); break;
    case "noMoney": tone(160, 0.15, "square", 0.1); break;
    case "feed": tone(650, 0.08, "sine", 0.1); break;
    case "evolve": tone(700, 0.1, "sine", 0.14); tone(1000, 0.12, "sine", 0.14, 0.1); tone(1300, 0.16, "sine", 0.14, 0.22); break;
    case "win": tone(660, 0.12, "sine", 0.15); tone(880, 0.12, "sine", 0.15, 0.13); tone(1100, 0.22, "sine", 0.15, 0.26); break;
    case "lose": tone(400, 0.2, "sawtooth", 0.12); tone(300, 0.2, "sawtooth", 0.12, 0.18); tone(200, 0.3, "sawtooth", 0.12, 0.36); break;
  }
}
document.addEventListener("click", unlockAudio, { once: true });

/* ===================== 화면 전환 ===================== */
const screens = {};
document.querySelectorAll(".screen").forEach(el => { screens[el.id] = el; });
function showScreen(id) {
  Object.values(screens).forEach(el => el.classList.remove("active"));
  screens[id].classList.add("active");
}

/* ===================== 스테이지 선택 화면 ===================== */
function renderStageGrid() {
  const grid = document.getElementById("stage-grid");
  grid.innerHTML = "";
  STAGES.forEach(st => {
    const btn = document.createElement("button");
    const unlocked = st.globalIndex <= save.unlockedIndex;
    const cleared = st.globalIndex < save.unlockedIndex;
    btn.className = "stage-btn" + (unlocked ? "" : " locked") + (cleared ? " cleared" : "") + (st.isBoss ? " boss" : "");
    btn.textContent = st.isBoss ? "👑 최종 보스전" : st.label;
    btn.disabled = !unlocked;
    btn.addEventListener("click", () => { playSfx("click"); startStage(st); });
    grid.appendChild(btn);
  });
}

/* ===================== 강화(로스터) 화면 ===================== */
function renderFruitBar() {
  const bar = document.getElementById("fruit-bar");
  bar.innerHTML = "";
  FRUITS.forEach(f => {
    const chip = document.createElement("span");
    chip.className = "fruit-chip";
    chip.textContent = `${f.emoji} ${save.fruits[f.id]}`;
    bar.appendChild(chip);
  });
}
function renderRoster() {
  renderFruitBar();
  const list = document.getElementById("roster-list");
  list.innerHTML = "";
  ALLY_TYPES.forEach(type => {
    const prog = save.allies[type.id];
    const card = document.createElement("div");
    card.className = "roster-card";
    const threshold = prog.stage >= 3 ? FEEDS_TO_STAGE3 : (prog.stage === 1 ? FEEDS_TO_STAGE2 : FEEDS_TO_STAGE3);
    const pct = prog.stage >= 3 ? 100 : Math.min(100, Math.round((prog.feeds / threshold) * 100));
    const badge = prog.stage >= 3 ? "✨" : (prog.stage === 2 ? "🛡️" : "");
    card.innerHTML = `
      <div class="avatar stage-${prog.stage}">${type.emoji}<span class="badge">${badge}</span></div>
      <div class="name">${type.name}</div>
      <div class="stage-tag">${prog.stage}단계${prog.stage >= 3 ? " (최대)" : ""}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="feed-row"></div>
    `;
    const row = card.querySelector(".feed-row");
    FRUITS.forEach(f => {
      const b = document.createElement("button");
      b.className = "feed-btn";
      b.textContent = `${f.emoji}${save.fruits[f.id]}`;
      b.title = f.flavor;
      b.disabled = prog.stage >= 3 || save.fruits[f.id] <= 0;
      b.addEventListener("click", () => {
        if (feedFruit(type.id, f.id)) renderRoster();
      });
      row.appendChild(b);
    });
    list.appendChild(card);
  });
}

/* ===================== 전투 상태 ===================== */
let battle = null;

class Unit {
  constructor(side, x) {
    this.side = side;
    this.x = x;
    this.y = LANE_Y;
    this.atkTimer = 0;
    this.dead = false;
    this.hitFlash = 0;
    this.spawnAnim = 260;
  }
}

function createAlly(typeId) {
  const stats = getAllyStats(typeId);
  const u = new Unit("ally", ALLY_SPAWN_X);
  u.typeId = typeId;
  u.emoji = stats.base.emoji;
  u.name = stats.base.name;
  u.maxHp = stats.maxHp;
  u.hp = stats.maxHp;
  u.atk = stats.atk;
  u.range = stats.range;
  u.speed = stats.speed;
  u.atkInterval = stats.atkInterval;
  u.stage = stats.stage;
  return u;
}

function createEnemy(catId, mul) {
  const def = CAT_DEFS[catId];
  const u = new Unit("enemy", ENEMY_SPAWN_X);
  u.catId = catId;
  u.emoji = def.emoji;
  u.badge = def.badge || "";
  u.name = def.name;
  u.tier = def.tier;
  u.maxHp = Math.round(def.hp * mul);
  u.hp = u.maxHp;
  u.atk = Math.round(def.atk * mul);
  u.range = def.range;
  u.speed = def.speed;
  u.atkInterval = def.atkInterval;
  return u;
}

function startStage(stageDef) {
  battle = {
    stage: stageDef,
    units: [],
    effects: [],
    money: 100,
    enemyBaseHp: stageDef.enemyBaseMaxHp,
    enemyBaseMaxHp: stageDef.enemyBaseMaxHp,
    playerBaseHp: PLAYER_BASE_MAX_HP,
    cooldowns: {},
    spawnTimer: 900,
    cannonCharge: 0,
    cannonMax: 4200,
    over: false,
    lastTime: performance.now(),
  };
  ALLY_TYPES.forEach(t => { battle.cooldowns[t.id] = 0; });
  document.getElementById("stage-label").textContent = stageDef.isBoss ? "최종 보스전" : stageDef.label;
  renderUnitBar();
  showScreen("screen-battle");
  requestAnimationFrame(gameLoop);
}

function pickCatId(stageDef) {
  const pool = [];
  stageDef.tierPool.forEach(tier => pool.push(...TIER_POOL[tier]));
  if (stageDef.includeBoss && Math.random() < 0.12) return "boss";
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ===================== 유닛 버튼 바 ===================== */
function renderUnitBar() {
  const bar = document.getElementById("unit-bar");
  bar.innerHTML = "";
  ALLY_TYPES.forEach(type => {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    btn.dataset.typeId = type.id;
    btn.innerHTML = `
      <span class="emoji">${type.emoji}</span>
      <span class="name">${type.name}</span>
      <span class="cost">💰${type.cost}</span>
      <div class="cd-overlay" style="display:none"></div>
    `;
    btn.addEventListener("click", () => trySpawnAlly(type.id));
    bar.appendChild(btn);
  });
}

function trySpawnAlly(typeId) {
  if (!battle || battle.over) return;
  const stats = getAllyStats(typeId);
  if (battle.money < stats.base.cost) {
    playSfx("noMoney");
    spawnFloatText(ALLY_SPAWN_X, LANE_Y - 40, "돈 부족", "#d33");
    return;
  }
  if (battle.cooldowns[typeId] > 0) return;
  battle.money -= stats.base.cost;
  battle.cooldowns[typeId] = stats.base.cooldown;
  battle.units.push(createAlly(typeId));
  spawnBurst(ALLY_SPAWN_X, LANE_Y, "#8fd3ff");
  playSfx("spawnAlly");
}

/* ===================== 이펙트 ===================== */
function spawnBurst(x, y, color) {
  battle.effects.push({ type: "burst", x, y, life: 350, maxLife: 350, color });
}
function spawnFloatText(x, y, text, color) {
  battle.effects.push({ type: "text", x, y, life: 700, maxLife: 700, text, color: color || "#333" });
}
function spawnHitSpark(x, y) {
  battle.effects.push({ type: "spark", x, y, life: 180, maxLife: 180 });
}

/* ===================== 전투 로직 ===================== */
function findTarget(unit, units) {
  let best = null, bestDist = Infinity;
  for (const o of units) {
    if (o.dead || o.side === unit.side) continue;
    if (unit.side === "ally" && o.x >= unit.x) continue;
    if (unit.side === "enemy" && o.x <= unit.x) continue;
    const d = Math.abs(o.x - unit.x);
    if (d < bestDist) { bestDist = d; best = o; }
  }
  return best ? { target: best, dist: bestDist } : null;
}

function dealDamageToUnit(target, dmg) {
  target.hp -= dmg;
  target.hitFlash = 140;
  spawnHitSpark(target.x, target.y - 20);
  playSfx("hit");
  if (target.hp <= 0 && !target.dead) {
    target.dead = true;
    playSfx("death");
    onUnitDeath(target);
  }
}

function onUnitDeath(unit) {
  if (unit.side === "enemy") {
    const reward = 6 + unit.tier * 4;
    battle.money += reward;
    spawnFloatText(unit.x, unit.y - 30, `+${reward}💰`, "#b8860b");
    if (Math.random() < 0.15) {
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      save.fruits[f.id]++;
      spawnFloatText(unit.x, unit.y - 50, f.emoji, "#333");
      persistSave();
    }
  }
}

function updateUnit(u, dt) {
  if (u.dead) return;
  if (u.side === "ally") {
    const stats = getAllyStats(u.typeId);
    if (stats.maxHp !== u.maxHp) {
      u.hp += (stats.maxHp - u.maxHp);
      u.maxHp = stats.maxHp;
    }
    u.atk = stats.atk;
    u.range = stats.range;
    u.speed = stats.speed;
    u.atkInterval = stats.atkInterval;
    u.stage = stats.stage;
  }
  if (u.spawnAnim > 0) u.spawnAnim -= dt;
  if (u.hitFlash > 0) u.hitFlash -= dt;
  u.atkTimer -= dt;

  const found = findTarget(u, battle.units);
  const dir = u.side === "ally" ? -1 : 1;

  if (found) {
    if (found.dist <= u.range) {
      if (u.atkTimer <= 0) {
        dealDamageToUnit(found.target, u.atk);
        u.atkTimer = u.atkInterval;
      }
    } else {
      const proposed = u.x + dir * u.speed * (dt / 1000);
      if (dir === -1) u.x = Math.max(proposed, found.target.x + u.range);
      else u.x = Math.min(proposed, found.target.x - u.range);
    }
  } else {
    const baseX = u.side === "ally" ? LEFT_BASE_X : RIGHT_BASE_X;
    const distToBase = Math.abs(baseX - u.x);
    if (distToBase <= u.range + 14) {
      if (u.atkTimer <= 0) {
        attackBase(u.side, u.atk);
        u.atkTimer = u.atkInterval;
        spawnHitSpark(baseX, LANE_Y - 30);
        playSfx("baseHit");
      }
    } else {
      u.x += dir * u.speed * (dt / 1000);
    }
  }
}

function attackBase(attackerSide, dmg) {
  if (battle.over) return;
  if (attackerSide === "ally") {
    battle.enemyBaseHp = Math.max(0, battle.enemyBaseHp - dmg);
    if (battle.enemyBaseHp <= 0) endStage(true);
  } else {
    battle.playerBaseHp = Math.max(0, battle.playerBaseHp - dmg);
    if (battle.playerBaseHp <= 0) endStage(false);
  }
}

function updateCannon(dt) {
  if (battle.cannonCharge < battle.cannonMax) {
    battle.cannonCharge = Math.min(battle.cannonMax, battle.cannonCharge + dt);
  }
  if (battle.cannonCharge >= battle.cannonMax) {
    fireCannon(1);
  }
  document.getElementById("cannon-fill").style.width = `${(battle.cannonCharge / battle.cannonMax) * 100}%`;
}
function fireCannon(chargeRatio) {
  let best = null, bestX = -Infinity;
  for (const u of battle.units) {
    if (u.dead || u.side !== "enemy") continue;
    if (u.x > bestX) { bestX = u.x; best = u; }
  }
  const dmg = Math.round((40 + battle.stage.globalIndex * 6) * chargeRatio);
  spawnBurst(RIGHT_BASE_X - 30, LANE_Y, "#ffb85a");
  if (best) {
    // 대포알이 사정거리(내 기지~적 기지) 안의 첫 유닛에 명중
    dealDamageToUnit(best, dmg);
    best.x = Math.min(RIGHT_BASE_X - 20, best.x + 26);
    spawnBurst(best.x, best.y, "#ffb85a");
  } else {
    // 가로막는 유닛이 없으면 포탄이 끝까지 날아가 적 기지에 직격
    attackBase("ally", dmg);
    spawnBurst(LEFT_BASE_X, LANE_Y, "#ffb85a");
    spawnFloatText(LEFT_BASE_X, LANE_Y - 60, `기지 명중 -${dmg}`, "#e04545");
  }
  playSfx("cannon");
  battle.cannonCharge = 0;
}
document.getElementById("btn-cannon").addEventListener("click", () => {
  if (!battle || battle.over) return;
  const ratio = Math.max(0.35, battle.cannonCharge / battle.cannonMax);
  fireCannon(ratio);
});

function endStage(win) {
  if (battle.over) return;
  battle.over = true;
  playSfx(win ? "win" : "lose");
  if (win) {
    if (battle.stage.globalIndex >= save.unlockedIndex) {
      save.unlockedIndex = battle.stage.globalIndex + 1;
    }
    let gained = [];
    for (let i = 0; i < battle.stage.fruitReward; i++) {
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      save.fruits[f.id]++;
      gained.push(f.emoji);
    }
    persistSave();
    document.getElementById("result-title").textContent = battle.stage.isBoss ? "🎉 게임 클리어! 🎉" : "승리!";
    document.getElementById("result-desc").textContent = battle.stage.isBoss
      ? "모든 스테이지를 클리어했습니다! 최고의 강아지 부대예요."
      : `보상 열매: ${gained.join(" ")}`;
  } else {
    document.getElementById("result-title").textContent = "패배...";
    document.getElementById("result-desc").textContent = "부대를 강화하고 다시 도전해보세요.";
  }
  document.getElementById("result-overlay").classList.remove("hidden");
}

/* ===================== 렌더링 ===================== */
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const CANVAS_SCALE = 2;
canvas.width = CANVAS_W * CANVAS_SCALE;
canvas.height = CANVAS_H * CANVAS_SCALE;
ctx.scale(CANVAS_SCALE, CANVAS_SCALE);

const STAGE_FILTER = {
  1: "none",
  2: "saturate(1.5) brightness(1.05) hue-rotate(200deg)",
  3: "saturate(1.9) brightness(1.2) hue-rotate(35deg)",
};

function drawBase(x, side, hp, maxHp) {
  ctx.save();
  ctx.translate(x, LANE_Y);
  ctx.fillStyle = side === "ally" ? "#7fb8e8" : "#e88a8a";
  ctx.fillRect(-40, -92, 80, 92);
  ctx.font = "50px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(side === "ally" ? "🐶" : "😾", 0, -44);
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(-42, -108, 84, 10);
  ctx.fillStyle = side === "ally" ? "#3f8ce0" : "#e04545";
  ctx.fillRect(-42, -108, 84 * pct, 10);
  ctx.restore();
}

function drawUnit(u) {
  ctx.save();
  const bob = Math.sin(performance.now() / 180 + u.x) * 2;
  let scale = 1 + (u.spawnAnim > 0 ? (u.spawnAnim / 260) * 0.6 : 0);
  if (u.side === "enemy" && u.tier) scale *= 1 + (u.tier - 1) * 0.16;
  if (u.side === "ally" && u.stage) scale *= 1 + (u.stage - 1) * 0.22;
  ctx.translate(u.x, u.y + bob);
  ctx.scale(u.side === "ally" ? -scale : scale, scale);

  if (u.side === "ally" && u.stage >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.18 * Math.sin(performance.now() / 150);
    ctx.beginPath();
    ctx.arc(0, -22, u.stage >= 3 ? 34 : 28, 0, Math.PI * 2);
    ctx.fillStyle = u.stage >= 3 ? "#ffd23f" : "#7fd0ff";
    ctx.fill();
    ctx.restore();
  }
  if (u.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, u.hitFlash / 140);
    ctx.beginPath();
    ctx.arc(0, -22, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
  }

  ctx.font = "46px sans-serif";
  ctx.textAlign = "center";
  if (u.side === "ally" && u.stage) ctx.filter = STAGE_FILTER[u.stage];
  ctx.fillText(u.emoji, 0, 0);
  ctx.filter = "none";
  if (u.badge) ctx.fillText(u.badge, 18, -26);
  ctx.restore();

  const pct = Math.max(0, u.hp / u.maxHp);
  ctx.save();
  ctx.translate(u.x, u.y - 48);
  ctx.fillStyle = "#ddd";
  ctx.fillRect(-20, 0, 40, 6);
  ctx.fillStyle = u.side === "ally" ? "#3f8ce0" : "#e04545";
  ctx.fillRect(-20, 0, 40 * pct, 6);
  ctx.restore();
}

function drawEffects(dt) {
  battle.effects = battle.effects.filter(e => e.life > 0);
  for (const e of battle.effects) {
    e.life -= dt;
    const t = 1 - e.life / e.maxLife;
    ctx.save();
    if (e.type === "burst") {
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + t * 26, 0, Math.PI * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (e.type === "spark") {
      ctx.globalAlpha = 1 - t;
      ctx.font = "18px sans-serif";
      ctx.fillText("💥", e.x, e.y);
    } else if (e.type === "text") {
      ctx.globalAlpha = 1 - t;
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = e.color;
      ctx.textAlign = "center";
      ctx.fillText(e.text, e.x, e.y - t * 26);
    }
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.beginPath();
  ctx.moveTo(0, LANE_Y + 14);
  ctx.lineTo(CANVAS_W, LANE_Y + 14);
  ctx.stroke();

  drawBase(LEFT_BASE_X, "enemy", battle.enemyBaseHp, battle.enemyBaseMaxHp);
  drawBase(RIGHT_BASE_X, "ally", battle.playerBaseHp, PLAYER_BASE_MAX_HP);
  for (const u of battle.units) if (!u.dead) drawUnit(u);
}

/* ===================== 유닛 바 UI 갱신 ===================== */
function updateUnitBarUI() {
  document.querySelectorAll(".unit-btn").forEach(btn => {
    const typeId = btn.dataset.typeId;
    const stats = getAllyStats(typeId);
    const cd = battle.cooldowns[typeId];
    const overlay = btn.querySelector(".cd-overlay");
    if (cd > 0) {
      overlay.style.display = "flex";
      overlay.textContent = (cd / 1000).toFixed(1);
    } else {
      overlay.style.display = "none";
    }
    btn.classList.toggle("no-money", battle.money < stats.base.cost);
  });
}

/* ===================== 메인 루프 ===================== */
function gameLoop(now) {
  if (!battle) return;
  const dt = Math.min(60, now - battle.lastTime);
  battle.lastTime = now;

  if (!battle.over) {
    battle.money += battle.stage.moneyPerTick * (dt / 1000);
    ALLY_TYPES.forEach(t => {
      if (battle.cooldowns[t.id] > 0) battle.cooldowns[t.id] = Math.max(0, battle.cooldowns[t.id] - dt);
    });

    battle.spawnTimer -= dt;
    if (battle.spawnTimer <= 0) {
      const catId = pickCatId(battle.stage);
      battle.units.push(createEnemy(catId, battle.stage.catStatMul));
      spawnBurst(ENEMY_SPAWN_X, LANE_Y, "#ff8a8a");
      playSfx("spawnEnemy");
      battle.spawnTimer = battle.stage.spawnInterval;
    }

    for (const u of battle.units) updateUnit(u, dt);
    battle.units = battle.units.filter(u => !u.dead);
    updateCannon(dt);

    document.getElementById("enemy-hp-fill").style.width = `${(battle.enemyBaseHp / battle.enemyBaseMaxHp) * 100}%`;
    document.getElementById("player-hp-fill").style.width = `${(battle.playerBaseHp / PLAYER_BASE_MAX_HP) * 100}%`;
    document.getElementById("money-label").textContent = `💰 ${Math.floor(battle.money)}`;
    updateUnitBarUI();
  }

  render();
  drawEffects(dt);

  if (screens["screen-battle"].classList.contains("active")) {
    requestAnimationFrame(gameLoop);
  }
}

/* ===================== 이벤트 바인딩 ===================== */
document.getElementById("btn-start").addEventListener("click", () => {
  playSfx("click");
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-open-roster").addEventListener("click", () => {
  playSfx("click");
  renderRoster();
  showScreen("screen-roster");
});
document.getElementById("btn-roster-back").addEventListener("click", () => {
  playSfx("click");
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-back-title").addEventListener("click", () => {
  playSfx("click");
  showScreen("screen-title");
});
document.getElementById("btn-exit-battle").addEventListener("click", () => {
  playSfx("click");
  battle = null;
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-result-continue").addEventListener("click", () => {
  playSfx("click");
  document.getElementById("result-overlay").classList.add("hidden");
  battle = null;
  renderStageGrid();
  showScreen("screen-stageselect");
});
