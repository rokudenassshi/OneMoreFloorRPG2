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
      // 斧使い統合：剣＋斧を得意にする
      favoredType: ["sword", "axe"],
      bonuses: { strength: 3, vitality: 1, intelligence: 0, agility: 1, dexterity: 1 },
    },
    warrior: {
      name: "戦士",
      desc: "体力・HPが高い",
      // 斧使い統合：盾＋斧を得意にする
      favoredType: ["shield", "axe"],
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
      desc: "賢さが高く、攻撃魔法と回復魔法の両方を扱う",
      favoredType: "staff",
      // 僧侶要素を統合（回復運用を想定して体力/器用さを少し補強）
      bonuses: { strength: -2, vitality: 0, intelligence: 5, agility: 0, dexterity: 1 },
    },
    archer: {
      name: "弓使い",
      desc: "器用さが高い",
      favoredType: "bow",
      bonuses: { strength: 1, vitality: 0, intelligence: 0, agility: 2, dexterity: 4 },
    },
    monk: {
      name: "格闘家",
      desc: "素早く回復も得意",
      favoredType: "gloves",
      bonuses: { strength: 1, vitality: 1, intelligence: 1, agility: 3, dexterity: 0 },
    },

    have_not: {
      name: "持たざる者",
      desc: "何も持たずに抗う者",
      favoredType: null,
      unlock: {
        type: "hidden_naked_defeat",
        target: 1,
        minLevel: 1,
        text: "？？？",
        hidden: true,
      },
      bonuses: {
        strength: -5,
        vitality: -5,
        intelligence: -5,
        agility: -5,
        dexterity: -5,
      },
    },

    hero: {
      name: "勇者",
      desc: "全職を極めし者。全基礎ステータスが1.2倍",
      favoredType: ["sword", "spear", "staff"],
      unlock: {
        type: "hidden_achievement",
        target: 1,
        minLevel: 1,
        text: "特別な実績を達成する",
        hidden: true,
      },
      bonuses: { strength: 0, vitality: 0, intelligence: 0, agility: 0, dexterity: 0 },
      traits: {
        baseStatMultiplier: 1.2,
      },
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
      favoredType: ["sword", "katana"],
      unlock: { type: "crit", target: 30, text: "剣士で会心を30回出す" },
      bonuses: { strength: 5, vitality: 2, intelligence: 0, agility: 2, dexterity: 2 },
      traits: {"critRateBonus": 8, "critDamageMul": 2.4, "favoredMultiplier": 1.3},
    },
    guardian: {
      name: "守護者",
      desc: "防御のエキスパート（上級職）",
      tier: "advanced",
      skillGroup: "warrior",
      baseJob: "warrior",
      favoredType: ["heavy_armor", "tower_shield"],
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
      desc: "精密射撃で仕留める（上級職）",
      tier: "advanced",
      skillGroup: "archer",
      baseJob: "archer",
      // 弓/クロスボウどちらも得意にしてビルド幅を広げる
      favoredType: ["bow", "crossbow"],
      unlock: { type: "attackHit", target: 200, text: "弓使いで攻撃を200回命中させる" },
      bonuses: { strength: 2, vitality: 1, intelligence: 0, agility: 2, dexterity: 6 },
      traits: {
        "accuracyBonus": 14,
        "critRateBonus": 12,
        // 貫通（物理の防御適用率を -5%）
        "pierceDefFactorReduction": 0.05,
        "critDamageMul": 2.35,
        // 器用さで火力も伸びる（DEXビルドが成立）
        "attackFromDex": 0.85,
        "attackMult": 1.06,
        "favoredMultiplier": 1.25,
      },
    },

    warlord: {
      name: "魔法騎士",
      desc: "剣技と魔法を同時に極めた上級職。攻撃時に魔法攻撃力の50%を追加ダメージとして与える",
      tier: "advanced",
      skillGroup: "warrior",
      baseJob: "warrior",
      // 剣＋杖＋盾で近接/魔法を両立
      favoredType: ["sword", "staff", "shield"],
      unlock: { type: "attack", target: 300, text: "戦士で攻撃を300回行う" },
      // 近接火力と魔法火力を両立
      bonuses: { strength: 4, vitality: 4, intelligence: 4, agility: 0, dexterity: 1 },
      traits: {
        "attackMult": 1.1,
        "magicPowerMult": 1.15,
        "defenseMult": 1.06,
        "maxHpMult": 1.03,
        // 防御時の被ダメ軽減
        "guardDamageMult": 0.6,
        "critRateBonus": 2,
        "expRate": 0.03,
        // 通常攻撃・物理スキル命中時に魔法追撃（魔法攻撃力の50%）
        "magicKnightBonusRate": 0.5,
        "favoredMultiplier": 1.25,
      },
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

    asura: {
      name: "修羅",
      desc: "攻撃特化の格闘家（上級職）。武器を装備できない。基礎ステータスが2倍。実績でさらに強化される。攻撃を行うたび気が溜まり、気1につき会心率+2%、攻撃力+3%、追撃率+2%（戦闘中）。",
      tier: "advanced",
      skillGroup: "monk",
      baseJob: "monk",
      favoredType: null,
      unlock: { type: "attackHit", target: 300, text: "格闘家で攻撃を300回命中させる" },
      bonuses: { strength: 6, vitality: 1, intelligence: 0, agility: 3, dexterity: 0 },
      traits: {"attackMult": 1.18, "critRateBonus": 6, "defenseMult": 0.95, "favoredMultiplier": 1.25, "baseStatMultiplier": 2, "cannotEquipWeapon": true},
    },
    warfiend: {
      name: "狂戦士",
      desc: "一撃必殺を狙う（上級職）",
      tier: "advanced",
      // 斧使い削除に伴い剣士へ統合
      skillGroup: "swordsman",
      baseJob: "swordsman",
      // 得意：斧
      favoredType: "axe",
      unlock: { type: "crit", target: 40, text: "剣士で会心を40回出す" },
      bonuses: { strength: 7, vitality: 1, intelligence: -2, agility: 1, dexterity: 0 },
      traits: {"attackMult": 1.22, "defenseMult": 0.9, "critRateBonus": 3, "favoredMultiplier": 1.3},
    },


  };

  // 上級職の共通解放条件：レベル
  //（今後拡張しやすいよう、個別に unlock.minLevel を上書き可能）
  const ADVANCED_JOB_MIN_LEVEL = 30;
  for (const k of Object.keys(jobs)) {
    const jd = jobs[k];
    if (!jd || jd.tier !== "advanced" || !jd.unlock) continue;
    if (jd.unlock.minLevel == null) jd.unlock.minLevel = ADVANCED_JOB_MIN_LEVEL;
  }

  window.jobs = jobs;
})();
