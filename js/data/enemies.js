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
  };

  // モンスター定義（floor が進むほど強い個体が出やすい）
  // minFloor: 出現開始階層
  const monsterTypes = [
    { name: "スライム", hp: 50, str: 5, vit: 3, int: 1, agi: 2, dex: 3, exp: 20, minFloor: 1, skills: ["multi_slash"] },
    { name: "ゴブリン", hp: 80, str: 8, vit: 5, int: 2, agi: 6, dex: 7, exp: 35, minFloor: 1, skills: ["power_strike", "roar"] },
    { name: "ウルフ", hp: 90, str: 10, vit: 7, int: 2, agi: 12, dex: 9, exp: 45, minFloor: 2, skills: ["multi_slash", "bite_poison"] },
    { name: "オーク", hp: 120, str: 12, vit: 10, int: 3, agi: 4, dex: 5, exp: 50, minFloor: 3, skills: ["power_strike"] },
    { name: "トロール", hp: 200, str: 18, vit: 15, int: 2, agi: 3, dex: 4, exp: 80, minFloor: 6, skills: ["heal", "power_strike"] },
    { name: "ダークエルフ", hp: 100, str: 9, vit: 6, int: 15, agi: 14, dex: 12, exp: 70, minFloor: 8, skills: ["fireball", "multi_slash"] },
    { name: "リッチ", hp: 180, str: 8, vit: 10, int: 28, agi: 7, dex: 10, exp: 120, minFloor: 12, skills: ["fireball", "heal"] },
    { name: "ミノタウロス", hp: 250, str: 22, vit: 18, int: 4, agi: 8, dex: 9, exp: 100, minFloor: 15, skills: ["power_strike", "roar"] },
    { name: "デーモン", hp: 280, str: 20, vit: 16, int: 22, agi: 15, dex: 14, exp: 140, minFloor: 18, skills: ["fireball", "bite_poison", "multi_slash"] },
    { name: "ドラゴン", hp: 300, str: 25, vit: 20, int: 18, agi: 10, dex: 15, exp: 150, minFloor: 22, skills: ["fireball", "power_strike", "roar"] },
  ];

  window.epithets = epithets;
  window.enemySkills = enemySkills;
  window.monsterTypes = monsterTypes;
})();
