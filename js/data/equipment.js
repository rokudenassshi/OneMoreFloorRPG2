// ===================
// ゲームデータ：装備
// ===================

(function () {
  "use strict";

  // 装備タイプ
  const equipTypes = {
    // 武器
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
    dagger: {
      name: "短剣",
      category: "weapon",
      hands: 1,
      // 速さ寄り（攻撃は低め、命中と回避が上がる）
      bias: {
        attackMult: 0.85,
        accuracy: (floor) => Math.round(8 + floor * 0.22),
        evasion: (floor) => Math.round(4 + floor * 0.12),
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
        accuracy: (floor) => Math.round(7 + floor * 0.20),
      },
    },
    mace: {
      name: "メイス",
      category: "weapon",
      hands: 1,
      // 攻撃寄り（少し命中が下がる）
      bias: {
        attackMult: 1.15,
        accuracy: (floor) => -Math.round(1 + floor * 0.12),
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
    staff: {
      name: "杖",
      category: "weapon",
      hands: 2,
      // 魔法寄り（攻撃低め、守り少し）
      bias: {
        attackMult: 0.9,
        accuracy: (floor) => Math.round(2 + floor * 0.10),
        defense: (floor) => Math.round(2 + floor * 0.06),
      },
    },

    // 防具
    armor: {
      name: "鎧",
      category: "armor",
      hands: 1,
      // 標準（守りはそこそこ、回避は下がる）
      bias: {
        defenseMult: 1.0,
        evasion: (floor) => -Math.round(1 + floor * 0.10),
      },
    },
    light_armor: {
      name: "軽鎧",
      category: "armor",
      hands: 1,
      // 回避寄り（防御低め、回避が上がる）
      bias: {
        defenseMult: 0.85,
        evasion: (floor) => Math.round(6 + floor * 0.20),
      },
    },
    heavy_armor: {
      name: "重鎧",
      category: "armor",
      hands: 1,
      // 鉄壁（防御高いが回避がマイナス）
      bias: {
        defenseMult: 1.3,
        evasion: (floor) => -Math.round(3 + floor * 0.18),
      },
    },
    shield: {
      name: "盾",
      category: "armor",
      hands: 1,
      // 守り寄り（防御高い、命中が少し下がる）
      bias: {
        defenseMult: 1.15,
        accuracy: (floor) => -Math.round(1 + floor * 0.10),
      },
    },
    helmet: {
      name: "兜",
      category: "armor",
      hands: 1,
      // 守り少し、回避少し下がる
      bias: {
        defenseMult: 0.95,
        evasion: (floor) => -Math.round(1 + floor * 0.06),
      },
    },
    boots: {
      name: "ブーツ",
      category: "armor",
      hands: 1,
      // 回避寄り
      bias: {
        defenseMult: 0.75,
        evasion: (floor) => Math.round(8 + floor * 0.18),
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
    robe: {
      name: "ローブ",
      category: "armor",
      hands: 1,
      // 魔法寄り（回避少し、命中少し）
      bias: {
        defenseMult: 0.8,
        evasion: (floor) => Math.round(3 + floor * 0.10),
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
        evasion: (floor) => Math.round(12 + floor * 0.25),
      },
    },

    // 装飾品
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

  window.equipTypes = equipTypes;
  window.accessoryEffects = accessoryEffects;
})();
