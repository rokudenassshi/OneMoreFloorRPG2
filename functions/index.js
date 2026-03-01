const functions = require("firebase-functions");

// ✅ “シリアルコード → 解放キー” をサーバー側に置く（クライアントには公開しない）
// ランダム文字列部分は固定（外部から推測されにくくするために付与）
const serialCodeLookup = {
  // `OMFPRG1` + 英数字10文字（固定）: 前世の記憶（経験値+10%）
  omfprg1h30n98jqmo: "pastLifeMemory",

  // `startadventure` + 英数字15文字（固定）: 250階層テスト上限解除
  startadventure7x9k2m4p8q1r5tz: "floorCapLift250",
};

exports.verifySerialCode = functions
  .region("us-central1")
  .https.onCall((data) => {
    const code = String(data?.code || "")
      .trim()
      .toLowerCase();
    if (!code) return { ok: false, message: "empty" };

    const unlock = serialCodeLookup[code];
    if (unlock) return { ok: true, unlock };

    return { ok: false, message: "invalid" };
  });
