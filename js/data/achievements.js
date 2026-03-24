// ===================
// ゲームデータ：実績
// ===================

(function () {
  "use strict";

  // 実績定義（解除でボーナスが発生）
  // ※解除状態は player.achievements[id] に保存される
  const achievementDefs = [
    {
      id: "defeated_10_times",
      title: "不屈の証",
      desc: "敵に10回倒される",
      isDone: (p) => Number(p.totalDefeats || 0) >= 10,
      progress: (p) => `${Math.min(Number(p.totalDefeats || 0), 10)}/10`,
      bonus: {},
      reward: {
        valuables: [{ id: "emblem_vitality", amount: 10 }],
        text: "体力の紋章 ×10",
      },
    },
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
      id: "elite_adventurer",
      title: "百戦錬磨",
      desc: "敵を1000体倒す",
      isDone: (p) => Number(p.totalKills || 0) >= 1000,
      progress: (p) => `${Math.min(Number(p.totalKills || 0), 1000)}/1000`,
      // 経験値 +10%
      bonus: { expRate: 0.1 },
    },
    {
      id: "level_50",
      title: "力の芽生え",
      desc: "プレイヤーレベル50に到達する",
      isDone: (p) => Number(p.level || 1) >= 50,
      progress: (p) => `${Math.min(Number(p.level || 1), 50)}/50`,
      bonus: { expRate: 0.05 },
    },
    {
      id: "serial_stay_battle",
      title: "連戦の心得",
      desc: "シリアルコード（連戦）を入力する",
      isDone: (p) => !!(p && p.serialUnlocks && p.serialUnlocks.stayBattle),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.stayBattle ? "1/1" : "0/1",
      bonus: {},
    },
    {
      id: "serial_stay_current_floor",
      title: "階層に留まる",
      desc: "シリアルコード（現在階層連戦）を入力する",
      isDone: (p) => !!(p && p.serialUnlocks && p.serialUnlocks.stayBattle),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.stayBattle ? "1/1" : "0/1",
      bonus: {},
    },
    {
      id: "serial_floor_cap_lift_250",
      title: "深淵への通行証",
      desc: "シリアルコード（階層上限解放）を入力する",
      isDone: (p) =>
        !!(p && p.serialUnlocks && p.serialUnlocks.floorCapLift250),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.floorCapLift250 ? "1/1" : "0/1",
      bonus: {},
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
      id: "serial_start_dash_emblems",
      title: "スタートダッシュ",
      desc: "シリアルコード（スタートダッシュ）を入力する",
      isDone: (p) =>
        !!(p && p.serialUnlocks && p.serialUnlocks.startDashEmblems),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.startDashEmblems
          ? "1/1"
          : "0/1",
      bonus: {},
    },
    {
      id: "serial_auto_skill1_on_attack",
      title: "戦技の呼吸",
      desc: "シリアルコード（たたかうでスキル1自動発動）を入力する",
      isDone: (p) =>
        !!(p && p.serialUnlocks && p.serialUnlocks.autoSkill1OnAttack),
      progress: (p) =>
        p && p.serialUnlocks && p.serialUnlocks.autoSkill1OnAttack
          ? "1/1"
          : "0/1",
      bonus: {},
    },
    {
      id: "named_hunter",
      title: "二つ名狩り",
      desc: "二つ名モンスターを10体倒す",
      isDone: (p) => Number(p.namedKills || 0) >= 10,
      progress: (p) => `${Math.min(Number(p.namedKills || 0), 10)}/10`,
      bonus: {},
    },
    {
      id: "named_hunter_master",
      title: "二つ名コレクター",
      desc: "二つ名モンスターを50体倒す",
      isDone: (p) => Number(p.namedKills || 0) >= 50,
      progress: (p) => `${Math.min(Number(p.namedKills || 0), 50)}/50`,
      bonus: { itemDropRate: 5 },
    },
    {
      id: "named_hunter_master_2",
      title: "二つ名コレクター2",
      desc: "二つ名モンスターを200体倒す",
      isDone: (p) => Number(p.namedKills || 0) >= 200,
      progress: (p) => `${Math.min(Number(p.namedKills || 0), 200)}/200`,
      bonus: { search: 10 },
    },
    {
      id: "asura_world_first_visit",
      title: "さらなる冒険",
      desc: "修羅の国に行く",
      isVisible: (p) =>
        !!(p && p.achievements && p.achievements.asura_world_first_visit),
      isDone: (p) => !!(p && p.worldState && p.worldState.hasVisitedAsura),
      progress: (p) =>
        p && p.worldState && p.worldState.hasVisitedAsura ? "1/1" : "0/1",
      bonus: {},
      reward: {
        valuables: [
          { id: "emblem_strength", amount: 10 },
          { id: "emblem_vitality", amount: 10 },
          { id: "emblem_intelligence", amount: 10 },
          { id: "emblem_agility", amount: 10 },
          { id: "emblem_dexterity", amount: 10 },
        ],
        text: "各紋章 ×10",
      },
    },
    {
      id: "the_have_not",
      title: "死を超える",
      desc: "？？？",
      isDone: (p) => Number(p.nakedDefeats || 0) >= 1000,
      progress: (p) => `${Math.min(Number(p.nakedDefeats || 0), 1000)}/1000`,
      bonus: {},
      reward: {
        unlockJobs: ["have_not"],
        text: "職業「持たざる者」解放",
      },
    },
    {
      id: "have_not_slayer_1000",
      title: "持たざる刈り",
      desc: "持たざる者で敵を1000体倒す",
      isVisible: (p) => !!(p && p.unlockedJobs && p.unlockedJobs.have_not),
      isDone: (p) => {
        const map =
          p && p.jobKills && typeof p.jobKills === "object" ? p.jobKills : {};
        return Number(map.have_not || 0) >= 1000;
      },
      progress: (p) => {
        const map =
          p && p.jobKills && typeof p.jobKills === "object" ? p.jobKills : {};
        return `${Math.min(Number(map.have_not || 0), 1000)}/1000`;
      },
      bonus: {},
    },
    {
      id: "have_not_defeat_100",
      title: "？？？",
      desc: "？？？",
      isVisible: (p) => !!(p && p.unlockedJobs && p.unlockedJobs.have_not),
      revealAfterDone: true,
      doneTitle: "百敗の刻印",
      doneDesc: "持たざる者で100回戦闘に敗北する",
      isDone: (p) => {
        const map =
          p && p.jobDefeats && typeof p.jobDefeats === "object"
            ? p.jobDefeats
            : {};
        return Number(map.have_not || 0) >= 100;
      },
      progress: (p) => {
        const map =
          p && p.jobDefeats && typeof p.jobDefeats === "object"
            ? p.jobDefeats
            : {};
        return `${Math.min(Number(map.have_not || 0), 100)}/100`;
      },
      bonus: {},
      reward: {
        unlockJobs: ["reaper"],
        text: "死神",
      },
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
        desc: `攻撃を${ms.target}回回避する`,
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
  // - 境地2以降は段階解放（前段階クリア後に次が解放）
  // - 各段階は「解放時点」から0カウントで進行する
  // - 必要撃破数（段階ごと）：2は1500、3は2000、4は2500、5は3000
  {
    const getTotalKills = (p) => {
      const v = Number(p && p.totalKills ? p.totalKills : 0);
      return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    };

    const milestones = [
      {
        id: "elite_adventurer_5000_after",
        title: "千戦錬磨",
        unlockAfterId: "elite_adventurer",
        unlockAfterLabel: "百戦錬磨",
        needKills: 5000,
        bonusExpRate: 0.15,
      },
      {
        id: "elite_adventurer_10000_after",
        title: "万戦錬磨",
        unlockAfterId: "elite_adventurer_5000_after",
        unlockAfterLabel: "千戦錬磨",
        needKills: 10000,
        bonusExpRate: 0.2,
      },
    ];

    const ensureMilestoneStartMap = (p) => {
      if (!p || typeof p !== "object") return {};
      if (
        !p.achievementProgressStarts ||
        typeof p.achievementProgressStarts !== "object"
      ) {
        p.achievementProgressStarts = {};
      }
      if (
        !p.achievementProgressStarts.eliteMilestones ||
        typeof p.achievementProgressStarts.eliteMilestones !== "object"
      ) {
        p.achievementProgressStarts.eliteMilestones = {};
      }
      return p.achievementProgressStarts.eliteMilestones;
    };

    const getMilestoneStartKills = (p, ms) => {
      const map =
        p &&
        p.achievementProgressStarts &&
        p.achievementProgressStarts.eliteMilestones &&
        typeof p.achievementProgressStarts.eliteMilestones === "object"
          ? p.achievementProgressStarts.eliteMilestones
          : {};
      const raw = Number(map[ms.id]);
      return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    };

    milestones.forEach((ms) => {
      achievementDefs.push({
        id: ms.id,
        title: ms.title,
        desc: `${ms.unlockAfterLabel}クリア後、さらに敵を${ms.needKills}体倒す`,
        isVisible: (p) =>
          !!(p && p.achievements && p.achievements[ms.unlockAfterId]),
        onCheck: (p) => {
          const unlocked = !!(
            p &&
            p.achievements &&
            p.achievements[ms.unlockAfterId]
          );
          if (!unlocked) return;
          const map = ensureMilestoneStartMap(p);
          const cur = Number(map[ms.id]);
          if (Number.isFinite(cur)) return;
          map[ms.id] = getTotalKills(p);
        },
        isDone: (p) => {
          const unlocked = !!(
            p &&
            p.achievements &&
            p.achievements[ms.unlockAfterId]
          );
          if (!unlocked) return false;
          const startKills = getMilestoneStartKills(p, ms);
          return Math.max(0, getTotalKills(p) - startKills) >= ms.needKills;
        },
        progress: (p) => {
          const unlocked = !!(
            p &&
            p.achievements &&
            p.achievements[ms.unlockAfterId]
          );
          if (!unlocked) return "未解放";
          const startKills = getMilestoneStartKills(p, ms);
          const v = Math.max(0, getTotalKills(p) - startKills);
          return `${Math.min(v, ms.needKills)}/${ms.needKills}`;
        },
        bonus: { expRate: ms.bonusExpRate },
      });
    });
  }

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
        needKills: 1000,
      },
      {
        id: "asura_slayer_1500",
        title: "修羅の境地 2",
        unlockAfterId: "asura_slayer_1000",
        unlockAfterLabel: "修羅の境地1",
        needKills: 1500,
      },
      {
        id: "asura_slayer_2000",
        title: "修羅の境地 3",
        unlockAfterId: "asura_slayer_1500",
        unlockAfterLabel: "修羅の境地2",
        needKills: 2000,
      },
    ];

    const ensureAsuraMilestoneStartMap = (p) => {
      if (!p || typeof p !== "object") return {};
      if (
        !p.achievementProgressStarts ||
        typeof p.achievementProgressStarts !== "object"
      ) {
        p.achievementProgressStarts = {};
      }
      if (
        !p.achievementProgressStarts.asuraMilestones ||
        typeof p.achievementProgressStarts.asuraMilestones !== "object"
      ) {
        p.achievementProgressStarts.asuraMilestones = {};
      }
      return p.achievementProgressStarts.asuraMilestones;
    };

    const getAsuraMilestoneStartKills = (p, ms) => {
      if (!ms.unlockAfterId) return 0;
      const map =
        p &&
        p.achievementProgressStarts &&
        p.achievementProgressStarts.asuraMilestones &&
        typeof p.achievementProgressStarts.asuraMilestones === "object"
          ? p.achievementProgressStarts.asuraMilestones
          : {};
      const raw = Number(map[ms.id]);
      return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    };

    asuraMilestones.forEach((ms) => {
      achievementDefs.push({
        id: ms.id,
        title: ms.title,
        desc: ms.unlockAfterId
          ? `${ms.unlockAfterLabel}クリア後、修羅でさらに${ms.needKills}体倒す`
          : `修羅でモンスターを${ms.needKills}体倒す`,
        isVisible: (p) =>
          !ms.unlockAfterId ||
          !!(p && p.achievements && p.achievements[ms.unlockAfterId]),
        onCheck: (p) => {
          if (!ms.unlockAfterId) return;
          const unlocked = !!(
            p &&
            p.achievements &&
            p.achievements[ms.unlockAfterId]
          );
          if (!unlocked) return;
          const map = ensureAsuraMilestoneStartMap(p);
          const cur = Number(map[ms.id]);
          if (Number.isFinite(cur)) return;
          map[ms.id] = getAsuraKills(p);
        },
        isDone: (p) => {
          const unlocked =
            !ms.unlockAfterId ||
            !!(p && p.achievements && p.achievements[ms.unlockAfterId]);
          if (!unlocked) return false;
          const startKills = getAsuraMilestoneStartKills(p, ms);
          return Math.max(0, getAsuraKills(p) - startKills) >= ms.needKills;
        },
        progress: (p) => {
          const unlocked =
            !ms.unlockAfterId ||
            !!(p && p.achievements && p.achievements[ms.unlockAfterId]);
          if (!unlocked) return "未解放";
          const startKills = getAsuraMilestoneStartKills(p, ms);
          const v = Math.max(0, getAsuraKills(p) - startKills);
          return `${Math.min(v, ms.needKills)}/${ms.needKills}`;
        },
        bonus: { asuraBaseStatMultiplierBonus: 0.5 },
      });
    });
  }

  // -----------------
  // 上級職 実績
  // - 各上級職で 1000 体撃破（個別）
  // - 報酬：経験値 +10%
  // -----------------
  {
    const jobs = window.jobs || {};
    const ADV_TARGET = 1000;
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
        desc: `${name}でモンスターを${ADV_TARGET}体倒す`,
        isDone: (p) => getKills(p, k) >= ADV_TARGET,
        progress: (p) =>
          `${Math.min(getKills(p, k), ADV_TARGET)}/${ADV_TARGET}`,
        bonus: { expRate: 0.1 },
      });
    }
  }

  // -----------------
  // 全職制覇 実績
  // - 各職業で 10000 体撃破
  // - 報酬：職業「勇者」解放
  // -----------------
  {
    const jobs = window.jobs || {};
    const TARGET = 10000;
    const requiredJobKeys = Object.keys(jobs).filter(
      (k) => jobs[k] && k !== "have_not" && k !== "hero",
    );

    const getKills = (p, jobKey) => {
      const map =
        p && p.jobKills && typeof p.jobKills === "object" ? p.jobKills : {};
      const v = Number(map[jobKey] || 0);
      return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    };

    const getDoneCount = (p) =>
      requiredJobKeys.reduce(
        (sum, k) => sum + (getKills(p, k) >= TARGET ? 1 : 0),
        0,
      );

    const getJobName = (jobKey) => {
      const jd = jobs[jobKey];
      return jd && jd.name ? jd.name : jobKey;
    };

    const formatPerJobProgress = (p) =>
      requiredJobKeys
        .map(
          (k) =>
            `${getJobName(k)}:${Math.min(getKills(p, k), TARGET)}/${TARGET}`,
        )
        .join(" / ");

    achievementDefs.push({
      id: "all_jobs_slayer_10000_except_have_not",
      title: "全職の極意",
      desc: `全職業でモンスターを${TARGET}体倒す`,
      isDone: (p) =>
        requiredJobKeys.length > 0 &&
        requiredJobKeys.every((k) => getKills(p, k) >= TARGET),
      progress: (p) =>
        `${getDoneCount(p)}/${requiredJobKeys.length}職達成 / ${formatPerJobProgress(p)}`,
      bonus: {},
      reward: {
        unlockJobs: ["hero"],
        text: "？？？を解放",
      },
    });
  }

  window.achievementDefs = achievementDefs;
})();
