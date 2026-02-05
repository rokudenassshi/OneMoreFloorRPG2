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

    document.getElementById("playerLevel").textContent = p.level;
    document.getElementById("floor").textContent = gameData.floor;
    document.getElementById("playerHp").textContent =
      `${Math.round(p.hp)}/${Math.round(p.maxHp)}`;

    // 経験値バー
    const expRate = p.exp / getExpNeeded();
    document.getElementById("expBarFill").style.width = expRate * 100 + "%";

    // 敵情報
    if (gameData.enemy) {
      const e = gameData.enemy;
      document.getElementById("enemyName").textContent = e.displayName;
      document.getElementById("enemyHp").textContent =
        `HP：${Math.round(e.hp)}/${Math.round(e.maxHp)}`;
    } else {
      document.getElementById("enemyName").textContent = "";
      document.getElementById("enemyHp").textContent = "---";
    }

    // ボタン表示切り替え
    if (gameData.gameState === "BATTLE") {
      gameData.battleButtons.style.display = "block";
      gameData.exploreButtons.style.display = "none";
      updateSkillButton();
    } else {
      gameData.battleButtons.style.display = "none";
      gameData.exploreButtons.style.display = "block";
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

    const skillDef = skills[skill];
    if (gameData.player.skillCooldown > 0) {
      btn.textContent = `スキル (${gameData.player.skillCooldown})`;
      btn.disabled = true;
    } else {
      btn.textContent = `スキル: ${skillDef.name}`;
      btn.disabled = false;
    }
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

  // core.js の関数を参照するための薄いラッパ（UI側で必要）
  function getExpNeeded() {
    return Math.floor(100 * Math.pow(1.2, gameData.player.level - 1));
  }

  // -------------------
  // UI - バッグ
  // -------------------
  function openBag() {
    document.getElementById("bagScreen").style.display = "block";
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
      .querySelectorAll(".sub-tab")
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

  function isEquipped(item) {
    const eq = gameData.player.equipment;
    return eq.slot1 === item || eq.slot2 === item || eq.accessory === item;
  }

  function updateBagUI() {
    const weaponsList = document.getElementById("weaponsList");
    const accessoriesList = document.getElementById("accessoriesList");
    const itemsList = document.getElementById("itemsList");

    weaponsList.innerHTML = "";
    accessoriesList.innerHTML = "";
    itemsList.innerHTML = "";

    // 装備品
    gameData.player.inventory.forEach((item, idx) => {
      const equipped = isEquipped(item);

      const card = `
        <div class="item-card ${equipped ? "equipped" : ""} ${item.rarity}" onclick="toggleEquip(${idx})">
          <div class="item-name">${item.name}${item.randomOptions > 0 ? ` +${item.randomOptions}` : ""}</div>
          <div class="item-stats">
            ${item.attack ? `攻撃+${item.attack} ` : ""}
            ${item.defense ? `防御+${item.defense} ` : ""}
            ${item.accuracy ? `命中+${item.accuracy}% ` : ""}
            ${item.evasion ? `回避+${item.evasion}% ` : ""}
            ${item.effects ? item.effects.map((e) => e.name).join(", ") : ""}
          </div>
          ${equipped ? '<div style="color: #4caf50; font-weight: bold; margin-top: 4px;">装備中</div>' : ""}
        </div>
      `;

      if (item.category === "accessory") {
        accessoriesList.innerHTML += card;
      } else {
        weaponsList.innerHTML += card;
      }
    });

    // アイテム
    gameData.player.items.forEach((item) => {
      itemsList.innerHTML += `
        <div class="item-card" onclick="useItem('${item.name}')">
          <div class="item-name">${item.name} x${item.count}</div>
          <div class="item-stats">HP ${item.heal}回復</div>
        </div>
      `;
    });
  }

  // 装備ルール:
  // - 武器/防具: slot1 / slot2 の2枠
  // - 装飾品: accessory 1枠
  // - 2手武器は slot1 を占有し、slot2 は空扱いにする
  function toggleEquip(idx) {
    const item = gameData.player.inventory[idx];
    const eq = gameData.player.equipment;

    // まず外す処理（装備中ならトグルで外す）
    if (eq.accessory === item) {
      eq.accessory = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      return;
    }
    if (eq.slot1 === item) {
      eq.slot1 = null;
      if (eq.slot2 === item) eq.slot2 = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      return;
    }
    if (eq.slot2 === item) {
      eq.slot2 = null;
      log(`${item.name}を外した`);
      getCombatStats();
      updateBagUI();
      return;
    }

    // 装飾品は専用スロットへ
    if (item.category === "accessory") {
      eq.accessory = item;
      log(`${item.name}を装飾品に装備した`);
      getCombatStats();
      updateBagUI();
      return;
    }

    // 武器/防具
    if (!eq.slot1) {
      eq.slot1 = item;
      // 2手はslot2を空に固定
      if (item.hands === 2) eq.slot2 = null;
      log(`${item.name}をスロット1に装備した`);
    } else if (!eq.slot2 && eq.slot1 && eq.slot1.hands !== 2) {
      eq.slot2 = item;
      log(`${item.name}をスロット2に装備した`);
    } else {
      // 置き換え: slot1 を優先して差し替え
      eq.slot1 = item;
      if (item.hands === 2) {
        eq.slot2 = null;
      } else {
        // slot2 が同一参照にならないように
        if (eq.slot2 === eq.slot1) eq.slot2 = null;
      }
      log(`${item.name}をスロット1に装備した`);
    }

    getCombatStats();
    updateBagUI();
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

    gameData.player.hp = Math.min(
      gameData.player.maxHp,
      gameData.player.hp + item.heal,
    );
    log(`${name}を使用！ ${item.heal}HP回復した！`);

    updateBagUI();
    updateUI();
  }

  // -------------------
  // UI - ステータス
  // -------------------
  let currentStatusTab = "status";

  function openStatus() {
    document.getElementById("statusScreen").style.display = "block";
    document.getElementById("exploreButtons").style.display = "none";
    document.getElementById("battleButtons").style.display = "none";
    setStatusTab(currentStatusTab || "status");
    updateStatusUI();
    updateAchievementsUI();
    updateOptionsUI();
  }

  function closeStatus() {
    document.getElementById("statusScreen").style.display = "none";
    updateUI();
  }

  function setStatusTab(tab) {
    const allowed = ["status", "achievements", "options"];
    if (!allowed.includes(tab)) tab = "status";
    currentStatusTab = tab;

    const tabStatus = document.getElementById("tabStatus");
    const tabAch = document.getElementById("tabAchievements");
    const tabOpt = document.getElementById("tabOptions");

    if (tabStatus)
      tabStatus.style.display = tab === "status" ? "block" : "none";
    if (tabAch)
      tabAch.style.display = tab === "achievements" ? "block" : "none";
    if (tabOpt) tabOpt.style.display = tab === "options" ? "block" : "none";

    const btnS = document.getElementById("statusTabBtnStatus");
    const btnA = document.getElementById("statusTabBtnAchievements");
    const btnO = document.getElementById("statusTabBtnOptions");
    if (btnS) btnS.classList.toggle("is-active", tab === "status");
    if (btnA) btnA.classList.toggle("is-active", tab === "achievements");
    if (btnO) btnO.classList.toggle("is-active", tab === "options");
  }

  function updateAchievementsUI() {
    const el = document.getElementById("achievementsContent");
    if (!el) return;
    const p = gameData.player;
    const totalKills = Number(p.totalKills || 0);
    const namedKills = Number(p.namedKills || 0);
    const maxFloor = Number(p.maxReachedFloor || gameData.floor || 1);

    const ach = [
      {
        title: "初討伐",
        desc: "敵を1体倒す",
        done: totalKills >= 1,
        progress: `${Math.min(totalKills, 1)}/1`,
      },
      {
        title: "冒険者見習い",
        desc: "最高到達 10階",
        done: maxFloor >= 10,
        progress: `${Math.min(maxFloor, 10)}/10`,
      },
      {
        title: "熟練の冒険者",
        desc: "敵を100体倒す",
        done: totalKills >= 100,
        progress: `${Math.min(totalKills, 100)}/100`,
      },
      {
        title: "二つ名狩り",
        desc: "二つ名モンスターを10体倒す",
        done: namedKills >= 10,
        progress: `${Math.min(namedKills, 10)}/10`,
      },
    ];

    el.innerHTML = ach
      .map((a) => {
        const mark = a.done ? "✅" : "⬜";
        return `<div class="achievement-card">${mark} <strong>${a.title}</strong><div class="small">${a.desc}（${a.progress}）</div></div>`;
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

    document.getElementById("currentJob").textContent = jobs[p.job].name;

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

    document.getElementById("equipSlot1").textContent = slot1
      ? `スロット1: ${slot1.name}`
      : "スロット1: 空";
    document.getElementById("equipSlot2").textContent = slot2
      ? `スロット2: ${slot2.name}`
      : "スロット2: 空";
    document.getElementById("equipAccessorySlot").textContent = acc
      ? `装飾品: ${acc.name}`
      : "装飾品: 空";

    // 計算後ステータス
    document.getElementById("calcStats").innerHTML = `
      <div>攻撃力: ${Math.round(combat.attack)}</div>
      <div>防御力: ${Math.round(combat.defense)}</div>
      <div>魔法威力: ${Math.round(combat.magicPower)}</div>
      <div>命中率: ${Math.round(combat.accuracy)}%</div>
      <div>回避率: ${Math.round(combat.evasion)}%</div>
      <div>クリティカル: ${Math.round(combat.critRate)}%</div>
    `;

    document.getElementById("skillPoints").textContent = p.skillPoints;
    document.getElementById("equippedSkillName").textContent = p.equippedSkill
      ? skills[p.equippedSkill].name
      : "なし";
  }

  // 職業選択
  function openJobSelector() {
    const grid = document.getElementById("jobGrid");
    grid.innerHTML = "";

    for (let key in jobs) {
      const job = jobs[key];
      const isSelected = gameData.player.job === key;

      grid.innerHTML += `
        <div class="job-card ${isSelected ? "selected" : ""}" onclick="selectJob('${key}')">
          <h4>${job.name}</h4>
          <p>${job.desc}</p>
        </div>
      `;
    }

    document.getElementById("jobModal").classList.remove("hidden");
  }

  function closeJobSelector() {
    document.getElementById("jobModal").classList.add("hidden");
  }

  function selectJob(jobKey) {
    gameData.player.job = jobKey;
    log(`職業を${jobs[jobKey].name}に変更した`);
    getCombatStats();
    updateStatusUI();
    closeJobSelector();
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

  function closeSkillScreen() {
    document.getElementById("skillScreen").style.display = "none";
    document.getElementById("statusScreen").style.display = "block";
  }

  function updateSkillUI() {
    const p = gameData.player;
    const currentJob = p.job;

    document.getElementById("skillPointsInSkill").textContent = p.skillPoints;

    const passiveList = document.getElementById("passiveSkillsList");
    const activeList = document.getElementById("activeSkillsList");

    passiveList.innerHTML = "";
    activeList.innerHTML = "";

    for (let key in skills) {
      const skill = skills[key];
      if (skill.job !== currentJob) continue;

      const level = p.skills[key] || 0;
      const canLevelUp = level < skill.maxLevel && p.skillPoints > 0;

      const html = `
        <div class="skill-item">
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-desc">${skill.desc}</div>
            ${skill.type === "active" ? `<div style="font-size: 11px; color: #aaa;">CT: ${skill.cooldown}ターン</div>` : ""}
          </div>
          <div class="skill-actions">
            <div class="skill-level">Lv.${level}/${skill.maxLevel}</div>
            ${canLevelUp ? `<button class="small-btn" onclick="levelUpSkill('${key}')">+</button>` : ""}
            ${skill.type === "active" && level > 0 ? `<button class="small-btn" onclick="equipSkill('${key}')">装備</button>` : ""}
          </div>
        </div>
      `;

      if (skill.type === "passive") passiveList.innerHTML += html;
      else activeList.innerHTML += html;
    }
  }

  function levelUpSkill(key) {
    if (gameData.player.skillPoints <= 0) return;

    const skill = skills[key];
    const currentLevel = gameData.player.skills[key] || 0;
    if (currentLevel >= skill.maxLevel) return;

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

  // -------------------
  // グローバル公開
  // -------------------
  window.updateUI = updateUI;
  window.updateSkillButton = updateSkillButton;
  window.log = log;

  window.openBag = openBag;
  window.closeBag = closeBag;
  window.setBagTab = setBagTab;
  window.setEquipmentSubTab = setEquipmentSubTab;
  window.updateBagUI = updateBagUI;
  window.toggleEquip = toggleEquip;
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
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );
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
    if (!payload || typeof payload !== "object")
      throw new Error("invalid payload");
    if (payload.schema !== SAVE_EXPORT_SCHEMA_V2) return payload;
    const iv = base64ToUint8(String(payload.iv || ""));
    const data = base64ToUint8(String(payload.data || ""));
    const key = await getSaveExportKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
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
      const dateLabel = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
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
    const ok = window.confirm(
      "この端末の現在のセーブデータを上書きします。よろしいですか？",
    );
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
          const proceed = window.confirm(
            "このファイルは想定形式と異なる可能性があります。続行しますか？",
          );
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

  // グローバル公開（HTML onclick 用）
  window.exportSaveData = exportSaveData;
  window.openImportSaveDialog = openImportSaveDialog;
  window.handleSaveDataImport = handleSaveDataImport;
  window.setStatusTab = setStatusTab;

  window.openStatus = openStatus;
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
})();
