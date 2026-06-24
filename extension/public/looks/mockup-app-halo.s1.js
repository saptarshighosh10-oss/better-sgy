
  (function () {
    "use strict";

    // ============================================================
    // CANONICAL DATA (MOCKUP_DATA.md) — today = Mon Jun 22, 2026
    // ============================================================
    var STORE = "halo.";

    // ---- LIVE "TODAY" --------------------------------------------------
    // Everything that used to be hardcoded to Jun 22 2026 now derives from
    // the real current date so the dashboard always reads sensibly.
    var NOW = new Date();
    var MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function dateFromOffset(days) { var d = new Date(NOW); d.setDate(d.getDate() + days); return d; }
    function isoOf(d) {
      return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }
    function shortOf(d) { return MONTHS_SHORT[d.getMonth()] + " " + d.getDate(); }
    var TODAY_ISO = isoOf(NOW);
    var TODAY_SHORT = shortOf(NOW);

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var el = function (tag, cls, html) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    }); };

    var COURSES = [
      { id: "alg", name: "Algebra 2 / Trig", teacher: "Mr. Stubbs", per: "P1", grade: 97.4, ltr: "A", trend: "up", missing: 0 },
      { id: "bio", name: "Biology", teacher: "Ms. Carrington", per: "P2", grade: 96.7, ltr: "A", trend: "flat", missing: 1 },
      { id: "fre", name: "French 1", teacher: "Mme. Laurent", per: "P4", grade: 96.5, ltr: "A", trend: "up", missing: 0 },
      { id: "dra", name: "Drama", teacher: "Mr. Ellison", per: "P5", grade: 90.3, ltr: "A−", trend: "down", missing: 1 },
      { id: "lit", name: "Literature", teacher: "Ms. Howe", per: "P6", grade: 94.1, ltr: "A", trend: "up", missing: 0 },
      { id: "pe",  name: "PE 9", teacher: "Coach Bryant", per: "P7", grade: 99.1, ltr: "A", trend: "flat", missing: 0 }
    ];
    var byId = {}; COURSES.forEach(function (c) { byId[c.id] = c; });

    // weekly grade history (8 points)
    var HIST = {
      overall: [94.2, 94.6, 94.9, 95.3, 95.6, 95.9, 96.0, 96.2],
      alg: [92.0, 93.0, 94.0, 95.0, 95.5, 96.3, 97.0, 97.4],
      bio: [96.0, 96.4, 96.2, 96.8, 96.5, 96.9, 96.6, 96.7],
      fre: [91.0, 92.5, 93.0, 94.0, 94.8, 95.5, 96.1, 96.5],
      dra: [95.0, 94.5, 94.0, 93.2, 92.5, 91.6, 91.0, 90.3],
      lit: [90.0, 90.8, 91.5, 92.0, 92.6, 93.2, 93.7, 94.1],
      pe:  [98.5, 98.7, 98.6, 99.0, 98.9, 99.1, 99.0, 99.1]
    };
    // last point = today; earlier points are weekly steps back from today
    var WEEK_LABELS = (function () {
      var labels = [];
      for (var i = 7; i >= 1; i--) labels.push(shortOf(dateFromOffset(-7 * i)));
      labels.push(TODAY_SHORT);
      return labels;
    })();

    // per-course gradebooks
    var GB = {
      alg: {
        cats: [["Tests", 40, 96.8], ["Quizzes", 25, 97.5], ["Homework", 20, 98.9], ["Participation", 15, 100]],
        rows: [
          { name: "Unit 6 Test", cat: "Tests", date: "Jun 12", score: "96/100", pct: "96%" },
          { name: "Trig Identities Quiz", cat: "Quizzes", date: "Jun 9", score: "19/20", pct: "95%" },
          { name: "HW 7.1–7.2", cat: "Homework", date: "Jun 17", score: "10/10", pct: "100%" },
          { name: "HW 7.3 problems", cat: "Homework", date: TODAY_SHORT, score: "—/10", pct: "Due", due: true },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "15/15", pct: "100%" }
        ]
      },
      bio: {
        cats: [["Tests", 40, 95.0], ["Labs", 25, 97.2], ["Homework", 20, 98.5], ["Participation", 15, 100]],
        rows: [
          { name: "Cell Energetics Lab", cat: "Labs · not submitted", date: shortOf(dateFromOffset(-3)), score: "0/25", pct: "Missing", miss: true },
          { name: "Enzymes Problem Set", cat: "Homework", date: "Jun 16", score: "18/20", pct: "90%" },
          { name: "Photosynthesis Test", cat: "Tests", date: "Jun 11", score: "95/100", pct: "95%" },
          { name: "Mitosis Quiz", cat: "Labs", date: "Jun 5", score: "24/25", pct: "96%" },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "15/15", pct: "100%" }
        ]
      },
      fre: {
        cats: [["Tests", 40, 95.5], ["Speaking", 25, 97.0], ["Homework", 20, 98.0], ["Participation", 15, 100]],
        rows: [
          { name: "Unité 5 Exam", cat: "Tests", date: "Jun 12", score: "95/100", pct: "95%" },
          { name: "Dialogue oral", cat: "Speaking", date: "Jun 10", score: "29/30", pct: "97%" },
          { name: "Devoirs 5.3", cat: "Homework", date: "Jun 16", score: "10/10", pct: "100%" },
          { name: "Vocab Quiz", cat: "Tests", date: "Jun 6", score: "48/50", pct: "96%" },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "15/15", pct: "100%" }
        ]
      },
      dra: {
        cats: [["Performance", 40, 91.0], ["Reflections", 25, 85.0], ["Participation", 20, 95.0], ["Projects", 15, 90.0]],
        rows: [
          { name: "Monologue Reflection", cat: "Reflections · not submitted", date: shortOf(dateFromOffset(-4)), score: "0/20", pct: "Missing", miss: true },
          { name: "Scene Performance", cat: "Performance", date: "Jun 15", score: "88/100", pct: "88%" },
          { name: "Character Study", cat: "Projects", date: "Jun 9", score: "27/30", pct: "90%" },
          { name: "Theater Journal", cat: "Reflections", date: "Jun 4", score: "17/20", pct: "85%" },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "19/20", pct: "95%" }
        ]
      },
      lit: {
        cats: [["Essays", 40, 93.0], ["Reading Quizzes", 25, 94.5], ["Homework", 20, 95.0], ["Participation", 15, 98.0]],
        rows: [
          { name: "Chapter 4 Response", cat: "Homework", date: TODAY_SHORT, score: "—/10", pct: "Due", due: true },
          { name: "Theme Essay", cat: "Essays", date: "Jun 13", score: "92/100", pct: "92%" },
          { name: "Reading Quiz 8", cat: "Reading Quizzes", date: "Jun 10", score: "19/20", pct: "95%" },
          { name: "Annotation HW", cat: "Homework", date: "Jun 16", score: "10/10", pct: "100%" },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "14/15", pct: "93%" }
        ]
      },
      pe: {
        cats: [["Fitness", 40, 99.0], ["Skills", 25, 99.5], ["Participation", 35, 99.0]],
        rows: [
          { name: "Fitness Log Wk 14", cat: "Fitness", date: "Jun 13", score: "20/20", pct: "100%" },
          { name: "Mile Run", cat: "Fitness", date: "Jun 9", score: "49/50", pct: "98%" },
          { name: "Volleyball Skills", cat: "Skills", date: "Jun 6", score: "25/25", pct: "100%" },
          { name: "Participation Wk 14", cat: "Participation", date: "Jun 13", score: "99/100", pct: "99%" }
        ]
      }
    };

    // pristine snapshot of the gradebooks for the What-if "Reset" affordance
    var GB_ORIG = JSON.parse(JSON.stringify(GB));

    // cross-course assignments agenda — dates derived from real today.
    // 2 due today, 2 recently missing, several upcoming, a few done.
    var ASN = [
      { title: "HW 7.3 problems", cid: "alg", due: TODAY_SHORT, state: "due", today: true },
      { title: "Chapter 4 Response", cid: "lit", due: TODAY_SHORT, state: "due", today: true },
      { title: "Cell Energetics Lab", cid: "bio", due: "Was " + shortOf(dateFromOffset(-3)), state: "missing" },
      { title: "Monologue Reflection", cid: "dra", due: "Was " + shortOf(dateFromOffset(-4)), state: "missing" },
      { title: "Book club notes", cid: "lit", due: shortOf(dateFromOffset(2)), state: "upcoming" },
      { title: "Ecology reading", cid: "bio", due: shortOf(dateFromOffset(3)), state: "upcoming" },
      { title: "Unité 6 vocab", cid: "fre", due: shortOf(dateFromOffset(4)), state: "upcoming" },
      { title: "Fitness Log Wk 15", cid: "pe", due: shortOf(dateFromOffset(4)), state: "upcoming" },
      { title: "Unit 7 Test", cid: "alg", due: shortOf(dateFromOffset(7)), state: "upcoming" },
      { title: "Unit 6 Test", cid: "alg", due: "Submitted " + shortOf(dateFromOffset(-10)), state: "done", score: "96/100" },
      { title: "Dialogue oral", cid: "fre", due: "Submitted " + shortOf(dateFromOffset(-12)), state: "done", score: "29/30" },
      { title: "Enzymes Problem Set", cid: "bio", due: "Submitted " + shortOf(dateFromOffset(-6)), state: "done", score: "18/20" }
    ];

    // calendar events keyed by real ISO date, positioned relative to today.
    var EVENTS = (function () {
      var ev = {};
      function add(off, list) { ev[isoOf(dateFromOffset(off))] = list; }
      add(-13, [{ t: "Trig Identities Quiz", c: "alg" }, { t: "Mile Run", c: "pe" }]);
      add(-11, [{ t: "Photosynthesis Test", c: "bio" }]);
      add(-10, [{ t: "Unit 6 Test", c: "alg" }, { t: "Unité 5 Exam", c: "fre" }]);
      add(-7,  [{ t: "Scene Performance", c: "dra" }]);
      add(-4,  [{ t: "Monologue Reflection due", c: "dra", miss: true }]);
      add(-3,  [{ t: "Cell Energetics Lab due", c: "bio", miss: true }]);
      add(0,   [{ t: "HW 7.3", c: "alg", today: true }, { t: "Chapter 4 Response", c: "lit", today: true }]);
      add(2,   [{ t: "Book club notes", c: "lit" }]);
      add(3,   [{ t: "Ecology reading", c: "bio" }]);
      add(4,   [{ t: "Unité 6 vocab", c: "fre" }, { t: "Fitness Log Wk 15", c: "pe" }]);
      add(7,   [{ t: "Unit 7 Test", c: "alg" }]);
      return ev;
    })();

    var ANN = [
      { id: 0, who: "Ms. Carrington", cid: "bio", time: "2h ago", title: "Lab safety quiz Friday", body: "Quick 10-question quiz on lab safety at the start of class Friday. Review the handout." },
      { id: 1, who: "Coach Bryant", cid: "pe", time: "5h ago", title: "Bring sneakers Thursday", body: "Outdoor unit starts Thursday, weather permitting. Closed-toe shoes required." },
      { id: 2, who: "Mr. Ellison", cid: "dra", time: "Yesterday", title: "Monologue sign-ups open", body: "Pick your performance slot for next week. Sign-up sheet on the board and in Materials." },
      { id: 3, who: "Ms. Howe", cid: "lit", time: "Yesterday", title: "Chapter 4 response due Monday", body: "Two paragraphs, focus on the narrator's voice. Submit through Schoology." },
      { id: 4, who: "Mr. Stubbs", cid: "alg", time: "2 days ago", title: "Unit 7 starts", body: "We begin Unit 7 today. HW 7.3 is due Monday; Unit 7 test is the 29th." },
      { id: 5, who: "Mme. Laurent", cid: "fre", time: "3 days ago", title: "Vocab list for Unité 6", body: "New list posted. Quiz the 26th. Practice with the audio in Materials." }
    ];

    var MATERIALS = [
      { type: "folder", name: "Unit 5 — Cell Energetics", meta: "Folder · 6 items", size: "Updated Jun 16" },
      { type: "pdf", name: "Cell Energetics Lab handout.pdf", meta: "PDF · assignment brief", size: "412 KB" },
      { type: "pdf", name: "Enzymes notes.pdf", meta: "PDF · notes", size: "288 KB" },
      { type: "link", name: "Khan Academy: Cellular respiration", meta: "Link · external", size: "khanacademy.org" },
      { type: "doc", name: "Lab report template.docx", meta: "DOC · template", size: "44 KB" },
      { type: "pdf", name: "Photosynthesis study guide.pdf", meta: "PDF · review", size: "196 KB" }
    ];

    var NOTIF_TEXT = [
      { sig: "up",   title: "Biology rose 1.2%", body: "95.5% → 96.7%" },
      { sig: "",     title: "Graded · Cell Energetics Lab", body: "90% (Biology)" },
      { sig: "",     title: "New assignment · Monologue reflection", body: "Drama" }
    ];

    // SVG icons
    var IC = {
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
      doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
      link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
    };
    var STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.2l5.9-.9z"/></svg>';

    var trendWord = function (t) { return t === "up" ? "Trending up" : t === "down" ? "Declining" : "Flat"; };

    // calm empty-state glyphs (monochrome, currentColor)
    var EMPTY_IC = {
      check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
      calm:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 13.5h8"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
      bell:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>'
    };

    // ============================================================
    // persistence helpers
    // ============================================================
    function load(k, d) {
      try { var v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    }
    function save(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) {} }

    // ============================================================
    // NAV
    // ============================================================
    var nav = $("#nav");
    function goScreen(id) {
      // leaving Games: tear down any active game (stops its rAF/timers) and return to arcade home
      if (id !== "games" && window.__haloGames && window.__haloGames._showHome) {
        try { window.__haloGames._showHome(); } catch (e) {}
      }
      $$(".nav-item", nav).forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-screen") === id); });
      $$(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + id); });
    }
    nav.addEventListener("click", function (e) {
      var item = e.target.closest(".nav-item"); if (!item) return;
      goScreen(item.getAttribute("data-screen"));
    });

    // ============================================================
    // LINE CHART builder (monochrome, with hover tooltip)
    // x range, y range 88..100
    // ============================================================
    var YMIN = 88, YMAX = 100;

    function chartGeometry(w, h, padL, padR, padT, padB) {
      return {
        x: function (i, n) { return padL + (w - padL - padR) * (n <= 1 ? 0 : i / (n - 1)); },
        y: function (v) { return padT + (h - padT - padB) * (1 - (v - YMIN) / (YMAX - YMIN)); }
      };
    }
    function ptsFor(arr, g, n) {
      return arr.map(function (v, i) { return g.x(i, n) + "," + g.y(v).toFixed(1); }).join(" ");
    }

    // Build the overview overall chart
    function renderOverviewChart() {
      var svg = $("#ovChart");
      var W = 740, H = 180, padL = 40, padR = 40, padT = 20, padB = 30;
      var g = chartGeometry(W, H, padL, padR, padT, padB);
      var n = HIST.overall.length;
      var grids = [100, 96, 92, 88];
      var s = "";
      grids.forEach(function (gv, idx) {
        var yy = g.y(gv).toFixed(1);
        s += '<line class="' + (idx === grids.length - 1 ? "axis" : "grid") + '" x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '"/>';
        s += '<text class="ylab" x="' + (gv === 100 ? 8 : 12) + '" y="' + (parseFloat(yy) + 4).toFixed(1) + '">' + gv + '</text>';
      });
      s += '<polyline class="line" points="' + ptsFor(HIST.overall, g, n) + '"/>';
      var lx = g.x(n - 1, n), ly = g.y(HIST.overall[n - 1]);
      s += '<circle class="endpt-up" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.2"/>';
      // x labels (derived from live week labels)
      var xl = [[0, WEEK_LABELS[0]], [2, WEEK_LABELS[2]], [4, WEEK_LABELS[4]], [6, WEEK_LABELS[6]], [7, WEEK_LABELS[7]]];
      xl.forEach(function (p, idx) {
        var anchor = idx === 0 ? "" : idx === xl.length - 1 ? ' text-anchor="end"' : ' text-anchor="middle"';
        s += '<text class="xlab" x="' + g.x(p[0], n).toFixed(1) + '" y="' + (H - 8) + '"' + anchor + '>' + p[1] + '</text>';
      });
      // hover hotspots + point
      s += '<circle class="hpt" id="ovHpt" r="3.4"/>';
      HIST.overall.forEach(function (v, i) {
        s += '<rect class="hov" data-i="' + i + '" x="' + (g.x(i, n) - 14).toFixed(1) + '" y="' + padT + '" width="28" height="' + (H - padT - padB) + '"/>';
      });
      svg.innerHTML = s;
      attachHover(svg, $(".chart", svg.parentNode) || svg.parentNode, HIST.overall, g, n, "ovHpt", "Overall");
    }

    function attachHover(svg, chartBox, arr, g, n, hptId, label) {
      var tip = chartBox.querySelector(".chart-tip");
      if (!tip) { tip = el("div", "chart-tip"); chartBox.appendChild(tip); }
      var hpt = svg.querySelector("#" + hptId);
      $$(".hov", svg).forEach(function (r) {
        r.addEventListener("mouseenter", function () {
          var i = +r.getAttribute("data-i");
          var cx = g.x(i, n), cy = g.y(arr[i]);
          if (hpt) { hpt.setAttribute("cx", cx); hpt.setAttribute("cy", cy); hpt.style.opacity = "1"; }
          // convert svg coords to px within chartBox
          var box = svg.getBoundingClientRect();
          var px = box.left - chartBox.getBoundingClientRect().left + (cx / 740) * box.width;
          // svg height varies; we positioned via viewBox height; approximate vertical
          var vbH = svg.viewBox.baseVal.height || 180;
          var py = box.top - chartBox.getBoundingClientRect().top + (cy / vbH) * box.height;
          tip.style.left = px + "px";
          tip.style.top = py + "px";
          tip.textContent = WEEK_LABELS[i] + " · " + arr[i].toFixed(1) + "%";
          tip.classList.add("show");
        });
        r.addEventListener("mouseleave", function () {
          if (hpt) hpt.style.opacity = "0";
          tip.classList.remove("show");
        });
      });
    }

    // ============================================================
    // OVERVIEW course list
    // ============================================================
    function cssVar(name, fallback) {
      try {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      } catch (e) { return fallback; }
    }
    function spark(arr, up) {
      var n = arr.length, w = 84, h = 28, pad = 2;
      var lo = Math.min.apply(null, arr), hi = Math.max.apply(null, arr), rng = (hi - lo) || 1;
      var col = up ? cssVar("--signal-up", "#2f8f5b") : cssVar("--spark-mute", "#9a9a91");
      var pts = arr.map(function (v, i) {
        var x = pad + (w - pad * 2) * (i / (n - 1));
        var y = (h - 4) - ((v - lo) / rng) * (h - 8) + 2;
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      var last = pts[pts.length - 1].split(",");
      return '<svg width="84" height="28" viewBox="0 0 84 28" fill="none"><polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2" fill="' + col + '"/></svg>';
    }

    function renderOverviewCourses() {
      var wrap = $("#ovCourses");
      wrap.innerHTML = "";
      COURSES.forEach(function (c) {
        var up = c.trend === "up";
        var flag = c.missing ? '<span class="flag"><span class="fdot"></span>' + c.missing + ' missing</span>' : "";
        var a = el("article", "course");
        a.setAttribute("data-course", c.id);
        a.style.cursor = "pointer";
        a.innerHTML =
          '<div class="who"><div class="cname">' + esc(c.name) + flag + '</div><div class="teacher">' + esc(c.teacher) + ' · ' + c.per + '</div></div>' +
          '<div class="spark">' + spark(HIST[c.id], up) + '</div>' +
          '<div class="trend' + (up ? " up" : "") + '">' + trendWord(c.trend) + '</div>' +
          '<div class="gradecell"><div class="pct">' + c.grade.toFixed(1) + '%</div><div class="letter">' + c.ltr + '</div></div>';
        wrap.appendChild(a);
      });
    }
    $("#ovCourses").addEventListener("click", function (e) {
      var a = e.target.closest(".course"); if (!a) return;
      selectGrade(a.getAttribute("data-course"));
      goScreen("grades");
    });

    // ============================================================
    // GRADES
    // ============================================================
    var curGrade = "bio";
    var legendOff = {}; // course id -> hidden
    var whatIf = {};    // course id -> What-if editing mode on/off

    function renderRail() {
      var rail = $("#gradeRail");
      rail.innerHTML = "";
      COURSES.forEach(function (c) {
        var flag = c.missing ? '<span class="flag"><span class="fdot"></span>' + c.missing + '</span>' : "";
        var b = el("button", "rail-item" + (c.id === curGrade ? " on" : ""));
        b.setAttribute("data-grade", c.id);
        b.innerHTML = '<div class="rn">' + esc(c.name) + flag + '</div>' +
          '<div class="rt">' + esc(c.teacher) + '</div>' +
          '<div class="rg">' + c.grade.toFixed(1) + '% · ' + c.ltr + '</div>';
        rail.appendChild(b);
      });
    }
    $("#gradeRail").addEventListener("click", function (e) {
      var b = e.target.closest(".rail-item"); if (!b) return;
      selectGrade(b.getAttribute("data-grade"));
    });
    function selectGrade(id) { curGrade = id; renderRail(); renderGradePane(); }

    // ============================================================
    // WHAT-IF GRADE CALCULATOR — recalc engine
    // ============================================================
    // Leading category name: "Labs · not submitted" -> "Labs"
    function catKey(name) {
      var s = String(name == null ? "" : name);
      var i = s.indexOf("·"); // middle dot used in the data (e.g. "Labs · not submitted")
      if (i >= 0) s = s.slice(0, i);
      return s.trim();
    }
    // Parse "96/100" or "—/10" or "0/25" -> { earned: number|null, max: number|null }
    function parseScore(score) {
      var s = String(score == null ? "" : score);
      var parts = s.split("/");
      var e = parts[0] != null ? parts[0].trim() : "";
      var m = parts[1] != null ? parts[1].trim() : "";
      var en = (e === "" || e === "—" || e === "-") ? null : parseFloat(e);
      var mn = (m === "" || m === "—" || m === "-") ? null : parseFloat(m);
      if (en != null && isNaN(en)) en = null;
      if (mn != null && isNaN(mn)) mn = null;
      return { earned: en, max: mn };
    }
    // A row is graded only with a numeric earned AND numeric max > 0.
    function rowGraded(r) {
      var p = parseScore(r.score);
      return p.earned != null && p.max != null && p.max > 0;
    }
    function rowPct(r) {
      var p = parseScore(r.score);
      return (p.earned / p.max) * 100;
    }
    // Recompute a course's category averages (mutating gb.cats[i][2]) and its
    // weighted course grade (mutating COURSES/byId). Returns the course grade.
    function recomputeCourse(id) {
      var gb = GB[id];
      var c = byId[id];
      var sums = {}, counts = {};
      gb.rows.forEach(function (r) {
        if (!rowGraded(r)) return;
        var k = catKey(r.cat);
        if (!(k in sums)) { sums[k] = 0; counts[k] = 0; }
        sums[k] += rowPct(r);
        counts[k] += 1;
      });
      var wTotal = 0, wAvg = 0;
      gb.cats.forEach(function (cat) {
        var k = catKey(cat[0]);
        if (counts[k] > 0) {
          var avg = sums[k] / counts[k];
          cat[2] = avg;              // update category average shown in panel
          wTotal += cat[1];
          wAvg += cat[1] * avg;
        } else {
          cat[2] = null;             // no graded rows -> skipped / blank
        }
      });
      var grade = wTotal > 0 ? (wAvg / wTotal) : 0;
      c.grade = grade;
      return grade;
    }
    function overallGrade() {
      if (!COURSES.length) return 0;
      var sum = 0;
      COURSES.forEach(function (c) { sum += c.grade; });
      return sum / COURSES.length;
    }
    // Live-update the Overview overall number, its "now" chart point and chart.
    function updateOverall() {
      var ov = overallGrade();
      var ovStr = ov.toFixed(1);
      if (HIST.overall && HIST.overall.length) HIST.overall[HIST.overall.length - 1] = ov;
      var elOverall = $("#ovOverall");
      if (elOverall) elOverall.innerHTML = ovStr + '<span class="pct">%</span>';
      var elNow = $("#ovNow");
      if (elNow) elNow.textContent = ovStr + "% now";
      if ($("#ovChart")) renderOverviewChart();
      updateGpaPlanner();
    }

    // ============================================================
    // GPA PLANNER
    // ============================================================
    // Standard unweighted 4.0 mapping from a percent grade.
    function gpaPoints(pct) {
      if (pct == null || isNaN(pct)) return 0;
      if (pct >= 93) return 4.0;
      if (pct >= 90) return 3.7;
      if (pct >= 87) return 3.3;
      if (pct >= 83) return 3.0;
      if (pct >= 80) return 2.7;
      if (pct >= 77) return 2.3;
      if (pct >= 73) return 2.0;
      if (pct >= 70) return 1.7;
      if (pct >= 67) return 1.3;
      if (pct >= 63) return 1.0;
      if (pct >= 60) return 0.7;
      return 0.0;
    }
    // Letter label for a percent (for the per-row readout).
    function gpaLetter(pct) {
      if (pct == null || isNaN(pct)) return "—";
      if (pct >= 93) return "A";
      if (pct >= 90) return "A−";
      if (pct >= 87) return "B+";
      if (pct >= 83) return "B";
      if (pct >= 80) return "B−";
      if (pct >= 77) return "C+";
      if (pct >= 73) return "C";
      if (pct >= 70) return "C−";
      if (pct >= 67) return "D+";
      if (pct >= 63) return "D";
      if (pct >= 60) return "D−";
      return "F";
    }
    // course id -> projected percent (what-if override). Empty = use actual grade.
    var gpaWhatIf = {};
    // Effective projected percent for a course (override or live actual grade).
    function gpaProjPct(c) {
      return (c.id in gpaWhatIf) ? gpaWhatIf[c.id] : c.grade;
    }
    // Mean of per-course GPA points (equal weight per course).
    function computeGPA() {
      if (!COURSES.length) return 0;
      var sum = 0;
      COURSES.forEach(function (c) { sum += gpaPoints(gpaProjPct(c)); });
      return sum / COURSES.length;
    }
    // Smallest uniform % every course would need (capped 0..100) to reach a
    // target GPA, found by scanning candidate percents. null if unreachable
    // even at 100% (i.e. target above 4.0 * ... ), or already met.
    function gpaUniformNeeded(target) {
      var n = COURSES.length; if (!n) return null;
      // need average points >= target; pts is a step function of percent.
      // candidate percents are the lower edges of each band.
      var bands = [60, 63, 67, 70, 73, 77, 80, 83, 87, 90, 93];
      for (var i = 0; i < bands.length; i++) {
        if (gpaPoints(bands[i]) >= target - 1e-9) return bands[i];
      }
      return null; // not reachable (target > 4.0)
    }

    function renderGpaPlanner() {
      var wrap = $("#gpaCourses");
      if (!wrap) return;
      wrap.innerHTML = "";
      COURSES.forEach(function (c) {
        var row = el("div", "gpa-row");
        row.setAttribute("data-gpa", c.id);
        var proj = gpaProjPct(c);
        row.innerHTML =
          '<div class="gpa-cname">' + esc(c.name) +
            '<span class="gpa-edited" data-edited style="display:none">edited</span></div>' +
          '<div class="gpa-stepper">' +
            '<span class="gpa-step" data-step="-1" role="button" aria-label="Lower projected grade">−</span>' +
            '<input class="gpa-pinput" type="number" min="0" max="100" step="0.5" inputmode="decimal" ' +
              'value="' + (Math.round(proj * 10) / 10) + '" aria-label="' + esc(c.name) + ' projected grade percent">' +
            '<span class="gpa-step" data-step="1" role="button" aria-label="Raise projected grade">+</span>' +
          '</div>' +
          '<div class="gpa-pts">' +
            '<span class="gpa-ltr" data-ltr>' + gpaLetter(proj) + '</span>' +
            '<span class="gpa-num" data-pts>' + gpaPoints(proj).toFixed(1) + '</span>' +
          '</div>';
        wrap.appendChild(row);
      });
      var meta = $("#gpaCountMeta");
      if (meta) meta.textContent = COURSES.length + " course" + (COURSES.length === 1 ? "" : "s");
      updateGpaPlanner();
    }

    // Refresh GPA displays WITHOUT re-rendering inputs (preserves focus while typing).
    function updateGpaPlanner() {
      var gpa = computeGPA();
      var gStr = gpa.toFixed(2);
      var elV = $("#gpaValue"); if (elV) elV.textContent = gStr;
      var elTile = $("#ovGpaTile"); if (elTile) elTile.textContent = gStr;
      // per-row letter + points readouts
      COURSES.forEach(function (c) {
        var row = $('.gpa-row[data-gpa="' + c.id + '"]');
        if (!row) return;
        var proj = gpaProjPct(c);
        var ltr = row.querySelector("[data-ltr]");
        var pts = row.querySelector("[data-pts]");
        var ed = row.querySelector("[data-edited]");
        if (ltr) ltr.textContent = gpaLetter(proj);
        if (pts) pts.textContent = gpaPoints(proj).toFixed(1);
        if (ed) ed.style.display = (c.id in gpaWhatIf) ? "" : "none";
        // Sync a non-overridden, unfocused input to its live actual grade
        // (e.g. when the grade calculator changed it). Never touch a focused
        // field, so typing keeps focus.
        var pin = row.querySelector(".gpa-pinput");
        if (pin && !(c.id in gpaWhatIf) && document.activeElement !== pin) {
          pin.value = (Math.round(proj * 10) / 10);
        }
      });
      updateGpaTarget();
    }

    function updateGpaTarget() {
      var msg = $("#gpaTargetMsg"); if (!msg) return;
      var inp = $("#gpaTargetInput");
      var raw = inp ? inp.value.trim() : "";
      msg.classList.remove("good");
      if (raw === "") {
        msg.innerHTML = "Enter a target to see what it would take.";
        return;
      }
      var target = parseFloat(raw);
      if (isNaN(target)) { msg.innerHTML = "Enter a number between 0 and 4."; return; }
      if (target > 4) { msg.innerHTML = "A 4.0 is the maximum on this scale."; return; }
      if (target < 0) target = 0;
      var cur = computeGPA();
      if (cur >= target - 1e-9) {
        msg.classList.add("good");
        msg.innerHTML = "You’re already there — projected GPA is <span class=\"gpa-strong\">" +
          cur.toFixed(2) + "</span>, at or above your <span class=\"gpa-strong\">" + target.toFixed(2) + "</span> target.";
        return;
      }
      var need = gpaUniformNeeded(target);
      if (need == null) {
        msg.innerHTML = "A <span class=\"gpa-strong\">" + target.toFixed(2) +
          "</span> isn’t reachable on a 4.0 scale.";
        return;
      }
      msg.innerHTML = "To reach a <span class=\"gpa-strong\">" + target.toFixed(2) +
        "</span> GPA you’d need to average about <span class=\"gpa-strong\">" + need +
        "%</span> across all " + COURSES.length + " courses (each worth a " +
        gpaPoints(need).toFixed(1) + ").";
    }

    (function gpaPlannerWire() {
      var courses = $("#gpaCourses");
      if (courses) {
        // typing in a per-course projected % -> live update displays only
        courses.addEventListener("input", function (e) {
          var inp = e.target.closest(".gpa-pinput"); if (!inp) return;
          var row = inp.closest(".gpa-row"); if (!row) return;
          var id = row.getAttribute("data-gpa");
          var raw = inp.value.trim();
          if (raw === "") { delete gpaWhatIf[id]; updateGpaPlanner(); return; }
          var v = parseFloat(raw);
          if (isNaN(v)) return;
          v = Math.max(0, Math.min(100, v));
          gpaWhatIf[id] = v;
          updateGpaPlanner();
        });
        // +/- steppers
        courses.addEventListener("click", function (e) {
          var btn = e.target.closest(".gpa-step"); if (!btn) return;
          var row = btn.closest(".gpa-row"); if (!row) return;
          var id = row.getAttribute("data-gpa");
          var c = byId[id]; if (!c) return;
          var base = gpaProjPct(c);
          var v = Math.max(0, Math.min(100, base + parseInt(btn.getAttribute("data-step"), 10)));
          gpaWhatIf[id] = v;
          var pin = row.querySelector(".gpa-pinput");
          if (pin) pin.value = (Math.round(v * 10) / 10);
          updateGpaPlanner();
        });
      }
      var tgt = $("#gpaTargetInput");
      if (tgt) tgt.addEventListener("input", updateGpaTarget);
      var reset = $("#gpaReset");
      if (reset) reset.addEventListener("click", function () {
        gpaWhatIf = {};
        var t = $("#gpaTargetInput"); if (t) t.value = "";
        renderGpaPlanner(); // safe: rebuilds rows from actual grades, no input focused
      });
    })();
    function catAvgText(v) {
      if (v == null) return "—";
      return (v % 1 === 0 ? v : v.toFixed(1)) + "%";
    }
    // Recompute the current course and refresh only the grade DISPLAYS
    // (snapshot, chart "now", category avgs + bars, course chart svg, overall).
    // Leaves the assignment input fields untouched (preserves focus while typing).
    function whatIfRecalc() {
      var id = curGrade;
      var grade = recomputeCourse(id);
      var gStr = grade.toFixed(1);
      if (HIST[id] && HIST[id].length) HIST[id][HIST[id].length - 1] = grade;

      var elSnap = $("#gbSnapGrade");
      if (elSnap) elSnap.innerHTML = gStr + '<span class="pct">%</span>';
      var elNow = $("#gbChartNow");
      if (elNow) elNow.textContent = gStr + "% now";

      var gb = GB[id];
      gb.cats.forEach(function (cat, i) {
        var avgEl = $('#gbCatAvg' + i);
        if (avgEl) avgEl.textContent = catAvgText(cat[2]);
        var barEl = $('#gbCatBar' + i);
        if (barEl) barEl.style.width = (cat[2] == null ? 0 : Math.max(0, Math.min(100, cat[2]))) + '%';
      });

      // re-render the course "grade over time" chart in place
      var svg = $("#gbSvg");
      if (svg) {
        var ch = renderCourseChart();
        svg.innerHTML = ch.svg;
        var box = $("#gbChart");
        if (box) attachHover(svg, box, HIST[id], ch.g, ch.n, "gbHpt", byId[id].name);
      }

      // rail snapshot + overall
      renderRail();
      updateOverall();
    }

    function renderCourseChart() {
      var c = byId[curGrade];
      var W = 700, H = 200, padL = 44, padR = 40, padT = 22, padB = 32;
      var g = chartGeometry(W, H, padL, padR, padT, padB);
      var n = HIST[curGrade].length;
      var s = "";
      var grids = [100, 96, 92, 88];
      grids.forEach(function (gv, idx) {
        var yy = g.y(gv).toFixed(1);
        s += '<line class="' + (idx === grids.length - 1 ? "axis" : "grid") + '" x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '"/>';
        s += '<text class="ylab" x="' + (gv === 100 ? 10 : 16) + '" y="' + (parseFloat(yy) + 4).toFixed(1) + '">' + gv + '</text>';
      });
      // faint reference lines (other courses), respecting legend toggles
      COURSES.forEach(function (oc) {
        if (oc.id === curGrade) return;
        if (legendOff[oc.id]) return;
        s += '<polyline class="ref" points="' + ptsFor(HIST[oc.id], g, n) + '"/>';
      });
      // selected course
      if (!legendOff[curGrade]) {
        s += '<polyline class="line" points="' + ptsFor(HIST[curGrade], g, n) + '"/>';
        var lx = g.x(n - 1, n), ly = g.y(HIST[curGrade][n - 1]);
        var endCls = c.missing ? "endpt-miss" : (c.trend === "up" ? "endpt-up" : "endpt");
        s += '<circle class="' + endCls + '" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.4"/>';
      }
      // x labels (derived from live week labels)
      var xl = [[0, WEEK_LABELS[0]], [2, WEEK_LABELS[2]], [4, WEEK_LABELS[4]], [6, WEEK_LABELS[6]], [7, WEEK_LABELS[7]]];
      xl.forEach(function (p, idx) {
        var anchor = idx === 0 ? "" : idx === xl.length - 1 ? ' text-anchor="end"' : ' text-anchor="middle"';
        s += '<text class="xlab" x="' + g.x(p[0], n).toFixed(1) + '" y="' + (H - 8) + '"' + anchor + '>' + p[1] + '</text>';
      });
      s += '<circle class="hpt" id="gbHpt" r="3.4"/>';
      HIST[curGrade].forEach(function (v, i) {
        s += '<rect class="hov" data-i="' + i + '" x="' + (g.x(i, n) - 14).toFixed(1) + '" y="' + padT + '" width="28" height="' + (H - padT - padB) + '"/>';
      });

      // legend chips
      var legend = "";
      var order = [curGrade].concat(COURSES.map(function (x) { return x.id; }).filter(function (x) { return x !== curGrade; }));
      order.forEach(function (cid) {
        var cc = byId[cid];
        var cur = cid === curGrade;
        var miss = cc.missing ? '<span class="ldot miss" title="' + cc.missing + ' missing"></span>' : "";
        legend += '<span class="lk' + (cur ? " cur" : "") + (legendOff[cid] ? " off" : "") + '" data-leg="' + cid + '"><span class="ldash"></span>' + esc(cc.name) + ' ' + miss + '</span>';
      });

      return { svg: s, legend: legend, g: g, n: n, c: c };
    }

    function renderGradePane() {
      var c = byId[curGrade];
      var gb = GB[curGrade];
      var ch = renderCourseChart();
      var trendTxt = c.trend === "up" ? "Trending up this quarter" : c.trend === "down" ? "Declining this quarter" : "Flat this quarter";
      var sparkUp = c.trend === "up";

      var wi = !!whatIf[curGrade];

      var html = "";
      html += '<div class="gb-snapshot">';
      html += '  <div class="left">';
      html += '    <div class="gbteacher">' + esc(c.name) + ' · ' + esc(c.teacher) + ' · ' + c.per + '</div>';
      html += '    <div class="gbgrade" id="gbSnapGrade">' + c.grade.toFixed(1) + '<span class="pct">%</span></div>';
      html += '    <div class="gbsub">Letter ' + c.ltr + ' · ' + trendTxt + (c.missing ? ' · ' + c.missing + ' missing' : '') + '</div>';
      html += '  </div>';
      html += '  <div class="spark" style="width:120px;height:36px;">' + spark(HIST[curGrade], sparkUp).replace('width="84" height="28" viewBox="0 0 84 28"', 'width="120" height="36" viewBox="0 0 120 36"') + '</div>';
      html += '</div>';

      html += '<section class="chart" id="gbChart" aria-label="Course grade over time" style="margin-bottom:28px;">';
      html += '  <div class="chart-head"><span class="chart-title">' + esc(c.name) + ' · grade over time</span><span class="chart-now' + (c.trend === "up" ? " up" : "") + '" id="gbChartNow">' + c.grade.toFixed(1) + '% now</span></div>';
      html += '  <svg id="gbSvg" viewBox="0 0 700 200" role="img" aria-label="Line chart of ' + esc(c.name) + ' grade across semester 2">' + ch.svg + '</svg>';
      html += '  <div class="chart-legend" id="gbLegend" aria-label="Courses">' + ch.legend + '</div>';
      html += '</section>';

      html += '<div class="section-head" style="margin-top:0;"><h2>Categories</h2><span class="count">Weighted</span></div>';
      html += '<div class="panel cat-list">';
      gb.cats.forEach(function (cat, i) {
        html += '<div class="cat"><div><div class="cn">' + esc(cat[0]) + '</div><div class="cw">' + cat[1] + '% of grade</div></div>' +
          '<div class="bar"><span id="gbCatBar' + i + '" style="width:' + (cat[2] == null ? 0 : cat[2]) + '%"></span></div>' +
          '<div class="cavg" id="gbCatAvg' + i + '">' + catAvgText(cat[2]) + '</div></div>';
      });
      html += '</div>';

      // Assignments — with What-if toggle
      html += '<div class="section-head"><h2>Assignments</h2>';
      html += '<span class="wi-controls">';
      if (wi) {
        html += '<span class="wi-flag">What-if</span>';
        html += '<button class="btn wi-reset" id="gbWiReset" type="button">Reset</button>';
        html += '<button class="btn solid wi-toggle on" id="gbWiToggle" type="button">Done</button>';
      } else {
        html += '<span class="count" style="margin-right:auto;">' + gb.rows.length + '</span>';
        html += '<button class="btn wi-toggle" id="gbWiToggle" type="button">What-if</button>';
      }
      html += '</span></div>';

      html += '<div class="panel' + (wi ? ' wi-on' : '') + '" id="gbAsnPanel">';
      gb.rows.forEach(function (r, i) {
        if (wi) {
          var p = parseScore(r.score);
          html += '<div class="arow wi-row" data-i="' + i + '">' +
            '<div><div class="an">' + esc(r.name) + '</div><div class="ameta">' + esc(r.cat) + '</div></div>' +
            '<div class="adate">' + esc(r.date) + '</div>' +
            '<div class="wi-edit">' +
              '<input class="wi-num wi-earned" data-i="' + i + '" type="number" inputmode="decimal" step="any" min="0" aria-label="Earned points" value="' + (p.earned == null ? '' : p.earned) + '">' +
              '<span class="wi-slash">/</span>' +
              '<input class="wi-num wi-max" data-i="' + i + '" type="number" inputmode="decimal" step="any" min="0" aria-label="Max points" value="' + (p.max == null ? '' : p.max) + '">' +
            '</div>' +
            '<button class="wi-x" data-i="' + i + '" type="button" aria-label="Remove ' + esc(r.name) + '">×</button>' +
          '</div>';
        } else {
          var anCls = r.miss ? " miss" : "";
          var pctCls = r.miss ? " miss" : "";
          html += '<div class="arow"><div><div class="an' + anCls + '">' + esc(r.name) + '</div><div class="ameta">' + esc(r.cat) + '</div></div>' +
            '<div class="adate">' + esc(r.date) + '</div>' +
            '<div class="ascore">' + esc(r.score) + '</div>' +
            '<div class="apct' + pctCls + '">' + esc(r.pct) + '</div></div>';
        }
      });
      if (wi) {
        html += '<div class="arow wi-add">' +
          '<input class="wi-name" id="gbWiName" type="text" placeholder="New assignment name" aria-label="New assignment name">' +
          '<select class="wi-cat" id="gbWiCat" aria-label="Category">';
        gb.cats.forEach(function (cat) {
          html += '<option value="' + esc(cat[0]) + '">' + esc(cat[0]) + '</option>';
        });
        html += '</select>' +
          '<div class="wi-edit">' +
            '<input class="wi-num" id="gbWiEarned" type="number" inputmode="decimal" step="any" min="0" placeholder="0" aria-label="Earned points">' +
            '<span class="wi-slash">/</span>' +
            '<input class="wi-num" id="gbWiMax" type="number" inputmode="decimal" step="any" min="0" placeholder="100" aria-label="Max points">' +
          '</div>' +
          '<button class="btn solid wi-addbtn" id="gbWiAdd" type="button">+ Add</button>' +
        '</div>';
      }
      html += '</div>';

      $("#gradePane").innerHTML = html;

      // wire chart hover + legend
      var svg = $("#gbSvg"), box = $("#gbChart");
      attachHover(svg, box, HIST[curGrade], ch.g, ch.n, "gbHpt", c.name);
      $("#gbLegend").addEventListener("click", function (e) {
        var lk = e.target.closest(".lk"); if (!lk) return;
        var cid = lk.getAttribute("data-leg");
        legendOff[cid] = !legendOff[cid];
        renderGradePane(); // re-render chart with toggle applied
      });

      wireWhatIf();
    }

    // Wire the What-if calculator controls for the current Grades pane.
    function wireWhatIf() {
      var toggle = $("#gbWiToggle");
      if (toggle) {
        toggle.addEventListener("click", function () {
          whatIf[curGrade] = !whatIf[curGrade];
          renderGradePane(); // focus is on a button — safe to re-render
        });
      }
      if (!whatIf[curGrade]) return;

      var gb = GB[curGrade];

      // Reset: restore this course's gradebook from the pristine snapshot.
      var reset = $("#gbWiReset");
      if (reset) {
        reset.addEventListener("click", function () {
          GB[curGrade] = JSON.parse(JSON.stringify(GB_ORIG[curGrade]));
          recomputeCourse(curGrade);
          if (HIST[curGrade] && HIST[curGrade].length) HIST[curGrade][HIST[curGrade].length - 1] = byId[curGrade].grade;
          renderGradePane();
          updateOverall();
        });
      }

      // Live edits — update data + grade DISPLAYS only (keep inputs/focus intact).
      $$("#gbAsnPanel .wi-num.wi-earned, #gbAsnPanel .wi-num.wi-max").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = +this.getAttribute("data-i");
          var row = gb.rows[i]; if (!row) return;
          var p = parseScore(row.score);
          var earnedEl = $('.wi-earned[data-i="' + i + '"]', $("#gbAsnPanel"));
          var maxEl = $('.wi-max[data-i="' + i + '"]', $("#gbAsnPanel"));
          var eVal = earnedEl && earnedEl.value.trim() !== "" ? earnedEl.value.trim() : "—";
          var mVal = maxEl && maxEl.value.trim() !== "" ? maxEl.value.trim() : "—";
          row.score = eVal + "/" + mVal;
          // keep pct / miss flags coherent
          if (rowGraded(row)) { row.pct = Math.round(rowPct(row)) + "%"; row.miss = false; }
          else { row.pct = "Due"; row.miss = false; }
          whatIfRecalc();
        });
      });

      // Remove rows.
      $$("#gbAsnPanel .wi-x").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var i = +this.getAttribute("data-i");
          gb.rows.splice(i, 1);
          recomputeCourse(curGrade);
          if (HIST[curGrade] && HIST[curGrade].length) HIST[curGrade][HIST[curGrade].length - 1] = byId[curGrade].grade;
          renderGradePane(); // focus on a button — re-render full pane
          updateOverall();
        });
      });

      // Add assignment.
      var add = $("#gbWiAdd");
      if (add) {
        add.addEventListener("click", function () {
          var name = ($("#gbWiName").value || "").trim() || "New assignment";
          var cat = $("#gbWiCat").value;
          var eRaw = ($("#gbWiEarned").value || "").trim();
          var mRaw = ($("#gbWiMax").value || "").trim();
          var e = eRaw === "" ? "—" : eRaw;
          var m = mRaw === "" ? "—" : mRaw;
          var row = { name: name, cat: cat, date: "What-if", score: e + "/" + m };
          if (parseScore(row.score).earned != null && parseScore(row.score).max > 0) {
            row.pct = Math.round(rowPct(row)) + "%"; row.miss = false;
          } else { row.pct = "Due"; row.miss = false; }
          gb.rows.push(row);
          recomputeCourse(curGrade);
          if (HIST[curGrade] && HIST[curGrade].length) HIST[curGrade][HIST[curGrade].length - 1] = byId[curGrade].grade;
          renderGradePane(); // focus on a button — re-render full pane
          updateOverall();
        });
      }
    }

    // ============================================================
    // ASSIGNMENTS
    // ============================================================
    var asnFilter = "upcoming";
    var asnQuery = "";
    var asnDone = load("asnDone", {}); // title -> true

    function asnStateOf(a) {
      if (asnDone[a.title]) return "done";
      return a.state;
    }
    function pillFor(state) {
      if (state === "due") return '<span class="status-pill due">Due</span>';
      if (state === "missing") return '<span class="status-pill miss">Missing</span>';
      if (state === "done") return '<span class="status-pill done">Done</span>';
      return '<span class="status-pill">Upcoming</span>';
    }
    function dueFor(a, state) {
      if (state === "done" && a.state !== "done") return "Marked done";
      return a.due;
    }
    function renderAsnCounts() {
      var u = 0, m = 0, d = 0;
      ASN.forEach(function (a) {
        var st = asnStateOf(a);
        if (st === "done") d++;
        else if (st === "missing") m++;
        else u++; // upcoming + due treated as upcoming agenda
      });
      $$("#asnSeg button").forEach(function (b) {
        var f = b.getAttribute("data-filter");
        var lbl = f === "upcoming" ? "Upcoming" : f === "missing" ? "Missing" : "Done";
        var cnt = f === "upcoming" ? u : f === "missing" ? m : d;
        b.textContent = lbl + " · " + cnt;
      });
      // sidebar badge = missing count
      var badge = $('.nav-item[data-screen="assignments"] .badge');
      if (badge) badge.textContent = m;
    }
    function renderAsn() {
      var list = $("#asnList");
      list.innerHTML = "";
      var q = asnQuery.toLowerCase();
      var shown = 0;
      ASN.forEach(function (a) {
        var st = asnStateOf(a);
        var inFilter = (asnFilter === "upcoming" && (st === "upcoming" || st === "due")) ||
                       (asnFilter === "missing" && st === "missing") ||
                       (asnFilter === "done" && st === "done");
        if (!inFilter) return;
        if (q && (a.title + " " + byId[a.cid].name).toLowerCase().indexOf(q) < 0) return;
        shown++;
        var c = byId[a.cid];
        var titleCls = st === "missing" ? " miss" : "";
        var dueCls = a.today && st !== "done" ? " today" : "";
        var dueTxt = a.today && st === "due" ? "Due today" : dueFor(a, st);
        var row = el("div", "asn");
        var right = pillFor(st);
        // mark-done affordance for upcoming/due/missing (not already done)
        if (st !== "done") {
          right = '<button class="mark" data-title="' + esc(a.title) + '">Mark done</button>' + pillFor(st);
        }
        row.innerHTML =
          '<span class="course-tag">' + esc(c.name.split(" ")[0]) + '</span>' +
          '<div class="atitle' + titleCls + '">' + esc(a.title) + '</div>' +
          '<div class="adue' + dueCls + '">' + esc(dueTxt) + (st === "done" && a.score ? ' · ' + esc(a.score) : "") + '</div>' +
          right;
        list.appendChild(row);
      });
      var emptyEl = $("#asnEmpty");
      if (shown) {
        emptyEl.style.display = "none";
      } else {
        emptyEl.style.display = "block";
        var t, sub, ic;
        if (q) {
          ic = EMPTY_IC.search; t = "No matches"; sub = "Nothing matches “" + esc(asnQuery) + "” in this filter.";
        } else if (asnFilter === "missing") {
          ic = EMPTY_IC.check; t = "All caught up"; sub = "No missing work. Nicely kept.";
        } else if (asnFilter === "done") {
          ic = EMPTY_IC.check; t = "Nothing submitted yet"; sub = "Completed work will collect here.";
        } else {
          ic = EMPTY_IC.calm; t = "Nothing upcoming"; sub = "No assignments on the horizon.";
        }
        emptyEl.className = "empty";
        emptyEl.innerHTML = '<div class="e-ic">' + ic + '</div><div class="e-t">' + t + '</div><div class="e-s">' + sub + '</div>';
      }
      renderAsnCounts();
    }
    $("#asnSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("#asnSeg button").forEach(function (x) { x.classList.toggle("on", x === b); });
      asnFilter = b.getAttribute("data-filter");
      renderAsn();
    });
    $("#asnSearch").addEventListener("input", function (e) { asnQuery = e.target.value; renderAsn(); });
    $("#asnList").addEventListener("click", function (e) {
      var m = e.target.closest(".mark"); if (!m) return;
      asnDone[m.getAttribute("data-title")] = true;
      save("asnDone", asnDone);
      renderAsn();
    });

    // ============================================================
    // CALENDAR
    // ============================================================
    var TODAY = { y: NOW.getFullYear(), m: NOW.getMonth(), d: NOW.getDate() };
    var calY = TODAY.y, calM = TODAY.m;
    var calSel = null; // ISO string
    var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    function iso(y, m, d) {
      return y + "-" + ("0" + (m + 1)).slice(-2) + "-" + ("0" + d).slice(-2);
    }
    function evDotClass(e) { return e.miss ? "miss" : e.up ? "up" : ""; }

    function renderCalendar() {
      $("#calMonth").textContent = MONTHS[calM] + " " + calY;
      var first = new Date(calY, calM, 1);
      var startDow = first.getDay(); // 0 Sun
      var daysInMonth = new Date(calY, calM + 1, 0).getDate();
      var prevDays = new Date(calY, calM, 0).getDate();
      var weeks = $("#calWeeks");
      weeks.innerHTML = "";
      var cellIdx = 0;
      for (var w = 0; w < 6; w++) {
        var row = el("div", "cal-row");
        var hasRealDay = false;
        for (var dow = 0; dow < 7; dow++) {
          var cell = el("div", "cal-cell");
          var dayNum, out = false, y = calY, mo = calM;
          if (cellIdx < startDow) { dayNum = prevDays - startDow + 1 + cellIdx; out = true; mo = calM - 1; if (mo < 0) { mo = 11; y--; } }
          else if (cellIdx >= startDow + daysInMonth) { dayNum = cellIdx - startDow - daysInMonth + 1; out = true; mo = calM + 1; if (mo > 11) { mo = 0; y++; } }
          else { dayNum = cellIdx - startDow + 1; hasRealDay = true; }
          if (out) cell.classList.add("out");
          var key = iso(y, mo, dayNum);
          var isToday = (!out && y === TODAY.y && mo === TODAY.m && dayNum === TODAY.d);
          if (isToday) cell.classList.add("today");
          if (calSel === key) cell.classList.add("sel");
          var evs = out ? null : EVENTS[key];
          var inner = '<div class="dnum">' + dayNum + '</div>';
          if (evs && evs.length) {
            cell.classList.add("has-ev");
            cell.setAttribute("data-day", key);
            evs.slice(0, 2).forEach(function (ev) {
              inner += '<div class="cal-ev"><span class="edot ' + evDotClass(ev) + '"></span>' + esc(ev.t) + '</div>';
            });
          }
          cell.innerHTML = inner;
          row.appendChild(cell);
          cellIdx++;
        }
        weeks.appendChild(row);
        if (cellIdx >= startDow + daysInMonth) break;
      }
      renderCalDay();
    }
    function renderCalDay() {
      var panel = $("#calDay");
      if (!calSel || !EVENTS[calSel]) { panel.style.display = "none"; return; }
      var parts = calSel.split("-");
      var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      var head = DOW[d.getDay()] + ", " + MONTHS[+parts[1] - 1] + " " + (+parts[2]);
      var html = '<div class="cal-day-head">' + head + '</div>';
      EVENTS[calSel].forEach(function (ev) {
        var c = byId[ev.c];
        var tag = ev.miss ? '<span class="ctag miss">Missing</span>' : ev.today ? '<span class="ctag">Due today</span>' : '<span class="ctag">' + c.name.split(" ")[0] + '</span>';
        html += '<div class="cal-day-row"><span class="cdot ' + evDotClass(ev) + '"></span>' + esc(ev.t) + ' · ' + esc(c.name) + tag + '</div>';
      });
      panel.innerHTML = html;
      panel.style.display = "block";
    }
    $("#calWeeks").addEventListener("click", function (e) {
      var cell = e.target.closest(".cal-cell.has-ev"); if (!cell) return;
      calSel = cell.getAttribute("data-day");
      renderCalendar();
    });
    $("#calPrev").addEventListener("click", function () { calM--; if (calM < 0) { calM = 11; calY--; } calSel = null; renderCalendar(); });
    $("#calNext").addEventListener("click", function () { calM++; if (calM > 11) { calM = 0; calY++; } calSel = null; renderCalendar(); });
    $("#calToday").addEventListener("click", function () { calY = TODAY.y; calM = TODAY.m; calSel = null; renderCalendar(); });

    // ============================================================
    // ANNOUNCEMENTS
    // ============================================================
    var starred = load("starred", { 0: false, 3: false }); // default none
    function initials(name) {
      var p = name.replace(/^(Mr|Ms|Mrs|Mme|Coach|M)\.?\s+/i, "").split(/\s+/);
      return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
    }
    function renderAnn() {
      var list = $("#annList");
      list.innerHTML = "";
      if (!ANN.length) {
        list.innerHTML = '<div class="empty"><div class="e-ic">' + EMPTY_IC.bell + '</div>' +
          '<div class="e-t">No announcements</div>' +
          '<div class="e-s">When a teacher posts, it will appear here.</div></div>';
        return;
      }
      ANN.forEach(function (a) {
        var c = byId[a.cid];
        var art = el("article", "ann");
        art.innerHTML =
          '<div class="av">' + initials(a.who) + '</div>' +
          '<div><div class="meta"><span class="who">' + esc(a.who) + '</span> · ' + esc(c.name) + ' · ' + esc(a.time) + '</div>' +
          '<div class="atitle">' + esc(a.title) + '</div>' +
          '<div class="snip">' + esc(a.body) + '</div></div>' +
          '<button class="star' + (starred[a.id] ? " on" : "") + '" data-id="' + a.id + '" aria-label="Star">' + STAR + '</button>';
        list.appendChild(art);
      });
    }
    $("#annList").addEventListener("click", function (e) {
      var s = e.target.closest(".star"); if (!s) return;
      var id = s.getAttribute("data-id");
      starred[id] = !starred[id];
      save("starred", starred);
      s.classList.toggle("on", !!starred[id]);
    });
    var annStatusTimer;
    $("#annRefresh").addEventListener("click", function () {
      var st = $("#annStatus");
      st.textContent = "Updated just now";
      st.style.opacity = "1";
      clearTimeout(annStatusTimer);
      annStatusTimer = setTimeout(function () { st.style.opacity = "0"; }, 2600);
    });

    // ============================================================
    // MATERIALS
    // ============================================================
    var matSel = "Cell Energetics Lab handout.pdf";
    var matRev = load("matRev", 0);
    var matComments = load("matComments", []);

    function renderMatList() {
      var list = $("#matList");
      list.innerHTML = "";
      MATERIALS.forEach(function (m) {
        var row = el("div", "mat" + (m.name === matSel ? " on" : ""));
        row.setAttribute("data-name", m.name);
        row.innerHTML =
          '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (IC[m.type] || IC.pdf) + '</svg>' +
          '<div><div class="mn">' + esc(m.name) + '</div><div class="mmeta">' + esc(m.meta) + '</div></div>' +
          '<div class="msize">' + esc(m.size) + '</div>';
        list.appendChild(row);
      });
    }

    // The submission detail always targets the assignment "Cell Energetics Lab".
    function renderMatDetail() {
      var d = $("#matDetail");
      var openName = matSel;
      var revLine = matRev === 0
        ? 'No revisions yet. Submissions are kept for 30 days.'
        : 'Submitted · revision ' + matRev + ' created · ' + (load("matRevTime", ""));
      var commentsHtml = "";
      if (matComments.length) {
        commentsHtml = '<div class="dlabel">Comments</div>';
        matComments.forEach(function (cm) {
          commentsHtml += '<div class="attach" style="border:none;background:var(--paper-2);">' + esc(cm.text) + ' <span style="margin-left:auto;color:var(--ink-4);font-weight:450;">' + esc(cm.time) + '</span></div>';
        });
      }
      d.innerHTML =
        '<h3>Cell Energetics Lab</h3>' +
        '<div class="dmeta">Biology · Ms. Carrington · was due ' + shortOf(dateFromOffset(-3)) + (openName !== "Cell Energetics Lab handout.pdf" ? ' · viewing ' + esc(openName) : '') + '</div>' +
        '<div class="dlabel">Attachments</div>' +
        '<div class="attach"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + IC.pdf + '</svg> Cell Energetics Lab handout.pdf</div>' +
        '<div class="attach"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + IC.doc + '</svg> Lab report template.docx</div>' +
        '<div class="dlabel">Text submission</div>' +
        '<textarea class="field" id="matText" rows="4" placeholder="Type or paste your response"></textarea>' +
        '<div class="dlabel">Comment</div>' +
        '<input class="field" id="matComment" type="text" placeholder="Add a comment for your teacher" />' +
        commentsHtml +
        '<div class="revnote" id="matRevNote">' + revLine + '</div>' +
        '<div class="dactions">' +
        '<button class="btn solid" id="matSubmit">Submit</button>' +
        '<button class="btn" id="matAddComment">Add comment</button>' +
        '<a class="link-out" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg> Open in Schoology</a>' +
        '</div>';

      $("#matSubmit").addEventListener("click", function () {
        matRev++;
        var ts = nowStamp();
        save("matRev", matRev);
        save("matRevTime", ts);
        $("#matRevNote").textContent = "Submitted · revision " + matRev + " created · " + ts;
        var ta = $("#matText"); if (ta) ta.value = "";
      });
      $("#matAddComment").addEventListener("click", function () {
        var inp = $("#matComment"); if (!inp || !inp.value.trim()) return;
        matComments.push({ text: inp.value.trim(), time: nowStamp() });
        save("matComments", matComments);
        renderMatDetail();
      });
    }
    function nowStamp() {
      var d = new Date();
      var h = d.getHours(), m = ("0" + d.getMinutes()).slice(-2);
      var ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
      return h + ":" + m + " " + ap;
    }
    $("#matList").addEventListener("click", function (e) {
      var row = e.target.closest(".mat"); if (!row) return;
      matSel = row.getAttribute("data-name");
      renderMatList();
      renderMatDetail();
    });

    // ============================================================
    // SETTINGS — toggles persist, style switcher, theme, notifications
    // ============================================================
    // restore + wire data-key switches
    $$("input.switch[data-key]").forEach(function (sw) {
      var k = sw.getAttribute("data-key");
      var saved = load("toggle." + k, sw.checked);
      sw.checked = !!saved;
      applyToggleSide(k, sw.checked);
      sw.addEventListener("change", function () {
        save("toggle." + k, sw.checked);
        applyToggleSide(k, sw.checked);
      });
    });
    function applyToggleSide(k, on) {
      if (k === "appearance.compact") document.body.classList.toggle("compact", on);
      if (k.indexOf("sec.") === 0) {
        var id = k.slice(4);
        var item = $('.nav-item[data-screen="' + id + '"]');
        if (item) item.style.display = on ? "" : "none";
      }
    }

    // style switcher (edition) — this file IS the Halo edition, so it is always
    // the active one here. (Don't read a stale shared key, or a prior visit to
    // another edition would show the wrong card as active.)
    var curStyle = "halo";
    save("style", "halo");
    function applyStyle() {
      $$("#styleGrid .style-card").forEach(function (card) {
        var on = card.getAttribute("data-style") === curStyle;
        card.classList.toggle("on", on);
        var name = card.querySelector(".sc-name");
        var hasCheck = card.querySelector(".sc-check");
        if (on && !hasCheck) {
          name.insertAdjacentHTML("beforeend", ' <span class="sc-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg></span>');
        } else if (!on && hasCheck) {
          hasCheck.remove();
        }
      });
    }
    $("#styleGrid").addEventListener("click", function (e) {
      var card = e.target.closest(".style-card"); if (!card) return;
      var style = card.getAttribute("data-style");
      var file = card.getAttribute("data-file");
      // Halo is the current edition — just reaffirm selection, no navigation.
      if (style === "halo") {
        curStyle = "halo";
        save("style", "halo");
        applyStyle();
        return;
      }
      // Persist choice (so the target edition can reflect it) and navigate.
      curStyle = style;
      save("style", style);
      applyStyle();
      if (file) { window.location.href = file; }
    });

    // theme segment — light / dark / auto, persisted; auto follows OS
    var curTheme = load("theme", "light");
    var prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function resolvedTheme() {
      if (curTheme === "dark") return "dark";
      if (curTheme === "auto") return (prefersDark && prefersDark.matches) ? "dark" : "light";
      return "light";
    }
    function repaintThemed() {
      // re-render anything whose colors are computed in JS (sparklines).
      // chart/list/calendar SVGs use CSS vars and adapt automatically.
      renderOverviewCourses();
      if ($("#gradePane")) renderGradePane();
    }
    function applyTheme() {
      var mode = resolvedTheme();
      document.documentElement.setAttribute("data-theme", mode);
      $$("#themeSeg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-theme") === curTheme); });
      repaintThemed();
    }
    $("#themeSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      curTheme = b.getAttribute("data-theme");
      save("theme", curTheme);
      applyTheme();
    });
    if (prefersDark) {
      var onScheme = function () { if (curTheme === "auto") applyTheme(); };
      if (prefersDark.addEventListener) prefersDark.addEventListener("change", onScheme);
      else if (prefersDark.addListener) prefersDark.addListener(onScheme);
    }

    // ============================================================
    // TOAST / NOTIFICATIONS
    // ============================================================
    function toast(opts) {
      var wrap = $("#toastWrap");
      var t = el("div", "toast");
      t.innerHTML =
        '<span class="tsig ' + (opts.sig || "") + '"></span>' +
        '<div>' + (opts.app ? '<div class="tapp">' + esc(opts.app) + '</div>' : '') +
        '<div class="ttitle">' + esc(opts.title) + '</div>' +
        (opts.body ? '<div class="tbody">' + esc(opts.body) + '</div>' : '') + '</div>';
      wrap.appendChild(t);
      requestAnimationFrame(function () { t.classList.add("show"); });
      setTimeout(function () {
        t.classList.remove("show");
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 280);
      }, 4200);
    }
    var notifIdx = 0;
    $("#notifTest").addEventListener("click", function () {
      if (!$("#notifToggle").checked) {
        $("#notifHint").textContent = "Turn on notifications to preview";
        return;
      }
      var n = NOTIF_TEXT[notifIdx % NOTIF_TEXT.length]; notifIdx++;
      toast({ sig: n.sig, title: n.title, body: n.body, app: "Better SGY · Biology" });
    });

    // ============================================================
    // GAMES — Arcade (Climb / Streak / Recall)
    // monochrome base; ink as the single accent, used sparingly.
    // ============================================================
    (function games() {
      var GAMES = [
        { id: "mines",  name: "Minesweeper", desc: "Clear the field, 10 mines", best: "mines",  bestLabel: "Best", fmt: "time" },
        { id: "lights", name: "Lights Out",  desc: "Turn every cell off",        best: "lights", bestLabel: "Fewest", fmt: "num" },
        { id: "dodge",  name: "Dodge",       desc: "Avoid the falling bars",      best: "dodge",  bestLabel: "Best", fmt: "time" },
        { id: "words",  name: "Word Search", desc: "Find six hidden words",       best: "words",  bestLabel: "Best", fmt: "time" }
      ];
      var GIC = {
        mines:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
        lights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        dodge:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6M14 5v5M18 3v7"/><circle cx="11" cy="19" r="2.4"/></svg>',
        words:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="M20 20l-5.6-5.6"/></svg>'
      };

      var home = $("#arcadeHome"), stage = $("#gameStage");
      var board = $("#gameBoard"), scoresEl = $("#gameScores"), hintEl = $("#gameHint");
      var titleEl = $("#gameTitle");
      var active = null;       // current game id
      var teardown = null;     // current game's cleanup fn

      // single localStorage object for all four best scores
      var ARCADE_KEY = "bsgy-halo-arcade";
      function arcadeAll() {
        try { var v = localStorage.getItem(ARCADE_KEY); return v ? JSON.parse(v) : {}; }
        catch (e) { return {}; }
      }
      function bestOf(key) { var a = arcadeAll(); return a[key] != null ? a[key] : 0; }
      function setBest(key, v) {
        var a = arcadeAll(); a[key] = v;
        try { localStorage.setItem(ARCADE_KEY, JSON.stringify(a)); } catch (e) {}
      }
      function fmtTime(ms) {
        var s = Math.floor(ms / 1000);
        return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
      }

      // ---- SOUND FX (WebAudio, off by default, no files) ----------------
      var SFX_KEY = "bsgy-halo-sfx";
      var sfxOn = false;
      try { sfxOn = localStorage.getItem(SFX_KEY) === "1"; } catch (e) {}
      var actx = null;
      function blip(freq, dur, type) {
        if (!sfxOn) return;
        try {
          if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
          if (actx.state === "suspended") actx.resume();
          var o = actx.createOscillator(), g = actx.createGain();
          o.type = type || "sine";
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, actx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.09));
          o.connect(g); g.connect(actx.destination);
          o.start(); o.stop(actx.currentTime + (dur || 0.09) + 0.02);
        } catch (e) {}
      }
      var SFX = {
        tap:  function () { blip(420, 0.05, "sine"); },
        good: function () { blip(660, 0.10, "triangle"); },
        win:  function () { blip(523, 0.10, "triangle"); setTimeout(function () { blip(784, 0.14, "triangle"); }, 110); },
        lose: function () { blip(180, 0.18, "sawtooth"); }
      };
      var SFX_ICON_ON  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a3 3 0 0 1 0 6"/><path d="M18.5 7a6 6 0 0 1 0 10"/></svg>';
      var SFX_ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
      function syncSfxBtn() {
        var btn = $("#sfxToggle"); if (!btn) return;
        btn.classList.toggle("on", sfxOn);
        btn.setAttribute("aria-pressed", sfxOn ? "true" : "false");
        $("#sfxIc").innerHTML = sfxOn ? SFX_ICON_ON : SFX_ICON_OFF;
        $("#sfxLabel").textContent = sfxOn ? "Sound on" : "Sound off";
      }

      // ---- BEST SCORES PANEL --------------------------------------------
      function renderBest() {
        var panel = $("#bestPanel"); if (!panel) return;
        var rows = "";
        GAMES.forEach(function (g) {
          var b = bestOf(g.best);
          var val = !b ? '<span class="br-v none">—</span>'
            : '<span class="br-v">' + (g.fmt === "time" ? fmtTime(b) : b) + '</span>';
          var lbl = g.fmt === "time" ? "fastest clear" : "fewest moves";
          rows += '<div class="best-row"><span class="br-n">' + g.name + ' <span style="color:var(--ink-4);font-weight:450;">· ' + lbl + '</span></span>' + val + '</div>';
        });
        panel.innerHTML = '<div class="bp-head"><span class="bp-title">Best scores</span>' +
          '<span class="bp-note">This device</span></div>' + rows;
      }
      function bestText(g) {
        var b = bestOf(g.best);
        if (!b) return "—";
        if (g.fmt === "time") return g.bestLabel + " " + fmtTime(b);
        return g.bestLabel + " " + b;
      }

      function renderHome() {
        var html = "";
        GAMES.forEach(function (g) {
          var daily = g.id === "words" ? '<span class="daily-tag">Daily</span>' : "";
          var desc = g.id === "words" ? "Today’s seeded puzzle" : g.desc;
          html +=
            '<button class="game-card" data-game="' + g.id + '">' +
              '<span class="gc-ic">' + GIC[g.id] + '</span>' +
              '<span><span class="gc-name">' + g.name + daily + '</span>' +
              '<span class="gc-desc" style="display:block;">' + desc + '</span></span>' +
              '<span class="gc-best">' + bestText(g) + '</span>' +
            '</button>';
        });
        $("#gameCards").innerHTML = html;
        renderBest();
        syncSfxBtn();
      }

      function showHome() {
        if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
        active = null;
        stage.style.display = "none";
        home.style.display = "";
        renderHome();
      }

      function play(id) {
        if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
        active = id;
        home.style.display = "none";
        stage.style.display = "";
        board.innerHTML = "";
        scoresEl.innerHTML = "";
        var g = null; GAMES.forEach(function (x) { if (x.id === id) g = x; });
        titleEl.textContent = g.name;
        if (id === "mines") teardown = startMines();
        else if (id === "lights") teardown = startLights();
        else if (id === "dodge") teardown = startDodge();
        else if (id === "words") teardown = startWords();
      }

      $("#gameCards").addEventListener("click", function (e) {
        var c = e.target.closest(".game-card"); if (!c) return;
        play(c.getAttribute("data-game"));
      });
      $("#gameBack").addEventListener("click", showHome);
      $("#gameRestart").addEventListener("click", function () { if (active) play(active); });
      $("#sfxToggle").addEventListener("click", function () {
        sfxOn = !sfxOn;
        try { localStorage.setItem(SFX_KEY, sfxOn ? "1" : "0"); } catch (e) {}
        syncSfxBtn();
        if (sfxOn) SFX.tap(); // confirm audibly when turned on
      });

      // scoreboard helper
      function scoreboard(defs) {
        var html = "";
        defs.forEach(function (d) {
          html += '<div class="gscore"><div class="gl">' + d.label + '</div><div class="gv" id="' + d.id + '">' + d.val + '</div></div>';
        });
        scoresEl.innerHTML = html;
      }
      function overlay(parent) {
        var ov = el("div", "game-over");
        ov.innerHTML = '<div class="got" id="ovTitle"></div><div class="gosub" id="ovSub"></div><button class="btn solid" id="ovAgain">Play again</button>';
        parent.appendChild(ov);
        return ov;
      }

      // ---------- only run keyboard handlers when Games screen is active & a game is open
      function gamesScreenOn() {
        var sc = $("#screen-games");
        return sc && sc.classList.contains("active");
      }

      // =========================================================
      // GAME 1 — MINESWEEPER (9x9, 10 mines)
      // =========================================================
      function startMines() {
        var N = 9, MINES = 10;
        scoreboard([
          { id: "mnFlags", label: "Mines", val: MINES },
          { id: "mnTime",  label: "Time",  val: "0:00" },
          { id: "mnBest",  label: "Best",  val: bestOf("mines") ? fmtTime(bestOf("mines")) : "—" }
        ]);
        hintEl.textContent = "Reveal cells · right-click or flag mode to mark mines";

        var grid = el("div", "mine-grid");
        board.appendChild(grid);
        var tools = el("div", "game-tools");
        tools.innerHTML = '<button class="gtool" id="mnFlagBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22V3M5 3h11l-2 4 2 4H5"/></svg>Flag mode</button>';
        board.appendChild(tools);
        var ov = overlay(board);

        var cells, mines, adj, revealed, flags, dead, won, started, t0, timer, flagMode;

        function idx(r, c) { return r * N + c; }
        function inB(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }
        function neighbors(r, c) {
          var out = [];
          for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (inB(r + dr, c + dc)) out.push([r + dr, c + dc]);
          }
          return out;
        }
        function tick() { if (started && !dead && !won) $("#mnTime").textContent = fmtTime(Date.now() - t0); }

        function reset() {
          if (timer) { clearInterval(timer); timer = null; }
          mines = {}; adj = []; revealed = {}; flags = {};
          dead = false; won = false; started = false; flagMode = false;
          $("#mnFlagBtn").classList.remove("on");
          $("#mnFlags").textContent = MINES;
          $("#mnTime").textContent = "0:00";
          $("#mnBest").textContent = bestOf("mines") ? fmtTime(bestOf("mines")) : "—";
          ov.classList.remove("show");
          // place mines
          var pool = [];
          for (var i = 0; i < N * N; i++) pool.push(i);
          for (var m = 0; m < MINES; m++) {
            var j = Math.floor(Math.random() * pool.length);
            mines[pool[j]] = true; pool.splice(j, 1);
          }
          // counts
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
            if (mines[idx(r, c)]) { adj[idx(r, c)] = -1; continue; }
            var n = 0;
            neighbors(r, c).forEach(function (p) { if (mines[idx(p[0], p[1])]) n++; });
            adj[idx(r, c)] = n;
          }
          // render
          var html = "";
          for (var k = 0; k < N * N; k++) html += '<button class="mine-cell" data-k="' + k + '"></button>';
          grid.innerHTML = html;
          cells = $$(".mine-cell", grid);
        }

        function flagsLeft() {
          var f = 0; for (var k in flags) if (flags[k]) f++;
          return MINES - f;
        }
        function toggleFlag(k) {
          if (dead || won || revealed[k]) return;
          flags[k] = !flags[k];
          var c = cells[k];
          if (flags[k]) { c.classList.add("flag"); c.textContent = "⚑"; }
          else { c.classList.remove("flag"); c.textContent = ""; }
          $("#mnFlags").textContent = flagsLeft();
        }
        function reveal(k) {
          if (dead || won || revealed[k] || flags[k]) return;
          if (!started) { started = true; t0 = Date.now(); timer = setInterval(tick, 250); }
          if (mines[k]) { lose(k); return; }
          SFX.tap();
          // flood fill
          var stack = [k];
          while (stack.length) {
            var cur = stack.pop();
            if (revealed[cur]) continue;
            revealed[cur] = true;
            var cell = cells[cur];
            cell.classList.add("open");
            cell.classList.remove("flag"); flags[cur] = false;
            var n = adj[cur];
            if (n > 0) { cell.textContent = n; cell.classList.add("n" + n); }
            else {
              var rr = Math.floor(cur / N), cc = cur % N;
              neighbors(rr, cc).forEach(function (p) {
                var nk = idx(p[0], p[1]);
                if (!revealed[nk] && !mines[nk]) stack.push(nk);
              });
            }
          }
          $("#mnFlags").textContent = flagsLeft();
          checkWin();
        }
        function checkWin() {
          var rev = 0; for (var key in revealed) if (revealed[key]) rev++;
          if (rev === N * N - MINES) winGame();
        }
        function revealAllMines(hitK) {
          for (var k = 0; k < N * N; k++) {
            if (mines[k]) {
              cells[k].classList.remove("flag");
              cells[k].textContent = "●";
              cells[k].classList.add(k === hitK ? "hit" : "mine");
            }
          }
        }
        function lose(hitK) {
          dead = true;
          SFX.lose();
          if (timer) { clearInterval(timer); timer = null; }
          revealAllMines(hitK);
          $("#ovTitle").textContent = "Hit a mine";
          $("#ovTitle").className = "got";
          $("#ovSub").textContent = "Reveal every safe cell to win";
          ov.classList.add("show");
        }
        function winGame() {
          won = true;
          SFX.win();
          if (timer) { clearInterval(timer); timer = null; }
          var ms = Date.now() - t0;
          var b = bestOf("mines");
          var record = !b || ms < b;
          if (record) setBest("mines", ms);
          $("#mnBest").textContent = fmtTime(bestOf("mines"));
          $("#ovTitle").textContent = "Field cleared";
          $("#ovTitle").className = "got win";
          $("#ovSub").textContent = fmtTime(ms) + (record ? " · best" : "");
          ov.classList.add("show");
        }

        function onClick(e) {
          var c = e.target.closest(".mine-cell"); if (!c) return;
          var k = +c.getAttribute("data-k");
          if (flagMode) toggleFlag(k); else reveal(k);
        }
        function onContext(e) {
          var c = e.target.closest(".mine-cell"); if (!c) return;
          e.preventDefault();
          toggleFlag(+c.getAttribute("data-k"));
        }
        function onFlagBtn() {
          flagMode = !flagMode;
          $("#mnFlagBtn").classList.toggle("on", flagMode);
        }
        grid.addEventListener("click", onClick);
        grid.addEventListener("contextmenu", onContext);
        $("#mnFlagBtn").addEventListener("click", onFlagBtn);
        ov.querySelector("#ovAgain").addEventListener("click", reset);

        reset();
        return function () {
          if (timer) { clearInterval(timer); timer = null; }
          grid.removeEventListener("click", onClick);
          grid.removeEventListener("contextmenu", onContext);
        };
      }

      // =========================================================
      // GAME 2 — LIGHTS OUT (5x5)
      // =========================================================
      function startLights() {
        var N = 5;
        scoreboard([
          { id: "loMoves", label: "Moves",  val: 0 },
          { id: "loBest",  label: "Fewest", val: bestOf("lights") || "—" }
        ]);
        hintEl.textContent = "Click a cell to toggle it and its neighbors · turn all off";

        var grid = el("div", "lights-grid");
        board.appendChild(grid);
        var ov = overlay(board);

        var state, moves;

        function idx(r, c) { return r * N + c; }
        function render() {
          for (var k = 0; k < N * N; k++) grid.children[k].classList.toggle("on", !!state[k]);
        }
        function toggle(k) {
          var r = Math.floor(k / N), c = k % N;
          var hits = [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
          hits.forEach(function (p) {
            if (p[0] >= 0 && p[1] >= 0 && p[0] < N && p[1] < N) state[idx(p[0], p[1])] = state[idx(p[0], p[1])] ? 0 : 1;
          });
        }
        function reset() {
          ov.classList.remove("show");
          moves = 0;
          $("#loMoves").textContent = 0;
          $("#loBest").textContent = bestOf("lights") || "—";
          state = [];
          for (var k = 0; k < N * N; k++) state[k] = 0;
          // build a guaranteed-solvable lit pattern by applying random clicks
          var clicks = 6 + Math.floor(Math.random() * 8);
          for (var i = 0; i < clicks; i++) toggle(Math.floor(Math.random() * N * N));
          // avoid an already-solved board
          if (state.every(function (v) { return !v; })) toggle(Math.floor(Math.random() * N * N));
          if (grid.children.length === 0) {
            var html = "";
            for (var j = 0; j < N * N; j++) html += '<button class="light-cell" data-k="' + j + '"></button>';
            grid.innerHTML = html;
          }
          render();
        }
        function press(k) {
          if (ov.classList.contains("show")) return;
          toggle(k); render();
          moves++; $("#loMoves").textContent = moves;
          if (state.every(function (v) { return !v; })) win(); else SFX.tap();
        }
        function win() {
          SFX.win();
          var b = bestOf("lights");
          var record = !b || moves < b;
          if (record) setBest("lights", moves);
          $("#loBest").textContent = bestOf("lights");
          $("#ovTitle").textContent = "All off";
          $("#ovTitle").className = "got win";
          $("#ovSub").textContent = moves + " moves" + (record ? " · fewest" : "");
          ov.classList.add("show");
        }
        function onClick(e) {
          var c = e.target.closest(".light-cell"); if (!c) return;
          press(+c.getAttribute("data-k"));
        }
        function onKey(e) {
          if (!gamesScreenOn() || active !== "lights") return;
          if (e.key === "r" || e.key === "R") { e.preventDefault(); reset(); }
        }
        grid.addEventListener("click", onClick);
        document.addEventListener("keydown", onKey);
        ov.querySelector("#ovAgain").addEventListener("click", reset);

        reset();
        return function () {
          grid.removeEventListener("click", onClick);
          document.removeEventListener("keydown", onKey);
        };
      }

      // =========================================================
      // GAME 3 — DODGE (avoid falling bars)
      // =========================================================
      function startDodge() {
        scoreboard([
          { id: "dgTime", label: "Time", val: "0:00" },
          { id: "dgBest", label: "Best", val: bestOf("dodge") ? fmtTime(bestOf("dodge")) : "—" }
        ]);
        hintEl.textContent = "Arrows / A-D / drag · survive the falling bars";

        var wrap = el("div", "dodge-wrap");
        var cv = document.createElement("canvas");
        wrap.appendChild(cv);
        board.appendChild(wrap);
        var ov = overlay(board);

        var ctx = cv.getContext("2d");
        var DPR = window.devicePixelRatio || 1;
        var W = 0, H = 0;
        function size() {
          var w = wrap.clientWidth - 24;
          if (w < 120) w = 300;
          W = w; H = Math.round(w * 1.15);
          cv.width = W * DPR; cv.height = H * DPR;
          cv.style.width = W + "px"; cv.style.height = H + "px";
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }

        var px, pw, ph, bars, dead, t0, last, raf, spawnT, spawnGap, fallSpeed, left, right, hitFlash;

        function reset() {
          size();
          pw = Math.max(28, W * 0.10); ph = 12;
          px = W / 2 - pw / 2;
          bars = []; dead = false;
          t0 = 0; last = 0; spawnT = 0; spawnGap = 900; fallSpeed = 0.16;
          left = false; right = false; hitFlash = 0;
          ov.classList.remove("show");
          $("#dgTime").textContent = "0:00";
          $("#dgBest").textContent = bestOf("dodge") ? fmtTime(bestOf("dodge")) : "—";
          draw();
        }
        function spawnBar() {
          var bw = (0.18 + Math.random() * 0.32) * W;
          var bx = Math.random() * (W - bw);
          bars.push({ x: bx, y: -16, w: bw, h: 14 });
        }
        function draw() {
          ctx.clearRect(0, 0, W, H);
          // bars = ink
          ctx.fillStyle = cssVar("--ink", "#14140f");
          bars.forEach(function (b) { ctx.fillRect(b.x, b.y, b.w, b.h); });
          // player marker = ink, flashes red on hit
          ctx.fillStyle = hitFlash > 0 ? cssVar("--signal-miss", "#c0392b") : cssVar("--ink", "#14140f");
          ctx.fillRect(px, H - ph - 8, pw, ph);
        }
        function step(dt) {
          if (dead) return;
          var elapsed = t0 ? (last - t0) : 0;
          // difficulty ramp
          spawnGap = Math.max(360, 900 - elapsed * 0.04);
          fallSpeed = 0.16 + elapsed * 0.00004;
          // move player
          var pv = W * 0.012 * (dt / 16);
          if (left) px -= pv; if (right) px += pv;
          if (px < 0) px = 0; if (px > W - pw) px = W - pw;
          // move bars
          spawnT += dt;
          if (spawnT >= spawnGap) { spawnT = 0; spawnBar(); }
          var py = H - ph - 8;
          for (var i = bars.length - 1; i >= 0; i--) {
            var b = bars[i];
            b.y += fallSpeed * dt;
            if (b.y > H) { bars.splice(i, 1); continue; }
            if (b.y + b.h >= py && b.y <= py + ph && px < b.x + b.w && px + pw > b.x) {
              hitFlash = 1; lose(); return;
            }
          }
          $("#dgTime").textContent = fmtTime(elapsed);
        }
        function loop(t) {
          raf = requestAnimationFrame(loop);
          if (!t0) { t0 = t; last = t; }
          var dt = t - last; last = t;
          if (dt > 60) dt = 60;
          step(dt);
          draw();
        }
        function lose() {
          dead = true;
          SFX.lose();
          draw();
          var ms = last - t0;
          var b = bestOf("dodge");
          var record = ms > b;
          if (record) setBest("dodge", ms);
          $("#dgBest").textContent = fmtTime(bestOf("dodge"));
          $("#ovTitle").textContent = "Hit";
          $("#ovTitle").className = "got";
          $("#ovSub").textContent = "Survived " + fmtTime(ms) + (record ? " · best" : "");
          ov.classList.add("show");
        }

        function onKeyDown(e) {
          if (!gamesScreenOn() || active !== "dodge") return;
          var k = e.key.toLowerCase();
          if (k === "arrowleft" || k === "a") { e.preventDefault(); left = true; }
          else if (k === "arrowright" || k === "d") { e.preventDefault(); right = true; }
        }
        function onKeyUp(e) {
          var k = e.key.toLowerCase();
          if (k === "arrowleft" || k === "a") left = false;
          else if (k === "arrowright" || k === "d") right = false;
        }
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        // drag / touch
        function moveTo(clientX) {
          var rect = cv.getBoundingClientRect();
          px = (clientX - rect.left) - pw / 2;
          if (px < 0) px = 0; if (px > W - pw) px = W - pw;
        }
        var dragging = false;
        function pd(e) { dragging = true; moveTo((e.touches ? e.touches[0] : e).clientX); }
        function pm(e) { if (dragging) { e.preventDefault(); moveTo((e.touches ? e.touches[0] : e).clientX); } }
        function pu() { dragging = false; }
        cv.addEventListener("mousedown", pd);
        cv.addEventListener("mousemove", pm);
        document.addEventListener("mouseup", pu);
        cv.addEventListener("touchstart", pd, { passive: true });
        cv.addEventListener("touchmove", pm, { passive: false });
        cv.addEventListener("touchend", pu);

        var onResize = function () { var keep = px / (W || 1); size(); px = keep * (W - pw); draw(); };
        window.addEventListener("resize", onResize);
        ov.querySelector("#ovAgain").addEventListener("click", reset);

        reset();
        raf = requestAnimationFrame(loop);

        return function () {
          cancelAnimationFrame(raf);
          document.removeEventListener("keydown", onKeyDown);
          document.removeEventListener("keyup", onKeyUp);
          document.removeEventListener("mouseup", pu);
          window.removeEventListener("resize", onResize);
        };
      }

      // =========================================================
      // GAME 4 — WORD SEARCH (10x10, 6 words)
      // =========================================================
      function startWords() {
        var N = 10;
        var WORDS = ["BIOLOGY", "FRENCH", "ALGEBRA", "DRAMA", "ENZYME", "ESSAY"];
        var ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        // Daily Challenge: deterministic puzzle seeded by today's date.
        // "New puzzle" re-rolls off the seed for variety within the day.
        var DAY_SEED = (function () {
          var d = new Date();
          return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
        })();
        var seed = DAY_SEED >>> 0;
        function rand() {
          // mulberry32
          seed = (seed + 0x6D2B79F5) >>> 0;
          var t = seed;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        scoreboard([
          { id: "wsFound", label: "Found", val: "0/6" },
          { id: "wsTime",  label: "Time",  val: "0:00" },
          { id: "wsBest",  label: "Best",  val: bestOf("words") ? fmtTime(bestOf("words")) : "—" }
        ]);
        hintEl.textContent = "Daily puzzle · click first then last letter of a word";

        var layout = el("div", "ws-layout");
        var grid = el("div", "ws-grid");
        var wordsBar = el("div", "ws-words");
        layout.appendChild(grid); layout.appendChild(wordsBar);
        board.appendChild(layout);
        var tools = el("div", "game-tools");
        tools.innerHTML = '<button class="gtool" id="wsNew">New puzzle</button>';
        board.appendChild(tools);
        var ov = overlay(board);

        var letters, placed, foundCount, anchor, started, t0, timer, foundCells;

        function idx(r, c) { return r * N + c; }
        function tick() { if (started) $("#wsTime").textContent = fmtTime(Date.now() - t0); }

        function tryPlace(word) {
          // dir: 0 horizontal, 1 vertical
          for (var attempt = 0; attempt < 80; attempt++) {
            var dir = rand() < 0.5 ? 0 : 1;
            var len = word.length;
            var r, c, dr, dc;
            if (dir === 0) { r = Math.floor(rand() * N); c = Math.floor(rand() * (N - len + 1)); dr = 0; dc = 1; }
            else { c = Math.floor(rand() * N); r = Math.floor(rand() * (N - len + 1)); dr = 1; dc = 0; }
            var ok = true;
            for (var i = 0; i < len; i++) {
              var k = idx(r + dr * i, c + dc * i);
              if (letters[k] && letters[k] !== word[i]) { ok = false; break; }
            }
            if (!ok) continue;
            var coords = [];
            for (var j = 0; j < len; j++) {
              var kk = idx(r + dr * j, c + dc * j);
              letters[kk] = word[j]; coords.push(kk);
            }
            return coords;
          }
          return null;
        }
        function generate() {
          letters = []; placed = {};
          for (var k = 0; k < N * N; k++) letters[k] = "";
          var ok = true;
          WORDS.forEach(function (w) {
            var coords = tryPlace(w);
            if (!coords) ok = false; else placed[w] = coords;
          });
          if (!ok) return generate(); // retry whole board on rare failure
          for (var f = 0; f < N * N; f++) if (!letters[f]) letters[f] = ALPHA[Math.floor(rand() * 26)];
        }
        function render() {
          var html = "";
          for (var k = 0; k < N * N; k++) html += '<button class="ws-cell" data-k="' + k + '">' + letters[k] + '</button>';
          grid.innerHTML = html;
          var wh = "";
          WORDS.forEach(function (w) {
            wh += '<span class="ws-word" data-w="' + w + '">' + w + '</span>';
          });
          wordsBar.innerHTML = wh;
        }
        function reset() {
          if (timer) { clearInterval(timer); timer = null; }
          generate(); render();
          foundCount = 0; anchor = null; started = false; foundCells = {};
          $("#wsFound").textContent = "0/6";
          $("#wsTime").textContent = "0:00";
          $("#wsBest").textContent = bestOf("words") ? fmtTime(bestOf("words")) : "—";
          ov.classList.remove("show");
        }
        function lineBetween(a, b) {
          var ar = Math.floor(a / N), ac = a % N, br = Math.floor(b / N), bc = b % N;
          var dr = br - ar, dc = bc - ac;
          // must be straight horizontal or vertical
          if (dr !== 0 && dc !== 0) return null;
          var len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
          var sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
          var sc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
          var cells = [];
          for (var i = 0; i < len; i++) cells.push(idx(ar + sr * i, ac + sc * i));
          return cells;
        }
        function wordFromCells(cells) {
          var s = ""; cells.forEach(function (k) { s += letters[k]; });
          return s;
        }
        function clearAnchor() {
          if (anchor != null) {
            var c = grid.querySelector('.ws-cell[data-k="' + anchor + '"]');
            if (c && !c.classList.contains("found")) c.classList.remove("sel");
          }
          anchor = null;
        }
        function pick(k) {
          if (!started) { started = true; t0 = Date.now(); timer = setInterval(tick, 250); }
          if (anchor == null) {
            anchor = k;
            grid.querySelector('.ws-cell[data-k="' + k + '"]').classList.add("sel");
            return;
          }
          if (k === anchor) { clearAnchor(); return; }
          var cells = lineBetween(anchor, k);
          var startK = anchor;
          clearAnchor();
          if (!cells) return;
          var w = wordFromCells(cells), wr = w.split("").reverse().join("");
          var match = null;
          WORDS.forEach(function (word) {
            if (foundCells[word]) return;
            if (word === w || word === wr) match = word;
          });
          if (match) {
            foundCells[match] = true; foundCount++;
            cells.forEach(function (cc) {
              var ce = grid.querySelector('.ws-cell[data-k="' + cc + '"]');
              ce.classList.remove("sel"); ce.classList.add("found");
            });
            var wlabel = wordsBar.querySelector('.ws-word[data-w="' + match + '"]');
            if (wlabel) wlabel.classList.add("done");
            $("#wsFound").textContent = foundCount + "/6";
            if (foundCount === WORDS.length) win(); else SFX.good();
          }
        }
        function win() {
          SFX.win();
          if (timer) { clearInterval(timer); timer = null; }
          started = false;
          var ms = Date.now() - t0;
          var b = bestOf("words");
          var record = !b || ms < b;
          if (record) setBest("words", ms);
          $("#wsBest").textContent = fmtTime(bestOf("words"));
          $("#ovTitle").textContent = "All six found";
          $("#ovTitle").className = "got win";
          $("#ovSub").textContent = fmtTime(ms) + (record ? " · best" : "");
          ov.classList.add("show");
        }
        function onClick(e) {
          var c = e.target.closest(".ws-cell"); if (!c) return;
          if (c.classList.contains("found") && anchor == null) return;
          pick(+c.getAttribute("data-k"));
        }
        function onNew() { reset(); }
        grid.addEventListener("click", onClick);
        $("#wsNew").addEventListener("click", onNew);
        ov.querySelector("#ovAgain").addEventListener("click", reset);

        reset();
        return function () {
          if (timer) { clearInterval(timer); timer = null; }
          grid.removeEventListener("click", onClick);
        };
      }

      // expose home renderer for INIT
      games._renderHome = renderHome;
      games._showHome = showHome;
      games._play = play;
      games._ids = GAMES.map(function (g) { return g.id; });
      window.__haloGames = games;
    })();

    // ============================================================
    // ADDED · platform helpers
    // ============================================================
    var IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
    var MOD_LABEL = IS_MAC ? "⌘K" : "Ctrl+K";
    (function labelMod() {
      ["searchCueKey", "helpSearchKey"].forEach(function (id) {
        var n = document.getElementById(id); if (n) n.textContent = MOD_LABEL;
      });
    })();

    var SCREENS = [
      { id: "overview",      name: "Overview",      sub: "Grade summary and courses", key: "o" },
      { id: "grades",        name: "Grades",        sub: "Per-course gradebook",       key: "g" },
      { id: "assignments",   name: "Assignments",   sub: "Cross-course list",          key: "a" },
      { id: "calendar",      name: "Calendar",      sub: "Due dates and tests",        key: "c" },
      { id: "announcements", name: "Announcements", sub: "Teacher feed",               key: "n" },
      { id: "materials",     name: "Materials",     sub: "Files and submissions",      key: "m" },
      { id: "games",         name: "Games",         sub: "A quiet break",              key: "e" },
      { id: "nostalgia",     name: "Nostalgia",     sub: "Grade snapshots",            key: "y" },
      { id: "settings",      name: "Settings",      sub: "Better SGY",                 key: "s" }
    ];
    var SCREEN_BY_KEY = {}; SCREENS.forEach(function (s) { SCREEN_BY_KEY[s.key] = s.id; });

    var SCREEN_IC = {
      overview:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
      grades:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="8" y="11" width="3" height="6"/><rect x="14" y="7" width="3" height="10"/></svg>',
      assignments:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
      calendar:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
      announcements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l16-6v14L3 13z"/><path d="M7 12v5a2 2 0 0 0 2 2h1"/></svg>',
      materials:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
      games:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12h4M9 10v4"/><circle cx="15.5" cy="11" r="0.6" fill="currentColor"/><circle cx="17.5" cy="13" r="0.6" fill="currentColor"/><rect x="2.5" y="6.5" width="19" height="11" rx="4"/></svg>',
      settings:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"/></svg>',
      nostalgia:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l3 2"/></svg>',
      assignment:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
      announcement:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l16-6v14L3 13z"/><path d="M7 12v5a2 2 0 0 0 2 2h1"/></svg>',
      material:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
    };

    // ============================================================
    // ADDED · GLOBAL SEARCH (⌘K command palette)
    // ============================================================
    var searchOvl = $("#searchOvl"), helpOvl = $("#helpOvl");
    var cmdkInput = $("#cmdkInput"), cmdkResults = $("#cmdkResults");
    var cmdkItems = [];     // flat list of {kind,label,sub,action}
    var cmdkSel = 0;

    function buildIndex(q) {
      q = (q || "").trim().toLowerCase();
      var items = [];
      function match(text) { return !q || String(text).toLowerCase().indexOf(q) >= 0; }

      // Screens
      SCREENS.forEach(function (s) {
        if (match(s.name + " " + s.sub)) {
          items.push({ kind: "Screen", ic: SCREEN_IC[s.id], label: s.name, sub: s.sub,
            action: function () { goScreen(s.id); } });
        }
      });
      // Courses
      COURSES.forEach(function (c) {
        if (match(c.name + " " + c.teacher)) {
          items.push({ kind: "Course", ic: SCREEN_IC.grades, label: c.name,
            sub: c.teacher + " · " + c.grade.toFixed(1) + "% " + c.ltr,
            action: function () { selectGrade(c.id); goScreen("grades"); } });
        }
      });
      // Assignments
      ASN.forEach(function (a) {
        var c = byId[a.cid];
        if (match(a.title + " " + c.name)) {
          items.push({ kind: "Assignment", ic: SCREEN_IC.assignment, label: a.title,
            sub: c.name + " · " + a.due,
            action: function () { goScreen("assignments"); } });
        }
      });
      // Announcements
      ANN.forEach(function (a) {
        var c = byId[a.cid];
        if (match(a.title + " " + a.who + " " + c.name + " " + a.body)) {
          items.push({ kind: "Announcement", ic: SCREEN_IC.announcement, label: a.title,
            sub: a.who + " · " + c.name,
            action: function () { goScreen("announcements"); } });
        }
      });
      // Materials
      MATERIALS.forEach(function (m) {
        if (match(m.name + " " + m.meta)) {
          items.push({ kind: "Material", ic: SCREEN_IC.material, label: m.name, sub: m.meta,
            action: function () { matSel = m.name; renderMatList(); renderMatDetail(); goScreen("materials"); } });
        }
      });
      return items;
    }

    function renderCmdk() {
      var q = cmdkInput.value;
      cmdkItems = buildIndex(q);
      if (cmdkSel >= cmdkItems.length) cmdkSel = cmdkItems.length - 1;
      if (cmdkSel < 0) cmdkSel = 0;
      if (!cmdkItems.length) {
        cmdkResults.innerHTML = '<div class="cmdk-empty">No results for “' + esc(q) + '”.</div>';
        return;
      }
      // group by kind, preserving order
      var html = "", lastKind = null, flat = 0;
      cmdkItems.forEach(function (it, i) {
        if (it.kind !== lastKind) { html += '<div class="cmdk-group">' + it.kind + 's</div>'; lastKind = it.kind; }
        html += '<div class="cmdk-row' + (i === cmdkSel ? " sel" : "") + '" data-i="' + i + '">' +
          '<span class="ck-ic">' + it.ic + '</span>' +
          '<span class="ck-main"><span class="ck-t">' + esc(it.label) + '</span>' +
          (it.sub ? '<span class="ck-s">' + esc(it.sub) + '</span>' : '') + '</span>' +
          '<span class="ck-kind">' + it.kind + '</span></div>';
        flat++;
      });
      cmdkResults.innerHTML = html;
      var sel = cmdkResults.querySelector(".cmdk-row.sel");
      if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
    }

    function openSearch() {
      if (helpOvl.classList.contains("show")) helpOvl.classList.remove("show");
      searchOvl.classList.add("show");
      cmdkInput.value = "";
      cmdkSel = 0;
      renderCmdk();
      setTimeout(function () { cmdkInput.focus(); }, 0);
      if (typeof window.__haloTourSawSearch === "function") window.__haloTourSawSearch();
    }
    function closeSearch() { searchOvl.classList.remove("show"); }
    function runCmdk(i) {
      var it = cmdkItems[i]; if (!it) return;
      closeSearch();
      it.action();
    }

    cmdkInput.addEventListener("input", function () { cmdkSel = 0; renderCmdk(); });
    cmdkInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); cmdkSel = Math.min(cmdkSel + 1, cmdkItems.length - 1); renderCmdk(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cmdkSel = Math.max(cmdkSel - 1, 0); renderCmdk(); }
      else if (e.key === "Enter") { e.preventDefault(); runCmdk(cmdkSel); }
    });
    cmdkResults.addEventListener("click", function (e) {
      var row = e.target.closest(".cmdk-row"); if (!row) return;
      runCmdk(+row.getAttribute("data-i"));
    });
    cmdkResults.addEventListener("mousemove", function (e) {
      var row = e.target.closest(".cmdk-row"); if (!row) return;
      var i = +row.getAttribute("data-i");
      if (i !== cmdkSel) { cmdkSel = i; renderCmdk(); }
    });
    searchOvl.addEventListener("mousedown", function (e) { if (e.target === searchOvl) closeSearch(); });
    var cue = $("#searchCue"); if (cue) cue.addEventListener("click", openSearch);

    // ============================================================
    // ADDED · KEYBOARD SHORTCUTS
    // ============================================================
    function openHelp() { closeSearch(); helpOvl.classList.add("show"); }
    function closeHelp() { helpOvl.classList.remove("show"); }
    helpOvl.addEventListener("mousedown", function (e) { if (e.target === helpOvl) closeHelp(); });

    function anyOverlayOpen() { return searchOvl.classList.contains("show") || helpOvl.classList.contains("show"); }
    function typingInField(t) {
      if (!t) return false;
      var tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }

    // cycle "looks" — apple → halo → slate → forge → carbon → apple
    var EDITION_CYCLE = ["apple", "halo", "slate", "friendly", "carbon"];
    var EDITION_FILE = {
      apple: "mockup-app-apple.html",
      halo: "mockup-app-halo.html",
      slate: "mockup-app-slate.html",
      friendly: "mockup-app-forge.html",
      carbon: "mockup-app-carbon.html"
    };
    function cycleEdition() {
      var i = EDITION_CYCLE.indexOf("halo");
      var next = EDITION_CYCLE[(i + 1) % EDITION_CYCLE.length];
      try { localStorage.setItem("bsgy-edition", next); } catch (e) {}
      var file = EDITION_FILE[next];
      if (file) { window.location.href = file; }
    }

    var gArmed = false, gTimer = null;
    document.addEventListener("keydown", function (e) {
      // ⌘K / Ctrl+K — always
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (searchOvl.classList.contains("show")) closeSearch(); else openSearch();
        return;
      }
      // Esc closes overlays / skips the tour
      if (e.key === "Escape") {
        if (searchOvl.classList.contains("show")) { closeSearch(); return; }
        if (typeof tourActiveNow === "function" && tourActiveNow()) {
          // if a help overlay was opened by the tour, close it too
          if (helpOvl.classList.contains("show")) closeHelp();
          endTour(true); return;
        }
        if (helpOvl.classList.contains("show")) { closeHelp(); return; }
      }
      // don't intercept plain keys while typing or while search overlay is open
      if (typingInField(e.target) || searchOvl.classList.contains("show")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? — shortcuts help
      if (e.key === "?") { e.preventDefault(); if (helpOvl.classList.contains("show")) closeHelp(); else openHelp(); return; }
      if (helpOvl.classList.contains("show")) return;

      // \ — cycle to the next edition ("look")
      if (e.key === "\\") {
        e.preventDefault();
        if (!anyOverlayOpen() && !(typeof tourActiveNow === "function" && tourActiveNow())) cycleEdition();
        return;
      }

      // g then letter — jump screens
      if (gArmed) {
        var dest = SCREEN_BY_KEY[e.key.toLowerCase()];
        gArmed = false; if (gTimer) { clearTimeout(gTimer); gTimer = null; }
        if (dest) { e.preventDefault(); goScreen(dest); }
        return;
      }
      if (e.key === "g" || e.key === "G") {
        gArmed = true;
        gTimer = setTimeout(function () { gArmed = false; }, 1200);
      }
    });

    // ============================================================
    // ADDED · GUIDED TUTORIAL (coachmark tour)
    // Replaces the simple first-run welcome with a step-through tour
    // that points at real UI, lets the user try shortcuts, and can be
    // replayed from Settings or the ? help overlay.
    // ============================================================
    var WELCOME_KEY = "bsgy-halo-welcomed";
    var MOD = (navigator.platform || "").toLowerCase().indexOf("mac") >= 0 ? "⌘K" : "Ctrl+K";

    // each step: title/text, a target selector (or null for centered),
    // the screen it lives on, where the callout sits, and optional hooks.
    var TOUR_STEPS = [
      {
        target: null, screen: "overview", center: true,
        eyebrow: "Welcome",
        title: "Better SGY, drawn over Schoology.",
        text: "This is the demo, filled with sample grades — in the live extension these are drawn over your real Schoology page. There are four looks (Apple, Cloud, Slate, Friendly); switch them in Settings. Let’s take a quick tour."
      },
      {
        target: "#nav", screen: "overview", side: "right",
        eyebrow: "Navigation",
        title: "Move between screens.",
        text: "Click any tab here — or press <kbd>g</kbd> then a letter: <kbd>o</kbd> overview, <kbd>g</kbd> grades, <kbd>a</kbd> assignments, <kbd>c</kbd> calendar, <kbd>n</kbd> announcements, <kbd>m</kbd> materials, <kbd>e</kbd> games, <kbd>s</kbd> settings."
      },
      {
        target: "#searchCue", screen: "overview", side: "right",
        eyebrow: "Search",
        title: "Find anything fast.",
        text: "Press <kbd>" + MOD + "</kbd> to search courses, assignments, announcements and screens. Try it now.",
        ack: "Search opened — nice.",
        wantKey: "search"
      },
      {
        target: null, screen: "overview", center: true,
        eyebrow: "Shortcuts",
        title: "The full list is one key away.",
        text: "Press <kbd>?</kbd> any time for the keyboard shortcuts overlay. We’ll open it for you.",
        showHelp: true
      },
      {
        target: '.nav-item[data-screen="grades"]', screen: "overview", side: "right",
        eyebrow: "Grades",
        title: "Open a course gradebook.",
        text: "On the Grades screen, pick a course to see its categories, recent work, and a grade-over-time chart."
      },
      {
        target: '.nav-item[data-screen="games"]', screen: "overview", side: "right",
        eyebrow: "Games",
        title: "A quiet break.",
        text: "This edition includes four small games: Minesweeper, Lights Out, Dodge, and Word Search. Best scores are kept on this device."
      },
      {
        target: null, screen: "overview", center: true, finish: true,
        eyebrow: "Done",
        title: "That’s the tour.",
        text: "A quick cheat-sheet to keep:"
      }
    ];

    var tourEl = $("#tour"), tourPop = $("#tourPop"), tourRing = $("#tourRing");
    var tourTitle = $("#tourTitle"), tourText = $("#tourText"), tourEyebrow = $("#tourEyebrow");
    var tourDots = $("#tourDots"), tourBack = $("#tourBack"), tourNext = $("#tourNext"), tourSkip = $("#tourSkip");
    var tourAck = $("#tourAck"), tourAckText = $("#tourAckText"), tourExtra = $("#tourExtra");
    var tourScrims = $$(".tour-scrim", tourEl);
    var tourIdx = -1, tourActive = false, tourAcked = false;

    function tourActiveNow() { return tourActive; }

    function markWelcomed() { try { localStorage.setItem(WELCOME_KEY, "1"); } catch (e) {} }

    function startTour(fromReplay) {
      // close other overlays so the tour owns the screen
      closeSearch(); closeHelp();
      tourActive = true;
      tourEl.classList.add("show");
      tourIdx = 0;
      showTourStep();
    }
    function endTour(complete) {
      tourActive = false;
      tourEl.classList.remove("show");
      if (complete) markWelcomed();
    }

    function layoutScrim(rect) {
      // four panels surrounding the spotlight rect; if no rect, full cover
      var vw = window.innerWidth, vh = window.innerHeight;
      var t = tourScrims[0], b = tourScrims[1], l = tourScrims[2], r = tourScrims[3];
      if (!rect) {
        t.style.cssText = "top:0;left:0;width:100vw;height:100vh;";
        b.style.cssText = l.style.cssText = r.style.cssText = "width:0;height:0;";
        return;
      }
      var pad = 6;
      var x = Math.max(0, rect.left - pad), y = Math.max(0, rect.top - pad);
      var w = Math.min(vw, rect.right + pad) - x, h = Math.min(vh, rect.bottom + pad) - y;
      t.style.cssText = "top:0;left:0;width:" + vw + "px;height:" + y + "px;";
      b.style.cssText = "top:" + (y + h) + "px;left:0;width:" + vw + "px;height:" + (vh - y - h) + "px;";
      l.style.cssText = "top:" + y + "px;left:0;width:" + x + "px;height:" + h + "px;";
      r.style.cssText = "top:" + y + "px;left:" + (x + w) + "px;width:" + (vw - x - w) + "px;height:" + h + "px;";
      tourRing.style.cssText = "top:" + y + "px;left:" + x + "px;width:" + w + "px;height:" + h + "px;display:block;";
    }

    function placePop(rect, side, center) {
      var vw = window.innerWidth, vh = window.innerHeight;
      tourPop.classList.toggle("center", !!center);
      // measure after content + class set
      var pw = tourPop.offsetWidth, ph = tourPop.offsetHeight, gap = 14, m = 12;
      var top, left, arrow = null;
      if (center || !rect) {
        left = (vw - pw) / 2; top = (vh - ph) / 2;
        tourRing.style.display = "none";
      } else {
        // choose a side that fits
        var fitsRight = rect.right + gap + pw <= vw - m;
        var fitsLeft = rect.left - gap - pw >= m;
        var fitsBelow = rect.bottom + gap + ph <= vh - m;
        var use = side;
        if (use === "right" && !fitsRight) use = fitsLeft ? "left" : (fitsBelow ? "down" : "up");
        if (use === "left" && !fitsLeft) use = fitsRight ? "right" : (fitsBelow ? "down" : "up");
        if (use === "down" && !fitsBelow) use = "up";
        if (use === "right") { left = rect.right + gap; top = rect.top + rect.height / 2 - ph / 2; arrow = "left"; }
        else if (use === "left") { left = rect.left - gap - pw; top = rect.top + rect.height / 2 - ph / 2; arrow = "right"; }
        else if (use === "down") { top = rect.bottom + gap; left = rect.left + rect.width / 2 - pw / 2; arrow = "up"; }
        else { top = rect.top - gap - ph; left = rect.left + rect.width / 2 - pw / 2; arrow = "down"; }
      }
      // clamp into viewport
      left = Math.max(m, Math.min(left, vw - pw - m));
      top = Math.max(m, Math.min(top, vh - ph - m));
      tourPop.style.left = left + "px";
      tourPop.style.top = top + "px";
      if (arrow) {
        tourPop.setAttribute("data-arrow", arrow);
        var ar = tourPop.querySelector(".tp-arrow");
        if (arrow === "left" || arrow === "right") {
          var cy = rect.top + rect.height / 2 - top; cy = Math.max(12, Math.min(cy, ph - 12));
          ar.style.top = cy + "px"; ar.style.left = ""; ar.style.bottom = "";
        } else {
          var cx = rect.left + rect.width / 2 - left; cx = Math.max(14, Math.min(cx, pw - 14));
          ar.style.left = cx + "px"; ar.style.top = ""; ar.style.right = "";
        }
      } else {
        tourPop.removeAttribute("data-arrow");
      }
    }

    function cheatSheet() {
      var rows = [
        ["Search", "<kbd>" + MOD + "</kbd>"],
        ["Shortcuts help", "<kbd>?</kbd>"],
        ["Jump to a screen", "<kbd>g</kbd> <kbd>o g a c n m e s</kbd>"],
        ["Close overlays", "<kbd>Esc</kbd>"]
      ];
      var h = '<div class="tour-cheats">';
      rows.forEach(function (r) {
        h += '<div class="tc-row"><span class="tc-l">' + r[0] + '</span><span class="tc-k">' + r[1] + '</span></div>';
      });
      return h + '</div>';
    }

    function showTourStep() {
      var step = TOUR_STEPS[tourIdx];
      if (!step) { endTour(true); return; }
      tourAcked = false;

      // make sure the right screen is visible so the target exists
      if (step.screen) goScreen(step.screen);

      // content
      tourEyebrow.textContent = step.eyebrow || "Tutorial";
      tourTitle.textContent = step.title || "";
      tourText.innerHTML = step.text || "";
      tourExtra.innerHTML = step.finish ? cheatSheet() : "";
      tourAck.classList.remove("show");
      if (step.ack) tourAckText.textContent = step.ack;

      // progress dots
      var dh = "";
      for (var i = 0; i < TOUR_STEPS.length; i++) dh += '<span class="tp-dot' + (i === tourIdx ? " on" : "") + '"></span>';
      tourDots.innerHTML = dh;

      // buttons
      tourBack.style.visibility = tourIdx === 0 ? "hidden" : "visible";
      tourNext.textContent = step.finish ? "Done" : (tourIdx === TOUR_STEPS.length - 1 ? "Done" : "Next");

      // optional: show the shortcuts help overlay for the ? step;
      // close it again on any other step so it never lingers.
      if (step.showHelp) { searchOvl.classList.remove("show"); helpOvl.classList.add("show"); }
      else if (helpOvl.classList.contains("show")) { helpOvl.classList.remove("show"); }

      // resolve + position target
      requestAnimationFrame(function () {
        var rect = null;
        if (step.target && !step.center) {
          var node = $(step.target);
          if (node) rect = node.getBoundingClientRect();
        }
        layoutScrim(rect);
        placePop(rect, step.side || "right", step.center || !rect);
      });
    }

    function tourNextStep() {
      if (tourIdx >= TOUR_STEPS.length - 1) { endTour(true); return; }
      tourIdx++; showTourStep();
    }
    function tourPrevStep() {
      if (tourIdx <= 0) return;
      // closing help if we are leaving the ? step
      tourIdx--; showTourStep();
    }

    tourNext.addEventListener("click", tourNextStep);
    tourBack.addEventListener("click", tourPrevStep);
    tourSkip.addEventListener("click", function () { endTour(true); });

    // when a step is waiting on a key (⌘K), acknowledge + advance
    function tourSawSearch() {
      var step = TOUR_STEPS[tourIdx];
      if (tourActive && step && step.wantKey === "search" && !tourAcked) {
        tourAcked = true;
        tourAck.classList.add("show");
        setTimeout(function () {
          // search overlay is open; close it and move on
          closeSearch();
          tourNextStep();
        }, 850);
      }
    }
    window.__haloTourSawSearch = tourSawSearch;

    // reposition on resize while active
    window.addEventListener("resize", function () {
      if (!tourActive) return;
      var step = TOUR_STEPS[tourIdx]; if (!step) return;
      var rect = null;
      if (step.target && !step.center) { var n = $(step.target); if (n) rect = n.getBoundingClientRect(); }
      layoutScrim(rect);
      placePop(rect, step.side || "right", step.center || !rect);
    });

    // entry points: Settings + help overlay
    var tourStartBtn = $("#tourStart");
    if (tourStartBtn) tourStartBtn.addEventListener("click", function () { startTour(true); });
    var helpTourBtn = $("#helpTour");
    if (helpTourBtn) helpTourBtn.addEventListener("click", function () { closeHelp(); startTour(true); });

    // No auto-launch — the guided tour only auto-runs in the Apple edition (the
    // layouts are near-identical, so one walkthrough is enough). It stays
    // available here on demand via Settings → "Take the tour".

    // ============================================================
    // ADDED · EXPORT DASHBOARD IMAGE
    // Approach: render the Overview canvas into an SVG <foreignObject>,
    // draw to a canvas, and download via toDataURL. Content is fully
    // inline (no external images/fonts), so the canvas does not taint.
    // Fallback: if the rasterization fails for any reason, trigger the
    // browser print dialog (Save as PDF) with a print stylesheet.
    // ============================================================
    function exportOverview() {
      var btn = $("#ovExport"), label = $("#ovExportLabel");
      var node = $("#ovCanvas");
      if (!node) return;
      if (label) label.textContent = "Saving…";

      try {
        var rect = node.getBoundingClientRect();
        var pad = 32;
        var w = Math.ceil(rect.width) + pad * 2;
        var h = Math.ceil(node.scrollHeight) + pad * 2;
        var bg = cssVar("--paper", "#fcfcfb");

        // hide controls that shouldn't appear in the export
        var hidden = $$("[data-export-hide]");
        hidden.forEach(function (n) { n.style.visibility = "hidden"; });

        var clone = node.cloneNode(true);
        clone.style.margin = "0";
        clone.style.padding = "0";
        clone.style.maxWidth = "none";
        clone.style.width = Math.ceil(rect.width) + "px";
        clone.style.background = bg;
        // strip any leftover export-hidden nodes from the clone
        $$("[data-export-hide]", clone).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });

        hidden.forEach(function (n) { n.style.visibility = ""; });

        var font = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
        var xml = new XMLSerializer().serializeToString(clone);
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
          '<rect width="100%" height="100%" fill="' + bg + '"/>' +
          '<foreignObject x="' + pad + '" y="' + pad + '" width="' + Math.ceil(rect.width) + '" height="' + Math.ceil(node.scrollHeight) + '">' +
          '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:' + font + ';color:' + cssVar("--ink", "#14140f") + ';">' +
          xml + '</div></foreignObject></svg>';

        var scale = 2;
        var cnv = document.createElement("canvas");
        cnv.width = w * scale; cnv.height = h * scale;
        var ctx = cnv.getContext("2d");
        var img = new Image();
        var svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        img.onload = function () {
          try {
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0);
            var url = cnv.toDataURL("image/png");
            var a = document.createElement("a");
            a.href = url;
            a.download = "better-sgy-overview-" + TODAY_ISO + ".png";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            if (label) label.textContent = "Save image";
            toast({ sig: "", title: "Overview saved", body: "PNG downloaded", app: "Better SGY" });
          } catch (err) {
            if (label) label.textContent = "Save image";
            exportFallback();
          }
        };
        img.onerror = function () { if (label) label.textContent = "Save image"; exportFallback(); };
        img.src = svgUrl;
      } catch (e) {
        if (label) label.textContent = "Save image";
        exportFallback();
      }
    }
    function exportFallback() {
      document.body.classList.add("printing-overview");
      toast({ sig: "", title: "Use Save as PDF", body: "Opening the print dialog", app: "Better SGY" });
      setTimeout(function () {
        window.print();
        document.body.classList.remove("printing-overview");
      }, 120);
    }
    (function wireExport() {
      var btn = $("#ovExport"); if (btn) btn.addEventListener("click", exportOverview);
    })();

    // ============================================================
    // ADDED · NOSTALGIA (grade snapshots)
    // Capture the current term's grades to localStorage and look
    // back at past terms. Calm, monochrome; the only color is the
    // up/down delta vs the previous term.
    // ============================================================
    var NOS_KEY = "bsgy-halo-snapshots";

    // The current term, derived from canonical data.
    var CURRENT_TERM = "2025–2026 · Freshman · Semester 2";
    var CURRENT_OVERALL = 96.2;

    function nosLoad() {
      try { var v = JSON.parse(localStorage.getItem(NOS_KEY)); return Array.isArray(v) ? v : null; }
      catch (e) { return null; }
    }
    function nosStore(list) {
      try { localStorage.setItem(NOS_KEY, JSON.stringify(list)); } catch (e) {}
    }

    // Pre-seed one past snapshot the first time the screen is used.
    function nosSeed() {
      var existing = nosLoad();
      if (existing) return existing;
      var seeded = [{
        term: "2025–2026 · Freshman · Semester 1",
        label: "Freshman · Semester 1",
        captured: "2026-01-15",
        overall: 94.8,
        courses: [
          { name: "Algebra 2 / Trig", grade: 95.0, ltr: "A" },
          { name: "Biology",          grade: 93.5, ltr: "A" },
          { name: "French 1",         grade: 92.0, ltr: "A" },
          { name: "Drama",            grade: 96.2, ltr: "A" },
          { name: "Literature",       grade: 91.0, ltr: "A−" },
          { name: "PE 9",             grade: 99.0, ltr: "A" }
        ]
      }];
      nosStore(seeded);
      return seeded;
    }

    function nosCurrentSnapshot() {
      return {
        term: CURRENT_TERM,
        label: "Freshman · Semester 2",
        captured: TODAY_ISO,
        overall: CURRENT_OVERALL,
        courses: COURSES.map(function (c) {
          return { name: c.name, grade: c.grade, ltr: c.ltr };
        })
      };
    }

    function nosFmtDate(iso) {
      var p = String(iso).split("-");
      if (p.length !== 3) return iso;
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      if (isNaN(d.getTime())) return iso;
      return MONTHS_SHORT[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    }

    // newest first, by captured date
    function nosSorted(list) {
      return list.slice().sort(function (a, b) {
        return String(b.captured).localeCompare(String(a.captured));
      });
    }

    function nosCaptured(list) {
      return list.some(function (s) { return s.term === CURRENT_TERM; });
    }

    function renderNostalgia() {
      var cap = $("#nosCapture"), listEl = $("#nosList"), countEl = $("#nosCount");
      if (!cap || !listEl) return;
      var list = nosSeed();
      var already = nosCaptured(list);

      cap.innerHTML =
        '<div class="ncl">' +
          '<div class="nct">Capture this semester</div>' +
          '<div class="ncs">' + esc(CURRENT_TERM) + ' · overall <b>' + CURRENT_OVERALL.toFixed(1) + '%</b> · 6 courses</div>' +
        '</div>' +
        '<button class="btn solid ncbtn" id="nosCapBtn">' + (already ? "Update snapshot" : "Capture") + '</button>';

      var sorted = nosSorted(list);
      countEl.textContent = sorted.length;

      if (!sorted.length) {
        listEl.innerHTML = '<div class="nos-empty">No snapshots yet. Capture this semester to start a record.</div>';
      } else {
        var html = "";
        sorted.forEach(function (s, i) {
          var prev = sorted[i + 1]; // older term
          var deltaStr = "", deltaCls = "";
          if (prev && typeof prev.overall === "number") {
            var d = s.overall - prev.overall;
            var sign = d > 0 ? "+" : (d < 0 ? "−" : "±");
            deltaCls = d > 0.05 ? " up" : (d < -0.05 ? " down" : "");
            deltaStr = sign + Math.abs(d).toFixed(1) + " vs previous";
          } else {
            deltaStr = "First recorded term";
          }
          var courseRows = (s.courses || []).map(function (c) {
            return '<div class="snap-c">' +
              '<span class="scn">' + esc(c.name) + '</span>' +
              '<span class="scl">' + esc(c.ltr || "") + '</span>' +
              '<span class="scg">' + (typeof c.grade === "number" ? c.grade.toFixed(1) + "%" : "—") + '</span>' +
            '</div>';
          }).join("");
          html +=
            '<div class="snap" data-i="' + i + '">' +
              '<div class="snap-head">' +
                '<div>' +
                  '<div class="sh-term">' + esc(s.label || s.term) + '</div>' +
                  '<div class="sh-when">Captured ' + esc(nosFmtDate(s.captured)) + '</div>' +
                '</div>' +
                '<div>' +
                  '<div class="sh-grade">' + s.overall.toFixed(1) + '<span class="pct">%</span></div>' +
                  '<div class="sh-delta' + deltaCls + '">' + esc(deltaStr) + '</div>' +
                '</div>' +
                '<div class="sh-acts">' +
                  '<button class="btn" data-nos-view="' + i + '">View</button>' +
                  '<button class="btn" data-nos-del="' + i + '">Delete</button>' +
                '</div>' +
              '</div>' +
              '<div class="snap-courses collapsed">' + courseRows + '</div>' +
            '</div>';
        });
        listEl.innerHTML = html;
      }
    }

    (function wireNostalgia() {
      var screen = $("#screen-nostalgia");
      if (!screen) return;
      screen.addEventListener("click", function (e) {
        var t = e.target;
        var capBtn = t.closest && t.closest("#nosCapBtn");
        if (capBtn) {
          var list = nosSeed();
          var snap = nosCurrentSnapshot();
          var idx = -1;
          list.forEach(function (s, i) { if (s.term === snap.term) idx = i; });
          if (idx >= 0) list[idx] = snap; else list.push(snap);
          nosStore(list);
          renderNostalgia();
          return;
        }
        var viewBtn = t.closest && t.closest("[data-nos-view]");
        if (viewBtn) {
          var snapCard = viewBtn.closest(".snap");
          var courses = snapCard && snapCard.querySelector(".snap-courses");
          if (courses) {
            var open = courses.classList.toggle("collapsed");
            viewBtn.textContent = open ? "View" : "Hide";
          }
          return;
        }
        var delBtn = t.closest && t.closest("[data-nos-del]");
        if (delBtn) {
          var di = Number(delBtn.getAttribute("data-nos-del"));
          var current = nosSorted(nosSeed());
          var victim = current[di];
          if (victim) {
            var stored = nosLoad() || [];
            stored = stored.filter(function (s) { return s.term !== victim.term; });
            nosStore(stored);
            renderNostalgia();
          }
          return;
        }
      });
    })();

    // ============================================================
    // LIVE DATA OVERRIDE (chrome.storage.local key "bsgy_live")
    // Populates ONLY the OVERVIEW screen from real injected grades.
    // Falls back to sample data if chrome.storage is absent/invalid.
    // ============================================================
    function bsgyValidLive(d) {
      return d && typeof d === "object" && typeof d.overall === "number" &&
             Array.isArray(d.courses) && d.courses.length > 0;
    }
    function bsgySpark(pct, trend) {
      var end = (typeof pct === "number") ? pct : 95;
      var d = trend === "up" ? 2.0 : trend === "down" ? -2.0 : 0;
      return [end - d, end - d * 0.7, end - d * 0.45, end - d * 0.25,
              end - d * 0.12, end - d * 0.04, end];
    }
    function bsgyApplyLive() {
      try {
        if (!(window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get)) return;
        chrome.storage.local.get("bsgy_live", function (res) {
          try {
            var live = res && res.bsgy_live;
            if (!bsgyValidLive(live)) return;
            var PALETTE = ["#5b6cff", "#34c759", "#ff9f0a", "#bf5af2", "#0a84ff", "#30d158", "#ff375f", "#64d2ff"];
            var totalMissing = 0;
            var built = live.courses.map(function (c, i) {
              c = (c && typeof c === "object") ? c : {};
              var id = "lc" + i;
              var nm = String(c.name == null ? ("Course " + (i + 1)) : c.name);
              var tch = String(c.teacher == null ? "" : c.teacher);
              var pct = (typeof c.pct === "number") ? c.pct : 0;
              var trend = (c.trend === "up" || c.trend === "down" || c.trend === "flat") ? c.trend : "flat";
              var miss = (typeof c.missing === "number" && c.missing >= 0) ? c.missing : 0;
              totalMissing += miss;
              HIST[id] = bsgySpark(pct, trend);
              return {
                id: id, name: nm, teacher: tch, per: "P" + (i + 1),
                grade: pct, ltr: String(c.letter == null ? "" : c.letter),
                trend: trend, missing: miss, accent: PALETTE[i % PALETTE.length]
              };
            });
            // mutate COURSES in place (it is captured by render fns)
            COURSES.length = 0;
            built.forEach(function (c) { COURSES.push(c); });
            byId = {}; COURSES.forEach(function (c) { byId[c.id] = c; });
            // synthesized rising overall series ending at the live overall
            HIST.overall = bsgySpark(typeof live.overall === "number" ? live.overall : 0, "up");

            var ov = (typeof live.overall === "number" ? live.overall : 0);
            var ovStr = ov.toFixed(1);
            var nC = COURSES.length;

            var elOverall = $("#ovOverall");
            if (elOverall) elOverall.innerHTML = ovStr + '<span class="pct">%</span>';
            var elMeta = $("#ovCoursesMeta");
            if (elMeta) elMeta.textContent = "across " + nC + " course" + (nC === 1 ? "" : "s");
            var elCount = $("#ovCount");
            if (elCount) elCount.textContent = String(nC);
            var elNow = $("#ovNow");
            if (elNow) elNow.textContent = ovStr + "% now";
            var elSub = $("#ovSubln");
            if (elSub) {
              elSub.innerHTML = '<span class="dot"></span> ' +
                (totalMissing > 0
                  ? (totalMissing + " missing assignment" + (totalMissing === 1 ? "" : "s"))
                  : "All caught up");
            }
            var elEye = $("#ovEyebrow");
            if (elEye && typeof live.term === "string" && live.term) {
              elEye.textContent = "Overall grade · " + live.term;
            }

            renderOverviewChart();
            renderOverviewCourses();
            gpaWhatIf = {};
            renderGpaPlanner();
          } catch (e) { /* keep sample render */ }
        });
      } catch (e) { /* keep sample render */ }
    }

    // ============================================================
    // INIT
    // ============================================================
    renderNostalgia();
    renderOverviewChart();
    renderOverviewCourses();
    renderGpaPlanner();
    renderRail();
    renderGradePane();
    renderAsn();
    renderCalendar();
    renderAnn();
    renderMatList();
    renderMatDetail();
    if (window.__haloGames && window.__haloGames._renderHome) window.__haloGames._renderHome();
    applyStyle();
    applyTheme();
    // default assignments filter highlight
    $$("#asnSeg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-filter") === asnFilter); });

    // Override OVERVIEW with real injected grade data (async; sample already shown).
    bsgyApplyLive();

    // ============================================================
    // ADDED · MOCKUP CONVENTIONS — active edition + deep linking
    // ============================================================
    // Mark this as the active edition (read by the adaptive widget).
    try { localStorage.setItem("bsgy-edition", "halo"); } catch (e) {}

    (function deepLink() {
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
      var screen = params.get("screen");
      var validScreens = SCREENS.map(function (s) { return s.id; });
      if (screen && validScreens.indexOf(screen) >= 0) {
        goScreen(screen);
        // ?game=<id> opens a specific arcade game when on the Games screen
        var game = params.get("game");
        if (screen === "games" && game && window.__haloGames &&
            window.__haloGames._ids && window.__haloGames._ids.indexOf(game) >= 0) {
          try { window.__haloGames._play(game); } catch (e) {}
        }
      }
    })();

    window.addEventListener("resize", function () {
      // re-render charts so tooltip hotspot geometry stays roughly right (cheap)
    });
  })();
  