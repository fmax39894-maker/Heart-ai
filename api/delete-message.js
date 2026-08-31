import { getDb, isPasswordCorrect, json, safeError } from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!isPasswordCorrect(req)) return json(res, 401, { error: "Developer login required" });

  try {
    const db = getDb();
    const conversationId = String(req.body?.conversationId || "").trim();
    const knowledgeId = String(req.body?.knowledgeId || "").trim();
    const deleteKnowledge = Boolean(req.body?.deleteKnowledge);

    if (conversationId) {
      await db.collection("conversations").doc(conversationId).delete();
    }

    if (deleteKnowledge && knowledgeId) {
      await db.collection("knowledge").doc(knowledgeId).delete();
    }

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { error: safeError(error) });
  }
}
