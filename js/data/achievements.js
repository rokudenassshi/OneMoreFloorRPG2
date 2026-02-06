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

  window.achievementDefs = achievementDefs;
})();
