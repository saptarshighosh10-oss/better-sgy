
/* ============================================================
   LIVE "TODAY" — everything dated keys off the real current date.
   Sample events are repositioned relative to NOW (see CAL_EVENTS build).
   ============================================================ */
const NOW = new Date();
const TODAY = NOW.getDate();
const NOW_MONTH = NOW.getMonth();   // 0-indexed
const NOW_YEAR = NOW.getFullYear();
// add/subtract days from today, return a Date
function dayShift(n){ const d = new Date(NOW_YEAR, NOW_MONTH, TODAY + n); return d; }
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// "Jun 17" style label for a Date
function shortDate(d){ return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`; }
// short weekday label, e.g. "Thu"
function weekdayShort(d){ return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]; }
// a friendly "checked just now" stamp
function nowTime(){ return NOW.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
// 1 -> "st", 2 -> "nd", etc.
function ordinal(n){ const s=['th','st','nd','rd'], v=n%100; return s[(v-20)%10]||s[v]||s[0]; }

/* ============================================================
   DATA — courses + history straight from MOCKUP_DATA.md.
   ============================================================ */
const COURSES = [
  {id:'alg', name:'Algebra 2 / Trig', short:'Algebra 2/Trig', teacher:'Mr. Stubbs', per:'P1', subject:'Math',
   emoji:'📐', accent:'#5aa9e6', soft:'#e3f0fb', grade:97.4, ltr:'A', trend:'up', missing:0},
  {id:'bio', name:'Biology', short:'Biology', teacher:'Ms. Carrington', per:'P2', subject:'Science',
   emoji:'🧬', accent:'#4fb286', soft:'#e6f7ef', grade:96.7, ltr:'A', trend:'flat', missing:1},
  {id:'fre', name:'French 1', short:'French 1', teacher:'Mme. Laurent', per:'P4', subject:'World Language',
   emoji:'🥐', accent:'#ffb454', soft:'#fff1d6', grade:96.5, ltr:'A', trend:'up', missing:0},
  {id:'dra', name:'Drama', short:'Drama', teacher:'Mr. Ellison', per:'P5', subject:'Performing Arts',
   emoji:'🎭', accent:'#9b87f2', soft:'#ece7ff', grade:90.3, ltr:'A−', trend:'down', missing:1},
  {id:'lit', name:'Literature', short:'Literature', teacher:'Ms. Howe', per:'P6', subject:'English',
   emoji:'📚', accent:'#ef6a9b', soft:'#ffe4ef', grade:94.1, ltr:'A', trend:'up', missing:0},
  {id:'pe',  name:'PE 9', short:'PE 9', teacher:'Coach Bryant', per:'P7', subject:'Phys Ed',
   emoji:'🏃', accent:'#4fb286', soft:'#e6f7ef', grade:99.1, ltr:'A', trend:'flat', missing:0},
];
const byId = id => COURSES.find(c => c.id === id);

// live-injection holders (set by bsgyApplyLive when chrome.storage has real data)
let LIVE_OVERALL = null;   // number | null
let LIVE_TERM = null;      // string | null
let LIVE_ON = false;       // true once real data replaces the sample

const HISTORY = {
  overall:[94.2,94.6,94.9,95.3,95.6,95.9,96.0,96.2],
  alg:[92.0,93.0,94.0,95.0,95.5,96.3,97.0,97.4],
  bio:[96.0,96.4,96.2,96.8,96.5,96.9,96.6,96.7],
  fre:[91.0,92.5,93.0,94.0,94.8,95.5,96.1,96.5],
  dra:[95.0,94.5,94.0,93.2,92.5,91.6,91.0,90.3],
  lit:[90.0,90.8,91.5,92.0,92.6,93.2,93.7,94.1],
  pe :[98.5,98.7,98.6,99.0,98.9,99.1,99.0,99.1],
};
// last point is "now"; the rest are weekly steps back from today
const WEEKS = (() => {
  const labels = [];
  for(let i=7;i>=1;i--){ const d = dayShift(-(i*7)); labels.push(`${MONTH_ABBR[d.getMonth()].toLowerCase()} ${d.getDate()}`); }
  labels.push('now');
  return labels;
})();

const GRADEBOOK = {
  alg:{cats:[['Tests',40,96.8],['Quizzes',25,97.5],['Homework',20,98.9],['Participation',15,100]],
    asg:[
      {nm:'HW 7.3 problems', cat:'Homework', date:'due today', score:'—/10', pct:'—', status:'due'},
      {nm:'HW 7.1–7.2', cat:'Homework', date:'Jun 17', score:'10/10', pct:'100%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'15/15', pct:'100%', status:'graded'},
      {nm:'Unit 6 Test', cat:'Tests', date:'Jun 12', score:'96/100', pct:'96%', status:'graded'},
      {nm:'Trig Identities Quiz', cat:'Quizzes', date:'Jun 9', score:'19/20', pct:'95%', status:'graded'},
    ], note:"clean sheet here — nothing missing, everything graded high. the 7.3 set is the only open one, and it's due today."},
  bio:{cats:[['Tests',40,95.0],['Labs',25,97.2],['Homework',20,98.5],['Participation',15,100]],
    asg:[
      {nm:'Cell Energetics Lab', cat:'Labs', date:'was Jun 19', score:'0/25', pct:'—', status:'missing'},
      {nm:'Enzymes Problem Set', cat:'Homework', date:'Jun 16', score:'18/20', pct:'90%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'15/15', pct:'100%', status:'graded'},
      {nm:'Photosynthesis Test', cat:'Tests', date:'Jun 11', score:'95/100', pct:'95%', status:'graded'},
      {nm:'Mitosis Quiz', cat:'Labs', date:'Jun 5', score:'24/25', pct:'96%', status:'graded'},
    ], note:"your tests and homework are carrying this. the only blank row is that lab. fix the one blank and you're basically at a 97."},
  fre:{cats:[['Tests',40,95.5],['Speaking',25,97.0],['Homework',20,98.0],['Participation',15,100]],
    asg:[
      {nm:'Devoirs 5.3', cat:'Homework', date:'Jun 16', score:'10/10', pct:'100%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'15/15', pct:'100%', status:'graded'},
      {nm:'Unité 5 Exam', cat:'Tests', date:'Jun 12', score:'95/100', pct:'95%', status:'graded'},
      {nm:'Dialogue oral', cat:'Speaking', date:'Jun 10', score:'29/30', pct:'97%', status:'graded'},
      {nm:'Vocab Quiz', cat:'Tests', date:'Jun 6', score:'48/50', pct:'96%', status:'graded'},
    ], note:"speaking is your strongest piece here. all caught up, nothing hanging."},
  dra:{cats:[['Performance',40,91.0],['Reflections',25,85.0],['Participation',20,95.0],['Projects',15,90.0]],
    asg:[
      {nm:'Monologue Reflection', cat:'Reflections', date:'was Jun 18', score:'0/20', pct:'—', status:'missing'},
      {nm:'Scene Performance', cat:'Performance', date:'Jun 15', score:'88/100', pct:'88%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'19/20', pct:'95%', status:'graded'},
      {nm:'Character Study', cat:'Projects', date:'Jun 9', score:'27/30', pct:'90%', status:'graded'},
      {nm:'Theater Journal', cat:'Reflections', date:'Jun 4', score:'17/20', pct:'85%', status:'graded'},
    ], note:"the reflections category is the soft spot, and that missing one is sitting right in it. turn it in and this category jumps."},
  lit:{cats:[['Essays',40,93.0],['Reading Quizzes',25,94.5],['Homework',20,95.0],['Participation',15,98.0]],
    asg:[
      {nm:'Chapter 4 Response', cat:'Homework', date:'due today', score:'—/10', pct:'—', status:'due'},
      {nm:'Annotation HW', cat:'Homework', date:'Jun 16', score:'10/10', pct:'100%', status:'graded'},
      {nm:'Theme Essay', cat:'Essays', date:'Jun 13', score:'92/100', pct:'92%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'14/15', pct:'93%', status:'graded'},
      {nm:'Reading Quiz 8', cat:'Reading Quizzes', date:'Jun 10', score:'19/20', pct:'95%', status:'graded'},
    ], note:"slow climb up. the chapter 4 response is the one open thing, and it's due today. one paragraph."},
  pe:{cats:[['Fitness',40,99.0],['Skills',25,99.5],['Participation',35,99.0]],
    asg:[
      {nm:'Fitness Log Wk 14', cat:'Fitness', date:'Jun 13', score:'20/20', pct:'100%', status:'graded'},
      {nm:'Participation Wk 14', cat:'Participation', date:'Jun 13', score:'99/100', pct:'99%', status:'graded'},
      {nm:'Mile Run', cat:'Fitness', date:'Jun 9', score:'49/50', pct:'98%', status:'graded'},
      {nm:'Volleyball Skills', cat:'Skills', date:'Jun 6', score:'25/25', pct:'100%', status:'graded'},
    ], note:"your highest class. nothing to fix. don't change a thing."},
};
// rewrite gradebook "Jun N" / "was Jun N" dates relative to real today.
// original sample world treated Jun 22 as today, so "Jun N" -> offset (N - 22).
(function liveGradebookDates(){
  const remap = s => {
    const m = /^(was )?Jun (\d+)$/.exec(s);
    if(!m) return s; // "due today" and anything else pass through
    return (m[1]||'') + shortDate(dayShift((+m[2]) - 22));
  };
  for(const k in GRADEBOOK) GRADEBOOK[k].asg.forEach(a => { a.date = remap(a.date); });
})();
// pristine snapshot of the gradebooks for the What-if "Reset" affordance
const GB_ORIG = JSON.parse(JSON.stringify(GRADEBOOK));

// per-course chart context (focus line + 2 faint references + aside)
const GRADE_CHART = {
  alg:{refs:['fre','lit'], aside:"strongest climb of the bunch. up about 5 points since april 📈"},
  bio:{refs:['alg','dra'], aside:"basically a flat line in the high 96s. boring in the good way 🧬"},
  fre:{refs:['alg','lit'], aside:"steady climb. your french keeps inching up 🇫🇷"},
  dra:{refs:['bio','pe'], aside:"this is the one drifting down. still an A−, but worth watching."},
  lit:{refs:['fre','alg'], aside:"slow and steady up the whole semester 📚"},
  pe :{refs:['bio','alg'], aside:"flat at the top. nothing to do here 🏆"},
};

// labels computed off real today: 2 due today, 2 recently missing, a few upcoming
const _missLab1 = 'was '+shortDate(dayShift(-4));   // Cell Energetics Lab
const _missLab2 = 'was '+shortDate(dayShift(-5));   // Monologue reflection
const _doneLab1 = shortDate(dayShift(-10));          // Photosynthesis notes
const _doneLab2 = shortDate(dayShift(-8));           // Section 7.2
let ASSIGNMENTS = [
  {nm:'Section 7.3 problems', cid:'alg', due:'today', dueLabel:'today', stat:'urgent', statLabel:'due today', state:'todo', aside:'· due today, it\'s like 8 problems', subInfo:'turned in just now · pending'},
  {nm:'Chapter 4 response', cid:'lit', due:'today', dueLabel:'today', stat:'urgent', statLabel:'due today', state:'todo', aside:'· due today, one good paragraph', subInfo:'turned in just now · pending'},
  {nm:'Cell Energetics Lab', cid:'bio', due:_missLab1, dueLabel:_missLab1, stat:'urgent', statLabel:'missing', state:'missing', aside:'· barely dents your grade, but might as well', subInfo:'turned in just now'},
  {nm:'Monologue reflection', cid:'dra', due:_missLab2, dueLabel:_missLab2, stat:'urgent', statLabel:'missing', state:'missing', aside:'· this is the one dragging Drama down a touch', subInfo:'turned in just now'},
  {nm:'Vocab set 9 — la maison', cid:'fre', due:'Thu', dueLabel:'Thu', stat:'soon', statLabel:'soon', state:'todo', asideSoft:'· due thursday, low effort', subInfo:'turned in just now'},
  {nm:'Unit 7 review packet', cid:'alg', due:'Fri', dueLabel:'Fri', stat:'soon', statLabel:'soon', state:'todo', subInfo:'turned in just now'},
  {nm:'Fitness log — week 15', cid:'pe', due:'Mon', dueLabel:'Mon', stat:'ok', statLabel:'upcoming', state:'todo', subInfo:'turned in just now'},
  {nm:'Photosynthesis Reading Notes', cid:'bio', due:_doneLab1, dueLabel:'', stat:'ok', statLabel:'done', state:'done', subInfo:'turned in '+_doneLab1+' · 100%'},
  {nm:'Section 7.2 problems', cid:'alg', due:_doneLab2, dueLabel:'', stat:'ok', statLabel:'done', state:'done', subInfo:'turned in '+_doneLab2+' · 98%'},
];

// Calendar events, positioned relative to the REAL today.
// Built off day-offsets so the same shape lands on whatever month it's run.
// key = "year-month" (0-indexed month). value = {day:[{cid,nm}]}
const CAL_EVENT_PLAN = [
  [-20, [{cid:'pe',nm:'Conditioning'}]],
  [-18, [{cid:'fre',nm:'Devoirs 5.1'}]],
  [-17, [{cid:'bio',nm:'Mitosis Quiz'},{cid:'alg',nm:'HW 6.4'}]],
  [-13, [{cid:'alg',nm:'Trig Identities Quiz'},{cid:'pe',nm:'Mile Run'}]],
  [-11, [{cid:'lit',nm:'Reading Quiz 8'}]],
  [-10, [{cid:'alg',nm:'Unit 6 Test'},{cid:'fre',nm:'Unité 5 Exam'}]],
  [-7,  [{cid:'dra',nm:'Scene Performance'}]],
  [-6,  [{cid:'bio',nm:'Enzymes Problem Set'}]],
  [-5,  [{cid:'dra',nm:'Monologue Reflection (now missing)'}]],
  [-4,  [{cid:'bio',nm:'Cell Energetics Lab (now missing)'}]],
  [0,   [{cid:'alg',nm:'HW 7.3 problems'},{cid:'lit',nm:'Chapter 4 Response'}]],
  [2,   [{cid:'lit',nm:'Book club notes'}]],
  [3,   [{cid:'bio',nm:'Ecology reading'}]],
  [4,   [{cid:'fre',nm:'Unité 6 vocab'},{cid:'pe',nm:'Fitness Log Wk 15'}]],
  [7,   [{cid:'alg',nm:'Unit 7 Test'}]],
];
const CAL_EVENTS = (() => {
  const out = {};
  for(const [off, items] of CAL_EVENT_PLAN){
    const d = dayShift(off);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (out[key] = out[key] || {})[d.getDate()] = items;
  }
  return out;
})();

let ANNOUNCEMENTS = [
  {cid:'bio', who:'Ms. Carrington', tm:'2h ago', star:true,
   msg:"reminder the Cell Energetics Lab is still open for late credit through friday. if you missed it, get it in — i'd rather have it late than not at all.",
   react:{q:'💬', t:'ok this is literally your missing one. friday. noted.'}},
  {cid:'alg', who:'Mr. Stubbs', tm:'5h ago', star:true,
   msg:"section 7.3 is due tonight at 11:59. unit 7 review packet goes out friday, test is next wednesday. pace yourself.",
   react:{q:'📌', t:'7.3 is one of your two due-today things.'}},
  {cid:'lit', who:'Ms. Howe', tm:'yesterday', star:true,
   msg:"chapter 4 response due today. keep it to a paragraph but make it a real one — i want a claim, not a summary."},
  {cid:'dra', who:'Mr. Ellison', tm:'yesterday', star:false,
   msg:"a few of you still owe the monologue reflection. it's short. come find me if you're stuck on what to write.",
   react:{q:'👀', t:'hi, yes, that\'s you. it\'s the thing bugging your Drama grade.'}},
  {cid:'fre', who:'Mme. Laurent', tm:'2 days ago', star:false,
   msg:"vocab set 9 (la maison) posted, due thursday. small quiz next week, nothing scary."},
  {cid:'pe', who:'Coach Bryant', tm:'3 days ago', star:false,
   msg:"fitness logs for week 14 due monday. outdoor unit starts after — bring water and a hat.",
   react:{q:'🏆', t:'your 99.1 class. you\'ve got this part handled.'}},
];

const MATERIALS = [
  {type:'folder', nm:'Unit 5 — Cell Energetics', sub:'9 items · updated '+shortDate(dayShift(-6))},
  {type:'pdf', nm:'Cell Energetics Lab handout.pdf', sub:'your submission is open ↓', target:true},
  {type:'pdf', nm:'Enzymes notes.pdf', sub:'820 KB · posted '+shortDate(dayShift(-8))},
  {type:'link', nm:'Khan Academy: Cellular respiration', sub:'external link'},
  {type:'doc', nm:'Lab report template.docx', sub:'posted '+shortDate(dayShift(-10))},
  {type:'pdf', nm:'Photosynthesis study guide.pdf', sub:'1.2 MB · posted '+shortDate(dayShift(-10))},
];
const MAT_TARGET = {
  nm:'Cell Energetics Lab', sub:'Biology · due '+shortDate(dayShift(-4))+' · 20 pts · <span style="color:var(--rose);font-weight:800">missing</span>',
  attach:[['📄','Cell Energetics Lab handout.pdf'],['📝','Lab report template.docx']],
};

const PINGS = [
  {ic:'▲', tt:'Biology rose 1.2%', ts:'95.5% → 96.7%'},
  {ic:'✓', tt:'Graded · Cell Energetics Lab', ts:'90% (Biology)'},
  {ic:'＋', tt:'New assignment', ts:'Monologue reflection (Drama)'},
];

/* ============================================================
   STATE (with localStorage persistence)
   ============================================================ */
const LS = 'bsgy-friendly-forge';
let state = {
  screen:'overview',
  gradeCourse:'bio',
  asgTab:'todo',
  asgQuery:'',
  asgDone:{},           // nm -> true once checked off
  calMonth:NOW_MONTH, calYear:NOW_YEAR, calSel:null,
  matFile:1,            // index of selected material (the lab)
  matRev:0,             // submission revision count
  comments:[],
  stars:{},             // index -> bool override
  uiEdition:'friendly',
  theme:'cream',         // light paper tint (cream/oat/peach/sage)
  themeMode:'light',     // light | dark | auto
  sections:{overview:true,grades:true,assign:true,cal:true,ann:true,mat:true,asides:true},
  notify:true,
};
try{ const saved = JSON.parse(localStorage.getItem(LS)); if(saved) state = {...state, ...saved}; }catch(e){}
// calendar always opens on the real current month, regardless of stale saved state
state.calMonth = NOW_MONTH; state.calYear = NOW_YEAR; state.calSel = null;
function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

/* ---- THEME ENGINE: light / dark / auto + light paper tint ---- */
const PAPER_TINTS = {
  cream:{paper:'#fdf4e6',paper2:'#f7ead6',card:'#fffdf9'},
  oat:  {paper:'#f3ece1',paper2:'#e9dfcd',card:'#fbf7ef'},
  peach:{paper:'#ffeede',paper2:'#ffe2c9',card:'#fff8f1'},
  sage: {paper:'#eaf2ec',paper2:'#dde9df',card:'#f6fbf7'},
};
function prefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function effectiveDark(){
  if(state.themeMode==='dark') return true;
  if(state.themeMode==='light') return false;
  return prefersDark(); // auto
}
function applyTheme(){
  const root = document.documentElement;
  if(effectiveDark()){
    root.setAttribute('data-theme','dark');
    // dark owns its own palette — clear any light paper-tint overrides
    ['--paper','--paper-2','--card'].forEach(v => root.style.removeProperty(v));
  } else {
    root.removeAttribute('data-theme');
    const t = PAPER_TINTS[state.theme] || PAPER_TINTS.cream;
    root.style.setProperty('--paper', t.paper);
    root.style.setProperty('--paper-2', t.paper2);
    root.style.setProperty('--card', t.card);
  }
}
// auto mode reacts live to OS changes
if(window.matchMedia){
  try{
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => { if(state.themeMode==='auto') applyTheme(); });
  }catch(e){}
}

/* ============================================================
   HELPERS
   ============================================================ */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const whatIf = {};   // course id -> What-if editing mode on/off
const $ = (sel,root=document) => root.querySelector(sel);
const $$ = (sel,root=document) => [...root.querySelectorAll(sel)];

// y mapping for chart: 88..100 -> y 175..17.5
function ymap(v){ return 175 - ((v-88)/(100-88))*(175-17.5); }
function xmap(i,n){ return 50 + (i/(n-1))*(580-50); }
function pts(arr){ const n=arr.length; return arr.map((v,i)=>`${xmap(i,n).toFixed(1)},${ymap(v).toFixed(2)}`).join(' '); }
// 5 month abbreviations ending on the current month (for chart x-axis)
const CHART_MONTHS = (() => {
  const out = [];
  for(let i=4;i>=0;i--){ const d = new Date(NOW_YEAR, NOW_MONTH - i, 1); out.push(MONTH_ABBR[d.getMonth()].toLowerCase()); }
  return out;
})();

/* ============================================================
   NAV
   ============================================================ */
const NAVITEMS = [
  ['overview','🏠','Overview'],
  ['grades','📊','Grades'],
  ['assign','✅','Assignments'],
  ['cal','📅','Calendar'],
  ['ann','📣','Announcements'],
  ['mat','📂','Materials'],
  ['nostalgia','📸','Nostalgia'],
  ['games','🎮','Games'],
  ['set','⚙️','Settings'],
];
function renderNav(){
  $('#nav').innerHTML = NAVITEMS.map(([k,ic,label]) =>
    `<button data-screen="${k}" class="${state.screen===k?'active':''}"><span class="ni">${ic}</span> ${label}</button>`
  ).join('');
  $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.screen));
}
function go(screen){
  // leaving the arcade: stop any running game loop + key listener
  if(state.screen==='games' && screen!=='games'){
    if(typeof stopArcadeLoops==='function') stopArcadeLoops();
    if(typeof detachArcadeKey==='function') detachArcadeKey();
    arcade.active = null;
  }
  state.screen = screen; save();
  renderNav();
  renderScreen();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ============================================================
   SCREEN ROUTER
   ============================================================ */
function renderScreen(){
  const m = $('#main');
  const r = {overview:viewOverview, grades:viewGrades, assign:viewAssign, cal:viewCalendar,
             ann:viewAnnouncements, mat:viewMaterials, nostalgia:viewNostalgia, games:viewGames, set:viewSettings}[state.screen];
  m.innerHTML = `<section class="screen show">${r()}</section>`;
  ({overview:wireOverview, grades:wireGrades, assign:wireAssign, cal:wireCalendar,
    ann:wireAnnouncements, mat:wireMaterials, nostalgia:wireNostalgia, games:wireGames, set:wireSettings}[state.screen])();
}

/* ============================================================
   1 · OVERVIEW
   ============================================================ */
function sparkFor(cid){
  const h = HISTORY[cid]; const n=h.length;
  // small spark in 58x26, y: high grade -> low y
  const min=Math.min(...h), max=Math.max(...h), span=(max-min)||1;
  const pn = h.map((v,i)=>`${(2+i*(50/(n-1))).toFixed(0)},${(22-((v-min)/span)*18).toFixed(0)}`).join(' ');
  const c = byId(cid);
  const col = c.trend==='up' ? '#4fb286' : c.trend==='down' ? '#ef6a52' : '#b6a690';
  const last = pn.split(' ').pop().split(',');
  return `<svg class="spark" width="58" height="26" viewBox="0 0 58 26" fill="none" aria-hidden="true">
    <polyline points="${pn}" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${col}"/></svg>`;
}
const OV_SAY = {
  alg:{q:'💬', html:'keeps <span class="up">ticking up</span> every week 📈 nice.<span class="add">nothing missing here either, so no notes.</span>'},
  bio:{q:'💬', html:'steady A. one thing though: there\'s <span class="miss">1 missing assignment</span> in here 👀<span class="add">it\'s barely touching your grade, but might as well clear it.</span>'},
  fre:{q:'💬', html:'<span class="up">going up</span>, and your French is getting there 🇫🇷<span class="add">all caught up, nothing missing.</span>'},
  dra:{q:'💬', html:'<span class="wave">this is the other one.</span> it\'s slipped a bit lately and there\'s a <span class="miss">missing assignment</span> too.<span class="add">still an A−, so you\'re fine. one assignment and a decent week and it\'s back up. just keep an eye on it.</span>'},
  lit:{q:'💬', html:'slowly going up 📚 and nothing missing.<span class="add">zero notes on this one. all good.</span>'},
  pe :{q:'🏆', html:'<span class="hl">99.1%</span> this is your highest one 🏆<span class="add">don\'t change a thing.</span>'},
};
function overallChartSVG(){
  const h=HISTORY.overall, n=h.length;
  return `<svg viewBox="0 0 600 220" role="img" aria-label="overall grade rising to 96.2 over semester 2">
    ${[17.5,70.33,122.67,175].map(y=>`<line class="grid" x1="50" y1="${y}" x2="580" y2="${y}"/>`).join('')}
    <text class="axy" x="42" y="20.5" text-anchor="end">100</text>
    <text class="axy" x="42" y="73.5" text-anchor="end">96</text>
    <text class="axy" x="42" y="125.5" text-anchor="end">92</text>
    <text class="axy" x="42" y="178" text-anchor="end">88</text>
    ${CHART_MONTHS.map((mo,i)=>`<text class="ax" x="${[50,201.4,352.9,504.3,580][i]}" y="200" text-anchor="middle">${mo}</text>`).join('')}
    <polyline points="${pts(h)}" fill="none" stroke="#4fb286" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${xmap(n-1,n).toFixed(1)}" cy="${ymap(h[n-1]).toFixed(2)}" r="5.5" fill="#4fb286"/>
    <circle cx="${xmap(n-1,n).toFixed(1)}" cy="${ymap(h[n-1]).toFixed(2)}" r="10" fill="#4fb286" opacity="0.16"/>
    <rect x="503" y="44" width="74" height="20" rx="10" fill="var(--ink)"/>
    <text class="endlabel" x="540" y="58" text-anchor="middle" fill="#fff">now: ${fmtGrade(h[n-1])}%</text>
  </svg>`;
}
function viewOverview(){
  const cards = COURSES.map(c => {
    const s = OV_SAY[c.id] || bsgyCardSay(c);
    return `<div class="course" data-course="${c.id}" style="--dot:${c.accent};--soft:${c.soft}">
      <div class="crow">
        <div class="emoji">${c.emoji}</div>
        <div class="cmeta"><div class="nm">${esc(c.name)}</div><div class="tc">${esc(c.teacher)}${c.per?(' · '+c.per):''}</div></div>
        ${sparkFor(c.id)}
        <div class="grade"><div class="g">${fmtGrade(c.grade)}<span class="pct">%</span></div><div class="lt">${c.ltr}</div></div>
      </div>
      <div class="say"><div class="q">${s.q}</div><p>${s.html}</p></div>
    </div>`;
  }).join('');
  const ovNum = (LIVE_ON && typeof LIVE_OVERALL==='number') ? bsgyFmt(LIVE_OVERALL) : fmtGrade(overallGrade());
  const whenLine = (LIVE_ON && LIVE_TERM) ? (esc(LIVE_TERM)+' · checked just now') : '2025–2026 · Freshman year · Semester 2 · checked just now';
  const classCount = COURSES.length;
  return `
    <div class="hello"><div>
      <h1>Hey, here's where things are at</h1>
      <div class="when">${whenLine}</div>
    </div>
    <button class="exportbtn" id="exportbtn" title="save this page as an image">🖼️ save as image</button>
    </div>
    <div class="hero">
      <div class="score">
        <span class="tag">on track ✶</span>
        <div class="big">${ovNum}<span class="pct">%</span></div>
        <div class="cap">average across ${classCount} ${classCount===1?'class':'classes'}</div>
      </div>
      <div class="herobub">
        <div class="bubble tail"><span class="hl">${ovNum}%</span> across all ${classCount} ${classCount===1?'class':'classes'}. that's a really strong spot to be in.</div>
        <div class="bubble small">couple little things i want to point out, but nothing to stress about.</div>
      </div>
    </div>
    <div class="gist">
      <div class="chip" data-go="grades"><div class="ic a">🎓</div><div><div class="n">3.94</div><div class="l">GPA estimate · weighted</div></div></div>
      <div class="chip" data-go="assign"><div class="ic b">📌</div><div><div class="n">2</div><div class="l">due today, very doable</div></div></div>
      <div class="chip" data-go="assign-miss"><div class="ic c">👀</div><div><div class="n">2</div><div class="l">missing, worth a look</div></div></div>
      <div class="chip" data-course="pe"><div class="ic d">🏆</div><div><div class="n">PE 9</div><div class="l">your best, 99.1%</div></div></div>
    </div>
    <div class="card chartcard">
      <div class="chd"><span class="ct">overall grade over time</span><span class="cs">semester 2 · weekly</span></div>
      <div class="chartwrap">${overallChartSVG()}</div>
      <div class="bubble small tail" style="margin-top:4px;max-width:420px">slow and steady climb. up about 2 points since february 📈</div>
    </div>
    <div class="sechd"><h2>Your classes</h2><span class="sub">all 6 of them · tap one to open its grades</span></div>
    <p class="lead">quick notes on each:</p>
    ${cards}
    <div class="outro">
      <div class="ic">🧃</div>
      <p>that's all of them. <span>clear those 2 missing things when you get a chance and you're set. go grab a snack.</span></p>
    </div>`;
}
function wireOverview(){
  $$('#main .course').forEach(el => el.onclick = () => { state.gradeCourse = el.dataset.course; save(); go('grades'); });
  $$('#main .chip[data-course]').forEach(el => el.onclick = () => { state.gradeCourse = el.dataset.course; save(); go('grades'); });
  $$('#main .chip[data-go]').forEach(el => el.onclick = () => {
    const g = el.dataset.go;
    if(g==='assign-miss'){ state.asgTab='missing'; save(); go('assign'); }
    else go(g);
  });
  const ex = $('#exportbtn'); if(ex) ex.onclick = exportOverview;
}

/* ============================================================
   2 · GRADES
   ============================================================ */
function gradeChartSVG(cid){
  const focus = HISTORY[cid], c = byId(cid), n = focus.length;
  // every OTHER course as a light reference line, behind the focus line
  const refLines = COURSES.filter(x => x.id!==cid).map(x =>
    `<polyline points="${pts(HISTORY[x.id])}" data-line="${x.id}" fill="none" stroke="${x.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.30"/>`
  ).join('');
  // hover points for ALL six lines so any line can be inspected
  const allPoints = COURSES.map(x => {
    const h = HISTORY[x.id], hn = h.length, focused = x.id===cid;
    return h.map((v,i)=>
      `<circle class="hoverpt" data-line="${x.id}" data-i="${i}" cx="${xmap(i,hn).toFixed(1)}" cy="${ymap(v).toFixed(2)}" r="${focused?4:3.4}" fill="${x.accent}" opacity="0"/>`
    ).join('');
  }).join('');
  return `<svg viewBox="0 0 600 220" role="img" aria-label="${esc(c.name)} grade across semester 2, shown against all six classes">
    ${[17.5,70.33,122.67,175].map(y=>`<line class="grid" x1="50" y1="${y}" x2="580" y2="${y}"/>`).join('')}
    <text class="axy" x="42" y="20.5" text-anchor="end">100</text>
    <text class="axy" x="42" y="73.5" text-anchor="end">96</text>
    <text class="axy" x="42" y="125.5" text-anchor="end">92</text>
    <text class="axy" x="42" y="178" text-anchor="end">88</text>
    ${CHART_MONTHS.map((mo,i)=>`<text class="ax" x="${[50,201.4,352.9,504.3,580][i]}" y="200" text-anchor="middle">${mo}</text>`).join('')}
    <g id="refgroup">${refLines}</g>
    <polyline data-line="${cid}" points="${pts(focus)}" fill="none" stroke="${c.accent}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle data-line="${cid}" cx="${xmap(n-1,n).toFixed(1)}" cy="${ymap(focus[n-1]).toFixed(2)}" r="5.5" fill="${c.accent}"/>
    <circle data-line="${cid}" cx="${xmap(n-1,n).toFixed(1)}" cy="${ymap(focus[n-1]).toFixed(2)}" r="10" fill="${c.accent}" opacity="0.16"/>
    <rect x="503" y="38" width="74" height="20" rx="10" fill="var(--ink)"/>
    <text class="endlabel" x="540" y="52" text-anchor="middle" fill="#fff">now: ${fmtGrade(c.grade)}%</text>
    ${allPoints}
  </svg>`;
}
/* ============================================================
   WHAT-IF GRADE CALCULATOR — recalc engine
   ============================================================ */
// Leading category name: "Labs · not submitted" -> "Labs"
function catKey(name){
  let s = String(name == null ? '' : name);
  const i = s.indexOf('·');
  if(i >= 0) s = s.slice(0, i);
  return s.trim();
}
// Parse "96/100" or "—/10" or "0/25" -> { earned: number|null, max: number|null }
function parseScore(score){
  const s = String(score == null ? '' : score);
  const parts = s.split('/');
  const e = parts[0] != null ? parts[0].trim() : '';
  const m = parts[1] != null ? parts[1].trim() : '';
  let en = (e === '' || e === '—' || e === '-') ? null : parseFloat(e);
  let mn = (m === '' || m === '—' || m === '-') ? null : parseFloat(m);
  if(en != null && isNaN(en)) en = null;
  if(mn != null && isNaN(mn)) mn = null;
  return { earned: en, max: mn };
}
// A row is graded only with a numeric earned AND numeric max > 0.
function rowGraded(a){
  const p = parseScore(a.score);
  return p.earned != null && p.max != null && p.max > 0;
}
function rowPct(a){
  const p = parseScore(a.score);
  return (p.earned / p.max) * 100;
}
// Recompute a course's category averages (mutating gb.cats[i][2]) and its
// weighted course grade (mutating the COURSES entry). Returns the course grade.
function recomputeCourse(id){
  const gb = GRADEBOOK[id];
  const c = byId(id);
  const sums = {}, counts = {};
  gb.asg.forEach(a => {
    if(!rowGraded(a)) return;
    const k = catKey(a.cat);
    if(!(k in sums)){ sums[k] = 0; counts[k] = 0; }
    sums[k] += rowPct(a);
    counts[k] += 1;
  });
  let wTotal = 0, wAvg = 0;
  gb.cats.forEach(cat => {
    const k = catKey(cat[0]);
    if(counts[k] > 0){
      const avg = sums[k] / counts[k];
      cat[2] = avg;             // update category average shown in panel
      wTotal += cat[1];
      wAvg += cat[1] * avg;
    } else {
      cat[2] = null;            // no graded rows -> skipped / blank
    }
  });
  const grade = wTotal > 0 ? (wAvg / wTotal) : 0;
  c.grade = grade;
  return grade;
}
function overallGrade(){
  if(!COURSES.length) return 0;
  let sum = 0;
  COURSES.forEach(c => { sum += c.grade; });
  return sum / COURSES.length;
}
function fmtGrade(v){ return (Math.round(v * 10) / 10).toFixed(1); }
function catAvgText(v){
  if(v == null) return '—';
  return (v % 1 === 0 ? v : v.toFixed(1)) + '%';
}
// Live-update the Overview overall number + its chart "now" point (only matters
// once the user returns to Overview — the chart re-renders fresh from HISTORY).
function updateOverall(){
  const ov = overallGrade();
  if(HISTORY.overall && HISTORY.overall.length) HISTORY.overall[HISTORY.overall.length - 1] = ov;
}
// Recompute the current course and refresh only the grade DISPLAYS
// (gradehero number, chart "now" label + focus point, category avgs + bars).
// Leaves the assignment input fields untouched (preserves focus while typing).
function whatIfRecalc(){
  const id = state.gradeCourse;
  const grade = recomputeCourse(id);
  const gStr = fmtGrade(grade);
  if(HISTORY[id] && HISTORY[id].length) HISTORY[id][HISTORY[id].length - 1] = grade;

  // gradehero big number
  const gNum = $('#gbHeroGrade');
  if(gNum) gNum.innerHTML = gStr + '<span class="pct">%</span>';

  // category averages + bars
  const gb = GRADEBOOK[id];
  const maxAv = Math.max(...gb.cats.map(cat => cat[2] == null ? 0 : cat[2]), 1);
  gb.cats.forEach((cat, i) => {
    const avEl = $('#gbCatAv' + i);
    if(avEl) avEl.textContent = catAvgText(cat[2]);
    const barEl = $('#gbCatBar' + i);
    if(barEl) barEl.style.width = (cat[2] == null ? 0 : Math.max(0, Math.min(100, cat[2]))) + '%';
  });

  // re-render the course "grade over time" chart in place (keeps inputs/focus)
  const chartBox = $('#gradechart');
  if(chartBox){
    const svgOld = $('svg', chartBox);
    const tmp = document.createElement('div');
    tmp.innerHTML = gradeChartSVG(id);
    const svgNew = tmp.firstElementChild;
    if(svgOld && svgNew) chartBox.replaceChild(svgNew, svgOld);
    rewireChartHover(chartBox);
  }

  updateOverall();
}
// Re-attach hover handlers after the chart svg is swapped (mirrors wireChartInteractions's hover half).
function rewireChartHover(wrap){
  const tip = $('#ctip', wrap) || $('#ctip');
  if(!tip) return;
  $$('.hoverpt', wrap).forEach(pt => {
    pt.addEventListener('mouseenter', () => {
      const cid = pt.dataset.line, i = +pt.dataset.i;
      pt.setAttribute('r','6'); pt.setAttribute('opacity','1');
      const v = HISTORY[cid][i];
      tip.textContent = `${WEEKS[i]} · ${v.toFixed(1)}%`;
      const svg = $('svg', wrap);
      const box = svg.getBoundingClientRect();
      const wbox = wrap.getBoundingClientRect();
      const x = (+pt.getAttribute('cx'))/600 * box.width + (box.left - wbox.left);
      const y = (+pt.getAttribute('cy'))/220 * box.height + (box.top - wbox.top);
      tip.style.left = x + 'px';
      tip.style.top = (y - 34) + 'px';
      tip.style.transform = 'translateX(-50%)';
      tip.style.opacity = '1';
    });
    pt.addEventListener('mouseleave', () => {
      pt.setAttribute('r','4'); pt.setAttribute('opacity','0');
      tip.style.opacity = '0';
    });
  });
}

function viewGrades(){
  const c = byId(state.gradeCourse);
  const gb = GRADEBOOK[c.id];
  const wi = !!whatIf[c.id];
  const chips = COURSES.map(x =>
    `<div class="ctab ${x.id===c.id?'on':''}" data-course="${x.id}" style="--dot:${x.accent}"><span class="dot"></span>${esc(x.short)}</div>`
  ).join('');
  const trendLabel = c.trend==='up'?'climbing':c.trend==='down'?'slipping':'flat';
  // legend covers all 6, selected course first + emphasized; each toggles its line
  const legendIds = [c.id, ...COURSES.filter(x => x.id!==c.id).map(x => x.id)];
  const legend = legendIds.map(id => {
    const x = byId(id);
    const sel = id===c.id;
    return `<span class="lchip on${sel?' sel':''}" data-line="${id}" style="--dot:${x.accent}"><span class="dot"></span>${esc(x.short)}</span>`;
  }).join('');
  const cats = gb.cats.map(([nm,wt,av],i) => {
    const col = [c.accent,'#ffb454','#5aa9e6','#9b87f2'][i%4];
    const w = av == null ? 0 : Math.max(0, Math.min(100, av));
    return `<div class="card cat"><div class="cn">${esc(nm)}</div><div class="wt">${wt}%</div>
      <div class="bar"><i id="gbCatBar${i}" data-w="${w}" style="background:${col}"></i></div><div class="av" id="gbCatAv${i}">${catAvgText(av)}</div></div>`;
  }).join('');
  const rows = gb.asg.map((a,i) => {
    const miss = a.status==='missing';
    const due = a.status==='due';
    if(wi){
      const p = parseScore(a.score);
      return `<tr class="wirow ${miss?'missrow':''}" data-i="${i}"><td><div class="anm">${esc(a.nm)}</div><div class="adt" style="font-size:11.5px">${esc(a.cat)}</div></td>
        <td class="adt">${esc(a.date)}</td>
        <td class="r"><span class="wi-edit"><input class="wi-num wi-earned" data-i="${i}" type="number" inputmode="decimal" step="any" min="0" aria-label="Earned points" value="${p.earned==null?'':p.earned}"><span class="wi-slash">/</span><input class="wi-num wi-max" data-i="${i}" type="number" inputmode="decimal" step="any" min="0" aria-label="Max points" value="${p.max==null?'':p.max}"></span></td>
        <td class="r"><button class="wi-x" data-i="${i}" type="button" aria-label="Remove ${esc(a.nm)}">×</button></td></tr>`;
    }
    let pcCell = a.pct==='—' ? `<span class="pc" style="color:${miss?'var(--rose)':'var(--ink-3)'}">—</span>` :
      `<span class="pc"${a.pct==='100%'?' style="color:var(--sage)"':''}>${a.pct}</span>`;
    const badge = miss?' <span class="missbadge">missing</span>': due?' <span class="missbadge" style="background:var(--peach);color:#5a4112">due today</span>':'';
    return `<tr class="${miss?'missrow':''}"><td><div class="anm">${esc(a.nm)}${badge}</div><div class="adt" style="font-size:11.5px">${esc(a.cat)}</div></td>
      <td class="adt">${esc(a.date)}</td><td class="r">${esc(a.score)}</td><td class="r">${pcCell}</td></tr>`;
  }).join('');
  const catOptions = gb.cats.map(cat => `<option value="${esc(cat[0])}">${esc(cat[0])}</option>`).join('');
  const addRow = wi ? `<tr class="wi-addrow"><td><input class="wi-name" id="gbWiName" type="text" placeholder="new assignment name" aria-label="New assignment name"></td>
      <td><select class="wi-cat" id="gbWiCat" aria-label="Category">${catOptions}</select></td>
      <td class="r"><span class="wi-edit"><input class="wi-num" id="gbWiEarned" type="number" inputmode="decimal" step="any" min="0" placeholder="0" aria-label="Earned points"><span class="wi-slash">/</span><input class="wi-num" id="gbWiMax" type="number" inputmode="decimal" step="any" min="0" placeholder="100" aria-label="Max points"></span></td>
      <td class="r"><button class="btn wi-addbtn" id="gbWiAdd" type="button">+ add</button></td></tr>` : '';
  const asgHead = wi
    ? `<span class="wi-controls"><span class="wi-flag">what-if · play with the numbers</span><button class="btn wi-reset" id="gbWiReset" type="button">reset</button><button class="btn wi-toggle on" id="gbWiToggle" type="button">done</button></span>`
    : `<button class="btn wi-toggle" id="gbWiToggle" type="button">what-if ✨</button>`;
  const missCourse = c.missing > 0;
  const missNm = c.id==='bio' ? 'Cell Energetics Lab' : c.id==='dra' ? 'Monologue Reflection' : '';
  const missBubble = missCourse
    ? `<div class="bubble tail" style="margin-top:12px"><span class="miss">1 missing</span>: the <b>${esc(missNm)}</b>. it's a small one, hand it in and this nudges back up. no big deal 👀</div>`
    : `<div class="bubble tail small" style="margin-top:12px">nothing missing in here. all rows accounted for ✓</div>`;
  const lead = missCourse
    ? `picked ${esc(c.name)} — it's got a loose end worth clearing. switch anytime.`
    : `${esc(c.name)}, ${trendLabel} and all caught up. switch classes anytime.`;
  return `
    <div class="pagehd"><h1>Grades</h1><span class="when">2025–2026 · Semester 2 · pick a class</span></div>
    <p class="lead">${lead}</p>
    <div class="classpick">${chips}</div>
    <div class="card gradehero" style="--dot:${c.accent}">
      <div class="emoji" style="background:${c.soft}">${c.emoji}</div>
      <div class="gh-meta"><div class="nm">${esc(c.name)}</div><div class="tc">${esc(c.teacher)} · Period ${c.per.slice(1)} · ${esc(c.subject)}</div></div>
      <div class="gh-g"><div class="g" id="gbHeroGrade">${fmtGrade(c.grade)}<span class="pct">%</span></div><div class="lt">${c.ltr} · ${trendLabel}</div></div>
    </div>
    <div class="card chartcard" style="--dot:${c.accent}">
      <div class="chd"><span class="ct">${esc(c.short)} over the semester</span><span class="cs">tap legend to toggle · hover a point</span></div>
      <div class="chiprow">${legend}</div>
      <div class="chartwrap" id="gradechart">${gradeChartSVG(c.id)}<div class="charttip" id="ctip"></div></div>
      <div class="bubble small tail" style="margin-top:4px;max-width:430px">${GRADE_CHART[c.id].aside}</div>
    </div>
    ${missBubble}
    <div class="sechd"><h2>Categories</h2><span class="sub">weighted</span></div>
    <div class="cats">${cats}</div>
    <div class="sechd"><h2>Assignments</h2><span class="sub">recent first</span>${asgHead}</div>
    <div class="card${wi?' wi-on':''}" style="overflow:hidden" id="gbAsg">
      <table class="asg">
        <thead><tr><th>Assignment</th><th>Date</th><th class="r">Score</th><th class="r">${wi?'':'%'}</th></tr></thead>
        <tbody>${rows}${addRow}</tbody>
      </table>
    </div>
    <div class="say" style="margin-top:14px"><div class="q" style="background:${c.soft}">💬</div><p>${esc(gb.note)}</p></div>`;
}
function wireGrades(){
  $$('#main .ctab').forEach(el => el.onclick = () => { state.gradeCourse = el.dataset.course; save(); renderScreen(); });
  // animate category bars
  requestAnimationFrame(() => $$('#main .cat .bar i').forEach(b => b.style.width = b.dataset.w + '%'));
  wireChartInteractions('#gradechart');
  wireWhatIf();
}

// Wire the What-if calculator controls for the current Grades pane.
function wireWhatIf(){
  const id = state.gradeCourse;
  const toggle = $('#gbWiToggle');
  if(toggle){
    toggle.onclick = () => {
      whatIf[id] = !whatIf[id];
      renderScreen(); // focus is on a button — safe to re-render
    };
  }
  if(!whatIf[id]) return;

  const gb = GRADEBOOK[id];
  const panel = $('#gbAsg');

  // Reset: restore this course's gradebook from the pristine snapshot.
  const reset = $('#gbWiReset');
  if(reset){
    reset.onclick = () => {
      GRADEBOOK[id] = JSON.parse(JSON.stringify(GB_ORIG[id]));
      recomputeCourse(id);
      if(HISTORY[id] && HISTORY[id].length) HISTORY[id][HISTORY[id].length - 1] = byId(id).grade;
      updateOverall();
      renderScreen();
    };
  }

  // Live edits — update data + grade DISPLAYS only (keep inputs/focus intact).
  $$('.wi-num.wi-earned, .wi-num.wi-max', panel).forEach(inp => {
    inp.addEventListener('input', function(){
      const i = +this.getAttribute('data-i');
      const row = gb.asg[i]; if(!row) return;
      const earnedEl = $(`.wi-earned[data-i="${i}"]`, panel);
      const maxEl = $(`.wi-max[data-i="${i}"]`, panel);
      const eVal = earnedEl && earnedEl.value.trim() !== '' ? earnedEl.value.trim() : '—';
      const mVal = maxEl && maxEl.value.trim() !== '' ? maxEl.value.trim() : '—';
      row.score = eVal + '/' + mVal;
      if(rowGraded(row)){ row.pct = Math.round(rowPct(row)) + '%'; if(row.status==='missing'||row.status==='due') row.status = 'graded'; }
      else { row.pct = '—'; }
      whatIfRecalc();
    });
  });

  // Remove rows.
  $$('.wi-x', panel).forEach(btn => {
    btn.onclick = function(){
      const i = +this.getAttribute('data-i');
      gb.asg.splice(i, 1);
      recomputeCourse(id);
      if(HISTORY[id] && HISTORY[id].length) HISTORY[id][HISTORY[id].length - 1] = byId(id).grade;
      updateOverall();
      renderScreen(); // focus on a button — re-render full pane
    };
  });

  // Add assignment.
  const add = $('#gbWiAdd');
  if(add){
    add.onclick = () => {
      const name = ($('#gbWiName').value || '').trim() || 'New assignment';
      const cat = $('#gbWiCat').value;
      const eRaw = ($('#gbWiEarned').value || '').trim();
      const mRaw = ($('#gbWiMax').value || '').trim();
      const e = eRaw === '' ? '—' : eRaw;
      const m = mRaw === '' ? '—' : mRaw;
      const row = { nm:name, cat:cat, date:'what-if', score:e + '/' + m, pct:'—', status:'graded' };
      if(rowGraded(row)) row.pct = Math.round(rowPct(row)) + '%';
      gb.asg.push(row);
      recomputeCourse(id);
      if(HISTORY[id] && HISTORY[id].length) HISTORY[id][HISTORY[id].length - 1] = byId(id).grade;
      updateOverall();
      renderScreen(); // focus on a button — re-render full pane
    };
  }
}

// shared: legend toggle + point hover tooltip
function wireChartInteractions(wrapSel){
  const wrap = $(wrapSel); if(!wrap) return;
  const tip = $('#ctip', wrap) || $('#ctip');
  // legend toggles
  $$('#main .lchip').forEach(chip => chip.onclick = () => {
    const id = chip.dataset.line;
    const on = chip.classList.toggle('off');
    chip.classList.toggle('on', !on);
    $$(`[data-line="${id}"]`, wrap).forEach(el => el.style.display = on ? 'none' : '');
  });
  // hover points
  $$('.hoverpt', wrap).forEach(pt => {
    pt.addEventListener('mouseenter', () => {
      const cid = pt.dataset.line, i = +pt.dataset.i;
      pt.setAttribute('r','6'); pt.setAttribute('opacity','1');
      const v = HISTORY[cid][i];
      tip.textContent = `${WEEKS[i]} · ${v.toFixed(1)}%`;
      // position relative to wrap using svg coords
      const svg = $('svg', wrap);
      const box = svg.getBoundingClientRect();
      const wbox = wrap.getBoundingClientRect();
      const x = (+pt.getAttribute('cx'))/600 * box.width + (box.left - wbox.left);
      const y = (+pt.getAttribute('cy'))/220 * box.height + (box.top - wbox.top);
      tip.style.left = x + 'px';
      tip.style.top = (y - 34) + 'px';
      tip.style.transform = 'translateX(-50%)';
      tip.style.opacity = '1';
    });
    pt.addEventListener('mouseleave', () => {
      pt.setAttribute('r','4'); pt.setAttribute('opacity','0');
      tip.style.opacity = '0';
    });
  });
}

/* ============================================================
   3 · ASSIGNMENTS
   ============================================================ */
function counts(){
  return {
    todo: ASSIGNMENTS.filter(a => a.state==='todo' && !state.asgDone[a.nm]).length,
    missing: ASSIGNMENTS.filter(a => a.state==='missing' && !state.asgDone[a.nm]).length,
    done: ASSIGNMENTS.filter(a => a.state==='done' || state.asgDone[a.nm]).length,
  };
}
function todoCard(a){
  const c = byId(a.cid);
  const checked = !!state.asgDone[a.nm];
  const isDoneState = a.state==='done';
  const done = checked || isDoneState;
  let asideHtml = '';
  if(a.aside) asideHtml = ` <span class="aside">${esc(a.aside)}</span>`;
  else if(a.asideSoft) asideHtml = ` <span class="aside soft">${esc(a.asideSoft)}</span>`;
  const sub = done
    ? `${esc(c.name)} · ${esc(a.subInfo)}`
    : `${esc(c.name)} · ${esc(c.teacher)}${asideHtml}`;
  const right = done
    ? `<div class="stat ok">done</div>`
    : (a.dueLabel ? `<div class="due ${a.due==='today'?'today':''}">${esc(a.dueLabel)}</div>` : '') +
      `<div class="stat ${a.stat}">${esc(a.statLabel)}</div>`;
  return `<div class="card todo" data-nm="${esc(a.nm)}" style="--dot:${c.accent}">
    <div class="box ${done?'done':''}" data-check="${esc(a.nm)}">${done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</div>
    <div class="tmeta"><div class="tt ${done?'struck':''}">${esc(a.nm)}</div><div class="tsub">${sub}</div></div>
    ${right}
  </div>`;
}
function viewAssign(){
  const c = counts();
  const tabBtn = (k,label,n) => `<button data-atab="${k}" class="${state.asgTab===k?'on':''}">${label} <span class="ct">${n}</span></button>`;
  return `
    <div class="pagehd"><h1>Assignments</h1><span class="when">your to-do, sorted by what matters</span></div>
    <p class="lead">2 due today, 2 you skipped. let's deal with those first.</p>
    <div class="toolbar">
      <div class="search">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#b6a690" stroke-width="2.2"/><path d="M20 20l-3.2-3.2" stroke="#b6a690" stroke-width="2.2" stroke-linecap="round"/></svg>
        <input type="text" id="asgsearch" placeholder="search assignments…" value="${esc(state.asgQuery)}">
      </div>
      <div class="tabs">${tabBtn('todo','To-do',c.todo)}${tabBtn('missing','Missing',c.missing)}${tabBtn('done','Done',c.done)}</div>
    </div>
    <div id="asglist"></div>`;
}
function renderAsgList(){
  const list = $('#asglist'); if(!list) return;
  const q = state.asgQuery.trim().toLowerCase();
  let items;
  if(state.asgTab==='todo') items = ASSIGNMENTS.filter(a => a.state==='todo' && !state.asgDone[a.nm]);
  else if(state.asgTab==='missing') items = ASSIGNMENTS.filter(a => a.state==='missing' && !state.asgDone[a.nm]);
  else items = ASSIGNMENTS.filter(a => a.state==='done' || state.asgDone[a.nm]);
  if(q) items = items.filter(a => a.nm.toLowerCase().includes(q) || byId(a.cid).name.toLowerCase().includes(q));
  let head = '';
  if(state.asgTab==='missing' && !q) head = `<div class="bubble tail small" style="margin-bottom:14px">both of these are small. an hour total, honestly, and the missing tag goes away 🧹</div>`;
  const body = items.length ? items.map(todoCard).join('')
    : `<div class="emptynote">${q ? 'nothing matches that. try a shorter word.' : state.asgTab==='missing' ? 'nothing missing. nice — you cleared them 🎉' : state.asgTab==='done' ? 'nothing checked off yet. tick a box and it lands here.' : 'to-do list is empty. go outside?'}</div>`;
  list.innerHTML = head + body;
  // wire checkboxes
  $$('.box[data-check]', list).forEach(b => b.onclick = () => {
    const nm = b.dataset.check;
    const a = ASSIGNMENTS.find(x => x.nm===nm);
    if(a.state==='done'){ return; } // already permanently done
    state.asgDone[nm] = !state.asgDone[nm];
    save();
    if(state.asgDone[nm]){
      const c = byId(a.cid);
      toast({ic:'✓', tt:'checked off · '+nm, ts:esc(c.name)+' · moved to Done'});
    }
    // refresh tab counts + list
    refreshAsgTabs();
    renderAsgList();
  });
}
function refreshAsgTabs(){
  const c = counts();
  const map = {todo:c.todo, missing:c.missing, done:c.done};
  $$('#main .tabs button').forEach(b => {
    const ct = $('.ct', b);
    if(ct) ct.textContent = map[b.dataset.atab];
  });
}
function wireAssign(){
  $$('#main .tabs button').forEach(b => b.onclick = () => { state.asgTab = b.dataset.atab; save();
    $$('#main .tabs button').forEach(x => x.classList.toggle('on', x===b)); renderAsgList(); });
  const inp = $('#asgsearch');
  inp.oninput = () => { state.asgQuery = inp.value; save(); renderAsgList(); };
  renderAsgList();
}

/* ============================================================
   4 · CALENDAR
   ============================================================ */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function viewCalendar(){
  return `
    <div class="pagehd"><h1>Calendar</h1><span class="when">due dates, colored by class</span></div>
    <p class="lead">today's the ${TODAY}${ordinal(TODAY)}. the dots are stuff due. that's it.</p>
    <div class="calbar">
      <div class="navbtn" id="calprev">‹</div>
      <div class="mo" id="calmo"></div>
      <div class="navbtn" id="calnext">›</div>
      <div class="todaybtn" id="caltoday">Today</div>
    </div>
    <div class="calgrid" id="calgrid"></div>
    <div id="caldetail"></div>
    <div class="sticky">
      <div class="ic">📌</div>
      <p>kinda busy thursday btw — French vocab plus the Algebra packet creeping up. maybe start the packet wednesday.</p>
    </div>
    <div class="legend">
      <div class="li"><span class="dd" style="background:#5aa9e6"></span>Algebra</div>
      <div class="li"><span class="dd" style="background:#4fb286"></span>Biology / PE</div>
      <div class="li"><span class="dd" style="background:#ffb454"></span>French</div>
      <div class="li"><span class="dd" style="background:#9b87f2"></span>Drama</div>
      <div class="li"><span class="dd" style="background:#ef6a9b"></span>Literature</div>
    </div>`;
}
function renderCalendar(){
  const grid = $('#calgrid'); if(!grid) return;
  const y = state.calYear, mo = state.calMonth;
  $('#calmo').textContent = `${MONTH_NAMES[mo]} ${y}`;
  const events = CAL_EVENTS[`${y}-${mo}`] || {};
  const first = new Date(y, mo, 1).getDay(); // 0=Sun
  const daysIn = new Date(y, mo+1, 0).getDate();
  const isThisMonth = (y===NOW_YEAR && mo===NOW_MONTH);
  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="dow">${d}</div>`).join('');
  for(let i=0;i<first;i++) html += `<div class="day out"></div>`;
  for(let d=1; d<=daysIn; d++){
    const ev = events[d];
    const dotcols = ev ? ev.map(e => byId(e.cid).accent) : [];
    const dots = dotcols.length ? `<div class="dots">${dotcols.map(col=>`<span class="dd" style="background:${col}"></span>`).join('')}</div>` : '';
    const cls = ['day'];
    if(isThisMonth && d===TODAY) cls.push('today');
    if(ev){ cls.push('has'); }
    if(state.calSel===d && (CAL_EVENTS[`${y}-${mo}`]||{})[d]) cls.push('sel');
    html += `<div class="${cls.join(' ')}" data-day="${d}"><div class="dn">${d}</div>${dots}</div>`;
  }
  const trailing = (7 - ((first + daysIn) % 7)) % 7;
  for(let i=0;i<trailing;i++) html += `<div class="day out"></div>`;
  grid.innerHTML = html;
  $$('.day.has', grid).forEach(el => el.onclick = () => {
    const d = +el.dataset.day;
    state.calSel = state.calSel===d ? null : d; save();
    renderCalendar(); renderCalDetail();
  });
  renderCalDetail();
}
function renderCalDetail(){
  const wrap = $('#caldetail'); if(!wrap) return;
  const y = state.calYear, mo = state.calMonth, d = state.calSel;
  const events = (CAL_EVENTS[`${y}-${mo}`] || {})[d];
  if(!d || !events){ wrap.innerHTML=''; return; }
  const items = events.map(e => {
    const c = byId(e.cid);
    return `<div class="card dayitem"><span class="dd" style="background:${c.accent}"></span>
      <div class="di-nm">${esc(e.nm)}</div><div class="di-c">${esc(c.short)}</div></div>`;
  }).join('');
  const tail = (mo===NOW_MONTH && y===NOW_YEAR && d===TODAY) ? "both of these are due today. the 7.3 set and one paragraph for lit."
    : "click another day to see its stuff, or the same one to close.";
  wrap.innerHTML = `<div class="daydetail">
    <div class="ddh">${MONTH_NAMES[mo]} ${d} — ${events.length} thing${events.length>1?'s':''} due</div>
    ${items}
    <div class="bubble tail small" style="margin-top:6px;max-width:420px">${esc(tail)}</div>
  </div>`;
}
function wireCalendar(){
  $('#calprev').onclick = () => { state.calMonth--; if(state.calMonth<0){state.calMonth=11;state.calYear--;} state.calSel=null; save(); renderCalendar(); };
  $('#calnext').onclick = () => { state.calMonth++; if(state.calMonth>11){state.calMonth=0;state.calYear++;} state.calSel=null; save(); renderCalendar(); };
  $('#caltoday').onclick = () => { state.calMonth=NOW_MONTH; state.calYear=NOW_YEAR; state.calSel=null; save(); renderCalendar(); };
  renderCalendar();
}

/* ============================================================
   5 · ANNOUNCEMENTS
   ============================================================ */
function viewAnnouncements(){
  const cards = ANNOUNCEMENTS.map((a,i) => {
    const c = byId(a.cid);
    const starred = state.stars[i] !== undefined ? state.stars[i] : a.star;
    const react = a.react ? `<div class="react"><span class="q">${a.react.q}</span> ${esc(a.react.t)}</div>` : '';
    return `<div class="card ann" style="border-left:5px solid ${c.accent}">
      <div class="atop">
        <span class="tag2" style="background:${c.accent}">${esc(c.short)}</span>
        <span class="who">${esc(a.who)}</span>
        <span class="tm" data-tm="${i}">${esc(a.tm)}</span>
        <span class="star ${starred?'on':''}" data-star="${i}">${starred?'★':'☆'}</span>
      </div>
      <div class="msg">${esc(a.msg)}</div>
      ${react}
    </div>`;
  }).join('');
  return `
    <div class="pagehd"><h1>Announcements</h1><span class="when">what your teachers just posted</span>
      <button class="pingbtn" id="annrefresh" style="margin-left:auto" title="refresh">⟳ refresh</button></div>
    <p class="lead">newest up top. starred a couple i think you actually need.</p>
    ${cards}`;
}
function wireAnnouncements(){
  $$('#main .star').forEach(s => s.onclick = () => {
    const i = +s.dataset.star;
    const cur = state.stars[i] !== undefined ? state.stars[i] : ANNOUNCEMENTS[i].star;
    state.stars[i] = !cur; save();
    s.classList.toggle('on', !cur);
    s.textContent = !cur ? '★' : '☆';
  });
  $('#annrefresh').onclick = () => {
    $$('#main .tm').forEach(el => el.textContent = 'updated just now');
    toast({ic:'📣', tt:'announcements refreshed', ts:'nothing new since you last looked'});
  };
}

/* ============================================================
   6 · MATERIALS
   ============================================================ */
function fileIcon(t){ return {folder:'📁',pdf:'📄',doc:'📝',link:'🔗'}[t]||'📄'; }
function viewMaterials(){
  const files = MATERIALS.map((f,i) => {
    const sel = state.matFile===i;
    const subStyle = f.target ? ' style="color:var(--rose);font-weight:800"' : '';
    return `<div class="card file ${sel?'on':''}" data-file="${i}">
      <div class="fi ${f.type}">${fileIcon(f.type)}</div>
      <div class="fnm">${esc(f.nm)}<div class="fsub"${subStyle}>${f.target?'your submission is open ↓':esc(f.sub)}</div></div>
      <span class="chev">›</span></div>`;
  }).join('');
  return `
    <div class="pagehd"><h1>Materials</h1><span class="when">Biology · Ms. Carrington</span></div>
    <p class="lead">files and links for the class, plus the lab you still owe is right here. submit it from this page.</p>
    <div class="matwrap">
      <div class="matlist">${files}</div>
      <div class="card matpanel" id="matpanel"></div>
    </div>
    <div class="say" style="margin-top:16px"><div class="q" style="background:#e6f7ef">💬</div><p>everything you need for this lab is sitting right there.<span class="add">handout, data template, a box to type in. ten minutes and the red goes away.</span></p></div>`;
}
function renderMatPanel(){
  const panel = $('#matpanel'); if(!panel) return;
  const f = MATERIALS[state.matFile];
  if(!f.target){
    // generic file view
    panel.innerHTML = `
      <div class="panelhd"><div class="ptitle">${esc(f.nm)}</div><div class="psub">${esc(f.sub)}</div></div>
      <div class="attach"><span class="ai">${fileIcon(f.type)}</span> ${esc(f.nm)}</div>
      <p class="revnote">${f.type==='link'?'opens in a new tab on the real thing.':'preview here · download from Schoology.'}</p>
      <div class="panelfoot">
        <button class="btn ghost" id="matopen">Open in Schoology ↗</button>
      </div>
      <div class="bubble small tail" style="margin:12px 18px 16px;max-width:none">not the one you owe — that's the lab below. tap it to submit.</div>`;
    $('#matopen').onclick = () => toast({ic:'↗', tt:'would open in Schoology', ts:esc(f.nm)});
    return;
  }
  // submission target
  const revLine = state.matRev>0
    ? `submitted · revision ${state.matRev} ✓ · ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`
    : '';
  const comments = state.comments.map(c => `<div class="cmt"><span class="cmt-w">you</span>${esc(c)}</div>`).join('');
  panel.innerHTML = `
    <div class="panelhd">
      <div class="ptitle">${esc(MAT_TARGET.nm)}</div>
      <div class="psub">${MAT_TARGET.sub}</div>
    </div>
    ${MAT_TARGET.attach.map(([ic,nm])=>`<div class="attach"><span class="ai">${ic}</span> ${esc(nm)}</div>`).join('')}
    <div class="field">
      <label>your submission</label>
      <textarea id="matsub" rows="4" placeholder="paste your write-up or notes here, or attach a file below…"></textarea>
    </div>
    <div class="field">
      <label>add a comment for Ms. Carrington</label>
      <input class="txt" id="matcomment" type="text" placeholder="optional — e.g. sorry this is late!">
    </div>
    <div class="commentlist" id="matcmts">${comments}</div>
    <p class="revnote">revisions allowed until friday · late credit applies</p>
    <p class="subok ${state.matRev>0?'show':''}" id="matsubok">${revLine}</p>
    <div class="panelfoot">
      <button class="btn primary" id="matsubmit">${state.matRev>0?'Submit revision':'Submit lab'}</button>
      <button class="btn ghost" id="matattach">📎 Attach file</button>
      <button class="btn ghost" id="matschool">Open in Schoology ↗</button>
    </div>
    <div class="bubble small tail" style="margin:0 18px 16px;max-width:none">small one. type a couple lines, hit submit, and the missing tag is gone 👀</div>`;
  $('#matsubmit').onclick = () => {
    state.matRev++; save();
    const t = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    const ok = $('#matsubok');
    ok.textContent = `submitted · revision ${state.matRev} ✓ · ${t}`;
    ok.classList.add('show');
    $('#matsubmit').textContent = 'Submit revision';
    toast({ic:'✓', tt:'submitted · revision '+state.matRev, ts:'Cell Energetics Lab (Biology)'});
  };
  const addComment = () => {
    const inp = $('#matcomment'); const v = inp.value.trim();
    if(!v) return;
    state.comments.push(v); save();
    inp.value='';
    $('#matcmts').innerHTML = state.comments.map(c => `<div class="cmt"><span class="cmt-w">you</span>${esc(c)}</div>`).join('');
  };
  $('#matcomment').addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addComment(); }});
  $('#matattach').onclick = () => toast({ic:'📎', tt:'attach (demo)', ts:'file picker would open here'});
  $('#matschool').onclick = () => toast({ic:'↗', tt:'would open in Schoology', ts:'Cell Energetics Lab'});
}
function wireMaterials(){
  $$('#main .file').forEach(el => el.onclick = () => {
    state.matFile = +el.dataset.file; save();
    $$('#main .file').forEach(x => x.classList.toggle('on', x===el));
    renderMatPanel();
  });
  renderMatPanel();
}

/* ============================================================
   6.4 · NOSTALGIA — grade snapshots over time
   capture the current term into localStorage, look back at past ones.
   key: bsgy-forge-snapshots. each snapshot is term + overall + 6 courses.
   ============================================================ */
const SNAP_KEY = 'bsgy-forge-snapshots';
// the term we're living in right now (matches MOCKUP_DATA)
const CUR_TERM = { id:'2025-2026-fr-s2', label:'freshman · semester 2', year:'2025–2026' };
// pre-seeded past term: freshman · semester 1 (captured jan 2026)
const SEED_SNAPSHOT = {
  id:'2025-2026-fr-s1', term:'freshman · semester 1', year:'2025–2026',
  capturedAt:'Jan 2026', captured:1737000000000, overall:94.8, seed:true,
  courses:[
    {id:'alg', name:'Algebra 2 / Trig', short:'Algebra 2/Trig', emoji:'📐', accent:'#5aa9e6', soft:'#e3f0fb', grade:95.0, ltr:'A'},
    {id:'bio', name:'Biology',          short:'Biology',        emoji:'🧬', accent:'#4fb286', soft:'#e6f7ef', grade:93.5, ltr:'A'},
    {id:'fre', name:'French 1',         short:'French 1',       emoji:'🥐', accent:'#ffb454', soft:'#fff1d6', grade:92.0, ltr:'A'},
    {id:'dra', name:'Drama',            short:'Drama',          emoji:'🎭', accent:'#9b87f2', soft:'#ece7ff', grade:96.2, ltr:'A'},
    {id:'lit', name:'Literature',       short:'Literature',     emoji:'📚', accent:'#ef6a9b', soft:'#ffe4ef', grade:91.0, ltr:'A−'},
    {id:'pe',  name:'PE 9',             short:'PE 9',           emoji:'🏃', accent:'#4fb286', soft:'#e6f7ef', grade:99.0, ltr:'A'},
  ],
};
function loadSnapshots(){
  let arr = [];
  try{ const raw = JSON.parse(localStorage.getItem(SNAP_KEY)); if(Array.isArray(raw)) arr = raw; }catch(e){}
  // pre-seed the past term once, if the store has never been touched
  if(localStorage.getItem(SNAP_KEY)===null){
    arr = [SEED_SNAPSHOT];
    saveSnapshots(arr);
  }
  return arr;
}
function saveSnapshots(arr){ try{ localStorage.setItem(SNAP_KEY, JSON.stringify(arr)); }catch(e){} }
let SNAPSHOTS = loadSnapshots();
let snapViewing = null; // id of the snapshot currently expanded for read-only view

// build a snapshot object off the CURRENT term + the live courses
function currentSnapshot(){
  return {
    id:CUR_TERM.id, term:CUR_TERM.label, year:CUR_TERM.year,
    capturedAt:`${MONTH_ABBR[NOW_MONTH]} ${NOW_YEAR}`, captured:Date.now(),
    overall:96.2,
    courses:COURSES.map(c => ({id:c.id, name:c.name, short:c.short, emoji:c.emoji,
      accent:c.accent, soft:c.soft, grade:c.grade, ltr:c.ltr})),
  };
}
function alreadyCaptured(){ return SNAPSHOTS.some(s => s.id===CUR_TERM.id); }
// snapshots sorted newest first by capture time
function snapsSorted(){ return [...SNAPSHOTS].sort((a,b)=>(b.captured||0)-(a.captured||0)); }

function captureNow(){
  const snap = currentSnapshot();
  const i = SNAPSHOTS.findIndex(s => s.id===snap.id);
  const updating = i>=0;
  if(updating) SNAPSHOTS[i] = snap; else SNAPSHOTS.push(snap);
  saveSnapshots(SNAPSHOTS);
  toast({ic:'📸', tt: updating ? 'snapshot updated' : 'snapshot saved',
    ts:`${snap.term} · ${snap.overall}%`});
  renderScreen();
}
function deleteSnap(id){
  SNAPSHOTS = SNAPSHOTS.filter(s => s.id!==id);
  saveSnapshots(SNAPSHOTS);
  if(snapViewing===id) snapViewing=null;
  toast({ic:'🗑️', tt:'snapshot deleted', ts:'gone. you can always recapture.'});
  renderScreen();
}

// a dry one-liner comparing this snapshot's overall to the previous (older) term
function deltaAside(snap, prev){
  if(!prev) return "first one on record. nothing to look back on yet.";
  const d = +(snap.overall - prev.overall).toFixed(1);
  const a = Math.abs(d);
  const rough = a<0.1 ? 'about flat' : (a<1 ? `about ${a} of a point` : `about ${a} point${a===1?'':'s'}`);
  if(a<0.1) return `basically flat since ${prev.term}.`;
  return d>0 ? `up ${rough} since ${prev.term}.` : `down ${rough} since ${prev.term}.`;
}

function snapCard(snap, prevSnap){
  const isCur = snap.id===CUR_TERM.id;
  const delta = (() => {
    if(!prevSnap) return '';
    const d = +(snap.overall - prevSnap.overall).toFixed(1);
    if(Math.abs(d)<0.1) return `<div class="sdelta flatd">→ flat vs last term</div>`;
    const cls = d>0 ? 'upd' : 'downd';
    const arrow = d>0 ? '▲' : '▼';
    return `<div class="sdelta ${cls}">${arrow} ${d>0?'+':''}${d} vs last term</div>`;
  })();
  const chips = snap.courses.map(c =>
    `<span class="snapchip" style="--dot:${c.accent}"><span class="dot"></span>${esc(c.short)} <span class="sg">${c.grade}</span></span>`
  ).join('');
  const viewing = snapViewing===snap.id;
  const detail = viewing ? `<div class="snapview">${snap.courses.map(c =>
      `<div class="card svrow" style="--soft:${c.soft}">
        <div class="sve">${c.emoji}</div>
        <div class="svm"><div class="svn">${esc(c.name)}</div></div>
        <div class="svg2">${c.grade}<span class="pct">%</span></div>
        <div class="svlt">${esc(c.ltr)}</div>
      </div>`).join('')}</div>` : '';
  return `<div class="card snap">
    ${isCur?'<span class="now-tag">this term</span>':''}
    <div class="stop">
      <div class="smeta">
        <div class="sterm">${esc(snap.term)}</div>
        <div class="scap">${esc(snap.year)} · captured ${esc(snap.capturedAt)}</div>
      </div>
      <div class="sov"><div class="g">${snap.overall}<span class="pct">%</span></div>${delta}</div>
    </div>
    <div class="scourses">${chips}</div>
    <div class="saside">${esc(deltaAside(snap, prevSnap))}</div>
    <div class="sfoot">
      <button class="btn ghost" data-viewsnap="${esc(snap.id)}">${viewing?'hide':'view'}</button>
      <button class="btn ghost" data-delsnap="${esc(snap.id)}">delete</button>
    </div>
    ${detail}
  </div>`;
}

function viewNostalgia(){
  const sorted = snapsSorted();
  const captured = alreadyCaptured();
  const capLine = captured
    ? "you already grabbed this term. tap recapture if your grades moved."
    : "freeze this term so future-you can see where things stood. takes a second.";
  const list = sorted.length
    ? sorted.map((s,i) => snapCard(s, sorted[i+1])).join('')
    : `<div class="emptynote">no snapshots yet. capture this term above and it lands here.</div>`;
  return `
    <div class="pagehd"><h1>Nostalgia</h1><span class="when">a snapshot of each term, kept for later</span></div>
    <p class="lead">grades change all the time. this keeps a little photo of where you stood at the end of each term.</p>
    <div class="card capcard">
      <div class="capico">📸</div>
      <div class="captx">
        <div class="capt">capture this term</div>
        <div class="caps">${CUR_TERM.year} · ${CUR_TERM.label} · overall 96.2%</div>
      </div>
      <button class="btn primary" id="capbtn">${captured?'recapture':'capture'} 📸</button>
    </div>
    <p class="lead" style="margin:10px 0 4px">${capLine}</p>
    <div class="sechd"><h2>Past terms</h2><span class="sub">newest first</span></div>
    <div class="snaps">${list}</div>
    <div class="bubble tail small" style="margin-top:18px;max-width:430px">nothing here leaves your browser. it's just for you to look back on 🙂</div>`;
}
function wireNostalgia(){
  const cap = $('#capbtn'); if(cap) cap.onclick = captureNow;
  $$('#main [data-viewsnap]').forEach(b => b.onclick = () => {
    const id = b.dataset.viewsnap;
    snapViewing = (snapViewing===id) ? null : id;
    renderScreen();
  });
  $$('#main [data-delsnap]').forEach(b => b.onclick = () => deleteSnap(b.dataset.delsnap));
}

/* ============================================================
   6.5 · GAMES / ARCADE
   four little games. high score per game in localStorage (bsgy-forge-arcade).
   flap · whack · bounce · word search.
   ============================================================ */
const GS = 'bsgy-forge-arcade';
let arcade = { best:{flap:0, whack:0, bounce:0, words:0}, active:null, sound:false };
try{ const a = JSON.parse(localStorage.getItem(GS)); if(a){ arcade = {...arcade, best:{...arcade.best, ...(a.best||{})}}; if(typeof a.sound==='boolean') arcade.sound=a.sound; } }catch(e){}
function arcSave(){ try{ localStorage.setItem(GS, JSON.stringify({best:arcade.best, sound:arcade.sound})); }catch(e){} }
function setBest(game, v){ if(v > (arcade.best[game]||0)){ arcade.best[game]=v; arcSave(); return true; } return false; }

/* ---- sound fx: tiny WebAudio blips, no files. off by default ---- */
let _actx = null;
function blip(freq=440, dur=0.07, type='square', vol=0.05){
  if(!arcade.sound) return;
  try{
    if(!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
    if(_actx.state==='suspended') _actx.resume();
    const o=_actx.createOscillator(), g=_actx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.value=vol; o.connect(g); g.connect(_actx.destination);
    const t=_actx.currentTime;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.start(t); o.stop(t+dur);
  }catch(e){}
}
const SFX = {
  hit:  ()=>blip(660,0.06,'square',0.05),
  point:()=>blip(880,0.08,'triangle',0.05),
  lose: ()=>{ blip(200,0.18,'sawtooth',0.05); setTimeout(()=>blip(140,0.22,'sawtooth',0.05),90); },
  win:  ()=>{ blip(660,0.09,'triangle',0.05); setTimeout(()=>blip(880,0.12,'triangle',0.05),100); },
  flap: ()=>blip(520,0.05,'square',0.04),
};

/* ---- seeded RNG for the daily challenge (deterministic per date) ---- */
function dailySeed(){ const d=new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
let _wsRng = null;  // when set, wsBuild uses it instead of Math.random (daily mode)
function rng(){ return _wsRng ? _wsRng() : Math.random(); }

const GAMES_META = [
  {id:'flap',   emoji:'🐦', accent:'#5aa9e6', soft:'#e3f0fb', nm:'flap',
   d:'tap to flap. slip through the gaps. one wrong move and you\'re on the ground.'},
  {id:'whack',  emoji:'🐹', accent:'#ffb454', soft:'#fff1d6', nm:'whack',
   d:'they keep popping up. 30 seconds. tap them before they duck back down.'},
  {id:'bounce', emoji:'🧱', accent:'#ef6a9b', soft:'#ffe4ef', nm:'bounce',
   d:'paddle, ball, bricks. clear the whole wall. you get three tries.'},
  {id:'words',  emoji:'🔤', accent:'#9b87f2', soft:'#ece7ff', nm:'word search',
   d:'six words hiding in the letters. drag from first to last. find them all.'},
];
function bestLabel(g){
  const b = arcade.best[g]||0;
  return b ? String(b) : '—';
}
function stopArcadeLoops(){ stopFlap(); stopBounce(); stopWhack(); }
function bestScoresPanel(){
  const rows = GAMES_META.map(g => {
    const v = arcade.best[g.id]||0;
    return `<div class="bestrow"><span class="bre">${g.emoji}</span><span class="brn">${g.nm}</span>
      <span class="brv ${v?'':'none'}">${v?v:'—'}</span></div>`;
  }).join('');
  const any = GAMES_META.some(g => arcade.best[g.id]);
  return `<div class="bestpanel">
    <div class="bph"><span class="bpt">best scores</span><span class="bps">${any?'your records so far':'nothing yet — go play one'}</span></div>
    ${rows}</div>`;
}
function soundRow(){
  return `<div class="sndrow">
    <span class="sndi">${arcade.sound?'🔊':'🔇'}</span>
    <div class="sndt"><div class="sndn">sound fx</div><div class="sndd">little blips while you play${arcade.sound?'':' · off'}</div></div>
    <div class="toggle ${arcade.sound?'on':''}" id="sndtoggle"></div>
  </div>`;
}
function viewGames(){
  if(arcade.active){ return viewGameStage(arcade.active); }
  const cards = GAMES_META.map(g => `
    <div class="card gcard" data-game="${g.id}" style="--dot:${g.accent};--soft:${g.soft}">
      <div class="gico">${g.emoji}</div>
      <div class="gtext"><div class="gn">${g.nm}</div><div class="gd">${esc(g.d)}</div></div>
      <div class="gbest">best<span class="bn">${bestLabel(g.id)}</span></div>
      <div class="gplay">▶</div>
    </div>`).join('');
  const daily = `
    <div class="card gcard" data-daily="1" style="--dot:#9b87f2;--soft:#ece7ff">
      <span class="gdailytag">daily</span>
      <div class="gico">🗓️</div>
      <div class="gtext"><div class="gn">daily challenge</div><div class="gd">today's word search, same grid for everyone. comes back fresh tomorrow.</div></div>
      <div class="gplay">▶</div>
    </div>`;
  return `
    <div class="pagehd"><h1>Games</h1><span class="when">a little break</span></div>
    <p class="lead">four little games for when you're avoiding homework. high scores save.</p>
    <div class="arcade">
      <div class="arcadetop">${bestScoresPanel()}${soundRow()}</div>
      <div class="gcards">${cards}${daily}</div>
    <div class="bubble tail small" style="margin-top:18px;max-width:430px">come back to the work whenever. it's not going anywhere 🙂</div></div>`;
}
function viewGameStage(g){
  const meta = GAMES_META.find(x=>x.id===g);
  const inner = {flap:flapStageHTML, whack:whackStageHTML, bounce:bounceStageHTML, words:wordsStageHTML}[g]();
  const isDaily = (g==='words' && arcade.daily);
  const title = isDaily ? `daily challenge <span class="dailybadge">today</span>` : meta.nm;
  const when = isDaily ? "today's puzzle — same grid for everyone, resets tomorrow." : esc(meta.d);
  return `<div class="pagehd"><h1>${title}</h1><span class="when">${when}</span></div>
    <div class="arcade gstage" style="--dot:${meta.accent};--soft:${meta.soft}">${inner}</div>`;
}
function detachArcadeKey(){
  if(arcade && arcade._key){ document.removeEventListener('keydown', arcade._key); arcade._key=null; }
  if(arcade && arcade._keyUp){ document.removeEventListener('keyup', arcade._keyUp); arcade._keyUp=null; }
}
function wireGames(){
  detachArcadeKey(); stopArcadeLoops();
  if(arcade.active){ ({flap:wireFlap, whack:wireWhack, bounce:wireBounce, words:wireWords}[arcade.active])(); return; }
  $$('#main .gcard').forEach(el => el.onclick = () => { arcade.active = el.dataset.game; renderScreen(); });
}
function exitGame(){ stopArcadeLoops(); detachArcadeKey(); arcade.active = null; renderScreen(); }
function gbarHTML(scores){
  const s = scores.map(([l,v,id]) => `<div class="gscore"><div class="sl">${l}</div><div class="sv" id="${id}">${v}</div></div>`).join('');
  return `<div class="gbar">
    <button class="gback" id="gback">‹ back</button>
    <button class="gback" id="grestart">↻ restart</button>
    <div class="gscores">${s}</div></div>`;
}
function wireGbar(restartFn){
  $('#gback').onclick = exitGame;
  $('#grestart').onclick = restartFn;
}
function overlayHTML(){
  return `<div class="govl" id="govl"><div class="gbox">
    <div class="gbe" id="govle">🎉</div>
    <div class="gbt" id="govlt"></div>
    <div class="gbs" id="govls"></div>
    <div class="gbb">
      <button class="btn primary" id="govlplay">play again</button>
      <button class="btn ghost" id="govlback">back to arcade</button>
    </div></div></div>`;
}
function showOverlay(emoji, title, sub, restartFn){
  const o = $('#govl'); if(!o) return;
  $('#govle').textContent = emoji;
  $('#govlt').textContent = title;
  $('#govls').textContent = sub;
  o.classList.add('show');
  $('#govlplay').onclick = restartFn;
  $('#govlback').onclick = exitGame;
}
function hideOverlay(){ const o=$('#govl'); if(o) o.classList.remove('show'); }

function roundRect(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function cssVar(name,fallback){ const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fallback; }

/* ---------- GAME 1 · FLAP (flappy) ---------- */
let flap = null;
function flapStageHTML(){
  return gbarHTML([['score','0','flapScore'],['best',String(arcade.best.flap||0),'flapBest']]) +
    `<div class="gboardwrap"><canvas class="gcanvas" id="flapCanvas" width="360" height="460" tabindex="0"></canvas>${overlayHTML()}</div>
     <div class="bubble tail small" style="margin-top:14px;max-width:430px">tap, click, or space to flap. slip through the gaps. each one is +1.</div>`;
}
function flapNew(){
  stopFlap();
  flap = {W:360, H:460, y:200, vy:0, grav:0.42, lift:-7, pipes:[], gap:140, pw:56,
    x:84, r:15, score:0, over:false, started:false, raf:0, frame:0};
  flapSpawn(); flapDraw(); hideOverlay();
  const sc=$('#flapScore'); if(sc) sc.textContent='0';
  flap.raf = requestAnimationFrame(flapLoop);
}
function stopFlap(){ if(flap && flap.raf){ cancelAnimationFrame(flap.raf); flap.raf=0; } }
function flapSpawn(){
  const margin=46;
  const top = margin + Math.random()*(flap.H - flap.gap - margin*2);
  flap.pipes.push({x:flap.W+10, top, scored:false});
}
function flapFlapUp(){
  if(!flap||flap.over) return;
  flap.started=true; flap.vy=flap.lift;
}
function flapLoop(){
  if(!flap||flap.over) return;
  flap.frame++;
  if(flap.started){
    flap.vy += flap.grav; flap.y += flap.vy;
    // move pipes
    flap.pipes.forEach(p => p.x -= 2.3);
    if(flap.pipes.length && flap.pipes[flap.pipes.length-1].x < flap.W - 168) flapSpawn();
    flap.pipes = flap.pipes.filter(p => p.x + flap.pw > -4);
    // score + collide
    for(const p of flap.pipes){
      if(!p.scored && p.x + flap.pw < flap.x - flap.r){
        p.scored=true; flap.score++;
        const sc=$('#flapScore'); if(sc) sc.textContent=flap.score;
        if(setBest('flap',flap.score)){ const bs=$('#flapBest'); if(bs) bs.textContent=flap.score; }
      }
      const inX = flap.x + flap.r > p.x && flap.x - flap.r < p.x + flap.pw;
      if(inX && (flap.y - flap.r < p.top || flap.y + flap.r > p.top + flap.gap)) return flapEnd();
    }
    if(flap.y + flap.r > flap.H - 18 || flap.y - flap.r < 0) return flapEnd();
  }
  flapDraw();
  flap.raf = requestAnimationFrame(flapLoop);
}
function flapEnd(){
  flap.over=true; stopFlap(); setBest('flap',flap.score); flapDraw();
  showOverlay('🐦', flap.score>0?'down you go':'oof, right away',
    'you cleared '+flap.score+'. '+(flap.score>=5?'solid run. again?':'shake it off, go again.'), flapNew);
}
function flapDraw(){
  const cv=$('#flapCanvas'); if(!cv) return;
  const ctx=cv.getContext('2d'); const f=flap;
  const paper=cssVar('--paper-2','#f7ead6'), pipe=cssVar('--sage','#4fb286'),
        line=cssVar('--line','#ece0cd'), ink=cssVar('--ink','#3a2f25'), peach=cssVar('--peach','#ffb454');
  ctx.clearRect(0,0,f.W,f.H);
  ctx.fillStyle=paper; ctx.fillRect(0,0,f.W,f.H);
  // pipes
  f.pipes.forEach(p => {
    ctx.fillStyle=pipe;
    roundRect(ctx, p.x, 0, f.pw, p.top, 10); ctx.fill();
    roundRect(ctx, p.x, p.top+f.gap, f.pw, f.H-(p.top+f.gap)-12, 10); ctx.fill();
  });
  // ground
  ctx.fillStyle=line; ctx.fillRect(0,f.H-12,f.W,12);
  // bird
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(Math.max(-0.4, Math.min(0.7, f.vy*0.05)));
  ctx.fillStyle=peach;
  ctx.beginPath(); ctx.arc(0,0,f.r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(5,-4,4.2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=ink; ctx.beginPath(); ctx.arc(6.5,-4,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff6f61'; ctx.beginPath(); ctx.moveTo(f.r-2,2); ctx.lineTo(f.r+7,4); ctx.lineTo(f.r-2,7); ctx.closePath(); ctx.fill();
  ctx.restore();
  if(!f.started){
    ctx.fillStyle=ink; ctx.font='700 15px '+cssVar('--font','sans-serif'); ctx.textAlign='center';
    ctx.fillText('tap to start', f.W/2, 40);
  }
}
function wireFlap(){
  wireGbar(flapNew);
  flapNew();
  const cv=$('#flapCanvas'); cv.focus();
  const tap = e => { e.preventDefault();
    if($('#govl') && $('#govl').classList.contains('show')) return;
    flapFlapUp(); };
  cv.addEventListener('pointerdown', tap);
  arcade._key = e => {
    if(arcade.active!=='flap') return;
    if($('#govl') && $('#govl').classList.contains('show')) return;
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='Spacebar'){ e.preventDefault(); flapFlapUp(); }
  };
  document.addEventListener('keydown', arcade._key);
}

/* ---------- GAME 2 · WHACK (whack-a-mole) ---------- */
const WHACK_FACES = ['🐹','📚'];
let whack = null;
function whackStageHTML(){
  let holes='';
  for(let i=0;i<9;i++) holes+=`<div class="hole" data-h="${i}"><div class="mole"></div></div>`;
  return gbarHTML([['score','0','whackScore'],['time','30','whackTime'],['best',String(arcade.best.whack||0),'whackBest']]) +
    `<div class="whackwrap">
      <div class="whacktime"><i id="whackBar"></i></div>
      <div class="gboardwrap" style="width:100%;display:block">
        <div class="whackgrid" id="whackGrid">${holes}</div>
        ${overlayHTML()}
      </div>
     </div>
     <div class="bubble tail small" style="margin-top:14px;max-width:430px">30 seconds. tap them while they're up. they don't wait around.</div>`;
}
function whackNew(){
  stopWhack();
  whack = {score:0, time:30, active:-1, over:false, popTimer:0, tickTimer:0, hideTimer:0};
  $$('#main .hole').forEach(h => h.classList.remove('up','bonk'));
  const sc=$('#whackScore'); if(sc) sc.textContent='0';
  const tm=$('#whackTime'); if(tm) tm.textContent='30';
  const bar=$('#whackBar'); if(bar) bar.style.width='100%';
  hideOverlay();
  whackPop();
  whack.tickTimer = setInterval(whackTick, 1000);
}
function stopWhack(){
  if(!whack) return;
  if(whack.popTimer) clearTimeout(whack.popTimer);
  if(whack.hideTimer) clearTimeout(whack.hideTimer);
  if(whack.tickTimer) clearInterval(whack.tickTimer);
  whack.popTimer=whack.hideTimer=whack.tickTimer=0;
}
function whackTick(){
  if(!whack||whack.over) return;
  whack.time--;
  const tm=$('#whackTime'); if(tm) tm.textContent=whack.time;
  const bar=$('#whackBar'); if(bar) bar.style.width=(whack.time/30*100)+'%';
  if(whack.time<=0) whackEnd();
}
function whackPop(){
  if(!whack||whack.over) return;
  // pick a new hole different from current
  let i; do{ i=Math.floor(Math.random()*9); } while(i===whack.active);
  whack.active=i;
  const hole=$(`#main .hole[data-h="${i}"]`);
  if(hole){
    const mole=hole.querySelector('.mole');
    mole.textContent = WHACK_FACES[Math.floor(Math.random()*WHACK_FACES.length)];
    hole.classList.add('up'); hole.classList.remove('bonk');
  }
  const upFor = 700 + Math.random()*600;
  whack.hideTimer = setTimeout(()=>{
    if(!whack||whack.over) return;
    if(hole) hole.classList.remove('up');
    whack.active=-1;
    whack.popTimer = setTimeout(whackPop, 200+Math.random()*350);
  }, upFor);
}
function whackHit(i){
  if(!whack||whack.over) return;
  const hole=$(`#main .hole[data-h="${i}"]`);
  if(i===whack.active && hole && hole.classList.contains('up')){
    whack.score++;
    const sc=$('#whackScore'); if(sc) sc.textContent=whack.score;
    if(setBest('whack',whack.score)){ const bs=$('#whackBest'); if(bs) bs.textContent=whack.score; }
    hole.classList.add('bonk');
    setTimeout(()=>{ if(hole) hole.classList.remove('up'); }, 90);
    whack.active=-1;
    if(whack.hideTimer) clearTimeout(whack.hideTimer);
    whack.popTimer = setTimeout(whackPop, 180+Math.random()*280);
  }
}
function whackEnd(){
  whack.over=true; stopWhack(); setBest('whack',whack.score);
  $$('#main .hole').forEach(h=>h.classList.remove('up'));
  showOverlay('🐹','time', 'you got '+whack.score+'. '+(whack.score>=15?'quick hands. again?':'warm up and go again.'), whackNew);
}
function wireWhack(){
  wireGbar(whackNew);
  $$('#main .hole').forEach(h => {
    h.addEventListener('pointerdown', e => { e.preventDefault(); whackHit(+h.dataset.h); });
  });
  // keys 1-9 map to grid (numpad layout: 7-8-9 top row reads naturally; use 1-9 row-major)
  arcade._key = e => {
    if(arcade.active!=='whack') return;
    const n=parseInt(e.key,10);
    if(n>=1&&n<=9){ e.preventDefault(); whackHit(n-1); }
  };
  document.addEventListener('keydown', arcade._key);
  whackNew();
}

/* ---------- GAME 3 · BOUNCE (breakout) ---------- */
const BRICK_COLORS = ['#ff6f61','#ffb454','#ffcf4d','#4fb286','#5aa9e6'];
let bounce = null;
function bounceStageHTML(){
  return gbarHTML([['score','0','bounceScore'],['lives','3','bounceLives'],['best',String(arcade.best.bounce||0),'bounceBest']]) +
    `<div class="gboardwrap"><canvas class="gcanvas" id="bounceCanvas" width="360" height="420" tabindex="0"></canvas>${overlayHTML()}</div>
     <div class="bubble tail small" style="margin-top:14px;max-width:430px">move with mouse, touch, or ← →. clear every brick. three tries.</div>`;
}
function bounceNew(){
  stopBounce();
  const W=360,H=420, cols=8, rows=5, pad=8, top=44, bw=(W-pad*2-(cols-1)*6)/cols, bh=18;
  const bricks=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)
    bricks.push({x:pad+c*(bw+6), y:top+r*(bh+6), w:bw, h:bh, alive:true, color:BRICK_COLORS[r%BRICK_COLORS.length]});
  bounce = {W,H,bricks,bw,bh,
    paddle:{w:74,h:13,x:W/2-37,y:H-26},
    ball:{x:W/2, y:H-44, r:7, vx:3.1*(Math.random()<.5?-1:1), vy:-3.4},
    score:0, lives:3, over:false, win:false, launched:false, left:false, right:false, raf:0};
  bounceDraw(); hideOverlay();
  const sc=$('#bounceScore'); if(sc) sc.textContent='0';
  const lv=$('#bounceLives'); if(lv) lv.textContent='3';
  bounce.raf = requestAnimationFrame(bounceLoop);
}
function stopBounce(){ if(bounce && bounce.raf){ cancelAnimationFrame(bounce.raf); bounce.raf=0; } }
function bounceLoop(){
  if(!bounce||bounce.over) return;
  const b=bounce, p=b.paddle, ball=b.ball;
  // paddle keys
  if(b.left) p.x-=6; if(b.right) p.x+=6;
  p.x=Math.max(0,Math.min(b.W-p.w,p.x));
  if(b.launched){
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.x-ball.r<0){ ball.x=ball.r; ball.vx*=-1; }
    if(ball.x+ball.r>b.W){ ball.x=b.W-ball.r; ball.vx*=-1; }
    if(ball.y-ball.r<0){ ball.y=ball.r; ball.vy*=-1; }
    // paddle
    if(ball.vy>0 && ball.y+ball.r>=p.y && ball.y+ball.r<=p.y+p.h+8 && ball.x>=p.x-ball.r && ball.x<=p.x+p.w+ball.r){
      ball.vy=-Math.abs(ball.vy);
      const hit=(ball.x-(p.x+p.w/2))/(p.w/2);
      ball.vx=hit*4.2; ball.y=p.y-ball.r;
    }
    // bricks
    for(const br of b.bricks){
      if(!br.alive) continue;
      if(ball.x+ball.r>br.x && ball.x-ball.r<br.x+br.w && ball.y+ball.r>br.y && ball.y-ball.r<br.y+br.h){
        br.alive=false; b.score+=10;
        const sc=$('#bounceScore'); if(sc) sc.textContent=b.score;
        if(setBest('bounce',b.score)){ const bs=$('#bounceBest'); if(bs) bs.textContent=b.score; }
        // bounce vertical or horizontal based on overlap
        const ox=Math.min(ball.x+ball.r-br.x, br.x+br.w-(ball.x-ball.r));
        const oy=Math.min(ball.y+ball.r-br.y, br.y+br.h-(ball.y-ball.r));
        if(ox<oy) ball.vx*=-1; else ball.vy*=-1;
        break;
      }
    }
    if(b.bricks.every(br=>!br.alive)) return bounceWin();
    if(ball.y-ball.r>b.H) return bounceLoseLife();
  } else {
    ball.x=p.x+p.w/2; ball.y=p.y-ball.r-1;
  }
  bounceDraw();
  bounce.raf=requestAnimationFrame(bounceLoop);
}
function bounceResetBall(){
  const b=bounce;
  b.ball.x=b.paddle.x+b.paddle.w/2; b.ball.y=b.paddle.y-b.ball.r-1;
  b.ball.vx=3.1*(Math.random()<.5?-1:1); b.ball.vy=-3.4; b.launched=false;
}
function bounceLoseLife(){
  bounce.lives--;
  const lv=$('#bounceLives'); if(lv) lv.textContent=bounce.lives;
  if(bounce.lives<=0){
    bounce.over=true; stopBounce(); setBest('bounce',bounce.score); bounceDraw();
    showOverlay('🧱','out of tries','cleared '+bounce.score+' worth of bricks. one more wall?', bounceNew);
    return;
  }
  bounceResetBall(); bounceDraw();
  bounce.raf=requestAnimationFrame(bounceLoop);
}
function bounceWin(){
  bounce.over=true; bounce.win=true; stopBounce(); setBest('bounce',bounce.score); bounceDraw();
  showOverlay('🎉','wall cleared','full clear at '+bounce.score+'. nice. go again?', bounceNew);
}
function bounceDraw(){
  const cv=$('#bounceCanvas'); if(!cv) return;
  const ctx=cv.getContext('2d'); const b=bounce;
  const paper=cssVar('--paper-2','#f7ead6'), ink=cssVar('--ink','#3a2f25'), peach=cssVar('--peach','#ffb454');
  ctx.clearRect(0,0,b.W,b.H);
  ctx.fillStyle=paper; ctx.fillRect(0,0,b.W,b.H);
  b.bricks.forEach(br => { if(!br.alive) return; ctx.fillStyle=br.color; roundRect(ctx,br.x,br.y,br.w,br.h,5); ctx.fill(); });
  ctx.fillStyle=ink; roundRect(ctx,b.paddle.x,b.paddle.y,b.paddle.w,b.paddle.h,7); ctx.fill();
  ctx.fillStyle=peach; ctx.beginPath(); ctx.arc(b.ball.x,b.ball.y,b.ball.r,0,Math.PI*2); ctx.fill();
  if(!b.launched){
    ctx.fillStyle=ink; ctx.font='700 14px '+cssVar('--font','sans-serif'); ctx.textAlign='center';
    ctx.fillText('tap / space to launch', b.W/2, b.H-44-18);
  }
}
function bounceLaunch(){ if(bounce && !bounce.launched && !bounce.over) bounce.launched=true; }
function bouncePaddleTo(clientX, cv){
  if(!bounce) return;
  const rect=cv.getBoundingClientRect();
  const sx=bounce.W/rect.width;
  let px=(clientX-rect.left)*sx - bounce.paddle.w/2;
  bounce.paddle.x=Math.max(0,Math.min(bounce.W-bounce.paddle.w,px));
}
function wireBounce(){
  wireGbar(bounceNew);
  bounceNew();
  const cv=$('#bounceCanvas'); cv.focus();
  cv.addEventListener('pointermove', e => bouncePaddleTo(e.clientX, cv));
  cv.addEventListener('pointerdown', e => {
    if($('#govl') && $('#govl').classList.contains('show')) return;
    bouncePaddleTo(e.clientX, cv); bounceLaunch();
  });
  arcade._key = e => {
    if(arcade.active!=='bounce') return;
    if(e.key==='ArrowLeft'||e.key==='a'){ bounce.left=true; e.preventDefault(); }
    if(e.key==='ArrowRight'||e.key==='d'){ bounce.right=true; e.preventDefault(); }
    if(e.key===' '||e.key==='ArrowUp'){ if($('#govl')&&$('#govl').classList.contains('show'))return; bounceLaunch(); e.preventDefault(); }
  };
  arcade._keyUp = e => {
    if(arcade.active!=='bounce'||!bounce) return;
    if(e.key==='ArrowLeft'||e.key==='a') bounce.left=false;
    if(e.key==='ArrowRight'||e.key==='d') bounce.right=false;
  };
  document.addEventListener('keydown', arcade._key);
  document.addEventListener('keyup', arcade._keyUp);
}

/* ---------- GAME 4 · WORD SEARCH ---------- */
const WS_WORDS = ['BIOLOGY','FRENCH','ALGEBRA','DRAMA','ENZYME','ESSAY'];
const WS_N = 10;
let words = null;
function wordsStageHTML(){
  return gbarHTML([['found','0/6','wordsFound'],['time','0s','wordsTime'],['best',String(arcade.best.words||0),'wordsBest']]) +
    `<div class="wsbox">
      <div class="gboardwrap" style="display:block;width:100%">
        <div class="wsgrid" id="wsGrid"></div>
        ${overlayHTML()}
      </div>
      <div class="wslist" id="wsList"></div>
     </div>
     <div class="bubble tail small" style="margin-top:14px;max-width:430px">tap the first letter, then the last. straight lines only. ↻ for a new puzzle.</div>`;
}
function wsBuild(){
  const N=WS_N;
  const grid=Array.from({length:N},()=>Array(N).fill(''));
  const placed=[]; // {word, cells:[[r,c]...]}
  const dirs=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  const tryPlace=(w)=>{
    for(let tries=0;tries<200;tries++){
      const d=dirs[Math.floor(rng()*dirs.length)];
      const r0=Math.floor(rng()*N), c0=Math.floor(rng()*N);
      const cells=[]; let ok=true;
      for(let i=0;i<w.length;i++){
        const r=r0+d[0]*i, c=c0+d[1]*i;
        if(r<0||c<0||r>=N||c>=N){ ok=false; break; }
        const ex=grid[r][c];
        if(ex && ex!==w[i]){ ok=false; break; }
        cells.push([r,c]);
      }
      if(!ok) continue;
      cells.forEach(([r,c],i)=>grid[r][c]=w[i]);
      return cells;
    }
    return null;
  };
  // place longest first for better fit
  const order=[...WS_WORDS].sort((a,b)=>b.length-a.length);
  for(const w of order){ const cells=tryPlace(w); if(cells) placed.push({word:w,cells}); else return wsBuild(); }
  const LET='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(!grid[r][c]) grid[r][c]=LET[Math.floor(rng()*26)];
  return {grid, placed};
}
function wordsNew(){
  // daily mode rebuilds the SAME puzzle for today; restart re-seeds it identically
  _wsRng = arcade.daily ? mulberry32(dailySeed()) : null;
  const {grid,placed}=wsBuild();
  _wsRng = null; // back to random for any other game
  words = {grid, placed, found:[], pickA:null, start:Date.now(), over:false, raf:0};
  wordsRender();
  hideOverlay();
  const f=$('#wordsFound'); if(f) f.textContent='0/6';
  if(words.raf) clearInterval(words.raf);
  words.raf = setInterval(()=>{ const t=$('#wordsTime'); if(t&&!words.over) t.textContent=Math.round((Date.now()-words.start)/1000)+'s'; }, 500);
}
function wordsRender(){
  const g=$('#wsGrid'); if(!g) return;
  let html='';
  for(let r=0;r<WS_N;r++)for(let c=0;c<WS_N;c++)
    html+=`<div class="wscell" data-r="${r}" data-c="${c}">${words.grid[r][c]}</div>`;
  g.innerHTML=html;
  $$('#wsGrid .wscell').forEach(el => el.addEventListener('pointerdown', e => { e.preventDefault(); wordsTap(+el.dataset.r,+el.dataset.c); }));
  wordsPaintFound();
  // list
  const list=$('#wsList');
  list.innerHTML = WS_WORDS.map(w => `<span class="wsword ${words.found.includes(w)?'got':''}">${w}</span>`).join('');
}
function wsCellEl(r,c){ return $(`#wsGrid .wscell[data-r="${r}"][data-c="${c}"]`); }
function wordsClearPick(){ $$('#wsGrid .wscell.pick').forEach(el=>el.classList.remove('pick')); }
function wordsTap(r,c){
  if(!words||words.over) return;
  if(!words.pickA){
    words.pickA=[r,c]; const el=wsCellEl(r,c); if(el) el.classList.add('pick');
    return;
  }
  const [ar,ac]=words.pickA;
  if(ar===r && ac===c){ words.pickA=null; wordsClearPick(); return; } // tap same = cancel
  // must be a straight line (h, v, or diagonal)
  const dr=r-ar, dc=c-ac;
  const stepR=Math.sign(dr), stepC=Math.sign(dc);
  const straight = dr===0 || dc===0 || Math.abs(dr)===Math.abs(dc);
  words.pickA=null; wordsClearPick();
  if(!straight) return;
  const len=Math.max(Math.abs(dr),Math.abs(dc))+1;
  let str=''; const cells=[];
  for(let i=0;i<len;i++){ const rr=ar+stepR*i, cc=ac+stepC*i; str+=words.grid[rr][cc]; cells.push([rr,cc]); }
  const rev=str.split('').reverse().join('');
  const match = WS_WORDS.find(w => (w===str||w===rev) && !words.found.includes(w));
  if(match){
    words.found.push(match);
    cells.forEach(([rr,cc])=>{ const el=wsCellEl(rr,cc); if(el){ el.classList.add('found'); el.classList.remove('pick'); } });
    const f=$('#wordsFound'); if(f) f.textContent=words.found.length+'/6';
    const list=$('#wsList');
    if(list) list.innerHTML = WS_WORDS.map(w => `<span class="wsword ${words.found.includes(w)?'got':''}">${w}</span>`).join('');
    if(words.found.length===WS_WORDS.length) wordsWin();
  }
}
function wordsPaintFound(){
  words.found.forEach(w => {
    const p=words.placed.find(x=>x.word===w);
    if(p) p.cells.forEach(([r,c])=>{ const el=wsCellEl(r,c); if(el) el.classList.add('found'); });
  });
}
function wordsWin(){
  words.over=true;
  if(words.raf){ clearInterval(words.raf); words.raf=0; }
  const secs=Math.round((Date.now()-words.start)/1000);
  // score = found count this round; best tracks most-found (always 6 on a win)
  setBest('words', WS_WORDS.length);
  const bs=$('#wordsBest'); if(bs) bs.textContent=arcade.best.words||0;
  showOverlay('🎉','all six found', 'cleared in '+secs+'s. '+(secs<60?'fast eyes.':'nice. new puzzle?'), wordsNew);
}
function wireWords(){
  wireGbar(wordsNew);
  wordsNew();
}

/* ============================================================
   7 · SETTINGS
   ============================================================ */
const EDITIONS = [
  ['apple','Apple','spare and confident, one calm blue','linear-gradient(135deg,#f5f5f7,#0a84ff)','mockup-app-apple.html'],
  ['halo','Halo','clean and minimal, color only where it matters','linear-gradient(135deg,#eef2f1,#16a394)','mockup-app-halo.html'],
  ['slate','Slate','black-and-white editorial, serif','linear-gradient(135deg,#ffffff,#1a1a1a)','mockup-app-slate.html'],
  ['carbon','Carbon','warm walnut and honey-amber, rich and woody','linear-gradient(135deg,#3a2a1a,#c8881f)','mockup-app-carbon.html'],
  ['friendly','Friendly 🙂','warm and chatty, this one','linear-gradient(135deg,#ffd98a,#e07a3c)','mockup-app-forge.html'],
];
const SECTIONS = [
  ['overview','Overview','the home screen with the greeting'],
  ['grades','Grades','per-class gradebook'],
  ['assign','Assignments','to-do, missing, done'],
  ['cal','Calendar','due dates by month'],
  ['ann','Announcements','teacher posts'],
  ['mat','Materials','files & submissions'],
  ['asides','The friendly asides','my little comments. you can mute me, no offense taken'],
];
const THEMES = [['cream','#fdf4e6','Cream'],['oat','#f3ece1','Oat'],['peach','#ffeede','Peach'],['sage','#eaf2ec','Sage']];
const THEME_MODES = [['light','☀️','Light'],['dark','🌙','Dark'],['auto','🌗','Auto']];
function viewSettings(){
  const styles = EDITIONS.map(([k,nm,sd,sw,file]) =>
    `<div class="stylecard ${k==='friendly'?'on':''}" data-edition="${k}" data-file="${file}">
      <div class="sw" style="background:${sw}"></div>
      <div class="sn">${nm}</div><div class="sd">${sd}</div>
      <div class="pick">active ✓</div></div>`
  ).join('');
  const secs = SECTIONS.map(([k,nm,td]) =>
    `<div class="togrow"><div><div class="tn">${nm}</div><div class="td">${td}</div></div>
      <div class="toggle ${state.sections[k]?'on':''}" data-section="${k}"></div></div>`
  ).join('');
  const dark = effectiveDark();
  const themes = dark ? '' : THEMES.map(([k,col,title]) =>
    `<div class="theme ${state.theme===k?'on':''}" data-theme="${k}" style="background:${col}" title="${title}"></div>`
  ).join('');
  const modes = THEME_MODES.map(([k,ic,label]) =>
    `<button data-mode="${k}" class="${state.themeMode===k?'on':''}">${ic} ${label}</button>`
  ).join('');
  const modeHint = state.themeMode==='auto'
    ? `following your system right now (${dark?'dark':'light'}).`
    : state.themeMode==='dark'
      ? `cozy dark cocoa. easy on the eyes at night.`
      : `pick a paper color below.`;
  return `
    <div class="pagehd"><h1>Settings</h1><span class="when">make it yours</span></div>
    <p class="lead">you're on Friendly mode. obviously the correct choice, but the others are there.</p>
    <div class="card tourrow">
      <span class="ti2">🧭</span>
      <div class="tt2"><div class="tn2">take the tour</div><div class="td2">the quick walkthrough of shortcuts + features. replay it any time.</div></div>
      <button class="pingbtn" id="taketour">start tour</button>
    </div>
    <div class="sechd"><h2>UI Style</h2><span class="sub">pick a vibe</span></div>
    <div class="styles">${styles}</div>
    <div class="sechd"><h2>Your school</h2></div>
    <div class="card detected">
      <div class="glob">🌐</div>
      <div><div class="du">yourschool.schoology.com</div><div class="ds">detected automatically · grades pulled locally</div></div>
      <div class="active">Active ✓</div>
    </div>
    <div class="sechd"><h2>Notifications</h2><span class="sub">the friendly pings</span></div>
    <div class="card">
      <div class="togrow"><div><div class="tn">Desktop pings</div><div class="td">grade changes, new assignments, the occasional nudge</div></div>
        <div class="toggle ${state.notify?'on':''}" data-notify></div></div>
      <div class="togrow"><div><div class="tn">Test a ping</div><div class="td">see what a notification looks like</div></div>
        <button class="pingbtn" id="testping">test a ping</button></div>
    </div>
    <div class="sechd"><h2>Sections &amp; tabs</h2><span class="sub">show or hide</span></div>
    <div class="card">${secs}</div>
    <div class="sechd"><h2>Theme</h2><span class="sub">light, dark, or follow your system</span></div>
    <div class="card" style="padding:8px 0">
      <div class="modeseg">${modes}</div>
      <p class="modehint">${modeHint}</p>
      <div class="themes">${themes}</div>
    </div>
    <div class="outro" style="margin-top:24px">
      <div class="ic">⚙️</div>
      <p>that's everything. <span>changes save on their own. close this whenever.</span></p>
    </div>`;
}
function wireSettings(){
  $$('#main .stylecard').forEach(el => el.onclick = () => {
    const ed = el.dataset.edition, file = el.dataset.file;
    if(ed==='friendly'){
      state.uiEdition = 'friendly'; save();
      $$('#main .stylecard').forEach(x => x.classList.toggle('on', x===el));
      return; // already here
    }
    // navigate to that edition's mockup (same folder, file://-safe relative href)
    toast({ic:'🙂', tt:'switching to '+ed, ts:'opening that edition…'});
    window.location.href = file;
  });
  $$('#main .toggle[data-section]').forEach(el => el.onclick = () => {
    const k = el.dataset.section;
    state.sections[k] = !state.sections[k]; save();
    el.classList.toggle('on', state.sections[k]);
  });
  const notif = $('#main .toggle[data-notify]');
  notif.onclick = () => { state.notify = !state.notify; save(); notif.classList.toggle('on', state.notify);
    toast({ic: state.notify?'🔔':'🔕', tt: state.notify?'pings on':'pings off', ts: state.notify?'i\'ll let you know about the important stuff':'quiet mode. i\'ll keep it to myself'}); };
  $$('#main .modeseg button').forEach(b => b.onclick = () => {
    state.themeMode = b.dataset.mode; save();
    applyTheme();
    renderScreen(); // refresh swatches dim state + hint
  });
  $$('#main .theme').forEach(el => el.onclick = () => {
    if(effectiveDark()) return; // paper tints only apply in light mode
    state.theme = el.dataset.theme; save();
    $$('#main .theme').forEach(x => x.classList.toggle('on', x===el));
    applyTheme();
  });
  $('#testping').onclick = () => firePing();
  const tt = $('#taketour'); if(tt) tt.onclick = () => startTour();
}

/* ============================================================
   TOAST / PING
   ============================================================ */
function toast({ic,tt,ts,tw}){
  if(!state.notify && tt && !/pings (on|off)/.test(tt)) {
    // respect notifications-off, but always allow the on/off confirmation itself
    return;
  }
  const wrap = $('#toastwrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="ti">${ic}</div><div><div class="tt">${tt}</div>${ts?`<div class="ts">${ts}</div>`:''}${tw?`<div class="tw">${tw}</div>`:''}</div>`;
  wrap.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(()=>el.remove(),300); };
  setTimeout(kill, 4200);
  el.onclick = kill;
}
let pingIdx = 0;
function firePing(){
  const p = PINGS[pingIdx % PINGS.length]; pingIdx++;
  // temporarily ignore notify gate for the explicit "test" action
  const wrap = $('#toastwrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="ti">${p.ic}</div><div><div class="tt">${esc(p.tt)}</div><div class="ts">${esc(p.ts)}</div><div class="tw">Better SGY · just now</div></div>`;
  wrap.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(()=>el.remove(),300); };
  setTimeout(kill, 4200);
  el.onclick = kill;
}

/* ============================================================
   SCREEN ID MAPPING — conventions use full names, this app uses
   short ids internally. map both directions for deep links + search.
   ============================================================ */
const SCREEN_ALIAS = {            // convention id -> internal id
  overview:'overview', grades:'grades', assignments:'assign', calendar:'cal',
  announcements:'ann', materials:'mat', nostalgia:'nostalgia', games:'games', settings:'set',
};
function resolveScreen(id){ return SCREEN_ALIAS[id] || (NAVITEMS.some(n=>n[0]===id) ? id : null); }

/* ============================================================
   GLOBAL SEARCH (⌘K command palette)
   builds a flat index across courses, assignments, announcements,
   materials, and screens. arrows + enter jump. esc closes.
   ============================================================ */
function buildSearchIndex(){
  const idx = [];
  // screens
  const SCREEN_HINTS = {overview:'the home greeting',grades:'per-class gradebook',assign:'to-do, missing, done',
    cal:'due dates by month',ann:'teacher posts',mat:'files & submissions',nostalgia:'grade snapshots over time',games:'a little break',set:'make it yours'};
  NAVITEMS.forEach(([k,ic,label]) => idx.push({
    group:'screens', icon:ic, nm:label, sub:SCREEN_HINTS[k]||'', kind:'screen', screen:k
  }));
  // courses
  COURSES.forEach(c => idx.push({
    group:'classes', icon:c.emoji, nm:c.name, sub:`${c.teacher} · ${c.per} · ${c.grade}% ${c.ltr}`,
    kind:'course', course:c.id
  }));
  // assignments
  ASSIGNMENTS.forEach(a => {
    const c = byId(a.cid);
    const tab = a.state==='missing'?'missing':(a.state==='done'?'done':'todo');
    idx.push({ group:'assignments', icon:'✅', nm:a.nm,
      sub:`${c.name}${a.statLabel?' · '+a.statLabel:''}`, kind:'assign', asgTab:tab });
  });
  // announcements
  ANNOUNCEMENTS.forEach(a => {
    const c = byId(a.cid);
    idx.push({ group:'announcements', icon:'📣', nm:`${c.short}: ${a.who}`,
      sub:a.msg.slice(0,72)+(a.msg.length>72?'…':''), kind:'screen', screen:'ann' });
  });
  // materials
  MATERIALS.forEach(m => idx.push({
    group:'materials', icon:({folder:'📁',pdf:'📄',doc:'📝',link:'🔗'}[m.type]||'📄'),
    nm:m.nm, sub:'Biology · Materials', kind:'screen', screen:'mat'
  }));
  return idx;
}
let SEARCH_INDEX = [];
let searchState = { results:[], sel:0 };

function openSearch(){
  if(SEARCH_INDEX.length===0) SEARCH_INDEX = buildSearchIndex();
  closeShortcuts();
  const ovl = $('#searchovl'); ovl.classList.add('show');
  const inp = $('#searchinput'); inp.value=''; renderSearchResults('');
  setTimeout(()=>inp.focus(), 20);
  tourReact('search');   // if the tour's search step is open, this passes it
}
function closeSearch(){ const o=$('#searchovl'); if(o) o.classList.remove('show'); }
function searchOpen(){ return $('#searchovl') && $('#searchovl').classList.contains('show'); }

function runSearch(q){
  q = q.trim().toLowerCase();
  if(!q) return SEARCH_INDEX.slice();   // show everything when empty
  const terms = q.split(/\s+/);
  return SEARCH_INDEX.filter(it => {
    const hay = (it.nm+' '+it.sub+' '+it.group).toLowerCase();
    return terms.every(t => hay.includes(t));
  });
}
function renderSearchResults(q){
  const body = $('#searchbody');
  const res = runSearch(q);
  searchState.results = res; searchState.sel = 0;
  if(!res.length){
    body.innerHTML = `<div class="palempty"><div class="pe">🔍</div>
      <div class="pt">nothing matches “${esc(q)}”</div>
      <div class="ps">try a shorter word, or a class name.</div></div>`;
    return;
  }
  // group while preserving order
  const groups = [];
  res.forEach((it,i) => {
    let g = groups.find(x=>x.name===it.group);
    if(!g){ g={name:it.group, items:[]}; groups.push(g); }
    g.items.push({it,i});
  });
  body.innerHTML = groups.map(g =>
    `<div class="palgroup">${g.name}</div>` +
    g.items.map(({it,i}) =>
      `<div class="palrow ${i===0?'sel':''}" data-i="${i}">
        <div class="pic">${it.icon}</div>
        <div class="ptx"><div class="pnm">${esc(it.nm)}</div><div class="psb">${esc(it.sub)}</div></div>
        <div class="pgo">↵</div></div>`
    ).join('')
  ).join('');
  $$('#searchbody .palrow').forEach(row => {
    row.onmousemove = () => setSearchSel(+row.dataset.i);
    row.onclick = () => { setSearchSel(+row.dataset.i); chooseSearch(); };
  });
}
function setSearchSel(i){
  searchState.sel = i;
  $$('#searchbody .palrow').forEach(r => r.classList.toggle('sel', +r.dataset.i===i));
}
function moveSearchSel(d){
  const n = searchState.results.length; if(!n) return;
  let i = (searchState.sel + d + n) % n;
  setSearchSel(i);
  const el = $(`#searchbody .palrow[data-i="${i}"]`);
  if(el) el.scrollIntoView({block:'nearest'});
}
function chooseSearch(){
  const it = searchState.results[searchState.sel]; if(!it) return;
  closeSearch();
  if(it.kind==='course'){ state.gradeCourse = it.course; save(); go('grades'); }
  else if(it.kind==='assign'){ state.asgTab = it.asgTab; save(); go('assign'); }
  else if(it.kind==='screen'){ go(it.screen); }
}

/* ============================================================
   KEYBOARD SHORTCUTS — g+letter, ⌘K, ?, esc
   ============================================================ */
function openShortcuts(){ closeSearch(); $('#shovl').classList.add('show'); }
function closeShortcuts(){ const o=$('#shovl'); if(o) o.classList.remove('show'); }
function shortcutsOpen(){ return $('#shovl') && $('#shovl').classList.contains('show'); }

const GKEYS = {o:'overview', g:'grades', a:'assign', c:'cal', n:'ann', m:'mat', t:'nostalgia', e:'games', s:'set'};
let gArmed = false, gTimer = 0;

// cycle "looks" — apple → halo → slate → forge → carbon → apple (forge is the "friendly" one)
const EDITION_CYCLE = ['apple','halo','slate','friendly','carbon'];
const EDITION_CYCLE_FILE = { apple:'mockup-app-apple.html', halo:'mockup-app-halo.html', slate:'mockup-app-slate.html', friendly:'mockup-app-forge.html', carbon:'mockup-app-carbon.html' };
function cycleEdition(){
  const i = EDITION_CYCLE.indexOf('friendly');
  const next = EDITION_CYCLE[(i+1) % EDITION_CYCLE.length];
  try{ localStorage.setItem('bsgy-edition', next); }catch(e){}
  const file = EDITION_CYCLE_FILE[next];
  if(file){ window.location.href = file; }
}

function isTyping(t){
  return t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable);
}
function wireGlobalKeys(){
  // chip + mac/windows label
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
  const kb = $('#searchchipkbd'); if(kb) kb.textContent = isMac ? '⌘K' : 'Ctrl K';
  const chip = $('#searchchip'); if(chip) chip.onclick = openSearch;

  // close overlays on backdrop click
  $('#searchovl').addEventListener('mousedown', e => { if(e.target.id==='searchovl') closeSearch(); });
  $('#shovl').addEventListener('mousedown', e => { if(e.target.id==='shovl') closeShortcuts(); });

  // "take the tour" from the ? help overlay
  const shtour = $('#shtour');
  if(shtour) shtour.onclick = () => { closeShortcuts(); startTour(); };

  // search input
  const inp = $('#searchinput');
  inp.addEventListener('input', () => renderSearchResults(inp.value));
  inp.addEventListener('keydown', e => {
    if(e.key==='ArrowDown'){ e.preventDefault(); moveSearchSel(1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); moveSearchSel(-1); }
    else if(e.key==='Enter'){ e.preventDefault(); chooseSearch(); }
    else if(e.key==='Escape'){ e.preventDefault(); closeSearch(); }
  });

  document.addEventListener('keydown', e => {
    // ⌘K / Ctrl+K — works even while typing
    if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){
      e.preventDefault(); searchOpen() ? closeSearch() : openSearch(); return;
    }
    if(e.key==='Escape'){
      if(tour.on){ endTour(true); return; }   // esc skips the tour
      if(searchOpen()){ closeSearch(); return; }
      if(shortcutsOpen()){ closeShortcuts(); return; }
    }
    // the rest only when not typing and no overlay
    if(isTyping(e.target) || searchOpen()) return;
    if(e.metaKey||e.ctrlKey||e.altKey) return;

    if(e.key==='?'){ e.preventDefault(); shortcutsOpen()?closeShortcuts():openShortcuts(); return; }
    if(shortcutsOpen()) return;

    if(e.key==='\\'){ e.preventDefault(); if(!tour.on) cycleEdition(); return; }

    if(gArmed){
      const target = GKEYS[e.key.toLowerCase()];
      gArmed = false; clearTimeout(gTimer);
      if(target){ e.preventDefault(); go(target); }
      return;
    }
    if(e.key==='g'||e.key==='G'){
      gArmed = true;
      gTimer = setTimeout(()=>{ gArmed=false; }, 1200);
    }
  });
}

/* ============================================================
   GUIDED TOUR — interactive coachmark walkthrough.
   launches once on first open (WELCOME_KEY), re-launchable from
   settings + the ? help overlay. each step spotlights a real UI
   element, the user can actually try the thing, esc skips.
   ============================================================ */
const WELCOME_KEY = 'bsgy-forge-welcomed';
const kbMac = () => /Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent);

// each step: target = css selector (null = centered, no spotlight),
// side = preferred placement, screen = nav to this first if set,
// react = how the user "passes" by doing the thing.
const TOUR_STEPS = [
  { id:'intro', emoji:'🙂', title:'hey, welcome in',
    body:()=>`this is a demo of better sgy. <span>the real one draws over your actual schoology — same grades and classes, just friendlier to look at. these grades are made up, so poke around freely.</span><br><br>you can swap the whole look (apple, halo, slate, friendly) over in settings.`,
    target:null, side:'center' },
  { id:'nav', emoji:'🧭', title:'getting around',
    body:()=>`everything lives here. click around, or jump with the keyboard — press <span class="ckbd"><kbd>g</kbd></span> then <span class="ckbd"><kbd>o</kbd></span>/<span class="ckbd"><kbd>g</kbd></span>/<span class="ckbd"><kbd>a</kbd></span>/<span class="ckbd"><kbd>c</kbd></span>/<span class="ckbd"><kbd>n</kbd></span>/<span class="ckbd"><kbd>m</kbd></span>/<span class="ckbd"><kbd>e</kbd></span>/<span class="ckbd"><kbd>s</kbd></span>.`,
    target:'#nav', side:'right' },
  { id:'search', emoji:'🔍', title:'search everything',
    body:()=>`press <span class="ckbd"><kbd>${kbMac()?'⌘':'ctrl'}</kbd><kbd>K</kbd></span> to search classes, assignments, posts — all of it. go ahead, try it.`,
    target:'#searchchip', side:'right',
    did:'nice. that\'s the one.', react:'search' },
  { id:'shortcuts', emoji:'⌨️', title:'the full list',
    body:()=>`press <span class="ckbd"><kbd>?</kbd></span> any time for every shortcut. here's the list now — have a look, then next.`,
    target:null, side:'center', dock:'bottom', onEnter:()=>{ openShortcuts(); $('#shovl').style.zIndex='92'; } },
  { id:'grades', emoji:'📊', title:'grades + the chart',
    body:()=>`tap a class to open its gradebook and a grade-over-time chart. <span>every class has one — handy for spotting a dip early.</span>`,
    target:'#nav button[data-screen="grades"]', side:'right' },
  { id:'games', emoji:'🎮', title:'and a little break',
    body:()=>`four small games in here when you're avoiding homework: flap, whack, bounce, and word search. scores save.`,
    target:'#nav button[data-screen="games"]', side:'right' },
  { id:'finish', emoji:'🧃', title:'that\'s the tour',
    body:()=>`you're set. quick cheat-sheet:`,
    cheat:true, target:null, side:'center' },
];

const tour = { on:false, i:0, reactedAt:-1 };

function tourEls(){
  return {
    dim:$('#tourdim'), spot:$('#tourspot'), coach:$('#coach'),
    title:$('#coachtitle'), body:$('#coachbody'), emoji:$('#coachemoji'),
    did:$('#coachdid'), arrow:$('#coacharrow'), dots:$('#coachdots'),
    back:$('#coachback'), next:$('#coachnext'), skip:$('#coachskip'),
  };
}

function startTour(){
  if(tour.on) return;
  tour.on = true; tour.i = 0; tour.reactedAt = -1;
  const e = tourEls();
  e.dim.classList.add('show');
  // wire controls once per run
  e.next.onclick = () => tourNext();
  e.back.onclick = () => tourBack();
  e.skip.onclick = () => endTour(true);
  window.addEventListener('resize', tourReposition);
  window.addEventListener('scroll', tourReposition, true);
  showTourStep(0);
}

function endTour(markDone){
  if(!tour.on) return;
  tour.on = false;
  const e = tourEls();
  e.dim.classList.remove('show');
  e.spot.classList.remove('show','pulse');
  e.coach.classList.remove('show');
  closeShortcuts(); $('#shovl').style.zIndex='';
  window.removeEventListener('resize', tourReposition);
  window.removeEventListener('scroll', tourReposition, true);
  if(markDone){ try{ localStorage.setItem(WELCOME_KEY,'1'); }catch(e){} }
}

function tourNext(){
  if(tour.i >= TOUR_STEPS.length-1){ endTour(true); return; }
  showTourStep(tour.i+1);
}
function tourBack(){ if(tour.i>0) showTourStep(tour.i-1); }

function showTourStep(i){
  tour.i = i; tour.reactedAt = -1;
  const step = TOUR_STEPS[i];
  const e = tourEls();
  // navigate to the screen this step lives on, if needed
  if(step.screen && state.screen!==step.screen) go(step.screen);
  // close any overlay from a previous step (the shortcuts step reopens its own)
  closeSearch();
  if(step.id!=='shortcuts'){ closeShortcuts(); $('#shovl').style.zIndex=''; }
  // build the coach content
  e.emoji.textContent = step.emoji;
  e.title.textContent = step.title;
  let html = step.body();
  if(step.cheat) html += tourCheatHTML();
  e.body.innerHTML = html;
  // "you did it" line
  e.did.classList.remove('show');
  if(step.did){ e.did.textContent = step.did; }
  else e.did.textContent = '';
  // dots
  e.dots.innerHTML = TOUR_STEPS.map((_,k) =>
    `<span class="cd ${k===i?'on':k<i?'done':''}"></span>`).join('');
  // buttons
  e.back.style.visibility = i===0 ? 'hidden' : 'visible';
  e.next.textContent = i===TOUR_STEPS.length-1 ? 'done 🙂' : 'next';
  e.skip.style.display = i===TOUR_STEPS.length-1 ? 'none' : 'block';
  // step-specific side effects (e.g. open the shortcuts overlay)
  if(step.onEnter) setTimeout(step.onEnter, 60);
  // show + position (wait a tick so any screen swap has laid out)
  e.coach.classList.add('show');
  requestAnimationFrame(()=>requestAnimationFrame(tourReposition));
}

function tourCheatHTML(){
  const k = kbMac()?'⌘':'ctrl';
  const rows = [
    [[k,'K'],'search everything'],
    [['g','o'],'overview'],
    [['g','g'],'grades'],
    [['g','e'],'games'],
    [['?'],'all shortcuts'],
    [['esc'],'close anything'],
  ];
  return `<div class="tourcheat">${rows.map(([keys,label]) =>
    `<div class="tcr"><span class="tck">${keys.map(x=>`<kbd>${x}</kbd>`).join('')}</span><span>${label}</span></div>`
  ).join('')}<div class="tcr" style="color:var(--ink-2);font-weight:600;padding-top:7px">replay this any time from settings → take the tour.</div></div>`;
}

// place the spotlight over the target + the coach beside it, no overflow
function tourReposition(){
  if(!tour.on) return;
  const step = TOUR_STEPS[tour.i];
  const e = tourEls();
  const vw = window.innerWidth, vh = window.innerHeight, pad = 12, gap = 14;
  const tgt = step.target ? document.querySelector(step.target) : null;

  if(!tgt){
    // centered, no spotlight
    e.spot.classList.remove('show','pulse');
    e.coach.className = 'coach show anone';
    const cw = e.coach.offsetWidth, ch = e.coach.offsetHeight;
    e.coach.style.left = Math.round((vw-cw)/2)+'px';
    const top = step.dock==='bottom' ? (vh-ch-24) : Math.max(pad,(vh-ch)/2);
    e.coach.style.top  = Math.round(Math.max(pad,top))+'px';
    return;
  }

  const r = tgt.getBoundingClientRect();
  const sp = 8; // spotlight padding around target
  e.spot.classList.add('show','pulse');
  e.spot.style.left = Math.max(2,r.left-sp)+'px';
  e.spot.style.top = Math.max(2,r.top-sp)+'px';
  e.spot.style.width = Math.min(vw-4,r.width+sp*2)+'px';
  e.spot.style.height = Math.min(vh-4,r.height+sp*2)+'px';

  // choose a side that fits
  const cw = 300, ch = e.coach.offsetHeight || 180;
  let side = step.side || 'right';
  const fits = {
    right: r.right+gap+cw <= vw-pad,
    left:  r.left-gap-cw >= pad,
    bottom:r.bottom+gap+ch <= vh-pad,
    top:   r.top-gap-ch >= pad,
  };
  if(!fits[side]){
    side = ['bottom','top','right','left'].find(s=>fits[s]) || 'bottom';
  }

  let left, top, cls='coach show';
  if(side==='right'){ left=r.right+gap; top=r.top; cls+=' aleft'; }
  else if(side==='left'){ left=r.left-gap-cw; top=r.top; cls+=' aright'; }
  else if(side==='bottom'){ left=r.left; top=r.bottom+gap; cls+=' abot'; }
  else { left=r.left; top=r.top-gap-ch; cls+=' atop'; }

  // clamp inside viewport
  left = Math.max(pad, Math.min(left, vw-cw-pad));
  top  = Math.max(pad, Math.min(top,  vh-ch-pad));
  e.coach.className = cls;
  e.coach.style.left = Math.round(left)+'px';
  e.coach.style.top  = Math.round(top)+'px';

  // position the little arrow toward the target center
  const arrow = e.arrow;
  if(side==='left'||side==='right'){
    let ay = (r.top+r.height/2) - top;
    ay = Math.max(14, Math.min(ay, ch-14));
    arrow.style.top = ay+'px'; arrow.style.left='';
  } else {
    let ax = (r.left+r.width/2) - left;
    ax = Math.max(16, Math.min(ax, cw-16));
    arrow.style.left = ax+'px'; arrow.style.top='';
  }
}

// react when the user actually does the thing a step asks for
function tourReact(kind){
  if(!tour.on) return;
  const step = TOUR_STEPS[tour.i];
  if(step.react!==kind || tour.reactedAt===tour.i) return;
  tour.reactedAt = tour.i;
  const e = tourEls();
  if(step.did){ e.did.classList.add('show'); }
  // give them a beat to see it worked, then advance
  setTimeout(()=>{ if(tour.on && tour.i===tour.reactedAt) tourNext(); }, 900);
}

/* ============================================================
   EXPORT DASHBOARD IMAGE
   approach: clone the overview screen into an SVG <foreignObject>,
   inline computed colors, rasterize via Image -> canvas -> toDataURL,
   download as PNG. all content is inline (no external refs) so the
   canvas never taints. if the SVG image fails to load (some file://
   engines block foreignObject), fall back to print ("save as PDF").
   ============================================================ */
function exportOverview(){
  const screen = $('#main .screen');
  if(!screen){ window.print(); return; }
  const rect = screen.getBoundingClientRect();
  const w = Math.ceil(rect.width), h = Math.ceil(screen.scrollHeight);
  // clone + inline the key colors so the foreignObject renders standalone
  const clone = screen.cloneNode(true);
  const cs = getComputedStyle(document.body);
  const paper = cssVar('--paper','#fdf4e6'), ink = cssVar('--ink','#3a2f25');
  const fontFamily = cs.fontFamily;
  clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  clone.style.width = w+'px';
  clone.style.background = paper;
  clone.style.color = ink;
  clone.style.padding = '24px';
  clone.style.fontFamily = fontFamily;
  // inline every element's computed color/background/border so nothing relies on the stylesheet
  const srcEls = screen.querySelectorAll('*');
  const dstEls = clone.querySelectorAll('*');
  for(let i=0;i<srcEls.length;i++){
    const s = getComputedStyle(srcEls[i]); const d = dstEls[i];
    d.style.color = s.color;
    if(s.backgroundColor && s.backgroundColor!=='rgba(0, 0, 0, 0)') d.style.backgroundColor = s.backgroundColor;
    if(s.backgroundImage && s.backgroundImage!=='none') d.style.backgroundImage = s.backgroundImage;
    d.style.borderColor = s.borderColor;
    d.style.borderRadius = s.borderRadius;
    d.style.fontWeight = s.fontWeight;
    d.style.fontSize = s.fontSize;
    d.style.boxShadow = 'none';
    d.style.animation = 'none';
  }
  const totalH = h + 48;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}">`+
    `<rect width="100%" height="100%" fill="${paper}"/>`+
    `<foreignObject x="0" y="0" width="${w}" height="${totalH}">`+
    new XMLSerializer().serializeToString(clone)+
    `</foreignObject></svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  const img = new Image();
  img.onload = () => {
    try{
      const scale = 2;
      const cv = document.createElement('canvas');
      cv.width = w*scale; cv.height = totalH*scale;
      const ctx = cv.getContext('2d');
      ctx.scale(scale,scale);
      ctx.fillStyle = paper; ctx.fillRect(0,0,w,totalH);
      ctx.drawImage(img,0,0);
      const png = cv.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = png; a.download = 'better-sgy-overview.png';
      document.body.appendChild(a); a.click(); a.remove();
      toast({ic:'🖼️', tt:'saved your overview', ts:'better-sgy-overview.png'});
    }catch(err){
      toast({ic:'🖨️', tt:'image export not available here', ts:'opening print → save as PDF instead'});
      setTimeout(()=>window.print(), 400);
    }
  };
  img.onerror = () => {
    toast({ic:'🖨️', tt:"can't make a PNG on file://", ts:'opening print → save as PDF instead'});
    setTimeout(()=>window.print(), 400);
  };
  img.src = url;
}

/* ============================================================
   BOOT
   ============================================================ */
// honor MOCKUP_CONVENTIONS: mark this as the active edition
try{ localStorage.setItem('bsgy-edition','forge'); }catch(e){}
// deep links: ?screen=<id> and ?game=<id>
(function applyDeepLink(){
  try{
    const p = new URLSearchParams(location.search);
    const s = p.get('screen');
    if(s){ const r = resolveScreen(s); if(r) state.screen = r; }
    const g = p.get('game');
    if(g && ['flap','whack','bounce','words'].includes(g)){ state.screen='games'; arcade.active=g; }
  }catch(e){}
})();

applyTheme();
renderNav();
renderScreen();
wireGlobalKeys();

/* ============================================================
   LIVE DATA INJECTION (real grades from chrome.storage.local)
   The extension writes key "bsgy_live":
     { overall:number, term:string, courses:[{name,teacher,pct,letter,trend,missing}] }
   Everything is wrapped in try/catch so a failure NEVER blanks the
   page — we simply keep the sample data already rendered above.
   ============================================================ */
function bsgyValidLive(d){
  return d && typeof d==="object" && typeof d.overall==="number"
      && Array.isArray(d.courses) && d.courses.length>0;
}
function bsgyFmt(n){
  if(typeof n!=="number" || !isFinite(n)) return "0";
  return (Math.round(n*10)/10).toString();
}
// synthesize an 8-point rising/falling spark ending exactly at pct, leaning by trend
function bsgySpark(pct,trend){
  const end=(typeof pct==="number" && isFinite(pct))?pct:95;
  const d=trend==="up"?2:trend==="down"?-2:0;
  return [end-d,end-d*0.7,end-d*0.45,end-d*0.25,end-d*0.12,end-d*0.04,end-d*0.01,end];
}
// build a friendly note for a live course (replaces the hardcoded OV_SAY entries)
function bsgyCardSay(c){
  const miss=(typeof c.missing==="number")?c.missing:0;
  if(c.trend==="up"){
    return {q:'💬', html:'<span class="up">trending up</span> 📈'+(miss>0
      ?(' but there '+(miss===1?'is ':'are ')+'<span class="miss">'+miss+' missing assignment'+(miss===1?'':'s')+'</span> to clear.')
      :'<span class="add">nothing missing here — keep it going.</span>')};
  }
  if(c.trend==="down"){
    return {q:'💬', html:'this one has <span class="wave">slipped a little</span> lately'+(miss>0
      ?(' and there '+(miss===1?'is ':'are ')+'<span class="miss">'+miss+' missing assignment'+(miss===1?'':'s')+'</span>.')
      :'.<span class="add">nothing missing though, so a good week brings it back.</span>')};
  }
  return {q:'💬', html:'holding <span class="hl">steady</span>'+(miss>0
    ?(' — '+'<span class="miss">'+miss+' missing assignment'+(miss===1?'':'s')+'</span> worth a look.')
    :'.<span class="add">all caught up, nothing missing.</span>')};
}
function bsgyApplyLive(){
  try{
    if(!(window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get)) return;
    chrome.storage.local.get("bsgy_live", function(res){
      try{
        const live = res && res.bsgy_live;
        if(!bsgyValidLive(live)) return;  // invalid → keep sample data
        const PALETTE  = ["#5aa9e6","#4fb286","#ffb454","#9b87f2","#ef6a9b","#5b6cff","#ff375f","#64d2ff"];
        const SOFT     = ["#e3f0fb","#e6f7ef","#fff1d6","#ece7ff","#ffe4ef","#eef0ff","#ffe1e9","#e2f6ff"];
        const EMOJI    = ["📘","🧪","🌍","🎭","📚","📐","🎨","🎵"];
        const built = live.courses.map(function(c,i){
          const id="lc"+i;
          const nm=String(c.name==null?("Course "+(i+1)):c.name);
          const pct=(typeof c.pct==="number" && isFinite(c.pct))?c.pct:0;
          const trend=(c.trend==="up"||c.trend==="down"||c.trend==="flat")?c.trend:"flat";
          const miss=(typeof c.missing==="number" && isFinite(c.missing))?Math.max(0,Math.round(c.missing)):0;
          HISTORY[id]=bsgySpark(pct,trend);
          return {
            id:id, name:nm, short:nm,
            teacher:String(c.teacher==null?"":c.teacher), per:"", subject:"",
            emoji:EMOJI[i%EMOJI.length], accent:PALETTE[i%PALETTE.length], soft:SOFT[i%SOFT.length],
            grade:Math.round(pct*10)/10, ltr:String(c.letter==null?"":c.letter), trend:trend, missing:miss
          };
        });
        // swap in the live courses (mutate the const array in place)
        COURSES.length=0; built.forEach(function(c){ COURSES.push(c); });
        // synthesized rising overall series ending at the real overall %
        HISTORY.overall=bsgySpark(typeof live.overall==="number"?live.overall:0,"up");
        LIVE_OVERALL=live.overall;
        LIVE_TERM=(typeof live.term==="string" && live.term.trim())?live.term.trim():null;
        LIVE_ON=true;
        // repaint ONLY if the overview is the current screen; otherwise it
        // will reflect live data the next time it is rendered.
        if(state.screen==='overview'){ renderScreen(); }
      }catch(e){ /* swallow → keep sample data */ }
    });
  }catch(e){ /* swallow → keep sample data */ }
}
// async: runs AFTER the synchronous initial render above, so the page is
// never blank even if chrome.storage is slow / undefined.
bsgyApplyLive();
// no auto-launch — the guided tour only auto-runs in the apple edition.
// it stays available here via settings → "take the tour".
