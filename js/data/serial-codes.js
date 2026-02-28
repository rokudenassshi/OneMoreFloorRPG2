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
  const serialCodeLookup = {};

  // ✅ “解放キー → 実行内容”
  // 現時点では「解放済みフラグ」を保存するだけ（後で挙動を追加しやすい）
  const serialCodeActions = {
    stayBattle: {
      isUnlocked: () => !!loadStore().stayBattle,
      unlock: () => {
        const s = loadStore();
        s.stayBattle = true;
        saveStore(s);
      },
      logMessage: "✨ シリアルコードを確認しました。特典を解放しました。",
    },
    accessorySynthesis: {
      isUnlocked: () => !!loadStore().accessorySynthesis,
      unlock: () => {
        const s = loadStore();
        s.accessorySynthesis = true;
        saveStore(s);
      },
      logMessage: "✨ シリアルコードを確認しました。特典を解放しました。",
    },
    doubleEffectBonus: {
      isUnlocked: () => !!loadStore().doubleEffectBonus,
      unlock: () => {
        const s = loadStore();
        s.doubleEffectBonus = true;
        saveStore(s);
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
      },
      logMessage: "✨ シリアルコードを確認しました。250階層以降への進行制限を解除しました。",
    },

    // 前世の記憶（実績解除：経験値+10%）
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
  };

  // グローバルに公開（ui.js が参照する）
  window.serialCodeLookup = serialCodeLookup;
  window.serialCodeActions = serialCodeActions;
})();
