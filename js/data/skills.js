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
      accuracy: 110,
      job: "swordsman",
      maxLevel: 3,
      cooldown: 4,
      desc: "会心を狙う鋭い斬撃（ダメージ{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.35 + lv * 0.35 }),
    },

    // ---- 上級職：剣聖 (blademaster) ----
    blademaster_stance_mastery: {
      name: "構えの極意",
      type: "passive",
      job: "blademaster",
      maxLevel: 3,
      requiredPoints: 3,
      desc: "回避/クリティカルで構えが溜まり、構え1につき物理ダメージ+6%。構え上限+{value}",
      effect: (lv) => ({ stanceMaxBonus: lv }), // 上限 3+lv
    },
    blademaster_iai: {
      name: "居合い",
      type: "active",
      accuracy: 115,
      job: "blademaster",
      maxLevel: 3,
      requiredPoints: 3,
      cooldown: 4,
      desc: "構えを全消費して斬撃（基本{value}倍 + 構えで大幅強化）",
      effect: (lv) => ({ damageMultiplier: 1.1 + lv * 0.25 }),
    },
    blademaster_minds_eye: {
      name: "心眼",
      type: "passive",
      job: "blademaster",
      maxLevel: 5,
      requiredPoints: 4,
      desc: "命中+{value}%（Lvで増加。会心率も上がる）",
      effect: (lv) => ({ accuracyBonus: lv * 4, critBonus: lv * 2 }),
    },
    blademaster_tsubame: {
      name: "燕返し",
      type: "active",
      accuracy: 120,
      job: "blademaster",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 5,
      desc: "高速の二連斬（{value}倍×2）",
      effect: (lv) => ({ hits: 2, damageMultiplier: 0.95 + lv * 0.12 }),
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

    // ===================================
    // 上級職スキル（個別：上位職は下位職スキルを使用不可）
    // ===================================

    
    blademaster_flowing_guard: {
      name: "流転の構え",
      type: "passive",
      job: "blademaster",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "回避+{value}。回避時、追加で構えが溜まる（最大+1）",
      effect: (lv) => ({ evasionBonus: lv * 3 }),
    },
    blademaster_parry: {
      name: "受け流し",
      type: "active",
      job: "blademaster",
      accuracy: 999,
      maxLevel: 3,
      cooldown: 6,
      desc: "次の被ダメージを軽減しつつ反撃の構えを作る（防御状態1ターン＋構え+{value}）",
      effect: (lv) => ({ defendTurns: 1, gainStance: 1 + Math.floor(lv / 3) }),
    },

// ---- 守護者 (guardian) ----
    guardian_iron_wall: {
      name: "鉄壁",
      type: "passive",
      job: "guardian",
      maxLevel: 5,
      desc: "防御力+{value}",
      effect: (lv) => ({ defenseBonus: lv * 12 }),
    },
    guardian_counter_stance: {
      name: "反撃の構え",
      type: "passive",
      job: "guardian",
      maxLevel: 5,
      desc: "反撃率+{value}%",
      effect: (lv) => ({ counterChanceBonus: lv * 2 }),
    },
    guardian_shield_bash: {
      name: "シールドバッシュ",
      type: "active",
      accuracy: 105,
      job: "guardian",
      maxLevel: 3,
      cooldown: 5,
      desc: "盾で強打（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.2 + lv * 0.25 }),
    },
    guardian_last_stand: {
      name: "不屈",
      type: "passive",
      job: "guardian",
      maxLevel: 5,
      requiredPoints: 4,
      desc: "最大HP+{value}（Lvで増加。防御力も上がる）",
      effect: (lv) => ({ maxHpBonus: lv * 25, defenseBonus: lv * 6 }),
    },
    guardian_bulwark: {
      name: "堅牢の盾",
      type: "active",
      accuracy: 100,
      job: "guardian",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 7,
      desc: "守りを固めつつ反撃（{value}倍、与ダメの20%回復）",
      effect: (lv) => ({ damageMultiplier: 1.05 + lv * 0.18, healPercent: 0.2 }),
    },


    // ---- 暗殺者 (assassin) ----
    assassin_shadow_step: {
      name: "影走り",
      type: "passive",
      job: "assassin",
      maxLevel: 5,
      desc: "回避+{value}",
      effect: (lv) => ({ evasionBonus: lv * 4 }),
    },
    assassin_killing_intent: {
      name: "殺意",
      type: "passive",
      job: "assassin",
      maxLevel: 5,
      desc: "会心率+{value}",
      effect: (lv) => ({ critBonus: lv * 2 }),
    },
    assassin_backstab: {
      name: "背撃",
      type: "active",
      accuracy: 110,
      job: "assassin",
      maxLevel: 3,
      cooldown: 4,
      desc: "急所を突く（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.25 + lv * 0.3 }),
    },
    assassin_chain_kill: {
      name: "連続暗殺",
      type: "active",
      accuracy: 115,
      job: "assassin",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 5,
      desc: "3連撃（{value}倍×3）",
      effect: (lv) => ({ hits: 3, damageMultiplier: 0.6 + lv * 0.1 }),
    },
    assassin_smoke: {
      name: "煙幕",
      type: "passive",
      job: "assassin",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "回避+{value}%（Lvで増加。命中も上がる）",
      effect: (lv) => ({ evasionBonus: lv * 2, accuracyBonus: lv * 2 }),
    },


    
    assassin_shadow_follow: {
      name: "影の追撃",
      type: "passive",
      job: "assassin",
      maxLevel: 5,
      requiredPoints: 4,
      desc: "スキル使用時、{value}%で追撃が発生する（最大30%）",
      effect: (lv) => ({ skillFollowUpChance: Math.min(0.3, lv * 0.06) }),
    },

// ---- 大魔導士 (archmage) ----
    archmage_mana_overflow: {
      name: "魔力奔流",
      type: "passive",
      job: "archmage",
      maxLevel: 5,
      desc: "魔法攻撃力+{value}",
      effect: (lv) => ({ magicBonus: lv * 10 }),
    },
    archmage_arcane_bolt: {
      name: "秘術の矢",
      type: "active",
      accuracy: 110,
      job: "archmage",
      maxLevel: 3,
      cooldown: 4,
      desc: "魔力弾で攻撃（威力+{value}）",
      effect: (lv) => ({ baseDamage: 18 + lv * 10, magicScale: 1.1 + lv * 0.15 }),
    },
    archmage_meteor: {
      name: "メテオ",
      type: "active",
      accuracy: 95,
      job: "archmage",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 8,
      desc: "超高火力の攻撃魔法（威力+{value}）",
      effect: (lv) => ({ baseDamage: 45 + lv * 25, magicScale: 1.3 + lv * 0.2 }),
    },
    archmage_spellweave: {
      name: "詠唱加速",
      type: "passive",
      job: "archmage",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "魔法攻撃力+{value}（Lvで増加。回復力も上がる）",
      effect: (lv) => ({ magicBonus: lv * 6, healPowerBonus: lv * 4 }),
    },


    // ---- 狙撃手 (sniper) ----
    sniper_steady_aim: {
      name: "狙い澄ます",
      type: "passive",
      job: "sniper",
      maxLevel: 5,
      desc: "命中+{value}",
      effect: (lv) => ({ accuracyBonus: lv * 3 }),
    },
    sniper_piercing_shot: {
      name: "貫通射ち",
      type: "active",
      accuracy: 120,
      job: "sniper",
      maxLevel: 3,
      cooldown: 4,
      desc: "高精度の一撃（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.15 + lv * 0.25 }),
    },
    sniper_headshot: {
      name: "ヘッドショット",
      type: "active",
      accuracy: 135,
      job: "sniper",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 7,
      desc: "超精密の一撃（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.55 + lv * 0.25, ignoreDef: 0.35 }),
    },
    sniper_camouflage: {
      name: "狙撃姿勢",
      type: "passive",
      job: "sniper",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "攻撃力+{value}、命中+{value}。代わりに回避が下がる",
      effect: (lv) => ({ attackBonus: lv * 8, accuracyBonus: lv * 3, evasionBonus: -lv * 2 }),
    },


    // ---- 拳聖 (fistmaster) ----
    fistmaster_flow: {
      name: "拳気流転",
      type: "passive",
      job: "fistmaster",
      maxLevel: 5,
      desc: "回避+{value}",
      effect: (lv) => ({ evasionBonus: lv * 3 }),
    },
    fistmaster_healing_fist: {
      name: "癒しの拳",
      type: "active",
      accuracy: 100,
      job: "fistmaster",
      maxLevel: 3,
      cooldown: 6,
      desc: "HPを{value}%回復する",
      effect: (lv) => ({ healRate: 0.12 + lv * 0.06 }),
    },
    fistmaster_hundred_fists: {
      name: "百裂拳",
      type: "active",
      accuracy: 105,
      job: "fistmaster",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 6,
      desc: "5連打（{value}倍×5）",
      effect: (lv) => ({ hits: 5, damageMultiplier: 0.45 + lv * 0.08 }),
    },
    fistmaster_inner_heal: {
      name: "内気功療法",
      type: "active",
      accuracy: 100,
      job: "fistmaster",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 7,
      desc: "HP回復（{value}+回復力×0.8）",
      effect: (lv) => ({ healAmount: 70 + lv * 45, healScale: 0.8 }),
    },


    // ---- 騎士 (warlord) ----
    warlord_command: {
      name: "号令",
      type: "passive",
      job: "warlord",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 10 }),
    },
    warlord_charge: {
      name: "突撃",
      type: "active",
      accuracy: 105,
      job: "warlord",
      maxLevel: 3,
      cooldown: 5,
      desc: "勢いよく斬り込む（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.2 + lv * 0.28 }),
    },
    warlord_banner: {
      name: "軍旗",
      type: "passive",
      job: "warlord",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "防御力+{value}（Lvで増加。命中も上がる）",
      effect: (lv) => ({ defenseBonus: lv * 8, accuracyBonus: lv * 2 }),
    },
    warlord_judgement: {
      name: "断罪撃",
      type: "active",
      accuracy: 110,
      job: "warlord",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 6,
      desc: "重い一撃（{value}倍、防御無視60%）",
      effect: (lv) => ({ damageMultiplier: 1.35 + lv * 0.22, ignoreDef: 0.6 }),
    },


    // ---- 奇術師 (trickster) ----
    trickster_feint: {
      name: "フェイント",
      type: "passive",
      job: "trickster",
      maxLevel: 5,
      desc: "回避+{value}",
      effect: (lv) => ({ evasionBonus: lv * 3 }),
    },
    trickster_poison_dart: {
      name: "奇毒の矢",
      type: "active",
      accuracy: 110,
      job: "trickster",
      maxLevel: 3,
      cooldown: 5,
      desc: "狡猾な一撃（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.05 + lv * 0.22, hits: 2 }),
    },
    trickster_heist: {
      name: "強奪",
      type: "active",
      accuracy: 115,
      job: "trickster",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 6,
      desc: "奪い取りながら攻撃（{value}倍、与ダメの35%回復）",
      effect: (lv) => ({ damageMultiplier: 1.1 + lv * 0.18, healPercent: 0.35 }),
    },
    trickster_lucky_find: {
      name: "戦場の目利き",
      type: "passive",
      job: "trickster",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "索敵+{value}（Lvで増加。会心率も上がる）",
      effect: (lv) => ({ searchBonus: lv * 2, critBonus: lv * 1 }),
    },


    // ---- 賢者 (sage) ----
    sage_blessing: {
      name: "叡智の加護",
      type: "passive",
      job: "sage",
      maxLevel: 5,
      desc: "回復力+{value}",
      effect: (lv) => ({ healPowerBonus: lv * 6 }),
    },
    sage_prayer: {
      name: "大祈祷",
      type: "active",
      accuracy: 100,
      job: "sage",
      maxLevel: 3,
      cooldown: 7,
      desc: "HPを{value}%回復する",
      effect: (lv) => ({ healRate: 0.18 + lv * 0.07 }),
    },
    sage_arcane_aid: {
      name: "秘術治癒",
      type: "active",
      accuracy: 100,
      job: "sage",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 6,
      desc: "HP回復（{value}+回復力×1.0）",
      effect: (lv) => ({ healAmount: 90 + lv * 55, healScale: 1.0 }),
    },
    sage_light_bolt: {
      name: "光弾",
      type: "active",
      accuracy: 110,
      job: "sage",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 4,
      desc: "攻撃と回復を両立（威力+{value}）",
      effect: (lv) => ({ baseDamage: 16 + lv * 8, magicScale: 0.9 + lv * 0.1 }),
    },


    // ---- レンジャー (ranger) ----
    ranger_trail: {
      name: "追跡",
      type: "passive",
      job: "ranger",
      maxLevel: 5,
      desc: "索敵+{value}",
      effect: (lv) => ({ searchBonus: lv * 2 }),
    },
    ranger_double_shot: {
      name: "連射",
      type: "active",
      accuracy: 110,
      job: "ranger",
      maxLevel: 3,
      cooldown: 5,
      desc: "2連射（{value}倍×2）",
      effect: (lv) => ({ damageMultiplier: 0.85 + lv * 0.1, hits: 2 }),
    },
    ranger_survival: {
      name: "サバイバル",
      type: "passive",
      job: "ranger",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "回避+{value}%（Lvで増加。最大HPも上がる）",
      effect: (lv) => ({ evasionBonus: lv * 2, maxHpBonus: lv * 15 }),
    },
    ranger_healing_arrow: {
      name: "癒しの矢",
      type: "active",
      job: "ranger",
      accuracy: 100,
      maxLevel: 3,
      cooldown: 6,
      desc: "HPを{value}%回復する（遊撃の回復）",
      effect: (lv) => ({ healRate: 0.08 + lv * 0.05 }),
    },
    ranger_trap_shot: {
      name: "トラップショット",
      type: "active",
      accuracy: 120,
      job: "ranger",
      maxLevel: 3,
      requiredPoints: 4,
      cooldown: 6,
      desc: "素早い三連射（{value}倍×3）",
      effect: (lv) => ({ hits: 3, damageMultiplier: 0.55 + lv * 0.08 }),
    },


    // ---- 阿修羅 (asura) ----
    asura_fury: {
      name: "修羅の怒り",
      type: "passive",
      job: "asura",
      maxLevel: 5,
      desc: "物理攻撃力+{value}",
      effect: (lv) => ({ attackBonus: lv * 8 }),
    },
    asura_rush: {
      name: "修羅連撃",
      type: "active",
      accuracy: 105,
      job: "asura",
      maxLevel: 3,
      cooldown: 5,
      desc: "連撃（{value}倍×3）",
      effect: (lv) => ({ damageMultiplier: 0.65 + lv * 0.08, hits: 3 }),
    },
    asura_six_paths: {
      name: "六道連撃",
      type: "active",
      accuracy: 105,
      job: "asura",
      maxLevel: 3,
      requiredPoints: 6,
      cooldown: 7,
      desc: "6連撃（{value}倍×6）",
      effect: (lv) => ({ hits: 6, damageMultiplier: 0.38 + lv * 0.05 }),
    },
    asura_killing_aura: {
      name: "殺気",
      type: "passive",
      job: "asura",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "会心率+{value}%（Lvで増加。命中も上がる）",
      effect: (lv) => ({ critBonus: lv * 2, accuracyBonus: lv * 2 }),
    },


    // ---- 戦鬼 (warfiend) ----
    warfiend_rage: {
      name: "怒髪天",
      type: "passive",
      job: "warfiend",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "攻撃を受けるたび、怒りが溜まり攻撃力/会心率が上昇（戦闘中）",
      effect: (lv) => ({ rageOnHit: lv }),
    },
    warfiend_bloodlust: {
      name: "血の渇望",
      type: "passive",
      job: "warfiend",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "攻撃時HP吸収+{value}%（最大25%）",
      effect: (lv) => ({ lifeStealPctBonus: Math.min(25, lv * 5) }),
    },
    warfiend_cleave: {
      name: "鬼斬り",
      type: "active",
      accuracy: 105,
      job: "warfiend",
      maxLevel: 3,
      cooldown: 4,
      desc: "強烈な一撃（{value}倍）",
      effect: (lv) => ({ damageMultiplier: 1.25 + lv * 0.25 }),
    },
    warfiend_berserk: {
      name: "狂乱",
      type: "active",
      accuracy: 105,
      job: "warfiend",
      maxLevel: 3,
      requiredPoints: 5,
      cooldown: 6,
      desc: "2連撃（{value}倍×2、与ダメの25%回復）",
      effect: (lv) => ({ hits: 2, damageMultiplier: 0.95 + lv * 0.12, healPercent: 0.25 }),
    },
    warfiend_savage_strength: {
      name: "凶力",
      type: "passive",
      job: "warfiend",
      maxLevel: 5,
      requiredPoints: 3,
      desc: "物理攻撃力+{value}（Lvで増加。防御力も少し上がる）",
      effect: (lv) => ({ attackBonus: lv * 12, defenseBonus: lv * 2 }),
    },


  };

  window.skills = skills;
})();
