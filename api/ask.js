import {
  getDb,
  json,
  searchKnowledge,
  callOptionalOpenAI,
  safeError
} from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const question = req.method === "GET"
      ? String(req.query?.question || "").trim()
      : String(req.body?.question || "").trim();

    if (!question) {
      return json(res, 400, { error: "question is required" });
    }

    const db = getDb();
    const matches = await searchKnowledge(db, question);
    const best = matches[0];

    if (!best || best.score < 0.34) {
      return json(res, 200, { answer: "I don't know about it" });
    }

    // Optional OpenAI enhancement. No key = Firebase learned answer is used.
    const generated = await callOptionalOpenAI(question, matches);
    return json(res, 200, {
      answer: generated || best.answer
    });
  } catch (error) {
    return json(res, 500, { error: safeError(error) });
  }
}
