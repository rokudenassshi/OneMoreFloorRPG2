// ===================
// コアロジック（分割: core）
// ===================

(function () {
  "use strict";
  // -------------------
  // オートセーブ
  // -------------------
  const SAVE_KEY = "one_more_floor_rpg_autosave_v1";
  const SAVE_SCHEMA = "one_more_floor_rpg_autosave_v1";
  const AUTOSAVE_INTERVAL_MS = 2500;

  const AUTOSAVE_ENABLED_KEY = "one_more_floor_rpg_autosave_enabled_v1";
  const PENDING_IMPORT_KEY = "omf_pending_import_v1";
  let autosaveEnabled = true;

  function isAutosaveEnabled() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
      if (raw == null) return true;
      return raw === "1";
    } catch (e) {
      return true;
    }
  }

  function setAutosaveEnabled(v) {
    autosaveEnabled = !!v;
    try {
      localStorage.setItem(AUTOSAVE_ENABLED_KEY, autosaveEnabled ? "1" : "0");
    } catch (e) {}
  }

  function applyPendingImportIfAny() {
    const payload = localStorage.getItem(PENDING_IMPORT_KEY);
    if (!payload) return;

    try {
      const parsed = JSON.parse(payload);
      const storage = parsed?.storage;

      if (!storage || typeof storage !== "object") {
        localStorage.removeItem(PENDING_IMPORT_KEY);
        return;
      }

      // ここで確実に上書き
      localStorage.clear();
      for (const [k, v] of Object.entries(storage)) {
        if (typeof k !== "string") continue;
        localStorage.setItem(k, v == null ? "" : String(v));
      }
    } catch (e) {
      // 壊れてたら無視
    } finally {
      // clearで消えてる可能性があるので最後にremove
      try {
        localStorage.removeItem(PENDING_IMPORT_KEY);
      } catch (e) {}
    }
  }

  let pendingAutosaveTimer = null;

  function buildSavePayload() {
    const payload = {
      schema: SAVE_SCHEMA,
      savedAt: new Date().toISOString(),
      floor: gameData.floor,
      gameState: gameData.gameState,
      player: gameData.player,
      enemy: gameData.enemy,
    };
    return JSON.parse(JSON.stringify(payload));
  }

  function applySavePayload(payload) {
    if (!payload || payload.schema !== SAVE_SCHEMA) return false;

    gameData.floor = payload.floor || 1;
    gameData.gameState = payload.gameState || "EXPLORE";
    gameData.player = payload.player || gameData.player;
    gameData.enemy = payload.enemy || null;

    if (!gameData.player.status) {
      gameData.player.status = { poisonTurns: 0, burnTurns: 0, accuracyDownTurns: 0, accuracyDownRate: 0 };
    }
    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number") gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number") gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = gameData.floor || 1;
    for (let jobKey in jobs) {
      if (typeof gameData.player.jobKills[jobKey] !== "number") gameData.player.jobKills[jobKey] = 0;
    }
    return true;
  }

  function saveGameNow() {
    try {
      if (!autosaveEnabled) return;
      const payload = buildSavePayload();
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function requestAutosave() {
    if (!autosaveEnabled) return;
    if (pendingAutosaveTimer) return;
    pendingAutosaveTimer = setTimeout(() => {
      pendingAutosaveTimer = null;
      saveGameNow();
    }, 300);
  }

  function loadGameIfExists() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const payload = JSON.parse(raw);
      return applySavePayload(payload);
    } catch (e) {
      return false;
    }
  }


  // -------------------
  // 初期化
  // -------------------
  window.onload = function () {
    gameData.battleButtons = document.getElementById("battleButtons");
    gameData.exploreButtons = document.getElementById("exploreButtons");

    applyPendingImportIfAny();
    autosaveEnabled = isAutosaveEnabled();

    const loaded = loadGameIfExists();

    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number") gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number") gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = gameData.floor || 1;
    for (let jobKey in jobs) {
      if (typeof gameData.player.jobKills[jobKey] !== "number") {
        gameData.player.jobKills[jobKey] = 0;
      }
    }

    if (loaded) {
      log("✅ オートセーブを読み込みました");
    } else {
      log("探索開始");
    }

    setInterval(() => {
      saveGameNow();
    }, AUTOSAVE_INTERVAL_MS);

    updateUI();
  };

  // -------------------
  // ステータス計算
  // -------------------
  function clampMin0(n) {
    return Math.max(0, Math.floor(n));
  }

  function getTotalStats() {
    const p = gameData.player;
    const jobBonus = jobs[p.job].bonuses;

    return {
      strength: p.baseStats.strength + p.allocatedStats.strength + jobBonus.strength,
      vitality: p.baseStats.vitality + p.allocatedStats.vitality + jobBonus.vitality,
      intelligence: p.baseStats.intelligence + p.allocatedStats.intelligence + jobBonus.intelligence,
      agility: p.baseStats.agility + p.allocatedStats.agility + jobBonus.agility,
      dexterity: p.baseStats.dexterity + p.allocatedStats.dexterity + jobBonus.dexterity,
    };
  }

  function applyEquipBonuses(combat, item) {
    if (!item) return;

    if (item.attack) combat.attack += item.attack;
    if (item.defense) combat.defense += item.defense;
    if (item.accuracy) combat.accuracy += item.accuracy;
    if (item.evasion) combat.evasion += item.evasion;

    if (Array.isArray(item.effects)) {
      item.effects.forEach((eff) => {
        if (!eff) return;
        if (eff.type === "critRate") combat.critRate += eff.value;
        if (eff.type === "maxHpBonus") combat.maxHp += eff.value;
        if (eff.type === "attackBonus") combat.attack += eff.value;
        if (eff.type === "defenseBonus") combat.defense += eff.value;
        if (eff.type === "accuracy") combat.accuracy += eff.value;
        if (eff.type === "evasion") combat.evasion += eff.value;
        if (eff.type === "search") combat.search += eff.value;
      });
    }
  }

  function getCombatStats() {
    const stats = getTotalStats();
    let combat = {
      attack: stats.strength * 2,
      defense: stats.vitality * 1.5,
      magicPower: stats.intelligence * 2,
      accuracy: 70 + stats.dexterity * 1.5,
      evasion: stats.agility * 1.2,
      critRate: 5 + stats.dexterity * 0.8,
      maxHp: 100 + stats.vitality * 10,

      // 索敵（0 だと二つ名が出ない）
      // 低レベル帯でも 0〜数程度になるように設計
      search: clampMin0((stats.dexterity + stats.intelligence) / 10),
    };

    // 状態異常（命中低下）
    const st = gameData.player.status || {};
    if (st.accuracyDownTurns > 0) {
      const rate = typeof st.accuracyDownRate === "number" ? st.accuracyDownRate : 0.2;
      combat.accuracy = Math.max(1, combat.accuracy * (1 - rate));
    }


    // 武器/防具 2枠
    applyEquipBonuses(combat, gameData.player.equipment.slot1);
    if (gameData.player.equipment.slot2 !== gameData.player.equipment.slot1) {
      applyEquipBonuses(combat, gameData.player.equipment.slot2);
    }

    // 装飾品 1枠（効果はここだけ）
    applyEquipBonuses(combat, gameData.player.equipment.accessory);

    // パッシブスキルボーナス
    for (let skillKey in gameData.player.skills) {
      const skillDef = skills[skillKey];
      if (!skillDef || skillDef.type !== "passive") continue;

      const level = gameData.player.skills[skillKey];
      const effect = skillDef.effect(level);

      if (effect.attackBonus) combat.attack += effect.attackBonus;
      if (effect.defenseBonus) combat.defense += effect.defenseBonus;
      if (effect.evasionBonus) combat.evasion += effect.evasionBonus;
      if (effect.critBonus) combat.critRate += effect.critBonus;
      if (effect.magicBonus) combat.magicPower += effect.magicBonus;
      if (effect.allStatsBonus) {
        combat.attack += effect.allStatsBonus;
        combat.defense += effect.allStatsBonus;
      }
    }

    // 最大HP更新
    gameData.player.maxHp = combat.maxHp;
    if (gameData.player.hp > gameData.player.maxHp) {
      gameData.player.hp = gameData.player.maxHp;
    }

    return combat;
  }

  // 装飾品ボーナス取得（装飾品スロットのみ参照）
  function getAccessoryBonus(type) {
    let total = 0;
    const acc = gameData.player.equipment.accessory;
    if (acc && Array.isArray(acc.effects)) {
      acc.effects.forEach((eff) => {
        if (eff && eff.type === type) total += eff.value;
      });
    }
    return total;
  }

  // -------------------
  // 探索
  // -------------------
  function move(dir) {
    if (gameData.gameState !== "EXPLORE") return;

    gameData.floor = Math.max(1, gameData.floor + dir);
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = 1;
    gameData.player.maxReachedFloor = Math.max(gameData.player.maxReachedFloor, gameData.floor);
    log(`${gameData.floor}階層に${dir > 0 ? "進んだ" : "戻った"}`);

    // 戦闘開始
    if (Math.random() < 0.8 || gameData.floor <= 5) {
      startBattle();
    } else {
      log("…何も起こらなかった");
    }

    requestAutosave();

    updateUI();
  }

  // -------------------
  // 戦闘
  // -------------------
  function applyEnemyIncomingReduction(enemy, damage) {
    if (enemy && enemy.effects && typeof enemy.effects.damageReduction === "number") {
      return Math.max(1, Math.round(damage * (1 - enemy.effects.damageReduction)));
    }
    return damage;
  }

    function startBattle() {
    gameData.gameState = "BATTLE";

    const floor = gameData.floor;

    // 敵生成：階層に応じて候補を絞る
    const candidates = monsterTypes.filter((m) => (m.minFloor || 1) <= floor);
    const pool = candidates.length > 0 ? candidates : monsterTypes;
    const baseMonster = pool[Math.floor(Math.random() * pool.length)];
    const enemy = JSON.parse(JSON.stringify(baseMonster));

    const combat = getCombatStats();
    const search = combat.search;

    // フロア補正（常に強くなる）
    const floorMul = Math.min(3.5, 1 + (floor - 1) * 0.06);
    enemy.hp = Math.round(enemy.hp * floorMul);
    enemy.str = Math.round(enemy.str * floorMul);
    enemy.vit = Math.round(enemy.vit * floorMul);
    enemy.int = Math.round(enemy.int * floorMul);
    enemy.agi = Math.round(enemy.agi * floorMul);
    enemy.dex = Math.round(enemy.dex * floorMul);
    enemy.exp = Math.round(enemy.exp * floorMul);

    // 二つ名判定（索敵が 0 の場合は出ない）
    const epithetChance = Math.min(floor * 2, 55);
    let epithet = null;

    if (search > 0 && Math.random() * 100 < epithetChance) {
      epithet = epithets[Math.floor(Math.random() * epithets.length)];
      enemy.isNamed = true;

      // 倍率適用
      const mul = epithet.multipliers || {};
      const mulOf = (k) => (typeof mul[k] === "number" ? mul[k] : 1);

      enemy.hp = Math.round(enemy.hp * mulOf("hp"));
      enemy.str = Math.round(enemy.str * mulOf("str"));
      enemy.vit = Math.round(enemy.vit * mulOf("vit"));
      enemy.int = Math.round(enemy.int * mulOf("int"));
      enemy.agi = Math.round(enemy.agi * mulOf("agi"));
      enemy.dex = Math.round(enemy.dex * mulOf("dex"));
      enemy.exp = Math.round(enemy.exp * mulOf("exp"));

      enemy.epithet = epithet;
      enemy.effects = epithet.effects || {};
    } else {
      enemy.epithet = null;
      enemy.effects = {};
    }

    enemy.maxHp = enemy.hp;
    enemy.attack = enemy.str * 2;
    enemy.defense = enemy.vit * 1.5;
    enemy.magic = enemy.int * 2;

    enemy.displayName = epithet ? `【${epithet.name}】${enemy.name}` : enemy.name;

    // 敵スキル
    enemy.skills = Array.isArray(enemy.skills) ? enemy.skills : [];
    enemy.skillCooldowns = {};
    enemy.turnCount = 0;

    gameData.enemy = enemy;

    log(`⚔ ${enemy.displayName} があらわれた！`);
    if (epithet) log("強力な二つ名を持っている！");

    requestAutosave();
    updateUI();
  }


  function attack() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // 命中判定
    const hitChance = Math.min(95, combat.accuracy - enemy.agi);
    if (Math.random() * 100 > hitChance) {
      log("攻撃は外れた！");
      enemyTurn();
      return;
    }

    // クリティカル判定
    const isCrit = Math.random() * 100 < combat.critRate;
    const critMul = isCrit ? 2 : 1;

    // ダメージ計算
    let damage = Math.max(1, (combat.attack - enemy.defense * 0.5) * critMul);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyEnemyIncomingReduction(enemy, damage);

    enemy.hp -= damage;
    log(`${damage}のダメージ${isCrit ? " クリティカル！" : ""}`);

    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    }
  }

  function useSkill() {
    const skillKey = gameData.player.equippedSkill;
    if (!skillKey || gameData.player.skillCooldown > 0) return;

    const skillDef = skills[skillKey];
    const level = gameData.player.skills[skillKey] || 0;
    const effect = skillDef.effect(level);

    log(`${skillDef.name}を使用！`);

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // スキル効果
    if (skillDef.name.includes("ヒーリング")) {
      // 回復スキル
      const heal = effect.healAmount;
      gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
      log(`${heal}HP回復した！`);
    } else if (effect.baseDamage) {
      // 魔法攻撃
      let damage = effect.baseDamage + combat.magicPower * (effect.magicScale || 1);
      damage = Math.round(damage * (0.9 + Math.random() * 0.2));
      enemy.hp -= damage;
      log(`${damage}のダメージ！`);
    } else if (effect.damageMultiplier) {
      // 物理攻撃
      if (effect.hits) {
        // 連続攻撃
        let total = 0;
        for (let i = 0; i < effect.hits; i++) {
          let damage = Math.max(1, (combat.attack - enemy.defense * 0.5) * effect.damageMultiplier);
          damage = Math.round(damage * (0.9 + Math.random() * 0.2));
          enemy.hp -= damage;
          total += damage;
        }
        log(`${effect.hits}回攻撃！ 合計${total}ダメージ`);
      } else {
        let damage = Math.max(1, (combat.attack - enemy.defense * (effect.ignoreDef || 0.5)) * effect.damageMultiplier);
        damage = Math.round(damage * (0.9 + Math.random() * 0.2));
        enemy.hp -= damage;
        log(`${damage}のダメージ！`);

        // 回復効果
        if (effect.healPercent) {
          const heal = Math.round(damage * effect.healPercent);
          gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
          log(`${heal}HP回復した！`);
        }
      }
    }

    gameData.player.skillCooldown = skillDef.cooldown;

    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    }
  }

  function useHerbInBattle() {
    const herbItem = gameData.player.items.find((i) => i.name === "やくそう");
    if (!herbItem || herbItem.count <= 0) {
      log("やくそうを持っていない");
      return;
    }

    herbItem.count--;
    if (herbItem.count <= 0) {
      gameData.player.items = gameData.player.items.filter((i) => i.name !== "やくそう");
    }

    const heal = herbItem.heal;
    gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
    log(`やくそうを使用！ ${heal}HP回復した！`);

    requestAutosave();

    updateUI();
    enemyTurn();
  }

  function escape() {
    if (gameData.gameState !== "BATTLE") return;

    const combat = getCombatStats();
    const rate = Math.min(30 + Math.floor(combat.evasion / 2), 90);

    if (Math.random() * 100 < rate) {
      log("💨 逃走成功！");
      gameData.floor = Math.max(1, gameData.floor - 1);
      endBattle(false);
      requestAutosave();
    } else {
      log("❌ 逃走失敗…");
      enemyTurn();
    }
  }

    function enemyTurn() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    // クールダウン減少（プレイヤー）
    if (gameData.player.skillCooldown > 0) {
      gameData.player.skillCooldown--;
    }

    const enemy = gameData.enemy;
    const combat = getCombatStats();

    // 状態異常ダメージ（敵ターン開始時に1回）
    const st = gameData.player.status || (gameData.player.status = {});
    if (st.poisonTurns > 0) {
      const dmg = Math.max(2, Math.round(gameData.floor * 1.2));
      gameData.player.hp -= dmg;
      st.poisonTurns--;
      log(`☠ 毒で${dmg}ダメージ`);
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
    }
    if (st.burnTurns > 0) {
      const dmg = Math.max(3, Math.round(gameData.floor * 1.5));
      gameData.player.hp -= dmg;
      st.burnTurns--;
      log(`🔥 火傷で${dmg}ダメージ`);
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
    }

    // 命中低下のターン経過
    if (st.accuracyDownTurns > 0) {
      st.accuracyDownTurns--;
      if (st.accuracyDownTurns <= 0) {
        st.accuracyDownRate = 0;
      }
    }

    // 敵クールダウン減少
    enemy.skillCooldowns = enemy.skillCooldowns || {};
    for (let k in enemy.skillCooldowns) {
      if (enemy.skillCooldowns[k] > 0) enemy.skillCooldowns[k]--;
    }

    // 二つ名: 再生
    const ef = enemy.effects || {};
    if (typeof ef.regenRate === "number" && ef.regenRate > 0) {
      const heal = Math.max(1, Math.round(enemy.maxHp * ef.regenRate));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      log(`✨ ${enemy.displayName}はHPを${heal}回復した`);
    }

    // 行動選択（通常攻撃 or スキル）
    enemy.turnCount = (enemy.turnCount || 0) + 1;

    const readySkills = (enemy.skills || []).filter((id) => {
      const def = enemySkills[id];
      if (!def) return false;
      return (enemy.skillCooldowns[id] || 0) <= 0;
    });

    let useSkill = readySkills.length > 0 && Math.random() < 0.45;
    if (ef.preferMagic && readySkills.some((id) => enemySkills[id]?.kind === "magic")) {
      useSkill = readySkills.length > 0 && Math.random() < 0.65;
    }

    if (useSkill) {
      let chosen = null;
      const magic = readySkills.filter((id) => enemySkills[id]?.kind === "magic");
      if (ef.preferMagic && magic.length > 0 && Math.random() < 0.7) {
        chosen = magic[Math.floor(Math.random() * magic.length)];
      } else {
        chosen = readySkills[Math.floor(Math.random() * readySkills.length)];
      }
      performEnemySkill(chosen);
    } else {
      performEnemyAttack();
    }

    updateUI();
    checkPlayerDeath();
    requestAutosave();

    // 二つ名: 神速（追加行動）
    if (gameData.gameState === "BATTLE" && ef.extraTurnChance && Math.random() < ef.extraTurnChance) {
      log(`⚡ ${enemy.displayName}は素早くもう一度行動した！`);
      performEnemyAttack();
      updateUI();
      checkPlayerDeath();
      requestAutosave();
    }
  }

  function enemyDidHit(evasionPenalty = 0) {
    const enemy = gameData.enemy;
    const combat = getCombatStats();

    // 必中なら回避判定なし
    if (enemy.effects && enemy.effects.alwaysHit) return true;

    const evasion = Math.max(0, combat.evasion - evasionPenalty);
    return Math.random() * 100 >= evasion;
  }

  function enemyDamageBase(isMagic) {
    const enemy = gameData.enemy;
    const combat = getCombatStats();
    const ef = enemy.effects || {};
    const pierce = typeof ef.armorPierceRate === "number" ? ef.armorPierceRate : 0;

    const defFactor = isMagic ? 0.25 : 0.5;
    const reducedDefense = combat.defense * (1 - pierce);
    const base = isMagic ? enemy.magic : enemy.attack;
    return Math.max(1, base - reducedDefense * defFactor);
  }

  function applyEnemyOutgoingMultipliers(damage) {
    const enemy = gameData.enemy;
    const ef = enemy.effects || {};
    if (ef.enrageBelowHpRate && ef.enrageDamageMul) {
      const rate = enemy.hp / Math.max(1, enemy.maxHp);
      if (rate <= ef.enrageBelowHpRate) {
        damage = Math.round(damage * ef.enrageDamageMul);
      }
    }
    return damage;
  }

  function applyOnHitStatuses(fromSkillDef) {
    const enemy = gameData.enemy;
    const ef = enemy.effects || {};
    const st = gameData.player.status || (gameData.player.status = {});

    if (ef.poisonOnHitChance && Math.random() < ef.poisonOnHitChance) {
      st.poisonTurns = Math.max(st.poisonTurns || 0, ef.poisonTurns || 3);
      log("☠ 毒状態になった！");
    }

    if (fromSkillDef && fromSkillDef.poisonChance && Math.random() < fromSkillDef.poisonChance) {
      st.poisonTurns = Math.max(st.poisonTurns || 0, fromSkillDef.poisonTurns || 3);
      log("☠ 毒状態になった！");
    }
    if (fromSkillDef && fromSkillDef.burnChance && Math.random() < fromSkillDef.burnChance) {
      st.burnTurns = Math.max(st.burnTurns || 0, fromSkillDef.burnTurns || 2);
      log("🔥 火傷状態になった！");
    }
    if (fromSkillDef && fromSkillDef.debuff && fromSkillDef.debuff.accuracyDownTurns) {
      st.accuracyDownTurns = Math.max(st.accuracyDownTurns || 0, fromSkillDef.debuff.accuracyDownTurns);
      st.accuracyDownRate = Math.max(st.accuracyDownRate || 0, fromSkillDef.debuff.accuracyDownRate || 0.2);
      log("👁 命中が下がった！");
    }
  }

  function performEnemyAttack() {
    const enemy = gameData.enemy;

    if (!enemyDidHit(0)) {
      log(`${enemy.displayName}の攻撃を回避した！`);
      return;
    }

    let damage = enemyDamageBase(false);
    damage = applyEnemyOutgoingMultipliers(damage);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    gameData.player.hp -= damage;
    log(`◀ ${enemy.displayName}の攻撃！ ${damage}ダメージ`);

    applyOnHitStatuses(null);
  }

  function performEnemySkill(skillId) {
    const enemy = gameData.enemy;
    const def = enemySkills[skillId];
    if (!def) {
      performEnemyAttack();
      return;
    }

    enemy.skillCooldowns = enemy.skillCooldowns || {};
    enemy.skillCooldowns[skillId] = def.cooldown || 0;

    log(`◀ ${enemy.displayName}は【${def.name}】を使った！`);

    if (def.kind === "heal") {
      const heal = Math.max(1, Math.round(enemy.maxHp * (def.healRate || 0.2)));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      log(`✨ ${enemy.displayName}はHPを${heal}回復した`);
      return;
    }

    if (def.kind === "debuff") {
      applyOnHitStatuses(def);
      return;
    }

    const hitBonus = def.hitBonus || 0;
    if (!enemyDidHit(hitBonus)) {
      log("しかし攻撃は回避された！");
      return;
    }

    const isMagic = def.kind === "magic";
    const hits = def.hits || 1;
    let total = 0;

    for (let i = 0; i < hits; i++) {
      let damage = enemyDamageBase(isMagic);
      const mul = typeof def.damageMultiplier === "number" ? def.damageMultiplier : 1;
      damage = Math.round(damage * mul);
      damage = applyEnemyOutgoingMultipliers(damage);
      damage = Math.round(damage * (0.9 + Math.random() * 0.2));

      gameData.player.hp -= damage;
      total += damage;

      if (gameData.player.hp <= 0) break;
    }

    log(`💥 ${total}ダメージ`);
    applyOnHitStatuses(def);
  }


  function checkBattleEnd() {
    const enemy = gameData.enemy;
    if (!enemy) return;

    if (enemy.hp <= 0) {
      log(`${enemy.displayName}を倒した！`);

      // 経験値
      let exp = enemy.exp;
      const expBonus = getAccessoryBonus("expBonus");
      exp = Math.round(exp * (1 + expBonus / 100));

      gameData.player.exp += exp;
      log(`${exp}EXPを獲得！`);

      // 職業撃破カウント（表示はしない）
      gameData.player.jobKills[gameData.player.job]++;
      gameData.player.totalKills = (gameData.player.totalKills || 0) + 1;
      if (enemy && enemy.isNamed) {
        gameData.player.namedKills = (gameData.player.namedKills || 0) + 1;
      }

      checkLevelUp();

      // ドロップ判定
      let dropChance = 20;
      dropChance += getAccessoryBonus("dropRate");

      if (Math.random() * 100 < dropChance) {
        const item = generateEquipment();
        gameData.player.inventory.push(item);
        log(`${item.name}を手に入れた！`);
      }

      endBattle(true);
    }

    updateUI();
  }

  function checkPlayerDeath() {
    if (gameData.player.hp <= 0) {
      log("☠ 力尽きた…");
      gameData.player.hp = gameData.player.maxHp;
      gameData.floor = Math.max(1, gameData.floor - 3);
      endBattle(false);
    }
  }

  function endBattle(victory) {
    gameData.gameState = "EXPLORE";
    gameData.enemy = null;

    if (victory) {
      gameData.player.hp = gameData.player.maxHp;
    }

    updateUI();
  }

  function checkLevelUp() {
    while (gameData.player.exp >= getExpNeeded()) {
      const needed = getExpNeeded();

      gameData.player.level++;
      gameData.player.exp -= needed;
      gameData.player.statPoints++;
      gameData.player.skillPoints++;

      // 基本ステータス自動上昇（好みで調整可）
      gameData.player.baseStats.strength += 1;
      gameData.player.baseStats.vitality += 1;
      gameData.player.baseStats.intelligence += 1;
      gameData.player.baseStats.agility += 1;
      gameData.player.baseStats.dexterity += 1;

      const combat = getCombatStats();
      gameData.player.hp = combat.maxHp;

      log(`レベルアップ！ Lv.${gameData.player.level}`);
      log("ステータスポイントとスキルポイントを獲得！");
    }

    updateUI();
  }

  function getExpNeeded() {
    return Math.floor(100 * Math.pow(1.2, gameData.player.level - 1));
  }

  // -------------------
  // 装備生成
  // -------------------
  function generateEquipment() {
    const floor = gameData.floor;

    // カテゴリー選択
    const categories = ["weapon", "armor", "accessory"];
    const category = categories[Math.floor(Math.random() * categories.length)];

    let typeOptions = [];
    for (let key in equipTypes) {
      if (equipTypes[key].category === category) typeOptions.push(key);
    }

    const typeKey = typeOptions[Math.floor(Math.random() * typeOptions.length)];
    const type = equipTypes[typeKey];

    const item = {
      name: type.name,
      type: typeKey,
      category: type.category,
      hands: type.hands,
      rarity: getRarity(floor),
    };

    const statBase = 5 + floor * 3;

    if (category === "weapon") {
      item.attack = Math.round(statBase * (1 + Math.random() * 0.5));
      item.accuracy = Math.round(5 + floor * 0.5);
    } else if (category === "armor") {
      item.defense = Math.round(statBase * (1 + Math.random() * 0.5));
      item.evasion = Math.round(3 + floor * 0.3);
    } else {
      item.effects = [];
      const numEffects = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numEffects; i++) {
        const effect = accessoryEffects[Math.floor(Math.random() * accessoryEffects.length)];
        item.effects.push({ ...effect });
      }
    }

    // ランダムオプション
    const optionCount = Math.min(5, Math.floor(Math.random() * (1 + floor / 5)));
    item.randomOptions = optionCount;

    for (let i = 0; i < optionCount; i++) {
      if (category !== "accessory") {
        if (Math.random() < 0.5) {
          if (item.attack) item.attack += Math.round(statBase * 0.2);
          if (item.defense) item.defense += Math.round(statBase * 0.2);
        } else {
          if (!item.effects) item.effects = [];
          const eff = accessoryEffects[Math.floor(Math.random() * accessoryEffects.length)];
          item.effects.push({ ...eff, value: Math.round(eff.value * 0.5) });
        }
      }
    }

    return item;
  }

  function getRarity(floor) {
    const rand = Math.random() * 100;
    const bonus = floor * 2;

    if (rand < 50 - bonus) return "common";
    if (rand < 75 - bonus / 2) return "uncommon";
    if (rand < 90) return "rare";
    if (rand < 97) return "epic";
    return "legendary";
  }

  // -------------------
  // グローバル公開（HTMLのonclickから呼べるように）
  // -------------------
  window.getTotalStats = getTotalStats;
  window.getCombatStats = getCombatStats;
  window.getAccessoryBonus = getAccessoryBonus;

  window.move = move;
  window.startBattle = startBattle;
  window.attack = attack;
  window.useSkill = useSkill;
  window.useHerbInBattle = useHerbInBattle;
  window.escape = escape;
})();
