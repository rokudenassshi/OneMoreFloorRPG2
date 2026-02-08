// ===================
// 装備生成拡張: 特殊接頭語システム
// ===================

(function () {
  "use strict";

  // -------------------
  // 特殊接頭語（低確率で付与される追加効果付き接頭語）
  // -------------------
  const SPECIAL_PREFIXES = [
    // ===== RARE: 状態異常付与系 =====
    {
      name: "毒々しい",
      rarity: "rare",
      weight: 10,
      effects: [
        { type: "onHit", effect: "poison", chance: 0.15, turns: 3 }
      ],
      description: "攻撃時15%で敵を毒状態にする（3ターン）"
    },
    {
      name: "炎を纏いし",
      rarity: "rare",
      weight: 10,
      effects: [
        { type: "onHit", effect: "burn", chance: 0.12, turns: 2 }
      ],
      description: "攻撃時12%で敵を火傷状態にする（2ターン）"
    },
    {
      name: "氷結の",
      rarity: "rare",
      weight: 10,
      effects: [
        { type: "onHit", effect: "slow", chance: 0.15, turns: 2, rate: 0.2 }
      ],
      description: "攻撃時15%で敵を鈍足状態にする（2ターン、-20%）"
    },
    {
      name: "雷鳴の",
      rarity: "rare",
      weight: 8,
      effects: [
        { type: "onHit", effect: "stun", chance: 0.10, turns: 1 }
      ],
      description: "攻撃時10%で敵をしびれ状態にする（1ターン）"
    },
    {
      name: "流血の",
      rarity: "rare",
      weight: 10,
      effects: [
        { type: "onHit", effect: "bleed", chance: 0.18, turns: 3 }
      ],
      description: "攻撃時18%で敵を出血状態にする（3ターン）"
    },
    {
      name: "盲目の",
      rarity: "rare",
      weight: 8,
      effects: [
        { type: "onHit", effect: "accuracyDown", chance: 0.15, turns: 2, rate: 0.25 }
      ],
      description: "攻撃時15%で敵の命中率を下げる（2ターン、-25%）"
    },

    // ===== EPIC: 強力な状態異常 + ステータス強化 =====
    {
      name: "呪われし",
      rarity: "epic",
      weight: 5,
      effects: [
        { type: "onHit", effect: "vulnerable", chance: 0.15, turns: 2, rate: 0.25 }
      ],
      description: "攻撃時15%で敵を脆弱状態にする（2ターン、+25%被ダメ）"
    },
    {
      name: "封魔の",
      rarity: "epic",
      weight: 4,
      effects: [
        { type: "onHit", effect: "silence", chance: 0.08, turns: 1 }
      ],
      description: "攻撃時8%で敵を封印状態にする（1ターン）"
    },
    {
      name: "吸血鬼の",
      rarity: "epic",
      weight: 6,
      effects: [
        { type: "stat", stat: "lifeSteal", value: 5 }
      ],
      description: "吸血+5%"
    },
    {
      name: "再生の",
      rarity: "epic",
      weight: 6,
      effects: [
        { type: "stat", stat: "regen", value: 2 }
      ],
      description: "再生+2%"
    },
    {
      name: "不屈の",
      rarity: "epic",
      weight: 5,
      effects: [
        { type: "stat", stat: "damageReduction", value: 8 }
      ],
      description: "被ダメージ軽減+8%"
    },
    {
      name: "反射の",
      rarity: "epic",
      weight: 4,
      effects: [
        { type: "stat", stat: "evasion", value: 8 }
      ],
      description: "回避率+8%"
    },
    {
      name: "必中の",
      rarity: "epic",
      weight: 4,
      effects: [
        { type: "stat", stat: "accuracy", value: 10 }
      ],
      description: "命中率+10%"
    },

    // ===== LEGENDARY: 複合効果 =====
    {
      name: "狂戦士の",
      rarity: "legendary",
      weight: 3,
      effects: [
        { type: "stat", stat: "critRate", value: 8 },
        { type: "stat", stat: "critDamage", value: 25 }
      ],
      description: "クリティカル率+8% / クリティカルダメージ+25%"
    },
    {
      name: "賢者の",
      rarity: "legendary",
      weight: 3,
      effects: [
        { type: "stat", stat: "expBonus", value: 20 },
        { type: "stat", stat: "skillPower", value: 15 }
      ],
      description: "経験値+20% / スキル威力+15%"
    },
    {
      name: "神速の",
      rarity: "legendary",
      weight: 2,
      effects: [
        { type: "stat", stat: "evasion", value: 12 },
        { type: "stat", stat: "accuracy", value: 8 }
      ],
      description: "回避率+12% / 命中率+8%"
    },
    {
      name: "守護者の",
      rarity: "legendary",
      weight: 2,
      effects: [
        { type: "stat", stat: "defenseBonus", value: 20 },
        { type: "stat", stat: "maxHpBonus", value: 30 }
      ],
      description: "防御力+20 / 最大HP+30"
    },
    {
      name: "破壊の化身",
      rarity: "legendary",
      weight: 1,
      effects: [
        { type: "stat", stat: "attackBonus", value: 25 },
        { type: "onHit", effect: "vulnerable", chance: 0.20, turns: 2, rate: 0.3 }
      ],
      description: "攻撃力+25 / 攻撃時20%で敵を脆弱状態（2T、+30%被ダメ）"
    },
    {
      name: "全知全能の",
      rarity: "legendary",
      weight: 1,
      effects: [
        { type: "stat", stat: "magicPower", value: 30 },
        { type: "stat", stat: "healPower", value: 25 },
        { type: "stat", stat: "skillPower", value: 20 }
      ],
      description: "魔法攻撃力+30 / 回復力+25 / スキル威力+20%"
    },
    {
      name: "暗殺者の",
      rarity: "legendary",
      weight: 2,
      effects: [
        { type: "stat", stat: "critRate", value: 10 },
        { type: "onHit", effect: "bleed", chance: 0.25, turns: 3 }
      ],
      description: "クリティカル率+10% / 攻撃時25%で敵を出血状態（3T）"
    },
    {
      name: "不死なる",
      rarity: "legendary",
      weight: 1,
      effects: [
        { type: "stat", stat: "lifeSteal", value: 8 },
        { type: "stat", stat: "regen", value: 3 },
        { type: "stat", stat: "healReceived", value: 15 }
      ],
      description: "吸血+8% / 再生+3% / 回復量+15%"
    },
  ];

  /**
   * 特殊接頭語を抽選する
   * @param {string} itemRarity - アイテムのレアリティ
   * @param {number} floor - 現在の階層
   * @returns {object|null} - 選ばれた特殊接頭語、または null
   */
  function rollSpecialPrefix(itemRarity, floor) {
    // 基本確率（階層が高いほど出やすい）
    const baseChance = Math.min(0.15, 0.02 + (floor / 1000));
    
    // レアリティボーナス
    const rarityBonus = {
      common: 0,
      uncommon: 0.01,
      rare: 0.03,
      epic: 0.06,
      legendary: 0.10
    };
    
    const totalChance = baseChance + (rarityBonus[itemRarity] || 0);
    
    if (Math.random() > totalChance) return null;
    
    // レアリティに応じて候補を絞る
    let candidates = SPECIAL_PREFIXES.filter(prefix => {
      // 装備のレアリティ以下の接頭語のみ
      const rarityOrder = { rare: 1, epic: 2, legendary: 3 };
      const itemRarityLevel = rarityOrder[itemRarity] || 0;
      const prefixRarityLevel = rarityOrder[prefix.rarity] || 0;
      return prefixRarityLevel <= itemRarityLevel + 1; // 1段階上まで許可
    });
    
    if (candidates.length === 0) return null;
    
    // 重みに基づいて抽選
    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    
    for (const prefix of candidates) {
      roll -= prefix.weight;
      if (roll <= 0) {
        return { ...prefix };
      }
    }
    
    return candidates[candidates.length - 1];
  }

  /**
   * 特殊接頭語の効果を装備に適用する
   * @param {object} item - 装備アイテム
   * @param {object} specialPrefix - 特殊接頭語
   */
  function applySpecialPrefixEffects(item, specialPrefix) {
    if (!specialPrefix || !specialPrefix.effects) return;
    
    if (!item.specialEffects) item.specialEffects = [];
    
    for (const effect of specialPrefix.effects) {
      if (effect.type === "stat") {
        // ステータス効果は通常のeffectsに追加
        if (!item.effects) item.effects = [];
        item.effects.push({
          type: effect.stat,
          value: effect.value,
          name: `${specialPrefix.name}の恩恵`
        });
      } else if (effect.type === "onHit") {
        // 攻撃時発動効果は特殊効果として記録
        item.specialEffects.push({
          type: "onHit",
          effect: effect.effect,
          chance: effect.chance,
          turns: effect.turns,
          rate: effect.rate
        });
      }
    }
    
    // 特殊接頭語情報を記録
    item.specialPrefix = {
      name: specialPrefix.name,
      description: specialPrefix.description,
      rarity: specialPrefix.rarity
    };
  }

  // グローバルに公開
  window.SPECIAL_PREFIXES = SPECIAL_PREFIXES;
  window.rollSpecialPrefix = rollSpecialPrefix;
  window.applySpecialPrefixEffects = applySpecialPrefixEffects;
})();
