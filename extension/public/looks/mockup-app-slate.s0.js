
/* ============================================================
   SLATE — interactive engine. Vanilla JS, no dependencies.
   Single source of truth = MOCKUP_DATA. Today = Mon Jun 22, 2026.
   ============================================================ */
(function(){
  "use strict";
  var $  = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var el = function(tag, cls, html){ var n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; };
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---------- DATA MODEL (from MOCKUP_DATA.md) ---------- */
  var COURSES = [
    { id:'alg', name:'Algebra 2 / Trig', teacher:'Mr. Stubbs', per:'P1', subject:'Math', grade:97.4, ltr:'A', trend:'up', missing:0 },
    { id:'bio', name:'Biology', teacher:'Ms. Carrington', per:'P2', subject:'Science', grade:96.7, ltr:'A', trend:'flat', missing:1 },
    { id:'fre', name:'French 1', teacher:'Mme. Laurent', per:'P4', subject:'World Language', grade:96.5, ltr:'A', trend:'up', missing:0 },
    { id:'dra', name:'Drama', teacher:'Mr. Ellison', per:'P5', subject:'Performing Arts', grade:90.3, ltr:'A−', trend:'down', missing:1 },
    { id:'lit', name:'Literature', teacher:'Ms. Howe', per:'P6', subject:'English', grade:94.1, ltr:'A', trend:'up', missing:0 },
    { id:'pe',  name:'PE 9', teacher:'Coach Bryant', per:'P7', subject:'Phys Ed', grade:99.1, ltr:'A', trend:'flat', missing:0 }
  ];
  var courseById = {}; COURSES.forEach(function(c){ courseById[c.id]=c; });

  var WEEK_LABELS = ['Feb 10','Mar 2','Mar 23','Apr 13','May 4','May 25','Jun 8','Jun 22'];
  var HISTORY = {
    overall:[94.2,94.6,94.9,95.3,95.6,95.9,96.0,96.2],
    alg:[92.0,93.0,94.0,95.0,95.5,96.3,97.0,97.4],
    bio:[96.0,96.4,96.2,96.8,96.5,96.9,96.6,96.7],
    fre:[91.0,92.5,93.0,94.0,94.8,95.5,96.1,96.5],
    dra:[95.0,94.5,94.0,93.2,92.5,91.6,91.0,90.3],
    lit:[90.0,90.8,91.5,92.0,92.6,93.2,93.7,94.1],
    pe :[98.5,98.7,98.6,99.0,98.9,99.1,99.0,99.1]
  };
  var TREND_WORD = { up:'Rising ↗', flat:'Steady →', down:'Easing ↘' };

  /* per-course gradebooks: categories + assignments */
  var GRADEBOOK = {
    alg:{ snap:'Climbing all term', cats:[
        ['Tests',40,96.8],['Quizzes',25,97.5],['Homework',20,98.9],['Participation',15,100]],
      rows:[
        ['Unit 6 Test','Tests','Jun 12','96 / 100',96,false],
        ['Trig Identities Quiz','Quizzes','Jun 9','19 / 20',95,false],
        ['HW 7.1–7.2','Homework','Jun 17','10 / 10',100,false],
        ['HW 7.3 problems','Homework','Jun 22','— / 10',null,'due'],
        ['Participation Wk 14','Participation','Jun 13','15 / 15',100,false]],
      closeLine:'A clean ledger, climbing toward the unit 7 test. Nothing outstanding but today’s homework.',
      closeBy:'Algebra 2 / Trig · P1 · Mr. Stubbs' },
    bio:{ snap:'Steady through the term', cats:[
        ['Tests',40,95.0],['Labs',25,97.2],['Homework',20,98.5],['Participation',15,100]],
      rows:[
        ['Cell Energetics Lab','Labs','Jun 19','— / 25',null,'missing'],
        ['Enzymes Problem Set','Homework','Jun 16','18 / 20',90,false],
        ['Photosynthesis Test','Tests','Jun 11','95 / 100',95,false],
        ['Mitosis Quiz','Labs','Jun 5','24 / 25',96,false],
        ['Participation Wk 14','Participation','Jun 13','15 / 15',100,false]],
      closeLine:'The figure holds at an A. One lab, unsubmitted, is all that stands between steady and spotless.',
      closeBy:'Biology · P2 · Ms. Carrington' },
    fre:{ snap:'Closing from below', cats:[
        ['Tests',40,95.5],['Speaking',25,97.0],['Homework',20,98.0],['Participation',15,100]],
      rows:[
        ['Unité 5 Exam','Tests','Jun 12','95 / 100',95,false],
        ['Dialogue oral','Speaking','Jun 10','29 / 30',97,false],
        ['Devoirs 5.3','Homework','Jun 16','10 / 10',100,false],
        ['Vocab Quiz','Tests','Jun 6','48 / 50',96,false],
        ['Participation Wk 14','Participation','Jun 13','15 / 15',100,false]],
      closeLine:'A steady rise from the winter, now an honest A. The oral grade carries it.',
      closeBy:'French 1 · P4 · Mme. Laurent' },
    dra:{ snap:'Easing through the term', cats:[
        ['Performance',40,91.0],['Reflections',25,85.0],['Participation',20,95.0],['Projects',15,90.0]],
      rows:[
        ['Monologue Reflection','Reflections','Jun 18','— / 20',null,'missing'],
        ['Scene Performance','Performance','Jun 15','88 / 100',88,false],
        ['Character Study','Projects','Jun 9','27 / 30',90,false],
        ['Theater Journal','Reflections','Jun 4','17 / 20',85,false],
        ['Participation Wk 14','Participation','Jun 13','19 / 20',95,false]],
      closeLine:'The term’s one soft spot. A missing reflection and a slipping line; the showcase can still mend it.',
      closeBy:'Drama · P5 · Mr. Ellison' },
    lit:{ snap:'Rising steadily', cats:[
        ['Essays',40,93.0],['Reading Quizzes',25,94.5],['Homework',20,95.0],['Participation',15,98.0]],
      rows:[
        ['Chapter 4 Response','Homework','Jun 22','— / 10',null,'due'],
        ['Theme Essay','Essays','Jun 13','92 / 100',92,false],
        ['Reading Quiz 8','Reading Quizzes','Jun 10','19 / 20',95,false],
        ['Annotation HW','Homework','Jun 16','10 / 10',100,false],
        ['Participation Wk 14','Participation','Jun 13','14 / 15',93,false]],
      closeLine:'A quiet climb from a slow start. The essays set the ceiling; today’s response keeps it moving.',
      closeBy:'Literature · P6 · Ms. Howe' },
    pe:{ snap:'High and level', cats:[
        ['Fitness',40,99.0],['Skills',25,99.5],['Participation',35,99.0]],
      rows:[
        ['Fitness Log Wk 14','Fitness','Jun 13','20 / 20',100,false],
        ['Mile Run','Fitness','Jun 9','49 / 50',98,false],
        ['Volleyball Skills','Skills','Jun 6','25 / 25',100,false],
        ['Participation Wk 14','Participation','Jun 13','99 / 100',99,false]],
      closeLine:'The best class of the term, and the steadiest. Nothing owed, nothing slipping.',
      closeBy:'PE 9 · P7 · Coach Bryant' }
  };

  /* ---------- LIVE "TODAY" — everything derives from the real date ---------- */
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var NOW = new Date();
  var TODAY = { y:NOW.getFullYear(), m:NOW.getMonth(), d:NOW.getDate() };
  /* a Date for today at midnight, and an offset helper that returns {y,m,d,date,weekday,label} */
  function dayAt(offset){
    var dt = new Date(TODAY.y, TODAY.m, TODAY.d + offset);
    return { date:dt, y:dt.getFullYear(), m:dt.getMonth(), d:dt.getDate(),
             wd:dt.getDay(), mon:MONTH_NAMES[dt.getMonth()].slice(0,3) };
  }
  function shortDate(o){ return o.mon+' '+o.d; }      /* "Jun 23" */
  function longDate(o){ return MONTH_NAMES[o.m]+' '+o.d+', '+o.y; }
  function dowName(o){ return DOW_FULL[o.wd]; }

  /* schedule, expressed as offsets from today (negative = past). Two due today,
     two recently overdue, a clutch upcoming, and a few already filed. */
  var SCHED = {
    dueA:        dayAt(0),    /* HW 7.3 — due today */
    dueB:        dayAt(0),    /* Chapter 4 Response — due today */
    overdueLab:  dayAt(-3),   /* Cell Energetics Lab — recently overdue */
    overdueRef:  dayAt(-4),   /* Monologue Reflection — recently overdue */
    upBook:      dayAt(2),
    upEco:       dayAt(3),
    upVocab:     dayAt(4),
    upFit:       dayAt(4),
    upTest:      dayAt(7),
    filedUnit6:  dayAt(-10),
    filedOral:   dayAt(-12),
    filedEnz:    dayAt(-6),
    /* extra past calendar texture */
    pastQuiz:    dayAt(-13),
    pastMile:    dayAt(-13),
    pastPhoto:   dayAt(-11),
    pastScene:   dayAt(-7)
  };

  /* cross-course docket — due text is built live from SCHED */
  function dueToday(o, by){ return 'Due today · '+by; }
  function dueOn(o){ return 'Due '+dowName(o)+' · '+shortDate(o); }
  function wasDue(o){ return 'Was due '+shortDate(o)+' · not submitted'; }
  function filedOn(o, score){ return 'Filed '+shortDate(o)+' · '+score; }
  var DOCKET = [
    { title:'HW 7.3 problems', course:'alg', due:dueToday(SCHED.dueA,'before P1'), status:'due', sort:0 },
    { title:'Chapter 4 Response', course:'lit', due:dueToday(SCHED.dueB,'by P6'), status:'due', sort:0 },
    { title:'Cell Energetics Lab', course:'bio', due:wasDue(SCHED.overdueLab), status:'missing', sort:1 },
    { title:'Monologue Reflection', course:'dra', due:wasDue(SCHED.overdueRef), status:'missing', sort:1 },
    { title:'Book club notes', course:'lit', due:dueOn(SCHED.upBook), status:'upcoming', sort:2 },
    { title:'Ecology reading', course:'bio', due:dueOn(SCHED.upEco), status:'upcoming', sort:2 },
    { title:'Unité 6 vocab', course:'fre', due:dueOn(SCHED.upVocab), status:'upcoming', sort:2 },
    { title:'Fitness Log Wk 15', course:'pe', due:dueOn(SCHED.upFit), status:'upcoming', sort:2 },
    { title:'Unit 7 Test', course:'alg', due:dueOn(SCHED.upTest), status:'upcoming', sort:2 },
    { title:'Unit 6 Test', course:'alg', due:filedOn(SCHED.filedUnit6,'96/100'), status:'done', sort:3 },
    { title:'Dialogue oral', course:'fre', due:filedOn(SCHED.filedOral,'29/30'), status:'done', sort:3 },
    { title:'Enzymes Problem Set', course:'bio', due:filedOn(SCHED.filedEnz,'18/20'), status:'done', sort:3 }
  ];
  var STATUS_TAG = { due:'Due Today', missing:'Missing', upcoming:'Upcoming', done:'Filed' };

  /* calendar events by month/day, built live from SCHED.
     key 'YYYY-M' (M 0-based) -> {day:[{c:course,t:title}]} */
  var CAL_EVENTS = (function(){
    var map={};
    function add(o, c, t){
      var key=o.y+'-'+o.m;
      (map[key]=map[key]||{});
      (map[key][o.d]=map[key][o.d]||[]).push({c:c,t:t});
    }
    add(SCHED.pastQuiz,'alg','Trig Identities Quiz');
    add(SCHED.pastMile,'pe','Mile Run');
    add(SCHED.pastPhoto,'bio','Photosynthesis Test');
    add(SCHED.filedUnit6,'alg','Unit 6 Test');
    add(SCHED.filedOral,'fre','Unité 5 Exam');
    add(SCHED.pastScene,'dra','Scene Performance');
    add(SCHED.overdueRef,'dra','Monologue Reflection due');
    add(SCHED.overdueLab,'bio','Cell Energetics Lab due');
    add(SCHED.dueA,'alg','HW 7.3 problems');
    add(SCHED.dueB,'lit','Chapter 4 Response');
    add(SCHED.upBook,'lit','Book club notes');
    add(SCHED.upEco,'bio','Ecology reading');
    add(SCHED.upVocab,'fre','Unité 6 vocab');
    add(SCHED.upFit,'pe','Fitness Log Wk 15');
    add(SCHED.upTest,'alg','Unit 7 Test');
    return map;
  })();

  /* bulletins — datelines derive from today; bodies reference live weekdays */
  var BULLETINS = [
    { id:'b1', course:'bio', teacher:'Ms. Carrington', date:shortDate(SCHED.upBook), time:'2 hours ago',
      head:'Lab safety quiz '+dowName(SCHED.upBook), body:'A quick 10-question quiz on lab safety opens class '+dowName(SCHED.upBook)+'. Review the handout filed under Materials; the questions follow it closely.' },
    { id:'b2', course:'pe', teacher:'Coach Bryant', date:shortDate(dayAt(0)), time:'5 hours ago',
      head:'Bring sneakers '+dowName(SCHED.upEco), body:'The outdoor unit begins '+dowName(SCHED.upEco)+', weather permitting. Closed-toe shoes are required; sandals will sit the period out.' },
    { id:'b3', course:'dra', teacher:'Mr. Ellison', date:shortDate(dayAt(-1)), time:'Yesterday',
      head:'Monologue sign-ups open', body:'Pick a performance slot for next week. The sign-up sheet is on the board and posted in Materials; first come, first served.' },
    { id:'b4', course:'lit', teacher:'Ms. Howe', date:shortDate(dayAt(-1)), time:'Yesterday',
      head:'Chapter 4 response due today', body:'Two paragraphs, focused on the narrator’s voice. Submit through Schoology before the period; late work loses a letter.' },
    { id:'b5', course:'alg', teacher:'Mr. Stubbs', date:shortDate(dayAt(-2)), time:'2 days ago',
      head:'Unit 7 starts', body:'We begin Unit 7 this week. HW 7.3 is due today and the Unit 7 test falls on '+shortDate(SCHED.upTest)+'. No new homework over the weekend.' },
    { id:'b6', course:'fre', teacher:'Mme. Laurent', date:shortDate(dayAt(-3)), time:'3 days ago',
      head:'Vocab list for Unité 6', body:'The new list is posted with audio under Materials. The quiz is '+dowName(SCHED.upVocab)+' the '+SCHED.upVocab.d+'th; practice the passé composé forms in particular.' }
  ];

  /* materials — Biology shelf, default open = Cell Energetics Lab */
  var MATERIALS = {
    groups:[
      { title:'Folder · Unit 5 · Cell Energetics', rows:[
        { id:'m-lab', kind:'Lab', name:'Cell Energetics Lab', isTarget:true },
        { id:'m-handout', kind:'PDF', name:'Cell Energetics Lab handout.pdf' },
        { id:'m-enz', kind:'PDF', name:'Enzymes notes.pdf' }
      ]},
      { title:'Folder · Resources', rows:[
        { id:'m-tpl', kind:'Doc', name:'Lab report template.docx' },
        { id:'m-photo', kind:'PDF', name:'Photosynthesis study guide.pdf' }
      ]},
      { title:'Links', rows:[
        { id:'m-khan', kind:'Link', name:'Khan Academy: Cellular respiration' }
      ]}
    ]
  };
  var MAT_DETAIL = {
    'm-lab':{ kicker:'Biology · Unit 5 · Lab', title:'Cell Energetics Lab',
      meta:'Assigned Jun 12 · Due Jun 19 · 25 points · Category: Labs', tag:'Not submitted',
      attach:[['Cell Energetics Lab handout.pdf','PDF · 480 KB'],['Lab report template.docx','Doc · 22 KB']],
      submit:true },
    'm-handout':{ kicker:'Biology · Unit 5 · Reading', title:'Cell Energetics Lab handout.pdf',
      meta:'Posted Jun 12 · 480 KB · Reference', attach:[['Cell Energetics Lab handout.pdf','PDF · 480 KB']], submit:false,
      note:'Reference reading. The lab write-up is filed against the Cell Energetics Lab.' },
    'm-enz':{ kicker:'Biology · Unit 5 · Notes', title:'Enzymes notes.pdf',
      meta:'Posted Jun 8 · 310 KB · Reference', attach:[['Enzymes notes.pdf','PDF · 310 KB']], submit:false,
      note:'Class notes on enzyme kinetics, no submission required.' },
    'm-tpl':{ kicker:'Biology · Resources', title:'Lab report template.docx',
      meta:'Posted Feb 3 · 22 KB · Template', attach:[['Lab report template.docx','Doc · 22 KB']], submit:false,
      note:'The standard report shell. Copy it before writing the Cell Energetics lab.' },
    'm-photo':{ kicker:'Biology · Resources', title:'Photosynthesis study guide.pdf',
      meta:'Posted May 28 · 540 KB · Reference', attach:[['Photosynthesis study guide.pdf','PDF · 540 KB']], submit:false,
      note:'Study guide for the photosynthesis unit; useful for the Friday safety quiz review.' },
    'm-khan':{ kicker:'Biology · Link', title:'Khan Academy: Cellular respiration',
      meta:'External link · khanacademy.org · Reference', attach:[['Open in browser','Link']], submit:false,
      note:'A short video series on cellular respiration. Opens outside Schoology.' }
  };

  /* demo notification text (MOCKUP_DATA) */
  var PINGS = [
    { glyph:'▲', lead:'Biology rose 1.2%', sub:'95.5% → 96.7%' },
    { glyph:'✓', lead:'Graded · Cell Energetics Lab', sub:'90% · Biology' },
    { glyph:'＋', lead:'New assignment · Monologue reflection', sub:'Drama · Mr. Ellison' }
  ];

  /* ---------- PERSISTENCE ---------- */
  var LS_KEY = 'sgy-slate-v1';
  var defaults = {
    screen:'overview',
    gradeCourse:'bio',
    docketFilter:'upcoming',
    matSel:'m-lab',
    important:{ b5:true },           /* b5 = "Unit 7 starts" starred by default */
    filed:{},                        /* docket titles moved to Done */
    revisions:{},                    /* material id -> revision count */
    comments:{},                     /* material id -> [comments] */
    arcadeBest:{ typing:0, anagram:0, ttt:'', search:0 }, /* typing=WPM, anagram=streak, ttt=W-D-L, search=fastest sec */
    settings:{ compact:false, notify:true, themeWob:false, contrast:false, appearance:'light', sfx:false,
               nav:{ overview:true, grades:true, assignments:true, calendar:true, announcements:true, materials:true, arcade:true, nostalgia:true } }
  };
  var state;
  try { state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(LS_KEY)||'{}')); }
  catch(e){ state = JSON.parse(JSON.stringify(defaults)); }
  state.important = Object.assign({}, defaults.important, state.important||{});
  state.filed = state.filed||{};
  state.revisions = state.revisions||{};
  state.comments = state.comments||{};
  state.settings = Object.assign({}, defaults.settings, state.settings||{});
  state.settings.nav = Object.assign({}, defaults.settings.nav, (state.settings||{}).nav||{});
  state.arcadeBest = Object.assign({}, defaults.arcadeBest, state.arcadeBest||{});
  /* migrate legacy boolean theme into the appearance setting */
  if(['light','dark','auto'].indexOf(state.settings.appearance)<0){
    state.settings.appearance = state.settings.themeWob ? 'dark' : 'light';
  }
  function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }

  /* ---------- FIGURE GEOMETRY (matches the static SVG plates) ---------- */
  /* Y maps 88..100 to pixel band; X maps 8 weekly points across plot width. */
  function makeScale(x0,x1,yTop,yBot){
    var n=8;
    return {
      x:function(i){ return x0 + (x1-x0)*(i/(n-1)); },
      y:function(v){ /* 88 -> yBot, 100 -> yTop */ var t=(v-88)/(100-88); return yBot - t*(yBot-yTop); }
    };
  }
  function poly(scale, arr){ return arr.map(function(v,i){ return scale.x(i).toFixed(1)+','+scale.y(v).toFixed(1); }).join(' '); }

  /* ============================================================
     NAV / SCREENS
     ============================================================ */
  var SCREENS = ['overview','grades','assignments','calendar','announcements','materials','arcade','nostalgia','settings'];
  function showScreen(name){
    if(SCREENS.indexOf(name)<0) name='overview';
    if(name!=='settings' && !state.settings.nav[name]) { name = SCREENS.filter(function(s){return s==='settings'||state.settings.nav[s];})[0] || 'overview'; }
    if(name!=='arcade' && state.screen==='arcade' && typeof ARCADE!=='undefined') ARCADE.onLeave();
    state.screen = name; save();
    SCREENS.forEach(function(s){
      var sec=$('#s-'+s); if(sec) sec.classList.toggle('screen--on', s===name);
      var nv=$('[data-nav="'+s+'"]'); if(nv) nv.classList.toggle('nav__item--on', s===name);
    });
    window.scrollTo(0,0);
  }
  $('#nav').addEventListener('click', function(e){
    var a=e.target.closest('[data-nav]'); if(!a) return; e.preventDefault();
    showScreen(a.getAttribute('data-nav'));
  });

  /* ============================================================
     OVERVIEW — course rows open Grades
     ============================================================ */
  function bindOverview(){
    $$('#s-overview .course').forEach(function(c){
      function go(){ var id=c.getAttribute('data-course'); state.gradeCourse=id; renderGrades(); showScreen('grades'); }
      c.addEventListener('click', go);
      c.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
    });
  }

  /* ============================================================
     GRADES — ledger, driven by state.gradeCourse
     ============================================================ */
  function renderRail(){
    var rail=$('#grade-rail'); rail.innerHTML='';
    COURSES.forEach(function(c){
      var it=el('div','railitem'+(c.id===state.gradeCourse?' railitem--active':''));
      it.innerHTML = '<span class="rname">'+esc(c.name)+'</span><span class="rmeta">'+esc(c.teacher)+' · '+c.grade.toFixed(1)+'% '+esc(c.ltr)+'</span>';
      it.setAttribute('role','button'); it.setAttribute('tabindex','0');
      it.addEventListener('click', function(){ state.gradeCourse=c.id; renderGrades(); });
      it.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); state.gradeCourse=c.id; renderGrades(); } });
      rail.appendChild(it);
    });
  }

  /* legend hidden-series tracking, per course render */
  var hiddenSeries = {};

  function renderGrades(){
    save();
    renderRail();
    var c = courseById[state.gradeCourse];
    var gb = GRADEBOOK[c.id];
    var body=$('#grade-body'); body.innerHTML='';

    /* snapshot */
    var snap=el('div','snapshot');
    var missTag = c.missing>0 ? ' · <span class="tag" style="vertical-align:1px">'+c.missing+' Missing</span>' : '';
    snap.innerHTML =
      '<div><span class="label">'+esc(c.name)+' · '+esc(c.teacher)+' · '+esc(c.per)+'</span>'+
        '<div class="snapshot__num">'+c.grade.toFixed(1)+'<span class="pct">%</span></div></div>'+
      '<div class="snapshot__side"><div class="snapshot__letter">'+esc(c.ltr)+'</div>'+
        '<div class="snapshot__caption">'+esc(gb.snap)+missTag+'</div></div>';
    body.appendChild(snap);

    /* figure */
    body.appendChild(buildFigure(c));

    /* categories */
    var ch1=el('div','sechead','<h3>Categories &amp; Weights</h3><span class="label count">'+gb.cats.length+' bands</span>');
    body.appendChild(ch1);
    var cats=el('div','cats');
    gb.cats.forEach(function(row){
      var avg = (row[2]===100) ? '100' : row[2].toFixed(1);
      cats.appendChild(el('div','cat',
        '<div class="cat__name">'+esc(row[0])+'</div>'+
        '<div class="cat__weight">'+row[1]+'%</div>'+
        '<div class="cat__avg">'+avg+'<span class="pp">%</span></div>'));
    });
    body.appendChild(cats);

    /* assignment rows */
    var ch2=el('div','sechead','<h3>Assignments</h3><span class="label count">Recent first</span>');
    body.appendChild(ch2);
    var rows=el('div','rows');
    gb.rows.forEach(function(r){
      var name=r[0], cat=r[1], date=r[2], score=r[3], pct=r[4], status=r[5];
      var isMiss = status==='missing', isDue = status==='due';
      var mark = esc(cat);
      if(isMiss) mark += ' · <span class="tag tag--ghost" style="font-size:8px">Not submitted</span>';
      else if(isDue) mark += ' · <span class="tag" style="font-size:8px">Due today</span>';
      var pctHtml = (pct==null) ? '—'
        : pct+'<span class="pp" style="font-size:11px;color:var(--ink-45)">%</span>';
      var ar=el('div','arow'+(isMiss?' arow--missing':''));
      ar.innerHTML =
        '<div class="arow__name">'+esc(name)+'<span class="cat-mark">'+mark+'</span></div>'+
        '<div class="arow__date">'+esc(date)+'</div>'+
        '<div class="arow__score">'+esc(score)+'</div>'+
        '<div class="arow__pct">'+pctHtml+'</div>';
      rows.appendChild(ar);
    });
    body.appendChild(rows);

    /* closing */
    var close=el('section','closing');
    close.setAttribute('aria-label','In closing');
    close.innerHTML='<p class="closing__line">'+esc(gb.closeLine)+'</p>'+
      '<p class="closing__byline">'+esc(gb.closeBy)+'</p>';
    body.appendChild(close);
  }

  /* build the statistical plate for a course, with faint refs + hover tips + legend */
  function buildFigure(c){
    var fig=el('figure','figure'); fig.setAttribute('aria-label','Figure 2 — '+c.name+' grade over the term');
    fig.innerHTML =
      '<div class="figure__top">'+
        '<span class="figure__no">Fig.&nbsp;2 <span class="figure__of">— '+esc(c.name)+', by week</span></span>'+
        '<span class="figure__range">Selected course · other courses shown faint · 88–100% scale</span>'+
      '</div>';

    var W=760, H=300, x0=70, x1=724, yTop=28, yBot=232;
    var sc = makeScale(x0,x1,yTop,yBot);
    var ns='http://www.w3.org/2000/svg';

    var wrap=el('div','figwrap');
    var svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','plate');
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label','Line chart of '+c.name+' grade across the term, other courses drawn faint');

    var ticksY=[88,90,92,94,96,98,100];
    var s='';
    /* gridlines */
    ticksY.forEach(function(v){ var y=sc.y(v); s+='<line class="grid" x1="'+x0+'" y1="'+y+'" x2="'+x1+'" y2="'+y+'"/>'; });
    /* y axis + labels + ticks */
    s+='<line class="axis" x1="'+x0+'" y1="'+yTop+'" x2="'+x0+'" y2="'+yBot+'"/>';
    s+='<g class="axislabel axislabel--y">';
    ticksY.forEach(function(v){ s+='<text x="60" y="'+(sc.y(v)+4)+'">'+v+'</text>'; });
    s+='</g><g class="tick">';
    ticksY.forEach(function(v){ var y=sc.y(v); s+='<line x1="64" y1="'+y+'" x2="'+x0+'" y2="'+y+'"/>'; });
    s+='</g>';
    /* x axis + ticks + labels */
    s+='<line class="axis" x1="'+x0+'" y1="'+yBot+'" x2="'+x1+'" y2="'+yBot+'"/>';
    s+='<g class="tick">';
    for(var i=0;i<8;i++){ var x=sc.x(i); s+='<line x1="'+x.toFixed(1)+'" y1="'+yBot+'" x2="'+x.toFixed(1)+'" y2="'+(yBot+6)+'"/>'; }
    s+='</g><g class="axislabel axislabel--x">';
    for(var j=0;j<8;j++){ s+='<text x="'+sc.x(j).toFixed(1)+'" y="'+(yBot+22)+'">'+WEEK_LABELS[j]+'</text>'; }
    s+='</g>';
    s+='<text class="axistitle axislabel--x" x="'+((x0+x1)/2)+'" y="'+(yBot+46)+'">Week of the term</text>';

    /* faint reference lines: every OTHER course not hidden */
    COURSES.forEach(function(oc){
      if(oc.id===c.id) return;
      if(hiddenSeries[oc.id]) return;
      s+='<polyline class="reference" data-ref="'+oc.id+'" points="'+poly(sc, HISTORY[oc.id])+'"/>';
    });

    /* main series */
    var main=HISTORY[c.id];
    s+='<polyline class="series" points="'+poly(sc, main)+'"/>';
    for(var k=0;k<8;k++){
      var cx=sc.x(k).toFixed(1), cy=sc.y(main[k]).toFixed(1);
      if(k===7) s+='<circle class="dot-fill" cx="'+cx+'" cy="'+cy+'" r="4"/>';
      else s+='<circle class="dot-open" cx="'+cx+'" cy="'+cy+'" r="3"/>';
    }
    s+='<text class="axislabel" x="712" y="'+(sc.y(main[7])-9).toFixed(1)+'" text-anchor="end" style="fill:currentColor">'+c.grade.toFixed(1)+'%</text>';
    /* hover dot + invisible hit targets */
    s+='<circle class="dot-hover" r="4.6"/>';
    for(var h=0;h<8;h++){
      s+='<circle class="hit" data-i="'+h+'" cx="'+sc.x(h).toFixed(1)+'" cy="'+sc.y(main[h]).toFixed(1)+'" r="16"/>';
    }
    svg.innerHTML=s;
    wrap.appendChild(svg);

    /* tooltip element */
    var tip=el('div','figtip');
    tip.innerHTML='<span class="figtip__wk"></span><div class="figtip__rule"></div>'+
      '<span class="figtip__val"></span><span class="figtip__name"></span>';
    wrap.appendChild(tip);

    /* hover interactions */
    var hoverDot=svg.querySelector('.dot-hover');
    $$('.hit',svg).forEach(function(hit){
      hit.addEventListener('mouseenter', function(){
        var i=+hit.getAttribute('data-i');
        var vx=sc.x(i), vy=sc.y(main[i]);
        hoverDot.setAttribute('cx',vx); hoverDot.setAttribute('cy',vy);
        hoverDot.style.display='block';
        tip.querySelector('.figtip__wk').textContent='Week of '+WEEK_LABELS[i];
        tip.querySelector('.figtip__val').textContent=main[i].toFixed(1)+'%';
        tip.querySelector('.figtip__name').textContent=c.name;
        /* place tip near point: convert viewBox coords to px */
        var rect=svg.getBoundingClientRect();
        var px=rect.left+window.scrollX + (vx/W)*rect.width;
        var py=rect.top+window.scrollY + (vy/H)*rect.height;
        var wr=wrap.getBoundingClientRect();
        tip.style.left=(px-(wr.left+window.scrollX)+12)+'px';
        tip.style.top =(py-(wr.top+window.scrollY)-10)+'px';
        tip.classList.add('figtip--on');
      });
      hit.addEventListener('mouseleave', function(){ hoverDot.style.display='none'; tip.classList.remove('figtip--on'); });
    });

    fig.appendChild(wrap);

    /* caption + legend */
    var cap=el('figcaption','figure__caption');
    var lead='The heavy line is '+esc(c.name)+'; the faint lines are the other five courses, drawn for scale. ';
    cap.innerHTML =
      '<p class="figure__captext"><span class="figure__lead">Fig. 2 — '+esc(c.name)+' against the field.</span> '+
        lead+'Toggle a course in the legend to add or drop its line.</p>'+
      '<div class="figure__legend"><span class="label">The Courses</span><div class="legend" id="legend"></div></div>';
    fig.appendChild(cap);

    var legend=cap.querySelector('#legend');
    COURSES.forEach(function(lc){
      var active=lc.id===c.id;
      var off = !active && hiddenSeries[lc.id];
      var row=el('div','legend__row'+(active?' legend__row--active':'')+(off?' legend__row--off':''));
      var sw = active
        ? '<svg class="legend__swatch" viewBox="0 0 34 10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" stroke="currentColor" stroke-width="2.2"/><circle cx="17" cy="5" r="2.6" fill="currentColor"/></svg>'
        : '<svg class="legend__swatch" viewBox="0 0 34 10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" stroke="currentColor" stroke-width="1" opacity="0.32"/></svg>';
      row.innerHTML = sw + '<span class="legend__name">'+esc(lc.name)+'</span><span class="legend__val">'+lc.grade.toFixed(1)+'%</span>';
      row.setAttribute('role','button'); row.setAttribute('tabindex','0');
      if(active){
        row.title='Selected course';
      } else {
        function toggleRef(){
          hiddenSeries[lc.id] = !hiddenSeries[lc.id];
          renderGrades();
        }
        row.addEventListener('click', toggleRef);
        row.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleRef(); } });
      }
      legend.appendChild(row);
    });

    return fig;
  }

  /* ============================================================
     ASSIGNMENTS — docket: search + filters + mark-filed
     ============================================================ */
  function docketEffectiveStatus(item){
    return state.filed[item.title] ? 'done' : item.status;
  }
  function renderDocket(){
    save();
    var box=$('#docket'); box.innerHTML='';
    var q=($('#docket-search').value||'').trim().toLowerCase();
    var filter=state.docketFilter;

    var list=DOCKET.map(function(it){ return it; });
    /* recompute status for filed-overrides, then filter */
    var visible=list.filter(function(it){
      var st=docketEffectiveStatus(it);
      if(filter==='upcoming' && !(st==='due'||st==='upcoming')) return false;
      if(filter==='missing' && st!=='missing') return false;
      if(filter==='done' && st!=='done') return false;
      if(q){
        var c=courseById[it.course];
        var hay=(it.title+' '+c.name+' '+c.teacher+' '+it.due).toLowerCase();
        if(hay.indexOf(q)<0) return false;
      }
      return true;
    });
    /* stable order by sort group then original */
    visible.sort(function(a,b){ return (a.sort-b.sort); });

    if(!visible.length){
      var emptyMsg;
      if(q) emptyMsg='Nothing answers to “'+esc(q)+'”. The search comes up empty.';
      else if(filter==='missing') emptyMsg='No missing work. Every column is squared away.';
      else if(filter==='done') emptyMsg='Nothing filed yet. The record is still to be written.';
      else if(filter==='upcoming') emptyMsg='Nothing scheduled and nothing owed. The docket is clean.';
      else emptyMsg='Nothing under this heading. The column reads clean.';
      box.appendChild(el('div','empty',emptyMsg));
    }
    visible.forEach(function(it, idx){
      var c=courseById[it.course];
      var st=docketEffectiveStatus(it);
      var statusHtml;
      if(st==='due'||st==='missing') statusHtml='<span class="tag">'+STATUS_TAG[st]+'</span>';
      else statusHtml='<span class="status-word">'+STATUS_TAG[st]+'</span>';

      var dueText = state.filed[it.title] && it.status!=='done'
        ? 'Filed just now · revision 1'
        : it.due;

      var fileBtn = (st==='due'||st==='missing')
        ? '<button class="ditem__file" type="button" data-file="'+esc(it.title)+'">Mark filed →</button>'
        : '';

      var num=('0'+(idx+1)).slice(-2);
      var d=el('article','ditem');
      d.innerHTML =
        '<div class="ditem__mark">'+num+'</div>'+
        '<div><div class="ditem__title">'+esc(it.title)+'</div>'+
          '<span class="ditem__course">'+esc(c.name)+' · '+esc(c.teacher)+'</span></div>'+
        '<div class="ditem__due">'+esc(dueText)+'</div>'+
        '<div class="ditem__status">'+statusHtml+fileBtn+'</div>';
      box.appendChild(d);
    });

    /* counts + closing line */
    var counts={ due:0,missing:0,upcoming:0,done:0 };
    DOCKET.forEach(function(it){ counts[docketEffectiveStatus(it)]++; });
    var owed=counts.due+counts.missing;
    $('#docket-closing-line').textContent = owed>0
      ? counts.due+' before the bell, '+counts.missing+' overdue. Clear those and the column reads almost empty.'
      : 'Nothing owed. The docket is clear; only the scheduled work remains.';
    $('#docket-closing-by').textContent = DOCKET.length+' entries across six courses · '+counts.done+' filed';

    /* filter chip state */
    $$('#docket-filters .filter').forEach(function(f){
      f.classList.toggle('filter--on', f.getAttribute('data-filter')===filter);
    });
  }
  $('#docket-search').addEventListener('input', renderDocket);
  $('#docket-filters').addEventListener('click', function(e){
    var f=e.target.closest('.filter'); if(!f) return;
    state.docketFilter=f.getAttribute('data-filter'); renderDocket();
  });
  $('#docket').addEventListener('click', function(e){
    var b=e.target.closest('[data-file]'); if(!b) return;
    var title=b.getAttribute('data-file');
    state.filed[title]=true; save();
    renderDocket();
    if(state.settings.notify) pushPing({ glyph:'✓', lead:'Filed · '+title, sub:'Moved to Done' });
  });

  /* ============================================================
     CALENDAR — printed month grid, prev/next/today, day select
     ============================================================ */
  var calView={ y:TODAY.y, m:TODAY.m };
  var selDay=null;
  function eventsFor(y,m){ return CAL_EVENTS[y+'-'+m] || {}; }
  function renderCalendar(){
    var grid=$('#calgrid'); grid.innerHTML='';
    var y=calView.y, m=calView.m;
    $('#cal-title').innerHTML = MONTH_NAMES[m]+' <em>'+y+'</em>';

    /* prev/next labels */
    var pm=(m+11)%12, nm=(m+1)%12;
    $('#cal-prev').textContent='‹ '+MONTH_NAMES[pm].slice(0,3);
    $('#cal-next').textContent=MONTH_NAMES[nm].slice(0,3)+' ›';

    var first=new Date(y,m,1).getDay();           /* 0=Sun */
    var daysIn=new Date(y,m+1,0).getDate();
    var prevDays=new Date(y,m,0).getDate();
    var ev=eventsFor(y,m);

    var cells=[];
    /* leading out-days */
    for(var i=0;i<first;i++){ cells.push({out:true, d:prevDays-first+1+i}); }
    for(var d=1;d<=daysIn;d++){ cells.push({out:false, d:d}); }
    /* trailing to fill last week */
    var trail=(7-(cells.length%7))%7;
    for(var t=1;t<=trail;t++){ cells.push({out:true, d:t}); }

    cells.forEach(function(cell){
      var c=el('div','cell'+(cell.out?' cell--out':''));
      var isToday = !cell.out && y===TODAY.y && m===TODAY.m && cell.d===TODAY.d;
      if(isToday) c.classList.add('cell--today');
      var dayEv = !cell.out ? (ev[cell.d]||[]) : [];
      if(dayEv.length){ c.classList.add('cell--has'); c.setAttribute('data-day',cell.d); }
      if(selDay===cell.d && !cell.out && dayEv.length) c.classList.add('cell--sel');

      var inner='<span class="cell__date">'+cell.d+'</span>';
      dayEv.slice(0,2).forEach(function(e){
        var cn=courseById[e.c];
        inner+='<div class="calnote"><span class="cn-course">'+esc(cn.name)+'</span>'+esc(e.t)+'</div>';
      });
      if(dayEv.length>2) inner+='<div class="cell__count">+'+(dayEv.length-2)+' more</div>';
      c.innerHTML=inner;
      grid.appendChild(c);
    });

    /* closing line reflects month */
    var monthEv=ev; var total=0; Object.keys(monthEv).forEach(function(k){ total+=monthEv[k].length; });
    $('#cal-closing-line').textContent = total
      ? total+' entries set against '+MONTH_NAMES[m]+'. The page does not crowd.'
      : 'No deadlines fall in '+MONTH_NAMES[m]+'. A clear month.';
    $('#cal-closing-by').textContent = MONTH_NAMES[m]+' '+y+' · Semester 2';

    /* live standfirst reflecting today */
    var sf=$('#cal-standfirst');
    if(sf){
      var todayEv=(eventsFor(TODAY.y,TODAY.m)[TODAY.d]||[]).length;
      var ahead=0, te=eventsFor(TODAY.y,TODAY.m);
      Object.keys(te).forEach(function(k){ if(+k>TODAY.d) ahead+=te[k].length; });
      sf.textContent = 'Deadlines set against the days that hold them. Today is the '+ordinal(TODAY.d)+
        ', with '+nWord(todayEv)+' '+(todayEv===1?'entry':'entries')+' owed; the days ahead carry '+nWord(ahead)+' more.';
    }
  }
  function ordinal(n){ var s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  function nWord(n){ var w=['no','one','two','three','four','five','six','seven','eight','nine','ten']; return n<=10?w[n]:String(n); }
  function showDay(d){
    var ev=eventsFor(calView.y,calView.m)[d];
    if(!ev||!ev.length){ closeDayStrip(); return; }
    selDay=d; renderCalendar();
    var strip=$('#day-strip');
    $('#day-strip-date').textContent=MONTH_NAMES[calView.m]+' '+d+', '+calView.y;
    var rows=$('#day-strip-rows'); rows.innerHTML='';
    ev.forEach(function(e){
      var c=courseById[e.c];
      rows.appendChild(el('div','day-strip__row',
        '<div><div class="day-strip__title">'+esc(e.t)+'</div>'+
        '<span class="day-strip__course">'+esc(c.name)+' · '+esc(c.teacher)+'</span></div>'+
        '<div class="ditem__due" style="text-align:right">'+esc(c.per)+'</div>'));
    });
    strip.classList.add('day-strip--on');
  }
  function closeDayStrip(){ selDay=null; $('#day-strip').classList.remove('day-strip--on'); renderCalendar(); }

  $('#cal-nav').addEventListener('click', function(e){
    var b=e.target.closest('[data-cal]'); if(!b) return;
    var act=b.getAttribute('data-cal');
    if(act==='prev'){ calView.m--; if(calView.m<0){ calView.m=11; calView.y--; } selDay=null; closeDayStrip(); }
    else if(act==='next'){ calView.m++; if(calView.m>11){ calView.m=0; calView.y++; } selDay=null; closeDayStrip(); }
    else if(act==='today'){ calView.y=TODAY.y; calView.m=TODAY.m; selDay=null; closeDayStrip(); }
  });
  $('#calgrid').addEventListener('click', function(e){
    var c=e.target.closest('.cell--has'); if(!c) return;
    showDay(+c.getAttribute('data-day'));
  });
  $('#day-strip-close').addEventListener('click', closeDayStrip);

  /* ============================================================
     BULLETINS — star toggles + persist + refresh dateline
     ============================================================ */
  function renderBulletins(){
    var box=$('#bulletins'); box.innerHTML='';
    if(!BULLETINS.length){
      box.appendChild(el('div','empty','No bulletins posted. The faculty is holding its peace.'));
      $('#bull-count').textContent='No notices';
      return;
    }
    BULLETINS.forEach(function(b){
      var c=courseById[b.course];
      var imp=!!state.important[b.id];
      var art=el('article','brief'+(imp?' brief--important':''));
      var flag = imp ? '<span class="brief__flag tag">Marked Important</span>' : '';
      art.innerHTML =
        '<div class="brief__star" role="button" tabindex="0" data-star="'+b.id+'" aria-label="Toggle important">'+(imp?'★':'☆')+'</div>'+
        '<div>'+
          '<div class="brief__dateline">'+esc(c.name)+' · <span class="by">'+esc(b.teacher)+'</span> · '+esc(b.date)+'</div>'+
          '<h3 class="brief__head">'+esc(b.head)+'</h3>'+
          '<p class="brief__stand">'+esc(b.body)+'</p>'+flag+
        '</div>'+
        '<div class="brief__side"><div class="brief__time">'+esc(b.time)+'</div></div>';
      box.appendChild(art);
    });
    var kept=Object.keys(state.important).filter(function(k){return state.important[k];}).length;
    $('#bull-count').textContent = BULLETINS.length+' notices · '+kept+' marked';
    $('#bull-closing-line').textContent = kept===1
      ? 'One starred, '+(BULLETINS.length-1)+' standing by. The faculty has little to add this week.'
      : kept+' starred, '+(BULLETINS.length-kept)+' standing by. The faculty has little to add this week.';
    var by=$('#bull-closing-by'); if(by) by.textContent='Posted across six courses · Refreshed '+shortDate(dayAt(0));
  }
  $('#bulletins').addEventListener('click', function(e){
    var s=e.target.closest('[data-star]'); if(!s) return;
    var id=s.getAttribute('data-star');
    state.important[id]=!state.important[id]; save(); renderBulletins();
  });
  $('#bulletins').addEventListener('keydown', function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var s=e.target.closest('[data-star]'); if(!s) return; e.preventDefault();
    var id=s.getAttribute('data-star'); state.important[id]=!state.important[id]; save(); renderBulletins();
  });
  $('#bull-refresh').addEventListener('click', function(){
    var by=$('#bull-closing-by');
    by.innerHTML='Posted across six courses · <span class="bull-updated">Updated just now</span>';
    var lab=$('#bull-count');
    var prev=lab.textContent;
    lab.innerHTML=lab.textContent+' · <span class="bull-updated">refreshed</span>';
    setTimeout(function(){ lab.textContent=prev; }, 2200);
  });

  /* ============================================================
     MATERIALS — index click loads panel; submit + comments
     ============================================================ */
  function renderMatIndex(){
    var idx=$('#mat-index'); idx.innerHTML='';
    MATERIALS.groups.forEach(function(g){
      var grp=el('div','matgroup');
      grp.appendChild(el('div','matgroup__title',esc(g.title)));
      g.rows.forEach(function(r){
        var row=el('div','matrow'+(r.id===state.matSel?' matrow--active':''));
        row.setAttribute('role','button'); row.setAttribute('tabindex','0'); row.setAttribute('data-mat',r.id);
        row.innerHTML='<span class="matrow__kind">'+esc(r.kind)+'</span><span class="matrow__name">'+esc(r.name)+'</span>';
        grp.appendChild(row);
      });
      idx.appendChild(grp);
    });
  }
  function renderMatPanel(){
    var p=$('#mat-panel'); p.innerHTML='';
    var det=MAT_DETAIL[state.matSel]; if(!det){ state.matSel='m-lab'; det=MAT_DETAIL['m-lab']; }
    var revs=state.revisions[state.matSel]||0;
    var comments=state.comments[state.matSel]||[];

    var tagHtml = det.tag
      ? ' · <span class="tag" style="vertical-align:1px">'+(revs>0?'Filed · revision '+revs:det.tag)+'</span>'
      : '';
    var attachRows = det.attach.map(function(a){
      return '<div class="attach__row"><span>'+esc(a[0])+'</span><span class="a-kind">'+esc(a[1])+'</span></div>';
    }).join('');

    var html =
      '<span class="label panel__kicker">'+esc(det.kicker)+'</span>'+
      '<h3 class="panel__title">'+esc(det.title)+'</h3>'+
      '<div class="panel__meta">'+esc(det.meta)+tagHtml+'</div>'+
      '<span class="label" style="display:block;margin-bottom:8px">Attachments</span>'+
      '<div class="attach">'+attachRows+'</div>';

    if(det.note){
      html += '<p class="figure__captext" style="margin-bottom:18px">'+esc(det.note)+'</p>';
    }

    if(det.submit){
      html +=
        '<div class="field"><span class="label field__label">Text submission</span>'+
          '<textarea id="mat-text" rows="4" placeholder="Type or paste your lab write-up here…"></textarea></div>'+
        '<div class="field"><span class="label field__label">Comment to teacher</span>'+
          '<input id="mat-comment" type="text" placeholder="Add a private note for Ms. Carrington…"></div>';
      if(comments.length){
        html += '<div class="attach" style="margin-bottom:18px">'+comments.map(function(cm){
          return '<div class="attach__row"><span style="font-family:var(--serif)">'+esc(cm.text)+'</span><span class="a-kind">'+esc(cm.at)+'</span></div>';
        }).join('')+'</div>';
      }
      var revNote = revs>0
        ? 'Filed · revision '+revs+' · '+(state.revisions[state.matSel+':at']||'')
        : 'No revisions yet · draft autosaved locally';
      html +=
        '<div class="panel__actions">'+
          '<span class="btn" id="mat-submit">'+(revs>0?'Resubmit':'Submit Lab')+'</span>'+
          '<span class="btn btn--ghost" id="mat-attach">Attach File</span>'+
          '<span class="btn btn--ghost" id="mat-open">Open in Schoology ↗</span>'+
          '<span class="panel__rev" id="mat-rev">'+esc(revNote)+'</span>'+
        '</div>';
    } else {
      html +=
        '<div class="panel__actions">'+
          '<span class="btn btn--ghost" id="mat-open">Open in Schoology ↗</span>'+
          '<span class="panel__rev">Reference material · nothing to submit</span>'+
        '</div>';
    }
    p.innerHTML=html;

    var openBtn=$('#mat-open');
    if(openBtn) openBtn.addEventListener('click', function(){
      if(state.settings.notify) pushPing({ glyph:'↗', lead:'Opening in Schoology', sub:esc(det.title) });
    });
    var attachBtn=$('#mat-attach');
    if(attachBtn) attachBtn.addEventListener('click', function(){
      var rev=$('#mat-rev'); if(rev) rev.textContent='File attached · sample-upload.pdf · draft saved locally';
    });
    var sub=$('#mat-submit');
    if(sub) sub.addEventListener('click', function(){
      var txt=($('#mat-text').value||'').trim();
      var stamp=timeStamp();
      state.revisions[state.matSel]=(state.revisions[state.matSel]||0)+1;
      state.revisions[state.matSel+':at']=stamp;
      var cmt=($('#mat-comment')&&$('#mat-comment').value||'').trim();
      if(cmt){
        state.comments[state.matSel]=(state.comments[state.matSel]||[]);
        state.comments[state.matSel].push({ text:cmt, at:stamp });
      }
      save();
      renderMatPanel();
      var n=state.revisions[state.matSel];
      if(state.settings.notify) pushPing({ glyph:'✓', lead:'Filed · '+det.title, sub:'Revision '+n+' · '+stamp });
    });
    var cInput=$('#mat-comment');
    if(cInput) cInput.addEventListener('keydown', function(e){
      if(e.key==='Enter'){
        e.preventDefault();
        var v=cInput.value.trim(); if(!v) return;
        state.comments[state.matSel]=(state.comments[state.matSel]||[]);
        state.comments[state.matSel].push({ text:v, at:timeStamp() });
        save(); renderMatPanel();
      }
    });
  }
  function renderMaterials(){ renderMatIndex(); renderMatPanel(); }
  $('#mat-index').addEventListener('click', function(e){
    var r=e.target.closest('[data-mat]'); if(!r) return;
    state.matSel=r.getAttribute('data-mat'); save(); renderMaterials();
  });
  $('#mat-index').addEventListener('keydown', function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var r=e.target.closest('[data-mat]'); if(!r) return; e.preventDefault();
    state.matSel=r.getAttribute('data-mat'); save(); renderMaterials();
  });

  function timeStamp(){
    return longDate(dayAt(0)) + ' · ' + nowClock();
  }
  function nowClock(){
    var d=new Date();
    var h=d.getHours();
    var mn=('0'+d.getMinutes()).slice(-2);
    var ampm=h>=12?'PM':'AM'; var hh=h%12; if(hh===0)hh=12;
    return hh+':'+mn+' '+ampm;
  }

  /* ============================================================
     SETTINGS — style switcher, toggles, theme, test ping
     ============================================================ */
  var darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolveDark(){
    var a=state.settings.appearance;
    if(a==='dark') return true;
    if(a==='auto') return !!(darkMQ && darkMQ.matches);
    return false; /* light */
  }
  function applyBodyClasses(){
    var dark=resolveDark();
    state.settings.themeWob = dark; /* keep legacy flag in sync */
    document.body.classList.toggle('compact', !!state.settings.compact);
    document.body.classList.toggle('theme-wob', dark);
    document.body.classList.toggle('contrast', !!state.settings.contrast);
  }
  /* Auto follows the system; re-apply live when it changes */
  if(darkMQ){
    var onScheme=function(){ if(state.settings.appearance==='auto'){ applyBodyClasses(); } };
    if(darkMQ.addEventListener) darkMQ.addEventListener('change', onScheme);
    else if(darkMQ.addListener) darkMQ.addListener(onScheme);
  }
  function setSwitch(scope, key, on){
    var t=$('[data-toggle="'+key+'"]', scope?$(scope):document); if(!t) return;
    var sw=t.querySelector('.switch');
    sw.classList.toggle('switch--on', on); sw.classList.toggle('switch--off', !on);
    sw.textContent = on?'On':'Off';
  }
  function renderSettings(){
    /* style cards */
    $$('#styles .style').forEach(function(s){
      var active = s.getAttribute('data-style')==='slate';
      s.classList.toggle('style--active', active);
      s.querySelector('.style__state').innerHTML = active
        ? '<span class="tag">Active</span>'
        : '<span class="status-word">Available</span>';
    });
    /* section toggles */
    Object.keys(state.settings.nav).forEach(function(k){ setSwitch(null,'nav-'+k, state.settings.nav[k]); });
    setSwitch(null,'compact', state.settings.compact);
    setSwitch(null,'notify', state.settings.notify);
    setSwitch(null,'contrast', state.settings.contrast);
    /* appearance cards (Light / Dark / Auto) */
    $$('#appearance .style').forEach(function(s){
      var active = s.getAttribute('data-appearance')===state.settings.appearance;
      s.classList.toggle('style--active', active);
      var stateEl=s.querySelector('.style__state');
      if(active){
        var resolved = state.settings.appearance==='auto'
          ? ('<span class="tag">Active</span> <span class="status-word">'+(resolveDark()?'Dark now':'Light now')+'</span>')
          : '<span class="tag">Active</span>';
        stateEl.innerHTML = resolved;
      } else {
        stateEl.innerHTML = '<span class="status-word">Available</span>';
      }
    });
    /* reflect nav visibility */
    SCREENS.forEach(function(s){
      var nv=$('[data-nav="'+s+'"]');
      if(nv) nv.style.display = (s==='settings'||state.settings.nav[s]) ? '' : 'none';
    });
  }

  function onToggle(key){
    var s=state.settings;
    if(key==='compact'){ s.compact=!s.compact; applyBodyClasses(); }
    else if(key==='notify'){ s.notify=!s.notify; }
    else if(key==='contrast'){ s.contrast=!s.contrast; applyBodyClasses(); }
    else if(key.indexOf('nav-')===0){
      var sec=key.slice(4);
      if(sec==='settings') return;                /* never hide settings */
      s.nav[sec]=!s.nav[sec];
      /* if we just hid the active screen, jump away */
      if(!s.nav[sec] && state.screen===sec) showScreen('settings');
    }
    save(); renderSettings();
  }
  ['#toggles-sections','#toggles-notices','#toggles-theme'].forEach(function(sel){
    $(sel).addEventListener('click', function(e){
      var t=e.target.closest('[data-toggle]'); if(!t) return;
      onToggle(t.getAttribute('data-toggle'));
    });
  });
  var EDITION_FILE = { apple:'mockup-app-apple.html', halo:'mockup-app-halo.html', slate:'mockup-app-slate.html', friendly:'mockup-app-forge.html', carbon:'mockup-app-carbon.html' };
  $('#styles').addEventListener('click', function(e){
    var s=e.target.closest('[data-style]'); if(!s) return;
    e.preventDefault();
    var name=s.getAttribute('data-style');
    if(name==='slate'){ pulse(s); return; }
    /* other editions live in sibling files — navigate to them */
    var dest=EDITION_FILE[name]; if(!dest) return;
    if(state.settings.notify) pushPing({ glyph:'→', lead:'Edition: '+cap(name), sub:'Opening '+dest });
    window.location.href = dest;
  });
  $('#appearance').addEventListener('click', function(e){
    var s=e.target.closest('[data-appearance]'); if(!s) return;
    state.settings.appearance = s.getAttribute('data-appearance');
    applyBodyClasses(); save(); renderSettings();
  });
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function pulse(node){ node.style.outline='2px solid var(--ink)'; node.style.outlineOffset='-2px';
    setTimeout(function(){ node.style.outline=''; }, 500); }

  $('#test-ping').addEventListener('click', function(){
    if(!state.settings.notify){
      var note=$('#ping-note');
      var prev=note.textContent;
      note.textContent='Notifications are off — turn them on above.';
      setTimeout(function(){ note.textContent=prev; }, 2400);
      return;
    }
    pushPing(PINGS[pingIdx % PINGS.length]); pingIdx++;
  });
  var pingIdx=0;

  /* ============================================================
     PING — desktop-style toast, strictly B&W, auto-dismiss
     ============================================================ */
  function pushPing(p){
    var dock=$('#ping-dock');
    var node=el('div','ping');
    node.innerHTML =
      '<div class="ping__top"><span class="ping__app">Better SGY</span><span>just now</span></div>'+
      '<div class="ping__body"><span class="ping__glyph">'+p.glyph+'</span>'+
        '<span class="ping__text"><span class="ping__lead">'+p.lead+'</span>'+
        (p.sub?'<span class="ping__sub">'+p.sub+'</span>':'')+'</span></div>';
    dock.appendChild(node);
    requestAnimationFrame(function(){ node.classList.add('ping--in'); });
    var killed=false;
    function kill(){ if(killed)return; killed=true; node.classList.remove('ping--in');
      setTimeout(function(){ if(node.parentNode) node.parentNode.removeChild(node); }, 220); }
    node.addEventListener('click', kill);
    setTimeout(kill, 4600);
  }

  /* ============================================================
     ARCADE — three diversions, strictly B&W. Vanilla JS.
     ============================================================ */
  var ARCADE = (function(){
    var GAME_NAMES = { typing:'Typing Test', anagram:'Anagram', ttt:'Tic-Tac-Toe', search:'Word Search' };
    var active=null;            /* current game name or null */
    var teardown=null;          /* function to stop the running game */
    var keyHandler=null;        /* document keydown handler while playing */
    var dailySeed=null;         /* when set, Word Search builds deterministically */

    /* seedable RNG (mulberry32) — only used for the Daily Challenge */
    function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

    function bestVal(g){ return state.arcadeBest[g]; }
    function setBest(g,v){ state.arcadeBest[g]=v; save(); refreshHomeBests(); }
    function sfx(kind){ var s=window.__SGY_SFX; if(s && s[kind]) s[kind](); }

    function fmtSec(s){ return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }

    function bestLabel(g){
      var b=bestVal(g);
      if(g==='typing') return b ? ('Best '+b+' wpm') : 'Best —';
      if(g==='anagram') return b ? ('Best run '+b) : 'Best —';
      if(g==='search') return b ? ('Best '+fmtSec(b)) : 'Best —';
      if(g==='ttt') return b ? ('Record '+b) : 'Record 0–0–0';
      return 'Best —';
    }
    function refreshHomeBests(){
      $$('#arcade-home [data-best]').forEach(function(node){
        node.textContent = bestLabel(node.getAttribute('data-best'));
      });
      if(typeof renderBestScores==='function') renderBestScores();
    }

    /* ---- stage chrome ---- */
    function showOverlay(kicker, head, sub){
      $('#overlay-kicker').textContent=kicker;
      $('#overlay-head').textContent=head;
      $('#overlay-sub').textContent=sub;
      $('#stage-overlay').hidden=false;
    }
    function hideOverlay(){ $('#stage-overlay').hidden=true; }
    function setScore(v){ $('#stage-score').textContent=v; }
    function setScoreLabel(t){ $$('.gscore__label')[0].textContent=t; }
    function setMeta(label,v){ $('#stage-meta-label').textContent=label; $('#stage-meta').textContent=v; }
    function setHint(t){ $('#stage-hint').textContent=t; }

    function stopActive(){
      if(teardown){ try{ teardown(); }catch(e){} teardown=null; }
      if(keyHandler){ document.removeEventListener('keydown', keyHandler); keyHandler=null; }
      active=null;
    }

    function openGame(name, keepDaily){
      if(!GAME_NAMES[name]) return;
      stopActive();
      if(!keepDaily) dailySeed=null;
      active=name;
      $('#arcade-home').hidden=true;
      $('#arcade-stage').hidden=false;
      $('#stage-title').textContent=GAME_NAMES[name];
      setScoreLabel('Score');
      hideOverlay();
      if(name==='typing') startTyping();
      else if(name==='anagram') startAnagram();
      else if(name==='ttt') startTicTacToe();
      else if(name==='search') startSearch();
    }
    function openDaily(){
      dailySeed = TODAY.y*10000+(TODAY.m+1)*100+TODAY.d;
      openGame('search', true);
    }
    function backToHome(){
      stopActive();
      $('#arcade-stage').hidden=true;
      $('#arcade-home').hidden=false;
      refreshHomeBests();
    }
    function restartActive(){ if(active) openGame(active, dailySeed!=null && active==='search'); }

    /* ========================================================
       GAME 1 — TYPING TEST
       ======================================================== */
    var QUOTES = [
      { t:'It was the best of times, it was the worst of times.', a:'Dickens, A Tale of Two Cities' },
      { t:'All happy families are alike; each unhappy family is unhappy in its own way.', a:'Tolstoy, Anna Karenina' },
      { t:'Call me Ishmael. Some years ago, never mind how long precisely.', a:'Melville, Moby-Dick' },
      { t:'It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife.', a:'Austen, Pride and Prejudice' },
      { t:'So we beat on, boats against the current, borne back ceaselessly into the past.', a:'Fitzgerald, The Great Gatsby' }
    ];
    function startTyping(){
      var q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
      var target = q.t;
      var board=$('#stage-board');
      var spans = target.split('').map(function(ch,i){
        return '<span class="tch pend" data-i="'+i+'">'+esc(ch)+'</span>';
      }).join('');
      board.innerHTML =
        '<div class="type-quote" id="type-quote">'+spans+
          '<div class="type-cite">— '+esc(q.a)+'</div></div>'+
        '<textarea class="type-field" id="type-field" rows="3" autocomplete="off" '+
          'autocorrect="off" autocapitalize="off" spellcheck="false" '+
          'placeholder="Begin typing the passage above…"></textarea>';
      setScoreLabel('WPM');
      setScore(0);
      setMeta('Accuracy', '100%');
      setHint('Type the passage exactly. The clock starts on the first keystroke. Best is the highest words-per-minute.');

      var field=$('#type-field');
      var chars=$$('#type-quote .tch');
      var started=0, done=false;

      function render(typed){
        var correct=0;
        for(var i=0;i<chars.length;i++){
          var c=chars[i]; c.className='tch';
          if(i<typed.length){
            if(typed[i]===target[i]){ c.classList.add('done'); correct++; }
            else c.classList.add('bad');
          } else if(i===typed.length){ c.classList.add('cur'); }
          else c.classList.add('pend');
        }
        return correct;
      }
      function update(){
        var typed=field.value;
        if(!started && typed.length){ started=Date.now(); }
        var correct=render(typed);
        var acc = typed.length ? Math.round(correct/typed.length*100) : 100;
        setMeta('Accuracy', acc+'%');
        var mins = started ? (Date.now()-started)/60000 : 0;
        var wpm = mins>0 ? Math.round((typed.length/5)/mins) : 0;
        setScore(wpm);
        if(typed.length>=target.length){ finish(typed, wpm); }
      }
      function finish(typed, liveWpm){
        if(done) return; done=true;
        field.readOnly=true;
        var mins=(Date.now()-started)/60000;
        var correct=0; for(var i=0;i<target.length;i++){ if(typed[i]===target[i]) correct++; }
        var acc=Math.round(correct/target.length*100);
        /* accuracy-weighted final wpm */
        var raw = Math.round((target.length/5)/Math.max(mins,1/600));
        var wpm = Math.max(0, Math.round(raw * (acc/100)));
        setScore(wpm); setMeta('Accuracy', acc+'%');
        var prev=bestVal('typing')||0;
        var isBest = wpm>prev;
        if(isBest) setBest('typing', wpm);
        sfx(isBest?'win':'good');
        showOverlay('The Result', wpm+' words a minute',
          'Accuracy of '+acc+'% over '+target.length+' characters.'+
          (isBest?' A new personal best.':' Best holds at '+prev+' wpm.'));
      }
      function onInput(){ if(!done) update(); }
      field.addEventListener('input', onInput);
      setTimeout(function(){ try{ field.focus(); }catch(e){} }, 30);
      render('');
      teardown=function(){ field.removeEventListener('input', onInput); };
    }

    /* ========================================================
       GAME 2 — ANAGRAM
       ======================================================== */
    var ANA_WORDS = [
      { w:'ESSAY',    c:'A piece of literary composition.' },
      { w:'ENZYME',   c:'A protein that speeds a reaction.' },
      { w:'ALGEBRA',  c:'The branch of mathematics of symbols.' },
      { w:'BIOLOGY',  c:'The study of living organisms.' },
      { w:'FRENCH',   c:'A Romance language and a course.' },
      { w:'DRAMA',    c:'A work for the stage.' },
      { w:'NARRATOR', c:'The voice that tells the story.' },
      { w:'MITOSIS',  c:'The division of a cell into two.' }
    ];
    function startAnagram(){
      var board=$('#stage-board');
      board.innerHTML=
        '<div class="ana-slots" id="ana-slots"></div>'+
        '<div class="ana-rack" id="ana-rack"></div>'+
        '<p class="ana-hint" id="ana-hint">&nbsp;</p>'+
        '<div class="ana-actions">'+
          '<button class="gbtn gbtn--ghost" id="ana-hint-btn" type="button">Hint</button>'+
          '<button class="gbtn gbtn--ghost" id="ana-clear" type="button">Clear</button>'+
          '<button class="gbtn" id="ana-next" type="button" hidden>Next →</button>'+
        '</div>';
      setScoreLabel('Streak');
      setScore(0);
      setMeta('Best', bestVal('anagram')||0);
      setHint('Type a letter, or click the tiles, to spell the word. Backspace removes the last. A hint names the field.');

      var streak=0, used, current, placed, solved;
      var slotsEl=$('#ana-slots'), rackEl=$('#ana-rack'), hintEl=$('#ana-hint');
      var nextBtn=$('#ana-next');

      function scramble(w){
        var a=w.split(''); var s;
        do {
          for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
          s=a.join('');
        } while(s===w && w.length>1);
        return a;
      }
      function newWord(){
        current = ANA_WORDS[Math.floor(Math.random()*ANA_WORDS.length)];
        var letters = scramble(current.w);
        placed=[]; solved=false; used=[];
        hintEl.innerHTML='&nbsp;';
        nextBtn.hidden=true;
        /* rack */
        rackEl.innerHTML='';
        letters.forEach(function(ch,i){
          var b=el('button','ana-tile'); b.type='button'; b.textContent=ch;
          b.setAttribute('data-ri', i); rackEl.appendChild(b);
          used.push(false);
        });
        renderSlots();
      }
      function renderSlots(){
        slotsEl.innerHTML='';
        for(var i=0;i<current.w.length;i++){
          var s=el('div','ana-slot');
          if(placed[i]!=null){ s.classList.add('full'); s.textContent=placed[i].ch; }
          if(solved) s.classList.add('right');
          slotsEl.appendChild(s);
        }
      }
      function place(ri, ch){
        if(solved) return;
        var pos=placed.length;
        if(pos>=current.w.length) return;
        placed.push({ ri:ri, ch:ch });
        if(ri!=null){ used[ri]=true; rackEl.children[ri].disabled=true; }
        renderSlots();
        if(placed.length===current.w.length) check();
      }
      function removeLast(){
        if(solved || !placed.length) return;
        var last=placed.pop();
        if(last.ri!=null){ used[last.ri]=false; rackEl.children[last.ri].disabled=false; }
        slotsEl.querySelectorAll('.ana-slot').forEach(function(s){ s.classList.remove('wrong'); });
        renderSlots();
      }
      function clearAll(){ while(placed.length) removeLast(); }
      function check(){
        var guess=placed.map(function(p){return p.ch;}).join('');
        if(guess===current.w){
          solved=true; streak++; setScore(streak);
          var prev=bestVal('anagram')||0;
          if(streak>prev){ setBest('anagram', streak); setMeta('Best', streak); }
          renderSlots();
          sfx('good');
          hintEl.textContent='Correct — '+current.w+'.';
          nextBtn.hidden=false;
          try{ nextBtn.focus(); }catch(e){}
        } else {
          sfx('bad');
          slotsEl.querySelectorAll('.ana-slot').forEach(function(s){ s.classList.add('wrong'); });
          setTimeout(function(){
            if(streak>0){ /* streak ends on a wrong word */
              hintEl.textContent='Not quite. The run ends at '+streak+'. The tiles reset.';
            } else {
              hintEl.textContent='Not quite — try the order again.';
            }
            streak=0; setScore(0);
            clearAll();
          }, 650);
        }
      }
      function clickTile(ri){
        if(used[ri]) return;
        place(ri, rackEl.children[ri].textContent);
      }
      function typeLetter(ch){
        ch=ch.toUpperCase();
        for(var i=0;i<rackEl.children.length;i++){
          if(!used[i] && rackEl.children[i].textContent===ch){ place(i, ch); return; }
        }
      }

      function onRack(e){ var b=e.target.closest('[data-ri]'); if(b) clickTile(+b.getAttribute('data-ri')); }
      function onSlots(){ removeLast(); }
      rackEl.addEventListener('click', onRack);
      slotsEl.addEventListener('click', onSlots);
      $('#ana-clear').addEventListener('click', clearAll);
      $('#ana-hint-btn').addEventListener('click', function(){ hintEl.textContent=current.c; });
      nextBtn.addEventListener('click', newWord);

      keyHandler=function(e){
        if(e.metaKey||e.ctrlKey||e.altKey) return;
        if(e.key==='Backspace'){ e.preventDefault(); removeLast(); return; }
        if(e.key==='Enter'){ if(!nextBtn.hidden){ e.preventDefault(); newWord(); } return; }
        if(/^[a-zA-Z]$/.test(e.key)){ e.preventDefault(); typeLetter(e.key); }
      };
      document.addEventListener('keydown', keyHandler);

      newWord();
      teardown=function(){
        rackEl.removeEventListener('click',onRack);
        slotsEl.removeEventListener('click',onSlots);
      };
    }

    /* ========================================================
       GAME 3 — TIC-TAC-TOE (minimax CPU)
       ======================================================== */
    function startTicTacToe(){
      var board=$('#stage-board');
      board.innerHTML=
        '<div class="ttt" id="ttt-grid"></div>'+
        '<div class="ttt-tally">'+
          '<div><span class="tl">Won</span><span class="tv" id="ttt-w">0</span></div>'+
          '<div><span class="tl">Drawn</span><span class="tv" id="ttt-d">0</span></div>'+
          '<div><span class="tl">Lost</span><span class="tv" id="ttt-l">0</span></div>'+
        '</div>';
      setScoreLabel('Round');
      var rec = parseRec(bestVal('ttt'));
      setMeta('Record', rec.w+'–'+rec.d+'–'+rec.l);
      $('#ttt-w').textContent=rec.w; $('#ttt-d').textContent=rec.d; $('#ttt-l').textContent=rec.l;
      setHint('You are X; the machine is O and plays perfectly. Click a square or press 1–9 (top-left to bottom-right).');

      var grid=$('#ttt-grid'), cells=[];
      for(var i=0;i<9;i++){ var c=el('button','ttt__cell'); c.type='button'; c.setAttribute('data-i',i); grid.appendChild(c); cells.push(c); }
      var b=['','','','','','','','',''], over=false, round=1, lock=false;
      setScore(round);

      var LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      function winner(s){
        for(var i=0;i<LINES.length;i++){ var L=LINES[i];
          if(s[L[0]] && s[L[0]]===s[L[1]] && s[L[1]]===s[L[2]]) return { p:s[L[0]], line:L };
        }
        if(s.every(function(v){return v;})) return { p:'draw', line:null };
        return null;
      }
      function draw(winLine){
        for(var i=0;i<9;i++){
          var cell=cells[i];
          cell.className='ttt__cell'+(b[i]?' taken':'')+(b[i]==='O'?' o':'');
          cell.innerHTML = b[i] ? '<span class="mk">'+b[i]+'</span>' : '';
          if(winLine && winLine.indexOf(i)>=0) cell.classList.add('win');
        }
      }
      /* minimax — O maximizes */
      function score(s, depth){
        var w=winner(s);
        if(w){ if(w.p==='O') return 10-depth; if(w.p==='X') return depth-10; return 0; }
        return null;
      }
      function minimax(s, turn, depth){
        var sc=score(s,depth); if(sc!==null) return { score:sc };
        var best = turn==='O' ? {score:-Infinity} : {score:Infinity};
        for(var i=0;i<9;i++){
          if(s[i]) continue;
          s[i]=turn;
          var r=minimax(s, turn==='O'?'X':'O', depth+1);
          s[i]='';
          if(turn==='O'){ if(r.score>best.score) best={score:r.score, move:i}; }
          else { if(r.score<best.score) best={score:r.score, move:i}; }
        }
        return best;
      }
      function cpuMove(){
        var m=minimax(b.slice(),'O',0).move;
        if(m==null){ for(var i=0;i<9;i++) if(!b[i]){ m=i; break; } }
        b[m]='O';
        finishCheck();
      }
      function finishCheck(){
        var w=winner(b);
        if(w){
          over=true; lock=false;
          draw(w.line);
          var rec2=parseRec(bestVal('ttt'));
          var head, sub;
          if(w.p==='X'){ rec2.w++; head='You win.'; sub='The cross takes it. A rare thing against this machine.'; sfx('win'); }
          else if(w.p==='O'){ rec2.l++; head='You lose.'; sub='The circle closes it out. The machine does not blunder.'; sfx('bad'); }
          else { rec2.d++; head='A draw.'; sub='Even play to an even end — the honest result of perfect defence.'; sfx('good'); }
          setBest('ttt', rec2.w+'-'+rec2.d+'-'+rec2.l);
          setMeta('Record', rec2.w+'–'+rec2.d+'–'+rec2.l);
          $('#ttt-w').textContent=rec2.w; $('#ttt-d').textContent=rec2.d; $('#ttt-l').textContent=rec2.l;
          showOverlay('Round '+round, head, sub+' Play again for the next round.');
        } else { draw(); }
      }
      function playX(i){
        if(over||lock||b[i]) return;
        b[i]='X'; draw(); sfx('tick');
        if(winner(b)){ finishCheck(); return; }
        lock=true;
        setTimeout(function(){ if(!over){ cpuMove(); lock=false; } }, 280);
      }

      function onClick(e){ var cell=e.target.closest('[data-i]'); if(cell) playX(+cell.getAttribute('data-i')); }
      grid.addEventListener('click', onClick);
      keyHandler=function(e){
        if(/^[1-9]$/.test(e.key)){ e.preventDefault(); playX(+e.key-1); }
      };
      document.addEventListener('keydown', keyHandler);

      draw();
      teardown=function(){ grid.removeEventListener('click', onClick); };
    }
    /* shared parse for the tic-tac-toe record string "W-D-L" */
    function parseRec(s){
      s=s||''; var p=String(s).split('-');
      return { w:+p[0]||0, d:+p[1]||0, l:+p[2]||0 };
    }

    /* ========================================================
       GAME 4 — WORD SEARCH
       ======================================================== */
    var WS_WORDS = ['BIOLOGY','FRENCH','ALGEBRA','DRAMA','ENZYME','ESSAY'];
    var WS_N = 10, WS_ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function startSearch(){
      var board=$('#stage-board');
      board.innerHTML=
        '<div class="ws-wrap"><div class="ws" id="ws-grid"></div></div>'+
        '<div class="ws-list" id="ws-list"></div>';
      setScoreLabel('Found');
      setScore('0 / 6');
      setMeta('Best', bestVal('search') ? fmtSec(bestVal('search')) : '—');

      var grid=$('#ws-grid'), listEl=$('#ws-list');
      var cellsArr, placedWords, found, startTime, timer, aimStart=null;
      var isDaily = dailySeed!=null;
      var rnd = isDaily ? mulberry(dailySeed) : Math.random;

      function idx(r,c){ return r*WS_N+c; }
      function build(){
        var g=[]; for(var i=0;i<WS_N*WS_N;i++) g.push('');
        placedWords=[];
        var dirs=[[0,1],[1,0]]; /* horizontal, vertical */
        WS_WORDS.slice().sort(function(){return rnd()-0.5;}).forEach(function(w){
          var ok=false, tries=0, cellsList;
          while(!ok && tries<300){
            tries++;
            var d=dirs[Math.floor(rnd()*dirs.length)];
            var maxR = d[0]? WS_N-w.length : WS_N-1;
            var maxC = d[1]? WS_N-w.length : WS_N-1;
            var r=Math.floor(rnd()*(maxR+1));
            var c=Math.floor(rnd()*(maxC+1));
            var fits=true; cellsList=[];
            for(var k=0;k<w.length;k++){
              var rr=r+d[0]*k, cc=c+d[1]*k, cur=g[idx(rr,cc)];
              if(cur && cur!==w[k]){ fits=false; break; }
              cellsList.push(idx(rr,cc));
            }
            if(fits){
              for(var k2=0;k2<w.length;k2++){ g[cellsList[k2]]=w[k2]; }
              placedWords.push({ word:w, cells:cellsList });
              ok=true;
            }
          }
        });
        for(var i=0;i<g.length;i++){ if(!g[i]) g[i]=WS_ALPHA[Math.floor(rnd()*26)]; }
        return g;
      }

      function renderGrid(g){
        grid.innerHTML=''; cellsArr=[];
        g.forEach(function(ch,i){
          var c=el('div','ws__c'); c.textContent=ch; c.setAttribute('data-i',i);
          var r=Math.floor(i/WS_N), col=i%WS_N;
          c.setAttribute('data-r',r); c.setAttribute('data-c',col);
          grid.appendChild(c); cellsArr.push(c);
        });
      }
      function renderList(){
        listEl.innerHTML='';
        WS_WORDS.forEach(function(w){
          var s=el('span','ws-word'+(found.indexOf(w)>=0?' struck':''));
          s.textContent=w; listEl.appendChild(s);
        });
      }
      function lineCells(a,b){
        var ar=+cellsArr[a].getAttribute('data-r'), ac=+cellsArr[a].getAttribute('data-c');
        var br=+cellsArr[b].getAttribute('data-r'), bc=+cellsArr[b].getAttribute('data-c');
        if(ar!==br && ac!==bc) return null; /* must be straight H or V */
        var cells=[]; var dr=Math.sign(br-ar), dc=Math.sign(bc-ac);
        var len=Math.max(Math.abs(br-ar),Math.abs(bc-ac))+1;
        for(var k=0;k<len;k++){ cells.push(idx(ar+dr*k, ac+dc*k)); }
        return cells;
      }
      function wordFromCells(cells){ return cells.map(function(i){return cellsArr[i].textContent;}).join(''); }
      function clearSel(){ cellsArr.forEach(function(c){ c.classList.remove('sel','aim'); }); }

      function pick(i){
        if(aimStart==null){
          aimStart=i; clearSel(); cellsArr[i].classList.add('aim');
          return;
        }
        var cells=lineCells(aimStart, i);
        var prevStart=aimStart; aimStart=null; clearSel();
        if(!cells){ return; }
        var w=wordFromCells(cells), wr=w.split('').reverse().join('');
        var hit=null;
        WS_WORDS.forEach(function(target){
          if(found.indexOf(target)>=0) return;
          if(w===target || wr===target) hit=target;
        });
        if(hit){
          cells.forEach(function(ci){ cellsArr[ci].classList.add('found'); });
          found.push(hit); renderList();
          setScore(found.length+' / 6');
          sfx('good');
          if(found.length===WS_WORDS.length) win();
        }
      }
      function win(){
        clearInterval(timer);
        var secs=Math.floor((Date.now()-startTime)/1000);
        var prev=bestVal('search')||0;
        var isBest = !prev || secs<prev;
        if(isBest) setBest('search', secs);
        setMeta('Best', fmtSec(isBest?secs:prev));
        sfx('win');
        showOverlay('Cleared', 'All six words.',
          'Found in '+fmtSec(secs)+'.'+(isBest?' A new fastest time.':' Best holds at '+fmtSec(prev)+'.'));
      }

      function onClick(e){ var c=e.target.closest('[data-i]'); if(c) pick(+c.getAttribute('data-i')); }
      grid.addEventListener('click', onClick);
      keyHandler=function(e){ if(e.key==='Escape'){ aimStart=null; clearSel(); } };
      document.addEventListener('keydown', keyHandler);

      function newPuzzle(){
        found=[]; aimStart=null;
        var g=build(); renderGrid(g); renderList();
        setScore('0 / 6');
        startTime=Date.now();
        clearInterval(timer);
        timer=setInterval(function(){
          var s=Math.floor((Date.now()-startTime)/1000);
          setHint('Time '+fmtSec(s)+' · select the first then the last letter of a word · Esc cancels a pick.');
        },1000);
        setHint('Select the first then the last letter of a hidden word. Words run across or down. Esc cancels a pick.');
      }
      if(isDaily){
        var st=$('#stage-title'); if(st) st.textContent='Word Search · Daily';
      }
      newPuzzle();
      teardown=function(){ clearInterval(timer); grid.removeEventListener('click', onClick); };
    }

    /* ---- wiring ---- */
    function init(){
      refreshHomeBests();
      $('#arcade-home').addEventListener('click', function(e){
        var card=e.target.closest('[data-game]'); if(card) openGame(card.getAttribute('data-game'));
      });
      $('#arcade-home').addEventListener('keydown', function(e){
        if(e.key==='Enter'||e.key===' '){ var card=e.target.closest('[data-game]'); if(card){ e.preventDefault(); openGame(card.getAttribute('data-game')); } }
      });
      $('#arcade-back').addEventListener('click', backToHome);
      $('#arcade-restart').addEventListener('click', restartActive);
      $('#overlay-again').addEventListener('click', restartActive);
    }
    /* stop any running game when leaving the arcade screen */
    function onLeave(){ if(active){ stopActive(); $('#arcade-stage').hidden=true; $('#arcade-home').hidden=false; } }

    return { init:init, onLeave:onLeave, openGame:function(n){ openGame(n); }, openDaily:openDaily };
  })();

  /* ============================================================
     ADDED — SOUND FX (WebAudio blips, no files, off by default)
     ============================================================ */
  var SFX = (function(){
    var ctx=null;
    function ensure(){
      if(ctx) return ctx;
      try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC) ctx=new AC(); }catch(e){ ctx=null; }
      return ctx;
    }
    function on(){ return !!(state.settings && state.settings.sfx); }
    function blip(freq, dur, type){
      if(!on()) return;
      var c=ensure(); if(!c) return;
      try{
        if(c.state==='suspended') c.resume();
        var o=c.createOscillator(), g=c.createGain();
        o.type=type||'square'; o.frequency.value=freq||440;
        o.connect(g); g.connect(c.destination);
        var t=c.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t+0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t+(dur||0.08));
        o.start(t); o.stop(t+(dur||0.08)+0.02);
      }catch(e){}
    }
    return {
      on:on,
      tick:function(){ blip(620,0.04,'square'); },
      good:function(){ blip(720,0.07,'square'); setTimeout(function(){ blip(960,0.09,'square'); },70); },
      bad:function(){ blip(180,0.14,'sawtooth'); },
      win:function(){ blip(640,0.08,'square'); setTimeout(function(){ blip(840,0.08,'square'); },90); setTimeout(function(){ blip(1040,0.13,'square'); },180); }
    };
  })();
  /* expose to ARCADE (defined above, calls window.__SGY_SFX if present) */
  window.__SGY_SFX = SFX;

  /* ============================================================
     ADDED — ARCADE HOME EXTRAS: best-scores panel, sfx toggle, daily
     ============================================================ */
  var ARCADE_META = [
    { g:'typing', name:'Typing Test', fmt:function(b){ return b ? b+' wpm' : null; } },
    { g:'anagram', name:'Anagram', fmt:function(b){ return b ? 'run of '+b : null; } },
    { g:'ttt', name:'Tic-Tac-Toe', fmt:function(b){ var p=String(b||'').split('-'); var w=+p[0]||0,d=+p[1]||0,l=+p[2]||0; return (w||d||l)? (w+'–'+d+'–'+l) : null; } },
    { g:'search', name:'Word Search', fmt:function(b){ return b ? (Math.floor(b/60)+':'+('0'+(b%60)).slice(-2)) : null; } }
  ];
  function renderBestScores(){
    var box=$('#best-scores'); if(!box) return; box.innerHTML='';
    ARCADE_META.forEach(function(m,i){
      var v=m.fmt(state.arcadeBest[m.g]);
      var row=el('div','scorerow');
      row.innerHTML='<span class="scorerow__no">'+['I','II','III','IV'][i]+'</span>'+
        '<span class="scorerow__name">'+esc(m.name)+'</span>'+
        '<span class="scorerow__val'+(v?'':' none')+'">'+(v?esc(v):'unplayed')+'</span>';
      box.appendChild(row);
    });
  }
  function renderSfxSwitch(){
    var sw=$('#sfx-switch'); if(!sw) return;
    var on=!!state.settings.sfx;
    sw.classList.toggle('switch--on', on); sw.classList.toggle('switch--off', !on);
    sw.textContent = on ? 'On' : 'Off';
  }
  (function wireSfx(){
    var t=$('#sfx-toggle'); if(!t) return;
    function toggle(){ state.settings.sfx=!state.settings.sfx; save(); renderSfxSwitch(); if(state.settings.sfx) SFX.tick(); }
    t.addEventListener('click', toggle);
    t.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
  })();
  /* Daily challenge: a date-seeded line + label. Deterministic per calendar day. */
  (function dailyLabel(){
    var line=$('#daily-line'); if(!line) return;
    var seed=TODAY.y*10000+(TODAY.m+1)*100+TODAY.d;
    var sets=[
      'six course words, one fixed field',
      'the same ten-by-ten for every reader today',
      'today’s grid, set once and shared',
      'one field, no reshuffle until midnight'
    ];
    var pick=sets[seed % sets.length];
    line.textContent='A fixed word search — '+pick+'. Beat the clock and return tomorrow for a new field. Filed '+shortDate(dayAt(0))+'.';
    var card=line.closest('.daily-card');
    if(card){
      card.style.cursor='pointer';
      card.setAttribute('role','button'); card.setAttribute('tabindex','0');
      card.setAttribute('aria-label','Play the Daily Challenge word search');
      function play(){ if(ARCADE && ARCADE.openDaily){ showScreen('arcade'); ARCADE.openDaily(); } }
      card.addEventListener('click', play);
      card.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); play(); } });
    }
  })();

  /* ============================================================
     ADDED — COMMAND PALETTE (⌘K) + KEYBOARD SHORTCUTS + HELP
     ============================================================ */
  var SCREEN_LABEL = { overview:'Overview', grades:'Grades', assignments:'Assignments',
    calendar:'Calendar', announcements:'Bulletins', materials:'Materials', arcade:'Games',
    nostalgia:'Nostalgia', settings:'Settings' };
  var SCREEN_KEY = { o:'overview', g:'grades', a:'assignments', c:'calendar', n:'announcements', m:'materials', e:'arcade', r:'nostalgia', s:'settings' };
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');

  /* fix the ⌘K affordance label to match platform */
  (function(){
    var lbl = IS_MAC ? '⌘K' : 'Ctrl K';
    var k=$('#mh-search-kbd'); if(k) k.textContent=lbl;
    var hk=$('#help-cmdk'); if(hk) hk.textContent=lbl;
  })();

  /* build the searchable index across the paper */
  function buildIndex(){
    var idx=[];
    /* screens */
    SCREENS.forEach(function(s){
      idx.push({ kind:'Screen', name:SCREEN_LABEL[s], sub:'Jump to the '+SCREEN_LABEL[s].toLowerCase()+' page',
        where:'Section', go:function(){ showScreen(s); } });
    });
    /* courses -> grades */
    COURSES.forEach(function(c){
      idx.push({ kind:'Course', name:c.name, sub:c.teacher+' · '+c.per+' · '+c.grade.toFixed(1)+'% '+c.ltr,
        where:'Grades', go:function(){ state.gradeCourse=c.id; renderGrades(); showScreen('grades'); } });
    });
    /* assignments (docket) */
    DOCKET.forEach(function(it){
      var c=courseById[it.course];
      idx.push({ kind:'Assignment', name:it.title, sub:c.name+' · '+it.due,
        where:'Docket', go:function(){ showScreen('assignments'); } });
    });
    /* announcements */
    BULLETINS.forEach(function(b){
      var c=courseById[b.course];
      idx.push({ kind:'Bulletin', name:b.head, sub:c.name+' · '+b.teacher+' · '+b.date,
        where:'Bulletins', go:function(){ showScreen('announcements'); } });
    });
    /* materials */
    MATERIALS.groups.forEach(function(g){
      g.rows.forEach(function(r){
        idx.push({ kind:'Material', name:r.name, sub:r.kind+' · '+g.title,
          where:'Materials', go:function(){ state.matSel=r.id; save(); renderMaterials(); showScreen('materials'); } });
      });
    });
    return idx;
  }
  var PAL_INDEX = null;

  var palSel=0, palMatches=[];
  function palRender(q){
    var box=$('#pal-results'); box.innerHTML='';
    q=(q||'').trim().toLowerCase();
    PAL_INDEX = PAL_INDEX || buildIndex();
    palMatches = !q ? PAL_INDEX.slice() : PAL_INDEX.filter(function(it){
      return (it.name+' '+it.sub+' '+it.kind+' '+it.where).toLowerCase().indexOf(q)>=0;
    });
    $('#pal-count').textContent = palMatches.length+' of '+PAL_INDEX.length;
    if(!palMatches.length){
      box.appendChild(el('div','pal__empty','Nothing in the index answers to that. Try a course, a date, or a screen.'));
      return;
    }
    if(palSel>=palMatches.length) palSel=palMatches.length-1;
    if(palSel<0) palSel=0;
    /* group by kind, preserving order */
    var lastKind=null;
    palMatches.forEach(function(it, i){
      if(it.kind!==lastKind){ box.appendChild(el('div','pal__group', esc(it.kind+'s'))); lastKind=it.kind; }
      var row=el('div','pal__row'+(i===palSel?' pal__row--sel':''));
      row.setAttribute('data-i', i);
      row.innerHTML='<div><span class="pal__name">'+esc(it.name)+'</span>'+
        '<span class="pal__sub">'+esc(it.sub)+'</span></div>'+
        '<span class="pal__where">'+esc(it.where)+'</span>';
      box.appendChild(row);
    });
    var sel=box.querySelector('.pal__row--sel');
    if(sel && sel.scrollIntoView) sel.scrollIntoView({ block:'nearest' });
  }
  function palOpen(){
    closeOverlays();
    PAL_INDEX = buildIndex();   /* rebuild each open so live data is current */
    palSel=0;
    var f=$('#pal-field'); f.value='';
    palRender('');
    $('#pal-scrim').classList.add('ov-scrim--on');
    $('#pal-scrim').setAttribute('aria-hidden','false');
    setTimeout(function(){ try{ f.focus(); }catch(e){} }, 20);
  }
  function palClose(){ $('#pal-scrim').classList.remove('ov-scrim--on'); $('#pal-scrim').setAttribute('aria-hidden','true'); }
  function palChoose(i){
    var it=palMatches[i]; if(!it) return;
    palClose();
    it.go();
  }
  $('#pal-field').addEventListener('input', function(){ palSel=0; palRender(this.value); });
  $('#pal-field').addEventListener('keydown', function(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); palSel=Math.min(palSel+1, palMatches.length-1); palRender(this.value); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); palSel=Math.max(palSel-1, 0); palRender(this.value); }
    else if(e.key==='Enter'){ e.preventDefault(); palChoose(palSel); }
    else if(e.key==='Escape'){ e.preventDefault(); palClose(); }
  });
  $('#pal-results').addEventListener('click', function(e){
    var r=e.target.closest('[data-i]'); if(!r) return; palChoose(+r.getAttribute('data-i'));
  });
  $('#pal-scrim').addEventListener('mousedown', function(e){ if(e.target===this) palClose(); });
  $('#mh-search').addEventListener('click', palOpen);

  /* shortcuts help */
  function helpOpen(){ closeOverlays(); $('#help-scrim').classList.add('ov-scrim--on'); $('#help-scrim').setAttribute('aria-hidden','false'); }
  function helpClose(){ $('#help-scrim').classList.remove('ov-scrim--on'); $('#help-scrim').setAttribute('aria-hidden','true'); }
  $('#help-close').addEventListener('click', helpClose);
  $('#help-scrim').addEventListener('mousedown', function(e){ if(e.target===this) helpClose(); });

  function anyOverlayOpen(){ return !!$('.ov-scrim--on'); }
  function closeOverlays(){ palClose(); helpClose(); }

  /* cycle "looks" — apple → halo → slate → forge → carbon → apple */
  var EDITION_CYCLE=['apple','halo','slate','friendly','carbon'];
  var EDITION_CYCLE_FILE={ apple:'mockup-app-apple.html', halo:'mockup-app-halo.html', slate:'mockup-app-slate.html', friendly:'mockup-app-forge.html', carbon:'mockup-app-carbon.html' };
  function cycleEdition(){
    var i=EDITION_CYCLE.indexOf('slate');
    var next=EDITION_CYCLE[(i+1)%EDITION_CYCLE.length];
    try{ localStorage.setItem('bsgy-edition', next); }catch(e){}
    var file=EDITION_CYCLE_FILE[next];
    if(file){ window.location.href=file; }
  }

  /* global keyboard: g-then-letter, ⌘K, ?, Esc */
  var gPending=false, gTimer=null;
  function typingInField(t){
    if(!t) return false;
    var tag=(t.tagName||'').toLowerCase();
    return tag==='input'||tag==='textarea'||t.isContentEditable;
  }
  document.addEventListener('keydown', function(e){
    /* ⌘K / Ctrl+K — works even in fields */
    if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); palOpen(); TOUR.note('cmdk'); return; }
    /* Esc closes any overlay; if the tour is running and no overlay is open, Esc skips it */
    if(e.key==='Escape'){
      if(anyOverlayOpen()){ e.preventDefault(); closeOverlays(); return; }
      if(TOUR.isOn()){ e.preventDefault(); TOUR.skip(); return; }
      return;
    }
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    /* don't hijack typing inside fields or while an overlay/game owns the keys */
    if(typingInField(e.target)) return;
    if(anyOverlayOpen()) return;
    /* '?' help */
    if(e.key==='?'){ e.preventDefault(); helpOpen(); TOUR.note('help'); return; }
    /* '\' — cycle to the next edition ("look") */
    if(e.key==='\\'){ e.preventDefault(); if(!TOUR.isOn()) cycleEdition(); return; }
    /* 'g' then a letter */
    if(gPending){
      var dest=SCREEN_KEY[e.key.toLowerCase()];
      gPending=false; if(gTimer){ clearTimeout(gTimer); gTimer=null; }
      if(dest){ e.preventDefault(); showScreen(dest); TOUR.note('nav'); }
      return;
    }
    if(e.key==='g'||e.key==='G'){ gPending=true; gTimer=setTimeout(function(){ gPending=false; }, 1200); }
  });

  /* ============================================================
     ADDED — FIRST-RUN GUIDED TUTORIAL ("The Reader's Guide")
     A coachmark tour: ruled callout points at the real UI element,
     a spotlight dims the rest, with Back / Next / Skip + progress.
     Strictly black & white; survives the inverted dark theme.
     ============================================================ */
  var WELCOME_KEY='bsgy-slate-welcomed';
  var TOUR = (function(){
    var root=$('#tour'), card=$('#tour-card'), spot=$('#tour-spot');
    var elNo=$('#tour-no'), elKick=$('#tour-kicker'), elHead=$('#tour-head'),
        elText=$('#tour-text'), elProg=$('#tour-prog'), elTicks=$('#tour-ticks'),
        btnBack=$('#tour-back'), btnNext=$('#tour-next'), btnSkip=$('#tour-skip');
    var i=0, on=false, repositionRAF=null;

    /* Each step: target selector (or null = centred intro/finish), where the
       callout sits, the screen it lives on, copy, and optional interactivity. */
    var STEPS=[
      { target:null, screen:'overview', kicker:'Slate Edition · The Demo Issue',
        head:'A reader’s <em>guide</em>.',
        body:['This is the demo issue: the figures — 96.2% overall, a 3.94 average, six courses — are sample copy. The live edition is laid over your real Schoology and sets the same record.',
              'The dress is yours to choose. In <span class="key">Settings</span> you may switch the house style — Apple, Halo, Slate, or Friendly. Seven short notes follow; read on, or skip at any time.'] },
      { target:'#nav', screen:'overview', side:'bottom',
        kicker:'Getting About', head:'The <em>table of contents</em>.',
        body:['The nav runs the length of the masthead. Click any section to turn to it — or, for the keyboard reader, press <span class="key">g</span> then a letter: <span class="key">o</span> overview, <span class="key">g</span> grades, <span class="key">a</span> assignments, <span class="key">c</span> calendar, <span class="key">n</span> bulletins, <span class="key">m</span> materials, <span class="key">e</span> games, <span class="key">s</span> settings.',
              'Try it now, then continue.'],
        listen:'nav', ackHead:'— noted. Navigation works.' },
      { target:'#mh-search', screen:'overview', side:'bottom', align:'end',
        kicker:'The Index', head:'Search <em>everything</em>.',
        body:['Press <span class="key">⌘K</span> (<span class="key">Ctrl+K</span> on Windows) to open the index. It searches courses, assignments, bulletins, materials, and screens; press <span class="key">↵</span> on a result to turn straight to it.',
              'Open it now to see.'],
        listen:'cmdk', ackHead:'— the index is open.' },
      { target:'#mh-search', screen:'overview', side:'bottom', align:'end',
        kicker:'The Full Key', head:'Press <em>?</em> for the list.',
        body:['Every shortcut is set down on one ruled card. Press <span class="key">?</span> to call it up; press <span class="key">Esc</span> to put it away.',
              'Press <span class="key">?</span> now.'],
        listen:'help', ackHead:'— the full key is shown.' },
      { target:'#nav [data-nav="grades"]', screen:'overview', side:'bottom',
        kicker:'The Ledger', head:'Grades, set in <em>columns</em>.',
        body:['Turn to <span class="key">Grades</span> and select a course from the rail. Each course opens its own ledger — categories, weights, and a grade-over-term figure plotted in a single ink.'] },
      { target:'#nav [data-nav="arcade"]', screen:'overview', side:'bottom',
        kicker:'The Idle Minute', head:'Four <em>games</em>.',
        body:['Under <span class="key">Games</span> this edition keeps four: a <strong>Typing Test</strong>, an <strong>Anagram</strong> drawn from the term’s vocabulary, <strong>Tic-Tac-Toe</strong> against a CPU that does not blunder, and a <strong>Word Search</strong>. Each keeps a best score, locally.'] },
      { target:null, screen:'overview', center:true,
        kicker:'In Closing', head:'You are <em>set</em>.',
        body:['Keep this card to hand. The whole key sits one keystroke away under <span class="key">?</span>, and this guide can be replayed any time from <strong>Settings → The Reader’s Guide</strong>.'],
        sheet:[
          ['Go to a section', [['g'],['then','o g a c n m e r s']]],
          ['Open search', [['⌘K']]],
          ['Shortcuts help', [['?']]],
          ['Close any overlay', [['Esc']]]
        ] },
    ];

    function isOn(){ return on; }

    function setProgress(){
      elProg.textContent=(i+1)+' / '+STEPS.length;
      elTicks.innerHTML='';
      for(var k=0;k<STEPS.length;k++){
        var t=el('span','tour__tick'+(k===i?' tour__tick--on':(k<i?' tour__tick--done':'')));
        elTicks.appendChild(t);
      }
    }

    function buildSheet(rows){
      var wrap=el('div','tour__sheet');
      rows.forEach(function(r){
        var row=el('div','tour__srow');
        row.appendChild(el('span','tour__swhat', esc(r[0])));
        var keys=el('span','tour__skeys');
        r[1].forEach(function(grp){
          if(grp[0]==='then'){ keys.appendChild(el('span','then','then')); keys.appendChild(el('span','key', esc(grp[1]))); }
          else keys.appendChild(el('span','key', esc(grp[0])));
        });
        row.appendChild(keys); wrap.appendChild(row);
      });
      return wrap;
    }

    /* place the callout relative to the spotlight target, clamped on-screen */
    function position(step){
      var pad=10, m=12; /* spotlight padding, viewport margin */
      var vw=window.innerWidth, vh=window.innerHeight;
      var centered = step.center || !step.target;
      if(centered){
        root.classList.add('tour--center');
        card.removeAttribute('data-arrow');
        card.style.top=''; card.style.left='';
        spot.style.display='none';
        return;
      }
      root.classList.remove('tour--center');
      spot.style.display='block';
      var tgt=$(step.target);
      if(!tgt){ /* fall back to centred */ root.classList.add('tour--center'); spot.style.display='none'; card.removeAttribute('data-arrow'); return; }
      var r=tgt.getBoundingClientRect();
      /* spotlight rect */
      var sx=Math.max(2, r.left-pad), sy=Math.max(2, r.top-pad);
      var sw=Math.min(vw-4, r.width+pad*2), sh=r.height+pad*2;
      if(sy+sh>vh-2) sh=vh-2-sy;
      spot.style.left=sx+'px'; spot.style.top=sy+'px';
      spot.style.width=sw+'px'; spot.style.height=sh+'px';

      /* measure the card */
      card.style.left='0px'; card.style.top='0px';
      var cw=card.offsetWidth, ch=card.offsetHeight;

      var side=step.side||'bottom';
      /* if not enough room below, flip above */
      if(side==='bottom' && (sy+sh+12+ch > vh-m) && (sy-12-ch > m)) side='top';
      if(side==='top' && (sy-12-ch < m) && (sy+sh+12+ch < vh-m)) side='bottom';

      var cx, cy, arrow, axis;
      if(side==='bottom' || side==='top'){
        /* horizontal align under/over the target */
        var anchorX = (step.align==='end') ? (sx+sw - cw) : (step.align==='center' ? (sx+sw/2 - cw/2) : sx);
        cx=Math.max(m, Math.min(anchorX, vw-m-cw));
        if(side==='bottom'){ cy=sy+sh+12; arrow='top'; } else { cy=sy-12-ch; arrow='bottom'; }
        /* arrow x relative to card, pointing at target centre */
        var tcx=sx+sw/2; axis=Math.max(14, Math.min(tcx-cx-11, cw-36));
        card.style.setProperty('--ax', axis+'px');
        card.setAttribute('data-arrow', arrow);
      } else {
        /* left / right of target */
        var anchorY=sy;
        cy=Math.max(m, Math.min(anchorY, vh-m-ch));
        if(side==='right'){ cx=sx+sw+12; arrow='left'; } else { cx=sx-12-cw; arrow='right'; }
        cx=Math.max(m, Math.min(cx, vw-m-cw));
        var tcy=sy+sh/2; var ay=Math.max(14, Math.min(tcy-cy-11, ch-36));
        card.style.setProperty('--ay', ay+'px');
        card.setAttribute('data-arrow', arrow);
      }
      card.style.left=cx+'px'; card.style.top=cy+'px';
    }

    function render(){
      var step=STEPS[i];
      /* make sure the target's screen is showing */
      if(step.screen && state.screen!==step.screen) showScreen(step.screen);
      setProgress();
      elNo.textContent='No. '+(i+1);
      elKick.textContent=step.kicker||'';
      elHead.innerHTML=step.head||'';
      elText.innerHTML='';
      (step.body||[]).forEach(function(p){ elText.appendChild(el('p','tour__text', p)); });
      if(step.sheet) elText.appendChild(buildSheet(step.sheet));
      /* footer buttons */
      btnBack.style.visibility = (i===0) ? 'hidden' : 'visible';
      btnNext.textContent = (i===STEPS.length-1) ? 'Done' : 'Next';
      btnSkip.style.display = (i===STEPS.length-1) ? 'none' : '';
      /* place it (after layout settles) */
      requestAnimationFrame(function(){ position(step); });
    }

    function go(n){
      if(n<0) n=0; if(n>STEPS.length-1) n=STEPS.length-1;
      i=n; render();
    }
    function next(){ if(i>=STEPS.length-1){ finish(); } else go(i+1); }
    function back(){ go(i-1); }

    /* an interactive step heard the key/click it was waiting for */
    function note(kind){
      if(!on) return;
      var step=STEPS[i];
      if(step.listen && step.listen===kind){
        /* acknowledge in place, then advance shortly so they see it worked */
        var p=elText.querySelector('.tour__text:last-child');
        if(p && !p.querySelector('.did')){
          var b=el('span','did', esc(step.ackHead||'— done.')); p.appendChild(document.createElement('br')); p.appendChild(b);
        }
        setTimeout(function(){ if(on && i<STEPS.length-1){ closeOverlays(); next(); } }, 900);
      }
    }

    function open(reset){
      on=true; root.classList.add('tour--on'); root.setAttribute('aria-hidden','false');
      go(reset===false ? i : 0);
      window.addEventListener('resize', onReflow, true);
      window.addEventListener('scroll', onReflow, true);
    }
    function onReflow(){
      if(!on) return;
      if(repositionRAF) cancelAnimationFrame(repositionRAF);
      repositionRAF=requestAnimationFrame(function(){ position(STEPS[i]); });
    }
    function shut(){
      on=false; root.classList.remove('tour--on'); root.setAttribute('aria-hidden','true');
      window.removeEventListener('resize', onReflow, true);
      window.removeEventListener('scroll', onReflow, true);
    }
    function markSeen(){ try{ localStorage.setItem(WELCOME_KEY,'1'); }catch(e){} }
    function finish(){ markSeen(); shut(); }
    function skip(){ markSeen(); shut(); }

    function maybeShowFirstRun(){
      var seen; try{ seen=localStorage.getItem(WELCOME_KEY); }catch(e){ seen='1'; }
      if(seen) return;
      open(true);
    }
    function start(){ open(true); }

    /* wiring */
    btnNext.addEventListener('click', next);
    btnBack.addEventListener('click', back);
    btnSkip.addEventListener('click', skip);
    /* clicking the dim veil on a centred step does nothing destructive; ignore */

    return { isOn:isOn, note:note, skip:skip, finish:finish,
             start:start, maybeShowFirstRun:maybeShowFirstRun };
  })();

  /* relaunch entries */
  var takeTourBtn=$('#take-tour'); if(takeTourBtn) takeTourBtn.addEventListener('click', function(){ TOUR.start(); });
  var helpTourBtn=$('#help-take-tour'); if(helpTourBtn) helpTourBtn.addEventListener('click', function(){ helpClose(); TOUR.start(); });

  /* ============================================================
     ADDED — EXPORT OVERVIEW AS PNG (foreignObject -> canvas -> dataURL)
     Falls back to print ("Save as PDF") if the canvas would taint.
     Output is strictly B&W (we render onto the page's own ink/paper).
     ============================================================ */
  (function wireExport(){
    var btn=$('#export-overview'); if(!btn) return;
    var note=$('#export-note');
    function setNote(t){ if(note) note.textContent=t; }
    var origNote = note ? note.textContent : '';

    function inlineStyleSnapshot(node){
      /* clone the overview and inline computed styles so the SVG is self-contained */
      var clone=node.cloneNode(true);
      function walk(src, dst){
        var cs=getComputedStyle(src);
        var props=['font-family','font-size','font-weight','font-style','letter-spacing',
          'line-height','color','background-color','text-transform','text-align',
          'border-top','border-bottom','border-left','border-right','padding','margin',
          'display','grid-template-columns','gap','text-decoration','font-variant-numeric'];
        var s='';
        props.forEach(function(p){ var v=cs.getPropertyValue(p); if(v) s+=p+':'+v+';'; });
        dst.setAttribute('style', (dst.getAttribute('style')||'')+s);
        var sc=src.children, dc=dst.children;
        for(var i=0;i<sc.length;i++){ if(dc[i]) walk(sc[i], dc[i]); }
      }
      walk(node, clone);
      return clone;
    }

    function doExport(){
      var src=$('#s-overview');
      if(!src){ return printFallback(); }
      try{
        var rect=src.getBoundingClientRect();
        var w=Math.max(700, Math.ceil(rect.width));
        var h=Math.max(400, Math.ceil(src.scrollHeight));
        var paper=getComputedStyle(document.body).backgroundColor || '#fff';
        var clone=inlineStyleSnapshot(src);
        clone.style.width=w+'px';
        var xml=new XMLSerializer().serializeToString(clone);
        var html='<div xmlns="http://www.w3.org/1999/xhtml" style="width:'+w+'px;background:'+paper+';padding:24px;">'+xml+'</div>';
        var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+(h+48)+'">'+
          '<foreignObject width="100%" height="100%">'+html+'</foreignObject></svg>';
        var blob=new Blob([svg], { type:'image/svg+xml;charset=utf-8' });
        var url=URL.createObjectURL(blob);
        var img=new Image();
        img.onload=function(){
          try{
            var scale=2;
            var canvas=document.createElement('canvas');
            canvas.width=w*scale; canvas.height=(h+48)*scale;
            var cx=canvas.getContext('2d');
            cx.scale(scale,scale);
            cx.fillStyle=paper; cx.fillRect(0,0,w,h+48);
            cx.drawImage(img,0,0);
            URL.revokeObjectURL(url);
            var data;
            try{ data=canvas.toDataURL('image/png'); }
            catch(taint){ setNote('Canvas blocked — opening print instead.'); return printFallback(); }
            var a=document.createElement('a');
            a.href=data; a.download='better-sgy-overview-'+TODAY.y+'-'+('0'+(TODAY.m+1)).slice(-2)+'-'+('0'+TODAY.d).slice(-2)+'.png';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setNote('Saved as PNG · '+longDate(dayAt(0)));
            setTimeout(function(){ setNote(origNote); }, 3200);
          }catch(err){ setNote('Image export failed — opening print.'); printFallback(); }
        };
        img.onerror=function(){ URL.revokeObjectURL(url); setNote('SVG render failed — opening print.'); printFallback(); };
        img.src=url;
      }catch(e){ printFallback(); }
    }
    function printFallback(){
      window.print();
    }
    btn.addEventListener('click', doExport);
  })();

  /* ============================================================
     NOSTALGIA — the archive. Term snapshots filed to localStorage,
     read back as ruled back issues. Strictly B&W; deltas via glyphs.
     ============================================================ */
  var NOSTALGIA = (function(){
    var NS_KEY = 'bsgy-slate-snapshots';
    var CURRENT = {
      id:'fr-s2',
      term:'Freshman · Semester 2',
      year:'2025–2026',
      overall:96.2,
      courses:[
        { name:'Algebra 2 / Trig', pct:97.4, ltr:'A' },
        { name:'Biology',          pct:96.7, ltr:'A' },
        { name:'French 1',         pct:96.5, ltr:'A' },
        { name:'Drama',            pct:90.3, ltr:'A−' },
        { name:'Literature',       pct:94.1, ltr:'A' },
        { name:'PE 9',             pct:99.1, ltr:'A' }
      ]
    };
    /* pre-seed: one past issue, filed Jan 2026 */
    var SEED = [{
      id:'fr-s1',
      term:'Freshman · Semester 1',
      year:'2025–2026',
      overall:94.8,
      filed:'January 14, 2026',
      courses:[
        { name:'Algebra 2 / Trig', pct:95.0, ltr:'A' },
        { name:'Biology',          pct:93.5, ltr:'A' },
        { name:'French 1',         pct:92.0, ltr:'A' },
        { name:'Drama',            pct:96.2, ltr:'A' },
        { name:'Literature',       pct:91.0, ltr:'A−' },
        { name:'PE 9',             pct:99.0, ltr:'A' }
      ]
    }];

    var openId = null;

    function load(){
      var raw=null;
      try{ raw = localStorage.getItem(NS_KEY); }catch(e){}
      if(raw){
        try{ var parsed = JSON.parse(raw); if(Array.isArray(parsed)) return parsed; }catch(e){}
      }
      /* first run — seed and persist */
      saveAll(SEED.slice());
      return SEED.slice();
    }
    function saveAll(list){ try{ localStorage.setItem(NS_KEY, JSON.stringify(list)); }catch(e){} }

    /* newest first: by filed timestamp if present, else keep insertion */
    function sorted(list){
      return list.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    }

    function todayFiled(){
      var d=new Date();
      return MONTH_NAMES[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();
    }

    function capture(){
      var list = load();
      var existing = null;
      for(var i=0;i<list.length;i++){ if(list[i].id===CURRENT.id){ existing=list[i]; break; } }
      var entry = {
        id: CURRENT.id,
        term: CURRENT.term,
        year: CURRENT.year,
        overall: CURRENT.overall,
        filed: todayFiled(),
        ts: Date.now(),
        courses: CURRENT.courses.map(function(c){ return { name:c.name, pct:c.pct, ltr:c.ltr }; })
      };
      if(existing){
        for(var k in entry){ existing[k]=entry[k]; }
      } else {
        list.push(entry);
      }
      saveAll(list);
      render();
      if(state.settings.notify){
        pushPing({ glyph:'※', lead:(existing?'Re-filed':'Filed')+' · '+CURRENT.term, sub:CURRENT.overall.toFixed(1)+'% · added to the archive' });
      }
    }

    function del(id){
      var list = load().filter(function(s){ return s.id!==id; });
      saveAll(list);
      if(openId===id){ openId=null; closeView(); }
      render();
    }

    function deltaGlyph(now, prev){
      if(prev==null) return '';
      var d = +(now - prev).toFixed(1);
      if(d>0) return '<span class="issue__delta issue__delta--up">▲ '+d.toFixed(1)+' pts</span>';
      if(d<0) return '<span class="issue__delta issue__delta--down">▼ '+Math.abs(d).toFixed(1)+' pts</span>';
      return '<span class="issue__delta">— level</span>';
    }

    function courseSummary(courses){
      return courses.map(function(c){
        return '<span class="ic">'+esc(c.name)+' '+c.pct.toFixed(1)+'</span>';
      }).join('<span class="sep">·</span>');
    }

    function render(){
      var box=$('#nos-archive'); if(!box) return;
      var list = sorted(load());
      $('#nos-count').textContent = list.length+(list.length===1?' issue on file':' issues on file');
      box.innerHTML='';
      if(!list.length){
        box.appendChild(el('div','empty','No issues filed yet. Capture this term to start the archive.'));
        return;
      }
      list.forEach(function(s, i){
        /* delta vs the next-older issue in the list (chronological neighbour) */
        var older = list[i+1];
        var delta = older ? deltaGlyph(s.overall, older.overall) : '<span class="issue__delta">earliest on file</span>';
        var row = el('div','issue');
        row.innerHTML =
          '<div class="issue__no">No.&nbsp;'+(list.length-i)+'</div>'+
          '<div class="issue__main">'+
            '<div class="issue__term">'+esc(s.term)+'</div>'+
            '<div class="issue__filed">'+esc(s.year||'')+' · filed '+esc(s.filed||'—')+'</div>'+
            '<div class="issue__courses">'+courseSummary(s.courses)+'</div>'+
          '</div>'+
          '<div><div class="issue__pct">'+s.overall.toFixed(1)+'<span class="pp">%</span></div>'+delta+'</div>'+
          '<div class="issue__acts">'+
            '<button class="iact iact--solid" data-view="'+esc(s.id)+'" type="button">View</button>'+
            '<button class="iact" data-del="'+esc(s.id)+'" type="button">Delete</button>'+
          '</div>';
        box.appendChild(row);
      });
    }

    function viewIssue(id){
      var list = load();
      var s=null; for(var i=0;i<list.length;i++){ if(list[i].id===id){ s=list[i]; break; } }
      if(!s) return;
      openId = id;
      $('#nos-bi-title').innerHTML = esc(s.term)+' <em>— '+esc(s.year||'')+', filed '+esc(s.filed||'—')+'</em>';
      var rows=$('#nos-bi-rows'); rows.innerHTML='';
      s.courses.forEach(function(c, i){
        var r=el('div','birow');
        r.innerHTML =
          '<div class="birow__idx">'+(i+1)+'</div>'+
          '<div class="birow__name">'+esc(c.name)+'</div>'+
          '<div class="birow__pct">'+c.pct.toFixed(1)+'<span class="pp">%</span></div>'+
          '<div class="birow__ltr">'+esc(c.ltr)+'</div>';
        rows.appendChild(r);
      });
      var tot=el('div','birow birow--total');
      tot.innerHTML =
        '<div class="birow__idx"></div>'+
        '<div class="birow__name">Overall</div>'+
        '<div class="birow__pct">'+s.overall.toFixed(1)+'<span class="pp">%</span></div>'+
        '<div class="birow__ltr"></div>';
      rows.appendChild(tot);
      $('#nos-backissue').classList.add('backissue--on');
      $('#nos-backissue').scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
    function closeView(){ openId=null; var bi=$('#nos-backissue'); if(bi) bi.classList.remove('backissue--on'); }

    function init(){
      load();           /* ensures seed is written on first run */
      render();
      var cap=$('#nos-capture'); if(cap) cap.addEventListener('click', capture);
      var arch=$('#nos-archive');
      if(arch) arch.addEventListener('click', function(e){
        var v=e.target.closest('[data-view]');
        if(v){ viewIssue(v.getAttribute('data-view')); return; }
        var d=e.target.closest('[data-del]');
        if(d){ del(d.getAttribute('data-del')); return; }
      });
      var cl=$('#nos-bi-close'); if(cl) cl.addEventListener('click', closeView);
    }
    return { init:init };
  })();

  /* ============================================================
     LIVE DATA INJECTION (chrome.storage.local 'bsgy_live')
     Contract: { overall:number, term:string,
       courses:[{ name, teacher, pct, letter, trend('up'|'flat'|'down'), missing }] }
     Overrides the OVERVIEW screen only. Falls back to the sample
     data on ANY failure or when chrome.storage is unavailable
     (plain file:// demo). Everything is wrapped in try/catch so a
     failure can never blank the page.
     ============================================================ */
  function bsgyValidLive(d){
    return d && typeof d === "object"
      && typeof d.overall === "number"
      && Array.isArray(d.courses) && d.courses.length > 0;
  }
  /* synthesize a short rising/flat/falling series that ENDS at `pct` */
  function bsgySpark(pct, trend){
    var end = (typeof pct === "number") ? pct : 95;
    var d = trend === "up" ? 2.0 : trend === "down" ? -2.0 : 0;
    return [end-d, end-d*0.7, end-d*0.45, end-d*0.25, end-d*0.12, end-d*0.04, end];
  }
  /* mini sparkline (viewBox 0 0 120 34) — map pct (88..100) to y (30..4) */
  function bsgyMiniY(pct){
    var p = (typeof pct === "number") ? pct : 95;
    if(p < 88) p = 88; if(p > 100) p = 100;
    return Math.round((30 - (p - 88) / 12 * 26) * 10) / 10;
  }
  function bsgyMiniPolyline(series){
    var n = series.length;
    var xs = [];
    for(var i=0;i<n;i++){ xs.push(Math.round((2 + (118-2) * (i/(n-1)))*10)/10); }
    var pts = [];
    for(var j=0;j<n;j++){ pts.push(xs[j] + "," + bsgyMiniY(series[j])); }
    return { points: pts.join(" "), lastX: xs[n-1], lastY: bsgyMiniY(series[n-1]) };
  }
  /* big Fig.1 plate — map pct (88..100) to y (300..40), x evenly across 90..912 */
  function bsgyPlateY(pct){
    var p = (typeof pct === "number") ? pct : 95;
    if(p < 88) p = 88; if(p > 100) p = 100;
    return Math.round((300 - (p - 88) / 12 * 260) * 100) / 100;
  }

  /* rebuild the OVERVIEW course rows from COURSES + HISTORY (the rows
     are otherwise static HTML; this repaints them with live data) */
  function renderOverviewCourses(){
    var list = $('#ovClist'); if(!list) return;
    list.innerHTML = '';
    COURSES.forEach(function(c, i){
      var idx = (i+1 < 10 ? '0' : '') + (i+1);
      var trend = (c.trend === 'up' || c.trend === 'down') ? c.trend : 'flat';
      var word = TREND_WORD[trend] || TREND_WORD.flat;
      var aria = trend === 'up' ? 'Trending up' : trend === 'down' ? 'Declining' : 'Flat';
      var sp = bsgyMiniPolyline(HISTORY[c.id] || bsgySpark(c.grade, trend));
      var missHtml = (c.missing > 0)
        ? '<span class="tag">' + c.missing + ' Missing</span>'
        : '<span class="note-clean">no missing work</span>';
      var per = c.per || '';
      var subject = c.subject || '';
      var metaMid = (per || subject) ? (esc(per) + (per && subject ? ' · ' : '') + esc(subject)) : '';
      var art = el('article','course');
      art.setAttribute('data-course', c.id);
      art.setAttribute('role','link');
      art.setAttribute('tabindex','0');
      art.setAttribute('aria-label','Open ' + c.name + ' grades');
      art.innerHTML =
        '<div class="course__idx">' + idx + '</div>' +
        '<div class="course__main">' +
          '<div class="course__name">' + esc(c.name) + '</div>' +
          '<div class="course__meta"><span class="course__teacher">' + esc(c.teacher || '') + '</span>' +
            (metaMid ? '<span class="sep">·</span><span>' + metaMid + '</span>' : '') +
            '<span class="sep">·</span>' + missHtml + '</div>' +
        '</div>' +
        '<div class="course__trend">' +
          '<svg viewBox="0 0 120 34" preserveAspectRatio="none" role="img" aria-label="' + aria + '">' +
            '<polyline points="' + sp.points + '" fill="none" stroke="#000" stroke-width="1.5"/>' +
            '<circle cx="' + sp.lastX + '" cy="' + sp.lastY + '" r="2.4" fill="#000"/></svg>' +
          '<span class="trend__word">' + esc(word) + '</span>' +
        '</div>' +
        '<div class="course__pct">' + (Math.round(c.grade*10)/10) + '<span class="pp">%</span></div>' +
        '<div class="course__letter"><span class="ltr">' + esc(c.ltr || '') + '</span></div>';
      list.appendChild(art);
    });
    bindOverview();   /* re-wire click/keyboard handlers on the new rows */
  }

  /* repaint Fig.1 (overall series, dots, current-value label) from HISTORY.overall */
  function renderOverviewPlate(){
    var g = $('#ovPlateSeries'); if(!g) return;
    var s = HISTORY.overall || [];
    if(!s.length) return;
    var X0 = 90, X1 = 912, n = s.length;
    var xs = [];
    for(var i=0;i<n;i++){ xs.push(Math.round((X0 + (X1-X0) * (i/(n-1)))*100)/100); }
    var pts = [], dots = '';
    for(var j=0;j<n;j++){
      var y = bsgyPlateY(s[j]);
      pts.push(xs[j] + ',' + y);
      if(j < n-1) dots += '<circle class="dot-open" cx="' + xs[j] + '" cy="' + y + '" r="3.2"/>';
      else dots += '<circle class="dot-fill" cx="' + xs[j] + '" cy="' + y + '" r="4"/>';
    }
    var last = Math.round(s[n-1]*10)/10;
    var lastY = bsgyPlateY(s[n-1]);
    g.innerHTML =
      '<polyline class="series" points="' + pts.join(' ') + '"/>' +
      dots +
      '<text class="axislabel" x="900" y="' + (lastY - 9) + '" text-anchor="end" style="fill:#000">' + last + '%</text>';
  }

  function bsgyApplyLive(){
    try{
      if(!(window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get)) return;
      chrome.storage.local.get("bsgy_live", function(res){
        try{
          var live = res && res.bsgy_live;
          if(!bsgyValidLive(live)) return;   /* invalid → keep sample data */

          /* rebuild COURSES contents in place (mutate; other screens read it too) */
          var built = live.courses.map(function(c, i){
            var id = "lc" + i;
            var nm = String(c.name == null ? ("Course " + (i+1)) : c.name);
            var pct = (typeof c.pct === "number") ? c.pct : 0;
            var trend = (c.trend === "up" || c.trend === "down" || c.trend === "flat") ? c.trend : "flat";
            var miss = (typeof c.missing === "number" && c.missing >= 0) ? c.missing : 0;
            HISTORY[id] = bsgySpark(pct, trend);
            return {
              id:id,
              name:nm,
              teacher:String(c.teacher == null ? "" : c.teacher),
              per:"", subject:"",
              grade:pct,
              ltr:String(c.letter == null ? "" : c.letter),
              trend:trend,
              missing:miss
            };
          });
          COURSES.length = 0;
          built.forEach(function(c){ COURSES.push(c); });
          courseById = {}; COURSES.forEach(function(c){ courseById[c.id] = c; });
          HISTORY.overall = bsgySpark(typeof live.overall === "number" ? live.overall : 0, "up");

          /* hero + masthead overall % */
          var ov = (typeof live.overall === "number") ? live.overall : null;
          var ovRound = (ov != null) ? (Math.round(ov*10)/10) : null;
          var ovEl = $("#ovOverall");
          if(ovEl && ovRound != null) ovEl.innerHTML = ovRound + '<span class="pct">%</span>';
          var ctx = $("#ctxOverall"); if(ctx && ovRound != null) ctx.textContent = ovRound + "%";

          /* term / context lines + course count */
          var nC = COURSES.length;
          var courseWord = nC + " course" + (nC === 1 ? "" : "s");
          var cap = $("#ovHeroCaption");
          if(cap) cap.textContent = "Weighted across " + courseWord + (live.term ? (", " + live.term) : ", semester to date");
          var cnt = $("#ovCourseCount");
          if(cnt) cnt.textContent = courseWord + (live.term ? (" · " + live.term) : "");

          /* total missing flag */
          var totalMissing = COURSES.reduce(function(s,c){ return s + (c.missing||0); }, 0);
          var missStat = $("#ovMissingStat");
          if(missStat) missStat.textContent = totalMissing;
          var missSub = $("#ovMissingSub");
          if(missSub){
            var nCourses = COURSES.filter(function(c){ return (c.missing||0) > 0; }).length;
            missSub.textContent = totalMissing === 0 ? "Nothing outstanding"
              : ("Across " + nCourses + " course" + (nCourses === 1 ? "" : "s"));
          }

          /* repaint overview pieces with live data */
          renderOverviewCourses();
          renderOverviewPlate();
        }catch(e){ /* keep sample data already on screen */ }
      });
    }catch(e){ /* chrome.storage missing/blocked → sample data stays */ }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  /* MOCKUP_CONVENTIONS: declare the active edition on load */
  try{ localStorage.setItem('bsgy-edition','slate'); }catch(e){}

  applyBodyClasses();
  bindOverview();
  renderGrades();
  renderDocket();
  renderCalendar();
  renderBulletins();
  renderMaterials();
  renderSettings();
  ARCADE.init();
  NOSTALGIA.init();
  renderBestScores();
  renderSfxSwitch();

  /* MOCKUP_CONVENTIONS deep-linking: ?screen=<id> and ?game=<id> */
  var QS = (function(){
    var o={}; var s=(location.search||'').replace(/^\?/,'');
    s.split('&').forEach(function(p){ if(!p) return; var kv=p.split('='); o[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||''); });
    return o;
  })();
  var bootScreen = QS.screen && SCREENS.indexOf(QS.screen)>=0 ? QS.screen : state.screen;
  showScreen(bootScreen);

  /* override OVERVIEW with real injected grades if present (async; sample
     data is already rendered above so any failure leaves the sample in place) */
  bsgyApplyLive();
  if(QS.game){
    showScreen('arcade');
    if(QS.game==='daily') ARCADE.openDaily();
    else ARCADE.openGame(QS.game);
  }

  /* No auto-launch — the guided tour only auto-runs in the Apple edition.
     It stays available here via Settings → "Take the tour". */
})();
