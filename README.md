# Learning AI — No OpenAI Key

This project is intentionally designed to work WITHOUT an OpenAI API key.

## Files
- `index.html` — password screen + chat UI
- `style.css` — high-level responsive UI
- `app.js` — frontend logic, password gate, voice, feedback, JSON import
- `api/ask.js` — Vercel ask endpoint using the built-in knowledge engine
- `package.json` — minimal project config

## Developer password
Default password:
`learning123`

Change it near the top of `app.js`:
`const DEVELOPER_PASSWORD = "learning123";`

This is a client-side gate. It is suitable for a private/demo project, but it is NOT a secure authentication system because browser code can be inspected.

## Vercel deployment
Upload the project as-is. Do NOT add a custom `functions` runtime such as `now-php@...`.

There is intentionally no `vercel.json` because Vercel automatically detects `api/ask.js` as a Node.js serverless function.

## API
GET:
`/api/ask?question=What%20is%20the%20heart%3F`

POST JSON:
`{"question":"How does Arduino work?"}`

POST for "No" improvement:
`{"question":"How does Arduino work?","improve":true,"previousAnswer":"..."}`

No OpenAI key is read or required.


## Login note
The default developer password is `learning123`. The login trims accidental spaces, and the 👁 button lets you verify what was typed.
