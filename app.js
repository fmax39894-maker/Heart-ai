const $ = id => document.getElementById(id);

let password = "";
let unknownQuestion = "";
let waitingForTeaching = false;
let lastTurn = null;
let editingTurn = null;

const API_CODE = `const response = await fetch("${location.origin}/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "What is the heart?"
  })
});

const data = await response.json();
console.log(data.answer);`;

function setStatus(text, error = false) {
  $("status").classList.toggle("error", error);
  $("status").querySelector("span").textContent = text;
}

function addMessage(text, who = "bot", turn = null) {
  const el = document.createElement("div");
  el.className = `message ${who}`;
  el.textContent = text;
  if (turn) turn.appendChild(el);
  else $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
  return el;
}

function addTurn(userText, botText, meta = {}) {
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.dataset.conversationId = meta.conversationId || "";
  turn.dataset.knowledgeId = meta.knowledgeId || "";
  turn.dataset.question = userText;
  turn.dataset.answer = botText;

  addMessage(userText, "user", turn);
  addMessage(botText, "bot", turn);

  const actions = document.createElement("div");
  actions.className = "turn-actions";

  const edit = document.createElement("button");
  edit.className = "action-button";
  edit.type = "button";
  edit.textContent = "✏ Edit";
  edit.onclick = () => openEdit(turn);

  const undo = document.createElement("button");
  undo.className = "action-button";
  undo.type = "button";
  undo.textContent = "↩ Remove";
  undo.onclick = () => undoTurn(turn, undo);

  actions.append(edit, undo);
  turn.appendChild(actions);
  $("messages").appendChild(turn);
  $("messages").scrollTop = $("messages").scrollHeight;
  lastTurn = turn;
  return turn;
}

function typing(on) {
  $("typing").classList.toggle("hidden", !on);
}

async function login() {
  const p = $("password").value;
  if (!p) {
    $("loginMessage").textContent = "Enter the developer password.";
    return;
  }

  $("loginButton").disabled = true;
  $("loginMessage").textContent = "";

  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "x-developer-password": p }
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok) {
      $("loginMessage").textContent = d.error || `Login failed (${r.status})`;
      $("loginButton").disabled = false;
      return;
    }

    password = p;
    sessionStorage.setItem("learningAiUnlocked", "1");

    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    setStatus("Ready");
    addMessage("Hello! 🧠 I'm Learning AI.\nAsk me something from my learned knowledge.");
    $("messageInput").focus();
  } catch (e) {
    $("loginMessage").textContent = "Unable to connect to the server.";
    $("loginButton").disabled = false;
  }
}

async function send(e) {
  e.preventDefault();

  const input = $("messageInput");
  const text = input.value.trim();

  if (!text || !password) return;

  input.value = "";
  typing(true);
  setStatus("Thinking…");

  const previousQuestion = unknownQuestion;
  const isTeachingReply = waitingForTeaching;

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-developer-password": password
      },
      body: JSON.stringify({
        message: text,
        previousQuestion,
        isTeachingReply
      })
    });

    const d = await r.json().catch(() => ({}));
    typing(false);

    if (r.status === 401) {
      password = "";
      sessionStorage.removeItem("learningAiUnlocked");
      location.reload();
      return;
    }

    if (!r.ok) {
      setStatus("Server error", true);
      addMessage(d.error || `Request failed (${r.status}).`);
      return;
    }

    setStatus("Ready");
    addTurn(text, d.answer || "No answer returned.", {
      conversationId: d.conversationId,
      knowledgeId: d.knowledgeId
    });

    if (d.unknown) {
      unknownQuestion = d.askedQuestion || text;
      waitingForTeaching = true;
    } else {
      unknownQuestion = "";
      waitingForTeaching = false;
    }
  } catch (e) {
    typing(false);
    setStatus("Connection error", true);
    addMessage("Connection failed. Check that the Vercel deployment is active.");
  }
}

async function undoTurn(turn, button) {
  if (turn.dataset.deleting === "1") return;

  turn.dataset.deleting = "1";
  button.disabled = true;
  button.textContent = "Removing…";

  try {
    const r = await fetch("/api/delete-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-developer-password": password
      },
      body: JSON.stringify({
        conversationId: turn.dataset.conversationId,
        knowledgeId: turn.dataset.knowledgeId,
        deleteKnowledge: false
      })
    });

    const d = await r.json().catch(() => ({}));

    if (r.status === 401) {
      location.reload();
      return;
    }

    if (!r.ok) throw new Error(d.error || "Remove failed");

    if (turn === lastTurn) {
      lastTurn = null;
      unknownQuestion = "";
      waitingForTeaching = false;
    }

    turn.remove();
  } catch (e) {
    button.disabled = false;
    button.textContent = "↩ Remove";
    addMessage(e.message || "Could not remove this turn.");
  }
}

function openEdit(turn) {
  editingTurn = turn;
  $("editAnswer").value = turn.dataset.answer || "";
  $("editMessage").textContent = "";
  $("editModal").classList.remove("hidden");
  setTimeout(() => $("editAnswer").focus(), 50);
}

function closeEdit() {
  $("editModal").classList.add("hidden");
  editingTurn = null;
}

async function saveEdit() {
  if (!editingTurn) return;

  const answer = $("editAnswer").value.trim();
  if (!answer) {
    $("editMessage").textContent = "Enter an answer.";
    return;
  }

  const button = $("saveEdit");
  button.disabled = true;
  $("editMessage").textContent = "Saving and learning…";

  try {
    const r = await fetch("/api/edit-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-developer-password": password
      },
      body: JSON.stringify({
        question: editingTurn.dataset.question,
        answer,
        knowledgeId: editingTurn.dataset.knowledgeId,
        conversationId: editingTurn.dataset.conversationId
      })
    });

    const d = await r.json().catch(() => ({}));

    if (r.status === 401) {
      location.reload();
      return;
    }

    if (!r.ok) throw new Error(d.error || "Save failed");

    editingTurn.dataset.answer = answer;
    editingTurn.dataset.knowledgeId = d.knowledgeId || editingTurn.dataset.knowledgeId;

    const bot = editingTurn.querySelector(".message.bot");
    if (bot) bot.textContent = answer;

    closeEdit();
  } catch (e) {
    $("editMessage").textContent = e.message || "Unable to save.";
  } finally {
    button.disabled = false;
  }
}

async function upload(file) {
  if (!file) return;

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".txt") && !lower.endsWith(".pdf")) {
    showStatus("Only TXT and PDF are supported.");
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    showStatus("File must be 8 MB or smaller.");
    return;
  }

  typing(true);
  showStatus(`Learning ${file.name}…`);

  const form = new FormData();
  form.append("file", file);
  form.append("topic", file.name.replace(/\.[^.]+$/, ""));

  try {
    const r = await fetch("/api/learn-file", {
      method: "POST",
      headers: { "x-developer-password": password },
      body: form
    });

    const d = await r.json().catch(() => ({}));
    typing(false);

    if (r.status === 401) {
      location.reload();
      return;
    }

    if (!r.ok) {
      addMessage(d.error || "Could not learn this file.");
      showStatus("Learning failed.");
      return;
    }

    addMessage(`📚 Learned ${d.pairs} Q&A pair${d.pairs === 1 ? "" : "s"} from "${d.filename}".`);
    showStatus("Saved to Firestore.");
  } catch (e) {
    typing(false);
    addMessage("Could not upload the file.");
    showStatus("Upload failed.");
  }
}

function showStatus(text) {
  const el = $("fileStatus");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => el.classList.remove("show"), 3500);
}

function openSidebar() {
  $("sidebar").classList.add("open");
  $("overlay").classList.remove("hidden");
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("overlay").classList.add("hidden");
}

function initTheme() {
  const dark = localStorage.getItem("learning-ai-theme") !== "light";
  document.body.classList.toggle("light", !dark);
  $("themeToggle").checked = dark;
}

$("loginButton").onclick = login;
$("password").onkeydown = e => {
  if (e.key === "Enter") login();
};

$("showPassword").onclick = () => {
  const input = $("password");
  input.type = input.type === "password" ? "text" : "password";
};

$("chatForm").onsubmit = send;

$("attachButton").onclick = () => $("fileInput").click();
$("fileInput").onchange = e => {
  upload(e.target.files[0]);
  e.target.value = "";
};

$("menuButton").onclick = openSidebar;
$("closeSidebar").onclick = closeSidebar;
$("overlay").onclick = closeSidebar;

$("themeToggle").onchange = e => {
  localStorage.setItem("learning-ai-theme", e.target.checked ? "dark" : "light");
  document.body.classList.toggle("light", !e.target.checked);
};

$("apiCode").textContent = API_CODE;

$("copyApi").onclick = async () => {
  try {
    await navigator.clipboard.writeText(API_CODE);
    $("copyMessage").textContent = "Copied!";
  } catch {
    $("copyMessage").textContent = "Copy failed.";
  }
  setTimeout(() => $("copyMessage").textContent = "", 1800);
};

$("closeEdit").onclick = closeEdit;
$("cancelEdit").onclick = closeEdit;
$("saveEdit").onclick = saveEdit;
$("editModal").onclick = e => {
  if (e.target === $("editModal")) closeEdit();
};

initTheme();
