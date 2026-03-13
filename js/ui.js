// ===================
// UI（分割: ui）
// ===================

(function () {
  "use strict";

  // -------------------
  // 得意装備（職業）ユーティリティ
  // - favoredType は string または string[] を許容
  // -------------------
  function normalizeFavoredTypes(favoredType) {
    if (!favoredType) return [];
    return Array.isArray(favoredType) ? favoredType : [favoredType];
  }

  function getFavoredTypeLabel(favoredType) {
    const keys = normalizeFavoredTypes(favoredType);
    if (keys.length === 0) return "なし";
    const names = keys
      .map((k) =>
        equipTypes && equipTypes[k] && equipTypes[k].name
          ? equipTypes[k].name
          : k,
      )
      .filter((v) => !!v);
    return names.length > 0 ? names.join(" / ") : "なし";
  }

  function isEquippedFavored(slot1, slot2, favoredType) {
    const keys = normalizeFavoredTypes(favoredType);
    if (keys.length === 0) return false;
    const isFav = (it) =>
      !!(
        it &&
        it.category !== "accessory" &&
        typeof it.type === "string" &&
        keys.includes(it.type)
      );
    return isFav(slot1) || isFav(slot2);
  }

  // -------------------
  // シリアルコード（オプション画面）
  // -------------------
  let serialCodePending = false;
  let bagSortMode = "effect";
  let bagEffectSortKey = "attack";
  let bagAcquireOrderSeed = 1;
  let currentWeaponHandsTab = "oneHand";

  // -------------------
  // UI更新
  // -------------------

  // -------------------
  // バージョン表示（ステータス画面）
  // -------------------
  function applyGameVersionBadges() {
    const v =
      typeof window.GAME_VERSION === "string" ? window.GAME_VERSION : "";
    if (!v) return;
    const text = `v${v}`;
    const tabEl = document.getElementById("statusGameVersion");
    if (tabEl) tabEl.textContent = text;
    const recEl = document.getElementById("recordsGameVersion");
    if (recEl) recEl.textContent = text;
  }

  function updateUI() {
    const p = gameData.player;

    // 初期化前でも安全に動くように、必要なDOM参照は都度確保する
    if (!gameData.battleButtons)
      gameData.battleButtons = document.getElementById("battleButtons");
    if (!gameData.exploreButtons)
      gameData.exploreButtons = document.getElementById("exploreButtons");

    document.getElementById("playerLevel").textContent = p.level;
    document.getElementById("floor").textContent = gameData.floor;
    const barrier =
      typeof window.getPlayerBarrier === "function"
        ? window.getPlayerBarrier()
        : 0;
    const barrierText = Number(barrier) > 0 ? ` 🛡${Math.round(barrier)}` : "";
    document.getElementById("playerHp").textContent =
      `${Math.round(p.hp)}/${Math.round(p.maxHp)}${barrierText}`;

    // 職業リソース（気 / 構え）
    const gaugesEl = document.getElementById("playerGauges");
    if (gaugesEl) {
      const bs = (p && p.battleState) || {};
      const parts = [];

      const inBattle = gameData.gameState === "BATTLE";

      // 気（格闘家/修羅）：戦闘中のみ表示
      // - 格闘家は 0 と 最大 は非表示
      // - 修羅は重要度が高いので最大でも表示
      const qi = Math.max(0, Math.floor(Number(bs.qi) || 0));
      const qiMax = typeof getMaxQi === "function" ? Math.floor(getMaxQi()) : 0;
      const isQiJob = p.job === "monk" || p.job === "asura";
      const hideAtMax = p.job === "monk";
      if (
        inBattle &&
        isQiJob &&
        qi > 0 &&
        (!hideAtMax || qiMax <= 0 || qi < qiMax)
      ) {
        parts.push(`気：${qi}${qiMax > 0 ? `/${qiMax}` : ""}`);
      }

      // 構え（剣聖）：戦闘中のみ表示（0 と 最大 は非表示）
      const stance = Math.max(0, Math.floor(Number(bs.stance) || 0));
      const stanceMax =
        typeof getMaxStance === "function" ? Math.floor(getMaxStance()) : 0;
      if (
        inBattle &&
        p.job === "blademaster" &&
        stance > 0 &&
        (stanceMax <= 0 || stance < stanceMax)
      ) {
        parts.push(`構え：${stance}${stanceMax > 0 ? `/${stanceMax}` : ""}`);
      }

      // 勢い（騎士）：戦闘中のみ表示（0 は非表示）
      const momentum = Math.max(0, Math.floor(Number(bs.momentum) || 0));
      const momentumMax =
        typeof getMaxMomentum === "function" ? Math.floor(getMaxMomentum()) : 0;
      if (inBattle && p.job === "warlord" && momentum > 0) {
        parts.push(
          `勢い：${momentum}${momentumMax > 0 ? `/${momentumMax}` : ""}`,
        );
      }

      if (parts.length > 0) {
        gaugesEl.textContent = parts.join("  ");
        gaugesEl.style.display = "block";
      } else {
        gaugesEl.textContent = "";
        gaugesEl.style.display = "none";
      }
    }

    // 経験値バー
    const expRate = Math.min(1, Math.max(0, p.exp / getExpNeeded()));
    document.getElementById("expBarFill").style.width = expRate * 100 + "%";

    // 敵情報
    if (gameData.enemy) {
      const e = gameData.enemy;
      const enemyNameEl = document.getElementById("enemyName");
      enemyNameEl.textContent = e.displayName;
      const isStrongEpithet =
        e.isNamed && Number(e?.epithet?.minSearch || 0) >= 150;
      enemyNameEl.style.color = isStrongEpithet ? "#ff4d4d" : "#ffffff";
      document.getElementById("enemyHp").textContent =
        `HP：${Math.round(e.hp)}/${Math.round(e.maxHp)}`;
    } else {
      const enemyNameEl = document.getElementById("enemyName");
      enemyNameEl.textContent = "";
      enemyNameEl.style.color = "#ffffff";
      document.getElementById("enemyHp").textContent = "---";
    }

    renderStatusEffects();

    // ボタン表示切り替え
    if (gameData.battleButtons && gameData.exploreButtons) {
      if (gameData.gameState === "BATTLE") {
        gameData.battleButtons.style.display = "block";
        gameData.exploreButtons.style.display = "none";
        updateSkillButtons();
      } else {
        gameData.battleButtons.style.display = "none";
        gameData.exploreButtons.style.display = "block";
      }
    }
  }

  function getEquippedSkillKey(slotIndex) {
    const p = gameData && gameData.player ? gameData.player : {};
    const list = Array.isArray(p.equippedSkills)
      ? p.equippedSkills
      : [p.equippedSkill, null];
    const idx = Number(slotIndex) === 1 ? 1 : 0;
    const key = list[idx] != null ? String(list[idx]) : "";
    return key ? key : null;
  }

  function updateSkillButtons() {
    const btn1 = document.getElementById("skillBtn1");
    const btn2 = document.getElementById("skillBtn2");

    // ボタン内に2行表示（上: ラベル / 下: 装備スキル名）
    const main1El = document.getElementById("skillBtn1Main");
    const main2El = document.getElementById("skillBtn2Main");
    const sub1El = document.getElementById("skillBtn1Sub");
    const sub2El = document.getElementById("skillBtn2Sub");

    if (!btn1 || !btn2) return;

    const setMain = (btn, mainEl, text) => {
      if (mainEl) {
        mainEl.textContent = text;
      } else {
        btn.textContent = text;
      }
    };

    const setSub = (subEl, text) => {
      if (subEl) subEl.textContent = text;
    };

    const sk1 = getEquippedSkillKey(0);
    const sk2 = getEquippedSkillKey(1);

    const def1 = sk1 ? skills[sk1] : null;
    const def2 = sk2 ? skills[sk2] : null;

    setSub(sub1El, def1 ? def1.name || sk1 : "なし");
    setSub(sub2El, def2 ? def2.name || sk2 : "なし");

    // クールタイム値の正規化（NaN対策）
    let cd = Number(gameData.player.skillCooldown || 0);
    if (!Number.isFinite(cd) || cd < 0) cd = 0;
    gameData.player.skillCooldown = cd;

    // 封印中はスキルボタン自体を無効化
    const st = gameData && gameData.player ? gameData.player.status || {} : {};
    if (gameData.gameState === "BATTLE" && st.silenceTurns > 0) {
      setMain(btn1, main1El, `スキル1(封印:${st.silenceTurns})`);
      setMain(btn2, main2El, `スキル2(封印:${st.silenceTurns})`);
      btn1.disabled = true;
      btn2.disabled = true;
      return;
    }

    const apply = (btn, mainEl, idx, hasSkill) => {
      const base = idx === 0 ? "スキル1" : "スキル2";
      if (!hasSkill) {
        setMain(btn, mainEl, base);
        btn.disabled = true;
        return;
      }
      if (cd > 0) {
        setMain(btn, mainEl, `${base} (${cd})`);
        btn.disabled = true;
      } else {
        setMain(btn, mainEl, base);
        btn.disabled = false;
      }
    };

    apply(btn1, main1El, 0, !!sk1);
    apply(btn2, main2El, 1, !!sk2);
  }

  // -------------------

  // 状態異常表示
  // -------------------
  function renderStatusEffects() {
    renderStatusEffectsFor(
      document.getElementById("playerStatusEffects"),
      gameData && gameData.player ? gameData.player.status : null,
      true,
    );
    renderStatusEffectsFor(
      document.getElementById("enemyStatusEffects"),
      gameData && gameData.enemy ? gameData.enemy.status : null,
      false,
    );
  }

  /**
   * @param {HTMLElement|null} container
   * @param {object|null} st
   * @param {boolean} isPlayer
   */
  function renderStatusEffectsFor(container, st, isPlayer) {
    if (!container) return;
    container.innerHTML = "";
    if (!st) return;

    /** @type {{text:string}[]} */
    const badges = [];

    if (st.poisonTurns > 0) badges.push({ text: `☠ 毒 ${st.poisonTurns}T` });
    if (st.burnTurns > 0)
      badges.push({ text: `🔥 火傷(回復↓+継続) ${st.burnTurns}T` });
    if (st.stunTurns > 0) badges.push({ text: `⚡ しびれ ${st.stunTurns}T` });

    if (st.slowTurns > 0) {
      const rate = Math.round((st.slowRate || 0) * 100);
      badges.push({
        text:
          rate > 0
            ? `🐌 鈍足-${rate}% ${st.slowTurns}T`
            : `🐌 鈍足 ${st.slowTurns}T`,
      });
    }

    if (st.vulnerableTurns > 0) {
      const rate = Math.round((st.vulnerableRate || 0) * 100);
      badges.push({
        text:
          rate > 0
            ? `🛡 脆弱(防御-${rate}%) ${st.vulnerableTurns}T`
            : `🛡 脆弱 ${st.vulnerableTurns}T`,
      });
    }

    if (st.silenceTurns > 0)
      badges.push({ text: `🔇 封印 ${st.silenceTurns}T` });

    if (st.accuracyDownTurns > 0) {
      const rate = Math.round((st.accuracyDownRate || 0) * 100);
      badges.push({
        text:
          rate > 0
            ? `👁 命中↓-${rate}% ${st.accuracyDownTurns}T`
            : `👁 命中↓ ${st.accuracyDownTurns}T`,
      });
    }

    if (isPlayer && st.defendingTurns > 0) {
      badges.push({ text: `🛡 防御 ${st.defendingTurns}T` });
    }

    badges.forEach((b) => {
      const span = document.createElement("span");
      span.className = "status-badge";
      span.textContent = b.text;
      container.appendChild(span);
    });
  }

  function log(text) {
    const logEl = document.getElementById("log");
    const div = document.createElement("div");
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;

    // ログ制限
    while (logEl.children.length > 100) {
      logEl.removeChild(logEl.firstChild);
    }
  }

  function clearLog() {
    const logEl = document.getElementById("log");
    if (logEl) logEl.innerHTML = "";
  }

  // -------------------
  // ポップアップ（光り輝く装飾品ドロップと同じUI）
  // -------------------
  let rareEnemyPopupEl = null;
  let rareEnemyPopupTitleEl = null;
  let rareEnemyPopupNameEl = null;
  let rareEnemyPopupHintEl = null;
  let rareEnemyPopupCloseEl = null;

  let rareEnemyPopupTimer = null;
  let allowRarePopupOverlayClose = true;
  let rareEnemyPopupBound = false;

  function ensureRareEnemyPopupBound() {
    // 遅延取得（DOMがまだでも落ちない）
    if (!rareEnemyPopupEl)
      rareEnemyPopupEl = document.getElementById("rareEnemyPopup");
    if (!rareEnemyPopupTitleEl)
      rareEnemyPopupTitleEl = document.getElementById("rareEnemyPopupTitle");
    if (!rareEnemyPopupNameEl)
      rareEnemyPopupNameEl = document.getElementById("rareEnemyPopupName");
    if (!rareEnemyPopupHintEl)
      rareEnemyPopupHintEl = document.getElementById("rareEnemyPopupHint");
    if (!rareEnemyPopupCloseEl)
      rareEnemyPopupCloseEl = document.getElementById("rareEnemyPopupClose");

    if (!rareEnemyPopupEl) return false;

    if (!rareEnemyPopupBound) {
      rareEnemyPopupEl.addEventListener("click", () => {
        if (!allowRarePopupOverlayClose) return;
        if (rareEnemyPopupTimer) {
          clearTimeout(rareEnemyPopupTimer);
          rareEnemyPopupTimer = null;
        }
        hideRareEnemyPopup();
      });

      if (rareEnemyPopupCloseEl) {
        rareEnemyPopupCloseEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (rareEnemyPopupTimer) {
            clearTimeout(rareEnemyPopupTimer);
            rareEnemyPopupTimer = null;
          }
          hideRareEnemyPopup();
        });
      }

      rareEnemyPopupBound = true;
    }

    return true;
  }

  function hideRareEnemyPopup() {
    if (!ensureRareEnemyPopupBound()) return;
    rareEnemyPopupEl.classList.remove("is-visible");
    rareEnemyPopupEl.setAttribute("aria-hidden", "true");
  }

  function showRareEnemyPopup(
    nameText,
    titleText = "レアモンスター出現！",
    {
      autoClose = true,
      allowOverlayClose = true,
      showCloseButton = false,
      hintText = "タップで閉じる",
    } = {},
  ) {
    if (!ensureRareEnemyPopupBound()) return;

    if (rareEnemyPopupTitleEl) rareEnemyPopupTitleEl.textContent = titleText;
    if (rareEnemyPopupNameEl) rareEnemyPopupNameEl.textContent = nameText;
    if (rareEnemyPopupHintEl) rareEnemyPopupHintEl.textContent = hintText;
    if (rareEnemyPopupCloseEl) rareEnemyPopupCloseEl.hidden = !showCloseButton;

    allowRarePopupOverlayClose = !!allowOverlayClose;

    rareEnemyPopupEl.classList.add("is-visible");
    rareEnemyPopupEl.setAttribute("aria-hidden", "false");

    if (rareEnemyPopupTimer) {
      clearTimeout(rareEnemyPopupTimer);
    }

    if (autoClose) {
      rareEnemyPopupTimer = setTimeout(() => {
        hideRareEnemyPopup();
      }, 2200);
    } else {
      rareEnemyPopupTimer = null;
    }
  }

  function showEventPopup(message, titleText = "イベント発生") {
    showRareEnemyPopup(message, titleText, {
      autoClose: false,
      allowOverlayClose: false,
      showCloseButton: true,
      hintText: "閉じるボタンで閉じる",
    });
  }

  // core.js の関数を参照するための薄いラッパ（UI側で必要）
  function getExpNeeded() {
    const lv = Number(gameData.player.level || 1);
    const extra = Math.max(0, lv - 1);

    // 全レベル共通：線形 + 緩やかな曲線
    return Math.floor(50 + extra * 220 + Math.pow(extra, 1.5) * 70);
  }

  // -------------------
  // UI - バッグ
  // -------------------
  function openBag() {
    document.getElementById("bagScreen").style.display = "block";
    document.getElementById("optionsScreen").style.display = "none";
    document.getElementById("exploreButtons").style.display = "none";
    document.getElementById("battleButtons").style.display = "none";
    updateBagUI();
  }

  function closeBag() {
    document.getElementById("bagScreen").style.display = "none";
    updateUI();
  }

  function setBagTab(tab) {
    const ev = window.event;
    document
      .querySelectorAll(".inventory-tab")
      .forEach((t) => t.classList.remove("is-active"));
    if (ev && ev.target) ev.target.classList.add("is-active");

    if (tab === "equipment") {
      document.getElementById("equipmentTab").style.display = "block";
      document.getElementById("itemsTab").style.display = "none";
    } else {
      document.getElementById("equipmentTab").style.display = "none";
      document.getElementById("itemsTab").style.display = "block";
    }

    updateBagUI();
  }

  function setEquipmentSubTab(tab) {
    const ev = window.event;
    document
      .querySelectorAll("#equipmentTab > .sub-tabs .sub-tab")
      .forEach((t) => t.classList.remove("is-active"));
    if (ev && ev.target) ev.target.classList.add("is-active");

    if (tab === "weapons") {
      document.getElementById("weaponsSubTab").style.display = "block";
      document.getElementById("accessoriesSubTab").style.display = "none";
    } else {
      document.getElementById("weaponsSubTab").style.display = "none";
      document.getElementById("accessoriesSubTab").style.display = "block";
    }

    updateBagUI();
  }

  function setWeaponHandsTab(tab) {
    const nextTab = tab === "twoHand" ? "twoHand" : "oneHand";
    currentWeaponHandsTab = nextTab;

    document
      .querySelectorAll(".weapon-hands-tab")
      .forEach((t) =>
        t.classList.toggle(
          "is-active",
          t.dataset.weaponHandsTab === currentWeaponHandsTab,
        ),
      );

    updateBagUI();
  }

  function ensureAutoSellConfig() {
    const p = gameData && gameData.player ? gameData.player : null;
    if (!p) return null;
    if (!p.autoSell || typeof p.autoSell !== "object") p.autoSell = {};
    p.autoSell.armorDefenseMax = Math.max(
      0,
      Math.floor(Number(p.autoSell.armorDefenseMax || 0)),
    );
    p.autoSell.weaponAttackMax = Math.max(
      0,
      Math.floor(Number(p.autoSell.weaponAttackMax || 0)),
    );
    p.autoSell.weaponHealPowerMax = Math.max(
      0,
      Math.floor(Number(p.autoSell.weaponHealPowerMax || 0)),
    );
    p.autoSell.weaponMagicAttackMax = Math.max(
      0,
      Math.floor(Number(p.autoSell.weaponMagicAttackMax || 0)),
    );
    return p.autoSell;
  }

  function syncAutoSellConfigUi() {
    const cfg = ensureAutoSellConfig();
    const armorEl = document.getElementById("autoSellArmorDefenseMax");
    const atkEl = document.getElementById("autoSellWeaponAttackMax");
    const healEl = document.getElementById("autoSellWeaponHealPowerMax");
    const matkEl = document.getElementById("autoSellWeaponMagicAttackMax");
    if (!cfg || !armorEl || !atkEl || !healEl || !matkEl) return;

    armorEl.value = String(cfg.armorDefenseMax || 0);
    atkEl.value = String(cfg.weaponAttackMax || 0);
    healEl.value = String(cfg.weaponHealPowerMax || 0);
    matkEl.value = String(cfg.weaponMagicAttackMax || 0);
  }

  function onAutoSellConfigChange() {
    const cfg = ensureAutoSellConfig();
    if (!cfg) return;

    const armorEl = document.getElementById("autoSellArmorDefenseMax");
    const atkEl = document.getElementById("autoSellWeaponAttackMax");
    const healEl = document.getElementById("autoSellWeaponHealPowerMax");
    const matkEl = document.getElementById("autoSellWeaponMagicAttackMax");

    const toInt = (el) => {
      const n = Math.floor(Number(el && el.value != null ? el.value : 0));
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    cfg.armorDefenseMax = toInt(armorEl);
    cfg.weaponAttackMax = toInt(atkEl);
    cfg.weaponHealPowerMax = toInt(healEl);
    cfg.weaponMagicAttackMax = toInt(matkEl);

    syncAutoSellConfigUi();
    log(`⚙️ 自動売却閾値を更新`);
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function openAutoSellConfigModal() {
    syncAutoSellConfigUi();
    const modal = document.getElementById("autoSellConfigModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeAutoSellConfigModal() {
    const modal = document.getElementById("autoSellConfigModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  // -------------------
  function fmtSigned(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n === 0) return "";
    return n > 0 ? `+${n}` : `${n}`;
  }

  function fmtStat(label, value, suffix = "") {
    const s = fmtSigned(value);
    if (!s) return "";
    return `${label}${s}${suffix} `;
  }

  // 装備効果の表示（UP表記ではなく具体値で表示する）
  // 例: ドロップ率+10% / 攻撃力+12 / クールタイム-1ターン
  function formatEffectText(eff) {
    if (!eff) return "";

    const v = Number(eff.value);
    const hasV = Number.isFinite(v);
    const sign = hasV ? (v >= 0 ? "+" : "") : "";

    const cond = eff.cond || eff.condition;
    const condPrefix =
      cond === "unarmed"
        ? "素手 "
        : cond === "noArmor"
          ? "無防具 "
          : cond === "twoHanded"
            ? "両手 "
            : "";

    switch (eff.type) {
      case "dropRate":
        return hasV
          ? `${condPrefix}ドロップ率${sign}${v}%`
          : `${condPrefix}ドロップ率`;
      case "expBonus":
        return hasV ? `${condPrefix}経験値${sign}${v}%` : `${condPrefix}経験値`;
      case "skillPower":
        return hasV
          ? `${condPrefix}スキル威力${sign}${v}%`
          : `${condPrefix}スキル威力`;
      case "critRate":
        return hasV
          ? `${condPrefix}会心率${sign}${v}%`
          : `${condPrefix}会心率`;
      case "accuracy":
        return hasV ? `${condPrefix}命中${sign}${v}%` : `${condPrefix}命中`;
      case "evasion":
        return hasV ? `${condPrefix}回避${sign}${v}%` : `${condPrefix}回避`;
      case "attackBonus":
        return hasV ? `${condPrefix}攻撃力${sign}${v}` : `${condPrefix}攻撃力`;
      case "defenseBonus":
        return hasV ? `${condPrefix}防御力${sign}${v}` : `${condPrefix}防御力`;
      case "maxHpBonus":
        return hasV ? `${condPrefix}最大HP${sign}${v}` : `${condPrefix}最大HP`;
      case "search":
        return hasV ? `${condPrefix}索敵${sign}${v}` : `${condPrefix}索敵`;

      case "cooldownReduction":
        // 正値は短縮として扱う
        return hasV ? `${condPrefix}CT-${Math.abs(v)}` : `${condPrefix}CT短縮`;

      case "cooldownCheatChance":
        return hasV ? `${condPrefix}CT踏倒${sign}${v}%` : `${condPrefix}CT踏倒`;
      case "hitCdMinusChance":
        return hasV ? `${condPrefix}被弾でCT-1 ${v}%` : `${condPrefix}被弾短縮`;
      case "pursuitChance":
        return hasV ? `${condPrefix}追撃${sign}${v}%` : `${condPrefix}追撃`;
      case "pursuitDamagePct":
        return hasV
          ? `${condPrefix}追撃威力${sign}${v}%`
          : `${condPrefix}追撃威力`;
      case "firstHitPursuit":
        return `${condPrefix}初撃追撃`;
      case "deathAvoidOnce":
        return `${condPrefix}致死耐え(戦1)`;
      case "firstHitCrit":
        return `${condPrefix}初撃会心`;
      case "overhealBarrierCap":
        return hasV
          ? `${condPrefix}余剰回復盾(上限${v}%)`
          : `${condPrefix}余剰回復盾`;

      case "magicPower":
        return hasV
          ? `${condPrefix}魔法攻撃力${sign}${v}`
          : `${condPrefix}魔法攻撃力`;
      case "healPower":
        return hasV ? `${condPrefix}回復力${sign}${v}` : `${condPrefix}回復力`;
      case "healReceived":
        return hasV ? `${condPrefix}回復量${sign}${v}%` : `${condPrefix}回復量`;
      case "damageReduction":
        return hasV
          ? `${condPrefix}被ダメージ-${Math.abs(v)}%`
          : `${condPrefix}被ダメージ軽減`;
      case "critDamage":
        return hasV
          ? `${condPrefix}会心威力${sign}${v}%`
          : `${condPrefix}会心威力`;
      case "lifeSteal":
        return hasV ? `${condPrefix}HP吸収${sign}${v}%` : `${condPrefix}HP吸収`;
      case "regen":
        return hasV ? `${condPrefix}再生${sign}${v}%` : `${condPrefix}再生`;
      case "hitHeal":
        return hasV
          ? `${condPrefix}攻撃時HP回復${sign}${v}`
          : `${condPrefix}攻撃時HP回復`;
      case "counterChance":
        return hasV ? `${condPrefix}反撃率${sign}${v}%` : `${condPrefix}反撃率`;
      case "counterDamage":
        return hasV
          ? `${condPrefix}反撃威力${sign}${v}%`
          : `${condPrefix}反撃威力`;
      case "desperationDamage":
        return hasV ? `${condPrefix}背水${sign}${v}%` : `${condPrefix}背水`;
      case "battleStartHpLoss":
        return hasV
          ? `${condPrefix}戦闘開始時HP-${Math.abs(v)}%`
          : `${condPrefix}戦闘開始時HP減少`;
      case "executeDamage":
        return hasV
          ? `${condPrefix}追い打ち${sign}${v}%`
          : `${condPrefix}追い打ち`;
      case "evadeHeal":
        return hasV
          ? `${condPrefix}回避回復${sign}${v}`
          : `${condPrefix}回避回復`;
      case "ailmentDurationDown":
        return hasV
          ? `${condPrefix}状態異常短縮${sign}${v}%`
          : `${condPrefix}状態異常短縮`;
      case "ailmentResist":
        return hasV
          ? `${condPrefix}状態異常耐性${sign}${v}%`
          : `${condPrefix}状態異常耐性`;
      default:
        if (eff.name && hasV) return `${condPrefix}${eff.name}(${sign}${v})`;
        return `${condPrefix}${eff.name || ""}`;
    }
  }

  // -------------------
  // 装備表示（固有能力 / ランダムオプション）
  // -------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * @param {Record<string, number>|null|undefined} deltas
   * @returns {string}
   */
  function formatStatDeltaText(deltas) {
    const d = deltas && typeof deltas === "object" ? deltas : {};
    const parts = [];
    const push = (label, v, suffix = "") => {
      const n = Number(v);
      if (!Number.isFinite(n) || n === 0) return;
      const sign = n > 0 ? "+" : "";
      parts.push(`${label}${sign}${n}${suffix}`);
    };

    push("攻撃力", d.attack);
    push("防御", d.defense);
    push("魔法攻撃", d.magicAttack);
    push("回復力", d.healPower);
    push("命中", d.accuracy, "%");
    push("回避", d.evasion, "%");

    return parts.length ? parts.join(" / ") : "能力強化（合算済み）";
  }

  /**
   * @param {any} item
   * @returns {string[]}
   */
  function getFixedEffectTexts(item) {
    const list = Array.isArray(item?.fixedEffects) ? item.fixedEffects : [];
    return list
      .map((x) => {
        if (!x) return "";
        if (typeof x === "string") return x;
        if (x.text) return String(x.text);
        return formatEffectText(x);
      })
      .filter(Boolean);
  }

  /**
   * @param {any} item
   * @returns {string[]}
   */
  function getRandomOptionTexts(item) {
    const texts = [];
    const details = Array.isArray(item?.randomOptionDetails)
      ? item.randomOptionDetails
      : null;

    if (details && details.length) {
      for (const ent of details) {
        if (!ent) continue;
        if (ent.kind === "stat") {
          texts.push(formatStatDeltaText(ent.deltas));
          continue;
        }
        if (ent.kind === "effect") {
          const eff = ent.effect || ent;
          const t = formatEffectText(eff);
          if (t) texts.push(t);
          continue;
        }
        // 互換：effectっぽいオブジェクトが直で入っている場合
        const t = formatEffectText(ent);
        if (t) texts.push(t);
      }
      return texts.filter(Boolean);
    }

    // 旧データ互換：effects と randomOptions から推測
    const effects = Array.isArray(item?.effects) ? item.effects : [];
    effects.forEach((eff) => {
      const t = formatEffectText(eff);
      if (t) texts.push(t);
    });

    const desired = Math.max(0, Math.floor(Number(item?.randomOptions || 0)));
    const missing = Math.max(0, desired - effects.length);
    for (let i = 0; i < missing; i++) {
      texts.push("能力強化（合算済み）");
    }

    return texts.filter(Boolean);
  }

  /**
   * @param {string[]} texts
   * @param {string} emptyText
   * @returns {string}
   */
  function renderEffectListHtml(texts, emptyText = "なし") {
    if (!Array.isArray(texts) || texts.length === 0) {
      return `<div class="effect-none">${escapeHtml(emptyText)}</div>`;
    }
    const li = texts.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    return `<ul class="effect-list">${li}</ul>`;
  }

  function getComparisonDeltaEntries(currentItem, nextItem) {
    const calcDiff = (key) =>
      Math.round(Number(nextItem?.[key]) || 0) -
      Math.round(Number(currentItem?.[key]) || 0);

    const entries = [];
    const push = (label, key) => {
      const value = calcDiff(key);
      if (value === 0) return;
      entries.push({
        label,
        value,
        className: value > 0 ? "equip-stat-up" : "equip-stat-down",
      });
    };

    push("攻撃", "attack");
    push("防御", "defense");
    push("魔法", "magicAttack");
    push("回復", "healPower");

    return entries;
  }

  function buildTwoHandCompareBase(slot1, slot2) {
    const val = (item, key) => Math.round(Number(item?.[key]) || 0);
    const parts = [];
    if (slot1)
      parts.push(`装備1:${slot1.name}${slot1.hands === 2 ? "（両手）" : ""}`);
    if (slot2)
      parts.push(`装備2:${slot2.name}${slot2.hands === 2 ? "（両手）" : ""}`);
    return {
      name: parts.length > 0 ? parts.join(" / ") : "空",
      attack: val(slot1, "attack") + val(slot2, "attack"),
      defense: val(slot1, "defense") + val(slot2, "defense"),
      magicAttack: val(slot1, "magicAttack") + val(slot2, "magicAttack"),
      healPower: val(slot1, "healPower") + val(slot2, "healPower"),
      fixedEffects: [
        ...getFixedEffectTexts(slot1),
        ...getFixedEffectTexts(slot2),
      ],
      randomOptionDetails: [
        ...getRandomOptionTexts(slot1).map((text) => ({ text })),
        ...getRandomOptionTexts(slot2).map((text) => ({ text })),
      ],
    };
  }

  function updateEquipCompareLayout(nextItem) {
    const isTwoHandTarget = Number(nextItem?.hands) === 2;
    const wrap = document.getElementById("equipCompareWrap");
    const card2 = document.getElementById("equipCompareCard2");
    const title1 = document.getElementById("equipCompareTitle1");

    if (wrap) {
      wrap.classList.toggle("single", isTwoHandTarget);
    }
    if (card2) {
      card2.classList.toggle("hidden", isTwoHandTarget);
    }
    if (title1) {
      title1.textContent = isTwoHandTarget
        ? "装備1+装備2との比較"
        : "装備1との比較";
    }
  }

  function renderEquipSlotComparison(slotNo, nextItem) {
    const eq = gameData?.player?.equipment || {};
    const isTwoHandTarget = Number(nextItem?.hands) === 2;

    const currentItem = isTwoHandTarget
      ? buildTwoHandCompareBase(eq.slot1, eq.slot2)
      : slotNo === 1
        ? eq.slot1
        : eq.slot2;

    const currentEl = document.getElementById(
      slotNo === 1 ? "equipCompareSlot1Current" : "equipCompareSlot2Current",
    );
    const statEl = document.getElementById(
      slotNo === 1 ? "equipCompareSlot1Stats" : "equipCompareSlot2Stats",
    );
    const effectsEl = document.getElementById(
      slotNo === 1 ? "equipCompareSlot1Effects" : "equipCompareSlot2Effects",
    );

    if (currentEl) {
      if (isTwoHandTarget) {
        currentEl.textContent = `現在(装備1+装備2): ${currentItem?.name || "空"}`;
      } else {
        currentEl.textContent = currentItem
          ? `現在: ${currentItem.name}${currentItem.hands === 2 ? "（両手）" : ""}`
          : "現在: 空";
      }
    }

    if (statEl) {
      const entries = getComparisonDeltaEntries(currentItem, nextItem);
      if (entries.length === 0) {
        statEl.textContent = "変化なし";
      } else {
        const html = entries
          .map(
            (ent) =>
              `<span class="${ent.className}">${escapeHtml(ent.label)}${ent.value > 0 ? "+" : ""}${ent.value}</span>`,
          )
          .join(" / ");
        statEl.innerHTML = html;
      }
    }

    if (effectsEl) {
      const currentEffects = isTwoHandTarget
        ? [
            ...getFixedEffectTexts(eq.slot1),
            ...getRandomOptionTexts(eq.slot1),
            ...getFixedEffectTexts(eq.slot2),
            ...getRandomOptionTexts(eq.slot2),
          ]
        : [
            ...getFixedEffectTexts(currentItem),
            ...getRandomOptionTexts(currentItem),
          ];
      const nextEffects = [
        ...getFixedEffectTexts(nextItem),
        ...getRandomOptionTexts(nextItem),
      ];
      const currentText =
        currentEffects.length > 0 ? currentEffects.join(" / ") : "なし";
      const nextText =
        nextEffects.length > 0 ? nextEffects.join(" / ") : "なし";
      effectsEl.textContent = `効果: ${currentText} → ${nextText}`;
    }
  }

  function sameItem(a, b) {
    if (!a || !b) return false;
    if (a.uid && b.uid) return a.uid === b.uid;
    return a === b;
  }

  function equippedSlotsFor(item) {
    const eq = gameData.player.equipment || {};
    const slots = [];
    if (sameItem(eq.slot1, item)) slots.push("装備1");
    if (sameItem(eq.slot2, item)) slots.push("装備2");
    if (sameItem(eq.accessory, item)) slots.push("装飾品");
    return slots;
  }

  function isEquipped(item) {
    return equippedSlotsFor(item).length > 0;
  }

  /**
   * アイテム欄での「文字色」用レア度を解決する。
   * - 特殊接頭語がある場合のみ、その接頭語レア度（rare/epic/legendary）を返す
   * - 通常装備は白文字のままにしたいので空文字を返す
   * - 旧データ（_specialPrefixName はあるが _specialPrefixRarity が無い）にも対応
   * @param {any} item
   * @returns {string}
   */
  function resolveBagDisplayRarity(item) {
    if (!item || typeof item !== "object") return "";

    const spRarity =
      typeof item._specialPrefixRarity === "string"
        ? item._specialPrefixRarity
        : "";
    if (spRarity) return spRarity;

    const spName =
      typeof item._specialPrefixName === "string"
        ? item._specialPrefixName
        : "";
    if (spName) {
      // 旧データ向け：名前からテーブルを引いてレア度を推定
      const pools = [
        window.SPECIAL_PREFIXES_COMMON,
        window.SPECIAL_PREFIXES_WEAPON,
        window.SPECIAL_PREFIXES_ARMOR,
      ];
      for (const pool of pools) {
        if (!Array.isArray(pool)) continue;
        for (const p of pool) {
          if (p && p.name === spName && typeof p.rarity === "string") {
            return p.rarity;
          }
        }
      }
    }

    // 通常装備は色付けしない（白文字のまま）
    return "";
  }

  function ensureInventoryAcquireOrder(inv) {
    if (!Array.isArray(inv) || inv.length === 0) return;

    let maxOrder = 0;
    for (const item of inv) {
      const n = Math.floor(Number(item?._bagAcquireOrder));
      if (Number.isFinite(n) && n > maxOrder) maxOrder = n;
    }

    let next = Math.max(1, bagAcquireOrderSeed, maxOrder + 1);
    for (const item of inv) {
      if (!item || typeof item !== "object") continue;
      const n = Math.floor(Number(item._bagAcquireOrder));
      if (Number.isFinite(n) && n > 0) continue;
      item._bagAcquireOrder = next;
      next += 1;
    }

    bagAcquireOrderSeed = next;
  }

  function getAccessorySortValue(item) {
    const effects = Array.isArray(item?.effects) ? item.effects : [];
    let best = 0;
    for (const eff of effects) {
      const v = Number(eff && eff.value);
      if (!Number.isFinite(v)) continue;
      const absV = Math.abs(v);
      if (absV > best) best = absV;
    }
    return best;
  }

  function getAccessoryPrimaryEffect(item) {
    const effects = Array.isArray(item?.effects) ? item.effects : [];
    if (!effects.length) return { type: "", value: 0 };

    const first = effects.find((eff) => eff && typeof eff.type === "string");
    if (!first) return { type: "", value: 0 };

    const value = Number(first.value);
    return {
      type: first.type,
      value: Number.isFinite(value) ? Math.abs(value) : 0,
    };
  }

  function sortAccessoryItemsByEffectOnly(inv) {
    if (!Array.isArray(inv) || inv.length <= 1) return;

    const accessoryIndexes = [];
    const accessories = [];

    inv.forEach((item, idx) => {
      if (item?.category !== "accessory") return;
      accessoryIndexes.push(idx);
      accessories.push(item);
    });

    if (accessories.length <= 1) return;

    accessories.sort((a, b) => {
      const ae = getAccessoryPrimaryEffect(a);
      const be = getAccessoryPrimaryEffect(b);
      const typeDiff = ae.type.localeCompare(be.type, "ja");
      if (typeDiff !== 0) return typeDiff;

      const valueDiff = be.value - ae.value;
      if (valueDiff !== 0) return valueDiff;

      const an = String(a?.name || "");
      const bn = String(b?.name || "");
      return an.localeCompare(bn, "ja");
    });

    accessoryIndexes.forEach((idx, i) => {
      inv[idx] = accessories[i];
    });
  }

  function isAccessoriesSubTabActive() {
    const accessoriesSubTab = document.getElementById("accessoriesSubTab");
    if (!accessoriesSubTab) return false;
    return accessoriesSubTab.style.display !== "none";
  }

  function getEquipmentSortValue(item) {
    if (!item || typeof item !== "object") return 0;

    if (item.category === "accessory") {
      return getAccessorySortValue(item);
    }

    if (bagEffectSortKey === "acquire") {
      const order = Math.floor(Number(item?._bagAcquireOrder));
      return Number.isFinite(order) ? order : -1;
    }

    const value = Number(item?.[bagEffectSortKey]);
    return Number.isFinite(value) ? value : 0;
  }

  function updateEffectSortButtonsUI() {
    const controlsEl = document.getElementById("effectSortControls");
    if (!controlsEl) return;
    controlsEl.querySelectorAll(".effect-sort-btn").forEach((btn) => {
      const isActive = btn?.dataset?.effectSort === bagEffectSortKey;
      btn.classList.toggle("is-active", isActive);
    });
  }

  function sortInventoryByAcquireOrder(inv) {
    inv.sort((a, b) => {
      const ao = Math.floor(Number(a?._bagAcquireOrder));
      const bo = Math.floor(Number(b?._bagAcquireOrder));
      const aOrder = Number.isFinite(ao) ? ao : -1;
      const bOrder = Number.isFinite(bo) ? bo : -1;
      const diff = bOrder - aOrder;
      if (diff !== 0) return diff;
      const an = String(a?.name || "");
      const bn = String(b?.name || "");
      return an.localeCompare(bn, "ja");
    });
  }

  function sortInventoryBySelectedKey(inv) {
    if (bagEffectSortKey === "acquire") {
      sortInventoryByAcquireOrder(inv);
      return;
    }

    inv.sort((a, b) => {
      const diff = getEquipmentSortValue(b) - getEquipmentSortValue(a);
      if (diff !== 0) return diff;
      const an = String(a?.name || "");
      const bn = String(b?.name || "");
      return an.localeCompare(bn, "ja");
    });
  }

  function sortInventoryByEffectValue() {
    const inv = gameData?.player?.inventory;
    const controlsEl = document.getElementById("effectSortControls");

    if (isAccessoriesSubTabActive()) {
      if (!Array.isArray(inv) || inv.length <= 1) {
        log("ソート対象の装備がない");
        return;
      }

      ensureInventoryAcquireOrder(inv);
      sortAccessoryItemsByEffectOnly(inv);

      bagSortMode = "effect";
      if (controlsEl) controlsEl.style.display = "none";
      updateBagUI();
      log("🧮 装飾品を効果ごとにソートした");
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }

    if (bagSortMode === "effect") {
      bagSortMode = "acquire";
      if (controlsEl) controlsEl.style.display = "grid";
      updateEffectSortButtonsUI();
      log("🧮 効果ソートの項目を選択してください");
      return;
    }

    if (!Array.isArray(inv) || inv.length <= 1) {
      log("ソート対象の装備がない");
      return;
    }

    ensureInventoryAcquireOrder(inv);
    sortInventoryBySelectedKey(inv);

    bagSortMode = "effect";
    if (controlsEl) controlsEl.style.display = "none";
    updateBagUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function getEffectSortLabel(key) {
    switch (key) {
      case "attack":
        return "攻撃";
      case "healPower":
        return "回復力";
      case "magicAttack":
        return "魔法攻撃";
      case "defense":
        return "防御";
      case "acquire":
        return "入手順";
      default:
        return "効果";
    }
  }

  function setBagEffectSortKey(key) {
    const sortKeys = new Set([
      "attack",
      "healPower",
      "magicAttack",
      "defense",
      "acquire",
    ]);
    if (!sortKeys.has(key)) return;

    bagEffectSortKey = key;
    updateEffectSortButtonsUI();

    const inv = gameData?.player?.inventory;
    if (!Array.isArray(inv) || inv.length <= 1) {
      log("ソート対象の装備がない");
      return;
    }

    ensureInventoryAcquireOrder(inv);
    sortInventoryBySelectedKey(inv);

    const controlsEl = document.getElementById("effectSortControls");
    if (controlsEl) controlsEl.style.display = "none";
    bagSortMode = "effect";

    log(`🧮 ${getEffectSortLabel(key)}の高い順でソートした`);
    updateBagUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function updateBagUI() {
    ensureInventoryAcquireOrder(gameData.player.inventory);

    const weaponsList = document.getElementById("weaponsList");
    const accessoriesList = document.getElementById("accessoriesList");
    const valuablesList = document.getElementById("valuablesList");

    weaponsList.innerHTML = "";
    accessoriesList.innerHTML = "";
    if (valuablesList) valuablesList.innerHTML = "";

    // 装備中アイテムは常に先頭に表示し、未装備は現在順を維持する
    const displayInventory = gameData.player.inventory
      .map((item, idx) => ({ item, idx, equipped: isEquipped(item) }))
      .sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        return a.idx - b.idx;
      });

    // 装備品
    displayInventory.forEach(({ item, idx, equipped }) => {
      const locked = !!item.locked;
      const lockIcon = locked ? "🔒" : "🔓";
      const canDiscard = !locked && !equipped;

      const categoryClass =
        item.category === "weapon"
          ? "cat-weapon"
          : item.category === "armor"
            ? "cat-armor"
            : item.category === "accessory"
              ? "cat-accessory"
              : "";

      const rarityText = resolveBagDisplayRarity(item);
      const rarityClass =
        rarityText === "rare" ||
        rarityText === "epic" ||
        rarityText === "legendary"
          ? `rarity-${rarityText}`
          : "";

      const fixedTexts = getFixedEffectTexts(item);
      const randomTexts = getRandomOptionTexts(item);
      const randomCount = randomTexts.length;

      // 固有能力がない場合、アイテム欄では「固有能力」欄自体を非表示にする
      const fixedSectionHtml =
        Array.isArray(fixedTexts) && fixedTexts.length > 0
          ? `
                <div class="effect-section">
                  <div class="effect-title">装備固有能力</div>
                  ${renderEffectListHtml(fixedTexts)}
                </div>
              `
          : "";
      // アイテム欄では「両手武器」を明示する
      // 例: 破邪の弓（両手） +2
      const twoHandSuffix =
        item && Number(item.hands || 0) === 2 ? "（両手）" : "";
      const displayName = `${item.name}${twoHandSuffix}${randomCount > 0 ? ` +${randomCount}` : ""}`;

      const baseStatsText = [
        fmtStat("攻撃", item.attack).trim(),
        fmtStat("魔法攻撃", item.magicAttack).trim(),
        fmtStat("回復力", item.healPower).trim(),
        fmtStat("防御", item.defense).trim(),
        fmtStat("命中", item.accuracy, "%").trim(),
        fmtStat("回避", item.evasion, "%").trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const card = `
        <div class="item-card ${equipped ? "equipped" : ""} ${locked ? "locked" : ""} ${categoryClass}" onclick="toggleEquip(${idx})">
          <div class="item-row">
            <div class="item-main">
              <div class="item-name ${rarityClass}">${displayName}</div>
              ${baseStatsText ? `<div class="item-stats">${baseStatsText}</div>` : ""}

              <div class="item-effects">
                ${fixedSectionHtml}
                <div class="effect-section">
                  <div class="effect-title">ランダムオプション</div>
                  ${renderEffectListHtml(randomTexts, "なし")}
                </div>
              </div>

              ${equipped ? `<div class="equipped-label">${equippedSlotsFor(item).join(" /  ")}に装備中</div>` : ""}
              ${!equipped && locked ? `<div class="locked-label">ロック中</div>` : ""}
            </div>
            <div class="item-actions">
              <button type="button" class="item-action-btn" onclick="toggleItemLock(event, ${idx})">${lockIcon}</button>
              <button type="button" class="item-action-btn discard" onclick="discardEquipment(event, ${idx})" ${canDiscard ? "" : "disabled"}>🗑</button>
            </div>
          </div>
        </div>
      `;

      if (item.category === "accessory") {
        accessoriesList.innerHTML += card;
      } else {
        const isTwoHandEquipment = Number(item.hands || 0) === 2;
        const shouldShowInHandsTab =
          currentWeaponHandsTab === "twoHand"
            ? isTwoHandEquipment
            : !isTwoHandEquipment;
        if (shouldShowInHandsTab) {
          weaponsList.innerHTML += card;
        }
      }
    });

    if (weaponsList && weaponsList.innerHTML.trim() === "") {
      const handTypeLabel =
        currentWeaponHandsTab === "twoHand" ? "両手" : "片手";
      weaponsList.innerHTML = `<div class="small" style="color:#aaa; padding:8px;">${handTypeLabel}装備がありません</div>`;
    }

    // アイテム（貴重品）
    if (valuablesList) {
      const vals = Array.isArray(gameData.player.valuables)
        ? gameData.player.valuables
        : [];
      if (vals.length === 0) {
        valuablesList.innerHTML = `<div class="small" style="color:#aaa; padding:8px;">貴重品を持っていません</div>`;
      } else {
        const statName = {
          strength: "⚔️ 力",
          vitality: "❤️ 体力",
          intelligence: "🧙 賢さ",
          agility: "⚡ 素早さ",
          dexterity: "🎯 器用さ",
        };
        vals.forEach((v) => {
          const cnt = Number(v.count || 0);
          if (!Number.isFinite(cnt) || cnt <= 0) return;
          const key = String(v.statKey || "");
          const sname = statName[key] || "ステータス";
          const hasStatEffect = !!key && key in statName;
          const effect = cnt === 1 ? `${sname}+1` : `${sname}+${cnt}`;
          const description =
            typeof v.description === "string" && v.description
              ? v.description
              : "";
          const canUseMapFragment =
            v.id === "ancient_map_fragment" && Number(cnt) >= 5;
          valuablesList.innerHTML += `
            <div class="item-card">
              <div class="item-name">✨ ${v.name} x${cnt}</div>
              ${hasStatEffect ? `<div class="item-stats">所持効果：${effect}</div>` : ""}
              ${description ? `<div class="item-stats">${description}</div>` : ""}
              ${canUseMapFragment ? `<button type="button" class="item-action-btn item-action-btn-text" onclick="useValuableById('${v.id}')">使用する</button>` : ""}
            </div>
          `;
        });
      }
    }
  }

  // -------------------
  // 装備品：ロック / 捨てる
  // -------------------
  function toggleItemLock(ev, idx) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const item = gameData.player.inventory[idx];
    if (!item) return;

    item.locked = !item.locked;
    log(item.locked ? "🔒 ロックした" : "🔓 ロック解除した");
    updateBagUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function discardEquipment(ev, idx) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const item = gameData.player.inventory[idx];
    if (!item) return;

    if (item.locked) {
      log("🔒 ロック中のため捨てられない");
      return;
    }
    if (isEquipped(item)) {
      log("装備中のため捨てられない");
      return;
    }

    gameData.player.inventory.splice(idx, 1);
    log("🗑 捨てた");
    getCombatStats();
    updateBagUI();
    updateUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }
  function discardAllUnprotectedEquipment() {
    const player = gameData && gameData.player;
    const inv =
      player && Array.isArray(player.inventory) ? player.inventory : null;
    if (!inv || inv.length === 0) {
      log("捨てられる装備がない");
      return;
    }

    const discardIndexes = [];
    inv.forEach((item, idx) => {
      if (!item || item.locked || isEquipped(item)) return;
      discardIndexes.push(idx);
    });

    const discardCount = discardIndexes.length;
    if (discardCount === 0) {
      log("🔒 ロック中/装備中以外の装備がない");
      return;
    }

    const ok = window.confirm(
      `ロック中/装備中以外の装備を${discardCount}件まとめて捨てます。よろしいですか？`,
    );
    if (!ok) return;

    for (let i = discardIndexes.length - 1; i >= 0; i--) {
      inv.splice(discardIndexes[i], 1);
    }

    log(`🗑 ${discardCount}件の装備を捨てた`);
    getCombatStats();
    updateBagUI();
    updateUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }
  // 装備ルール:
  // - 武器/防具: 装備1 / 装備2 の2枠
  // - 装飾品: accessory 1枠
  // - hands===2 は両手装備（もう片方は装備不可）
  let pendingEquipIndex = null;

  function isTwoHandLocked() {
    const eq = gameData.player.equipment;
    if (eq.slot1 && eq.slot1.hands === 2) return 1;
    if (eq.slot2 && eq.slot2.hands === 2) return 2;
    return 0;
  }

  function openEquipSlotPicker(idx) {
    const item = gameData.player.inventory[idx];
    if (!item) return;

    // 職業制限：武器を装備できない職（拳聖/修羅など）
    {
      const jobKey = gameData.player?.job;
      const jt =
        jobs && jobs[jobKey] && jobs[jobKey].traits ? jobs[jobKey].traits : {};
      if (jt && jt.cannotEquipWeapon && item.category === "weapon") {
        log("この職業では武器を装備できない");
        return;
      }
    }

    pendingEquipIndex = idx;

    const modal = document.getElementById("equipSlotModal");
    const label = document.getElementById("equipSlotModalItem");
    const btn1 = document.getElementById("equipSlotBtn1");
    const btn2 = document.getElementById("equipSlotBtn2");

    if (label) {
      label.textContent = item.hands === 2 ? `${item.name}（両手）` : item.name;
    }

    const lock = isTwoHandLocked();

    const canEquipTo = (slotNo) => {
      // 職業制限：武器を装備できない職（拳聖/修羅など）
      const jobKey = gameData.player?.job;
      const jt =
        jobs && jobs[jobKey] && jobs[jobKey].traits ? jobs[jobKey].traits : {};
      if (jt && jt.cannotEquipWeapon && item && item.category === "weapon")
        return false;

      // 両手武器はどちらでも選べる（もう片方は空になる）
      if (item.hands === 2) return true;

      // 両手装備中でも、片手装備への切り替えは「装備1/装備2どちらを選んでもOK」。
      // 選んだスロットに装備する際に、両手装備を外してから装備する。
      return true;
    };

    if (btn1) btn1.disabled = !canEquipTo(1);
    if (btn2) btn2.disabled = !canEquipTo(2);

    updateEquipCompareLayout(item);
    renderEquipSlotComparison(1, item);
    if (Number(item?.hands) !== 2) {
      renderEquipSlotComparison(2, item);
    }

    if (modal) modal.classList.remove("hidden");
  }

  function closeEquipSlotPicker() {
    const modal = document.getElementById("equipSlotModal");
    if (modal) modal.classList.add("hidden");
    pendingEquipIndex = null;
  }

  function chooseEquipSlot(slotNo) {
    if (pendingEquipIndex == null) return;

    const item = gameData.player.inventory[pendingEquipIndex];
    if (!item) {
      closeEquipSlotPicker();
      return;
    }

    equipItemToSlot(item, slotNo);
    closeEquipSlotPicker();
  }

  function equipItemToSlot(item, slotNo) {
    const eq = gameData.player.equipment;

    // 職業制限：武器を装備できない職（拳聖/修羅など）
    {
      const jobKey = gameData.player?.job;
      const jt =
        jobs && jobs[jobKey] && jobs[jobKey].traits ? jobs[jobKey].traits : {};
      if (jt && jt.cannotEquipWeapon && item && item.category === "weapon") {
        log("この職業では武器を装備できない");
        return;
      }
    }

    // 装飾品は専用スロット
    if (item.category === "accessory") {
      eq.accessory = item;
      log(`${item.name}を装飾品に装備した`);
      getCombatStats();
      updateBagUI();
      updateUI();
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }

    const lock = isTwoHandLocked();

    // 両手装備中のロック処理
    // 以前は「別スロットへの装備」を禁止していましたが、
    // 両手武器から片手武器へ切り替える時は「装備1/装備2どちらを選んでも」変更できるようにします。
    // - 両手武器が装備1に入っている状態で装備2を選んだ場合: いったん両手武器を外してから装備2へ
    // - 両手武器が装備2に入っている状態で装備1を選んだ場合: いったん両手武器を外してから装備1へ
    if (item.hands !== 2) {
      if (lock === 1 && slotNo === 2) {
        const removed = eq.slot1;
        eq.slot1 = null;
        if (removed) log(`${removed.name}（両手）を外した`);
      }
      if (lock === 2 && slotNo === 1) {
        const removed = eq.slot2;
        eq.slot2 = null;
        if (removed) log(`${removed.name}（両手）を外した`);
      }
    }

    if (slotNo === 1) {
      eq.slot1 = item;
      if (item.hands === 2) {
        eq.slot2 = null;
      } else {
        if (sameItem(eq.slot2, item)) eq.slot2 = null;
      }
      log(`${item.name}を装備1に装備した`);
    } else {
      eq.slot2 = item;
      if (item.hands === 2) {
        eq.slot1 = null;
      } else {
        if (sameItem(eq.slot1, item)) eq.slot1 = null;
      }
      log(`${item.name}を装備2に装備した`);
    }

    getCombatStats();
    updateBagUI();
    updateUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function toggleEquip(idx) {
    const item = gameData.player.inventory[idx];
    const eq = gameData.player.equipment;

    // 装備中ならタップで外す
    if (sameItem(eq.accessory, item)) {
      eq.accessory = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      updateUI();
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }
    if (sameItem(eq.slot1, item)) {
      eq.slot1 = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      updateUI();
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }
    if (sameItem(eq.slot2, item)) {
      eq.slot2 = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      updateUI();
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }

    // 装飾品は専用スロットへ
    if (item.category === "accessory") {
      eq.accessory = item;
      log(`${item.name}を装飾品に装備した`);
      getCombatStats();
      updateBagUI();
      updateUI();
      if (typeof requestAutosave === "function") requestAutosave();
      return;
    }

    // 武器/防具は装備先を選択
    openEquipSlotPicker(idx);
  }

  function useValuableById(id) {
    if (id !== "ancient_map_fragment") return;
    const vals = Array.isArray(gameData?.player?.valuables)
      ? gameData.player.valuables
      : [];
    const target = vals.find((v) => v && v.id === id);
    const cnt = Number(target?.count || 0);
    if (!Number.isFinite(cnt) || cnt < 5) {
      log("謎のかけらが足りない");
      return;
    }

    const isAsuraNow = !!gameData?.player?.worldState?.isAsura;
    if (
      !isAsuraNow &&
      typeof window.confirm === "function" &&
      !window.confirm(
        "敵がかなり強くなります。旅立ちますか？（いつでも元の世界に戻れます）",
      )
    ) {
      return;
    }

    let movedToAsura = null;
    if (typeof window.toggleAsuraWorldByMapFragment === "function") {
      const result = window.toggleAsuraWorldByMapFragment();
      if (result && result.ok) movedToAsura = !!result.movedToAsura;
    }

    if (movedToAsura === true) {
      log("🗝️ 修羅の国への鍵を使い、修羅の国へ転移した！");
    } else if (movedToAsura === false) {
      log("🗝️ 修羅の国への鍵を使い、元の世界へ戻った！");
    } else {
      log("🗝️ 修羅の国への鍵を使った…しかし鍵は消えなかった");
    }

    if (typeof window.showRareEnemyPopup === "function") {
      const title =
        movedToAsura === true
          ? "修羅の国"
          : movedToAsura === false
            ? "元の世界"
            : "修羅の国への鍵";
      const body =
        movedToAsura === true
          ? "世界が歪み、修羅の国に飲み込まれた…"
          : movedToAsura === false
            ? "歪みが晴れ、元の世界に戻った"
            : "5つ集めた謎のかけらは、修羅の国への鍵へと変化した…！";
      window.showRareEnemyPopup(title, body, {
        autoClose: false,
        allowOverlayClose: false,
        showCloseButton: true,
        hintText: "不思議な力で鍵は残っている",
      });
    }
    updateBagUI();
    updateUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function useItem(name) {
    const item = gameData.player.items.find((i) => i.name === name);
    if (!item) return;

    item.count--;
    if (item.count <= 0) {
      gameData.player.items = gameData.player.items.filter(
        (i) => i.name !== name,
      );
    }

    let heal = Number(item.heal || 0);

    gameData.player.hp = Math.min(
      gameData.player.maxHp,
      gameData.player.hp + heal,
    );
    log(`${name}を使用！ ${heal}HP回復した！`);

    updateBagUI();
    updateUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  // -------------------
  // UI - ステータス
  // -------------------
  let currentStatusTab = "status";

  function openStatus() {
    // バージョン表示（記録タブ横）
    applyGameVersionBadges();

    document.getElementById("statusScreen").style.display = "block";
    document.getElementById("optionsScreen").style.display = "none";
    document.getElementById("helpScreen").style.display = "none";
    document.getElementById("exploreButtons").style.display = "none";
    document.getElementById("battleButtons").style.display = "none";
    setStatusTab(currentStatusTab || "status");
    updateStatusUI();
    updateAchievementsUI();
    updateRecordsUI();
    updateOptionsUI();
  }

  function openOptions() {
    // ステータス画面のタブではなく、独立したオプション画面を開く
    document.getElementById("optionsScreen").style.display = "block";
    document.getElementById("statusScreen").style.display = "none";
    document.getElementById("helpScreen").style.display = "none";
    document.getElementById("bagScreen").style.display = "none";
    document.getElementById("exploreButtons").style.display = "none";
    document.getElementById("battleButtons").style.display = "none";
    updateOptionsUI();
  }

  function closeOptions() {
    document.getElementById("optionsScreen").style.display = "none";
    updateUI();
  }

  function openHelpScreen() {
    document.getElementById("helpScreen").style.display = "block";
    document.getElementById("optionsScreen").style.display = "none";
  }

  function closeHelpScreen() {
    document.getElementById("helpScreen").style.display = "none";
    document.getElementById("optionsScreen").style.display = "block";
  }

  function closeStatus() {
    document.getElementById("statusScreen").style.display = "none";
    updateUI();
  }

  // -------------------
  // UI - 転移（50階層刻み）
  // -------------------
  let lastTeleportFocusEl = null;

  function buildTeleportFloorList() {
    const maxReached = Math.max(
      1,
      Math.floor(Number(gameData?.player?.maxReachedFloor || 1)),
    );

    /** @type {number[]} */
    const list = [1];
    const cap = Math.floor(maxReached / 50) * 50;
    for (let f = 50; f <= cap; f += 50) list.push(f);
    return { list, maxReached };
  }

  function syncTeleportStayBattleUi() {
    const row = document.getElementById("teleportStayBattleRow");
    const toggle = document.getElementById("teleportStayBattleToggle");
    if (!row || !toggle) return;

    const unlocked =
      typeof window.isStayBattleUnlocked === "function"
        ? !!window.isStayBattleUnlocked()
        : false;
    const enabled =
      unlocked &&
      !!(
        gameData &&
        gameData.player &&
        gameData.player.serialOptions &&
        gameData.player.serialOptions.stayBattleCurrentFloor
      );

    if (unlocked) {
      row.classList.remove("hidden");
      toggle.checked = enabled;
    } else {
      row.classList.add("hidden");
      toggle.checked = false;
    }
  }

  function openTeleportModal() {
    if (!gameData || gameData.gameState !== "EXPLORE") {
      log("⚠️ 戦闘中は転移できません");
      return;
    }

    lastTeleportFocusEl = document.activeElement;

    const modal = document.getElementById("teleportModal");
    const maxEl = document.getElementById("teleportMaxReached");
    const select = document.getElementById("teleportSelect");
    if (!modal || !select || !maxEl) return;

    syncTeleportStayBattleUi();

    const { list, maxReached } = buildTeleportFloorList();
    maxEl.textContent = String(maxReached);

    // options
    select.innerHTML = "";
    for (const f of list) {
      const opt = document.createElement("option");
      opt.value = String(f);
      opt.textContent = `${f}階`;
      select.appendChild(opt);
    }

    // 初期選択：現在階層に最も近い（下方向）
    const cur = Math.max(1, Math.floor(Number(gameData.floor || 1)));
    let initial = 1;
    if (cur >= 50) {
      initial = Math.floor(cur / 50) * 50;
      if (initial === 0) initial = 1;
    }
    if (initial > maxReached) initial = Math.floor(maxReached / 50) * 50 || 1;
    select.value = String(initial);

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    // 次フレームでフォーカス（iOS対策）
    setTimeout(() => {
      try {
        select.focus();
      } catch (e) {}
    }, 0);
  }

  function closeTeleportModal() {
    const modal = document.getElementById("teleportModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    // フォーカスを戻す（aria-hidden警告回避）
    const btn = document.getElementById("teleportBtn");
    const target = btn || lastTeleportFocusEl;
    if (target && typeof target.focus === "function") {
      setTimeout(() => {
        try {
          target.focus();
        } catch (e) {}
      }, 0);
    }
  }

  function confirmTeleport() {
    const select = document.getElementById("teleportSelect");
    const stayToggle = document.getElementById("teleportStayBattleToggle");
    const dest = Math.max(1, Math.floor(Number(select ? select.value : 1)));

    const unlocked =
      typeof window.isStayBattleUnlocked === "function"
        ? !!window.isStayBattleUnlocked()
        : false;
    if (gameData && gameData.player) {
      if (
        !gameData.player.serialOptions ||
        typeof gameData.player.serialOptions !== "object"
      ) {
        gameData.player.serialOptions = {};
      }
      gameData.player.serialOptions.stayBattleCurrentFloor =
        unlocked && !!(stayToggle && stayToggle.checked);
    }

    if (typeof window.teleportToFloor === "function") {
      const ok = window.teleportToFloor(dest);
      if (ok) closeTeleportModal();
    }
  }

  function setStatusTab(tab) {
    const allowed = ["status", "achievements", "records"];
    if (!allowed.includes(tab)) tab = "status";
    currentStatusTab = tab;

    const tabStatus = document.getElementById("tabStatus");
    const tabAch = document.getElementById("tabAchievements");
    const tabRec = document.getElementById("tabRecords");

    if (tabStatus)
      tabStatus.style.display = tab === "status" ? "block" : "none";
    if (tabAch)
      tabAch.style.display = tab === "achievements" ? "block" : "none";
    if (tabRec) tabRec.style.display = tab === "records" ? "block" : "none";

    const btnS = document.getElementById("statusTabBtnStatus");
    const btnA = document.getElementById("statusTabBtnAchievements");
    const btnR = document.getElementById("statusTabBtnRecords");
    if (btnS) btnS.classList.toggle("is-active", tab === "status");
    if (btnA) btnA.classList.toggle("is-active", tab === "achievements");
    if (btnR) btnR.classList.toggle("is-active", tab === "records");

    if (tab === "records") {
      updateRecordsUI();
    }
  }

  function updateRecordsUI() {
    const elKills = document.getElementById("recordTotalKills");
    const elMax = document.getElementById("recordMaxDamage");
    if (!elKills && !elMax) return;

    const p = gameData.player;
    const totalKills = Number(p.totalKills || 0);
    const maxDamage = Number(p.maxDamage || 0);

    if (elKills) elKills.textContent = totalKills;
    if (elMax) elMax.textContent = maxDamage;
  }

  function postRecordToX() {
    if (!gameData || !gameData.player) return;

    const p = gameData.player;
    const floor = Math.max(1, Math.floor(Number(gameData.floor || 1)));
    const totalKills = Math.max(0, Math.floor(Number(p.totalKills || 0)));
    const maxDamage = Math.max(0, Math.floor(Number(p.maxDamage || 0)));

    const text = `OneMoreFloorRPG2
これまで倒した敵の数: ${totalKills}体
最大ダメージ: ${maxDamage}
到達階層: ${floor}F
#OneMoreFloorRPG2`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }



  function updateAchievementsUI() {
    const el = document.getElementById("achievementsContent");
    if (!el) return;

    const p = gameData.player;
    if (!p.achievements || typeof p.achievements !== "object")
      p.achievements = {};

    const defs = Array.isArray(window.achievementDefs)
      ? window.achievementDefs
      : [];

    // 解除状態と進捗を組み立て（未解除を先頭、解除済みを末尾へ）
    const rows = defs
      .filter((def) => {
        try {
          return typeof def.isVisible !== "function" || !!def.isVisible(p);
        } catch (e) {
          return true;
        }
      })
      .map((def, idx) => {
        const done = !!p.achievements[def.id];
        let progress = "";
        try {
          progress = typeof def.progress === "function" ? def.progress(p) : "";
        } catch (e) {
          progress = "";
        }
        const useRevealedText = !!(def.revealAfterDone && done);
        return {
          idx,
          id: def.id,
          title: useRevealedText
            ? def.doneTitle || def.title || def.id
            : def.title || def.id,
          desc: useRevealedText ? def.doneDesc || def.desc || "" : def.desc || "",
          done,
          progress,
          bonus: def.bonus || {},
        };
      });

    const isDeathBeyondAchievement = (row) =>
      row &&
      (row.id === "defeated_10_times" ||
        String(row.title || "").includes("死を超える"));

    const undone = rows.filter((row) => !row.done);
    const done = rows.filter((row) => row.done);
    const list = undone
      .filter((row) => !isDeathBeyondAchievement(row))
      .concat(undone.filter((row) => isDeathBeyondAchievement(row)))
      .concat(done);

    el.innerHTML = list
      .map((a) => {
        const mark = a.done ? "✅" : "⬜";
        let bonusText = "";
        if (a.bonus) {
          const parts = [];
          if (typeof a.bonus.expRate === "number" && a.bonus.expRate > 0) {
            parts.push(`経験値+${Math.round(a.bonus.expRate * 100)}%`);
          }
          if (
            typeof a.bonus.asuraBaseStatMultiplierBonus === "number" &&
            a.bonus.asuraBaseStatMultiplierBonus > 0
          ) {
            parts.push(
              `修羅の基礎ステ倍率+${Math.floor(a.bonus.asuraBaseStatMultiplierBonus)}`,
            );
          }
          if (
            typeof a.bonus.evasionCapBonus === "number" &&
            a.bonus.evasionCapBonus > 0
          ) {
            parts.push(`回避上限+${Math.floor(a.bonus.evasionCapBonus)}%`);
          }
          if (
            typeof a.bonus.itemDropRate === "number" &&
            a.bonus.itemDropRate > 0
          ) {
            parts.push(
              `アイテムドロップ率+${Math.floor(a.bonus.itemDropRate)}%`,
            );
          }
          if (parts.length) bonusText = ` / ボーナス：${parts.join("、")}`;
        }
        return `<div class="achievement-card ${a.done ? "is-done" : ""}">${mark} <strong>${a.title}</strong><div class="small">${a.desc}（${a.progress}）${bonusText}</div></div>`;
      })
      .join("");
  }

  function updateOptionsUI() {
    const cb = document.getElementById("optAutosave");
    if (cb) cb.checked = isAutosaveEnabled();

    // シリアルコード入力の有効/無効
    const inputEl = document.getElementById("serialCodeInput");
    const btnEl = document.getElementById("serialCodeSubmitBtn");
    const disabled = !!serialCodePending;
    if (inputEl) inputEl.disabled = disabled;
    if (btnEl) btnEl.disabled = disabled;
  }

  function handleSerialCodeKeydown(event) {
    if (event?.key !== "Enter") return;
    handleSerialCodeSubmit();
  }

  async function handleSerialCodeSubmit() {
    if (serialCodePending) return;
    const inputEl = document.getElementById("serialCodeInput");
    const raw = String(inputEl?.value || "").trim();
    if (!raw) return;

    const actions =
      window.serialCodeActions && typeof window.serialCodeActions === "object"
        ? window.serialCodeActions
        : null;

    if (!actions) {
      log("⚠️ シリアルコード機能が読み込まれていません");
      return;
    }

    serialCodePending = true;
    updateOptionsUI();
    try {
      const code = raw.toLowerCase();

      // 1) Firebase（サーバー側）で検証（推奨）
      let unlockKey = "";
      const functionsInstance = window.firebaseFunctions || null;
      const httpsCallableFactory = window.firebaseHttpsCallable || null;
      if (functionsInstance && typeof httpsCallableFactory === "function") {
        const verifySerialCode = httpsCallableFactory(
          functionsInstance,
          "verifySerialCode",
        );
        const response = await verifySerialCode({ code });
        const payload = response && response.data ? response.data : {};
        if (payload && payload.ok) {
          unlockKey = String(payload.unlock || "");
        } else {
          log("⚠️ シリアルコードが無効です。");
          return;
        }
      } else {
        // 2) フォールバック：ローカル検証（開発用）
        const lookup =
          window.serialCodeLookup && typeof window.serialCodeLookup === "object"
            ? window.serialCodeLookup
            : null;
        unlockKey = lookup ? String(lookup[code] || "") : "";
        if (!unlockKey) {
          log("⚠️ シリアルコードが無効です。");
          return;
        }
      }

      const action = unlockKey ? actions[unlockKey] : null;
      if (!unlockKey || !action) {
        log("⚠️ シリアルコードが無効です。");
        return;
      }
      if (typeof action.isUnlocked === "function" && action.isUnlocked()) {
        log("⚠️ そのシリアルコードは既に使用済みです。");
        return;
      }
      if (typeof action.unlock === "function") action.unlock();

      if (inputEl) inputEl.value = "";
      log(action.logMessage || "✨ シリアルコードを確認しました。");
      // ゲーム本体のセーブ（オートセーブONの時のみ）
      if (typeof saveGameNow === "function") saveGameNow({ force: true });
    } catch (e) {
      console.error(e);
      log("⚠️ シリアルコードの確認に失敗しました。");
    } finally {
      serialCodePending = false;
      updateOptionsUI();
    }
  }

  function updateStatusUI() {
    const p = gameData.player;
    const stats = getTotalStats();
    const combat = getCombatStats();

    // 紋章（貴重品）による加算値（0なら表示しない）
    const emblem =
      typeof getEmblemBonus === "function" ? getEmblemBonus() : null;
    const fmtStat = (val, bonus) => {
      const b = Math.max(0, Math.floor(Number(bonus || 0)));
      return b > 0 ? `${val}（+${b}）` : `${val}`;
    };

    const job = jobs[p.job] || { name: "-", favoredType: null };
    const favoredName = getFavoredTypeLabel(job.favoredType);
    const jt = (job && job.traits) || {};
    const extra = [];
    if (jt && jt.cannotEquipWeapon) extra.push("武器不可");
    let bsm = Number(jt && jt.baseStatMultiplier);
    if (Number.isFinite(bsm) && bsm > 1) {
      if (p.job === "asura") {
        const defs = Array.isArray(window.achievementDefs)
          ? window.achievementDefs
          : [];
        const doneMap =
          p && p.achievements && typeof p.achievements === "object"
            ? p.achievements
            : {};
        for (const def of defs) {
          if (!def || !def.id || !doneMap[def.id]) continue;
          const v = Number((def.bonus || {}).asuraBaseStatMultiplierBonus || 0);
          if (Number.isFinite(v) && v > 0) bsm += v;
        }
      }
      extra.push(`基礎ステータス×${bsm}`);
    }
    document.getElementById("currentJob").textContent =
      `${job.name}（得意: ${favoredName}${extra.length ? ` / ${extra.join("・")}` : ""}）`;

    document.getElementById("statStr").textContent = fmtStat(
      stats.strength,
      emblem && emblem.strength,
    );
    document.getElementById("statVit").textContent = fmtStat(
      stats.vitality,
      emblem && emblem.vitality,
    );
    document.getElementById("statInt").textContent = fmtStat(
      stats.intelligence,
      emblem && emblem.intelligence,
    );
    document.getElementById("statAgi").textContent = fmtStat(
      stats.agility,
      emblem && emblem.agility,
    );
    document.getElementById("statDex").textContent = fmtStat(
      stats.dexterity,
      emblem && emblem.dexterity,
    );
    document.getElementById("statPoints").textContent = p.statPoints;

    // 装備スロット表示
    const slot1 = p.equipment.slot1;
    const slot2 = p.equipment.slot2;
    const acc = p.equipment.accessory;

    const twoHandLock =
      slot1 && slot1.hands === 2 ? 1 : slot2 && slot2.hands === 2 ? 2 : 0;

    document.getElementById("equipSlot1").textContent =
      twoHandLock === 2
        ? "装備1: 空（両手装備中。上書きで切替可）"
        : slot1
          ? `装備1: ${slot1.name}${slot1.hands === 2 ? "（両手）" : ""}（装備中）`
          : "装備1: 空";

    document.getElementById("equipSlot2").textContent =
      twoHandLock === 1
        ? "装備2: 空（両手装備中。上書きで切替可）"
        : slot2
          ? `装備2: ${slot2.name}${slot2.hands === 2 ? "（両手）" : ""}（装備中）`
          : "装備2: 空";

    document.getElementById("equipAccessorySlot").textContent = acc
      ? `装飾品（装備中）: ${acc.name}`
      : "装飾品: 空";

    // 計算後ステータス
    // 得意装備を付けているか（武器/防具のみ）
    const favoredOn = isEquippedFavored(slot1, slot2, job.favoredType);

    {
      const rows = [];
      const push = (text) => rows.push(`<div>${text}</div>`);

      // 基本（計算後）
      push(`最大HP: ${Math.round(combat.maxHp)}`);
      push(`攻撃力: ${Math.round(combat.attack)}`);
      push(`防御力: ${Math.round(combat.defense)}`);
      push(`魔法威力: ${Math.round(combat.magicPower)}`);
      push(`回復力: ${Math.round(combat.healPower || 0)}`);
      push(`命中率: ${Math.round(combat.accuracy)}%`);
      const evasionCap =
        typeof getPlayerEvasionCap === "function"
          ? Math.round(getPlayerEvasionCap())
          : 90;
      push(`回避率: ${Math.round(combat.evasion)}%（上限${evasionCap}%）`);
      push(`会心: ${Math.round(combat.critRate)}%`);
      push(`索敵: ${Math.round(combat.search)}`);

      // 得意装備補正
      const jobTraits = jobs?.[p.job]?.traits || {};
      const favoredMult = Number.isFinite(jobTraits.favoredMultiplier)
        ? jobTraits.favoredMultiplier
        : 1.2;
      const favoredPct = Math.round((favoredMult - 1) * 100);
      push(`得意装備補正: ${favoredOn ? `ON（+${favoredPct}%）` : "OFF"}`);

      // 追加効果（0は表示しない）
      const addBonus = (type, overrideValue = null) => {
        const v =
          overrideValue === null
            ? Number(getAccessoryBonus(type) || 0)
            : Number(overrideValue);
        if (!Number.isFinite(v) || v === 0) return;
        const t = formatEffectText({ type, value: v });
        if (t) push(t);
      };

      // 経験値は「装備＋スキル＋実績」の合算で表示
      const expEquip = Math.round(
        Number(getAccessoryBonus("expBonus") || 0) +
          Number(p.skills.exp_up || 0),
      );
      const expAch =
        typeof getAchievementExpBonusPercent === "function"
          ? Number(getAchievementExpBonusPercent() || 0)
          : 0;
      const expTotal = expEquip + expAch;
      if (Number.isFinite(expTotal) && expTotal !== 0) {
        push(`経験値+${expTotal}%${expAch ? `（実績+${expAch}%）` : ""}`);
      }

      addBonus("dropRate");
      addBonus("skillPower");
      addBonus("cooldownReduction");
      addBonus("cooldownCheatChance");
      addBonus("pursuitChance");
      addBonus("pursuitDamagePct");
      addBonus("deathAvoidOnce");
      addBonus("overhealBarrierCap");

      addBonus("healReceived");
      addBonus("damageReduction");

      addBonus("critDamage");
      addBonus("lifeSteal");
      addBonus("regen");
      addBonus("hitHeal");

      addBonus("counterChance");
      addBonus("counterDamage");

      addBonus("desperationDamage");
      addBonus("battleStartHpLoss");
      addBonus("executeDamage");
      addBonus("evadeHeal");

      addBonus("ailmentDurationDown");
      addBonus("ailmentResist");

      document.getElementById("calcStats").innerHTML = rows.join("");
    }

    document.getElementById("skillPoints").textContent = p.skillPoints;

    // 装備中スキル（2枠）表示
    const sk1 = getEquippedSkillKey(0);
    const sk2 = getEquippedSkillKey(1);
    const el1 = document.getElementById("equippedSkillName1");
    const el2 = document.getElementById("equippedSkillName2");
    if (el1) el1.textContent = sk1 ? skills[sk1]?.name || sk1 : "なし";
    if (el2) el2.textContent = sk2 ? skills[sk2]?.name || sk2 : "なし";
  }

  // 職業選択
  function openJobSelector() {
    const grid = document.getElementById("jobGrid");
    grid.innerHTML = "";

    const p = gameData.player;
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object")
      p.unlockedJobs = {};
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object")
      p.jobUnlockProgress = {};

    const getUnlockInfo = (jobKey) => {
      const jd = jobs[jobKey];
      if (!jd || !jd.unlock) return { unlocked: true, text: "" };

      const group = jd.skillGroup || jd.baseJob || jobKey;
      const type = jd.unlock.type;
      const target = Number(jd.unlock.target || 0);
      const cur = Number(
        (p.jobUnlockProgress &&
          p.jobUnlockProgress[group] &&
          p.jobUnlockProgress[group][type]) ||
          0,
      );
      const minLevel = Number(jd.unlock.minLevel || 0);
      const level = Number(p.level || 0);
      const levelOk = !minLevel || level >= minLevel;
      const isHiddenUnlock = !!jd.unlock.hidden;
      const unlocked = isHiddenUnlock
        ? !!p.unlockedJobs[jobKey]
        : !!p.unlockedJobs[jobKey] || (levelOk && cur >= target);
      if (isHiddenUnlock && !unlocked) {
        return { unlocked, hidden: true, text: "？？？" };
      }
      if (isHiddenUnlock) {
        return { unlocked, text: "？？？" };
      }
      const parts = [];
      if (minLevel) parts.push(`レベル${Math.min(level, minLevel)}/${minLevel}`);
      parts.push(`${jd.unlock.text}（${Math.min(cur, target)}/${target}）`);
      return { unlocked, text: parts.join(" ＆ ") };
    };

    const keys = Object.keys(jobs);
    const shouldShowJob = (jobKey) => {
      const jd = jobs[jobKey];
      if (!jd || !jd.unlock || !jd.unlock.hidden) return true;
      return getUnlockInfo(jobKey).unlocked;
    };
    const baseKeys = keys.filter(
      (k) =>
        (!jobs[k] || jobs[k].tier !== "advanced") && shouldShowJob(k),
    );
    const advKeys = keys.filter(
      (k) => jobs[k] && jobs[k].tier === "advanced" && shouldShowJob(k),
    );

    const renderTitle = (title) => {
      grid.innerHTML += `<div class="job-section-title">${title}</div>`;
    };

    const renderCard = (key) => {
      const job = jobs[key];
      const isSelected = gameData.player.job === key;

      const favoredName = getFavoredTypeLabel(job.favoredType);

      const unlockInfo = getUnlockInfo(key);
      const locked = job.unlock && !unlockInfo.unlocked;

      const extra = locked
        ? `<p class="job-req">🔒 ${unlockInfo.text}</p>`
        : job.tier === "advanced" || (job.unlock && job.unlock.hidden)
          ? `<p class="job-req">✅ 解放済み</p>`
          : "";

      const shownDesc = String(job.desc || "")
        .replace(/（上級職）/g, "")
        .replace(/\(上級職\)/g, "")
        .trim();

      grid.innerHTML += `
        <div class="job-card ${isSelected ? "selected" : ""} ${locked ? "locked" : ""}" onclick="selectJob('${key}')">
          <h4>${job.name}${job.tier === "advanced" ? " <span class='job-adv-tag'>上級</span>" : ""}</h4>
          <p>${shownDesc}</p>
          <p style="font-size:12px; color:#aaa;">得意: ${favoredName}</p>
          ${extra}
        </div>
      `;
    };

    renderTitle("初期職業");
    baseKeys.forEach(renderCard);

    if (advKeys.length > 0) {
      renderTitle("上級職");

      // 上級職は基礎職ごとにまとめて表示（2列グリッドで横並びになりやすくする）
      // 例：剣士の上級職 →（剣聖 / 決闘士）
      const groupMap = {};
      for (const k of advKeys) {
        const jd = jobs[k];
        const base =
          jd && (jd.baseJob || jd.skillGroup)
            ? jd.baseJob || jd.skillGroup
            : "other";
        if (!groupMap[base]) groupMap[base] = [];
        groupMap[base].push(k);
      }

      const rendered = new Set();
      for (const baseKey of baseKeys) {
        const list = groupMap[baseKey];
        if (!Array.isArray(list) || list.length === 0) continue;
        const baseName =
          jobs[baseKey] && jobs[baseKey].name ? jobs[baseKey].name : baseKey;
        grid.innerHTML += `<div class="job-group-title">${baseName}の上級職</div>`;
        for (const k of list) {
          rendered.add(k);
          renderCard(k);
        }
      }

      // baseJob などで紐づけられない上級職が将来追加されても表示されるようにする
      const rest = advKeys.filter((k) => !rendered.has(k));
      if (rest.length > 0) {
        grid.innerHTML += `<div class="job-group-title">その他の上級職</div>`;
        rest.forEach(renderCard);
      }
    }

    document.getElementById("jobModal").classList.remove("hidden");
  }

  function closeJobSelector() {
    document.getElementById("jobModal").classList.add("hidden");
  }

  // -------------------
  // モーダル外（背景）タップで閉じる
  // -------------------
  // jobModal のような「背景 + modal-content」の構造を想定。
  // 背景（= modal自身）をタップした場合のみ閉じる。
  function bindModalCloseOnBackdrop(modalId, closeFn) {
    const modal = document.getElementById(modalId);
    if (!modal || typeof closeFn !== "function") return;

    // 二重バインド防止
    if (modal.__backdropCloseBound) return;
    modal.__backdropCloseBound = true;

    modal.addEventListener("click", (e) => {
      // 背景タップのみ（modal-content内は閉じない）
      if (e.target === modal) closeFn();
    });
  }

  function selectJob(jobKey) {
    const p = gameData.player;
    const jd = jobs[jobKey];
    if (!jd) return;

    // 上級職は未解放なら選べない
    if (jd.unlock) {
      if (!p.unlockedJobs || typeof p.unlockedJobs !== "object")
        p.unlockedJobs = {};
      if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object")
        p.jobUnlockProgress = {};

      const group = jd.skillGroup || jd.baseJob || jobKey;
      const type = jd.unlock.type;
      const target = Number(jd.unlock.target || 0);
      const cur = Number(
        (p.jobUnlockProgress &&
          p.jobUnlockProgress[group] &&
          p.jobUnlockProgress[group][type]) ||
          0,
      );
      const minLevel = Number(jd.unlock.minLevel || 0);
      const level = Number(p.level || 0);
      const levelOk = !minLevel || level >= minLevel;
      const isHiddenUnlock = !!jd.unlock.hidden;
      const unlocked = isHiddenUnlock
        ? !!p.unlockedJobs[jobKey]
        : !!p.unlockedJobs[jobKey] || (levelOk && cur >= target);

      if (!unlocked) {
        const parts = [];
        if (minLevel) parts.push(`レベル${Math.min(level, minLevel)}/${minLevel}`);
        parts.push(`${jd.unlock.text}（${Math.min(cur, target)}/${target}）`);
        log(`🔒 上級職は未解放：${parts.join(" ＆ ")}`);
        return;
      }
      // 条件達成しているならフラグを立てておく
      p.unlockedJobs[jobKey] = true;
    }

    const prevJob = p.job;
    if (prevJob === jobKey) {
      closeJobSelector();
      return;
    }

    const prevJobDef = jobs && jobs[prevJob] ? jobs[prevJob] : null;
    const prevGroup =
      prevJobDef && prevJobDef.skillGroup ? prevJobDef.skillGroup : prevJob;
    const newGroup = jd.skillGroup ? jd.skillGroup : jobKey;

    // 職業ごとの状態保存領域（職業キー単位）
    // - build: その職で取得していた職専用スキル構成
    // - remainingSkillPoints: その職で最後に見た残SP
    if (!p.jobSkillStates || typeof p.jobSkillStates !== "object")
      p.jobSkillStates = {};

    // 1) 旧職（旧グループ）のスキル割り振りを保存し、ポイントを返却（共通スキルは対象外）
    const prevBuild = {};
    let refund = 0;
    for (const sk of Object.keys(skills)) {
      const def = skills[sk];
      if (!def || def.job !== prevGroup) continue;
      const lv = Math.max(
        0,
        Math.floor(Number((p.skills && p.skills[sk]) || 0)),
      );
      if (lv > 0) {
        prevBuild[sk] = lv;
        refund += lv * getSkillPointCost(def);
      }
      // 旧グループのスキルは外す
      if (p.skills && Object.prototype.hasOwnProperty.call(p.skills, sk)) {
        delete p.skills[sk];
      }
    }
    const prevRemainingSkillPoints = Math.max(
      0,
      Math.floor(Number(p.skillPoints || 0)),
    );
    p.jobSkillStates[prevJob] = {
      build: prevBuild,
      remainingSkillPoints: prevRemainingSkillPoints,
    };
    p.skillPoints = Math.max(
      0,
      Math.floor(Number(p.skillPoints || 0)) + refund,
    );

    // 2) 職業変更：装備中スキルは解除（2枠）
    p.job = jobKey;
    p.equippedSkills = [null, null];
    p.equippedSkill = null;
    p.skillCooldown = 0;

    // 2.5) 装備制限：武器を装備できない職（拳聖/修羅など）なら武器を外す
    {
      const nt = (jd && jd.traits) || {};
      if (nt && nt.cannotEquipWeapon) {
        const eq =
          p.equipment ||
          (p.equipment = { slot1: null, slot2: null, accessory: null });
        const removed = [];
        if (eq.slot1 && eq.slot1.category === "weapon") {
          removed.push(eq.slot1.name || "武器");
          eq.slot1 = null;
        }
        if (eq.slot2 && eq.slot2.category === "weapon") {
          removed.push(eq.slot2.name || "武器");
          eq.slot2 = null;
        }
        if (removed.length) {
          log(`🧤 武器不可のため外した：${removed.join(" / ")}`);
        }
      }
    }

    // 3) 新職（新グループ）の保存割り振りを復元（可能な範囲で消費）
    const newState = p.jobSkillStates[jobKey];
    const build =
      newState && typeof newState === "object" && newState.build
        ? newState.build
        : null;
    const hasSavedBuild =
      build && typeof build === "object" && Object.keys(build).length > 0;
    if (hasSavedBuild) {
      // 保存済みビルドがある場合は、残SPとスキル割り振りを復元
      const restoredRemaining = Math.max(
        0,
        Math.floor(Number(newState.remainingSkillPoints || 0)),
      );
      p.skillPoints = restoredRemaining;

      for (const sk of Object.keys(build)) {
        const def = skills[sk];
        if (!def || def.job !== newGroup) continue;
        let lv = Math.max(0, Math.floor(Number(build[sk] || 0)));
        if (lv <= 0) continue;
        if (def.maxLevel !== Infinity)
          lv = Math.min(lv, Math.floor(Number(def.maxLevel || 0)));
        if (!p.skills || typeof p.skills !== "object") p.skills = {};
        p.skills[sk] = lv;
      }
    } else {
      // 保存ビルドがない場合は、返却済みSPをそのまま使える状態にする
      for (const sk of Object.keys(skills)) {
        const def = skills[sk];
        if (!def || def.job !== newGroup) continue;
        if (p.skills && Object.prototype.hasOwnProperty.call(p.skills, sk)) {
          delete p.skills[sk];
        }
      }
    }

    log(`職業を${jd.name}に変更した（戦闘スキルは解除）`);
    getCombatStats();
    updateStatusUI();
    closeJobSelector();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  // ステータス振り分け
  function openStatAllocation() {
    const list = document.getElementById("statAllocationList");
    list.innerHTML = "";

    const statNames = {
      strength: "⚔️ 力",
      vitality: "❤️ 体力",
      intelligence: "🧙 賢さ",
      agility: "⚡ 素早さ",
      dexterity: "🎯 器用さ",
    };

    for (let key in statNames) {
      const current = gameData.player.allocatedStats[key];

      list.innerHTML += `
        <div class="stat-alloc-item">
          <span>${statNames[key]}: <span id="alloc-${key}">${current}</span></span>
          <div class="stat-alloc-controls">
            <button onclick="adjustStat('${key}', -1)">-</button>
            <button onclick="adjustStat('${key}', 1)">+</button>
          </div>
        </div>
      `;
    }

    document.getElementById("remainingPoints").textContent =
      gameData.player.statPoints;
    document.getElementById("statModal").classList.remove("hidden");
  }

  function closeStatAllocation() {
    document.getElementById("statModal").classList.add("hidden");
    getCombatStats();
    updateStatusUI();
  }

  function adjustStat(stat, delta) {
    const current = gameData.player.allocatedStats[stat];
    const newValue = current + delta;

    if (newValue < 0) return;
    if (delta > 0 && gameData.player.statPoints <= 0) return;

    gameData.player.allocatedStats[stat] = newValue;
    gameData.player.statPoints -= delta;

    document.getElementById(`alloc-${stat}`).textContent = newValue;
    document.getElementById("remainingPoints").textContent =
      gameData.player.statPoints;
  }

  function resetStatAllocation() {
    let total = 0;
    for (let stat in gameData.player.allocatedStats) {
      total += gameData.player.allocatedStats[stat];
      gameData.player.allocatedStats[stat] = 0;
    }
    gameData.player.statPoints += total;

    openStatAllocation();
  }

  // -------------------
  // UI - スキル
  // -------------------
  function openSkillScreen() {
    document.getElementById("skillScreen").style.display = "block";
    document.getElementById("statusScreen").style.display = "none";
    updateSkillUI();
  }

  function toggleAutoAllocateExpUp(enabled) {
    const p = gameData && gameData.player ? gameData.player : null;
    if (!p) return;
    p.autoAllocateExpUp = !!enabled;
    log(`⚙️ 経験値増加への自動割り振り: ${p.autoAllocateExpUp ? "ON" : "OFF"}`);
    updateSkillUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function toggleAutoAllocateStatPoints(enabled) {
    const p = gameData && gameData.player ? gameData.player : null;
    if (!p) return;
    p.autoAllocateStatPoints = !!enabled;
    log(
      `⚙️ ステータスポイント自動割り振り: ${p.autoAllocateStatPoints ? "ON" : "OFF"}`,
    );
    updateSkillUI();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function setAutoAllocateStatTarget(target) {
    const p = gameData && gameData.player ? gameData.player : null;
    if (!p) return;
    const allowed = [
      "strength",
      "vitality",
      "intelligence",
      "agility",
      "dexterity",
    ];
    if (!allowed.includes(target)) return;
    p.autoAllocateStatTarget = target;
    const labels = {
      strength: "⚔️ 力",
      vitality: "❤️ 体力",
      intelligence: "🧙 賢さ",
      agility: "⚡ 素早さ",
      dexterity: "🎯 器用さ",
    };
    log(`⚙️ ステータスポイント自動割り振り先: ${labels[target] || target}`);
    if (typeof requestAutosave === "function") requestAutosave();
  }

  function closeSkillScreen() {
    document.getElementById("skillScreen").style.display = "none";
    document.getElementById("statusScreen").style.display = "block";
  }

  function getSkillPointCost(skillDef) {
    const c = Number(skillDef?.requiredPoints);
    if (!Number.isFinite(c) || c <= 0) return 1;
    return Math.max(1, Math.floor(c));
  }

  function findExclusiveConflict(skillKey, skillDef, playerSkills) {
    const ps =
      playerSkills && typeof playerSkills === "object" ? playerSkills : {};
    // 明示的な衝突指定
    if (Array.isArray(skillDef?.exclusiveWith)) {
      for (const k of skillDef.exclusiveWith) {
        if (!k) continue;
        if (Number(ps[k] || 0) > 0) return String(k);
      }
    }
    // グループ衝突
    const group = skillDef?.exclusiveGroup;
    if (group) {
      for (const k in skills) {
        if (k === skillKey) continue;
        const def = skills[k];
        if (!def) continue;
        if (def.exclusiveGroup === group && Number(ps[k] || 0) > 0)
          return String(k);
      }
    }
    return null;
  }
  function getExclusiveSkillNames(skillKey, skillDef) {
    const names = [];
    const seen = new Set();
    const addName = (k) => {
      if (!k || k === skillKey || seen.has(k)) return;
      seen.add(k);
      names.push(skills[k]?.name || String(k));
    };

    if (Array.isArray(skillDef?.exclusiveWith)) {
      for (const k of skillDef.exclusiveWith) addName(String(k));
    }

    const group = skillDef?.exclusiveGroup;
    if (group) {
      for (const k in skills) {
        const def = skills[k];
        if (!def || def.exclusiveGroup !== group) continue;
        addName(String(k));
      }
    }

    return names;
  }
  function isSkillPrereqMet(skillDef, playerSkills) {
    const reqs = skillDef?.requires;
    if (!Array.isArray(reqs) || reqs.length === 0) return true;
    const ps =
      playerSkills && typeof playerSkills === "object" ? playerSkills : {};
    return reqs.every((r) => {
      if (!r) return true;
      const k = String(r.key || "");
      if (!k) return true;
      const needLv = Math.max(1, Math.floor(Number(r.level || 1)));
      return Math.floor(Number(ps[k] || 0)) >= needLv;
    });
  }

  function isSkillVisibleByProgress(skillKey) {
    const gatedCommonSkills = new Set([
      "common_attack_tuning",
      "common_defense_tuning",
      "common_counter_rate_tuning",
      "common_counter_damage_tuning",
      "common_followup_rate_tuning",
      "common_followup_damage_tuning",
      "common_crit_rate_tuning",
    ]);
    if (!gatedCommonSkills.has(String(skillKey || ""))) return true;
    const maxReached = Math.floor(Number(gameData?.player?.maxReachedFloor || 1));
    return maxReached >= 3000;
  }

  function updateSkillUI() {
    const p = gameData.player;
    const currentJob = p.job;
    const curJobDef = jobs && jobs[currentJob] ? jobs[currentJob] : null;
    const currentGroup = currentJob; // 上位職は下位職スキルを共有しない

    document.getElementById("skillPointsInSkill").textContent = p.skillPoints;
    const autoToggle = document.getElementById("autoAllocateExpUpToggle");
    if (autoToggle) autoToggle.checked = !!p.autoAllocateExpUp;
    const autoStatToggle = document.getElementById(
      "autoAllocateStatPointsToggle",
    );
    if (autoStatToggle) autoStatToggle.checked = !!p.autoAllocateStatPoints;
    const autoStatTarget = document.getElementById("autoAllocateStatTarget");
    if (autoStatTarget)
      autoStatTarget.value = p.autoAllocateStatTarget || "strength";

    const commonList = document.getElementById("commonSkillsList");
    const passiveList = document.getElementById("passiveSkillsList");
    const activeList = document.getElementById("activeSkillsList");

    if (commonList) commonList.innerHTML = "";
    passiveList.innerHTML = "";
    activeList.innerHTML = "";

    // スキル説明文の {xxx} を実際の数値で埋める
    // （未習得なら レベル1 相当をプレビュー表示）
    // 例: "命中+{accuracyBonus}%（会心+{critBonus}%）"
    const formatSkillDesc = (skill, level) => {
      const raw = String(skill?.desc || "");
      if (!raw.includes("{")) return raw;

      const shownLv = level > 0 ? level : 1;
      let eff = {};
      try {
        if (typeof skill.effect === "function")
          eff = skill.effect(shownLv) || {};
      } catch (_e) {
        eff = {};
      }

      const formatNumber = (v) => {
        if (!Number.isFinite(v)) return "";
        const rounded = Math.round(v * 100) / 100;
        if (Math.abs(rounded - Math.round(rounded)) < 1e-9)
          return String(Math.round(rounded));
        return String(rounded);
      };

      // {value} は従来互換：効果オブジェクト内の代表値を拾う
      const priorityKeys = [
        "damageMultiplier",
        "attackBonus",
        "defenseBonus",
        "magicBonus",
        "evasionBonus",
        "critBonus",
        "accuracyBonus",
        "speedBonus",
        "healAmount",
        "maxHpBonus",
        "searchBonus",
        "expBonus",
        "value",
      ];

      let fallbackValue = null;
      let fallbackKey = null;
      for (const k of priorityKeys) {
        const v = eff?.[k];
        if (Number.isFinite(v)) {
          fallbackValue = v;
          fallbackKey = k;
          break;
        }
      }
      if (fallbackValue === null && eff && typeof eff === "object") {
        for (const k of Object.keys(eff)) {
          const v = eff[k];
          if (Number.isFinite(v)) {
            fallbackValue = v;
            fallbackKey = k;
            break;
          }
        }
      }

      const maybePercent = (v, key, offset, tokenLength, str) => {
        // 置換対象の直後が % のときのみ 0.x を % 表示へ変換する
        const base = String(str || raw);
        const nextChar = base.charAt(offset + tokenLength);
        const keyLooksPercent = /(?:Percent|Rate|Chance|Pct)$/i.test(
          String(key || ""),
        );
        const shouldPercentize =
          nextChar === "%" || keyLooksPercent;
        if (!shouldPercentize) return v;
        if (!Number.isFinite(v)) return v;
        if (v > 0 && v < 1) return v * 100;
        return v;
      };

      return raw.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key, offset, str) => {
        let v = null;
        let actualKey = key;
        if (key === "value") {
          v = fallbackValue;
          actualKey = fallbackKey;
        } else {
          v = eff?.[key];
        }
        if (!Number.isFinite(v)) return "-";

        let rep = formatNumber(
          maybePercent(v, actualKey, offset, String(_m).length, str),
        );
        if (!rep) return "-";

        // 回避上昇は % として表示（説明文側に % が無い場合でも付与）
        // 例: "回避+{evasionBonus}" -> "回避+3%"
        if (actualKey === "evasionBonus") {
          const base = String(str || raw);
          const nextChar = base.charAt(offset + String(_m).length);
          if (nextChar !== "%") rep += "%";
        }

        return rep;
      });
    };

    for (let key in skills) {
      const skill = skills[key];
      const isCommon = skill.job === "all";
      if (skill.job && !isCommon && skill.job !== currentJob) continue;
      if (!isSkillVisibleByProgress(key)) continue;

      const level = p.skills[key] || 0;
      const maxLv =
        skill.maxLevel === Infinity ? Infinity : Number(skill.maxLevel);
      const cost = getSkillPointCost(skill);
      const prereqOk = isSkillPrereqMet(skill, p.skills);
      const conflictKey =
        level <= 0 ? findExclusiveConflict(key, skill, p.skills) : null;

      const canLevelUp =
        (maxLv === Infinity || level < maxLv) &&
        p.skillPoints >= cost &&
        prereqOk &&
        !conflictKey;
      const canLevelDown = level > 0;

      // 命中率表示（攻撃系スキルのみ）
      const shownLvForAcc = level > 0 ? level : 1;
      let previewEff = {};
      try {
        if (typeof skill.effect === "function")
          previewEff = skill.effect(shownLvForAcc) || {};
      } catch (e) {
        previewEff = {};
      }
      const isOffensiveSkill =
        typeof previewEff.baseDamage === "number" ||
        typeof previewEff.damageMultiplier === "number";
      const accPct = Number.isFinite(Number(skill.accuracy))
        ? Math.round(Number(skill.accuracy))
        : 100;
      const accDelta = accPct - 100;
      const accDeltaSign = accDelta > 0 ? "+" : "";
      const exclusiveNames = getExclusiveSkillNames(key, skill);
      const exclusiveLine =
        exclusiveNames.length > 0
          ? `<div style="font-size: 11px; color: #aaa;">${exclusiveNames.join(" / ")}と同時取得不可</div>`
          : "";
      // 表示ルール：命中が100%（等倍）の場合は表示しない。100未満/超過のみ表示。
      // 表記は「命中率+20%」「命中率-30%」のように差分表示。
      const accLine =
        skill.type === "active" && isOffensiveSkill && accDelta !== 0
          ? `<div style="font-size: 11px; color: #aaa;">命中率${accDeltaSign}${accDelta}%</div>`
          : "";

      const html = `
        <div class="skill-item">
          <div class="skill-info">
            <div class="skill-name">${skill.name}${isCommon ? " <span style='font-size:12px; color:#aaa;'>(共通)</span>" : ""}</div>
            <div class="skill-desc">${formatSkillDesc(skill, level)}</div>
            ${skill.type === "active" ? `<div style="font-size: 11px; color: #aaa;">CT: ${skill.cooldown}ターン</div>` : ""}
            ${accLine}
            ${
              cost !== 1
                ? `<div style="font-size: 11px; color: #aaa;">必要SP: ${cost}</div>`
                : ""
            }
            ${
              (skill.exclusiveGroup ||
                (Array.isArray(skill.exclusiveWith) &&
                  skill.exclusiveWith.length > 0)) &&
              level <= 0
                ? exclusiveLine
                : ""
            }
            ${
              !prereqOk && level <= 0
                ? `<div style="font-size: 11px; color: #f88;">🔒 前提スキル未達</div>`
                : ""
            }
            ${
              conflictKey && level <= 0
                ? `<div style="font-size: 11px; color: #f88;">🔒 取得中：${
                    skills[conflictKey]?.name || conflictKey
                  }</div>`
                : ""
            }
          </div>
          <div class="skill-actions">
            <div class="skill-level">レベル${level}/${skill.maxLevel === Infinity ? "∞" : skill.maxLevel}</div>
            ${
              skill.type === "active" && level > 0
                ? `
              <button class="small-btn" onclick="toggleSkillSlot('${key}',0)">${getEquippedSkillKey(0) === key ? "外①" : "①"}</button>
              <button class="small-btn" onclick="toggleSkillSlot('${key}',1)">${getEquippedSkillKey(1) === key ? "外②" : "②"}</button>
            `
                : ""
            }
            ${canLevelDown ? `<button class="small-btn" onclick="levelDownSkill('${key}')">-</button>` : ""}
            ${canLevelUp ? `<button class="small-btn" onclick="levelUpSkill('${key}')">+</button>` : ""}
          </div>
        </div>
      `;

      if (isCommon) {
        if (commonList) commonList.innerHTML += html;
      } else if (skill.type === "passive") {
        passiveList.innerHTML += html;
      } else {
        activeList.innerHTML += html;
      }
    }

    if (commonList && commonList.innerHTML.trim() === "") {
      commonList.innerHTML =
        '<div style="font-size:12px; color:#aaa; padding:8px;">（共通スキルはまだありません）</div>';
    }
  }

  function levelUpSkill(key) {
    const p = gameData.player;
    if (!p) return;

    const skill = skills[key];
    if (!skill) return;
    if (!isSkillVisibleByProgress(key)) {
      log("🔒 このスキルは3000階層クリア後に解放されます");
      return;
    }

    const cost = getSkillPointCost(skill);
    if (Math.floor(Number(p.skillPoints || 0)) < cost) return;

    const currentLevel = Math.floor(Number((p.skills && p.skills[key]) || 0));
    if (skill.maxLevel !== Infinity && currentLevel >= skill.maxLevel) return;

    // 分岐・前提チェック（未習得→習得の瞬間だけ）
    if (currentLevel <= 0) {
      const conflictKey = findExclusiveConflict(key, skill, p.skills);
      if (conflictKey) {
        log(
          `❌ ${skill.name}は「${skills[conflictKey]?.name || conflictKey}」と同時に取得できません`,
        );
        return;
      }
      if (!isSkillPrereqMet(skill, p.skills)) {
        log(`🔒 前提スキルが足りません`);
        return;
      }
    }

    if (!p.skills || typeof p.skills !== "object") p.skills = {};
    p.skills[key] = currentLevel + 1;
    p.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints || 0)) - cost);

    log(`${skill.name}のレベルが上がった！（ポイント-${cost}）`);
    updateSkillUI();
    updateStatusUI();
    getCombatStats();
    updateSkillButtons();
  }

  // いつでもスキルレベルを下げられる（ポイント返却）
  function levelDownSkill(key) {
    const p = gameData.player;
    if (!p || !p.skills) return;

    const skill = skills[key];
    const currentLevel = Math.floor(Number(p.skills[key] || 0));
    if (currentLevel <= 0) return;

    const nextLevel = currentLevel - 1;
    if (nextLevel <= 0) {
      delete p.skills[key];

      // 装備しているスキルがレベル0になったら自動で外す
      ensureEquippedSkillsArray(p);
      for (let i = 0; i < p.equippedSkills.length; i++) {
        if (p.equippedSkills[i] === key) p.equippedSkills[i] = null;
      }
      p.equippedSkill = p.equippedSkills[0] || null;
      if (!p.equippedSkills[0] && !p.equippedSkills[1]) p.skillCooldown = 0;
    } else {
      p.skills[key] = nextLevel;
    }

    // ポイント返却（スキルごとに必要SPが違う）
    const cost = getSkillPointCost(skill);
    p.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints || 0)) + cost);

    log(`${skill?.name || key}のレベルを下げた（ポイント+${cost}）`);
    updateSkillUI();
    updateStatusUI();
    updateSkillButtons();
    getCombatStats();
  }

  function ensureEquippedSkillsArray(p) {
    if (!p || typeof p !== "object") return;
    if (!Array.isArray(p.equippedSkills)) {
      p.equippedSkills = [
        p.equippedSkill != null ? String(p.equippedSkill) : null,
        null,
      ];
    }
    p.equippedSkills = p.equippedSkills
      .slice(0, 2)
      .map((v) => (v == null || v === "" ? null : String(v)));
    while (p.equippedSkills.length < 2) p.equippedSkills.push(null);
    // 旧フィールド互換（slot1相当）
    p.equippedSkill = p.equippedSkills[0] || null;
  }

  function equipSkillToSlot(key, slotIndex) {
    const p = gameData.player;
    if (!p) return;
    ensureEquippedSkillsArray(p);
    const idx = Number(slotIndex) === 1 ? 1 : 0;

    // 同じスキルを2枠に重複装備させない
    const otherIdx = idx === 0 ? 1 : 0;
    if (p.equippedSkills[otherIdx] === key) p.equippedSkills[otherIdx] = null;

    p.equippedSkills[idx] = key;
    p.equippedSkill = p.equippedSkills[0] || null;

    log(`${skills[key].name}をスキル${idx + 1}に装備した`);
    updateSkillUI();
    updateStatusUI();
    updateSkillButtons();
  }

  function unequipSkillSlot(slotIndex) {
    const p = gameData.player;
    if (!p) return;
    ensureEquippedSkillsArray(p);
    const idx = Number(slotIndex) === 1 ? 1 : 0;
    if (!p.equippedSkills[idx]) return;
    const key = p.equippedSkills[idx];
    p.equippedSkills[idx] = null;
    p.equippedSkill = p.equippedSkills[0] || null;
    if (!p.equippedSkills[0] && !p.equippedSkills[1]) p.skillCooldown = 0;
    log(`スキル${idx + 1}から${skills[key]?.name || key}を外した`);
    updateSkillUI();
    updateStatusUI();
    updateSkillButtons();
  }

  /**
   * スキルを指定スロット(①/②)に装備/解除する。
   * 同一スキルの2枠重複装備は禁止。
   * @param {string} key
   * @param {number} slotIndex 0:①, 1:②
   */
  function toggleSkillSlot(key, slotIndex) {
    const p = gameData.player;
    if (!p) return;
    ensureEquippedSkillsArray(p);
    const idx = Number(slotIndex) === 1 ? 1 : 0;
    if (p.equippedSkills[idx] === key) {
      unequipSkillSlot(idx);
    } else {
      equipSkillToSlot(key, idx);
    }
  }

  function resetSkills() {
    const p = gameData.player;

    // 現在割り振っているスキルポイントを全返却
    let refund = 0;
    if (p.skills && typeof p.skills === "object") {
      for (const sk of Object.keys(p.skills)) {
        const def = skills[sk];
        const lv = Math.max(0, Math.floor(Number(p.skills[sk] || 0)));
        refund += lv * getSkillPointCost(def);
      }
    }

    p.skills = {};
    p.skillPoints = Math.max(
      0,
      Math.floor(Number(p.skillPoints || 0)) + refund,
    );

    // 装備中スキルを解除
    p.equippedSkills = [null, null];
    p.equippedSkill = null;
    p.skillCooldown = 0;

    // 職業ごとの保存割り振りもリセット
    p.jobSkillStates = {};

    log("🔄 スキルをリセットした");
    getCombatStats();
    updateSkillUI();
    updateStatusUI();
    updateSkillButtons();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  // ポップアップ
  window.showRareEnemyPopup = showRareEnemyPopup;
  window.showEventPopup = showEventPopup;

  // -------------------
  // グローバル公開
  // -------------------
  window.updateUI = updateUI;
  window.updateRecordsUI = updateRecordsUI;
  // 互換：既存コードが updateSkillButton を呼んでも動くようにする
  window.updateSkillButton = updateSkillButtons;
  window.log = log;
  window.clearLog = clearLog;

  window.openBag = openBag;
  window.openOptions = openOptions;
  window.closeOptions = closeOptions;
  window.closeBag = closeBag;
  window.openTeleportModal = openTeleportModal;
  window.closeTeleportModal = closeTeleportModal;
  window.confirmTeleport = confirmTeleport;
  window.setBagTab = setBagTab;
  window.setEquipmentSubTab = setEquipmentSubTab;
  window.setWeaponHandsTab = setWeaponHandsTab;
  window.updateBagUI = updateBagUI;
  window.toggleEquip = toggleEquip;
  window.toggleItemLock = toggleItemLock;
  window.discardEquipment = discardEquipment;
  window.discardAllUnprotectedEquipment = discardAllUnprotectedEquipment;
  window.sortInventoryByEffectValue = sortInventoryByEffectValue;
  window.setBagEffectSortKey = setBagEffectSortKey;
  window.onAutoSellConfigChange = onAutoSellConfigChange;
  window.openAutoSellConfigModal = openAutoSellConfigModal;
  window.closeAutoSellConfigModal = closeAutoSellConfigModal;
  window.openEquipSlotPicker = openEquipSlotPicker;
  window.closeEquipSlotPicker = closeEquipSlotPicker;
  window.chooseEquipSlot = chooseEquipSlot;
  window.useItem = useItem;
  window.useValuableById = useValuableById;
  // =====================
  // セーブ設定
  // =====================
  function toggleAutosave(enabled) {
    setAutosaveEnabled(!!enabled);
    updateOptionsUI();
    log(enabled ? "💾 オートセーブ: ON" : "💾 オートセーブ: OFF");
  }

  async function handleManualSave() {
    try {
      if (typeof saveGameNow !== "function") {
        log("⚠️ セーブ機能を利用できません");
        return;
      }
      const ok = await saveGameNow({ force: true, manual: true });
      if (ok) {
        log("💾 手動セーブしました");
      } else {
        log("⚠️ 手動セーブできませんでした（ログイン状態をご確認ください）");
      }
    } catch (e) {
      console.error(e);
      log("⚠️ 手動セーブに失敗しました");
    }
  }

  let loginPromptPromise = null;
  let resolveLoginPrompt = null;
  let loginPromptResolved = false;

  function finishLoginPrompt() {
    if (loginPromptResolved) return;
    loginPromptResolved = true;

    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }

    if (typeof resolveLoginPrompt === "function") resolveLoginPrompt();
    resolveLoginPrompt = null;
    loginPromptPromise = null;
  }

  async function promptGoogleLoginAtStart() {
    if (loginPromptPromise) return loginPromptPromise;

    loginPromptResolved = false;
    loginPromptPromise = new Promise((resolve) => {
      resolveLoginPrompt = resolve;
    });

    const bridge = window.firebaseAuthBridge || null;
    if (!bridge || typeof bridge.waitForReady !== "function") {
      finishLoginPrompt();
      return loginPromptPromise;
    }

    const user = await bridge.waitForReady();
    if (user) {
      finishLoginPrompt();
      return loginPromptPromise;
    }

    const modal = document.getElementById("loginModal");
    if (!modal) {
      finishLoginPrompt();
      return loginPromptPromise;
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    return loginPromptPromise;
  }

  async function startWithGoogleLogin() {
    try {
      const bridge = window.firebaseAuthBridge || null;
      if (!bridge || typeof bridge.signInWithGoogle !== "function") {
        log("⚠️ Googleログインを利用できません");
        finishLoginPrompt();
        return;
      }
      await bridge.signInWithGoogle();
      log("✅ Googleログインしました");
      finishLoginPrompt();
    } catch (e) {
      log("⚠️ Googleログインに失敗しました");
    }
  }

  function startWithoutLogin() {
    log("⚠️ ログインなしで開始します（クラウド保存は無効）");
    finishLoginPrompt();
  }

  function handleFirebaseAuthChanged(user) {
    if (user) {
      finishLoginPrompt();
    }
  }

  // -------------------
  // 初期化（モーダル外タップなど）
  // -------------------
  // HTMLが読み込まれた後に ui.js が読み込まれる想定だが、念のため存在チェック済み。
  bindModalCloseOnBackdrop("jobModal", closeJobSelector);
  bindModalCloseOnBackdrop("autoSellConfigModal", closeAutoSellConfigModal);

  // ステータス画面の記録タブ横にバージョンを表示
  applyGameVersionBadges();

  // グローバル公開（HTML onclick 用）
  window.setStatusTab = setStatusTab;
  window.postRecordToX = postRecordToX;
  window.toggleAutosave = toggleAutosave;
  window.handleManualSave = handleManualSave;

  window.promptGoogleLoginAtStart = promptGoogleLoginAtStart;
  window.startWithGoogleLogin = startWithGoogleLogin;
  window.startWithoutLogin = startWithoutLogin;
  window.handleFirebaseAuthChanged = handleFirebaseAuthChanged;

  window.openStatus = openStatus;
  window.openOptions = openOptions;
  window.closeOptions = closeOptions;
  window.openHelpScreen = openHelpScreen;
  window.closeHelpScreen = closeHelpScreen;
  window.closeStatus = closeStatus;
  window.updateStatusUI = updateStatusUI;

  // シリアルコード（オプション画面）
  window.handleSerialCodeKeydown = handleSerialCodeKeydown;
  window.handleSerialCodeSubmit = handleSerialCodeSubmit;

  window.openJobSelector = openJobSelector;
  window.closeJobSelector = closeJobSelector;
  window.selectJob = selectJob;

  window.openStatAllocation = openStatAllocation;
  window.closeStatAllocation = closeStatAllocation;
  window.adjustStat = adjustStat;
  window.resetStatAllocation = resetStatAllocation;

  window.openSkillScreen = openSkillScreen;
  window.closeSkillScreen = closeSkillScreen;
  window.toggleAutoAllocateExpUp = toggleAutoAllocateExpUp;
  window.toggleAutoAllocateStatPoints = toggleAutoAllocateStatPoints;
  window.setAutoAllocateStatTarget = setAutoAllocateStatTarget;
  window.updateSkillUI = updateSkillUI;
  window.levelUpSkill = levelUpSkill;
  window.levelDownSkill = levelDownSkill;
  // 新: 2枠スキル
  window.equipSkillToSlot = equipSkillToSlot;
  window.unequipSkillSlot = unequipSkillSlot;
  window.toggleSkillSlot = toggleSkillSlot;
  // 互換: 旧UIが equipSkill(key) を呼んでも slot1 に装備する
  window.equipSkill = function (key) {
    equipSkillToSlot(key, 0);
  };
  window.resetSkills = resetSkills;
})();
