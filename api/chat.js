import {
  getDb,
  isPasswordCorrect,
  json,
  searchKnowledge,
  saveKnowledge,
  saveConversation,
  callOptionalOpenAI,
  safeError
} from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!isPasswordCorrect(req)) return json(res, 401, { error: "Developer login required" });

  try {
    const db = getDb();
    const message = String(req.body?.message || "").trim();
    const previousQuestion = String(req.body?.previousQuestion || "").trim();
    const teaching = Boolean(req.body?.isTeachingReply);

    if (!message) return json(res, 400, { error: "message is required" });

    // Teaching an answer to the previous unknown question.
    if (teaching && previousQuestion) {
      const knowledgeId = await saveKnowledge(
        db, "Self Study", previousQuestion, message,
        "Chat self-study", { category: "Learned Knowledge", type: "qa" }
      );

      const answer = "Thanks! 🧠 I learned that answer and saved it.";
      const conversationId = await saveConversation(db, message, answer, { knowledgeId });

      return json(res, 200, {
        success: true, answer, learned: true, knowledgeId, conversationId
      });
    }

    // Explicit correction: "No, correct answer is ..."
    const correction = message.match(
      /^(?:no[,\s:-]*)?(?:the\s+)?correct\s+answer\s+is\s*[:\-]?\s*(.+)$/is
    );

    if (correction && previousQuestion) {
      const answer = correction[1].trim();
      const matches = await searchKnowledge(db, previousQuestion);
      const originalId = matches[0]?.score >= 0.25 ? matches[0].id : "";

      const knowledgeId = await saveKnowledge(
        db, "Corrections", previousQuestion, answer,
        "User correction",
        {
          category: "Corrections",
          type: "correction",
          originalKnowledgeId: originalId
        }
      );

      const reply = `You're right. 🧠 I corrected my answer and learned the new answer.`;
      const conversationId = await saveConversation(db, message, reply, { knowledgeId });

      return json(res, 200, {
        success: true, answer: reply, learned: true, knowledgeId, conversationId
      });
    }

    const matches = await searchKnowledge(db, message);
    const best = matches[0];

    if (!best || best.score < 0.34) {
      const answer = `I don't know about "${message}" yet. If you know the answer, tell me and I will learn it. 🧠`;
      const conversationId = await saveConversation(db, message, answer);
      return json(res, 200, {
        success: true, answer, unknown: true,
        askedQuestion: message, conversationId
      });
    }

    const generated = await callOptionalOpenAI(message, matches);
    const answer = generated || best.answer;
    const conversationId = await saveConversation(db, message, answer, {
      knowledgeId: best.id
    });

    return json(res, 200, {
      success: true,
      answer,
      confidence: best.score,
      source: "Firestore",
      knowledgeId: best.id,
      conversationId
    });
  } catch (error) {
    return json(res, 500, { error: safeError(error) });
  }
}
