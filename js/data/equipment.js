// ===================
// ゲームデータ：装備
// ===================

(function () {
  "use strict";

  // 装備タイプ
  // - category: weapon / armor / accessory
  // - hands: 0 / 1 / 2
  // - bias: 装備生成時の傾向（attack/defense/accuracy/evasion/magicAttack/healPower など）
  const equipTypes = {
    // -------------------
    // 武器
    // -------------------
    sword: {
      name: "剣",
      category: "weapon",
      hands: 1,
      // バランス型（命中も少し伸びる）
      bias: {
        attackMult: 1.0,
        accuracy: (floor) => Math.round(4 + floor * 0.18),
      },
    },
    greatsword: {
      name: "大剣",
      category: "weapon",
      hands: 2,
      // 高火力・命中が落ちる
      bias: {
        attackMult: 1.32,
        accuracy: (floor) => -Math.round(2 + floor * 0.18),
      },
    },
    katana: {
      name: "刀",
      category: "weapon",
      hands: 1,
      // 命中と回避寄り（斬れ味）
      bias: {
        attackMult: 0.98,
        accuracy: (floor) => Math.round(9 + floor * 0.22),
      },
    },
    dagger: {
      name: "短剣",
      category: "weapon",
      hands: 1,
      // 速さ寄り（攻撃は低め、命中と回避が上がる）
      bias: {
        attackMult: 0.85,
        accuracy: (floor) => Math.round(8 + floor * 0.22),
      },
    },
    handaxe: {
      name: "手斧",
      category: "weapon",
      hands: 1,
      // 斧の片手版：火力寄り・命中少し下がる
      bias: {
        attackMult: 1.12,
        accuracy: (floor) => -Math.round(1 + floor * 0.12),
      },
    },
    axe: {
      name: "斧",
      category: "weapon",
      hands: 2,
      // 一撃重視（攻撃高いが命中がマイナス）
      bias: {
        attackMult: 1.28,
        accuracy: (floor) => -Math.round(3 + floor * 0.22),
      },
    },
    spear: {
      name: "槍",
      category: "weapon",
      hands: 2,
      // 命中寄り（安定して当てやすい）
      bias: {
        attackMult: 1.05,
        accuracy: (floor) => Math.round(7 + floor * 0.2),
      },
    },
    mace: {
      name: "メイス",
      category: "weapon",
      hands: 1,
      // 聖職寄り（回復力が伸びる。攻撃もそこそこ。魔法攻撃は少し）
      bias: {
        attackMult: 1.1,
        accuracy: (floor) => -Math.round(1 + floor * 0.1),
        healPowerMult: 1.35,
        magicAttackMult: 0.85,
      },
    },
    hammer: {
      name: "大槌",
      category: "weapon",
      hands: 2,
      // 超火力（命中はかなり下がる）
      bias: {
        attackMult: 1.42,
        accuracy: (floor) => -Math.round(5 + floor * 0.28),
      },
    },
    bow: {
      name: "弓",
      category: "weapon",
      hands: 2,
      // 命中高め（攻撃はやや控えめ）
      bias: {
        attackMult: 0.95,
        accuracy: (floor) => Math.round(10 + floor * 0.25),
      },
    },
    crossbow: {
      name: "クロスボウ",
      category: "weapon",
      hands: 2,
      // 命中さらに高い（攻撃控えめ、回避は少し下がる）
      bias: {
        attackMult: 0.9,
        accuracy: (floor) => Math.round(14 + floor * 0.26),
      },
    },
    staff: {
      name: "杖",
      category: "weapon",
      hands: 2,
      // 魔法寄り（物理攻撃は控えめ。魔法攻撃が伸びる。回復も少し）
      bias: {
        attackMult: 0.45,
        accuracy: (floor) => Math.round(2 + floor * 0.1),
        defense: (floor) => Math.round(2 + floor * 0.06),
        magicAttackMult: 1.4,
        healPowerMult: 1.1,
      },
    },
    wand: {
      name: "ワンド",
      category: "weapon",
      hands: 1,
      // 魔法特化（物理はかなり弱い）
      bias: {
        attackMult: 0.7,
        accuracy: (floor) => Math.round(4 + floor * 0.12),
        magicAttackMult: 1.55,
        healPowerMult: 0.95,
      },
    },
    holy_staff: {
      name: "聖杖",
      category: "weapon",
      hands: 2,
      // 回復特化（物理は弱い）
      bias: {
        attackMult: 0.5,
        accuracy: (floor) => Math.round(1 + floor * 0.08),
        magicAttackMult: 1.1,
        healPowerMult: 1.6,
      },
    },

    // -------------------
    // 防具（カテゴリは armor。スロットは装備1/装備2に入る想定）
    // -------------------
    armor: {
      name: "鎧",
      category: "armor",
      hands: 1,
      // 標準（守りはそこそこ、回避は下がる）
      bias: {
        defenseMult: 1.0,
      },
    },
    light_armor: {
      name: "軽鎧",
      category: "armor",
      hands: 1,
      // 回避寄り（防御低め、回避が上がる）
      bias: {
        defenseMult: 0.85,
      },
    },
    heavy_armor: {
      name: "重鎧",
      category: "armor",
      hands: 1,
      // 鉄壁（防御高いが回避がマイナス）
      bias: {
        defenseMult: 1.3,
      },
    },
    shield: {
      name: "盾",
      category: "armor",
      hands: 1,
      // 守り寄り（防御高い）
      bias: {
        defenseMult: 1.15,
      },
    },
    buckler: {
      name: "小盾",
      category: "armor",
      hands: 1,
      // 回避寄りの盾
      bias: {
        defenseMult: 0.85,
      },
    },
    tower_shield: {
      name: "大盾",
      category: "armor",
      hands: 1,
      // 超堅い盾：回避が大きく下がる
      bias: {
        defenseMult: 1.35,
      },
    },
    helmet: {
      name: "兜",
      category: "armor",
      hands: 1,
      // 守り少し、回避少し下がる
      bias: {
        defenseMult: 0.95,
      },
    },
    circlet: {
      name: "サークレット",
      category: "armor",
      hands: 1,
      // 命中寄り（視界）
      bias: {
        defenseMult: 0.75,
        accuracy: (floor) => Math.round(6 + floor * 0.14),
      },
    },
    boots: {
      name: "靴",
      category: "armor",
      hands: 1,
      // 回避寄り
      bias: {
        defenseMult: 0.75,
      },
    },
    gloves: {
      name: "篭手",
      category: "armor",
      hands: 1,
      // 命中寄り
      bias: {
        defenseMult: 0.65,
        accuracy: (floor) => Math.round(5 + floor * 0.16),
      },
    },
    bracers: {
      name: "腕当て",
      category: "armor",
      hands: 1,
      // 回避＋防御の中間
      bias: {
        defenseMult: 0.78,
      },
    },
    robe: {
      name: "ローブ",
      category: "armor",
      hands: 1,
      // 魔法寄り（回避少し、命中少し）
      bias: {
        defenseMult: 0.8,
        accuracy: (floor) => Math.round(2 + floor * 0.08),
      },
    },
    cloak: {
      name: "マント",
      category: "armor",
      hands: 1,
      // 回避特化（防御低め、回避が高い）
      bias: {
        defenseMult: 0.6,
      },
    },
    mantle: {
      name: "外套",
      category: "armor",
      hands: 1,
      // 回避＋命中
      bias: {
        defenseMult: 0.62,
        accuracy: (floor) => Math.round(3 + floor * 0.1),
      },
    },

    // -------------------
    // 装飾品（アクセ枠）
    // -------------------
    // アクセは「指輪 / 耳飾り / 首飾り / 腕輪」の4種類のみ
    ring: { name: "指輪", category: "accessory", hands: 0 },
    earrings: { name: "耳飾り", category: "accessory", hands: 0 },
    necklace: { name: "首飾り", category: "accessory", hands: 0 },
    bracelet: { name: "腕輪", category: "accessory", hands: 0 },
  };

  // -------------------
  // ランダムオプション（テーブルを分離）
  // -------------------

  // 装備品（武器・防具）用：基本戦闘に関するオプションのみ
  const equipmentOptionEffects = [
{ name: "経験値UP", type: "expBonus", value: 15 },
    { name: "クリティカル率UP", type: "critRate", value: 5 },
    { name: "最大HP UP", type: "maxHpBonus", value: 20 },
    { name: "攻撃力UP", type: "attackBonus", value: 10 },
    { name: "防御力UP", type: "defenseBonus", value: 10 },
    { name: "命中率UP", type: "accuracy", value: 5 },
    { name: "魔法攻撃力UP", type: "magicPower", value: 18 },
    { name: "回復力UP", type: "healPower", value: 18 },
    { name: "回復量UP", type: "healReceived", value: 15 },
    { name: "被ダメージ軽減", type: "damageReduction", value: 8 },
    { name: "クリダメUP", type: "critDamage", value: 20 },
    { name: "吸血", type: "lifeSteal", value: 6 },
    { name: "再生", type: "regen", value: 2 },
    { name: "連続攻撃", type: "multiStrikeChance", value: 6 },
    { name: "連続攻撃威力UP", type: "multiStrikeDamage", value: 20 },
    { name: "反撃率UP", type: "counterChance", value: 6 },
    { name: "反撃威力UP", type: "counterDamage", value: 25 },
    { name: "背水強化", type: "desperationDamage", value: 20 },
    { name: "追い打ち", type: "executeDamage", value: 15 },
    { name: "回避時HP回復", type: "evadeHeal", value: 2 },
    { name: "状態異常短縮", type: "ailmentDurationDown", value: 20 },
    { name: "状態異常耐性", type: "ailmentResist", value: 30 },
  ];

  // 装飾品（アクセ）用：特殊な効果を発揮するもの
  // - cond:
  //   - "unarmed"   : 武器を装備していない時
  //   - "noArmor"   : 防具を装備していない時
  //   - "twoHanded" : 両手武器を装備している時
  const accessoryOptionEffects = [
    { name: "スキル威力UP", type: "skillPower", value: 10 },
    { name: "クールタイム軽減", type: "cooldownReduction", value: 1 },

    { name: "武器未装備時、回避率UP", type: "evasion", value: 10, cond: "unarmed" },
    { name: "武器未装備時、反撃率UP", type: "counterChance", value: 12, cond: "unarmed" },

    { name: "防具未装備時、連続攻撃率UP", type: "multiStrikeChance", value: 14, cond: "noArmor" },
    { name: "防具未装備時、回避率UP", type: "evasion", value: 10, cond: "noArmor" },

    { name: "両手武器装備時、攻撃力UP", type: "attackBonus", value: 20, cond: "twoHanded" },

    { name: "索敵UP", type: "search", value: 1 },
    { name: "ドロップ率UP", type: "dropRate", value: 10 },
  ];

  window.equipTypes = equipTypes;

  // 参照先を分離して公開
  window.equipmentOptionEffects = equipmentOptionEffects;
  window.accessoryOptionEffects = accessoryOptionEffects;

  // 互換（旧名）：accessoryEffects はアクセ用テーブルを指す
  window.accessoryEffects = accessoryOptionEffects;
})();

