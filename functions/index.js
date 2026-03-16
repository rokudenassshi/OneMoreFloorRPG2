const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const SAVE_COLLECTION = "userSaves";
const SAVE_SCHEMA = "one_more_floor_rpg_autosave_v1";

// ✅ “シリアルコード → 解放キー” をサーバー側に置く（クライアントには公開しない）
// ランダム文字列部分は固定（外部から推測されにくくするために付与）
const serialCodeLookup = {
  // `OMFPRG1` + 英数字10文字（固定）: 前世の記憶（経験値+20%）
  omfprg1h30n98jqmo: "pastLifeMemory",

  // `stay` + 英数字10文字（固定）: 現在階層連戦モード解放
  stay8q2m1v7xk9: "stayBattle",

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

exports.loadUserGameData = functions
  .region("us-central1")
  .https.onCall(async (_, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "auth required");
    }

    const snap = await db.collection(SAVE_COLLECTION).doc(uid).get();
    if (!snap.exists) {
      return { ok: true, hasSave: false };
    }

    const data = snap.data() || {};
    const payload = data.payload;

    if (!payload || payload.schema !== SAVE_SCHEMA) {
      return { ok: true, hasSave: false };
    }

    return {
      ok: true,
      hasSave: true,
      payload,
      updatedAt: data.updatedAt || null,
    };
  });

exports.saveUserGameData = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "auth required");
    }

    const payload = data?.payload;
    if (!payload || typeof payload !== "object") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "payload required",
      );
    }
    if (payload.schema !== SAVE_SCHEMA) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "invalid schema",
      );
    }

    await db.collection(SAVE_COLLECTION).doc(uid).set(
      {
        payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  });
