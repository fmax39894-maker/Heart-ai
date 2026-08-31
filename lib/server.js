import admin from "firebase-admin";

export function getDb() {
  if (!process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Firebase environment variables are not configured");
  }

  if (!admin.apps.length) {
    const privateKey = String(process.env.FIREBASE_PRIVATE_KEY)
      .replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
  }

  return admin.firestore();
}

export function isPasswordCorrect(req) {
  const expected = String(process.env.DEVELOPER_PASSWORD || "");
  const supplied = String(req.headers["x-developer-password"] || "");
  return Boolean(expected && supplied && supplied === expected);
}

export function json(res, status, data) {
  return res.status(status).json(data);
}

export function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function score(question, item) {
  const q = new Set(tokens(question));
  const b = new Set(tokens([
    item.topic,
    item.question,
    item.answer,
    ...(Array.isArray(item.keywords) ? item.keywords : [])
  ].join(" ")));

  if (!q.size) return 0;

  let hits = 0;
  for (const word of q) if (b.has(word)) hits++;

  let result = hits / q.size;

  // Exact/near question matches get a useful boost.
  const qText = String(question).toLowerCase().trim();
  const iText = String(item.question || "").toLowerCase().trim();
  if (qText && iText === qText) result += 0.55;
  else if (qText && (iText.includes(qText) || qText.includes(iText))) result += 0.25;

  if (item.type === "correction" || item.type === "edited") result += 0.08;
  return Math.min(result, 1);
}

export async function searchKnowledge(db, question, limit = 10) {
  const snap = await db.collection("knowledge").limit(1500).get();
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .map(item => ({ ...item, score: score(question, item) }))
    .filter(item => item.score > 0.04)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function saveKnowledge(db, topic, question, answer, source, extra = {}) {
  const q = String(question || "").trim();
  const a = String(answer || "").trim();
  if (!q || !a) throw new Error("question and answer are required");

  const keywords = [...new Set(tokens(`${topic} ${q} ${a}`))]
    .filter(x => x.length > 2)
    .slice(0, 120);

  const ref = await db.collection("knowledge").add({
    topic: String(topic || "General"),
    category: extra.category || "Learned Knowledge",
    type: extra.type || "qa",
    question: q,
    answer: a,
    keywords,
    source: String(source || "Learning AI"),
    ...(extra.originalKnowledgeId ? { originalKnowledgeId: extra.originalKnowledgeId } : {}),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return ref.id;
}

export async function saveConversation(db, question, answer, extra = {}) {
  const ref = await db.collection("conversations").add({
    question: String(question || ""),
    answer: String(answer || ""),
    ...(extra.knowledgeId ? { knowledgeId: extra.knowledgeId } : {}),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

export async function callOptionalOpenAI(question, matches) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key || !matches.length) return null;

  const model = String(process.env.OPENAI_MODEL || "").trim() || "gpt-4o-mini";
  const context = matches.map(x =>
    `Question: ${x.question || ""}\nAnswer: ${x.answer || ""}`
  ).join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are Learning AI. Use only the supplied learned knowledge. " +
            "If the knowledge is insufficient, say exactly: I don't know about it."
        },
        {
          role: "user",
          content: `Question:\n${question}\n\nLearned knowledge:\n${context}`
        }
      ]
    })
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

export function safeError(error) {
  console.error(error);
  return process.env.NODE_ENV === "development"
    ? String(error?.message || error)
    : "Server error";
}
