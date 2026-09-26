"use strict";

/* ===================== 상수 ===================== */
const CANVAS_W = 1120, CANVAS_H = 460, LANE_Y = 340;
const LEFT_BASE_X = 75, RIGHT_BASE_X = CANVAS_W - 75;
const ALLY_SPAWN_X = RIGHT_BASE_X - 40;
const ENEMY_SPAWN_X = LEFT_BASE_X + 40;
const PLAYER_BASE_MAX_HP = 500;
const MAX_ENEMIES_ON_FIELD = 20; // 화면에 적이 한꺼번에 몰려 겹치지 않도록 동시 등장 상한
const MAX_ALLIES_ON_FIELD = 20; // 아군도 너무 많이 쌓이지 않도록 동시 소환 상한
const SAVE_KEY = "doggreatwar_save_v1";

// 특성 시스템: 적에게는 "속성", 아군은 6단계까지 강화하면 특정 속성에 강해지고(대신 다른 속성엔 약해짐)
const TRAITS = {
  alien: { label: "에일리언", emoji: "👽" },
  black: { label: "블랙",     emoji: "⚫" },
  angel: { label: "천사",     emoji: "👼" },
  metal: { label: "메탈",     emoji: "🤖" },
  ghost: { label: "유령",     emoji: "👻" },
};
const TRAIT_KEYS = Object.keys(TRAITS);
const TRAIT_UNLOCK_STAGE = 6; // 이 단계까지 강화해야 특성이 "묻어서" 발동한다
const TRAIT_STRONG_MUL = 1.5;
const TRAIT_WEAK_MUL = 0.7; // 약점 상대에게 주는 피해
const TRAIT_TAKEN_WEAK_MUL = 1.3; // 약점 상대에게 받는 피해
function getAllyTraitInfo(typeId) {
  const idx = ALLY_TYPES.findIndex(t => t.id === typeId);
  if (idx < 0) return null;
  return { strong: TRAIT_KEYS[idx % TRAIT_KEYS.length], weak: TRAIT_KEYS[(idx + 2) % TRAIT_KEYS.length] };
}

const STAGE_MAX = 6;
// 진화해도 "많이" 강해지지 않고 "조금"만 강해지도록 성장폭을 줄임
const STAGE_HP_MUL = { 1: 1, 2: 1.25, 3: 1.55, 4: 1.85, 5: 2.15, 6: 2.5 };
const STAGE_ATK_MUL = { 1: 1, 2: 1.2, 3: 1.45, 4: 1.7, 5: 1.95, 6: 2.2 };
// 다음 단계로 올라가는 데 필요한 "누적" 열매 급여 횟수 (단계별) - 진화를 더 어렵게
const FEEDS_PER_STAGE = 3; // 열매를 3번 먹이면 1단계 강화 (단계마다 다시 3번)

// 기지/대포도 캐릭터처럼 열매로 3단계까지 강화 - 단계마다 모습도 함께 바뀐다 (강화 1번 = 1단계 상승)
const UPGRADE_MAX = 3;
const UPGRADE_COST = { 2: 5, 3: 5 };
const BASE_HP_MUL = { 1: 1, 2: 1.6, 3: 2.4 };
const CANNON_DMG_MUL = { 1: 0.4, 2: 0.7, 3: 1.0 };

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
  { id: "panda",     name: "판다",     emoji: "🐼", cost: 55,  cooldown: 2200, hp: 140, atk: 12, range: 34, atkInterval: 950,  speed: 34 },
  { id: "tiger",     name: "호랑이",   emoji: "🐅", cost: 75,  cooldown: 2600, hp: 90,  atk: 26, range: 36, atkInterval: 800,  speed: 50 },
  { id: "penguin",   name: "펭귄",     emoji: "🐧", cost: 30,  cooldown: 1400, hp: 40,  atk: 8,  range: 30, atkInterval: 700,  speed: 56 },
  { id: "badger",    name: "오소리",   emoji: "🦡", cost: 70,  cooldown: 2800, hp: 190, atk: 15, range: 32, atkInterval: 1100, speed: 26 },
  { id: "monkey",    name: "원숭이",   emoji: "🐵", cost: 40,  cooldown: 1800, hp: 55,  atk: 11, range: 32, atkInterval: 750,  speed: 64 },
  { id: "gorilla",   name: "고릴라",   emoji: "🦍", cost: 110, cooldown: 4000, hp: 300, atk: 22, range: 38, atkInterval: 1300, speed: 20 },
  { id: "kangaroo",  name: "캥거루",   emoji: "🦘", cost: 60,  cooldown: 2200, hp: 80,  atk: 18, range: 34, atkInterval: 900,  speed: 54 },
  { id: "koala",     name: "코알라",   emoji: "🐨", cost: 90,  cooldown: 3600, hp: 260, atk: 10, range: 30, atkInterval: 1200, speed: 16 },
  { id: "camel",     name: "낙타",     emoji: "🐪", cost: 65,  cooldown: 2400, hp: 70,  atk: 17, range: 66, atkInterval: 1000, speed: 30 },
  { id: "horse",     name: "말",       emoji: "🐴", cost: 45,  cooldown: 1600, hp: 60,  atk: 13, range: 32, atkInterval: 800,  speed: 68 },
  { id: "cow",       name: "소",       emoji: "🐮", cost: 75,  cooldown: 2800, hp: 210, atk: 13, range: 32, atkInterval: 1100, speed: 24 },
  { id: "goat",      name: "염소",     emoji: "🐐", cost: 50,  cooldown: 2000, hp: 85,  atk: 16, range: 30, atkInterval: 850,  speed: 46 },
  { id: "parrot",    name: "앵무새",   emoji: "🦜", cost: 70,  cooldown: 2600, hp: 46,  atk: 17, range: 74, atkInterval: 950,  speed: 38 },
  { id: "chameleon", name: "카멜레온", emoji: "🦎", cost: 60,  cooldown: 2400, hp: 50,  atk: 24, range: 32, atkInterval: 850,  speed: 40 },
  { id: "octopus",   name: "문어",     emoji: "🐙", cost: 85,  cooldown: 3000, hp: 100, atk: 13, range: 42, atkInterval: 1000, speed: 28, aoe: true },
  { id: "shark",     name: "상어",     emoji: "🦈", cost: 150, cooldown: 5600, hp: 200, atk: 40, range: 40, atkInterval: 1300, speed: 22 },
];

// 최종 보스전에서만 등장하는 특별 영웅 - 돈으로 못 뽑고, 보스전 시작할 때 자동으로 주어지고 선택된다
const HERO_UNIT = { id: "hero", name: "사람 영웅", emoji: "🧍", badge: "🔫", hp: 320, atk: 24, range: 60, atkInterval: 500, speed: 40 };
const BOSS_WAVE_SPEED = 480; // px/sec, 최종 보스의 파동 공격이 휩쓸고 가는 속도
const BOSS_WAVE_DAMAGE_RATIO = 0.3; // 조종중인 캐릭터 최대체력의 30%

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

// 캐릭터를 많이 추가할 때, 6단계 진화 실루엣을 매번 손으로 다 쓰지 않고 일관된 패턴으로 생성한다
function makeEvolutionForms(base, evolved, acc) {
  const e2 = evolved || base;
  return [
    { emoji: base, accessories: [] },
    { emoji: base, accessories: [{ emoji: acc, dx: -16, dy: -6, scale: 0.5 }] },
    { emoji: base, accessories: [{ emoji: acc, dx: -16, dy: -6, scale: 0.55 }, { emoji: acc, dx: 16, dy: -6, scale: 0.45 }] },
    { emoji: e2, accessories: [{ emoji: acc, dx: -16, dy: -6, scale: 0.55 }] },
    { emoji: e2, accessories: [{ emoji: acc, dx: -16, dy: -6, scale: 0.6 }, { emoji: "✨", dx: 16, dy: -22, scale: 0.5 }] },
    { emoji: e2, accessories: [{ emoji: acc, dx: -16, dy: -6, scale: 0.75 }, { emoji: "✨", dx: 16, dy: -22, scale: 0.65 }, { emoji: "🔥", dx: 0, dy: -30, scale: 0.5 }] },
  ];
}
Object.assign(EVOLUTION_FORMS, {
  panda:     makeEvolutionForms("🐼", null, "🎋"),
  tiger:     makeEvolutionForms("🐅", null, "🔥"),
  penguin:   makeEvolutionForms("🐧", null, "❄️"),
  badger:    makeEvolutionForms("🦡", null, "🛡️"),
  monkey:    makeEvolutionForms("🐵", null, "💨"),
  gorilla:   makeEvolutionForms("🦍", null, "💪"),
  kangaroo:  makeEvolutionForms("🦘", null, "💨"),
  koala:     makeEvolutionForms("🐨", null, "🛡️"),
  camel:     makeEvolutionForms("🐪", "🐫", "🔥"),
  horse:     makeEvolutionForms("🐴", "🐎", "💨"),
  cow:       makeEvolutionForms("🐮", "🐂", "⚔️"),
  goat:      makeEvolutionForms("🐐", null, "⚔️"),
  parrot:    makeEvolutionForms("🦜", null, "🌙"),
  chameleon: makeEvolutionForms("🦎", null, "🗡️"),
  octopus:   makeEvolutionForms("🐙", null, "💥"),
  shark:     makeEvolutionForms("🦈", null, "🩸"),
});

// 캐릭터를 100종 근처까지 크게 늘린다 - 역할 템플릿으로 스탯을 굴리고, 진화 실루엣은 자동 생성한다
const ALLY_ROLE_TEMPLATES = {
  swarm:    { costMul: 0.5, cdMul: 0.55, hpMul: 0.5,  atkMul: 0.55, rangeMul: 0.95, atkIntMul: 0.85, speedMul: 1.35 },
  balanced: { costMul: 1.0, cdMul: 1.0,  hpMul: 1.0,  atkMul: 1.0,  rangeMul: 1.0,  atkIntMul: 1.0,  speedMul: 1.0 },
  tank:     { costMul: 1.5, cdMul: 1.5,  hpMul: 2.4,  atkMul: 0.85, rangeMul: 0.95, atkIntMul: 1.25, speedMul: 0.6 },
  ranged:   { costMul: 1.3, cdMul: 1.35, hpMul: 0.65, atkMul: 1.15, rangeMul: 1.9,  atkIntMul: 1.05, speedMul: 0.85 },
  heavy:    { costMul: 2.1, cdMul: 2.3,  hpMul: 1.7,  atkMul: 2.0,  rangeMul: 1.05, atkIntMul: 1.3,  speedMul: 0.55 },
};
const ALLY_BASE_STATS = { cost: 55, cooldown: 2200, hp: 100, atk: 14, range: 34, atkInterval: 950, speed: 40 };
function rollAllyStats(role, variance) {
  const t = ALLY_ROLE_TEMPLATES[role];
  const v = 1 + variance;
  return {
    cost: Math.round(ALLY_BASE_STATS.cost * t.costMul * v),
    cooldown: Math.round(ALLY_BASE_STATS.cooldown * t.cdMul * v),
    hp: Math.round(ALLY_BASE_STATS.hp * t.hpMul * v),
    atk: Math.round(ALLY_BASE_STATS.atk * t.atkMul * v),
    range: Math.round(ALLY_BASE_STATS.range * t.rangeMul),
    atkInterval: Math.round(ALLY_BASE_STATS.atkInterval * t.atkIntMul),
    speed: Math.round(ALLY_BASE_STATS.speed * t.speedMul * v),
  };
}
const ACC_PALETTE = ["🛡️", "⚔️", "🔥", "✨", "👑", "💪", "🌙", "⚡", "🪨", "💥", "🗡️", "💨", "❄️", "🩸", "🏹", "🕊️", "💎", "🎋"];
const NEW_CREATURES = [
  { id: "rabbit", name: "토끼", emoji: "🐰" }, { id: "hamster", name: "햄스터", emoji: "🐹" },
  { id: "mouse", name: "쥐", emoji: "🐭" }, { id: "rat", name: "시궁쥐", emoji: "🐀" },
  { id: "hedgehog", name: "고슴도치", emoji: "🦔" }, { id: "bat", name: "박쥐", emoji: "🦇" },
  { id: "deer", name: "사슴", emoji: "🦌" }, { id: "rhino", name: "코뿔소", emoji: "🦏" },
  { id: "zebra", name: "얼룩말", emoji: "🦓" }, { id: "llama", name: "라마", emoji: "🦙" },
  { id: "beaver", name: "비버", emoji: "🦫" }, { id: "otter", name: "수달", emoji: "🦦" },
  { id: "sloth", name: "나무늘보", emoji: "🦥" }, { id: "skunk", name: "스컹크", emoji: "🦨" },
  { id: "crocodile", name: "악어", emoji: "🐊" }, { id: "turtle", name: "거북이", emoji: "🐢" },
  { id: "trex", name: "티라노", emoji: "🦖" }, { id: "sauropod", name: "브라키오", emoji: "🦕" },
  { id: "snake", name: "뱀", emoji: "🐍" }, { id: "scorpion", name: "전갈", emoji: "🦂" },
  { id: "spider", name: "거미", emoji: "🕷️" }, { id: "snail", name: "달팽이", emoji: "🐌" },
  { id: "ladybug", name: "무당벌레", emoji: "🐞" }, { id: "cricket", name: "귀뚜라미", emoji: "🦗" },
  { id: "mosquito", name: "모기", emoji: "🦟", aoe: true }, { id: "bee", name: "꿀벌", emoji: "🐝", aoe: true },
  { id: "ant", name: "개미", emoji: "🐜", aoe: true }, { id: "duck", name: "오리", emoji: "🦆" },
  { id: "swan", name: "백조", emoji: "🦢" }, { id: "flamingo", name: "플라밍고", emoji: "🦩" },
  { id: "peacock", name: "공작", emoji: "🦚" }, { id: "turkey", name: "칠면조", emoji: "🦃" },
  { id: "rooster", name: "수탉", emoji: "🐓" }, { id: "hen", name: "암탉", emoji: "🐔" },
  { id: "chick", name: "병아리", emoji: "🐣" }, { id: "babychick", name: "삐악이", emoji: "🐥" },
  { id: "dodo", name: "도도새", emoji: "🦤" }, { id: "eagle", name: "독수리", emoji: "🦅" },
  { id: "dolphin", name: "돌고래", emoji: "🐬" }, { id: "whale", name: "흰수염고래", emoji: "🐳" },
  { id: "whale2", name: "향유고래", emoji: "🐋" }, { id: "fish", name: "물고기", emoji: "🐟" },
  { id: "tropicalfish", name: "열대어", emoji: "🐠" }, { id: "blowfish", name: "복어", emoji: "🐡" },
  { id: "lobster", name: "랍스터", emoji: "🦞" }, { id: "crab", name: "게", emoji: "🦀" },
  { id: "shrimp", name: "새우", emoji: "🦐" }, { id: "giraffe", name: "기린", emoji: "🦒" },
  { id: "leopard", name: "표범", emoji: "🐆" }, { id: "seal", name: "물개", emoji: "🦭" },
  { id: "poodle", name: "푸들", emoji: "🐩" }, { id: "babydragon", name: "아기드래곤", emoji: "🐲" },
  { id: "dragon", name: "드래곤", emoji: "🐉" }, { id: "unicorn", name: "유니콘", emoji: "🦄" },
  { id: "alien", name: "외계인", emoji: "👽" }, { id: "robot", name: "로봇", emoji: "🤖" },
  { id: "pumpkin", name: "호박", emoji: "🎃" }, { id: "snowman", name: "눈사람", emoji: "⛄" },
  { id: "donut", name: "도넛", emoji: "🍩" }, { id: "pizza", name: "피자", emoji: "🍕" },
  { id: "burger", name: "버거", emoji: "🍔" }, { id: "hotdog", name: "핫도그", emoji: "🌭" },
  { id: "icecream", name: "아이스크림", emoji: "🍦" }, { id: "cupcake", name: "컵케이크", emoji: "🧁" },
  { id: "cookie", name: "쿠키", emoji: "🍪" }, { id: "chocolate", name: "초코", emoji: "🍫" },
  { id: "pretzel", name: "프레첼", emoji: "🥨" }, { id: "croissant", name: "크로와상", emoji: "🥐" },
  { id: "soccerball", name: "축구공", emoji: "⚽" }, { id: "balloon", name: "풍선", emoji: "🎈" },
  { id: "gem", name: "보석", emoji: "💎" },
];
(() => {
  const roles = ["swarm", "balanced", "tank", "ranged", "heavy"];
  NEW_CREATURES.forEach((c, i) => {
    const role = roles[i % roles.length];
    const variance = ((i % 7) - 3) * 0.04;
    const stats = rollAllyStats(role, variance);
    ALLY_TYPES.push({ id: c.id, name: c.name, emoji: c.emoji, aoe: c.aoe, ...stats });
    EVOLUTION_FORMS[c.id] = makeEvolutionForms(c.emoji, c.evolved, ACC_PALETTE[i % ACC_PALETTE.length]);
  });
})();
const FRUITS = [
  { id: "red",    name: "빨강 열매", emoji: "🍎", flavor: "공격력" },
  { id: "orange", name: "주황 열매", emoji: "🍊", flavor: "체력" },
  { id: "yellow", name: "노랑 열매", emoji: "🍋", flavor: "공격속도" },
  { id: "green",  name: "초록 열매", emoji: "🍏", flavor: "이동속도" },
  { id: "purple", name: "보라 열매", emoji: "🍇", flavor: "사거리" },
];

const CAT_DEFS = {
  white:  { name: "흰 고양이",   emoji: "🐱", tier: 1, hp: 110,  atk: 9,  speed: 24, range: 30, atkInterval: 1000 },
  gray:   { name: "회색 고양이", emoji: "🐈", tier: 1, hp: 120,  atk: 9,  speed: 24, range: 30, atkInterval: 1000 },
  black:  { name: "검은 고양이", emoji: "🐈‍⬛", tier: 1, hp: 130,  atk: 11, speed: 23, range: 30, atkInterval: 1000, trait: "black" },
  armor:  { name: "갑옷 고양이", emoji: "🐱", badge: "🛡️", tier: 2, hp: 260, atk: 15, speed: 20, range: 32, atkInterval: 1000, trait: "metal" },
  horn:   { name: "뿔 고양이",   emoji: "🐱", badge: "😈", tier: 2, hp: 240, atk: 19, speed: 22, range: 32, atkInterval: 950 },
  wing:   { name: "날개 고양이", emoji: "🐱", badge: "🦋", tier: 3, hp: 380, atk: 26, speed: 26, range: 34, atkInterval: 900, trait: "angel" },
  energy: { name: "에너지 고양이", emoji: "🐱", badge: "⚡", tier: 3, hp: 400, atk: 29, speed: 24, range: 36, atkInterval: 850, trait: "alien" },
  boss:   { name: "보스 고양이", emoji: "🐯", badge: "👑", tier: 4, hp: 5500, atk: 48, speed: 14, range: 44, atkInterval: 850, trait: "alien" },
  ninja:  { name: "닌자 고양이", emoji: "🐱", badge: "🥷", tier: 2, hp: 220, atk: 22, speed: 30, range: 30, atkInterval: 800 },
  ice:    { name: "얼음 고양이", emoji: "🐱", badge: "❄️", tier: 3, hp: 410, atk: 23, speed: 20, range: 36, atkInterval: 900, trait: "metal" },
  ghost:  { name: "유령 고양이", emoji: "👻", tier: 3, hp: 360, atk: 28, speed: 34, range: 34, atkInterval: 800, trait: "ghost" },
  gold:   { name: "황금 고양이", emoji: "🐱", badge: "💰", tier: 0, hp: 70, atk: 4, speed: 26, range: 28, atkInterval: 1200, special: "gold" },
};
const TIER_POOL = {
  1: ["white", "gray", "black"],
  2: ["armor", "horn", "ninja"],
  3: ["wing", "energy", "ice", "ghost"],
};
const GOLD_CAT_CHANCE = 0.04; // 어느 세계에서든 낮은 확률로 등장하는 보상용 "좋은" 고양이

const STAGES_PER_WORLD = [50, 60, 40]; // 세계별 스테이지 수 (1세계 50개, 2세계 60개, 3세계 40개)
const WORLD_COUNT = 3;

const STAGES = (() => {
  const list = [];
  let gi = 0;
  for (let world = 1; world <= WORLD_COUNT; world++) {
    const pool = world === 1 ? [1] : world === 2 ? [1, 2] : [1, 2, 3];
    for (let s = 1; s <= STAGES_PER_WORLD[world - 1]; s++) {
      gi++;
      const isMiniBoss = s % 10 === 0; // 10스테이지마다 중간중간 미니보스 등장
      list.push({
        id: `${world}-${s}`,
        label: isMiniBoss ? `${world}-${s} 👹` : `${world}-${s}`,
        world, chapter: world, stageNum: s, globalIndex: gi,
        tierPool: pool,
        includeBoss: isMiniBoss,
        miniBoss: isMiniBoss,
        enemyBaseMaxHp: (260 + gi * 60) * (isMiniBoss ? 1.6 : 1),
        spawnInterval: Math.max(600, 2600 - gi * 3.2) * (isMiniBoss ? 0.7 : 1),
        catStatMul: (1 + (gi - 1) * 0.022) * (isMiniBoss ? 1.4 : 1),
        moneyPerTick: 5 + gi * 0.05,
        fruitReward: 1 + Math.floor(gi / 60) + (isMiniBoss ? 2 : 0),
        isBoss: false,
      });
    }
    gi++;
    // 각 세계의 스테이지를 전부 깨야 도전할 수 있는 세계 보스전
    list.push({
      id: `${world}-boss`, label: `${world}세계 보스전`, world, chapter: world, stageNum: "boss", globalIndex: gi,
      tierPool: pool, includeBoss: true, worldBoss: true,
      enemyBaseMaxHp: (260 + gi * 60) * 3, spawnInterval: Math.max(600, 2600 - gi * 3.2) * 0.6,
      catStatMul: (1 + (gi - 1) * 0.022) * 1.8,
      moneyPerTick: (5 + gi * 0.05) * 1.5, fruitReward: 10 + world * 6,
      isBoss: true,
    });
  }
  gi++;
  // 세 세계의 보스를 모두 잡아야 도전 가능한 최종 보스전 - 잡몹도 계속 소환하며 몰아붙인다
  list.push({
    id: "final-boss", label: "최종 보스전", world: WORLD_COUNT + 1, chapter: WORLD_COUNT + 1, stageNum: "final", globalIndex: gi,
    tierPool: [1, 2, 3], includeBoss: true, finalBoss: true,
    enemyBaseMaxHp: 12000, spawnInterval: 450, catStatMul: 11,
    moneyPerTick: 20, fruitReward: 50,
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
    baseLevel: 1,
    cannonLevel: 1,
    ownedAllies: ["dog"],
    cards: 0,
    enemyOwnedAllies: [],
    enemyAllyStages: {},
    pullsSinceEnemyGacha: 0,
  };
}
const GACHA_COST = 1;
const PULLS_PER_ENEMY_GACHA = 3; // 내가 3번 뽑아야 상대팀도 한 번 뽑는다
// 세질수록(비쌀수록) 등급이 높고, 등급이 높을수록 뽑힐 확률은 낮다
const RARITY_INFO = {
  normal: { label: "일반",       weight: 45, color: "#999" },
  rare:   { label: "레어",       weight: 30, color: "#3f8ce0" },
  super:  { label: "슈퍼레어",   weight: 15, color: "#a855f7" },
  ultra:  { label: "울트라슈퍼", weight: 7,  color: "#e0a800" },
  legend: { label: "전설",       weight: 3,  color: "#e04545" },
};
function getRarity(cost) {
  if (cost >= 150) return "legend";
  if (cost >= 110) return "ultra";
  if (cost >= 80) return "super";
  if (cost >= 50) return "rare";
  return "normal";
}
// 등급이 높을수록 데미지도 확실히 더 세지도록 등급별 고정 배율을 곱한다
const RARITY_DMG_MUL = { normal: 1, rare: 1.3, super: 1.7, ultra: 2.2, legend: 3.0 };
function getRarityDmgMul(cost) {
  return RARITY_DMG_MUL[getRarity(cost)];
}
function weightedPickLocked(locked) {
  const byRarity = {};
  locked.forEach(t => { const r = getRarity(t.cost); (byRarity[r] = byRarity[r] || []).push(t); });
  const rarities = Object.keys(byRarity);
  const totalWeight = rarities.reduce((sum, r) => sum + RARITY_INFO[r].weight, 0);
  let roll = Math.random() * totalWeight;
  for (const r of rarities) {
    roll -= RARITY_INFO[r].weight;
    if (roll <= 0) {
      const pool = byRarity[r];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return locked[locked.length - 1];
}
// 내가 새 캐릭터를 뽑을 때마다, 상대팀도 똑같이 한 마리를 뽑아서 상대팀 풀에도 좋은 애가 생긴다
function enemyGachaPull() {
  const locked = ALLY_TYPES.filter(t => !save.enemyOwnedAllies.includes(t.id));
  const pool = locked.length > 0 ? locked : ALLY_TYPES;
  const picked = weightedPickLocked(pool);
  if (!save.enemyOwnedAllies.includes(picked.id)) save.enemyOwnedAllies.push(picked.id);
  // 상대팀 캐릭터의 단계는 내 부대의 평균 진화 단계 근처로 맞춰서, "좋은 애"가 나오게 한다
  const myStages = save.ownedAllies.map(id => (save.allies[id] || {}).stage || 1);
  const avgStage = myStages.length ? Math.round(myStages.reduce((a, b) => a + b, 0) / myStages.length) : 1;
  const variance = Math.floor(Math.random() * 3) - 1; // -1~+1
  save.enemyAllyStages[picked.id] = Math.min(STAGE_MAX, Math.max(1, avgStage + variance));
}
function gachaPull() {
  if (save.cards < GACHA_COST) return null;
  save.cards -= GACHA_COST;
  const locked = ALLY_TYPES.filter(t => !save.ownedAllies.includes(t.id));
  let result;
  if (locked.length > 0) {
    const picked = weightedPickLocked(locked);
    save.ownedAllies.push(picked.id);
    result = { type: picked };
    // 내가 3번 뽑을 때마다 상대팀도 한 번 뽑는다
    save.pullsSinceEnemyGacha = (save.pullsSinceEnemyGacha || 0) + 1;
    if (save.pullsSinceEnemyGacha >= PULLS_PER_ENEMY_GACHA) {
      enemyGachaPull();
      save.pullsSinceEnemyGacha = 0;
    }
  } else {
    const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    save.fruits[f.id] += 5;
    result = { consolationFruit: f };
  }
  persistSave();
  return result;
}
function totalFruits() {
  return Object.values(save.fruits).reduce((a, b) => a + b, 0);
}
function spendFruits(n) {
  if (totalFruits() < n) return false;
  let remain = n;
  for (const id of Object.keys(save.fruits)) {
    const take = Math.min(save.fruits[id], remain);
    save.fruits[id] -= take;
    remain -= take;
    if (remain <= 0) break;
  }
  return true;
}
function upgradeBaseOrCannon(kind) {
  const levelKey = kind === "base" ? "baseLevel" : "cannonLevel";
  if (save[levelKey] >= UPGRADE_MAX) return false;
  const cost = UPGRADE_COST[save[levelKey] + 1];
  if (!spendFruits(cost)) return false;
  save[levelKey]++;
  playSfx("evolve");
  persistSave();
  return true;
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
  const atk = Math.round(base.atk * STAGE_ATK_MUL[prog.stage] * getRarityDmgMul(base.cost) + prog.bonus.atk);
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
  if (prog.stage < STAGE_MAX && prog.feeds >= FEEDS_PER_STAGE) {
    prog.stage++;
    prog.feeds = 0;
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
    btn.className = "stage-btn" + (unlocked ? "" : " locked") + (cleared ? " cleared" : "") + (st.miniBoss ? " mini-boss" : "");
    btn.textContent = st.miniBoss ? `${st.stageNum}👹` : st.stageNum;
    btn.title = st.miniBoss ? `${st.label} (미니보스)` : st.label;
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
function renderBaseCannonUpgrades() {
  const box = document.getElementById("upgrade-box");
  box.innerHTML = "";
  const defs = [
    { kind: "base", label: "🏠 기지 강화", desc: "기지 체력 증가 + 외형 강화", visuals: ["기본 기지", "보강된 기지", "요새화된 기지"] },
    { kind: "cannon", label: "💥 대포 강화", desc: "대포 데미지 증가 + 발사 연출 강화", visuals: ["파도", "커다란 파도", "파동"] },
  ];
  defs.forEach(def => {
    const level = save[def.kind === "base" ? "baseLevel" : "cannonLevel"];
    const atMax = level >= UPGRADE_MAX;
    const cost = atMax ? 0 : UPGRADE_COST[level + 1];
    const card = document.createElement("div");
    card.className = "roster-card upgrade-card";
    card.innerHTML = `
      <div class="name">${def.label}</div>
      <div class="stage-tag">${level}/${UPGRADE_MAX}단계 - ${def.visuals[level - 1]}${atMax ? " (최대)" : ""}</div>
      <div class="upgrade-desc">${def.desc}</div>
    `;
    const btn = document.createElement("button");
    btn.className = "mid-btn";
    btn.textContent = atMax ? "최대 강화 완료" : `🍎 열매 ${cost}개로 강화`;
    btn.disabled = atMax || totalFruits() < cost;
    btn.addEventListener("click", () => {
      if (upgradeBaseOrCannon(def.kind)) renderRoster();
    });
    card.appendChild(btn);
    box.appendChild(card);
  });
}

/* ===================== 코드 대전 (서버 없는 async PvP) ===================== */
function exportPvpCode() {
  // 소유한 캐릭터만 "id:단계"로 짧게 이어붙여서 코드를 최대한 짧게 만든다
  const parts = save.ownedAllies.map(id => `${id}:${(save.allies[id] || {}).stage || 1}`);
  return `b${save.baseLevel}|${parts.join(",")}`;
}
function importPvpCode(code) {
  try {
    const trimmed = code.trim();
    const bar = trimmed.indexOf("|");
    if (bar < 0 || trimmed[0] !== "b") return null;
    const b = parseInt(trimmed.slice(1, bar), 10) || 1;
    const o = [];
    const s = {};
    trimmed.slice(bar + 1).split(",").filter(Boolean).forEach(pair => {
      const [id, stage] = pair.split(":");
      if (!ALLY_TYPES.find(t => t.id === id)) return;
      o.push(id);
      s[id] = Math.min(STAGE_MAX, Math.max(1, parseInt(stage, 10) || 1));
    });
    if (o.length === 0) return null;
    return { o, s, b };
  } catch (e) { return null; }
}
function renderTraits() {
  const box = document.getElementById("trait-list");
  box.innerHTML = "";
  TRAIT_KEYS.forEach(key => {
    const t = TRAITS[key];
    const strongOwned = ALLY_TYPES.filter(a => getAllyTraitInfo(a.id).strong === key && save.ownedAllies.includes(a.id)).map(a => a.name);
    const enemiesWithTrait = Object.values(CAT_DEFS).filter(c => c.trait === key).map(c => c.name);
    const card = document.createElement("div");
    card.className = "trait-card";
    card.innerHTML = `
      <div class="t-emoji">${t.emoji}</div>
      <div class="t-name">${t.label}</div>
      <div class="t-strong-list">이 속성 적: ${enemiesWithTrait.join(", ") || "없음"}</div>
      <div class="t-strong-list">내 캐릭터 중 이 속성에 강함: ${strongOwned.join(", ") || "(보유한 캐릭터 없음)"}</div>
    `;
    box.appendChild(card);
  });
}
function renderGacha() {
  document.getElementById("gacha-card-count").textContent = `🎴 보유 카드: ${save.cards}개`;
  document.getElementById("btn-gacha-pull").textContent = `뽑기 (카드 ${GACHA_COST}개)`;
  document.getElementById("btn-gacha-pull").disabled = save.cards < GACHA_COST;
  const gallery = document.getElementById("gacha-gallery");
  gallery.innerHTML = "";
  ALLY_TYPES.forEach(type => {
    const owned = save.ownedAllies.includes(type.id);
    const rarity = RARITY_INFO[getRarity(type.cost)];
    const slot = document.createElement("div");
    slot.className = "gacha-slot" + (owned ? "" : " locked");
    slot.style.boxShadow = `0 3px 0 ${rarity.color}`;
    slot.innerHTML = `${owned ? type.emoji : "❓"}<span class="g-name">${owned ? type.name : "???"}</span><span class="g-rarity" style="color:${rarity.color}">${rarity.label}</span>`;
    gallery.appendChild(slot);
  });
}

function renderRoster() {
  renderFruitBar();
  renderBaseCannonUpgrades();
  const list = document.getElementById("roster-list");
  list.innerHTML = "";
  ALLY_TYPES.filter(type => save.ownedAllies.includes(type.id)).forEach(type => {
    const prog = save.allies[type.id];
    const card = document.createElement("div");
    card.className = "roster-card";
    const atMax = prog.stage >= STAGE_MAX;
    const pct = atMax ? 100 : Math.min(100, Math.round((prog.feeds / FEEDS_PER_STAGE) * 100));
    const form = EVOLUTION_FORMS[type.id][prog.stage - 1];
    const badges = form.accessories.map(a => `<span class="badge">${a.emoji}</span>`).join("");
    const traitInfo = getAllyTraitInfo(type.id);
    const traitActive = prog.stage >= TRAIT_UNLOCK_STAGE;
    const traitText = traitInfo
      ? `${TRAITS[traitInfo.strong].emoji}${TRAITS[traitInfo.strong].label}에 강함 / ${TRAITS[traitInfo.weak].emoji}${TRAITS[traitInfo.weak].label}에 약함${traitActive ? "" : ` (6단계에 발동)`}`
      : "";
    card.innerHTML = `
      <div class="avatar stage-${prog.stage}">${form.emoji}<span class="badges">${badges}</span></div>
      <div class="name">${type.name}</div>
      <div class="stage-tag">${prog.stage}/${STAGE_MAX}단계${atMax ? " (최대)" : ""}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="trait-row">${traitText}</div>
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
    this.manualJumpT = 0;
    this.selected = false;
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

function createHero() {
  const u = new Unit("ally", ALLY_SPAWN_X);
  u.typeId = "hero";
  u.emoji = HERO_UNIT.emoji;
  u.badge = HERO_UNIT.badge;
  u.name = HERO_UNIT.name;
  u.maxHp = HERO_UNIT.hp;
  u.hp = HERO_UNIT.hp;
  u.atk = HERO_UNIT.atk;
  u.range = HERO_UNIT.range;
  u.speed = HERO_UNIT.speed;
  u.atkInterval = HERO_UNIT.atkInterval;
  return u;
}

// 고양이 데미지는 "내가 키운 강아지 화력의 80% 정도" 를 목표로, 내 부대 평균 공격력에 맞춰 매 전투마다 다시 계산한다
const ENEMY_ATK_PLAYER_RATIO = 0.8;
const CAT_TIER1_REF_ATK = (CAT_DEFS.white.atk + CAT_DEFS.gray.atk + CAT_DEFS.black.atk) / 3;
function computePlayerAvgAtk() {
  if (!save.ownedAllies || !save.ownedAllies.length) return null;
  const total = save.ownedAllies.reduce((sum, id) => {
    const base = ALLY_TYPES.find(t => t.id === id);
    if (!base) return sum;
    const stage = (save.allies[id] || {}).stage || 1;
    return sum + base.atk * (STAGE_ATK_MUL[stage] || 1) * getRarityDmgMul(base.cost);
  }, 0);
  return total / save.ownedAllies.length;
}
function computeDynamicCatAtkMul() {
  const avgAtk = computePlayerAvgAtk();
  if (!avgAtk) return 1;
  return Math.max(0.6, (avgAtk * ENEMY_ATK_PLAYER_RATIO) / CAT_TIER1_REF_ATK);
}
function createEnemy(catId, mul) {
  const def = CAT_DEFS[catId];
  const u = new Unit("enemy", ENEMY_SPAWN_X);
  u.catId = catId;
  u.emoji = def.emoji;
  u.badge = def.badge || "";
  u.name = def.name;
  u.tier = def.tier;
  u.trait = def.trait || null;
  u.maxHp = Math.round(def.hp * mul);
  u.hp = u.maxHp;
  const dynAtkMul = (battle && battle.dynamicCatAtkMul) || 1;
  u.atk = Math.round(def.atk * mul * dynAtkMul);
  u.range = def.range;
  u.speed = def.speed;
  u.atkInterval = def.atkInterval;
  return u;
}
// 상대팀도 나처럼 뽑은 캐릭터 풀이 있으면, 그 중 하나를 골라 적으로 내보낸다 (일반전에서도 좋은 상대가 나올 수 있게)
function createEnemyAllyUnit() {
  const pool = save.enemyOwnedAllies;
  if (!pool || !pool.length) return null;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const base = ALLY_TYPES.find(t => t.id === id);
  if (!base) return null;
  const stage = save.enemyAllyStages[id] || 1;
  const u = new Unit("enemy", ENEMY_SPAWN_X);
  u.typeId = id;
  u.oppAlly = true;
  u.stage = stage;
  u.maxHp = Math.round(base.hp * (STAGE_HP_MUL[stage] || 1));
  u.hp = u.maxHp;
  const dynAtkMul = (battle && battle.dynamicCatAtkMul) || 1;
  u.atk = Math.round(base.atk * (STAGE_ATK_MUL[stage] || 1) * getRarityDmgMul(base.cost) * dynAtkMul);
  u.range = base.range;
  u.speed = base.speed;
  u.atkInterval = base.atkInterval;
  return u;
}

function startStage(stageDef) {
  const playerBaseMaxHp = Math.round(PLAYER_BASE_MAX_HP * BASE_HP_MUL[save.baseLevel]);
  battle = {
    stage: stageDef,
    units: [],
    effects: [],
    projectiles: [],
    money: 100 + stageDef.globalIndex * 10,
    enemyBaseHp: stageDef.enemyBaseMaxHp,
    enemyBaseMaxHp: stageDef.enemyBaseMaxHp,
    playerBaseHp: playerBaseMaxHp,
    playerBaseMaxHp: playerBaseMaxHp,
    cooldowns: {},
    spawnTimer: 900,
    autoSpawn: false,
    bossWave: null,
    bossWaveTimer: 3000,
    itemUsed: { speed: false, atk: false, gold: false },
    itemTimer: { speed: 0, atk: 0, gold: 0 },
    dynamicCatAtkMul: computeDynamicCatAtkMul(),
    over: false,
    lastTime: performance.now(),
  };
  ALLY_TYPES.forEach(t => { battle.cooldowns[t.id] = 0; });
  selectedUnit = null;
  resetItemButtons();
  if (stageDef.finalBoss) {
    // 최종 보스전 시작과 함께 총을 든 사람 영웅을 얻고, 바로 조종할 수 있게 선택된다
    const hero = createHero();
    battle.units.push(hero);
    selectedUnit = hero;
    hero.selected = true;
    document.getElementById("control-hint").textContent = "🔫 사람 영웅 등장! 보스의 파동을 이동/점프로 피하세요";
  } else {
    document.getElementById("control-hint").textContent = "🐾 아군 캐릭터를 탭해서 골라보세요";
  }
  const autoBtn = document.getElementById("btn-autospawn");
  autoBtn.classList.remove("on");
  autoBtn.textContent = "🔁 자동 소환 OFF";
  document.getElementById("stage-label").textContent = stageDef.finalBoss ? "최종 보스전" : stageDef.worldBoss ? `${stageDef.world}세계 보스전` : stageDef.label;
  renderUnitBar();
  showScreen("screen-battle");
  requestAnimationFrame(gameLoop);
}

function startPvpBattle(oppData) {
  const myBaseMaxHp = Math.round(PLAYER_BASE_MAX_HP * BASE_HP_MUL[save.baseLevel]);
  const oppBaseMaxHp = Math.round(PLAYER_BASE_MAX_HP * BASE_HP_MUL[oppData.b || 1]);
  battle = {
    stage: { pvp: true, globalIndex: save.unlockedIndex, fruitReward: 0, moneyPerTick: 6, isBoss: false, worldBoss: false, finalBoss: false, label: "코드 대전" },
    units: [],
    effects: [],
    projectiles: [],
    money: 150,
    oppMoney: 150,
    oppData,
    enemyBaseHp: oppBaseMaxHp,
    enemyBaseMaxHp: oppBaseMaxHp,
    playerBaseHp: myBaseMaxHp,
    playerBaseMaxHp: myBaseMaxHp,
    cooldowns: {},
    oppCooldowns: {},
    spawnTimer: Infinity,
    autoSpawn: false,
    bossWave: null,
    bossWaveTimer: Infinity,
    itemUsed: { speed: false, atk: false, gold: false },
    itemTimer: { speed: 0, atk: 0, gold: 0 },
    dynamicCatAtkMul: 1,
    over: false,
    lastTime: performance.now(),
  };
  ALLY_TYPES.forEach(t => { battle.cooldowns[t.id] = 0; battle.oppCooldowns[t.id] = 0; });
  selectedUnit = null;
  resetItemButtons();
  document.getElementById("control-hint").textContent = "⚔️ 코드 대전 중!";
  const autoBtn = document.getElementById("btn-autospawn");
  autoBtn.classList.remove("on");
  autoBtn.textContent = "🔁 자동 소환 OFF";
  document.getElementById("stage-label").textContent = "⚔️ 코드 대전";
  renderUnitBar();
  showScreen("screen-battle");
  requestAnimationFrame(gameLoop);
}
function opponentAutoSpawnTick() {
  for (const id of battle.oppData.o) {
    const base = ALLY_TYPES.find(t => t.id === id);
    if (!base) continue;
    if (battle.oppCooldowns[id] > 0 || battle.oppMoney < base.cost) continue;
    battle.oppMoney -= base.cost;
    battle.oppCooldowns[id] = base.cooldown;
    const stage = battle.oppData.s[id] || 1;
    const u = new Unit("enemy", ENEMY_SPAWN_X);
    u.typeId = id;
    u.oppAlly = true;
    u.stage = stage;
    u.maxHp = Math.round(base.hp * (STAGE_HP_MUL[stage] || 1));
    u.hp = u.maxHp;
    u.atk = Math.round(base.atk * (STAGE_ATK_MUL[stage] || 1) * getRarityDmgMul(base.cost));
    u.range = base.range;
    u.speed = base.speed;
    u.atkInterval = base.atkInterval;
    battle.units.push(u);
    spawnImpact(ENEMY_SPAWN_X, LANE_Y - 10, "#ff8a8a");
  }
}

function pickCatId(stageDef, bossAlreadyOnField) {
  const pool = [];
  stageDef.tierPool.forEach(tier => pool.push(...TIER_POOL[tier]));
  // 보스는 화면에 한 번에 한 마리만 - 이미 보스가 살아있으면 새로 안 나온다
  if (stageDef.includeBoss && !bossAlreadyOnField && Math.random() < (stageDef.finalBoss ? 0.3 : stageDef.worldBoss ? 0.2 : stageDef.miniBoss ? 0.16 : 0.12)) return "boss";
  if (Math.random() < GOLD_CAT_CHANCE) return "gold";
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ===================== 유닛 버튼 바 ===================== */
function renderUnitBar() {
  const bar = document.getElementById("unit-bar");
  bar.innerHTML = "";
  ALLY_TYPES.filter(type => save.ownedAllies.includes(type.id)).forEach(type => {
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
  if (!save.ownedAllies.includes(typeId)) return;
  const allyCount = battle.units.reduce((n, u) => n + (u.side === "ally" && !u.dead ? 1 : 0), 0);
  if (allyCount >= MAX_ALLIES_ON_FIELD) {
    playSfx("noMoney");
    spawnFloatText(ALLY_SPAWN_X, LANE_Y - 40, "부대 가득 참!", "#d33");
    return;
  }
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
    if (!save.ownedAllies.includes(type.id)) continue;
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
function spawnFlyReward(x, y, text, color) {
  // 보상을 얻었을 때 위쪽 UI(돈/열매 표시) 방향으로 날아가는 것처럼 보이게 한다
  battle.effects.push({ type: "flyReward", x, y, toX: CANVAS_W / 2, toY: 20, life: 800, maxLife: 800, text, color: color || "#333" });
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
  if (unit.side === "enemy" && !unit.oppAlly) {
    const isGold = unit.catId === "gold";
    const goldMul = battle.itemTimer.gold > 0 ? 1.5 : 1;
    const reward = Math.round((6 + unit.tier * 4) * (isGold ? 5 : 1) * goldMul);
    battle.money += reward;
    spawnFlyReward(unit.x, unit.y - 30, `+${reward}💰`, "#b8860b");
    const dropChance = isGold ? 1 : 0.13;
    if (Math.random() < dropChance) {
      const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
      save.fruits[f.id]++;
      spawnFlyReward(unit.x, unit.y - 55, `${f.emoji} +1 획득!`, "#3f8ce0");
      playSfx("feed");
      persistSave();
    }
    if (isGold) {
      spawnFloatText(unit.x, unit.y - 82, "💰 황금 고양이!", "#e0a800");
    }
  } else if (unit.oppAlly) {
    const reward = 8 + (unit.stage || 1) * 3;
    battle.money += reward;
    spawnFlyReward(unit.x, unit.y - 30, `+${reward}💰`, "#b8860b");
  }
}

function updateUnit(u, dt) {
  if (u.dead) return;
  if (u.side === "ally" && u.typeId !== "hero") {
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
        // "공격력 2배" 아이템은 아군(오프얼라이 상대팀 제외)에게만 적용된다
        const atkMul = (u.side === "ally" && !u.oppAlly && battle.itemTimer.atk > 0) ? 1.5 : 1;
        // 6단계까지 강화하면 특성이 붙어서 특정 속성 상대에게는 강하고, 다른 속성 상대에게는 약해진다
        let traitMul = 1;
        if (u.side === "ally" && !u.oppAlly && u.stage >= TRAIT_UNLOCK_STAGE && found.target.trait) {
          const info = getAllyTraitInfo(u.typeId);
          if (info) {
            if (info.strong === found.target.trait) traitMul *= TRAIT_STRONG_MUL;
            else if (info.weak === found.target.trait) traitMul *= TRAIT_WEAK_MUL;
          }
        } else if (u.side === "enemy" && u.trait && found.target.side === "ally" && !found.target.oppAlly && found.target.stage >= TRAIT_UNLOCK_STAGE) {
          const info = getAllyTraitInfo(found.target.typeId);
          if (info && info.weak === u.trait) traitMul *= TRAIT_TAKEN_WEAK_MUL;
        }
        const dmg = Math.round(u.atk * atkMul * traitMul);
        dealDamageToUnit(found.target, dmg);
        if (u.aoe) {
          // 너구리처럼 광역 공격형 유닛은 주 타겟 옆의 다른 적에게도 약한 스플래시 피해를 준다
          let splash = null, splashDist = Infinity;
          for (const o of battle.units) {
            if (o.dead || o.side === u.side || o === found.target) continue;
            const d = Math.abs(o.x - u.x);
            if (d <= u.range && d < splashDist) { splashDist = d; splash = o; }
          }
          if (splash) dealDamageToUnit(splash, Math.round(dmg * 0.4));
        }
        u.atkTimer = u.atkInterval;
        u.attackAnim = 180;
      }
    } else if (!u.selected) {
      // 플레이어가 직접 조종 중인 캐릭터는 자동으로 앞으로 나가지 않는다
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
    } else if (!u.selected) {
      u.x += dir * u.speed * (dt / 1000);
    }
  }
  if (u.attackAnim > 0) u.attackAnim -= dt;
  if (u.manualJumpT > 0) u.manualJumpT -= dt;
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

const CANNON_FLIGHT_SPEED = 1500; // px/sec, 포탄이 화면을 가로지르는 속도

function fireCannon() {
  // 쿨타임 없이 누르는 즉시 항상 최대 위력으로 발사된다
  const dmg = Math.round((220 + battle.stage.globalIndex * 32) * CANNON_DMG_MUL[save.cannonLevel]);
  battle.projectiles.push({ x: RIGHT_BASE_X - 46, y: LANE_Y - 6, dmg, hit: false, trail: [], level: save.cannonLevel, hitIds: new Set() });
  spawnBurst(RIGHT_BASE_X - 30, LANE_Y - 6, "#5ec8e8");
  playSfx("cannon");
}
function updateProjectiles(dt) {
  for (const p of battle.projectiles) {
    p.trail.push(p.x);
    if (p.trail.length > 5) p.trail.shift();
    const step = CANNON_FLIGHT_SPEED * (dt / 1000);
    const newX = p.x - step;
    // 파도는 한 명에서 멈추지 않고, 지나가는 자리에 있던 모든 적을 관통하며 데미지를 준다
    for (const u of battle.units) {
      if (u.dead || u.side !== "enemy" || p.hitIds.has(u)) continue;
      if (u.x <= p.x && u.x >= newX) {
        dealDamageToUnit(u, p.dmg);
        u.x = Math.max(ENEMY_SPAWN_X, u.x - 20); // 넉백: 적 기지 쪽으로 살짝 밀려남
        spawnBurst(u.x, u.y - 20, "#5ec8e8");
        p.hitIds.add(u);
      }
    }
    p.x = newX;
    if (p.x <= LEFT_BASE_X) {
      p.hit = true;
      // 적을 한 명이라도 맞혔으면 기지는 안 맞고, 지나가는 길에 적이 하나도 없었을 때만 기지를 직격한다
      if (p.hitIds.size === 0) {
        attackBase("ally", p.dmg);
        spawnBurst(LEFT_BASE_X, LANE_Y - 6, "#5ec8e8");
        spawnFloatText(LEFT_BASE_X, LANE_Y - 90, `기지 명중 -${p.dmg}`, "#e04545");
      }
    }
  }
  battle.projectiles = battle.projectiles.filter(p => !p.hit);
}
const CANNON_WAVE_LOOK = {
  1: { emoji: "🌊", size: 50 },
  2: { emoji: "🌊", size: 72 },
  3: { emoji: "🌀", size: 78 },
};
function drawProjectiles() {
  for (const p of battle.projectiles) {
    const look = CANNON_WAVE_LOOK[p.level || 1];
    const bob = Math.sin(performance.now() / 60) * 4;
    // 지나온 자리에 남는 파도(또는 파동) 잔상
    p.trail.forEach((tx, i) => {
      ctx.save();
      ctx.globalAlpha = ((i + 1) / p.trail.length) * 0.35;
      ctx.font = `${look.size * 0.68}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(look.emoji, tx, p.y + bob);
      ctx.restore();
    });
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.level >= 3) {
      // 3단계 "파동"은 번쩍이는 에너지 링을 두른다
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 40);
      ctx.beginPath();
      ctx.arc(0, 0, look.size * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "#8fd3ff";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.font = `${look.size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(look.emoji, 0, 0);
    ctx.restore();
  }
}

function updateBossWave(dt) {
  if (!battle.stage.finalBoss) return;
  if (!battle.bossWave) {
    battle.bossWaveTimer -= dt;
    if (battle.bossWaveTimer <= 0) {
      battle.bossWave = { x: LEFT_BASE_X, resolved: false };
      battle.bossWaveTimer = 4500 + Math.random() * 2000;
      spawnFloatText(CANVAS_W / 2, LANE_Y - 130, "⚠️ 보스 파동 공격! 점프로 피하세요", "#e04545");
      playSfx("baseHit");
    }
    return;
  }
  const w = battle.bossWave;
  w.x += BOSS_WAVE_SPEED * (dt / 1000);
  if (!w.resolved && selectedUnit && !selectedUnit.dead && selectedUnit.side === "ally") {
    if (Math.abs(selectedUnit.x - w.x) < 22) {
      w.resolved = true;
      if (selectedUnit.manualJumpT > 0) {
        spawnFloatText(selectedUnit.x, selectedUnit.y - 70, "회피 성공!", "#3f8ce0");
        playSfx("feed");
      } else {
        const dmg = Math.round(selectedUnit.maxHp * BOSS_WAVE_DAMAGE_RATIO);
        dealDamageToUnit(selectedUnit, dmg);
      }
    }
  }
  if (w.x > RIGHT_BASE_X + 40) battle.bossWave = null;
}
function drawBossWave() {
  if (!battle.bossWave) return;
  ctx.save();
  ctx.translate(battle.bossWave.x, LANE_Y - 20);
  ctx.font = "60px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("💢", 0, 0);
  ctx.restore();
}
document.getElementById("btn-autospawn").addEventListener("click", (e) => {
  if (!battle || battle.over) return;
  battle.autoSpawn = !battle.autoSpawn;
  e.currentTarget.classList.toggle("on", battle.autoSpawn);
  e.currentTarget.textContent = battle.autoSpawn ? "🔁 자동 소환 ON" : "🔁 자동 소환 OFF";
  playSfx("click");
});
document.getElementById("btn-cannon").addEventListener("click", () => {
  if (!battle || battle.over) return;
  fireCannon(); // 쿨타임 없이 누르는 즉시 발사
});
const ITEM_DURATION = 12000; // 아이템 효과 지속시간(ms)
function updateItemUI() {
  const labels = { speed: "⚡ 2배속", atk: "💥 공격 2배", gold: "💰 골드 2배" };
  ["speed", "atk", "gold"].forEach(kind => {
    const btn = document.getElementById(`btn-item-${kind}`);
    if (battle.itemTimer[kind] > 0) {
      btn.textContent = `${labels[kind]} (${Math.ceil(battle.itemTimer[kind] / 1000)}s)`;
    } else if (!battle.itemUsed[kind]) {
      btn.textContent = labels[kind];
    } else {
      btn.textContent = `${labels[kind]} (사용함)`;
    }
  });
}
function resetItemButtons() {
  ["speed", "atk", "gold"].forEach(kind => {
    const btn = document.getElementById(`btn-item-${kind}`);
    btn.disabled = false;
    btn.classList.remove("active");
  });
}
function useItem(kind) {
  if (!battle || battle.over || battle.itemUsed[kind]) return;
  battle.itemUsed[kind] = true;
  battle.itemTimer[kind] = ITEM_DURATION;
  const btn = document.getElementById(`btn-item-${kind}`);
  btn.disabled = true;
  btn.classList.add("active");
  playSfx("evolve");
  const labels = { speed: "⚡ 1.5배속 발동!", atk: "💥 공격력 1.5배 발동!", gold: "💰 골드 1.5배 발동!" };
  spawnFloatText(CANVAS_W / 2, LANE_Y - 130, labels[kind], "#3f8ce0");
}
["speed", "atk", "gold"].forEach(kind => {
  document.getElementById(`btn-item-${kind}`).addEventListener("click", () => useItem(kind));
});

function endStage(win) {
  if (battle.over) return;
  battle.over = true;
  playSfx(win ? "win" : "lose");
  if (battle.stage.pvp) {
    document.getElementById("result-title").textContent = win ? "⚔️ 대전 승리!" : "⚔️ 대전 패배...";
    document.getElementById("result-desc").textContent = win
      ? "내 부대가 상대 부대를 이겼어요!"
      : "상대 부대가 더 강했어요. 부대를 더 키워서 다시 도전해보세요.";
    document.getElementById("result-overlay").classList.remove("hidden");
    return;
  }
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
    const cardsGained = battle.stage.finalBoss ? 50 : battle.stage.worldBoss ? 15 : (1 + Math.floor(battle.stage.globalIndex / 60));
    save.cards += cardsGained;
    persistSave();
    let title = "승리!";
    let desc = `보상 열매: ${gained.join(" ")} / 🎴 카드 +${cardsGained}`;
    if (battle.stage.finalBoss) {
      title = "🎉 게임 클리어! 🎉";
      desc = "모든 세계와 최종 보스를 클리어했습니다! 최고의 강아지 부대예요.";
    } else if (battle.stage.worldBoss) {
      title = `👑 ${battle.stage.world}세계 클리어!`;
      desc = `다음 세계로 나아가세요! 보상 열매: ${gained.join(" ")} / 🎴 카드 +${cardsGained}`;
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

let selectedUnit = null;
canvas.addEventListener("click", (e) => {
  if (!battle) return;
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  const cy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
  let best = null, bestDist = 46;
  for (const u of battle.units) {
    if (u.dead || u.side !== "ally") continue;
    const d = Math.hypot(u.x - cx, u.y - cy);
    if (d < bestDist) { bestDist = d; best = u; }
  }
  if (best) {
    if (selectedUnit) selectedUnit.selected = false;
    selectedUnit = best;
    selectedUnit.selected = true;
    document.getElementById("control-hint").textContent = `🐾 ${selectedUnit.name || ""} 선택됨 - 조종해보세요!`;
    playSfx("click");
  }
});
function nudgeSelected(dir) {
  if (!selectedUnit || selectedUnit.dead) return;
  // 조종 중인 캐릭터는 자동으로 전진하지 않으므로, 실제 위치를 직접 옮겨준다
  const min = ENEMY_SPAWN_X - 20, max = ALLY_SPAWN_X + 20;
  selectedUnit.x = Math.max(min, Math.min(max, selectedUnit.x + dir * 22));
}
function jumpSelected() {
  if (!selectedUnit || selectedUnit.dead) return;
  if (selectedUnit.manualJumpT <= 0) {
    selectedUnit.manualJumpT = 420;
    playSfx("feed");
  }
}
// 화면상의 화살표 방향과 실제 이동 방향이 일치하도록 맞춘다 (◀=왼쪽/x감소, ▶=오른쪽/x증가)
document.getElementById("btn-move-back").addEventListener("click", () => nudgeSelected(-1));
document.getElementById("btn-move-fwd").addEventListener("click", () => nudgeSelected(1));
document.getElementById("btn-jump").addEventListener("click", jumpSelected);
document.addEventListener("keydown", (e) => {
  if (!screens["screen-battle"] || !screens["screen-battle"].classList.contains("active")) return;
  if (e.key === "ArrowLeft") nudgeSelected(-1);
  else if (e.key === "ArrowRight") nudgeSelected(1);
  else if (e.key === "ArrowUp" || e.key === " ") { jumpSelected(); e.preventDefault(); }
});

function drawBase(x, side, hp, maxHp) {
  const baseLevel = side === "ally" ? save.baseLevel : 1;
  const growth = 1 + (baseLevel - 1) * 0.16;
  ctx.save();
  ctx.translate(x, LANE_Y);
  ctx.beginPath();
  ctx.ellipse(0, 6, 50 * growth, 14 * growth, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fill();
  ctx.fillStyle = side === "ally" ? "#7fb8e8" : "#e88a8a";
  ctx.strokeStyle = side === "ally" ? "#2f6ca8" : "#a83f3f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-52 * growth, -118 * growth, 104 * growth, 122 * growth, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${68 * growth}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(side === "ally" ? "🐶" : "😾", 0, -55 * growth);
  if (side === "ally" && baseLevel >= 2) {
    ctx.font = `${30 * growth}px sans-serif`;
    ctx.fillText("🛡️", 42 * growth, -30 * growth);
  }
  if (side === "ally" && baseLevel >= 3) {
    ctx.font = `${30 * growth}px sans-serif`;
    ctx.fillText("🚩", -42 * growth, -95 * growth);
  }
  const pct = Math.max(0, hp / maxHp);
  const barY = -118 * growth - 20;
  ctx.fillStyle = "#fff";
  ctx.fillRect(-54, barY, 108, 12);
  ctx.fillStyle = side === "ally" ? "#3f8ce0" : "#e04545";
  ctx.fillRect(-54, barY, 108 * pct, 12);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.strokeRect(-54, barY, 108, 12);
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
  // 플레이어가 직접 조종할 때 쓰는 점프 연출 (좌우 이동은 실제 위치를 바꾸고, 점프만 연출용)
  const jumpHeight = u.manualJumpT > 0 ? Math.sin((1 - u.manualJumpT / 420) * Math.PI) * 26 : 0;

  ctx.translate(u.x + lunge, u.y + bob - jumpHeight);
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
  if ((u.side === "ally" || u.oppAlly) && EVOLUTION_FORMS[u.typeId]) {
    const form = EVOLUTION_FORMS[u.typeId][(u.stage || 1) - 1];
    if (u.oppAlly) ctx.filter = "hue-rotate(150deg) saturate(1.6)"; // 상대팀 부대는 색을 다르게 해서 구분한다
    ctx.fillText(form.emoji, 0, 0);
    ctx.filter = "none";
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

  if (u.selected) {
    const markerBob = Math.sin(performance.now() / 130) * 4;
    ctx.save();
    ctx.translate(u.x, barY - 22 + markerBob - jumpHeight);
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👆", 0, 0);
    ctx.restore();
  }
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
    } else if (e.type === "flyReward") {
      const ease = 1 - Math.pow(1 - t, 2);
      const px = e.x + (e.toX - e.x) * ease;
      const py = e.y + (e.toY - e.y) * ease;
      ctx.globalAlpha = t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = e.color;
      ctx.textAlign = "center";
      ctx.fillText(e.text, px, py);
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
  drawBase(RIGHT_BASE_X, "ally", battle.playerBaseHp, battle.playerBaseMaxHp);
  for (const u of battle.units) if (!u.dead) drawUnit(u);
  drawProjectiles();
  drawBossWave();
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
  const rawDt = Math.min(60, now - battle.lastTime);
  battle.lastTime = now;
  let dt = rawDt;

  if (!battle.over) {
    ["speed", "atk", "gold"].forEach(kind => {
      if (battle.itemTimer[kind] > 0) battle.itemTimer[kind] = Math.max(0, battle.itemTimer[kind] - rawDt);
    });
    // "1.5배속" 아이템이 켜져 있으면 이후의 모든 갱신에 쓰이는 dt를 1.5배로 늘려 게임 진행 자체를 빠르게 한다
    dt = battle.itemTimer.speed > 0 ? rawDt * 1.5 : rawDt;
    const goldMul = battle.itemTimer.gold > 0 ? 1.5 : 1;
    battle.money += battle.stage.moneyPerTick * goldMul * (dt / 1000);
    ALLY_TYPES.forEach(t => {
      if (battle.cooldowns[t.id] > 0) battle.cooldowns[t.id] = Math.max(0, battle.cooldowns[t.id] - dt);
    });

    if (battle.stage.pvp) {
      battle.oppMoney += 6 * (dt / 1000);
      ALLY_TYPES.forEach(t => {
        if (battle.oppCooldowns[t.id] > 0) battle.oppCooldowns[t.id] = Math.max(0, battle.oppCooldowns[t.id] - dt);
      });
      opponentAutoSpawnTick();
    } else {
      battle.spawnTimer -= dt;
      if (battle.spawnTimer <= 0) {
        const enemyCount = battle.units.reduce((n, u) => n + (u.side === "enemy" && !u.dead ? 1 : 0), 0);
        if (enemyCount < MAX_ENEMIES_ON_FIELD) {
          // 상대팀도 뽑은 캐릭터가 있으면 가끔 고양이 대신 그 캐릭터가 나온다
          const enemyAllyUnit = (Math.random() < 0.25) ? createEnemyAllyUnit() : null;
          if (enemyAllyUnit) {
            battle.units.push(enemyAllyUnit);
          } else {
            const bossAlive = battle.units.some(u => u.side === "enemy" && u.catId === "boss" && !u.dead);
            const catId = pickCatId(battle.stage, bossAlive);
            battle.units.push(createEnemy(catId, battle.stage.catStatMul));
          }
          spawnImpact(ENEMY_SPAWN_X, LANE_Y - 10, "#ff8a8a");
          playSfx("spawnEnemy");
          battle.spawnTimer = battle.stage.spawnInterval;
        } else {
          // 화면에 적이 너무 많이 쌓이지 않도록 상한을 두고, 여유가 생기면 곧바로 다시 시도한다
          battle.spawnTimer = 400;
        }
      }
    }

    for (const u of battle.units) updateUnit(u, dt);
    battle.units = battle.units.filter(u => !u.dead);
    updateProjectiles(dt);
    if (battle.autoSpawn) autoSpawnTick();
    updateBossWave(dt);

    document.getElementById("enemy-hp-fill").style.width = `${(battle.enemyBaseHp / battle.enemyBaseMaxHp) * 100}%`;
    document.getElementById("player-hp-fill").style.width = `${(battle.playerBaseHp / battle.playerBaseMaxHp) * 100}%`;
    document.getElementById("money-label").textContent = `💰 ${Math.floor(battle.money)}`;
    updateUnitBarUI();
    updateItemUI();
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
document.getElementById("btn-open-gacha").addEventListener("click", () => {
  playSfx("click");
  renderGacha();
  showScreen("screen-gacha");
});
document.getElementById("btn-open-pvp").addEventListener("click", () => {
  playSfx("click");
  document.getElementById("pvp-my-code").value = exportPvpCode();
  document.getElementById("pvp-error").textContent = "";
  showScreen("screen-pvp");
});
document.getElementById("btn-open-traits").addEventListener("click", () => {
  playSfx("click");
  renderTraits();
  showScreen("screen-traits");
});
document.getElementById("btn-traits-back").addEventListener("click", () => {
  playSfx("click");
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-pvp-back").addEventListener("click", () => {
  playSfx("click");
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-pvp-copy").addEventListener("click", async () => {
  const code = document.getElementById("pvp-my-code").value;
  try {
    await navigator.clipboard.writeText(code);
    playSfx("feed");
    document.getElementById("pvp-error").style.color = "#3f8ce0";
    document.getElementById("pvp-error").textContent = "복사됐어요!";
  } catch (e) {
    document.getElementById("pvp-my-code").select();
    document.getElementById("pvp-error").textContent = "복사 실패 - 직접 선택해서 복사해주세요";
  }
});
document.getElementById("btn-pvp-fight").addEventListener("click", () => {
  const raw = document.getElementById("pvp-opp-code").value;
  const oppData = importPvpCode(raw);
  const errEl = document.getElementById("pvp-error");
  if (!oppData) {
    errEl.style.color = "#d33";
    errEl.textContent = "코드가 올바르지 않아요. 다시 확인해주세요.";
    playSfx("noMoney");
    return;
  }
  errEl.textContent = "";
  playSfx("click");
  startPvpBattle(oppData);
});
document.getElementById("btn-gacha-back").addEventListener("click", () => {
  playSfx("click");
  renderStageGrid();
  showScreen("screen-stageselect");
});
document.getElementById("btn-gacha-pull").addEventListener("click", () => {
  const result = gachaPull();
  const box = document.getElementById("gacha-result");
  if (!result) {
    playSfx("noMoney");
    box.textContent = "🎴 카드가 부족해요!";
  } else if (result.type) {
    playSfx("evolve");
    box.textContent = `🎉 [${RARITY_INFO[getRarity(result.type.cost)].label}] ${result.type.emoji} ${result.type.name} 획득!`;
  } else {
    playSfx("feed");
    box.textContent = `이미 모든 캐릭터를 보유 중! 대신 ${result.consolationFruit.emoji} 열매 5개를 받았어요.`;
  }
  box.classList.remove("reveal");
  requestAnimationFrame(() => box.classList.add("reveal"));
  renderGacha();
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
