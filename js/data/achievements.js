// ===================
// ゲームデータ：実績
// ===================

(function () {
  "use strict";

  // 実績定義（解除でボーナスが発生）
  // ※解除状態は player.achievements[id] に保存される
  const achievementDefs = [
    {
      id: "first_kill",
      title: "初討伐",
      desc: "敵を1体倒す",
      isDone: (p) => Number(p.totalKills || 0) >= 1,
      progress: (p) => `${Math.min(Number(p.totalKills || 0), 1)}/1`,
      bonus: {},
    },
    {
      id: "apprentice",
      title: "冒険者見習い",
      desc: "最高到達 10階",
      isDone: (p) => Number(p.maxReachedFloor || 1) >= 10,
      progress: (p) => `${Math.min(Number(p.maxReachedFloor || 1), 10)}/10`,
      bonus: {},
    },
    {
      id: "veteran_adventurer",
      title: "熟練の冒険者",
      desc: "敵を100体倒す",
      isDone: (p) => Number(p.totalKills || 0) >= 100,
      progress: (p) => `${Math.min(Number(p.totalKills || 0), 100)}/100`,
      // 経験値 +5%
      bonus: { expRate: 0.05 },
    },
    {
      id: "past_life_memory",
      title: "前世の記憶",
      desc: "シリアルコードで解放する",
      isDone: (p) => !!(p && p.serialUnlocks && p.serialUnlocks.pastLifeMemory),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.pastLifeMemory ? "1/1" : "0/1",
      // 経験値 +20%
      bonus: { expRate: 0.2 },
    },
    {
      id: "named_hunter",
      title: "二つ名狩り",
      desc: "二つ名モンスターを10体倒す",
      isDone: (p) => Number(p.namedKills || 0) >= 10,
      progress: (p) => `${Math.min(Number(p.namedKills || 0), 10)}/10`,
      bonus: {},
    },
  ];

  // 回避上限を段階的に引き上げる実績
  // 基本上限70% → 実績で +5% ずつ、最大90%
  {
    const evadeMilestones = [
      {
        id: "evasion_limit_75",
        title: "見切りの境地 1",
        target: 100,
        bonusCap: 5,
        unlockAfterId: null,
      },
      {
        id: "evasion_limit_80",
        title: "見切りの境地 2",
        target: 300,
        bonusCap: 5,
        unlockAfterId: "evasion_limit_75",
      },
      {
        id: "evasion_limit_85",
        title: "見切りの境地 3",
        target: 700,
        bonusCap: 5,
        unlockAfterId: "evasion_limit_80",
      },
      {
        id: "evasion_limit_90",
        title: "見切りの境地 4",
        target: 1500,
        bonusCap: 5,
        unlockAfterId: "evasion_limit_85",
      },
    ];

    evadeMilestones.forEach((ms) => {
      achievementDefs.push({
        id: ms.id,
        title: ms.title,
        desc: `攻撃を${ms.target}回回避する（ボーナス：回避上限+${ms.bonusCap}%）`,
        isVisible: (p) =>
          !ms.unlockAfterId ||
          !!(p && p.achievements && p.achievements[ms.unlockAfterId]),
        isDone: (p) => {
          const unlocked =
            !ms.unlockAfterId ||
            !!(p && p.achievements && p.achievements[ms.unlockAfterId]);
          if (!unlocked) return false;
          return Number(p.totalEvades || 0) >= ms.target;
        },
        progress: (p) =>
          `${Math.min(Number(p.totalEvades || 0), ms.target)}/${ms.target}`,
        bonus: { evasionCapBonus: ms.bonusCap },
      });
    });
  }

  // 修羅：一定撃破数ごとに基礎ステ倍率が上昇
  // - 境地2以降は段階解放（1クリア後に2、2クリア後に3）
  // - 必要数は段階ごとの追加撃破数（2は+1500、3は+2000）
  {
    const getAsuraKills = (p) => {
      const map =
        p && p.jobKills && typeof p.jobKills === "object" ? p.jobKills : {};
      const v = Number(map.asura || 0);
      return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    };

    const asuraMilestones = [
      {
        id: "asura_slayer_1000",
        title: "修羅の境地 1",
        unlockAfterId: null,
        baseKills: 0,
        needKills: 1000,
      },
      {
        id: "asura_slayer_1500",
        title: "修羅の境地 2",
        unlockAfterId: "asura_slayer_1000",
        unlockAfterLabel: "修羅の境地1",
        baseKills: 1000,
        needKills: 1500,
      },
      {
        id: "asura_slayer_2000",
        title: "修羅の境地 3",
        unlockAfterId: "asura_slayer_1500",
        unlockAfterLabel: "修羅の境地2",
        baseKills: 2500,
        needKills: 2000,
      },
    ];

    asuraMilestones.forEach((ms) => {
      achievementDefs.push({
        id: ms.id,
        title: ms.title,
        desc: ms.unlockAfterId
          ? `${ms.unlockAfterLabel}クリア後、修羅でさらに${ms.needKills}体倒す（ボーナス：修羅の基礎ステ倍率+1）`
          : `修羅でモンスターを${ms.needKills}体倒す（ボーナス：修羅の基礎ステ倍率+1）`,
        isVisible: (p) =>
          !ms.unlockAfterId ||
          !!(p && p.achievements && p.achievements[ms.unlockAfterId]),
        isDone: (p) => {
          const unlocked =
            !ms.unlockAfterId ||
            !!(p && p.achievements && p.achievements[ms.unlockAfterId]);
          if (!unlocked) return false;
          return getAsuraKills(p) >= ms.baseKills + ms.needKills;
        },
        progress: (p) => {
          const unlocked =
            !ms.unlockAfterId ||
            !!(p && p.achievements && p.achievements[ms.unlockAfterId]);
          if (!unlocked) return "未解放";
          const v = Math.max(0, getAsuraKills(p) - ms.baseKills);
          return `${Math.min(v, ms.needKills)}/${ms.needKills}`;
        },
        bonus: { asuraBaseStatMultiplierBonus: 1 },
      });
    });
  }

  // -----------------
  // 上級職 実績
  // - 各上級職で 10000 体撃破（個別）
  // - 報酬：経験値 +10%
  // -----------------
  {
    const jobs = window.jobs || {};
    const ADV_TARGET = 10000;
    const advKeys = Object.keys(jobs).filter(
      (k) => jobs[k] && jobs[k].tier === "advanced",
    );

    const getKills = (p, jobKey) => {
      const map =
        p && p.jobKills && typeof p.jobKills === "object" ? p.jobKills : {};
      const v = Number(map[jobKey] || 0);
      return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    };

    // 各上級職（個別）
    for (const k of advKeys) {
      const jd = jobs[k];
      const name = jd && jd.name ? jd.name : k;
      achievementDefs.push({
        id: `advanced_job_slayer_${k}_${ADV_TARGET}`,
        title: `${name}の心得`,
        desc: `${name}でモンスターを${ADV_TARGET}体倒す（ボーナス：経験値+10%）`,
        isDone: (p) => getKills(p, k) >= ADV_TARGET,
        progress: (p) =>
          `${Math.min(getKills(p, k), ADV_TARGET)}/${ADV_TARGET}`,
        bonus: { expRate: 0.1 },
      });
    }
  }

  window.achievementDefs = achievementDefs;
})();
