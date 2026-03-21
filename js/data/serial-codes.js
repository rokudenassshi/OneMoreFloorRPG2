// ===================
// シリアルコード
// - オプション画面から入力して、特典/機能の解放に使う
// - 基本は Firebase Functions 側で検証（コード表はクライアントに置かない）
// - ui.js が Firebase が使えない場合だけローカル表（serialCodeLookup）にフォールバックする
// ===================

(function () {
  "use strict";

  const STORE_KEY = "omf_serial_unlocks_v1";

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store || {}));
    } catch (e) {}
  }

  function getPlayer() {
    return window.gameData && window.gameData.player
      ? window.gameData.player
      : null;
  }

  // ✅ “シリアルコード → 解放キー”
  // セキュリティのため通常は空（サーバー側で検証）。
  const serialCodeLookup = {
    // `stay` + 英数字10文字（固定）: 現在階層連戦モード解放
    stay8q2m1v7xk9: "stayBattle",

    // `startdash` + 英数字10文字（固定）: 各紋章10個配布
    startdashi1u474nk3ks: "startDashEmblems",
  };

  const START_DASH_EMBLEMS = [
    { id: "emblem_strength", name: "力の紋章", statKey: "strength" },
    { id: "emblem_vitality", name: "体力の紋章", statKey: "vitality" },
    { id: "emblem_intelligence", name: "賢さの紋章", statKey: "intelligence" },
    { id: "emblem_agility", name: "素早さの紋章", statKey: "agility" },
    { id: "emblem_dexterity", name: "器用さの紋章", statKey: "dexterity" },
  ];


  // ✅ “解放キー → 実行内容”
  // 現時点では「解放済みフラグ」を保存するだけ（後で挙動を追加しやすい）
  const serialCodeActions = {
    stayBattle: {
      isUnlocked: () => {
        const s = loadStore();
        if (s.stayBattle) return true;
        const p = getPlayer();
        return !!(p && p.serialUnlocks && p.serialUnlocks.stayBattle);
      },
      unlock: () => {
        const s = loadStore();
        s.stayBattle = true;
        saveStore(s);

        const p = getPlayer();
        if (p) {
          if (!p.serialUnlocks || typeof p.serialUnlocks !== "object")
            p.serialUnlocks = {};
          p.serialUnlocks.stayBattle = true;
        }

        if (typeof window.checkAndUnlockAchievements === "function") {
          window.checkAndUnlockAchievements({ silent: false });
        }
      },
      logMessage: "✨ シリアルコードを確認しました。特典を解放しました。",
    },

    floorCapLift250: {
      isUnlocked: () => {
        const s = loadStore();
        if (s.floorCapLift250) return true;
        const p = getPlayer();
        return !!(p && p.serialUnlocks && p.serialUnlocks.floorCapLift250);
      },
      unlock: () => {
        const s = loadStore();
        s.floorCapLift250 = true;
        saveStore(s);

        const p = getPlayer();
        if (p) {
          if (!p.serialUnlocks || typeof p.serialUnlocks !== "object")
            p.serialUnlocks = {};
          p.serialUnlocks.floorCapLift250 = true;
        }

        if (typeof window.checkAndUnlockAchievements === "function") {
          window.checkAndUnlockAchievements({ silent: false });
        }
      },
      logMessage:
        "✨ シリアルコードを確認しました。階層上限を5001階に解放しました。",
    },

    // 前世の記憶（実績解除：経験値+20%）
    pastLifeMemory: {
      isUnlocked: () => {
        const s = loadStore();
        if (s.pastLifeMemory) return true;
        const p = getPlayer();
        return !!(p && p.serialUnlocks && p.serialUnlocks.pastLifeMemory);
      },
      unlock: () => {
        // 1) この端末で「使用済み」を保存（同じコードを何度も通さない）
        const s = loadStore();
        s.pastLifeMemory = true;
        saveStore(s);

        // 2) セーブデータ側にも保存（実績用）
        const p = getPlayer();
        if (p) {
          if (!p.serialUnlocks || typeof p.serialUnlocks !== "object")
            p.serialUnlocks = {};
          p.serialUnlocks.pastLifeMemory = true;
        }

        // 3) 実績解除チェック（ログもここで出る）
        if (typeof window.checkAndUnlockAchievements === "function") {
          window.checkAndUnlockAchievements({ silent: false });
        }
      },
      logMessage: "✨ シリアルコードを確認しました。",
    },

    // スタートダッシュ（各紋章 ×10）
    startDashEmblems: {
      isUnlocked: () => {
        const s = loadStore();
        if (s.startDashEmblems) return true;
        const p = getPlayer();
        return !!(p && p.serialUnlocks && p.serialUnlocks.startDashEmblems);
      },
      unlock: () => {
        const s = loadStore();
        s.startDashEmblems = true;
        saveStore(s);

        const p = getPlayer();
        if (p) {
          if (!p.serialUnlocks || typeof p.serialUnlocks !== "object") {
            p.serialUnlocks = {};
          }
          p.serialUnlocks.startDashEmblems = true;

          if (!Array.isArray(p.valuables)) p.valuables = [];
          for (const emblem of START_DASH_EMBLEMS) {
            const found = p.valuables.find((v) => v && v.id === emblem.id);
            if (found) {
              found.count = Math.max(0, Math.floor(Number(found.count || 0))) + 10;
              found.name = emblem.name;
              found.statKey = emblem.statKey;
              if (typeof found.description !== "string") found.description = "";
            } else {
              p.valuables.push({
                id: emblem.id,
                name: emblem.name,
                statKey: emblem.statKey,
                description: "",
                count: 10,
              });
            }
          }
        }

        if (typeof window.checkAndUnlockAchievements === "function") {
          window.checkAndUnlockAchievements({ silent: false });
        }
      },
      logMessage: "✨ スタートダッシュ特典で各紋章を10個獲得しました。",
    },
  };

  // グローバルに公開（ui.js が参照する）
  window.serialCodeLookup = serialCodeLookup;
  window.serialCodeActions = serialCodeActions;
})();
