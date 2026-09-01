const K=[
["hello hi hey","Hello! I’m **Learning AI**. Ask me anything about the educational heart project, Arduino, sensors, BP/SpO₂, Bluetooth, or the AI assistant."],
["purpose aim project about","The purpose of this project is to demonstrate how a working heart model, health sensors, Arduino control, Bluetooth communication and an educational AI assistant can work together in one system."],
["arduino microcontroller","**Arduino** acts as the main controller. It receives information from sensors and controls connected components according to the program."],
["bp blood pressure","The BP section is designed to display systolic and diastolic readings. For real medical decisions, readings should come from a properly calibrated medical device; this project is an educational prototype."],
["spo2 oxygen pulse oximeter","**SpO₂** means peripheral oxygen saturation. A pulse-oximeter sensor estimates oxygen saturation and pulse rate. This project is an educational prototype, not a medical diagnostic device."],
["sensor sensors","Depending on the hardware version, sensors can include a pulse/SpO₂ sensor and other inputs connected to Arduino."],
["bluetooth phone mobile","Bluetooth can connect the Arduino system to a phone so the phone can display readings and send control commands."],
["ai artificial intelligence assistant","The assistant receives a written question, checks the built-in learning knowledge and saved contexts, and returns a concise educational answer. It does **not** require an OpenAI API key."],
["heart model working heart pump motor","The working heart model demonstrates heart-related movement and control. A pump or motor can be controlled electronically depending on the hardware connected to Arduino."],
["presentation explain project","For a presentation, explain four parts: **the problem**, **the hardware**, **how Arduino and sensors work together**, and **how the phone/AI assistant makes the system easier to interact with**."],
["battery 3.7v 18650","A 3.7 V battery can be used with suitable charging and voltage-conversion modules. The exact power path depends on the voltage requirements of each component."],
["firebase","Firebase can be used for authentication and cloud data storage. This chat version does not require Firebase or an OpenAI key to answer its built-in educational questions."]
];
function n(s){return String(s||"").toLowerCase().replace(/[^a-z0-9\s./+-]/g," ").replace(/\s+/g," ").trim()}
function score(q,keys){const x=n(q);return keys.split(/\s+/).reduce((z,k)=>z+(x.includes(k)?(k.length>4?3:1):0),0)}
function findAnswer(q,learned,avoid=""){let best=null,bs=0;for(const [keys,a] of K){const s=score(q,keys);if(s>bs){bs=s;best=a}}for(const x of Array.isArray(learned)?learned:[]){if(x?.question&&x?.answer){const s=score(q,x.question);if(s>bs){bs=s;best=x.answer}}}return best||null}

module.exports=(req,res)=>{
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    let b=req.body;if(typeof b==="string"){try{b=JSON.parse(b)}catch{b={}}}
    const q=String(b?.question||"").trim();
    if(!q)return res.status(400).json({error:"Question is required."});
    const learned=Array.isArray(b?.learned)?b.learned:[];
    const previous=String(b?.previousAnswer||"");
    const isNo=String(b?.feedback||"").toUpperCase().startsWith("NO");
    let answer=findAnswer(q,learned,previous);

    if(isNo){
      // Only return an automatic replacement when it is genuinely different
      // from the answer the user rejected. Otherwise the frontend enters the
      // teaching flow and treats the next user message as the correction.
      if(answer && answer.trim()!==previous.trim()){
        return res.status(200).json({ok:true,answer,unknown:false,learned:true,engine:"built-in-learning-engine"});
      }
      return res.status(200).json({
        ok:true,answer:"",unknown:true,needsTeaching:true,
        engine:"built-in-learning-engine"
      });
    }

    if(!answer){
      return res.status(200).json({
        ok:true,answer:"I don’t know that yet. Please send the correct answer in your next message, and I’ll learn it for this question.",
        unknown:true,needsTeaching:true,engine:"built-in-learning-engine"
      });
    }

    return res.status(200).json({ok:true,answer,unknown:false,engine:"built-in-learning-engine"});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:"The Ask endpoint failed."});
  }
};
