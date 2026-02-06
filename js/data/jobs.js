// ===================
// ゲームデータ：職業
// ===================

(function () {
  "use strict";

  // 職業定義（基準 5 から上下）
  const jobs = {
    swordsman: {
      name: "剣士",
      desc: "力が高い",
      // 得意武器（装備時に補正がかかる）
      favoredType: "sword",
      bonuses: { strength: 3, vitality: 1, intelligence: 0, agility: 1, dexterity: 1 },
    },
    warrior: {
      name: "戦士",
      desc: "体力・HPが高い",
      favoredType: "shield",
      bonuses: { strength: 1, vitality: 4, intelligence: -1, agility: 0, dexterity: 0 },
    },
    thief: {
      name: "盗賊",
      desc: "素早さが高いが体力が低い",
      favoredType: "dagger",
      bonuses: { strength: 0, vitality: -2, intelligence: 0, agility: 4, dexterity: 2 },
    },
    mage: {
      name: "魔法使い",
      desc: "力・体力が低いが賢さが高い",
      favoredType: "staff",
      bonuses: { strength: -2, vitality: -1, intelligence: 5, agility: 0, dexterity: 0 },
    },
    archer: {
      name: "弓使い",
      desc: "器用さが高い",
      favoredType: "bow",
      bonuses: { strength: 1, vitality: 0, intelligence: 0, agility: 2, dexterity: 4 },
    },
    monk: {
      name: "モンク",
      desc: "素早く回復も得意",
      favoredType: "gloves",
      bonuses: { strength: 1, vitality: 1, intelligence: 1, agility: 3, dexterity: 0 },
    },
    cleric: {
      name: "僧侶",
      desc: "回復が得意",
      favoredType: "staff",
      bonuses: { strength: -1, vitality: 2, intelligence: 3, agility: 0, dexterity: 1 },
    },
    axeman: {
      name: "斧使い",
      desc: "一撃が重い",
      favoredType: "axe",
      bonuses: { strength: 4, vitality: 1, intelligence: -1, agility: 0, dexterity: 0 },
    },

    // -----------------
    // 上級職（条件達成で解放）
    // -----------------
    blademaster: {
      name: "剣聖",
      desc: "会心の達人（上級職）",
      tier: "advanced",
      skillGroup: "swordsman",
      baseJob: "swordsman",
      favoredType: "sword",
      unlock: { type: "crit", target: 30, text: "剣士でクリティカルを30回出す" },
      bonuses: { strength: 5, vitality: 2, intelligence: 0, agility: 2, dexterity: 2 },
      traits: {"critRateBonus": 8, "critDamageMul": 2.4, "favoredMultiplier": 1.3},
    },
    guardian: {
      name: "守護者",
      desc: "防御のエキスパート（上級職）",
      tier: "advanced",
      skillGroup: "warrior",
      baseJob: "warrior",
      favoredType: "shield",
      unlock: { type: "defend", target: 100, text: "戦士で戦闘中に防御を100回行う" },
      bonuses: { strength: 2, vitality: 7, intelligence: -1, agility: 0, dexterity: 0 },
      traits: {"guardDamageMult": 0.55, "defenseMult": 1.15, "maxHpMult": 1.1, "favoredMultiplier": 1.25},
    },
    assassin: {
      name: "暗殺者",
      desc: "影から狙う（上級職）",
      tier: "advanced",
      skillGroup: "thief",
      baseJob: "thief",
      favoredType: "dagger",
      unlock: { type: "evade", target: 100, text: "盗賊で攻撃を100回回避する" },
      bonuses: { strength: 1, vitality: -1, intelligence: 0, agility: 6, dexterity: 3 },
      traits: {"critRateBonus": 6, "critDamageMul": 2.3, "evasionBonus": 12, "cooldownMult": 0.9},
    },
    archmage: {
      name: "大魔導士",
      desc: "魔法を極めた（上級職）",
      tier: "advanced",
      skillGroup: "mage",
      baseJob: "mage",
      favoredType: "staff",
      unlock: { type: "magic", target: 80, text: "魔法使いで攻撃魔法を80回使う" },
      bonuses: { strength: -2, vitality: -1, intelligence: 7, agility: 0, dexterity: 1 },
      traits: {"magicPowerMult": 1.2, "cooldownReduction": 1, "maxHpMult": 0.9},
    },
    sniper: {
      name: "狙撃手",
      desc: "百発百中（上級職）",
      tier: "advanced",
      skillGroup: "archer",
      baseJob: "archer",
      favoredType: "bow",
      unlock: { type: "attackHit", target: 200, text: "弓使いで攻撃を200回命中させる" },
      bonuses: { strength: 2, vitality: 1, intelligence: 0, agility: 2, dexterity: 6 },
      traits: {"accuracyBonus": 14, "critRateBonus": 5, "attackMult": 1.1},
    },
    fistmaster: {
      name: "拳聖",
      desc: "拳の達人（上級職）",
      tier: "advanced",
      skillGroup: "monk",
      baseJob: "monk",
      favoredType: "gloves",
      unlock: { type: "heal", target: 80, text: "モンクで回復スキルを80回使う" },
      bonuses: { strength: 2, vitality: 2, intelligence: 1, agility: 5, dexterity: 0 },
      traits: {"evasionBonus": 8, "attackMult": 1.08, "healMult": 1.15},
    },
    bishop: {
      name: "大司祭",
      desc: "癒やしの極み（上級職）",
      tier: "advanced",
      skillGroup: "cleric",
      baseJob: "cleric",
      favoredType: "staff",
      unlock: { type: "heal", target: 100, text: "僧侶で回復魔法を100回使う" },
      bonuses: { strength: -1, vitality: 3, intelligence: 6, agility: 0, dexterity: 2 },
      traits: {"healMult": 1.3, "cooldownMult": 0.85, "maxHpMult": 1.05},
    },
    destroyer: {
      name: "破壊者",
      desc: "粉砕の一撃（上級職）",
      tier: "advanced",
      skillGroup: "axeman",
      baseJob: "axeman",
      favoredType: "axe",
      unlock: { type: "skillUse", target: 60, text: "斧使いで戦闘スキルを60回使う" },
      bonuses: { strength: 7, vitality: 2, intelligence: -1, agility: 0, dexterity: 0 },
      traits: {"attackMult": 1.2, "accuracyBonus": -5, "critDamageMul": 2.2, "favoredMultiplier": 1.25},
    },

    duelist: {
      name: "決闘士",
      desc: "命中と回避に秀でる（上級職）",
      tier: "advanced",
      skillGroup: "swordsman",
      baseJob: "swordsman",
      favoredType: "sword",
      unlock: { type: "attackHit", target: 250, text: "剣士で攻撃を250回命中させる" },
      bonuses: { strength: 4, vitality: 1, intelligence: 0, agility: 4, dexterity: 4 },
      traits: {"accuracyBonus": 10, "evasionBonus": 10, "favoredMultiplier": 1.25, "cooldownReduction": 1},
    },
    warlord: {
      name: "将軍",
      desc: "攻撃と統率の才（上級職）",
      tier: "advanced",
      skillGroup: "warrior",
      baseJob: "warrior",
      favoredType: "shield",
      unlock: { type: "attack", target: 300, text: "戦士で攻撃を300回行う" },
      bonuses: { strength: 6, vitality: 4, intelligence: -1, agility: 1, dexterity: 1 },
      traits: {"attackMult": 1.15, "critRateBonus": 3, "expRate": 0.03, "favoredMultiplier": 1.25},
    },
    trickster: {
      name: "怪盗",
      desc: "戦場で獲物をさらう（上級職）",
      tier: "advanced",
      skillGroup: "thief",
      baseJob: "thief",
      favoredType: "dagger",
      unlock: { type: "skillUse", target: 80, text: "盗賊で戦闘スキルを80回使う" },
      bonuses: { strength: 1, vitality: 0, intelligence: 1, agility: 5, dexterity: 4 },
      traits: {"dropRateBonus": 8, "expRate": 0.02, "evasionBonus": 8, "searchBonus": 1, "cooldownMult": 0.85},
    },
    sage: {
      name: "賢者",
      desc: "魔法を効率化する（上級職）",
      tier: "advanced",
      skillGroup: "mage",
      baseJob: "mage",
      favoredType: "staff",
      unlock: { type: "skillUse", target: 120, text: "魔法使いで戦闘スキルを120回使う" },
      bonuses: { strength: -1, vitality: 0, intelligence: 6, agility: 1, dexterity: 2 },
      traits: {"magicPowerMult": 1.1, "expRate": 0.05, "healMult": 1.1, "cooldownMult": 0.85},
    },
    ranger: {
      name: "遊撃手",
      desc: "生存と探索に強い（上級職）",
      tier: "advanced",
      skillGroup: "archer",
      baseJob: "archer",
      favoredType: "bow",
      unlock: { type: "evade", target: 80, text: "弓使いで攻撃を80回回避する" },
      bonuses: { strength: 2, vitality: 2, intelligence: 0, agility: 5, dexterity: 3 },
      traits: {"evasionBonus": 10, "dropRateBonus": 5, "searchBonus": 1, "attackMult": 1.05, "favoredMultiplier": 1.25},
    },
    asura: {
      name: "修羅",
      desc: "猛攻に特化する（上級職）",
      tier: "advanced",
      skillGroup: "monk",
      baseJob: "monk",
      favoredType: "gloves",
      unlock: { type: "attackHit", target: 300, text: "モンクで攻撃を300回命中させる" },
      bonuses: { strength: 6, vitality: 1, intelligence: 0, agility: 3, dexterity: 0 },
      traits: {"attackMult": 1.18, "critRateBonus": 6, "defenseMult": 0.95, "favoredMultiplier": 1.25},
    },
    templar: {
      name: "聖戦士",
      desc: "守りと回復の両立（上級職）",
      tier: "advanced",
      skillGroup: "cleric",
      baseJob: "cleric",
      favoredType: "staff",
      unlock: { type: "defend", target: 80, text: "僧侶で戦闘中に防御を80回行う" },
      bonuses: { strength: 1, vitality: 5, intelligence: 3, agility: 0, dexterity: 1 },
      traits: {"defenseMult": 1.1, "healMult": 1.15, "guardDamageMult": 0.6, "favoredMultiplier": 1.25},
    },
    warfiend: {
      name: "戦鬼",
      desc: "一撃必殺を狙う（上級職）",
      tier: "advanced",
      skillGroup: "axeman",
      baseJob: "axeman",
      favoredType: "axe",
      unlock: { type: "crit", target: 40, text: "斧使いでクリティカルを40回出す" },
      bonuses: { strength: 8, vitality: 1, intelligence: -2, agility: 1, dexterity: 0 },
      traits: {"attackMult": 1.25, "defenseMult": 0.9, "critRateBonus": 3, "favoredMultiplier": 1.3},
    },


  };

  // 上級職の共通解放条件：レベル
  //（今後拡張しやすいよう、個別に unlock.minLevel を上書き可能）
  const ADVANCED_JOB_MIN_LEVEL = 50;
  for (const k of Object.keys(jobs)) {
    const jd = jobs[k];
    if (!jd || jd.tier !== "advanced" || !jd.unlock) continue;
    if (jd.unlock.minLevel == null) jd.unlock.minLevel = ADVANCED_JOB_MIN_LEVEL;
  }

  window.jobs = jobs;
})();
