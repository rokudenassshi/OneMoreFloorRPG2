// ===================
// ゲームデータ：ベース
// ===================

(function () {
  "use strict";

  const GAME_VERSION = "0.2.0";

  const gameData = {
    player: {
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      job: "swordsman",
      jobKills: {},
      totalKills: 0,
      namedKills: 0,
      maxReachedFloor: 1,
      achievements: {},

      // 上級職解放の進捗 / 解放済み
      jobUnlockProgress: {},
      unlockedJobs: {},

      // 基本ステータス（基準値 5）
      baseStats: {
        strength: 5,
        vitality: 5,
        intelligence: 5,
        agility: 5,
        dexterity: 5,
      },

      // 振り分けステータス
      allocatedStats: {
        strength: 0,
        vitality: 0,
        intelligence: 0,
        agility: 0,
        dexterity: 0,
      },

      statPoints: 0,
      skillPoints: 0,

      skills: {},
      equippedSkill: null,
      skillCooldown: 0,

      // 職業ごとのスキル割り振り保存
      jobSkillBuilds: {},

      // 状態異常
      status: {
        poisonTurns: 0,
        burnTurns: 0,
        accuracyDownTurns: 0,
        accuracyDownRate: 0,
      },

      // 装備スロット: 武器/防具 2、装飾品 1
      equipment: {
        slot1: null, // weapon/armor
        slot2: null, // weapon/armor
        accessory: null, // accessory only
      },

      inventory: [],
      items: [{ name: "やくそう", heal: 50, count: 3 }],
    },

    floor: 1,
    enemy: null,
    gameState: "EXPLORE", // EXPLORE / BATTLE

    battleButtons: null,
    exploreButtons: null,
  };

  window.GAME_VERSION = GAME_VERSION;
  window.gameData = gameData;
})();
