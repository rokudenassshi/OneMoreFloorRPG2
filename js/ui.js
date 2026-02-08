// ===================
// UI（分割: ui）
// ===================

(function () {
  "use strict";

  // -------------------
  // UI更新
  // -------------------
  function updateUI() {
    const p = gameData.player;

    // 初期化前でも安全に動くように、必要なDOM参照は都度確保する
    if (!gameData.battleButtons) gameData.battleButtons = document.getElementById("battleButtons");
    if (!gameData.exploreButtons) gameData.exploreButtons = document.getElementById("exploreButtons");

    document.getElementById("playerLevel").textContent = p.level;
    document.getElementById("floor").textContent = gameData.floor;
    document.getElementById("playerHp").textContent = `${Math.round(p.hp)}/${Math.round(p.maxHp)}`;

    // 経験値バー
    const expRate = Math.min(1, Math.max(0, p.exp / getExpNeeded()));
    document.getElementById("expBarFill").style.width = expRate * 100 + "%";

    // 敵情報
    if (gameData.enemy) {
      const e = gameData.enemy;
      document.getElementById("enemyName").textContent = e.displayName;
      document.getElementById("enemyHp").textContent = `HP：${Math.round(e.hp)}/${Math.round(e.maxHp)}`;
    } else {
      document.getElementById("enemyName").textContent = "";
      document.getElementById("enemyHp").textContent = "---";
    }

    renderStatusEffects();

    // ボタン表示切り替え
    if (gameData.battleButtons && gameData.exploreButtons) {
      if (gameData.gameState === "BATTLE") {
        gameData.battleButtons.style.display = "block";
        gameData.exploreButtons.style.display = "none";
        updateSkillButton();
      } else {
        gameData.battleButtons.style.display = "none";
        gameData.exploreButtons.style.display = "block";
      }
    }
  }

  function updateSkillButton() {
    const btn = document.getElementById("skillBtn");
    const skill = gameData.player.equippedSkill;

    if (!skill) {
      btn.textContent = "スキル";
      btn.disabled = true;
      return;
    }

    // クールタイム値の正規化（NaN対策）
    let cd = Number(gameData.player.skillCooldown || 0);
    if (!Number.isFinite(cd) || cd < 0) cd = 0;
    gameData.player.skillCooldown = cd;

    // 封印中はスキルボタン自体を無効化
    const st = (gameData && gameData.player) ? (gameData.player.status || {}) : {};
    if (gameData.gameState === "BATTLE" && st.silenceTurns > 0) {
      btn.textContent = `スキル(封印:${st.silenceTurns})`;
      btn.disabled = true;
      return;
    }

    const skillDef = skills[skill];
    if (cd > 0) {
      btn.textContent = `スキル (${cd})`;
      btn.disabled = true;
    } else {
      btn.textContent = `スキル`;
      btn.disabled = false;
    }
  }

  // -------------------

  // 状態異常表示
  // -------------------
  function renderStatusEffects() {
    renderStatusEffectsFor(
      document.getElementById("playerStatusEffects"),
      (gameData && gameData.player) ? gameData.player.status : null,
      true,
    );
    renderStatusEffectsFor(
      document.getElementById("enemyStatusEffects"),
      (gameData && gameData.enemy) ? gameData.enemy.status : null,
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
    if (st.burnTurns > 0) badges.push({ text: `🔥 火傷(回復↓) ${st.burnTurns}T` });
    if (st.bleedTurns > 0) badges.push({ text: `🩸 出血 ${st.bleedTurns}T` });
    if (st.stunTurns > 0) badges.push({ text: `⚡ しびれ ${st.stunTurns}T` });

    if (st.slowTurns > 0) {
      const rate = Math.round((st.slowRate || 0) * 100);
      badges.push({ text: rate > 0 ? `🐌 鈍足-${rate}% ${st.slowTurns}T` : `🐌 鈍足 ${st.slowTurns}T` });
    }

    if (st.vulnerableTurns > 0) {
      const rate = Math.round((st.vulnerableRate || 0) * 100);
      badges.push({ text: rate > 0 ? `💥 脆弱+${rate}% ${st.vulnerableTurns}T` : `💥 脆弱 ${st.vulnerableTurns}T` });
    }

    if (st.silenceTurns > 0) badges.push({ text: `🔇 封印 ${st.silenceTurns}T` });

    if (st.accuracyDownTurns > 0) {
      const rate = Math.round((st.accuracyDownRate || 0) * 100);
      badges.push({ text: rate > 0 ? `👁 命中↓-${rate}% ${st.accuracyDownTurns}T` : `👁 命中↓ ${st.accuracyDownTurns}T` });
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

  // core.js の関数を参照するための薄いラッパ（UI側で必要）
  function getExpNeeded() {
    return Math.floor(100 * Math.pow(1.2, gameData.player.level - 1));
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
    document.querySelectorAll(".inventory-tab").forEach((t) => t.classList.remove("is-active"));
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
    document.querySelectorAll(".sub-tab").forEach((t) => t.classList.remove("is-active"));
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

  // -------------------
  // UI - アイテム（消耗品/貴重品）サブタブ
  // -------------------
  function setItemSubTab(tab) {
    const ev = window.event;
    document.querySelectorAll(".item-sub-tab").forEach((t) => t.classList.remove("is-active"));
    if (ev && ev.target) ev.target.classList.add("is-active");

    const con = document.getElementById("consumablesSubTab");
    const val = document.getElementById("valuablesSubTab");

    if (tab === "valuables") {
      if (con) con.style.display = "none";
      if (val) val.style.display = "block";
    } else {
      if (con) con.style.display = "block";
      if (val) val.style.display = "none";
    }

    updateBagUI();
  }
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

    switch (eff.type) {
      case "dropRate":
        return hasV ? `ドロップ率${sign}${v}%` : "ドロップ率";
      case "expBonus":
        return hasV ? `経験値${sign}${v}%` : "経験値";
      case "skillPower":
        return hasV ? `スキル威力${sign}${v}%` : "スキル威力";
      case "critRate":
        return hasV ? `クリ率${sign}${v}%` : "クリ率";
      case "accuracy":
        return hasV ? `命中${sign}${v}%` : "命中";
      case "evasion":
        return hasV ? `回避${sign}${v}%` : "回避";
      case "attackBonus":
        return hasV ? `攻撃力${sign}${v}` : "攻撃力";
      case "defenseBonus":
        return hasV ? `防御力${sign}${v}` : "防御力";
      case "maxHpBonus":
        return hasV ? `最大HP${sign}${v}` : "最大HP";
      case "search":
        return hasV ? `索敵${sign}${v}` : "索敵";
      case "cooldownReduction":
        // 正値は短縮として扱う
        return hasV ? `クールタイム-${Math.abs(v)}ターン` : "クールタイム短縮";

      case "magicPower":
        return hasV ? `魔法攻撃力${sign}${v}` : "魔法攻撃力";
      case "healPower":
        return hasV ? `回復力${sign}${v}` : "回復力";
      case "healReceived":
        return hasV ? `回復量${sign}${v}%` : "回復量";
      case "damageReduction":
        return hasV ? `被ダメージ-${Math.abs(v)}%` : "被ダメージ軽減";
      case "critDamage":
        return hasV ? `クリダメ${sign}${v}%` : "クリダメ";
      case "lifeSteal":
        return hasV ? `吸血${sign}${v}%` : "吸血";
      case "regen":
        return hasV ? `再生${sign}${v}%` : "再生";
      case "multiStrikeChance":
        return hasV ? `連続攻撃率${sign}${v}%` : "連続攻撃率";
      case "multiStrikeDamage":
        return hasV ? `連続攻撃威力${sign}${v}%` : "連続攻撃威力";
      case "hitHeal":
        return hasV ? `攻撃時回復${sign}${v}` : "攻撃時回復";
      case "counterChance":
        return hasV ? `反撃率${sign}${v}%` : "反撃率";
      case "counterDamage":
        return hasV ? `反撃威力${sign}${v}%` : "反撃威力";
      case "desperationDamage":
        return hasV ? `背水${sign}${v}%` : "背水";
      case "executeDamage":
        return hasV ? `追い打ち${sign}${v}%` : "追い打ち";
      case "evadeHeal":
        return hasV ? `回避回復${sign}${v}` : "回避回復";
      case "herbPower":
        return hasV ? `やくそう回復${sign}${v}%` : "やくそう回復";
      case "ailmentDurationDown":
        return hasV ? `状態異常短縮${sign}${v}%` : "状態異常短縮";
      case "poisonResist":
        return hasV ? `毒耐性${sign}${v}%` : "毒耐性";
      case "burnResist":
        return hasV ? `火傷耐性${sign}${v}%` : "火傷耐性";
      case "bleedResist":
        return hasV ? `出血耐性${sign}${v}%` : "出血耐性";
      case "stunResist":
        return hasV ? `しびれ耐性${sign}${v}%` : "しびれ耐性";
      case "slowResist":
        return hasV ? `鈍足耐性${sign}${v}%` : "鈍足耐性";
      case "vulnerableResist":
        return hasV ? `脆弱耐性${sign}${v}%` : "脆弱耐性";
      case "silenceResist":
        return hasV ? `封印耐性${sign}${v}%` : "封印耐性";
      case "accuracyDownResist":
        return hasV ? `命中低下耐性${sign}${v}%` : "命中低下耐性";
      default:
        if (eff.name && hasV) return `${eff.name}(${sign}${v})`;
        return eff.name || "";
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
  const details = Array.isArray(item?.randomOptionDetails) ? item.randomOptionDetails : null;

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

  function updateBagUI() {
    const weaponsList = document.getElementById("weaponsList");
    const accessoriesList = document.getElementById("accessoriesList");
    const consumablesList = document.getElementById("consumablesList") || document.getElementById("itemsList");
    const valuablesList = document.getElementById("valuablesList");

    weaponsList.innerHTML = "";
    accessoriesList.innerHTML = "";
    if (consumablesList) consumablesList.innerHTML = "";
    if (valuablesList) valuablesList.innerHTML = "";

    // 装備品
    gameData.player.inventory.forEach((item, idx) => {
      const equipped = isEquipped(item);
      const locked = !!item.locked;
      const lockIcon = locked ? "🔒" : "🔓";
      const canDiscard = !locked && !equipped;

      const fixedTexts = getFixedEffectTexts(item);
      const randomTexts = getRandomOptionTexts(item);
      const randomCount = randomTexts.length;
      const displayName = `${item.name}${randomCount > 0 ? ` +${randomCount}` : ""}`;

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
        <div class="item-card ${equipped ? "equipped" : ""} ${locked ? "locked" : ""} ${item.rarity}" onclick="toggleEquip(${idx})">
          <div class="item-row">
            <div class="item-main">
              <div class="item-name">${displayName}</div>
              ${baseStatsText ? `<div class="item-stats">${baseStatsText}</div>` : ""}

              <div class="item-effects">
                <div class="effect-section">
                  <div class="effect-title">装備固有能力</div>
                  ${renderEffectListHtml(fixedTexts)}
                </div>
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
        weaponsList.innerHTML += card;
      }
    });

    // アイテム（消耗品）
    if (consumablesList) {
      const items = Array.isArray(gameData.player.items) ? gameData.player.items : [];
      if (items.length === 0) {
        consumablesList.innerHTML = `<div class="small" style="color:#aaa; padding:8px;">消耗品を持っていません</div>`;
      } else {
        items.forEach((item) => {
          const isHerb = item.name === "やくそう";
          const desc = isHerb ? "現在HPの5%回復" : `HP ${item.heal}回復`;
          consumablesList.innerHTML += `
            <div class="item-card" onclick="useItem('${item.name}')">
              <div class="item-name">${item.name} x${item.count}</div>
              <div class="item-stats">${desc}</div>
            </div>
          `;
        });
      }
    }

    // アイテム（貴重品）
    if (valuablesList) {
      const vals = Array.isArray(gameData.player.valuables) ? gameData.player.valuables : [];
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
          const effect = cnt === 1 ? `${sname}+1` : `${sname}+${cnt}`;
          valuablesList.innerHTML += `
            <div class="item-card">
              <div class="item-name">✨ ${v.name} x${cnt}</div>
              <div class="item-stats">所持効果：${effect}</div>
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
      // 両手武器はどちらでも選べる（もう片方は空になる）
      if (item.hands === 2) return true;

      // 両手装備中でも、片手装備への切り替えは「装備1/装備2どちらを選んでもOK」。
      // 選んだスロットに装備する際に、両手装備を外してから装備する。
      return true;
    };

    if (btn1) btn1.disabled = !canEquipTo(1);
    if (btn2) btn2.disabled = !canEquipTo(2);

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

  function useItem(name) {
    const item = gameData.player.items.find((i) => i.name === name);
    if (!item) return;

    item.count--;
    if (item.count <= 0) {
      gameData.player.items = gameData.player.items.filter((i) => i.name !== name);
    }

    let heal = item.heal;

    if (name === "やくそう") {
      heal = Math.max(1, Math.floor(gameData.player.hp * 0.05));
    }

    gameData.player.hp = Math.min(gameData.player.maxHp, gameData.player.hp + heal);
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
    document.getElementById("statusScreen").style.display = "block";
    document.getElementById("optionsScreen").style.display = "none";
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
    document.getElementById("bagScreen").style.display = "none";
    document.getElementById("exploreButtons").style.display = "none";
    document.getElementById("battleButtons").style.display = "none";
    updateOptionsUI();
  }

  function closeOptions() {
    document.getElementById("optionsScreen").style.display = "none";
    updateUI();
  }

  function closeStatus() {
    document.getElementById("statusScreen").style.display = "none";
    updateUI();
  }

    function setStatusTab(tab) {
      const allowed = ["status", "achievements", "records"];
      if (!allowed.includes(tab)) tab = "status";
      currentStatusTab = tab;

      const tabStatus = document.getElementById("tabStatus");
      const tabAch = document.getElementById("tabAchievements");
      const tabRec = document.getElementById("tabRecords");

      if (tabStatus) tabStatus.style.display = tab === "status" ? "block" : "none";
      if (tabAch) tabAch.style.display = tab === "achievements" ? "block" : "none";
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

function updateAchievementsUI() {
    const el = document.getElementById("achievementsContent");
    if (!el) return;

    const p = gameData.player;
    if (!p.achievements || typeof p.achievements !== "object") p.achievements = {};

    const defs = Array.isArray(window.achievementDefs) ? window.achievementDefs : [];

    // 解除状態と進捗を組み立て（解除済みは下へ）
    const list = defs
      .map((def, idx) => {
        const done = !!p.achievements[def.id];
        let progress = "";
        try {
          progress = typeof def.progress === "function" ? def.progress(p) : "";
        } catch (e) {
          progress = "";
        }
        return {
          idx,
          id: def.id,
          title: def.title || def.id,
          desc: def.desc || "",
          done,
          progress,
          bonus: def.bonus || {},
        };
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1; // 未解除→解除済み
        return a.idx - b.idx;
      });

    el.innerHTML = list
      .map((a) => {
        const mark = a.done ? "✅" : "⬜";
        const bonusText =
          a.done && a.bonus && typeof a.bonus.expRate === "number" && a.bonus.expRate > 0
            ? ` / ボーナス：経験値+${Math.round(a.bonus.expRate * 100)}%`
            : "";
        return `<div class="achievement-card ${a.done ? "is-done" : ""}">${mark} <strong>${a.title}</strong><div class="small">${a.desc}（${a.progress}）${bonusText}</div></div>`;
      })
      .join("");
  }

  function updateOptionsUI() {
    const cb = document.getElementById("optAutosave");
    if (cb) cb.checked = isAutosaveEnabled();
  }

function updateStatusUI() {
    const p = gameData.player;
    const stats = getTotalStats();
    const combat = getCombatStats();

    const job = jobs[p.job] || { name: "-", favoredType: null };
    const favoredKey = job.favoredType;
    const favoredName = favoredKey && equipTypes?.[favoredKey]?.name ? equipTypes[favoredKey].name : "なし";
    document.getElementById("currentJob").textContent = `${job.name}（得意: ${favoredName}）`;

    document.getElementById("statStr").textContent = stats.strength;
    document.getElementById("statVit").textContent = stats.vitality;
    document.getElementById("statInt").textContent = stats.intelligence;
    document.getElementById("statAgi").textContent = stats.agility;
    document.getElementById("statDex").textContent = stats.dexterity;
    document.getElementById("statPoints").textContent = p.statPoints;

    // 装備スロット表示
    const slot1 = p.equipment.slot1;
    const slot2 = p.equipment.slot2;
    const acc = p.equipment.accessory;

    const twoHandLock = slot1 && slot1.hands === 2 ? 1 : slot2 && slot2.hands === 2 ? 2 : 0;

    document.getElementById("equipSlot1").textContent = twoHandLock === 2
      ? "装備1: 空（両手装備中。上書きで切替可）"
      : slot1 ? `装備1: ${slot1.name}${slot1.hands === 2 ? "（両手）" : ""}（装備中）` : "装備1: 空";

    document.getElementById("equipSlot2").textContent = twoHandLock === 1
      ? "装備2: 空（両手装備中。上書きで切替可）"
      : slot2 ? `装備2: ${slot2.name}${slot2.hands === 2 ? "（両手）" : ""}（装備中）` : "装備2: 空";

    document.getElementById("equipAccessorySlot").textContent = acc ? `装飾品（装備中）: ${acc.name}` : "装飾品: 空";

    // 計算後ステータス
    // 得意装備を付けているか（武器/防具のみ）
    const favoredOn = !!(
      favoredKey &&
      ((slot1 && slot1.type === favoredKey && slot1.category !== "accessory") ||
        (slot2 && slot2.type === favoredKey && slot2.category !== "accessory"))
    );

    document.getElementById("calcStats").innerHTML = `
      <div>攻撃力: ${Math.round(combat.attack)}</div>
      <div>防御力: ${Math.round(combat.defense)}</div>
      <div>魔法威力: ${Math.round(combat.magicPower)}</div>
      <div>命中率: ${Math.round(combat.accuracy)}%</div>
      <div>回避率: ${Math.round(combat.evasion)}%</div>
      <div>クリティカル: ${Math.round(combat.critRate)}%</div>
      <div>索敵: ${Math.round(combat.search)}</div>
      <div>得意装備補正: ${favoredOn ? "ON（+20%）" : "OFF"}</div>
      <div>経験値補正: +${Math.round((getAccessoryBonus("expBonus") || 0) + (p.skills.exp_up || 0))}%（実績+${(typeof getAchievementExpBonusPercent === "function") ? getAchievementExpBonusPercent() : 0}%）</div>
    `;

    document.getElementById("skillPoints").textContent = p.skillPoints;
    document.getElementById("equippedSkillName").textContent = p.equippedSkill ? "あり" : "なし";
  }

  // 職業選択
  function openJobSelector() {
    const grid = document.getElementById("jobGrid");
    grid.innerHTML = "";

    const p = gameData.player;
    if (!p.unlockedJobs || typeof p.unlockedJobs !== "object") p.unlockedJobs = {};
    if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object") p.jobUnlockProgress = {};

    const getUnlockInfo = (jobKey) => {
      const jd = jobs[jobKey];
      if (!jd || !jd.unlock) return { unlocked: true, text: "" };

      const group = jd.skillGroup || jd.baseJob || jobKey;
      const type = jd.unlock.type;
      const target = Number(jd.unlock.target || 0);
      const cur = Number((p.jobUnlockProgress && p.jobUnlockProgress[group] && p.jobUnlockProgress[group][type]) || 0);
      const minLevel = Number(jd.unlock.minLevel || 0);
      const level = Number(p.level || 0);
      const levelOk = !minLevel || level >= minLevel;
      const unlocked = !!p.unlockedJobs[jobKey] || (levelOk && cur >= target);
      const parts = [];
      if (minLevel) parts.push(`Lv${Math.min(level, minLevel)}/${minLevel}`);
      parts.push(`${jd.unlock.text}（${Math.min(cur, target)}/${target}）`);
      return { unlocked, text: parts.join(" ＆ ") };
    };

    const keys = Object.keys(jobs);
    const baseKeys = keys.filter((k) => !jobs[k] || jobs[k].tier !== "advanced");
    const advKeys = keys.filter((k) => jobs[k] && jobs[k].tier === "advanced");

    const renderTitle = (title) => {
      grid.innerHTML += `<div class="job-section-title">${title}</div>`;
    };

    const renderCard = (key) => {
      const job = jobs[key];
      const isSelected = gameData.player.job === key;

      const favoredKey = job.favoredType;
      const et = (typeof equipTypes === "object" && equipTypes && favoredKey) ? equipTypes[favoredKey] : null;
      const favoredName = et && et.name ? et.name : "なし";

      const unlockInfo = getUnlockInfo(key);
      const locked = job.unlock && !unlockInfo.unlocked;

      const extra = locked
        ? `<p class="job-req">🔒 ${unlockInfo.text}</p>`
        : job.tier === "advanced"
          ? `<p class="job-req">✅ 解放済み</p>`
          : "";

      grid.innerHTML += `
        <div class="job-card ${isSelected ? "selected" : ""} ${locked ? "locked" : ""}" onclick="selectJob('${key}')">
          <h4>${job.name}${job.tier === "advanced" ? " <span class='job-adv-tag'>上級</span>" : ""}</h4>
          <p>${job.desc}</p>
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
        const base = (jd && (jd.baseJob || jd.skillGroup)) ? (jd.baseJob || jd.skillGroup) : "other";
        if (!groupMap[base]) groupMap[base] = [];
        groupMap[base].push(k);
      }

      const rendered = new Set();
      for (const baseKey of baseKeys) {
        const list = groupMap[baseKey];
        if (!Array.isArray(list) || list.length === 0) continue;
        const baseName = (jobs[baseKey] && jobs[baseKey].name) ? jobs[baseKey].name : baseKey;
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

  function selectJob(jobKey) {
    const p = gameData.player;
    const jd = jobs[jobKey];
    if (!jd) return;

    // 上級職は未解放なら選べない
    if (jd.unlock) {
      if (!p.unlockedJobs || typeof p.unlockedJobs !== "object") p.unlockedJobs = {};
      if (!p.jobUnlockProgress || typeof p.jobUnlockProgress !== "object") p.jobUnlockProgress = {};

      const group = jd.skillGroup || jd.baseJob || jobKey;
      const type = jd.unlock.type;
      const target = Number(jd.unlock.target || 0);
      const cur = Number((p.jobUnlockProgress && p.jobUnlockProgress[group] && p.jobUnlockProgress[group][type]) || 0);
      const minLevel = Number(jd.unlock.minLevel || 0);
      const level = Number(p.level || 0);
      const levelOk = !minLevel || level >= minLevel;
      const unlocked = !!p.unlockedJobs[jobKey] || (levelOk && cur >= target);

      if (!unlocked) {
        const parts = [];
        if (minLevel) parts.push(`Lv${Math.min(level, minLevel)}/${minLevel}`);
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

    const prevJobDef = (jobs && jobs[prevJob]) ? jobs[prevJob] : null;
    const prevGroup = (prevJobDef && prevJobDef.skillGroup) ? prevJobDef.skillGroup : prevJob;
    const newGroup = jd.skillGroup ? jd.skillGroup : jobKey;

    // 職業ごとの割り振り保存領域（※スキルグループ単位）
    if (!p.jobSkillBuilds || typeof p.jobSkillBuilds !== "object") p.jobSkillBuilds = {};

    // 1) 旧職（旧グループ）のスキル割り振りを保存し、ポイントを返却（共通スキルは対象外）
    const prevBuild = {};
    let refund = 0;
    for (const sk of Object.keys(skills)) {
      const def = skills[sk];
      if (!def || def.job !== prevGroup) continue;
      const lv = Math.max(0, Math.floor(Number((p.skills && p.skills[sk]) || 0)));
      if (lv > 0) {
        prevBuild[sk] = lv;
        refund += lv;
      }
      // 旧グループのスキルは外す
      if (p.skills && Object.prototype.hasOwnProperty.call(p.skills, sk)) {
        delete p.skills[sk];
      }
    }
    p.jobSkillBuilds[prevGroup] = prevBuild;
    p.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints || 0)) + refund);

    // 2) 職業変更：装備中スキルは解除
    p.job = jobKey;
    p.equippedSkill = null;
    p.skillCooldown = 0;

    // 3) 新職（新グループ）の保存割り振りを復元（可能な範囲で消費）
    const build = p.jobSkillBuilds[newGroup];
    if (build && typeof build === "object") {
      for (const sk of Object.keys(build)) {
        const def = skills[sk];
        if (!def || def.job !== newGroup) continue;
        let lv = Math.max(0, Math.floor(Number(build[sk] || 0)));
        if (lv <= 0) continue;
        if (def.maxLevel !== Infinity) lv = Math.min(lv, Math.floor(Number(def.maxLevel || 0)));
        lv = Math.min(lv, Math.floor(Number(p.skillPoints || 0)));
        if (lv <= 0) break;
        if (!p.skills || typeof p.skills !== "object") p.skills = {};
        p.skills[sk] = lv;
        p.skillPoints -= lv;
      }
      p.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints || 0)));
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

    document.getElementById("remainingPoints").textContent = gameData.player.statPoints;
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
    document.getElementById("remainingPoints").textContent = gameData.player.statPoints;
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

  function closeSkillScreen() {
    document.getElementById("skillScreen").style.display = "none";
    document.getElementById("statusScreen").style.display = "block";
  }

  function updateSkillUI() {
    const p = gameData.player;
    const currentJob = p.job;
    const curJobDef = (jobs && jobs[currentJob]) ? jobs[currentJob] : null;
    const currentGroup = (curJobDef && curJobDef.skillGroup) ? curJobDef.skillGroup : currentJob;

    document.getElementById("skillPointsInSkill").textContent = p.skillPoints;

    const commonList = document.getElementById("commonSkillsList");
    const passiveList = document.getElementById("passiveSkillsList");
    const activeList = document.getElementById("activeSkillsList");

    if (commonList) commonList.innerHTML = "";
    passiveList.innerHTML = "";
    activeList.innerHTML = "";

    // スキル説明文の {value} を実際の数値で埋める
    // （未習得なら Lv1 相当をプレビュー表示）
    const formatSkillDesc = (skill, level) => {
      const raw = String(skill?.desc || "");
      if (!raw.includes("{value}")) return raw;

      const shownLv = level > 0 ? level : 1;
      let eff = {};
      try {
        if (typeof skill.effect === "function") eff = skill.effect(shownLv) || {};
      } catch (e) {
        eff = {};
      }

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

      let value = null;
      for (const k of priorityKeys) {
        const v = eff?.[k];
        if (Number.isFinite(v)) {
          value = v;
          break;
        }
      }
      if (value === null && eff && typeof eff === "object") {
        for (const k of Object.keys(eff)) {
          const v = eff[k];
          if (Number.isFinite(v)) {
            value = v;
            break;
          }
        }
      }

      const formatNumber = (v) => {
        if (!Number.isFinite(v)) return "";
        const rounded = Math.round(v * 100) / 100;
        if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
        return String(rounded);
      };

      const rep = formatNumber(value);
      return raw.replaceAll("{value}", rep || "-");
    };

    for (let key in skills) {
      const skill = skills[key];
      const isCommon = skill.job === "all";
      if (skill.job && !isCommon && skill.job !== currentGroup) continue;

      const level = p.skills[key] || 0;
      const maxLv = skill.maxLevel === Infinity ? Infinity : Number(skill.maxLevel);
      const canLevelUp = (maxLv === Infinity || level < maxLv) && p.skillPoints > 0;

      const html = `
        <div class="skill-item">
          <div class="skill-info">
            <div class="skill-name">${skill.name}${isCommon ? " <span style='font-size:12px; color:#aaa;'>(共通)</span>" : ""}</div>
            <div class="skill-desc">${formatSkillDesc(skill, level)}</div>
            ${skill.type === "active" ? `<div style="font-size: 11px; color: #aaa;">CT: ${skill.cooldown}ターン</div>` : ""}
          </div>
          <div class="skill-actions">
            <div class="skill-level">Lv.${level}/${skill.maxLevel === Infinity ? "∞" : skill.maxLevel}</div>
            ${canLevelUp ? `<button class="small-btn" onclick="levelUpSkill('${key}')">+</button>` : ""}
            ${skill.type === "active" && level > 0 ? `<button class="small-btn" onclick="equipSkill('${key}')">装備</button>` : ""}
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
      commonList.innerHTML = '<div style="font-size:12px; color:#aaa; padding:8px;">（共通スキルはまだありません）</div>';
    }
  }

  function levelUpSkill(key) {
    if (gameData.player.skillPoints <= 0) return;

    const skill = skills[key];
    const currentLevel = gameData.player.skills[key] || 0;
    if (skill.maxLevel !== Infinity && currentLevel >= skill.maxLevel) return;

    gameData.player.skills[key] = currentLevel + 1;
    gameData.player.skillPoints--;

    log(`${skill.name}のレベルが上がった！`);
    updateSkillUI();
    getCombatStats();
  }

  function equipSkill(key) {
    gameData.player.equippedSkill = key;
    log(`${skills[key].name}を装備した`);
    updateSkillUI();
    updateStatusUI();
  }

  function resetSkills() {
    const p = gameData.player;

    // 現在割り振っているスキルポイントを全返却
    let refund = 0;
    if (p.skills && typeof p.skills === "object") {
      for (const sk of Object.keys(p.skills)) {
        refund += Math.max(0, Math.floor(Number(p.skills[sk] || 0)));
      }
    }

    p.skills = {};
    p.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints || 0)) + refund);

    // 装備中スキルを解除
    p.equippedSkill = null;
    p.skillCooldown = 0;

    // 職業ごとの保存割り振りもリセット
    p.jobSkillBuilds = {};

    log("🔄 スキルをリセットした");
    getCombatStats();
    updateSkillUI();
    updateStatusUI();
    updateSkillButton();
    if (typeof requestAutosave === "function") requestAutosave();
  }

  // -------------------
  // グローバル公開
  // -------------------
  window.updateUI = updateUI;
  window.updateSkillButton = updateSkillButton;
  window.log = log;
  window.clearLog = clearLog;

  window.openBag = openBag;
  window.openOptions = openOptions;
  window.closeOptions = closeOptions;
  window.closeBag = closeBag;
  window.setBagTab = setBagTab;
  window.setEquipmentSubTab = setEquipmentSubTab;
  window.setItemSubTab = setItemSubTab;
  window.updateBagUI = updateBagUI;
  window.toggleEquip = toggleEquip;
  window.toggleItemLock = toggleItemLock;
  window.discardEquipment = discardEquipment;
  window.openEquipSlotPicker = openEquipSlotPicker;
  window.closeEquipSlotPicker = closeEquipSlotPicker;
  window.chooseEquipSlot = chooseEquipSlot;
  window.useItem = useItem;

  
  // =====================
  // Save Data Import / Export (参考実装に準拠)
  // =====================
  const PENDING_IMPORT_KEY = "omf_pending_import_v1";
  const SAVE_EXPORT_SCHEMA_V1 = "one-more-floor-rpg-save-v1";
  const SAVE_EXPORT_SCHEMA_V2 = "one-more-floor-rpg-save-v2";
  const SAVE_EXPORT_SECRET = "one-more-floor-rpg-save-secret-v1";
  const SAVE_EXPORT_SALT = "omf-save-key-salt-v1";
  const SAVE_EXPORT_ITERATIONS = 100000;

  function buildSaveDataSnapshot() {
    const now = new Date();
    const storage = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        storage[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return {
      schema: SAVE_EXPORT_SCHEMA_V1,
      gameVersion: typeof GAME_VERSION === "string" ? GAME_VERSION : null,
      exportedAt: now.toISOString(),
      storage,
    };
  }

  function base64ToUint8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function uint8ToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function getSaveExportKey() {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SAVE_EXPORT_SECRET),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(SAVE_EXPORT_SALT),
        iterations: SAVE_EXPORT_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async function encryptSaveSnapshot(snapshot) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getSaveExportKey();
    const encoded = encoder.encode(JSON.stringify(snapshot));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return {
      schema: SAVE_EXPORT_SCHEMA_V2,
      gameVersion: snapshot.gameVersion || null,
      exportedAt: snapshot.exportedAt,
      alg: "AES-GCM",
      kdf: "PBKDF2",
      iv: uint8ToBase64(iv),
      data: uint8ToBase64(new Uint8Array(encrypted)),
    };
  }

  async function decryptSavePayload(payload) {
    if (!payload || typeof payload !== "object") throw new Error("invalid payload");
    if (payload.schema !== SAVE_EXPORT_SCHEMA_V2) return payload;
    const iv = base64ToUint8(String(payload.iv || ""));
    const data = base64ToUint8(String(payload.data || ""));
    const key = await getSaveExportKey();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  function downloadTextFile(filename, text, mime = "application/json") {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportSaveData() {
    try {
      const snapshot = buildSaveDataSnapshot();
      const encrypted = await encryptSaveSnapshot(snapshot);
      const safeVersion = snapshot.gameVersion || "unknown";
      const dateLabel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `OneMoreFloorRPG_save_${safeVersion}_${dateLabel}.json`;
      downloadTextFile(filename, JSON.stringify(encrypted));
      log("🔐 セーブデータをエクスポートしました");
    } catch (e) {
      log("⚠️ エクスポートに失敗しました");
    }
  }

  function openImportSaveDialog() {
    const input = document.getElementById("saveDataFileInput");
    if (!input) {
      log("⚠️ インポート用入力が見つかりません");
      return;
    }
    input.value = "";
    input.click();
  }

  function handleSaveDataImport(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const ok = window.confirm("この端末の現在のセーブデータを上書きします。よろしいですか？");
    if (!ok) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || "");
        const normalized = text.replace(/^\uFEFF/, "").trim();
        const parsed = JSON.parse(normalized);
        const decrypted = await decryptSavePayload(parsed);

        const isKnownEncrypted = parsed?.schema === SAVE_EXPORT_SCHEMA_V2;
        if (!isKnownEncrypted && decrypted?.schema !== SAVE_EXPORT_SCHEMA_V1) {
          const proceed = window.confirm("このファイルは想定形式と異なる可能性があります。続行しますか？");
          if (!proceed) return;
        }

        localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(decrypted));
        log("📥 セーブデータを読み込みました。再読み込みして反映します…");
        window.location.reload();
      } catch (e) {
        log("⚠️ インポートに失敗しました（ファイル形式を確認してください）");
      }
    };
    reader.onerror = () => log("⚠️ ファイル読み込みに失敗しました");
    reader.readAsText(file, "utf-8");
  }

  function toggleAutosave(enabled) {
    setAutosaveEnabled(!!enabled);
    updateOptionsUI();
    log(enabled ? "💾 オートセーブ: ON" : "💾 オートセーブ: OFF");
  }

  // グローバル公開（HTML onclick 用）
  window.exportSaveData = exportSaveData;
  window.openImportSaveDialog = openImportSaveDialog;
  window.handleSaveDataImport = handleSaveDataImport;
  window.setStatusTab = setStatusTab;
  window.toggleAutosave = toggleAutosave;

  window.openStatus = openStatus;
  window.openOptions = openOptions;
  window.closeOptions = closeOptions;
  window.closeStatus = closeStatus;
  window.updateStatusUI = updateStatusUI;

  window.openJobSelector = openJobSelector;
  window.closeJobSelector = closeJobSelector;
  window.selectJob = selectJob;

  window.openStatAllocation = openStatAllocation;
  window.closeStatAllocation = closeStatAllocation;
  window.adjustStat = adjustStat;
  window.resetStatAllocation = resetStatAllocation;

  window.openSkillScreen = openSkillScreen;
  window.closeSkillScreen = closeSkillScreen;
  window.updateSkillUI = updateSkillUI;
  window.levelUpSkill = levelUpSkill;
  window.equipSkill = equipSkill;
  window.resetSkills = resetSkills;
})();
