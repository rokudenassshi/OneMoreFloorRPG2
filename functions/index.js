const functions = require("firebase-functions");

// ✅ “シリアルコード → 解放キー” をサーバー側に置く（クライアントには公開しない）
// ※必要に応じてここに追加
const serialCodeLookup = {
  // 前世の記憶（実績解除：経験値+10%）
  zensenokiokuh30n98jqmojp9amq: "pastLifeMemory",
};

exports.verifySerialCode = functions
  .region("us-central1")
  .https.onCall((data) => {
    const code = String(data?.code || "")
      .trim()
      .toLowerCase();
    if (!code) return { ok: false, message: "empty" };

    const unlock = serialCodeLookup[code];
    if (!unlock) return { ok: false, message: "invalid" };

    return { ok: true, unlock };
  });
