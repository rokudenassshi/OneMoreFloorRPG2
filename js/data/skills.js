// ===================
// ゲームデータ：スキル
// ===================

(function () {
  "use strict";

  // スキル定義
  const skills = {
    // ===================================
    // 共通スキル（どの職業でも取得できる）
    // ===================================
    search_up: {
      name: "索敵強化",
      type: "passive",
      job: "all",
      maxLevel: 100,
      desc: "索敵+{value}（最大Lv.100）",
      effect: (lv) => ({ searchBonus: lv }),
    },

    exp_up: {
      name: "経験値増加",
      type: "passive",
      job: "all",
      maxLevel: Infinity,
      desc: "獲得経験値+{value}%（上限なし）",
      effect: (lv) => ({ expBonus: lv }),
    },

    common_heal: {
      name: "ヒール",
      type: "active",
      accuracy: 100,
      job: "all",
      maxLevel: 1,
      cooldown: 6,
      desc: "HPを20%回復する",
      effect: (_lv) => ({ healRate: 0.2 }),
    },

    // ===================================
    // 剣士 (swordsman)
    // ===================================
    sword_mastery: {
      name: "剣術マスタリー",
      type: "passive",
      job: "swordsman",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 5 }),
    },
    sword_focus: {
      name: "剣の心得",
      type: "passive",
      job: "swordsman",
      maxLevel: 5,
      desc: "命中率+{value}%",
      effect: (lv) => ({ accuracyBonus: lv * 2 }),
    },
    power_slash: {
      name: "パワースラッシュ",
      type: "active",
      accuracy: 100,
      job: "swordsman",
      maxLevel: 3,
      cooldown: 3,
      desc: "強力な一撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.5 + lv * 0.5 }),
    },
    double_slash: {
      name: "二段斬り",
      type: "active",
      accuracy: 100,
      job: "swordsman",
      maxLevel: 3,
      cooldown: 4,
      desc: "2回連続攻撃（各{value}倍）",
      effect: (lv) => ({ hits: 2, damageMultiplier: 0.8 + lv * 0.15 }),
    },
    counter_stance: {
      name: "カウンタースタンス",
      type: "active",
      accuracy: 100,
      job: "swordsman",
      maxLevel: 3,
      cooldown: 5,
      desc: "攻撃しつつHP回復（ダメージ{value}倍、与ダメの30%回復）",
      effect: (lv) => ({ damageMultiplier: 1.2 + lv * 0.3, healPercent: 0.3 }),
    },

    // ---- 固有ギミック ----
    swordsman_kensei: {
      name: "剣星",
      type: "active",
      accuracy: 115,
      job: "swordsman",
      maxLevel: 3,
      cooldown: 4,
      desc: "回避/クリティカルで構えが溜まる。構えを全消費して斬撃（基本{value}倍 + 構えで大幅強化） / 構え上限+{value}",
      // ※ stanceMaxBonus はパッシブ扱いで反映する（core.js 側で特例対応）
      effect: (lv) => ({ damageMultiplier: 1.1 + lv * 0.25, stanceMaxBonus: lv }),
    },

    // ===================================
    // 戦士 (warrior)
    // ===================================
    iron_skin: {
      name: "鉄壁の肌",
      type: "passive",
      job: "warrior",
      maxLevel: 5,
      desc: "防御力+{value}",
      effect: (lv) => ({ defenseBonus: lv * 8 }),
    },
    warrior_vitality: {
      name: "戦士の体力",
      type: "passive",
      job: "warrior",
      maxLevel: 5,
      desc: "最大HP+{value}",
      effect: (lv) => ({ maxHpBonus: lv * 15 }),
    },
    shield_bash: {
      name: "シールドバッシュ",
      type: "active",
      accuracy: 100,
      job: "warrior",
      maxLevel: 3,
      cooldown: 4,
      desc: "盾で殴る（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.3 + lv * 0.4 }),
    },
    war_cry: {
      name: "雄叫び",
      type: "active",
      accuracy: 100,
      job: "warrior",
      maxLevel: 3,
      cooldown: 5,
      desc: "敵を威圧（ダメージ{value}倍、防御無視50%）",
      effect: (lv) => ({ damageMultiplier: 1.4 + lv * 0.3, ignoreDef: 0.5 }),
    },
    // ---- 固有ギミック ----
    warrior_counter_mastery: {
      name: "反撃の心得",
      type: "passive",
      job: "warrior",
      maxLevel: 5,
      desc: "反撃率が上がり、反撃ダメージも上がる",
      effect: (lv) => ({
        counterChanceBonus: lv * 6,
        counterDamageBonus: lv * 10,
      }),
    },

    // ===================================
    // 盗賊 (thief)
    // ===================================
    evasion_up: {
      name: "回避マスタリー",
      type: "passive",
      job: "thief",
      maxLevel: 5,
      desc: "回避率+{value}%",
      effect: (lv) => ({ evasionBonus: lv * 5 }),
    },
    thief_luck: {
      name: "盗賊の幸運",
      type: "passive",
      job: "thief",
      maxLevel: 5,
      desc: "クリティカル率+{value}%",
      effect: (lv) => ({ critBonus: lv * 2 }),
    },
    backstab: {
      name: "バックスタブ",
      type: "active",
      accuracy: 100,
      job: "thief",
      maxLevel: 3,
      cooldown: 2,
      desc: "急所を突く（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 2.0 + lv * 0.5 }),
    },
    shadow_strike: {
      name: "影撃ち",
      type: "active",
      accuracy: 100,
      job: "thief",
      maxLevel: 3,
      cooldown: 3,
      desc: "3回連続攻撃（各{value}倍）",
      effect: (lv) => ({ hits: 3, damageMultiplier: 0.6 + lv * 0.15 }),
    },
    steal_life: {
      name: "生命吸収",
      type: "active",
      accuracy: 100,
      job: "thief",
      maxLevel: 3,
      cooldown: 4,
      desc: "攻撃して吸収（ダメージ{value}倍、与ダメの50%回復）",
      effect: (lv) => ({ damageMultiplier: 1.3 + lv * 0.3, healPercent: 0.5 }),
    },

    // ---- 固有ギミック ----
    thief_just_dodge: {
      name: "ジャスト回避",
      type: "passive",
      job: "thief",
      // 仕様変更：最大Lv1、必要ポイント5
      maxLevel: 1,
      requiredPoints: 5,
      desc: "回避成功時、次の攻撃が確定クリティカル",
      effect: (lv) => ({ evasionBonus: lv * 1 }), // おまけ（わずかに回避も上げる）
    },

    // ===================================
    // 魔法使い (mage)
    // ===================================
    magic_power: {
      name: "魔力増幅",
      type: "passive",
      job: "mage",
      maxLevel: 5,
      desc: "魔法ダメージ+{value}",
      effect: (lv) => ({ magicBonus: lv * 10 }),
    },
    mage_focus: {
      name: "魔法の集中",
      type: "passive",
      job: "mage",
      maxLevel: 5,
      desc: "命中率+{value}%",
      effect: (lv) => ({ accuracyBonus: lv * 3 }),
    },
    fireball: {
      name: "ファイアボール",
      type: "active",
      accuracy: 100,
      job: "mage",
      maxLevel: 3,
      cooldown: 3,
      desc: "炎の魔法（基礎{value}+魔法威力×1.5）",
      effect: (lv) => ({ baseDamage: 40 + lv * 20, magicScale: 1.5 }),
    },
    meteor_strike: {
      name: "メテオストライク",
      type: "active",
      accuracy: 100,
      job: "mage",
      maxLevel: 3,
      cooldown: 6,
      desc: "隕石召喚（基礎{value}+魔法威力×2.0）",
      effect: (lv) => ({ baseDamage: 80 + lv * 40, magicScale: 2.0 }),
    },

    // ===================================
    // 魔法使い（回復/聖術）
    // ===================================
    cleric_blessing: {
      name: "祝福",
      type: "passive",
      job: "mage",
      maxLevel: 5,
      desc: "回復力+{value}",
      effect: (lv) => ({ healPowerBonus: lv * 12 }),
    },
    holy_aura: {
      name: "聖なるオーラ",
      type: "passive",
      job: "mage",
      maxLevel: 5,
      desc: "防御力+{value}",
      effect: (lv) => ({ defenseBonus: lv * 6 }),
    },
    cleric_heal: {
      name: "ヒール",
      type: "active",
      accuracy: 100,
      job: "mage",
      maxLevel: 3,
      cooldown: 4,
      desc: "HP回復（{value}+回復力×0.6）",
      effect: (lv) => ({ healAmount: 60 + lv * 40, healScale: 0.6 }),
    },
    greater_heal: {
      name: "グレーターヒール",
      type: "active",
      accuracy: 100,
      job: "mage",
      maxLevel: 3,
      cooldown: 6,
      desc: "大回復（{value}+回復力×0.8）",
      effect: (lv) => ({ healAmount: 100 + lv * 60, healScale: 0.8 }),
    },
    holy_smite: {
      name: "聖なる一撃",
      type: "active",
      accuracy: 100,
      job: "mage",
      maxLevel: 3,
      cooldown: 4,
      desc: "光の魔法（基礎{value}+魔法威力×1.3）",
      effect: (lv) => ({ baseDamage: 45 + lv * 22, magicScale: 1.3 }),
    },

    // ===================================
    // 弓使い (archer)
    // ===================================
    crit_up: {
      name: "クリティカルマスタリー",
      type: "passive",
      job: "archer",
      maxLevel: 5,
      desc: "クリティカル率+{value}%",
      effect: (lv) => ({ critBonus: lv * 3 }),
    },
    archer_precision: {
      name: "射手の精密",
      type: "passive",
      job: "archer",
      maxLevel: 5,
      desc: "命中率+{value}%",
      effect: (lv) => ({ accuracyBonus: lv * 4 }),
    },
    piercing_shot: {
      name: "貫通射撃",
      type: "active",
      accuracy: 100,
      job: "archer",
      maxLevel: 3,
      cooldown: 3,
      desc: "防御無視（ダメージ{value}倍、防御無視50%）",
      effect: (lv) => ({ damageMultiplier: 1.8 + lv * 0.4, ignoreDef: 0.5 }),
    },
    rapid_fire: {
      name: "速射",
      type: "active",
      accuracy: 100,
      job: "archer",
      maxLevel: 3,
      cooldown: 4,
      desc: "3回連続射撃（各{value}倍）",
      effect: (lv) => ({ hits: 3, damageMultiplier: 0.7 + lv * 0.15 }),
    },
    headshot: {
      name: "ヘッドショット",
      type: "active",
      accuracy: 100,
      job: "archer",
      maxLevel: 3,
      cooldown: 5,
      desc: "急所狙い（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 2.2 + lv * 0.6 }),
    },

    // ---- 固有ギミック ----
    archer_preemptive_shot: {
      name: "先制射撃",
      type: "passive",
      job: "archer",
      maxLevel: 3,
      desc: "戦闘開始時、確率で先制攻撃（Lvで確率/威力UP）",
      effect: (lv) => ({ accuracyBonus: lv * 2 }),
    },

    // ===================================
    // 斧使い (axeman)
    // ===================================
    axe_mastery: {
      name: "斧術マスタリー",
      type: "passive",
      // 斧使い削除：戦士へ統合
      job: "warrior",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 6 }),
    },
    cleave: {
      name: "たたき割り",
      type: "active",
      accuracy: 100,
      job: "warrior",
      maxLevel: 3,
      cooldown: 3,
      desc: "強烈な一撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.6 + lv * 0.45 }),
    },
    crushing_blow: {
      name: "粉砕打撃",
      type: "active",
      accuracy: 100,
      job: "warrior",
      maxLevel: 3,
      cooldown: 6,
      desc: "渾身の一撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 2.3 + lv * 0.7 }),
    },


    // ===================================
    // 格闘家 (monk)
    // ===================================
    swift_strikes: {
      name: "連撃",
      type: "passive",
      job: "monk",
      maxLevel: 5,
      desc: "攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 4 }),
    },
    monk_evasion: {
      name: "武術の構え",
      type: "passive",
      job: "monk",
      maxLevel: 5,
      desc: "回避率+{value}%",
      effect: (lv) => ({ evasionBonus: lv * 3 }),
    },
    healing_touch: {
      name: "ヒーリングタッチ",
      type: "active",
      accuracy: 100,
      job: "monk",
      maxLevel: 3,
      cooldown: 5,
      desc: "HP回復（{value}+回復力×0.5）",
      effect: (lv) => ({ healAmount: 50 + lv * 30, healScale: 0.5 }),
    },
    flurry_of_blows: {
      name: "連打",
      type: "active",
      accuracy: 100,
      job: "monk",
      maxLevel: 3,
      cooldown: 4,
      desc: "4回連続攻撃（各{value}倍）",
      effect: (lv) => ({ hits: 4, damageMultiplier: 0.5 + lv * 0.12 }),
    },
    chi_strike: {
      name: "気功撃",
      type: "active",
      accuracy: 100,
      job: "monk",
      maxLevel: 3,
      cooldown: 5,
      desc: "気を込めた打撃（ダメージ{value}倍、与ダメの25%回復）",
      effect: (lv) => ({ damageMultiplier: 1.5 + lv * 0.4, healPercent: 0.25 }),
    },

    // ---- 固有ギミック ----
    monk_ki_mastery: {
      name: "気功",
      type: "passive",
      job: "monk",
      maxLevel: 3,
      desc: "攻撃命中で気が溜まる。気上限+{value}",
      effect: (lv) => ({ qiMaxBonus: lv * 2 }),
    },
    monk_ki_blast: {
      name: "気弾",
      type: "active",
      accuracy: 110,
      job: "monk",
      maxLevel: 3,
      cooldown: 4,
      desc: "気を消費して遠距離攻撃（気が多いほど強い）",
      effect: (lv) => ({ baseDamage: 6 + lv * 6, magicScale: 0.4 + lv * 0.15 }),
    },
  };

  window.skills = skills;
})();
