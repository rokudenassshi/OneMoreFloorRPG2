// ===================
// シリアルコード
// - オプション画面から入力して、特典/機能の解放に使う
// - 参考ZIPの構成（serialCodeActions / serialCodeLookup）に合わせる
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

  // ✅ “シリアルコード → 解放キー”
  // 本来はサーバー側で検証するのが安全だが、
  // このプロジェクトではローカル検証（オフラインでも動作）を優先。
  // 追加する場合はこの表に追記する。
  const serialCodeLookup = {
    // 参考ZIPと同じコード
    unlockrokudemonaistay: "stayBattle",
    unlockaccsynx9k2p8mrokudemonai7q4r6t1: "accessorySynthesis",
    unlockdoubleeffectbonus8r2k9m1x: "doubleEffectBonus",
  };

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
  };

  // グローバルに公開（ui.js が参照する）
  window.serialCodeLookup = serialCodeLookup;
  window.serialCodeActions = serialCodeActions;
})();
