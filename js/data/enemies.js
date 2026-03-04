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
    {
      name: "執念の",
      multipliers: { hp: 1.25, str: 1.1, vit: 1.2, agi: 1.0, dex: 1.0, int: 1.0, exp: 1.25 },
      effects: { regenRate: 0.03, enrageBelowHpRate: 0.35, enrageDamageMul: 1.2 },
    },
    {
      name: "雷鳴の",
      multipliers: { hp: 1.0, str: 1.05, vit: 1.0, agi: 1.35, dex: 1.1, int: 1.15, exp: 1.25 },
      effects: { extraTurnChance: 0.1, alwaysHit: true },
    },
    {
      name: "堅牢なる",
      multipliers: { hp: 1.4, str: 1.0, vit: 1.55, agi: 0.9, dex: 1.0, int: 1.0, exp: 1.3 },
      effects: { damageReduction: 0.22 },
    },
    {
      name: "呪毒の",
      multipliers: { hp: 1.1, str: 1.05, vit: 1.05, agi: 1.1, dex: 1.2, int: 1.1, exp: 1.3 },
      effects: { poisonOnHitChance: 0.4, poisonTurns: 4 },
    },
    {
      name: "狂嵐の",
      multipliers: { hp: 1.05, str: 1.35, vit: 1.0, agi: 1.3, dex: 1.1, int: 1.0, exp: 1.3 },
      effects: { extraTurnChance: 0.08, armorPierceRate: 0.2 },
    },
    {
      name: "賢者の",
      multipliers: { hp: 1.1, str: 0.95, vit: 1.05, agi: 1.0, dex: 1.0, int: 1.6, exp: 1.35 },
      effects: { preferMagic: true, damageReduction: 0.08 },
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
      burnTurns: 6,
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
    { name: "コボルド", hp: 95, str: 9, vit: 5, int: 2, agi: 8, dex: 9, exp: 40, minFloor: 3, maxFloor: 100, skills: ["power_strike"] },
    { name: "ウルフ", hp: 110, str: 10, vit: 7, int: 2, agi: 12, dex: 9, exp: 46, minFloor: 5, maxFloor: 100, skills: ["multi_slash", "bite_poison"] },
    { name: "スケルトン", hp: 130, str: 11, vit: 9, int: 3, agi: 6, dex: 8, exp: 55, minFloor: 8, maxFloor: 100, skills: ["power_strike"] },
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
    { name: "影の暗殺者", hp: 520, str: 28, vit: 18, int: 8, agi: 26, dex: 24, exp: 275, minFloor: 105, maxFloor: 200, skills: ["multi_slash", "power_strike", "roar"] },
    { name: "ワーウルフ", hp: 720, str: 34, vit: 22, int: 6, agi: 22, dex: 18, exp: 290, minFloor: 112, maxFloor: 200, skills: ["multi_slash", "bite_poison", "power_strike"] },
    { name: "死霊騎士", hp: 820, str: 36, vit: 32, int: 10, agi: 12, dex: 16, exp: 310, minFloor: 120, maxFloor: 200, skills: ["crushing_blow", "doom_mark"] },
    { name: "邪術師", hp: 640, str: 20, vit: 22, int: 40, agi: 14, dex: 16, exp: 330, minFloor: 128, maxFloor: 200, skills: ["fireball", "ice_lance", "silence_hex"] },
    { name: "ワイバーン", hp: 900, str: 38, vit: 28, int: 18, agi: 18, dex: 20, exp: 350, minFloor: 135, maxFloor: 200, skills: ["fireball", "thunder_strike", "roar"] },
    { name: "バジリスク", hp: 980, str: 40, vit: 30, int: 16, agi: 14, dex: 18, exp: 370, minFloor: 145, maxFloor: 200, skills: ["toxic_spit", "doom_mark"] },
    { name: "キマイラ", hp: 1050, str: 42, vit: 34, int: 20, agi: 16, dex: 18, exp: 390, minFloor: 155, maxFloor: 200, skills: ["multi_slash", "fireball", "bite_poison"] },
    { name: "雷の精霊", hp: 760, str: 24, vit: 20, int: 44, agi: 20, dex: 22, exp: 420, minFloor: 165, maxFloor: 200, skills: ["thunder_strike", "ice_lance"] },
    { name: "上級デーモン", hp: 1150, str: 44, vit: 36, int: 30, agi: 18, dex: 20, exp: 450, minFloor: 175, maxFloor: 200, skills: ["fireball", "power_strike", "silence_hex"] },
    { name: "古きドラゴン", hp: 1400, str: 50, vit: 40, int: 26, agi: 16, dex: 22, exp: 500, minFloor: 190, maxFloor: 200, skills: ["fireball", "crushing_blow", "doom_mark"] },
    // --------------------
    // 200〜500F（テーブル見直し）
    // --------------------
    { name: "深淵の教徒", hp: 1600, str: 60, vit: 70, int: 55, agi: 20, dex: 28, exp: 600, minFloor: 201, maxFloor: 240, skills: ["fireball", "silence_hex"] },
    { name: "黒鎧の守衛", hp: 1900, str: 78, vit: 110, int: 18, agi: 18, dex: 22, exp: 640, minFloor: 210, maxFloor: 260, skills: ["crushing_blow", "power_strike"] },
    { name: "影狩り", hp: 1750, str: 74, vit: 90, int: 28, agi: 34, dex: 36, exp: 680, minFloor: 230, maxFloor: 300, skills: ["multi_slash", "doom_mark", "roar"] },
    { name: "堕天の司祭", hp: 2100, str: 62, vit: 105, int: 95, agi: 22, dex: 28, exp: 720, minFloor: 250, maxFloor: 330, skills: ["fireball", "ice_lance", "heal", "silence_hex"] },
    { name: "鉄巨兵", hp: 2600, str: 98, vit: 150, int: 16, agi: 12, dex: 20, exp: 760, minFloor: 270, maxFloor: 360, skills: ["crushing_blow", "power_strike"] },
    { name: "虚無の死神", hp: 2400, str: 120, vit: 130, int: 60, agi: 40, dex: 40, exp: 820, minFloor: 300, maxFloor: 400, skills: ["multi_slash", "power_strike", "doom_mark"] },
    { name: "冥界の竜", hp: 3200, str: 140, vit: 180, int: 120, agi: 30, dex: 44, exp: 880, minFloor: 330, maxFloor: 420, skills: ["fireball", "thunder_strike", "crushing_blow"] },
    { name: "終焉の騎士", hp: 3600, str: 160, vit: 230, int: 45, agi: 34, dex: 40, exp: 940, minFloor: 360, maxFloor: 450, skills: ["power_strike", "crushing_blow", "doom_mark"] },
    { name: "虚空の天使", hp: 3400, str: 130, vit: 210, int: 140, agi: 42, dex: 48, exp: 1020, minFloor: 390, maxFloor: 470, skills: ["ice_lance", "thunder_strike", "heal", "silence_hex"] },
    { name: "災禍の大公", hp: 4600, str: 190, vit: 300, int: 170, agi: 38, dex: 50, exp: 1120, minFloor: 420, maxFloor: 500, skills: ["fireball", "doom_mark", "heal", "crushing_blow"] },
    { name: "原初の龍王", hp: 5600, str: 220, vit: 380, int: 200, agi: 40, dex: 56, exp: 1250, minFloor: 460, maxFloor: 500, skills: ["fireball", "thunder_strike", "doom_mark", "crushing_blow"] },
    { name: "終末の審判者", hp: 6200, str: 240, vit: 420, int: 210, agi: 42, dex: 60, exp: 1400, minFloor: 485, maxFloor: 500, skills: ["fireball", "doom_mark", "silence_hex", "heal"] },

    // --------------------
    // 500〜1000F
    // --------------------
    { name: "深層の獣王", hp: 8200, str: 260, vit: 500, int: 80, agi: 60, dex: 62, exp: 1500, minFloor: 501, maxFloor: 600, skills: ["multi_slash", "power_strike"] },
    { name: "魔晶機兵", hp: 9000, str: 280, vit: 560, int: 60, agi: 40, dex: 55, exp: 1600, minFloor: 540, maxFloor: 650, skills: ["crushing_blow", "roar", "power_strike"] },
    { name: "星喰らい", hp: 9800, str: 270, vit: 540, int: 220, agi: 48, dex: 66, exp: 1750, minFloor: 580, maxFloor: 700, skills: ["fireball", "ice_lance", "thunder_strike"] },
    { name: "黒曜竜", hp: 11500, str: 320, vit: 620, int: 180, agi: 52, dex: 74, exp: 1900, minFloor: 620, maxFloor: 760, skills: ["fireball", "doom_mark", "crushing_blow"] },
    { name: "冥府の死神", hp: 10800, str: 350, vit: 580, int: 130, agi: 72, dex: 82, exp: 2050, minFloor: 660, maxFloor: 820, skills: ["multi_slash", "doom_mark", "power_strike"] },
    { name: "神罰の天使", hp: 12500, str: 310, vit: 680, int: 240, agi: 68, dex: 78, exp: 2200, minFloor: 700, maxFloor: 860, skills: ["ice_lance", "thunder_strike", "heal", "silence_hex"] },
    { name: "機神の番人", hp: 14500, str: 380, vit: 760, int: 95, agi: 44, dex: 62, exp: 2400, minFloor: 740, maxFloor: 900, skills: ["crushing_blow", "power_strike", "roar"] },
    { name: "虚無の覇者", hp: 14000, str: 420, vit: 730, int: 280, agi: 60, dex: 80, exp: 2600, minFloor: 780, maxFloor: 940, skills: ["fireball", "doom_mark", "heal"] },
    { name: "終焉の大魔王", hp: 16500, str: 460, vit: 850, int: 300, agi: 58, dex: 76, exp: 2900, minFloor: 820, maxFloor: 1000, skills: ["fireball", "thunder_strike", "silence_hex", "doom_mark", "heal"] },
    { name: "天輪の裁定者", hp: 18000, str: 480, vit: 900, int: 320, agi: 72, dex: 88, exp: 3200, minFloor: 880, maxFloor: 1000, skills: ["ice_lance", "thunder_strike", "doom_mark", "heal"] },
    { name: "万象の龍帝", hp: 20500, str: 520, vit: 1000, int: 350, agi: 76, dex: 92, exp: 3600, minFloor: 920, maxFloor: 1000, skills: ["fireball", "thunder_strike", "doom_mark", "crushing_blow", "heal"] },
    { name: "深淵の観測者", hp: 22500, str: 450, vit: 950, int: 450, agi: 82, dex: 102, exp: 4200, minFloor: 960, maxFloor: 1000, skills: ["fireball", "ice_lance", "thunder_strike", "silence_hex", "heal"] },
    { name: "原初の終末", hp: 26000, str: 600, vit: 1150, int: 400, agi: 74, dex: 90, exp: 5000, minFloor: 985, maxFloor: 1000, skills: ["fireball", "doom_mark", "crushing_blow", "multi_slash", "heal"] },
];

  
  // --------------------
  // ボスモンスター（敵テーブル切替階層）
  // --------------------
  // 100F / 200F / 500F / 1000F に固定出現するボス。
  // ※core.js の startBattle() がこのテーブルを参照してボスを優先生成する。
  const bossMonsters = {
    100: {
      name: "境界の守護竜",
      hp: 900,
      str: 38,
      vit: 28,
      int: 20,
      agi: 10,
      dex: 14,
      exp: 380,
      isBoss: true,
      skills: ["fireball", "power_strike", "roar", "heal"],
      effects: { damageReduction: 0.08, regenRate: 0.03 },
    },
    200: {
      name: "黒鋼の巨王",
      hp: 1800,
      str: 68,
      vit: 62,
      int: 18,
      agi: 12,
      dex: 18,
      exp: 900,
      isBoss: true,
      skills: ["crushing_blow", "thunder_strike", "power_strike", "roar", "heal"],
      effects: { damageReduction: 0.12, armorPierceRate: 0.2 },
    },
    500: {
      name: "冥界の審理者",
      hp: 8500,
      str: 300,
      vit: 520,
      int: 260,
      agi: 45,
      dex: 65,
      exp: 2200,
      isBoss: true,
      skills: ["doom_mark", "fireball", "ice_lance", "crushing_blow", "silence_hex", "heal"],
      effects: { damageReduction: 0.18, regenRate: 0.04, extraTurnChance: 0.08 },
    },
    1000: {
      name: "終焉の根源",
      hp: 32000,
      str: 780,
      vit: 1400,
      int: 520,
      agi: 90,
      dex: 120,
      exp: 9000,
      isBoss: true,
      skills: ["doom_mark", "fireball", "thunder_strike", "crushing_blow", "multi_slash", "silence_hex", "heal"],
      effects: { damageReduction: 0.22, regenRate: 0.05, extraTurnChance: 0.12, armorPierceRate: 0.25 },
    },
  };


window.epithets = epithets;
  window.enemySkills = enemySkills;
  window.monsterTypes = monsterTypes;
  window.bossMonsters = bossMonsters;
})();
