// ===================
// ゲームデータ定義（分割: data）
// ===================

(function () {
  "use strict";

  const GAME_VERSION = "0.2.0";

  const gameData = {
    player: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      job: "swordsman",
      jobKills: {},
      totalKills: 0,
      namedKills: 0,
      maxReachedFloor: 1,

      // 基本ステータス（基準値 5）
      baseStats: {
        strength: 5,
        vitality: 5,
        intelligence: 5,
        agility: 5,
        dexterity: 5,
      },

      // 振り分けステータス
      allocatedStats: {
        strength: 0,
        vitality: 0,
        intelligence: 0,
        agility: 0,
        dexterity: 0,
      },

      statPoints: 0,
      skillPoints: 0,

      skills: {},
      equippedSkill: null,
      skillCooldown: 0,

      // 状態異常
      status: {
        poisonTurns: 0,
        burnTurns: 0,
        accuracyDownTurns: 0,
        accuracyDownRate: 0,
      },

      // 装備スロット: 武器/防具 2、装飾品 1
      equipment: {
        slot1: null, // weapon/armor
        slot2: null, // weapon/armor
        accessory: null, // accessory only
      },

      inventory: [],
      items: [{ name: "やくそう", heal: 50, count: 3 }],
    },

    floor: 1,
    enemy: null,
    gameState: "EXPLORE", // EXPLORE / BATTLE

    battleButtons: null,
    exploreButtons: null,
  };

  // 職業定義（基準 5 から上下）
  const jobs = {
    swordsman: {
      name: "剣士",
      desc: "力が高い",
      bonuses: { strength: 3, vitality: 1, intelligence: 0, agility: 1, dexterity: 1 },
    },
    warrior: {
      name: "戦士",
      desc: "体力・HPが高い",
      bonuses: { strength: 1, vitality: 4, intelligence: -1, agility: 0, dexterity: 0 },
    },
    thief: {
      name: "盗賊",
      desc: "素早さが高いが体力が低い",
      bonuses: { strength: 0, vitality: -2, intelligence: 0, agility: 4, dexterity: 2 },
    },
    mage: {
      name: "魔法使い",
      desc: "力・体力が低いが賢さが高い",
      bonuses: { strength: -2, vitality: -1, intelligence: 5, agility: 0, dexterity: 0 },
    },
    archer: {
      name: "弓使い",
      desc: "器用さが高い",
      bonuses: { strength: 1, vitality: 0, intelligence: 0, agility: 2, dexterity: 4 },
    },
    paladin: {
      name: "パラディン",
      desc: "バランス型",
      bonuses: { strength: 2, vitality: 2, intelligence: 1, agility: 0, dexterity: 0 },
    },
    monk: {
      name: "モンク",
      desc: "素早く回復も得意",
      bonuses: { strength: 1, vitality: 1, intelligence: 1, agility: 3, dexterity: 0 },
    },
    berserker: {
      name: "バーサーカー",
      desc: "攻撃特化（体力低め）",
      bonuses: { strength: 5, vitality: -1, intelligence: -2, agility: 1, dexterity: 0 },
    },
  };

  // スキル定義（そのまま）
  const skills = {
    // 剣士
    sword_mastery: {
      name: "剣術マスタリー",
      type: "passive",
      job: "swordsman",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 5 }),
    },
    power_slash: {
      name: "パワースラッシュ",
      type: "active",
      job: "swordsman",
      maxLevel: 3,
      cooldown: 3,
      desc: "強力な一撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.5 + lv * 0.5 }),
    },

    // 戦士
    iron_skin: {
      name: "鉄壁の肌",
      type: "passive",
      job: "warrior",
      maxLevel: 5,
      desc: "防御力+{value}",
      effect: (lv) => ({ defenseBonus: lv * 8 }),
    },
    shield_bash: {
      name: "シールドバッシュ",
      type: "active",
      job: "warrior",
      maxLevel: 3,
      cooldown: 4,
      desc: "盾で殴る（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.3 + lv * 0.4 }),
    },

    // 盗賊
    evasion_up: {
      name: "回避マスタリー",
      type: "passive",
      job: "thief",
      maxLevel: 5,
      desc: "回避率+{value}%",
      effect: (lv) => ({ evasionBonus: lv * 5 }),
    },
    backstab: {
      name: "バックスタブ",
      type: "active",
      job: "thief",
      maxLevel: 3,
      cooldown: 2,
      desc: "急所を突く（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 2.0 + lv * 0.5 }),
    },

    // 魔法使い
    magic_power: {
      name: "魔力増幅",
      type: "passive",
      job: "mage",
      maxLevel: 5,
      desc: "魔法ダメージ+{value}",
      effect: (lv) => ({ magicBonus: lv * 10 }),
    },
    fireball: {
      name: "ファイアボール",
      type: "active",
      job: "mage",
      maxLevel: 3,
      cooldown: 3,
      desc: "炎の魔法",
      effect: (lv) => ({ baseDamage: 40 + lv * 20, magicScale: 1.5 }),
    },

    // 弓使い
    crit_up: {
      name: "クリティカルマスタリー",
      type: "passive",
      job: "archer",
      maxLevel: 5,
      desc: "クリティカル率+{value}%",
      effect: (lv) => ({ critBonus: lv * 3 }),
    },
    piercing_shot: {
      name: "貫通射撃",
      type: "active",
      job: "archer",
      maxLevel: 3,
      cooldown: 3,
      desc: "防御無視（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.8 + lv * 0.4, ignoreDef: 0.5 }),
    },

    // パラディン
    holy_aura: {
      name: "聖なるオーラ",
      type: "passive",
      job: "paladin",
      maxLevel: 5,
      desc: "全ステータス+{value}",
      effect: (lv) => ({ allStatsBonus: lv * 2 }),
    },
    holy_strike: {
      name: "ホーリーストライク",
      type: "active",
      job: "paladin",
      maxLevel: 3,
      cooldown: 4,
      desc: "攻撃して回復",
      effect: (lv) => ({ damageMultiplier: 1.5 + lv * 0.3, healPercent: 0.15 }),
    },

    // モンク
    swift_strikes: {
      name: "連撃",
      type: "passive",
      job: "monk",
      maxLevel: 5,
      desc: "攻撃速度+{value}",
      effect: (lv) => ({ speedBonus: lv * 3 }),
    },
    healing_touch: {
      name: "ヒーリングタッチ",
      type: "active",
      job: "monk",
      maxLevel: 3,
      cooldown: 5,
      desc: "HP回復",
      effect: (lv) => ({ healAmount: 50 + lv * 30 }),
    },

    // バーサーカー
    rage: {
      name: "狂戦士の怒り",
      type: "passive",
      job: "berserker",
      maxLevel: 5,
      desc: "HP低下時攻撃力UP",
      effect: (lv) => ({ rageBonus: lv * 10 }),
    },
    rampage: {
      name: "ランページ",
      type: "active",
      job: "berserker",
      maxLevel: 3,
      cooldown: 4,
      desc: "連続攻撃",
      effect: (lv) => ({ hits: 2 + lv, damageMultiplier: 0.7 }),
    },
  };

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

  // 装備タイプ
  const equipTypes = {
    sword: { name: "剣", category: "weapon", hands: 1 },
    axe: { name: "斧", category: "weapon", hands: 2 },
    dagger: { name: "短剣", category: "weapon", hands: 1 },
    bow: { name: "弓", category: "weapon", hands: 2 },
    staff: { name: "杖", category: "weapon", hands: 2 },
    armor: { name: "鎧", category: "armor", hands: 1 },
    shield: { name: "盾", category: "armor", hands: 1 },
    helmet: { name: "兜", category: "armor", hands: 1 },
    boots: { name: "ブーツ", category: "armor", hands: 1 },
    gloves: { name: "篭手", category: "armor", hands: 1 },
    ring: { name: "指輪", category: "accessory", hands: 0 },
    amulet: { name: "アミュレット", category: "accessory", hands: 0 },
    belt: { name: "ベルト", category: "accessory", hands: 0 },
  };

  // 装飾品効果
  const accessoryEffects = [
    { name: "ドロップ率UP", type: "dropRate", value: 10 },
    { name: "回避率UP", type: "evasion", value: 5 },
    { name: "経験値UP", type: "expBonus", value: 15 },
    { name: "スキル威力UP", type: "skillPower", value: 10 },
    { name: "クールタイム軽減", type: "cooldownReduction", value: 1 },
    { name: "クリティカル率UP", type: "critRate", value: 5 },
    { name: "最大HP UP", type: "maxHpBonus", value: 20 },
    { name: "攻撃力UP", type: "attackBonus", value: 10 },
    { name: "防御力UP", type: "defenseBonus", value: 10 },
    { name: "命中率UP", type: "accuracy", value: 5 },
    // 索敵(= 二つ名遭遇に影響するパラメータ)を装飾品でも伸ばせるようにしておく
    { name: "索敵UP", type: "search", value: 1 },
  ];

  // グローバル公開
  window.GAME_VERSION = GAME_VERSION;
  window.gameData = gameData;
  window.jobs = jobs;
  window.skills = skills;
  window.epithets = epithets;
  window.monsterTypes = monsterTypes;
  window.enemySkills = enemySkills;
  window.equipTypes = equipTypes;
  window.accessoryEffects = accessoryEffects;
})();
