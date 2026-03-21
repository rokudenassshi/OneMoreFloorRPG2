// ===================
// コアロジック（分割: core）
// ===================

(function () {
  "use strict";

  // -------------------
  // テスト用：階層上限
  // -------------------
  // 通常時は250階層で頭打ち。
  // 上限解放シリアル入力時は 5001 階層まで進行可能。
  const DEFAULT_FLOOR_CAP = 250;
  const UNLOCKED_FLOOR_CAP = 5001;
  const SERIAL_UNLOCK_STORE_KEY = "omf_serial_unlocks_v1";
  const BASE_EVASION_CAP = 70;
  const MAX_EVASION_CAP = 90;

  function isFloorCapLiftUnlocked() {
    const p = gameData && gameData.player;
    if (
      p &&
      p.serialUnlocks &&
      typeof p.serialUnlocks === "object" &&
      p.serialUnlocks.floorCapLift250
    ) {
      return true;
    }

    try {
      const raw = localStorage.getItem(SERIAL_UNLOCK_STORE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      return !!(obj && typeof obj === "object" && obj.floorCapLift250);
    } catch (e) {
      return false;
    }
  }

  function isStayBattleUnlocked() {
    const p = gameData && gameData.player;
    if (
      p &&
      p.serialUnlocks &&
      typeof p.serialUnlocks === "object" &&
      p.serialUnlocks.stayBattle
    ) {
      return true;
    }

    try {
      const raw = localStorage.getItem(SERIAL_UNLOCK_STORE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      return !!(obj && typeof obj === "object" && obj.stayBattle);
    } catch (e) {
      return false;
    }
  }

  function getCurrentFloorCap() {
    return isFloorCapLiftUnlocked() ? UNLOCKED_FLOOR_CAP : DEFAULT_FLOOR_CAP;
  }

  /**
   * 階層を正規化する（1以上、現在の上限までに丸める）
   * @param {number} n
   * @returns {number}
   */
  function clampFloor(n) {
    const f = Math.max(1, Math.floor(Number(n || 1)));
    const floorCap = getCurrentFloorCap();
    if (Number.isFinite(floorCap) && floorCap > 0) {
      return Math.min(floorCap, f);
    }
    return f;
  }

  // data/jobs.js は window.jobs に職業定義を載せる。
  // 読み込み順や環境差で識別子 `jobs` が存在しないケースがあるため、
  // ここで必ず参照先を確保して ReferenceError を防ぐ。
  const jobs = window.jobs || window.JOBS || {};
  // -------------------
  // 状態異常: 追加ルール
  // -------------------
  // 毒：最大HP割合ダメージ（敵ターン開始時に1回）
  const POISON_MAXHP_RATE = 0.03; // 3%
  // 火傷：回復量が減少（回復時に適用）
  const BURN_HEAL_MULT = 0.6; // 60%（=40%減少）
  // 火傷：継続ダメージ（敵ターン開始時に1回、長めに継続）
  const BURN_DOT_MAXHP_RATE = 0.015; // 最大HPの1.5%
  const DEFAULT_BURN_TURNS = 6;
  // 出血：継続ダメージ（最大HP割合。敵/プレイヤー共通で使用）
  const BLEED_DOT_MAXHP_RATE = 0.02; // 最大HPの2%

  // -------------------
  // 貴重品（秘宝）：所持ボーナス
  // -------------------
  // 敵を倒すと 1/1000 の確率でドロップ
  const RELIC_DROP_CHANCE = 0.001;
  const RELIC_FAMILY_NAME = "秘宝";
  const MAP_FRAGMENT_ID = "ancient_map_fragment";
  const MAP_FRAGMENT_BASE_NAME = "謎のかけら";
  const MAP_FRAGMENT_READY_NAME = "修羅の国への鍵";
  const MAP_FRAGMENT_DROP_CHANCE = 0.0000001;
  const MAP_FRAGMENT_MAX_STACK_FOR_DROP = 5;
  const MAX_BATTLE_ACTIONS_BEFORE_ESCAPE = 50;
  const ASURA_ITEM_STAT_MULTIPLIER = 1.5;
  const ASURA_ITEM_BASE_FLOOR_OFFSET = Math.round(5 + 5000 * 2.5);

  const RELIC_DEFS = [
    { id: "emblem_strength", name: "力の紋章", statKey: "strength" },
    { id: "emblem_vitality", name: "体力の紋章", statKey: "vitality" },
    { id: "emblem_intelligence", name: "賢さの紋章", statKey: "intelligence" },
    { id: "emblem_agility", name: "素早さの紋章", statKey: "agility" },
    { id: "emblem_dexterity", name: "器用さの紋章", statKey: "dexterity" },
  ];

  const MAP_FRAGMENT_DEF = {
    id: MAP_FRAGMENT_ID,
    name: MAP_FRAGMENT_BASE_NAME,
    statKey: "",
    description: "5つ集めると・・・",
  };

  function getMapFragmentDisplayName(count) {
    const n = Number(count || 0);
    return n >= MAP_FRAGMENT_MAX_STACK_FOR_DROP
      ? MAP_FRAGMENT_READY_NAME
      : MAP_FRAGMENT_BASE_NAME;
  }

  function getValuableCountById(p, id) {
    if (!p || !Array.isArray(p.valuables) || typeof id !== "string" || !id)
      return 0;
    const found = p.valuables.find((v) => v && v.id === id);
    const cnt = Number(found?.count || 0);
    if (!Number.isFinite(cnt) || cnt <= 0) return 0;
    return Math.floor(cnt);
  }

  function ensureValuables(p) {
    if (!p || typeof p !== "object") return;
    if (!Array.isArray(p.valuables)) p.valuables = [];
  }

  function ensureAutoSellConfig(p) {
    if (!p || typeof p !== "object") return;
    const base = {
      armorDefenseMax: 0,
      weaponAttackMax: 0,
      weaponHealPowerMax: 0,
      weaponMagicAttackMax: 0,
    };
    const src = p.autoSell && typeof p.autoSell === "object" ? p.autoSell : {};
    p.autoSell = {
      armorDefenseMax: Math.max(
        0,
        Math.floor(Number(src.armorDefenseMax || 0)),
      ),
      weaponAttackMax: Math.max(
        0,
        Math.floor(Number(src.weaponAttackMax || 0)),
      ),
      weaponHealPowerMax: Math.max(
        0,
        Math.floor(Number(src.weaponHealPowerMax || 0)),
      ),
      weaponMagicAttackMax: Math.max(
        0,
        Math.floor(Number(src.weaponMagicAttackMax || 0)),
      ),
    };
    for (const k of Object.keys(base)) {
      if (!(k in p.autoSell)) p.autoSell[k] = base[k];
    }
  }

  function ensureAutoAllocateExpUpConfig(p) {
    if (!p || typeof p !== "object") return;
    p.autoAllocateExpUp = !!p.autoAllocateExpUp;
  }

  function ensureAutoAllocateStatPointsConfig(p) {
    if (!p || typeof p !== "object") return;
    p.autoAllocateStatPoints = !!p.autoAllocateStatPoints;

    const allowed = [
      "strength",
      "vitality",
      "intelligence",
      "agility",
      "dexterity",
    ];
    const target =
      typeof p.autoAllocateStatTarget === "string"
        ? p.autoAllocateStatTarget
        : "";
    p.autoAllocateStatTarget = allowed.includes(target) ? target : "strength";
  }

  function ensureSerialOptionsConfig(p) {
    if (!p || typeof p !== "object") return;
    const src =
      p.serialOptions && typeof p.serialOptions === "object"
        ? p.serialOptions
        : {};
    p.serialOptions = {
      stayBattleCurrentFloor: !!src.stayBattleCurrentFloor,
    };
  }

  function ensureWorldStateConfig(p) {
    if (!p || typeof p !== "object") return;
    const src =
      p.worldState && typeof p.worldState === "object" ? p.worldState : {};
    const toFloor = (v, fallback = 1) =>
      Math.max(1, Math.floor(Number(v || fallback)));
    p.worldState = {
      isAsura: !!src.isAsura,
      hasVisitedAsura: !!src.hasVisitedAsura,
      normalFloor: toFloor(src.normalFloor, p.floor || gameData?.floor || 1),
      normalMaxReachedFloor: toFloor(
        src.normalMaxReachedFloor,
        p.maxReachedFloor || 1,
      ),
      asuraFloor: toFloor(src.asuraFloor, 1),
      asuraMaxReachedFloor: toFloor(src.asuraMaxReachedFloor, 1),
    };
  }

  function isInAsuraWorld() {
    return !!gameData?.player?.worldState?.isAsura;
  }

  function getWorldAwareFloorForScaling() {
    const p = gameData?.player;
    const ws = p?.worldState;
    if (!p || !ws) return null;

    if (
      gameData?.gameState === "BATTLE" &&
      Number.isFinite(Number(gameData?.battleFloor))
    ) {
      const battleFloor = Math.max(1, Math.floor(Number(gameData.battleFloor)));
      if (ws.isAsura) return ASURA_ITEM_BASE_FLOOR_OFFSET + battleFloor;
      return battleFloor;
    }

    if (ws.isAsura) {
      const f = Number(gameData?.floor || ws.asuraFloor || 1);
      return ASURA_ITEM_BASE_FLOOR_OFFSET + Math.max(1, Math.floor(f));
    }

    const f = Number(gameData?.floor || ws.normalFloor || 1);
    return Math.max(1, Math.floor(f));
  }

  function normalizeValuables(p) {
    ensureValuables(p);
    p.valuables = p.valuables
      .filter((v) => v && typeof v === "object")
      .map((v) => {
        const id = typeof v.id === "string" ? v.id : "";
        const def =
          RELIC_DEFS.concat([MAP_FRAGMENT_DEF]).find((d) => d.id === id) ||
          null;
        const count = Number(v.count || 0);
        const desc =
          typeof v.description === "string" && v.description
            ? v.description
            : def && typeof def.description === "string"
              ? def.description
              : "";
        return {
          id: def ? def.id : id,
          name:
            id === MAP_FRAGMENT_ID
              ? getMapFragmentDisplayName(count)
              : typeof v.name === "string" && v.name
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
          description: desc,
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
      found.name =
        def.id === MAP_FRAGMENT_ID
          ? getMapFragmentDisplayName(found.count)
          : def.name;
      found.statKey = def.statKey;
      found.description =
        typeof def.description === "string" && def.description
          ? def.description
          : "";
    } else {
      p.valuables.push({
        id: def.id,
        name:
          def.id === MAP_FRAGMENT_ID
            ? getMapFragmentDisplayName(add)
            : def.name,
        statKey: def.statKey,
        description:
          typeof def.description === "string" && def.description
            ? def.description
            : "",
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
   * 紋章（貴重品）によるステータス加算値を返す（UI表示用）
   * ※格闘家系の「武器未装備で基礎ステ2倍」が有効な場合は、紋章分も2倍で返す
   * @returns {{strength:number, vitality:number, intelligence:number, agility:number, dexterity:number}}
   */
  function getEmblemBonus() {
    const p = gameData && gameData.player ? gameData.player : null;
    const raw = getValuableStatBonus(p);

    const jobDef = jobs && p && p.job && jobs[p.job] ? jobs[p.job] : null;
    const isMonkFamily = !!(
      p &&
      (p.job === "monk" || (jobDef && jobDef.baseJob === "monk"))
    );
    if (isMonkFamily) {
      const eq = p && p.equipment ? p.equipment : {};
      const unarmed = [eq.slot1, eq.slot2].every(
        (it) => !it || it.category !== "weapon",
      );
      if (unarmed) {
        return {
          strength: (raw.strength || 0) * 2,
          vitality: (raw.vitality || 0) * 2,
          intelligence: (raw.intelligence || 0) * 2,
          agility: (raw.agility || 0) * 2,
          dexterity: (raw.dexterity || 0) * 2,
        };
      }
    }
    return {
      strength: raw.strength || 0,
      vitality: raw.vitality || 0,
      intelligence: raw.intelligence || 0,
      agility: raw.agility || 0,
      dexterity: raw.dexterity || 0,
    };
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
    const worldAwareFloor = getWorldAwareFloorForScaling();
    if (
      Number.isFinite(Number(worldAwareFloor)) &&
      Number(worldAwareFloor) > 0
    ) {
      return Math.max(1, Math.floor(Number(worldAwareFloor)));
    }

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
  const AUTOSAVE_INTERVAL_MS = 5000;
  const REQUEST_AUTOSAVE_DEBOUNCE_MS = 5000;
  const MIN_CLOUD_SAVE_INTERVAL_MS = 30000;

  const AUTOSAVE_ENABLED_KEY = "one_more_floor_rpg_autosave_enabled_v1";
  const CLOUD_SAVE_FUNCTION_LOAD = "loadUserGameData";
  const CLOUD_SAVE_FUNCTION_SAVE = "saveUserGameData";
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
    if (autosaveEnabled) autosaveDirty = true;
    try {
      localStorage.setItem(AUTOSAVE_ENABLED_KEY, autosaveEnabled ? "1" : "0");
    } catch (e) {}
  }

  let pendingAutosaveTimer = null;
  let pendingThrottledSaveTimer = null;
  let autosaveDirty = true;
  let cloudSaveInFlight = false;
  let cloudSaveQueued = false;
  let lastCloudSaveAt = 0;

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

  function savePayloadToLocalCache(payload) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadPayloadFromLocalCache() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== SAVE_SCHEMA) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function applySavePayload(payload) {
    if (!payload || payload.schema !== SAVE_SCHEMA) return false;

    gameData.floor = clampFloor(payload.floor || 1);
    gameData.gameState = payload.gameState || "EXPLORE";
    gameData.player = payload.player || gameData.player;
    gameData.enemy = payload.enemy || null;
    gameData.battleFloor =
      payload.battleFloor != null ? payload.battleFloor : null;
    gameData.pendingFloorAfterWin =
      payload.pendingFloorAfterWin != null
        ? payload.pendingFloorAfterWin
        : null;

    ensureAutoSellConfig(gameData.player);
    ensureAutoAllocateExpUpConfig(gameData.player);
    ensureAutoAllocateStatPointsConfig(gameData.player);
    ensureSerialOptionsConfig(gameData.player);
    ensureWorldStateConfig(gameData.player);
    // テスト上限を越えたセーブが来ても破綻しないように丸める
    try {
      if (gameData && gameData.player) {
        gameData.player.maxReachedFloor = clampFloor(
          Number(gameData.player.maxReachedFloor || gameData.floor || 1),
        );
      }
      if (Number.isFinite(Number(gameData.battleFloor))) {
        gameData.battleFloor = clampFloor(gameData.battleFloor);
      }
      if (Number.isFinite(Number(gameData.pendingFloorAfterWin))) {
        gameData.pendingFloorAfterWin = clampFloor(
          gameData.pendingFloorAfterWin,
        );
      }
    } catch (e) {
      // no-op
    }
    return true;
  }

  async function saveGameNow(opts = {}) {
    try {
      const manual = !!(opts && opts.manual === true);
      if (!autosaveEnabled && !manual) return false;
      if (!autosaveDirty && !manual) return false;
      const force = !!(opts && opts.force === true);
      const authBridge = window.firebaseAuthBridge || null;
      const currentUser =
        authBridge && typeof authBridge.getCurrentUser === "function"
          ? authBridge.getCurrentUser()
          : null;
      if (!currentUser) {
        const payload = buildSavePayload();
        const cached = savePayloadToLocalCache(payload);
        if (cached) autosaveDirty = false;
        return cached;
      }

      const elapsedSinceLastSave = Date.now() - lastCloudSaveAt;
      if (!force && elapsedSinceLastSave < MIN_CLOUD_SAVE_INTERVAL_MS) {
        if (!pendingThrottledSaveTimer) {
          const delay = Math.max(
            0,
            MIN_CLOUD_SAVE_INTERVAL_MS - elapsedSinceLastSave,
          );
          pendingThrottledSaveTimer = setTimeout(() => {
            pendingThrottledSaveTimer = null;
            saveGameNow();
          }, delay);
        }
        return;
      }

      if (cloudSaveInFlight) {
        cloudSaveQueued = true;
        return false;
      }

      const payload = buildSavePayload();
      autosaveDirty = false;

      const functionsInstance = window.firebaseFunctions || null;
      const httpsCallableFactory = window.firebaseHttpsCallable || null;
      if (!functionsInstance || typeof httpsCallableFactory !== "function") {
        autosaveDirty = true;
        return false;
      }

      cloudSaveInFlight = true;
      const saveUserGameData = httpsCallableFactory(
        functionsInstance,
        CLOUD_SAVE_FUNCTION_SAVE,
      );
      try {
        await saveUserGameData({ payload });
        lastCloudSaveAt = Date.now();
      } finally {
        cloudSaveInFlight = false;
      }

      if (cloudSaveQueued) {
        cloudSaveQueued = false;
        if (autosaveDirty) saveGameNow();
      }
      return true;
    } catch (e) {
      autosaveDirty = true;
      return false;
    }
  }

  function requestAutosave() {
    if (!autosaveEnabled) return;
    autosaveDirty = true;
    if (pendingAutosaveTimer) return;
    pendingAutosaveTimer = setTimeout(() => {
      pendingAutosaveTimer = null;
      saveGameNow();
    }, REQUEST_AUTOSAVE_DEBOUNCE_MS);
  }

  async function loadGameIfExists() {
    try {
      const authBridge = window.firebaseAuthBridge || null;
      const currentUser =
        authBridge && typeof authBridge.getCurrentUser === "function"
          ? authBridge.getCurrentUser()
          : null;
      if (!currentUser) {
        const cachedPayload = loadPayloadFromLocalCache();
        if (!cachedPayload) return false;
        return applySavePayload(cachedPayload);
      }

      const functionsInstance = window.firebaseFunctions || null;
      const httpsCallableFactory = window.firebaseHttpsCallable || null;
      if (!functionsInstance || typeof httpsCallableFactory !== "function") {
        return false;
      }

      const loadUserGameData = httpsCallableFactory(
        functionsInstance,
        CLOUD_SAVE_FUNCTION_LOAD,
      );
      const response = await loadUserGameData({});
      const data = response && response.data ? response.data : null;
      if (!data || !data.hasSave || !data.payload) return false;
      const payload = data.payload;
      return applySavePayload(payload);
    } catch (e) {
      return false;
    }
  }

  // -------------------
  // 装備UID（永続化用）
  // ※ロード時の互換補正は行わない（リリース前のため）
  // -------------------
  let uidSeed = 0;

  function generateUid() {
    uidSeed = (uidSeed + 1) >>> 0;
    return `i_${Date.now().toString(36)}_${uidSeed.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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
      const isHiddenUnlock = !!unlock.hidden;
      const unlocked = isHiddenUnlock
        ? !!p.unlockedJobs[key]
        : !!p.unlockedJobs[key] ||
          (levelOk && cur >= Number(unlock.target || 0));

      // 条件（レベル + カウント）を満たした瞬間に解放フラグを立てる
      if (unlocked && !p.unlockedJobs[key]) {
        p.unlockedJobs[key] = true;
        if (!silent) {
          log(`✨ 上級職「${jd.name}」が解放された！`);
        }
      }
    }
  }

  function toggleAsuraWorldByMapFragment() {
    const p = gameData && gameData.player ? gameData.player : null;
    if (!p) return { ok: false, reason: "no_player" };

    ensureWorldStateConfig(p);
    const ws = p.worldState;

    if (!ws.isAsura) {
      ws.normalFloor = Math.max(
        1,
        Math.floor(Number(gameData.floor || ws.normalFloor || 1)),
      );
      ws.normalMaxReachedFloor = Math.max(
        1,
        Math.floor(Number(p.maxReachedFloor || ws.normalMaxReachedFloor || 1)),
      );

      ws.isAsura = true;
      ws.hasVisitedAsura = true;
      gameData.floor = Math.max(1, Math.floor(Number(ws.asuraFloor || 1)));
      p.maxReachedFloor = Math.max(
        1,
        Math.floor(Number(ws.asuraMaxReachedFloor || 1)),
      );
      gameData.floor = clampFloor(gameData.floor);
      p.maxReachedFloor = clampFloor(p.maxReachedFloor);
      checkAndUnlockAchievements();
      return { ok: true, movedToAsura: true };
    }

    ws.asuraFloor = Math.max(
      1,
      Math.floor(Number(gameData.floor || ws.asuraFloor || 1)),
    );
    ws.asuraMaxReachedFloor = Math.max(
      1,
      Math.floor(Number(p.maxReachedFloor || ws.asuraMaxReachedFloor || 1)),
    );

    ws.isAsura = false;
    gameData.floor = Math.max(1, Math.floor(Number(ws.normalFloor || 1)));
    p.maxReachedFloor = Math.max(
      1,
      Math.floor(Number(ws.normalMaxReachedFloor || 1)),
    );
    gameData.floor = clampFloor(gameData.floor);
    p.maxReachedFloor = clampFloor(p.maxReachedFloor);
    checkAndUnlockAchievements();
    return { ok: true, movedToAsura: false };
  }

  // -------------------
  // 初期化
  // -------------------
  let __initDone = false;

  async function initGame() {
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

    autosaveEnabled = isAutosaveEnabled();

    ensureAutoSellConfig(gameData.player);
    ensureAutoAllocateExpUpConfig(gameData.player);
    ensureAutoAllocateStatPointsConfig(gameData.player);
    ensureSerialOptionsConfig(gameData.player);
    ensureWorldStateConfig(gameData.player);
    if (typeof window.promptGoogleLoginAtStart === "function") {
      try {
        await window.promptGoogleLoginAtStart();
      } catch (e) {}
    }

    const loaded = await loadGameIfExists();
    getCombatStats();

    if (loaded) {
      log("✅ オートセーブを読み込みました");
    } else {
      log("探索開始");
    }

    setInterval(() => {
      saveGameNow();
      if (typeof updateRecordsUI === "function") {
        const statusScreenEl = document.getElementById("statusScreen");
        const recordsTabEl = document.getElementById("tabRecords");
        const recordsVisible =
          !!statusScreenEl &&
          !!recordsTabEl &&
          statusScreenEl.style.display === "block" &&
          recordsTabEl.style.display === "block";
        if (recordsVisible) updateRecordsUI();
      }
    }, AUTOSAVE_INTERVAL_MS);

    applyUrlActions();

    updateUI();
  }

  function applyUrlActions() {
    let params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (e) {
      return;
    }

    if (!params.has("back")) return;

    // 非戦闘時：通常の移動ロジックを利用
    if (gameData.gameState === "EXPLORE") {
      move(-1);
      return;
    }

    // 戦闘時：URL指定は確定で離脱して1階層戻る
    if (gameData.gameState === "BATTLE") {
      const curBattleFloor = Number(gameData.battleFloor);
      const baseFloor =
        Number.isFinite(curBattleFloor) && curBattleFloor > 0
          ? curBattleFloor
          : Number(gameData.floor || 1);

      gameData.pendingFloorAfterWin = null;
      gameData.floor = clampFloor(baseFloor - 1);
      log(`↩ URL指定で${gameData.floor}階層へ戻った`);
      endBattle(false);
      requestAutosave();
    }
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
    const jobDef = jobs && p && p.job && jobs[p.job] ? jobs[p.job] : null;
    const jobBonus =
      jobDef && jobDef.bonuses
        ? jobDef.bonuses
        : {
            strength: 0,
            vitality: 0,
            intelligence: 0,
            agility: 0,
            dexterity: 0,
          };
    const relicBonus = getValuableStatBonus(p);

    const total = {
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

    // 基礎ステータス倍率（職業特性）
    // - 修羅など：traits.baseStatMultiplier を優先
    // - 格闘家系：武器を装備していない場合、基礎ステータスを2倍（従来仕様）
    {
      const jobTraits = (jobDef && jobDef.traits) || {};

      const eq = p.equipment || {};
      const unarmed = [eq.slot1, eq.slot2].every(
        (it) => !it || it.category !== "weapon",
      );

      let mult = 1;
      const m = Number(jobTraits.baseStatMultiplier);
      if (Number.isFinite(m) && m > 1) {
        mult = m;
        // 修羅は実績に応じて倍率を追加
        if (p.job === "asura") {
          mult += getAchievementAsuraBaseStatMultiplierBonus();
        }
      } else {
        const isMonkFamily =
          p.job === "monk" || (jobDef && jobDef.baseJob === "monk");
        if (isMonkFamily && unarmed) mult = 2;
      }

      if (mult !== 1) {
        total.strength *= mult;
        total.vitality *= mult;
        total.intelligence *= mult;
        total.agility *= mult;
        total.dexterity *= mult;
      }
    }
    return total;
  }

  // 得意武器/防具を装備している場合、装備の効果を少し強化する
  const FAVORED_EQUIP_MULTIPLIER = 1.2; // +20%

  function isFavoredEquip(item, favoredType) {
    if (!item) return false;
    if (!favoredType) return false;
    if (item.category === "accessory") return false;
    if (Array.isArray(favoredType)) return favoredType.includes(item.type);
    return item.type === favoredType;
  }

  function applyEquipBonuses(
    combat,
    item,
    favoredType,
    favoredMult = FAVORED_EQUIP_MULTIPLIER,
    slotKey = "",
  ) {
    if (!item) return;

    const mult = isFavoredEquip(item, favoredType) ? favoredMult : 1;

    // 片手武器2本（いわゆる二刀流）の後半優位を抑える
    // - 武器1本に対して装備枠が2つあるため、単純加算だと高層で「片手×2」が最適化されやすい
    // - 装備2側の武器を「オフハンド」とみなし、基礎攻撃値のみ控えめに反映する
    const eq = (gameData.player && gameData.player.equipment) || {};
    const slot1 = eq.slot1 || null;
    const slot2 = eq.slot2 || null;
    const isDualWield = !!(
      slot1 &&
      slot2 &&
      slot1.category === "weapon" &&
      slot2.category === "weapon" &&
      Number(slot1.hands || 0) === 1 &&
      Number(slot2.hands || 0) === 1
    );
    const offhandMult =
      isDualWield && slotKey === "slot2" && item.category === "weapon"
        ? 0.6
        : 1;

    if (item.attack) combat.attack += item.attack * mult * offhandMult;
    if (item.defense) combat.defense += item.defense * mult;
    if (item.accuracy) combat.accuracy += item.accuracy * mult;
    if (item.magicAttack) combat.magicPower += item.magicAttack * mult;
    if (item.healPower) combat.healPower += item.healPower * mult;
    // 防具の固有回避（%）
    if (item.evasion) combat.evasion += item.evasion * mult;

    // 条件付き効果（アクセ向け）に対応
    const hasWeapon = !!(
      (slot1 && slot1.category === "weapon") ||
      (slot2 && slot2.category === "weapon")
    );
    const hasArmor = !!(
      (slot1 && slot1.category === "armor") ||
      (slot2 && slot2.category === "armor")
    );
    const hasTwoHandedWeapon = !!(
      (slot1 && slot1.category === "weapon" && Number(slot1.hands) === 2) ||
      (slot2 && slot2.category === "weapon" && Number(slot2.hands) === 2)
    );

    const isCondActive = (eff) => {
      if (!eff || typeof eff !== "object") return true;
      const c = eff.cond || eff.condition;
      if (!c) return true;
      if (c === "unarmed") return !hasWeapon;
      if (c === "noArmor") return !hasArmor;
      if (c === "twoHanded") return hasTwoHandedWeapon;
      return true;
    };

    if (Array.isArray(item.effects)) {
      item.effects.forEach((eff) => {
        if (!eff) return;
        if (!isCondActive(eff)) return;

        // 武器/防具に付いた効果も、得意装備なら少しだけ強化
        if (eff.type === "critRate") combat.critRate += eff.value * mult;
        if (eff.type === "maxHpBonus") combat.maxHp += eff.value * mult;
        if (eff.type === "attackBonus") combat.attack += eff.value * mult;
        if (eff.type === "defenseBonus") combat.defense += eff.value * mult;
        if (eff.type === "accuracy") combat.accuracy += eff.value * mult;

        // 回避率は装飾品の効果から反映（防具固有回避は item.evasion で別処理）
        if (eff.type === "evasion" && item.category === "accessory") {
          combat.evasion += eff.value * mult;
        }

        if (eff.type === "magicPower") combat.magicPower += eff.value * mult;
        if (eff.type === "healPower") combat.healPower += eff.value * mult;

        // 索敵は装備種別によらず、補正はかけない（主に装飾品用）
        if (eff.type === "search") combat.search += eff.value;
      });
    }
  }

  // -------------------
  // 職固有の戦闘リソース/トリガー
  // -------------------
  function ensurePlayerBattleState() {
    const p = gameData.player || (gameData.player = {});
    if (!p.battleState || typeof p.battleState !== "object") p.battleState = {};
    return p.battleState;
  }

  function getPhysicalDefenseFactor(effect) {
    const bs = ensurePlayerBattleState();
    const base =
      effect && typeof effect.ignoreDef === "number" ? effect.ignoreDef : 0.5;
    const red = Number(bs.pierceDefFactorReduction || 0);
    // 防御適用率を下げるほど貫通が強い（下限0.1）
    return Math.max(0.1, base - (Number.isFinite(red) ? red : 0));
  }

  function resetPlayerBattleStateForBattle() {
    const bs = ensurePlayerBattleState();
    // 戦闘中のみ使う値
    bs.stance = 0; // 剣士：構え
    bs.qi = 0; // 格闘家：気
    bs.holy = 0; // 僧侶：聖力
    bs.axe = 0; // 斧使い：破壊衝動
    bs.nextCritTurns = 0; // 盗賊：ジャスト回避
    // 上級職/パッシブ用
    bs.rageStacks = 0; // 狂戦士：被弾で増える怒り
    bs.skillFollowUpChance = 0; // スキル追撃率（0-0.6）
    bs.followUpDamageMulBonus = 0; // 追撃ダメージ補正（+% / 0.0=なし）
    bs.followUpNoCrit = false; // 追撃は会心しない
    bs.followUpOnAttack = false; // 通常攻撃でも追撃判定
    bs.pierceDefFactorReduction = 0; // 物理：防御適用率を減らす（=貫通強化、0〜0.4）
    bs.lifeStealPctBonus = 0; // パッシブHP吸収（%）

    // 反撃/上限/ボーナス（getCombatStats のパッシブ集計で加算される）
    bs.counterChanceBonus = 0;
    bs.counterDamageBonus = 0;
    bs.stanceMaxBonus = 0;
    bs.qiMaxBonus = 0;
    bs.markMaxBonus = 0;
    bs.holyMaxBonus = 0;
    // 敵側マーク管理用（戦闘開始時にリセット）
    // enemy.status.arcaneMarkStacks を使う

    // --- 装飾品：戦闘用の追加リソース ---
    bs.barrier = 0; // 回復のあふれで得るバリア
    bs.deathAvoidUsed = false; // 「一度だけ死亡回避」使用済み
    bs.pursuitTriggeredThisAction = false; // 追撃のループ防止（1アクション1回）
    bs.firstHitPursuitUsed = false; // 初撃追撃の消費（戦闘中1回）
    return bs;
  }

  // -------------------
  // 装飾品：バリア/死亡回避/追撃 など
  // -------------------
  function beginPlayerAction() {
    const bs = ensurePlayerBattleState();
    bs.pursuitTriggeredThisAction = false;
  }

  function getPlayerBarrier() {
    const bs = ensurePlayerBattleState();
    const v = Number(bs.barrier || 0);
    return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }

  function setPlayerBarrier(v) {
    const bs = ensurePlayerBattleState();
    const n = Number(v);
    bs.barrier = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getMaxPlayerBarrier() {
    // value は「最大HPの%」。装飾品がない場合は0。
    const capPct = Number(getAccessoryBonus("overhealBarrierCap") || 0);
    if (!Number.isFinite(capPct) || capPct <= 0) return 0;
    const pct = clamp(capPct, 0, 60) / 100;
    const maxHp = Math.max(1, Math.round(gameData.player.maxHp || 1));
    return Math.max(0, Math.floor(maxHp * pct));
  }

  function applyPlayerHeal(baseHeal) {
    const heal = adjustHealByStatus(baseHeal);
    if (heal <= 0) return { healed: 0, barrierGained: 0 };

    const maxHp = Math.max(1, Math.round(gameData.player.maxHp || 1));
    const beforeHp = Math.round(gameData.player.hp || 0);
    const target = beforeHp + heal;
    const newHp = Math.min(maxHp, target);
    const overflow = Math.max(0, target - maxHp);
    gameData.player.hp = newHp;

    // 回復のあふれをバリア化（装飾品がある場合のみ）
    let barrierGained = 0;
    const maxBarrier = getMaxPlayerBarrier();
    if (overflow > 0 && maxBarrier > 0) {
      const cur = getPlayerBarrier();
      const space = Math.max(0, maxBarrier - cur);
      barrierGained = Math.min(space, overflow);
      if (barrierGained > 0) setPlayerBarrier(cur + barrierGained);
    }

    return { healed: Math.max(0, newHp - beforeHp), barrierGained };
  }

  function tryWarfiendLastStand() {
    if (gameData.gameState !== "BATTLE") return false;
    if (gameData.player.hp > 0) return false;
    if (String(gameData.player?.job || "") !== "warfiend") return false;

    const lv = Math.floor(
      Number(gameData.player?.skills?.warfiend_last_stand || 0),
    );
    if (!Number.isFinite(lv) || lv <= 0) return false;

    // スキル効果から確率を取得（将来の拡張用）
    let pct = 5;
    try {
      const def = skills && skills.warfiend_last_stand;
      if (def && typeof def.effect === "function") {
        const eff = def.effect(lv) || {};
        const v = Number(eff.lastStandChance ?? eff.value ?? eff.chance);
        if (Number.isFinite(v)) pct = v;
      }
    } catch (_e) {}

    pct = clamp(pct, 0, 100);
    if (Math.random() * 100 < pct) {
      gameData.player.hp = 1;
      log("🔥 不屈で踏みとどまった！");
      return true;
    }
    return false;
  }

  function tryDeathAvoidOnce() {
    if (gameData.gameState !== "BATTLE") return false;
    if (gameData.player.hp > 0) return false;
    const has = Number(getAccessoryBonus("deathAvoidOnce") || 0);
    if (!Number.isFinite(has) || has <= 0) return false;

    const bs = ensurePlayerBattleState();
    if (bs.deathAvoidUsed) return false;
    bs.deathAvoidUsed = true;
    // 踏みとどまる：HP1で復帰、バリアは消える
    gameData.player.hp = 1;
    setPlayerBarrier(0);
    log("💫 装飾品の加護で踏みとどまった！");
    return true;
  }

  function applyPlayerDamage(incoming, opts) {
    let dmg = Math.max(1, Math.round(Number(incoming) || 0));
    if (!Number.isFinite(dmg) || dmg <= 0)
      return { total: 0, barrierUsed: 0, hpDamage: 0 };

    const beforeBarrier = getPlayerBarrier();
    const used = Math.min(beforeBarrier, dmg);
    if (used > 0) setPlayerBarrier(beforeBarrier - used);

    const remaining = dmg - used;
    const beforeHp = Math.round(gameData.player.hp || 0);
    if (remaining > 0) {
      gameData.player.hp = beforeHp - remaining;
    }

    // 被弾トリガー（バリア吸収でもカウント）
    onPlayerDamaged(dmg);

    // 装飾品：被弾短縮（敵からの被弾時、確率でスキルCT-1）
    const src =
      opts && typeof opts === "object" ? String(opts.source || "") : "";
    if (src === "enemy") {
      const pct = Number(getAccessoryBonus("hitCdMinusChance") || 0);
      if (
        Number.isFinite(pct) &&
        pct > 0 &&
        (gameData.player.skillCooldown || 0) > 0
      ) {
        if (Math.random() * 100 < Math.min(30, pct)) {
          gameData.player.skillCooldown = Math.max(
            0,
            Math.round(gameData.player.skillCooldown) - 1,
          );
          log("⏱ 被弾でCTが短縮した！");
        }
      }
    }

    if (gameData.player.hp <= 0) {
      // 狂戦士スキル：何度でも踏みとどまる（確率）
      if (tryWarfiendLastStand()) {
        return {
          total: dmg,
          barrierUsed: used,
          hpDamage: remaining,
          deathAvoided: true,
          lastStand: true,
        };
      }

      // 装飾品：1回だけ死亡回避
      if (tryDeathAvoidOnce()) {
        return {
          total: dmg,
          barrierUsed: used,
          hpDamage: remaining,
          deathAvoided: true,
        };
      }
    }
    return { total: dmg, barrierUsed: used, hpDamage: remaining };
  }

  function getMaxStance() {
    const bs = ensurePlayerBattleState();
    return 3 + (Number(bs.stanceMaxBonus) || 0);
  }
  function getMaxQi() {
    const bs = ensurePlayerBattleState();
    return 10 + (Number(bs.qiMaxBonus) || 0);
  }
  function getMaxHoly(combat) {
    const bs = ensurePlayerBattleState();
    const base = Math.max(1, Math.round((combat?.maxHp || 1) * 0.5));
    const bonus = Math.max(0, Number(bs.holyMaxBonus) || 0);
    return base + bonus;
  }
  function getMaxArcaneMark() {
    const bs = ensurePlayerBattleState();
    return 3 + (Number(bs.markMaxBonus) || 0);
  }

  function gainStance(n = 1) {
    const bs = ensurePlayerBattleState();
    bs.stance = clamp(bs.stance + Math.max(0, n), 0, getMaxStance());
  }
  function consumeAllStance() {
    const bs = ensurePlayerBattleState();
    const s = clamp(Number(bs.stance) || 0, 0, getMaxStance());
    bs.stance = 0;
    return s;
  }

  function gainQi(n = 1) {
    const bs = ensurePlayerBattleState();
    bs.qi = clamp(bs.qi + Math.max(0, n), 0, getMaxQi());
  }
  function consumeQi(amount) {
    const bs = ensurePlayerBattleState();
    const a = clamp(Number(amount) || 0, 0, getMaxQi());
    const take = Math.min(bs.qi || 0, a);
    bs.qi = Math.max(0, (bs.qi || 0) - take);
    return take;
  }

  function gainHoly(amount, combat) {
    const bs = ensurePlayerBattleState();
    const add = Math.max(0, Math.floor(Number(amount) || 0));
    const max = getMaxHoly(combat);
    bs.holy = clamp((bs.holy || 0) + add, 0, max);
  }
  function consumeHoly(amount) {
    const bs = ensurePlayerBattleState();
    const a = Math.max(0, Math.floor(Number(amount) || 0));
    const take = Math.min(bs.holy || 0, a);
    bs.holy = Math.max(0, (bs.holy || 0) - take);
    return take;
  }

  function gainAxeStack(n = 1) {
    const bs = ensurePlayerBattleState();
    bs.axe = clamp((bs.axe || 0) + Math.max(0, n), 0, 5);
  }
  function consumeAllAxeStack() {
    const bs = ensurePlayerBattleState();
    const s = clamp(Number(bs.axe) || 0, 0, 5);
    bs.axe = 0;
    return s;
  }

  function setNextCrit(turns = 1) {
    const bs = ensurePlayerBattleState();
    bs.nextCritTurns = Math.max(bs.nextCritTurns || 0, Math.floor(turns));
  }
  function consumeNextCritFlag() {
    const bs = ensurePlayerBattleState();
    if ((bs.nextCritTurns || 0) > 0) {
      bs.nextCritTurns--;
      return true;
    }
    return false;
  }

  function onPlayerEvade() {
    // 盗賊：ジャスト回避 → 次の攻撃が確定会心
    if (gameData.player?.job === "thief") {
      const lv = Number(gameData.player?.skills?.thief_just_dodge || 0);
      if (lv > 0) setNextCrit(1);
    }
    // 剣聖：回避で構えが溜まる
    if (gameData.player?.job === "blademaster") {
      const lv = Number(
        gameData.player?.skills?.blademaster_stance_mastery || 0,
      );
      if (lv > 0) gainStance(1);

      // 流転の構え：回避時に追加で構え（確率。最大+1）
      const lv2 = Number(
        gameData.player?.skills?.blademaster_flowing_guard || 0,
      );
      if (lv2 > 0) {
        const chance = clamp(0.2 * lv2, 0, 1);
        if (Math.random() < chance) gainStance(1);
      }
    }
  }

  function onPlayerHit({ kind, isCrit } = {}) {
    // 剣聖：会心で構え
    if (gameData.player?.job === "blademaster") {
      const lv = Number(
        gameData.player?.skills?.blademaster_stance_mastery || 0,
      );
      if (lv > 0 && isCrit) gainStance(1);
    }
    // 格闘家：当たるたび気が溜まる
    if (gameData.player?.job === "monk") {
      const lv = Number(gameData.player?.skills?.monk_ki_mastery || 0);
      if (lv > 0) gainQi(1);
    }
    // ※破壊衝動系スキルは削除
  }

  function onPlayerDamaged(damage) {
    const d = Math.max(0, Math.round(Number(damage) || 0));
    if (d <= 0) return;
    // 狂戦士：被弾で怒りが溜まり、攻撃力と会心率が上がる
    if (gameData.player?.job === "warfiend") {
      const lv = Number(gameData.player?.skills?.warfiend_rage || 0);
      if (lv > 0) {
        const bs = ensurePlayerBattleState();
        bs.rageStacks = clamp((bs.rageStacks || 0) + 1, 0, 10);
        log(`🔥 怒りが高まる（${bs.rageStacks}/10）`);
      }
    }
  }

  function addArcaneMarkOnEnemy(enemy) {
    if (!enemy) return;
    const lv = Number(gameData.player?.skills?.mage_arcane_mark || 0);
    if (lv <= 0) return;
    const chance = clamp(0.45 + lv * 0.12, 0, 0.95);
    if (Math.random() > chance) return;
    enemy.status = enemy.status || {};
    const max = getMaxArcaneMark();
    enemy.status.arcaneMarkStacks = clamp(
      Number(enemy.status.arcaneMarkStacks || 0) + 1,
      0,
      max,
    );
    log(`🔷 魔印が刻まれた（${enemy.status.arcaneMarkStacks}/${max}）`);
  }

  function consumeArcaneMark(enemy) {
    if (!enemy || !enemy.status) return 0;
    const s = clamp(
      Number(enemy.status.arcaneMarkStacks || 0),
      0,
      getMaxArcaneMark(),
    );
    enemy.status.arcaneMarkStacks = 0;
    return s;
  }

  function getCombatStats() {
    const stats = getTotalStats();
    const favoredType = jobs?.[gameData.player?.job]?.favoredType || null;
    const jobTraits = jobs?.[gameData.player?.job]?.traits || {};

    // 装備制限：武器を装備できない職（修羅など）
    // 旧データ等で武器が装備されている場合でも効果が乗らないよう外す
    if (jobTraits && jobTraits.cannotEquipWeapon) {
      const eq = gameData.player?.equipment;
      if (eq && eq.slot1 && eq.slot1.category === "weapon") eq.slot1 = null;
      if (eq && eq.slot2 && eq.slot2.category === "weapon") eq.slot2 = null;
    }

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
      // 基礎値は0。索敵系のステータス効果でのみ上昇する
      search: 0,
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

    // 装備品由来の「命中マイナス」は合計で最大 -30%（= -30pt）まで
    // ※状態異常やスキルによる命中低下は対象外（別要素としてそのまま反映）
    const baseAccuracyBeforeEquip = combat.accuracy;
    // 武器/防具 2枠
    applyEquipBonuses(
      combat,
      gameData.player.equipment.slot1,
      favoredType,
      favoredMult,
      "slot1",
    );
    if (gameData.player.equipment.slot2 !== gameData.player.equipment.slot1) {
      applyEquipBonuses(
        combat,
        gameData.player.equipment.slot2,
        favoredType,
        favoredMult,
        "slot2",
      );
    }

    // 装飾品 1枠（効果はここだけ）
    applyEquipBonuses(
      combat,
      gameData.player.equipment.accessory,
      favoredType,
      favoredMult,
      "accessory",
    );

    // 装備（武器/防具/装飾品）による命中差分のうち、マイナス方向だけを -30pt までに制限
    // 例：装備で -200 されても、最終的に -30 まで（命中を下げ過ぎない）
    {
      const equipDelta = combat.accuracy - baseAccuracyBeforeEquip;
      if (equipDelta < -30) {
        combat.accuracy = Math.max(1, baseAccuracyBeforeEquip - 30);
      }
    }

    // パッシブスキルボーナス
    // 上級職の常時スキルは、主要ステータス上昇を「加算」ではなく「乗算」で反映する
    const advancedPassiveMult = {
      attack: 1,
      defense: 1,
      magicPower: 1,
      maxHp: 1,
      healPower: 1,
    };
    for (let skillKey in gameData.player.skills) {
      const skillDef = skills[skillKey];
      if (!skillDef) continue;
      if (skillDef.type !== "passive") continue;

      // 現在の職業で有効なパッシブのみ適用（上位職は下位職パッシブを使えない）
      const jobKey = gameData.player?.job;
      const isCommon = skillDef.job === "all";
      if (skillDef.job && !isCommon && skillDef.job !== jobKey) continue;

      const level = gameData.player.skills[skillKey];
      const effect = skillDef.effect(level);

      const skillJobDef = skillDef.job ? jobs?.[skillDef.job] : null;
      const isAdvancedPassive = skillJobDef && skillJobDef.tier === "advanced";

      const applyAdvancedMul = (key, raw) => {
        const v = Number(raw);
        if (!Number.isFinite(v) || v === 0) return false;
        if (!isAdvancedPassive) return false;
        // 例: +12 => x1.12, -15 => x0.85
        const mul = 1 + v / 100;
        if (!Number.isFinite(mul) || mul <= 0) return false;
        advancedPassiveMult[key] *= mul;
        return true;
      };

      if (!applyAdvancedMul("attack", effect.attackBonus) && effect.attackBonus)
        combat.attack += effect.attackBonus;
      if (
        !applyAdvancedMul("defense", effect.defenseBonus) &&
        effect.defenseBonus
      )
        combat.defense += effect.defenseBonus;
      if (effect.evasionBonus) combat.evasion += effect.evasionBonus;
      if (effect.critBonus) combat.critRate += effect.critBonus;
      if (
        !applyAdvancedMul("magicPower", effect.magicBonus) &&
        effect.magicBonus
      )
        combat.magicPower += effect.magicBonus;
      if (effect.allStatsBonus) {
        if (!applyAdvancedMul("attack", effect.allStatsBonus))
          combat.attack += effect.allStatsBonus;
        if (!applyAdvancedMul("defense", effect.allStatsBonus))
          combat.defense += effect.allStatsBonus;
      }
      if (effect.searchBonus) combat.search += effect.searchBonus;
      if (effect.accuracyBonus) combat.accuracy += effect.accuracyBonus;
      if (!applyAdvancedMul("maxHp", effect.maxHpBonus) && effect.maxHpBonus)
        combat.maxHp += effect.maxHpBonus;
      if (
        !applyAdvancedMul("healPower", effect.healPowerBonus) &&
        effect.healPowerBonus
      )
        combat.healPower += effect.healPowerBonus;

      // 反撃系（battleState で参照）
      if (effect.counterChanceBonus) {
        const bs = ensurePlayerBattleState();
        bs.counterChanceBonus =
          (bs.counterChanceBonus || 0) + effect.counterChanceBonus;
      }
      if (effect.counterDamageBonus) {
        const bs = ensurePlayerBattleState();
        bs.counterDamageBonus =
          (bs.counterDamageBonus || 0) + effect.counterDamageBonus;
      }

      // 固有リソース上限（battleState で参照）
      if (effect.stanceMaxBonus) {
        const bs = ensurePlayerBattleState();
        bs.stanceMaxBonus = (bs.stanceMaxBonus || 0) + effect.stanceMaxBonus;
      }
      if (effect.qiMaxBonus) {
        const bs = ensurePlayerBattleState();
        bs.qiMaxBonus = (bs.qiMaxBonus || 0) + effect.qiMaxBonus;
      }
      if (effect.markMaxBonus) {
        const bs = ensurePlayerBattleState();
        bs.markMaxBonus = (bs.markMaxBonus || 0) + effect.markMaxBonus;
      }
      if (effect.holyMaxBonus) {
        const bs = ensurePlayerBattleState();
        bs.holyMaxBonus = (bs.holyMaxBonus || 0) + effect.holyMaxBonus;
      }
      // スキル追撃（battleState で参照）
      if (effect.skillFollowUpChance) {
        const bs = ensurePlayerBattleState();
        // 0〜0.6（=60%）に正規化
        const v = Number(effect.skillFollowUpChance) || 0;
        bs.skillFollowUpChance = Math.max(
          bs.skillFollowUpChance || 0,
          clamp(v, 0, 0.6),
        );
      }

      // 追撃ダメージ補正（+%）
      if (effect.followUpDamageMulBonus) {
        const bs = ensurePlayerBattleState();
        bs.followUpDamageMulBonus =
          (bs.followUpDamageMulBonus || 0) +
          (Number(effect.followUpDamageMulBonus) || 0);
      }
      // 追撃は会心しない
      if (effect.followUpNoCrit) {
        const bs = ensurePlayerBattleState();
        bs.followUpNoCrit = true;
      }
      // 通常攻撃でも追撃判定
      if (effect.followUpOnAttack) {
        const bs = ensurePlayerBattleState();
        bs.followUpOnAttack = true;
      }
      // 物理：貫通（防御適用率を減らす）
      if (effect.pierceDefFactorReduction) {
        const bs = ensurePlayerBattleState();
        const v2 = Number(effect.pierceDefFactorReduction) || 0;
        bs.pierceDefFactorReduction = clamp(
          (bs.pierceDefFactorReduction || 0) + v2,
          0,
          0.4,
        );
      }

      // パッシブHP吸収（%）
      if (effect.lifeStealPctBonus) {
        const bs = ensurePlayerBattleState();
        bs.lifeStealPctBonus =
          (bs.lifeStealPctBonus || 0) + (Number(effect.lifeStealPctBonus) || 0);
      }
    }

    combat.attack *= advancedPassiveMult.attack;
    combat.defense *= advancedPassiveMult.defense;
    combat.magicPower *= advancedPassiveMult.magicPower;
    combat.maxHp *= advancedPassiveMult.maxHp;
    combat.healPower *= advancedPassiveMult.healPower;

    // 上級職などの職業特性（traits）
    if (jobTraits) {
      if (typeof jobTraits.accuracyBonus === "number")
        combat.accuracy += jobTraits.accuracyBonus;
      if (typeof jobTraits.evasionBonus === "number")
        combat.evasion += jobTraits.evasionBonus;
      if (typeof jobTraits.critRateBonus === "number")
        combat.critRate += jobTraits.critRateBonus;
      // 職業特性：貫通（防御適用率を減らす）
      if (typeof jobTraits.pierceDefFactorReduction === "number") {
        const bs = ensurePlayerBattleState();
        bs.pierceDefFactorReduction = clamp(
          (bs.pierceDefFactorReduction || 0) +
            jobTraits.pierceDefFactorReduction,
          0,
          0.4,
        );
      }
      // 職業特性：追撃（スキル/通常攻撃）
      if (typeof jobTraits.followUpBaseChance === "number") {
        const bs = ensurePlayerBattleState();
        bs.skillFollowUpChance = Math.max(
          bs.skillFollowUpChance || 0,
          clamp(jobTraits.followUpBaseChance, 0, 0.6),
        );
      }
      if (jobTraits.followUpOnAttack) {
        const bs = ensurePlayerBattleState();
        bs.followUpOnAttack = true;
      }
      if (jobTraits.followUpNoCrit) {
        const bs = ensurePlayerBattleState();
        bs.followUpNoCrit = true;
      }
      if (typeof jobTraits.followUpDamageMulBonus === "number") {
        const bs = ensurePlayerBattleState();
        bs.followUpDamageMulBonus =
          (bs.followUpDamageMulBonus || 0) + jobTraits.followUpDamageMulBonus;
      }
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

    // 状態異常（脆弱：防御ダウン）
    if (st.vulnerableTurns > 0) {
      const rateRaw =
        typeof st.vulnerableRate === "number" ? st.vulnerableRate : 0.25;
      const rate = Math.min(0.9, Math.max(0, rateRaw));
      combat.defense = Math.max(0, combat.defense * (1 - rate));
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

    // 狂戦士：怒りスタックが攻撃/会心に影響（戦闘中のみ）
    if (gameData.player?.job === "warfiend") {
      const rageSkillLv = Math.floor(
        Number(gameData.player?.skills?.warfiend_rage || 0),
      );
      if (rageSkillLv > 0) {
        const bs = ensurePlayerBattleState();
        const stacks = clamp(Math.floor(Number(bs.rageStacks || 0)), 0, 10);

        if (stacks > 0) {
          // 攻撃：スタック×2% + スキルレベル×1%（最大+35%）
          const atkMul = 1 + Math.min(0.35, stacks * 0.02 + rageSkillLv * 0.01);
          combat.attack *= atkMul;

          // 会心：スタック×(1+0.5*レベル)%
          combat.critRate += Math.round(stacks * (1 + 0.5 * rageSkillLv));
        }
      }
    }

    // 修羅：攻撃のたび気が溜まり、気スタックで攻撃/会心/追撃が上昇（戦闘中のみ）
    if (gameData.player?.job === "asura" && gameData.gameState === "BATTLE") {
      const bs = ensurePlayerBattleState();
      const qiMax =
        typeof getMaxQi === "function" ? Math.floor(getMaxQi()) : 10;
      const stacks = clamp(
        Math.floor(Number(bs.qi || 0)),
        0,
        qiMax > 0 ? qiMax : 99,
      );

      if (stacks > 0) {
        // 攻撃：気×3%（最大+80%）
        combat.attack *= 1 + Math.min(0.8, stacks * 0.03);

        // 会心率：気×2%
        combat.critRate += stacks * 2;

        // 追撃率：気×2%（最大60%）
        const followChance = clamp(stacks * 0.02, 0, 0.6);
        bs.followUpOnAttack = true;
        bs.skillFollowUpChance = Math.max(
          Number(bs.skillFollowUpChance || 0),
          followChance,
        );
      }
    }
    // -------------------
    // 特殊接頭語（statPct系）：乗算% を最終ステータスに反映
    // - equipment_special_prefix.js の statPct は item.effects に attackPct / defensePct / maxHpPct ... を積む
    // - ここで合算し、combat の最終値に乗算する
    // -------------------
    {
      const atkPct = Number(getAccessoryBonus("attackPct") || 0);
      const defPct = Number(getAccessoryBonus("defensePct") || 0);
      const hpPct = Number(getAccessoryBonus("maxHpPct") || 0);
      const mpPct = Number(getAccessoryBonus("magicPowerPct") || 0);
      const healPct = Number(getAccessoryBonus("healPowerPct") || 0);

      const mul = (pct) => 1 + clamp(Number(pct) || 0, -80, 500) / 100;

      if (Number.isFinite(atkPct) && atkPct !== 0) combat.attack *= mul(atkPct);
      if (Number.isFinite(defPct) && defPct !== 0)
        combat.defense *= mul(defPct);
      if (Number.isFinite(hpPct) && hpPct !== 0) combat.maxHp *= mul(hpPct);
      if (Number.isFinite(mpPct) && mpPct !== 0)
        combat.magicPower *= mul(mpPct);
      if (Number.isFinite(healPct) && healPct !== 0)
        combat.healPower *= mul(healPct);
    }

    const achievementSearchBonus = getAchievementSearchBonus();
    if (achievementSearchBonus > 0) combat.search += achievementSearchBonus;

    // 端数が出ないように丸める
    combat.attack = Math.round(combat.attack);
    combat.defense = Math.round(combat.defense);
    combat.magicPower = Math.round(combat.magicPower);
    combat.healPower = Math.round(combat.healPower || 0);
    combat.accuracy = Math.round(combat.accuracy);
    combat.evasion = clamp(
      Math.round(combat.evasion),
      0,
      getPlayerEvasionCap(),
    );
    combat.critRate = Math.round(combat.critRate);
    // 索敵は 0〜150 に丸める（100以上は二つ名確定。150以上で強力な二つ名も出現）
    combat.search = clamp(combat.search, 0, 150);

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
    const slot1 = eq.slot1 || null;
    const slot2 = eq.slot2 || null;

    const hasWeapon = !!(
      (slot1 && slot1.category === "weapon") ||
      (slot2 && slot2.category === "weapon")
    );
    const hasArmor = !!(
      (slot1 && slot1.category === "armor") ||
      (slot2 && slot2.category === "armor")
    );
    const hasTwoHandedWeapon = !!(
      (slot1 && slot1.category === "weapon" && Number(slot1.hands) === 2) ||
      (slot2 && slot2.category === "weapon" && Number(slot2.hands) === 2)
    );

    const items = [slot1, slot2, eq.accessory].filter(Boolean);

    const isCondActive = (eff) => {
      if (!eff || typeof eff !== "object") return true;
      const c = eff.cond || eff.condition;
      if (!c) return true;
      if (c === "unarmed") return !hasWeapon;
      if (c === "noArmor") return !hasArmor;
      if (c === "twoHanded") return hasTwoHandedWeapon;
      return true;
    };

    // 同一アイテムを二重計上しない（2枠に同じ参照が入るケース対策）
    const seen = new Set();
    for (const it of items) {
      const key = typeof it.uid === "string" && it.uid ? it.uid : it;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!it || !Array.isArray(it.effects)) continue;
      for (const eff of it.effects) {
        if (!eff || eff.type !== type) continue;
        if (!isCondActive(eff)) continue;
        total += Number(eff.value) || 0;
      }
    }
    return total;
  }

  function isFullyUnequipped(p) {
    const eq =
      p && p.equipment && typeof p.equipment === "object" ? p.equipment : {};
    return !eq.slot1 && !eq.slot2 && !eq.accessory;
  }

  // 実績ボーナス
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

  function getAchievementSearchBonus() {
    const p = gameData.player;
    const map =
      p && p.achievements && typeof p.achievements === "object"
        ? p.achievements
        : {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
    let bonus = 0;
    for (const def of defs) {
      if (!def || !def.id || !map[def.id]) continue;
      const b = def.bonus || {};
      const v = Number(b.search || 0);
      if (Number.isFinite(v) && v > 0) bonus += Math.floor(v);
    }
    return bonus;
  }

  function getAchievementItemDropRateBonus() {
    const p = gameData.player;
    const map =
      p && p.achievements && typeof p.achievements === "object"
        ? p.achievements
        : {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
    let bonus = 0;
    for (const def of defs) {
      if (!def || !def.id || !map[def.id]) continue;
      const b = def.bonus || {};
      const v = Number(b.itemDropRate || 0);
      if (Number.isFinite(v) && v > 0) bonus += v;
    }
    return bonus;
  }

  function getAchievementEvasionCapBonusPercent() {
    const p = gameData.player;
    const map =
      p && p.achievements && typeof p.achievements === "object"
        ? p.achievements
        : {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
    let bonus = 0;
    for (const def of defs) {
      if (!def || !def.id || !map[def.id]) continue;
      const b = def.bonus || {};
      const v = Number(b.evasionCapBonus || 0);
      if (Number.isFinite(v) && v > 0) bonus += Math.floor(v);
    }
    return bonus;
  }

  function getPlayerEvasionCap() {
    const cap = BASE_EVASION_CAP + getAchievementEvasionCapBonusPercent();
    return clamp(cap, 0, MAX_EVASION_CAP);
  }

  function getAchievementAsuraBaseStatMultiplierBonus() {
    const p = gameData.player;
    const map =
      p && p.achievements && typeof p.achievements === "object"
        ? p.achievements
        : {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
    let bonus = 0;
    for (const def of defs) {
      if (!def || !def.id || !map[def.id]) continue;
      const b = def.bonus || {};
      const v = Number(b.asuraBaseStatMultiplierBonus || 0);
      if (Number.isFinite(v) && v > 0) bonus += v;
    }
    return bonus;
  }

  function checkAndUnlockAchievements({ silent = false } = {}) {
    const p = gameData.player;
    if (!p.achievements || typeof p.achievements !== "object")
      p.achievements = {};
    if (
      !p.achievementRewardsClaimed ||
      typeof p.achievementRewardsClaimed !== "object"
    )
      p.achievementRewardsClaimed = {};
    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];
    const unlockedNow = [];

    const grantReward = (def) => {
      if (!def || !def.id) return;
      const claimedMap = p.achievementRewardsClaimed;
      const alreadyClaimed = !!(claimedMap && claimedMap[def.id]);
      const r = def.reward;
      if (!r || typeof r !== "object") return;

      let rewarded = false;

      // 例: reward.valuables = ["emblem_strength", { id: "emblem_vitality", amount: 2 }]
      if (!alreadyClaimed && Array.isArray(r.valuables)) {
        for (const v of r.valuables) {
          let id = "";
          let amount = 1;
          if (typeof v === "string") {
            id = v;
          } else if (v && typeof v === "object") {
            id = typeof v.id === "string" ? v.id : "";
            const a = Number(v.amount);
            if (Number.isFinite(a) && a > 0) amount = Math.floor(a);
          }
          if (!id) continue;
          const defRelic = RELIC_DEFS.find((d) => d && d.id === id);
          if (!defRelic) continue;
          addValuableByDef(defRelic, amount);
          rewarded = true;
        }
      }

      if (Array.isArray(r.unlockJobs)) {
        if (!p.unlockedJobs || typeof p.unlockedJobs !== "object")
          p.unlockedJobs = {};
        for (const jobKeyRaw of r.unlockJobs) {
          const jobKey = String(jobKeyRaw || "");
          if (!jobKey || !jobs[jobKey]) continue;
          if (!p.unlockedJobs[jobKey]) {
            p.unlockedJobs[jobKey] = true;
            rewarded = true;
          }
        }
      }

      // 報酬は1回だけ
      if (!alreadyClaimed && rewarded && claimedMap && def.id)
        claimedMap[def.id] = true;
    };

    for (const def of defs) {
      if (!def || !def.id || typeof def.isDone !== "function") continue;
      const already = !!p.achievements[def.id];
      try {
        if (typeof def.onCheck === "function") def.onCheck(p);
      } catch (e) {}
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

    // 報酬付与（解除済み実績にも一度だけ適用）
    for (const def of defs) {
      if (def && def.id && p.achievements[def.id]) grantReward(def);
    }

    if (!silent && unlockedNow.length) {
      for (const def of unlockedNow) {
        log(`🏆 実績解除：${def.title}`);
        const b = def.bonus || {};
        if (typeof b.expRate === "number" && b.expRate > 0) {
          log(`✨ ボーナス：経験値+${Math.round(b.expRate * 100)}%`);
        }
        if (typeof b.evasionCapBonus === "number" && b.evasionCapBonus > 0) {
          log(`✨ ボーナス：回避上限+${Math.floor(b.evasionCapBonus)}%`);
        }
        if (typeof b.itemDropRate === "number" && b.itemDropRate > 0) {
          log(`✨ ボーナス：アイテムドロップ率+${Math.floor(b.itemDropRate)}%`);
        }
        if (typeof b.search === "number" && b.search > 0) {
          log(`✨ ボーナス：索敵+${Math.floor(b.search)}`);
        }

        // 報酬ログ（任意）
        const r = def.reward;
        if (
          r &&
          typeof r === "object" &&
          typeof r.text === "string" &&
          r.text
        ) {
          log(`🎁 報酬：${r.text}`);
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

    const cur = clampFloor(gameData.floor || 1);
    const stayCurrentFloor =
      isStayBattleUnlocked() &&
      !!(
        gameData.player &&
        gameData.player.serialOptions &&
        gameData.player.serialOptions.stayBattleCurrentFloor
      );

    if (stayCurrentFloor) {
      gameData.floor = cur;
      gameData.pendingFloorAfterWin = cur;
      startBattle(cur);
      return;
    }

    const floorCap = getCurrentFloorCap();
    const isAtTestFloorCap =
      Number.isFinite(floorCap) && floorCap > 0 && cur >= floorCap;

    // 上限に到達している場合：次階層へは進めないが、戦闘は発生させる（周回用）
    if (dir > 0 && isAtTestFloorCap) {
      gameData.floor = cur;
      log("⚠️ この先に進むにはシリアルコードが必要");
      // 進行待ちを残さず、現在階層で戦闘開始
      gameData.pendingFloorAfterWin = cur;
      startBattle(cur);
      return;
    }

    const target = clampFloor(cur + dir);

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
        gameData.player.maxReachedFloor = clampFloor(
          gameData.player.maxReachedFloor,
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
    gameData.player.maxReachedFloor = clampFloor(
      gameData.player.maxReachedFloor,
    );
    checkAndUnlockAchievements();
    log(`${gameData.floor}階層に戻った`);

    requestAutosave();
    updateUI();
  }

  // -------------------
  // 転移（50階層刻み）
  // -------------------
  /**
   * 指定階層に転移する。
   * - 戦闘中は不可（EXPLORE のみ）
   * - 1階、または50階層刻みのみ
   * - 最大到達階層（maxReachedFloor）を超える転移は不可
   * @param {number} destFloor
   * @returns {boolean}
   */
  function teleportToFloor(destFloor) {
    if (!gameData || gameData.gameState !== "EXPLORE") {
      if (typeof log === "function") log("⚠️ 戦闘中は転移できない");
      return false;
    }

    const maxReached = Math.max(
      1,
      Math.floor(Number(gameData?.player?.maxReachedFloor || 1)),
    );

    const rawDest = Math.max(1, Math.floor(Number(destFloor || 1)));
    const floorCap = getCurrentFloorCap();
    if (Number.isFinite(floorCap) && floorCap > 0 && rawDest > floorCap) {
      if (typeof log === "function")
        log(`⚠️ 階層上限は${floorCap}階（指定: ${rawDest}階）`);
      return false;
    }
    const dest = rawDest;
    const isAllowedStep = dest === 1 || dest % 50 === 0;
    if (!isAllowedStep) {
      if (typeof log === "function") log("⚠️ 転移は50階層刻みで行えます");
      return false;
    }

    if (dest > maxReached) {
      if (typeof log === "function")
        log(`⚠️ 未到達の階層には転移できない（最大到達: ${maxReached}階）`);
      return false;
    }

    gameData.floor = dest;
    gameData.battleFloor = null;
    gameData.pendingFloorAfterWin = null;
    gameData.enemy = null;

    // 転移は到達履歴を増やさない（減らさない）
    if (typeof gameData.player.maxReachedFloor !== "number") {
      gameData.player.maxReachedFloor = Math.max(1, dest);
    }
    gameData.player.maxReachedFloor = clampFloor(
      gameData.player.maxReachedFloor,
    );

    checkAndUnlockAchievements();
    if (typeof log === "function") log(`🌀 ${dest}階層へ転移した`);
    requestAutosave();
    if (typeof updateUI === "function") updateUI();
    return true;
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

  // -------------------
  // 敵の状態異常（プレイヤーの onHit / デバフ用）
  // -------------------
  function ensureEnemyStatus(enemy) {
    if (!enemy || typeof enemy !== "object") return null;
    const st = enemy.status || (enemy.status = {});
    // 数値の初期化（未定義でも安全に扱えるように）
    if (!Number.isFinite(st.poisonTurns)) st.poisonTurns = 0;
    if (!Number.isFinite(st.burnTurns)) st.burnTurns = 0;
    if (!Number.isFinite(st.bleedTurns)) st.bleedTurns = 0;

    if (!Number.isFinite(st.slowTurns)) st.slowTurns = 0;
    if (!Number.isFinite(st.slowRate)) st.slowRate = 0;

    if (!Number.isFinite(st.stunTurns)) st.stunTurns = 0;

    if (!Number.isFinite(st.vulnerableTurns)) st.vulnerableTurns = 0;
    if (!Number.isFinite(st.vulnerableRate)) st.vulnerableRate = 0;

    if (!Number.isFinite(st.accuracyDownTurns)) st.accuracyDownTurns = 0;
    if (!Number.isFinite(st.accuracyDownRate)) st.accuracyDownRate = 0;

    if (!Number.isFinite(st.silenceTurns)) st.silenceTurns = 0;

    return st;
  }

  function getEnemyAgiForHit(enemy) {
    const st = ensureEnemyStatus(enemy) || {};
    let agi = Number(enemy && enemy.agi) || 0;

    // 鈍足：回避（agi）を下げる
    if (st.slowTurns > 0) {
      const rateRaw = typeof st.slowRate === "number" ? st.slowRate : 0.2;
      const rate = clamp(rateRaw, 0, 0.9);
      agi = agi * (1 - rate);
    }

    return Math.max(0, Math.round(agi));
  }

  function applyEnemyVulnerableTaken(enemy, damage) {
    const st = enemy && enemy.status ? enemy.status : null;
    if (!st || !(st.vulnerableTurns > 0)) return damage;

    const rateRaw =
      typeof st.vulnerableRate === "number" ? st.vulnerableRate : 0.25;
    const rate = clamp(rateRaw, 0, 0.9);
    return Math.max(1, Math.round(damage * (1 + rate)));
  }

  function collectPlayerOnHitSpecialEffects() {
    const eq = (gameData.player && gameData.player.equipment) || {};
    const items = [];
    if (eq.slot1) items.push(eq.slot1);
    if (eq.slot2 && eq.slot2 !== eq.slot1) items.push(eq.slot2);
    if (eq.accessory) items.push(eq.accessory);

    const out = [];
    for (const item of items) {
      if (!item || !Array.isArray(item.specialEffects)) continue;
      for (const se of item.specialEffects) {
        if (se && se.type === "onHit") out.push(se);
      }
    }
    return out;
  }

  function applyPlayerOnHitSpecialEffects(enemy) {
    if (!enemy) return;

    const effects = collectPlayerOnHitSpecialEffects();
    if (effects.length === 0) return;

    const st = ensureEnemyStatus(enemy);
    const name = enemy.displayName || enemy.name || "敵";

    for (const eff of effects) {
      if (!eff || eff.type !== "onHit") continue;

      const chance = Number(eff.chance);
      if (!Number.isFinite(chance) || chance <= 0) continue;
      if (Math.random() >= chance) continue;

      const turns = Math.max(1, Math.floor(Number(eff.turns) || 1));
      const rate = Number(eff.rate);

      const applyTurns = (key) => {
        st[key] = Math.max(Number(st[key] || 0), turns);
      };
      const applyRate = (key, fallback) => {
        const v = Number.isFinite(rate) ? rate : fallback;
        st[key] = Math.max(Number(st[key] || 0), v);
      };

      // 効果適用
      if (eff.effect === "poison") {
        const before = st.poisonTurns || 0;
        applyTurns("poisonTurns");
        if (st.poisonTurns > before) log(`☠ ${name}は毒状態になった！`);
      } else if (eff.effect === "burn") {
        const before = st.burnTurns || 0;
        applyTurns("burnTurns");
        if (st.burnTurns > before) log(`🔥 ${name}は火傷した！`);
      } else if (eff.effect === "bleed") {
        const before = st.bleedTurns || 0;
        applyTurns("bleedTurns");
        if (st.bleedTurns > before) log(`🩸 ${name}は出血した！`);
      } else if (eff.effect === "slow") {
        const before = st.slowTurns || 0;
        applyTurns("slowTurns");
        applyRate("slowRate", 0.2);
        if (st.slowTurns > before) log(`🐢 ${name}は鈍足になった！`);
      } else if (eff.effect === "stun") {
        const before = st.stunTurns || 0;
        applyTurns("stunTurns");
        if (st.stunTurns > before) log(`⚡ ${name}はしびれた！`);
      } else if (eff.effect === "vulnerable") {
        const before = st.vulnerableTurns || 0;
        applyTurns("vulnerableTurns");
        applyRate("vulnerableRate", 0.25);
        if (st.vulnerableTurns > before) log(`💥 ${name}は脆弱になった！`);
      } else if (eff.effect === "accuracyDown") {
        const before = st.accuracyDownTurns || 0;
        applyTurns("accuracyDownTurns");
        applyRate("accuracyDownRate", 0.25);
        if (st.accuracyDownTurns > before) log(`👁 ${name}の命中が下がった！`);
      } else if (eff.effect === "silence") {
        const before = st.silenceTurns || 0;
        applyTurns("silenceTurns");
        if (st.silenceTurns > before) log(`🔇 ${name}は封印された！`);
      }
    }
  }

  function tickEnemyDotStatuses(enemy) {
    if (!enemy || gameData.gameState !== "BATTLE") return;
    const st = ensureEnemyStatus(enemy) || {};
    const name = enemy.displayName || enemy.name || "敵";

    if (st.poisonTurns > 0) {
      const maxHp = Math.max(1, enemy.maxHp || 1);
      const pct = Math.round(POISON_MAXHP_RATE * 100);
      const dmg = Math.max(1, Math.round(maxHp * POISON_MAXHP_RATE));
      enemy.hp -= dmg;
      st.poisonTurns--;
      log(`☠ ${name}は毒で${dmg}ダメージ（最大HP${pct}%）`);
      if (st.poisonTurns <= 0) log(`☠ ${name}の毒が治った`);
    }

    if (enemy.hp > 0 && st.burnTurns > 0) {
      const maxHp = Math.max(1, enemy.maxHp || 1);
      const pct = Math.round(BURN_DOT_MAXHP_RATE * 1000) / 10;
      const dmg = Math.max(1, Math.round(maxHp * BURN_DOT_MAXHP_RATE));
      enemy.hp -= dmg;
      st.burnTurns--;
      log(`🔥 ${name}は火傷で${dmg}ダメージ（最大HP${pct}%）`);
      if (st.burnTurns <= 0) log(`🔥 ${name}の火傷が治った`);
    }

    if (enemy.hp > 0 && st.bleedTurns > 0) {
      const maxHp = Math.max(1, enemy.maxHp || 1);
      const pct = Math.round(BLEED_DOT_MAXHP_RATE * 1000) / 10;
      const dmg = Math.max(1, Math.round(maxHp * BLEED_DOT_MAXHP_RATE));
      enemy.hp -= dmg;
      st.bleedTurns--;
      log(`🩸 ${name}は出血で${dmg}ダメージ（最大HP${pct}%）`);
      if (st.bleedTurns <= 0) log(`🩸 ${name}の出血が止まった`);
    }

    // DOT で倒れた場合
    if (enemy.hp <= 0) {
      checkBattleEnd();
    }
  }

  function tickEnemyDebuffTurnsAfterAction(enemy) {
    if (!enemy || gameData.gameState !== "BATTLE") return;
    const st = ensureEnemyStatus(enemy) || {};

    if (st.accuracyDownTurns > 0) {
      st.accuracyDownTurns--;
      if (st.accuracyDownTurns <= 0) st.accuracyDownRate = 0;
    }
    if (st.slowTurns > 0) {
      st.slowTurns--;
      if (st.slowTurns <= 0) st.slowRate = 0;
    }
    if (st.vulnerableTurns > 0) {
      st.vulnerableTurns--;
      if (st.vulnerableTurns <= 0) st.vulnerableRate = 0;
    }
    if (st.silenceTurns > 0) {
      st.silenceTurns--;
    }
  }

  function startBattle(battleFloor) {
    gameData.gameState = "BATTLE";

    // 戦闘開始時にログをクリア
    if (typeof window.clearLog === "function") window.clearLog();

    const floor = Number.isFinite(Number(battleFloor))
      ? Math.max(1, Math.floor(Number(battleFloor)))
      : gameData.floor;

    gameData.battleFloor = floor;
    const isAsuraWorld = isInAsuraWorld();
    const enemyScalingFloor = floor;
    const asuraPool =
      isAsuraWorld && Array.isArray(window.asuraMonsterTypes)
        ? window.asuraMonsterTypes
        : null;
    const enemyTable =
      asuraPool && asuraPool.length > 0 ? asuraPool : monsterTypes;

    // 敵生成：階層に応じて候補を絞る
    const candidates = enemyTable.filter((m) => {
      const min = m.minFloor || 1;
      const max = typeof m.maxFloor === "number" ? m.maxFloor : Infinity;
      return min <= enemyScalingFloor && enemyScalingFloor <= max;
    });
    const pool = candidates.length > 0 ? candidates : enemyTable;

    // ボス生成（敵テーブル切替階層）
    const bossDef =
      typeof window.bossMonsters === "object" && window.bossMonsters
        ? window.bossMonsters[floor]
        : null;

    const baseMonster = bossDef
      ? bossDef
      : pool[Math.floor(Math.random() * pool.length)];
    const enemy = JSON.parse(JSON.stringify(baseMonster));
    enemy.playerActionCount = 0;

    // 敵の状態異常格納を初期化
    ensureEnemyStatus(enemy);

    // 事前定義の特殊効果（ボスなど）を保持しておく
    const presetEffects =
      enemy && enemy.effects && typeof enemy.effects === "object"
        ? JSON.parse(JSON.stringify(enemy.effects))
        : {};

    const combat = getCombatStats();
    const search = combat.search;

    // フロア補正（常に強くなる）
    const floorMul = Math.min(4.2, 1 + (enemyScalingFloor - 1) * 0.075);
    enemy.hp = Math.round(enemy.hp * floorMul);
    enemy.str = Math.round(enemy.str * floorMul);
    enemy.vit = Math.round(enemy.vit * floorMul);
    enemy.int = Math.round(enemy.int * floorMul);
    enemy.agi = Math.round(enemy.agi * floorMul);
    enemy.dex = Math.round(enemy.dex * floorMul);
    enemy.exp = Math.round(enemy.exp * floorMul);

    if (isAsuraWorld) {
      const asuraBaseMul = 2;
      enemy.hp = Math.round(enemy.hp * asuraBaseMul);
      enemy.str = Math.round(enemy.str * asuraBaseMul);
      enemy.vit = Math.round(enemy.vit * asuraBaseMul);
      enemy.int = Math.round(enemy.int * asuraBaseMul);
      enemy.agi = Math.round(enemy.agi * asuraBaseMul);
      enemy.dex = Math.round(enemy.dex * asuraBaseMul);
      enemy.exp = Math.round(enemy.exp * asuraBaseMul);

      const asuraFloorSteps = Math.floor(
        Math.max(0, enemyScalingFloor - 1) / 50,
      );
      const asuraStepMul = 1 + asuraFloorSteps * 0.25;
      enemy.hp = Math.round(enemy.hp * asuraStepMul);
      enemy.str = Math.round(enemy.str * asuraStepMul);
      enemy.vit = Math.round(enemy.vit * asuraStepMul);
      enemy.int = Math.round(enemy.int * asuraStepMul);
      enemy.agi = Math.round(enemy.agi * asuraStepMul);
      enemy.dex = Math.round(enemy.dex * asuraStepMul);
      enemy.exp = Math.round(enemy.exp * asuraStepMul);

      if (typeof enemy.name === "string" && !enemy.name.startsWith("修羅")) {
        enemy.name = `修羅${enemy.name}`;
      }
    }

    // 二つ名判定（索敵が 0 の場合は出ない）
    // 索敵 1 = 1% で遭遇（索敵値%）。100以上で必ず遭遇。
    const epithetChance =
      enemy && enemy.isBoss
        ? 0
        : search >= 100
          ? 1
          : search > 0
            ? clamp(search, 0, 100) * 0.01
            : 0;
    let epithet = null;

    if (Math.random() < epithetChance) {
      const availableEpithets = epithets.filter((e) => {
        const minSearch = Number(e && e.minSearch);
        return Number.isFinite(minSearch) ? search >= minSearch : true;
      });
      const pool = availableEpithets.length > 0 ? availableEpithets : epithets;
      epithet = pool[Math.floor(Math.random() * pool.length)];
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

    // 事前定義の効果を最後にマージ（ボスなど）
    if (presetEffects && typeof presetEffects === "object") {
      const keys = Object.keys(presetEffects);
      if (keys.length > 0) {
        enemy.effects = Object.assign({}, enemy.effects || {}, presetEffects);
      }
    }

    enemy.maxHp = enemy.hp;
    enemy.attack = enemy.str * 2;
    enemy.defense = enemy.vit * 1.5;
    enemy.magic = enemy.int * 2;

    const bossTag = enemy && enemy.isBoss ? "【BOSS】" : "";
    const epithetTag = epithet ? `【${epithet.name}】` : "";
    enemy.displayName = `${bossTag}${epithetTag}${enemy.name}`;

    // 敵スキル
    enemy.skills = Array.isArray(enemy.skills) ? enemy.skills : [];
    const bonusSkills = Array.isArray(enemy?.effects?.bonusSkills)
      ? enemy.effects.bonusSkills
      : [];
    if (bonusSkills.length > 0) {
      const merged = enemy.skills.concat(bonusSkills);
      enemy.skills = merged.filter((id, idx) => merged.indexOf(id) === idx);
    }
    enemy.skillCooldowns = {};
    enemy.turnCount = 0;
    enemy.skillGlobalCooldown = 0;
    enemy.nextIntent = null;

    gameData.enemy = enemy;

    // 戦闘開始：職固有リソースを初期化
    resetPlayerBattleStateForBattle();

    // 装飾品：背水（戦闘開始時HP減少）
    {
      const hpLossPct = clamp(
        Number(getAccessoryBonus("battleStartHpLoss") || 0),
        0,
        95,
      );
      if (Number.isFinite(hpLossPct) && hpLossPct > 0) {
        const maxHp = Math.max(
          1,
          Number(gameData.player?.maxHp || combat.maxHp || 1),
        );
        const startHp = Math.max(1, Math.round(maxHp * (1 - hpLossPct / 100)));
        gameData.player.hp = Math.min(
          Math.max(0, Number(gameData.player.hp || 0)),
          startHp,
        );
      }
    }

    // 装飾品：初撃会心（戦闘の最初の命中を確定会心にする）
    {
      const v = Number(getAccessoryBonus("firstHitCrit") || 0);
      if (Number.isFinite(v) && v > 0) {
        setNextCrit(1);
        log("✨ 初撃会心の気配…");
      }
    }

    // 弓使い：先制射撃（戦闘開始時に追加攻撃）
    if (gameData.player?.job === "archer") {
      const lv = Number(gameData.player?.skills?.archer_preemptive_shot || 0);
      if (lv > 0) {
        const chance = clamp(0.25 + lv * 0.12, 0, 0.95);
        if (Math.random() < chance) {
          log("🏹 先制射撃！");
          const combat0 = getCombatStats();
          const hitChance0 = Math.min(
            98,
            combat0.accuracy - getEnemyAgiForHit(enemy) + 10,
          );
          if (Math.random() * 100 <= hitChance0) {
            const dmg0 = Math.max(
              1,
              Math.round(
                (combat0.attack - enemy.defense * 0.4) * (0.6 + lv * 0.08),
              ),
            );
            const d0 = applyEnemyIncomingReduction(enemy, dmg0);
            const d1 = applyEnemyVulnerableTaken(enemy, d0);
            enemy.hp -= d1;
            recordPlayerDamage(d1);
            log(`先制で${d1}ダメージ！`);
            applyPlayerOnHitSpecialEffects(enemy);
            onPlayerHit({ kind: "physical", isCrit: false });
            if (checkBattleEnd() === true) {
              return;
            }
          } else {
            log("先制射撃は外れた！");
          }
        }
      }
    }

    log(`⚔ ${enemy.displayName} があらわれた！`);
    if (epithet) log("強力な二つ名を持っている！");

    // 次の敵行動を予告（プレイヤーに防御/攻撃の選択を与える）
    planEnemyNextIntent(enemy);

    requestAutosave();
    updateUI();
  }

  /**
   * 敵の次行動（予告用）を決める。
   * - スキルは個別クールダウン + グローバルクールダウン（連発防止）を考慮
   * @param {any} enemy
   * @returns {{type:"attack"}|{type:"skill", id:string}}
   */
  function decideEnemyNextIntent(enemy) {
    const ef = (enemy && enemy.effects) || {};
    const skillsList = Array.isArray(enemy?.skills) ? enemy.skills : [];

    // 封印中はスキル禁止
    const st = enemy && enemy.status ? enemy.status : null;
    if (st && st.silenceTurns > 0) {
      return { type: "attack" };
    }

    // グローバルCT中はスキル禁止（連発防止）
    const globalCd = Number(enemy?.skillGlobalCooldown || 0);
    const canUseSkill = Number.isFinite(globalCd) ? globalCd <= 0 : true;

    const readySkills = skillsList.filter((id) => {
      const def = enemySkills[id];
      if (!def) return false;
      const cd = enemy?.skillCooldowns
        ? Number(enemy.skillCooldowns[id] || 0)
        : 0;
      return !Number.isFinite(cd) || cd <= 0;
    });

    let useSkill =
      canUseSkill && readySkills.length > 0 && Math.random() < 0.45;

    // 二つ名：魔導（魔法スキル優先）
    if (
      canUseSkill &&
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
      if (chosen) return { type: "skill", id: chosen };
    }

    return { type: "attack" };
  }

  /**
   * 敵の次行動を予告ログとして表示する。
   * @param {any} enemy
   * @param {{type:"attack"}|{type:"skill", id:string}} intent
   */
  function logEnemyIntentTelegraph(enemy, intent) {
    if (!enemy || !intent) return;

    // 通常攻撃の予告は出さない（スキル使用時のみ予告する）
    if (intent.type === "attack") return;

    if (intent.type === "skill") {
      const def = enemySkills[intent.id];
      if (!def) return;

      if (def.kind === "magic") {
        log(`🔮 ${enemy.displayName}は【${def.name}】を詠唱している…！`);
        return;
      }
      if (def.kind === "physical") {
        log(`⚠️ ${enemy.displayName}は【${def.name}】の構え…！`);
        return;
      }

      // バフ/デバフ/回復も予告する
      if (def.kind === "buff") {
        log(`✨ ${enemy.displayName}は【${def.name}】を使う構え…！`);
        return;
      }
      if (def.kind === "debuff") {
        log(`🌀 ${enemy.displayName}は【${def.name}】を放とうとしている…！`);
        return;
      }
      if (def.kind === "heal") {
        log(`💚 ${enemy.displayName}は【${def.name}】を使おうとしている…！`);
        return;
      }

      // それ以外のスキルも一応予告
      log(`⚠️ ${enemy.displayName}は【${def.name}】を使おうとしている…！`);
    }
  }

  /**
   * 敵の次行動を確定して、必要なら予告ログを出す。
   * @param {any} enemy
   */
  function planEnemyNextIntent(enemy) {
    if (!enemy) return;
    enemy.nextIntent = decideEnemyNextIntent(enemy);
    logEnemyIntentTelegraph(enemy, enemy.nextIntent);
  }

  function recordPlayerDamage(dmg) {
    const n = Number(dmg);
    if (!Number.isFinite(n)) return;
    const p = gameData.player;
    if (!p || typeof p !== "object") return;
    const cur = Number(p.maxDamage || 0);
    if (n > cur) p.maxDamage = Math.floor(n);
  }

  function advancePlayerSkillCooldown() {
    if (!gameData.player) return;
    if (
      !Number.isFinite(gameData.player.skillCooldown) ||
      gameData.player.skillCooldown < 0
    ) {
      gameData.player.skillCooldown = 0;
    }
    if (gameData.player.skillCooldown > 0) {
      gameData.player.skillCooldown--;
    }
  }

  // 敵を倒して enemyTurn() が発生しない場合でも、行動1回分の状態異常ターンを経過させる
  function advancePlayerStatusTurnsWithoutEnemyTurn() {
    const st = gameData.player?.status;
    if (!st || typeof st !== "object") return;

    if (st.poisonTurns > 0) st.poisonTurns--;

    if (st.burnTurns > 0) {
      st.burnTurns--;
      if (st.burnTurns <= 0) {
        log("🔥 火傷が治った");
      }
    }

    if (st.accuracyDownTurns > 0) {
      st.accuracyDownTurns--;
      if (st.accuracyDownTurns <= 0) {
        st.accuracyDownRate = 0;
      }
    }

    if (st.slowTurns > 0) {
      st.slowTurns--;
      if (st.slowTurns <= 0) st.slowRate = 0;
    }

    if (st.vulnerableTurns > 0) {
      st.vulnerableTurns--;
      if (st.vulnerableTurns <= 0) st.vulnerableRate = 0;
    }

    if (st.silenceTurns > 0) st.silenceTurns--;

    if (st.defendingTurns > 0) st.defendingTurns--;
  }

  function attack() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    if (incrementBattleActionAndCheckForcedEscape()) return;

    const st = gameData.player.status || (gameData.player.status = {});
    if (st.stunTurns > 0) {
      st.stunTurns--;
      log("⚡ しびれて動けない！");
      enemyTurn();
      return;
    }

    addJobProgress("attack", 1);

    // このアクション内の追撃は1回まで
    beginPlayerAction();

    const isAsura = gameData.player?.job === "asura";

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    // 命中判定
    const hitChance = Math.min(95, combat.accuracy - getEnemyAgiForHit(enemy));
    if (Math.random() * 100 > hitChance) {
      log("攻撃は外れた！");
      // 修羅：攻撃を行うたびに気を溜める（命中に関係なく）
      if (isAsura) gainQi(1);
      enemyTurn();
      return;
    }

    addJobProgress("attackHit", 1);

    // 会心判定
    const forceCrit = consumeNextCritFlag();
    const isCrit = forceCrit ? true : Math.random() * 100 < combat.critRate;
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

    // 職固有：剣士の「構え」(物理ダメージ+)
    const bsAtk = ensurePlayerBattleState();
    if (
      (gameData.player?.job === "swordsman" ||
        gameData.player?.job === "blademaster") &&
      (bsAtk.stance || 0) > 0
    ) {
      damage = damage * (1 + Math.min(0.6, (bsAtk.stance || 0) * 0.06));
    }
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyEnemyIncomingReduction(enemy, damage);

    damage = applyEnemyVulnerableTaken(enemy, damage);

    // 魔法騎士：通常攻撃時に魔法攻撃力の一部を追加ダメージ化
    let magicKnightBonusDamage = 0;
    if (
      typeof jt.magicKnightBonusRate === "number" &&
      jt.magicKnightBonusRate > 0
    ) {
      magicKnightBonusDamage = Math.max(
        0,
        Math.round(
          combat.magicPower *
            jt.magicKnightBonusRate *
            (0.9 + Math.random() * 0.2),
        ),
      );
      if (magicKnightBonusDamage > 0) {
        magicKnightBonusDamage = applyEnemyIncomingReduction(
          enemy,
          magicKnightBonusDamage,
        );
        magicKnightBonusDamage = applyEnemyVulnerableTaken(
          enemy,
          magicKnightBonusDamage,
        );
      }
    }

    const totalDamage = damage + magicKnightBonusDamage;

    enemy.hp -= totalDamage;
    recordPlayerDamage(totalDamage);
    log(`${totalDamage}のダメージ${isCrit ? " 会心！" : ""}`);
    if (magicKnightBonusDamage > 0) {
      log(`✨ 魔法追撃 ${magicKnightBonusDamage}ダメージ`);
    }

    // 特殊接頭語（onHit）
    applyPlayerOnHitSpecialEffects(enemy);
    // isCrit は分岐によっては未定義になりうるため、typeof で安全に参照する
    onPlayerHit({
      kind: "physical",
      isCrit: typeof isCrit !== "undefined" ? isCrit : false,
    });

    // 装飾品：HP吸収（与えたダメージの%を回復）
    const lsPct = Number(getLifeStealPercent() || 0);
    if (Number.isFinite(lsPct) && lsPct > 0) {
      const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
      const r = applyPlayerHeal(baseHeal);
      if (r.healed > 0 && r.barrierGained > 0) {
        log(`🩸 HP吸収で${r.healed}回復（🛡+${r.barrierGained}）`);
      } else if (r.healed > 0) {
        log(`🩸 HP吸収で${r.healed}回復`);
      } else if (r.barrierGained > 0) {
        log(`🛡 バリア+${r.barrierGained}`);
      }
    }
    // 職業：追撃（通常攻撃でも）
    const bs = ensurePlayerBattleState();
    if (bs.followUpOnAttack) {
      trySkillFollowUp(enemy, combat);
    }

    // 装飾品：追撃トリガー
    tryAccessoryPursuit(enemy, combat);

    // 修羅：攻撃を行うたびに気を溜める（命中に関係なく）
    if (isAsura) gainQi(1);
    checkBattleEnd();

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    } else {
      // 敵を倒して敵ターンが発生しない場合も、行動1回分のCTは進行させる
      advancePlayerSkillCooldown();
      advancePlayerStatusTurnsWithoutEnemyTurn();
    }
  }

  function defend() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    if (incrementBattleActionAndCheckForcedEscape()) return;

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

  function trySkillFollowUp(enemy, combat) {
    if (!enemy || enemy.hp <= 0) return;
    const bs = ensurePlayerBattleState();
    const ch = Number(bs.skillFollowUpChance || 0);
    if (!Number.isFinite(ch) || ch <= 0) return;
    if (Math.random() >= ch) return;

    const jt = jobs?.[gameData.player?.job]?.traits || {};
    const baseCritMul =
      typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
    const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
    const forceCrit = consumeNextCritFlag();
    const isCrit = forceCrit ? true : Math.random() * 100 < combat.critRate;
    const critMul = isCrit
      ? baseCritMul * (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
      : 1;

    const defF = getPhysicalDefenseFactor({ ignoreDef: 0.5 });

    const baseMul = 0.55 * (1 + (Number(bs.followUpDamageMulBonus) || 0));
    let damage = Math.max(
      1,
      (combat.attack - enemy.defense * defF) * baseMul * critMul,
    );
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));
    damage = applyEnemyIncomingReduction(enemy, damage);
    damage = applyEnemyVulnerableTaken(enemy, damage);
    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`🗡 追撃！ ${damage}ダメージ${isCrit ? " 会心！" : ""}`);

    applyPlayerOnHitSpecialEffects(enemy);
    onPlayerHit({ kind: "physical", isCrit });

    // HP吸収（追撃分）
    const lsPct = Number(getLifeStealPercent() || 0);
    if (Number.isFinite(lsPct) && lsPct > 0) {
      const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
      const r = applyPlayerHeal(baseHeal);
      if (r.healed > 0 && r.barrierGained > 0) {
        log(`🩸 HP吸収で${r.healed}回復（🛡+${r.barrierGained}）`);
      } else if (r.healed > 0) {
        log(`🩸 HP吸収で${r.healed}回復`);
      } else if (r.barrierGained > 0) {
        log(`🛡 バリア+${r.barrierGained}`);
      }
    }
  }

  // 装飾品：追撃（攻撃/スキル命中後に確率で追加攻撃。1アクションにつき最大1回）
  function tryAccessoryPursuit(enemy, combat) {
    if (!enemy || enemy.hp <= 0) return;
    if (gameData.gameState !== "BATTLE") return;

    const bs = ensurePlayerBattleState();
    if (bs.pursuitTriggeredThisAction) return;

    const firstV = Number(getAccessoryBonus("firstHitPursuit") || 0);
    const hasFirst =
      Number.isFinite(firstV) && firstV > 0 && !bs.firstHitPursuitUsed;

    const pct = Number(getAccessoryBonus("pursuitChance") || 0);

    // 初撃追撃が有効な場合：最初の追撃は確定
    if (hasFirst) {
      bs.firstHitPursuitUsed = true;
    } else {
      if (!Number.isFinite(pct) || pct <= 0) return;
      // 追撃/連続攻撃を統一：最大確率は旧「連続攻撃」に合わせて60%まで
      const chance = Math.min(0.6, Math.max(0, pct) / 100);
      if (Math.random() >= chance) return;
    }

    bs.pursuitTriggeredThisAction = true;

    const jt = jobs?.[gameData.player?.job]?.traits || {};
    const baseCritMul =
      typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
    const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
    const forceCrit = consumeNextCritFlag();
    const isCrit = forceCrit
      ? true
      : Math.random() * 100 < (combat?.critRate || 0);
    const critMul = isCrit
      ? baseCritMul * (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
      : 1;

    // 追撃/連続攻撃を統合：基礎倍率は中間の50%に寄せる
    const baseRate = 0.5;
    const execPct = Number(getAccessoryBonus("executeDamage") || 0);
    const execMul =
      Number.isFinite(execPct) &&
      execPct > 0 &&
      enemy.maxHp > 0 &&
      enemy.hp / enemy.maxHp <= 0.5
        ? 1 + Math.min(200, execPct) / 100
        : 1;

    const dmgPct = Math.min(
      150,
      Math.max(0, Number(getAccessoryBonus("pursuitDamagePct") || 0)),
    );
    let damage = Math.max(
      1,
      (combat.attack - enemy.defense * 0.5) *
        baseRate *
        (1 + dmgPct / 100) *
        critMul *
        execMul,
    );
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));
    damage = applyEnemyIncomingReduction(enemy, damage);
    damage = applyEnemyVulnerableTaken(enemy, damage);
    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`⚡ 追撃！ ${damage}ダメージ${isCrit ? " 会心！" : ""}`);

    applyPlayerOnHitSpecialEffects(enemy);
    onPlayerHit({ kind: "physical", isCrit });

    // HP吸収（追撃分）
    const lsPct = Number(getLifeStealPercent() || 0);
    if (Number.isFinite(lsPct) && lsPct > 0) {
      const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
      const r = applyPlayerHeal(baseHeal);
      if (r.healed > 0 && r.barrierGained > 0) {
        log(`🩸 HP吸収で${r.healed}回復（🛡+${r.barrierGained}）`);
      } else if (r.healed > 0) {
        log(`🩸 HP吸収で${r.healed}回復`);
      } else if (r.barrierGained > 0) {
        log(`🛡 バリア+${r.barrierGained}`);
      }
    }
  }

  function incrementBattleActionAndCheckForcedEscape() {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return false;

    const enemy = gameData.enemy;
    const nextCount = Math.floor(Number(enemy.playerActionCount || 0)) + 1;
    enemy.playerActionCount = nextCount;

    if (nextCount <= MAX_BATTLE_ACTIONS_BEFORE_ESCAPE) return false;

    log(
      `💨 行動回数が${MAX_BATTLE_ACTIONS_BEFORE_ESCAPE}回を超えたため、戦闘から逃げ出した…`,
    );

    if (Number.isFinite(Number(gameData.pendingFloorAfterWin))) {
      gameData.pendingFloorAfterWin = null;
    }

    endBattle(false);
    requestAutosave();
    return true;
  }

  function useSkill(slotIndex = 0) {
    if (gameData.gameState !== "BATTLE" || !gameData.enemy) return;

    const p = gameData.player || {};
    const idx = Number(slotIndex) === 1 ? 1 : 0;
    const list = Array.isArray(p.equippedSkills)
      ? p.equippedSkills
      : [p.equippedSkill, null];
    const skillKey = list[idx] != null ? String(list[idx]) : null;
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

    if (incrementBattleActionAndCheckForcedEscape()) return;

    const skillDef = skills[skillKey];
    if (!skillDef || typeof skillDef.effect !== "function") {
      log("スキルが設定されていない");
      return;
    }
    // 職業制限（上位職は下位職スキルを使用不可）
    const curJob = gameData.player?.job;
    const isCommonSkill = skillDef.job === "all";
    if (skillDef.job && !isCommonSkill && skillDef.job !== curJob) {
      log("この職業では使用できないスキルです");
      return;
    }
    const level =
      gameData.player.skills && gameData.player.skills[skillKey]
        ? gameData.player.skills[skillKey]
        : 0;
    const effect = skillDef.effect(level);

    // 修羅：攻撃（通常攻撃/攻撃スキル）を行うたびに気を溜める
    // ※スキル側は「攻撃系スキル（ダメージを与える効果）」のみ対象
    const isAsuraOffenseSkill =
      curJob === "asura" &&
      effect &&
      (typeof effect.baseDamage === "number" ||
        typeof effect.damageMultiplier === "number");

    // 防御系スキルの共通処理
    if (
      effect &&
      typeof effect.defendTurns === "number" &&
      effect.defendTurns > 0
    ) {
      const st2 = gameData.player.status || (gameData.player.status = {});
      st2.defendingTurns = Math.max(
        st2.defendingTurns || 0,
        Math.floor(effect.defendTurns),
      );
    }
    if (
      effect &&
      typeof effect.gainStance === "number" &&
      effect.gainStance > 0
    ) {
      gainStance(Math.floor(effect.gainStance));
    }

    if (
      effect &&
      typeof effect.nextCritTurns === "number" &&
      effect.nextCritTurns > 0
    ) {
      setNextCrit(Math.floor(effect.nextCritTurns));
    }

    addJobProgress("skillUse", 1);

    // このアクション内の追撃は1回まで
    beginPlayerAction();

    log(`🪄 ${skillDef.name || skillKey}を使用！`);

    const combat = getCombatStats();
    const enemy = gameData.enemy;

    const applyEnemyDebuffsFromSkillEffect = (eff) => {
      if (!enemy || !eff) return;

      /** @type {{type:string, turns?:number, rate?:number}[]} */
      const list = [];
      if (Array.isArray(eff.enemyDebuffs)) {
        for (const d of eff.enemyDebuffs) {
          if (d && typeof d.type === "string") list.push(d);
        }
      }

      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const pushTurns = (type, turns) => {
        const t = toNum(turns);
        if (t && t > 0) list.push({ type, turns: t });
      };
      const pushRateTurns = (type, turns, rate) => {
        const t = toNum(turns);
        const r = toNum(rate);
        if (t && t > 0)
          list.push({ type, turns: t, rate: r != null ? r : undefined });
      };

      pushTurns("stun", eff.enemyStunTurns);
      pushTurns("silence", eff.enemySilenceTurns);
      pushRateTurns(
        "vulnerable",
        eff.enemyVulnerableTurns,
        eff.enemyVulnerableRate,
      );
      pushRateTurns("slow", eff.enemySlowTurns, eff.enemySlowRate);
      pushRateTurns(
        "accuracyDown",
        eff.enemyAccuracyDownTurns,
        eff.enemyAccuracyDownRate,
      );

      if (list.length === 0) return;

      const st = ensureEnemyStatus(enemy) || {};
      const name = enemy.displayName || enemy.name || "敵";

      const applyTurnsOnly = (key, turns, msg) => {
        const t = Math.max(1, Math.min(5, Math.floor(Number(turns || 0))));
        const before = Number(st[key] || 0);
        st[key] = Math.max(before, t);
        if (st[key] > before) log(msg);
      };

      const applyRateAndTurns = (turnKey, rateKey, turns, rate, msg) => {
        const t = Math.max(1, Math.min(5, Math.floor(Number(turns || 0))));
        const beforeT = Number(st[turnKey] || 0);
        st[turnKey] = Math.max(beforeT, t);

        const r = clamp(Number(rate || 0), 0, 0.9);
        const beforeR = Number(st[rateKey] || 0);
        st[rateKey] = Math.max(beforeR, r);

        if (st[turnKey] > beforeT || st[rateKey] > beforeR) log(msg);
      };

      for (const d of list) {
        const type = d && typeof d.type === "string" ? d.type : "";
        if (type === "stun") {
          applyTurnsOnly("stunTurns", d.turns, `⚡ ${name}はしびれた！`);
        } else if (type === "silence") {
          applyTurnsOnly("silenceTurns", d.turns, `🔇 ${name}は封印された！`);
        } else if (type === "vulnerable") {
          applyRateAndTurns(
            "vulnerableTurns",
            "vulnerableRate",
            d.turns,
            d.rate,
            `💥 ${name}の体勢が崩れた！`,
          );
        } else if (type === "slow") {
          applyRateAndTurns(
            "slowTurns",
            "slowRate",
            d.turns,
            d.rate,
            `🐢 ${name}の動きが鈍った！`,
          );
        } else if (type === "accuracyDown") {
          applyRateAndTurns(
            "accuracyDownTurns",
            "accuracyDownRate",
            d.turns,
            d.rate,
            `🎯 ${name}の命中が下がった！`,
          );
        }
      }
    };

    // -------------------
    // スキル命中判定
    // - skillDef.accuracy: 1 = 1%（未設定は100%）
    // - combat.accuracy / enemy.agi を基礎に、スキル固有命中率で補正する
    // -------------------
    const skillAccRaw = Number(skillDef && skillDef.accuracy);
    const skillAcc = Number.isFinite(skillAccRaw) ? skillAccRaw : 100;
    const skillAlwaysHit = !!(skillDef && skillDef.alwaysHit);

    // 通常攻撃と同じ基礎命中（上限95%）
    const baseSkillHitChance = Math.min(
      95,
      combat.accuracy - getEnemyAgiForHit(enemy),
    );
    const skillHitChance = baseSkillHitChance * (clamp(skillAcc, 0, 200) / 100);

    const rollSkillHit = () =>
      skillAlwaysHit ? true : Math.random() * 100 <= skillHitChance;

    // 装飾品：スキル威力UP（%）
    const skillPowerPct = Number(getAccessoryBonus("skillPower") || 0);
    const skillMul = Number.isFinite(skillPowerPct)
      ? 1 + skillPowerPct / 100
      : 1;

    // スキル効果
    // 追い打ち：敵HPが50%以下のとき与ダメージUP（%）
    const execPctSkill = Number(getAccessoryBonus("executeDamage") || 0);

    if (typeof effect.healRate === "number") {
      // 回復スキル（%回復。自分対象のため命中判定なし）
      const rate = clamp(Number(effect.healRate) || 0, 0, 2);
      const baseHeal = Math.round(combat.maxHp * rate);
      const r = applyPlayerHeal(baseHeal);
      if (r.healed > 0 && r.barrierGained > 0) {
        log(`${r.healed}HP回復した！（🛡+${r.barrierGained}）`);
      } else if (r.healed > 0) {
        log(`${r.healed}HP回復した！`);
      } else if (r.barrierGained > 0) {
        log(`🛡 バリア+${r.barrierGained}`);
      } else {
        log("HPは満タンだ");
      }
    } else if (typeof effect.healAmount === "number") {
      // 回復スキル（自分対象のため命中判定なし）
      const jt = jobs?.[gameData.player?.job]?.traits || {};
      const healMult = typeof jt.healMult === "number" ? jt.healMult : 1;
      const healScale =
        typeof effect.healScale === "number" ? effect.healScale : 0.6;
      const baseHeal = Math.round(
        (effect.healAmount * healMult + combat.healPower * healScale) *
          skillMul,
      );
      const r = applyPlayerHeal(baseHeal);
      if (r.healed > 0 && r.barrierGained > 0) {
        log(`${r.healed}HP回復した！（🛡+${r.barrierGained}）`);
      } else if (r.healed > 0) {
        log(`${r.healed}HP回復した！`);
      } else if (r.barrierGained > 0) {
        log(`🛡 バリア+${r.barrierGained}`);
      } else {
        log("HPは満タンだ");
      }
    } else if (effect.baseDamage) {
      // 魔法攻撃
      addJobProgress("magic", 1);

      // 命中判定（スキル）
      if (!rollSkillHit()) {
        log("攻撃は外れた！");
      } else {
        let base =
          effect.baseDamage + combat.magicPower * (effect.magicScale || 1);

        let damage = base * skillMul;

        // 会心判定（スキルでも有効）
        const forceCritSkill = consumeNextCritFlag();
        const isCrit = forceCritSkill
          ? true
          : Math.random() * 100 < combat.critRate;
        const jt = jobs?.[gameData.player?.job]?.traits || {};
        const baseCritMul =
          typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
        const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
        const critMul = isCrit
          ? baseCritMul *
            (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
          : 1;
        if (isCrit) addJobProgress("crit", 1);
        damage = damage * critMul;
        damage = Math.round(damage * (0.9 + Math.random() * 0.2));
        if (
          Number.isFinite(execPctSkill) &&
          execPctSkill > 0 &&
          enemy.maxHp > 0 &&
          enemy.hp / enemy.maxHp <= 0.5
        ) {
          damage = Math.round(damage * (1 + Math.min(200, execPctSkill) / 100));
        }
        damage = applyEnemyVulnerableTaken(enemy, damage);
        enemy.hp -= damage;

        recordPlayerDamage(damage);
        log(`${damage}のダメージ！`);

        // 特殊接頭語（onHit）
        applyPlayerOnHitSpecialEffects(enemy);
        // isCrit は分岐によっては未定義になりうるため、typeof で安全に参照する
        onPlayerHit({
          kind: "physical",
          isCrit: typeof isCrit !== "undefined" ? isCrit : false,
        });

        applyEnemyDebuffsFromSkillEffect(effect);
        // 暗殺者：スキル追撃（命中してダメージを与えた後）
        trySkillFollowUp(enemy, combat);

        // 装飾品：追撃トリガー
        tryAccessoryPursuit(enemy, combat);
      }
    } else if (effect.damageMultiplier) {
      // 物理攻撃
      if (effect.hits) {
        // 連続攻撃（各ヒットで命中判定）
        let total = 0;
        let hitCount = 0;
        let missCount = 0;

        for (let i = 0; i < effect.hits; i++) {
          if (!rollSkillHit()) {
            missCount++;
            continue;
          }
          hitCount++;

          let damage = Math.max(
            1,
            (combat.attack - enemy.defense * 0.5) *
              effect.damageMultiplier *
              skillMul,
          );

          // 会心判定（スキルでも有効）
          const forceCritSkill = consumeNextCritFlag();
          const isCrit = forceCritSkill
            ? true
            : Math.random() * 100 < combat.critRate;
          const jt = jobs?.[gameData.player?.job]?.traits || {};
          const baseCritMul =
            typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
          const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
          const critMul = isCrit
            ? baseCritMul *
              (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
            : 1;
          if (isCrit) addJobProgress("crit", 1);
          damage = damage * critMul;

          // 剣聖：構え（物理ダメージ+）
          const bsS = ensurePlayerBattleState();
          if (gameData.player?.job === "blademaster" && (bsS.stance || 0) > 0) {
            damage = damage * (1 + Math.min(0.6, (bsS.stance || 0) * 0.06));
          }

          // 剣聖：剣聖の境地（構えを全消費して威力上昇）
          if (skillKey === "blademaster_iai") {
            const s = consumeAllStance();
            if (s > 0) {
              // lv は useSkill 内で level という名前で保持しているため参照ミスを修正
              damage = damage * (1 + s * 0.25 + level * 0.1);
              log(`⚔ 構え${s}を消費！`);
            }
          }

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
          damage = applyEnemyVulnerableTaken(enemy, damage);
          enemy.hp -= damage;
          total += damage;

          // 特殊接頭語（onHit）
          applyPlayerOnHitSpecialEffects(enemy);
          // isCrit は分岐によっては未定義になりうるため、typeof で安全に参照する
          onPlayerHit({
            kind: "physical",
            isCrit: typeof isCrit !== "undefined" ? isCrit : false,
          });
        }

        if (hitCount > 0) {
          recordPlayerDamage(total);
          log(
            `${effect.hits}回攻撃！ 合計${total}ダメージ${
              missCount > 0 ? `（${missCount}回外れ）` : ""
            }`,
          );

          applyEnemyDebuffsFromSkillEffect(effect);

          // 回復効果（合計与ダメの%回復）
          if (effect.healPercent) {
            const baseHeal = Math.max(
              1,
              Math.round(total * effect.healPercent),
            );
            const r = applyPlayerHeal(baseHeal);
            if (r.healed > 0 && r.barrierGained > 0) {
              log(`${r.healed}HP回復した！（🛡+${r.barrierGained}）`);
            } else if (r.healed > 0) {
              log(`${r.healed}HP回復した！`);
            } else if (r.barrierGained > 0) {
              log(`🛡 バリア+${r.barrierGained}`);
            }
          }

          // 暗殺者：スキル追撃（命中してダメージを与えた後）
          trySkillFollowUp(enemy, combat);

          // 装飾品：HP吸収（合計ダメージから）
          const lsPct = Number(getLifeStealPercent() || 0);
          if (Number.isFinite(lsPct) && lsPct > 0) {
            const baseHeal = Math.max(1, Math.round(total * (lsPct / 100)));
            const r = applyPlayerHeal(baseHeal);
            if (r.healed > 0 && r.barrierGained > 0) {
              log(`🩸 HP吸収で${r.healed}回復（🛡+${r.barrierGained}）`);
            } else if (r.healed > 0) {
              log(`🩸 HP吸収で${r.healed}回復`);
            } else if (r.barrierGained > 0) {
              log(`🛡 バリア+${r.barrierGained}`);
            }
          }

          // 装飾品：追撃トリガー
          tryAccessoryPursuit(enemy, combat);
        } else {
          log("攻撃は外れた！");
        }
      } else {
        // 単発攻撃（命中判定あり）
        if (!rollSkillHit()) {
          log("攻撃は外れた！");
        } else {
          let damage = Math.max(
            1,
            (combat.attack - enemy.defense * getPhysicalDefenseFactor(effect)) *
              effect.damageMultiplier *
              skillMul,
          );

          // 会心判定（スキルでも有効）
          const forceCritSkill = consumeNextCritFlag();
          const isCrit = forceCritSkill
            ? true
            : Math.random() * 100 < combat.critRate;
          const jt = jobs?.[gameData.player?.job]?.traits || {};
          const baseCritMul =
            typeof jt.critDamageMul === "number" ? jt.critDamageMul : 2;
          const critDmgPct = Number(getAccessoryBonus("critDamage") || 0);
          const critMul = isCrit
            ? baseCritMul *
              (1 + (Number.isFinite(critDmgPct) ? critDmgPct : 0) / 100)
            : 1;
          if (isCrit) addJobProgress("crit", 1);
          damage = damage * critMul;

          // 剣聖：構え（物理ダメージ+）
          const bsS = ensurePlayerBattleState();
          if (gameData.player?.job === "blademaster" && (bsS.stance || 0) > 0) {
            damage = damage * (1 + Math.min(0.6, (bsS.stance || 0) * 0.06));
          }

          // 剣聖：剣聖の境地（構えを全消費して威力上昇）
          if (skillKey === "blademaster_iai") {
            const s = consumeAllStance();
            if (s > 0) {
              // lv は useSkill 内で level という名前で保持しているため参照ミスを修正
              damage = damage * (1 + s * 0.25 + level * 0.1);
              log(`⚔ 構え${s}を消費！`);
            }
          }

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
          damage = applyEnemyVulnerableTaken(enemy, damage);
          enemy.hp -= damage;
          recordPlayerDamage(damage);
          log(`${damage}のダメージ！`);

          // 特殊接頭語（onHit）
          applyPlayerOnHitSpecialEffects(enemy);
          // isCrit は分岐によっては未定義になりうるため、typeof で安全に参照する
          onPlayerHit({
            kind: "physical",
            isCrit: typeof isCrit !== "undefined" ? isCrit : false,
          });

          applyEnemyDebuffsFromSkillEffect(effect);
          // 暗殺者：スキル追撃（命中してダメージを与えた後）
          trySkillFollowUp(enemy, combat);

          // 回復効果（与ダメの%回復）
          if (effect.healPercent) {
            const baseHeal = Math.round(damage * effect.healPercent);
            const r = applyPlayerHeal(baseHeal);
            if (r.healed > 0 && r.barrierGained > 0) {
              log(`${r.healed}HP回復した！（🛡+${r.barrierGained}）`);
            } else if (r.healed > 0) {
              log(`${r.healed}HP回復した！`);
            } else if (r.barrierGained > 0) {
              log(`🛡 バリア+${r.barrierGained}`);
            }
          }

          // 装飾品：HP吸収
          const lsPct = Number(getLifeStealPercent() || 0);
          if (Number.isFinite(lsPct) && lsPct > 0) {
            const baseHeal = Math.max(1, Math.round(damage * (lsPct / 100)));
            const r = applyPlayerHeal(baseHeal);
            if (r.healed > 0 && r.barrierGained > 0) {
              log(`🩸 HP吸収で${r.healed}回復（🛡+${r.barrierGained}）`);
            } else if (r.healed > 0) {
              log(`🩸 HP吸収で${r.healed}回復`);
            } else if (r.barrierGained > 0) {
              log(`🛡 バリア+${r.barrierGained}`);
            }
          }

          // 装飾品：追撃トリガー
          tryAccessoryPursuit(enemy, combat);
        }
      }
    }

    let pendingSkillCdFinal = 0;

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
      pendingSkillCdFinal = cdFinal;
    }

    // 装飾品：クールタイム踏み倒し（確率でCT0）
    {
      const cheatPct = Number(getAccessoryBonus("cooldownCheatChance") || 0);
      if (
        pendingSkillCdFinal > 0 &&
        Number.isFinite(cheatPct) &&
        cheatPct > 0 &&
        Math.random() * 100 < Math.min(35, cheatPct)
      ) {
        pendingSkillCdFinal = 0;
        log("⏱ クールタイムを踏み倒した！");
      }
    }

    // 修羅：攻撃スキルを使用したら気+1（命中に関係なく）
    if (isAsuraOffenseSkill) gainQi(1);

    checkBattleEnd();

    // NOTE: enemyTurn() 冒頭でCTが1減るため、行動直後はいったん +1 しておく。
    // 戦闘終了でenemyTurn()が走らない場合は後段で手動で1減らす。
    if (pendingSkillCdFinal > 0) {
      gameData.player.skillCooldown = pendingSkillCdFinal + 1;
    }

    if (gameData.gameState === "BATTLE") {
      enemyTurn();
    } else {
      // 敵を倒して敵ターンが発生しない場合も、行動1回分のCTは進行させる
      advancePlayerSkillCooldown();
      advancePlayerStatusTurnsWithoutEnemyTurn();
    }
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
    advancePlayerSkillCooldown();

    const enemy = gameData.enemy;
    const combat = getCombatStats();

    // 敵の状態異常ダメージ（敵ターン開始時に1回）
    tickEnemyDotStatuses(enemy);
    if (gameData.gameState !== "BATTLE") {
      return;
    }

    // 状態異常ダメージ（敵ターン開始時に1回）
    const st = gameData.player.status || (gameData.player.status = {});
    if (st.poisonTurns > 0) {
      const maxHp = Math.max(1, gameData.player.maxHp || 1);
      const pct = Math.round(POISON_MAXHP_RATE * 100);
      const dmg = Math.max(1, Math.round(maxHp * POISON_MAXHP_RATE));
      const r = applyPlayerDamage(dmg);
      st.poisonTurns--;
      log(
        `☠ 毒で${r.total}ダメージ（最大HP${pct}%）${r.barrierUsed ? `（🛡-${r.barrierUsed}）` : ""}`,
      );
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
    }
    if (st.burnTurns > 0) {
      const maxHp = Math.max(1, gameData.player.maxHp || 1);
      const pct = Math.round(BURN_DOT_MAXHP_RATE * 1000) / 10;
      const dmg = Math.max(1, Math.round(maxHp * BURN_DOT_MAXHP_RATE));
      const r = applyPlayerDamage(dmg);
      st.burnTurns--;
      log(
        `🔥 火傷で${r.total}ダメージ（最大HP${pct}%）${r.barrierUsed ? `（🛡-${r.barrierUsed}）` : ""}`,
      );
      if (gameData.player.hp <= 0) {
        updateUI();
        checkPlayerDeath();
        requestAutosave();
        return;
      }
      if (st.burnTurns <= 0) {
        log("🔥 火傷が治った");
      }
    }

    // 装飾品：再生（敵ターン開始時に回復）
    const regenPct = Number(getAccessoryBonus("regen") || 0);
    if (Number.isFinite(regenPct) && regenPct > 0 && gameData.player.hp > 0) {
      const maxHp = Math.max(1, gameData.player.maxHp || 1);
      const canGainBarrier =
        getMaxPlayerBarrier() > 0 && getPlayerBarrier() < getMaxPlayerBarrier();
      if (gameData.player.hp < maxHp || canGainBarrier) {
        const baseHeal = Math.max(1, Math.round(maxHp * (regenPct / 100)));
        const r = applyPlayerHeal(baseHeal);
        if (r.healed > 0 && r.barrierGained > 0) {
          log(`✨ 再生で${r.healed}回復（🛡+${r.barrierGained}）`);
        } else if (r.healed > 0) {
          log(`✨ 再生で${r.healed}回復`);
        } else if (r.barrierGained > 0) {
          log(`🛡 バリア+${r.barrierGained}`);
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

    // 防御低下（脆弱）のターン経過
    if (st.vulnerableTurns > 0) {
      st.vulnerableTurns--;
      if (st.vulnerableTurns <= 0) st.vulnerableRate = 0;
    }

    // 封印のターン経過
    if (st.silenceTurns > 0) {
      st.silenceTurns--;
    }

    // 敵クールダウン減少（個別 + グローバル）
    enemy.skillCooldowns = enemy.skillCooldowns || {};
    for (let k in enemy.skillCooldowns) {
      if (enemy.skillCooldowns[k] > 0) enemy.skillCooldowns[k]--;
    }
    if (
      !Number.isFinite(enemy.skillGlobalCooldown) ||
      enemy.skillGlobalCooldown < 0
    ) {
      enemy.skillGlobalCooldown = 0;
    }
    if (enemy.skillGlobalCooldown > 0) enemy.skillGlobalCooldown--;

    // 二つ名: 再生
    const ef = enemy.effects || {};
    if (typeof ef.regenRate === "number" && ef.regenRate > 0) {
      const heal = Math.max(1, Math.round(enemy.maxHp * ef.regenRate));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      log(`✨ ${enemy.displayName}はHPを${heal}回復した`);
    }

    // 行動（予告済みの行動を実行）
    // スタン中は行動できない
    const est = ensureEnemyStatus(enemy) || {};
    let skippedByStun = false;
    if (est.stunTurns > 0) {
      est.stunTurns--;
      log(`⚡ ${enemy.displayName}はしびれて動けない！`);
      skippedByStun = true;
      enemy.nextIntent = null; // 予告行動は破棄
    }

    if (!skippedByStun) {
      enemy.turnCount = (enemy.turnCount || 0) + 1;

      const intent = enemy.nextIntent || decideEnemyNextIntent(enemy);
      enemy.nextIntent = null;

      if (intent && intent.type === "skill") {
        performEnemySkill(intent.id);
      } else {
        performEnemyAttack();
      }

      // 二つ名: 神速（追加行動）
      if (
        gameData.gameState === "BATTLE" &&
        gameData.player.hp > 0 &&
        ef.extraTurnChance &&
        Math.random() < ef.extraTurnChance
      ) {
        log(`⚡ ${enemy.displayName}は素早くもう一度行動した！`);
        performEnemyAttack();
      }
    }

    // 敵デバフのターン経過（行動後に消費）
    tickEnemyDebuffTurnsAfterAction(enemy);

    // 防御状態の消費（1ターン）
    if (st.defendingTurns > 0) st.defendingTurns--;

    // 次の敵行動を予告（プレイヤーの選択の前に見せる）
    if (gameData.gameState === "BATTLE" && gameData.player.hp > 0) {
      planEnemyNextIntent(enemy);
    }

    updateUI();
    checkPlayerDeath();
    requestAutosave();
  }

  function enemyDidHit(evasionPenalty = 0) {
    const enemy = gameData.enemy;
    const combat = getCombatStats();

    // 必中なら回避判定なし
    if (enemy.effects && enemy.effects.alwaysHit) return true;

    const st = enemy && enemy.status ? enemy.status : null;
    const accDownRate =
      st && st.accuracyDownTurns > 0 ? Number(st.accuracyDownRate || 0) : 0;
    const bonusEvasion = Math.round(clamp(accDownRate, 0, 0.9) * 100);

    // 回避率で判定（命中低下は「相手の回避が上がる」として扱う）
    const evasion = Math.max(0, combat.evasion - evasionPenalty + bonusEvasion);
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

    // 防御が高すぎると常に1ダメになりがちなので、軽減には上限を設ける
    // （最低でも base の一定割合は通す）
    const defenseCut = reducedDefense * defFactor;
    const maxCutRate = isMagic ? 0.6 : 0.65; // magic は少し控えめに軽減
    const maxCut = base * maxCutRate;

    return Math.max(1, Math.round(base - Math.min(defenseCut, maxCut)));
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

    function checkChance(baseChance, resistMsg) {
      const base = Number(baseChance);
      if (!Number.isFinite(base) || base <= 0) return false;

      const resistPct =
        clamp(Number(getAccessoryBonus("ailmentResist") || 0), 0, 90) / 100;
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
      checkChance(ef.poisonOnHitChance, "🛡 毒を防いだ！")
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
      checkChance(fromSkillDef.poisonChance, "🛡 毒を防いだ！")
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
      checkChance(fromSkillDef.burnChance, "🛡 火傷を防いだ！")
    ) {
      st.burnTurns = Math.max(
        st.burnTurns || 0,
        adjustedTurns(fromSkillDef.burnTurns || DEFAULT_BURN_TURNS),
      );
      log("🔥 火傷状態になった！");
    }

    // 命中低下
    if (
      fromSkillDef &&
      fromSkillDef.debuff &&
      fromSkillDef.debuff.accuracyDownTurns
    ) {
      if (checkChance(1, "🛡 命中低下を防いだ！")) {
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

    // しびれ
    if (
      fromSkillDef &&
      fromSkillDef.stunChance &&
      checkChance(fromSkillDef.stunChance, "🛡 しびれを防いだ！")
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
      checkChance(fromSkillDef.slowChance, "🛡 鈍足を防いだ！")
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
      checkChance(fromSkillDef.vulnerableChance, "🛡 脆弱を防いだ！")
    ) {
      st.vulnerableTurns = Math.max(
        st.vulnerableTurns || 0,
        adjustedTurns(fromSkillDef.vulnerableTurns || 2),
      );
      st.vulnerableRate = Math.max(
        st.vulnerableRate || 0,
        fromSkillDef.vulnerableRate || 0.25,
      );
      log("🛡 防御力が下がった！");
    }

    // 封印
    if (
      fromSkillDef &&
      fromSkillDef.silenceChance &&
      checkChance(fromSkillDef.silenceChance, "🛡 封印を防いだ！")
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

  function getLifeStealPercent() {
    const bs = ensurePlayerBattleState();
    // 装備/装飾品のHP吸収（%） + 戦闘中パッシブ加算（%） + 職業特性（%）
    // ※ここで自分自身を呼ぶと再帰して落ちるので getAccessoryBonus を参照する
    const a = Number(getAccessoryBonus("lifeSteal") || 0);
    const p = Number(bs.lifeStealPctBonus || 0);
    const jt = jobs?.[gameData.player?.job]?.traits || {};
    const j = Number(jt.lifeSteal || 0);
    const sum =
      (Number.isFinite(a) ? a : 0) +
      (Number.isFinite(p) ? p : 0) +
      (Number.isFinite(j) ? j : 0);
    return Math.min(60, Math.max(0, sum));
  }

  function applyEvadeHeal() {
    const v = Number(getAccessoryBonus("evadeHeal") || 0);
    if (!Number.isFinite(v) || v <= 0) return;
    const baseHeal = Math.max(1, Math.round(v));
    const r = applyPlayerHeal(baseHeal);
    if (r.healed > 0 && r.barrierGained > 0) {
      log(`✨ 回避で${r.healed}回復（🛡+${r.barrierGained}）`);
    } else if (r.healed > 0) {
      log(`✨ 回避で${r.healed}回復`);
    } else if (r.barrierGained > 0) {
      log(`🛡 バリア+${r.barrierGained}`);
    }
  }

  function tryCounterAttack() {
    if (gameData.gameState !== "BATTLE") return;
    const enemy = gameData.enemy;
    if (!enemy) return;
    if (enemy.hp <= 0) return;
    if (gameData.player.hp <= 0) return;

    const bsC = ensurePlayerBattleState();
    const accChance = Number(getAccessoryBonus("counterChance") || 0);
    const passiveChance = Number(bsC.counterChanceBonus || 0);
    const chance =
      (Number.isFinite(accChance) ? accChance : 0) +
      (Number.isFinite(passiveChance) ? passiveChance : 0);
    if (!Number.isFinite(chance) || chance <= 0) return;
    const roll = Math.random() * 100;
    if (roll >= Math.min(45, chance)) return;

    const combat = getCombatStats();
    const dmgPct = Number(getAccessoryBonus("counterDamage") || 0);
    const passivePct = Number(bsC.counterDamageBonus || 0);
    const mul =
      1 +
      (Number.isFinite(dmgPct) ? Math.min(200, dmgPct) : 0) / 100 +
      (Number.isFinite(passivePct) ? passivePct : 0) / 100;

    let damage = Math.max(
      1,
      (combat.attack - enemy.defense * 0.35) * 0.65 * mul,
    );
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));
    damage = applyEnemyIncomingReduction(enemy, damage);

    damage = applyEnemyVulnerableTaken(enemy, damage);
    enemy.hp -= damage;
    recordPlayerDamage(damage);
    log(`↩️ 反撃！ ${damage}ダメージ`);

    // 特殊接頭語（onHit）
    applyPlayerOnHitSpecialEffects(enemy);
    onPlayerHit({ kind: "physical", isCrit: false });
    checkBattleEnd();
  }

  function performEnemyAttack() {
    const enemy = gameData.enemy;

    if (!enemyDidHit(0)) {
      addJobProgress("evade", 1);
      gameData.player.totalEvades = (gameData.player.totalEvades || 0) + 1;
      log(`${enemy.displayName}の攻撃を回避した！`);
      applyEvadeHeal();
      onPlayerEvade();
      return;
    }

    let damage = enemyDamageBase(false);
    damage = applyEnemyOutgoingMultipliers(damage);
    damage = Math.round(damage * (0.9 + Math.random() * 0.2));

    damage = applyPlayerGuardReduction(damage);

    damage = applyPlayerIncomingReduction(damage);

    const r = applyPlayerDamage(damage, { source: "enemy" });
    log(
      `◀ ${enemy.displayName}の攻撃！ ${r.total}ダメージ${r.barrierUsed ? `（🛡-${r.barrierUsed}）` : ""}`,
    );

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

    // 連発防止：スキルを使ったら次ターンはスキル禁止
    enemy.skillGlobalCooldown = 1;

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
      gameData.player.totalEvades = (gameData.player.totalEvades || 0) + 1;
      log("しかし攻撃は回避された！");
      applyEvadeHeal();
      onPlayerEvade();
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
      damage = applyPlayerIncomingReduction(damage);
      const r = applyPlayerDamage(damage, { source: "enemy" });
      total += r.total;

      if (gameData.player.hp <= 0) break;
    }

    log(`💥 ${total}ダメージ`);
    applyOnHitStatuses(def);
    tryCounterAttack();
  }

  function evaluateAutoSellDropItem(item) {
    if (!item) return false;
    const p = gameData && gameData.player ? gameData.player : null;
    ensureAutoSellConfig(p);
    const cfg = p && p.autoSell ? p.autoSell : null;
    if (!cfg) return false;

    const v = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

    if (item.category === "armor") {
      const defense = v(item.defense);
      return defense <= Number(cfg.armorDefenseMax || 0);
    }

    if (item.category === "weapon") {
      const attack = v(item.attack);
      const healPower = v(item.healPower);
      const magicAttack = v(item.magicAttack);
      return (
        attack <= Number(cfg.weaponAttackMax || 0) &&
        healPower <= Number(cfg.weaponHealPowerMax || 0) &&
        magicAttack <= Number(cfg.weaponMagicAttackMax || 0)
      );
    }

    return false;
  }

  function checkBattleEnd() {
    const enemy = gameData.enemy;
    if (!enemy) return;

    if (enemy.hp <= 0) {
      log(`${enemy.displayName}を倒した！`);
      if (enemy.isBoss) {
        log(`🏆 ボスを撃破した！`);
      }

      // 撃破カウント
      if (
        !gameData.player.jobKills ||
        typeof gameData.player.jobKills !== "object"
      ) {
        gameData.player.jobKills = {};
      }
      const jk = Number(gameData.player.jobKills[gameData.player.job] || 0);
      gameData.player.jobKills[gameData.player.job] =
        (Number.isFinite(jk) ? jk : 0) + 1;
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
      const hasExpLevelMultiplier =
        Number(gameData.player?.skills?.common_exp_level_mult || 0) > 0;
      const levelExpMultiplier = hasExpLevelMultiplier
        ? Math.max(1, Number(gameData.player?.level || 1))
        : 1;
      const expAchRate = getAchievementExpBonusRate();
      const jobExpRate =
        typeof jobs?.[gameData.player?.job]?.traits?.expRate === "number"
          ? jobs[gameData.player.job].traits.expRate
          : 0;
      exp = Math.round(
        exp *
          (1 + expBonus / 100) *
          (1 + expSkillBonus / 100) *
          levelExpMultiplier *
          (1 + expAchRate) *
          (1 + jobExpRate),
      );

      gameData.player.exp += exp;
      log(`${exp}EXPを獲得！`);

      checkLevelUp();

      // ドロップ判定
      let dropChance = 30;
      dropChance += getAccessoryBonus("dropRate");
      dropChance += getAchievementItemDropRateBonus();
      dropChance +=
        typeof jobs?.[gameData.player?.job]?.traits?.dropRateBonus === "number"
          ? jobs[gameData.player.job].traits.dropRateBonus
          : 0;

      const willDrop = Math.random() * 100 < dropChance;

      if (willDrop) {
        const isNamedEnemy = !!enemy.isNamed;
        const isHighSearchNamedEnemy =
          isNamedEnemy && Number(enemy?.epithet?.minSearch || 0) >= 150;
        const forcedSpecialPrefixRarityPool = isNamedEnemy
          ? isHighSearchNamedEnemy
            ? ["rare", "epic", "legendary"]
            : ["rare", "epic"]
          : null;
        const item = generateEquipment({
          player: gameData.player,
          specialPrefixEnabled: isNamedEnemy,
          specialPrefixRarityPool: forcedSpecialPrefixRarityPool,
        });
        if (isInAsuraWorld() && item && typeof item === "object") {
          ["attack", "defense", "magicAttack", "healPower"].forEach((k) => {
            const v = Number(item[k]);
            if (Number.isFinite(v) && v > 0) {
              item[k] = Math.max(1, Math.round(v * ASURA_ITEM_STAT_MULTIPLIER));
            }
          });
        }
        const soldByAutoSell = evaluateAutoSellDropItem(item);
        const skipAccessoryPickup = shouldSkipAccessoryPickupByOwnedValue(
          item,
          gameData.player,
        );

        if (skipAccessoryPickup) {
          log(`⏭️ ${item.name}は同系統の装飾品より効果値が低いため見送った。`);
        } else if (soldByAutoSell) {
          log(`💸 ${item.name}を自動売却した。`);
        } else {
          gameData.player.inventory.push(item);
          log(`${item.name}を手に入れた！`);
        }

        // 特殊接頭語（固有効果付き）装備のドロップ時はポップアップ表示
        if (
          !soldByAutoSell &&
          !skipAccessoryPickup &&
          item &&
          typeof item._specialPrefixName === "string" &&
          item._specialPrefixName &&
          typeof window.showRareEnemyPopup === "function"
        ) {
          const rarityText =
            typeof item._specialPrefixRarity === "string" &&
            item._specialPrefixRarity
              ? item._specialPrefixRarity
              : typeof item.rarity === "string"
                ? item.rarity
                : "rare";
          const rarityLabel =
            rarityText === "legendary"
              ? "レジェンダリー"
              : rarityText === "epic"
                ? "エピック"
                : "レア";
          window.showRareEnemyPopup(
            item.name,
            `${rarityLabel}装備を手に入れた！`,
            {
              autoClose: false,
              allowOverlayClose: false,
              showCloseButton: true,
              hintText: "閉じるボタンで閉じる",
            },
          );
        }
      }

      // 貴重品（秘宝）ドロップ（固定 1/1000）
      if (Math.random() < RELIC_DROP_CHANCE) {
        const def = RELIC_DEFS[Math.floor(Math.random() * RELIC_DEFS.length)];
        addValuableByDef(def, 1);
        log(`✨${RELIC_FAMILY_NAME}を発見！ ${def.name}を手に入れた！`);
      }

      // 地図の切れ端ドロップ（通常ドロップとは別判定 / 固定 1/10,000,000）
      // 5個持っている場合はドロップしない。
      const mapFragmentCount = getValuableCountById(
        gameData.player,
        MAP_FRAGMENT_ID,
      );
      if (
        mapFragmentCount < MAP_FRAGMENT_MAX_STACK_FOR_DROP &&
        Math.random() < MAP_FRAGMENT_DROP_CHANCE
      ) {
        addValuableByDef(MAP_FRAGMENT_DEF, 1);
        log(
          `🗺️ ${getMapFragmentDisplayName(mapFragmentCount + 1)}を手に入れた！ (${mapFragmentCount + 1}/5)`,
        );
        if (typeof window.showRareEnemyPopup === "function") {
          window.showRareEnemyPopup(
            getMapFragmentDisplayName(mapFragmentCount + 1),
            "超低確率ドロップ！",
            {
              autoClose: false,
              allowOverlayClose: false,
              showCloseButton: true,
              hintText: "とても珍しい発見だ…",
            },
          );
        }
      }

      // 敵を倒したら階層が上がる（進行待ちがある場合）
      if (Number.isFinite(Number(gameData.pendingFloorAfterWin))) {
        const stayCurrentFloor =
          isStayBattleUnlocked() &&
          !!(
            gameData.player &&
            gameData.player.serialOptions &&
            gameData.player.serialOptions.stayBattleCurrentFloor
          );
        const nf = clampFloor(Number(gameData.pendingFloorAfterWin));
        gameData.pendingFloorAfterWin = null;

        if (stayCurrentFloor) {
          log("📍 シリアル特典で現在の階層に留まった");
        } else {
          gameData.floor = nf;

          if (typeof gameData.player.maxReachedFloor !== "number")
            gameData.player.maxReachedFloor = 1;
          gameData.player.maxReachedFloor = Math.max(
            gameData.player.maxReachedFloor,
            gameData.floor,
          );
          gameData.player.maxReachedFloor = clampFloor(
            gameData.player.maxReachedFloor,
          );
          checkAndUnlockAchievements();
          log(`✅ ${gameData.floor}階層へ進んだ！`);
        }
      }

      // 取得した貴重品でステータスが変わることがあるので、ここで反映
      getCombatStats();
      endBattle(true);
    }

    updateUI();
  }

  function checkPlayerDeath() {
    if (gameData.player.hp <= 0) {
      // 1回だけ死亡回避（ダメージ以外で0以下になったケースの保険）
      if (tryDeathAvoidOnce()) {
        updateUI();
        return;
      }

      const totalDefeats = Number(gameData.player.totalDefeats || 0);
      gameData.player.totalDefeats = Number.isFinite(totalDefeats)
        ? Math.max(0, Math.floor(totalDefeats) + 1)
        : 1;

      if (
        !gameData.player.jobDefeats ||
        typeof gameData.player.jobDefeats !== "object"
      ) {
        gameData.player.jobDefeats = {};
      }
      const curJobDef = Number(
        gameData.player.jobDefeats[gameData.player.job] || 0,
      );
      gameData.player.jobDefeats[gameData.player.job] =
        (Number.isFinite(curJobDef) ? Math.max(0, Math.floor(curJobDef)) : 0) +
        1;

      if (isFullyUnequipped(gameData.player)) {
        const cur = Number(gameData.player.nakedDefeats || 0);
        gameData.player.nakedDefeats = Number.isFinite(cur)
          ? Math.max(0, Math.floor(cur) + 1)
          : 1;
      }
      checkAndUnlockAchievements();

      const stayCurrentFloor =
        isStayBattleUnlocked() &&
        !!(
          gameData.player &&
          gameData.player.serialOptions &&
          gameData.player.serialOptions.stayBattleCurrentFloor
        );
      log("☠ 力尽きた…");
      gameData.player.hp = gameData.player.maxHp;
      if (stayCurrentFloor) {
        log("📍 シリアル特典で現在の階層に留まった");
      } else {
        const checkpointFloor = Math.floor(gameData.floor / 50) * 50;
        const fallbackFloor = gameData.floor - 20;
        gameData.floor = Math.max(1, Math.max(checkpointFloor, fallbackFloor));
      }
      endBattle(false);
    }
  }

  function endBattle(victory) {
    gameData.gameState = "EXPLORE";
    gameData.enemy = null;

    // 戦闘専用リソースは戦闘終了で消す
    try {
      const bs = ensurePlayerBattleState();
      bs.barrier = 0;
      bs.deathAvoidUsed = false;
      bs.pursuitTriggeredThisAction = false;
    } catch (e) {
      // no-op
    }

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
    const p = gameData.player;

    const canAutoAllocateExpUp = () => {
      if (!p || !p.autoAllocateExpUp) return false;
      const def = skills && skills.exp_up;
      if (!def) return false;
      const curLv = Math.max(
        0,
        Math.floor(Number((p.skills && p.skills.exp_up) || 0)),
      );
      if (def.maxLevel !== Infinity && curLv >= Number(def.maxLevel || 0))
        return false;
      const costRaw = Number(def.requiredPoints);
      const cost =
        !Number.isFinite(costRaw) || costRaw <= 0
          ? 1
          : Math.max(1, Math.floor(costRaw));
      return Math.floor(Number(p.skillPoints || 0)) >= cost;
    };

    const doAutoAllocateExpUp = () => {
      const def = skills.exp_up;
      const costRaw = Number(def.requiredPoints);
      const cost =
        !Number.isFinite(costRaw) || costRaw <= 0
          ? 1
          : Math.max(1, Math.floor(costRaw));
      if (!p.skills || typeof p.skills !== "object") p.skills = {};
      const curLv = Math.max(0, Math.floor(Number(p.skills.exp_up || 0)));
      p.skills.exp_up = curLv + 1;
      p.skillPoints = Math.max(
        0,
        Math.floor(Number(p.skillPoints || 0)) - cost,
      );
      log(
        `⚙️ 経験値増加に自動割り振り（レベル${p.skills.exp_up} / ポイント-${cost}）`,
      );
    };

    const canAutoAllocateStatPoints = () => {
      if (!p || !p.autoAllocateStatPoints) return false;
      const target =
        typeof p.autoAllocateStatTarget === "string"
          ? p.autoAllocateStatTarget
          : "";
      if (!(target in (p.allocatedStats || {}))) return false;
      return Math.floor(Number(p.statPoints || 0)) > 0;
    };

    const doAutoAllocateStatPoints = () => {
      const target = p.autoAllocateStatTarget;
      if (!p.allocatedStats || typeof p.allocatedStats !== "object") return;
      p.allocatedStats[target] =
        Math.max(0, Math.floor(Number(p.allocatedStats[target] || 0))) + 1;
      p.statPoints = Math.max(0, Math.floor(Number(p.statPoints || 0)) - 1);
      const labels = {
        strength: "⚔️ 力",
        vitality: "❤️ 体力",
        intelligence: "🧙 賢さ",
        agility: "⚡ 素早さ",
        dexterity: "🎯 器用さ",
      };
      log(`⚙️ ステータス自動割り振り: ${labels[target] || target} +1`);
    };

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

      log(`レベルアップ！ レベル${gameData.player.level}`);
      log("ステータスポイントとスキルポイントを獲得！");

      if (canAutoAllocateExpUp()) {
        doAutoAllocateExpUp();
      }
      while (canAutoAllocateStatPoints()) {
        doAutoAllocateStatPoints();
      }
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
    const lv = Number(gameData.player.level || 1);
    const extra = Math.max(0, lv - 1);

    // 全レベル共通：線形 + 緩やかな曲線
    return Math.floor(50 + extra * 220 + Math.pow(extra, 1.5) * 70);
  }

  // -------------------
  // 装備生成
  // -------------------

  // -------------------
  // 装備名
  // -------------------
  // 通常の接頭語（NAME_PREFIX_BY_*）は廃止。装備名はベース名のみ。
  // 接頭語が付くのは SPECIAL_PREFIXES（固有効果付き）のみ。

  // -------------------
  // 装飾品効果：フロア/レア度でスケール
  // -------------------
  const ACCESSORY_RARITY_MULT = {
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
      return clamp(v, 1, 2);
    }

    // 例外：数値固定のトリガー系
    if (type === "deathAvoidOnce") {
      // 戦闘中1回だけ死亡回避（値は常に1として扱う）
      return 1;
    }

    if (type === "firstHitPursuit" || type === "firstHitCrit") {
      // 初撃系はトリガー（値は固定）
      return 1;
    }

    // 索敵は 1=1% のパラメータ。上げすぎると二つ名が出すぎるので控えめ＆上限
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
      "pursuitChance",
      "counterChance",
      "evadeHeal",
    ]);

    let v;
    if (flatTypes.has(type)) {
      v = Math.round(base * raw);
    } else {
      v = Math.round(base * pctMul);
    }

    if (type === "evasion") v = clamp(v, 0, 10);

    // タイプ別の上限（暴れ防止）
    if (type === "damageReduction") v = clamp(v, 0, 80);
    if (type === "ailmentDurationDown") v = clamp(v, 0, 80);

    // 追加：装飾品の新軸効果
    if (type === "cooldownCheatChance") v = clamp(v, 0, 25);
    if (type === "pursuitChance") v = clamp(v, 0, 60);
    if (type === "pursuitDamagePct") v = clamp(v, 0, 150);
    if (type === "hitCdMinusChance") v = clamp(v, 0, 30);
    if (type === "overhealBarrierCap") v = clamp(v, 0, 60);

    if (type === "lifeSteal") v = clamp(v, 0, 25);
    if (type === "regen") v = clamp(v, 0, 12);
    if (type === "critRate") v = clamp(v, 0, 40);
    if (type === "critDamage") v = clamp(v, 0, 200);

    if (type === "counterChance") v = clamp(v, 0, 45);
    if (type === "counterDamage") v = clamp(v, 0, 200);
    if (type === "desperationDamage") v = clamp(v, 0, 200);
    if (type === "executeDamage") v = clamp(v, 0, 200);
    if (type === "evadeHeal") v = clamp(v, 0, 200);
    if (type === "dropRate") v = clamp(v, 0, 150);
    if (type === "expBonus") v = clamp(v, 0, 250);
    if (type === "skillPower") v = clamp(v, 0, 250);
    if (type === "healReceived") v = clamp(v, 0, 250);

    // 耐性は最大90%（core側でも90で丸めているが、作成時点でも合わせる）
    if (type === "ailmentResist") {
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

  /**
   * 装飾品（アクセ）用：下限(min)〜上限(max)から値を抽選する。
   * - フロアが高いほど上限寄りが出やすい
   * - レア度が高いほど、わずかに上限寄りが出やすい
   * 後方互換（valueベースのスケール）は行わない。
   * @param {{type:string,min:number,max:number,minFloor?:number}} effect
   * @param {number} floor
   * @param {string} rarity
   * @returns {number}
   */
  function rollAccessoryEffectValueByRange(effect, floor, rarity) {
    const min = Number(effect?.min);
    const max = Number(effect?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;

    const f = clamp(Math.floor(Number(floor) || 1), 1, 500);
    const start = (() => {
      const mf = Number(effect?.minFloor);
      return Number.isFinite(mf) && mf > 0 ? clamp(Math.floor(mf), 1, 500) : 1;
    })();
    const denom = Math.max(1, 500 - start);
    let p = clamp((f - start) / denom, 0, 1);

    // レア度補正：進行度pを少しだけ押し上げる（最大+0.12程度）
    const rMul = ACCESSORY_RARITY_MULT[rarity] || 1.0;
    p = clamp(p + (rMul - 1) * 0.2, 0, 1);

    // 低層は低めが出やすく、高層は上限寄りが出やすい乱数へ偏らせる
    // exp>1 で低め寄り、exp<1 で高め寄り
    const exp = 2.8 - 2.2 * p; // 2.8 → 0.6
    const t = Math.pow(Math.random(), exp);

    const raw = min + (max - min) * t;
    let v = Math.round(raw);

    // タイプ別の安全上限（暴れ防止）。min/max だけで足りるが、念のため clmap を残す。
    if (effect.type === "cooldownReduction") v = clamp(v, 1, 2);
    if (effect.type === "deathAvoidOnce") v = 1;
    if (effect.type === "firstHitPursuit" || effect.type === "firstHitCrit")
      v = 1;

    if (effect.type === "evasion") v = clamp(v, 0, 10);
    if (effect.type === "counterChance") v = clamp(v, 0, 45);

    if (effect.type === "cooldownCheatChance") v = clamp(v, 0, 25);
    if (effect.type === "pursuitChance") v = clamp(v, 0, 60);
    if (effect.type === "pursuitDamagePct") v = clamp(v, 0, 150);
    if (effect.type === "hitCdMinusChance") v = clamp(v, 0, 30);
    if (effect.type === "overhealBarrierCap") v = clamp(v, 0, 60);

    if (effect.type === "critRate") v = clamp(v, 0, 40);
    if (effect.type === "critDamage") v = clamp(v, 0, 200);
    if (effect.type === "dropRate") v = clamp(v, 0, 150);
    if (effect.type === "search") v = clamp(v, 1, 12);

    // min/max の範囲は厳守
    v = clamp(v, Math.min(min, max), Math.max(min, max));
    return v;
  }

  /**
   * 装飾品（アクセ）用：min/max レンジから抽選した value を付与して返す。
   * @param {any} effect
   * @param {number} floor
   * @param {string} rarity
   * @returns {any}
   */
  function makeAccessoryEffectByRange(effect, floor, rarity) {
    const e = { ...effect };
    e.value = rollAccessoryEffectValueByRange(e, floor, rarity);
    return e;
  }

  function getAccessoryEffectSignature(typeKey, effect) {
    if (!typeKey || !effect || typeof effect !== "object") return "";
    const effType = String(effect.type || "");
    if (!effType) return "";
    const cond = effect.cond || effect.condition || "";
    return `${String(typeKey)}::${effType}::${String(cond)}`;
  }

  function getOwnedAccessories(player) {
    const p = player && typeof player === "object" ? player : null;
    if (!p) return [];

    const items = [];
    if (Array.isArray(p.inventory)) {
      for (const it of p.inventory) {
        if (it && it.category === "accessory") items.push(it);
      }
    }

    const eq =
      p.equipment && typeof p.equipment === "object" ? p.equipment : {};
    if (eq.accessory && eq.accessory.category === "accessory") {
      items.push(eq.accessory);
    }

    return items;
  }

  function getBlockedAccessoryDropSignatures(player) {
    const blocked = new Set();
    const accessories = getOwnedAccessories(player);
    for (const item of accessories) {
      const eff = Array.isArray(item.effects) ? item.effects[0] : null;
      if (!eff || typeof eff !== "object") continue;

      const max = Number(eff.max);
      const value = Number(eff.value);
      if (!Number.isFinite(max) || !Number.isFinite(value) || value < max)
        continue;

      const sig = getAccessoryEffectSignature(item.type, eff);
      if (sig) blocked.add(sig);
    }
    return blocked;
  }

  function getAccessoryComparableValue(item) {
    const eff = Array.isArray(item?.effects) ? item.effects[0] : null;
    if (!eff || typeof eff !== "object") return null;

    const value = Number(eff.value);
    return Number.isFinite(value) ? value : null;
  }

  function shouldSkipAccessoryPickupByOwnedValue(item, player) {
    if (!item || item.category !== "accessory") return false;

    const itemEff = Array.isArray(item.effects) ? item.effects[0] : null;
    const itemValue = getAccessoryComparableValue(item);
    if (!itemEff || itemValue == null) return false;

    const targetSig = getAccessoryEffectSignature(item.type, itemEff);
    if (!targetSig) return false;

    const accessories = getOwnedAccessories(player);
    for (const owned of accessories) {
      if (!owned || owned === item) continue;

      const ownedEff = Array.isArray(owned.effects) ? owned.effects[0] : null;
      if (!ownedEff || typeof ownedEff !== "object") continue;

      const ownedSig = getAccessoryEffectSignature(owned.type, ownedEff);
      if (ownedSig !== targetSig) continue;

      const ownedValue = getAccessoryComparableValue(owned);
      if (ownedValue == null) continue;

      if (ownedValue >= itemValue) return true;
    }

    return false;
  }

  // -------------------
  // 装備品オプション：種別ごとの付きやすさ（重み付け）
  // -------------------
  /**
   * @template T
   * @param {T[]} items
   * @param {(item: T) => number} weightFn
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
    if (total <= 0) {
      // フォールバック：等確率
      return items[Math.floor(Math.random() * items.length)] || null;
    }
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1] || null;
  }

  /**
   * 装備品のオプション効果（effect.type）に対して、武器/防具種別で重みを返す。
   * - 0 にすると「付かない」になるので、基本は 0.2〜3.0 の範囲で調整する。
   * @param {"weapon"|"armor"} category
   * @param {string} typeKey
   * @param {string} effectType
   * @returns {number}
   */
  function getEquipmentEffectWeight(category, typeKey, effectType) {
    /** @type {Record<string, number>} */
    const catBase =
      category === "weapon"
        ? {
            // 武器：攻め寄り
            attackBonus: 1.6,
            critRate: 1.35,
            critDamage: 1.35,
            accuracy: 1.2,
            pursuitChance: 1.15,
            pursuitDamagePct: 1.15,
            executeDamage: 1.15,
            desperationDamage: 1.15,
            lifeSteal: 1.1,
            defenseBonus: 0.7,
            damageReduction: 0.7,
            ailmentResist: 0.8,
            ailmentDurationDown: 0.9,
            healPower: 0.9,
            healReceived: 0.9,
            magicPower: 0.9,
            maxHpBonus: 0.9,
            expBonus: 0.9,
            evasion: 1.0,
            counterChance: 0.9,
            counterDamage: 0.9,
            regen: 0.9,
            evadeHeal: 0.9,
          }
        : {
            // 防具：守り寄り
            defenseBonus: 1.6,
            damageReduction: 1.35,
            maxHpBonus: 1.25,
            ailmentResist: 1.2,
            ailmentDurationDown: 1.1,
            evasion: 1.2,
            counterChance: 1.05,
            counterDamage: 1.05,
            regen: 1.05,
            healReceived: 1.05,
            attackBonus: 0.8,
            critRate: 0.8,
            critDamage: 0.8,
            accuracy: 0.8,
            magicPower: 0.95,
            healPower: 0.95,
            pursuitChance: 0.9,
            pursuitDamagePct: 0.9,
            executeDamage: 0.9,
            desperationDamage: 0.9,
            lifeSteal: 0.9,
            expBonus: 0.9,
            evadeHeal: 1.0,
          };

    /** @type {Record<string, Record<string, number>>} */
    const typeMult = {
      // -------- 武器 --------
      sword: { attackBonus: 1.2, accuracy: 1.1, critRate: 1.05 },
      katana: { accuracy: 1.2, evasion: 1.15, critRate: 1.1, critDamage: 1.1 },
      greatsword: {
        attackBonus: 1.35,
        critDamage: 1.25,
        desperationDamage: 1.25,
        executeDamage: 1.15,
        accuracy: 0.75,
        evasion: 0.8,
      },
      handaxe: { attackBonus: 1.25, critDamage: 1.15, accuracy: 0.9 },
      axe: {
        attackBonus: 1.3,
        critDamage: 1.2,
        desperationDamage: 1.2,
        accuracy: 0.75,
        evasion: 0.85,
      },
      hammer: {
        attackBonus: 1.4,
        critDamage: 1.25,
        desperationDamage: 1.25,
        accuracy: 0.7,
        evasion: 0.8,
      },
      dagger: {
        critRate: 1.35,
        critDamage: 1.15,
        evasion: 1.25,
        pursuitChance: 1.25,
        pursuitDamagePct: 1.15,
        attackBonus: 0.85,
        damageReduction: 0.75,
        maxHpBonus: 0.85,
      },
      spear: { accuracy: 1.35, executeDamage: 1.2, critRate: 1.05 },
      bow: {
        accuracy: 1.5,
        critRate: 1.25,
        critDamage: 1.15,
        evasion: 0.95,
        lifeSteal: 0.9,
      },
      crossbow: {
        accuracy: 1.65,
        critRate: 1.2,
        critDamage: 1.2,
        evasion: 0.9,
        lifeSteal: 0.9,
      },
      mace: {
        healPower: 1.25,
        healReceived: 1.15,
        lifeSteal: 1.05,
        counterChance: 1.1,
        counterDamage: 1.1,
        magicPower: 0.9,
      },
      staff: {
        magicPower: 1.45,
        healPower: 1.15,
        healReceived: 1.1,
        critRate: 0.85,
        critDamage: 0.85,
        attackBonus: 0.7,
      },
      wand: {
        magicPower: 1.65,
        critRate: 0.9,
        critDamage: 0.9,
        attackBonus: 0.7,
      },
      holy_staff: {
        healPower: 1.75,
        healReceived: 1.35,
        regen: 1.2,
        magicPower: 1.15,
        attackBonus: 0.7,
      },

      // -------- 防具 --------
      heavy_armor: {
        defenseBonus: 1.35,
        damageReduction: 1.25,
        maxHpBonus: 1.15,
        evasion: 0.65,
      },
      armor: { defenseBonus: 1.15, damageReduction: 1.1, evasion: 0.85 },
      light_armor: {
        evasion: 1.35,
        defenseBonus: 0.9,
        damageReduction: 0.85,
        pursuitChance: 1.1,
      },
      shield: {
        defenseBonus: 1.25,
        damageReduction: 1.15,
        counterChance: 1.35,
        counterDamage: 1.2,
        evasion: 0.9,
      },
      buckler: {
        evasion: 1.35,
        counterChance: 1.15,
        defenseBonus: 0.9,
        damageReduction: 0.85,
      },
      tower_shield: {
        defenseBonus: 1.4,
        damageReduction: 1.25,
        maxHpBonus: 1.1,
        counterChance: 1.35,
        counterDamage: 1.25,
        evasion: 0.65,
      },
      helmet: { defenseBonus: 1.15, maxHpBonus: 1.1, ailmentResist: 1.15 },
      circlet: {
        accuracy: 1.45,
        critRate: 1.15,
        magicPower: 1.15,
        defenseBonus: 0.85,
      },
      boots: { evasion: 1.45, evadeHeal: 1.15, defenseBonus: 0.85 },
      // 篭手：手数と反撃が乗りやすい（拳・追撃イメージ）
      gloves: {
        accuracy: 1.35,
        critRate: 1.15,
        attackBonus: 1.05,
        defenseBonus: 0.8,
        // ここから要望反映：追撃/反撃系のオプションが付きやすい
        pursuitChance: 1.9,
        pursuitDamagePct: 1.6,
        counterChance: 1.8,
        counterDamage: 1.5,
      },
      bracers: { evasion: 1.2, defenseBonus: 1.0, counterChance: 1.1 },
      robe: {
        magicPower: 1.35,
        healPower: 1.2,
        healReceived: 1.15,
        defenseBonus: 0.9,
        evasion: 1.05,
        ailmentResist: 1.1,
      },
      // マント：魔法攻撃/回復寄り（回避特化は廃止）
      cloak: {
        magicPower: 1.35,
        healPower: 1.35,
        healReceived: 1.1,
        defenseBonus: 0.85,
      },
      mantle: {
        evasion: 1.45,
        accuracy: 1.15,
        defenseBonus: 0.85,
        pursuitChance: 1.1,
      },
    };

    const base = catBase[effectType] ?? 1.0;
    const tm = typeMult[typeKey];
    const mult = tm ? (tm[effectType] ?? 1.0) : 1.0;

    // 最低でも 0.2（極端に0へ落ちないように）
    return Math.max(0.2, base * mult);
  }

  // アクセサリー効果の重み（強力な効果は出現率を下げる）
  function getAccessoryEffectWeight(effectType) {
    switch (effectType) {
      case "firstHitCrit":
        return 0.06;
      case "firstHitPursuit":
        return 0.1;
      case "pursuitDamagePct":
        return 0.25;
      case "hitCdMinusChance":
        return 0.35;
      case "critDamage":
        return 0.45;
      case "critRate":
        return 0.5;
      case "deathAvoidOnce":
        return 0.08;
      case "cooldownCheatChance":
        return 0.18;
      case "overhealBarrierCap":
        return 0.35;
      case "pursuitChance":
        return 0.45;
      default:
        return 1;
    }
  }

  // -------------------
  // 装備名：数値レンジによる名称テーブル
  // - 通常の接頭語が無い前提で、武器/防具の「ベース名」を数値で変化させる
  // - 例：攻撃力100～200 → 鉄の剣
  // -------------------
  const EQUIPMENT_NAME_TIERS = {
    weapon: {
      attack: [
        { min: 0, max: 99, template: "木の{base}" },
        { min: 100, max: 200, template: "鉄の{base}" },
        { min: 201, max: 400, template: "鋼の{base}" },
        { min: 401, max: 800, template: "ミスリルの{base}" },
        { min: 801, max: 1400, template: "オリハルコンの{base}" },
        { min: 1401, max: 2200, template: "神鋼の{base}" },
        { min: 2201, max: 3300, template: "星鉄の{base}" },
        { min: 3301, max: 4800, template: "竜骨の{base}" },
        { min: 4801, max: 7000, template: "虚空の{base}" },

        // 7000以降はさらに細分化（～10000まで段階的に増やす）
        { min: 7001, max: 7500, template: "深淵の{base}" },
        { min: 7501, max: 8000, template: "冥界の{base}" },
        { min: 8001, max: 8500, template: "滅界の{base}" },
        { min: 8501, max: 9000, template: "星喰の{base}" },
        { min: 9001, max: 9500, template: "終焉の{base}" },
        { min: 9501, max: 10000, template: "創世の{base}" },
        { min: 10001, template: "超越の{base}" },
      ],
      magicAttack: [
        { min: 0, max: 99, template: "見習いの{base}" },
        { min: 100, max: 200, template: "魔導の{base}" },
        { min: 201, max: 400, template: "ルーンの{base}" },
        { min: 401, max: 800, template: "秘儀の{base}" },
        { min: 801, max: 1400, template: "賢者の{base}" },
        { min: 1401, max: 2200, template: "大賢者の{base}" },
        { min: 2201, max: 3300, template: "星詠みの{base}" },
        { min: 3301, max: 4800, template: "禁呪の{base}" },
        { min: 4801, max: 7000, template: "虚無の{base}" },

        // 7000以降はさらに細分化（～10000まで段階的に増やす）
        { min: 7001, max: 7500, template: "深淵の{base}" },
        { min: 7501, max: 8000, template: "冥界の{base}" },
        { min: 8001, max: 8500, template: "滅星の{base}" },
        { min: 8501, max: 9000, template: "禁界の{base}" },
        { min: 9001, max: 9500, template: "叡智の果ての{base}" },
        { min: 9501, max: 10000, template: "根源の{base}" },
        { min: 10001, template: "超越の{base}" },
      ],
      healPower: [
        { min: 0, max: 99, template: "癒しの{base}" },
        { min: 100, max: 200, template: "祈りの{base}" },
        { min: 201, max: 400, template: "祝福の{base}" },
        { min: 401, max: 800, template: "聖なる{base}" },
        { min: 801, max: 1400, template: "神聖なる{base}" },
        { min: 1401, max: 2200, template: "大聖堂の{base}" },
        { min: 2201, max: 3300, template: "救済の{base}" },
        { min: 3301, max: 4800, template: "奇跡の{base}" },
        { min: 4801, max: 7000, template: "天啓の{base}" },

        // 7000以降はさらに細分化（～10000まで段階的に増やす）
        { min: 7001, max: 7500, template: "深祈の{base}" },
        { min: 7501, max: 8000, template: "聖域の{base}" },
        { min: 8001, max: 8500, template: "神域の{base}" },
        { min: 8501, max: 9000, template: "天恵の{base}" },
        { min: 9001, max: 9500, template: "神話の{base}" },
        { min: 9501, max: 10000, template: "創世の{base}" },
        { min: 10001, template: "超越の{base}" },
      ],
    },
    armor: {
      defense: [
        { min: 0, max: 99, template: "布の{base}" },
        { min: 100, max: 200, template: "鉄の{base}" },
        { min: 201, max: 400, template: "鋼の{base}" },
        { min: 401, max: 800, template: "ミスリルの{base}" },
        { min: 801, max: 1400, template: "オリハルコンの{base}" },
        { min: 1401, max: 2200, template: "神鋼の{base}" },
        { min: 2201, max: 3300, template: "星鉄の{base}" },
        { min: 3301, max: 4800, template: "竜鱗の{base}" },
        { min: 4801, max: 7000, template: "虚空の{base}" },

        // 7000以降はさらに細分化（～10000まで段階的に増やす）
        { min: 7001, max: 7500, template: "深淵の{base}" },
        { min: 7501, max: 8000, template: "冥界の{base}" },
        { min: 8001, max: 8500, template: "滅界の{base}" },
        { min: 8501, max: 9000, template: "星喰の{base}" },
        { min: 9001, max: 9500, template: "終焉の{base}" },
        { min: 9501, max: 10000, template: "創世の{base}" },
        { min: 10001, template: "超越の{base}" },
      ],
    },
  };

  function pickTierTemplate(tiers, value) {
    const v = Math.max(0, Number(value) || 0);
    const list = Array.isArray(tiers) ? tiers : [];
    for (const t of list) {
      if (v >= (t.min ?? 0) && (typeof t.max !== "number" || v <= t.max))
        return t.template;
    }
    return list.length ? list[list.length - 1].template : "{base}";
  }

  function buildTieredBaseName(item, base) {
    const b = typeof base === "string" && base ? base : "装備";
    if (!item || typeof item !== "object") return b;

    if (item.category === "weapon") {
      const a = Number(item.attack) || 0;
      const m = Number(item.magicAttack) || 0;
      const h = Number(item.healPower) || 0;

      // 武器種ごとに「名前に使う主役ステータス」を固定する
      // - 杖/ワンド：魔法攻撃力
      // - メイス/聖杖：回復力
      // - それ以外：攻撃力
      const type = String(item.type || "");
      let key = "attack";
      if (type === "staff" || type === "wand") key = "magicAttack";
      if (type === "mace" || type === "holy_staff") key = "healPower";

      const top = key === "magicAttack" ? m : key === "healPower" ? h : a;

      const tmpl = pickTierTemplate(EQUIPMENT_NAME_TIERS.weapon[key], top);
      return String(tmpl).replace("{base}", b);
    }

    if (item.category === "armor") {
      const d = Number(item.defense) || 0;
      const tmpl = pickTierTemplate(EQUIPMENT_NAME_TIERS.armor.defense, d);
      return String(tmpl).replace("{base}", b);
    }

    return b;
  }

  function generateEquipment(options = {}) {
    const floor = getScalingFloor();
    const blockedAccessorySignatures = getBlockedAccessoryDropSignatures(
      options?.player,
    );

    // カテゴリー選択
    const categories = ["weapon", "armor", "accessory"];
    let category = categories[Math.floor(Math.random() * categories.length)];

    const getAccessoryPoolByFloor = () => {
      const poolRaw = Array.isArray(window.accessoryOptionEffects)
        ? window.accessoryOptionEffects
        : [];
      if (!poolRaw.length) return [];
      const poolFiltered = poolRaw.filter((e) => {
        if (!e || typeof e !== "object") return false;
        const mf = Number(e.minFloor);
        return !Number.isFinite(mf) || mf <= 0 || floor >= mf;
      });
      return poolFiltered.length ? poolFiltered : poolRaw;
    };

    if (category === "accessory" && blockedAccessorySignatures.size > 0) {
      const accessoryTypeKeys = Object.keys(equipTypes || {}).filter(
        (k) => equipTypes[k]?.category === "accessory",
      );
      const pool = getAccessoryPoolByFloor();
      const hasAvailableAccessory = accessoryTypeKeys.some((k) =>
        pool.some(
          (e) =>
            !blockedAccessorySignatures.has(getAccessoryEffectSignature(k, e)),
        ),
      );
      if (!hasAvailableAccessory) {
        category = Math.random() < 0.5 ? "weapon" : "armor";
      }
    }

    let typeOptions = [];
    for (let key in equipTypes) {
      if (equipTypes[key].category === category) typeOptions.push(key);
    }

    if (category === "accessory" && blockedAccessorySignatures.size > 0) {
      const pool = getAccessoryPoolByFloor();
      typeOptions = typeOptions.filter((k) =>
        pool.some(
          (e) =>
            !blockedAccessorySignatures.has(getAccessoryEffectSignature(k, e)),
        ),
      );
      if (!typeOptions.length) {
        category = Math.random() < 0.5 ? "weapon" : "armor";
        typeOptions = [];
        for (let key in equipTypes) {
          if (equipTypes[key].category === category) typeOptions.push(key);
        }
      }
    }

    const typeKey = typeOptions[Math.floor(Math.random() * typeOptions.length)];
    const type = equipTypes[typeKey];

    const rarity = getRarity(floor);

    const item = {
      baseName: type.name,
      name: type.name,
      type: typeKey,
      category: type.category,
      hands: type.hands,
      rarity,
      locked: false,
    };

    // UI表示用（固有能力/ランダムオプションの内訳）
    item.fixedEffects = [];
    item.randomOptionDetails = [];

    // 特殊接頭語（固有効果付きの追加接頭語）
    // - weapon/armor のみに付与（accessory は元から効果が多いため対象外）
    // - 見た目: item.name の先頭に接頭語を付ける
    // - 効果: item.effects に付与（既存の集計ロジックで反映される）
    // - UI: 固有能力（fixedEffects）として表示
    const specialPrefixEnabled =
      options?.specialPrefixEnabled !== false && category !== "accessory";
    if (
      specialPrefixEnabled &&
      typeof window.rollSpecialPrefix === "function" &&
      typeof window.applySpecialPrefixEffects === "function"
    ) {
      // 特殊接頭語抽選（rarity / category / typeKey）
      const forceSpecialPrefixRarityPool =
        options && Array.isArray(options.specialPrefixRarityPool)
          ? options.specialPrefixRarityPool
          : null;
      let sp = window.rollSpecialPrefix(rarity, category, typeKey, {
        forceRarityPool: forceSpecialPrefixRarityPool,
      });
      if (sp) {
        window.applySpecialPrefixEffects(item, sp);

        // 表示名に追加（例: 全知全能の破邪の剣）
        if (sp.name && typeof sp.name === "string") {
          item._specialPrefixName = sp.name;

          // UIで「特殊接頭語のレア度」を参照できるよう保持
          if (typeof sp.rarity === "string" && sp.rarity) {
            item._specialPrefixRarity = sp.rarity;
          }
        }

        // UIの「装備固有能力」に表示
        if (!Array.isArray(item.fixedEffects)) item.fixedEffects = [];
        if (sp.description) {
          item.fixedEffects.push(String(sp.description));
        } else if (sp.name) {
          item.fixedEffects.push(`${sp.name}の力`);
        }
      }
    }

    const statBase = Math.round(5 + floor * 2.5);

    // 装備タイプごとの特性（ジャンル特性）
    const bias = type.bias || {};
    const getBias = (key, fallback) => {
      const v = bias[key];
      if (typeof v === "function") return v(floor, statBase);
      if (typeof v === "number") return v;
      return fallback;
    };

    if (category === "weapon") {
      const baseAttack = statBase * (1 + Math.random() * 0.35);
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
      // 武器の命中補正は +30 / -30 を上限にする
      item.accuracy = clamp(item.accuracy, -30, 30);

      // 武器でも追加ステータスを持てる（例：杖の防御など）
      if (typeof bias.defense !== "undefined")
        item.defense = Math.round(getBias("defense", 0));
    } else if (category === "armor") {
      const baseDefense = statBase * (1 + Math.random() * 0.35);
      const defenseMult = getBias("defenseMult", 1);
      item.defense = Math.round(baseDefense * defenseMult);

      // 防具でも固有回避（%）や魔法/回復ステータスを持てる
      if (typeof bias.evasion !== "undefined") {
        item.evasion = Math.round(getBias("evasion", 0));
      }
      if (typeof bias.magicAttackMult !== "undefined") {
        const baseMagic = statBase * (1 + Math.random() * 0.55);
        const mm = getBias("magicAttackMult", 1);
        item.magicAttack = Math.round(baseMagic * mm);
      }
      if (typeof bias.healPowerMult !== "undefined") {
        const baseHeal = statBase * (1 + Math.random() * 0.55);
        const hm = getBias("healPowerMult", 1);
        item.healPower = Math.round(baseHeal * hm);
      }

      // 固有能力（固定効果）を付与
      // equipment.js 側で bias.fixedEffects: { counterChance: {base,max}, ... } の形で定義
      if (bias.fixedEffects && typeof bias.fixedEffects === "object") {
        if (!item.effects) item.effects = [];
        const defs = bias.fixedEffects;
        Object.keys(defs).forEach((typeKey) => {
          const def = defs[typeKey];
          if (!def || typeof def !== "object") return;
          const base = Number(def.base) || 0;
          const max = Number.isFinite(Number(def.max)) ? Number(def.max) : null;
          // 低層でも特徴が出るように、緩やかにスケール
          let v = Math.round(base + floor * 0.012);
          if (max != null) v = Math.min(v, max);
          if (v <= 0) return;
          const eff = { name: null, type: typeKey, value: v };
          item.effects.push(eff);
          if (!Array.isArray(item.fixedEffects)) item.fixedEffects = [];
          // UIは effect の整形に任せる
          item.fixedEffects.push(eff);
        });
      }

      // 防具でも命中補正を持てる（例：篭手、盾など）
      if (typeof bias.accuracy !== "undefined")
        item.accuracy = Math.round(getBias("accuracy", 0));
    } else {
      item.effects = [];
      // 装飾品の効果は常に1つ（多効果は廃止）
      const numEffects = 1;
      for (let i = 0; i < numEffects; i++) {
        const poolRaw = Array.isArray(window.accessoryOptionEffects)
          ? window.accessoryOptionEffects
          : [];
        if (!poolRaw.length) continue;

        // minFloor を持つ効果は、到達階層以降でのみ候補に入れる
        const poolFiltered = poolRaw.filter((e) => {
          if (!e || typeof e !== "object") return false;
          const mf = Number(e.minFloor);
          return !Number.isFinite(mf) || mf <= 0 || floor >= mf;
        });
        const pool = (poolFiltered.length ? poolFiltered : poolRaw).filter(
          (e) =>
            !blockedAccessorySignatures.has(
              getAccessoryEffectSignature(typeKey, e),
            ),
        );
        if (!pool.length) continue;

        const effect =
          pickWeighted(pool, (e) => getAccessoryEffectWeight(e.type)) ||
          pool[Math.floor(Math.random() * pool.length)];
        item.effects.push(makeAccessoryEffectByRange(effect, floor, rarity));
      }

      // 生成時の参照（将来の再計算やデバッグ用。UIには出さない）
      item.generatedFloor = floor;

      // UI表示用：アクセサリーは効果=ランダムオプション
      item.randomOptionDetails = (
        Array.isArray(item.effects) ? item.effects : []
      ).map((eff) => ({ kind: "effect", effect: eff }));
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
      item.randomOptionDetails = (
        Array.isArray(item.effects) ? item.effects : []
      ).map((eff) => ({ kind: "effect", effect: eff }));
      item.randomOptions = optionCount;
    } else {
      // 武器/防具：追加で付く強化/効果の回数をオプション数として扱う
      optionCount = Math.min(5, Math.floor(Math.random() * (1 + floor / 5)));

      // 付与された内訳を列挙する（UI用）
      item.randomOptionDetails = [];

      // 武器/防具に付く効果系オプションは「装備品用テーブル」から選ぶ
      const srcEffects = Array.isArray(window.equipmentOptionEffects)
        ? window.equipmentOptionEffects
        : [];
      const equipmentEffectPool = Array.isArray(srcEffects) ? srcEffects : [];
      let lastRolledOptionValue = null;

      const rerollIfSameAsPrevious = (rollFn, maxRetry = 3) => {
        let value = rollFn();
        for (
          let i = 0;
          i < maxRetry &&
          lastRolledOptionValue != null &&
          value === lastRolledOptionValue;
          i++
        ) {
          value = rollFn();
        }
        lastRolledOptionValue = value;
        return value;
      };

      const rollStatDelta = () => {
        const base = Math.max(1, Math.round(statBase * 0.1));
        const spread = Math.max(2, Math.round(statBase * 0.08));
        return rerollIfSameAsPrevious(
          () => base + Math.floor(Math.random() * (spread + 1)),
          4,
        );
      };

      for (let i = 0; i < optionCount; i++) {
        if (Math.random() < 0.5) {
          /** @type {Record<string, number>} */
          const deltas = {};
          if (item.attack) {
            const d = rollStatDelta();
            item.attack += d;
            deltas.attack = d;
          }
          if (item.defense) {
            const d = rollStatDelta();
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
          const pool = equipmentEffectPool.length
            ? equipmentEffectPool
            : srcEffects;
          if (!pool.length) continue;
          const eff =
            pickWeighted(pool, (e) =>
              getEquipmentEffectWeight(category, item.type, e.type),
            ) || pool[Math.floor(Math.random() * pool.length)];
          const scaledEff = makeScaledAccessoryEffect(eff, floor, rarity);
          const baseValue = Math.max(
            1,
            Math.round((Number(scaledEff.value) || 0) * 0.5),
          );
          const variance = Math.max(1, Math.round(baseValue * 0.3));
          const value = rerollIfSameAsPrevious(
            () =>
              clamp(
                baseValue +
                  Math.floor(Math.random() * (variance * 2 + 1)) -
                  variance,
                1,
                9999,
              ),
            4,
          );
          const finalEff = {
            ...scaledEff,
            value,
          };
          item.effects.push(finalEff);
          item.randomOptionDetails.push({ kind: "effect", effect: finalEff });
        }
      }

      item.randomOptions = item.randomOptionDetails.length;
    }

    // 装備名（ベース名）は、数値レンジに応じて変化させる
    // - 特殊接頭語がある場合は、ここでまとめて先頭に付ける
    if (category !== "accessory") {
      const tiered = buildTieredBaseName(item, type.name);
      item.baseName = tiered;
      item.name = tiered;
      if (
        item._specialPrefixName &&
        typeof item._specialPrefixName === "string"
      ) {
        item.name = `${item._specialPrefixName}${tiered}`;
      }
    } else {
      // アクセサリー名を「短く・分かりやすく」する（効果を先頭に出す）
      item.baseName = type.name;

      const eff0 = Array.isArray(item.effects) ? item.effects[0] : null;
      const cond = eff0?.cond || eff0?.condition;
      const condLabel =
        cond === "unarmed"
          ? "素手"
          : cond === "noArmor"
            ? "無防具"
            : cond === "twoHanded"
              ? "両手"
              : "";

      const labelMap = {
        skillPower: "スキル",
        cooldownReduction: "CT短縮",
        cooldownCheatChance: "CT踏倒",
        pursuitChance: "追撃",
        deathAvoidOnce: "致死耐え",
        overhealBarrierCap: "余剰回復盾",
        hitCdMinusChance: "被弾短縮",
        pursuitDamagePct: "追撃威力",
        firstHitPursuit: "初撃追撃",
        critRate: "会心率",
        critDamage: "会心威力",
        firstHitCrit: "初撃会心",
        evasion: "回避",
        counterChance: "反撃",
        attackBonus: "攻撃",
        search: "索敵",
        dropRate: "ドロ率",
      };

      const label =
        (eff0 && labelMap[String(eff0.type)]) ||
        (eff0?.name ? String(eff0.name) : "装飾");

      // 目印は不要（表示名は短く）
      item.name = `${condLabel}${label}${type.name}`;
    }

    // 永続化用ID（装備の復元に使用）
    if (typeof item.uid !== "string" || !item.uid) item.uid = generateUid();

    return item;
  }

  function getRarity(_floor) {
    const rand = Math.random() * 100;

    // 低レアは廃止し、rare に統合
    if (rand < 90) return "rare";
    if (rand < 97) return "epic";
    return "legendary";
  }

  // -------------------
  // グローバル公開（HTMLのonclickから呼べるように）
  // -------------------
  window.getTotalStats = getTotalStats;
  window.getCombatStats = getCombatStats;
  window.getEmblemBonus = getEmblemBonus;
  window.getAccessoryBonus = getAccessoryBonus;
  window.getPlayerBarrier = getPlayerBarrier;
  window.getMaxPlayerBarrier = getMaxPlayerBarrier;
  window.getAchievementExpBonusRate = getAchievementExpBonusRate;
  window.getAchievementExpBonusPercent = getAchievementExpBonusPercent;
  window.getAchievementEvasionCapBonusPercent =
    getAchievementEvasionCapBonusPercent;
  window.getPlayerEvasionCap = getPlayerEvasionCap;
  window.checkAndUnlockAchievements = checkAndUnlockAchievements;

  // UI側から呼ぶ用
  window.isAutosaveEnabled = isAutosaveEnabled;
  window.setAutosaveEnabled = setAutosaveEnabled;
  window.requestAutosave = requestAutosave;
  window.saveGameNow = saveGameNow;

  window.move = move;
  window.teleportToFloor = teleportToFloor;
  window.isStayBattleUnlocked = isStayBattleUnlocked;
  window.startBattle = startBattle;
  window.attack = attack;
  window.defend = defend;
  window.useSkill = useSkill;
  window.toggleAsuraWorldByMapFragment = toggleAsuraWorldByMapFragment;
  window.isInAsuraWorld = isInAsuraWorld;

  // 転移
  window.teleportToFloor = teleportToFloor;
})();
