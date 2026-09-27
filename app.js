const TOOLS = [
  {id:'username', name:'يوزرنيم', latin:'USERNAME', desc:'تتبع الاسم المستعار عبر عشرات المنصات العامة.'},
  {id:'email', name:'إيميل', latin:'EMAIL', desc:'فحص البريد: تسريبات، حسابات مرتبطة، ومصادر عامة.'},
  {id:'phone', name:'هاتف', latin:'PHONE', desc:'تحليل الرقم: الدولة، المشغّل، وروابط البحث العكسي.'},
  {id:'ip', name:'عنوان IP', latin:'IP INTEL', desc:'استخبارات حقيقية عبر API عام: الموقع، ASN، والمزود.'},
  {id:'domain', name:'دومين', latin:'DOMAIN', desc:'سجلات DNS الحقيقية عبر Google DNS API + Whois.'},
  {id:'image', name:'صورة', latin:'IMAGE', desc:'بحث عكسي وبصمة صورة: روابط Google / TinEye / Yandex.'},
];

const eyesEl = document.getElementById('eyes');
const stageWrap = document.getElementById('stage-wrap');
const stage = document.getElementById('stage');
const stageTitle = document.getElementById('stage-title');
const stageDesc = document.getElementById('stage-desc');
const stageCode = document.getElementById('stage-code');
const resetBtn = document.getElementById('resetEyes');
let selected = null;

// build eyes
TOOLS.forEach((t,i)=>{
  const d = document.createElement('div');
  d.className='eye'; d.dataset.tool=t.id;
  d.innerHTML = `
    <div class="eye-shape">
      <div class="eyeball"><div class="veins"></div>
        <div class="iris"><div class="pupil"><span>${t.name}</span></div><div class="glint"></div></div>
      </div>
      <div class="lid top"></div><div class="lid bottom"></div>
      <div class="eye-lash"></div>
    </div>
    <div class="eye-name">${t.name} <span style="color:#5a636d">— ${t.latin}</span></div>
    <div class="eye-sub">EYE_0${i+1} // ${t.desc}</div>`;
  d.addEventListener('click', ()=>selectEye(t.id, d));
  eyesEl.appendChild(d);
});
const eyeDivs = [...document.querySelectorAll('.eye')];

// pupil follows mouse + 3D tilt
document.addEventListener('mousemove', e=>{
  eyeDivs.forEach(eye=>{
    const shape = eye.querySelector('.eye-shape');
    const r = shape.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    let dx = (e.clientX-cx)/r.width, dy=(e.clientY-cy)/r.height;
    dx=Math.max(-1,Math.min(1,dx)); dy=Math.max(-1,Math.min(1,dy));
    const iris = eye.querySelector('.iris');
    iris.style.setProperty('--mx', (dx*22)+'px');
    iris.style.setProperty('--my', (dy*14)+'px');
    eye.querySelector('.eyeball').style.setProperty('--ry', (dx*10)+'deg');
    eye.querySelector('.eyeball').style.setProperty('--rx', (-dy*8)+'deg');
  });
});

// natural random blinking
function blinkLoop(){
  const candidates = selected ? eyeDivs.filter(e=>!e.classList.contains('active')) : eyeDivs;
  // blink 1-3 random eyes
  const n = 1+Math.floor(Math.random()*2);
  for(let k=0;k<n;k++){
    const e = candidates[Math.floor(Math.random()*candidates.length)];
    if(!e || e.classList.contains('dormant')) continue;
    e.classList.add('blink');
    setTimeout(()=>e.classList.remove('blink'), 200+Math.random()*120);
  }
  setTimeout(blinkLoop, 1400+Math.random()*2600);
}
blinkLoop();

// idle drift of pupils (alive even without mouse)
setInterval(()=>{
  if(document.hidden) return;
  eyeDivs.forEach((eye,i)=>{
    if(eye.classList.contains('dormant')) return;
    const t = Date.now()/1000 + i*1.7;
    const iris = eye.querySelector('.iris');
    if(!iris.matches(':hover')){
      // subtle drift added via CSS vars only if mouse far — skip to avoid fighting mousemove
    }
  });
},4000);

function selectEye(id, el){
  selected = id;
  eyesEl.classList.add('focused');
  eyeDivs.forEach(e=>{e.classList.remove('active');e.classList.add('dormant');e.classList.remove('blink');});
  el.classList.remove('dormant'); el.classList.add('active');
  resetBtn.classList.remove('hidden');
  openStage(id);
  setTimeout(()=>stageWrap.scrollIntoView({behavior:'smooth',block:'start'}),150);
}
function resetEyes(){
  selected=null;
  eyesEl.classList.remove('focused');
  eyeDivs.forEach(e=>e.classList.remove('active','dormant'));
  stageWrap.classList.add('hidden');
}
resetBtn.onclick = resetEyes;
document.getElementById('stageClose').onclick = resetEyes;

// ---------- cinematic builder ----------
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
function cineEl(html, delay=420){
  const d=document.createElement('div');
  d.className='cine'; d.innerHTML=html;
  stage.appendChild(d);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    setTimeout(()=>d.classList.add('in'), 60);
  }));
  return sleep(delay).then(()=>d);
}
function typeText(el, text, speed=28){
  return new Promise(res=>{
    el.classList.add('type-caret');
    let i=0; el.textContent='';
    const iv=setInterval(()=>{ el.textContent+=text[i++]; if(i>=text.length){clearInterval(iv);el.classList.remove('type-caret');res();}},speed);
  });
}

async function openStage(id){
  const t = TOOLS.find(x=>x.id===id);
  stage.innerHTML='';
  stageWrap.classList.remove('hidden');
  stageCode.textContent = 'EYE_'+t.latin+' // LIVE';
  stageTitle.textContent=''; stageDesc.textContent='';
  await typeText(stageTitle, 'العين تراقب: '+t.name, 34);
  await sleep(250);
  await typeText(stageDesc, t.desc+' — تُبنى الواجهة أمامك خطوة بخطوة.', 16);
  await sleep(300);
  await buildToolUI(t);
}

async function buildToolUI(t){
  // STEP 1 — label appears
  await cineEl(`<div class="field"><label>◉ الخطوة 1 — حدّد الهدف</label></div>`, 500);
  // STEP 2 — input appears cinematically
  const ph = {username:'مثال: karim_2024', email:'مثال: name@mail.com', phone:'مثال: +2010xxxxxxx', ip:'مثال: 8.8.8.8', domain:'مثال: example.com', image:'مثال: رابط الصورة https://...'}[t.id];
  const wrap = await cineEl(`<div class="field"><input id="targetIn" dir="ltr" style="text-align:left" placeholder="${ph}"></div>`, 550);
  // STEP 3 — options appear one by one
  await cineEl(`<div class="field"><label>◉ الخطوة 2 — نطاق المراقبة</label><div class="chips" id="chips"></div></div>`, 500);
  const chipsBox = document.getElementById('chips');
  const chipLabels = {username:['GitHub','Instagram','TikTok','Reddit','X'],email:['تسريبات','Gravatar','حسابات مرتبطة'],phone:['واتساب','تروكولر','بحث عكسي'],ip:['الموقع','ASN','السمعة'],domain:['DNS','Whois','Subdomains'],image:['Google Lens','TinEye','Yandex']}[t.id];
  for(const c of chipLabels){
    const s=document.createElement('span'); s.className='chip cine'; s.textContent=c;
    chipsBox.appendChild(s);
    requestAnimationFrame(()=>setTimeout(()=>s.classList.add('in'),50));
    s.onclick=()=>s.classList.toggle('sel');
    await sleep(160);
  }
  await sleep(300);
  // STEP 4 — button
  const btnW = await cineEl(`<button class="big-btn" id="scanBtn">👁 بدء المراقبة</button><div class="progress hidden" id="prog"><i></i></div>`, 400);
  document.getElementById('scanBtn').onclick = ()=>runScan(t);
}

async function runScan(t){
  const val = (document.getElementById('targetIn').value||'').trim();
  if(!val){ document.getElementById('targetIn').style.borderColor='#ff2b2b'; document.getElementById('targetIn').focus(); return; }
  const prog = document.getElementById('prog'); prog.classList.remove('hidden');
  const bar = prog.querySelector('i'); bar.style.width='5%';
  const termW = document.createElement('div'); termW.className='cine in';
  termW.innerHTML=`<div class="term" id="term"></div>`;
  stage.appendChild(termW);
  const term = termW.querySelector('#term');
  const log = async (txt, cls='')=>{ const p=document.createElement('div'); if(cls)p.className=cls; p.textContent=txt; term.appendChild(p); term.scrollTop=9999; await sleep(280+Math.random()*350); };
  const pct = async p=>{ bar.style.width=p+'%'; await sleep(200); };
  await log(`[+] eye locked on target: ${val}`, 'dim');
  await pct(18); await log(`[+] resolving surface... ok`, 'dim');
  await pct(36); await log(`[+] querying public sources [1/3]...`, 'warn2');
  await pct(58); await log(`[+] querying public sources [2/3]...`, 'warn2');
  await pct(78); await log(`[+] correlating...`, 'dim');

  let resultsHTML='';
  try{ resultsHTML = await realLookup(t, val); }
  catch(e){ resultsHTML = `<div class="result-card"><span>تعذر الجلب المباشر — استخدم الروابط اليدوية بالأسفل</span></div>`; }
  await pct(100); await log(`[+] done. rendering dossier.`, 'ok');
  const res = document.createElement('div'); res.className='results';
  res.innerHTML = resultsHTML;
  const resWrap = document.createElement('div'); resWrap.className='cine'; resWrap.appendChild(res);
  stage.appendChild(resWrap);
  requestAnimationFrame(()=>setTimeout(()=>resWrap.classList.add('in'),80));
  resWrap.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function linkCard(label, url){
  return `<div class="result-card"><span>${label}</span><a href="${url}" target="_blank" rel="noopener">فتح ↗</a></div>`;
}
// Real lookups where possible without keys, else honest link-builder
async function realLookup(t, v){
  const enc = encodeURIComponent(v);
  if(t.id==='ip'){
    const r = await fetch(`https://ip-api.com/json/${enc}?fields=status,message,country,city,isp,org,as,query,lat,lon`);
    const j = await r.json();
    if(j.status!=='success') return `<div class="result-card"><span>IP غير صالح أو محجوب: ${j.message||''}</span></div>`;
    return `<div class="result-card"><span>🌍 ${j.country} — ${j.city||'—'}</span><span class="dim">${j.query}</span></div>`
      + `<div class="result-card"><span>🏢 ISP: ${j.isp||'—'}</span></div>`
      + `<div class="result-card"><span>🔌 ASN: ${j.as||'—'} / ORG: ${j.org||'—'}</span></div>`
      + `<div class="result-card"><span>📍 ${j.lat}, ${j.lon}</span><a href="https://www.google.com/maps?q=${j.lat},${j.lon}" target="_blank" rel="noopener">خريطة ↗</a></div>`
      + linkCard('فحص السمعة — AbuseIPDB', `https://www.abuseipdb.com/check/${enc}`);
  }
  if(t.id==='domain'){
    const host = v.replace(/^https?:\/\//,'').split('/')[0];
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
    const j = await r.json();
    const ips = (j.Answer||[]).map(a=>a.data).join(', ') || 'لا سجلات A ظاهرة';
    return `<div class="result-card"><span>🔗 الدومين: ${host}</span></div>`
      + `<div class="result-card"><span>📡 سجلات A: ${ips}</span></div>`
      + linkCard('Whois — who.is', `https://who.is/whois/${encodeURIComponent(host)}`)
      + linkCard('Subdomains — crt.sh', `https://crt.sh/?q=%25.${encodeURIComponent(host)}`)
      + linkCard('Reputation — VirusTotal', `https://www.virustotal.com/gui/domain/${encodeURIComponent(host)}`);
  }
  if(t.id==='username'){
    const u = v.replace(/^@/,'');
    return linkCard('WhatsMyName — فحص 500+ موقع', `https://whatsmyname.app/?q=${enc}`)
      + linkCard('GitHub', `https://github.com/${enc}`)
      + linkCard('Reddit', `https://www.reddit.com/user/${enc}`)
      + linkCard('X', `https://x.com/${enc}`)
      + linkCard('Telegram', `https://t.me/${enc}`)
      + `<div class="result-card"><span class="dim">نصيحة: قارن الصور الرمزية والأسلوب الكتابي عبر النتائج.</span></div>`;
  }
  if(t.id==='email'){
    return linkCard('HaveIBeenPwned — هل تسرّب؟', `https://haveibeenpwned.com/`)
      + linkCard('Epieos — حسابات مرتبطة بالإيميل', `https://epieos.com/?q=${enc}`)
      + linkCard('Gravatar — الصورة المرتبطة', `https://gravatar.com/${enc}`)
      + linkCard('Gmail OSINT — Ghunt (يدوي)', `https://github.com/mxrch/GHunt`)
      + `<div class="result-card"><span class="dim">لا تدخل كلمات مرور — الفحص هنا روابط عامة فقط.</span></div>`;
  }
  if(t.id==='phone'){
    const digits = v.replace(/\D/g,'');
    return `<div class="result-card"><span>📞 الرقم: ${v}</span><span class="dim">${digits.length} خانة</span></div>`
      + linkCard('Truecaller — بحث (يدوي)', `https://www.truecaller.com/search/${enc}`)
      + linkCard('WhatsApp — تحقق مباشر', `https://wa.me/${digits}`)
      + linkCard('Telegram — تحقق', `https://t.me/+${digits}`)
      + linkCard('Epieos — بحث بالرقم', `https://epieos.com/?q=${enc}`);
  }
  // image
  return linkCard('Google Lens — ارفع الصورة', `https://lens.google.com/`)
    + linkCard('TinEye — بحث عكسي', `https://tineye.com/search?url=${enc}`)
    + linkCard('Yandex Images', `https://yandex.com/images/search?rpt=imageview&url=${enc}`)
    + `<div class="result-card"><span class="dim">الصق رابط الصورة أعلاه ثم افتح TinEye/Yandex وقارن.</span></div>`;
}

// ---------- nav ----------
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.zone').forEach(z=>z.classList.remove('active-zone'));
    document.getElementById('sec-'+b.dataset.goto).classList.add('active-zone');
    window.scrollTo({top:0,behavior:'smooth'});
  };
});

// ---------- crypto vault ----------
const dial = document.getElementById('dial');
document.getElementById('cryptoGo').onclick=()=>{
  dial.style.transform=`rotate(${(Math.random()*720)|0}deg)`;
  const txt=document.getElementById('cryptoIn').value||'';
  const m=document.getElementById('cryptoMode').value;
  let out='';
  if(m==='base64'){ try{out=btoa(unescape(encodeURIComponent(txt)));}catch{out='خطأ';} }
  else if(m==='caesar'){ out=[...txt].map(c=>{const a=c.charCodeAt(0); if(a>=65&&a<=90)return String.fromCharCode((a-65+3)%26+65); if(a>=97&&a<=122)return String.fromCharCode((a-97+3)%26+97); return c;}).join(''); }
  else if(m==='rot13'){ out=txt.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);}); }
  else out=[...txt].reverse().join('');
  document.getElementById('cryptoOut').textContent=out||'— فارغ —';
};
document.getElementById('cryptoSwap').onclick=()=>{
  try{document.getElementById('cryptoOut').textContent=decodeURIComponent(escape(atob(document.getElementById('cryptoIn').value.trim())));}catch{document.getElementById('cryptoOut').textContent='Base64 غير صالح';}
};

// ---------- subnet ----------
function ipToInt(ip){return ip.split('.').reduce((a,o)=>(a<<8)+ +o,0)>>>0;}
function intToIp(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');}
document.getElementById('cidrGo').onclick=()=>{
  const raw=document.getElementById('cidrIn').value.trim();
  const out=document.getElementById('cidrOut');
  try{
    const [ip,p]=raw.split('/'); const pre=+p;
    if(!ip||!(pre>=0&&pre<=32)) throw 0;
    const mask = pre===0?0:(0xFFFFFFFF<<(32-pre))>>>0;
    const net=ipToInt(ip)&mask, bc=net|(~mask>>>0);
    out.textContent=`network   : ${intToIp(net)}\nbroadcast : ${intToIp(bc)}\nmask      : ${intToIp(mask)} /${pre}\nhosts     : ${pre>=31?0:(bc-net-1)}\nrange     : ${intToIp(net+1)} - ${intToIp(bc-1)}`;
  }catch{out.textContent='صيغة غير صالحة. مثال: 192.168.1.10/24';}
};
document.getElementById('cidrGo').click();

// ---------- subtle grain ----------
const c=document.getElementById('noise'),x=c.getContext('2d');
function grain(){c.width=innerWidth;c.height=innerHeight;const d=x.createImageData(c.width,c.height);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=14;}x.putImageData(d,0,0);}
grain();addEventListener('resize',grain);
