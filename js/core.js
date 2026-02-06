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
    normalizePlayerState(gameData.player);
    gameData.enemy = payload.enemy || null;

    if (!gameData.player.status) {
      gameData.player.status = { poisonTurns: 0, burnTurns: 0, accuracyDownTurns: 0, accuracyDownRate: 0 };
    }
    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number") gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number") gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = gameData.floor || 1;
    if (typeof gameData.player.maxDamage !== "number") gameData.player.maxDamage = 0;
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
  // 装備UID/ロード時補正
  // -------------------
  let uidSeed = 0;

  function generateUid() {
    uidSeed = (uidSeed + 1) >>> 0;
    return `i_${Date.now().toString(36)}_${uidSeed.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function hashString(str) {
    // FNV-1a (32bit)
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function itemSignature(item) {
    if (!item || typeof item !== "object") return "";
    const effects = Array.isArray(item.effects)
      ? item.effects
          .filter(Boolean)
          .map((e) => ({ type: e.type || "", name: e.name || "", value: Number(e.value) }))
          .sort((a, b) => (a.type + a.name).localeCompare(b.type + b.name))
      : [];

    const base = {
      name: item.name || "",
      type: item.type || "",
      category: item.category || "",
      hands: Number(item.hands || 0),
      rarity: item.rarity || "",
      attack: item.attack ?? null,
      defense: item.defense ?? null,
      accuracy: item.accuracy ?? null,
      evasion: item.evasion ?? null,
      randomOptions: item.randomOptions ?? 0,
      effects,
    };
    return JSON.stringify(base);
  }

  function normalizePlayerState(p) {
    if (!p || typeof p !== "object") return;

    // スキル周りの互換補正
    if (!p.skills || typeof p.skills !== "object") p.skills = {};
    if (typeof p.skillPoints !== "number") p.skillPoints = 0;
    if (typeof p.skillCooldown !== "number") p.skillCooldown = 0;
    if (!p.jobSkillBuilds || typeof p.jobSkillBuilds !== "object") p.jobSkillBuilds = {};
    if (typeof p.maxDamage !== "number") p.maxDamage = 0;
    // 実績の互換補正
    if (!p.achievements || typeof p.achievements !== "object") p.achievements = {};
    // 上級職解放の互換補正
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object") p.jobUnlockProgress = {};
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object") p.unlockedJobs = {};
    // 条件を満たしている実績は、ロード時に自動で解除扱いにする（ログは出さない）
    if (Array.isArray(window.achievementDefs)) {
      for (const def of window.achievementDefs) {
        if (!def || !def.id || typeof def.isDone !== "function") continue;
        try {
          if (def.isDone(p)) p.achievements[def.id] = true;
        } catch (e) {}
      }
    }

    // 条件を満たしている上級職は、ロード時に自動で解放扱いにする（ログは出さない）
    try { checkAdvancedJobUnlocks(true); } catch (e) {}


    // jobSkillBuilds の中身を正規化
    for (const k of Object.keys(p.jobSkillBuilds)) {
      const v = p.jobSkillBuilds[k];
      if (!v || typeof v !== "object") {
        p.jobSkillBuilds[k] = {};
        continue;
      }
      for (const sk of Object.keys(v)) {
        const n = Number(v[sk]);
        v[sk] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      }
    }

    // 装備中スキルの整合性（職業変更/削除などで不正になった場合は解除）
    if (p.equippedSkill != null) {
      const sk = String(p.equippedSkill);
      const def = skills[sk];
      const lv = Number(p.skills[sk] || 0);
      const ok = !!def && def.type === "active" && lv > 0 && (def.job === "all" || def.job === getJobSkillGroup(p.job));
      if (!ok) {
        p.equippedSkill = null;
        p.skillCooldown = 0;
      }
    }

    // 職業の整合性（削除/追加時の互換）
    if (!p.job || !jobs[p.job]) {
      p.job = "swordsman";
    }

    if (!Array.isArray(p.inventory)) p.inventory = [];
    if (!Array.isArray(p.items)) p.items = [];
    if (!p.equipment || typeof p.equipment !== "object") {
      p.equipment = { slot1: null, slot2: null, accessory: null };
    }

    // インベントリにUIDを付与（古いセーブの互換）
    const sigCounts = new Map();
    const sigToItems = new Map();
    const uidToItem = new Map();

    p.inventory.forEach((it) => {
      if (!it || typeof it !== "object") return;

      // ロック状態（古いセーブ互換）
      if (typeof it.locked !== "boolean") it.locked = false;

      if (typeof it.uid !== "string" || !it.uid) {
        const sig = itemSignature(it);
        const cnt = (sigCounts.get(sig) || 0) + 1;
        sigCounts.set(sig, cnt);
        it.uid = `${hashString(sig)}-${cnt}`;
      }
      uidToItem.set(it.uid, it);

      const sig = itemSignature(it);
      if (!sigToItems.has(sig)) sigToItems.set(sig, []);
      sigToItems.get(sig).push(it);
    });

    const used = new Set();
    const linkSlot = (slotKey) => {
      const it = p.equipment[slotKey];
      if (!it || typeof it !== "object") {
        p.equipment[slotKey] = null;
        return;
      }

      // UIDで紐付け
      if (typeof it.uid === "string" && it.uid && uidToItem.has(it.uid)) {
        const found = uidToItem.get(it.uid);
        if (!used.has(found.uid)) {
          p.equipment[slotKey] = found;
          used.add(found.uid);
          return;
        }
      }

      // UIDが無い/見つからない場合は内容で近いものを探す
      const sig = itemSignature(it);
      const candidates = sigToItems.get(sig) || [];
      const found = candidates.find((c) => !used.has(c.uid));
      if (found) {
        p.equipment[slotKey] = found;
        used.add(found.uid);
        return;
      }

      // 最後の手段: 装備側のアイテムをインベントリに追加
      if (typeof it.uid !== "string" || !it.uid) {
        it.uid = generateUid();
      }
      if (typeof it.locked !== "boolean") it.locked = false;
      p.inventory.push(it);
      uidToItem.set(it.uid, it);
      used.add(it.uid);
      p.equipment[slotKey] = it;
    };

    linkSlot("slot1");
    linkSlot("slot2");
    linkSlot("accessory");
  }
  // -------------------
  // 上級職 解放進捗
  // -------------------
  function getJobSkillGroup(jobKey) {
    const def = (jobs && jobs[jobKey]) ? jobs[jobKey] : null;
    return (def && def.skillGroup) ? def.skillGroup : jobKey;
  }

  function ensureUnlockContainers(p) {
    if (!p || typeof p !== "object") return;
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object") p.jobUnlockProgress = {};
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object") p.unlockedJobs = {};
  }

  function ensureGroupProgress(p, group) {
    ensureUnlockContainers(p);
    if (!p.jobUnlockProgress[group] || typeof p.jobUnlockProgress[group] !== "object") {
      p.jobUnlockProgress[group] = {};
    }
    return p.jobUnlockProgress[group];
  }

  function addJobProgress(type, amount = 1) {
    const p = gameData.player;
    if (!p || typeof p !== "object") return;
    const group = getJobSkillGroup(p.job);
    const prog = ensureGroupProgress(p, group);
    const cur = Number(prog[type] || 0);
    const next = cur + amount;
    prog[type] = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : cur;
    checkAdvancedJobUnlocks(false);
  }

  function checkAdvancedJobUnlocks(silent) {
    const p = gameData.player;
    if (!p || typeof p !== "object") return;
    ensureUnlockContainers(p);

    for (const key of Object.keys(jobs)) {
      const jd = jobs[key];
      if (!jd || !jd.unlock) continue;

      const unlock = jd.unlock;
      const group = jd.skillGroup || jd.baseJob || key;
      const prog = ensureGroupProgress(p, group);
      const cur = Number(prog[unlock.type] || 0);
      const minLevel = Number(unlock.minLevel || 0);
      const levelOk = !minLevel || Number(p.level || 0) >= minLevel;
      const unlocked = !!p.unlockedJobs[key] || (levelOk && cur >= Number(unlock.target || 0));

      // 条件（レベル + カウント）を満たした瞬間に解放フラグを立てる
      if (unlocked && !p.unlockedJobs[key]) {
        p.unlockedJobs[key] = true;
        if (!silent) {
          log(`✨ 上級職「${jd.name}」が解放された！`);
        }
      }
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

    // 装備参照の補正（新規データも含めて）
    normalizePlayerState(gameData.player);
    getCombatStats();

    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number") gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number") gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = gameData.floor || 1;
    if (typeof gameData.player.maxDamage !== "number") gameData.player.maxDamage = 0;
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

  // 得意武器/防具を装備している場合、装備の効果を少し強化する
  const FAVORED_EQUIP_MULTIPLIER = 1.2; // +20%

  function isFavoredEquip(item, favoredType) {
    if (!item) return false;
    if (!favoredType) return false;
    if (item.category === "accessory") return false;
    return item.type === favoredType;
  }

  function applyEquipBonuses(combat, item, favoredType, favoredMult = FAVORED_EQUIP_MULTIPLIER) {
    if (!item) return;

    const mult = isFavoredEquip(item, favoredType) ? favoredMult : 1;

    if (item.attack) combat.attack += item.attack * mult;
    if (item.defense) combat.defense += item.defense * mult;
    if (item.accuracy) combat.accuracy += item.accuracy * mult;
    if (item.evasion) combat.evasion += item.evasion * mult;

    if (Array.isArray(item.effects)) {
      item.effects.forEach((eff) => {
        if (!eff) return;
        // 武器/防具に付いた効果も、得意装備なら少しだけ強化
        if (eff.type === "critRate") combat.critRate += eff.value * mult;
        if (eff.type === "maxHpBonus") combat.maxHp += eff.value * mult;
        if (eff.type === "attackBonus") combat.attack += eff.value * mult;
        if (eff.type === "defenseBonus") combat.defense += eff.value * mult;
        if (eff.type === "accuracy") combat.accuracy += eff.value * mult;
        if (eff.type === "evasion") combat.evasion += eff.value * mult;
        // 索敵は装備種別によらず、補正はかけない（主に装飾品用）
        if (eff.type === "search") combat.search += eff.value;
      });
    }
  }

  function getCombatStats() {
    const stats = getTotalStats();
    const favoredType = jobs?.[gameData.player?.job]?.favoredType || null;
    const jobTraits = jobs?.[gameData.player?.job]?.traits || {};
    const favoredMult = Number.isFinite(jobTraits.favoredMultiplier) ? jobTraits.favoredMultiplier : FAVORED_EQUIP_MULTIPLIER;
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
      search: clampMin0((stats.dexterity + stats.intelligence) / 20),
    };

    // 状態異常（命中低下）
    const st = gameData.player.status || {};
    if (st.accuracyDownTurns > 0) {
      const rate = typeof st.accuracyDownRate === "number" ? st.accuracyDownRate : 0.2;
      combat.accuracy = Math.max(1, combat.accuracy * (1 - rate));
    }


    // 武器/防具 2枠
    applyEquipBonuses(combat, gameData.player.equipment.slot1, favoredType, favoredMult);
    if (gameData.player.equipment.slot2 !== gameData.player.equipment.slot1) {
      applyEquipBonuses(combat, gameData.player.equipment.slot2, favoredType, favoredMult);
    }

    // 装飾品 1枠（効果はここだけ）
    applyEquipBonuses(combat, gameData.player.equipment.accessory, favoredType, favoredMult);

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
      if (effect.searchBonus) combat.search += effect.searchBonus;
    }

    // 上級職などの職業特性（traits）
    if (jobTraits) {
      if (typeof jobTraits.accuracyBonus === "number") combat.accuracy += jobTraits.accuracyBonus;
      if (typeof jobTraits.evasionBonus === "number") combat.evasion += jobTraits.evasionBonus;
      if (typeof jobTraits.critRateBonus === "number") combat.critRate += jobTraits.critRateBonus;
      if (typeof jobTraits.searchBonus === "number") combat.search += jobTraits.searchBonus;

      if (typeof jobTraits.attackMult === "number") combat.attack *= jobTraits.attackMult;
      if (typeof jobTraits.defenseMult === "number") combat.defense *= jobTraits.defenseMult;
      if (typeof jobTraits.magicPowerMult === "number") combat.magicPower *= jobTraits.magicPowerMult;
      if (typeof jobTraits.maxHpMult === "number") combat.maxHp *= jobTraits.maxHpMult;
    }

    // 端数が出ないように丸める
    combat.attack = Math.round(combat.attack);
    combat.defense = Math.round(combat.defense);
    combat.magicPower = Math.round(combat.magicPower);
    combat.accuracy = Math.round(combat.accuracy);
    combat.evasion = Math.round(combat.evasion);
    combat.critRate = Math.round(combat.critRate);
    combat.search = clampMin0(combat.search);

    // 最大HP更新
    // 端数が出ないように丸める
    combat.maxHp = Math.round(combat.maxHp);

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

  // 実績ボーナス（現在は経験値のみ）
  function getAchievementExpBonusRate() {
    const p = gameData.player;
    const map = p && p.achievements && typeof p.achievements === "object" ? p.achievements : {};
    let rate = 0;
    const defs = Array.isArray(window.achievementDefs) ? window.achievementDefs : [];
    for (const def of defs) {
      if (!def || !def.id) continue;
      if (!map[def.id]) continue;
      const b = def.bonus || {};
      if (typeof b.expRate === "number" && Number.isFinite(b.expRate)) {
        rate += b.expRate;
      }
    }
    return rate;
  }

  function getAchievementExpBonusPercent() {
    return Math.round(getAchievementExpBonusRate() * 100);
  }

  function checkAndUnlockAchievements({ silent = false } = {}) {
    const p = gameData.player;
    if (!p.achievements || typeof p.achievements !== "object") p.achievements = {};
    const defs = Array.isArray(window.achievementDefs) ? window.achievementDefs : [];
    const unlockedNow = [];

    for (const def of defs) {
      if (!def || !def.id || typeof def.isDone !== "function") continue;
      const already = !!p.achievements[def.id];
      let done = false;
      try {
        done = !!def.isDone(p);
      } catch (e) {
        done = false;
      }
      if (done && !already) {
        p.achievements[def.id] = true;
        unlockedNow.push(def);
      }
    }

    if (!silent && unlockedNow.length) {
      for (const def of unlockedNow) {
        log(`🏆 実績解除：${def.title}`);
        const b = def.bonus || {};
        if (typeof b.expRate === "number" && b.expRate > 0) {
          log(`✨ ボーナス：経験値+${Math.round(b.expRate * 100)}%`);
        }
      }
    }

    return unlockedNow;
  }


  // -------------------
  // 探索
  // -------------------
  function move(dir) {
    if (gameData.gameState !== "EXPLORE") return;

    gameData.floor = Math.max(1, gameData.floor + dir);
    if (typeof gameData.player.maxReachedFloor !== "number") gameData.player.maxReachedFloor = 1;
    gameData.player.maxReachedFloor = Math.max(gameData.player.maxReachedFloor, gameData.floor);
    checkAndUnlockAchievements();
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

    // 戦闘開始時にログをクリア
    if (typeof window.clearLog === "function") window.clearLog();

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
    // 索敵 1 なら 1% で遭遇（索敵値%）。上限は 30%
    const epithetChance = search > 0 ? Math.min(search * 0.01, 0.3) : 0;
    let epithet = null;

    if (Math.random() < epithetChance) {
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



  function recordPlayerDamage(dmg) {
    const n = Number(dmg);
    if (!Number.isFinite(n)) return;
    const p = gameData.player;
    if (!p || typeof p !== "object") return;
    const cur = Number(p.maxDamage || 0);
    if (n > cur) p.maxDamage = Math.floor(n);
  }

  function attack() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;


    addJobProgress("attack", 1);

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // 命中判定
    const hitChance = Math.min(95, combat.accuracy - enemy.agi);
    if (Math.random() * 100 > hitChance) {
      log("攻撃は外れた！");
      enemyTurn();
      return;
    }

    addJobProgress("attackHit", 1);

    // クリティカル判定
    const isCrit = Math.random() * 100 < combat.critRate;
    const jt = jobs?.[gameData.player?.job]?.traits || {};
    const baseCritMul = typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
    const critMul = isCrit ? baseCritMul : 1;


    if (isCrit) addJobProgress("crit", 1);

    // ダメージ計算
    let damage = Math.max(1, (combat.attack - enemy.defense * 0.5) * critMul);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyEnemyIncomingReduction(enemy, damage);

    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`${damage}のダメージ${isCrit ? " クリティカル！" : ""}`);

    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    }
  }

  function defend() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    const st = gameData.player.status || (gameData.player.status = {});
    st.defendingTurns = 1;
    log("🛡 防御した");


    addJobProgress("defend", 1);

    enemyTurn();
  }


  function useSkill() {
    const skillKey = gameData.player.equippedSkill;
    if (!skillKey || gameData.player.skillCooldown > 0) return;

    const skillDef = skills[skillKey];
    const level = gameData.player.skills[skillKey] || 0;
    const effect = skillDef.effect(level);

    addJobProgress("skillUse", 1);

    log("スキルを使用！");

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // スキル効果
    if (typeof effect.healAmount === "number") {
      // 回復スキル
      addJobProgress("heal", 1);
      const jt = jobs?.[gameData.player?.job]?.traits || {};
      const healMult = typeof jt.healMult === "number" ? jt.healMult : 1;
      const heal = Math.round(effect.healAmount * healMult);
      gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
      log(`${heal}HP回復した！`);
    } else if (effect.baseDamage) {
      // 魔法攻撃
      addJobProgress("magic", 1);
      let damage = effect.baseDamage + combat.magicPower * (effect.magicScale || 1);
      damage = Math.round(damage * (0.9 + Math.random() * 0.2));
      enemy.hp -= damage;
      recordPlayerDamage(damage);
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
        recordPlayerDamage(total);
        log(`${effect.hits}回攻撃！ 合計${total}ダメージ`);
      } else {
        let damage = Math.max(1, (combat.attack - enemy.defense * (effect.ignoreDef || 0.5)) * effect.damageMultiplier);
        damage = Math.round(damage * (0.9 + Math.random() * 0.2));
        enemy.hp -= damage;
        recordPlayerDamage(damage);
        log(`${damage}のダメージ！`);

        // 回復効果
        if (effect.healPercent) {
          const heal = Math.round(damage * effect.healPercent);
          gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
          log(`${heal}HP回復した！`);
        }
      }
    }

    {
      const jtCd = jobs?.[gameData.player?.job]?.traits || {};
      let cd = skillDef.cooldown;
      if (typeof jtCd.cooldownMult === "number") cd = Math.round(cd * jtCd.cooldownMult);
      if (typeof jtCd.cooldownReduction === "number") cd = cd - jtCd.cooldownReduction;
      gameData.player.skillCooldown = Math.max(0, Math.floor(cd));
    }

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

    const heal = Math.max(1, Math.floor(gameData.player.hp * 0.05));
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

    // 防御状態の消費（1ターン）
    if (st.defendingTurns > 0) st.defendingTurns--;
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

  function applyPlayerGuardReduction(damage) {
    const st = gameData.player.status || {};
    if (st.defendingTurns > 0) {
      const jt = jobs?.[gameData.player?.job]?.traits || {};
      const mult = typeof jt.guardDamageMult === "number" ? jt.guardDamageMult : 0.65;
      return Math.max(1, Math.round(damage * mult));
    }
    return damage;
  }

  function performEnemyAttack() {
    const enemy = gameData.enemy;

    if (!enemyDidHit(0)) {
      addJobProgress("evade", 1);
      log(`${enemy.displayName}の攻撃を回避した！`);
      return;
    }

    let damage = enemyDamageBase(false);
    damage = applyEnemyOutgoingMultipliers(damage);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyPlayerGuardReduction(damage);

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
      addJobProgress("evade", 1);
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

      damage = applyPlayerGuardReduction(damage);
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

      // 撃破カウント
      gameData.player.jobKills[gameData.player.job]++;
      gameData.player.totalKills = (gameData.player.totalKills || 0) + 1;
      if (enemy && enemy.isNamed) {
        gameData.player.namedKills = (gameData.player.namedKills || 0) + 1;
      }

      // 実績チェック（解除ログはここで出す）
      checkAndUnlockAchievements();

      // 経験値
      let exp = enemy.exp;
      const expBonus = getAccessoryBonus("expBonus");
      const expSkillBonus = (gameData.player.skills && gameData.player.skills.exp_up) ? gameData.player.skills.exp_up : 0;
      const expAchRate = getAchievementExpBonusRate();
      const jobExpRate = typeof (jobs?.[gameData.player?.job]?.traits?.expRate) === "number" ? jobs[gameData.player.job].traits.expRate : 0;
      exp = Math.round(exp * (1 + expBonus / 100) * (1 + expSkillBonus / 100) * (1 + expAchRate) * (1 + jobExpRate));

      gameData.player.exp += exp;
      log(`${exp}EXPを獲得！`);

      checkLevelUp();

      // ドロップ判定
      let dropChance = 20;
      dropChance += getAccessoryBonus("dropRate");
      dropChance += (typeof (jobs?.[gameData.player?.job]?.traits?.dropRateBonus) === "number" ? jobs[gameData.player.job].traits.dropRateBonus : 0);

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
    let leveled = false;
    while (gameData.player.exp >= getExpNeeded()) {
      const needed = getExpNeeded();

      gameData.player.level++;
      leveled = true;
      gameData.player.exp -= needed;
      gameData.player.statPoints++;
      gameData.player.skillPoints++;

      // レベルアップでは基本ステータスは上昇しない（ポイントのみ付与）

      const combat = getCombatStats();
      gameData.player.hp = combat.maxHp;

      log(`レベルアップ！ Lv.${gameData.player.level}`);
      log("ステータスポイントとスキルポイントを獲得！");
    }

    // レベル到達で上級職の条件を満たすことがあるためチェック
    if (leveled) {
      try { checkAdvancedJobUnlocks(false); } catch (e) {}
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
      locked: false,
    };

    const statBase = 5 + floor * 3;

    // 装備タイプごとの特性（ジャンル特性）
    const bias = type.bias || {};
    const getBias = (key, fallback) => {
      const v = bias[key];
      if (typeof v === "function") return v(floor, statBase);
      if (typeof v === "number") return v;
      return fallback;
    };

    if (category === "weapon") {
      const baseAttack = statBase * (1 + Math.random() * 0.5);
      const attackMult = getBias("attackMult", 1);
      item.attack = Math.round(baseAttack * attackMult);

      // 命中（マイナスもあり）
      if (typeof bias.accuracy !== "undefined") {
        item.accuracy = Math.round(getBias("accuracy", 0));
      } else {
        item.accuracy = Math.round(5 + floor * 0.5);
      }

      // 武器でも追加ステータスを持てる（例：杖の防御など）
      if (typeof bias.defense !== "undefined") item.defense = Math.round(getBias("defense", 0));
      if (typeof bias.evasion !== "undefined") item.evasion = Math.round(getBias("evasion", 0));
    } else if (category === "armor") {
      const baseDefense = statBase * (1 + Math.random() * 0.5);
      const defenseMult = getBias("defenseMult", 1);
      item.defense = Math.round(baseDefense * defenseMult);

      // 回避（マイナスもあり）
      if (typeof bias.evasion !== "undefined") {
        item.evasion = Math.round(getBias("evasion", 0));
      } else {
        item.evasion = Math.round(3 + floor * 0.3);
      }

      // 防具でも命中補正を持てる（例：篭手、盾など）
      if (typeof bias.accuracy !== "undefined") item.accuracy = Math.round(getBias("accuracy", 0));
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


    // 永続化用ID（装備の復元に使用）
    if (typeof item.uid !== "string" || !item.uid) item.uid = generateUid();

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
  window.getAchievementExpBonusRate = getAchievementExpBonusRate;
  window.getAchievementExpBonusPercent = getAchievementExpBonusPercent;
  window.checkAndUnlockAchievements = checkAndUnlockAchievements;

  // UI側から呼ぶ用
  window.isAutosaveEnabled = isAutosaveEnabled;
  window.setAutosaveEnabled = setAutosaveEnabled;
  window.requestAutosave = requestAutosave;
  window.saveGameNow = saveGameNow;

  window.move = move;
  window.startBattle = startBattle;
  window.attack = attack;
  window.defend = defend;
  window.useSkill = useSkill;
  window.useHerbInBattle = useHerbInBattle;
  window.escape = escape;
})();
