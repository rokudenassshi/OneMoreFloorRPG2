// ===================
// 装備生成拡張: 特殊接頭語システム（固有効果）
// - ランダムオプションと差別化するため、固有効果は「%（乗算）」や onHit など“挙動が変わる系”を中心にする
// - 武器/防具でテーブル分離（共通あり）
// - 付与抽選は階層に関係なく常に1%
// - 接頭語のレアリティが高いほど出にくい
// ===================

(function () {
  "use strict";

  /**
   * 乱数（min〜max の整数）
   * @param {number} min
   * @param {number} max
   */
  function rollInt(min, max) {
    const a = Math.floor(Number(min) || 0);
    const b = Math.floor(Number(max) || 0);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  /**
   * %表記（小数無し）
   * @param {number} v
   */
  function pct(v) {
    const n = Math.round(Number(v) || 0);
    return `${n}%`;
  }

  /**
   * 重み付き抽選
   * @template T
   * @param {T[]} items
   * @param {(it: T) => number} weightFn
   * @returns {T|null}
   */
  function pickWeighted(items, weightFn) {
    if (!Array.isArray(items) || items.length === 0) return null;
    let total = 0;
    const weights = items.map((it) => {
      const w = Number(weightFn(it));
      const ww = Number.isFinite(w) ? Math.max(0, w) : 0;
      total += ww;
      return ww;
    });
    if (total <= 0) return items[Math.floor(Math.random() * items.length)];
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  // -------------------
  // テーブル
  // -------------------

  // 共通（武器/防具どちらにも付く）
  const SPECIAL_PREFIXES_COMMON = [
    {
      name: "栄光の",
      rarity: "rare",
      effects: [{ type: "bonusPct", key: "expBonus", min: 10, max: 20 }],
      describe: (r) => `経験値+${pct(r.expBonus)}`,
    },
    {
      name: "幸運の",
      rarity: "rare",
      effects: [{ type: "bonusPct", key: "dropRate", min: 8, max: 18 }],
      describe: (r) => `ドロップ率+${pct(r.dropRate)}`,
    },
    {
      name: "探求者の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "search", min: 6, max: 12 },
        { type: "bonusPct", key: "dropRate", min: 8, max: 18 },
      ],
      describe: (r) =>
        `索敵+${Math.round(Number(r.search) || 0)} / ドロップ率+${pct(r.dropRate)}`,
    },
    {
      name: "不死なる",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "regen", min: 2, max: 5 }, // regen は %/turn
        { type: "statPct", stat: "maxHp", min: 6, max: 12 },
      ],
      describe: (r) => `再生${pct(r.regen)} / 最大HP+${pct(r.maxHpPct)}`,
    },
    {
      name: "時渡りの",
      rarity: "epic",
      effects: [{ type: "bonusPct", key: "cooldownReduction", min: 1, max: 1 }],
      describe: (r) => `CT短縮+${Math.round(Number(r.cooldownReduction) || 0)}`,
    },
    {
      name: "先制の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "firstHitCrit", min: 1, max: 1 },
        { type: "bonusPct", key: "critDamage", min: 25, max: 60 },
      ],
      describe: (r) => `初撃会心（戦闘で1回） / 会心威力+${pct(r.critDamage)}`,
    },

    // -------------------
    // 追加：HP吸収/火力/耐久の組み合わせ
    // -------------------
    {
      name: "不死鳥の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "lifeSteal", min: 6, max: 12 },
        { type: "bonusPct", key: "regen", min: 2, max: 5 },
      ],
      describe: (r) => `HP吸収+${pct(r.lifeSteal)} / 再生${pct(r.regen)}`,
    },
    {
      name: "剛力の",
      rarity: "rare",
      effects: [
        { type: "statPct", stat: "attack", min: 6, max: 12 },
        { type: "statPct", stat: "maxHp", min: 6, max: 12 },
      ],
      describe: (r) => `攻撃力+${pct(r.attackPct)} / 最大HP+${pct(r.maxHpPct)}`,
    },
    {
      name: "盗賊の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "expBonus", min: 28, max: 50 },
        { type: "bonusPct", key: "dropRate", min: 24, max: 42 },
        { type: "bonusPct", key: "search", min: 35, max: 60 },
        { type: "statPct", stat: "attack", min: 8, max: 14 },
      ],
      describe: (r) =>
        `経験値+${pct(r.expBonus)} / ドロップ率+${pct(r.dropRate)} / 索敵+${Math.round(Number(r.search) || 0)} / 攻撃力+${pct(r.attackPct)}`,
    },
    {
      name: "永劫の",
      rarity: "legendary",
      effects: [
        { type: "statPct", stat: "maxHp", min: 14, max: 24 },
        { type: "bonusPct", key: "regen", min: 5, max: 10 }, // regen は %/turn
        { type: "bonusPct", key: "damageReduction", min: 12, max: 22 },
        { type: "statPct", stat: "defense", min: 10, max: 18 },
      ],
      describe: (r) =>
        `最大HP+${pct(r.maxHpPct)} / 再生${pct(r.regen)} / 被ダメ軽減+${pct(r.damageReduction)} / 防御力+${pct(r.defensePct)}`,
    },
    {
      name: "捨命の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "desperationDamage", min: 45, max: 80 },
        { type: "bonusPct", key: "battleStartHpLoss", min: 50, max: 50 },
        { type: "statPct", stat: "attack", min: 8, max: 16 },
      ],
      describe: (r) =>
        `背水+${pct(r.desperationDamage)} / 戦闘開始時HP-${pct(r.battleStartHpLoss)} / 攻撃力+${pct(r.attackPct)}`,
    },
  ];

  // 武器向け（攻撃的/手数/状態異常付与）
  const SPECIAL_PREFIXES_WEAPON = [
    // -------------------
    // 追加：HP吸収×火力
    // -------------------
    {
      name: "渇血の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "lifeSteal", min: 4, max: 10 },
        { type: "statPct", stat: "attack", min: 6, max: 12 },
      ],
      describe: (r) => `HP吸収+${pct(r.lifeSteal)} / 攻撃力+${pct(r.attackPct)}`,
    },
    {
      name: "血宴の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "lifeSteal", min: 8, max: 14 },
        { type: "bonusPct", key: "pursuitChance", min: 10, max: 22 },
      ],
      describe: (r) =>
        `HP吸収+${pct(r.lifeSteal)} / 追撃率+${pct(r.pursuitChance)}`,
    },
    {
      name: "屠りの",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "lifeSteal", min: 6, max: 12 },
        { type: "bonusPct", key: "critDamage", min: 25, max: 60 },
      ],
      describe: (r) =>
        `HP吸収+${pct(r.lifeSteal)} / 会心威力+${pct(r.critDamage)}`,
    },

    {
      name: "処刑人の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "executeDamage", min: 10, max: 22 },
        { type: "statPct", stat: "attack", min: 6, max: 12 },
      ],
      describe: (r) =>
        `追い打ち+${pct(r.executeDamage)} / 攻撃力+${pct(r.attackPct)}`,
    },
    {
      name: "連撃の",
      rarity: "rare",
      effects: [
        // 連続攻撃/追撃を統一（名称は「追撃」）
        { type: "bonusPct", key: "pursuitChance", min: 6, max: 14 },
        { type: "bonusPct", key: "pursuitDamagePct", min: 12, max: 28 },
      ],
      describe: (r) =>
        `追撃率+${pct(r.pursuitChance)} / 追撃威力+${pct(r.pursuitDamagePct)}`,
    },
    {
      name: "襲撃の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "pursuitChance", min: 8, max: 18 },
        { type: "bonusPct", key: "pursuitDamagePct", min: 15, max: 35 },
      ],
      describe: (r) =>
        `追撃率+${pct(r.pursuitChance)} / 追撃威力+${pct(r.pursuitDamagePct)}`,
    },

    {
      name: "鬼神の",
      rarity: "epic",
      effects: [
        { type: "statPct", stat: "attack", min: 10, max: 18 },
        { type: "bonusPct", key: "critDamage", min: 18, max: 40 },
      ],
      describe: (r) =>
        `攻撃力+${pct(r.attackPct)} / 会心威力+${pct(r.critDamage)}`,
    },
    {
      name: "断頭の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "executeDamage", min: 18, max: 40 },
        { type: "bonusPct", key: "critDamage", min: 25, max: 60 },
      ],
      describe: (r) =>
        `追い打ち+${pct(r.executeDamage)} / 会心威力+${pct(r.critDamage)}`,
    },

    {
      name: "術式の",
      rarity: "epic",
      effects: [{ type: "bonusPct", key: "skillPower", min: 15, max: 35 }],
      describe: (r) => `スキル威力+${pct(r.skillPower)}`,
    },
    {
      name: "雷鳴の",
      rarity: "epic",
      effects: [
        {
          type: "onHit",
          effect: "stun",
          chanceMin: 6,
          chanceMax: 12,
          turnsMin: 1,
          turnsMax: 2,
        },
      ],
      describe: (r) => `攻撃時${pct(r.stunChance)}でスタン（${r.stunTurns}T）`,
    },

    {
      name: "連鎖の",
      rarity: "epic",
      effects: [
        // 追撃/連続攻撃を統一：2つの確率を合算して「追撃率」として扱う
        { type: "bonusPct", key: "pursuitChance", min: 18, max: 38 },
      ],
      describe: (r) => `追撃率+${pct(r.pursuitChance)}`,
    },

    {
      name: "毒々しい",
      rarity: "rare",
      effects: [
        {
          type: "onHit",
          effect: "poison",
          chanceMin: 12,
          chanceMax: 22,
          turnsMin: 2,
          turnsMax: 4,
        },
      ],
      describe: (r) => `攻撃時${pct(r.poisonChance)}で毒（${r.poisonTurns}T）`,
    },
    {
      name: "炎を纏いし",
      rarity: "rare",
      effects: [
        {
          type: "onHit",
          effect: "burn",
          chanceMin: 10,
          chanceMax: 20,
          turnsMin: 2,
          turnsMax: 4,
        },
      ],
      describe: (r) => `攻撃時${pct(r.burnChance)}で火傷（${r.burnTurns}T）`,
    },
    // -------------------
    // 追加：レジェンダリー拡張
    // -------------------
    {
      name: "猛襲の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "pursuitChance", min: 22, max: 38 },
        { type: "bonusPct", key: "pursuitDamagePct", min: 70, max: 130 },
        { type: "statPct", stat: "attack", min: 12, max: 22 },
        { type: "bonusPct", key: "critRate", min: 6, max: 12 },
      ],
      describe: (r) =>
        `追撃率+${pct(r.pursuitChance)} / 追撃威力+${pct(r.pursuitDamagePct)} / 攻撃力+${pct(r.attackPct)} / 会心率+${pct(r.critRate)}`,
    },
    {
      name: "破滅の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "executeDamage", min: 32, max: 65 },
        { type: "bonusPct", key: "critDamage", min: 75, max: 140 },
        { type: "statPct", stat: "attack", min: 12, max: 22 },
        { type: "bonusPct", key: "accuracy", min: 8, max: 16 },
      ],
      describe: (r) =>
        `追い打ち+${pct(r.executeDamage)} / 会心威力+${pct(r.critDamage)} / 攻撃力+${pct(r.attackPct)} / 命中+${pct(r.accuracy)}`,
    },
    {
      name: "迅詠の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "cooldownReduction", min: 1, max: 1 },
        { type: "bonusPct", key: "skillPower", min: 32, max: 65 },
        { type: "bonusPct", key: "accuracy", min: 12, max: 22 },
        { type: "statPct", stat: "magicPower", min: 12, max: 20 },
      ],
      describe: (r) =>
        `CT短縮+${Math.round(Number(r.cooldownReduction) || 0)} / スキル威力+${pct(r.skillPower)} / 命中+${pct(r.accuracy)} / 魔力+${pct(r.magicPowerPct)}`,
    },
    {
      name: "天穿つ",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "accuracy", min: 12, max: 22 },
        { type: "bonusPct", key: "critRate", min: 10, max: 18 },
        { type: "bonusPct", key: "critDamage", min: 65, max: 120 },
        { type: "statPct", stat: "attack", min: 10, max: 18 },
      ],
      describe: (r) =>
        `命中+${pct(r.accuracy)} / 会心率+${pct(r.critRate)} / 会心威力+${pct(r.critDamage)} / 攻撃力+${pct(r.attackPct)}`,
    },
    {
      name: "雷鎖の",
      rarity: "legendary",
      effects: [
        {
          type: "onHit",
          effect: "stun",
          chanceMin: 10,
          chanceMax: 18,
          turnsMin: 1,
          turnsMax: 2,
        },
        { type: "bonusPct", key: "pursuitChance", min: 18, max: 32 },
        { type: "bonusPct", key: "accuracy", min: 12, max: 20 },
        { type: "statPct", stat: "attack", min: 8, max: 16 },
      ],
      describe: (r) =>
        `攻撃時${pct(r.stunChance)}でスタン（${r.stunTurns}T） / 追撃率+${pct(r.pursuitChance)} / 命中+${pct(r.accuracy)} / 攻撃力+${pct(r.attackPct)}`,
    },
    {
      name: "神速の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "critRate", min: 6, max: 12 },
        { type: "bonusPct", key: "accuracy", min: 8, max: 14 },
        { type: "statPct", stat: "attack", min: 12, max: 20 },
        { type: "bonusPct", key: "pursuitChance", min: 10, max: 20 },
      ],
      describe: (r) =>
        `会心率+${pct(r.critRate)} / 命中+${pct(r.accuracy)} / 攻撃力+${pct(r.attackPct)} / 追撃率+${pct(r.pursuitChance)}`,
    },
    {
      name: "災禍の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "pursuitChance", min: 18, max: 30 },
        { type: "bonusPct", key: "pursuitDamagePct", min: 50, max: 95 },
        { type: "bonusPct", key: "critDamage", min: 50, max: 105 },
        { type: "statPct", stat: "attack", min: 10, max: 18 },
      ],
      describe: (r) =>
        `追撃率+${pct(r.pursuitChance)} / 追撃威力+${pct(r.pursuitDamagePct)} / 会心威力+${pct(r.critDamage)} / 攻撃力+${pct(r.attackPct)}`,
    },
  ];

  // 防具向け（耐久/軽減/反撃/耐性）
  const SPECIAL_PREFIXES_ARMOR = [
    // -------------------
    // 追加：耐久×安定
    // -------------------
    {
      name: "堅守の",
      rarity: "rare",
      effects: [
        { type: "statPct", stat: "defense", min: 8, max: 14 },
        { type: "statPct", stat: "maxHp", min: 6, max: 12 },
      ],
      describe: (r) =>
        `防御力+${pct(r.defensePct)} / 最大HP+${pct(r.maxHpPct)}`,
    },
    {
      name: "鉄壁の",
      rarity: "rare",
      effects: [
        { type: "statPct", stat: "defense", min: 8, max: 14 },
        { type: "bonusPct", key: "damageReduction", min: 6, max: 12 },
      ],
      describe: (r) =>
        `防御力+${pct(r.defensePct)} / 被ダメ軽減+${pct(r.damageReduction)}`,
    },
    {
      name: "守護神の",
      rarity: "epic",
      effects: [
        { type: "statPct", stat: "maxHp", min: 10, max: 18 },
        { type: "bonusPct", key: "healReceived", min: 12, max: 25 },
      ],
      describe: (r) =>
        `最大HP+${pct(r.maxHpPct)} / 回復量+${pct(r.healReceived)}`,
    },
    {
      name: "聖域の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "healReceived", min: 12, max: 25 },
        { type: "bonusPct", key: "overhealBarrierCap", min: 20, max: 45 },
      ],
      describe: (r) =>
        `回復量+${pct(r.healReceived)} / 余剰回復盾+${pct(r.overhealBarrierCap)}`,
    },
    {
      name: "反撃の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "counterChance", min: 6, max: 14 },
        { type: "bonusPct", key: "counterDamage", min: 15, max: 35 },
      ],
      describe: (r) =>
        `反撃率+${pct(r.counterChance)} / 反撃威力+${pct(r.counterDamage)}`,
    },
    {
      name: "反射の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "counterChance", min: 8, max: 16 },
        { type: "bonusPct", key: "counterDamage", min: 25, max: 60 },
      ],
      describe: (r) =>
        `反撃率+${pct(r.counterChance)} / 反撃威力+${pct(r.counterDamage)}`,
    },
    {
      name: "浄化の",
      rarity: "rare",
      effects: [
        { type: "bonusPct", key: "ailmentResist", min: 12, max: 25 },
        { type: "bonusPct", key: "ailmentDurationDown", min: 10, max: 25 },
      ],
      describe: (r) =>
        `状態異常耐性+${pct(r.ailmentResist)} / 状態異常短縮+${pct(r.ailmentDurationDown)}`,
    },
    {
      name: "強靭の",
      rarity: "epic",
      effects: [
        { type: "statPct", stat: "maxHp", min: 10, max: 18 },
        { type: "bonusPct", key: "regen", min: 3, max: 7 },
      ],
      describe: (r) => `最大HP+${pct(r.maxHpPct)} / 再生${pct(r.regen)}`,
    },
    {
      name: "反骨の",
      rarity: "epic",
      effects: [
        { type: "bonusPct", key: "hitCdMinusChance", min: 10, max: 25 },
        { type: "bonusPct", key: "damageReduction", min: 6, max: 12 },
      ],
      describe: (r) =>
        `被弾でCT-1+${pct(r.hitCdMinusChance)} / 被ダメ軽減+${pct(r.damageReduction)}`,
    },
    // -------------------
    // 追加：レジェンダリー拡張
    // -------------------
    {
      name: "堅牢の",
      rarity: "legendary",
      effects: [
        { type: "statPct", stat: "defense", min: 16, max: 26 },
        { type: "bonusPct", key: "damageReduction", min: 12, max: 20 },
        { type: "statPct", stat: "maxHp", min: 12, max: 22 },
      ],
      describe: (r) =>
        `防御力+${pct(r.defensePct)} / 被ダメ軽減+${pct(r.damageReduction)} / 最大HP+${pct(r.maxHpPct)}`,
    },
    {
      name: "返報の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "counterChance", min: 14, max: 24 },
        { type: "bonusPct", key: "counterDamage", min: 50, max: 100 },
        { type: "bonusPct", key: "damageReduction", min: 8, max: 16 },
        { type: "statPct", stat: "defense", min: 10, max: 18 },
      ],
      describe: (r) =>
        `反撃率+${pct(r.counterChance)} / 反撃威力+${pct(r.counterDamage)} / 被ダメ軽減+${pct(r.damageReduction)} / 防御力+${pct(r.defensePct)}`,
    },
    {
      name: "不屈の",
      rarity: "legendary",
      effects: [
        { type: "statPct", stat: "maxHp", min: 14, max: 24 },
        { type: "bonusPct", key: "healReceived", min: 15, max: 30 },
        { type: "bonusPct", key: "damageReduction", min: 8, max: 16 },
        { type: "statPct", stat: "defense", min: 8, max: 16 },
      ],
      describe: (r) =>
        `最大HP+${pct(r.maxHpPct)} / 回復量+${pct(r.healReceived)} / 被ダメ軽減+${pct(r.damageReduction)} / 防御力+${pct(r.defensePct)}`,
    },
    {
      name: "不動の",
      rarity: "legendary",
      effects: [
        { type: "statPct", stat: "defense", min: 12, max: 20 },
        { type: "bonusPct", key: "damageReduction", min: 10, max: 18 },
        { type: "bonusPct", key: "ailmentResist", min: 18, max: 35 },
        { type: "statPct", stat: "maxHp", min: 10, max: 18 },
      ],
      describe: (r) =>
        `防御力+${pct(r.defensePct)} / 軽減+${pct(r.damageReduction)} / 耐性+${pct(r.ailmentResist)} / 最大HP+${pct(r.maxHpPct)}`,
    },

    {
      name: "生還者の",
      rarity: "legendary",
      effects: [
        { type: "bonusPct", key: "deathAvoidOnce", min: 1, max: 1 },
        { type: "statPct", stat: "maxHp", min: 12, max: 20 },
        { type: "bonusPct", key: "damageReduction", min: 8, max: 14 },
      ],
      describe: (r) =>
        `戦闘中1回だけ死亡回避 / 最大HP+${pct(r.maxHpPct)} / 被ダメ軽減+${pct(r.damageReduction)}`,
    },
  ];

  // -------------------
  // 付与確率・レア度補正
  // -------------------
  const SPECIAL_PREFIX_ATTACH_CHANCE = 0.001; // 0.1%（階層無関係）

  // 接頭語レア度が高いほど出にくい（weightに掛ける）
  const PREFIX_RARITY_WEIGHT_MULT = {
    rare: 1.0,
    epic: 0.35,
    legendary: 0.08,
  };

  /**
   * 特殊接頭語を抽選
   * @param {"common"|"uncommon"|"rare"|"epic"|"legendary"} itemRarity
   * @param {"weapon"|"armor"|"accessory"} category
   * @param {string} typeKey
   * @param {{forceRarity?: "rare"|"epic"|"legendary", forceRarityPool?: Array<"rare"|"epic"|"legendary">}} [options]
   */
  function rollSpecialPrefix(itemRarity, category, typeKey, options) {
    if (category !== "weapon" && category !== "armor") return null;

    const forceRarity =
      options && typeof options.forceRarity === "string"
        ? options.forceRarity
        : null;
    const forceRarityPool =
      options && Array.isArray(options.forceRarityPool)
        ? options.forceRarityPool.filter(
            (r) => r === "rare" || r === "epic" || r === "legendary",
          )
        : null;
    const hasForcedPool = !!(forceRarityPool && forceRarityPool.length > 0);

    if (Math.random() >= SPECIAL_PREFIX_ATTACH_CHANCE) return null;

    // 武器/防具とも「装備レア度に関係なく」接頭語テーブル全体から抽選できる
    // （接頭語自体の rarity による出にくさは PREFIX_RARITY_WEIGHT_MULT で担保）
    const allowed = new Set(["rare", "epic", "legendary"]);

    const poolBase = [
      ...SPECIAL_PREFIXES_COMMON,
      ...(category === "weapon"
        ? SPECIAL_PREFIXES_WEAPON
        : SPECIAL_PREFIXES_ARMOR),
    ];

    // レア度で絞る
    const candidates = poolBase.filter((p) => allowed.has(p.rarity));

    if (!candidates.length) return null;

    // まず rarity を抽選（候補がある rarity のみ）
    const rarityKeys = ["rare", "epic", "legendary"].filter(
      (r) =>
        candidates.some((p) => p.rarity === r) &&
        (!hasForcedPool || forceRarityPool.includes(r)),
    );

    const pickedRarity =
      forceRarity && rarityKeys.includes(forceRarity)
        ? forceRarity
        : pickWeighted(rarityKeys, (r) => {
            return PREFIX_RARITY_WEIGHT_MULT[r] || 1.0;
          });

    if (!pickedRarity) return null;

    // 抽選された rarity の中から均等に 1つ選ぶ（各接頭語 weight は使わない）
    const rarityPool = candidates.filter((p) => p.rarity === pickedRarity);
    const picked = rarityPool[Math.floor(Math.random() * rarityPool.length)];

    if (!picked) return null;

    // 返すときはコピー
    return { ...picked, _category: category, _typeKey: typeKey };
  }

  /**
   * 特殊接頭語の効果を装備に適用する
   * - ランダムオプションと差別化：固有効果は主に「%（乗算）」として適用
   * @param {object} item
   * @param {object} specialPrefix
   */
  function applySpecialPrefixEffects(item, specialPrefix) {
    if (!specialPrefix || !Array.isArray(specialPrefix.effects)) return;

    if (!item.effects) item.effects = [];
    if (!item.specialEffects) item.specialEffects = [];

    /** @type {Record<string, number>} */
    const rolled = {};

    for (const eff of specialPrefix.effects) {
      if (!eff || typeof eff !== "object") continue;

      // 乗算%（combat側で集計して最終的に掛ける）
      if (eff.type === "statPct") {
        const v = rollInt(eff.min, eff.max);
        if (eff.stat === "attack") {
          item.effects.push({ type: "attackPct", value: v });
          rolled.attackPct = v;
        } else if (eff.stat === "defense") {
          item.effects.push({ type: "defensePct", value: v });
          rolled.defensePct = v;
        } else if (eff.stat === "maxHp") {
          item.effects.push({ type: "maxHpPct", value: v });
          rolled.maxHpPct = v;
        } else if (eff.stat === "magicPower") {
          item.effects.push({ type: "magicPowerPct", value: v });
          rolled.magicPowerPct = v;
        } else if (eff.stat === "healPower") {
          item.effects.push({ type: "healPowerPct", value: v });
          rolled.healPowerPct = v;
        }
        continue;
      }

      // 既存の加算系（%系はそのまま combat側で加算される）
      if (eff.type === "bonusPct") {
        const v = rollInt(eff.min, eff.max);
        item.effects.push({ type: eff.key, value: v });
        rolled[eff.key] = v;
        continue;
      }

      // onHit（状態異常付与など）
      if (eff.type === "onHit") {
        const chance = rollInt(eff.chanceMin, eff.chanceMax);
        const turns = rollInt(eff.turnsMin, eff.turnsMax);
        item.specialEffects.push({
          type: "onHit",
          effect: eff.effect,
          chance: chance / 100,
          turns,
        });
        rolled[`${eff.effect}Chance`] = chance;
        rolled[`${eff.effect}Turns`] = turns;
        continue;
      }
    }

    // 動的説明（ロール値で更新）
    if (typeof specialPrefix.describe === "function") {
      try {
        specialPrefix.description = specialPrefix.describe(rolled);
      } catch (e) {
        // fallback
        specialPrefix.description = `${specialPrefix.name}の力`;
      }
    } else if (!specialPrefix.description) {
      specialPrefix.description = `${specialPrefix.name}の力`;
    }
  }

  // -------------------
  // グローバル公開
  // -------------------
  window.rollSpecialPrefix = rollSpecialPrefix;
  window.applySpecialPrefixEffects = applySpecialPrefixEffects;

  // デバッグ用（必要なら参照）
  window.SPECIAL_PREFIXES_COMMON = SPECIAL_PREFIXES_COMMON;
  window.SPECIAL_PREFIXES_WEAPON = SPECIAL_PREFIXES_WEAPON;
  window.SPECIAL_PREFIXES_ARMOR = SPECIAL_PREFIXES_ARMOR;
})();
