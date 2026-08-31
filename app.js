(()=>{"use strict";
const $=id=>document.getElementById(id);
const loginScreen=$("loginScreen"),app=$("app"),loginForm=$("loginForm"),password=$("password"),loginMessage=$("loginMessage");
const chat=$("chat"),input=$("messageInput"),composer=$("composer"),typing=$("typing"),statusPill=$("connectionDot"),statusText=$("statusText"),drawer=$("drawer"),backdrop=$("drawerBackdrop"),feedbackDock=$("feedbackDock");
let unlocked=false,history=[],editingIndex=-1,lastAiIndex=-1,pendingTeachQuestion="";
const CK="learning_ai_chat_v4",SK="learning_ai_settings_v4",LK="learning_ai_learned_v4",PEND="learning_ai_pending_question_v1";
const OLD_CK=["learning_ai_chat_v3","learning_ai_chat_v2"],OLD_SK=["learning_ai_settings_v3","learning_ai_settings_v2"],OLD_LK=["learning_ai_learned_v3","learning_ai_learned_v2"];
const defaults={dark:true,gradient:true,vfx:true,fade:true,multiple:false,feedback:false};
function firstStored(keys){for(const k of keys){const v=localStorage.getItem(k);if(v!==null)return v}return null}
function settings(){try{const raw=localStorage.getItem(SK)??firstStored(OLD_SK);return {...defaults,...JSON.parse(raw||"{}")} }catch{return {...defaults}}}
function saveSettings(s){localStorage.setItem(SK,JSON.stringify(s))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmt(s){return esc(s).replace(/\*\*(.+?)\*\*/gs,"<strong>$1</strong>").replace(/__([^_]+)__/gs,"<strong>$1</strong>").split(/\r?\n/).map(x=>x||"&nbsp;").join("<br>")}
function persist(){localStorage.setItem(CK,JSON.stringify(history))}
function load(){try{const raw=localStorage.getItem(CK);if(raw!==null){history=JSON.parse(raw||"[]")}else{const old=firstStored(OLD_CK);history=old?JSON.parse(old):[{role:"assistant",text:"Hello! I’m **Learning AI**. Ask me a question about your project, Arduino, sensors, BP/SpO₂, Bluetooth, or the working heart model.",ts:Date.now()}];if(!old)persist()}}catch{history=[]}pendingTeachQuestion=localStorage.getItem(PEND)||"";lastAiIndex=history.reduce((n,m,i)=>m.role==="assistant"?i:n,-1);render()}
function render(){chat.innerHTML="";history.forEach((m,i)=>bubble(m.role,m.text,i,false));chat.scrollTop=chat.scrollHeight}
function bubble(role,text,i,animate=true){const row=document.createElement("div");row.className="message "+(role==="user"?"user":"ai")+(animate?" new-message":"");const wrap=document.createElement("div");wrap.className="message-wrap";const b=document.createElement("div");b.className="bubble markdown";b.innerHTML=fmt(text);wrap.appendChild(b);const meta=document.createElement("div");meta.className="meta";meta.textContent=role==="user"?"You":"Learning AI";wrap.appendChild(meta);if(role==="assistant"){const t=document.createElement("div");t.className="ai-tools";const e=document.createElement("button");e.type="button";e.textContent="Edit";e.onclick=()=>openEdit(i);const c=document.createElement("button");c.type="button";c.textContent="Copy";c.onclick=async()=>{try{await navigator.clipboard.writeText(text);c.textContent="Copied"}catch{c.textContent="Copy failed"}setTimeout(()=>c.textContent="Copy",900)};t.append(e,c);wrap.appendChild(t)}row.appendChild(wrap);chat.appendChild(row);return row}
function add(role,text){history.push({role,text,ts:Date.now()});persist();bubble(role,text,history.length-1,true);if(role==="assistant")lastAiIndex=history.length-1;chat.scrollTop=chat.scrollHeight}
function replaceAssistant(i,text){if(i<0||!history[i]||history[i].role!=="assistant")return;history[i].text=text;history[i].ts=Date.now();persist();render();lastAiIndex=i}
function status(t,on=false){statusText.textContent=t;statusPill.classList.toggle("online",on)}
function setTyping(v){typing.classList.toggle("hidden",!v);if(v)status("Thinking…");else status("Ready",true)}
function openDrawer(){drawer.classList.add("open");backdrop.classList.add("open")}
function closeDrawer(){drawer.classList.remove("open");backdrop.classList.remove("open")}
$("menuButton").onclick=openDrawer;$("closeDrawer").onclick=closeDrawer;backdrop.onclick=closeDrawer;
$("showPassword").onclick=()=>password.type=password.type==="password"?"text":"password";
loginForm.onsubmit=async e=>{e.preventDefault();loginMessage.textContent="";try{const r=await fetch("/api/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:password.value})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||"Incorrect developer password.");unlocked=true;loginScreen.classList.add("hidden");app.classList.remove("hidden");load();apply();status("Connected",true);input.focus()}catch(err){loginMessage.textContent=err.message||"Unable to unlock."}};
function setProgress(n){$("progressBar").style.width=n+"%";$("progressLabel").textContent=n+"%"}
function readLearned(){try{return JSON.parse(localStorage.getItem(LK)??firstStored(OLD_LK)??"[]")}catch{return []}}
function saveLearned(l){localStorage.setItem(LK,JSON.stringify(l))}
function unknownAnswer(text){return /^i (don[’']t|do not) (have|know)|no saved answer|couldn[’']t find/i.test(text)}
async function ask(q,feedback="",options={}){q=q.trim();if(!q||!unlocked)return;
 if(pendingTeachQuestion){
   if(options.forceQuestion!==true){
     add("user",q);input.value="";resize();
     const learned=readLearned();learned.push({question:pendingTeachQuestion,answer:q,createdAt:Date.now()});saveLearned(learned);const taughtQuestion=pendingTeachQuestion;localStorage.removeItem(PEND);pendingTeachQuestion="";
     add("assistant",`Thanks — I learned this.\n\n**Question:** ${taughtQuestion}\n**Saved answer:** ${q}`);
     status("Learned",true);return;
   }
 }
 const addUser=options.addUser!==false;if(addUser){lastAiIndex=-1;add("user",q);input.value="";resize()}setTyping(true);setProgress(8);
 try{const body={question:q,history:history.slice(-12),learned:readLearned(),feedback,previousAnswer:options.previousAnswer||""};const r=await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Ask endpoint error.");const answer=d.answer||"I don't know that yet.";setProgress(100);
   if(options.replaceIndex>=0)replaceAssistant(options.replaceIndex,answer);else add("assistant",answer);
   if(d.unknown||unknownAnswer(answer)){pendingTeachQuestion=q;localStorage.setItem(PEND,q);status("Waiting for your answer",true);}
 }catch(err){if(options.replaceIndex>=0)replaceAssistant(options.replaceIndex,"**Connection problem:** "+(err.message||"The Ask endpoint could not be reached."));else add("assistant","**Connection problem:** "+(err.message||"The Ask endpoint could not be reached."));status("Endpoint error")}finally{setTyping(false);setTimeout(()=>setProgress(0),650)}}
composer.onsubmit=e=>{e.preventDefault();ask(input.value)};
input.oninput=resize;input.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();composer.requestSubmit()}};
function resize(){input.style.height="auto";input.style.height=Math.min(Math.max(input.scrollHeight,76),220)+"px"}
$("boldButton").onclick=()=>{const a=input.selectionStart,b=input.selectionEnd,t=input.value.slice(a,b)||"bold text";input.setRangeText("**"+t+"**",a,b,"end");input.focus();resize()};
$("yesBtn").onclick=()=>{if(lastAiIndex>=0){status("Answer accepted",true);setTimeout(()=>status("Ready",true),900)}};
$("noBtn").onclick=async()=>{if(lastAiIndex<0)return;const idx=lastAiIndex;const q=[...history.slice(0,idx)].reverse().find(m=>m.role==="user")?.text||"";const previous=history[idx]?.text||"";if(!q)return;await ask(q,"NO: The previous answer was not satisfactory. Re-check the original question and give a better corrected answer. Do not defend the previous answer. Return only the improved answer.",{addUser:false,replaceIndex:idx,previousAnswer:previous,forceQuestion:true})};
function openEdit(i){editingIndex=i;$("editAnswer").value=history[i]?.text||"";$("editMessage").textContent="";$("editModal").classList.remove("hidden")}
function closeEdit(){$("editModal").classList.add("hidden");editingIndex=-1}
$("closeEdit").onclick=closeEdit;$("cancelEdit").onclick=closeEdit;
$("saveEdit").onclick=()=>{if(editingIndex<0)return;const text=$("editAnswer").value.trim();if(!text)return;const mode=document.querySelector('input[name="saveMode"]:checked')?.value||"new";const q=[...history.slice(0,editingIndex)].reverse().find(m=>m.role==="user")?.text||"General learning";if(mode==="existing"){history[editingIndex].text=text;persist();render();$("editMessage").textContent="✓ Existing answer replaced and saved."}else{const l=readLearned();l.push({question:q,answer:text,createdAt:Date.now()});saveLearned(l);$("editMessage").textContent="✓ Saved as new learning context."}setTimeout(closeEdit,800)};
function clearChat(){if(!confirm("Clear all saved chat history from this device?"))return;history=[];lastAiIndex=-1;pendingTeachQuestion="";localStorage.setItem(CK,"[]");localStorage.removeItem(PEND);render();closeDrawer();status("Chat cleared",true);setTimeout(()=>status("Ready",true),900)}
$("clearHistory").onclick=clearChat;$("clearTop").onclick=clearChat;
$("exportChat").onclick=()=>{const t=history.map(m=>(m.role==="user"?"YOU":"LEARNING AI")+":\n"+m.text).join("\n\n"),u=URL.createObjectURL(new Blob([t],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download="learning-ai-chat.txt";a.click();setTimeout(()=>URL.revokeObjectURL(u),500)};
$("lockButton").onclick=()=>{unlocked=false;app.classList.add("hidden");loginScreen.classList.remove("hidden");password.value="";closeDrawer()};
function apply(){const s=settings();$("darkToggle").checked=s.dark;$("gradientToggle").checked=s.gradient;$("sideVfxToggle").checked=s.vfx;$("fadeToggle").checked=s.fade;$("multipleToggle").checked=s.multiple;$("feedbackToggle").checked=s.feedback;document.body.classList.toggle("no-gradient",!s.gradient);document.body.classList.toggle("no-vfx",!s.vfx);document.body.classList.toggle("no-fade",!s.fade);document.body.classList.toggle("light-mode",!s.dark);feedbackDock.classList.toggle("hidden",!s.feedback)}
[["darkToggle","dark"],["gradientToggle","gradient"],["sideVfxToggle","vfx"],["fadeToggle","fade"],["multipleToggle","multiple"],["feedbackToggle","feedback"]].forEach(([id,k])=>$(id).onchange=()=>{const s=settings();s[k]=$(id).checked;saveSettings(s);apply()});
(()=>{const el=feedbackDock,h=el.querySelector(".drag-handle");let down=false,sx=0,sy=0,lx=0,ly=0;h.addEventListener("pointerdown",e=>{down=true;h.setPointerCapture?.(e.pointerId);sx=e.clientX;sy=e.clientY;const r=el.getBoundingClientRect();lx=r.left;ly=r.top;el.style.transition="none"});window.addEventListener("pointermove",e=>{if(!down)return;el.style.left=Math.max(5,Math.min(innerWidth-el.offsetWidth-5,lx+e.clientX-sx))+"px";el.style.top=Math.max(70,Math.min(innerHeight-el.offsetHeight-85,ly+e.clientY-sy))+"px";el.style.right="auto";el.style.bottom="auto"});window.addEventListener("pointerup",()=>{down=false;el.style.transition=""})})();
fetch("/api/health").then(r=>{if(r.ok)status("Connected",true)}).catch(()=>{});apply();
})();