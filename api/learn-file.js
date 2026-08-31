import Busboy from "busboy";
import pdfParse from "pdf-parse";
import {
  getDb,
  isPasswordCorrect,
  json,
  saveKnowledge,
  safeError
} from "../lib/server.js";

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    bb.on("field", (name, value) => { fields[name] = value; });

    bb.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("end", () => files.push({
        filename: info.filename,
        mimeType: info.mimeType,
        buffer: Buffer.concat(chunks)
      }));
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));
    req.pipe(bb);
  });
}

function extractPairs(text) {
  const lines = text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const q = lines[i].match(
      /^(?:q(?:uestion)?\s*\d*\s*[:.)-]|\d+[.)-]|question\s*:)\s*(.+)$/i
    );

    if (q) {
      const question = q[1].trim();
      let answer = lines[i + 1]
        .replace(/^(?:a(?:nswer)?\s*[:.)-])\s*/i, "")
        .trim();

      if (question && answer) items.push({ question, answer });
    }
  }

  // Also support "Question: ... / Answer: ..." blocks.
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^question\s*:/i.test(lines[i]) && /^answer\s*:/i.test(lines[i + 1])) {
      items.push({
        question: lines[i].replace(/^question\s*:/i, "").trim(),
        answer: lines[i + 1].replace(/^answer\s*:/i, "").trim()
      });
    }
  }

  const seen = new Set();
  return items.filter(item => {
    const key = item.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!isPasswordCorrect(req)) return json(res, 401, { error: "Developer login required" });

  try {
    const { fields, files } = await parseMultipart(req);
    const file = files[0];

    if (!file) return json(res, 400, { error: "No file received" });
    if (file.buffer.length > 8 * 1024 * 1024) {
      return json(res, 413, { error: "File is larger than 8 MB" });
    }

    const name = file.filename || "uploaded-file";
    const lower = name.toLowerCase();
    let text = "";

    if (lower.endsWith(".txt") || file.mimeType === "text/plain") {
      text = file.buffer.toString("utf8");
    } else if (lower.endsWith(".pdf") || file.mimeType === "application/pdf") {
      text = (await pdfParse(file.buffer)).text;
    } else {
      return json(res, 415, { error: "Only TXT and PDF files are supported" });
    }

    text = text
      .replace(/\u0000/g, "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const items = extractPairs(text);

    if (!items.length) {
      return json(res, 422, {
        error: "No separate Q&A pairs were found. Use Question: / Answer: format or numbered questions."
      });
    }

    const db = getDb();
    const topic = String(fields.topic || name).trim();
    const ids = [];

    for (const item of items) {
      ids.push(await saveKnowledge(
        db, topic, item.question, item.answer, name,
        { category: "File Learning", type: "file_qa" }
      ));
    }

    return json(res, 200, {
      success: true,
      filename: name,
      pairs: items.length,
      knowledgeIds: ids
    });
  } catch (error) {
    return json(res, 500, { error: safeError(error) });
  }
}
