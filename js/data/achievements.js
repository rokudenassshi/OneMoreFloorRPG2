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
      id: "named_hunter",
      title: "二つ名狩り",
      desc: "二つ名モンスターを10体倒す",
      isDone: (p) => Number(p.namedKills || 0) >= 10,
      progress: (p) => `${Math.min(Number(p.namedKills || 0), 10)}/10`,
      bonus: {},
    },

  ];

  // -----------------
// 上級職 実績
// - 各上級職で 10000 体撃破（個別）
// - 報酬：各紋章 ×1（1実績につき1回）
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

  const reward = {
    text: "力/体力/賢さ/素早さ/器用さの紋章 ×1",
    valuables: [
      "emblem_strength",
      "emblem_vitality",
      "emblem_intelligence",
      "emblem_agility",
      "emblem_dexterity",
    ],
  };

  // 各上級職（個別）
  for (const k of advKeys) {
    const jd = jobs[k];
    const name = jd && jd.name ? jd.name : k;
    achievementDefs.push({
      id: `advanced_job_slayer_${k}_${ADV_TARGET}`,
      title: `${name}の猛者`,
      desc: `${name}でモンスターを${ADV_TARGET}体倒す（報酬：各紋章×1）`,
      isDone: (p) => getKills(p, k) >= ADV_TARGET,
      progress: (p) => `${Math.min(getKills(p, k), ADV_TARGET)}/${ADV_TARGET}`,
      reward,
      bonus: {},
    });
  }
}

  window.achievementDefs = achievementDefs;
})();
