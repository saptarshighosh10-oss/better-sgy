
"use strict";
/* ============================================================
   CANONICAL DATA — from MOCKUP_DATA.md. Today = Mon Jun 22, 2026.
============================================================ */
const COURSES = [
  {id:"alg", name:"Algebra 2 / Trig", teacher:"Mr. Stubbs", per:"Period 1", grade:97.4, letter:"A", trend:"up",   missing:0, accent:"#5b6cff", initials:"JS"},
  {id:"bio", name:"Biology",          teacher:"Ms. Carrington", per:"Period 2", grade:96.7, letter:"A", trend:"flat", missing:1, accent:"#34c759", initials:"MC"},
  {id:"fre", name:"French 1",         teacher:"Mme. Laurent", per:"Period 4", grade:96.5, letter:"A", trend:"up",   missing:0, accent:"#ff9f0a", initials:"CL"},
  {id:"dra", name:"Drama",            teacher:"Mr. Ellison", per:"Period 5", grade:90.3, letter:"A−", trend:"down", missing:1, accent:"#bf5af2", initials:"RE"},
  {id:"lit", name:"Literature",       teacher:"Ms. Howe", per:"Period 6", grade:94.1, letter:"A", trend:"up",   missing:0, accent:"#0a84ff", initials:"EH"},
  {id:"pe",  name:"PE 9",             teacher:"Coach Bryant", per:"Period 7", grade:99.1, letter:"A", trend:"flat", missing:0, accent:"#30d158", initials:"CB"},
];
const courseById = id => COURSES.find(c => c.id === id);

const HISTORY = {
  overall:[94.2,94.6,94.9,95.3,95.6,95.9,96.0,96.2],
  alg:[92.0,93.0,94.0,95.0,95.5,96.3,97.0,97.4],
  bio:[96.0,96.4,96.2,96.8,96.5,96.9,96.6,96.7],
  fre:[91.0,92.5,93.0,94.0,94.8,95.5,96.1,96.5],
  dra:[95.0,94.5,94.0,93.2,92.5,91.6,91.0,90.3],
  lit:[90.0,90.8,91.5,92.0,92.6,93.2,93.7,94.1],
  pe :[98.5,98.7,98.6,99.0,98.9,99.1,99.0,99.1],
};
const WEEK_LABELS = ["Apr 27","May 4","May 11","May 18","May 25","Jun 1","Jun 8","Jun 22"];

const GRADEBOOKS = {
  alg:{
    cats:[{n:"Tests",w:40,a:96.8},{n:"Quizzes",w:25,a:97.5},{n:"Homework",w:20,a:98.9},{n:"Participation",w:15,a:100}],
    items:[
      {t:"HW 7.3 problems", cat:"Homework", date:"Jun 22 (due today)", score:null, max:10, status:"due"},
      {t:"HW 7.1–7.2", cat:"Homework", date:"Jun 17", score:10, max:10, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:15, max:15, status:"graded"},
      {t:"Unit 6 Test", cat:"Tests", date:"Jun 12", score:96, max:100, status:"graded"},
      {t:"Trig Identities Quiz", cat:"Quizzes", date:"Jun 9", score:19, max:20, status:"graded"},
    ],
  },
  bio:{
    cats:[{n:"Tests",w:40,a:95.0},{n:"Labs",w:25,a:97.2},{n:"Homework",w:20,a:98.5},{n:"Participation",w:15,a:100}],
    items:[
      {t:"Cell Energetics Lab", cat:"Labs", date:"Jun 19", score:0, max:25, status:"missing"},
      {t:"Enzymes Problem Set", cat:"Homework", date:"Jun 16", score:18, max:20, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:15, max:15, status:"graded"},
      {t:"Photosynthesis Test", cat:"Tests", date:"Jun 11", score:95, max:100, status:"graded"},
      {t:"Mitosis Quiz", cat:"Labs", date:"Jun 5", score:24, max:25, status:"graded"},
    ],
  },
  fre:{
    cats:[{n:"Tests",w:40,a:95.5},{n:"Speaking",w:25,a:97.0},{n:"Homework",w:20,a:98.0},{n:"Participation",w:15,a:100}],
    items:[
      {t:"Devoirs 5.3", cat:"Homework", date:"Jun 16", score:10, max:10, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:15, max:15, status:"graded"},
      {t:"Unité 5 Exam", cat:"Tests", date:"Jun 12", score:95, max:100, status:"graded"},
      {t:"Dialogue oral", cat:"Speaking", date:"Jun 10", score:29, max:30, status:"graded"},
      {t:"Vocab Quiz", cat:"Tests", date:"Jun 6", score:48, max:50, status:"graded"},
    ],
  },
  dra:{
    cats:[{n:"Performance",w:40,a:91.0},{n:"Reflections",w:25,a:85.0},{n:"Participation",w:20,a:95.0},{n:"Projects",w:15,a:90.0}],
    items:[
      {t:"Monologue Reflection", cat:"Reflections", date:"Jun 18", score:0, max:20, status:"missing"},
      {t:"Scene Performance", cat:"Performance", date:"Jun 15", score:88, max:100, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:19, max:20, status:"graded"},
      {t:"Character Study", cat:"Projects", date:"Jun 9", score:27, max:30, status:"graded"},
      {t:"Theater Journal", cat:"Reflections", date:"Jun 4", score:17, max:20, status:"graded"},
    ],
  },
  lit:{
    cats:[{n:"Essays",w:40,a:93.0},{n:"Reading Quizzes",w:25,a:94.5},{n:"Homework",w:20,a:95.0},{n:"Participation",w:15,a:98.0}],
    items:[
      {t:"Chapter 4 Response", cat:"Homework", date:"Jun 22 (due today)", score:null, max:10, status:"due"},
      {t:"Annotation HW", cat:"Homework", date:"Jun 16", score:10, max:10, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:14, max:15, status:"graded"},
      {t:"Theme Essay", cat:"Essays", date:"Jun 13", score:92, max:100, status:"graded"},
      {t:"Reading Quiz 8", cat:"Reading Quizzes", date:"Jun 10", score:19, max:20, status:"graded"},
    ],
  },
  pe:{
    cats:[{n:"Fitness",w:40,a:99.0},{n:"Skills",w:25,a:99.5},{n:"Participation",w:35,a:99.0}],
    items:[
      {t:"Fitness Log Wk 14", cat:"Fitness", date:"Jun 13", score:20, max:20, status:"graded"},
      {t:"Mile Run", cat:"Fitness", date:"Jun 9", score:49, max:50, status:"graded"},
      {t:"Volleyball Skills", cat:"Skills", date:"Jun 6", score:25, max:25, status:"graded"},
      {t:"Participation Wk 14", cat:"Participation", date:"Jun 13", score:99, max:100, status:"graded"},
    ],
  },
};

// cross-course agenda (id = stable key for done-state persistence)
const AGENDA = [
  {id:"a-hw73",  t:"HW 7.3 problems",     course:"alg", due:"Jun 22", group:"due"},
  {id:"a-ch4",   t:"Chapter 4 Response",  course:"lit", due:"Jun 22", group:"due"},
  {id:"a-cell",  t:"Cell Energetics Lab", course:"bio", due:"was due Jun 19", group:"missing"},
  {id:"a-mono",  t:"Monologue Reflection",course:"dra", due:"was due Jun 18", group:"missing"},
  {id:"a-book",  t:"Book club notes",     course:"lit", due:"Jun 24", group:"upcoming"},
  {id:"a-eco",   t:"Ecology reading",     course:"bio", due:"Jun 25", group:"upcoming"},
  {id:"a-vocab", t:"Unité 6 vocab",  course:"fre", due:"Jun 26", group:"upcoming"},
  {id:"a-fit15", t:"Fitness Log Wk 15",   course:"pe",  due:"Jun 26", group:"upcoming"},
  {id:"a-u7",    t:"Unit 7 Test",         course:"alg", due:"Jun 29", group:"upcoming"},
  {id:"a-u6t",   t:"Unit 6 Test",         course:"alg", due:"Jun 12", group:"done", result:"96/100"},
  {id:"a-dial",  t:"Dialogue oral",       course:"fre", due:"Jun 10", group:"done", result:"29/30"},
  {id:"a-enz",   t:"Enzymes Problem Set", course:"bio", due:"Jun 16", group:"done", result:"18/20"},
];

// June 2026 calendar events. Jun 1 = Monday.
const CAL_EVENTS = {
  9:[{t:"Trig Identities Quiz", c:"alg"},{t:"Mile Run", c:"pe"}],
  11:[{t:"Photosynthesis Test", c:"bio"}],
  12:[{t:"Unit 6 Test", c:"alg"},{t:"Unité 5 Exam", c:"fre"}],
  15:[{t:"Scene Performance", c:"dra"}],
  18:[{t:"Monologue Reflection due", c:"dra"}],
  19:[{t:"Cell Energetics Lab due", c:"bio"}],
  22:[{t:"HW 7.3", c:"alg"},{t:"Chapter 4 Response", c:"lit"}],
  24:[{t:"Book club notes", c:"lit"}],
  25:[{t:"Ecology reading", c:"bio"}],
  26:[{t:"Unité 6 vocab", c:"fre"},{t:"Fitness Log Wk 15", c:"pe"}],
  29:[{t:"Unit 7 Test", c:"alg"}],
};

const ANNOUNCEMENTS = [
  {id:"an1", course:"bio", time:"2h ago",   title:"Lab safety quiz Friday",   body:"Quick 10-question quiz on lab safety at the start of class Friday. Review the handout.", star:true},
  {id:"an2", course:"pe",  time:"5h ago",   title:"Bring sneakers Thursday",  body:"Outdoor unit starts Thursday, weather permitting. Closed-toe shoes required.", star:false},
  {id:"an3", course:"dra", time:"Yesterday",title:"Monologue sign-ups open",  body:"Pick your performance slot for next week. Sign-up sheet on the board and in Materials.", star:false},
  {id:"an4", course:"lit", time:"Yesterday",title:"Chapter 4 response due Monday", body:"Two paragraphs, focus on the narrator's voice. Submit through Schoology.", star:false},
  {id:"an5", course:"alg", time:"2 days ago",title:"Unit 7 starts",          body:"We begin Unit 7 today. HW 7.3 is due Monday; Unit 7 test is the 29th.", star:false},
  {id:"an6", course:"fre", time:"3 days ago",title:"Vocab list for Unité 6", body:"New list posted. Quiz the 26th. Practice with the audio in Materials.", star:false},
];

const MATERIALS = [
  {id:"m-folder", type:"folder", name:"Unit 5 — Cell Energetics", meta:"Folder · 6 items"},
  {id:"m-lab",    type:"pdf",    name:"Cell Energetics Lab handout.pdf", meta:"PDF · 412 KB"},
  {id:"m-enz",    type:"pdf",    name:"Enzymes notes.pdf", meta:"PDF · 280 KB"},
  {id:"m-khan",   type:"link",   name:"Khan Academy: Cellular respiration", meta:"Link"},
  {id:"m-tmpl",   type:"doc",    name:"Lab report template.docx", meta:"Doc · 64 KB"},
  {id:"m-psg",    type:"pdf",    name:"Photosynthesis study guide.pdf", meta:"PDF · 196 KB"},
];

const NOTIFS = [
  {ic:"▲", color:"#34c759", tt:"Biology rose 1.2%", td:"95.5% → 96.7%", src:"Better SGY · Biology"},
  {ic:"✓", color:"#0071e3", tt:"Graded · Cell Energetics Lab", td:"90% (Biology)", src:"Better SGY · Biology"},
  {ic:"+",      color:"#ff9500", tt:"New assignment", td:"Monologue reflection (Drama)", src:"Better SGY · Drama"},
];

/* ============================================================
   LIVE "TODAY" — the sample data is anchored to Mon Jun 22 2026.
   We shift every relative date so it reads sensibly against the
   real current date: 2 due today, 2 recently overdue (missing),
   a few upcoming this/next week, the rest already graded.
============================================================ */
const NOW = new Date();
const REAL_TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
function addDays(base, n){ const d = new Date(base); d.setDate(d.getDate()+n); return d; }
function fmtMD(d){ return d.toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

// Each agenda item gets a real Date, offset from today. Order roughly
// preserves the original spacing while keeping the narrative intact.
const AGENDA_OFFSETS = {
  "a-hw73":0, "a-ch4":0,            // due today
  "a-cell":-4, "a-mono":-5,         // recently overdue → missing
  "a-book":2, "a-eco":3, "a-vocab":4, "a-fit15":4, "a-u7":7,  // upcoming
  "a-u6t":-10, "a-dial":-12, "a-enz":-6,   // already done
};
// build live dates + human labels onto AGENDA
AGENDA.forEach(a=>{
  const off = (a.id in AGENDA_OFFSETS) ? AGENDA_OFFSETS[a.id] : 0;
  a.date = addDays(REAL_TODAY, off);
  if(a.group==="due") a.dueLabel = "Today";
  else if(a.group==="missing") a.dueLabel = "was due "+fmtMD(a.date);
  else if(a.group==="done") a.dueLabel = fmtMD(a.date);
  else { // upcoming
    a.dueLabel = off===1 ? "Tomorrow" : fmtMD(a.date);
  }
});

// Calendar events: map the fixed-June day numbers onto real dates by the
// same relative ordering, keyed off the matching agenda items where possible.
// We derive a fresh CAL_EVENTS_LIVE: {ISOdate: [{t,c}]}.
const CAL_EVENTS_LIVE = {};
function calKey(d){ return d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate(); }
function addCalEvent(d, ev){ const k=calKey(d); (CAL_EVENTS_LIVE[k] || (CAL_EVENTS_LIVE[k]=[])).push(ev); }
// Past graded events (spread across the two weeks before today)
[
  {off:-12, t:"Trig Identities Quiz", c:"alg"}, {off:-12, t:"Mile Run", c:"pe"},
  {off:-11, t:"Photosynthesis Test", c:"bio"},
  {off:-10, t:"Unit 6 Test", c:"alg"}, {off:-10, t:"Unité 5 Exam", c:"fre"},
  {off:-7,  t:"Scene Performance", c:"dra"},
  {off:-5,  t:"Monologue Reflection due", c:"dra"},
  {off:-4,  t:"Cell Energetics Lab due", c:"bio"},
  // today
  {off:0, t:"HW 7.3", c:"alg"}, {off:0, t:"Chapter 4 Response", c:"lit"},
  // upcoming
  {off:2, t:"Book club notes", c:"lit"},
  {off:3, t:"Ecology reading", c:"bio"},
  {off:4, t:"Unité 6 vocab", c:"fre"}, {off:4, t:"Fitness Log Wk 15", c:"pe"},
  {off:7, t:"Unit 7 Test", c:"alg"},
].forEach(e=> addCalEvent(addDays(REAL_TODAY, e.off), {t:e.t, c:e.c}));

// "Last week" label for the trend chart now ends at the real today.
WEEK_LABELS[WEEK_LABELS.length-1] = fmtMD(REAL_TODAY);

// Relabel the gradebook items that are anchored to "today" or recently
// overdue so the per-course view reads against the real clock.
Object.values(GRADEBOOKS).forEach(gb=>{
  gb.items.forEach(it=>{
    if(it.status==="due") it.date = "Today";
    else if(it.status==="missing") it.date = "was due "+fmtMD(addDays(REAL_TODAY,-4));
  });
});

/* ============================================================
   STATE (with localStorage persistence)
============================================================ */
const LS = "bsgy_apple_mock_v1";
function loadState(){
  let s = {};
  try { s = JSON.parse(localStorage.getItem(LS) || "{}"); } catch(e){}
  return Object.assign({
    course:"bio",
    chartOff:{},        // {courseId:true} hidden in grades chart
    asgFilter:"upcoming",
    asgSearch:"",
    done:{},            // {agendaId:true}
    stars:{},           // {annId:bool} overrides
    material:"m-lab",
    submissions:{},     // {material: {rev, comments:[], lastSaved}}
    edition:"apple",
    sections:{materials:false}, // overrides; default others true
    appearance:"light",
    motion:false,
    gpa:true,
    notif:true,
  }, s);
}
let state = loadState();
function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

/* ============================================================
   HELPERS
============================================================ */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// chart geometry: viewBox 900x280, x 56->872 over 8 pts, y maps 88..100 to 232..24
const X0=56, X1=872, Y_TOP=24, Y_BOT=232, V_MIN=88, V_MAX=100;
const N = 8;
const cx = i => X0 + (X1-X0) * (i/(N-1));
const cy = v => Y_BOT - (Y_BOT-Y_TOP) * ((v-V_MIN)/(V_MAX-V_MIN));
function ptsStr(arr){ return arr.map((v,i)=>cx(i).toFixed(2)+","+cy(v).toFixed(2)).join(" "); }

/* Calm, consistent empty states. kind = check | calm | search | star */
function emptyState(kind, title, body){
  const icons = {
    check:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="M8 12.5l2.5 2.5L16 9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calm:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="M8.5 13.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" stroke-width="1.6" stroke-linecap="round"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2" stroke-linecap="round"/></svg>',
    search:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="6.5" stroke-width="1.6"/><path d="M20 20l-4-4" stroke-width="1.7" stroke-linecap="round"/></svg>',
    star:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  };
  return `<div class="emptystate"><span class="esicon">${icons[kind]||icons.calm}</span><div class="estitle">${esc(title)}</div><div class="esbody">${esc(body)}</div></div>`;
}

function trendIcon(trend){
  if(trend==="up") return '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 10L6 6L8.5 8.5L12 4" fill="none" stroke="#34c759" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4H12V7" fill="none" stroke="#34c759" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(trend==="down") return '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 4L6 8L8.5 5.5L12 10" fill="none" stroke="#ff9500" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10H12V7" fill="none" stroke="#ff9500" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7H12" fill="none" stroke="#86868b" stroke-width="1.8" stroke-linecap="round"/></svg>';
}
function trendLabel(c){ return c.trend==="up"?"Rising this quarter":c.trend==="down"?"Slipping a little":(c.id==="pe"?"Steady at the top":"Holding steady"); }

function sparkPath(arr, color){
  // map onto 0..240 x, 6..40 y (lower=higher grade)
  const min=Math.min(...arr), max=Math.max(...arr), span=(max-min)||1;
  const pts = arr.map((v,i)=>{
    const x = 240*(i/(arr.length-1));
    const y = 40 - 34*((v-min)/span);
    return x.toFixed(1)+","+y.toFixed(1);
  });
  const last = pts[pts.length-1].split(",");
  return `<svg class="spark" viewBox="0 0 240 48" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(" ")}"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/></svg>`;
}

/* ============================================================
   THEME (Light / Dark / Auto) — persisted, live, OS-aware
============================================================ */
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
function resolvedTheme(){
  if(state.appearance==="dark") return "dark";
  if(state.appearance==="light") return "light";
  return darkMQ.matches ? "dark" : "light"; // auto
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme", resolvedTheme());
}
// when in Auto, follow the OS live
function onOSChange(){ if(state.appearance==="auto") applyTheme(); }
if(darkMQ.addEventListener) darkMQ.addEventListener("change", onOSChange);
else if(darkMQ.addListener) darkMQ.addListener(onOSChange); // older Safari

/* ============================================================
   SCREEN ROUTING
============================================================ */
const SCREENS = ["overview","grades","assign","cal","announce","materials","games","nostalgia","settings"];
function go(screen){
  if(!SCREENS.includes(screen)) screen = "overview";
  SCREENS.forEach(s=>{
    $("#sc-"+s).classList.toggle("active", s===screen);
  });
  $$("#nav .navitem").forEach(b=> b.classList.toggle("active", b.dataset.screen===screen));
  $(".canvas").scrollTop = 0;
  $("#side").classList.remove("open");
  // leaving Games tears down any running game (timers / key handlers)
  if(screen!=="games") Arcade.exit();
}

/* ============================================================
   OVERVIEW
============================================================ */
function renderOverviewChart(){
  const svg = $("#ovChart");
  const bandTop = cy(98), bandH = cy(90)-cy(98);
  let g = "";
  g += `<rect class="band" x="${X0}" y="${cy(100)}" width="${X1-X0}" height="${cy(90)-cy(100)}"/>`;
  [90,92,94,96,98,100].forEach(v=> g += `<line class="grid-l" x1="${X0}" y1="${cy(v)}" x2="${X1}" y2="${cy(v)}"/>`);
  g += `<line class="grid-l" x1="${X0}" y1="${cy(88)}" x2="${X1}" y2="${cy(88)}"/>`;
  [["88",88],["90",90],["98",98],["100",100]].forEach(([t,v])=> g+=`<text class="axis-t" x="44" y="${(cy(v)+4).toFixed(1)}" text-anchor="end">${t}</text>`);
  [["Feb",0],["Mar",2],["Apr",4],["May",6],["Jun",7]].forEach(([t,i])=> g+=`<text class="axis-t" x="${cx(i).toFixed(1)}" y="258" text-anchor="middle">${t}</text>`);
  const a = HISTORY.overall;
  g += `<polyline fill="none" stroke="#0071e3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${ptsStr(a)}"/>`;
  g += `<circle cx="${cx(N-1).toFixed(2)}" cy="${cy(a[N-1]).toFixed(2)}" r="5.5" fill="#0071e3"/>`;
  g += `<circle cx="${cx(N-1).toFixed(2)}" cy="${cy(a[N-1]).toFixed(2)}" r="10" fill="none" stroke="#0071e3" stroke-width="1.5" opacity=".3"/>`;
  a.forEach((v,i)=>{ g += hitDot(i,v,"#0071e3","Overall"); });
  svg.innerHTML = g;
  wireDots(svg);
}
function hitDot(i,v,color,label){
  return `<circle class="dotpt" cx="${cx(i).toFixed(2)}" cy="${cy(v).toFixed(2)}" r="3.5" fill="${color}" opacity="0"/>`+
         `<circle class="hit" cx="${cx(i).toFixed(2)}" cy="${cy(v).toFixed(2)}" r="16" fill="transparent" data-v="${v}" data-i="${i}" data-label="${esc(label)}"/>`;
}
function wireDots(svg){
  $$(".hit", svg).forEach(h=>{
    const sib = h.previousElementSibling;
    h.addEventListener("mouseenter", ()=>{
      if(sib) sib.setAttribute("r","5.5");
      const r = h.getBoundingClientRect();
      showTip(r.left + r.width/2, r.top, `<b>${h.dataset.label} · ${WEEK_LABELS[h.dataset.i]}</b> · ${(+h.dataset.v).toFixed(1)}%`);
    });
    h.addEventListener("mouseleave", ()=>{ if(sib) sib.setAttribute("r","3.5"); hideTip(); });
  });
}
function renderGallery(){
  const wrap = $("#ovGallery");
  wrap.innerHTML = COURSES.map(c=>`
    <article class="card">
      <div class="accent" style="background:${c.accent};"></div>
      <div class="top" data-card="${c.id}">
        <div class="cname">${esc(c.name)}</div><div class="teach">${esc(c.teacher)} · ${esc(c.per)}</div>
        <div class="gradeline"><span class="grade">${c.grade}</span><span class="gpct">%</span><span class="letter">${esc(c.letter)}</span></div>
        ${sparkPath(HISTORY[c.id], c.accent)}
        <span class="trend">${trendIcon(c.trend)}${trendLabel(c)}</span>
      </div>
      <div class="foot"><a data-card="${c.id}">View grades &rsaquo;</a>${c.missing?`<span class="miss">${c.missing} missing</span>`:`<span class="clean">No missing work</span>`}</div>
    </article>`).join("");
  $$("[data-card]", wrap).forEach(el=> el.addEventListener("click", ()=>{ selectCourse(el.dataset.card); go("grades"); }));
}

/* ============================================================
   GRADES
============================================================ */
function selectCourse(id){ state.course = id; save(); renderPicker(); renderGradeBody(); }
function renderPicker(){
  const p = $("#grPicker");
  p.innerHTML = COURSES.map(c=>`
    <button class="pk${c.id===state.course?" active":""}" data-pick="${c.id}">
      <span class="dot" style="background:${c.accent};"></span>
      <span class="pinfo"><span class="pn">${esc(c.name)}</span><span class="pg">${esc(c.teacher)}</span></span>
      <span class="pl">${c.grade}</span>
    </button>`).join("");
  $$("[data-pick]", p).forEach(b=> b.addEventListener("click", ()=> selectCourse(b.dataset.pick)));
}
function renderGradeBody(){
  const c = courseById(state.course);
  const gb = GRADEBOOKS[c.id];
  const missItem = gb.items.find(i=>i.status==="missing");

  // course chart: faint reference lines for others, bold for selected
  let chart = "";
  [90,92,94,96,98,100].forEach(v=> chart += `<line class="grid-l" x1="${X0}" y1="${cy(v)}" x2="${X1}" y2="${cy(v)}"/>`);
  chart += `<line class="grid-l" x1="${X0}" y1="${cy(88)}" x2="${X1}" y2="${cy(88)}"/>`;
  [["88",88],["90",90],["98",98],["100",100]].forEach(([t,v])=> chart+=`<text class="axis-t" x="44" y="${(cy(v)+4).toFixed(1)}" text-anchor="end">${t}</text>`);
  [["Feb",0],["Mar",2],["Apr",4],["May",6],["Jun",7]].forEach(([t,i])=> chart+=`<text class="axis-t" x="${cx(i).toFixed(1)}" y="258" text-anchor="middle">${t}</text>`);
  COURSES.forEach(other=>{
    if(other.id===c.id) return;
    if(state.chartOff[other.id]) return;
    chart += `<polyline fill="none" stroke="${other.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".22" points="${ptsStr(HISTORY[other.id])}"/>`;
  });
  if(!state.chartOff[c.id]){
    const a = HISTORY[c.id];
    chart += `<polyline fill="none" stroke="${c.accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" points="${ptsStr(a)}"/>`;
    chart += `<circle cx="${cx(N-1).toFixed(2)}" cy="${cy(a[N-1]).toFixed(2)}" r="5.5" fill="${c.accent}"/>`;
    chart += `<circle cx="${cx(N-1).toFixed(2)}" cy="${cy(a[N-1]).toFixed(2)}" r="10" fill="none" stroke="${c.accent}" stroke-width="1.5" opacity=".3"/>`;
    a.forEach((v,i)=> chart += hitDot(i,v,c.accent,c.name));
  }

  const chips = COURSES.map(o=>`
    <button class="chip${o.id===c.id?" lead":""}${state.chartOff[o.id]?" off":""}" data-chip="${o.id}">
      <span class="cdot" style="background:${o.accent};"></span>${esc(o.name)}
    </button>`).join("");

  const cats = gb.cats.map(cat=>`
    <div class="cat"><div class="ch"><span class="cn">${esc(cat.n)}</span><span class="cw">${cat.w}%</span></div>
      <div class="cavg">${cat.a}%</div>
      <div class="track"><div class="fill" style="width:0%;background:${c.accent};" data-w="${cat.a}"></div></div></div>`).join("");

  const rows = gb.items.map(it=>{
    let right;
    if(it.status==="missing") right = `<span class="pill red">Missing</span>`;
    else if(it.status==="due") right = `<span class="pill blue">Due today</span>`;
    else right = `<span class="score">${it.score}/${it.max}</span><span class="pct">${Math.round(it.score/it.max*100)}%</span>`;
    return `<div class="row"><span class="stripe" style="background:${c.accent};"></span>
      <div><div class="rtitle">${esc(it.t)}</div><div class="rmeta">${esc(it.cat)} · ${esc(it.date)}</div></div>
      <div class="rright">${right}</div></div>`;
  }).join("");

  const alert = missItem ? `
    <div class="alert">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)"><circle cx="12" cy="12" r="9" stroke-width="1.7"/><path d="M12 7v6M12 16.5v.5" stroke-width="1.8" stroke-linecap="round"/></svg>
      <div><div class="at">${esc(missItem.t)} — not submitted</div><div class="ad">Due ${esc(missItem.date)} · counts toward ${esc(missItem.cat)} · turn it in to lift your grade</div></div>
    </div>` : "";

  $("#grBody").innerHTML = `
    <div class="surface snapshot">
      <div class="sg">${c.grade}<span class="pct">%</span></div>
      <div class="smeta">
        <span class="sname">${esc(c.name)} · ${esc(c.letter)}</span>
        <span class="steach">${esc(c.teacher)} · ${esc(c.per)}</span>
        <span class="trend">${trendIcon(c.trend)}${trendLabel(c)}</span>
      </div>
      ${sparkPath(HISTORY[c.id], c.accent).replace('class="spark"','class="sspark spark"')}
    </div>

    <div class="surface coursetrend">
      <div class="th"><span class="tlab">${esc(c.name)} — grade over time</span><span class="tnow">Now <b>${c.grade}%</b></span></div>
      <svg class="chart" id="grChart" viewBox="0 0 900 280" role="img">${chart}</svg>
      <div class="chips" id="grChips">${chips}</div>
    </div>
    ${alert}
    <div class="blocklab">Grade categories</div>
    <div class="cats">${cats}</div>
    <div class="blocklab">Assignments</div>
    <div class="surface rows">${rows}</div>`;

  // animate category fills
  requestAnimationFrame(()=> $$("#grBody .fill").forEach(f=> f.style.width = f.dataset.w+"%"));
  wireDots($("#grChart"));
  $$("#grChips .chip").forEach(ch=> ch.addEventListener("click", ()=>{
    const id = ch.dataset.chip;
    state.chartOff[id] = !state.chartOff[id];
    save(); renderGradeBody();
  }));
}

/* ============================================================
   ASSIGNMENTS
============================================================ */
function asgEffectiveGroup(a){ return state.done[a.id] ? "done" : a.group; }
function renderAssignments(){
  const filter = state.asgFilter;
  const q = state.asgSearch.trim().toLowerCase();
  // counts
  const counts = {upcoming:0, missing:0, done:0};
  AGENDA.forEach(a=>{ counts[asgEffectiveGroup(a)]++; });
  $$("#asgSegs .seg").forEach(s=>{
    s.classList.toggle("on", s.dataset.filter===filter);
    s.querySelector(".sc").textContent = counts[s.dataset.filter];
  });

  let list = AGENDA.filter(a=> asgEffectiveGroup(a)===filter);
  if(q) list = list.filter(a=> a.t.toLowerCase().includes(q) || courseById(a.course).name.toLowerCase().includes(q));

  const rows = $("#asgRows");
  if(!list.length){
    let es;
    if(q){
      es = emptyState("search","No matches","Nothing matches “"+esc(state.asgSearch)+"”. Try a different course or title.");
    } else if(filter==="missing"){
      es = emptyState("check","Nothing missing","Every assignment is turned in. Keep it up.");
    } else if(filter==="upcoming"){
      es = emptyState("calm","All caught up","No upcoming work right now. Enjoy the breather.");
    } else {
      es = emptyState("calm","Nothing here yet","Completed assignments will show up in this view.");
    }
    rows.innerHTML = es; updateMissBadge(); return;
  }

  rows.innerHTML = list.map(a=>{
    const c = courseById(a.course);
    const grp = asgEffectiveGroup(a);
    let right;
    if(grp==="done") right = a.result ? `<span class="pill green">Done · ${esc(a.result)}</span>` : `<span class="pill green">Done</span>`;
    else if(grp==="missing") right = `<span class="pill red">Missing · ${esc(a.dueLabel)}</span>`;
    else if(a.group==="due") right = `<span class="pill blue">Due today</span>`;
    else right = `<span class="rmeta" style="margin:0;">${esc(a.dueLabel)}</span>`;
    const checked = grp==="done";
    return `<div class="row${checked?" done":""}">
      <button class="check${checked?" on":""}" data-toggle="${a.id}" title="${checked?"Mark not done":"Mark done"}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12l5 5L20 7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div><div class="rtitle">${esc(a.t)}</div><div class="rmeta"><span class="ctag"><span class="swatch" style="background:${c.accent};"></span>${esc(c.name)}</span></div></div>
      <div class="rright">${right}</div></div>`;
  }).join("");

  $$("[data-toggle]", rows).forEach(b=> b.addEventListener("click", ()=>{
    const id = b.dataset.toggle;
    state.done[id] = !state.done[id];
    save(); renderAssignments();
  }));
  updateMissBadge();
}
function updateMissBadge(){
  const n = AGENDA.filter(a=> asgEffectiveGroup(a)==="missing").length;
  const badge = $("#navMissBadge");
  badge.textContent = n;
  badge.style.display = n ? "" : "none";
}

/* ============================================================
   CALENDAR
============================================================ */
// Calendar now runs on the real clock. It starts on the actual current
// month, highlights the real today, and pulls events from CAL_EVENTS_LIVE.
let calY = REAL_TODAY.getFullYear(), calM = REAL_TODAY.getMonth();
function eventsForDay(y,m,d){ return CAL_EVENTS_LIVE[y+"-"+m+"-"+d] || []; }
function renderCalendar(){
  const first = new Date(calY, calM, 1);
  const startDow = first.getDay(); // 0=Sun
  const daysIn = new Date(calY, calM+1, 0).getDate();
  const monthName = first.toLocaleString("en-US",{month:"long"});
  $("#calLabel").textContent = `${monthName} ${calY}`;

  const prevDays = new Date(calY, calM, 0).getDate();
  let cells = [];
  for(let i=startDow-1;i>=0;i--) cells.push({d:prevDays-i, dim:true});
  for(let d=1; d<=daysIn; d++) cells.push({d, dim:false, cur:true});
  while(cells.length % 7 !== 0) cells.push({d:cells.length-(startDow+daysIn)+1, dim:true});
  while(cells.length < 35) cells.push({d:"", dim:true});

  const isThisMonth = (calY===REAL_TODAY.getFullYear() && calM===REAL_TODAY.getMonth());
  const todayD = REAL_TODAY.getDate();

  $("#calGrid").innerHTML = cells.map(cell=>{
    if(cell.d==="") return `<div class="cell dim"></div>`;
    const events = cell.cur ? eventsForDay(calY,calM,cell.d) : [];
    const today = isThisMonth && cell.cur && cell.d===todayD;
    const cls = ["cell"];
    if(cell.dim) cls.push("dim");
    if(today) cls.push("today");
    if(events.length) cls.push("has");
    const evs = events.map(e=>`<span class="ev" style="background:${courseById(e.c).accent};">${esc(e.t)}</span>`).join("");
    return `<div class="${cls.join(" ")}"${events.length?` data-day="${cell.d}"`:""}><span class="dn">${cell.d}</span>${evs}</div>`;
  }).join("");

  $$("#calGrid .has").forEach(c=> c.addEventListener("click", ()=> showDay(+c.dataset.day)));
  $("#calDay").innerHTML = "";
}
function showDay(d){
  const events = eventsForDay(calY,calM,d);
  if(!events.length){ $("#calDay").innerHTML=""; return; }
  const monthName = new Date(calY,calM,1).toLocaleString("en-US",{month:"long"});
  $("#calDay").innerHTML = `<div class="surface daypop">
    <h4>${monthName} ${d}, ${calY}</h4>
    ${events.map(e=>{const c=courseById(e.c);return `<div class="dev"><span class="sw" style="background:${c.accent};"></span><span class="dt">${esc(e.t)}</span><span class="dc">${esc(c.name)}</span></div>`;}).join("")}
  </div>`;
}

/* ============================================================
   ANNOUNCEMENTS
============================================================ */
function annStar(a){ return (a.id in state.stars) ? state.stars[a.id] : a.star; }
function renderAnnouncements(){
  const feed = $("#annFeed");
  if(!ANNOUNCEMENTS.length){
    feed.innerHTML = emptyState("calm","No announcements","When a teacher posts, it will show up here.");
    return;
  }
  feed.innerHTML = ANNOUNCEMENTS.map(a=>{
    const c = courseById(a.course);
    const on = annStar(a);
    const starSvg = on
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    return `<article class="surface post">
      <span class="pav" style="background:${c.accent};">${esc(c.initials)}</span>
      <div class="pbody">
        <div class="phead"><span class="pteach">${esc(c.teacher)}</span><span class="pill"><span class="swatch" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c.accent};"></span>${esc(c.name)}</span><span class="ptime">${esc(a.time)}</span></div>
        <div class="ptitle">${esc(a.title)}</div>
        <div class="psnip">${esc(a.body)}</div>
      </div>
      <button class="star${on?" on":""}" data-star="${a.id}" title="${on?"Important":"Mark important"}">${starSvg}</button>
    </article>`;
  }).join("");
  $$("[data-star]", feed).forEach(b=> b.addEventListener("click", ()=>{
    const a = ANNOUNCEMENTS.find(x=>x.id===b.dataset.star);
    state.stars[a.id] = !annStar(a);
    save(); renderAnnouncements();
  }));
}

/* ============================================================
   MATERIALS
============================================================ */
function matIcon(type){
  if(type==="folder") return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)"><path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  if(type==="link") return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0071e3"><path d="M9 15l6-6M10 6l5-1a3 3 0 013 3l-1 5M14 16l-5 1a3 3 0 01-3-3l1-5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(type==="doc") return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)"><path d="M5 4h14v16H5z" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 9h6M9 13h6M9 17h3" stroke-width="1.6" stroke-linecap="round"/></svg>';
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff3b30"><path d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2z" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v5h5" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}
function renderMaterialsList(){
  $("#matList").innerHTML = MATERIALS.map(m=>{
    const bg = m.type==="pdf"?"background:rgba(255,59,48,.12);":m.type==="link"?"background:rgba(0,113,227,.1);":"";
    const chev = (m.type==="folder") ? '<span class="fchev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : "";
    return `<div class="frow${m.id===state.material?" sel":""}" data-file="${m.id}">
      <span class="ficon" style="${bg}">${matIcon(m.type)}</span>
      <div><div class="fn">${esc(m.name)}</div><div class="fm">${esc(m.meta)}</div></div>${chev}</div>`;
  }).join("");
  $$("[data-file]", $("#matList")).forEach(r=> r.addEventListener("click", ()=>{ state.material = r.dataset.file; save(); renderMaterialsList(); renderMaterialDetail(); }));
}
function subState(){ return state.submissions[state.material] || (state.submissions[state.material] = {rev:0, comments:[], lastSaved:null}); }
function renderMaterialDetail(){
  const m = MATERIALS.find(x=>x.id===state.material) || MATERIALS[1];
  const isLab = m.id==="m-lab";
  const sub = subState();

  if(!isLab){
    // simpler read-only detail for other files
    $("#matDetail").innerHTML = `
      <h3>${esc(m.name)}</h3>
      <div class="dmeta">${esc(m.meta)} · Biology · Ms. Carrington</div>
      <div class="fieldlab">Preview</div>
      <div class="attach"><span class="ai">${matIcon(m.type)}</span><div><div class="an">${esc(m.name)}</div><div class="as">${esc(m.meta)}</div></div><button class="tlink" style="margin-left:auto;" id="matOpen">Open</button></div>
      <div style="margin-top:22px;"><button class="tlink" id="matSchoology">Open in Schoology <span class="chev">&rsaquo;</span></button></div>`;
    $("#matOpen").addEventListener("click", ()=> toast({ic:"↗",color:"#0071e3",tt:"Opening file",td:m.name,src:"Better SGY · Materials"}));
    $("#matSchoology").addEventListener("click", e=> e.preventDefault());
    return;
  }

  const revNote = sub.rev>0
    ? `<div class="revnote ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12l5 5L20 7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Submitted · revision ${sub.rev} created · ${esc(sub.lastSaved)}</div>`
    : `<div class="revnote"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 11a8 8 0 10-1.5 5.5M20 5v5h-5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Each submit creates a new revision. Last saved: not yet.</div>`;

  const comments = sub.comments.length
    ? `<div class="commentlist">${sub.comments.map(cm=>`<div class="cm">${esc(cm.text)}<div class="cmw">You · ${esc(cm.when)}</div></div>`).join("")}</div>` : "";

  $("#matDetail").innerHTML = `
    <h3>Cell Energetics Lab</h3>
    <div class="dmeta">Posted by Ms. Carrington · due ${esc(fmtMD(addDays(REAL_TODAY,-4)))} · Labs (25%)</div>

    <div class="fieldlab">Attachments</div>
    <div class="attach"><span class="ai">${matIcon("pdf")}</span><div><div class="an">Cell Energetics Lab handout.pdf</div><div class="as">412 KB</div></div><button class="tlink" style="margin-left:auto;" data-open>Open</button></div>
    <div class="attach" style="margin-top:8px;"><span class="ai">${matIcon("doc")}</span><div><div class="an">Lab report template.docx</div><div class="as">64 KB</div></div><button class="tlink" style="margin-left:auto;" data-open>Open</button></div>

    <div class="fieldlab">Your submission</div>
    <textarea class="ta" id="matText" placeholder="Type your response, or drop a file to attach."></textarea>
    ${revNote}

    <div class="fieldlab">Comment to teacher</div>
    <input class="inp" id="matComment" type="text" placeholder="Add a comment (optional)" />
    ${comments}

    <div style="margin-top:22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <button class="btn" id="matSubmit">${sub.rev>0?"Submit revision":"Submit lab"}</button>
      <button class="tlink" id="matSchoology2">Open in Schoology <span class="chev">&rsaquo;</span></button>
    </div>`;

  $$("[data-open]", $("#matDetail")).forEach(b=> b.addEventListener("click", e=>{ e.preventDefault(); toast({ic:"↗",color:"#0071e3",tt:"Opening attachment",td:"Cell Energetics Lab",src:"Better SGY · Materials"}); }));
  $("#matSchoology2").addEventListener("click", e=> e.preventDefault());
  $("#matSubmit").addEventListener("click", ()=>{
    const txt = $("#matText").value.trim();
    const cmt = $("#matComment").value.trim();
    const now = stamp();
    sub.rev += 1; sub.lastSaved = now;
    if(cmt){ sub.comments.push({text:cmt, when:now}); }
    save();
    renderMaterialDetail();
    toast({ic:"✓",color:"#34c759",tt:`Submitted · revision ${sub.rev} created`,td:"Cell Energetics Lab (Biology)",src:now});
  });
}
function stamp(){
  const now = new Date();
  const t = now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  return `Today · ${t}`;
}

/* ============================================================
   SETTINGS
============================================================ */
const SECTIONS = [
  {id:"overview", sl:"Overview", sd:"Your average, stats, and course cards."},
  {id:"grades", sl:"Grades", sd:"Per-course gradebook and categories."},
  {id:"assign", sl:"Assignments", sd:"Cross-course list with filters."},
  {id:"cal", sl:"Calendar", sd:"Month grid of due dates."},
  {id:"announce", sl:"Announcements", sd:"Teacher posts feed."},
  {id:"materials", sl:"Materials", sd:"Files, resources, and submissions."},
];
function sectionOn(id){ return (id in state.sections) ? state.sections[id] : true; }
function renderSettings(){
  // editions
  $$("#editions .edition").forEach(b=>{
    const on = b.dataset.ed===state.edition;
    b.classList.toggle("on", on);
    b.querySelector(".activetag").textContent = on ? "Active" : "";
  });
  // sections
  $("#setSections").innerHTML = SECTIONS.map(s=>`
    <div class="setrow"><div><div class="sl">${esc(s.sl)}</div><div class="sd">${esc(s.sd)}</div></div>
    <label class="toggle sr"><input type="checkbox" data-sec="${s.id}"${sectionOn(s.id)?" checked":""} /><span class="tk"></span></label></div>`).join("");
  $$("[data-sec]", $("#setSections")).forEach(inp=> inp.addEventListener("change", ()=>{
    state.sections[inp.dataset.sec] = inp.checked; save();
  }));
  // appearance segs
  $$("#setAppearance .seg").forEach(s=> s.classList.toggle("on", s.dataset.app===state.appearance));
  // toggles
  $("#setNotif").checked = state.notif;
  $("#setMotion").checked = state.motion;
  $("#setGpa").checked = state.gpa;
}

/* ============================================================
   ARCADE — three self-contained games
   High scores persist under their own localStorage key so they
   never collide with the main app state.
============================================================ */
const Arcade = (function(){
  const HS_KEY = "bsgy-apple-arcade";
  function loadHS(){ try{ return JSON.parse(localStorage.getItem(HS_KEY) || "{}"); }catch(e){ return {}; } }
  function saveHS(o){ try{ localStorage.setItem(HS_KEY, JSON.stringify(o)); }catch(e){} }
  let HS = loadHS();
  function getBest(id){ return HS[id]; }
  function setBest(id, val){ HS[id] = val; saveHS(HS); }

  const GAMES = [
    {id:"slide",  name:"Slide",  desc:"Order the tiles, one through fifteen", grad:"linear-gradient(150deg,#0071e3,#5b6cff)",
      icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/></svg>`,
      bestLabel:"Fewest", fmtBest:v=> v==null?"—":v+" moves"},
    {id:"aim",    name:"Aim",    desc:"Hit every target before time runs out", grad:"linear-gradient(150deg,#ff453a,#ff9f0a)",
      icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round"/></svg>`,
      bestLabel:"Best", fmtBest:v=> v==null?"—":String(v)},
    {id:"flow",   name:"Flow",   desc:"Watch the sequence, then repeat it", grad:"linear-gradient(150deg,#34c759,#30d158)",
      icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>`,
      bestLabel:"Level", fmtBest:v=> v==null?"—":String(v)},
    {id:"word",   name:"Word Search", desc:"Find six subjects in the grid", grad:"linear-gradient(150deg,#bf5af2,#5b6cff)",
      icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
      bestLabel:"Fastest", fmtBest:v=> v==null?"—":fmtClock(v)},
  ];
  function fmtClock(ms){ const s=Math.floor(ms/1000); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
  const gameById = id => GAMES.find(g=>g.id===id);

  /* ---- Sound FX (off by default, persisted) — short WebAudio blips ---- */
  const SND_KEY = "bsgy-apple-arcade-sound";
  let soundOn = false;
  try{ soundOn = localStorage.getItem(SND_KEY)==="1"; }catch(e){}
  let audioCtx = null;
  function setSound(on){ soundOn = on; try{ localStorage.setItem(SND_KEY, on?"1":"0"); }catch(e){} }
  function blip(freq, dur, type){
    if(!soundOn) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended") audioCtx.resume();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type||"sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t+0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t+(dur||0.12));
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t+(dur||0.12)+0.02);
    }catch(e){}
  }
  // named cues kept short and distinct
  const sfx = {
    tap:   ()=> blip(420, 0.07, "sine"),
    move:  ()=> blip(330, 0.06, "triangle"),
    good:  ()=> blip(660, 0.10, "sine"),
    great: ()=> { blip(700,0.10,"sine"); setTimeout(()=>blip(980,0.12,"sine"),90); },
    bad:   ()=> blip(150, 0.16, "sawtooth"),
    win:   ()=> { [523,659,784,1046].forEach((f,i)=> setTimeout(()=>blip(f,0.14,"sine"), i*100)); },
  };

  /* ---- Daily Challenge seed for Word Search (same all day) ---- */
  function todaySeed(){
    const d = new Date();
    return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  }
  function dailyLabel(){
    return new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
  }
  // deterministic PRNG (mulberry32) so the daily puzzle is stable for the day
  function makeRng(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let active = null;     // {id, destroy()}
  const homeEl = ()=> $("#arcadeHome");
  const viewEl = ()=> $("#gameView");

  function renderHome(){
    HS = loadHS();
    const cards = GAMES.map(g=>`
      <button class="gamecard" data-game="${g.id}">
        <span class="gicon" style="background:${g.grad};">${g.icon}</span><!-- icon is trusted inline svg -->
        <span class="ginfo">
          <span class="gname">${esc(g.name)}${g.id==="word"?' <span class="dailybadge">Daily</span>':''}</span>
          <span class="gdesc">${esc(g.desc)}</span>
        </span>
        <span class="gbest"><span class="bl">${esc(g.bestLabel)}</span><span class="bv">${esc(g.fmtBest(getBest(g.id)))}</span></span>
      </button>`).join("");

    const panel = `
      <div class="bestpanel">
        <div class="bph">
          <span class="bpt">Best scores</span>
          <label class="soundtoggle">
            Sound FX
            <span class="toggle"><input type="checkbox" id="arcadeSound"${soundOn?" checked":""} /><span class="tk"></span></span>
          </label>
        </div>
        ${GAMES.map(g=>{
          const v = getBest(g.id);
          const none = v==null;
          return `<div class="bestrow">
            <div><div class="brn">${esc(g.name)}</div><div class="brl">${esc(g.bestLabel)}${g.id==="word"?" · Daily "+esc(dailyLabel()):""}</div></div>
            <div class="brv${none?" none":""}">${esc(g.fmtBest(v))}</div>
          </div>`;
        }).join("")}
      </div>`;

    homeEl().innerHTML = cards + panel;
    $$("[data-game]", homeEl()).forEach(b=> b.addEventListener("click", ()=> play(b.dataset.game)));
    const st = $("#arcadeSound");
    if(st) st.addEventListener("change", e=>{ setSound(e.target.checked); if(e.target.checked) sfx.good(); });
  }

  function play(id){
    exit();
    homeEl().style.display = "none";
    viewEl().style.display = "block";
    if(id==="slide")  active = Slide(viewEl());
    else if(id==="aim")  active = Aim(viewEl());
    else if(id==="flow") active = Flow(viewEl());
    else if(id==="word") active = Word(viewEl());
  }
  // return to the arcade home (also called when leaving the Games tab)
  function exit(){
    if(active){ try{ active.destroy(); }catch(e){} active = null; }
    const v = viewEl(); if(v){ v.style.display="none"; v.innerHTML=""; }
    const h = homeEl(); if(h){ h.style.display=""; renderHome(); }
  }

  // shared chrome for a game view
  function shell(host, opts){
    // opts: {title, pods:[{id,label,init}], stageHTML}
    host.innerHTML = `
      <div class="gamebar">
        <button class="backbtn" data-back>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 5l-7 7 7 7" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Arcade
        </button>
        <div class="scorepods">
          ${opts.pods.map(p=>`<div class="pod"><div class="pl">${esc(p.label)}</div><div class="pv" data-pod="${p.id}">${esc(p.init)}</div></div>`).join("")}
        </div>
      </div>
      <div class="stage" data-stage>
        ${opts.stageHTML}
        <div class="goverlay" data-overlay></div>
      </div>`;
    host.querySelector("[data-back]").addEventListener("click", ()=> exit());
    const stage = host.querySelector("[data-stage]");
    return {
      stage,
      pod:(id,val)=>{ const el = host.querySelector(`[data-pod="${id}"]`); if(el) el.textContent = val; },
      overlay:(title,desc,actions)=>{
        const ov = host.querySelector("[data-overlay]");
        ov.innerHTML = `<div class="ot">${title}</div><div class="od">${esc(desc)}</div><div class="oacts"></div>`;
        const acts = ov.querySelector(".oacts");
        (actions||[]).forEach(a=>{
          const b = document.createElement("button");
          b.className = a.ghost ? "btn ghost" : "btn";
          b.textContent = a.label;
          b.addEventListener("click", a.onClick);
          acts.appendChild(b);
        });
        ov.classList.add("show");
      },
      hideOverlay:()=>{ host.querySelector("[data-overlay]").classList.remove("show"); },
    };
  }

  /* ---------------------------------------------------------
     GAME 1 — SLIDE (15-puzzle)
  --------------------------------------------------------- */
  function Slide(host){
    const N = 4, GAP = 8;
    let best = getBest("slide");
    const ui = shell(host, {
      pods:[{id:"moves",label:"Moves",init:"0"},{id:"best",label:"Fewest",init:best!=null?String(best):"—"}],
      stageHTML:`
        <div class="gmsg" data-msg>Slide tiles into order. Arrow keys or tap.</div>
        <div class="slide-grid" data-grid tabindex="0"></div>
        <button class="btn ghost sm" data-restart>Shuffle</button>`
    });
    const gridEl = host.querySelector("[data-grid]");
    // board: array of 16, value 0 = gap. index = r*N + c. tiles keyed by value.
    let board, moves, tiles, solved;

    function place(el, idx){
      const r = Math.floor(idx/N), c = idx%N;
      el.style.width  = `calc((100% - ${GAP*(N-1)}px)/${N})`;
      el.style.height = el.style.width;
      el.style.left = `calc(${c} * ((100% - ${GAP*(N-1)}px)/${N} + ${GAP}px))`;
      el.style.top  = `calc(${r} * ((100% - ${GAP*(N-1)}px)/${N} + ${GAP}px))`;
    }
    function isSolved(b){ for(let i=0;i<15;i++) if(b[i]!==i+1) return false; return b[15]===0; }
    function solvable(b){
      const arr = b.filter(v=>v!==0);
      let inv=0;
      for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++) if(arr[i]>arr[j]) inv++;
      const gapRowFromBottom = N - Math.floor(b.indexOf(0)/N);
      // 4-wide: solvable when (blank on even row from bottom) == (inversions odd)
      return (gapRowFromBottom%2===0) ? (inv%2===1) : (inv%2===0);
    }
    function shuffle(){
      let b;
      do{
        b = Array.from({length:16},(_,i)=>(i+1)%16); // 1..15,0
        for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; }
      } while(!solvable(b) || isSolved(b));
      return b;
    }
    function build(){
      gridEl.innerHTML="";
      tiles={};
      for(let i=0;i<16;i++){
        const v = board[i];
        if(v===0) continue;
        const el = document.createElement("button");
        el.className = "stile";
        el.textContent = v;
        el.addEventListener("click", ()=> tapTile(v));
        gridEl.appendChild(el);
        tiles[v]=el;
        place(el, i);
      }
    }
    function repaint(){
      for(let i=0;i<16;i++){ const v=board[i]; if(v!==0) place(tiles[v], i); }
    }
    function reset(){
      board = shuffle(); moves=0; solved=false;
      ui.pod("moves","0"); ui.hideOverlay();
      host.querySelector("[data-msg]").textContent="Slide tiles into order. Arrow keys or tap.";
      build();
    }
    function gapIdx(){ return board.indexOf(0); }
    function tapTile(v){
      if(solved) return;
      const ti = board.indexOf(v), gi = gapIdx();
      const tr=Math.floor(ti/N), tc=ti%N, gr=Math.floor(gi/N), gc=gi%N;
      if((tr===gr && Math.abs(tc-gc)===1) || (tc===gc && Math.abs(tr-gr)===1)){
        board[gi]=v; board[ti]=0;
        moves++; ui.pod("moves",String(moves));
        place(tiles[v], gi);
        sfx.move();
        checkWin();
      }
    }
    // arrow keys: slide the tile that would move INTO the gap from that direction
    function slide(dir){
      if(solved) return;
      const gi = gapIdx(), gr=Math.floor(gi/N), gc=gi%N;
      let ti=-1;
      if(dir==="up"    && gr<N-1) ti=(gr+1)*N+gc;   // tile below moves up
      if(dir==="down"  && gr>0)   ti=(gr-1)*N+gc;   // tile above moves down
      if(dir==="left"  && gc<N-1) ti=gr*N+(gc+1);   // tile to right moves left
      if(dir==="right" && gc>0)   ti=gr*N+(gc-1);   // tile to left moves right
      if(ti>=0) tapTile(board[ti]);
    }
    function checkWin(){
      if(isSolved(board)){
        solved=true;
        Object.values(tiles).forEach(el=> el.classList.add("done"));
        const isBest = best==null || moves<best;
        if(isBest){ best=moves; setBest("slide",best); ui.pod("best",String(best)); }
        sfx.win();
        ui.overlay("Solved","Ordered in "+moves+" moves"+(isBest?" · new best":""),[
          {label:"Shuffle", onClick:()=> reset()},
        ]);
      }
    }
    function onKey(e){
      // don't steal keys while an overlay (search/shortcuts/welcome) is open
      if(document.querySelector(".overlay.show")) return;
      const map={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
                 w:"up",s:"down",a:"left",d:"right",W:"up",S:"down",A:"left",D:"right"};
      const dir=map[e.key];
      if(dir){ e.preventDefault(); slide(dir); }
    }
    document.addEventListener("keydown", onKey);
    // swipe
    let sx=0,sy=0,tc=false;
    gridEl.addEventListener("touchstart", e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;tc=true;}, {passive:true});
    gridEl.addEventListener("touchend", e=>{
      if(!tc)return; tc=false;
      const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
      if(Math.abs(dx)<22&&Math.abs(dy)<22)return;
      if(Math.abs(dx)>Math.abs(dy)) slide(dx>0?"right":"left"); else slide(dy>0?"down":"up");
    }, {passive:true});

    host.querySelector("[data-restart]").addEventListener("click", reset);
    reset();
    gridEl.focus();
    return { destroy(){ document.removeEventListener("keydown", onKey); } };
  }

  /* ---------------------------------------------------------
     GAME 2 — AIM (precision / reaction)
  --------------------------------------------------------- */
  function Aim(host){
    const DURATION = 30; // seconds
    let best = getBest("aim")||0;
    const ui = shell(host, {
      pods:[{id:"score",label:"Score",init:"0"},{id:"time",label:"Time",init:"30"},{id:"best",label:"Best",init:String(best)}],
      stageHTML:`
        <div class="gmsg" data-msg>Hit the dot. Thirty seconds.</div>
        <div class="aim-board" data-board>
          <div class="aim-flash" data-flash></div>
          <div class="aim-dot" data-dot></div>
        </div>
        <button class="btn ghost sm" data-restart>Restart</button>`
    });
    const boardEl = host.querySelector("[data-board]");
    const dotEl = host.querySelector("[data-dot]");
    const flashEl = host.querySelector("[data-flash]");
    let score, running, timeLeft, hits, totalRT, lastSpawn, timer, dotSize, ended;

    function spawn(){
      const r = boardEl.getBoundingClientRect();
      dotSize = Math.max(34, Math.min(58, r.width*0.13));
      dotEl.style.width = dotSize+"px"; dotEl.style.height = dotSize+"px";
      const pad = dotSize/2 + 4;
      const x = pad + Math.random()*(r.width - pad*2);
      const y = pad + Math.random()*(r.height - pad*2);
      dotEl.style.left = x+"px"; dotEl.style.top = y+"px";
      dotEl.classList.remove("in"); void dotEl.offsetWidth; dotEl.classList.add("in");
      lastSpawn = performance.now();
    }
    function reset(){
      score=0; hits=0; totalRT=0; running=false; ended=false; timeLeft=DURATION;
      clearInterval(timer);
      ui.pod("score","0"); ui.pod("time",String(DURATION));
      ui.hideOverlay();
      dotEl.classList.remove("in");
      host.querySelector("[data-msg]").textContent="Hit the dot. Thirty seconds.";
    }
    function start(){
      if(running||ended) return;
      running=true;
      host.querySelector("[data-msg]").textContent="";
      spawn();
      timer = setInterval(()=>{
        timeLeft--; ui.pod("time", String(Math.max(0,timeLeft)));
        if(timeLeft<=0) end();
      }, 1000);
    }
    function end(){
      running=false; ended=true; clearInterval(timer);
      dotEl.classList.remove("in");
      const avg = hits? Math.round(totalRT/hits) : 0;
      const isBest = score>best;
      if(isBest){ best=score; setBest("aim",best); ui.pod("best",String(best)); }
      isBest ? sfx.win() : sfx.tap();
      ui.overlay("Time", "Score "+score+(hits?(" · "+avg+" ms avg"):"")+(isBest?" · new best":""),[
        {label:"Play again", onClick:()=> reset()},
      ]);
    }
    dotEl.addEventListener("pointerdown", e=>{
      e.stopPropagation();
      if(ended) return;
      if(!running){ start(); return; }
      totalRT += performance.now()-lastSpawn; hits++;
      score++; ui.pod("score",String(score));
      sfx.good();
      spawn();
    });
    boardEl.addEventListener("pointerdown", ()=>{
      if(ended) return;
      if(!running){ start(); return; }
      score = Math.max(0, score-1); ui.pod("score",String(score)); // miss penalty
      sfx.bad();
      flashEl.classList.remove("show"); void flashEl.offsetWidth; flashEl.classList.add("show");
    });

    host.querySelector("[data-restart]").addEventListener("click", reset);
    reset();
    return { destroy(){ clearInterval(timer); } };
  }

  /* ---------------------------------------------------------
     GAME 3 — FLOW (Simon memory)
  --------------------------------------------------------- */
  function Flow(host){
    let best = getBest("flow")||0;
    const ui = shell(host, {
      pods:[{id:"level",label:"Level",init:"0"},{id:"best",label:"Best",init:String(best)}],
      stageHTML:`
        <div class="gmsg" data-msg>Press Start, watch, then repeat.</div>
        <div class="flow-grid" data-grid>
          <button class="fpad p0" data-pad="0" aria-label="Pad 1"></button>
          <button class="fpad p1" data-pad="1" aria-label="Pad 2"></button>
          <button class="fpad p2" data-pad="2" aria-label="Pad 3"></button>
          <button class="fpad p3" data-pad="3" aria-label="Pad 4"></button>
        </div>
        <button class="btn sm" data-start>Start</button>`
    });
    const pads = Array.from(host.querySelectorAll("[data-pad]"));
    let seq, input, level, locking, dead, timeouts=[];

    function later(fn,ms){ const t=setTimeout(fn,ms); timeouts.push(t); return t; }
    function clearTimers(){ timeouts.forEach(clearTimeout); timeouts=[]; }
    const PAD_TONES = [392, 523, 659, 784]; // G4 C5 E5 G5
    function lit(i){
      pads[i].classList.add("lit");
      blip(PAD_TONES[i], 0.18, "sine");
      later(()=> pads[i].classList.remove("lit"), 320);
    }
    function reset(){
      clearTimers();
      seq=[]; input=[]; level=0; locking=false; dead=false;
      ui.pod("level","0"); ui.hideOverlay();
      pads.forEach(p=>p.classList.remove("lit"));
      host.querySelector("[data-msg]").textContent="Press Start, watch, then repeat.";
    }
    function nextRound(){
      input=[];
      seq.push(Math.floor(Math.random()*4));
      level=seq.length; ui.pod("level",String(level));
      playSeq();
    }
    function playSeq(){
      locking=true;
      host.querySelector("[data-msg]").textContent="Watch";
      let i=0;
      const tick=()=>{
        if(i>=seq.length){ locking=false; host.querySelector("[data-msg]").textContent="Your turn"; return; }
        lit(seq[i]); i++;
        later(tick, 560);
      };
      later(tick, 520);
    }
    function press(i){
      if(locking||dead||seq.length===0) return;
      lit(i);
      input.push(i);
      const k=input.length-1;
      if(input[k]!==seq[k]){ fail(); return; }
      if(input.length===seq.length){
        locking=true;
        later(nextRound, 620);
      }
    }
    function fail(){
      dead=true; locking=true;
      sfx.bad();
      const reached = Math.max(0, level-1); // levels fully completed before the miss
      const isBest = reached>best;
      if(isBest){ best=reached; setBest("flow",best); ui.pod("best",String(best)); }
      ui.overlay("Missed","You cleared level "+reached+(isBest&&reached>0?" · new best":""),[
        {label:"Play again", onClick:()=> { reset(); later(nextRound,400); }},
      ]);
    }
    pads.forEach((p,i)=> p.addEventListener("click", ()=> press(i)));
    host.querySelector("[data-start]").addEventListener("click", ()=>{
      reset(); later(nextRound, 350);
    });
    reset();
    return { destroy(){ clearTimers(); } };
  }

  /* ---------------------------------------------------------
     GAME 4 — WORD SEARCH
  --------------------------------------------------------- */
  function Word(host){
    const SIZE = 10;
    const WORDS = ["BIOLOGY","FRENCH","ALGEBRA","DRAMA","ENZYME","ESSAY"];
    const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let best = getBest("word");
    const ui = shell(host, {
      pods:[{id:"found",label:"Found",init:"0 / 6"},{id:"time",label:"Time",init:"0:00"},{id:"best",label:"Fastest",init:best!=null?fmtClock(best):"—"}],
      stageHTML:`
        <div class="gmsg" data-msg>Tap the first and last letter of a word.</div>
        <div class="ws-wrap">
          <div class="ws-grid" data-grid></div>
          <div class="ws-words" data-words></div>
        </div>
        <button class="btn ghost sm" data-restart>New puzzle</button>`
    });
    const gridEl = host.querySelector("[data-grid]");
    const wordsEl = host.querySelector("[data-words]");
    let board, placed, foundSet, first, t0, timer, running, cells;
    let daily = true;            // first load is the seeded Daily puzzle
    let rng = makeRng(todaySeed());
    function rint(n){ return Math.floor(rng()*n); }
    function genGrid(){
      // returns {board, placements:[{word, cells:[idx...]}]} or null on failure
      const b = Array.from({length:SIZE*SIZE}, ()=>null);
      const placements=[];
      const dirs=[[0,1],[1,0]]; // horizontal, vertical
      for(const word of WORDS){
        let ok=false;
        for(let attempt=0; attempt<200 && !ok; attempt++){
          const [dr,dc]=dirs[rint(dirs.length)];
          const len=word.length;
          const maxR = dr? SIZE-len : SIZE-1;
          const maxC = dc? SIZE-len : SIZE-1;
          const r0=rint(maxR+1), c0=rint(maxC+1);
          let fits=true; const idxs=[];
          for(let i=0;i<len;i++){
            const r=r0+dr*i, c=c0+dc*i, idx=r*SIZE+c;
            if(b[idx]!==null && b[idx]!==word[i]){ fits=false; break; }
            idxs.push(idx);
          }
          if(!fits) continue;
          idxs.forEach((idx,i)=> b[idx]=word[i]);
          placements.push({word, cells:idxs});
          ok=true;
        }
        if(!ok) return null;
      }
      for(let i=0;i<b.length;i++) if(b[i]===null) b[i]=ALPHA[rint(26)];
      return {board:b, placements};
    }
    function reset(){
      // Daily puzzle is reproducible from today's seed; "New puzzle" uses random.
      rng = daily ? makeRng(todaySeed()) : Math.random;
      let g=null;
      for(let i=0;i<40 && !g;i++) g=genGrid();
      board=g.board; placed=g.placements; foundSet=new Set(); first=null; running=false;
      clearInterval(timer); t0=null;
      ui.pod("found","0 / 6"); ui.pod("time","0:00"); ui.hideOverlay();
      host.querySelector("[data-msg]").textContent = daily
        ? "Daily challenge · "+dailyLabel()+". Tap the first and last letter of a word."
        : "Tap the first and last letter of a word.";
      const restartBtn = host.querySelector("[data-restart]");
      if(restartBtn) restartBtn.textContent = daily ? "Random puzzle" : "New puzzle";
      gridEl.innerHTML="";
      cells=[];
      board.forEach((ch,i)=>{
        const el=document.createElement("button");
        el.className="ws-cell"; el.textContent=ch; el.dataset.i=i;
        el.addEventListener("click", ()=> tap(i));
        gridEl.appendChild(el); cells.push(el);
      });
      wordsEl.innerHTML = WORDS.map(w=>`<span class="ws-word" data-w="${w}">${w}</span>`).join("");
    }
    function startTimer(){
      if(running) return; running=true; t0=Date.now();
      timer=setInterval(()=> ui.pod("time", fmtClock(Date.now()-t0)), 250);
    }
    function lineBetween(a,b){
      const ar=Math.floor(a/SIZE), ac=a%SIZE, br=Math.floor(b/SIZE), bc=b%SIZE;
      const dr=br-ar, dc=bc-ac;
      if(dr!==0 && dc!==0) return null;        // must be straight (no diagonals)
      const len = Math.max(Math.abs(dr),Math.abs(dc))+1;
      const sr=Math.sign(dr), sc=Math.sign(dc);
      const out=[];
      for(let i=0;i<len;i++) out.push((ar+sr*i)*SIZE + (ac+sc*i));
      return out;
    }
    function tap(i){
      if(foundSet.size===WORDS.length) return;
      startTimer();
      if(first===null){
        first=i; cells[i].classList.add("sel");
        return;
      }
      if(first===i){ cells[i].classList.remove("sel"); first=null; return; }
      const line = lineBetween(first,i);
      cells[first].classList.remove("sel");
      const start=first; first=null;
      if(!line){ return; }
      const str = line.map(idx=>board[idx]).join("");
      const rev = str.split("").reverse().join("");
      const match = WORDS.find(w=> (w===str||w===rev) && !foundSet.has(w));
      if(match){
        foundSet.add(match);
        line.forEach(idx=> cells[idx].classList.add("found"));
        const chip = wordsEl.querySelector(`[data-w="${match}"]`);
        if(chip) chip.classList.add("hit");
        ui.pod("found", foundSet.size+" / "+WORDS.length);
        sfx.good();
        if(foundSet.size===WORDS.length) win();
      }
    }
    function win(){
      clearInterval(timer); running=false;
      const ms = Date.now()-t0;
      const isBest = best==null || ms<best;
      if(isBest){ best=ms; setBest("word",best); ui.pod("best",fmtClock(best)); }
      sfx.win();
      ui.overlay("All found","Cleared in "+fmtClock(ms)+(isBest?" · new best":""),[
        {label:"New puzzle", onClick:()=> reset()},
      ]);
    }
    host.querySelector("[data-restart]").addEventListener("click", ()=>{ daily=false; reset(); });
    reset();
    return { destroy(){ clearInterval(timer); } };
  }

  return { renderHome, exit, play };
})();

/* ============================================================
   TOOLTIP + TOAST
============================================================ */
const tipEl = $("#tip");
function showTip(x, y, html){ tipEl.innerHTML = html; tipEl.style.left = x+"px"; tipEl.style.top = (y-10)+"px"; tipEl.classList.add("show"); }
function hideTip(){ tipEl.classList.remove("show"); }

function toast(n){
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="tic" style="background:${n.color};">${n.ic}</span>
    <div><div class="tt">${esc(n.tt)}</div><div class="td">${esc(n.td)}</div><div class="tsrc">${esc(n.src)}</div></div>`;
  $("#toasts").appendChild(el);
  requestAnimationFrame(()=> requestAnimationFrame(()=> el.classList.add("in")));
  setTimeout(()=>{ el.classList.remove("in"); setTimeout(()=> el.remove(), 360); }, 4200);
}
let notifIdx = 0;
function testNotification(){
  if(!state.notif){ toast({ic:"✕",color:"#86868b",tt:"Notifications are off",td:"Turn them on in Settings to get pings.",src:"Better SGY"}); return; }
  const n = NOTIFS[notifIdx % NOTIFS.length]; notifIdx++;
  toast(n);
}

/* ============================================================
   OVERLAY PLUMBING (search, shortcuts, welcome)
============================================================ */
function anyOverlayOpen(){ return $$(".overlay.show").length>0; }
function closeAllOverlays(){ $$(".overlay.show").forEach(o=> o.classList.remove("show")); }

/* ---- Command palette / global search ---- */
const SCREEN_INDEX = [
  {screen:"overview", label:"Overview", meta:"Your dashboard"},
  {screen:"grades",   label:"Grades",   meta:"Per-course gradebook"},
  {screen:"assign",   label:"Assignments", meta:"What's due"},
  {screen:"cal",      label:"Calendar", meta:"Due dates"},
  {screen:"announce", label:"Announcements", meta:"Teacher posts"},
  {screen:"materials",label:"Materials", meta:"Files & submissions"},
  {screen:"games",    label:"Games", meta:"Arcade"},
  {screen:"nostalgia",label:"Nostalgia", meta:"Grade snapshots over time"},
  {screen:"settings", label:"Settings", meta:"Look & sections"},
];
let palItems = [];   // current filtered results (flat)
let palSel = 0;

function buildSearchResults(q){
  q = q.trim().toLowerCase();
  const groups = [];
  const match = s => s.toLowerCase().includes(q);

  // Screens
  const screens = SCREEN_INDEX.filter(s=> !q || match(s.label) || match(s.meta));
  if(screens.length) groups.push({title:"Screens", items: screens.map(s=>({
    kind:"Screen", name:s.label, meta:s.meta, icon:"screen",
    run:()=> go(s.screen),
  }))});

  // Courses
  const courses = COURSES.filter(c=> !q || match(c.name) || match(c.teacher));
  if(courses.length) groups.push({title:"Courses", items: courses.map(c=>({
    kind:"Course", name:c.name, meta:c.teacher+" · "+c.grade+"%", dot:c.accent,
    run:()=>{ selectCourse(c.id); go("grades"); },
  }))});

  // Assignments
  const asg = AGENDA.filter(a=> !q || match(a.t) || match(courseById(a.course).name));
  if(asg.length) groups.push({title:"Assignments", items: asg.map(a=>{
    const c = courseById(a.course);
    const grp = asgEffectiveGroup(a);
    const meta = c.name+" · "+(grp==="done"?"Done":grp==="missing"?"Missing":a.dueLabel);
    return { kind:"Assignment", name:a.t, meta, dot:c.accent, run:()=> go("assign") };
  })});

  // Announcements
  const ann = ANNOUNCEMENTS.filter(a=> !q || match(a.title) || match(a.body) || match(courseById(a.course).name));
  if(ann.length) groups.push({title:"Announcements", items: ann.map(a=>{
    const c = courseById(a.course);
    return { kind:"Post", name:a.title, meta:c.name+" · "+c.teacher, dot:c.accent, run:()=> go("announce") };
  })});

  // Materials
  const mats = MATERIALS.filter(m=> !q || match(m.name) || match(m.meta));
  if(mats.length) groups.push({title:"Materials", items: mats.map(m=>({
    kind:"Material", name:m.name, meta:m.meta, icon:"file",
    run:()=>{ state.material = m.id; save(); renderMaterialsList(); renderMaterialDetail(); go("materials"); },
  }))});

  return groups;
}

function renderSearch(){
  const q = $("#searchInput").value;
  const groups = buildSearchResults(q);
  palItems = [];
  const res = $("#searchResults");
  if(!groups.length){
    res.innerHTML = `<div class="palempty">No results for “${esc(q)}”.</div>`;
    return;
  }
  let html = "";
  groups.forEach(g=>{
    html += `<div class="palgrp">${esc(g.title)}</div>`;
    g.items.forEach(it=>{
      const i = palItems.length;
      palItems.push(it);
      const lead = it.dot
        ? `<span class="pdot" style="background:${it.dot};"></span>`
        : `<span class="picon">${it.icon==="file"
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2z" stroke-width="1.5" stroke-linejoin="round"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" stroke-width="1.5"/><path d="M4 9h16" stroke-width="1.5"/></svg>'}</span>`;
      html += `<div class="palitem" data-i="${i}">${lead}
        <span class="pmain"><span class="pname">${esc(it.name)}</span><span class="pmeta">${esc(it.meta)}</span></span>
        <span class="pkind">${esc(it.kind)}</span></div>`;
    });
  });
  res.innerHTML = html;
  palSel = 0;
  highlightSel();
  $$(".palitem", res).forEach(el=>{
    el.addEventListener("mousemove", ()=>{ palSel = +el.dataset.i; highlightSel(); });
    el.addEventListener("click", ()=> runPalItem(+el.dataset.i));
  });
}
function highlightSel(){
  $$(".palitem").forEach(el=> el.classList.toggle("sel", +el.dataset.i===palSel));
  const sel = $(`.palitem[data-i="${palSel}"]`);
  if(sel) sel.scrollIntoView({block:"nearest"});
}
function runPalItem(i){
  const it = palItems[i];
  if(!it) return;
  closeSearch();
  it.run();
}
function openSearch(){
  closeAllOverlays();
  $("#searchOverlay").classList.add("show");
  const inp = $("#searchInput");
  inp.value = "";
  renderSearch();
  setTimeout(()=> inp.focus(), 0);
}
function closeSearch(){ $("#searchOverlay").classList.remove("show"); }

$("#searchBtn").addEventListener("click", openSearch);
$("#searchInput").addEventListener("input", renderSearch);
$("#searchInput").addEventListener("keydown", e=>{
  if(e.key==="ArrowDown"){ e.preventDefault(); if(palItems.length){ palSel=(palSel+1)%palItems.length; highlightSel(); } }
  else if(e.key==="ArrowUp"){ e.preventDefault(); if(palItems.length){ palSel=(palSel-1+palItems.length)%palItems.length; highlightSel(); } }
  else if(e.key==="Enter"){ e.preventDefault(); runPalItem(palSel); }
});
$("#searchOverlay").addEventListener("click", e=>{ if(e.target.id==="searchOverlay") closeSearch(); });

/* ---- Shortcuts help ---- */
function openShortcuts(){ closeAllOverlays(); $("#shortcutsOverlay").classList.add("show"); }
function closeShortcuts(){ $("#shortcutsOverlay").classList.remove("show"); }
$$("[data-close-shortcuts]").forEach(b=> b.addEventListener("click", closeShortcuts));
$("#shortcutsOverlay").addEventListener("click", e=>{ if(e.target.id==="shortcutsOverlay") closeShortcuts(); });

/* ---- First-run welcome ---- */
const WELCOME_KEY = "bsgy-apple-welcomed";
function markWelcomed(){ try{ localStorage.setItem(WELCOME_KEY, "1"); }catch(e){} }
function showWelcomeIfFirstRun(){ return; /* auto first-run popup disabled — go straight to the overview (manual tour stays in Settings) */
  let seen = false;
  try{ seen = localStorage.getItem(WELCOME_KEY)==="1"; }catch(e){}
  if(!seen){ $("#welcomeOverlay").classList.add("show"); markWelcomed(); /* persist on first show — never auto-run again */ }
}
function dismissWelcome(){ $("#welcomeOverlay").classList.remove("show"); }
$("#welcomeSkip").addEventListener("click", ()=>{ dismissWelcome(); markWelcomed(); });
$("#welcomeTour").addEventListener("click", ()=>{ dismissWelcome(); Tour.start(); });
$("#setTour").addEventListener("click", ()=>{ go("settings"); Tour.start(); });
$("#helpTour").addEventListener("click", ()=>{ closeShortcuts(); Tour.start(); });

/* ============================================================
   GUIDED TUTORIAL — coachmark tour
   Each step points at a real element, dims the rest, and (where it
   makes sense) waits for the user to actually perform the action.
============================================================ */
const Tour = (function(){
  const PAD = 8;            // spotlight padding around target
  let i = 0, active = false;
  let cleanup = null;       // per-step listener teardown
  let advanced = false;     // guard so an action only auto-advances once

  // Steps describe: where they live (screen), what they point at,
  // copy, and an optional interactive "try" with a detector.
  const STEPS = [
    {
      screen:"overview",
      target:()=> $(".brand"),
      title:"This is the demo",
      body:'Better SGY draws a calmer view over your real Schoology page. These grades are sample data, so you can explore freely. In the live version it sits on top of your own gradebook. You can switch the whole look — <b>Apple, Halo, Slate, Friendly</b> — in Settings.',
    },
    {
      screen:"overview",
      target:()=> $("#nav"),
      place:"right",
      title:"Get around",
      body:'Click any tab in the sidebar — or stay on the keyboard. Press <span class="kbd">g</span> then a letter to jump: <b>o</b> overview, <b>g</b> grades, <b>a</b> assignments, <b>c</b> calendar, <b>n</b> announcements, <b>m</b> materials, <b>e</b> games, <b>s</b> settings.',
      tryText:'Press g then a to jump to Assignments.',
      arm(advance){
        let pending=false, t=null;
        const onKey=(e)=>{
          if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||"")) return;
          if(pending){
            pending=false; clearTimeout(t);
            if(e.key.toLowerCase()==="a") advance();
            return;
          }
          if(e.key==="g"||e.key==="G"){ pending=true; t=setTimeout(()=>pending=false,900); }
        };
        document.addEventListener("keydown", onKey, true);
        return ()=> document.removeEventListener("keydown", onKey, true);
      },
    },
    {
      screen:"overview",
      target:()=> $("#searchBtn"),
      title:"Search everything",
      body:'Press <span class="kbd">⌘K</span> (<span class="kbd">Ctrl K</span> on Windows) to open search. Find any course, assignment, post, or screen, then press Enter to jump there.',
      tryText:'Press ⌘K (Ctrl+K) to open search.',
      arm(advance){
        const onKey=(e)=>{
          if((e.metaKey||e.ctrlKey) && (e.key==="k"||e.key==="K")) advance();
        };
        document.addEventListener("keydown", onKey, true);
        return ()=> document.removeEventListener("keydown", onKey, true);
      },
    },
    {
      screen:"overview",
      target:()=> $("#searchBtn"),
      title:"Every shortcut",
      body:'Press <span class="kbd">?</span> anytime for the full list of keyboard shortcuts. <span class="kbd">Esc</span> closes any overlay.',
      tryText:'Press ? to see the shortcuts.',
      arm(advance){
        const onKey=(e)=>{
          if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||"")) return;
          if(e.key==="?") setTimeout(advance, 240);  // let the sheet open first
        };
        document.addEventListener("keydown", onKey, true);
        return ()=> document.removeEventListener("keydown", onKey, true);
      },
    },
    {
      screen:"overview",
      target:()=> $('#ovGallery .card') || $("#ovGallery"),
      title:"Open a course",
      body:'Click any course card to open its gradebook — every category, every assignment, and a grade-over-time chart.',
      tryText:'Click a course to open its grades.',
      arm(advance){
        const onClick=()=> advance();
        const cards = $$('#ovGallery [data-card]');
        cards.forEach(c=> c.addEventListener("click", onClick, {once:true}));
        return ()=> cards.forEach(c=> c.removeEventListener("click", onClick));
      },
    },
    {
      screen:"overview",
      target:()=> $('#nav .navitem[data-screen="games"]'),
      place:"right",
      title:"Take a break",
      body:'The Games tab has four quick arcade games — <b>Slide</b>, <b>Aim</b>, <b>Flow</b>, and <b>Word Search</b>. Each saves your best score.',
    },
    {
      screen:"overview",
      target:null,             // centered, no target
      title:"You're set",
      body:'That\'s the tour. The essentials, any time:',
      cheat:true,
    },
  ];

  function setScreen(s){ if(s) go(s); }

  function rect(el){
    if(!el) return null;
    const r = el.getBoundingClientRect();
    return {x:r.left-PAD, y:r.top-PAD, w:r.width+PAD*2, h:r.height+PAD*2};
  }

  function layout(){
    const step = STEPS[i];
    const ring = $("#tourRing");
    const coach = $("#coach");
    const arrow = $("#coachArrow");
    const vw = window.innerWidth, vh = window.innerHeight;
    const dims = { t:$('.tour-dim[data-d="t"]'), b:$('.tour-dim[data-d="b"]'),
                   l:$('.tour-dim[data-d="l"]'), r:$('.tour-dim[data-d="r"]') };

    const el = step.target ? step.target() : null;
    const tr = rect(el);

    if(!tr){
      // No target: dim everything, center the coach, hide ring.
      dims.t.style.cssText = `top:0;left:0;width:${vw}px;height:${vh}px;`;
      dims.b.style.cssText = dims.l.style.cssText = dims.r.style.cssText = "width:0;height:0;";
      ring.style.opacity = "0";
      coach.style.left = Math.round((vw - coach.offsetWidth)/2)+"px";
      coach.style.top  = Math.round((vh - coach.offsetHeight)/2)+"px";
      arrow.style.display = "none";
      return;
    }

    // clamp target rect to viewport
    const tx = Math.max(0,tr.x), ty = Math.max(0,tr.y);
    const tw = Math.min(vw,tr.x+tr.w)-tx, th = Math.min(vh,tr.y+tr.h)-ty;

    ring.style.opacity = "1";
    ring.style.left = tx+"px"; ring.style.top = ty+"px";
    ring.style.width = tw+"px"; ring.style.height = th+"px";
    ring.classList.toggle("pulse", !!step.tryText);

    // four dim panels around the hole
    dims.t.style.cssText = `top:0;left:0;width:${vw}px;height:${Math.max(0,ty)}px;`;
    dims.b.style.cssText = `top:${ty+th}px;left:0;width:${vw}px;height:${Math.max(0,vh-ty-th)}px;`;
    dims.l.style.cssText = `top:${ty}px;left:0;width:${Math.max(0,tx)}px;height:${th}px;`;
    dims.r.style.cssText = `top:${ty}px;left:${tx+tw}px;width:${Math.max(0,vw-tx-tw)}px;height:${th}px;`;

    // place coach: prefer right of target, else below, else above, else left
    const cw = Math.min(360, vw-32);
    coach.style.width = cw+"px";
    const ch = coach.offsetHeight || 200;
    const gap = 16;
    let place = step.place || "auto";
    let left, top, arr={};

    const fitsRight = tx+tw+gap+cw <= vw-12;
    const fitsBelow = ty+th+gap+ch <= vh-12;
    const fitsAbove = ty-gap-ch >= 12;

    if(place==="auto") place = fitsRight ? "right" : (fitsBelow ? "bottom" : (fitsAbove ? "top" : "left"));

    if(place==="right" && !fitsRight) place = fitsBelow ? "bottom" : (fitsAbove ? "top" : "left");

    if(place==="right"){
      left = tx+tw+gap; top = ty + th/2 - ch/2;
      arr = {edge:"left", at: ()=> ({left:-7, top: clampArrow(ty+th/2 - top, ch)})};
    } else if(place==="left"){
      left = tx-gap-cw; top = ty + th/2 - ch/2;
      arr = {edge:"right", at: ()=> ({left:cw-7, top: clampArrow(ty+th/2 - top, ch)})};
    } else if(place==="top"){
      left = tx + tw/2 - cw/2; top = ty-gap-ch;
      arr = {edge:"bottom", at: ()=> ({top:ch-7, left: clampArrow(tx+tw/2 - left, cw)})};
    } else { // bottom
      left = tx + tw/2 - cw/2; top = ty+th+gap;
      arr = {edge:"top", at: ()=> ({top:-7, left: clampArrow(tx+tw/2 - left, cw)})};
    }

    // keep on screen
    left = Math.max(12, Math.min(left, vw-cw-12));
    top  = Math.max(12, Math.min(top, vh-ch-12));
    coach.style.left = Math.round(left)+"px";
    coach.style.top  = Math.round(top)+"px";

    // arrow
    arrow.style.display = "block";
    const a = arr.at();
    arrow.style.left = (a.left)+"px";
    arrow.style.top = (a.top)+"px";
    // hide the two borders that face inward so it reads as a pointer
    const inB = "1px solid var(--line)", noB = "1px solid transparent";
    arrow.style.borderTop = arrow.style.borderLeft = inB;
    arrow.style.borderBottom = arrow.style.borderRight = noB;
  }
  function clampArrow(v, span){ return Math.max(14, Math.min(v-7, span-28)); }

  function renderStep(){
    const step = STEPS[i];
    advanced = false;
    if(cleanup){ cleanup(); cleanup=null; }

    setScreen(step.screen);

    $("#coachStep").textContent = `Step ${i+1} of ${STEPS.length}`;
    $("#coachTitle").textContent = step.title;
    $("#coachBody").innerHTML = step.body;

    // cheat sheet on the final step
    let cheatHtml = "";
    if(step.cheat){
      cheatHtml =
        '<div class="cheat">'+
          '<div class="cr"><span class="cd">Search everything</span><span class="ck"><span class="kbd">⌘</span><span class="kbd">K</span></span></div>'+
          '<div class="cr"><span class="cd">Jump to a screen</span><span class="ck"><span class="kbd">g</span><span class="kbd plain">then</span><span class="kbd">key</span></span></div>'+
          '<div class="cr"><span class="cd">All shortcuts</span><span class="ck"><span class="kbd">?</span></span></div>'+
        '</div>'+
        '<div class="ch-body" style="margin-top:12px;">Replay this any time from <b>Settings → Take the tour</b>.</div>';
    }
    // inject/clear the cheat sheet block (final step only)
    const prevCheat = document.getElementById("coachCheat");
    if(prevCheat) prevCheat.remove();
    if(cheatHtml) $("#coachBody").insertAdjacentHTML("afterend", `<span id="coachCheat">${cheatHtml}</span>`);

    // interactive "try"
    const tryEl = $("#coachTry");
    if(step.tryText){
      tryEl.style.display = "flex";
      tryEl.classList.remove("done");
      $("#coachTryText").textContent = step.tryText;
    } else {
      tryEl.style.display = "none";
    }

    // buttons
    $("#coachBack").style.visibility = i===0 ? "hidden" : "visible";
    $("#coachNext").textContent = (i===STEPS.length-1) ? "Done" : "Next";
    $("#coachSkip").style.display = (i===STEPS.length-1) ? "none" : "block";
    renderDots();

    // arm detector (after a frame so the target is laid out)
    requestAnimationFrame(()=>{
      layout();
      $("#coachNext").focus({preventScroll:true});
      if(step.arm){
        cleanup = step.arm(()=>{
          if(advanced) return; advanced = true;
          markTryDone();
          setTimeout(()=> next(), 520);
        });
      }
    });
  }

  function markTryDone(){
    const t = $("#coachTry");
    if(t && t.style.display!=="none") t.classList.add("done");
  }

  function renderDots(){
    $("#coachDots").innerHTML = STEPS.map((_,n)=>`<span class="d${n===i?" on":""}"></span>`).join("");
  }

  function start(){
    closeAllOverlays();
    i = 0; active = true;
    $("#tour").classList.add("show");
    renderStep();
  }
  function next(){
    if(i>=STEPS.length-1){ finish(); return; }
    i++; renderStep();
  }
  function back(){ if(i>0){ i--; renderStep(); } }
  function finish(){
    end();
    markWelcomed();
  }
  function end(){
    active = false;
    if(cleanup){ cleanup(); cleanup=null; }
    $("#tour").classList.remove("show");
    const c = document.getElementById("coachCheat"); if(c) c.remove();
  }

  // wiring
  $("#coachNext").addEventListener("click", next);
  $("#coachBack").addEventListener("click", back);
  $("#coachSkip").addEventListener("click", finish);
  window.addEventListener("resize", ()=>{ if(active) layout(); });
  window.addEventListener("scroll", ()=>{ if(active) layout(); }, true);

  return { start, isActive:()=>active, end };
})();

/* ---- Global keyboard shortcuts ---- */
let gPending = false, gTimer = null;
const G_MAP = {o:"overview", g:"grades", a:"assign", c:"cal", n:"announce", m:"materials", e:"games", h:"nostalgia", s:"settings"};
document.addEventListener("keydown", e=>{
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);

  // ⌘K / Ctrl+K — search (works even from a field; suppressed during the tour)
  if((e.metaKey||e.ctrlKey) && (e.key==="k"||e.key==="K")){
    e.preventDefault(); if(!Tour.isActive()) openSearch(); return;
  }
  // Esc — close any overlay, or skip the tour
  if(e.key==="Escape"){
    if(Tour.isActive()){ e.preventDefault(); Tour.end(); try{ localStorage.setItem(WELCOME_KEY,"1"); }catch(_){} return; }
    if(anyOverlayOpen()){ e.preventDefault(); closeAllOverlays(); }
    return;
  }
  if(inField) return;          // don't hijack typing
  if(e.metaKey||e.ctrlKey||e.altKey) return;

  // ? — shortcuts help (suppressed during the tour; the tour step handles it)
  if(e.key==="?"){ e.preventDefault(); if(!Tour.isActive()) openShortcuts(); return; }

  // \ — cycle to the next edition ("look")
  if(e.key==="\\"){ e.preventDefault(); if(!Tour.isActive() && !anyOverlayOpen()) cycleEdition(); return; }

  // g then <letter>
  if(gPending){
    const target = G_MAP[e.key.toLowerCase()];
    gPending = false; clearTimeout(gTimer);
    if(target){ e.preventDefault(); go(target); }
    return;
  }
  if(e.key==="g"||e.key==="G"){
    gPending = true;
    gTimer = setTimeout(()=> gPending=false, 900);
  }
});

/* ============================================================
   EXPORT DASHBOARD IMAGE
   Approach: serialize the Overview DOM into an <svg><foreignObject>,
   draw it to a <canvas>, and download via toDataURL. All content is
   inline (no external images/fonts), so the canvas does not taint.
   Falls back to the print dialog ("Save as PDF") if anything fails.
============================================================ */
function collectCSSText(){
  let css = "";
  for(const sheet of document.styleSheets){
    try{ for(const rule of sheet.cssRules) css += rule.cssText + "\n"; }catch(e){}
  }
  return css;
}
function exportOverviewPNG(){
  try{
    const node = $("#sc-overview .pad");
    const rect = node.getBoundingClientRect();
    const w = Math.ceil(rect.width), h = Math.ceil(node.scrollHeight);
    const scale = Math.min(2, window.devicePixelRatio||1);

    const clone = node.cloneNode(true);
    // drop the export button itself from the snapshot
    const ex = clone.querySelector(".ov-export"); if(ex) ex.remove();

    const theme = document.documentElement.getAttribute("data-theme")||"light";
    const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const css = collectCSSText();

    const xhtml = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`+
      `<foreignObject width="100%" height="100%">`+
      `<div xmlns="http://www.w3.org/1999/xhtml" data-theme="${theme}" `+
      `style="width:${w}px;background:${bg};">`+
      `<style>${css}</style>`+
      `<div class="canvas" style="overflow:visible;">${xhtml}</div>`+
      `</div></foreignObject></svg>`;

    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
    img.onload = ()=>{
      try{
        const canvas = document.createElement("canvas");
        canvas.width = w*scale; canvas.height = h*scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = png;
        a.download = "better-sgy-overview.png";
        a.click();
        toast({ic:"↓",color:"#0071e3",tt:"Saved dashboard",td:"better-sgy-overview.png",src:"Better SGY"});
      }catch(err){ exportFallback(); }
    };
    img.onerror = ()=> exportFallback();
    img.src = url;
  }catch(e){ exportFallback(); }
}
function exportFallback(){
  toast({ic:"⎙",color:"#0071e3",tt:"Opening print dialog",td:"Choose “Save as PDF” to keep a copy.",src:"Better SGY"});
  setTimeout(()=> window.print(), 350);
}
$("#ovExport").addEventListener("click", exportOverviewPNG);

/* ============================================================
   NOSTALGIA — grade snapshots saved to localStorage
============================================================ */
const NOS_KEY = "bsgy-apple-snapshots";
// The current term this app represents (used as the snapshot identity).
const CURRENT_TERM = {
  id: "2025-2026-fr-s2",
  label: "2025–2026 · Freshman · Semester 2",
  short: "Freshman · Semester 2",
};
function currentSnapshotData(){
  return {
    id: CURRENT_TERM.id,
    term: CURRENT_TERM.label,
    overall: 96.2,
    courses: COURSES.map(c=>({ name:c.name, grade:c.grade, letter:c.letter, accent:c.accent })),
  };
}
function loadSnapshots(){
  try{
    const raw = localStorage.getItem(NOS_KEY);
    if(raw){ const arr = JSON.parse(raw); if(Array.isArray(arr)) return arr; }
  }catch(e){}
  // Pre-seed one past term so the timeline is never empty.
  const seed = [{
    id: "2025-2026-fr-s1",
    term: "2025–2026 · Freshman · Semester 1",
    overall: 94.8,
    capturedAt: new Date(2026,0,15).getTime(),   // Jan 15, 2026
    courses: [
      {name:"Algebra 2 / Trig", grade:95.0, letter:"A",  accent:"#5b6cff"},
      {name:"Biology",          grade:93.5, letter:"A",  accent:"#34c759"},
      {name:"French 1",         grade:92.0, letter:"A",  accent:"#ff9f0a"},
      {name:"Drama",            grade:96.2, letter:"A",  accent:"#bf5af2"},
      {name:"Literature",       grade:91.0, letter:"A−", accent:"#0a84ff"},
      {name:"PE 9",             grade:99.0, letter:"A",  accent:"#30d158"},
    ],
  }];
  try{ localStorage.setItem(NOS_KEY, JSON.stringify(seed)); }catch(e){}
  return seed;
}
function saveSnapshots(arr){ try{ localStorage.setItem(NOS_KEY, JSON.stringify(arr)); }catch(e){} }
function snapshotsSorted(){
  return loadSnapshots().slice().sort((a,b)=> (b.capturedAt||0) - (a.capturedAt||0));
}
function fmtSnapDate(ms){
  try{
    return new Date(ms).toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
  }catch(e){ return ""; }
}
function captureSnapshot(){
  const arr = loadSnapshots();
  const data = currentSnapshotData();
  const now = Date.now();
  const existing = arr.find(s=> s.id === data.id);
  if(existing){
    existing.term = data.term; existing.overall = data.overall;
    existing.courses = data.courses; existing.capturedAt = now;
  }else{
    arr.push(Object.assign({capturedAt:now}, data));
  }
  saveSnapshots(arr);
  renderNostalgia();
  const saved = $("#nosSaved");
  if(saved){ saved.style.display=""; setTimeout(()=>{ saved.style.display="none"; }, 2200); }
  toast({ic:"◷",color:"#0071e3",tt: existing ? "Snapshot updated" : "Snapshot saved",
    td: CURRENT_TERM.short+" · "+data.overall+"%", src:"Better SGY"});
}
function deleteSnapshot(id){
  const arr = loadSnapshots().filter(s=> s.id !== id);
  saveSnapshots(arr);
  renderNostalgia();
}
function deltaBadge(curr, prev){
  if(prev == null) return "";
  const d = +(curr - prev).toFixed(1);
  if(d === 0) return `<span class="scdelta">±0.0</span>`;
  const cls = d > 0 ? "up" : "down";
  const arrow = d > 0 ? "▲" : "▼";
  return `<span class="scdelta ${cls}">${arrow} ${Math.abs(d).toFixed(1)}</span>`;
}
function renderNostalgia(){
  const grid = $("#nosGrid");
  if(!grid) return;
  const list = snapshotsSorted();   // newest first
  if(!list.length){
    grid.innerHTML = `<div class="surface emptystate" style="grid-column:1/-1;">
      <span class="esicon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l2.5 2.5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 9a9 9 0 113 8.5" stroke-width="1.6" stroke-linecap="round"/><path d="M3 5v4h4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <div class="estitle">No snapshots yet</div>
      <div class="esbody">Capture this semester above to start a timeline you can look back on.</div>
    </div>`;
    return;
  }
  // chronological (oldest first) to compute deltas vs the previous term
  const chrono = list.slice().sort((a,b)=> (a.capturedAt||0) - (b.capturedAt||0));
  const prevById = {};
  chrono.forEach((s,i)=>{ prevById[s.id] = i>0 ? chrono[i-1].overall : null; });

  grid.innerHTML = list.map(s=>{
    const courses = (s.courses||[]).map(c=>`
      <div class="sccourse">
        <span class="ssw" style="background:${esc(c.accent||"#86868b")}"></span>
        <span class="scn">${esc(c.name)}</span>
        <span class="scg">${c.grade}%</span>
        <span class="scl">${esc(c.letter||"")}</span>
      </div>`).join("");
    return `<div class="snapcard" data-snap="${esc(s.id)}">
      <div class="schead">
        <div class="scterm">${esc(s.term)}</div>
        <div class="scdate">Captured ${esc(fmtSnapDate(s.capturedAt))}</div>
        <div class="scgradeline">
          <span class="scgrade">${(typeof s.overall==="number"? s.overall.toFixed(1) : s.overall)}</span>
          <span class="scpct">%</span>
          ${deltaBadge(s.overall, prevById[s.id])}
        </div>
      </div>
      <div class="sccourses">${courses}</div>
      <div class="scfoot">
        <button class="tlink" data-snap-view="${esc(s.id)}">View<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="delx grow" data-snap-del="${esc(s.id)}">Delete</button>
      </div>
    </div>`;
  }).join("");

  $$("[data-snap-view]", grid).forEach(b=> b.addEventListener("click", ()=> openSnapView(b.dataset.snapView)));
  $$("[data-snap-del]", grid).forEach(b=> b.addEventListener("click", ()=> deleteSnapshot(b.dataset.snapDel)));
}
function openSnapView(id){
  const s = loadSnapshots().find(x=> x.id === id);
  if(!s) return;
  $("#snapViewHead").innerHTML = `<div class="svterm">${esc(s.term)}</div><div class="svmeta">Captured ${esc(fmtSnapDate(s.capturedAt))}</div>`;
  const rows = (s.courses||[]).map(c=>`
    <div class="svrow">
      <span class="sw" style="background:${esc(c.accent||"#86868b")}"></span>
      <span class="nm">${esc(c.name)}</span>
      <span class="gr">${c.grade}%</span>
      <span class="lt">${esc(c.letter||"")}</span>
    </div>`).join("");
  $("#snapViewBody").innerHTML = `
    <div class="svoverall"><span class="g">${s.overall}</span><span class="p">% overall</span></div>
    <div class="svrows">${rows}</div>`;
  closeAllOverlays();
  $("#snapViewOverlay").classList.add("show");
}
function closeSnapView(){ $("#snapViewOverlay").classList.remove("show"); }
$("#snapViewClose").addEventListener("click", closeSnapView);
$("#snapViewOverlay").addEventListener("click", e=>{ if(e.target.id==="snapViewOverlay") closeSnapView(); });
$("#nosCaptureBtn").addEventListener("click", captureSnapshot);

/* ============================================================
   CONVENTIONS — write active edition + read ?screen= / ?game=
============================================================ */
try{ localStorage.setItem("bsgy-edition", "apple"); }catch(e){}
function applyDeepLink(){
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("screen");
  if(screen && SCREENS.includes(screen)){
    go(screen);
    if(screen==="games"){
      const game = params.get("game");
      if(game) try{ Arcade.play(game); }catch(e){}
    }
  }
}

/* ============================================================
   WIRING
============================================================ */
$$("#nav .navitem").forEach(b=> b.addEventListener("click", ()=> go(b.dataset.screen)));
$$("[data-go]").forEach(b=> b.addEventListener("click", ()=> go(b.dataset.go)));
$("#menubtn").addEventListener("click", ()=> $("#side").classList.toggle("open"));
$("#bellBtn").addEventListener("click", testNotification);
$("#setTestNotif").addEventListener("click", testNotification);

$("#topRefresh").addEventListener("click", ()=>{
  $("#topRefresh").classList.add("spin");
  setTimeout(()=> $("#topRefresh").classList.remove("spin"), 800);
  toast({ic:"↻",color:"#0071e3",tt:"Updated just now",td:"Grades and posts are current.",src:"Better SGY"});
});

// assignments
$("#asgSearch").addEventListener("input", e=>{ state.asgSearch = e.target.value; save(); renderAssignments(); });
$$("#asgSegs .seg").forEach(s=> s.addEventListener("click", ()=>{ state.asgFilter = s.dataset.filter; save(); renderAssignments(); }));

// calendar
$("#calPrev").addEventListener("click", ()=>{ calM--; if(calM<0){calM=11;calY--;} $("#calDay").innerHTML=""; renderCalendar(); });
$("#calNext").addEventListener("click", ()=>{ calM++; if(calM>11){calM=0;calY++;} $("#calDay").innerHTML=""; renderCalendar(); });
$("#calToday").addEventListener("click", ()=>{ calY=REAL_TODAY.getFullYear(); calM=REAL_TODAY.getMonth(); $("#calDay").innerHTML=""; renderCalendar(); });

// announcements
$("#annRefresh").addEventListener("click", ()=>{
  const sub = $("#annSub"); const prev = "Posts from your teachers.";
  sub.textContent = "Updated just now.";
  setTimeout(()=> sub.textContent = prev, 2200);
});

// settings live controls
const EDITION_FILES = {
  apple:    "mockup-app-apple.html",
  halo:     "mockup-app-halo.html",
  slate:    "mockup-app-slate.html",
  friendly: "mockup-app-forge.html",
  carbon:   "mockup-app-carbon.html",
};
// cycle "looks" — apple → halo → slate → forge → carbon → apple
const EDITION_CYCLE = ["apple","halo","slate","friendly","carbon"];
const CURRENT_EDITION = "apple";
function cycleEdition(){
  const i = EDITION_CYCLE.indexOf(CURRENT_EDITION);
  const next = EDITION_CYCLE[(i+1) % EDITION_CYCLE.length];
  try{ localStorage.setItem("bsgy-edition", next); }catch(e){}
  const file = EDITION_FILES[next];
  if(file){ window.location.href = file; }
}
$$("#editions .edition").forEach(b=> b.addEventListener("click", ()=>{
  const ed = b.dataset.ed;
  if(ed === "apple"){ // current edition — just mark active
    state.edition = ed; save(); renderSettings(); return;
  }
  const file = EDITION_FILES[ed];
  if(file){ window.location.href = file; }   // navigate to the chosen edition (same folder)
}));
$$("#setAppearance .seg").forEach(s=> s.addEventListener("click", ()=>{ state.appearance = s.dataset.app; save(); applyTheme(); renderSettings(); }));
$("#setNotif").addEventListener("change", e=>{ state.notif = e.target.checked; save(); });
$("#setMotion").addEventListener("change", e=>{ state.motion = e.target.checked; save(); });
$("#setGpa").addEventListener("change", e=>{ state.gpa = e.target.checked; save(); });

/* ============================================================
   LIVE DATA INJECTION (chrome.storage.local 'bsgy_live')
   Contract: { overall:number, term:string,
     courses:[{ name, teacher, pct, letter, trend('up'|'flat'|'down'), missing }] }
   Overrides the OVERVIEW only. Falls back to sample data on any
   failure or when chrome.storage is unavailable (file:// demo).
============================================================ */
function bsgyValidLive(d){
  return d && typeof d === "object"
    && typeof d.overall === "number"
    && Array.isArray(d.courses) && d.courses.length > 0;
}
// synthesize a short sparkline history that ends at `pct` and leans `trend`
function bsgySpark(pct, trend){
  const end = (typeof pct === "number") ? pct : 95;
  const d = trend === "up" ? 2.0 : trend === "down" ? -2.0 : 0;
  return [end-d, end-d*0.7, end-d*0.45, end-d*0.25, end-d*0.12, end-d*0.04, end];
}
function bsgyApplyLive(){
  try{
    if(!(window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get)) return;
    chrome.storage.local.get("bsgy_live", function(res){
      try{
        const live = res && res.bsgy_live;
        if(!bsgyValidLive(live)) return;   // invalid → keep sample data
        const PALETTE = ["#5b6cff","#34c759","#ff9f0a","#bf5af2","#0a84ff","#30d158","#ff375f","#64d2ff"];
        // rebuild COURSES contents in place (COURSES is const → mutate array)
        const built = live.courses.map(function(c, i){
          const id = "lc" + i;
          const nm = String(c.name == null ? ("Course " + (i+1)) : c.name);
          const tch = String(c.teacher == null ? "" : c.teacher);
          const pct = (typeof c.pct === "number") ? c.pct : 0;
          const trend = (c.trend === "up" || c.trend === "down" || c.trend === "flat") ? c.trend : "flat";
          const miss = (typeof c.missing === "number") ? c.missing : 0;
          HISTORY[id] = bsgySpark(pct, trend);
          return {
            id:id, name:nm, teacher:tch, per:"",
            grade:pct, letter:String(c.letter == null ? "" : c.letter),
            trend:trend, missing:miss,
            accent:PALETTE[i % PALETTE.length],
            initials:(nm.trim()[0] || "?").toUpperCase()
          };
        });
        COURSES.length = 0;
        built.forEach(function(c){ COURSES.push(c); });
        HISTORY.overall = bsgySpark(typeof live.overall === "number" ? live.overall : 0, "up");

        // hero + headers
        const ov = (typeof live.overall === "number") ? live.overall : null;
        const ovEl = $("#ovOverall");
        if(ovEl && ov != null) ovEl.innerHTML = (Math.round(ov*10)/10) + '<span class="pct">%</span>';
        const tnow = $("#ovTnow"); if(tnow && ov != null) tnow.textContent = (Math.round(ov*10)/10) + "%";
        const eyebrow = $("#ovEyebrow");
        if(eyebrow && live.term) eyebrow.textContent = live.term;
        const totalMissing = COURSES.reduce(function(s,c){ return s + (c.missing||0); }, 0);
        const subln = $("#ovSubln");
        if(subln){
          const missTxt = totalMissing === 0 ? "Nothing is missing."
            : (totalMissing === 1 ? "One assignment is missing." : (totalMissing + " assignments are missing."));
          subln.innerHTML = "Your average across " + COURSES.length + " course" + (COURSES.length===1?"":"s") + '. <span class="ink">' + missTxt + "</span>";
        }
        const cmeta = $("#ovCoursesMeta");
        if(cmeta) cmeta.textContent = COURSES.length + " course" + (COURSES.length===1?"":"s") + (live.term ? (" · " + live.term) : "");

        // re-render overview pieces with live data
        renderOverviewChart();
        renderGallery();
      }catch(e){ /* keep sample data already on screen */ }
    });
  }catch(e){ /* chrome.storage missing/blocked → sample data stays */ }
}

/* ============================================================
   INIT
============================================================ */
applyTheme();
renderOverviewChart();
renderGallery();
renderPicker();
renderGradeBody();
$("#asgSearch").value = state.asgSearch;
renderAssignments();
renderCalendar();
renderAnnouncements();
renderMaterialsList();
renderMaterialDetail();
renderSettings();
Arcade.renderHome();
renderNostalgia();
go("overview");
bsgyApplyLive();          // override OVERVIEW with real injected grades if present
applyDeepLink();          // ?screen= / ?game= for the debug hub
showWelcomeIfFirstRun();  // first-run welcome card
