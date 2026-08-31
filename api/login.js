import { json } from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const expected = String(process.env.DEVELOPER_PASSWORD || "");
  const supplied = String(req.headers["x-developer-password"] || "");

  if (!expected) {
    return json(res, 500, {
      error: "DEVELOPER_PASSWORD is not configured on Vercel."
    });
  }

  if (supplied !== expected) {
    return json(res, 401, {
      success: false,
      error: "Incorrect developer password."
    });
  }

  return json(res, 200, { success: true });
}
