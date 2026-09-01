# Learning AI — Ask (NO feedback learning fix)

A simple Vercel-ready Learning AI web app with a password-protected developer area and a built-in knowledge engine. **No OpenAI API key is required.**

## Important fix: No → Learn

- **Yes** accepts the current answer.
- **No** is treated as a real correction signal.
- The app first asks the built-in engine for a genuinely different saved answer.
- If no better saved answer exists, the app enters **teaching mode** and waits for the user's next message.
- That next message is saved in `localStorage` against the original question.
- Asking the same question later uses the learned answer.
- The pending teaching question also survives a page refresh.

## Vercel deployment

Framework preset: **Other**

Build command: leave empty / disabled
Output directory: leave empty / disabled
Install command: leave empty / disabled
Root directory: project root

The `api/` folder contains Vercel serverless functions:

- `POST /api/unlock`
- `POST /api/ask`
- `GET /api/health`

## Environment variable

Add this in Vercel Project Settings → Environment Variables:

`DEVELOPER_PASSWORD=your-private-password`

No OpenAI key is needed for this version.

## Local testing

This package is intended for Vercel. The API files are plain CommonJS serverless functions.

## Browser storage

Chat history, learned corrections, pending teaching questions, and UI settings are stored locally in the browser using `localStorage`.
