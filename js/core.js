// ===================
// コアロジック（分割: core）
// ===================

(function () {
  "use strict";
  // -------------------
  // 状態異常: 追加ルール
  // -------------------
  // 毒：最大HP割合ダメージ（敵ターン開始時に1回）
  const POISON_MAXHP_RATE = 0.03; // 3%
  // 火傷：回復量が減少（回復時に適用）
  const BURN_HEAL_MULT = 0.6; // 60%（=40%減少）

  // -------------------
  // 貴重品（秘宝）：所持ボーナス
  // -------------------
  // 敵を倒すと 1/1000 の確率でドロップ
  const RELIC_DROP_CHANCE = 0.001;
  const RELIC_FAMILY_NAME = "秘宝";

  const RELIC_DEFS = [
    { id: "emblem_strength", name: "力の紋章", statKey: "strength" },
    { id: "emblem_vitality", name: "体力の紋章", statKey: "vitality" },
    { id: "emblem_intelligence", name: "賢さの紋章", statKey: "intelligence" },
    { id: "emblem_agility", name: "素早さの紋章", statKey: "agility" },
    { id: "emblem_dexterity", name: "器用さの紋章", statKey: "dexterity" },
  ];

  function ensureValuables(p) {
    if (!p || typeof p !== "object") return;
    if (!Array.isArray(p.valuables)) p.valuables = [];
  }

  function normalizeValuables(p) {
    ensureValuables(p);
    p.valuables = p.valuables
      .filter((v) => v && typeof v === "object")
      .map((v) => {
        const id = typeof v.id === "string" ? v.id : "";
        const def = RELIC_DEFS.find((d) => d.id === id) || null;
        const count = Number(v.count || 0);
        return {
          id: def ? def.id : id,
          name:
            typeof v.name === "string" && v.name
              ? v.name
              : def
                ? def.name
                : "貴重品",
          statKey:
            typeof v.statKey === "string" && v.statKey
              ? v.statKey
              : def
                ? def.statKey
                : "",
          count: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
        };
      })
      .filter((v) => v.count > 0);
  }

  function addValuableByDef(def, amount = 1) {
    if (!def) return;
    const p = gameData.player;
    ensureValuables(p);
    const add = Number.isFinite(Number(amount))
      ? Math.max(1, Math.floor(Number(amount)))
      : 1;
    const found = p.valuables.find((v) => v && v.id === def.id);
    if (found) {
      found.count = Math.max(0, Math.floor(Number(found.count || 0)) + add);
      found.name = def.name;
      found.statKey = def.statKey;
    } else {
      p.valuables.push({
        id: def.id,
        name: def.name,
        statKey: def.statKey,
        count: add,
      });
    }
  }

  function getValuableStatBonus(p) {
    const bonus = {
      strength: 0,
      vitality: 0,
      intelligence: 0,
      agility: 0,
      dexterity: 0,
    };
    if (!p || !Array.isArray(p.valuables)) return bonus;
    for (const v of p.valuables) {
      if (!v || typeof v !== "object") continue;
      const key = String(v.statKey || "");
      if (!(key in bonus)) continue;
      const cnt = Number(v.count || 0);
      if (!Number.isFinite(cnt) || cnt <= 0) continue;
      bonus[key] += Math.floor(cnt);
    }
    return bonus;
  }

  /**
   * 回復量を状態異常で補正する（火傷: 回復量減少）
   * @param {number} baseHeal
   * @returns {number}
   */
  function adjustHealByStatus(baseHeal) {
    let heal = Math.round(baseHeal);
    if (!Number.isFinite(heal) || heal <= 0) return 0;

    const st =
      gameData && gameData.player && gameData.player.status
        ? gameData.player.status
        : null;
    if (st && st.burnTurns > 0) {
      const reduced = Math.max(1, Math.round(heal * BURN_HEAL_MULT));
      if (reduced !== heal) {
        log(`🔥 火傷で回復量が減少（${heal}→${reduced}）`);
      }
      heal = reduced;
    }

    // 装飾品：回復量UP（%）
    const bonusPct = Number(getAccessoryBonus("healReceived") || 0);
    if (Number.isFinite(bonusPct) && bonusPct !== 0) {
      heal = Math.max(1, Math.round(heal * (1 + bonusPct / 100)));
    }

    return heal;
  }

  /**
   * 現在の「スケーリング用」階層を返す。
   * 戦闘中で battleFloor がある場合は battleFloor を使う。
   * @returns {number}
   */
  function getScalingFloor() {
    const bf = Number(gameData && gameData.battleFloor);
    if (
      gameData &&
      gameData.gameState === "BATTLE" &&
      Number.isFinite(bf) &&
      bf > 0
    )
      return bf;
    const f = Number(gameData && gameData.floor);
    return Number.isFinite(f) && f > 0 ? f : 1;
  }

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
      battleFloor: gameData.battleFloor || null,
      pendingFloorAfterWin: gameData.pendingFloorAfterWin || null,
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

    gameData.battleFloor = Number.isFinite(Number(payload.battleFloor))
      ? Math.max(1, Math.floor(Number(payload.battleFloor)))
      : null;
    gameData.pendingFloorAfterWin = Number.isFinite(
      Number(payload.pendingFloorAfterWin),
    )
      ? Math.max(1, Math.floor(Number(payload.pendingFloorAfterWin)))
      : null;

    // 戦闘でなければ戦闘用データは捨てる
    if (gameData.gameState !== "BATTLE") {
      gameData.battleFloor = null;
      gameData.pendingFloorAfterWin = null;
    }

    if (!gameData.player.status) {
      gameData.player.status = {
        poisonTurns: 0,
        burnTurns: 0,
        bleedTurns: 0,
        stunTurns: 0,
        slowTurns: 0,
        slowRate: 0,
        vulnerableTurns: 0,
        vulnerableRate: 0,
        silenceTurns: 0,
        accuracyDownTurns: 0,
        accuracyDownRate: 0,
        defendingTurns: 0,
      };
    }
    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number")
      gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number")
      gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number")
      gameData.player.maxReachedFloor = gameData.floor || 1;
    if (typeof gameData.player.maxDamage !== "number")
      gameData.player.maxDamage = 0;
    for (let jobKey in jobs) {
      if (typeof gameData.player.jobKills[jobKey] !== "number")
        gameData.player.jobKills[jobKey] = 0;
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
          .map((e) => ({
            type: e.type || "",
            name: e.name || "",
            value: Number(e.value),
          }))
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
    if (!p.jobSkillBuilds || typeof p.jobSkillBuilds !== "object")
      p.jobSkillBuilds = {};
    if (typeof p.maxDamage !== "number") p.maxDamage = 0;
    // 実績の互換補正
    if (!p.achievements || typeof p.achievements !== "object")
      p.achievements = {};
    // 上級職解放の互換補正
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object")
      p.jobUnlockProgress = {};
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object")
      p.unlockedJobs = {};
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
    try {
      checkAdvancedJobUnlocks(true);
    } catch (e) {}

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
      const ok =
        !!def &&
        def.type === "active" &&
        lv > 0 &&
        (def.job === "all" || def.job === getJobSkillGroup(p.job));
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
    // 貴重品（秘宝）
    normalizeValuables(p);
    if (!p.equipment || typeof p.equipment !== "object") {
      p.equipment = { slot1: null, slot2: null, accessory: null };
    }
    // 装備名の互換（表示名を和風/漢字に統一）
    function normalizeEquipmentNaming(it) {
      try {
        if (!it || typeof it !== "object") return;
        const typeKey = String(it.type || "");
        const typeDef = window.equipTypes && window.equipTypes[typeKey];
        const newBase =
          typeDef && typeof typeDef.name === "string" ? typeDef.name : null;

        // -------------------
        // アクセ種別の互換
        // 装飾品は「指輪 / 耳飾り / 首飾り / 腕輪」の4種類のみに寄せる
        // -------------------
        const isAccessory = it.category === "accessory";
        if (isAccessory) {
          const allowed = new Set(["ring", "earrings", "necklace", "bracelet"]);
          if (!allowed.has(typeKey)) {
            const fallbackByType = {
              belt: "bracelet",
              anklet: "bracelet",
              bracers: "bracelet",
              charm: "necklace",
              talisman: "necklace",
              pendant: "necklace",
              brooch: "necklace",
              orb: "necklace",
              relic: "necklace",
              sigil: "necklace",
              medal: "necklace",
              charmstone: "ring",
              mirror_shard: "ring",
              mask: "ring",
            };

            let newType = fallbackByType[typeKey] || "";

            // typeKeyが読めない/過去の表示名のみの場合は、baseNameから推測
            const base = typeof it.baseName === "string" ? it.baseName : "";
            if (!newType) {
              if (base.includes("耳")) newType = "earrings";
              else if (base.includes("首") || base.includes("ペンダント"))
                newType = "necklace";
              else if (
                base.includes("腕") ||
                base.includes("帯") ||
                base.includes("足")
              )
                newType = "bracelet";
              else newType = "ring";
            }

            // type/baseName を新定義へ寄せる（効果や数値はそのまま）
            it.type = newType;
          }
        }

        // type変更後に再取得
        const fixedTypeKey = String(it.type || "");
        const fixedTypeDef =
          window.equipTypes && window.equipTypes[fixedTypeKey];
        const fixedBase =
          fixedTypeDef && typeof fixedTypeDef.name === "string"
            ? fixedTypeDef.name
            : null;

        // 旧表示名 → 新表示名（念のため）
        const legacyMap = {
          メイス: "金棒",
          クロスボウ: "弩",
          ワンド: "呪杖",
          サークレット: "額当",
          ブーツ: "靴",
          ローブ: "法衣",
          マント: "羽織",
          ベルト: "帯",
          ペンダント: "勾玉",
          ブローチ: "胸留",
          レリック: "遺物",
          ロザリオ: "数珠",
          首飾り: "首飾",
          耳飾り: "耳飾",
          お守り: "守札",
          腕当て: "腕当",
          紋章: "印章",
        };

        const oldBase = typeof it.baseName === "string" ? it.baseName : "";
        // baseName を更新
        if (fixedBase) it.baseName = fixedBase;

        // name を更新（旧の baseName や legacyMap を置換）
        if (typeof it.name === "string" && it.name) {
          let nm = it.name;

          if (oldBase && legacyMap[oldBase]) {
            nm = nm.split(oldBase).join(legacyMap[oldBase]);
          } else if (oldBase && fixedBase && oldBase !== fixedBase) {
            nm = nm.split(oldBase).join(fixedBase);
          }

          // baseNameが無い/古いケースも拾う
          for (const k of Object.keys(legacyMap)) {
            if (nm.includes(k)) nm = nm.split(k).join(legacyMap[k]);
          }
          it.name = nm;
        }
      } catch (e) {}
    }

    // インベントリにUIDを付与（古いセーブの互換）
    const sigCounts = new Map();
    const sigToItems = new Map();
    const uidToItem = new Map();

    p.inventory.forEach((it) => {
      if (!it || typeof it !== "object") return;

      normalizeEquipmentNaming(it);

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
    const def = jobs && jobs[jobKey] ? jobs[jobKey] : null;
    return def && def.skillGroup ? def.skillGroup : jobKey;
  }

  function ensureUnlockContainers(p) {
    if (!p || typeof p !== "object") return;
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object")
      p.jobUnlockProgress = {};
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object")
      p.unlockedJobs = {};
  }

  function ensureGroupProgress(p, group) {
    ensureUnlockContainers(p);
    if (
      !p.jobUnlockProgress[group] ||
      typeof p.jobUnlockProgress[group] !== "object"
    ) {
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
      const unlocked =
        !!p.unlockedJobs[key] || (levelOk && cur >= Number(unlock.target || 0));

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
  let __initDone = false;

  function initGame() {
    if (__initDone) return;

    // ui.js がまだ読み込まれていない場合（動的ロードの順序によって起きうる）
    // 先に進むと log/updateUI が未定義で初期化が止まるため、少し待って再試行する。
    if (
      typeof window.log !== "function" ||
      typeof window.updateUI !== "function"
    ) {
      setTimeout(initGame, 0);
      return;
    }

    __initDone = true;

    // UI参照
    gameData.battleButtons = document.getElementById("battleButtons");
    gameData.exploreButtons = document.getElementById("exploreButtons");

    applyPendingImportIfAny();
    autosaveEnabled = isAutosaveEnabled();

    const loaded = loadGameIfExists();

    // 装備参照の補正（新規データも含めて）
    normalizePlayerState(gameData.player);
    getCombatStats();

    if (!gameData.player.jobKills) gameData.player.jobKills = {};
    if (typeof gameData.player.totalKills !== "number")
      gameData.player.totalKills = 0;
    if (typeof gameData.player.namedKills !== "number")
      gameData.player.namedKills = 0;
    if (typeof gameData.player.maxReachedFloor !== "number")
      gameData.player.maxReachedFloor = gameData.floor || 1;
    if (typeof gameData.player.maxDamage !== "number")
      gameData.player.maxDamage = 0;
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
  }

  // 動的に script を読み込む方式だと window.onload が既に終わっていることがあるので、
  // readyState を見て即時初期化する。
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // すでにDOM構築済み
    queueMicrotask(initGame);
  } else {
    window.addEventListener("DOMContentLoaded", initGame, { once: true });
    window.addEventListener("load", initGame, { once: true });
  }

  // -------------------
  // ステータス計算
  // -------------------
  function clampMin0(n) {
    return Math.max(0, Math.floor(n));
  }

  function getTotalStats() {
    const p = gameData.player;
    const jobBonus = jobs[p.job].bonuses;
    const relicBonus = getValuableStatBonus(p);

    return {
      strength:
        p.baseStats.strength +
        p.allocatedStats.strength +
        jobBonus.strength +
        (relicBonus.strength || 0),
      vitality:
        p.baseStats.vitality +
        p.allocatedStats.vitality +
        jobBonus.vitality +
        (relicBonus.vitality || 0),
      intelligence:
        p.baseStats.intelligence +
        p.allocatedStats.intelligence +
        jobBonus.intelligence +
        (relicBonus.intelligence || 0),
      agility:
        p.baseStats.agility +
        p.allocatedStats.agility +
        jobBonus.agility +
        (relicBonus.agility || 0),
      dexterity:
        p.baseStats.dexterity +
        p.allocatedStats.dexterity +
        jobBonus.dexterity +
        (relicBonus.dexterity || 0),
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

  function applyEquipBonuses(
    combat,
    item,
    favoredType,
    favoredMult = FAVORED_EQUIP_MULTIPLIER,
  ) {
    if (!item) return;

    const mult = isFavoredEquip(item, favoredType) ? favoredMult : 1;

    if (item.attack) combat.attack += item.attack * mult;
    if (item.defense) combat.defense += item.defense * mult;
    if (item.accuracy) combat.accuracy += item.accuracy * mult;
    if (item.evasion) combat.evasion += item.evasion * mult;
    if (item.magicAttack) combat.magicPower += item.magicAttack * mult;
    if (item.healPower) combat.healPower += item.healPower * mult;

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
        if (eff.type === "magicPower") combat.magicPower += eff.value * mult;
        if (eff.type === "healPower") combat.healPower += eff.value * mult;
        // 索敵は装備種別によらず、補正はかけない（主に装飾品用）
        if (eff.type === "search") combat.search += eff.value;
      });
    }
  }

  function getCombatStats() {
    const stats = getTotalStats();
    const favoredType = jobs?.[gameData.player?.job]?.favoredType || null;
    const jobTraits = jobs?.[gameData.player?.job]?.traits || {};
    const favoredMult = Number.isFinite(jobTraits.favoredMultiplier)
      ? jobTraits.favoredMultiplier
      : FAVORED_EQUIP_MULTIPLIER;
    let combat = {
      attack: stats.strength * 2,
      defense: stats.vitality * 1.5,
      magicPower: stats.intelligence * 2,
      healPower: Math.round(stats.intelligence * 1.2),
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
      const rate =
        typeof st.accuracyDownRate === "number" ? st.accuracyDownRate : 0.2;
      combat.accuracy = Math.max(1, combat.accuracy * (1 - rate));
    }

    // 状態異常（鈍足：命中/回避ダウン）
    if (st.slowTurns > 0) {
      const rate = typeof st.slowRate === "number" ? st.slowRate : 0.2;
      combat.accuracy = Math.max(1, combat.accuracy * (1 - rate));
      combat.evasion = Math.max(0, combat.evasion * (1 - rate));
    }

    // 武器/防具 2枠
    applyEquipBonuses(
      combat,
      gameData.player.equipment.slot1,
      favoredType,
      favoredMult,
    );
    if (gameData.player.equipment.slot2 !== gameData.player.equipment.slot1) {
      applyEquipBonuses(
        combat,
        gameData.player.equipment.slot2,
        favoredType,
        favoredMult,
      );
    }

    // 装飾品 1枠（効果はここだけ）
    applyEquipBonuses(
      combat,
      gameData.player.equipment.accessory,
      favoredType,
      favoredMult,
    );

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
      if (typeof jobTraits.accuracyBonus === "number")
        combat.accuracy += jobTraits.accuracyBonus;
      if (typeof jobTraits.evasionBonus === "number")
        combat.evasion += jobTraits.evasionBonus;
      if (typeof jobTraits.critRateBonus === "number")
        combat.critRate += jobTraits.critRateBonus;
      if (typeof jobTraits.searchBonus === "number")
        combat.search += jobTraits.searchBonus;

      if (typeof jobTraits.attackMult === "number")
        combat.attack *= jobTraits.attackMult;
      if (typeof jobTraits.defenseMult === "number")
        combat.defense *= jobTraits.defenseMult;
      if (typeof jobTraits.magicPowerMult === "number")
        combat.magicPower *= jobTraits.magicPowerMult;
      if (typeof jobTraits.maxHpMult === "number")
        combat.maxHp *= jobTraits.maxHpMult;
    }

    // 背水強化：HPが50%以下のとき、攻撃/魔法攻撃を上げる（%）
    const desperPct = Number(getAccessoryBonus("desperationDamage") || 0);
    if (Number.isFinite(desperPct) && desperPct > 0) {
      const mh = Math.max(1, combat.maxHp || 1);
      const hp = Number(gameData.player.hp || 0);
      const rate = hp / mh;
      if (rate > 0 && rate <= 0.5) {
        const mul = 1 + Math.min(200, desperPct) / 100;
        combat.attack *= mul;
        combat.magicPower *= mul;
      }
    }
    // 端数が出ないように丸める
    combat.attack = Math.round(combat.attack);
    combat.defense = Math.round(combat.defense);
    combat.magicPower = Math.round(combat.magicPower);
    combat.healPower = Math.round(combat.healPower || 0);
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

  // 装備効果ボーナス取得（装備1/装備2/装飾品の effects を合算）
  function getAccessoryBonus(type) {
    let total = 0;
    const eq = (gameData.player && gameData.player.equipment) || {};
    const items = [eq.slot1, eq.slot2, eq.accessory].filter(Boolean);

    // 同一アイテムを二重計上しない（2枠に同じ参照が入るケース対策）
    const seen = new Set();
    for (const it of items) {
      const key = typeof it.uid === "string" && it.uid ? it.uid : it;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!it || !Array.isArray(it.effects)) continue;
      for (const eff of it.effects) {
        if (eff && eff.type === type) total += Number(eff.value) || 0;
      }
    }
    return total;
  }

  // 実績ボーナス（現在は経験値のみ）
  function getAchievementExpBonusRate() {
    const p = gameData.player;
    const map =
      p && p.achievements && typeof p.achievements === "object"
        ? p.achievements
        : {};
    let rate = 0;
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
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
    if (!p.achievements || typeof p.achievements !== "object")
      p.achievements = {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
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

    const cur = Math.max(1, Math.floor(Number(gameData.floor || 1)));
    const target = Math.max(1, cur + dir);

    // 進む（敵と遭遇した場合は、倒してから階層が上がる）
    if (dir > 0) {
      // 戦闘開始
      if (Math.random() < 0.8 || target <= 5) {
        gameData.pendingFloorAfterWin = target;
        startBattle(target);
      } else {
        gameData.floor = target;

        if (typeof gameData.player.maxReachedFloor !== "number")
          gameData.player.maxReachedFloor = 1;
        gameData.player.maxReachedFloor = Math.max(
          gameData.player.maxReachedFloor,
          gameData.floor,
        );
        checkAndUnlockAchievements();
        log(`${gameData.floor}階層に進んだ`);
        requestAutosave();
        updateUI();
      }
      return;
    }

    // 戻る（戻る時はそのまま階層だけ移動）
    gameData.floor = target;
    if (typeof gameData.player.maxReachedFloor !== "number")
      gameData.player.maxReachedFloor = 1;
    gameData.player.maxReachedFloor = Math.max(
      gameData.player.maxReachedFloor,
      gameData.floor,
    );
    checkAndUnlockAchievements();
    log(`${gameData.floor}階層に戻った`);

    requestAutosave();
    updateUI();
  }

  // -------------------
  // 戦闘
  // -------------------
  function applyEnemyIncomingReduction(enemy, damage) {
    if (
      enemy &&
      enemy.effects &&
      typeof enemy.effects.damageReduction === "number"
    ) {
      return Math.max(
        1,
        Math.round(damage * (1 - enemy.effects.damageReduction)),
      );
    }
    return damage;
  }

  function startBattle(battleFloor) {
    gameData.gameState = "BATTLE";

    // 戦闘開始時にログをクリア
    if (typeof window.clearLog === "function") window.clearLog();

    const floor = Number.isFinite(Number(battleFloor))
      ? Math.max(1, Math.floor(Number(battleFloor)))
      : gameData.floor;

    gameData.battleFloor = floor;

    // 敵生成：階層に応じて候補を絞る
    const candidates = monsterTypes.filter((m) => {
      const min = m.minFloor || 1;
      const max = typeof m.maxFloor === "number" ? m.maxFloor : Infinity;
      return min <= floor && floor <= max;
    });
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

    enemy.displayName = epithet
      ? `【${epithet.name}】${enemy.name}`
      : enemy.name;

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

    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }

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
    const baseCritMul =
      typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
    const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
    const critMul = isCrit
      ? baseCritMul * (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
      : 1;

    if (isCrit) addJobProgress("crit", 1);

    // ダメージ計算
    // 追い打ち：敵HPが50%以下のとき与ダメージUP（%）
    const execPct = Number(getAccessoryBonus("executeDamage") || 0);
    const execMul =
      Number.isFinite(execPct) &&
      execPct > 0 &&
      enemy.maxHp > 0 &&
      enemy.hp / enemy.maxHp <= 0.5
        ? 1 + Math.min(200, execPct) / 100
        : 1;

    let damage = Math.max(
      1,
      (combat.attack - enemy.defense * 0.5) * critMul * execMul,
    );
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyEnemyIncomingReduction(enemy, damage);

    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`${damage}のダメージ${isCrit ? " クリティカル！" : ""}`);

    // 装飾品：吸血（与えたダメージの%を回復）
    const lsPct = Number(getAccessoryBonus("lifeSteal") || 0);
    if (Number.isFinite(lsPct) && lsPct > 0) {
      const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
      const heal = adjustHealByStatus(baseHeal);
      if (heal > 0) {
        gameData.player.hp = Math.min(
          gameData.player.maxHp,
          gameData.player.hp + heal,
        );
        log(`🩸 吸血で${heal}回復`);
      }
    }

    // 攻撃時HP回復（固定値）
    const hitHeal = Number(getAccessoryBonus("hitHeal") || 0);
    if (Number.isFinite(hitHeal) && hitHeal > 0) {
      const baseHeal = Math.max(1, Math.round(hitHeal));
      const heal = adjustHealByStatus(baseHeal);
      if (heal > 0) {
        gameData.player.hp = Math.min(
          gameData.player.maxHp,
          gameData.player.hp + heal,
        );
        log(`✨ 攻撃で${heal}回復`);
      }
    }

    // 連続攻撃：一定確率でもう一撃（ダメージは控えめ）
    const msChance = Number(getAccessoryBonus("multiStrikeChance") || 0);
    if (Number.isFinite(msChance) && msChance > 0 && enemy.hp > 0) {
      const roll = Math.random() * 100;
      if (roll < Math.min(60, msChance)) {
        const bonus = Number(getAccessoryBonus("multiStrikeDamage") || 0);
        const rate =
          0.6 * (1 + (Number.isFinite(bonus) ? Math.min(150, bonus) : 0) / 100);
        const extraCrit = Math.random() * 100 < combat.critRate;
        const extraCritMul = extraCrit
          ? baseCritMul *
            (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
          : 1;
        const exec2Mul =
          Number.isFinite(execPct) &&
          execPct > 0 &&
          enemy.maxHp > 0 &&
          enemy.hp / enemy.maxHp <= 0.5
            ? 1 + Math.min(200, execPct) / 100
            : 1;
        let d2 = Math.max(
          1,
          (combat.attack - enemy.defense * 0.5) *
            extraCritMul *
            exec2Mul *
            rate,
        );
        d2 = Math.round(d2 * (0.9 + Math.random() * 0.2));
        d2 = applyEnemyIncomingReduction(enemy, d2);
        enemy.hp -= d2;
        recordPlayerDamage(d2);
        log(`⚔ 連続攻撃！ ${d2}ダメージ${extraCrit ? " クリティカル！" : ""}`);

        // 吸血（追撃分）
        const ls2 = Number(getAccessoryBonus("lifeSteal") || 0);
        if (Number.isFinite(ls2) && ls2 > 0) {
          const baseHeal = Math.max(1, Math.round(d2 * (ls2 / 100)));
          const heal = adjustHealByStatus(baseHeal);
          if (heal > 0) {
            gameData.player.hp = Math.min(
              gameData.player.maxHp,
              gameData.player.hp + heal,
            );
            log(`🩸 吸血で${heal}回復`);
          }
        }

        // 攻撃時HP回復（追撃分）
        const hh2 = Number(getAccessoryBonus("hitHeal") || 0);
        if (Number.isFinite(hh2) && hh2 > 0) {
          const baseHeal = Math.max(1, Math.round(hh2));
          const heal = adjustHealByStatus(baseHeal);
          if (heal > 0) {
            gameData.player.hp = Math.min(
              gameData.player.maxHp,
              gameData.player.hp + heal,
            );
            log(`✨ 攻撃で${heal}回復`);
          }
        }
      }
    }
    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    }
  }

  function defend() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }

    st.defendingTurns = 1;
    log("🛡 防御した");

    addJobProgress("defend", 1);

    enemyTurn();
  }

  function useSkill() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    const skillKey = gameData.player.equippedSkill;
    if (!skillKey) return;

    // クールタイム値の正規化（NaN対策）
    let cdNow = Number(gameData.player.skillCooldown || 0);
    if (!Number.isFinite(cdNow) || cdNow < 0) cdNow = 0;
    gameData.player.skillCooldown = cdNow;

    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }
    if (st.silenceTurns > 0) {
      log("🔇 封印されてスキルが使えない！");
      enemyTurn();
      return;
    }

    if (gameData.player.skillCooldown > 0) {
      log(`⏳ クールタイム中（残り${gameData.player.skillCooldown}）`);
      return;
    }

    const skillDef = skills[skillKey];
    if (!skillDef || typeof skillDef.effect !== "function") {
      log("スキルが設定されていない");
      return;
    }
    const level =
      gameData.player.skills && gameData.player.skills[skillKey]
        ? gameData.player.skills[skillKey]
        : 0;
    const effect = skillDef.effect(level);

    addJobProgress("skillUse", 1);

    log(`🪄 ${skillDef.name || skillKey}を使用！`);

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // 装飾品：スキル威力UP（%）
    const skillPowerPct = Number(getAccessoryBonus("skillPower") || 0);
    const skillMul = Number.isFinite(skillPowerPct)
      ? 1 + skillPowerPct / 100
      : 1;

    // スキル効果
    // 追い打ち：敵HPが50%以下のとき与ダメージUP（%）
    const execPctSkill = Number(getAccessoryBonus("executeDamage") || 0);
    const hitHealSkill = Number(getAccessoryBonus("hitHeal") || 0);

    if (typeof effect.healAmount === "number") {
      // 回復スキル
      addJobProgress("heal", 1);
      const jt = jobs?.[gameData.player?.job]?.traits || {};
      const healMult = typeof jt.healMult === "number" ? jt.healMult : 1;
      const healScale =
        typeof effect.healScale === "number" ? effect.healScale : 0.6;
      const baseHeal = Math.round(
        (effect.healAmount * healMult + combat.healPower * healScale) *
          skillMul,
      );
      const heal = adjustHealByStatus(baseHeal);
      gameData.player.hp = Math.min(
        gameData.player.maxHp,
        gameData.player.hp + heal,
      );
      log(`${heal}HP回復した！`);
    } else if (effect.baseDamage) {
      // 魔法攻撃
      addJobProgress("magic", 1);
      let damage =
        (effect.baseDamage + combat.magicPower * (effect.magicScale || 1)) *
        skillMul;
      damage = Math.round(damage * (0.9 + Math.random() * 0.2));
      if (
        Number.isFinite(execPctSkill) &&
        execPctSkill > 0 &&
        enemy.maxHp > 0 &&
        enemy.hp / enemy.maxHp <= 0.5
      ) {
        damage = Math.round(damage * (1 + Math.min(200, execPctSkill) / 100));
      }
      enemy.hp -= damage;
      if (Number.isFinite(hitHealSkill) && hitHealSkill > 0) {
        const baseHeal = Math.max(1, Math.round(hitHealSkill));
        const heal = adjustHealByStatus(baseHeal);
        if (heal > 0) {
          gameData.player.hp = Math.min(
            gameData.player.maxHp,
            gameData.player.hp + heal,
          );
          log(`✨ 攻撃で${heal}回復`);
        }
      }
      recordPlayerDamage(damage);
      log(`${damage}のダメージ！`);
    } else if (effect.damageMultiplier) {
      // 物理攻撃
      if (effect.hits) {
        // 連続攻撃
        let total = 0;
        for (let i = 0; i < effect.hits; i++) {
          let damage = Math.max(
            1,
            (combat.attack - enemy.defense * 0.5) *
              effect.damageMultiplier *
              skillMul,
          );
          damage = Math.round(damage * (0.9 + Math.random() * 0.2));
          if (
            Number.isFinite(execPctSkill) &&
            execPctSkill > 0 &&
            enemy.maxHp > 0 &&
            enemy.hp / enemy.maxHp <= 0.5
          ) {
            damage = Math.round(
              damage * (1 + Math.min(200, execPctSkill) / 100),
            );
          }
          enemy.hp -= damage;
          total += damage;
          if (Number.isFinite(hitHealSkill) && hitHealSkill > 0) {
            const baseHeal = Math.max(1, Math.round(hitHealSkill));
            const heal = adjustHealByStatus(baseHeal);
            if (heal > 0) {
              gameData.player.hp = Math.min(
                gameData.player.maxHp,
                gameData.player.hp + heal,
              );
              log(`✨ 攻撃で${heal}回復`);
            }
          }
        }
        recordPlayerDamage(total);
        log(`${effect.hits}回攻撃！ 合計${total}ダメージ`);

        // 装飾品：吸血
        const lsPct = Number(getAccessoryBonus("lifeSteal") || 0);
        if (Number.isFinite(lsPct) && lsPct > 0) {
          const baseHeal = Math.max(1, Math.round(total * (lsPct / 100)));
          const heal = adjustHealByStatus(baseHeal);
          if (heal > 0) {
            gameData.player.hp = Math.min(
              gameData.player.maxHp,
              gameData.player.hp + heal,
            );
            log(`🩸 吸血で${heal}回復`);
          }
        }
      } else {
        let damage = Math.max(
          1,
          (combat.attack - enemy.defense * (effect.ignoreDef || 0.5)) *
            effect.damageMultiplier *
            skillMul,
        );
        damage = Math.round(damage * (0.9 + Math.random() * 0.2));
        if (
          Number.isFinite(execPctSkill) &&
          execPctSkill > 0 &&
          enemy.maxHp > 0 &&
          enemy.hp / enemy.maxHp <= 0.5
        ) {
          damage = Math.round(damage * (1 + Math.min(200, execPctSkill) / 100));
        }
        enemy.hp -= damage;
        recordPlayerDamage(damage);
        log(`${damage}のダメージ！`);
        if (Number.isFinite(hitHealSkill) && hitHealSkill > 0) {
          const baseHeal = Math.max(1, Math.round(hitHealSkill));
          const heal = adjustHealByStatus(baseHeal);
          if (heal > 0) {
            gameData.player.hp = Math.min(
              gameData.player.maxHp,
              gameData.player.hp + heal,
            );
            log(`✨ 攻撃で${heal}回復`);
          }
        }

        // 回復効果
        if (effect.healPercent) {
          const baseHeal = Math.round(damage * effect.healPercent);
          const heal = adjustHealByStatus(baseHeal);
          gameData.player.hp = Math.min(
            gameData.player.maxHp,
            gameData.player.hp + heal,
          );
          log(`${heal}HP回復した！`);
        }

        // 装飾品：吸血
        const lsPct = Number(getAccessoryBonus("lifeSteal") || 0);
        if (Number.isFinite(lsPct) && lsPct > 0) {
          const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
          const heal = adjustHealByStatus(baseHeal);
          if (heal > 0) {
            gameData.player.hp = Math.min(
              gameData.player.maxHp,
              gameData.player.hp + heal,
            );
            log(`🩸 吸血で${heal}回復`);
          }
        }
      }
    }

    {
      const jtCd = jobs?.[gameData.player?.job]?.traits || {};
      let cd = Number(skillDef.cooldown);

      if (!Number.isFinite(cd) || cd < 0) cd = 1;

      if (
        typeof jtCd.cooldownMult === "number" &&
        Number.isFinite(jtCd.cooldownMult)
      ) {
        cd = cd * jtCd.cooldownMult;
      }
      if (
        typeof jtCd.cooldownReduction === "number" &&
        Number.isFinite(jtCd.cooldownReduction)
      ) {
        cd = cd - jtCd.cooldownReduction;
      }

      // 装飾品：クールタイム短縮（ターン）
      const accCdRed = Number(getAccessoryBonus("cooldownReduction") || 0);
      if (Number.isFinite(accCdRed) && accCdRed !== 0) cd = cd - accCdRed;

      // 最低でも1ターンはクールタイムを発生させる（連続使用防止）
      const cdFinal = Math.max(1, Math.floor(cd));

      // enemyTurn() の冒頭で 1 減るので +1 しておく
      gameData.player.skillCooldown = cdFinal + 1;
    }

    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    }
  }

  function useHerbInBattle() {
    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }

    const herbItem = gameData.player.items.find((i) => i.name === "やくそう");
    if (!herbItem || herbItem.count <= 0) {
      log("やくそうを持っていない");
      return;
    }

    herbItem.count--;
    if (herbItem.count <= 0) {
      gameData.player.items = gameData.player.items.filter(
        (i) => i.name !== "やくそう",
      );
    }

    let baseHeal = Math.max(1, Math.floor(gameData.player.hp * 0.05));
    const herbBonusPct = Number(getAccessoryBonus("herbPower") || 0);
    if (Number.isFinite(herbBonusPct) && herbBonusPct !== 0) {
      baseHeal = Math.max(1, Math.round(baseHeal * (1 + herbBonusPct / 100)));
    }
    const heal = adjustHealByStatus(baseHeal);
    gameData.player.hp = Math.min(
      gameData.player.maxHp,
      gameData.player.hp + heal,
    );
    log(`やくそうを使用！ ${heal}HP回復した！`);

    requestAutosave();

    updateUI();
    enemyTurn();
  }

  function escape() {
    if (gameData.gameState !== "BATTLE") return;

    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }

    const combat = getCombatStats();
    const rate = Math.min(30 + Math.floor(combat.evasion / 2), 90);

    if (Math.random() * 100 < rate) {
      log("💨 逃走成功！");
      if (Number.isFinite(Number(gameData.pendingFloorAfterWin))) {
        // まだ階層を上げていない（倒したら上がる方式）ので、逃走しても階層は下げない
        gameData.pendingFloorAfterWin = null;
      } else {
        gameData.floor = Math.max(1, gameData.floor - 1);
      }
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
    if (
      !Number.isFinite(gameData.player.skillCooldown) ||
      gameData.player.skillCooldown < 0
    ) {
      gameData.player.skillCooldown = 0;
    }
    if (gameData.player.skillCooldown > 0) {
      gameData.player.skillCooldown--;
    }

    const enemy = gameData.enemy;
    const combat = getCombatStats();

    // 状態異常ダメージ（敵ターン開始時に1回）
    const st = gameData.player.status || (gameData.player.status = {});
    if (st.poisonTurns > 0) {
      const maxHp = Math.max(1, gameData.player.maxHp || 1);
      const pct = Math.round(POISON_MAXHP_RATE * 100);
      const dmg = Math.max(1, Math.round(maxHp * POISON_MAXHP_RATE));
      gameData.player.hp -= dmg;
      st.poisonTurns--;
      log(`☠ 毒で${dmg}ダメージ（最大HP${pct}%）`);
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
    }
    if (st.bleedTurns > 0) {
      const dmg = Math.max(2, Math.round(getScalingFloor() * 1.0));
      gameData.player.hp -= dmg;
      st.bleedTurns--;
      log(`🩸 出血で${dmg}ダメージ`);
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
    }
    if (st.burnTurns > 0) {
      // 火傷は継続ダメージではなく「回復量減少」として扱う
      st.burnTurns--;
      if (st.burnTurns <= 0) {
        log("🔥 火傷が治った");
      }
    }

    // 装飾品：再生（敵ターン開始時に回復）
    const regenPct = Number(getAccessoryBonus("regen") || 0);
    if (Number.isFinite(regenPct) && regenPct > 0 && gameData.player.hp > 0) {
      const maxHp = Math.max(1, gameData.player.maxHp || 1);
      if (gameData.player.hp < maxHp) {
        const baseHeal = Math.max(1, Math.round(maxHp * (regenPct / 100)));
        const heal = adjustHealByStatus(baseHeal);
        if (heal > 0) {
          gameData.player.hp = Math.min(maxHp, gameData.player.hp + heal);
          log(`✨ 再生で${heal}回復`);
        }
      }
    }

    // 命中低下のターン経過
    if (st.accuracyDownTurns > 0) {
      st.accuracyDownTurns--;
      if (st.accuracyDownTurns <= 0) {
        st.accuracyDownRate = 0;
      }
    }

    // 鈍足のターン経過
    if (st.slowTurns > 0) {
      st.slowTurns--;
      if (st.slowTurns <= 0) st.slowRate = 0;
    }

    // 被ダメージ増加（脆弱）のターン経過
    if (st.vulnerableTurns > 0) {
      st.vulnerableTurns--;
      if (st.vulnerableTurns <= 0) st.vulnerableRate = 0;
    }

    // 封印のターン経過
    if (st.silenceTurns > 0) {
      st.silenceTurns--;
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
    if (
      ef.preferMagic &&
      readySkills.some((id) => enemySkills[id]?.kind === "magic")
    ) {
      useSkill = readySkills.length > 0 && Math.random() < 0.65;
    }

    if (useSkill) {
      let chosen = null;
      const magic = readySkills.filter(
        (id) => enemySkills[id]?.kind === "magic",
      );
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
    if (
      gameData.gameState === "BATTLE" &&
      ef.extraTurnChance &&
      Math.random() < ef.extraTurnChance
    ) {
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
    const pierce =
      typeof ef.armorPierceRate === "number" ? ef.armorPierceRate : 0;

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

    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

    // 装飾品：状態異常短縮（%）
    const durationDown =
      clamp(Number(getAccessoryBonus("ailmentDurationDown") || 0), 0, 80) / 100;

    function adjustedTurns(baseTurns) {
      const t = Math.max(1, Math.floor(Number(baseTurns) || 1));
      return Math.max(1, Math.round(t * (1 - durationDown)));
    }

    function maybeResistLog(msg) {
      if (!msg) return;
      if (Math.random() < 0.35) log(msg);
    }

    function checkChance(baseChance, resistType, resistMsg) {
      const base = Number(baseChance);
      if (!Number.isFinite(base) || base <= 0) return false;

      const resistPct =
        clamp(Number(getAccessoryBonus(resistType) || 0), 0, 90) / 100;
      const adj = base * (1 - resistPct);

      const roll = Math.random();
      if (roll < adj) return true;

      // 元の確率なら当たっていたが、耐性で防いだ
      if (roll < base && resistPct > 0) maybeResistLog(resistMsg);
      return false;
    }

    // 毒
    if (
      ef.poisonOnHitChance &&
      checkChance(ef.poisonOnHitChance, "poisonResist", "🛡 毒を防いだ！")
    ) {
      st.poisonTurns = Math.max(
        st.poisonTurns || 0,
        adjustedTurns(ef.poisonTurns || 3),
      );
      log("☠ 毒状態になった！");
    }
    if (
      fromSkillDef &&
      fromSkillDef.poisonChance &&
      checkChance(fromSkillDef.poisonChance, "poisonResist", "🛡 毒を防いだ！")
    ) {
      st.poisonTurns = Math.max(
        st.poisonTurns || 0,
        adjustedTurns(fromSkillDef.poisonTurns || 3),
      );
      log("☠ 毒状態になった！");
    }

    // 火傷
    if (
      fromSkillDef &&
      fromSkillDef.burnChance &&
      checkChance(fromSkillDef.burnChance, "burnResist", "🛡 火傷を防いだ！")
    ) {
      st.burnTurns = Math.max(
        st.burnTurns || 0,
        adjustedTurns(fromSkillDef.burnTurns || 2),
      );
      log("🔥 火傷状態になった！");
    }

    // 命中低下
    if (
      fromSkillDef &&
      fromSkillDef.debuff &&
      fromSkillDef.debuff.accuracyDownTurns
    ) {
      if (checkChance(1, "accuracyDownResist", "🛡 命中低下を防いだ！")) {
        st.accuracyDownTurns = Math.max(
          st.accuracyDownTurns || 0,
          adjustedTurns(fromSkillDef.debuff.accuracyDownTurns),
        );
        st.accuracyDownRate = Math.max(
          st.accuracyDownRate || 0,
          fromSkillDef.debuff.accuracyDownRate || 0.2,
        );
        log("👁 命中が下がった！");
      }
    }

    // 出血
    if (
      fromSkillDef &&
      fromSkillDef.bleedChance &&
      checkChance(fromSkillDef.bleedChance, "bleedResist", "🛡 出血を防いだ！")
    ) {
      st.bleedTurns = Math.max(
        st.bleedTurns || 0,
        adjustedTurns(fromSkillDef.bleedTurns || 2),
      );
      log("🩸 出血状態になった！");
    }

    // しびれ
    if (
      fromSkillDef &&
      fromSkillDef.stunChance &&
      checkChance(fromSkillDef.stunChance, "stunResist", "🛡 しびれを防いだ！")
    ) {
      st.stunTurns = Math.max(
        st.stunTurns || 0,
        adjustedTurns(fromSkillDef.stunTurns || 1),
      );
      log("⚡ しびれて動けなくなった！");
    }

    // 鈍足
    if (
      fromSkillDef &&
      fromSkillDef.slowChance &&
      checkChance(fromSkillDef.slowChance, "slowResist", "🛡 鈍足を防いだ！")
    ) {
      st.slowTurns = Math.max(
        st.slowTurns || 0,
        adjustedTurns(fromSkillDef.slowTurns || 2),
      );
      st.slowRate = Math.max(st.slowRate || 0, fromSkillDef.slowRate || 0.2);
      log("🐌 鈍足になった！");
    }

    // 脆弱
    if (
      fromSkillDef &&
      fromSkillDef.vulnerableChance &&
      checkChance(
        fromSkillDef.vulnerableChance,
        "vulnerableResist",
        "🛡 脆弱を防いだ！",
      )
    ) {
      st.vulnerableTurns = Math.max(
        st.vulnerableTurns || 0,
        adjustedTurns(fromSkillDef.vulnerableTurns || 2),
      );
      st.vulnerableRate = Math.max(
        st.vulnerableRate || 0,
        fromSkillDef.vulnerableRate || 0.25,
      );
      log("💥 受けるダメージが増えた！");
    }

    // 封印
    if (
      fromSkillDef &&
      fromSkillDef.silenceChance &&
      checkChance(
        fromSkillDef.silenceChance,
        "silenceResist",
        "🛡 封印を防いだ！",
      )
    ) {
      st.silenceTurns = Math.max(
        st.silenceTurns || 0,
        adjustedTurns(fromSkillDef.silenceTurns || 1),
      );
      log("🔇 スキルが封印された！");
    }
  }

  function applyPlayerGuardReduction(damage) {
    const st = gameData.player.status || {};
    if (st.defendingTurns > 0) {
      const jt = jobs?.[gameData.player?.job]?.traits || {};
      const mult =
        typeof jt.guardDamageMult === "number" ? jt.guardDamageMult : 0.65;
      return Math.max(1, Math.round(damage * mult));
    }
    return damage;
  }

  // 装飾品：被ダメージ軽減（%）
  function applyPlayerIncomingReduction(damage) {
    let d = Math.max(1, Math.round(damage));
    const pct = Number(getAccessoryBonus("damageReduction") || 0);
    if (Number.isFinite(pct) && pct > 0) {
      const r = Math.min(80, Math.max(0, pct)) / 100;
      d = Math.max(1, Math.round(d * (1 - r)));
    }
    return d;
  }

  function applyEvadeHeal() {
    const v = Number(getAccessoryBonus("evadeHeal") || 0);
    if (!Number.isFinite(v) || v <= 0) return;
    const baseHeal = Math.max(1, Math.round(v));
    const heal = adjustHealByStatus(baseHeal);
    if (heal <= 0) return;
    gameData.player.hp = Math.min(
      gameData.player.maxHp,
      gameData.player.hp + heal,
    );
    log(`✨ 回避で${heal}回復`);
  }

  function tryCounterAttack() {
    if (gameData.gameState !== "BATTLE") return;
    const enemy = gameData.enemy;
    if (!enemy) return;
    if (enemy.hp <= 0) return;
    if (gameData.player.hp <= 0) return;

    const chance = Number(getAccessoryBonus("counterChance") || 0);
    if (!Number.isFinite(chance) || chance <= 0) return;
    const roll = Math.random() * 100;
    if (roll >= Math.min(45, chance)) return;

    const combat = getCombatStats();
    const dmgPct = Number(getAccessoryBonus("counterDamage") || 0);
    const mul = 1 + (Number.isFinite(dmgPct) ? Math.min(200, dmgPct) : 0) / 100;

    let damage = Math.max(
      1,
      (combat.attack - enemy.defense * 0.35) * 0.65 * mul,
    );
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));
    damage = applyEnemyIncomingReduction(enemy, damage);

    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`↩️ 反撃！ ${damage}ダメージ`);
    checkBattleEnd();
  }

  function performEnemyAttack() {
    const enemy = gameData.enemy;

    if (!enemyDidHit(0)) {
      addJobProgress("evade", 1);
      log(`${enemy.displayName}の攻撃を回避した！`);
      applyEvadeHeal();
      return;
    }

    let damage = enemyDamageBase(false);
    damage = applyEnemyOutgoingMultipliers(damage);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyPlayerGuardReduction(damage);

    const pst = gameData.player.status || {};
    if (pst.vulnerableTurns > 0) {
      const vr =
        typeof pst.vulnerableRate === "number" ? pst.vulnerableRate : 0.25;
      damage = Math.max(1, Math.round(damage * (1 + vr)));
    }

    damage = applyPlayerIncomingReduction(damage);

    gameData.player.hp -= damage;
    log(`◀ ${enemy.displayName}の攻撃！ ${damage}ダメージ`);

    applyOnHitStatuses(null);
    tryCounterAttack();
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
      applyEvadeHeal();
      return;
    }

    const isMagic = def.kind === "magic";
    const hits = def.hits || 1;
    let total = 0;

    for (let i = 0; i < hits; i++) {
      let damage = enemyDamageBase(isMagic);
      const mul =
        typeof def.damageMultiplier === "number" ? def.damageMultiplier : 1;
      damage = Math.round(damage * mul);
      damage = applyEnemyOutgoingMultipliers(damage);
      damage = Math.round(damage * (0.9 + Math.random() * 0.2));

      damage = applyPlayerGuardReduction(damage);
      const pst = gameData.player.status || {};
      if (pst.vulnerableTurns > 0) {
        const vr =
          typeof pst.vulnerableRate === "number" ? pst.vulnerableRate : 0.25;
        damage = Math.max(1, Math.round(damage * (1 + vr)));
      }
      damage = applyPlayerIncomingReduction(damage);
      gameData.player.hp -= damage;
      total += damage;

      if (gameData.player.hp <= 0) break;
    }

    log(`💥 ${total}ダメージ`);
    applyOnHitStatuses(def);
    tryCounterAttack();
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
      const expSkillBonus =
        gameData.player.skills && gameData.player.skills.exp_up
          ? gameData.player.skills.exp_up
          : 0;
      const expAchRate = getAchievementExpBonusRate();
      const jobExpRate =
        typeof jobs?.[gameData.player?.job]?.traits?.expRate === "number"
          ? jobs[gameData.player.job].traits.expRate
          : 0;
      exp = Math.round(
        exp *
          (1 + expBonus / 100) *
          (1 + expSkillBonus / 100) *
          (1 + expAchRate) *
          (1 + jobExpRate),
      );

      gameData.player.exp += exp;
      log(`${exp}EXPを獲得！`);

      checkLevelUp();

      // ドロップ判定
      let dropChance = 20;
      dropChance += getAccessoryBonus("dropRate");
      dropChance +=
        typeof jobs?.[gameData.player?.job]?.traits?.dropRateBonus === "number"
          ? jobs[gameData.player.job].traits.dropRateBonus
          : 0;

      if (Math.random() * 100 < dropChance) {
        const item = generateEquipment();
        gameData.player.inventory.push(item);
        log(`${item.name}を手に入れた！`);
      }

      // 貴重品（秘宝）ドロップ（固定 1/1000）
      if (Math.random() < RELIC_DROP_CHANCE) {
        const def = RELIC_DEFS[Math.floor(Math.random() * RELIC_DEFS.length)];
        addValuableByDef(def, 1);
        log(`✨${RELIC_FAMILY_NAME}を発見！ ${def.name}を手に入れた！`);
      }

      // 敵を倒したら階層が上がる（進行待ちがある場合）
      if (Number.isFinite(Number(gameData.pendingFloorAfterWin))) {
        const nf = Math.max(
          1,
          Math.floor(Number(gameData.pendingFloorAfterWin)),
        );
        gameData.pendingFloorAfterWin = null;
        gameData.floor = nf;

        if (typeof gameData.player.maxReachedFloor !== "number")
          gameData.player.maxReachedFloor = 1;
        gameData.player.maxReachedFloor = Math.max(
          gameData.player.maxReachedFloor,
          gameData.floor,
        );
        checkAndUnlockAchievements();
        log(`✅ ${gameData.floor}階層へ進んだ！`);
      }

      // 取得した貴重品でステータスが変わることがあるので、ここで反映
      getCombatStats();
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

    // 戦闘用階層は戦闘終了で解除
    gameData.battleFloor = null;

    // 勝利していない場合は「進行待ち」を破棄
    if (!victory) {
      gameData.pendingFloorAfterWin = null;
    }

    if (victory) {
      gameData.player.hp = gameData.player.maxHp;
    }

    requestAutosave();
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
      try {
        checkAdvancedJobUnlocks(false);
      } catch (e) {}
    }

    updateUI();
  }

  function getExpNeeded() {
    return Math.floor(100 * Math.pow(1.2, gameData.player.level - 1));
  }

  // -------------------
  // 装備生成
  // -------------------

  // -------------------
  // 装備名のバリエーション（大量追加）
  // -------------------
  const NAME_PREFIX_BY_TIER = [
    // 0: 〜29F
    ["木製の", "鉄の", "革の", "粗末な", "古びた", "欠けた", "錆びた"],
    // 1: 30〜99F
    ["鋼の", "鍛えられた", "上質な", "精巧な", "銀の", "蒼の", "紅の"],
    // 2: 100〜199F
    ["秘銀の", "魔鉄の", "黒鋼の", "聖銀の", "紅鋼の", "氷晶の", "雷晶の"],
    // 3: 200〜349F
    ["神銅の", "星鉄の", "竜骨の", "深淵の", "白金の", "奈落の", "天穹の"],
    // 4: 350F〜
    [
      "神代の",
      "終焉の",
      "黎明の",
      "虚無の",
      "無限の",
      "天上の",
      "運命の",
      "原初の",
    ],
  ];

  const NAME_PREFIX_BY_RARITY = {
    common: [
      "ありふれた",
      "粗悪な",
      "欠けた",
      "錆びた",
      "古びた",
      "簡素な",
      "脆い",
    ],
    uncommon: [
      "頑丈な",
      "鋭利な",
      "軽量な",
      "扱いやすい",
      "改良された",
      "堅実な",
      "手馴れた",
    ],
    rare: [
      "灼熱の",
      "氷結の",
      "雷光の",
      "猛毒の",
      "影の",
      "聖なる",
      "呪われた",
      "疾風の",
      "岩砕きの",
      "吸血の",
      "浄化の",
    ],
    epic: [
      "竜殺しの",
      "覇王の",
      "幻影の",
      "星屑の",
      "古代の",
      "魔王の",
      "冥界の",
      "天翔ける",
      "禁断の",
      "黄昏の",
      "刻印の",
    ],
    legendary: [
      "神々しい",
      "終焉の",
      "原初の",
      "永劫の",
      "無限の",
      "世界樹の",
      "運命の",
      "絶対の",
      "全てを断つ",
      "万象の",
    ],
  };

  const NAME_PREFIX_BY_TYPE = {
    // 剣系
    sword: [
      "斬鉄の",
      "白刃の",
      "閃光の",
      "血塗られた",
      "月影の",
      "紅蓮の",
      "蒼氷の",
      "雷鳴の",
      "審判の",
      "破邪の",
      "魔断ちの",
    ],
    greatsword: ["巨刃の", "断罪の", "絶剣の", "破壊の", "山裂きの"],
    katana: ["抜刀の", "居合の", "月詠みの", "風切りの", "白鞘の"],
    dagger: ["影縫いの", "暗殺者の", "毒牙の", "疾刃の", "小悪魔の"],
    // 斧/槍/鈍器
    handaxe: ["猟師の", "伐採の", "血戦の", "荒々しい", "野性の"],
    axe: ["山裂きの", "粉砕の", "屠殺の", "狂戦士の", "轟雷の"],
    spear: ["貫通の", "竜槍の", "葬送の", "槍風の", "白銀の"],
    mace: ["聖打の", "裁きの", "祈りの", "浄化の", "司祭の"],
    hammer: ["粉砕の", "地割れの", "巨人の", "絶槌の", "轟炎の"],
    // 遠距離/魔法
    bow: ["狙撃の", "風矢の", "森の", "蒼天の", "月狩りの"],
    crossbow: ["精密な", "連射の", "機巧の", "要塞の", "黒鉄の"],
    staff: ["賢者の", "秘術の", "星詠みの", "魔導の", "古文書の"],
    wand: ["詠唱の", "術式の", "精霊の", "魔弾の", "星屑の"],
    holy_staff: ["聖歌の", "祝福の", "救済の", "光輝の", "大聖堂の"],

    // 防具
    armor: ["守護の", "城壁の", "堅牢な", "王国の", "鉄壁の"],
    light_armor: ["俊敏な", "軽やかな", "旅人の", "狩人の", "疾風の"],
    heavy_armor: ["不動の", "重厚な", "要塞の", "鉄壁の", "巨人の"],
    shield: ["守護者の", "不屈の", "城塞の", "反射の", "護りの"],
    buckler: ["回避の", "軽快な", "曲芸師の", "舞踏の", "黒檀の"],
    tower_shield: ["絶壁の", "城塞の", "要塞の", "不落の", "巨盾の"],
    helmet: ["鉄頭の", "戦士の", "古代の", "獅子の", "竜鱗の"],
    circlet: ["叡智の", "集中の", "霊視の", "秘宝の", "王冠の"],
    boots: ["疾走の", "跳躍の", "静音の", "旅人の", "風切りの"],
    gloves: ["精密な", "匠の", "強打の", "手練の", "剛拳の"],
    bracers: ["守りの", "回避の", "護腕の", "鉄腕の", "星鉄の"],
    robe: ["魔術師の", "法衣の", "星衣の", "禁呪の", "叡智の"],
    cloak: ["隠密の", "影歩きの", "迷彩の", "夜霧の", "月影の"],
    mantle: ["疾風の", "守護の", "蒼天の", "黄昏の", "深淵の"],

    // アクセ
    ring: ["幸運の", "守護の", "加護の", "奪取の", "誓いの"],
    belt: ["剛力の", "堅牢な", "鍛錬の", "戦備の", "旅人の"],
    charm: ["守札の", "加護の", "招福の", "厄除けの", "霊験の"],
    talisman: ["封魔の", "退魔の", "護符の", "結界の", "鎮魂の"],
    earrings: ["聴覚の", "集中の", "精霊の", "星屑の", "煌めく"],
    necklace: ["誓約の", "守護の", "宝飾の", "星の", "聖歌の"],
    pendant: ["深淵の", "月影の", "導きの", "祝福の", "記憶の"],
    bracelet: ["剛力の", "俊敏の", "護腕の", "魔導の", "鍛錬の"],
    brooch: ["華麗な", "栄光の", "王家の", "祈りの", "薔薇の"],
    anklet: ["疾走の", "静音の", "風切りの", "跳躍の", "旅人の"],
    mask: ["仮面の", "隠密の", "幻影の", "無貌の", "夜霧の"],
    orb: ["宝珠の", "霊光の", "星詠みの", "禁呪の", "叡智の"],
    relic: ["古代の", "遺物の", "封印の", "啓示の", "大地の"],
    sigil: ["紋章の", "刻印の", "結界の", "盟約の", "鎮魂の"],
    medal: ["勲章の", "栄誉の", "武勲の", "騎士の", "将軍の"],
    charmstone: ["霊石の", "護りの", "招福の", "加護の", "厄除けの"],
    mirror_shard: ["鏡片の", "反射の", "虚像の", "映し身の", "月映えの"],
  };

  function floorTier(floor) {
    const f = Number(floor) || 1;
    if (f < 30) return 0;
    if (f < 100) return 1;
    if (f < 200) return 2;
    if (f < 350) return 3;
    return 4;
  }

  function pick(list) {
    if (!Array.isArray(list) || list.length === 0) return "";
    return list[Math.floor(Math.random() * list.length)];
  }

  function decorateEquipmentName(baseName, typeKey, category, rarity, floor) {
    const pool = [];
    const tier = floorTier(floor);

    // 階層帯の素材感
    pool.push(...(NAME_PREFIX_BY_TIER[tier] || []));

    // レアリティの雰囲気
    pool.push(...(NAME_PREFIX_BY_RARITY[rarity] || []));

    // タイプ固有の味
    if (NAME_PREFIX_BY_TYPE[typeKey])
      pool.push(...NAME_PREFIX_BY_TYPE[typeKey]);

    // 保険（何も無い場合）
    if (pool.length === 0) return baseName;

    // 低レアは地味が出やすい、上に行くほど派手が出やすい
    let prefix = "";
    if (rarity === "common") {
      prefix =
        Math.random() < 0.7 ? pick(NAME_PREFIX_BY_RARITY.common) : pick(pool);
    } else if (rarity === "uncommon") {
      prefix =
        Math.random() < 0.55
          ? pick(NAME_PREFIX_BY_RARITY.uncommon)
          : pick(pool);
    } else if (rarity === "rare") {
      prefix =
        Math.random() < 0.35 ? pick(NAME_PREFIX_BY_RARITY.rare) : pick(pool);
    } else if (rarity === "epic") {
      prefix =
        Math.random() < 0.4 ? pick(NAME_PREFIX_BY_RARITY.epic) : pick(pool);
    } else {
      prefix =
        Math.random() < 0.5
          ? pick(NAME_PREFIX_BY_RARITY.legendary)
          : pick(pool);
    }

    // まれに称号を付ける（雰囲気アップ）
    let suffix = "";
    if (rarity === "epic" && Math.random() < 0.15) suffix = "・真";
    if (rarity === "legendary" && Math.random() < 0.25) suffix = "・極";
    if (!suffix && floor >= 100 && Math.random() < 0.08) suffix = "・改";

    // prefixは「〇〇の / 〇〇な / 〇〇」などを想定（そのまま連結する）
    return `${prefix}${baseName}${suffix}`;
  }

  // -------------------
  // 装飾品効果：フロア/レア度でスケール
  // -------------------
  const ACCESSORY_RARITY_MULT = {
    common: 1.0,
    uncommon: 1.08,
    rare: 1.2,
    epic: 1.38,
    legendary: 1.6,
  };

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /**
   * 装飾品効果の数値を、フロアとレア度でスケールして返す。
   * - 低層：控えめ
   * - 高層：強め（ただし過剰に暴れないようにタイプ別に上限）
   * @param {string} type
   * @param {number} base
   * @param {number} floor
   * @param {string} rarity
   * @returns {number}
   */
  function scaleAccessoryEffectValue(type, base, floor, rarity) {
    const f = clamp(Math.floor(Number(floor) || 1), 1, 500);
    const rMul = ACCESSORY_RARITY_MULT[rarity] || 1.0;

    // フロア補正（1.0〜2.25）
    const floorMul = 1 + ((f - 1) / 499) * 1.25;

    // 基本の伸び（タイプ別で伸び幅を変える）
    const raw = floorMul * rMul;

    // パーセンテージ系は伸びを少し抑える
    const pctMul = 1 + (raw - 1) * 0.7;

    // 例外：段階（整数）で伸ばしたいもの
    if (type === "cooldownReduction") {
      // 1 → 2/3 くらいまで（高層・高レアで強い）
      let v = 1;
      if (f >= 200) v++;
      if (f >= 420) v++;
      if (rarity === "epic") v++;
      if (rarity === "legendary") v++;
      return clamp(v, 1, 3);
    }

    // 索敵は上げすぎると上限(30%)にすぐ届くので控えめ＆上限
    if (type === "search") {
      const v = Math.round(base * (1 + (raw - 1) * 0.55));
      return clamp(v, 1, 12);
    }

    // 伸びを強めたい（数値が小さくなりがちな）系
    const flatTypes = new Set([
      "evasion",
      "accuracy",
      "critRate",
      "maxHpBonus",
      "attackBonus",
      "defenseBonus",
      "magicPower",
      "healPower",
      "multiStrikeChance",
      "counterChance",
      "hitHeal",
      "evadeHeal",
    ]);

    let v;
    if (flatTypes.has(type)) {
      v = Math.round(base * raw);
    } else {
      v = Math.round(base * pctMul);
    }

    // タイプ別の上限（暴れ防止）
    if (type === "damageReduction") v = clamp(v, 0, 80);
    if (type === "ailmentDurationDown") v = clamp(v, 0, 80);

    if (type === "lifeSteal") v = clamp(v, 0, 25);
    if (type === "regen") v = clamp(v, 0, 12);
    if (type === "critDamage") v = clamp(v, 0, 200);

    if (type === "multiStrikeChance") v = clamp(v, 0, 60);
    if (type === "multiStrikeDamage") v = clamp(v, 0, 150);
    if (type === "hitHeal") v = clamp(v, 0, 200);
    if (type === "counterChance") v = clamp(v, 0, 45);
    if (type === "counterDamage") v = clamp(v, 0, 200);
    if (type === "desperationDamage") v = clamp(v, 0, 200);
    if (type === "executeDamage") v = clamp(v, 0, 200);
    if (type === "evadeHeal") v = clamp(v, 0, 200);

    if (type === "dropRate") v = clamp(v, 0, 150);
    if (type === "expBonus") v = clamp(v, 0, 250);
    if (type === "skillPower") v = clamp(v, 0, 250);
    if (type === "healReceived") v = clamp(v, 0, 250);
    if (type === "herbPower") v = clamp(v, 0, 350);

    // 耐性は最大90%（core側でも90で丸めているが、作成時点でも合わせる）
    if (
      type === "poisonResist" ||
      type === "burnResist" ||
      type === "bleedResist" ||
      type === "stunResist" ||
      type === "slowResist" ||
      type === "vulnerableResist" ||
      type === "silenceResist" ||
      type === "accuracyDownResist"
    ) {
      v = clamp(v, 0, 90);
    }

    // 最低1（0の意味があるものは上のclampで許容）
    if (base > 0) v = Math.max(1, v);
    return v;
  }

  function makeScaledAccessoryEffect(effect, floor, rarity) {
    const e = { ...effect };
    if (typeof e.value === "number" && Number.isFinite(e.value)) {
      e.value = scaleAccessoryEffectValue(e.type, e.value, floor, rarity);
    }
    return e;
  }

  function generateEquipment() {
    const floor = getScalingFloor();

    // カテゴリー選択
    const categories = ["weapon", "armor", "accessory"];
    const category = categories[Math.floor(Math.random() * categories.length)];

    let typeOptions = [];
    for (let key in equipTypes) {
      if (equipTypes[key].category === category) typeOptions.push(key);
    }

    const typeKey = typeOptions[Math.floor(Math.random() * typeOptions.length)];
    const type = equipTypes[typeKey];

    const rarity = getRarity(floor);

    const item = {
      baseName: type.name,
      name: decorateEquipmentName(type.name, typeKey, category, rarity, floor),
      type: typeKey,
      category: type.category,
      hands: type.hands,
      rarity,
      locked: false,
    };

    // UI表示用（固有能力/ランダムオプションの内訳）
    item.fixedEffects = [];
    item.randomOptionDetails = [];

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

      // 杖/金棒など：攻撃力とは別に、魔法攻撃力/回復力を持てる
      if (typeof bias.magicAttackMult !== "undefined") {
        const baseMagic = statBase * (1 + Math.random() * 0.6);
        const mm = getBias("magicAttackMult", 1);
        item.magicAttack = Math.round(baseMagic * mm);
      }
      if (typeof bias.healPowerMult !== "undefined") {
        const baseHeal = statBase * (1 + Math.random() * 0.6);
        const hm = getBias("healPowerMult", 1);
        item.healPower = Math.round(baseHeal * hm);
      }

      // 命中（マイナスもあり）
      if (typeof bias.accuracy !== "undefined") {
        item.accuracy = Math.round(getBias("accuracy", 0));
      } else {
        item.accuracy = Math.round(5 + floor * 0.5);
      }

      // 武器でも追加ステータスを持てる（例：杖の防御など）
      if (typeof bias.defense !== "undefined")
        item.defense = Math.round(getBias("defense", 0));
      if (typeof bias.evasion !== "undefined")
        item.evasion = Math.round(getBias("evasion", 0));
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
      if (typeof bias.accuracy !== "undefined")
        item.accuracy = Math.round(getBias("accuracy", 0));
    } else {
      item.effects = [];
      const numEffects = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numEffects; i++) {
        const effect =
          accessoryEffects[Math.floor(Math.random() * accessoryEffects.length)];
        item.effects.push(makeScaledAccessoryEffect(effect, floor, rarity));
      }

      // 生成時の参照（将来の再計算やデバッグ用。UIには出さない）
      item.generatedFloor = floor;

      // UI表示用：アクセサリーは効果=ランダムオプション
      item.randomOptionDetails = (Array.isArray(item.effects) ? item.effects : []).map((eff) => ({ kind: "effect", effect: eff }));
    }

        // ランダムオプション（表示の「+」＝オプション数）
    // - UI側で「装備固有能力 / ランダムオプション」を分けて表示できるよう、内訳も保持する
    let optionCount = 0;

    if (!Array.isArray(item.fixedEffects)) item.fixedEffects = [];
    if (!Array.isArray(item.randomOptionDetails)) item.randomOptionDetails = [];

    // アクセサリー：効果数＝オプション数（effects と同じ）
    if (category === "accessory") {
      optionCount = Array.isArray(item.effects) ? item.effects.length : 0;
      // 念のため、randomOptionDetails を effects と同期
      item.randomOptionDetails = (Array.isArray(item.effects) ? item.effects : []).map((eff) => ({ kind: "effect", effect: eff }));
      item.randomOptions = optionCount;
    } else {
      // 武器/防具：追加で付く強化/効果の回数をオプション数として扱う
      optionCount = Math.min(5, Math.floor(Math.random() * (1 + floor / 5)));

      // 付与された内訳を列挙する（UI用）
      item.randomOptionDetails = [];

      for (let i = 0; i < optionCount; i++) {
        if (Math.random() < 0.5) {
          /** @type {Record<string, number>} */
          const deltas = {};
          if (item.attack) {
            const d = Math.round(statBase * 0.2);
            item.attack += d;
            deltas.attack = d;
          }
          if (item.defense) {
            const d = Math.round(statBase * 0.2);
            item.defense += d;
            deltas.defense = d;
          }
          if (Object.keys(deltas).length) {
            item.randomOptionDetails.push({ kind: "stat", deltas });
          } else {
            // 保険：何も増えない場合でも、オプション回数としてはカウントする
            item.randomOptionDetails.push({ kind: "stat", deltas: {} });
          }
        } else {
          if (!item.effects) item.effects = [];
          const eff = accessoryEffects[Math.floor(Math.random() * accessoryEffects.length)];
          const scaledEff = makeScaledAccessoryEffect(eff, floor, rarity);
          const finalEff = {
            ...scaledEff,
            value: Math.round((Number(scaledEff.value) || 0) * 0.5),
          };
          item.effects.push(finalEff);
          item.randomOptionDetails.push({ kind: "effect", effect: finalEff });
        }
      }

      item.randomOptions = item.randomOptionDetails.length;
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
})();
