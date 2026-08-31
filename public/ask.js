const knowledge = [
  {keys:["purpose","aim","project about","why did you make"],answer:"The purpose of this project is to demonstrate how a working heart model, health sensors, Arduino control, Bluetooth communication and an AI-style assistant can work together in one educational system."},
  {keys:["arduino","microcontroller"],answer:"Arduino acts as the main controller. It receives information from sensors and controls connected components according to the program."},
  {keys:["bp","blood pressure","blood pressure monitor"],answer:"The BP section is designed to display systolic and diastolic blood-pressure readings. In a real medical device, readings should come from a properly calibrated medical-grade sensor."},
  {keys:["spo2","oxygen","oxygen level","pulse oximeter"],answer:"SpO₂ means peripheral oxygen saturation. A pulse-oximeter estimates blood oxygen saturation and pulse rate. This project is an educational prototype, not a medical diagnostic device."},
  {keys:["sensor","sensors"],answer:"Depending on the project version, sensors can include a pulse/SpO₂ sensor and other inputs connected to Arduino."},
  {keys:["bluetooth","phone","mobile"],answer:"Bluetooth can connect the Arduino system to a phone so the phone can display readings and send control commands."},
  {keys:["ai","artificial intelligence","assistant"],answer:"The assistant receives a written or spoken question, searches the project's knowledge, and returns a relevant educational answer. This version does not call OpenAI or require an API key."},
  {keys:["working heart","heart model","pump","light","cooling"],answer:"The working heart model demonstrates heart-related movement and controls. A pump or light can be controlled electronically depending on the hardware connected to Arduino."},
  {keys:["presentation","explain project","how to explain"],answer:"For a presentation, explain the project in four parts: the problem, the hardware, how Arduino and the sensors work together, and how the phone/assistant makes the system easier to interact with."},
  {keys:["battery","3.7v","power"],answer:"A 3.7V battery can be used only when the connected electronics receive the correct regulated voltage and current. Do not connect a battery directly to a component unless its voltage requirements are compatible."},
  {keys:["heart","what is the heart"],answer:"The heart is a muscular organ that pumps blood through the body. It helps deliver oxygen and nutrients and carries carbon dioxide and other waste away from tissues."}
];

function normalize(s){
  return String(s||"").toLowerCase().replace(/[?!.,;:()[\]{}]/g," ").replace(/\s+/g," ").trim();
}

function findAnswer(q){
  const text=normalize(q);
  let best=null,bestScore=0;
  for(const item of knowledge){
    let score=0;
    for(const key of item.keys){
      const k=normalize(key);
      if(k && text.includes(k)) score+=Math.max(1,k.length/8);
    }
    if(score>bestScore){bestScore=score;best=item;}
  }
  if(best) return best.answer;
  return `I do not have a trained answer for "${q}" yet. Add it through Menu → Import JSON.`;
}

function improved(q, previous){
  const base=findAnswer(q);
  if(base===previous && previous) return "Here is a clearer version: " + previous;
  return base;
}

module.exports = (req,res) => {
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");

  if(req.method === "GET"){
    const q = typeof req.query?.question === "string" ? req.query.question : "";
    if(!q) return res.status(200).json({ok:true,service:"Learning AI Ask",keyRequired:false});
    return res.status(200).json({ok:true,answer:findAnswer(q),source:"Built-in knowledge"});
  }

  if(req.method !== "POST"){
    res.setHeader("Allow","GET, POST");
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }

  let body=req.body;
  if(typeof body==="string"){
    try{body=JSON.parse(body)}catch(_){body={}}
  }
  body=body||{};
  const q=typeof body.question==="string" ? body.question.trim() : "";
  if(!q) return res.status(400).json({ok:false,error:"Question is required"});

  const answer=body.improve ? improved(q,typeof body.previousAnswer==="string"?body.previousAnswer:"") : findAnswer(q);
  return res.status(200).json({ok:true,answer,source:"Built-in knowledge",keyRequired:false});
};
