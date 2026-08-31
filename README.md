# Learning AI — Ask (UI updated)

This build keeps the password-protected developer area and the built-in learning Ask endpoint. **No OpenAI API key is required.**

## Vercel
- Framework Preset: **Other**
- Build Command: **empty**
- Output Directory: **empty**
- Install Command: default / automatic
- Environment Variable: `DEVELOPER_PASSWORD` = your chosen developer password

## Main changes
- Smaller **Yes / No** floating feedback widget.
- Feedback widget is **OFF by default** and can be enabled/disabled from **More**.
- Widget remains draggable when enabled.
- **Menu button on the left** opens the More drawer from the left.
- **Clear chat button on the right** clears history.
- Gradient background and animated side VFX controls.
- Fade-in for newly received messages.
- Progress bar stays inside More.
- Edit answer: **Save as new context** or **Replace existing answer**.
- Multiline input and `**bold text**` support.
- Yes accepts the latest answer; No asks the endpoint to improve the latest answer without duplicating the user's question.
- `/api/health` included for deployment testing.

## Files
- `index.html` — UI
- `style.css` — responsive neon/glass UI
- `app.js` — chat, settings, feedback, editing, local history
- `api/ask.js` — built-in learning engine
- `api/unlock.js` — server-side password check
- `api/health.js` — health check
- `vercel.json` — Vercel configuration
- `.env.example` — environment variable example


## v2 fixes
- Clear Chat now clears the persisted chat immediately and keeps it empty after reload.
- Fade Answers is persisted and controls incoming-answer animation.
- Composer is taller and expands up to 220px for long messages.
- Unknown questions enter learning mode: the next user message is saved as the answer for that question.
- Yes/No widget remains off by default and can be enabled from More.
