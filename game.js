"use strict";

/* ===================== 상수 ===================== */
const CANVAS_W = 1120, CANVAS_H = 460, LANE_Y = 340;
const LEFT_BASE_X = 75, RIGHT_BASE_X = CANVAS_W - 75;
const ALLY_SPAWN_X = RIGHT_BASE_X - 40;
const ENEMY_SPAWN_X = LEFT_BASE_X + 40;
const PLAYER_BASE_MAX_HP = 500;
const MAX_ENEMIES_ON_FIELD = 20; // 화면에 적이 한꺼번에 몰려 겹치지 않도록 동시 등장 상한
const SAVE_KEY = "doggreatwar_save_v1";

const STAGE_MAX = 6;
const STAGE_HP_MUL = { 1: 1, 2: 1.5, 3: 2.1, 4: 2.8, 5: 3.6, 6: 4.6 };
const STAGE_ATK_MUL = { 1: 1, 2: 1.4, 3: 1.9, 4: 2.5, 5: 3.2, 6: 4.0 };
// 다음 단계로 올라가는 데 필요한 "누적" 열매 급여 횟수 (단계별)
const STAGE_UP_THRESHOLDS = { 2: 3, 3: 7, 4: 12, 5: 18, 6: 25 };

const ALLY_TYPES = [
  { id: "hippo",    name: "하마",   emoji: "🦛", cost: 50,  cooldown: 2600, hp: 130, atk: 11, range: 42, atkInterval: 1200, speed: 34 },
  { id: "pig",      name: "돼지",   emoji: "🐷", cost: 35,  cooldown: 1800, hp: 70,  atk: 9,  range: 34, atkInterval: 900,  speed: 46 },
  { id: "kingpig",  name: "왕돼지", emoji: "🐖", cost: 90,  cooldown: 4200, hp: 110, atk: 16, range: 40, atkInterval: 1000, speed: 38 },
  { id: "dog",      name: "강아지", emoji: "🐶", cost: 25,  cooldown: 1400, hp: 46,  atk: 7,  range: 32, atkInterval: 750,  speed: 58 },
  { id: "bulldog",  name: "불독",   emoji: "🐕", cost: 60,  cooldown: 2600, hp: 150, atk: 13, range: 34, atkInterval: 1100, speed: 28 },
  { id: "chicken",  name: "닭다리", emoji: "🍗", cost: 70,  cooldown: 3000, hp: 55,  atk: 22, range: 50, atkInterval: 700,  speed: 40 },
  { id: "guidedog", name: "안내견", emoji: "🦮", cost: 100, cooldown: 4500, hp: 95,  atk: 18, range: 44, atkInterval: 850,  speed: 48 },
  { id: "squirrel", name: "다람쥐", emoji: "🐿️", cost: 15,  cooldown: 900,  hp: 20,  atk: 4,  range: 28, atkInterval: 600,  speed: 72 },
  { id: "fox",      name: "여우",   emoji: "🦊", cost: 45,  cooldown: 2000, hp: 55,  atk: 14, range: 34, atkInterval: 800,  speed: 62 },
  { id: "raccoon",  name: "너구리", emoji: "🦝", cost: 65,  cooldown: 2400, hp: 65,  atk: 12, range: 40, atkInterval: 950,  speed: 42, aoe: true },
  { id: "owl",      name: "부엉이", emoji: "🦉", cost: 65,  cooldown: 2400, hp: 48,  atk: 15, range: 72, atkInterval: 1000, speed: 36 },
  { id: "bear",     name: "곰",     emoji: "🐻", cost: 85,  cooldown: 3200, hp: 220, atk: 14, range: 36, atkInterval: 1300, speed: 22 },
  { id: "elephant", name: "코끼리", emoji: "🐘", cost: 130, cooldown: 5200, hp: 260, atk: 30, range: 46, atkInterval: 1400, speed: 20 },
];

// 진화 단계별로 색만 바뀌는 게 아니라 실루엣 자체가 달라지도록 캐릭터/장식 조합을 따로 정의한다
const EVOLUTION_FORMS = {
  hippo: [
    { emoji: "🦛", accessories: [] },
    { emoji: "🦛", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.55 }] },
    { emoji: "🦛", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.55 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.55 }] },
    { emoji: "🦛", accessories: [{ emoji: "⚔️", dx: -20, dy: -10, scale: 0.6 }, { emoji: "🔥", dx: 16, dy: -26, scale: 0.55 }] },
    { emoji: "🦛", accessories: [{ emoji: "⚔️", dx: -20, dy: -10, scale: 0.65 }, { emoji: "🔥", dx: 16, dy: -26, scale: 0.65 }, { emoji: "👑", dx: 0, dy: -34, scale: 0.5 }] },
    { emoji: "🦛", accessories: [{ emoji: "⚔️", dx: -20, dy: -10, scale: 0.7 }, { emoji: "🔥", dx: 18, dy: -28, scale: 0.8 }, { emoji: "👑", dx: 0, dy: -36, scale: 0.6 }, { emoji: "✨", dx: -14, dy: -30, scale: 0.5 }] },
  ],
  pig: [
    { emoji: "🐷", accessories: [] },
    { emoji: "🐷", accessories: [{ emoji: "🥊", dx: -16, dy: -8, scale: 0.5 }] },
    { emoji: "🐗", accessories: [{ emoji: "🥊", dx: -16, dy: -8, scale: 0.55 }] },
    { emoji: "🐗", accessories: [{ emoji: "🔥", dx: 16, dy: -24, scale: 0.55 }] },
    { emoji: "🐗", accessories: [{ emoji: "💪", dx: -16, dy: -6, scale: 0.55 }, { emoji: "🔥", dx: 16, dy: -24, scale: 0.6 }] },
    { emoji: "🐗", accessories: [{ emoji: "💪", dx: -16, dy: -6, scale: 0.6 }, { emoji: "🔥", dx: 16, dy: -26, scale: 0.8 }, { emoji: "✨", dx: -14, dy: -26, scale: 0.5 }] },
  ],
  kingpig: [
    { emoji: "🐖", accessories: [{ emoji: "👑", dx: 0, dy: -30, scale: 0.55 }] },
    { emoji: "🐖", accessories: [{ emoji: "👑", dx: 0, dy: -32, scale: 0.65 }, { emoji: "🛡️", dx: -18, dy: -2, scale: 0.5 }] },
    { emoji: "🐗", accessories: [{ emoji: "👑", dx: 0, dy: -32, scale: 0.65 }, { emoji: "🛡️", dx: -18, dy: -2, scale: 0.5 }] },
    { emoji: "🐗", accessories: [{ emoji: "👑", dx: 0, dy: -34, scale: 0.7 }, { emoji: "🛡️", dx: -18, dy: -2, scale: 0.55 }, { emoji: "⚔️", dx: 18, dy: -6, scale: 0.5 }] },
    { emoji: "🐗", accessories: [{ emoji: "👑", dx: 0, dy: -36, scale: 0.8 }, { emoji: "💎", dx: -18, dy: -8, scale: 0.5 }, { emoji: "⚔️", dx: 18, dy: -8, scale: 0.55 }] },
    { emoji: "🐗", accessories: [{ emoji: "👑", dx: 0, dy: -38, scale: 0.9 }, { emoji: "💎", dx: -18, dy: -10, scale: 0.55 }, { emoji: "✨", dx: 18, dy: -20, scale: 0.65 }, { emoji: "🔥", dx: 0, dy: 6, scale: 0.5 }] },
  ],
  dog: [
    { emoji: "🐶", accessories: [] },
    { emoji: "🐕", accessories: [{ emoji: "🦴", dx: -18, dy: 8, scale: 0.4 }] },
    { emoji: "🐕", accessories: [{ emoji: "🦴", dx: -18, dy: 8, scale: 0.4 }, { emoji: "🛡️", dx: 16, dy: -6, scale: 0.45 }] },
    { emoji: "🐺", accessories: [{ emoji: "🦴", dx: -18, dy: 8, scale: 0.4 }] },
    { emoji: "🐺", accessories: [{ emoji: "✨", dx: 16, dy: -22, scale: 0.55 }] },
    { emoji: "🐺", accessories: [{ emoji: "✨", dx: 16, dy: -22, scale: 0.7 }, { emoji: "🔥", dx: -16, dy: -20, scale: 0.6 }] },
  ],
  bulldog: [
    { emoji: "🐶", accessories: [] },
    { emoji: "🐕‍🦺", accessories: [] },
    { emoji: "🐕‍🦺", accessories: [{ emoji: "🛡️", dx: -18, dy: -4, scale: 0.5 }] },
    { emoji: "🦁", accessories: [] },
    { emoji: "🦁", accessories: [{ emoji: "🛡️", dx: -18, dy: -4, scale: 0.5 }] },
    { emoji: "🦁", accessories: [{ emoji: "🛡️", dx: -18, dy: -4, scale: 0.6 }, { emoji: "✨", dx: 16, dy: -22, scale: 0.55 }] },
  ],
  chicken: [
    { emoji: "🍗", accessories: [] },
    { emoji: "🍗", accessories: [{ emoji: "🔥", dx: 16, dy: -10, scale: 0.6 }] },
    { emoji: "🍗", accessories: [{ emoji: "🔥", dx: 16, dy: -10, scale: 0.6 }, { emoji: "🔥", dx: -14, dy: -10, scale: 0.5 }] },
    { emoji: "🍗", accessories: [{ emoji: "🔥", dx: 18, dy: -16, scale: 0.9 }, { emoji: "🔥", dx: -16, dy: -14, scale: 0.7 }] },
    { emoji: "🍗", accessories: [{ emoji: "🔥", dx: 18, dy: -16, scale: 0.9 }, { emoji: "🔥", dx: -16, dy: -14, scale: 0.8 }, { emoji: "⚡", dx: 0, dy: -30, scale: 0.6 }] },
    { emoji: "🍗", accessories: [{ emoji: "🔥", dx: 18, dy: -18, scale: 1.0 }, { emoji: "🔥", dx: -18, dy: -16, scale: 0.9 }, { emoji: "⚡", dx: 0, dy: -32, scale: 0.7 }, { emoji: "✨", dx: 0, dy: 8, scale: 0.5 }] },
  ],
  guidedog: [
    { emoji: "🦮", accessories: [] },
    { emoji: "🦮", accessories: [{ emoji: "🎽", dx: -16, dy: 4, scale: 0.45 }] },
    { emoji: "🦮", accessories: [{ emoji: "🎽", dx: -16, dy: 4, scale: 0.45 }, { emoji: "🕊️", dx: 18, dy: -24, scale: 0.5 }] },
    { emoji: "🦮", accessories: [{ emoji: "🕊️", dx: 18, dy: -26, scale: 0.6 }, { emoji: "✨", dx: -18, dy: -20, scale: 0.5 }] },
    { emoji: "🦮", accessories: [{ emoji: "🕊️", dx: 18, dy: -26, scale: 0.7 }, { emoji: "✨", dx: -18, dy: -20, scale: 0.6 }] },
    { emoji: "🦮", accessories: [{ emoji: "🕊️", dx: 18, dy: -28, scale: 0.85 }, { emoji: "✨", dx: -18, dy: -22, scale: 0.7 }, { emoji: "💫", dx: 0, dy: -34, scale: 0.6 }] },
  ],
  squirrel: [
    { emoji: "🐿️", accessories: [] },
    { emoji: "🐿️", accessories: [{ emoji: "🌰", dx: -16, dy: 6, scale: 0.4 }] },
    { emoji: "🐿️", accessories: [{ emoji: "🌰", dx: -16, dy: 6, scale: 0.4 }, { emoji: "🌰", dx: 16, dy: 6, scale: 0.4 }] },
    { emoji: "🐿️", accessories: [{ emoji: "🌰", dx: -16, dy: 6, scale: 0.4 }, { emoji: "💨", dx: 16, dy: -6, scale: 0.5 }] },
    { emoji: "🐿️", accessories: [{ emoji: "💨", dx: 16, dy: -6, scale: 0.6 }, { emoji: "✨", dx: -16, dy: -18, scale: 0.5 }] },
    { emoji: "🐿️", accessories: [{ emoji: "💨", dx: 16, dy: -8, scale: 0.7 }, { emoji: "✨", dx: -16, dy: -18, scale: 0.6 }, { emoji: "⚡", dx: 0, dy: -28, scale: 0.5 }] },
  ],
  fox: [
    { emoji: "🦊", accessories: [] },
    { emoji: "🦊", accessories: [{ emoji: "🗡️", dx: -18, dy: -6, scale: 0.5 }] },
    { emoji: "🦊", accessories: [{ emoji: "🗡️", dx: -18, dy: -6, scale: 0.5 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.5 }] },
    { emoji: "🦊", accessories: [{ emoji: "🗡️", dx: -18, dy: -6, scale: 0.65 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.55 }] },
    { emoji: "🦊", accessories: [{ emoji: "🗡️", dx: -18, dy: -6, scale: 0.7 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.6 }, { emoji: "✨", dx: 0, dy: -28, scale: 0.5 }] },
    { emoji: "🦊", accessories: [{ emoji: "🗡️", dx: -18, dy: -6, scale: 0.85 }, { emoji: "🌙", dx: 16, dy: -26, scale: 0.75 }, { emoji: "🔥", dx: 0, dy: -30, scale: 0.6 }] },
  ],
  raccoon: [
    { emoji: "🦝", accessories: [] },
    { emoji: "🦝", accessories: [{ emoji: "🪨", dx: -18, dy: -4, scale: 0.5 }] },
    { emoji: "🦝", accessories: [{ emoji: "🪨", dx: -18, dy: -4, scale: 0.5 }, { emoji: "🪨", dx: 16, dy: -4, scale: 0.4 }] },
    { emoji: "🦝", accessories: [{ emoji: "💥", dx: 16, dy: -14, scale: 0.6 }] },
    { emoji: "🦝", accessories: [{ emoji: "💥", dx: 16, dy: -14, scale: 0.7 }, { emoji: "✨", dx: -16, dy: -20, scale: 0.5 }] },
    { emoji: "🦝", accessories: [{ emoji: "💥", dx: 16, dy: -16, scale: 0.9 }, { emoji: "✨", dx: -16, dy: -20, scale: 0.6 }, { emoji: "🔥", dx: 0, dy: 6, scale: 0.5 }] },
  ],
  owl: [
    { emoji: "🦉", accessories: [] },
    { emoji: "🦉", accessories: [{ emoji: "🏹", dx: -18, dy: -6, scale: 0.5 }] },
    { emoji: "🦉", accessories: [{ emoji: "🏹", dx: -18, dy: -6, scale: 0.5 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.5 }] },
    { emoji: "🦉", accessories: [{ emoji: "🏹", dx: -18, dy: -6, scale: 0.65 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.55 }] },
    { emoji: "🦉", accessories: [{ emoji: "🏹", dx: -18, dy: -6, scale: 0.7 }, { emoji: "🌙", dx: 16, dy: -24, scale: 0.6 }, { emoji: "✨", dx: 0, dy: -30, scale: 0.5 }] },
    { emoji: "🦉", accessories: [{ emoji: "🏹", dx: -18, dy: -6, scale: 0.85 }, { emoji: "🌙", dx: 16, dy: -26, scale: 0.75 }, { emoji: "✨", dx: 0, dy: -32, scale: 0.7 }] },
  ],
  bear: [
    { emoji: "🐻", accessories: [] },
    { emoji: "🐻", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.5 }] },
    { emoji: "🐻", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.65 }] },
    { emoji: "🐻‍❄️", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.55 }] },
    { emoji: "🐻‍❄️", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.6 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.55 }] },
    { emoji: "🐻‍❄️", accessories: [{ emoji: "🛡️", dx: -18, dy: -6, scale: 0.75 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.65 }, { emoji: "✨", dx: 0, dy: -30, scale: 0.55 }] },
  ],
  elephant: [
    { emoji: "🐘", accessories: [] },
    { emoji: "🐘", accessories: [{ emoji: "🛡️", dx: -20, dy: -6, scale: 0.5 }] },
    { emoji: "🐘", accessories: [{ emoji: "🛡️", dx: -20, dy: -6, scale: 0.5 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.5 }] },
    { emoji: "🐘", accessories: [{ emoji: "🛡️", dx: -20, dy: -6, scale: 0.65 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.55 }] },
    { emoji: "🐘", accessories: [{ emoji: "🛡️", dx: -20, dy: -6, scale: 0.7 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.6 }, { emoji: "👑", dx: 0, dy: -34, scale: 0.5 }] },
    { emoji: "🐘", accessories: [{ emoji: "🛡️", dx: -20, dy: -6, scale: 0.85 }, { emoji: "⚔️", dx: 18, dy: -10, scale: 0.75 }, { emoji: "👑", dx: 0, dy: -36, scale: 0.6 }, { emoji: "✨", dx: -18, dy: -26, scale: 0.5 }] },
  ],
};

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

const STAGES_PER_WORLD = 300;
const WORLD_COUNT = 3;

const STAGES = (() => {
  const list = [];
  let gi = 0;
  for (let world = 1; world <= WORLD_COUNT; world++) {
    const pool = world === 1 ? [1] : world === 2 ? [1, 2] : [1, 2, 3];
    for (let s = 1; s <= STAGES_PER_WORLD; s++) {
      gi++;
      list.push({
        id: `${world}-${s}`,
        label: `${world}-${s}`,
        world, chapter: world, stageNum: s, globalIndex: gi,
        tierPool: pool,
        enemyBaseMaxHp: 260 + gi * 18,
        spawnInterval: Math.max(650, 2600 - gi * 2.2),
        catStatMul: 1 + (gi - 1) * 0.0065,
        moneyPerTick: 5 + gi * 0.05,
        fruitReward: 2 + Math.floor(gi / 40),
        isBoss: false,
      });
    }
    gi++;
    // 각 세계의 300스테이지를 전부 깨야 도전할 수 있는 세계 보스전
    list.push({
      id: `${world}-boss`, label: `${world}세계 보스전`, world, chapter: world, stageNum: "boss", globalIndex: gi,
      tierPool: pool, includeBoss: true, worldBoss: true,
      enemyBaseMaxHp: (260 + gi * 18) * 3, spawnInterval: Math.max(650, 2600 - gi * 2.2) * 0.6,
      catStatMul: (1 + (gi - 1) * 0.0065) * 1.8,
      moneyPerTick: (5 + gi * 0.05) * 1.5, fruitReward: 20 + world * 15,
      isBoss: true,
    });
  }
  gi++;
  // 세 세계의 보스를 모두 잡아야 도전 가능한 최종 보스전 - 잡몹도 계속 소환하며 몰아붙인다
  list.push({
    id: "final-boss", label: "최종 보스전", world: WORLD_COUNT + 1, chapter: WORLD_COUNT + 1, stageNum: "final", globalIndex: gi,
    tierPool: [1, 2, 3], includeBoss: true, finalBoss: true,
    enemyBaseMaxHp: 9000, spawnInterval: 500, catStatMul: 8,
    moneyPerTick: 20, fruitReward: 100,
    isBoss: true,
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
  if (prog.stage >= STAGE_MAX) return false;
  save.fruits[fruitId]--;
  const base = ALLY_TYPES.find(t => t.id === typeId);
  if (fruitId === "red") prog.bonus.atk += base.atk * 0.05;
  else if (fruitId === "orange") prog.bonus.hp += base.hp * 0.06;
  else if (fruitId === "yellow") prog.bonus.atkSpeed = Math.min(0.4, prog.bonus.atkSpeed + 0.025);
  else if (fruitId === "green") prog.bonus.speed += 0.03;
  else if (fruitId === "purple") prog.bonus.range += 1.5;
  prog.feeds++;
  let leveledUp = false;
  while (prog.stage < STAGE_MAX && prog.feeds >= STAGE_UP_THRESHOLDS[prog.stage + 1]) {
    prog.stage++;
    leveledUp = true;
  }
  playSfx(leveledUp ? "evolve" : "feed");
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
const WORLD_PAGE_SIZE = 30;
let stageSelectWorld = 1;
let stageSelectPage = 0;

function renderStageGrid() {
  renderWorldTabs();
  const grid = document.getElementById("stage-grid");
  const bossRow = document.getElementById("world-boss-row");
  const pageNav = document.getElementById("page-nav");
  grid.innerHTML = "";
  bossRow.innerHTML = "";
  pageNav.innerHTML = "";

  if (stageSelectWorld === WORLD_COUNT + 1) {
    const finalBoss = STAGES.find(st => st.finalBoss);
    renderBossButton(bossRow, finalBoss, "👑 최종 보스전");
    return;
  }

  const worldStages = STAGES.filter(st => st.world === stageSelectWorld && !st.worldBoss && !st.finalBoss);
  const totalPages = Math.ceil(worldStages.length / WORLD_PAGE_SIZE);
  stageSelectPage = Math.max(0, Math.min(stageSelectPage, totalPages - 1));
  const pageStages = worldStages.slice(stageSelectPage * WORLD_PAGE_SIZE, (stageSelectPage + 1) * WORLD_PAGE_SIZE);

  pageStages.forEach(st => {
    const btn = document.createElement("button");
    const unlocked = st.globalIndex <= save.unlockedIndex;
    const cleared = st.globalIndex < save.unlockedIndex;
    btn.className = "stage-btn" + (unlocked ? "" : " locked") + (cleared ? " cleared" : "");
    btn.textContent = st.stageNum;
    btn.title = st.label;
    btn.disabled = !unlocked;
    btn.addEventListener("click", () => { playSfx("click"); startStage(st); });
    grid.appendChild(btn);
  });

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀ 이전";
  prevBtn.disabled = stageSelectPage <= 0;
  prevBtn.addEventListener("click", () => { stageSelectPage--; playSfx("click"); renderStageGrid(); });
  const label = document.createElement("span");
  label.textContent = `${stageSelectPage + 1} / ${totalPages} 페이지 (${stageSelectWorld}-${stageSelectPage * WORLD_PAGE_SIZE + 1}~${Math.min(worldStages.length, (stageSelectPage + 1) * WORLD_PAGE_SIZE)})`;
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "다음 ▶";
  nextBtn.disabled = stageSelectPage >= totalPages - 1;
  nextBtn.addEventListener("click", () => { stageSelectPage++; playSfx("click"); renderStageGrid(); });
  pageNav.append(prevBtn, label, nextBtn);

  const worldBoss = STAGES.find(st => st.world === stageSelectWorld && st.worldBoss);
  renderBossButton(bossRow, worldBoss, `👑 ${stageSelectWorld}세계 보스전`);
}

function renderBossButton(container, bossStage, label) {
  const unlocked = bossStage.globalIndex <= save.unlockedIndex;
  const cleared = bossStage.globalIndex < save.unlockedIndex;
  const btn = document.createElement("button");
  btn.className = "world-boss-btn" + (cleared ? " cleared" : "");
  btn.textContent = unlocked ? label : `🔒 ${label} (스테이지를 모두 깨야 도전 가능)`;
  btn.disabled = !unlocked;
  btn.addEventListener("click", () => { playSfx("click"); startStage(bossStage); });
  container.appendChild(btn);
}

function renderWorldTabs() {
  const tabs = document.getElementById("world-tabs");
  tabs.innerHTML = "";
  const names = ["1세계", "2세계", "3세계", "최종보스"];
  for (let w = 1; w <= WORLD_COUNT + 1; w++) {
    const btn = document.createElement("button");
    btn.className = "world-tab" + (w === stageSelectWorld ? " active" : "");
    btn.textContent = names[w - 1];
    btn.addEventListener("click", () => { stageSelectWorld = w; stageSelectPage = 0; playSfx("click"); renderStageGrid(); });
    tabs.appendChild(btn);
  }
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
    const atMax = prog.stage >= STAGE_MAX;
    const pct = atMax ? 100 : Math.min(100, Math.round((prog.feeds / STAGE_UP_THRESHOLDS[prog.stage + 1]) * 100));
    const form = EVOLUTION_FORMS[type.id][prog.stage - 1];
    const badges = form.accessories.map(a => `<span class="badge">${a.emoji}</span>`).join("");
    card.innerHTML = `
      <div class="avatar stage-${prog.stage}">${form.emoji}<span class="badges">${badges}</span></div>
      <div class="name">${type.name}</div>
      <div class="stage-tag">${prog.stage}/${STAGE_MAX}단계${atMax ? " (최대)" : ""}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="feed-row"></div>
    `;
    const row = card.querySelector(".feed-row");
    FRUITS.forEach(f => {
      const b = document.createElement("button");
      b.className = "feed-btn";
      b.textContent = `${f.emoji}${save.fruits[f.id]}`;
      b.title = f.flavor;
      b.disabled = atMax || save.fruits[f.id] <= 0;
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
    this.attackAnim = 0;
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
  u.aoe = !!stats.base.aoe;
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
    projectiles: [],
    money: 100 + stageDef.globalIndex * 10,
    enemyBaseHp: stageDef.enemyBaseMaxHp,
    enemyBaseMaxHp: stageDef.enemyBaseMaxHp,
    playerBaseHp: PLAYER_BASE_MAX_HP,
    cooldowns: {},
    spawnTimer: 900,
    cannonCharge: 0,
    cannonMax: 5000,
    autoSpawn: false,
    over: false,
    lastTime: performance.now(),
  };
  ALLY_TYPES.forEach(t => { battle.cooldowns[t.id] = 0; });
  const autoBtn = document.getElementById("btn-autospawn");
  autoBtn.classList.remove("on");
  autoBtn.textContent = "🔁 자동 소환 OFF";
  document.getElementById("stage-label").textContent = stageDef.finalBoss ? "최종 보스전" : stageDef.worldBoss ? `${stageDef.world}세계 보스전` : stageDef.label;
  renderUnitBar();
  showScreen("screen-battle");
  requestAnimationFrame(gameLoop);
}

function pickCatId(stageDef) {
  const pool = [];
  stageDef.tierPool.forEach(tier => pool.push(...TIER_POOL[tier]));
  if (stageDef.includeBoss && Math.random() < (stageDef.finalBoss ? 0.3 : stageDef.worldBoss ? 0.2 : 0.12)) return "boss";
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
  spawnImpact(ALLY_SPAWN_X, LANE_Y - 10, "#8fd3ff");
  playSfx("spawnAlly");
}

function autoSpawnTick() {
  // 자동 소환 ON일 때, 쿨다운이 끝나고 돈이 충분한 유닛을 자동으로 계속 출격시킨다
  for (const type of ALLY_TYPES) {
    const stats = getAllyStats(type.id);
    if (battle.cooldowns[type.id] <= 0 && battle.money >= stats.base.cost) {
      trySpawnAlly(type.id);
    }
  }
}

/* ===================== 이펙트 ===================== */
function spawnBurst(x, y, color) {
  battle.effects.push({ type: "burst", x, y, life: 350, maxLife: 350, color });
}
function spawnImpact(x, y, color) {
  battle.effects.push({ type: "impact", x, y, life: 420, maxLife: 420, color });
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
    if (Math.random() < 0.22) {
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
        if (u.aoe) {
          // 너구리처럼 광역 공격형 유닛은 주 타겟 옆의 다른 적에게도 약한 스플래시 피해를 준다
          let splash = null, splashDist = Infinity;
          for (const o of battle.units) {
            if (o.dead || o.side === u.side || o === found.target) continue;
            const d = Math.abs(o.x - u.x);
            if (d <= u.range && d < splashDist) { splashDist = d; splash = o; }
          }
          if (splash) dealDamageToUnit(splash, Math.round(u.atk * 0.4));
        }
        u.atkTimer = u.atkInterval;
        u.attackAnim = 180;
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
        u.attackAnim = 180;
        spawnHitSpark(baseX, LANE_Y - 30);
        playSfx("baseHit");
      }
    } else {
      u.x += dir * u.speed * (dt / 1000);
    }
  }
  if (u.attackAnim > 0) u.attackAnim -= dt;
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
  document.getElementById("cannon-label").textContent = battle.cannonCharge >= battle.cannonMax ? "🐶💥 발사!" : "🐶💥 대포 충전중";
}
const CANNON_FLIGHT_SPEED = 1500; // px/sec, 포탄이 화면을 가로지르는 속도

function fireCannon(chargeRatio) {
  let best = null, bestX = -Infinity;
  for (const u of battle.units) {
    if (u.dead || u.side !== "enemy") continue;
    if (u.x > bestX) { bestX = u.x; best = u; }
  }
  const dmg = Math.round((420 + battle.stage.globalIndex * 60) * chargeRatio);
  // 포탄 대신 큰 파도가 기지에서 밀려나가 사정거리(내 기지~적 기지) 끝까지 휩쓸고 간다
  battle.projectiles.push({ x: RIGHT_BASE_X - 46, y: LANE_Y - 6, target: best, dmg, hit: false, trail: [] });
  spawnBurst(RIGHT_BASE_X - 30, LANE_Y - 6, "#5ec8e8");
  playSfx("cannon");
  battle.cannonCharge = 0;
}
function updateProjectiles(dt) {
  for (const p of battle.projectiles) {
    p.trail.push(p.x);
    if (p.trail.length > 5) p.trail.shift();
    const targetX = (p.target && !p.target.dead) ? p.target.x : LEFT_BASE_X;
    const step = CANNON_FLIGHT_SPEED * (dt / 1000);
    if (p.x - targetX <= step) {
      p.x = targetX;
      p.hit = true;
      if (p.target && !p.target.dead) {
        dealDamageToUnit(p.target, p.dmg);
        p.target.x = Math.max(ENEMY_SPAWN_X, p.target.x - 30); // 넉백: 적 기지 쪽으로 밀려남
        spawnBurst(p.target.x, p.target.y - 20, "#5ec8e8");
      } else {
        attackBase("ally", p.dmg);
        spawnBurst(LEFT_BASE_X, LANE_Y - 6, "#5ec8e8");
        spawnFloatText(LEFT_BASE_X, LANE_Y - 90, `기지 명중 -${p.dmg}`, "#e04545");
      }
    } else {
      p.x -= step;
    }
  }
  battle.projectiles = battle.projectiles.filter(p => !p.hit);
}
function drawProjectiles() {
  for (const p of battle.projectiles) {
    const bob = Math.sin(performance.now() / 60) * 4;
    // 지나온 자리에 남는 파도 잔상
    p.trail.forEach((tx, i) => {
      ctx.save();
      ctx.globalAlpha = ((i + 1) / p.trail.length) * 0.35;
      ctx.font = "34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🌊", tx, p.y + bob);
      ctx.restore();
    });
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.font = "50px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🌊", 0, 0);
    ctx.restore();
  }
}
document.getElementById("btn-autospawn").addEventListener("click", (e) => {
  if (!battle || battle.over) return;
  battle.autoSpawn = !battle.autoSpawn;
  e.currentTarget.classList.toggle("on", battle.autoSpawn);
  e.currentTarget.textContent = battle.autoSpawn ? "🔁 자동 소환 ON" : "🔁 자동 소환 OFF";
  playSfx("click");
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
    let title = "승리!";
    let desc = `보상 열매: ${gained.join(" ")}`;
    if (battle.stage.finalBoss) {
      title = "🎉 게임 클리어! 🎉";
      desc = "모든 세계와 최종 보스를 클리어했습니다! 최고의 강아지 부대예요.";
    } else if (battle.stage.worldBoss) {
      title = `👑 ${battle.stage.world}세계 클리어!`;
      desc = `다음 세계로 나아가세요! 보상 열매: ${gained.join(" ")}`;
    }
    document.getElementById("result-title").textContent = title;
    document.getElementById("result-desc").textContent = desc;
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

function drawBase(x, side, hp, maxHp) {
  ctx.save();
  ctx.translate(x, LANE_Y);
  ctx.beginPath();
  ctx.ellipse(0, 6, 50, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fill();
  ctx.fillStyle = side === "ally" ? "#7fb8e8" : "#e88a8a";
  ctx.strokeStyle = side === "ally" ? "#2f6ca8" : "#a83f3f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-52, -118, 104, 122, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = "68px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(side === "ally" ? "🐶" : "😾", 0, -55);
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-54, -138, 108, 12);
  ctx.fillStyle = side === "ally" ? "#3f8ce0" : "#e04545";
  ctx.fillRect(-54, -138, 108 * pct, 12);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(-54, -138, 108, 12);
  ctx.restore();
}

function drawUnit(u) {
  ctx.save();
  const bob = Math.sin(performance.now() / 180 + u.x) * 3;
  let scale = 1.7 + (u.spawnAnim > 0 ? (u.spawnAnim / 260) * 0.7 : 0);
  if (u.side === "enemy" && u.tier) scale *= 1 + (u.tier - 1) * 0.2;
  if (u.side === "ally" && u.stage) scale *= 1 + (u.stage - 1) * 0.16;

  // 발밑 그림자 (땅에 붙어있는 느낌)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + 30, 22 * scale * 0.6, 7 * scale * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fill();
  ctx.restore();

  // 공격할 때 살짝 앞으로 튀어나갔다 돌아오는 타격 모션
  const lungeDir = u.side === "ally" ? -1 : 1;
  const lunge = u.attackAnim > 0 ? Math.sin((1 - u.attackAnim / 180) * Math.PI) * 11 * lungeDir : 0;

  ctx.translate(u.x + lunge, u.y + bob);
  // 이모지 기본 방향(왼쪽)을 기준으로, 오른쪽으로 걷는 적군만 좌우 반전한다
  ctx.scale(u.side === "enemy" ? -scale : scale, scale);

  if (u.side === "ally" && u.stage >= 2) {
    const auraColor = u.stage >= 6 ? "#ffd23f" : u.stage >= 4 ? "#c98bff" : "#7fd0ff";
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.18 * Math.sin(performance.now() / 150);
    ctx.beginPath();
    ctx.arc(0, -14, 16 + u.stage * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = auraColor;
    ctx.fill();
    ctx.restore();
  }
  if (u.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, u.hitFlash / 140);
    ctx.beginPath();
    ctx.arc(0, -14, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
  }

  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  if (u.side === "ally") {
    const form = EVOLUTION_FORMS[u.typeId][(u.stage || 1) - 1];
    ctx.fillText(form.emoji, 0, 0);
    for (const acc of form.accessories) {
      ctx.save();
      ctx.font = `${30 * acc.scale}px sans-serif`;
      ctx.fillText(acc.emoji, acc.dx, acc.dy);
      ctx.restore();
    }
  } else {
    ctx.fillText(u.emoji, 0, 0);
    if (u.badge) ctx.fillText(u.badge, 12, -16);
  }
  ctx.restore();

  const pct = Math.max(0, u.hp / u.maxHp);
  const barY = u.y - (30 * scale * 0.9 + 14);
  const barW = 26 * scale * 0.6 + 14;
  ctx.save();
  ctx.translate(u.x, barY);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-barW / 2, 0, barW, 7);
  ctx.fillStyle = u.side === "ally" ? "#3f8ce0" : "#e04545";
  ctx.fillRect(-barW / 2, 0, barW * pct, 7);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-barW / 2, 0, barW, 7);
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
    } else if (e.type === "impact") {
      // 소환/강한 타격을 더 임팩트 있게 보여주는 섬광+충격파+파편 이펙트
      ctx.globalAlpha = Math.max(0, 1 - t * 3.2);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 12 + t * 42, 0, Math.PI * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 4;
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r1 = 16 + t * 8, r2 = 16 + t * 50;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(ang) * r1, e.y + Math.sin(ang) * r1);
        ctx.lineTo(e.x + Math.cos(ang) * r2, e.y + Math.sin(ang) * r2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
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
  drawProjectiles();
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
      const enemyCount = battle.units.reduce((n, u) => n + (u.side === "enemy" && !u.dead ? 1 : 0), 0);
      if (enemyCount < MAX_ENEMIES_ON_FIELD) {
        const catId = pickCatId(battle.stage);
        battle.units.push(createEnemy(catId, battle.stage.catStatMul));
        spawnImpact(ENEMY_SPAWN_X, LANE_Y - 10, "#ff8a8a");
        playSfx("spawnEnemy");
        battle.spawnTimer = battle.stage.spawnInterval;
      } else {
        // 화면에 적이 너무 많이 쌓이지 않도록 상한을 두고, 여유가 생기면 곧바로 다시 시도한다
        battle.spawnTimer = 400;
      }
    }

    for (const u of battle.units) updateUnit(u, dt);
    battle.units = battle.units.filter(u => !u.dead);
    updateCannon(dt);
    updateProjectiles(dt);
    if (battle.autoSpawn) autoSpawnTick();

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
