// ===================
// ゲームデータ：敵
// ===================

(function () {
  "use strict";

  // 二つ名（倍率 + 特殊効果）
  // multipliers は 1.0 基準の倍率。effects は敵の特殊挙動。
  const epithets = [
    {
      name: "怒れる",
      multipliers: { hp: 1.1, str: 1.35, vit: 1.15, agi: 1.0, dex: 1.0, int: 1.0, exp: 1.1 },
      effects: { enrageBelowHpRate: 0.5, enrageDamageMul: 1.25 },
    },
    {
      name: "神速の",
      multipliers: { hp: 1.05, str: 1.1, vit: 1.05, agi: 1.45, dex: 1.15, int: 1.0, exp: 1.2 },
      effects: { extraTurnChance: 0.15 },
    },
    {
      name: "魔導の",
      multipliers: { hp: 1.05, str: 1.0, vit: 1.05, agi: 1.05, dex: 1.0, int: 1.5, exp: 1.25 },
      effects: { preferMagic: true },
    },
    {
      name: "強靭なる",
      multipliers: { hp: 1.55, str: 1.05, vit: 1.45, agi: 0.95, dex: 1.0, int: 1.0, exp: 1.25 },
      effects: { damageReduction: 0.15 },
    },
    {
      name: "不死の",
      multipliers: { hp: 1.35, str: 1.05, vit: 1.25, agi: 1.0, dex: 1.0, int: 1.0, exp: 1.3 },
      effects: { regenRate: 0.05 },
    },
    {
      name: "必中の",
      multipliers: { hp: 1.1, str: 1.15, vit: 1.1, agi: 1.0, dex: 1.4, int: 1.0, exp: 1.25 },
      effects: { alwaysHit: true },
    },
    {
      name: "狡猾なる",
      multipliers: { hp: 1.05, str: 1.1, vit: 1.0, agi: 1.25, dex: 1.35, int: 1.0, exp: 1.2 },
      effects: { poisonOnHitChance: 0.25, poisonTurns: 3 },
    },
    {
      name: "破壊の",
      multipliers: { hp: 1.1, str: 1.55, vit: 1.1, agi: 1.0, dex: 1.0, int: 1.0, exp: 1.35 },
      effects: { armorPierceRate: 0.35 },
    },
  ];

  // 敵スキル定義
  // NOTE: 状態異常は core.js の applyOnHitStatuses が受け取って処理する。
  const enemySkills = {
    power_strike: {
      name: "強打",
      cooldown: 2,
      kind: "physical",
      damageMultiplier: 1.6,
      hitBonus: 10,
    },
    multi_slash: {
      name: "連撃",
      cooldown: 3,
      kind: "physical",
      hits: 2,
      damageMultiplier: 0.75,
      hitBonus: 0,
    },
    fireball: {
      name: "火球",
      cooldown: 2,
      kind: "magic",
      damageMultiplier: 1.35,
      hitBonus: 15,
      burnChance: 0.2,
      burnTurns: 2,
    },
    bite_poison: {
      name: "毒牙",
      cooldown: 3,
      kind: "physical",
      damageMultiplier: 1.1,
      hitBonus: 5,
      poisonChance: 0.35,
      poisonTurns: 3,
    },
    heal: {
      name: "自己再生",
      cooldown: 4,
      kind: "heal",
      healRate: 0.22,
    },
    roar: {
      name: "咆哮",
      cooldown: 4,
      kind: "debuff",
      debuff: { accuracyDownTurns: 2, accuracyDownRate: 0.2 },
    },

    // 追加：状態異常系
    ice_lance: {
      name: "氷槍",
      cooldown: 3,
      kind: "magic",
      damageMultiplier: 1.15,
      hitBonus: 15,
      slowChance: 0.35,
      slowTurns: 2,
      slowRate: 0.25,
    },
    thunder_strike: {
      name: "雷撃",
      cooldown: 3,
      kind: "magic",
      damageMultiplier: 1.25,
      hitBonus: 20,
      stunChance: 0.25,
      stunTurns: 1,
    },
    bleeding_slash: {
      name: "裂傷",
      cooldown: 3,
      kind: "physical",
      damageMultiplier: 1.15,
      hitBonus: 10,
      bleedChance: 0.4,
      bleedTurns: 3,
    },
    toxic_spit: {
      name: "毒液",
      cooldown: 3,
      kind: "magic",
      damageMultiplier: 1.05,
      hitBonus: 10,
      poisonChance: 0.45,
      poisonTurns: 4,
    },
    crushing_blow: {
      name: "粉砕",
      cooldown: 4,
      kind: "physical",
      damageMultiplier: 1.45,
      hitBonus: 5,
      vulnerableChance: 0.35,
      vulnerableTurns: 2,
      vulnerableRate: 0.3,
    },
    silence_hex: {
      name: "封印の呪い",
      cooldown: 4,
      kind: "debuff",
      silenceChance: 1.0,
      silenceTurns: 1,
    },
    doom_mark: {
      name: "死印",
      cooldown: 5,
      kind: "debuff",
      vulnerableChance: 1.0,
      vulnerableTurns: 3,
      vulnerableRate: 0.35,
    },
  };

  // モンスター定義
  // minFloor / maxFloor: 出現レンジ
  // skills: 敵が使うスキル（enemySkills の id）
  const monsterTypes = [
    // --------------------
    // 0〜100F
    // --------------------
    { name: "スライム", hp: 55, str: 5, vit: 3, int: 1, agi: 2, dex: 3, exp: 22, minFloor: 1, maxFloor: 100, skills: ["multi_slash"] },
    { name: "コウモリ", hp: 60, str: 6, vit: 3, int: 2, agi: 10, dex: 8, exp: 26, minFloor: 1, maxFloor: 100, skills: ["multi_slash"] },
    { name: "ゴブリン", hp: 85, str: 8, vit: 5, int: 2, agi: 6, dex: 7, exp: 35, minFloor: 1, maxFloor: 100, skills: ["power_strike", "roar"] },
    { name: "コボルド", hp: 95, str: 9, vit: 5, int: 2, agi: 8, dex: 9, exp: 40, minFloor: 3, maxFloor: 100, skills: ["bleeding_slash"] },
    { name: "ウルフ", hp: 110, str: 10, vit: 7, int: 2, agi: 12, dex: 9, exp: 46, minFloor: 5, maxFloor: 100, skills: ["multi_slash", "bite_poison"] },
    { name: "スケルトン", hp: 130, str: 11, vit: 9, int: 3, agi: 6, dex: 8, exp: 55, minFloor: 8, maxFloor: 100, skills: ["bleeding_slash"] },
    { name: "盗賊", hp: 120, str: 10, vit: 7, int: 3, agi: 14, dex: 14, exp: 60, minFloor: 10, maxFloor: 100, skills: ["multi_slash", "roar"] },
    { name: "オーク", hp: 170, str: 14, vit: 12, int: 3, agi: 5, dex: 6, exp: 70, minFloor: 15, maxFloor: 100, skills: ["power_strike", "crushing_blow"] },
    { name: "ハーピー", hp: 155, str: 12, vit: 10, int: 6, agi: 16, dex: 12, exp: 75, minFloor: 18, maxFloor: 100, skills: ["roar", "ice_lance"] },
    { name: "リザードマン", hp: 190, str: 15, vit: 13, int: 4, agi: 9, dex: 9, exp: 85, minFloor: 22, maxFloor: 100, skills: ["bite_poison", "power_strike"] },
    { name: "トロール", hp: 280, str: 18, vit: 16, int: 3, agi: 4, dex: 5, exp: 110, minFloor: 28, maxFloor: 100, skills: ["heal", "crushing_blow"] },
    { name: "ダークエルフ", hp: 220, str: 12, vit: 11, int: 18, agi: 14, dex: 13, exp: 120, minFloor: 32, maxFloor: 100, skills: ["fireball", "ice_lance", "multi_slash"] },
    { name: "サソリ", hp: 240, str: 16, vit: 14, int: 3, agi: 10, dex: 10, exp: 125, minFloor: 40, maxFloor: 100, skills: ["toxic_spit", "bite_poison"] },
    { name: "ゴーレム", hp: 380, str: 18, vit: 22, int: 2, agi: 3, dex: 6, exp: 150, minFloor: 55, maxFloor: 100, skills: ["crushing_blow"] },
    { name: "リッチ", hp: 330, str: 10, vit: 14, int: 30, agi: 8, dex: 11, exp: 180, minFloor: 65, maxFloor: 100, skills: ["fireball", "ice_lance", "heal"] },
    { name: "ミノタウロス", hp: 420, str: 24, vit: 20, int: 4, agi: 9, dex: 10, exp: 190, minFloor: 80, maxFloor: 100, skills: ["power_strike", "roar", "crushing_blow"] },
    { name: "ドラゴン", hp: 520, str: 28, vit: 22, int: 18, agi: 11, dex: 16, exp: 220, minFloor: 95, maxFloor: 100, skills: ["fireball", "power_strike", "roar"] },

    // --------------------
    // 100〜200F
    // --------------------
    { name: "装甲オーク", hp: 650, str: 30, vit: 30, int: 5, agi: 6, dex: 10, exp: 260, minFloor: 101, maxFloor: 200, skills: ["crushing_blow", "power_strike"] },
    { name: "影の暗殺者", hp: 520, str: 28, vit: 18, int: 8, agi: 26, dex: 24, exp: 275, minFloor: 105, maxFloor: 200, skills: ["multi_slash", "bleeding_slash", "roar"] },
    { name: "ワーウルフ", hp: 720, str: 34, vit: 22, int: 6, agi: 22, dex: 18, exp: 290, minFloor: 112, maxFloor: 200, skills: ["multi_slash", "bite_poison", "bleeding_slash"] },
    { name: "死霊騎士", hp: 820, str: 36, vit: 32, int: 10, agi: 12, dex: 16, exp: 310, minFloor: 120, maxFloor: 200, skills: ["crushing_blow", "doom_mark"] },
    { name: "邪術師", hp: 640, str: 20, vit: 22, int: 40, agi: 14, dex: 16, exp: 330, minFloor: 128, maxFloor: 200, skills: ["fireball", "ice_lance", "silence_hex"] },
    { name: "ワイバーン", hp: 900, str: 38, vit: 28, int: 18, agi: 18, dex: 20, exp: 350, minFloor: 135, maxFloor: 200, skills: ["fireball", "thunder_strike", "roar"] },
    { name: "バジリスク", hp: 980, str: 40, vit: 30, int: 16, agi: 14, dex: 18, exp: 370, minFloor: 145, maxFloor: 200, skills: ["toxic_spit", "doom_mark"] },
    { name: "キマイラ", hp: 1050, str: 42, vit: 34, int: 20, agi: 16, dex: 18, exp: 390, minFloor: 155, maxFloor: 200, skills: ["multi_slash", "fireball", "bite_poison"] },
    { name: "雷の精霊", hp: 760, str: 24, vit: 20, int: 44, agi: 20, dex: 22, exp: 420, minFloor: 165, maxFloor: 200, skills: ["thunder_strike", "ice_lance"] },
    { name: "上級デーモン", hp: 1150, str: 44, vit: 36, int: 30, agi: 18, dex: 20, exp: 450, minFloor: 175, maxFloor: 200, skills: ["fireball", "bleeding_slash", "silence_hex"] },
    { name: "古きドラゴン", hp: 1400, str: 50, vit: 40, int: 26, agi: 16, dex: 22, exp: 500, minFloor: 190, maxFloor: 200, skills: ["fireball", "crushing_blow", "doom_mark"] },

    // --------------------
    // 200〜500F
    // --------------------
    { name: "深淵の魔導師", hp: 1700, str: 35, vit: 36, int: 70, agi: 18, dex: 24, exp: 620, minFloor: 201, maxFloor: 500, skills: ["fireball", "ice_lance", "silence_hex", "doom_mark"] },
    { name: "虚無の死神", hp: 1900, str: 60, vit: 38, int: 40, agi: 30, dex: 30, exp: 680, minFloor: 215, maxFloor: 500, skills: ["bleeding_slash", "multi_slash", "doom_mark"] },
    { name: "鉄巨人", hp: 2600, str: 72, vit: 70, int: 10, agi: 8, dex: 18, exp: 720, minFloor: 230, maxFloor: 500, skills: ["crushing_blow", "power_strike"] },
    { name: "奈落の王", hp: 2400, str: 74, vit: 56, int: 52, agi: 20, dex: 24, exp: 760, minFloor: 250, maxFloor: 500, skills: ["fireball", "thunder_strike", "doom_mark", "heal"] },
    { name: "魂喰らい", hp: 2100, str: 58, vit: 44, int: 55, agi: 22, dex: 26, exp: 780, minFloor: 270, maxFloor: 500, skills: ["silence_hex", "toxic_spit", "ice_lance"] },
    { name: "冥界の竜", hp: 3100, str: 82, vit: 64, int: 46, agi: 22, dex: 30, exp: 820, minFloor: 300, maxFloor: 500, skills: ["fireball", "crushing_blow", "thunder_strike"] },
    { name: "終焉の騎士", hp: 2800, str: 88, vit: 62, int: 30, agi: 24, dex: 28, exp: 860, minFloor: 330, maxFloor: 500, skills: ["crushing_blow", "bleeding_slash", "doom_mark"] },
    { name: "虚空の天使", hp: 2500, str: 70, vit: 52, int: 60, agi: 26, dex: 28, exp: 900, minFloor: 360, maxFloor: 500, skills: ["ice_lance", "thunder_strike", "silence_hex"] },
    { name: "災厄の大公", hp: 3400, str: 92, vit: 72, int: 68, agi: 24, dex: 30, exp: 960, minFloor: 400, maxFloor: 500, skills: ["fireball", "doom_mark", "heal", "crushing_blow"] },
    { name: "原初の龍王", hp: 4200, str: 110, vit: 88, int: 76, agi: 26, dex: 34, exp: 1050, minFloor: 450, maxFloor: 500, skills: ["fireball", "thunder_strike", "doom_mark", "crushing_blow"] },
  ];

  window.epithets = epithets;
  window.enemySkills = enemySkills;
  window.monsterTypes = monsterTypes;
})();
