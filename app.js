(() => {
  "use strict";

  // Change this one value if you want a different developer password.
  // This is a client-side gate, not a secure server authentication system.
  const DEVELOPER_PASSWORD = "learning123";

  const $ = (id) => document.getElementById(id);
  const loginScreen = $("loginScreen");
  const app = $("app");
  const loginForm = $("loginForm");
  const password = $("password");
  const showPassword = $("showPassword");
  if (showPassword) {
    showPassword.addEventListener("click", () => {
      const visible = password.type === "text";
      password.type = visible ? "password" : "text";
      showPassword.textContent = visible ? "👁" : "🙈";
    });
  }
  const loginMessage = $("loginMessage");
  const messages = $("messages");
  const input = $("messageInput");
  const form = $("chatForm");
  const sendButton = $("sendButton");
  const typing = $("typing");
  const statusPill = $("statusPill");
  const statusText = statusPill.querySelector("span");

  let knowledge = [
    {keys:["purpose","aim","project about","why did you make"],answer:"The purpose of this project is to demonstrate how a working heart model, health sensors, Arduino control, Bluetooth communication and an AI-style assistant can work together in one educational system."},
    {keys:["arduino","microcontroller"],answer:"Arduino acts as the main controller. It receives information from sensors and controls connected components according to the program."},
    {keys:["bp","blood pressure","blood pressure monitor"],answer:"The BP section is designed to display systolic and diastolic blood-pressure readings. In a real medical device, readings should come from a properly calibrated medical-grade sensor."},
    {keys:["spo2","oxygen","oxygen level","pulse oximeter"],answer:"SpO₂ means peripheral oxygen saturation. A pulse-oximeter estimates blood oxygen saturation and pulse rate. This project is an educational prototype, not a medical diagnostic device."},
    {keys:["sensor","sensors"],answer:"Depending on the project version, sensors can include a pulse/SpO₂ sensor and other inputs connected to Arduino. The exact sensor list can be changed through the imported knowledge JSON."},
    {keys:["bluetooth","phone","mobile"],answer:"Bluetooth can connect the Arduino system to a phone so the phone can display readings and send control commands."},
    {keys:["ai","artificial intelligence","assistant"],answer:"The assistant receives a written or spoken question, searches the project's knowledge, and returns a relevant educational answer. This no-key version does not call OpenAI or any paid AI service."},
    {keys:["working heart","heart model","pump","light","cooling"],answer:"The working heart model demonstrates heart-related movement and controls. A pump or light can be controlled electronically depending on the hardware connected to Arduino."},
    {keys:["presentation","explain project","how to explain"],answer:"For a presentation, explain the project in four parts: the problem, the hardware, how Arduino and the sensors work together, and how the phone/assistant makes the system easier to interact with."},
    {keys:["battery","3.7v","power"],answer:"A 3.7V battery can be used only when the connected electronics receive the correct regulated voltage and current. Do not connect a battery directly to a component unless its voltage requirements are compatible."},
    {keys:["heart","what is the heart"],answer:"The heart is a muscular organ that pumps blood through the body. It helps deliver oxygen and nutrients and carries carbon dioxide and other waste away from tissues."}
  ];

  let lastQuestion = "";
  let lastAnswer = "";
  let lastAnswerRow = null;
  let requestBusy = false;

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/[?!.,;:()[\]{}]/g," ").replace(/\s+/g," ").trim();
  }

  function localAnswer(question, forceImprove = false) {
    const text = normalize(question);
    let best = null, score = 0;

    for (const item of knowledge) {
      let current = 0;
      for (const key of item.keys) {
        const k = normalize(key);
        if (k && text.includes(k)) current += Math.max(1, k.length / 8);
      }
      if (current > score) { score = current; best = item; }
    }

    if (best) {
      if (!forceImprove) return best.answer;
      return improve(best.answer, question);
    }

    const topic = text || "your question";
    return `I do not have a trained answer for "${topic}" yet. Add a question and answer through Menu → Import JSON, then ask it again.`;
  }

  function improve(answer, question) {
    if (!answer) return localAnswer(question, false);
    const clean = answer.trim();
    return clean
      .replace(/^The purpose of this project is to /i, "This project ")
      .replace(/\s+/g, " ")
      .replace(/\.$/, "") + ".";
  }

  function setStatus(text, busy=false) {
    statusText.textContent = text;
    statusPill.classList.toggle("busy", busy);
  }

  function addMessage(text, who="assistant", source="") {
    const row = document.createElement("div");
    row.className = "msg-row " + who;
    const wrap = document.createElement("div");
    wrap.className = "answer-wrap";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrap.appendChild(bubble);
    if (source) {
      const meta = document.createElement("div");
      meta.className = "answer-meta";
      meta.textContent = source;
      wrap.appendChild(meta);
    }
    row.appendChild(wrap);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function speak(text) {
    if (!$("speakToggle").checked || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.96;
    u.pitch = 1;
    u.volume = 1;
    speechSynthesis.speak(u);
  }

  async function ask(question, improveMode=false) {
    const q = String(question || "").trim();
    if (!q || requestBusy) return;
    requestBusy = true;
    sendButton.disabled = true;
    setStatus("Thinking...", true);
    typing.classList.remove("hidden");

    if (!improveMode) {
      addMessage(q, "user");
      input.value = "";
      autoResize();
    }

    lastQuestion = q;

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({question:q, improve:improveMode, previousAnswer:lastAnswer})
      });

      let data = null;
      try { data = await response.json(); } catch (_) {}

      if (!response.ok || !data || typeof data.answer !== "string") {
        throw new Error((data && data.error) || `HTTP ${response.status}`);
      }

      lastAnswer = data.answer;
      if (lastAnswerRow) lastAnswerRow.classList.remove("latest-answer");
      lastAnswerRow = addMessage(lastAnswer, "assistant", data.source || "Built-in knowledge");
      lastAnswerRow.classList.add("latest-answer");
      speak(lastAnswer);
    } catch (error) {
      // Never show an OpenAI-key error. The local engine keeps the app usable.
      const fallback = localAnswer(q, improveMode);
      lastAnswer = fallback;
      if (lastAnswerRow) lastAnswerRow.classList.remove("latest-answer");
      lastAnswerRow = addMessage(fallback, "assistant", "Offline knowledge engine");
      lastAnswerRow.classList.add("latest-answer");
    } finally {
      requestBusy = false;
      sendButton.disabled = false;
      typing.classList.add("hidden");
      setStatus("Ready", false);
      input.focus();
    }
  }

  function openDrawer() {
    $("drawer").classList.add("open");
    $("drawer").setAttribute("aria-hidden","false");
    $("drawerBackdrop").classList.add("open");
  }
  function closeDrawer() {
    $("drawer").classList.remove("open");
    $("drawer").setAttribute("aria-hidden","true");
    $("drawerBackdrop").classList.remove("open");
  }

  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 130) + "px";
  }

  function loadKnowledge(data) {
    const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
    const converted = items.map(item => {
      const question = String(item.question || item.q || item.prompt || "").trim();
      const answer = String(item.answer || item.a || "").trim();
      return {
        keys: question ? question.split(/\s+/).filter(w => w.length > 2) : [],
        answer
      };
    }).filter(x => x.keys.length && x.answer);

    if (!converted.length) throw new Error("JSON must contain items with question and answer.");
    knowledge = [...knowledge, ...converted];
  }

  // Login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (password.value.trim() === DEVELOPER_PASSWORD) {
      sessionStorage.setItem("learning_ai_unlocked","1");
      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");
      password.value = "";
      setStatus("Ready");
      input.focus();
    } else {
      loginMessage.textContent = "Incorrect developer password.";
      password.select();
    }
  });

  if (sessionStorage.getItem("learning_ai_unlocked") === "1") {
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
  }

  $("menuButton").addEventListener("click", openDrawer);
  $("closeDrawer").addEventListener("click", closeDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDrawer();
  });

  $("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("learning_ai_unlocked");
    closeDrawer();
    app.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    password.focus();
  });

  $("glowToggle").addEventListener("change", e => document.body.classList.toggle("glow-off", !e.target.checked));
  $("borderToggle").addEventListener("change", e => document.body.classList.toggle("border-off", !e.target.checked));

  form.addEventListener("submit", e => {
    e.preventDefault();
    ask(input.value);
  });

  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll("[data-question]").forEach(btn => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.question;
      autoResize();
      input.focus();
    });
  });

  $("yesBtn").addEventListener("click", () => {
    if (!lastAnswer) return;
    setStatus("Answer marked perfect");
    setTimeout(() => setStatus("Ready"), 1000);
  });

  $("noBtn").addEventListener("click", () => {
    if (!lastQuestion) return;
    const previous = lastAnswer || "";
    addMessage("No — please improve the previous answer.", "user");
    ask(lastQuestion, true);
    if (previous) lastAnswer = previous;
  });

  // Import JSON
  $("importJsonButton").addEventListener("click", () => $("jsonInput").click());
  $("jsonInput").addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      loadKnowledge(data);
      $("importStatus").textContent = "Imported successfully. New knowledge is active.";
      $("importStatus").style.color = "#55ddb0";
    } catch (err) {
      $("importStatus").textContent = "Import failed: " + err.message;
      $("importStatus").style.color = "#ff8da4";
    } finally {
      e.target.value = "";
    }
  });

  $("testApiButton").addEventListener("click", async () => {
    const out = $("apiTestStatus");
    out.textContent = "Testing /api/ask...";
    try {
      const r = await fetch("/api/ask?question=What%20is%20the%20heart%3F");
      const d = await r.json();
      if (!r.ok || !d.answer) throw new Error(d.error || "Endpoint failed");
      out.textContent = "✓ Ask endpoint is working.";
      out.style.color = "#55ddb0";
    } catch (e) {
      out.textContent = "Endpoint unavailable. The app will use local fallback.";
      out.style.color = "#ffb3c2";
    }
  });

  // Movable feedback panel
  const dock = $("feedbackDock");
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function startDrag(clientX, clientY) {
    const r = dock.getBoundingClientRect();
    dragging = true;
    startX = clientX; startY = clientY;
    startLeft = r.left; startTop = r.top;
    dock.style.right = "auto";
    dock.style.bottom = "auto";
    dock.style.left = r.left + "px";
    dock.style.top = r.top + "px";
  }
  function moveDrag(clientX, clientY) {
    if (!dragging) return;
    const x = Math.max(5, Math.min(window.innerWidth - dock.offsetWidth - 5, startLeft + clientX - startX));
    const y = Math.max(5, Math.min(window.innerHeight - dock.offsetHeight - 5, startTop + clientY - startY));
    dock.style.left = x + "px";
    dock.style.top = y + "px";
  }
  function endDrag(){ dragging = false; }

  dock.addEventListener("pointerdown", e => {
    if (e.target.closest(".feedback")) return;
    dock.setPointerCapture(e.pointerId);
    startDrag(e.clientX,e.clientY);
  });
  dock.addEventListener("pointermove", e => moveDrag(e.clientX,e.clientY));
  dock.addEventListener("pointerup", endDrag);
  dock.addEventListener("pointercancel", endDrag);

  // Voice input
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition) {
    const rec = new Recognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    $("micButton").addEventListener("click", () => {
      try { rec.start(); setStatus("Listening...", true); } catch (_) {}
    });
    rec.onresult = e => {
      let t = "";
      for (let i=e.resultIndex;i<e.results.length;i++) t += e.results[i][0].transcript;
      input.value = t; autoResize();
    };
    rec.onend = () => setStatus("Ready");
    rec.onerror = () => setStatus("Voice unavailable");
  } else {
    $("micButton").title = "Speech recognition is not supported in this browser";
  }

  autoResize();
})();
