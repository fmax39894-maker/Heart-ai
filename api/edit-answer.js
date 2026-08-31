import {
  getDb,
  isPasswordCorrect,
  json,
  saveKnowledge,
  safeError
} from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!isPasswordCorrect(req)) return json(res, 401, { error: "Developer login required" });

  try {
    const db = getDb();
    const question = String(req.body?.question || "").trim();
    const answer = String(req.body?.answer || "").trim();
    const conversationId = String(req.body?.conversationId || "").trim();
    const oldKnowledgeId = String(req.body?.knowledgeId || "").trim();

    if (!question || !answer) {
      return json(res, 400, { error: "question and answer are required" });
    }

    const knowledgeId = await saveKnowledge(
      db, "Edited Answers", question, answer,
      "Developer edited answer",
      {
        category: "Edited Answers",
        type: "edited",
        originalKnowledgeId: oldKnowledgeId
      }
    );

    if (conversationId) {
      await db.collection("conversations").doc(conversationId).set({
        answer,
        knowledgeId,
        updatedAt: (await import("firebase-admin")).default.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return json(res, 200, { success: true, answer, knowledgeId });
  } catch (error) {
    return json(res, 500, { error: safeError(error) });
  }
}
