// ===================
// ゲームデータ：スキル
// ===================

(function () {
  "use strict";

  // スキル定義（そのまま）
  const skills = {

    // 共通スキル（どの職業でも取得できる）
    search_up: {
      name: "索敵強化",
      type: "passive",
      job: "all",
      maxLevel: 100,
      desc: "索敵がレベル分+1（最大Lv.100）",
      effect: (lv) => ({ searchBonus: lv }),
    },
    exp_up: {
      name: "経験値増加",
      type: "passive",
      job: "all",
      maxLevel: Infinity,
      desc: "獲得経験値+レベル%（上限なし）",
      effect: (lv) => ({ expBonus: lv }),
    },

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

    // 僧侶
    cleric_blessing: {
      name: "祝福",
      type: "passive",
      job: "cleric",
      maxLevel: 5,
      desc: "魔法攻撃力+{value}",
      effect: (lv) => ({ magicBonus: lv * 6 }),
    },
    cleric_heal: {
      name: "ヒール",
      type: "active",
      job: "cleric",
      maxLevel: 3,
      cooldown: 4,
      desc: "HP回復",
      effect: (lv) => ({ healAmount: 60 + lv * 40 }),
    },

    // 斧使い
    axe_mastery: {
      name: "斧術マスタリー",
      type: "passive",
      job: "axeman",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 6 }),
    },
    cleave: {
      name: "たたき割り",
      type: "active",
      job: "axeman",
      maxLevel: 3,
      cooldown: 3,
      desc: "強烈な一撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.6 + lv * 0.45 }),
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

  };

  window.skills = skills;
})();
