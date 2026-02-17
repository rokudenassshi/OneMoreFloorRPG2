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
      weight: 10,
      effects: [{ type: "bonusPct", key: "expBonus", min: 10, max: 20 }],
      describe: (r) => `経験値+${pct(r.expBonus)}`,
    },
    {
      name: "幸運の",
      rarity: "rare",
      weight: 8,
      effects: [{ type: "bonusPct", key: "dropRate", min: 8, max: 18 }],
      describe: (r) => `ドロップ率+${pct(r.dropRate)}`,
    },
    {
      name: "不死なる",
      rarity: "epic",
      weight: 5,
      effects: [
        { type: "bonusPct", key: "regen", min: 2, max: 5 }, // regen は %/turn
        { type: "statPct", stat: "maxHp", min: 6, max: 12 },
      ],
      describe: (r) => `再生${pct(r.regen)} / 最大HP+${pct(r.maxHpPct)}`,
    },
    {
      name: "時渡りの",
      rarity: "epic",
      weight: 5,
      effects: [{ type: "bonusPct", key: "cooldownReduction", min: 1, max: 1 }],
      describe: (r) => `CT短縮+${Math.round(Number(r.cooldownReduction) || 0)}`,
    },
  ];

  // 武器向け（攻撃的/手数/状態異常付与）
  const SPECIAL_PREFIXES_WEAPON = [
    {
      name: "処刑人の",
      rarity: "rare",
      weight: 10,
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
      weight: 9,
      effects: [
        { type: "bonusPct", key: "multiStrikeChance", min: 6, max: 14 },
        { type: "bonusPct", key: "multiStrikeDamage", min: 12, max: 28 },
      ],
      describe: (r) =>
        `連続攻撃+${pct(r.multiStrikeChance)} / 連続威力+${pct(r.multiStrikeDamage)}`,
    },
    {
      name: "襲撃の",
      rarity: "rare",
      weight: 9,
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
      weight: 6,
      effects: [
        { type: "statPct", stat: "attack", min: 10, max: 18 },
        { type: "bonusPct", key: "critDamage", min: 18, max: 40 },
      ],
      describe: (r) =>
        `攻撃力+${pct(r.attackPct)} / クリダメ+${pct(r.critDamage)}`,
    },
    {
      name: "断頭の",
      rarity: "epic",
      weight: 5,
      effects: [
        { type: "bonusPct", key: "executeDamage", min: 18, max: 40 },
        { type: "bonusPct", key: "critDamage", min: 25, max: 60 },
      ],
      describe: (r) =>
        `追い打ち+${pct(r.executeDamage)} / クリダメ+${pct(r.critDamage)}`,
    },

    {
      name: "毒々しい",
      rarity: "rare",
      weight: 10,
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
      weight: 10,
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
    {
      name: "神速の",
      rarity: "legendary",
      weight: 2,
      effects: [
        { type: "bonusPct", key: "critRate", min: 6, max: 12 },
        { type: "bonusPct", key: "accuracy", min: 6, max: 12 },
        { type: "statPct", stat: "attack", min: 10, max: 16 },
      ],
      describe: (r) =>
        `クリティカル率+${pct(r.critRate)} / 命中+${pct(r.accuracy)} / 攻撃力+${pct(r.attackPct)}`,
    },
  ];

  // 防具向け（耐久/軽減/反撃/耐性）
  const SPECIAL_PREFIXES_ARMOR = [
    {
      name: "鉄壁の",
      rarity: "rare",
      weight: 10,
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
      weight: 5,
      effects: [
        { type: "statPct", stat: "maxHp", min: 10, max: 18 },
        { type: "bonusPct", key: "healReceived", min: 12, max: 25 },
      ],
      describe: (r) =>
        `最大HP+${pct(r.maxHpPct)} / 回復量+${pct(r.healReceived)}`,
    },
    {
      name: "反撃の",
      rarity: "rare",
      weight: 9,
      effects: [
        { type: "bonusPct", key: "counterChance", min: 6, max: 14 },
        { type: "bonusPct", key: "counterDamage", min: 15, max: 35 },
      ],
      describe: (r) =>
        `反撃率+${pct(r.counterChance)} / 反撃威力+${pct(r.counterDamage)}`,
    },
    {
      name: "浄化の",
      rarity: "rare",
      weight: 8,
      effects: [
        { type: "bonusPct", key: "ailmentResist", min: 12, max: 25 },
        { type: "bonusPct", key: "ailmentDurationDown", min: 10, max: 25 },
      ],
      describe: (r) =>
        `状態異常耐性+${pct(r.ailmentResist)} / 状態異常短縮+${pct(r.ailmentDurationDown)}`,
    },
    {
      name: "不動の",
      rarity: "legendary",
      weight: 2,
      effects: [
        { type: "statPct", stat: "defense", min: 12, max: 20 },
        { type: "bonusPct", key: "damageReduction", min: 10, max: 18 },
        { type: "bonusPct", key: "ailmentResist", min: 18, max: 35 },
      ],
      describe: (r) =>
        `防御力+${pct(r.defensePct)} / 軽減+${pct(r.damageReduction)} / 耐性+${pct(r.ailmentResist)}`,
    },
  ];

  // -------------------
  // 付与確率・レア度補正
  // -------------------
  const SPECIAL_PREFIX_ATTACH_CHANCE = 0.01; // 1%（階層無関係）

  // 接頭語レア度が高いほど出にくい（weightに掛ける）
  const PREFIX_RARITY_WEIGHT_MULT = {
    rare: 1.0,
    epic: 0.35,
    legendary: 0.12,
  };

  function getAllowedPrefixRaritiesByItemRarity(itemRarity) {
    if (itemRarity === "legendary")
      return new Set(["rare", "epic", "legendary"]);
    if (itemRarity === "epic") return new Set(["rare", "epic"]);
    // common/uncommon/rare は rare のみ
    return new Set(["rare"]);
  }

  /**
   * 特殊接頭語を抽選
   * @param {"common"|"uncommon"|"rare"|"epic"|"legendary"} itemRarity
   * @param {"weapon"|"armor"|"accessory"} category
   * @param {string} typeKey
   */
  function rollSpecialPrefix(itemRarity, category, typeKey) {
    if (category !== "weapon" && category !== "armor") return null;

    if (Math.random() >= SPECIAL_PREFIX_ATTACH_CHANCE) return null;

    const allowed = getAllowedPrefixRaritiesByItemRarity(itemRarity);

    const poolBase = [
      ...SPECIAL_PREFIXES_COMMON,
      ...(category === "weapon"
        ? SPECIAL_PREFIXES_WEAPON
        : SPECIAL_PREFIXES_ARMOR),
    ];

    // レア度で絞る
    const candidates = poolBase.filter((p) => allowed.has(p.rarity));

    if (!candidates.length) return null;

    const picked = pickWeighted(candidates, (p) => {
      const baseW = Number(p.weight) || 1;
      const mul = PREFIX_RARITY_WEIGHT_MULT[p.rarity] || 1.0;
      return baseW * mul;
    });

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
