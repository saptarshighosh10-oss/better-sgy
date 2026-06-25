
(function(){
  "use strict";

  var EDITIONS = [
    { id:"apple", name:"Apple",    label:"Apple",
      desc:"Spare and confident. Lots of space, one calm blue.",
      color:"#0a84ff" },
    { id:"halo",  name:"Halo",     label:"Halo",
      desc:"Calm and minimal. Color only where it means something.",
      color:"#16a394" },
    { id:"slate", name:"Slate",    label:"Slate",
      desc:"Black-and-white editorial. Serif, like a printed page.",
      color:"#1a1a1a" },
    { id:"forge", name:"Friendly", label:"Friendly",
      desc:"Warm and chatty. A plain-language note on every grade.",
      color:"#e07a3c" },
    { id:"carbon", name:"Carbon",  label:"Carbon",
      desc:"Warm walnut and honey-amber. Rich, woody, easy on the eyes.",
      color:"#c8881f" }
  ];

  var REDUCED = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) document.body.classList.add("reduced");

  var track = document.getElementById("track");
  var dotsWrap = document.getElementById("dots");
  var viewport = document.getElementById("viewport");
  var current = 0;
  var slides = [];

  // Build slides
  EDITIONS.forEach(function(ed, i){
    var slide = document.createElement("div");
    slide.className = "slide";
    slide.setAttribute("role","group");
    slide.setAttribute("aria-roledescription","slide");
    slide.setAttribute("aria-label", (i+1) + " of " + EDITIONS.length + ": " + ed.label);

    var copy = document.createElement("div");
    copy.className = "copy";

    var eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    // Swatch color comes from the focused skin's --accent (set in CSS),
    // so it always matches the look being previewed.
    eyebrow.innerHTML = '<span class="swatch"></span>' +
      "Look " + (i+1) + " of " + EDITIONS.length;

    var h2 = document.createElement("h2");
    h2.textContent = ed.label;

    var desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = ed.desc;

    var cta = document.createElement("button");
    cta.className = "cta";
    cta.type = "button";
    cta.innerHTML = "Use this look" +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M13 6l6 6-6 6" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    cta.addEventListener("click", function(){ choose(ed.id); });

    copy.appendChild(eyebrow);
    copy.appendChild(h2);
    copy.appendChild(desc);
    copy.appendChild(cta);

    // Preview (browser-chrome framed, scaled iframe)
    var preview = document.createElement("div");
    preview.className = "preview";

    var bar = document.createElement("div");
    bar.className = "browserbar";
    bar.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

    var clip = document.createElement("div");
    clip.className = "clip";

    var skel = document.createElement("div");
    skel.className = "skeleton";
    skel.textContent = "Loading " + ed.label + " preview…";

    var frame = document.createElement("iframe");
    frame.title = ed.label + " preview";
    frame.setAttribute("scrolling","no");
    frame.setAttribute("tabindex","-1");
    frame.setAttribute("aria-hidden","true");
    frame.dataset.src = "./mockup-app-" + ed.id + ".html";
    frame.addEventListener("load", function(){
      if (frame.getAttribute("src")) preview.classList.add("loaded");
    });

    clip.appendChild(frame);
    preview.appendChild(bar);
    preview.appendChild(clip);
    preview.appendChild(skel);

    slide.appendChild(copy);
    slide.appendChild(preview);
    track.appendChild(slide);

    slides.push({ el:slide, preview:preview, frame:frame, clip:clip });

    // Dot
    var dot = document.createElement("button");
    dot.className = "dotbtn";
    dot.type = "button";
    dot.setAttribute("role","tab");
    dot.setAttribute("aria-label", "Go to " + ed.label);
    dot.addEventListener("click", function(){ goTo(i); });
    dotsWrap.appendChild(dot);
  });

  var dotEls = dotsWrap.querySelectorAll(".dotbtn");

  // Scale each iframe so its 1400px design width fits the clip width.
  function rescale(){
    slides.forEach(function(s){
      var w = s.clip.clientWidth;
      if (!w) return;
      var scale = w / 1400;
      s.frame.style.transform = "scale(" + scale + ")";
    });
  }

  // Lazy-load only current + adjacent slides.
  function lazyLoad(){
    slides.forEach(function(s, i){
      var near = Math.abs(i - current) <= 1 ||
                 (current === 0 && i === EDITIONS.length - 1) ||
                 (current === EDITIONS.length - 1 && i === 0);
      if (near && !s.frame.getAttribute("src")) {
        s.frame.setAttribute("src", s.frame.dataset.src);
      }
    });
  }

  var SKIN_CLASSES = EDITIONS.map(function(ed){ return "skin-" + ed.id; });
  function applySkin(){
    var cl = document.body.classList;
    cl.remove.apply(cl, SKIN_CLASSES);
    cl.add("skin-" + EDITIONS[current].id);
  }

  function render(){
    applySkin();
    track.style.transform = "translateX(" + (-current * 100) + "%)";
    for (var i=0;i<dotEls.length;i++){
      var on = (i === current);
      dotEls[i].classList.toggle("active", on);
      dotEls[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    slides.forEach(function(s, i){
      s.el.setAttribute("aria-hidden", i === current ? "false" : "true");
    });
    lazyLoad();
  }

  function goTo(i){
    var n = EDITIONS.length;
    current = ((i % n) + n) % n;
    render();
  }
  function next(){ goTo(current + 1); }
  function prev(){ goTo(current - 1); }

  function choose(id){
    try { localStorage.setItem("bsgy-edition", id); } catch(e){}
    // record the chosen edition for the extension (guarded — only if chrome.storage exists)
    try { if (window.chrome && chrome.storage && chrome.storage.local && chrome.storage.local.set) chrome.storage.local.set({ "bsgy-edition": id }); } catch(e){}
    window.location.href = "./mockup-app-" + id + ".html";
  }

  document.getElementById("next").addEventListener("click", next);
  document.getElementById("prev").addEventListener("click", prev);

  // Keyboard
  document.addEventListener("keydown", function(e){
    if (e.key === "ArrowRight"){ next(); e.preventDefault(); }
    else if (e.key === "ArrowLeft"){ prev(); e.preventDefault(); }
    else if (e.key === "Enter" && !/^(BUTTON|A|INPUT)$/.test(document.activeElement.tagName)){
      choose(EDITIONS[current].id);
    }
  });

  // Swipe / drag
  var startX = 0, dragging = false, moved = 0;
  viewport.addEventListener("pointerdown", function(e){
    dragging = true; startX = e.clientX; moved = 0;
    track.style.transition = "none";
  });
  viewport.addEventListener("pointermove", function(e){
    if (!dragging) return;
    moved = e.clientX - startX;
    if (!REDUCED){
      var pct = (moved / viewport.clientWidth) * 100;
      track.style.transform = "translateX(" + (-current * 100 + pct) + "%)";
    }
  });
  function endDrag(){
    if (!dragging) return;
    dragging = false;
    track.style.transition = "";
    var threshold = viewport.clientWidth * 0.16;
    if (moved <= -threshold) next();
    else if (moved >= threshold) prev();
    else render();
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", endDrag);

  window.addEventListener("resize", rescale);

  // Init
  render();
  rescale();
  // rescale again after fonts/layout settle
  window.setTimeout(rescale, 60);
  window.setTimeout(rescale, 300);
})();
