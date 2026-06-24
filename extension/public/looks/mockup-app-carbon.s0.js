
/* Apply persisted theme before first paint to avoid a flash.
   Carbon (Bento + Wood edition) is dark-first: a deep espresso-walnut.
   Light is a warm cream/paper fallback. */
(function(){
  try{
    var s = JSON.parse(localStorage.getItem("bsgy_carbon_mock_v1") || "{}");
    var app = s.appearance || "dark";
    var light = app==="light" || (app==="auto" && !window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", light ? "light" : "dark");
  }catch(e){
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
