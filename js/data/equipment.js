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
        // 斧よりは少し控えめ（斬撃安定）
        attackMult: 1.3,
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
        // 大剣より高火力
        attackMult: 1.38,
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
        // クロスボウよりは火力控えめ・命中寄り
        attackMult: 0.92,
        accuracy: (floor) => Math.round(12 + floor * 0.25),
      },
    },
    crossbow: {
      name: "クロスボウ",
      category: "weapon",
      hands: 2,
      // 弓より高火力（命中も高いが、弓よりはやや重め）
      bias: {
        attackMult: 1.02,
        accuracy: (floor) => Math.round(10 + floor * 0.22),
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
      hands: 2,
      // 鉄壁（防御超高いが回避がマイナス）
      bias: {
        defenseMult: 1.65,
        // 回避はマイナス（%）。上限は低層でも効くようにする
        evasion: (floor) => -Math.min(20, Math.round(4 + floor * 0.045)),
        // 固有能力：被ダメ軽減（%）
        fixedEffects: {
          damageReduction: { base: 3, max: 8 },
        },
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
        // 回避上昇（%）最大+10
        evasion: (floor) => Math.min(10, Math.round(3 + floor * 0.03)),
      },
    },
    tower_shield: {
      name: "大盾",
      category: "armor",
      hands: 2,
      // 超堅い盾：回避は下がるが、反撃寄り
      bias: {
        defenseMult: 1.55,
        evasion: (floor) => -Math.min(15, Math.round(3 + floor * 0.03)),
        // 固有能力：反撃率UP（%）最大+10
        fixedEffects: {
          counterChance: { base: 3, max: 10 },
        },
      },
    },
    boots: {
      name: "靴",
      category: "armor",
      hands: 1,
      // 回避寄り
      bias: {
        defenseMult: 0.75,
        // 回避上昇（%）最大+15
        evasion: (floor) => Math.min(15, Math.round(4 + floor * 0.04)),
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
        accuracy: (floor) => Math.round(2 + floor * 0.08),
      },
    },
    cloak: {
      name: "マント",
      category: "armor",
      hands: 1,
      // 魔法攻撃力・回復力寄り（防御は低め）
      bias: {
        defenseMult: 0.65,
        magicAttackMult: 1.25,
        healPowerMult: 1.25,
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
    { name: "HP吸収", type: "lifeSteal", value: 6 },
    { name: "再生", type: "regen", value: 2 },
    // 連続攻撃/追撃を統一（名称は「追撃」）
    { name: "追撃", type: "pursuitChance", value: 6 },
    { name: "追撃強化", type: "pursuitDamagePct", value: 20 },
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
    // 装飾品は「下限〜上限」のレンジで値を持つ。
    // フロアが高いほど上限寄りが出やすい（core.js の rollAccessoryEffectValueByRange）。
    { name: "スキル威力", type: "skillPower", min: 6, max: 28 },
    { name: "CT短縮", type: "cooldownReduction", min: 1, max: 3 },

    // -------------------
    // 追加：装飾品で「別軸の強化」を作る
    // - cooldownCheatChance : スキル使用後、確率でクールタイムを0にする
    // - pursuitChance       : 攻撃/スキルが当たった後、確率で追撃する（1アクションにつき最大1回）
    // - deathAvoidOnce      : 戦闘中に1度だけ死亡を回避する
    // - overhealBarrierCap  : 回復のあふれをバリアに変換（最大HP%まで）
    // -------------------
    {
      name: "CT踏倒し",
      type: "cooldownCheatChance",
      min: 6,
      max: 22,
      minFloor: 80,
    },
    { name: "追撃", type: "pursuitChance", min: 10, max: 30, minFloor: 50 },
    { name: "致死耐え", type: "deathAvoidOnce", min: 1, max: 1, minFloor: 120 },
    {
      name: "余剰回復盾",
      type: "overhealBarrierCap",
      min: 15,
      max: 60,
      minFloor: 30,
    },

    // 追加：装飾品（戦闘テンポ/会心/追撃の拡張）
    {
      name: "被弾短縮",
      type: "hitCdMinusChance",
      min: 8,
      max: 30,
      minFloor: 60,
    },
    {
      name: "追撃強化",
      type: "pursuitDamagePct",
      min: 25,
      max: 80,
      minFloor: 90,
    },
    {
      name: "初撃追撃",
      type: "firstHitPursuit",
      min: 1,
      max: 1,
      minFloor: 110,
    },
    { name: "会心率", type: "critRate", min: 8, max: 35, minFloor: 40 },
    { name: "会心威力", type: "critDamage", min: 25, max: 120, minFloor: 50 },
    { name: "初撃会心", type: "firstHitCrit", min: 1, max: 1, minFloor: 120 },

    { name: "素手回避", type: "evasion", min: 4, max: 10, cond: "unarmed" },
    {
      name: "素手反撃",
      type: "counterChance",
      min: 10,
      max: 45,
      cond: "unarmed",
    },

    {
      name: "無防具追撃",
      type: "pursuitChance",
      min: 10,
      max: 60,
      cond: "noArmor",
    },
    { name: "無防具回避", type: "evasion", min: 4, max: 10, cond: "noArmor" },

    {
      name: "両手攻撃",
      type: "attackBonus",
      min: 20,
      max: 80,
      cond: "twoHanded",
    },

    { name: "索敵", type: "search", min: 1, max: 50 },
    { name: "ドロ率", type: "dropRate", min: 5, max: 40 },
  ];

  window.equipTypes = equipTypes;

  // 参照先を分離して公開
  window.equipmentOptionEffects = equipmentOptionEffects;
  window.accessoryOptionEffects = accessoryOptionEffects;
})();
